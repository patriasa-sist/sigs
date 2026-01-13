"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { PolizaFormState } from "@/types/poliza";

/**
 * Sanitiza un nombre de archivo para que sea compatible con Supabase Storage
 * - Reemplaza espacios por guiones bajos
 * - Elimina o reemplaza caracteres especiales
 * - Normaliza caracteres acentuados
 */
function sanitizarNombreArchivo(nombreArchivo: string): string {
	return (
		nombreArchivo
			// Normalizar caracteres acentuados (á -> a, ñ -> n, etc.)
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			// Reemplazar espacios por guiones bajos
			.replace(/\s+/g, "_")
			// Eliminar caracteres especiales excepto: letras, números, puntos, guiones y guiones bajos
			.replace(/[^a-zA-Z0-9._-]/g, "")
			// Reemplazar múltiples guiones bajos consecutivos por uno solo
			.replace(/_+/g, "_")
			// Convertir a minúsculas para consistencia
			.toLowerCase()
	);
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

		// 2. Insertar póliza principal
		const { data: poliza, error: errorPoliza } = await supabase
			.from("polizas")
			.insert({
				client_id: formState.asegurado.id,
				numero_poliza: formState.datos_basicos.numero_poliza,
				compania_aseguradora_id: formState.datos_basicos.compania_aseguradora_id,
				ramo: formState.datos_basicos.ramo,
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
				estado: "pendiente",
			})
			.select()
			.single();

		if (errorPoliza || !poliza) {
			console.error("Error insertando póliza:", errorPoliza);
			return { success: false, error: "Error al guardar la póliza" };
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
				return { success: false, error: "Error al guardar el pago: " + errorPago.message };
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
				return { success: false, error: "Error al guardar las cuotas de pago: " + errorCuotas.message };
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
				}
			}
		}

		// 5. Subir documentos a Supabase Storage y registrar en base de datos
		if (formState.documentos.length > 0) {
			console.log(`[DOCS] Procesando ${formState.documentos.length} documentos`);

			for (const documento of formState.documentos) {
				if (!documento.file) {
					console.warn("[DOCS] Documento sin archivo, saltando:", documento.nombre_archivo);
					continue;
				}

				console.log("[DOCS] Procesando documento:", {
					nombre: documento.nombre_archivo,
					tipo: documento.tipo_documento,
					tamaño: documento.tamano_bytes,
					fileType: documento.file.type,
				});

				// Sanitizar el nombre del archivo
				const nombreSanitizado = sanitizarNombreArchivo(documento.nombre_archivo);

				// Generar nombre único para el archivo
				const timestamp = Date.now();
				const nombreArchivo = `${poliza.id}/${timestamp}-${nombreSanitizado}`;

				console.log("[DOCS] Nombre original:", documento.nombre_archivo);
				console.log("[DOCS] Nombre sanitizado:", nombreSanitizado);

				// Subir a Storage
				console.log("[DOCS] Subiendo a Storage:", nombreArchivo);
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("polizas-documentos")
					.upload(nombreArchivo, documento.file);

				if (uploadError) {
					console.error("[DOCS] Error subiendo documento:", uploadError);
					console.error("[DOCS] Detalles del error:", {
						message: uploadError.message,
						error: uploadError,
					});
					continue; // Continuar con el siguiente documento
				}

				console.log("[DOCS] Documento subido exitosamente:", uploadData);

				// Obtener URL pública
				const {
					data: { publicUrl },
				} = supabase.storage.from("polizas-documentos").getPublicUrl(nombreArchivo);

				console.log("[DOCS] URL pública generada:", publicUrl);

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
				} else {
					console.log("[DOCS] Documento registrado exitosamente en BD");
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
