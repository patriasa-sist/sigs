// app/siniestros/actions.ts - Server Actions para Módulo de Siniestros

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPermission, getDataScopeFilter } from "@/utils/auth/helpers";
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
	ObtenerUsuariosResponsablesResponse,
	CambiarResponsableResponse,
	// Nuevos tipos
	EstadoSiniestroHistorialConUsuario,
	ObtenerEstadosCatalogoResponse,
	ObtenerHistorialEstadosResponse,
	CambiarEstadoSiniestroResponse,
	SiniestroVistaConEstado,
	ContactoClienteSiniestro,
	EnviarWhatsAppSiniestroResponse,
} from "@/types/siniestro";
import type { DatosEspecificosRamo, VehiculoAutomotor } from "@/types/cobranza";
import { generarURLWhatsApp } from "@/utils/whatsapp";

/**
 * Verificar permisos de siniestros, comercial o admin
 */
async function verificarPermisoSiniestros() {
	const { allowed, profile } = await checkPermission("siniestros.ver");

	if (!allowed || !profile) {
		return {
			authorized: false as const,
			error: "No tiene permisos para acceder al módulo de siniestros" as const,
		};
	}

	return { authorized: true as const, userId: profile.id, role: profile.role };
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
		// Aplicar scoping por equipo
		const scope = await getDataScopeFilter('siniestros');

		let query = supabase
			.from("siniestros_vista")
			.select("*")
			.order("fecha_siniestro", { ascending: false });

		if (scope.needsScoping) {
			if (scope.role === "siniestros") {
				// Rol siniestros: ve los suyos y los de su equipo
				query = query.in("responsable_id", scope.teamMemberIds);
			} else {
				// Comercial/agente: ve siniestros de polizas de su equipo
				query = query.in("poliza_responsable_id", scope.teamMemberIds);
			}
		}

		const { data: siniestros, error: siniestrosError } = await query;

		if (siniestrosError) throw siniestrosError;

		// Calcular requiere_atencion para cada siniestro
		const ahora = new Date();
		const siniestrosArray = (siniestros || []).map((s) => {
			const updatedAt = new Date(s.updated_at as string);
			const diasSinActualizacion = Math.floor((ahora.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
			return {
				...s,
				requiere_atencion: s.estado === "abierto" && diasSinActualizacion >= 10,
			};
		});

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
				fecha_reporte_compania: formState.detalles.fecha_reporte_compania,
				lugar_hecho: formState.detalles.lugar_hecho,
				departamento_id: formState.detalles.departamento_id,
				monto_reserva: formState.detalles.monto_reserva,
				moneda: formState.detalles.moneda,
				descripcion: formState.detalles.descripcion,
				contactos: formState.detalles.contactos, // Ahora es ContactoSiniestro[] en lugar de string[]
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
		// Obtener siniestro desde vista con estado actual
		const { data: siniestroRaw, error: siniestroError } = await supabase
			.from("siniestros_con_estado_actual")
			.select("*")
			.eq("id", siniestroId)
			.single();

		if (siniestroError) throw siniestroError;

		// Verificar scoping por equipo
		const scope = await getDataScopeFilter('siniestros');
		if (scope.needsScoping) {
			const hasAccess = scope.role === "siniestros"
				? scope.teamMemberIds.includes(siniestroRaw.responsable_id)
				: scope.teamMemberIds.includes(siniestroRaw.poliza_responsable_id);
			if (!hasAccess) {
				return { success: false, error: "No tiene acceso a este siniestro" };
			}
		}

		// Calcular requiere_atencion
		const ahora = new Date();
		const updatedAt = new Date(siniestroRaw.updated_at);
		const diasSinActualizacion = Math.floor((ahora.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
		const siniestro: SiniestroVistaConEstado = {
			...siniestroRaw,
			requiere_atencion: siniestroRaw.estado === "abierto" && diasSinActualizacion >= 10,
		};

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
			coberturasRaw?.map((c: Record<string, unknown>) => {
				const catalogo = c.coberturas_catalogo as Record<string, unknown> | null;
				return {
					id: (catalogo?.id as string) || "",
					nombre: (catalogo?.nombre as string) || "",
					descripcion: catalogo?.descripcion as string | undefined,
					codigo_puc: (catalogo?.codigo_puc as string) || "",
					ramo: (catalogo?.ramo as string) || "",
					es_custom: (catalogo?.es_custom as boolean) || false,
					activo: (catalogo?.activo as boolean) || false,
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
			documentosRaw?.map(
				(d: {
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
					const usuarioNombre =
						Array.isArray(d.usuario) && d.usuario.length > 0 ? d.usuario[0]?.full_name : undefined;
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
				}
			) || [];

		// Obtener observaciones
		const { data: observacionesRaw, error: observacionesError } = await supabase
			.from("siniestros_observaciones")
			.select("*, created_by")
			.eq("siniestro_id", siniestroId)
			.order("created_at", { ascending: false });

		if (observacionesError) throw observacionesError;

		// Enriquecer con nombres de usuario
		const observaciones = await Promise.all(
			(observacionesRaw || []).map(
				async (o: {
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
							usuario_nombre: "Sistema",
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
				}
			)
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
			(historialRaw || []).map(async (h) => {
				if (!h.created_by) {
					return {
						...h,
						created_by: undefined,
						usuario_nombre: "Sistema",
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
		const { data: clientesNaturales, error: errNat } = await supabase
			.from("natural_clients")
			.select("client_id, numero_documento, primer_nombre, primer_apellido")
			.or(
				`numero_documento.ilike.%${query}%,primer_nombre.ilike.%${query}%,segundo_nombre.ilike.%${query}%,primer_apellido.ilike.%${query}%,segundo_apellido.ilike.%${query}%`
			)
			.limit(30);

		console.log("[buscarPolizas] query:", query);
		console.log("[buscarPolizas] natural_clients:", clientesNaturales?.length, "error:", errNat?.message);

		if (clientesNaturales) {
			clientIdsEncontrados.push(...clientesNaturales.map((c) => c.client_id));
		}

		// 2. Buscar en clientes jurídicos por NIT o razón social
		const { data: clientesJuridicos, error: errJur } = await supabase
			.from("juridic_clients")
			.select("client_id, nit, razon_social")
			.or(`nit.ilike.%${query}%,razon_social.ilike.%${query}%`)
			.limit(30);

		console.log("[buscarPolizas] juridic_clients:", clientesJuridicos?.length, "error:", errJur?.message);

		if (clientesJuridicos) {
			clientIdsEncontrados.push(...clientesJuridicos.map((c) => c.client_id));
		}

		// 2b. Buscar en clientes unipersonales por NIT o razón social
		const { data: clientesUnipersonales, error: errUni } = await supabase
			.from("unipersonal_clients")
			.select("client_id, nit, razon_social")
			.or(`nit.ilike.%${query}%,razon_social.ilike.%${query}%`)
			.limit(30);

		console.log("[buscarPolizas] unipersonal_clients:", clientesUnipersonales?.length, "error:", errUni?.message);

		if (clientesUnipersonales) {
			clientIdsEncontrados.push(...clientesUnipersonales.map((c) => c.client_id));
		}

		console.log("[buscarPolizas] clientIdsEncontrados:", clientIdsEncontrados);

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

		console.log("[buscarPolizas] polizasRaw:", polizasRaw?.length, "error:", polizasError?.message);

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
					nombreCliente = `${natural.primer_nombre} ${natural.segundo_nombre || ""} ${
						natural.primer_apellido
					} ${natural.segundo_apellido || ""}`.trim();
					documentoCliente = natural.numero_documento;
					celularCliente = natural.celular || undefined;
					correoCliente = natural.correo_electronico || undefined;
				}
			} else if (cliente.client_type === "juridica") {
				const { data: juridico } = await supabase
					.from("juridic_clients")
					.select("*")
					.eq("client_id", cliente.id)
					.single();

				if (juridico) {
					nombreCliente = juridico.razon_social;
					documentoCliente = juridico.nit;
					correoCliente = juridico.correo_electronico || undefined;
				}
			} else if (cliente.client_type === "unipersonal") {
				const { data: unipersonal } = await supabase
					.from("unipersonal_clients")
					.select("*")
					.eq("client_id", cliente.id)
					.single();

				if (unipersonal) {
					nombreCliente = unipersonal.razon_social;
					documentoCliente = unipersonal.nit;
					correoCliente = unipersonal.correo_electronico_comercial || undefined;
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
				.select(
					"id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago, fecha_vencimiento_original, prorrogas_historial, observaciones"
				)
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

/**
 * Obtener usuarios elegibles como responsables de siniestros
 * (usuarios con rol: siniestros, comercial, admin)
 */
export async function obtenerUsuariosResponsables(): Promise<ObtenerUsuariosResponsablesResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Aplicar scoping: rol siniestros solo ve miembros de su equipo
		const scope = await getDataScopeFilter('siniestros');

		let query = supabase
			.from("profiles")
			.select("id, full_name, email, role")
			.in("role", ["siniestros", "admin"])
			.order("full_name");

		if (scope.needsScoping) {
			query = query.in("id", scope.teamMemberIds);
		}

		const { data: usuarios, error } = await query;

		if (error) throw error;

		return {
			success: true,
			data: {
				usuarios:
					usuarios?.map((u) => ({
						id: u.id,
						full_name: u.full_name || "Sin nombre",
						email: u.email || "",
						role: u.role || "",
					})) || [],
			},
		};
	} catch (error) {
		console.error("Error obteniendo usuarios responsables:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Cambiar el responsable de un siniestro
 */
export async function cambiarResponsableSiniestro(
	siniestroId: string,
	nuevoResponsableId: string
): Promise<CambiarResponsableResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Verificar que el siniestro existe
		const { data: siniestro, error: siniestroError } = await supabase
			.from("siniestros")
			.select("id")
			.eq("id", siniestroId)
			.single();

		if (siniestroError || !siniestro) {
			return { success: false, error: "Siniestro no encontrado" };
		}

		// Verificar que el nuevo responsable existe y tiene rol válido
		const { data: usuario, error: usuarioError } = await supabase
			.from("profiles")
			.select("id, role")
			.eq("id", nuevoResponsableId)
			.single();

		if (usuarioError || !usuario) {
			return { success: false, error: "Usuario no encontrado" };
		}

		if (!["siniestros", "comercial", "admin"].includes(usuario.role)) {
			return { success: false, error: "El usuario no tiene un rol válido para ser responsable" };
		}

		// Actualizar responsable (el trigger registrará el cambio en historial automáticamente)
		const { error: updateError } = await supabase
			.from("siniestros")
			.update({ responsable_id: nuevoResponsableId })
			.eq("id", siniestroId);

		if (updateError) throw updateError;

		// Revalidar rutas
		revalidatePath("/siniestros");
		revalidatePath(`/siniestros/editar/${siniestroId}`);

		return { success: true, data: undefined };
	} catch (error) {
		console.error("Error cambiando responsable del siniestro:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// NUEVAS FUNCIONES: SISTEMA DE ESTADOS
// ============================================

/**
 * Obtener catálogo de estados activos
 */
export async function obtenerEstadosCatalogo(): Promise<ObtenerEstadosCatalogoResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("siniestros_estados_catalogo")
			.select("*")
			.eq("activo", true)
			.order("orden", { ascending: true });

		if (error) throw error;

		return {
			success: true,
			data: { estados: data || [] },
		};
	} catch (error) {
		console.error("Error obteniendo catálogo de estados:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtener historial de estados de un siniestro
 */
export async function obtenerHistorialEstados(siniestroId: string): Promise<ObtenerHistorialEstadosResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("siniestros_estados_historial")
			.select(
				`
				*,
				estado:siniestros_estados_catalogo(*),
				perfil:profiles(full_name)
			`
			)
			.eq("siniestro_id", siniestroId)
			.order("created_at", { ascending: false });

		if (error) throw error;

		const historial: EstadoSiniestroHistorialConUsuario[] = (data || []).map((item) => ({
			id: item.id,
			siniestro_id: item.siniestro_id,
			estado_id: item.estado_id,
			observacion: item.observacion ?? undefined,
			created_by: item.created_by ?? undefined,
			created_at: item.created_at,
			estado: item.estado,
			usuario_nombre: item.perfil?.full_name,
		}));

		return {
			success: true,
			data: { historial },
		};
	} catch (error) {
		console.error("Error obteniendo historial de estados:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Cambiar estado de un siniestro
 * Nota: Las observaciones se manejan en el tab "Observaciones" separadamente
 */
export async function cambiarEstadoSiniestro(
	siniestroId: string,
	estadoId: string
): Promise<CambiarEstadoSiniestroResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { success: false, error: "No autenticado" };
	}

	try {
		// Verificar que el siniestro existe y está abierto
		const { data: siniestro, error: siniestroError } = await supabase
			.from("siniestros")
			.select("id, estado, poliza_id, codigo_siniestro")
			.eq("id", siniestroId)
			.single();

		if (siniestroError || !siniestro) {
			return { success: false, error: "Siniestro no encontrado" };
		}

		if (siniestro.estado !== "abierto") {
			return { success: false, error: "Solo se pueden cambiar estados de siniestros abiertos" };
		}

		// Obtener el estado actual (anterior) del siniestro desde el historial
		const { data: estadoAnteriorData } = await supabase
			.from("siniestros_estados_historial")
			.select(
				`
				estado_id,
				siniestros_estados_catalogo(nombre)
			`
			)
			.eq("siniestro_id", siniestroId)
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		let estadoAnteriorNombre = "Sin estado previo";
		if (estadoAnteriorData?.siniestros_estados_catalogo) {
			const catalogo = estadoAnteriorData.siniestros_estados_catalogo;
			// Puede ser un objeto o un array dependiendo de la configuración de Supabase
			if (Array.isArray(catalogo) && catalogo.length > 0) {
				estadoAnteriorNombre = (catalogo[0] as { nombre: string }).nombre || "Sin estado previo";
			} else if (typeof catalogo === "object" && "nombre" in catalogo) {
				estadoAnteriorNombre = (catalogo as { nombre: string }).nombre || "Sin estado previo";
			}
		}

		// Obtener el nombre del nuevo estado
		const { data: estadoData, error: estadoError } = await supabase
			.from("siniestros_estados_catalogo")
			.select("nombre")
			.eq("id", estadoId)
			.single();

		if (estadoError || !estadoData) {
			return { success: false, error: "Estado no encontrado" };
		}

		// Insertar en historial de estados (sin observación)
		const { data, error } = await supabase
			.from("siniestros_estados_historial")
			.insert({
				siniestro_id: siniestroId,
				estado_id: estadoId,
				observacion: null,
				created_by: user.id,
			})
			.select()
			.single();

		if (error) throw error;

		// Registrar en historial global usando campos existentes
		await supabase.from("siniestros_historial").insert({
			siniestro_id: siniestroId,
			accion: "cambio_estado",
			valor_nuevo: estadoData.nombre, // Guardar nombre del estado en valor_nuevo
			detalles: {
				estado_id: estadoId,
				estado_nombre: estadoData.nombre,
			},
			created_by: user.id,
		});

		// El trigger actualiza updated_at automáticamente, pero por si acaso lo hacemos explícito
		await supabase.from("siniestros").update({ updated_at: new Date().toISOString() }).eq("id", siniestroId);

		// Revalidar rutas
		revalidatePath("/siniestros");
		revalidatePath(`/siniestros/editar/${siniestroId}`);

		// Generar mensaje de WhatsApp automáticamente
		let whatsappData:
			| {
					url: string;
					mensaje: string;
					contacto: ContactoClienteSiniestro;
					estado_anterior: string;
					estado_nuevo: string;
			  }
			| undefined;

		try {
			// Obtener contacto del cliente
			const contactoResponse = await obtenerContactoParaWhatsApp(siniestroId);

			if (contactoResponse.success && contactoResponse.data) {
				const contacto = contactoResponse.data;
				const telefono = contacto.celular || contacto.telefono;

				if (telefono) {
					// Generar mensaje personalizado
					const mensaje = `Estimado/a *${contacto.nombre_completo}*,

Le informamos que el estado de su siniestro ha sido actualizado:
* *Cód. Siniestro:* ${siniestro.codigo_siniestro || "N/A"}
* *Estado anterior:* ${estadoAnteriorNombre}
* *Estado actual:* ${estadoData.nombre}
* *Fecha:* ${new Date().toLocaleDateString("es-BO")}

Hacemos todo lo posible para acelerar la conclusión de su caso y le informaremos de toda novedad lo más antes posible.
Para cualquier consulta, estamos a su disposición.

Saludos cordiales,
*PATRIA S.A.*`;

					// Generar URL de WhatsApp
					const url = generarURLWhatsApp(telefono, mensaje);

					whatsappData = {
						url,
						mensaje,
						contacto,
						estado_anterior: estadoAnteriorNombre as string,
						estado_nuevo: estadoData.nombre,
					};
				}
			}
		} catch (whatsappError) {
			// No fallar toda la operación si solo falla WhatsApp
			console.error("Error generando WhatsApp:", whatsappError);
		}

		return {
			success: true,
			data: {
				estado: data,
				whatsapp: whatsappData,
			},
		};
	} catch (error) {
		console.error("Error cambiando estado del siniestro:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtener siniestros con flag de atención (sin actualización en 10+ días)
 */
export async function obtenerSiniestrosConAtencion(): Promise<ObtenerSiniestrosResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Query a la vista que incluye el flag requiere_atencion
		const { data, error } = await supabase
			.from("siniestros_con_estado_actual")
			.select("*")
			.order("requiere_atencion", { ascending: false }) // Primero los que requieren atención
			.order("fecha_creacion", { ascending: false }); // Luego por fecha de creación (más reciente primero)

		if (error) throw error;

		// Calcular estadísticas
		const siniestros = (data || []) as SiniestroVistaConEstado[];

		const stats: SiniestrosStats = {
			total_abiertos: siniestros.filter((s) => s.estado === "abierto").length,
			total_cerrados_mes: siniestros.filter((s) => {
				if (s.estado === "abierto") return false;
				const fechaCierre = new Date(s.fecha_cierre || "");
				const hace30Dias = new Date();
				hace30Dias.setDate(hace30Dias.getDate() - 30);
				return fechaCierre >= hace30Dias;
			}).length,
			monto_total_reservado: siniestros
				.filter((s) => s.estado === "abierto")
				.reduce((sum, s) => sum + (s.monto_reserva || 0), 0),
			promedio_dias_cierre: 0, // Calcular si es necesario
			siniestros_por_estado: {
				abierto: siniestros.filter((s) => s.estado === "abierto").length,
				rechazado: siniestros.filter((s) => s.estado === "rechazado").length,
				declinado: siniestros.filter((s) => s.estado === "declinado").length,
				concluido: siniestros.filter((s) => s.estado === "concluido").length,
			},
			siniestros_por_ramo: Object.entries(
				siniestros.reduce((acc, s) => {
					acc[s.ramo] = (acc[s.ramo] || 0) + 1;
					return acc;
				}, {} as Record<string, number>)
			).map(([ramo, cantidad]) => ({ ramo, cantidad })),
		};

		return {
			success: true,
			data: {
				siniestros: siniestros as SiniestroVistaConEstado[],
				stats,
			},
		};
	} catch (error) {
		console.error("Error obteniendo siniestros con atención:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// NUEVAS FUNCIONES: DETALLE DE PÓLIZA Y WHATSAPP
// ============================================

/**
 * Obtener contacto del cliente para WhatsApp
 */
export async function obtenerContactoParaWhatsApp(
	siniestroId: string
): Promise<{ success: boolean; data?: ContactoClienteSiniestro; error?: string }> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Obtener póliza asociada al siniestro
		const { data: siniestro, error: siniestroError } = await supabase
			.from("siniestros")
			.select("poliza_id")
			.eq("id", siniestroId)
			.single();

		if (siniestroError || !siniestro) {
			return { success: false, error: "Siniestro no encontrado" };
		}

		// Obtener contacto usando función SQL
		const { data: contacto, error: contactoError } = await supabase
			.rpc("obtener_contacto_poliza", { poliza_id_param: siniestro.poliza_id })
			.single();

		if (contactoError) {
			console.error("Error al obtener contacto:", contactoError);
			return { success: false, error: "Error al obtener contacto del cliente" };
		}

		if (!contacto) {
			return { success: false, error: "No se encontró contacto del cliente" };
		}

		return {
			success: true,
			data: contacto as ContactoClienteSiniestro,
		};
	} catch (error) {
		console.error("Error obteniendo contacto para WhatsApp:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Generar URL de WhatsApp para registro de siniestro
 */
export async function generarWhatsAppRegistroSiniestro(siniestroId: string): Promise<EnviarWhatsAppSiniestroResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Obtener datos del siniestro con póliza
		const { data: siniestro, error: siniestroError } = await supabase
			.from("siniestros")
			.select(
				`
				codigo_siniestro,
				fecha_siniestro,
				poliza:polizas(
					numero_poliza,
					ramo
				)
			`
			)
			.eq("id", siniestroId)
			.single();

		if (siniestroError || !siniestro) {
			return { success: false, error: "Siniestro no encontrado" };
		}

		// Obtener contacto
		const contactoResponse = await obtenerContactoParaWhatsApp(siniestroId);
		if (!contactoResponse.success || !contactoResponse.data) {
			return { success: false, error: contactoResponse.error || "No se encontró contacto" };
		}

		const contacto = contactoResponse.data;
		const telefono = contacto.celular || contacto.telefono;

		if (!telefono) {
			return { success: false, error: "No se encontró número de contacto" };
		}

		// Generar mensaje
		const mensaje = `Estimado/a *${contacto.nombre_completo}*,

Le informamos que su siniestro ha sido registrado exitosamente y se encuentra en proceso activo de resolución:
* *Cód. Siniestro:* ${siniestro.codigo_siniestro}
* *Fecha del siniestro:* ${new Date(siniestro.fecha_siniestro).toLocaleDateString("es-BO")}
* *Póliza:* ${
			typeof siniestro.poliza === "object" && siniestro.poliza && "numero_poliza" in siniestro.poliza
				? siniestro.poliza.numero_poliza
				: "N/A"
		}

Le informaremos de toda novedad con respecto a su caso lo más antes posible.
Para cualquier consulta, no dude en contactarnos.

Saludos cordiales,
*PATRIA S.A.*`;

		// Generar URL
		const url = generarURLWhatsApp(telefono, mensaje);

		return { success: true, data: { url } };
	} catch (error) {
		console.error("Error generando WhatsApp de registro:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Generar URL de WhatsApp para cierre de siniestro
 */
export async function generarWhatsAppCierreSiniestro(
	siniestroId: string,
	tipoCierre: "rechazado" | "declinado" | "concluido"
): Promise<EnviarWhatsAppSiniestroResponse> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Obtener datos del siniestro con póliza
		const { data: siniestro, error: siniestroError } = await supabase
			.from("siniestros")
			.select(
				`
				codigo_siniestro,
				poliza:polizas(
					numero_poliza,
					ramo
				)
			`
			)
			.eq("id", siniestroId)
			.single();

		if (siniestroError || !siniestro) {
			return { success: false, error: "Siniestro no encontrado" };
		}

		// Obtener contacto
		const contactoResponse = await obtenerContactoParaWhatsApp(siniestroId);
		if (!contactoResponse.success || !contactoResponse.data) {
			return { success: false, error: contactoResponse.error || "No se encontró contacto" };
		}

		const contacto = contactoResponse.data;
		const telefono = contacto.celular || contacto.telefono;

		if (!telefono) {
			return { success: false, error: "No se encontró número de contacto" };
		}

		// Generar mensaje según tipo de cierre
		let estadoTexto = "";
		let detalleTexto = "";

		switch (tipoCierre) {
			case "rechazado":
				estadoTexto = "*RECHAZADO*";
				detalleTexto =
					"Lamentamos informarle que a pesar de todos nuestros esfuerzos su siniestro ha sido rechazado de acuerdo a la carta adjunta por parte de la compañía.";
				break;
			case "declinado":
				estadoTexto = "*DECLINADO*";
				detalleTexto =
					"Se le informa que *con la conformidad de su persona*, procedemos a informar a su compañía aseguradora y dar de baja el presente caso.";
				break;
			case "concluido":
				estadoTexto = "*CONCLUIDO*";
				detalleTexto =
					"Nos complace informarle que su siniestro ha concluido exitosamente, por lo cual se procede al cierre del mismo.";
				break;
		}

		const mensaje = `Estimado/a *${contacto.nombre_completo}*,

${detalleTexto}

${estadoTexto}
* *Cód. Siniestro:* ${siniestro.codigo_siniestro}
* *Póliza:* ${
			typeof siniestro.poliza === "object" && siniestro.poliza && "numero_poliza" in siniestro.poliza
				? siniestro.poliza.numero_poliza
				: "N/A"
		}
* *Fecha de cierre:* ${new Date().toLocaleDateString("es-BO")}

Para cualquier consulta o aclaración, estamos a su disposición.

Sin otro particular y a la espera de poder servirle en otra ocacion, aprovechamos para saludarlo muy atentamente.
*PATRIA S.A.*`;

		// Generar URL
		const url = generarURLWhatsApp(telefono, mensaje);

		return { success: true, data: { url } };
	} catch (error) {
		console.error("Error generando WhatsApp de cierre:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtener detalle completo de póliza (para mostrar en siniestros)
 * Patrón similar a cobranzas
 */
export async function obtenerDetalleCompletoPoliza(polizaId: string): Promise<{
	success: boolean;
	data?: {
		poliza: Record<string, unknown>;
		contacto: ContactoClienteSiniestro;
		datos_ramo: DatosEspecificosRamo;
	};
	error?: string;
}> {
	const permiso = await verificarPermisoSiniestros();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// 1. Query base de póliza
		const { data: poliza, error: polizaError } = await supabase
			.from("polizas")
			.select(
				`
				*,
				compania:companias_aseguradoras(nombre),
				regional:regionales(nombre),
				responsable:profiles!polizas_responsable_id_fkey(full_name)
			`
			)
			.eq("id", polizaId)
			.single();

		if (polizaError || !poliza) {
			console.error("Error obteniendo póliza:", polizaError);
			return { success: false, error: "Póliza no encontrada" };
		}

		// 2. Obtener información del cliente
		const clientId = poliza.client_id;
		let contacto: ContactoClienteSiniestro = {
			nombre_completo: "Desconocido",
			documento: null,
			telefono: null,
			celular: null,
			correo: null,
		};

		if (clientId) {
			// Obtener tipo de cliente
			const { data: client } = await supabase
				.from("clients")
				.select("id, client_type")
				.eq("id", clientId)
				.single();

			if (client) {
				if (client.client_type === "natural") {
					const { data: naturalClient } = await supabase
						.from("natural_clients")
						.select(
							"primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento, celular, correo_electronico"
						)
						.eq("client_id", clientId)
						.single();

					if (naturalClient) {
						contacto = {
							nombre_completo: `${naturalClient.primer_nombre || ""} ${
								naturalClient.segundo_nombre || ""
							} ${naturalClient.primer_apellido || ""} ${naturalClient.segundo_apellido || ""}`.trim(),
							documento: naturalClient.numero_documento,
							telefono: null,
							celular: naturalClient.celular,
							correo: naturalClient.correo_electronico,
						};
					}
				} else if (client.client_type === "juridic") {
					const { data: juridicClient } = await supabase
						.from("juridic_clients")
						.select("razon_social, nit, telefono, correo_electronico")
						.eq("client_id", clientId)
						.single();

					if (juridicClient) {
						contacto = {
							nombre_completo: juridicClient.razon_social || "Desconocido",
							documento: juridicClient.nit,
							telefono: juridicClient.telefono,
							celular: null,
							correo: juridicClient.correo_electronico,
						};
					}
				}
			}
		}

		// 3. Obtener datos específicos por ramo
		let datos_ramo: DatosEspecificosRamo = { tipo: "otros", descripcion: poliza.ramo };

		const ramoLower = (poliza.ramo || "").toLowerCase();

		if (ramoLower.includes("automotor")) {
			const { data: vehiculos } = await supabase
				.from("polizas_automotor_vehiculos")
				.select(
					`
					id,
					placa,
					valor_asegurado,
					tipo_vehiculo:tipos_vehiculo(nombre),
					marca:marcas_vehiculo(nombre),
					modelo,
					ano,
					color
				`
				)
				.eq("poliza_id", polizaId);

			const vehiculosFormateados: VehiculoAutomotor[] = (vehiculos || []).map((v: Record<string, unknown>) => ({
				id: v.id as string,
				placa: v.placa as string,
				tipo_vehiculo: (v.tipo_vehiculo as Record<string, unknown> | null)?.nombre as string | undefined,
				marca: (v.marca as Record<string, unknown> | null)?.nombre as string | undefined,
				modelo: v.modelo as string | undefined,
				ano: v.ano as number | undefined,
				color: v.color as string | undefined,
				valor_asegurado: v.valor_asegurado as number,
			}));

			datos_ramo = {
				tipo: "automotor",
				vehiculos: vehiculosFormateados,
			};
		} else if (ramoLower.includes("salud") || ramoLower.includes("vida") || ramoLower.includes("sepelio")) {
			// TODO: Implementar query para asegurados cuando esté disponible
			datos_ramo = {
				tipo: "salud",
				asegurados: [],
			};
		} else if (ramoLower.includes("incendio")) {
			// TODO: Implementar query para ubicaciones
			datos_ramo = {
				tipo: "incendio",
				ubicaciones: [],
			};
		}

		return {
			success: true,
			data: {
				poliza,
				contacto,
				datos_ramo,
			},
		};
	} catch (error) {
		console.error("Error obteniendo detalle completo de póliza:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
