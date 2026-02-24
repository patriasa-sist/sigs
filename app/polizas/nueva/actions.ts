"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getDataScopeFilter } from "@/utils/auth/helpers";
import { generateFinalStoragePath } from "@/utils/fileUpload";
import type { PolizaFormState } from "@/types/poliza";

/**
 * Mapea errores de Supabase/PostgreSQL a mensajes legibles para el usuario.
 */
function mapSupabaseError(
	error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
	context: string
): string {
	if (!error) return context;

	const code = error.code ?? "";
	const detail = error.details || error.hint || "";
	const msg = error.message || "";

	switch (code) {
		case "23505": {
			// Unique constraint violation
			const target = msg + detail;
			if (target.includes("numero_poliza")) {
				return "Ya existe una póliza con ese número de póliza. Verifique el número ingresado.";
			}
			return `${context}: dato duplicado${detail ? ` — ${detail}` : ""}`;
		}
		case "23503":
			return `${context}: referencia inválida${detail ? ` — ${detail}` : ""}. Verifique compañía, regional, responsable o producto.`;
		case "23514":
			return `${context}: valor no permitido${detail ? ` — ${detail}` : ""}`;
		case "42501":
			return `${context}: sin permisos para realizar esta operación`;
		default:
			return `${context}: ${msg || "error desconocido"}${detail ? ` (${detail})` : ""}`;
	}
}

export async function guardarPoliza(formState: PolizaFormState) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// 1. Validar que todos los datos necesarios estén presentes
		if (!formState.asegurado) {
			return { success: false, error: "Asegurado no seleccionado" };
		}

		if (!formState.datos_basicos) {
			return { success: false, error: "Datos básicos incompletos" };
		}

		if (!formState.modalidad_pago) {
			return { success: false, error: "Modalidad de pago no definida" };
		}

		// Validar producto_id (obligatorio para nuevas pólizas)
		if (!formState.datos_basicos.producto_id) {
			return { success: false, error: "Producto es requerido" };
		}

		// Validar que agente/comercial solo asigne responsable dentro de su equipo
		const scope = await getDataScopeFilter('polizas');
		if (scope.needsScoping && formState.datos_basicos.responsable_id) {
			if (!scope.teamMemberIds.includes(formState.datos_basicos.responsable_id)) {
				return { success: false, error: "Solo puede asignar como responsable a un miembro de su equipo" };
			}
		}

		// 2. Insertar póliza principal
		// Extraer valores de comisión del estado del pago
		const pagoData = formState.modalidad_pago as { prima_neta?: number; comision?: number; comision_empresa?: number; comision_encargado?: number };
		const { data: poliza, error: errorPoliza } = await supabase
			.from("polizas")
			.insert({
				client_id: formState.asegurado.id,
				numero_poliza: formState.datos_basicos.numero_poliza,
				compania_aseguradora_id: formState.datos_basicos.compania_aseguradora_id,
				ramo: formState.datos_basicos.ramo,
				producto_id: formState.datos_basicos.producto_id,
				grupo_produccion: formState.datos_basicos.grupo_produccion,
				inicio_vigencia: formState.datos_basicos.inicio_vigencia,
				fin_vigencia: formState.datos_basicos.fin_vigencia,
				fecha_emision_compania: formState.datos_basicos.fecha_emision_compania,
				responsable_id: formState.datos_basicos.responsable_id,
				regional_id: formState.datos_basicos.regional_id,
				categoria_id: formState.datos_basicos.categoria_id,
				modalidad_pago: formState.modalidad_pago.tipo,
				prima_total: formState.modalidad_pago.prima_total,
				moneda: formState.modalidad_pago.moneda,
				prima_neta: pagoData.prima_neta || null,
				comision: pagoData.comision_empresa || pagoData.comision || null,
				comision_empresa: pagoData.comision_empresa || null,
				comision_encargado: pagoData.comision_encargado || null,
				estado: "pendiente",
			})
			.select()
			.single();

		if (errorPoliza || !poliza) {
			console.error("Error insertando póliza:", errorPoliza);
			return { success: false, error: mapSupabaseError(errorPoliza, "Error al guardar la póliza") };
		}

		// 3. Insertar cuotas de pago
		if (formState.modalidad_pago.tipo === "contado") {
			console.log("Insertando pago contado para póliza:", poliza.id);
			const { error: errorPago } = await supabase.from("polizas_pagos").insert({
				poliza_id: poliza.id,
				numero_cuota: 1,
				monto: formState.modalidad_pago.cuota_unica,
				fecha_vencimiento: formState.modalidad_pago.fecha_pago_unico,
				estado: "pendiente",
			});

			if (errorPago) {
				console.error("Error insertando pago contado:", errorPago);
				return { success: false, error: mapSupabaseError(errorPago, "Error al guardar el pago") };
			}
		} else {
			// Insertar cuota inicial si existe
			const cuotas: Array<{
				poliza_id: string;
				numero_cuota: number;
				monto: number;
				fecha_vencimiento: string;
				estado: string;
				observaciones?: string;
			}> = [];

			console.log("Modalidad crédito - Cuota inicial:", formState.modalidad_pago.cuota_inicial);
			console.log("Modalidad crédito - Número de cuotas:", formState.modalidad_pago.cuotas.length);

			// Nota: numero_cuota debe ser > 0 debido al constraint numero_cuota_valido
			// Si hay cuota inicial, será la cuota #1
			let numeroCuotaActual = 1;

			if (formState.modalidad_pago.cuota_inicial > 0) {
				cuotas.push({
					poliza_id: poliza.id,
					numero_cuota: numeroCuotaActual,
					monto: formState.modalidad_pago.cuota_inicial,
					fecha_vencimiento: formState.datos_basicos.inicio_vigencia,
					estado: "pendiente",
					observaciones: "Cuota inicial",
				});
				numeroCuotaActual++;
			}

			// Insertar cuotas restantes (renumeradas)
			formState.modalidad_pago.cuotas.forEach((cuota) => {
				cuotas.push({
					poliza_id: poliza.id,
					numero_cuota: numeroCuotaActual,
					monto: cuota.monto,
					fecha_vencimiento: cuota.fecha_vencimiento,
					estado: "pendiente",
				});
				numeroCuotaActual++;
			});

			if (cuotas.length === 0) {
				console.error("No hay cuotas para insertar en modalidad crédito");
				return { success: false, error: "Debe definir al menos una cuota de pago" };
			}

			console.log("Insertando", cuotas.length, "cuotas para póliza:", poliza.id);
			const { error: errorCuotas } = await supabase.from("polizas_pagos").insert(cuotas);

			if (errorCuotas) {
				console.error("Error insertando cuotas:", errorCuotas);
				return { success: false, error: mapSupabaseError(errorCuotas, "Error al guardar las cuotas de pago") };
			}
		}

		// 4. Insertar datos específicos por ramo
		if (formState.datos_especificos?.tipo_ramo === "Automotores") {
			const vehiculos = formState.datos_especificos.datos.vehiculos.map((vehiculo) => ({
				poliza_id: poliza.id,
				placa: vehiculo.placa,
				valor_asegurado: vehiculo.valor_asegurado,
				franquicia: vehiculo.franquicia,
				nro_chasis: vehiculo.nro_chasis,
				uso: vehiculo.uso,
				tipo_vehiculo_id: vehiculo.tipo_vehiculo_id || null,
				marca_id: vehiculo.marca_id || null,
				modelo: vehiculo.modelo || null,
				ano: vehiculo.ano || null,
				color: vehiculo.color || null,
				ejes: vehiculo.ejes || null,
				nro_motor: vehiculo.nro_motor || null,
				nro_asientos: vehiculo.nro_asientos || null,
				plaza_circulacion: vehiculo.plaza_circulacion || null,
			}));

			const { error: errorVehiculos } = await supabase.from("polizas_automotor_vehiculos").insert(vehiculos);

			if (errorVehiculos) {
				console.error("Error insertando vehículos:", errorVehiculos);
				return { success: false, error: mapSupabaseError(errorVehiculos, "Error al guardar los vehículos") };
			}
		}

		// Insertar beneficiarios para ramo Salud
		if (formState.datos_especificos?.tipo_ramo === "Salud") {
			const beneficiarios = formState.datos_especificos.datos.beneficiarios || [];

			if (beneficiarios.length > 0) {
				const beneficiariosParaInsertar = beneficiarios.map((beneficiario) => ({
					poliza_id: poliza.id,
					nombre_completo: beneficiario.nombre_completo,
					carnet: beneficiario.carnet,
					fecha_nacimiento: beneficiario.fecha_nacimiento,
					genero: beneficiario.genero,
					nivel_id: beneficiario.nivel_id,
					rol: beneficiario.rol,
				}));

				const { error: errorBeneficiarios } = await supabase
					.from("polizas_salud_beneficiarios")
					.insert(beneficiariosParaInsertar);

				if (errorBeneficiarios) {
					console.error("Error insertando beneficiarios de salud:", errorBeneficiarios);
					return { success: false, error: mapSupabaseError(errorBeneficiarios, "Error al guardar los beneficiarios de salud") };
				}
			}
		}

		// 5. Mover documentos de temp/ a {poliza_id}/ y registrar en base de datos
		// Los archivos ya fueron subidos client-side a temp/{userId}/{sessionId}/
		const docsSubidos = formState.documentos.filter(
			(d) => d.storage_path && d.upload_status === "uploaded"
		);

		if (docsSubidos.length > 0) {
			console.log(`[DOCS] Procesando ${docsSubidos.length} documentos subidos`);

			for (const documento of docsSubidos) {
				const tempPath = documento.storage_path!;
				const finalPath = generateFinalStoragePath(poliza.id, documento.nombre_archivo);

				// Mover archivo de temp/ a {poliza_id}/
				let usedPath = finalPath;
				const { error: moveError } = await supabase.storage
					.from("polizas-documentos")
					.move(tempPath, finalPath);

				if (moveError) {
					console.error("[DOCS] Error moviendo documento, usando ruta temporal:", moveError);
					// Fallback: usar la ruta temporal (el archivo sigue accesible)
					usedPath = tempPath;
				}

				// Obtener URL pública de la ruta usada
				const {
					data: { publicUrl },
				} = supabase.storage.from("polizas-documentos").getPublicUrl(usedPath);

				// Registrar en base de datos
				const { error: errorDoc } = await supabase.from("polizas_documentos").insert({
					poliza_id: poliza.id,
					tipo_documento: documento.tipo_documento,
					nombre_archivo: documento.nombre_archivo,
					archivo_url: publicUrl,
					tamano_bytes: documento.tamano_bytes,
					estado: "activo",
				});

				if (errorDoc) {
					console.error("[DOCS] Error registrando documento en BD:", errorDoc);
				}
			}

			console.log("[DOCS] Procesamiento de documentos completado");
		}

		// 6. Revalidar la ruta de pólizas
		revalidatePath("/polizas");

		return { success: true, poliza_id: poliza.id };
	} catch (error) {
		console.error("Error general guardando póliza:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
