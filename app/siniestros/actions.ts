// app/siniestros/actions.ts - Server Actions para Módulo de Siniestros

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
	RegistroSiniestroFormState,
	GuardarSiniestroResponse,
	ObtenerSiniestrosResponse,
	ObtenerSiniestroDetalleResponse,
	SiniestrosStats,
	DatosCierreRechazo,
	DatosCierreDeclinacion,
	DatosCierreIndemnizacion,
	AgregarObservacionResponse,
	CerrarSiniestroResponse,
	BusquedaPolizasResponse,
	PolizaParaSiniestro,
	ObtenerCoberturasPorRamoResponse,
	AgregarDocumentosResponse,
	DocumentoSiniestro,
	TipoDocumentoSiniestro,
} from "@/types/siniestro";

/**
 * Verificar permisos de siniestros, comercial o admin
 */
async function verificarPermisoSiniestros() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { authorized: false as const, error: "No autenticado" as const };
	}

	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

	if (
		!profile ||
		(profile.role !== "siniestros" && profile.role !== "comercial" && profile.role !== "admin")
	) {
		return {
			authorized: false as const,
			error: "No tiene permisos para acceder al módulo de siniestros" as const,
		};
	}

	return { authorized: true as const, userId: user.id, role: profile.role };
}

/**
 * Obtener todos los siniestros con estadísticas
 */
export async function obtenerSiniestros(): Promise<ObtenerSiniestrosResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Obtener siniestros desde vista
		const { data: siniestros, error: siniestrosError } = await supabase
			.from("siniestros_vista")
			.select("*")
			.order("fecha_siniestro", { ascending: false });

		if (siniestrosError) throw siniestrosError;

		const siniestrosArray = siniestros || [];

		// Calcular estadísticas
		const hoy = new Date();
		const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

		const stats: SiniestrosStats = {
			total_abiertos: siniestrosArray.filter((s) => s.estado === "abierto").length,
			total_cerrados_mes: siniestrosArray.filter((s) => {
				if (!s.fecha_cierre) return false;
				const fechaCierre = new Date(s.fecha_cierre);
				return fechaCierre >= inicioMes;
			}).length,
			monto_total_reservado: siniestrosArray
				.filter((s) => s.estado === "abierto")
				.reduce((acc, s) => acc + s.monto_reserva, 0),
			promedio_dias_cierre: 0, // TODO: calcular promedio de días entre creación y cierre
			siniestros_por_estado: {
				abierto: siniestrosArray.filter((s) => s.estado === "abierto").length,
				rechazado: siniestrosArray.filter((s) => s.estado === "rechazado").length,
				declinado: siniestrosArray.filter((s) => s.estado === "declinado").length,
				concluido: siniestrosArray.filter((s) => s.estado === "concluido").length,
			},
			siniestros_por_ramo: [], // TODO: agrupar por ramo si es necesario
		};

		return {
			success: true,
			data: {
				siniestros: siniestrosArray,
				stats,
			},
		};
	} catch (error) {
		console.error("Error obteniendo siniestros:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Guardar nuevo siniestro (4 pasos)
 */
export async function guardarSiniestro(formState: RegistroSiniestroFormState): Promise<GuardarSiniestroResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	// Validaciones
	if (!formState.poliza_seleccionada || !formState.detalles || !formState.coberturas) {
		return { success: false, error: "Datos incompletos" };
	}

	try {
		// 1. Insertar siniestro principal
		const { data: siniestro, error: siniestroError } = await supabase
			.from("siniestros")
			.insert({
				poliza_id: formState.poliza_seleccionada.id,
				fecha_siniestro: formState.detalles.fecha_siniestro,
				fecha_reporte: formState.detalles.fecha_reporte,
				lugar_hecho: formState.detalles.lugar_hecho,
				departamento_id: formState.detalles.departamento_id,
				monto_reserva: formState.detalles.monto_reserva,
				moneda: formState.detalles.moneda,
				descripcion: formState.detalles.descripcion,
				contactos: formState.detalles.contactos,
				responsable_id: formState.detalles.responsable_id || null, // Si no se especifica, el trigger asignará created_by
				estado: "abierto",
			})
			.select()
			.single();

		if (siniestroError) throw siniestroError;

		// 2. Insertar coberturas seleccionadas
		if (formState.coberturas.coberturas_seleccionadas.length > 0) {
			const coberturasData = formState.coberturas.coberturas_seleccionadas.map((cob) => ({
				siniestro_id: siniestro.id,
				cobertura_id: cob.id,
			}));

			const { error: coberturasError } = await supabase.from("siniestros_coberturas").insert(coberturasData);

			if (coberturasError) throw coberturasError;
		}

		// 3. Si hay cobertura custom, agregarla al catálogo primero
		if (formState.coberturas.nueva_cobertura) {
			const { data: nuevaCobertura, error: coberturaError } = await supabase
				.from("coberturas_catalogo")
				.insert({
					nombre: formState.coberturas.nueva_cobertura.nombre,
					descripcion: formState.coberturas.nueva_cobertura.descripcion,
					ramo: formState.poliza_seleccionada.ramo,
					es_custom: true,
				})
				.select()
				.single();

			if (coberturaError) throw coberturaError;

			// Asociar nueva cobertura al siniestro
			await supabase.from("siniestros_coberturas").insert({
				siniestro_id: siniestro.id,
				cobertura_id: nuevaCobertura.id,
			});
		}

		// 4. Subir documentos iniciales
		if (formState.documentos_iniciales.length > 0) {
			for (const doc of formState.documentos_iniciales) {
				if (!doc.file) continue;

				// Sanitizar nombre de archivo
				const timestamp = Date.now();
				const sanitizedName = doc.nombre_archivo
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.replace(/[^a-zA-Z0-9.-]/g, "_")
					.replace(/_+/g, "_")
					.toLowerCase();

				const storagePath = `${siniestro.id}/${timestamp}-${sanitizedName}`;

				// Upload a Storage
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("siniestros-documentos")
					.upload(storagePath, doc.file);

				if (uploadError) {
					console.error(`Error uploading ${doc.nombre_archivo}:`, uploadError);
					continue; // Continuar con siguiente documento
				}

				// Insertar metadata en BD
				await supabase.from("siniestros_documentos").insert({
					siniestro_id: siniestro.id,
					tipo_documento: doc.tipo_documento,
					nombre_archivo: doc.nombre_archivo,
					archivo_url: uploadData.path,
					tamano_bytes: doc.file.size,
				});
			}
		}

		revalidatePath("/siniestros");

		return {
			success: true,
			data: { siniestro_id: siniestro.id },
		};
	} catch (error) {
		console.error("Error guardando siniestro:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtener detalle completo de un siniestro
 */
export async function obtenerSiniestroDetalle(siniestroId: string): Promise<ObtenerSiniestroDetalleResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Obtener siniestro desde vista
		const { data: siniestro, error: siniestroError } = await supabase
			.from("siniestros_vista")
			.select("*")
			.eq("id", siniestroId)
			.single();

		if (siniestroError) throw siniestroError;

		// Obtener coberturas
		const { data: coberturasRaw, error: coberturasError } = await supabase
			.from("siniestros_coberturas")
			.select(
				`
        cobertura_id,
        coberturas_catalogo (
          id,
          nombre,
          descripcion,
          codigo_puc,
          ramo,
          es_custom,
          activo
        )
      `
			)
			.eq("siniestro_id", siniestroId);

		if (coberturasError) throw coberturasError;

		const coberturas =
			coberturasRaw?.map((c: {
				coberturas_catalogo: Array<{
					id: string;
					nombre: string;
					descripcion?: string;
				codigo_puc: string;
				ramo: string;
				es_custom: boolean;
				activo: boolean;
				}>;
			}) => {
				const catalogo = c.coberturas_catalogo[0];
				return {
					id: catalogo?.id || "",
					nombre: catalogo?.nombre || "",
					descripcion: catalogo?.descripcion,
				codigo_puc: catalogo?.codigo_puc || "",
				ramo: catalogo?.ramo || "",
				es_custom: catalogo?.es_custom || false,
				activo: catalogo?.activo || false,
				};
			}) || [];

		// Obtener documentos activos
		const { data: documentosRaw, error: documentosError } = await supabase
			.from("siniestros_documentos")
			.select(
				`
        *,
        usuario:profiles!siniestros_documentos_uploaded_by_fkey (
          full_name
        )
      `
			)
			.eq("siniestro_id", siniestroId)
			.eq("estado", "activo")
			.order("uploaded_at", { ascending: false });

		if (documentosError) throw documentosError;

		const documentos =
			documentosRaw?.map((d: {
				id: string;
				siniestro_id: string;
				tipo_documento: string;
				nombre_archivo: string;
				archivo_url: string;
				estado: string;
				uploaded_at: string;
				uploaded_by: string | null;
				usuario?: Array<{ full_name?: string }> | null;
			}) => {
				const usuarioNombre = Array.isArray(d.usuario) && d.usuario.length > 0 ? d.usuario[0]?.full_name : undefined;
				return {
					id: d.id,
					siniestro_id: d.siniestro_id,
					tipo_documento: d.tipo_documento as TipoDocumentoSiniestro,
					nombre_archivo: d.nombre_archivo,
					archivo_url: d.archivo_url,
					estado: d.estado as "activo" | "descartado",
					uploaded_at: d.uploaded_at,
					uploaded_by: d.uploaded_by ?? undefined,
					usuario_nombre: usuarioNombre,
				};
			}) || [];

		// Obtener observaciones
		const { data: observacionesRaw, error: observacionesError } = await supabase
			.from("siniestros_observaciones")
			.select("*, created_by")
			.eq("siniestro_id", siniestroId)
			.order("created_at", { ascending: false });

		if (observacionesError) throw observacionesError;

		// Enriquecer con nombres de usuario
		const observaciones = await Promise.all(
			(observacionesRaw || []).map(async (o: {
				id: string;
				siniestro_id: string;
				observacion: string;
				created_at: string;
				created_by: string | null;
			}) => {
				if (!o.created_by) {
					return {
					...o,
					created_by: undefined,
					usuario_nombre: "Sistema"
				};
				}

				const { data: usuario } = await supabase
					.from("profiles")
					.select("full_name")
					.eq("id", o.created_by)
					.single();

				return {
					...o,
					created_by: o.created_by ?? undefined,
					usuario_nombre: usuario?.full_name || "Usuario",
				};
			})
		);

		// Obtener historial
		const { data: historialRaw, error: historialError } = await supabase
			.from("siniestros_historial")
			.select("*, created_by")
			.eq("siniestro_id", siniestroId)
			.order("created_at", { ascending: false });

		if (historialError) throw historialError;

		// Enriquecer con nombres de usuario
		const historial = await Promise.all(
			(historialRaw || []).map(async (h: {
			id: string;
			siniestro_id: string;
			accion: string;
			estado_anterior: string | null;
			estado_nuevo: string;
			cambio_descripcion: string;
			created_at: string;
			created_by: string | null;
		}) => {
				if (!h.created_by) {
					return {
					...h,
					created_by: undefined,
					usuario_nombre: "Sistema"
				};
				}

				const { data: usuario } = await supabase
					.from("profiles")
					.select("full_name")
					.eq("id", h.created_by)
					.single();

				return {
					...h,
					created_by: h.created_by ?? undefined,
					usuario_nombre: usuario?.full_name || "Sistema",
				};
			})
		);

		return {
			success: true,
			data: {
				siniestro,
				coberturas,
				documentos,
				observaciones,
				historial,
			},
		};
	} catch (error) {
		console.error("Error obteniendo detalle de siniestro:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Agregar observación a siniestro
 */
export async function agregarObservacion(
	siniestroId: string,
	observacion: string
): Promise<AgregarObservacionResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("siniestros_observaciones")
			.insert({
				siniestro_id: siniestroId,
				observacion,
			})
			.select()
			.single();

		if (error) throw error;

		// Registrar en historial
		const { error: historialError } = await supabase.from("siniestros_historial").insert({
			siniestro_id: siniestroId,
			accion: "observacion_agregada",
			detalles: { observacion: observacion.substring(0, 100) }, // Solo primeros 100 caracteres
		});

		if (historialError) {
			console.error("Error registrando en historial:", historialError);
			// No fallar toda la operación si solo el historial falla
		}

		revalidatePath(`/siniestros/editar/${siniestroId}`);

		return { success: true, data: { observacion_id: data.id } };
	} catch (error) {
		console.error("Error agregando observación:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Agregar documentos adicionales a siniestro existente
 */
export async function agregarDocumentosSiniestro(
	siniestroId: string,
	documentos: DocumentoSiniestro[]
): Promise<AgregarDocumentosResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const documentosIds: string[] = [];

		for (const doc of documentos) {
			if (!doc.file) continue;

			// Sanitizar nombre de archivo
			const timestamp = Date.now();
			const sanitizedName = doc.nombre_archivo
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/[^a-zA-Z0-9.-]/g, "_")
				.replace(/_+/g, "_")
				.toLowerCase();

			const storagePath = `${siniestroId}/${timestamp}-${sanitizedName}`;

			// Upload a Storage
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("siniestros-documentos")
				.upload(storagePath, doc.file);

			if (uploadError) {
				console.error(`Error uploading ${doc.nombre_archivo}:`, uploadError);
				continue;
			}

			// Insertar metadata en BD
			const { data: docData, error: docError } = await supabase
				.from("siniestros_documentos")
				.insert({
					siniestro_id: siniestroId,
					tipo_documento: doc.tipo_documento,
					nombre_archivo: doc.nombre_archivo,
					archivo_url: uploadData.path,
					tamano_bytes: doc.file.size,
				})
				.select()
				.single();

			if (docError) {
				console.error(`Error inserting document metadata:`, docError);
				continue;
			}

			documentosIds.push(docData.id);

			// Registrar en historial
			await supabase.from("siniestros_historial").insert({
				siniestro_id: siniestroId,
				accion: "documento_agregado",
				detalles: {
					documento_id: docData.id,
					tipo_documento: doc.tipo_documento,
					nombre_archivo: doc.nombre_archivo,
				},
			});
		}

		revalidatePath(`/siniestros/editar/${siniestroId}`);

		return {
			success: true,
			data: { documentos_ids: documentosIds },
		};
	} catch (error) {
		console.error("Error agregando documentos:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Cerrar siniestro (rechazado, declinado o concluido)
 */
export async function cerrarSiniestro(
	siniestroId: string,
	datosCierre: DatosCierreRechazo | DatosCierreDeclinacion | DatosCierreIndemnizacion
): Promise<CerrarSiniestroResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const updateData: Record<string, unknown> = {
			fecha_cierre: new Date().toISOString(),
			cerrado_por: permiso.userId,
		};

		// Procesar según tipo de cierre
		if (datosCierre.tipo === "rechazo") {
			updateData.estado = "rechazado";
			updateData.motivo_cierre_tipo = "rechazo";
			updateData.motivo_rechazo = datosCierre.motivo_rechazo;

			// Subir carta de rechazo
			if (datosCierre.carta_rechazo.file) {
				const timestamp = Date.now();
				const sanitizedName = datosCierre.carta_rechazo.nombre_archivo
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.replace(/[^a-zA-Z0-9.-]/g, "_")
					.toLowerCase();

				const storagePath = `${siniestroId}/${timestamp}-carta_rechazo-${sanitizedName}`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("siniestros-documentos")
					.upload(storagePath, datosCierre.carta_rechazo.file);

				if (uploadError) throw uploadError;

				// Insertar metadata
				await supabase.from("siniestros_documentos").insert({
					siniestro_id: siniestroId,
					tipo_documento: "carta_rechazo",
					nombre_archivo: datosCierre.carta_rechazo.nombre_archivo,
					archivo_url: uploadData.path,
					tamano_bytes: datosCierre.carta_rechazo.file.size,
				});
			}
		} else if (datosCierre.tipo === "declinacion") {
			updateData.estado = "declinado";
			updateData.motivo_cierre_tipo = "declinacion";
			updateData.motivo_declinacion = datosCierre.motivo_declinacion;

			// Subir carta de respaldo
			if (datosCierre.carta_respaldo.file) {
				const timestamp = Date.now();
				const sanitizedName = datosCierre.carta_respaldo.nombre_archivo
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.replace(/[^a-zA-Z0-9.-]/g, "_")
					.toLowerCase();

				const storagePath = `${siniestroId}/${timestamp}-carta_respaldo-${sanitizedName}`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("siniestros-documentos")
					.upload(storagePath, datosCierre.carta_respaldo.file);

				if (uploadError) throw uploadError;

				await supabase.from("siniestros_documentos").insert({
					siniestro_id: siniestroId,
					tipo_documento: "carta_respaldo",
					nombre_archivo: datosCierre.carta_respaldo.nombre_archivo,
					archivo_url: uploadData.path,
					tamano_bytes: datosCierre.carta_respaldo.file.size,
				});
			}
		} else if (datosCierre.tipo === "indemnizacion") {
			updateData.estado = "concluido";
			updateData.motivo_cierre_tipo = "indemnizacion";
			updateData.monto_reclamado = datosCierre.monto_reclamado;
			updateData.moneda_reclamado = datosCierre.moneda_reclamado;
			updateData.deducible = datosCierre.deducible;
			updateData.moneda_deducible = datosCierre.moneda_deducible;
			updateData.monto_pagado = datosCierre.monto_pagado;
			updateData.moneda_pagado = datosCierre.moneda_pagado;
			updateData.es_pago_comercial = datosCierre.es_pago_comercial;

			// Subir archivos UIF y PEP
			const archivosObligatorios = [
				{ doc: datosCierre.archivo_uif, tipo: "archivo_uif", prefix: "uif" },
				{ doc: datosCierre.archivo_pep, tipo: "archivo_pep", prefix: "pep" },
			];

			for (const { doc, tipo, prefix } of archivosObligatorios) {
				if (!doc.file) continue;

				const timestamp = Date.now();
				const sanitizedName = doc.nombre_archivo
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.replace(/[^a-zA-Z0-9.-]/g, "_")
					.toLowerCase();

				const storagePath = `${siniestroId}/${timestamp}-${prefix}-${sanitizedName}`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("siniestros-documentos")
					.upload(storagePath, doc.file);

				if (uploadError) throw uploadError;

				await supabase.from("siniestros_documentos").insert({
					siniestro_id: siniestroId,
					tipo_documento: tipo,
					nombre_archivo: doc.nombre_archivo,
					archivo_url: uploadData.path,
					tamano_bytes: doc.file.size,
				});
			}
		}

		const { error } = await supabase.from("siniestros").update(updateData).eq("id", siniestroId);

		if (error) throw error;

		revalidatePath("/siniestros");
		revalidatePath(`/siniestros/editar/${siniestroId}`);

		return {
			success: true,
			data: {
				siniestro_id: siniestroId,
				estado_final: updateData.estado as "rechazado" | "declinado" | "concluido",
			},
		};
	} catch (error) {
		console.error("Error cerrando siniestro:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Buscar pólizas activas para siniestros
 */
export async function buscarPolizasActivas(query: string): Promise<BusquedaPolizasResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const clientIdsEncontrados: string[] = [];

		// 1. Buscar en clientes naturales por CI, nombre o apellido
		const { data: clientesNaturales } = await supabase
			.from("natural_clients")
			.select("client_id, numero_documento, primer_nombre, primer_apellido")
			.or(
				`numero_documento.ilike.%${query}%,primer_nombre.ilike.%${query}%,segundo_nombre.ilike.%${query}%,primer_apellido.ilike.%${query}%,segundo_apellido.ilike.%${query}%`
			)
			.limit(30);

		if (clientesNaturales) {
			clientIdsEncontrados.push(...clientesNaturales.map((c) => c.client_id));
		}

		// 2. Buscar en clientes jurídicos por NIT o razón social
		const { data: clientesJuridicos } = await supabase
			.from("juridic_clients")
			.select("client_id, nit, razon_social")
			.or(`nit.ilike.%${query}%,razon_social.ilike.%${query}%`)
			.limit(30);

		if (clientesJuridicos) {
			clientIdsEncontrados.push(...clientesJuridicos.map((c) => c.client_id));
		}

		// 3. Buscar pólizas activas que coincidan con el query (número de póliza) O con los client_ids encontrados
		let polizasQuery = supabase
			.from("polizas")
			.select(
				`
        id,
        numero_poliza,
        ramo,
        inicio_vigencia,
        fin_vigencia,
        prima_total,
        moneda,
        client_id,
        responsable_id,
        compania_aseguradora_id
      `
			)
			.eq("estado", "activa");

		// Construir condición OR para búsqueda por número de póliza o client_id
		if (clientIdsEncontrados.length > 0) {
			// Buscar por número de póliza O por client_id en la lista de clientes encontrados
			polizasQuery = polizasQuery.or(
				`numero_poliza.ilike.%${query}%,client_id.in.(${clientIdsEncontrados.join(",")})`
			);
		} else {
			// Solo buscar por número de póliza
			polizasQuery = polizasQuery.ilike("numero_poliza", `%${query}%`);
		}

		const { data: polizasRaw, error: polizasError } = await polizasQuery.limit(20);

		if (polizasError) throw polizasError;

		// Enriquecer con datos relacionados
		const polizas: PolizaParaSiniestro[] = [];

		for (const pol of polizasRaw || []) {
			// Obtener cliente
			const { data: cliente } = await supabase.from("clients").select("*").eq("id", pol.client_id).single();

			if (!cliente) continue;

			let nombreCliente = "N/A";
			let documentoCliente = "N/A";
			let celularCliente: string | undefined;
			let correoCliente: string | undefined;

			if (cliente.client_type === "natural") {
				const { data: natural } = await supabase
					.from("natural_clients")
					.select("*")
					.eq("client_id", cliente.id)
					.single();

				if (natural) {
					nombreCliente = `${natural.primer_nombre} ${natural.segundo_nombre || ""} ${natural.primer_apellido} ${natural.segundo_apellido || ""}`.trim();
					documentoCliente = natural.numero_documento;
					celularCliente = natural.celular || undefined;
					correoCliente = natural.correo_electronico || undefined;
				}
			} else {
				const { data: juridico } = await supabase
					.from("juridic_clients")
					.select("*")
					.eq("client_id", cliente.id)
					.single();

				if (juridico) {
					nombreCliente = juridico.razon_social;
					documentoCliente = juridico.nit;
					correoCliente = juridico.correo_electronico || undefined;
					// Clientes jurídicos no tienen celular directo
				}
			}

			// Obtener responsable
			const { data: responsable } = await supabase
				.from("profiles")
				.select("id, full_name")
				.eq("id", pol.responsable_id)
				.single();

			// Obtener compañía
			const { data: compania } = await supabase
				.from("companias_aseguradoras")
				.select("id, nombre")
				.eq("id", pol.compania_aseguradora_id)
				.single();

			// Obtener cuotas de pago con prórrogas
			const { data: cuotasRaw } = await supabase
				.from("polizas_pagos")
				.select("id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago, fecha_vencimiento_original, prorrogas_historial, observaciones")
				.eq("poliza_id", pol.id)
				.order("numero_cuota");

			const cuotas = cuotasRaw || [];
			const cuotasPagadas = cuotas.filter((c) => c.estado === "pagada").length;
			const cuotasPendientes = cuotas.length - cuotasPagadas;

			// Obtener documentos activos de la póliza
			const { data: documentosRaw } = await supabase
				.from("polizas_documentos")
				.select("id, tipo_documento, nombre_archivo, archivo_url, tamano_bytes, estado")
				.eq("poliza_id", pol.id)
				.eq("estado", "activo");

			const documentos = documentosRaw || [];

			polizas.push({
				id: pol.id,
				numero_poliza: pol.numero_poliza,
				ramo: pol.ramo,
				inicio_vigencia: pol.inicio_vigencia,
				fin_vigencia: pol.fin_vigencia,
				prima_total: pol.prima_total,
				moneda: pol.moneda,
				cliente: {
					id: cliente.id,
					nombre_completo: nombreCliente,
					documento: documentoCliente,
					tipo: cliente.client_type,
					celular: celularCliente,
					correo_electronico: correoCliente,
				},
				responsable: {
					id: responsable?.id || "",
					full_name: responsable?.full_name || "N/A",
				},
				compania: {
					id: compania?.id || "",
					nombre: compania?.nombre || "N/A",
				},
				cuotas,
				cuotas_pagadas: cuotasPagadas,
				cuotas_pendientes: cuotasPendientes,
				cuotas_total: cuotas.length,
				documentos,
				total_documentos: documentos.length,
			});
		}

		return {
			success: true,
			data: { polizas },
		};
	} catch (error) {
		console.error("Error buscando pólizas activas:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtener coberturas predefinidas por ramo
 */
export async function obtenerCoberturasPorRamo(ramo: string): Promise<ObtenerCoberturasPorRamoResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const { data: coberturas, error } = await supabase
			.from("coberturas_catalogo")
			.select("*")
			.eq("ramo", ramo)
			.eq("activo", true)
			.order("nombre");

		if (error) throw error;

		return {
			success: true,
			data: { coberturas: coberturas || [] },
		};
	} catch (error) {
		console.error("Error obteniendo coberturas por ramo:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
