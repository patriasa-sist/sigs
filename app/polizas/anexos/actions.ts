"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { getDataScopeFilter } from "@/utils/auth/helpers";
import { generateFinalStoragePath } from "@/utils/fileUpload";
import type { AnexoFormState, PolizaResumenAnexo, DatosPolizaParaAnexo, CuotaConsolidada, CuotaVigenciaCorrida, AnexoResumen, PlanPagoInclusion } from "@/types/anexo";

// ============================================
// HELPERS
// ============================================

function mapAnexoError(
	error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
	context: string
): string {
	if (!error) return context;
	const code = error.code ?? "";
	const detail = error.details || error.hint || "";
	const msg = error.message || "";

	switch (code) {
		case "23505": {
			const target = msg + detail;
			if (target.includes("numero_anexo")) {
				return "Ya existe un anexo con ese número para esta póliza.";
			}
			if (target.includes("anulacion")) {
				return "Ya existe una anulación pendiente o activa para esta póliza.";
			}
			return `${context}: dato duplicado${detail ? ` — ${detail}` : ""}`;
		}
		case "23503":
			return `${context}: referencia inválida${detail ? ` — ${detail}` : ""}`;
		case "42501":
			return `${context}: sin permisos para realizar esta operación`;
		default:
			return `${context}: ${msg || "error desconocido"}${detail ? ` (${detail})` : ""}`;
	}
}

/**
 * Helper: verifica error de Supabase y lanza excepción si hay fallo.
 */
function throwIfAnexoError(
	error: { code?: string; message?: string; details?: string; hint?: string } | null,
	context: string
) {
	if (error) {
		throw new Error(mapAnexoError(error, context));
	}
}

/**
 * Limpia un anexo parcialmente creado.
 * Borra de todas las tablas hijas por anexo_id y luego el anexo principal.
 */
async function limpiarAnexoFallido(anexoId: string): Promise<void> {
	try {
		const supabaseAdmin = createAdminClient();

		// Tablas hijas de anexos (orden no importa, todas referencian anexo_id)
		const tablasHijas = [
			"polizas_anexos_automotor_vehiculos",
			"polizas_anexos_salud_asegurados",
			"polizas_anexos_salud_beneficiarios",
			"polizas_anexos_ramos_tecnicos_equipos",
			"polizas_anexos_aeronavegacion_naves",
			"polizas_anexos_incendio_bienes",
			"polizas_anexos_riesgos_varios_bienes",
			"polizas_anexos_asegurados_nivel",
			"polizas_anexos_pagos",
			"polizas_anexos_documentos",
		];

		// Recolectar rutas de archivos antes de borrar
		const { data: docs } = await supabaseAdmin
			.from("polizas_anexos_documentos")
			.select("archivo_url")
			.eq("anexo_id", anexoId);

		// Borrar tablas hijas
		for (const tabla of tablasHijas) {
			await supabaseAdmin.from(tabla).delete().eq("anexo_id", anexoId);
		}

		// Borrar anexo principal
		await supabaseAdmin.from("polizas_anexos").delete().eq("id", anexoId);

		// Borrar archivos de Storage
		const rutas = (docs || [])
			.map((d) => d.archivo_url)
			.filter(Boolean) as string[];
		if (rutas.length > 0) {
			await supabaseAdmin.storage.from("polizas-documentos").remove(rutas);
		}

		console.log("[CLEANUP] Anexo parcial limpiado correctamente:", anexoId);
	} catch (cleanupError) {
		console.error("[CLEANUP] Error limpiando anexo fallido:", cleanupError);
	}
}

// ============================================
// 1. BUSCAR PÓLIZAS PARA ANEXO
// ============================================

export async function buscarPolizasParaAnexo(query: string): Promise<{
	success: boolean;
	polizas?: PolizaResumenAnexo[];
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const scope = await getDataScopeFilter("polizas");

		// Buscar pólizas activas que coincidan con la query
		let polizaQuery = supabase
			.from("polizas")
			.select(`
				id, numero_poliza, ramo, client_id, prima_total, moneda,
				inicio_vigencia, fin_vigencia, estado, modalidad_pago,
				companias_aseguradoras!compania_aseguradora_id (nombre),
				responsable_id
			`)
			.eq("estado", "activa")
			.order("created_at", { ascending: false })
			.limit(20);

		// Filtrar por query (número de póliza)
		if (query.trim()) {
			polizaQuery = polizaQuery.ilike("numero_poliza", `%${query.trim()}%`);
		}

		if (scope.needsScoping) {
			polizaQuery = polizaQuery.in("responsable_id", scope.teamMemberIds);
		}

		const { data: polizas, error } = await polizaQuery;

		if (error) {
			console.error("Error buscando pólizas para anexo:", error);
			return { success: false, error: error.message };
		}

		if (!polizas || polizas.length === 0) {
			return { success: true, polizas: [] };
		}

		// Obtener nombres de clientes
		const clientIds = [...new Set(polizas.map((p) => p.client_id))];

		const [{ data: clients }, { data: naturalClients }, { data: juridicClients }] = await Promise.all([
			supabase.from("clients").select("id, client_type").in("id", clientIds),
			supabase.from("natural_clients")
				.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
				.in("client_id", clientIds),
			supabase.from("juridic_clients")
				.select("client_id, razon_social, nit")
				.in("client_id", clientIds),
		]);

		const clientsMap = new Map(clients?.map((c) => [c.id, c]) || []);
		const naturalMap = new Map(naturalClients?.map((c) => [c.client_id, c]) || []);
		const juridicMap = new Map(juridicClients?.map((c) => [c.client_id, c]) || []);

		// Verificar si tienen anulación pendiente/activa
		const polizaIds = polizas.map((p) => p.id);
		const { data: anulaciones } = await supabase
			.from("polizas_anexos")
			.select("poliza_id")
			.in("poliza_id", polizaIds)
			.eq("tipo_anexo", "anulacion")
			.in("estado", ["pendiente", "activo"]);

		const polizasConAnulacion = new Set(anulaciones?.map((a) => a.poliza_id) || []);

		const resultado: PolizaResumenAnexo[] = polizas.map((p) => {
			const client = clientsMap.get(p.client_id);
			let client_name = "Desconocido";
			let client_ci = "-";

			if (client?.client_type === "natural") {
				const nc = naturalMap.get(p.client_id);
				if (nc) {
					client_name = [nc.primer_nombre, nc.segundo_nombre, nc.primer_apellido, nc.segundo_apellido]
						.filter(Boolean).join(" ");
					client_ci = nc.numero_documento || "-";
				}
			} else if (client?.client_type === "juridica") {
				const jc = juridicMap.get(p.client_id);
				if (jc) {
					client_name = jc.razon_social;
					client_ci = jc.nit || "-";
				}
			}

			const compania = p.companias_aseguradoras as unknown as { nombre: string } | null;

			return {
				id: p.id,
				numero_poliza: p.numero_poliza,
				ramo: p.ramo,
				client_name,
				client_ci,
				compania_nombre: compania?.nombre || "-",
				prima_total: p.prima_total,
				moneda: p.moneda,
				inicio_vigencia: p.inicio_vigencia,
				fin_vigencia: p.fin_vigencia,
				estado: p.estado,
				modalidad_pago: p.modalidad_pago,
				tiene_anulacion_pendiente: polizasConAnulacion.has(p.id),
			};
		});

		return { success: true, polizas: resultado };
	} catch (error) {
		console.error("Error general buscando pólizas:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

// ============================================
// 2. OBTENER DATOS PARA ANEXO
// ============================================

export async function obtenerDatosParaAnexo(polizaId: string): Promise<{
	success: boolean;
	datos?: DatosPolizaParaAnexo;
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		// Cargar póliza, cuotas, y anexos activos en paralelo
		const [polizaResult, cuotasResult, anexosResult] = await Promise.all([
			supabase
				.from("polizas")
				.select(`
					id, numero_poliza, ramo, client_id, prima_total, moneda,
					inicio_vigencia, fin_vigencia, estado, modalidad_pago,
					companias_aseguradoras!compania_aseguradora_id (nombre)
				`)
				.eq("id", polizaId)
				.single(),
			supabase
				.from("polizas_pagos")
				.select("id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago")
				.eq("poliza_id", polizaId)
				.order("numero_cuota", { ascending: true }),
			supabase
				.from("polizas_anexos")
				.select(`
					id, numero_anexo, tipo_anexo, fecha_anexo, fecha_efectiva,
					estado, observaciones, created_by,
					profiles:profiles!created_by (full_name)
				`)
				.eq("poliza_id", polizaId)
				.in("estado", ["pendiente", "activo"])
				.order("created_at", { ascending: false }),
		]);

		if (polizaResult.error || !polizaResult.data) {
			return { success: false, error: "Póliza no encontrada" };
		}

		const poliza = polizaResult.data;

		if (poliza.estado !== "activa") {
			return { success: false, error: "Solo se pueden crear anexos en pólizas activas" };
		}

		// Obtener nombre del cliente
		const { data: client } = await supabase
			.from("clients")
			.select("id, client_type")
			.eq("id", poliza.client_id)
			.single();

		let client_name = "Desconocido";
		let client_ci = "-";

		if (client?.client_type === "natural") {
			const { data: nc } = await supabase
				.from("natural_clients")
				.select("primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
				.eq("client_id", poliza.client_id)
				.single();
			if (nc) {
				client_name = [nc.primer_nombre, nc.segundo_nombre, nc.primer_apellido, nc.segundo_apellido]
					.filter(Boolean).join(" ");
				client_ci = nc.numero_documento || "-";
			}
		} else if (client?.client_type === "juridica") {
			const { data: jc } = await supabase
				.from("juridic_clients")
				.select("razon_social, nit")
				.eq("client_id", poliza.client_id)
				.single();
			if (jc) {
				client_name = jc.razon_social;
				client_ci = jc.nit || "-";
			}
		}

		// Verificar anulación pendiente/activa
		const tieneAnulacion = (anexosResult.data || []).some(
			(a) => a.tipo_anexo === "anulacion" && (a.estado === "pendiente" || a.estado === "activo")
		);

		const compania = poliza.companias_aseguradoras as unknown as { nombre: string } | null;

		// Cargar items actuales del ramo (originales + incluidos por anexos activos, menos excluidos)
		const anexosActivos = (anexosResult.data || []).filter((a) => a.estado === "activo");
		const itemsActuales = await cargarItemsActualesRamo(supabase, polizaId, poliza.ramo, anexosActivos);

		const datos: DatosPolizaParaAnexo = {
			poliza: {
				id: poliza.id,
				numero_poliza: poliza.numero_poliza,
				ramo: poliza.ramo,
				client_name,
				client_ci,
				compania_nombre: compania?.nombre || "-",
				prima_total: poliza.prima_total,
				moneda: poliza.moneda,
				inicio_vigencia: poliza.inicio_vigencia,
				fin_vigencia: poliza.fin_vigencia,
				estado: poliza.estado,
				modalidad_pago: poliza.modalidad_pago,
				tiene_anulacion_pendiente: tieneAnulacion,
			},
			cuotas: (cuotasResult.data || []).map((c) => ({
				id: c.id,
				numero_cuota: c.numero_cuota,
				monto: c.monto,
				fecha_vencimiento: c.fecha_vencimiento,
				estado: c.estado || "pendiente",
				fecha_pago: c.fecha_pago || undefined,
			})),
			items_actuales: itemsActuales,
			anexos_activos: (anexosResult.data || []).map((a) => {
				const profile = a.profiles as unknown as { full_name: string } | null;
				return {
					id: a.id,
					numero_anexo: a.numero_anexo,
					tipo_anexo: a.tipo_anexo,
					fecha_anexo: a.fecha_anexo,
					fecha_efectiva: a.fecha_efectiva,
					estado: a.estado,
					observaciones: a.observaciones || undefined,
					created_by_nombre: profile?.full_name || undefined,
					cantidad_documentos: 0,
				};
			}),
		};

		return { success: true, datos };
	} catch (error) {
		console.error("Error obteniendo datos para anexo:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

/**
 * Carga los items actuales del ramo de una póliza para mostrar como contexto.
 * Incluye items originales + items agregados por anexos de inclusión activos,
 * y excluye items removidos por anexos de exclusión activos.
 */
async function cargarItemsActualesRamo(
	supabase: Awaited<ReturnType<typeof createClient>>,
	polizaId: string,
	ramo: string,
	anexosActivos: { id: string; tipo_anexo: string }[]
) {
	const ramoLower = ramo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	const inclusionIds = anexosActivos.filter((a) => a.tipo_anexo === "inclusion").map((a) => a.id);
	const exclusionIds = anexosActivos.filter((a) => a.tipo_anexo === "exclusion").map((a) => a.id);

	if (ramoLower.includes("automotor")) {
		const { data } = await supabase
			.from("polizas_automotor_vehiculos")
			.select("*")
			.eq("poliza_id", polizaId);
		let vehiculos = data || [];

		// Agregar vehículos incluidos por anexos activos
		if (inclusionIds.length > 0) {
			const { data: incluidos } = await supabase
				.from("polizas_anexos_automotor_vehiculos")
				.select("*")
				.in("anexo_id", inclusionIds)
				.eq("accion", "inclusion");
			if (incluidos) {
				vehiculos = [...vehiculos, ...incluidos.map((v) => ({ ...v, _origen_anexo: v.anexo_id }))];
			}
		}

		// Quitar vehículos excluidos por anexos activos
		if (exclusionIds.length > 0) {
			const { data: excluidos } = await supabase
				.from("polizas_anexos_automotor_vehiculos")
				.select("original_item_id")
				.in("anexo_id", exclusionIds)
				.eq("accion", "exclusion");
			if (excluidos) {
				const idsExcluidos = new Set(excluidos.map((e) => e.original_item_id));
				vehiculos = vehiculos.filter((v) => !idsExcluidos.has(v.id));
			}
		}

		if (vehiculos.length > 0) {
			return { tipo_ramo: "Automotores" as const, vehiculos };
		}
	}

	if (ramoLower.includes("salud") || ramoLower.includes("enfermedad")) {
		const [{ data: asegurados }, { data: beneficiarios }] = await Promise.all([
			supabase.from("polizas_salud_asegurados").select("*").eq("poliza_id", polizaId),
			supabase.from("polizas_salud_beneficiarios").select("*").eq("poliza_id", polizaId),
		]);
		let aseguradosList = asegurados || [];
		let beneficiariosList = beneficiarios || [];

		if (inclusionIds.length > 0) {
			const [{ data: asegInc }, { data: benInc }] = await Promise.all([
				supabase.from("polizas_anexos_salud_asegurados").select("*").in("anexo_id", inclusionIds).eq("accion", "inclusion"),
				supabase.from("polizas_anexos_salud_beneficiarios").select("*").in("anexo_id", inclusionIds).eq("accion", "inclusion"),
			]);
			if (asegInc) aseguradosList = [...aseguradosList, ...asegInc.map((a) => ({ ...a, _origen_anexo: a.anexo_id }))];
			if (benInc) beneficiariosList = [...beneficiariosList, ...benInc.map((b) => ({ ...b, _origen_anexo: b.anexo_id }))];
		}

		if (exclusionIds.length > 0) {
			const [{ data: asegExc }, { data: benExc }] = await Promise.all([
				supabase.from("polizas_anexos_salud_asegurados").select("original_item_id").in("anexo_id", exclusionIds).eq("accion", "exclusion"),
				supabase.from("polizas_anexos_salud_beneficiarios").select("original_item_id").in("anexo_id", exclusionIds).eq("accion", "exclusion"),
			]);
			if (asegExc) {
				const ids = new Set(asegExc.map((e) => e.original_item_id));
				aseguradosList = aseguradosList.filter((a) => !ids.has(a.id));
			}
			if (benExc) {
				const ids = new Set(benExc.map((e) => e.original_item_id));
				beneficiariosList = beneficiariosList.filter((b) => !ids.has(b.id));
			}
		}

		return {
			tipo_ramo: "Salud" as const,
			asegurados: aseguradosList,
			beneficiarios: beneficiariosList,
		};
	}

	if (ramoLower.includes("tecnicos") || ramoLower.includes("técnicos")) {
		const { data } = await supabase
			.from("polizas_ramos_tecnicos_equipos")
			.select("*")
			.eq("poliza_id", polizaId);
		let equipos = data || [];

		if (inclusionIds.length > 0) {
			const { data: incluidos } = await supabase
				.from("polizas_anexos_ramos_tecnicos_equipos")
				.select("*")
				.in("anexo_id", inclusionIds)
				.eq("accion", "inclusion");
			if (incluidos) equipos = [...equipos, ...incluidos.map((e) => ({ ...e, _origen_anexo: e.anexo_id }))];
		}
		if (exclusionIds.length > 0) {
			const { data: excluidos } = await supabase
				.from("polizas_anexos_ramos_tecnicos_equipos")
				.select("original_item_id")
				.in("anexo_id", exclusionIds)
				.eq("accion", "exclusion");
			if (excluidos) {
				const ids = new Set(excluidos.map((e) => e.original_item_id));
				equipos = equipos.filter((e) => !ids.has(e.id));
			}
		}

		if (equipos.length > 0) {
			return { tipo_ramo: "Ramos técnicos" as const, equipos };
		}
	}

	if (ramoLower.includes("aeronavegacion") || ramoLower.includes("naves") || ramoLower.includes("embarcacion")) {
		const { data } = await supabase
			.from("polizas_aeronavegacion_naves")
			.select("*")
			.eq("poliza_id", polizaId);
		const tipoRamo = ramoLower.includes("naves") || ramoLower.includes("embarcacion")
			? "Naves o embarcaciones" as const
			: "Aeronavegación" as const;
		let naves = data || [];

		if (inclusionIds.length > 0) {
			const { data: incluidos } = await supabase
				.from("polizas_anexos_aeronavegacion_naves")
				.select("*")
				.in("anexo_id", inclusionIds)
				.eq("accion", "inclusion");
			if (incluidos) naves = [...naves, ...incluidos.map((n) => ({ ...n, _origen_anexo: n.anexo_id }))];
		}
		if (exclusionIds.length > 0) {
			const { data: excluidos } = await supabase
				.from("polizas_anexos_aeronavegacion_naves")
				.select("original_item_id")
				.in("anexo_id", exclusionIds)
				.eq("accion", "exclusion");
			if (excluidos) {
				const ids = new Set(excluidos.map((e) => e.original_item_id));
				naves = naves.filter((n) => !ids.has(n.id));
			}
		}

		if (naves.length > 0) {
			return { tipo_ramo: tipoRamo, naves };
		}
	}

	if (ramoLower.includes("incendio")) {
		const { data } = await supabase
			.from("polizas_incendio_bienes")
			.select("*")
			.eq("poliza_id", polizaId);
		let bienes = data || [];

		if (inclusionIds.length > 0) {
			const { data: incluidos } = await supabase
				.from("polizas_anexos_incendio_bienes")
				.select("*")
				.in("anexo_id", inclusionIds)
				.eq("accion", "inclusion");
			if (incluidos) bienes = [...bienes, ...incluidos.map((b) => ({ ...b, _origen_anexo: b.anexo_id }))];
		}
		if (exclusionIds.length > 0) {
			const { data: excluidos } = await supabase
				.from("polizas_anexos_incendio_bienes")
				.select("original_item_id")
				.in("anexo_id", exclusionIds)
				.eq("accion", "exclusion");
			if (excluidos) {
				const ids = new Set(excluidos.map((e) => e.original_item_id));
				bienes = bienes.filter((b) => !ids.has(b.id));
			}
		}

		if (bienes.length > 0) {
			return { tipo_ramo: "Incendio y Aliados" as const, bienes };
		}
	}

	if (ramoLower.includes("riesgos varios") || ramoLower.includes("miscelaneos")) {
		const { data } = await supabase
			.from("polizas_riesgos_varios_bienes")
			.select("*")
			.eq("poliza_id", polizaId);
		let bienes = data || [];

		if (inclusionIds.length > 0) {
			const { data: incluidos } = await supabase
				.from("polizas_anexos_riesgos_varios_bienes")
				.select("*")
				.in("anexo_id", inclusionIds)
				.eq("accion", "inclusion");
			if (incluidos) bienes = [...bienes, ...incluidos.map((b) => ({ ...b, _origen_anexo: b.anexo_id }))];
		}
		if (exclusionIds.length > 0) {
			const { data: excluidos } = await supabase
				.from("polizas_anexos_riesgos_varios_bienes")
				.select("original_item_id")
				.in("anexo_id", exclusionIds)
				.eq("accion", "exclusion");
			if (excluidos) {
				const ids = new Set(excluidos.map((e) => e.original_item_id));
				bienes = bienes.filter((b) => !ids.has(b.id));
			}
		}

		if (bienes.length > 0) {
			return { tipo_ramo: "Riesgos Varios Misceláneos" as const, bienes };
		}
	}

	if (ramoLower.includes("accidentes personales") || ramoLower.includes("vida") || ramoLower.includes("sepelio")) {
		const { data } = await supabase
			.from("polizas_asegurados_nivel")
			.select("*")
			.eq("poliza_id", polizaId);
		let tipoRamo: "Accidentes Personales" | "Vida" | "Sepelio" = "Accidentes Personales";
		if (ramoLower.includes("vida")) tipoRamo = "Vida";
		else if (ramoLower.includes("sepelio")) tipoRamo = "Sepelio";
		let asegurados = data || [];

		if (inclusionIds.length > 0) {
			const { data: incluidos } = await supabase
				.from("polizas_anexos_asegurados_nivel")
				.select("*")
				.in("anexo_id", inclusionIds)
				.eq("accion", "inclusion");
			if (incluidos) asegurados = [...asegurados, ...incluidos.map((a) => ({ ...a, _origen_anexo: a.anexo_id }))];
		}
		if (exclusionIds.length > 0) {
			const { data: excluidos } = await supabase
				.from("polizas_anexos_asegurados_nivel")
				.select("original_item_id")
				.in("anexo_id", exclusionIds)
				.eq("accion", "exclusion");
			if (excluidos) {
				const ids = new Set(excluidos.map((e) => e.original_item_id));
				asegurados = asegurados.filter((a) => !ids.has(a.id));
			}
		}

		if (asegurados.length > 0) {
			return { tipo_ramo: tipoRamo, asegurados };
		}
	}

	return null;
}

// ============================================
// 3. GUARDAR ANEXO
// ============================================

export async function guardarAnexo(formState: AnexoFormState): Promise<{
	success: boolean;
	anexo_id?: string;
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		// Validaciones básicas
		if (!formState.poliza_id || !formState.config) {
			return { success: false, error: "Datos del anexo incompletos" };
		}

		// Verificar que la póliza sigue activa
		const { data: poliza } = await supabase
			.from("polizas")
			.select("id, estado, ramo")
			.eq("id", formState.poliza_id)
			.single();

		if (!poliza || poliza.estado !== "activa") {
			return { success: false, error: "La póliza no está activa. No se pueden crear anexos." };
		}

		// Verificar scope
		const scope = await getDataScopeFilter("polizas");
		if (scope.needsScoping) {
			const { data: polizaScope } = await supabase
				.from("polizas")
				.select("responsable_id")
				.eq("id", formState.poliza_id)
				.single();
			if (polizaScope && !scope.teamMemberIds.includes(polizaScope.responsable_id)) {
				return { success: false, error: "No tiene permisos para esta póliza" };
			}
		}

		// Validar plan de inclusión si corresponde
		if (formState.config.tipo_anexo === "inclusion") {
			const plan = formState.plan_pago_inclusion;
			if (!plan || plan.prima_total <= 0 || plan.cuotas.length === 0) {
				return { success: false, error: "El plan de pago de la inclusión es requerido" };
			}
		}

		// Verificar documento obligatorio
		const docsValidos = formState.documentos.filter(
			(d) => d.storage_path && d.upload_status === "uploaded"
		);
		if (docsValidos.length === 0) {
			return { success: false, error: "El documento de anexo es obligatorio" };
		}

		// --- INSERTAR ANEXO ---
		const { data: anexo, error: anexoError } = await supabase
			.from("polizas_anexos")
			.insert({
				poliza_id: formState.poliza_id,
				numero_anexo: formState.config.numero_anexo.trim(),
				tipo_anexo: formState.config.tipo_anexo,
				fecha_anexo: new Date().toISOString().split("T")[0],
				fecha_efectiva: formState.config.fecha_efectiva,
				observaciones: formState.config.observaciones?.trim() || null,
				estado: "pendiente",
				created_by: user.id,
			})
			.select("id")
			.single();

		if (anexoError || !anexo) {
			return { success: false, error: mapAnexoError(anexoError, "Error al crear el anexo") };
		}

		// --- INSERTAR DATOS DEPENDIENTES CON CLEANUP SI FALLA ---
		try {
			// Pagos del anexo
			if (formState.config.tipo_anexo === "anulacion") {
				if (formState.vigencia_corrida && formState.vigencia_corrida.monto > 0) {
					const { error: pagoError } = await supabase
						.from("polizas_anexos_pagos")
						.insert({
							anexo_id: anexo.id,
							cuota_original_id: null,
							tipo: "vigencia_corrida",
							numero_cuota: 0,
							monto: formState.vigencia_corrida.monto,
							fecha_vencimiento: formState.vigencia_corrida.fecha_vencimiento,
							estado: "pendiente",
							observaciones: formState.vigencia_corrida.observaciones?.trim() || "Cobro vigencia corrida",
						});

					throwIfAnexoError(pagoError, "Error al guardar vigencia corrida");
				}
			} else if (formState.config.tipo_anexo === "inclusion") {
				// Inclusión: cuotas propias del anexo, independientes de la póliza madre
				await guardarCuotasInclusion(supabase, anexo.id, formState.plan_pago_inclusion!);
			} else {
				// Exclusión: descuentos negativos sobre cuotas originales (incluso pagadas)
				const cuotasConDelta = formState.cuotas_ajuste.filter((c) => c.monto_delta !== 0);
				if (cuotasConDelta.length > 0) {
					const pagosInsert = cuotasConDelta.map((c) => ({
						anexo_id: anexo.id,
						cuota_original_id: c.cuota_original_id,
						tipo: "ajuste" as const,
						numero_cuota: c.numero_cuota,
						monto: c.monto_delta,
						fecha_vencimiento: c.fecha_vencimiento,
						estado: "pendiente" as const,
						observaciones: "Descuento por exclusión",
					}));

					const { error: pagosError } = await supabase
						.from("polizas_anexos_pagos")
						.insert(pagosInsert);

					throwIfAnexoError(pagosError, "Error al guardar descuentos de exclusión");
				}
			}

			// Items del ramo
			if (formState.items_cambio && formState.config.tipo_anexo !== "anulacion") {
				await insertarItemsRamo(supabase, anexo.id, formState.items_cambio);
			}
		} catch (insertError) {
			console.error("Error en inserts dependientes del anexo, ejecutando limpieza:", insertError);
			await limpiarAnexoFallido(anexo.id);
			return {
				success: false,
				error: insertError instanceof Error
					? insertError.message
					: "Error guardando datos del anexo. Los datos parciales fueron limpiados automáticamente.",
			};
		}

		// --- MOVER DOCUMENTOS (best-effort, fuera del boundary transaccional) ---
		for (const doc of docsValidos) {
			const tempPath = doc.storage_path!;
			const finalPath = generateFinalStoragePath(
				`anexos/${anexo.id}`,
				doc.nombre_archivo
			);

			const { error: moveError } = await supabase.storage
				.from("polizas-documentos")
				.move(tempPath, finalPath);

			const usedPath = moveError ? tempPath : finalPath;

			await supabase.from("polizas_anexos_documentos").insert({
				anexo_id: anexo.id,
				tipo_documento: doc.tipo_documento || "Documento de Anexo",
				nombre_archivo: doc.nombre_archivo,
				archivo_url: usedPath,
				tamano_bytes: doc.tamano_bytes || null,
				uploaded_by: user.id,
			});
		}

		revalidatePath("/polizas");
		revalidatePath(`/polizas/${formState.poliza_id}`);
		revalidatePath("/gerencia/validacion");

		return { success: true, anexo_id: anexo.id };
	} catch (error) {
		console.error("Error guardando anexo:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

/**
 * Guarda las cuotas propias de un anexo de inclusión.
 * Estas cuotas son independientes de las cuotas de la póliza madre.
 */
async function guardarCuotasInclusion(
	supabase: Awaited<ReturnType<typeof createClient>>,
	anexoId: string,
	plan: PlanPagoInclusion
) {
	if (plan.cuotas.length === 0) return;

	const rows = plan.cuotas.map((c) => ({
		anexo_id: anexoId,
		cuota_original_id: null,
		tipo: "cuota_propia" as const,
		numero_cuota: c.numero_cuota,
		monto: c.monto,
		fecha_vencimiento: c.fecha_vencimiento,
		estado: "pendiente" as const,
		observaciones: plan.modalidad === "contado" ? "Pago contado por inclusión" : `Cuota ${c.numero_cuota} de ${plan.cuotas.length} por inclusión`,
	}));

	const { error } = await supabase.from("polizas_anexos_pagos").insert(rows);
	throwIfAnexoError(error, "Error al guardar cuotas de inclusión");
}

/**
 * Inserta los items del ramo en las tablas espejo correspondientes
 */
async function insertarItemsRamo(
	supabase: Awaited<ReturnType<typeof createClient>>,
	anexoId: string,
	itemsCambio: NonNullable<AnexoFormState["items_cambio"]>
) {
	switch (itemsCambio.tipo_ramo) {
		case "Automotores": {
			if (itemsCambio.items.length > 0) {
				const rows = itemsCambio.items.map((item) => ({
					anexo_id: anexoId,
					accion: item.accion,
					original_item_id: item.original_item_id || null,
					placa: item.data.placa,
					valor_asegurado: item.data.valor_asegurado,
					franquicia: item.data.franquicia,
					nro_chasis: item.data.nro_chasis,
					uso: item.data.uso,
					coaseguro: item.data.coaseguro || 0,
					tipo_vehiculo_id: item.data.tipo_vehiculo_id || null,
					marca_id: item.data.marca_id || null,
					modelo: item.data.modelo || null,
					ano: item.data.ano || null,
					color: item.data.color || null,
					ejes: item.data.ejes || null,
					nro_motor: item.data.nro_motor || null,
					nro_asientos: item.data.nro_asientos || null,
					plaza_circulacion: item.data.plaza_circulacion || null,
				}));
				const { error } = await supabase.from("polizas_anexos_automotor_vehiculos").insert(rows);
				throwIfAnexoError(error, "Error al guardar vehículos del anexo");
			}
			break;
		}

		case "Salud": {
			if (itemsCambio.items_asegurados.length > 0) {
				const rows = itemsCambio.items_asegurados.map((item) => ({
					anexo_id: anexoId,
					accion: item.accion,
					original_item_id: item.original_item_id || null,
					client_id: item.data.client_id,
					nivel_id: item.data.nivel_id,
					rol: item.data.rol,
				}));
				const { error } = await supabase.from("polizas_anexos_salud_asegurados").insert(rows);
				throwIfAnexoError(error, "Error al guardar asegurados de salud del anexo");
			}

			if (itemsCambio.items_beneficiarios.length > 0) {
				const rows = itemsCambio.items_beneficiarios.map((item) => ({
					anexo_id: anexoId,
					accion: item.accion,
					original_item_id: item.original_item_id || null,
					nombre_completo: item.data.nombre_completo,
					carnet: item.data.carnet,
					fecha_nacimiento: item.data.fecha_nacimiento,
					genero: item.data.genero,
					nivel_id: item.data.nivel_id,
					rol: "titular",
				}));
				const { error } = await supabase.from("polizas_anexos_salud_beneficiarios").insert(rows);
				throwIfAnexoError(error, "Error al guardar beneficiarios de salud del anexo");
			}
			break;
		}

		case "Ramos técnicos": {
			if (itemsCambio.items.length > 0) {
				const rows = itemsCambio.items.map((item) => ({
					anexo_id: anexoId,
					accion: item.accion,
					original_item_id: item.original_item_id || null,
					nro_serie: item.data.nro_serie,
					valor_asegurado: item.data.valor_asegurado,
					franquicia: item.data.franquicia,
					nro_chasis: item.data.nro_chasis,
					uso: item.data.uso,
					coaseguro: item.data.coaseguro || 0,
					placa: item.data.placa || null,
					tipo_equipo_id: item.data.tipo_equipo_id || null,
					marca_equipo_id: item.data.marca_equipo_id || null,
					modelo: item.data.modelo || null,
					ano: item.data.ano || null,
					color: item.data.color || null,
					nro_motor: item.data.nro_motor || null,
					plaza_circulacion: item.data.plaza_circulacion || null,
				}));
				const { error } = await supabase.from("polizas_anexos_ramos_tecnicos_equipos").insert(rows);
				throwIfAnexoError(error, "Error al guardar equipos del anexo");
			}
			break;
		}

		case "Aeronavegación":
		case "Naves o embarcaciones": {
			if (itemsCambio.items.length > 0) {
				const rows = itemsCambio.items.map((item) => ({
					anexo_id: anexoId,
					accion: item.accion,
					original_item_id: item.original_item_id || null,
					matricula: item.data.matricula,
					marca: item.data.marca,
					modelo: item.data.modelo,
					ano: item.data.ano,
					serie: item.data.serie,
					uso: item.data.uso,
					nro_pasajeros: item.data.nro_pasajeros,
					nro_tripulantes: item.data.nro_tripulantes,
					valor_casco: item.data.valor_casco,
					valor_responsabilidad_civil: item.data.valor_responsabilidad_civil,
					nivel_ap_id: item.data.nivel_ap_id || null,
				}));
				const { error } = await supabase.from("polizas_anexos_aeronavegacion_naves").insert(rows);
				throwIfAnexoError(error, "Error al guardar naves del anexo");
			}
			break;
		}

		case "Incendio y Aliados": {
			if (itemsCambio.items.length > 0) {
				for (const item of itemsCambio.items) {
					const { error } = await supabase.from("polizas_anexos_incendio_bienes").insert({
						anexo_id: anexoId,
						accion: item.accion,
						original_item_id: item.original_item_id || null,
						direccion: item.data.direccion,
						valor_total_declarado: item.data.valor_total_declarado,
						es_primer_riesgo: item.data.es_primer_riesgo,
						items: JSON.stringify(item.data.items),
					});
					throwIfAnexoError(error, "Error al guardar bien de incendio del anexo");
				}
			}
			break;
		}

		case "Riesgos Varios Misceláneos": {
			if (itemsCambio.items.length > 0) {
				for (const item of itemsCambio.items) {
					const { error } = await supabase.from("polizas_anexos_riesgos_varios_bienes").insert({
						anexo_id: anexoId,
						accion: item.accion,
						original_item_id: item.original_item_id || null,
						direccion: item.data.direccion,
						valor_total_declarado: item.data.valor_total_declarado,
						es_primer_riesgo: item.data.es_primer_riesgo,
						items: JSON.stringify(item.data.items),
					});
					throwIfAnexoError(error, "Error al guardar bien de riesgos varios del anexo");
				}
			}
			break;
		}

		case "Accidentes Personales":
		case "Vida":
		case "Sepelio": {
			if (itemsCambio.items.length > 0) {
				const rows = itemsCambio.items.map((item) => ({
					anexo_id: anexoId,
					accion: item.accion,
					original_item_id: item.original_item_id || null,
					client_id: item.data.client_id,
					nivel_id: item.data.nivel_id || null,
					cargo: item.data.cargo || null,
				}));
				const { error } = await supabase.from("polizas_anexos_asegurados_nivel").insert(rows);
				throwIfAnexoError(error, "Error al guardar asegurados con nivel del anexo");
			}
			break;
		}
	}
}

// ============================================
// 4. OBTENER ANEXOS DE UNA PÓLIZA
// ============================================

export async function obtenerAnexosPoliza(polizaId: string): Promise<{
	success: boolean;
	anexos?: AnexoResumen[];
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const { data: anexos, error } = await supabase
			.from("polizas_anexos")
			.select(`
				id, numero_anexo, tipo_anexo, fecha_anexo, fecha_efectiva,
				estado, observaciones, fecha_validacion,
				creador:profiles!created_by (full_name),
				validador:profiles!validado_por (full_name)
			`)
			.eq("poliza_id", polizaId)
			.order("created_at", { ascending: false });

		if (error) {
			return { success: false, error: error.message };
		}

		// Contar documentos por anexo
		const anexoIds = (anexos || []).map((a) => a.id);
		const { data: docCounts } = anexoIds.length > 0
			? await supabase
				.from("polizas_anexos_documentos")
				.select("anexo_id")
				.in("anexo_id", anexoIds)
			: { data: [] };

		const docCountMap = new Map<string, number>();
		(docCounts || []).forEach((d) => {
			docCountMap.set(d.anexo_id, (docCountMap.get(d.anexo_id) || 0) + 1);
		});

		// Obtener montos de ajuste por anexo
		const { data: pagosAnexos } = anexoIds.length > 0
			? await supabase
				.from("polizas_anexos_pagos")
				.select("anexo_id, monto")
				.in("anexo_id", anexoIds)
			: { data: [] };

		const montoAjusteMap = new Map<string, number>();
		(pagosAnexos || []).forEach((p) => {
			montoAjusteMap.set(p.anexo_id, (montoAjusteMap.get(p.anexo_id) || 0) + Number(p.monto));
		});

		const resultado: AnexoResumen[] = (anexos || []).map((a) => {
			const creador = a.creador as unknown as { full_name: string } | null;
			const validador = a.validador as unknown as { full_name: string } | null;

			return {
				id: a.id,
				numero_anexo: a.numero_anexo,
				tipo_anexo: a.tipo_anexo,
				fecha_anexo: a.fecha_anexo,
				fecha_efectiva: a.fecha_efectiva,
				estado: a.estado,
				observaciones: a.observaciones || undefined,
				created_by_nombre: creador?.full_name || undefined,
				validado_por_nombre: validador?.full_name || undefined,
				fecha_validacion: a.fecha_validacion || undefined,
				cantidad_documentos: docCountMap.get(a.id) || 0,
				monto_ajuste_total: montoAjusteMap.get(a.id) || 0,
			};
		});

		return { success: true, anexos: resultado };
	} catch (error) {
		console.error("Error obteniendo anexos:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

// ============================================
// 5. OBTENER CUOTAS CONSOLIDADAS
// ============================================

export async function obtenerCuotasConsolidadas(polizaId: string): Promise<{
	success: boolean;
	cuotas?: CuotaConsolidada[];
	vigencia_corrida?: CuotaVigenciaCorrida[];
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		// Cargar cuotas originales y pagos de anexos activos en paralelo
		const [cuotasResult, anexosPagosResult] = await Promise.all([
			supabase
				.from("polizas_pagos")
				.select("id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago")
				.eq("poliza_id", polizaId)
				.order("numero_cuota", { ascending: true }),
			supabase
				.from("polizas_anexos_pagos")
				.select(`
					id, anexo_id, cuota_original_id, tipo, numero_cuota,
					monto, fecha_vencimiento, estado, observaciones,
					polizas_anexos!inner (
						id, numero_anexo, tipo_anexo, estado
					)
				`)
				.eq("polizas_anexos.poliza_id", polizaId)
				.eq("polizas_anexos.estado", "activo"),
		]);

		const cuotasOriginales = cuotasResult.data || [];
		const pagosAnexos = anexosPagosResult.data || [];

		// Separar ajustes y vigencia corrida
		const ajustes = pagosAnexos.filter((p) => p.tipo === "ajuste");
		const vigenciaCorrida = pagosAnexos.filter((p) => p.tipo === "vigencia_corrida");

		// Agrupar ajustes por cuota_original_id
		const ajustesPorCuota = new Map<string, typeof ajustes>();
		for (const ajuste of ajustes) {
			if (!ajuste.cuota_original_id) continue;
			const existing = ajustesPorCuota.get(ajuste.cuota_original_id) || [];
			existing.push(ajuste);
			ajustesPorCuota.set(ajuste.cuota_original_id, existing);
		}

		// Construir cuotas consolidadas
		const cuotasConsolidadas: CuotaConsolidada[] = cuotasOriginales.map((cuota) => {
			const ajustesCuota = ajustesPorCuota.get(cuota.id) || [];
			const montoAjustes = ajustesCuota.reduce((sum, a) => sum + Number(a.monto), 0);

			return {
				cuota_original_id: cuota.id,
				numero_cuota: cuota.numero_cuota,
				monto_original: Number(cuota.monto),
				monto_ajustes: montoAjustes,
				monto_consolidado: Number(cuota.monto) + montoAjustes,
				fecha_vencimiento: cuota.fecha_vencimiento,
				estado: cuota.estado || "pendiente",
				fecha_pago: cuota.fecha_pago || undefined,
				ajustes: ajustesCuota.map((a) => {
					const anexoInfo = a.polizas_anexos as unknown as { id: string; numero_anexo: string; tipo_anexo: string };
					return {
						anexo_id: anexoInfo.id,
						numero_anexo: anexoInfo.numero_anexo,
						tipo_anexo: anexoInfo.tipo_anexo as "inclusion" | "exclusion" | "anulacion",
						monto_delta: Number(a.monto),
					};
				}),
			};
		});

		// Vigencia corrida
		const vc: CuotaVigenciaCorrida[] = vigenciaCorrida.map((p) => {
			const anexoInfo = p.polizas_anexos as unknown as { id: string; numero_anexo: string };
			return {
				anexo_id: anexoInfo.id,
				numero_anexo: anexoInfo.numero_anexo,
				monto: Number(p.monto),
				fecha_vencimiento: p.fecha_vencimiento || "",
				estado: p.estado || "pendiente",
				observaciones: p.observaciones || undefined,
			};
		});

		return { success: true, cuotas: cuotasConsolidadas, vigencia_corrida: vc };
	} catch (error) {
		console.error("Error obteniendo cuotas consolidadas:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

// ============================================
// 6. OBTENER DETALLE COMPLETO DE UN ANEXO
// ============================================

export type AnexoDetalleItem = {
	id: string;
	accion: "inclusion" | "exclusion";
	label: string;
	detalles: Record<string, string | number | boolean | null>;
};

export type AnexoDetallePago = {
	id: string;
	tipo: "ajuste" | "vigencia_corrida";
	numero_cuota: number | null;
	monto: number;
	fecha_vencimiento: string | null;
	estado: string;
	observaciones: string | null;
};

export type AnexoDetalleDocumento = {
	id: string;
	tipo_documento: string;
	nombre_archivo: string;
	archivo_url: string;
	uploaded_at: string;
};

export type AnexoDetalle = {
	id: string;
	numero_anexo: string;
	tipo_anexo: "inclusion" | "exclusion" | "anulacion";
	fecha_anexo: string;
	fecha_efectiva: string;
	estado: string;
	observaciones: string | null;
	created_at: string;
	creador_nombre: string | null;
	validador_nombre: string | null;
	fecha_validacion: string | null;
	motivo_rechazo: string | null;
	rechazador_nombre: string | null;
	fecha_rechazo: string | null;
	ramo: string;
	items: AnexoDetalleItem[];
	pagos: AnexoDetallePago[];
	documentos: AnexoDetalleDocumento[];
};

export async function obtenerDetalleAnexo(anexoId: string): Promise<{
	success: boolean;
	detalle?: AnexoDetalle;
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		// Fetch anexo base + poliza ramo
		const { data: anexo, error: anexoError } = await supabase
			.from("polizas_anexos")
			.select(`
				id, numero_anexo, tipo_anexo, fecha_anexo, fecha_efectiva,
				estado, observaciones, created_at,
				fecha_validacion, motivo_rechazo, fecha_rechazo,
				created_by, validado_por, rechazado_por,
				polizas!poliza_id ( ramo )
			`)
			.eq("id", anexoId)
			.single();

		if (anexoError || !anexo) {
			return { success: false, error: "Anexo no encontrado" };
		}

		const ramo = (anexo.polizas as unknown as { ramo: string })?.ramo || "";

		// Fetch items, pagos, documentos, and user names in parallel
		const [pagosResult, docsResult, ...userResults] = await Promise.all([
			supabase
				.from("polizas_anexos_pagos")
				.select("id, tipo, numero_cuota, monto, fecha_vencimiento, estado, observaciones")
				.eq("anexo_id", anexoId)
				.order("numero_cuota", { ascending: true }),
			supabase
				.from("polizas_anexos_documentos")
				.select("id, tipo_documento, nombre_archivo, archivo_url, uploaded_at")
				.eq("anexo_id", anexoId)
				.eq("estado", "activo"),
			// User names
			anexo.created_by
				? supabase.from("profiles").select("full_name").eq("id", anexo.created_by).single()
				: Promise.resolve({ data: null }),
			anexo.validado_por
				? supabase.from("profiles").select("full_name").eq("id", anexo.validado_por).single()
				: Promise.resolve({ data: null }),
			anexo.rechazado_por
				? supabase.from("profiles").select("full_name").eq("id", anexo.rechazado_por).single()
				: Promise.resolve({ data: null }),
		]);

		// Fetch ramo-specific items
		const items = await cargarItemsAnexoRamo(supabase, anexoId, ramo);

		const detalle: AnexoDetalle = {
			id: anexo.id,
			numero_anexo: anexo.numero_anexo,
			tipo_anexo: anexo.tipo_anexo as AnexoDetalle["tipo_anexo"],
			fecha_anexo: anexo.fecha_anexo,
			fecha_efectiva: anexo.fecha_efectiva,
			estado: anexo.estado,
			observaciones: anexo.observaciones,
			created_at: anexo.created_at,
			creador_nombre: (userResults[0]?.data as { full_name: string } | null)?.full_name || null,
			validador_nombre: (userResults[1]?.data as { full_name: string } | null)?.full_name || null,
			fecha_validacion: anexo.fecha_validacion,
			motivo_rechazo: anexo.motivo_rechazo,
			rechazador_nombre: (userResults[2]?.data as { full_name: string } | null)?.full_name || null,
			fecha_rechazo: anexo.fecha_rechazo,
			ramo,
			items,
			pagos: (pagosResult.data || []).map((p) => ({
				id: p.id,
				tipo: p.tipo as "ajuste" | "vigencia_corrida",
				numero_cuota: p.numero_cuota,
				monto: Number(p.monto),
				fecha_vencimiento: p.fecha_vencimiento,
				estado: p.estado || "pendiente",
				observaciones: p.observaciones,
			})),
			documentos: (docsResult.data || []).map((d) => ({
				id: d.id,
				tipo_documento: d.tipo_documento,
				nombre_archivo: d.nombre_archivo,
				archivo_url: d.archivo_url,
				uploaded_at: d.uploaded_at,
			})),
		};

		return { success: true, detalle };
	} catch (error) {
		console.error("Error obteniendo detalle de anexo:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

async function cargarItemsAnexoRamo(
	supabase: Awaited<ReturnType<typeof createClient>>,
	anexoId: string,
	ramo: string
): Promise<AnexoDetalleItem[]> {
	const ramoNorm = ramo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	if (ramoNorm.includes("automotor")) {
		const { data } = await supabase
			.from("polizas_anexos_automotor_vehiculos")
			.select("id, accion, placa, valor_asegurado, franquicia, nro_chasis, uso, modelo, ano, color")
			.eq("anexo_id", anexoId);
		return (data || []).map((v) => ({
			id: v.id,
			accion: v.accion as "inclusion" | "exclusion",
			label: `${v.placa} - ${v.modelo || ""} ${v.ano || ""}`.trim(),
			detalles: {
				Placa: v.placa,
				"Valor Asegurado": Number(v.valor_asegurado),
				Franquicia: Number(v.franquicia),
				"Nro. Chasis": v.nro_chasis,
				Uso: v.uso,
				Modelo: v.modelo,
				"Año": v.ano,
				Color: v.color,
			},
		}));
	}

	if (ramoNorm.includes("ramo") && ramoNorm.includes("tecnico")) {
		const { data } = await supabase
			.from("polizas_anexos_ramos_tecnicos_equipos")
			.select("id, accion, nro_serie, valor_asegurado, franquicia, uso, modelo, ano, placa")
			.eq("anexo_id", anexoId);
		return (data || []).map((e) => ({
			id: e.id,
			accion: e.accion as "inclusion" | "exclusion",
			label: `${e.nro_serie} - ${e.modelo || ""}`.trim(),
			detalles: {
				"Nro. Serie": e.nro_serie,
				Placa: e.placa,
				"Valor Asegurado": Number(e.valor_asegurado),
				Franquicia: Number(e.franquicia),
				Uso: e.uso,
				Modelo: e.modelo,
				"Año": e.ano,
			},
		}));
	}

	if (ramoNorm.includes("aeronavegacion") || ramoNorm.includes("nave") || ramoNorm.includes("embarcacion")) {
		const { data } = await supabase
			.from("polizas_anexos_aeronavegacion_naves")
			.select("id, accion, matricula, marca, modelo, ano, serie, uso, nro_pasajeros, nro_tripulantes, valor_casco, valor_responsabilidad_civil")
			.eq("anexo_id", anexoId);
		return (data || []).map((n) => ({
			id: n.id,
			accion: n.accion as "inclusion" | "exclusion",
			label: `${n.matricula} - ${n.marca} ${n.modelo}`.trim(),
			detalles: {
				"Matrícula": n.matricula,
				Marca: n.marca,
				Modelo: n.modelo,
				"Año": n.ano,
				Serie: n.serie,
				Uso: n.uso,
				Pasajeros: n.nro_pasajeros,
				Tripulantes: n.nro_tripulantes,
				"Valor Casco": Number(n.valor_casco),
				"Resp. Civil": Number(n.valor_responsabilidad_civil),
			},
		}));
	}

	if (ramoNorm.includes("salud") || ramoNorm.includes("enfermedad")) {
		const [{ data: asegurados }, { data: beneficiarios }] = await Promise.all([
			supabase
				.from("polizas_anexos_salud_asegurados")
				.select("id, accion, client_id, nivel_id, rol")
				.eq("anexo_id", anexoId),
			supabase
				.from("polizas_anexos_salud_beneficiarios")
				.select("id, accion, nombre_completo, carnet, fecha_nacimiento, genero, nivel_id, rol")
				.eq("anexo_id", anexoId),
		]);

		const items: AnexoDetalleItem[] = [];
		for (const a of asegurados || []) {
			items.push({
				id: a.id,
				accion: a.accion as "inclusion" | "exclusion",
				label: `Asegurado (${a.rol})`,
				detalles: { "Client ID": a.client_id, Nivel: a.nivel_id, Rol: a.rol },
			});
		}
		for (const b of beneficiarios || []) {
			items.push({
				id: b.id,
				accion: b.accion as "inclusion" | "exclusion",
				label: `${b.nombre_completo} (${b.rol})`,
				detalles: {
					Nombre: b.nombre_completo,
					Carnet: b.carnet,
					"Fecha Nac.": b.fecha_nacimiento,
					"Género": b.genero,
					Nivel: b.nivel_id,
					Rol: b.rol,
				},
			});
		}
		return items;
	}

	if (ramoNorm.includes("incendio")) {
		const { data } = await supabase
			.from("polizas_anexos_incendio_bienes")
			.select("id, accion, direccion, valor_total_declarado, es_primer_riesgo, items")
			.eq("anexo_id", anexoId);
		return (data || []).map((b) => ({
			id: b.id,
			accion: b.accion as "inclusion" | "exclusion",
			label: b.direccion,
			detalles: {
				"Dirección": b.direccion,
				"Valor Total": Number(b.valor_total_declarado),
				"Primer Riesgo": b.es_primer_riesgo,
			},
		}));
	}

	if (ramoNorm.includes("riesgo") && ramoNorm.includes("vario")) {
		const { data } = await supabase
			.from("polizas_anexos_riesgos_varios_bienes")
			.select("id, accion, direccion, valor_total_declarado, es_primer_riesgo, items")
			.eq("anexo_id", anexoId);
		return (data || []).map((b) => ({
			id: b.id,
			accion: b.accion as "inclusion" | "exclusion",
			label: b.direccion,
			detalles: {
				"Dirección": b.direccion,
				"Valor Total": Number(b.valor_total_declarado),
				"Primer Riesgo": b.es_primer_riesgo,
			},
		}));
	}

	if (ramoNorm.includes("vida") || ramoNorm.includes("sepelio") || ramoNorm.includes("defuncion") || (ramoNorm.includes("accidente") && ramoNorm.includes("personal"))) {
		const { data } = await supabase
			.from("polizas_anexos_asegurados_nivel")
			.select("id, accion, client_id, nivel_id, cargo")
			.eq("anexo_id", anexoId);
		return (data || []).map((a) => ({
			id: a.id,
			accion: a.accion as "inclusion" | "exclusion",
			label: `Asegurado - ${a.cargo || "Sin cargo"}`,
			detalles: { "Client ID": a.client_id, Nivel: a.nivel_id, Cargo: a.cargo },
		}));
	}

	return [];
}
