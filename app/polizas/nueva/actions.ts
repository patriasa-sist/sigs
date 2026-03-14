"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { getDataScopeFilter } from "@/utils/auth/helpers";
import { generateFinalStoragePath } from "@/utils/fileUpload";
import type { PolizaFormState } from "@/types/poliza";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Helper: verifica error de Supabase y lanza excepción si hay fallo.
 * Convierte errores de inserción en throws para que el catch pueda limpiar.
 */
function throwIfError(
	error: { code?: string; message?: string; details?: string; hint?: string } | null,
	context: string
) {
	if (error) {
		throw new Error(mapSupabaseError(error, context));
	}
}

/**
 * Limpia una póliza parcialmente creada usando la función nuclear de eliminación.
 * Llama a eliminar_poliza_completo via admin client y luego borra archivos de Storage.
 */
async function limpiarPolizaFallida(polizaId: string): Promise<void> {
	try {
		const supabaseAdmin = createAdminClient();
		const { data, error } = await supabaseAdmin.rpc("eliminar_poliza_completo", {
			p_poliza_id: polizaId,
		});

		if (error) {
			console.error("[CLEANUP] Error en RPC eliminar_poliza_completo:", error);
			return;
		}

		const resultado = Array.isArray(data) ? data[0] : data;

		if (!resultado?.eliminado) {
			console.error("[CLEANUP] No se pudo limpiar póliza:", resultado?.mensaje);
			return;
		}

		// Borrar archivos de Storage retornados por la función
		const archivos: Array<{ bucket: string; path: string }> =
			resultado.detalles?.archivos_storage ?? [];

		if (archivos.length > 0) {
			const porBucket: Record<string, string[]> = {};
			for (const archivo of archivos) {
				if (archivo.bucket && archivo.path) {
					if (!porBucket[archivo.bucket]) {
						porBucket[archivo.bucket] = [];
					}
					porBucket[archivo.bucket].push(archivo.path);
				}
			}

			for (const [bucket, paths] of Object.entries(porBucket)) {
				const { error: removeError } = await supabaseAdmin.storage
					.from(bucket)
					.remove(paths);

				if (removeError) {
					console.error(`[CLEANUP] Error borrando archivos de ${bucket}:`, removeError);
				}
			}
		}

		console.log("[CLEANUP] Póliza parcial limpiada correctamente:", polizaId);
	} catch (cleanupError) {
		console.error("[CLEANUP] Error inesperado durante limpieza:", cleanupError);
	}
}

/**
 * Inserta las cuotas de pago para la póliza. Lanza error si falla.
 */
async function insertarPagos(
	supabase: SupabaseClient,
	polizaId: string,
	formState: PolizaFormState
) {
	if (!formState.modalidad_pago) return;

	if (formState.modalidad_pago.tipo === "contado") {
		const { error: errorPago } = await supabase.from("polizas_pagos").insert({
			poliza_id: polizaId,
			numero_cuota: 1,
			monto: formState.modalidad_pago.cuota_unica,
			fecha_vencimiento: formState.modalidad_pago.fecha_pago_unico,
			estado: "pendiente",
		});

		throwIfError(errorPago, "Error al guardar el pago");
	} else {
		const cuotas: Array<{
			poliza_id: string;
			numero_cuota: number;
			monto: number;
			fecha_vencimiento: string;
			estado: string;
			observaciones?: string;
		}> = [];

		let numeroCuotaActual = 1;

		if (formState.modalidad_pago.cuota_inicial > 0) {
			cuotas.push({
				poliza_id: polizaId,
				numero_cuota: numeroCuotaActual,
				monto: formState.modalidad_pago.cuota_inicial,
				fecha_vencimiento: formState.modalidad_pago.fecha_inicio_cuotas,
				estado: "pendiente",
				observaciones: "Cuota inicial",
			});
			numeroCuotaActual++;
		}

		formState.modalidad_pago.cuotas.forEach((cuota) => {
			cuotas.push({
				poliza_id: polizaId,
				numero_cuota: numeroCuotaActual,
				monto: cuota.monto,
				fecha_vencimiento: cuota.fecha_vencimiento,
				estado: "pendiente",
			});
			numeroCuotaActual++;
		});

		if (cuotas.length === 0) {
			throw new Error("Debe definir al menos una cuota de pago");
		}

		const { error: errorCuotas } = await supabase.from("polizas_pagos").insert(cuotas);
		throwIfError(errorCuotas, "Error al guardar las cuotas de pago");
	}
}

/**
 * Inserta los datos específicos del ramo. Lanza error si falla.
 */
async function insertarDatosRamo(
	supabase: SupabaseClient,
	polizaId: string,
	formState: PolizaFormState
) {
	if (!formState.datos_especificos) return;

	// Automotores
	if (formState.datos_especificos.tipo_ramo === "Automotores") {
		const vehiculos = formState.datos_especificos.datos.vehiculos.map((vehiculo) => ({
			poliza_id: polizaId,
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
		throwIfError(errorVehiculos, "Error al guardar los vehículos");
	}

	// Salud
	if (formState.datos_especificos.tipo_ramo === "Salud") {
		const datosSalud = formState.datos_especificos.datos;

		const beneficiarios = datosSalud.beneficiarios || [];
		if (beneficiarios.length > 0) {
			const beneficiariosParaInsertar = beneficiarios.map((beneficiario) => ({
				poliza_id: polizaId,
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

			throwIfError(errorBeneficiarios, "Error al guardar los beneficiarios de salud");
		}

		const niveles = datosSalud.niveles || [];
		if (niveles.length > 0) {
			const nivelesParaInsertar = niveles.map((nivel) => ({
				id: nivel.id,
				poliza_id: polizaId,
				nombre: nivel.nombre,
				monto: nivel.monto,
			}));

			const { error: errorNiveles } = await supabase
				.from("polizas_salud_niveles")
				.insert(nivelesParaInsertar);

			throwIfError(errorNiveles, "Error al guardar los niveles de salud");
		}

		const asegurados = datosSalud.asegurados || [];
		if (asegurados.length > 0) {
			const aseguradosParaInsertar = asegurados.map((asegurado) => ({
				poliza_id: polizaId,
				client_id: asegurado.client_id,
				nivel_id: asegurado.nivel_id,
				rol: asegurado.rol,
			}));

			const { error: errorAsegurados } = await supabase
				.from("polizas_salud_asegurados")
				.insert(aseguradosParaInsertar);

			throwIfError(errorAsegurados, "Error al guardar los asegurados de salud");
		}
	}

	// Transportes
	if (formState.datos_especificos.tipo_ramo === "Transportes") {
		const datosTransporte = formState.datos_especificos.datos;

		const { error: errorTransporte } = await supabase
			.from("polizas_transporte")
			.insert({
				poliza_id: polizaId,
				materia_asegurada: datosTransporte.materia_asegurada,
				tipo_embalaje: datosTransporte.tipo_embalaje,
				fecha_embarque: datosTransporte.fecha_embarque,
				tipo_transporte: datosTransporte.tipo_transporte,
				pais_origen_id: datosTransporte.pais_origen_id,
				ciudad_origen: datosTransporte.ciudad_origen,
				pais_destino_id: datosTransporte.pais_destino_id,
				ciudad_destino: datosTransporte.ciudad_destino,
				valor_asegurado: datosTransporte.valor_asegurado,
				factura: datosTransporte.factura,
				fecha_factura: datosTransporte.fecha_factura,
				cobertura_a: datosTransporte.cobertura_a,
				cobertura_c: datosTransporte.cobertura_c,
				modalidad: datosTransporte.modalidad,
			});

		throwIfError(errorTransporte, "Error al guardar datos de transporte");
	}

	// Aeronavegación / Naves o embarcaciones
	if (formState.datos_especificos.tipo_ramo === "Aeronavegación" || formState.datos_especificos.tipo_ramo === "Naves o embarcaciones") {
		const datosAero = formState.datos_especificos.datos;

		const nivelesAP = datosAero.niveles_ap || [];
		const nivelIdMap = new Map<string, string>();

		if (nivelesAP.length > 0) {
			for (const nivel of nivelesAP) {
				const { data: nivelDB, error: errorNivel } = await supabase
					.from("polizas_aeronavegacion_niveles_ap")
					.insert({
						poliza_id: polizaId,
						nombre: nivel.nombre,
						monto_muerte_accidental: nivel.monto_muerte_accidental,
						monto_invalidez: nivel.monto_invalidez,
						monto_gastos_medicos: nivel.monto_gastos_medicos,
					})
					.select("id")
					.single();

				throwIfError(errorNivel, "Error al guardar nivel de accidentes personales");

				if (nivelDB) {
					nivelIdMap.set(nivel.id, nivelDB.id);
				}
			}
		}

		const naves = datosAero.naves || [];
		if (naves.length > 0) {
			const navesParaInsertar = naves.map((nave) => ({
				poliza_id: polizaId,
				matricula: nave.matricula,
				marca: nave.marca,
				modelo: nave.modelo,
				ano: nave.ano,
				serie: nave.serie || "",
				uso: nave.uso,
				nro_pasajeros: nave.nro_pasajeros,
				nro_tripulantes: nave.nro_tripulantes,
				valor_casco: nave.valor_casco,
				valor_responsabilidad_civil: nave.valor_responsabilidad_civil,
				nivel_ap_id: nave.nivel_ap_id ? (nivelIdMap.get(nave.nivel_ap_id) || null) : null,
			}));

			const { error: errorNaves } = await supabase
				.from("polizas_aeronavegacion_naves")
				.insert(navesParaInsertar);

			throwIfError(errorNaves, "Error al guardar las naves/embarcaciones");
		}

		const aseguradosAdicionales = datosAero.asegurados_adicionales || [];
		if (aseguradosAdicionales.length > 0) {
			const aseguradosParaInsertar = aseguradosAdicionales.map((asegurado) => ({
				poliza_id: polizaId,
				client_id: asegurado.client_id,
			}));

			const { error: errorAsegurados } = await supabase
				.from("polizas_aeronavegacion_asegurados")
				.insert(aseguradosParaInsertar);

			throwIfError(errorAsegurados, "Error al guardar los asegurados de aeronavegación");
		}
	}

	// Ramos técnicos
	if (formState.datos_especificos.tipo_ramo === "Ramos técnicos") {
		const datosRT = formState.datos_especificos.datos;
		const equipos = datosRT.equipos || [];

		if (equipos.length > 0) {
			const equiposParaInsertar = equipos.map((equipo) => ({
				poliza_id: polizaId,
				nro_serie: equipo.nro_serie,
				valor_asegurado: equipo.valor_asegurado,
				franquicia: equipo.franquicia,
				nro_chasis: equipo.nro_chasis,
				uso: equipo.uso,
				coaseguro: equipo.coaseguro,
				placa: equipo.placa || null,
				tipo_equipo_id: equipo.tipo_equipo_id || null,
				marca_equipo_id: equipo.marca_equipo_id || null,
				modelo: equipo.modelo || null,
				ano: equipo.ano || null,
				color: equipo.color || null,
				nro_motor: equipo.nro_motor || null,
				plaza_circulacion: equipo.plaza_circulacion || null,
			}));

			const { error: errorEquipos } = await supabase
				.from("polizas_ramos_tecnicos_equipos")
				.insert(equiposParaInsertar);

			throwIfError(errorEquipos, "Error al guardar los equipos");
		}
	}

	// Incendio y Aliados
	if (formState.datos_especificos.tipo_ramo === "Incendio y Aliados") {
		const datosIncendio = formState.datos_especificos.datos;

		for (const bien of datosIncendio.bienes) {
			const { data: bienDB, error: errorBien } = await supabase
				.from("polizas_incendio_bienes")
				.insert({
					poliza_id: polizaId,
					direccion: bien.direccion,
					valor_total_declarado: bien.valor_total_declarado,
					es_primer_riesgo: bien.es_primer_riesgo,
				})
				.select("id")
				.single();

			throwIfError(errorBien, "Error al guardar los bienes de incendio");

			if (bienDB && bien.items.length > 0) {
				const itemsParaInsertar = bien.items.map((item) => ({
					bien_id: bienDB.id,
					nombre: item.nombre,
					monto: item.monto,
				}));

				const { error: errorItems } = await supabase
					.from("polizas_incendio_items")
					.insert(itemsParaInsertar);

				throwIfError(errorItems, "Error al guardar los items de incendio");
			}
		}

		const aseguradosIncendio = datosIncendio.asegurados || [];
		if (aseguradosIncendio.length > 0) {
			const aseguradosParaInsertar = aseguradosIncendio.map((asegurado) => ({
				poliza_id: polizaId,
				client_id: asegurado.client_id,
			}));

			const { error: errorAsegurados } = await supabase
				.from("polizas_incendio_asegurados")
				.insert(aseguradosParaInsertar);

			throwIfError(errorAsegurados, "Error al guardar los asegurados de incendio");
		}
	}

	// Riesgos Varios Misceláneos
	if (formState.datos_especificos.tipo_ramo === "Riesgos Varios Misceláneos") {
		const datosRV = formState.datos_especificos.datos;

		for (const bien of datosRV.bienes) {
			const { data: bienDB, error: errorBien } = await supabase
				.from("polizas_riesgos_varios_bienes")
				.insert({
					poliza_id: polizaId,
					direccion: bien.direccion,
					valor_total_declarado: bien.valor_total_declarado,
					es_primer_riesgo: bien.es_primer_riesgo,
				})
				.select("id")
				.single();

			throwIfError(errorBien, "Error al guardar los bienes de riesgos varios");

			if (bienDB && bien.items.length > 0) {
				const itemsParaInsertar = bien.items.map((item) => ({
					bien_id: bienDB.id,
					nombre: item.nombre,
					monto: item.monto,
				}));

				const { error: errorItems } = await supabase
					.from("polizas_riesgos_varios_items")
					.insert(itemsParaInsertar);

				throwIfError(errorItems, "Error al guardar los items de riesgos varios");
			}
		}

		const aseguradosRV = datosRV.asegurados || [];
		if (aseguradosRV.length > 0) {
			const aseguradosParaInsertar = aseguradosRV.map((asegurado) => ({
				poliza_id: polizaId,
				client_id: asegurado.client_id,
			}));

			const { error: errorAsegurados } = await supabase
				.from("polizas_riesgos_varios_asegurados")
				.insert(aseguradosParaInsertar);

			throwIfError(errorAsegurados, "Error al guardar los asegurados de riesgos varios");
		}
	}

	// Responsabilidad Civil
	if (formState.datos_especificos.tipo_ramo === "Responsabilidad Civil") {
		const datosRC = formState.datos_especificos.datos;

		const { error: errorRC } = await supabase
			.from("polizas_responsabilidad_civil")
			.insert({
				poliza_id: polizaId,
				tipo_poliza: datosRC.tipo_poliza,
				valor_asegurado: datosRC.valor_asegurado,
			});

		throwIfError(errorRC, "Error al guardar datos de responsabilidad civil");
	}

	// Vida, Sepelio, Accidentes Personales (niveles compartidos)
	if (
		formState.datos_especificos.tipo_ramo === "Vida" ||
		formState.datos_especificos.tipo_ramo === "Sepelio" ||
		formState.datos_especificos.tipo_ramo === "Accidentes Personales"
	) {
		const datosNivel = formState.datos_especificos.datos;
		const nivelIdMap = new Map<string, string>();

		const niveles = datosNivel.niveles || [];
		for (const nivel of niveles) {
			const { data: nivelDB, error: errorNivel } = await supabase
				.from("polizas_niveles")
				.insert({
					poliza_id: polizaId,
					nombre: nivel.nombre,
					prima_nivel: nivel.prima_nivel || null,
					coberturas: nivel.coberturas,
				})
				.select("id")
				.single();

			throwIfError(errorNivel, "Error al guardar nivel de cobertura");

			if (nivelDB) {
				nivelIdMap.set(nivel.id, nivelDB.id);
			}
		}

		const asegurados = datosNivel.asegurados || [];
		if (asegurados.length > 0) {
			const aseguradosParaInsertar = asegurados
				.filter((a) => nivelIdMap.has(a.nivel_id))
				.map((asegurado) => ({
					poliza_id: polizaId,
					client_id: asegurado.client_id,
					nivel_id: nivelIdMap.get(asegurado.nivel_id)!,
					cargo: asegurado.cargo || null,
				}));

			if (aseguradosParaInsertar.length > 0) {
				const { error: errorAsegurados } = await supabase
					.from("polizas_asegurados_nivel")
					.insert(aseguradosParaInsertar);

				throwIfError(errorAsegurados, "Error al guardar los asegurados con nivel");
			}
		}
	}
}

/**
 * Procesa documentos: mueve de temp/ a {poliza_id}/ y registra en BD.
 * Best-effort: no lanza error si falla (los archivos siguen accesibles en temp/).
 */
async function procesarDocumentos(
	supabase: SupabaseClient,
	polizaId: string,
	formState: PolizaFormState
) {
	const docsSubidos = formState.documentos.filter(
		(d) => d.storage_path && d.upload_status === "uploaded"
	);

	if (docsSubidos.length === 0) return;

	for (const documento of docsSubidos) {
		const tempPath = documento.storage_path!;
		const finalPath = generateFinalStoragePath(polizaId, documento.nombre_archivo);

		let usedPath = finalPath;
		const { error: moveError } = await supabase.storage
			.from("polizas-documentos")
			.move(tempPath, finalPath);

		if (moveError) {
			console.error("[DOCS] Error moviendo documento, usando ruta temporal:", moveError);
			usedPath = tempPath;
		}

		const { error: errorDoc } = await supabase.from("polizas_documentos").insert({
			poliza_id: polizaId,
			tipo_documento: documento.tipo_documento,
			nombre_archivo: documento.nombre_archivo,
			archivo_url: usedPath,
			tamano_bytes: documento.tamano_bytes,
			estado: "activo",
		});

		if (errorDoc) {
			console.error("[DOCS] Error registrando documento en BD:", errorDoc);
		}
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
				usar_factores_contado: formState.modalidad_pago.tipo === "credito" && formState.modalidad_pago.usar_factores_contado === true,
				estado: "pendiente",
				es_renovacion: formState.datos_basicos.es_renovacion || false,
				nro_poliza_anterior: formState.datos_basicos.es_renovacion ? (formState.datos_basicos.nro_poliza_anterior || null) : null,
			})
			.select()
			.single();

		if (errorPoliza || !poliza) {
			console.error("Error insertando póliza:", errorPoliza);
			return { success: false, error: mapSupabaseError(errorPoliza, "Error al guardar la póliza") };
		}

		// 3. Insertar datos dependientes con cleanup automático si falla
		try {
			await insertarPagos(supabase, poliza.id, formState);
			await insertarDatosRamo(supabase, poliza.id, formState);
		} catch (insertError) {
			console.error("Error en inserts dependientes, ejecutando limpieza:", insertError);
			await limpiarPolizaFallida(poliza.id);
			return {
				success: false,
				error: insertError instanceof Error
					? insertError.message
					: "Error guardando datos de la póliza. Los datos parciales fueron limpiados automáticamente.",
			};
		}

		// 4. Documentos (best-effort, fuera del boundary transaccional)
		await procesarDocumentos(supabase, poliza.id, formState);

		// 5. Revalidar la ruta de pólizas
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
