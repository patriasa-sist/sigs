"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { getDataScopeFilter } from "@/utils/auth/helpers";
import { generateFinalStoragePath } from "@/utils/fileUpload";
import { resolverNombresCliente } from "@/utils/polizas/resolverNombresCliente";
import { netoAporteAnexo, type PagoAnexoLite } from "@/utils/polizas/aporteAnexo";
import { restaurarCuotasPorAnulacion } from "@/utils/polizas/anulacionCuotas";
import type {
	AnexoFormState,
	PolizaResumenAnexo,
	DatosPolizaParaAnexo,
	CuotaConsolidada,
	CuotaVigenciaCorrida,
	CuotaAnexoPropia,
	AnexoResumen,
	PlanPagoInclusion,
	AnexoItemChange,
	CuotaAjuste,
	CuotaDescontable,
	MotivoErrorEdicionAnexo,
	DireccionVigenciaCorrida,
} from "@/types/anexo";
import type {
	VehiculoAutomotor,
	EquipoIndustrial,
	NaveEmbarcacion,
	ContratanteSalud,
	TitularSalud,
	BienAseguradoIncendio,
	BienAseguradoRiesgosVarios,
	AseguradoConNivel,
	DocumentoPoliza,
} from "@/types/poliza";

// ============================================
// HELPERS
// ============================================

function mapAnexoError(
	error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
	context: string,
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
	context: string,
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
		const rutas = (docs || []).map((d) => d.archivo_url).filter(Boolean) as string[];
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
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const scope = await getDataScopeFilter("polizas");

		// Buscar pólizas activas que coincidan con la query
		let polizaQuery = supabase
			.from("polizas")
			.select(
				`
				id, numero_poliza, ramo, client_id, prima_total, moneda,
				inicio_vigencia, fin_vigencia, estado, modalidad_pago,
				companias_aseguradoras!compania_aseguradora_id (nombre),
				responsable_id
			`,
			)
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

		// Obtener nombres de clientes (todos los tipos)
		const clientNombresMap = await resolverNombresCliente(
			supabase,
			polizas.map((p) => p.client_id),
		);

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
			const info = clientNombresMap.get(p.client_id);
			const client_name = info?.name || "Desconocido";
			const client_ci = info?.ci || "-";

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

export async function obtenerDatosParaAnexo(
	polizaId: string,
	// excluirAnexoId: al editar un anexo, sus propios efectos no deben
	// aplicarse sobre los items actuales (sus exclusiones deben seguir
	// visibles en el selector y sus inclusiones no duplicarse como actuales)
	opciones?: { permitirAnulada?: boolean; excluirAnexoId?: string },
): Promise<{
	success: boolean;
	datos?: DatosPolizaParaAnexo;
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		// Cargar póliza, cuotas, y anexos activos en paralelo
		const [polizaResult, cuotasResult, anexosResult] = await Promise.all([
			supabase
				.from("polizas")
				.select(
					`
					id, numero_poliza, ramo, client_id, prima_total, moneda,
					inicio_vigencia, fin_vigencia, estado, modalidad_pago,
					companias_aseguradoras!compania_aseguradora_id (nombre)
				`,
				)
				.eq("id", polizaId)
				.single(),
			supabase
				.from("polizas_pagos")
				.select("id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago")
				.eq("poliza_id", polizaId)
				.order("numero_cuota", { ascending: true }),
			supabase
				.from("polizas_anexos")
				.select(
					`
					id, numero_anexo, tipo_anexo, fecha_anexo, fecha_efectiva,
					estado, observaciones, created_by,
					profiles:profiles!created_by (full_name)
				`,
				)
				.eq("poliza_id", polizaId)
				.in("estado", ["pendiente", "activo"])
				.order("created_at", { ascending: false }),
		]);

		if (polizaResult.error || !polizaResult.data) {
			return { success: false, error: "Póliza no encontrada" };
		}

		const poliza = polizaResult.data;

		// permitirAnulada: al editar el anexo de anulación activo, la póliza ya está anulada
		if (poliza.estado !== "activa" && !(opciones?.permitirAnulada && poliza.estado === "anulada")) {
			return { success: false, error: "Solo se pueden crear anexos en pólizas activas" };
		}

		// Obtener nombre del cliente (todos los tipos)
		const info = (await resolverNombresCliente(supabase, [poliza.client_id])).get(poliza.client_id);
		const client_name = info?.name || "Desconocido";
		const client_ci = info?.ci || "-";

		// Verificar anulación pendiente/activa (sin contar el anexo en edición)
		const anexosRelevantes = (anexosResult.data || []).filter((a) => a.id !== opciones?.excluirAnexoId);
		const tieneAnulacion = anexosRelevantes.some(
			(a) => a.tipo_anexo === "anulacion" && (a.estado === "pendiente" || a.estado === "activo"),
		);

		const compania = poliza.companias_aseguradoras as unknown as { nombre: string } | null;

		// Cargar items actuales del ramo (originales + incluidos por anexos activos, menos excluidos)
		const anexosActivos = anexosRelevantes.filter((a) => a.estado === "activo");
		const itemsActuales = await cargarItemsActualesRamo(supabase, polizaId, poliza.ramo, anexosActivos);

		// Cuotas descontables para exclusión: madre + inclusiones activas, con su
		// saldo cobrable ya neto de abonos y de descuentos de OTRAS exclusiones.
		const cuotasDescontables = await cargarCuotasDescontables(
			supabase,
			polizaId,
			cuotasResult.data || [],
			opciones?.excluirAnexoId,
		);

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
			cuotas_descontables: cuotasDescontables,
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
 * Cuotas sobre las que una exclusión puede repartir descuento: cuotas de la
 * póliza madre (polizas_pagos) y cuotas propias de inclusiones activas
 * (polizas_anexos_pagos tipo cuota_propia). Cada una trae su saldo cobrable ya
 * neto de abonos reales y de descuentos de OTRAS exclusiones activas (se excluye
 * el propio anexo en edición). Solo cuotas NO pagadas y con saldo > 0; nunca se
 * descuenta una cuota saldada/pagada porque eso implicaría devolución.
 */
async function cargarCuotasDescontables(
	supabase: Awaited<ReturnType<typeof createClient>>,
	polizaId: string,
	cuotasMadre: { id: string; numero_cuota: number; monto: number; fecha_vencimiento: string; estado: string }[],
	excluirAnexoId?: string,
): Promise<CuotaDescontable[]> {
	// Cuotas propias de inclusiones activas y ajustes de exclusión activos.
	const { data: pagosAnexos } = await supabase
		.from("polizas_anexos_pagos")
		.select(
			`
			id, anexo_id, tipo, cuota_original_id, cuota_anexo_pago_id, numero_cuota,
			monto, fecha_vencimiento, estado,
			polizas_anexos!inner (id, numero_anexo, tipo_anexo, estado, poliza_id)
			`,
		)
		.eq("polizas_anexos.poliza_id", polizaId)
		.eq("polizas_anexos.estado", "activo")
		.in("tipo", ["cuota_propia", "ajuste"]);

	const filas = pagosAnexos || [];
	type FilaAnexo = (typeof filas)[number] & {
		polizas_anexos: { id: string; numero_anexo: string; tipo_anexo: string; estado: string };
	};
	const filasT = filas as unknown as FilaAnexo[];

	// Descuentos de exclusión ya aplicados (excluyendo el anexo en edición).
	const descuentoMadre = new Map<string, number>();
	const descuentoInclusion = new Map<string, number>();
	for (const f of filasT) {
		if (f.tipo !== "ajuste") continue;
		if (excluirAnexoId && f.polizas_anexos.id === excluirAnexoId) continue;
		// Solo los ajustes negativos son descuentos de exclusión; ignorar cualquier
		// ajuste positivo residual (parche legacy de inclusiones pre cuota_propia).
		if (Number(f.monto) >= 0) continue;
		const magnitud = -Number(f.monto);
		if (f.cuota_original_id) {
			descuentoMadre.set(f.cuota_original_id, (descuentoMadre.get(f.cuota_original_id) || 0) + magnitud);
		} else if (f.cuota_anexo_pago_id) {
			descuentoInclusion.set(
				f.cuota_anexo_pago_id,
				(descuentoInclusion.get(f.cuota_anexo_pago_id) || 0) + magnitud,
			);
		}
	}

	const cuotasInclusion = filasT.filter((f) => f.tipo === "cuota_propia");

	// Abonos reales por cuota (madre y de inclusión).
	const madreIds = cuotasMadre.map((c) => c.id);
	const inclusionIds = cuotasInclusion.map((c) => c.id);
	const [abonosMadreRes, abonosInclusionRes] = await Promise.all([
		madreIds.length
			? supabase.from("polizas_pagos_abonos").select("pago_id, monto").in("pago_id", madreIds)
			: Promise.resolve({ data: [] as { pago_id: string; monto: number }[] }),
		inclusionIds.length
			? supabase.from("polizas_pagos_abonos").select("anexo_pago_id, monto").in("anexo_pago_id", inclusionIds)
			: Promise.resolve({ data: [] as { anexo_pago_id: string; monto: number }[] }),
	]);
	const abonoMadre = new Map<string, number>();
	for (const a of abonosMadreRes.data || []) {
		if (!a.pago_id) continue;
		abonoMadre.set(a.pago_id, (abonoMadre.get(a.pago_id) || 0) + Number(a.monto));
	}
	const abonoInclusion = new Map<string, number>();
	for (const a of abonosInclusionRes.data || []) {
		if (!a.anexo_pago_id) continue;
		abonoInclusion.set(a.anexo_pago_id, (abonoInclusion.get(a.anexo_pago_id) || 0) + Number(a.monto));
	}

	const noDescontable = (estado: string) => estado === "pagado" || estado === "anulada";
	const descontables: CuotaDescontable[] = [];

	for (const c of cuotasMadre) {
		if (noDescontable(c.estado)) continue;
		const saldo = Number(c.monto) - (abonoMadre.get(c.id) || 0) - (descuentoMadre.get(c.id) || 0);
		if (saldo <= 0.005) continue;
		descontables.push({
			origen: "madre",
			cuota_original_id: c.id,
			cuota_anexo_pago_id: null,
			numero_anexo: null,
			numero_cuota: c.numero_cuota,
			monto: Number(c.monto),
			saldo_disponible: saldo,
			fecha_vencimiento: c.fecha_vencimiento,
			estado: c.estado,
		});
	}

	for (const c of cuotasInclusion) {
		const estado = c.estado || "pendiente";
		if (noDescontable(estado)) continue;
		const saldo = Number(c.monto) - (abonoInclusion.get(c.id) || 0) - (descuentoInclusion.get(c.id) || 0);
		if (saldo <= 0.005) continue;
		descontables.push({
			origen: "inclusion",
			cuota_original_id: null,
			cuota_anexo_pago_id: c.id,
			numero_anexo: c.polizas_anexos.numero_anexo,
			numero_cuota: c.numero_cuota ?? 0,
			monto: Number(c.monto),
			saldo_disponible: saldo,
			fecha_vencimiento: c.fecha_vencimiento || "",
			estado,
		});
	}

	// Orden estable: madre primero por número de cuota, luego inclusiones por anexo.
	descontables.sort((a, b) => {
		if (a.origen !== b.origen) return a.origen === "madre" ? -1 : 1;
		if (a.origen === "inclusion" && a.numero_anexo !== b.numero_anexo) {
			return (a.numero_anexo || "").localeCompare(b.numero_anexo || "");
		}
		return a.numero_cuota - b.numero_cuota;
	});

	return descontables;
}

type AjustePagoInsert = {
	anexo_id: string;
	cuota_original_id: string | null;
	cuota_anexo_pago_id: string | null;
	tipo: "ajuste";
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string | null;
	estado: "pendiente";
	observaciones: string;
};

/**
 * Valida los descuentos de una exclusión contra el saldo cobrable autoritativo
 * del servidor (madre + inclusiones, neto de abonos y de OTRAS exclusiones) y
 * construye las filas de polizas_anexos_pagos a insertar. Cada ajuste cuelga de
 * la cuota madre (cuota_original_id) o de inclusión (cuota_anexo_pago_id). El
 * descuento nunca puede exceder el saldo cobrable (no hay devolución).
 */
async function construirPagosAjusteExclusion(
	supabase: Awaited<ReturnType<typeof createClient>>,
	polizaId: string,
	anexoId: string,
	cuotasAjuste: CuotaAjuste[],
	excluirAnexoId?: string,
): Promise<{ ok: true; rows: AjustePagoInsert[] } | { ok: false; error: string }> {
	const cuotasConDelta = cuotasAjuste.filter((c) => c.monto_delta !== 0);
	if (cuotasConDelta.length === 0) return { ok: true, rows: [] };

	const { data: cuotasMadreRaw } = await supabase
		.from("polizas_pagos")
		.select("id, numero_cuota, monto, fecha_vencimiento, estado")
		.eq("poliza_id", polizaId);
	const cuotasMadre = (cuotasMadreRaw || []).map((c) => ({
		id: c.id as string,
		numero_cuota: c.numero_cuota as number,
		monto: Number(c.monto),
		fecha_vencimiento: (c.fecha_vencimiento as string) || "",
		estado: (c.estado as string) || "pendiente",
	}));

	const descontables = await cargarCuotasDescontables(supabase, polizaId, cuotasMadre, excluirAnexoId);
	const saldoMadre = new Map(
		descontables.filter((d) => d.origen === "madre").map((d) => [d.cuota_original_id, d.saldo_disponible]),
	);
	const saldoInclusion = new Map(
		descontables.filter((d) => d.origen === "inclusion").map((d) => [d.cuota_anexo_pago_id, d.saldo_disponible]),
	);

	const rows: AjustePagoInsert[] = [];
	for (const c of cuotasConDelta) {
		if (c.monto_delta > 0) {
			return { ok: false, error: `El descuento de la cuota ${c.numero_cuota} debe restar, no sumar` };
		}
		const targetId = c.origen === "madre" ? c.cuota_original_id : c.cuota_anexo_pago_id;
		const saldo =
			c.origen === "madre" ? saldoMadre.get(c.cuota_original_id) : saldoInclusion.get(c.cuota_anexo_pago_id);
		if (!targetId || saldo === undefined) {
			return {
				ok: false,
				error: `La cuota ${c.numero_cuota} no está disponible para descuento (pagada, anulada o inexistente)`,
			};
		}
		if (Math.abs(c.monto_delta) > saldo + 0.005) {
			return {
				ok: false,
				error: `El descuento de la cuota ${c.numero_cuota} excede su saldo cobrable (${saldo.toFixed(2)})`,
			};
		}
		rows.push({
			anexo_id: anexoId,
			cuota_original_id: c.origen === "madre" ? c.cuota_original_id : null,
			cuota_anexo_pago_id: c.origen === "inclusion" ? c.cuota_anexo_pago_id : null,
			tipo: "ajuste",
			numero_cuota: c.numero_cuota,
			monto: -Math.abs(c.monto_delta),
			fecha_vencimiento: c.fecha_vencimiento,
			estado: "pendiente",
			observaciones: "Descuento por exclusión",
		});
	}
	return { ok: true, rows };
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
	anexosActivos: { id: string; tipo_anexo: string }[],
) {
	const ramoLower = ramo
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

	const inclusionIds = anexosActivos.filter((a) => a.tipo_anexo === "inclusion").map((a) => a.id);
	const exclusionIds = anexosActivos.filter((a) => a.tipo_anexo === "exclusion").map((a) => a.id);

	if (ramoLower.includes("automotor")) {
		const { data } = await supabase.from("polizas_automotor_vehiculos").select("*").eq("poliza_id", polizaId);
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
				supabase
					.from("polizas_anexos_salud_asegurados")
					.select("*")
					.in("anexo_id", inclusionIds)
					.eq("accion", "inclusion"),
				supabase
					.from("polizas_anexos_salud_beneficiarios")
					.select("*")
					.in("anexo_id", inclusionIds)
					.eq("accion", "inclusion"),
			]);
			if (asegInc)
				aseguradosList = [...aseguradosList, ...asegInc.map((a) => ({ ...a, _origen_anexo: a.anexo_id }))];
			if (benInc)
				beneficiariosList = [...beneficiariosList, ...benInc.map((b) => ({ ...b, _origen_anexo: b.anexo_id }))];
		}

		if (exclusionIds.length > 0) {
			const [{ data: asegExc }, { data: benExc }] = await Promise.all([
				supabase
					.from("polizas_anexos_salud_asegurados")
					.select("original_item_id")
					.in("anexo_id", exclusionIds)
					.eq("accion", "exclusion"),
				supabase
					.from("polizas_anexos_salud_beneficiarios")
					.select("original_item_id")
					.in("anexo_id", exclusionIds)
					.eq("accion", "exclusion"),
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
		const { data } = await supabase.from("polizas_ramos_tecnicos_equipos").select("*").eq("poliza_id", polizaId);
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
		const { data } = await supabase.from("polizas_aeronavegacion_naves").select("*").eq("poliza_id", polizaId);
		const tipoRamo =
			ramoLower.includes("naves") || ramoLower.includes("embarcacion")
				? ("Naves o embarcaciones" as const)
				: ("Aeronavegación" as const);
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
		const { data } = await supabase.from("polizas_incendio_bienes").select("*").eq("poliza_id", polizaId);
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
		const { data } = await supabase.from("polizas_riesgos_varios_bienes").select("*").eq("poliza_id", polizaId);
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
		const { data } = await supabase.from("polizas_asegurados_nivel").select("*").eq("poliza_id", polizaId);
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
		const {
			data: { user },
		} = await supabase.auth.getUser();
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
		const docsValidos = formState.documentos.filter((d) => d.storage_path && d.upload_status === "uploaded");
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
					// El monto se guarda SIEMPRE en positivo; la dirección define el
					// signo: cobro (saldo a cobrar) o devolución (a favor del cliente).
					const direccion: DireccionVigenciaCorrida =
						formState.vigencia_corrida.direccion === "devolucion" ? "devolucion" : "cobro";
					const { error: pagoError } = await supabase.from("polizas_anexos_pagos").insert({
						anexo_id: anexo.id,
						cuota_original_id: null,
						tipo: "vigencia_corrida",
						numero_cuota: 0,
						monto: Math.abs(formState.vigencia_corrida.monto),
						direccion,
						fecha_vencimiento: formState.vigencia_corrida.fecha_vencimiento,
						estado: "pendiente",
						observaciones:
							formState.vigencia_corrida.observaciones?.trim() ||
							(direccion === "devolucion" ? "Devolución a favor del cliente" : "Cobro vigencia corrida"),
					});

					throwIfAnexoError(pagoError, "Error al guardar vigencia corrida");
				}
			} else if (formState.config.tipo_anexo === "inclusion") {
				// Inclusión: cuotas propias del anexo, independientes de la póliza madre
				await guardarCuotasInclusion(supabase, anexo.id, formState.plan_pago_inclusion!);
			} else {
				// Exclusión: descuentos repartidos sobre cuotas descontables (madre +
				// inclusiones), validados contra el saldo cobrable autoritativo.
				const construido = await construirPagosAjusteExclusion(
					supabase,
					formState.poliza_id,
					anexo.id,
					formState.cuotas_ajuste,
				);
				if (!construido.ok) {
					throw new Error(construido.error);
				}
				if (construido.rows.length > 0) {
					const { error: pagosError } = await supabase.from("polizas_anexos_pagos").insert(construido.rows);
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
				error:
					insertError instanceof Error
						? insertError.message
						: "Error guardando datos del anexo. Los datos parciales fueron limpiados automáticamente.",
			};
		}

		// --- MOVER DOCUMENTOS (best-effort, fuera del boundary transaccional) ---
		for (const doc of docsValidos) {
			const tempPath = doc.storage_path!;
			const finalPath = generateFinalStoragePath(`anexos/${anexo.id}`, doc.nombre_archivo);

			const { error: moveError } = await supabase.storage.from("polizas-documentos").move(tempPath, finalPath);

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
	plan: PlanPagoInclusion,
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
		observaciones:
			plan.modalidad === "contado"
				? "Pago contado por inclusión"
				: `Cuota ${c.numero_cuota} de ${plan.cuotas.length} por inclusión`,
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
	itemsCambio: NonNullable<AnexoFormState["items_cambio"]>,
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
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const { data: anexos, error } = await supabase
			.from("polizas_anexos")
			.select(
				`
				id, numero_anexo, tipo_anexo, fecha_anexo, fecha_efectiva,
				estado, observaciones, fecha_validacion, created_by,
				creador:profiles!created_by (full_name),
				validador:profiles!validado_por (full_name)
			`,
			)
			.eq("poliza_id", polizaId)
			.order("created_at", { ascending: false });

		if (error) {
			return { success: false, error: error.message };
		}

		// Contar documentos por anexo
		const anexoIds = (anexos || []).map((a) => a.id);
		const { data: docCounts } =
			anexoIds.length > 0
				? await supabase.from("polizas_anexos_documentos").select("anexo_id").in("anexo_id", anexoIds)
				: { data: [] };

		const docCountMap = new Map<string, number>();
		(docCounts || []).forEach((d) => {
			docCountMap.set(d.anexo_id, (docCountMap.get(d.anexo_id) || 0) + 1);
		});

		// Obtener montos de ajuste por anexo (neto firmado: cobro suma, devolución
		// resta, exclusión resta, inclusión suma — vía fuente única de verdad).
		const { data: pagosAnexos } =
			anexoIds.length > 0
				? await supabase
						.from("polizas_anexos_pagos")
						.select("anexo_id, tipo, monto, direccion")
						.in("anexo_id", anexoIds)
				: { data: [] };

		const pagosPorAnexo = new Map<string, PagoAnexoLite[]>();
		(pagosAnexos || []).forEach((p) => {
			const arr = pagosPorAnexo.get(p.anexo_id) || [];
			arr.push({
				tipo: p.tipo as PagoAnexoLite["tipo"],
				monto: Number(p.monto),
				direccion: p.direccion as PagoAnexoLite["direccion"],
			});
			pagosPorAnexo.set(p.anexo_id, arr);
		});

		const montoAjusteMap = new Map<string, number>();
		pagosPorAnexo.forEach((pagos, anexoId) => {
			montoAjusteMap.set(anexoId, netoAporteAnexo(pagos));
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
				created_by: a.created_by || undefined,
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
	cuotas_inclusion?: CuotaAnexoPropia[];
	vigencia_corrida?: CuotaVigenciaCorrida[];
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const [cuotasResult, anexosPagosResult] = await Promise.all([
			supabase
				.from("polizas_pagos")
				.select("id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago")
				.eq("poliza_id", polizaId)
				.order("numero_cuota", { ascending: true }),
			supabase
				.from("polizas_anexos_pagos")
				.select(
					`
					id, anexo_id, cuota_original_id, cuota_anexo_pago_id, tipo, numero_cuota,
					monto, direccion, fecha_vencimiento, estado, observaciones,
					polizas_anexos!inner (id, numero_anexo, tipo_anexo, estado)
				`,
				)
				.eq("polizas_anexos.poliza_id", polizaId)
				.eq("polizas_anexos.estado", "activo"),
		]);

		const cuotasOriginales = cuotasResult.data || [];
		const pagosAnexos = anexosPagosResult.data || [];

		// Separar por tipo
		const ajustes = pagosAnexos.filter((p) => p.tipo === "ajuste");
		const cuotasPropias = pagosAnexos.filter((p) => p.tipo === "cuota_propia");
		const vigenciaCorrida = pagosAnexos.filter((p) => p.tipo === "vigencia_corrida");

		// Agrupar ajustes de exclusión: por cuota madre (cuota_original_id) y por
		// cuota de inclusión (cuota_anexo_pago_id).
		const ajustesPorCuota = new Map<string, typeof ajustes>();
		const descuentoPorInclusion = new Map<string, number>();
		for (const ajuste of ajustes) {
			if (ajuste.cuota_original_id) {
				const existing = ajustesPorCuota.get(ajuste.cuota_original_id) || [];
				existing.push(ajuste);
				ajustesPorCuota.set(ajuste.cuota_original_id, existing);
			} else if (ajuste.cuota_anexo_pago_id && Number(ajuste.monto) < 0) {
				// Solo ajustes negativos descuentan una cuota de inclusión.
				descuentoPorInclusion.set(
					ajuste.cuota_anexo_pago_id,
					(descuentoPorInclusion.get(ajuste.cuota_anexo_pago_id) || 0) + -Number(ajuste.monto),
				);
			}
		}

		// Cuotas de la póliza madre con descuentos de exclusión aplicados
		const cuotasConsolidadas: CuotaConsolidada[] = cuotasOriginales.map((cuota) => {
			const ajustesCuota = ajustesPorCuota.get(cuota.id) || [];
			const montoAjustes = ajustesCuota.reduce((sum, a) => sum + Number(a.monto), 0);
			const montoConsolidado = Number(cuota.monto) + montoAjustes;
			const estadoBase = cuota.estado || "pendiente";
			// Si el descuento de exclusión deja el consolidado en 0 y la cuota no
			// estaba pagada/anulada, queda "saldado" (consistente con cobranzas).
			const estado =
				estadoBase !== "pagado" && estadoBase !== "anulada" && montoAjustes < 0 && montoConsolidado <= 0.01
					? "saldado"
					: estadoBase;
			return {
				cuota_original_id: cuota.id,
				numero_cuota: cuota.numero_cuota,
				monto_original: Number(cuota.monto),
				monto_ajustes: montoAjustes,
				monto_consolidado: montoConsolidado,
				fecha_vencimiento: cuota.fecha_vencimiento,
				estado,
				fecha_pago: cuota.fecha_pago || undefined,
				ajustes: ajustesCuota.map((a) => {
					const info = a.polizas_anexos as unknown as {
						id: string;
						numero_anexo: string;
						tipo_anexo: string;
					};
					return {
						anexo_id: info.id,
						numero_anexo: info.numero_anexo,
						tipo_anexo: info.tipo_anexo as "inclusion" | "exclusion" | "anulacion",
						monto_delta: Number(a.monto),
					};
				}),
			};
		});

		// Cuotas propias de anexos de inclusión (independientes de la póliza madre),
		// con los descuentos de exclusión que las apuntan ya aplicados.
		const inclusion: CuotaAnexoPropia[] = cuotasPropias
			.map((p) => {
				const info = p.polizas_anexos as unknown as { id: string; numero_anexo: string };
				const descuento = descuentoPorInclusion.get(p.id) || 0;
				const estadoBase = p.estado || "pendiente";
				// Saldada por exclusión si el descuento cubre la cuota y no estaba pagada.
				const estado =
					estadoBase !== "pagado" && estadoBase !== "anulada" && descuento >= Number(p.monto) - 0.01
						? "saldado"
						: estadoBase;
				return {
					id: p.id,
					anexo_id: info.id,
					numero_anexo: info.numero_anexo,
					numero_cuota: p.numero_cuota ?? 0,
					monto: Number(p.monto),
					monto_descuento: descuento > 0 ? descuento : undefined,
					fecha_vencimiento: p.fecha_vencimiento || "",
					estado,
					observaciones: p.observaciones || undefined,
				};
			})
			.sort((a, b) => {
				if (a.numero_anexo !== b.numero_anexo) return a.numero_anexo.localeCompare(b.numero_anexo);
				return a.numero_cuota - b.numero_cuota;
			});

		// Vigencia corrida de anulaciones (monto en positivo + dirección)
		const vc: CuotaVigenciaCorrida[] = vigenciaCorrida.map((p) => {
			const info = p.polizas_anexos as unknown as { id: string; numero_anexo: string };
			return {
				anexo_id: info.id,
				numero_anexo: info.numero_anexo,
				monto: Math.abs(Number(p.monto)),
				direccion: ((p.direccion as DireccionVigenciaCorrida | null) ?? "cobro") as DireccionVigenciaCorrida,
				fecha_vencimiento: p.fecha_vencimiento || "",
				estado: p.estado || "pendiente",
				observaciones: p.observaciones || undefined,
			};
		});

		return { success: true, cuotas: cuotasConsolidadas, cuotas_inclusion: inclusion, vigencia_corrida: vc };
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
	direccion: DireccionVigenciaCorrida | null;
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
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		// Fetch anexo base + poliza ramo
		const { data: anexo, error: anexoError } = await supabase
			.from("polizas_anexos")
			.select(
				`
				id, numero_anexo, tipo_anexo, fecha_anexo, fecha_efectiva,
				estado, observaciones, created_at,
				fecha_validacion, motivo_rechazo, fecha_rechazo,
				created_by, validado_por, rechazado_por,
				polizas!poliza_id ( ramo )
			`,
			)
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
				.select("id, tipo, numero_cuota, monto, direccion, fecha_vencimiento, estado, observaciones")
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
				direccion: (p.direccion as DireccionVigenciaCorrida | null) ?? null,
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
	ramo: string,
): Promise<AnexoDetalleItem[]> {
	const ramoNorm = ramo
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

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
				Año: v.ano,
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
				Año: e.ano,
			},
		}));
	}

	if (ramoNorm.includes("aeronavegacion") || ramoNorm.includes("nave") || ramoNorm.includes("embarcacion")) {
		const { data } = await supabase
			.from("polizas_anexos_aeronavegacion_naves")
			.select(
				"id, accion, matricula, marca, modelo, ano, serie, uso, nro_pasajeros, nro_tripulantes, valor_casco, valor_responsabilidad_civil",
			)
			.eq("anexo_id", anexoId);
		return (data || []).map((n) => ({
			id: n.id,
			accion: n.accion as "inclusion" | "exclusion",
			label: `${n.matricula} - ${n.marca} ${n.modelo}`.trim(),
			detalles: {
				Matrícula: n.matricula,
				Marca: n.marca,
				Modelo: n.modelo,
				Año: n.ano,
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
					Género: b.genero,
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
				Dirección: b.direccion,
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
				Dirección: b.direccion,
				"Valor Total": Number(b.valor_total_declarado),
				"Primer Riesgo": b.es_primer_riesgo,
			},
		}));
	}

	if (
		ramoNorm.includes("vida") ||
		ramoNorm.includes("sepelio") ||
		ramoNorm.includes("defuncion") ||
		(ramoNorm.includes("accidente") && ramoNorm.includes("personal"))
	) {
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

// ============================================
// 7. EDICIÓN DE ANEXOS
// Pendientes/rechazados: toda edición vuelve a pendiente.
// Activos: revalidación condicional — solo si cambian los pagos
// (cuotas/montos) vuelve a pendiente; lo cosmético preserva la validación.
// ============================================

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Verifica si un usuario es líder de equipo del responsable de la póliza.
 */
async function esLiderDeEquipoParaResponsable(
	supabase: SupabaseServer,
	userId: string,
	responsableId: string,
): Promise<boolean> {
	const { data: leaderTeams } = await supabase
		.from("equipo_miembros")
		.select("equipo_id")
		.eq("user_id", userId)
		.eq("rol_equipo", "lider");

	if (!leaderTeams || leaderTeams.length === 0) return false;

	const teamIds = leaderTeams.map((t: { equipo_id: string }) => t.equipo_id);

	const { count } = await supabase
		.from("equipo_miembros")
		.select("*", { count: "exact", head: true })
		.eq("user_id", responsableId)
		.in("equipo_id", teamIds);

	return (count ?? 0) > 0;
}

/**
 * Permiso explícito vigente sobre la póliza (policy_edit_permissions),
 * otorgado por un admin o por el líder de equipo. El mismo permiso que
 * habilita editar la póliza habilita editar sus anexos.
 */
async function tienePermisoExplicitoPoliza(
	supabase: SupabaseServer,
	userId: string,
	polizaId: string,
): Promise<boolean> {
	const { data: perms } = await supabase
		.from("policy_edit_permissions")
		.select("id, expires_at")
		.eq("poliza_id", polizaId)
		.eq("user_id", userId)
		.is("revoked_at", null)
		.order("granted_at", { ascending: false })
		.limit(1);

	const perm = perms?.[0];
	return !!perm && (!perm.expires_at || new Date(perm.expires_at) > new Date());
}

/**
 * Autorización para editar un anexo — mismo modelo que la edición de pólizas:
 * admin, líder de equipo del responsable, permiso explícito por póliza,
 * permiso global polizas.editar (dentro del scope de equipo) o el creador
 * de un anexo rechazado (corregir y reenviar).
 * Editables: pendiente, rechazado y activo (este último con revalidación
 * condicional en actualizarAnexo).
 */
async function verifyAnexoEditPermission(anexoId: string) {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("No autenticado");

	const { data: anexo } = await supabase
		.from("polizas_anexos")
		.select(
			`
			id, estado, tipo_anexo, poliza_id, created_by,
			numero_anexo, fecha_efectiva, observaciones,
			poliza:polizas!poliza_id (responsable_id)
		`,
		)
		.eq("id", anexoId)
		.single();

	if (!anexo) throw new Error("Anexo no encontrado");

	if (anexo.estado !== "pendiente" && anexo.estado !== "rechazado" && anexo.estado !== "activo") {
		throw new Error("El anexo no se encuentra en un estado editable");
	}

	const responsableId = (anexo.poliza as unknown as { responsable_id: string } | null)?.responsable_id;

	const anexoData = {
		id: anexo.id as string,
		estado: anexo.estado as "pendiente" | "rechazado" | "activo",
		tipo_anexo: anexo.tipo_anexo as "inclusion" | "exclusion" | "anulacion",
		poliza_id: anexo.poliza_id as string,
		numero_anexo: anexo.numero_anexo as string,
		fecha_efectiva: anexo.fecha_efectiva as string,
		observaciones: (anexo.observaciones as string | null) || "",
	};

	// Admin siempre puede
	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
	if (profile?.role === "admin") return { supabase, user, anexo: anexoData };

	// Creador de un anexo rechazado: corregir y reenviar
	if (anexo.estado === "rechazado" && anexo.created_by === user.id) {
		return { supabase, user, anexo: anexoData };
	}

	// Líder de equipo del responsable de la póliza
	if (responsableId && (await esLiderDeEquipoParaResponsable(supabase, user.id, responsableId))) {
		return { supabase, user, anexo: anexoData };
	}

	// Permiso explícito por póliza (otorgado por admin o líder de equipo)
	if (await tienePermisoExplicitoPoliza(supabase, user.id, anexo.poliza_id)) {
		return { supabase, user, anexo: anexoData };
	}

	// Permiso global polizas.editar, respetando el scope de equipo
	const { data: hasEditPerm } = await supabase.rpc("user_has_permission", {
		p_user_id: user.id,
		p_permission_id: "polizas.editar",
	});
	if (hasEditPerm) {
		const scope = await getDataScopeFilter("polizas");
		if (!scope.needsScoping || (responsableId && scope.teamMemberIds.includes(responsableId))) {
			return { supabase, user, anexo: anexoData };
		}
	}

	throw new Error("No tienes permiso para editar este anexo");
}

/**
 * Verifica si el usuario actual puede editar anexos de una póliza (para
 * mostrar/ocultar el botón de edición en la UI). La verificación
 * autoritativa siempre ocurre en el servidor al cargar/guardar.
 */
export async function checkAnexoEditAccess(polizaId: string): Promise<{
	success: boolean;
	canEdit: boolean;
	userId?: string;
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, canEdit: false, error: "No autenticado" };

		const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
		if (profile?.role === "admin") return { success: true, canEdit: true, userId: user.id };

		const { data: poliza } = await supabase.from("polizas").select("responsable_id").eq("id", polizaId).single();
		const responsableId = poliza?.responsable_id as string | undefined;

		if (responsableId && (await esLiderDeEquipoParaResponsable(supabase, user.id, responsableId))) {
			return { success: true, canEdit: true, userId: user.id };
		}

		if (await tienePermisoExplicitoPoliza(supabase, user.id, polizaId)) {
			return { success: true, canEdit: true, userId: user.id };
		}

		const { data: hasEditPerm } = await supabase.rpc("user_has_permission", {
			p_user_id: user.id,
			p_permission_id: "polizas.editar",
		});
		if (hasEditPerm) {
			const scope = await getDataScopeFilter("polizas");
			if (!scope.needsScoping || (responsableId && scope.teamMemberIds.includes(responsableId))) {
				return { success: true, canEdit: true, userId: user.id };
			}
		}

		return { success: true, canEdit: false, userId: user.id };
	} catch (error) {
		console.error("Error verificando acceso de edición de anexos:", error);
		return {
			success: false,
			canEdit: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Reconstruye items_cambio del formulario desde las tablas espejo del anexo.
 * Los nombres de cliente (client_name/client_ci) no se persisten en las
 * tablas espejo; solo se usan para display en el selector de exclusión, que
 * los toma de items_actuales, así que pueden ir vacíos.
 */
async function cargarItemsCambioAnexo(
	supabase: SupabaseServer,
	anexoId: string,
	ramo: string,
): Promise<AnexoFormState["items_cambio"]> {
	const ramoLower = ramo.toLowerCase();

	const parseItemsJson = <T>(raw: unknown): T[] => {
		if (typeof raw === "string") {
			try {
				return JSON.parse(raw) as T[];
			} catch {
				return [];
			}
		}
		return Array.isArray(raw) ? (raw as T[]) : [];
	};

	if (ramoLower.includes("automotor")) {
		const { data } = await supabase.from("polizas_anexos_automotor_vehiculos").select("*").eq("anexo_id", anexoId);
		if (!data || data.length === 0) return null;
		const items: AnexoItemChange<VehiculoAutomotor>[] = data.map((v) => ({
			accion: v.accion,
			original_item_id: v.original_item_id || undefined,
			data: {
				placa: v.placa,
				valor_asegurado: Number(v.valor_asegurado),
				franquicia: Number(v.franquicia),
				nro_chasis: v.nro_chasis,
				uso: v.uso,
				coaseguro: Number(v.coaseguro) || 0,
				tipo_vehiculo_id: v.tipo_vehiculo_id || undefined,
				marca_id: v.marca_id || undefined,
				modelo: v.modelo || undefined,
				ano: v.ano || undefined,
				color: v.color || undefined,
				ejes: v.ejes || undefined,
				nro_motor: v.nro_motor || undefined,
				nro_asientos: v.nro_asientos || undefined,
				plaza_circulacion: v.plaza_circulacion || undefined,
			},
		}));
		return { tipo_ramo: "Automotores", items };
	}

	if (ramoLower.includes("salud") || ramoLower.includes("enfermedad")) {
		const [{ data: aseg }, { data: benef }] = await Promise.all([
			supabase.from("polizas_anexos_salud_asegurados").select("*").eq("anexo_id", anexoId),
			supabase.from("polizas_anexos_salud_beneficiarios").select("*").eq("anexo_id", anexoId),
		]);
		if ((!aseg || aseg.length === 0) && (!benef || benef.length === 0)) return null;
		const items_asegurados: AnexoItemChange<ContratanteSalud>[] = (aseg || []).map((a) => ({
			accion: a.accion,
			original_item_id: a.original_item_id || undefined,
			data: { client_id: a.client_id, client_name: "", client_ci: "", nivel_id: a.nivel_id, rol: a.rol },
		}));
		const items_beneficiarios: AnexoItemChange<TitularSalud>[] = (benef || []).map((b) => ({
			accion: b.accion,
			original_item_id: b.original_item_id || undefined,
			data: {
				id: b.original_item_id || b.id,
				nombre_completo: b.nombre_completo,
				carnet: b.carnet,
				fecha_nacimiento: b.fecha_nacimiento || undefined,
				genero: b.genero || undefined,
				nivel_id: b.nivel_id,
				descendientes: [],
			},
		}));
		return { tipo_ramo: "Salud", items_asegurados, items_beneficiarios };
	}

	if (ramoLower.includes("tecnico") || ramoLower.includes("técnico")) {
		const { data } = await supabase
			.from("polizas_anexos_ramos_tecnicos_equipos")
			.select("*")
			.eq("anexo_id", anexoId);
		if (!data || data.length === 0) return null;
		const items: AnexoItemChange<EquipoIndustrial>[] = data.map((e) => ({
			accion: e.accion,
			original_item_id: e.original_item_id || undefined,
			data: {
				nro_serie: e.nro_serie,
				valor_asegurado: Number(e.valor_asegurado),
				franquicia: Number(e.franquicia),
				nro_chasis: e.nro_chasis,
				uso: e.uso,
				coaseguro: Number(e.coaseguro) || 0,
				placa: e.placa || undefined,
				tipo_equipo_id: e.tipo_equipo_id || undefined,
				marca_equipo_id: e.marca_equipo_id || undefined,
				modelo: e.modelo || undefined,
				ano: e.ano || undefined,
				color: e.color || undefined,
				nro_motor: e.nro_motor || undefined,
				plaza_circulacion: e.plaza_circulacion || undefined,
			},
		}));
		return { tipo_ramo: "Ramos técnicos", items };
	}

	if (
		ramoLower.includes("aeronavegacion") ||
		ramoLower.includes("aeronavegación") ||
		ramoLower.includes("naves") ||
		ramoLower.includes("embarcacion") ||
		ramoLower.includes("embarcación")
	) {
		const { data } = await supabase.from("polizas_anexos_aeronavegacion_naves").select("*").eq("anexo_id", anexoId);
		if (!data || data.length === 0) return null;
		const tipoRamo =
			ramoLower.includes("naves") || ramoLower.includes("embarcacion") || ramoLower.includes("embarcación")
				? ("Naves o embarcaciones" as const)
				: ("Aeronavegación" as const);
		const items: AnexoItemChange<NaveEmbarcacion>[] = data.map((n) => ({
			accion: n.accion,
			original_item_id: n.original_item_id || undefined,
			data: {
				matricula: n.matricula,
				marca: n.marca,
				modelo: n.modelo,
				ano: n.ano,
				serie: n.serie,
				uso: n.uso,
				nro_pasajeros: n.nro_pasajeros,
				nro_tripulantes: n.nro_tripulantes,
				valor_casco: Number(n.valor_casco),
				valor_responsabilidad_civil: Number(n.valor_responsabilidad_civil),
				nivel_ap_id: n.nivel_ap_id || undefined,
			},
		}));
		return { tipo_ramo: tipoRamo, items };
	}

	if (ramoLower.includes("incendio")) {
		const { data } = await supabase.from("polizas_anexos_incendio_bienes").select("*").eq("anexo_id", anexoId);
		if (!data || data.length === 0) return null;
		const items: AnexoItemChange<BienAseguradoIncendio>[] = data.map((b) => ({
			accion: b.accion,
			original_item_id: b.original_item_id || undefined,
			data: {
				direccion: b.direccion,
				valor_total_declarado: Number(b.valor_total_declarado),
				es_primer_riesgo: !!b.es_primer_riesgo,
				items: parseItemsJson(b.items),
			},
		}));
		return { tipo_ramo: "Incendio y Aliados", items };
	}

	if (ramoLower.includes("riesgo") && ramoLower.includes("vario")) {
		const { data } = await supabase
			.from("polizas_anexos_riesgos_varios_bienes")
			.select("*")
			.eq("anexo_id", anexoId);
		if (!data || data.length === 0) return null;
		const items: AnexoItemChange<BienAseguradoRiesgosVarios>[] = data.map((b) => ({
			accion: b.accion,
			original_item_id: b.original_item_id || undefined,
			data: {
				direccion: b.direccion,
				valor_total_declarado: Number(b.valor_total_declarado),
				es_primer_riesgo: !!b.es_primer_riesgo,
				items: parseItemsJson(b.items),
			},
		}));
		return { tipo_ramo: "Riesgos Varios Misceláneos", items };
	}

	if (
		ramoLower.includes("vida") ||
		ramoLower.includes("sepelio") ||
		ramoLower.includes("defuncion") ||
		ramoLower.includes("defunción") ||
		(ramoLower.includes("accidente") && ramoLower.includes("personal"))
	) {
		const { data } = await supabase.from("polizas_anexos_asegurados_nivel").select("*").eq("anexo_id", anexoId);
		if (!data || data.length === 0) return null;
		const tipoRamo = ramoLower.includes("vida")
			? ("Vida" as const)
			: ramoLower.includes("sepelio") || ramoLower.includes("defuncion") || ramoLower.includes("defunción")
				? ("Sepelio" as const)
				: ("Accidentes Personales" as const);
		const items: AnexoItemChange<AseguradoConNivel>[] = data.map((a) => ({
			accion: a.accion,
			original_item_id: a.original_item_id || undefined,
			data: {
				client_id: a.client_id,
				client_name: "",
				client_ci: "",
				nivel_id: a.nivel_id || "",
				cargo: a.cargo || undefined,
			},
		}));
		return { tipo_ramo: tipoRamo, items };
	}

	return null;
}

/**
 * Carga un anexo editable (pendiente/rechazado/activo) y lo transforma a
 * AnexoFormState para el formulario de edición, junto con los datos de la
 * póliza madre.
 */
/**
 * Clasifica el motivo por el que no se pudo abrir un anexo para edición, para
 * que la UI muestre el mensaje y la ayuda correctos (un fallo de permiso pide
 * contactar al admin/líder; un fallo de estado de la póliza/anexo no).
 */
function clasificarErrorEdicionAnexo(message: string): MotivoErrorEdicionAnexo {
	const m = message.toLowerCase();
	if (m.includes("permiso")) return "permiso";
	if (m.includes("no encontrad") || m.includes("no autenticado")) return "no_encontrado";
	if (m.includes("activa") || m.includes("estado editable")) return "estado";
	return "generico";
}

export async function obtenerAnexoParaEdicion(anexoId: string): Promise<{
	success: boolean;
	formState?: AnexoFormState;
	datosPoliza?: DatosPolizaParaAnexo;
	estadoAnexo?: "pendiente" | "rechazado" | "activo";
	error?: string;
	errorKind?: MotivoErrorEdicionAnexo;
}> {
	try {
		const { supabase, anexo } = await verifyAnexoEditPermission(anexoId);

		// Reutiliza la carga de datos de la póliza (cuotas, items actuales),
		// sin aplicar los efectos del anexo en edición sobre los items.
		// Si el anexo es la anulación activa, la póliza ya está anulada.
		const datosResult = await obtenerDatosParaAnexo(anexo.poliza_id, {
			permitirAnulada: anexo.tipo_anexo === "anulacion",
			excluirAnexoId: anexoId,
		});
		if (!datosResult.success || !datosResult.datos) {
			// La póliza madre dejó de estar activa (o no se encontró): no es un
			// problema de permisos del usuario. Reformulamos en clave de edición
			// porque el mensaje base de `obtenerDatosParaAnexo` habla de "crear".
			const esEstado = (datosResult.error || "").toLowerCase().includes("activa");
			return {
				success: false,
				error: esEstado
					? "La póliza de este anexo ya no está activa; solo se pueden editar anexos de pólizas activas."
					: datosResult.error || "No se pudieron cargar los datos de la póliza",
				errorKind: clasificarErrorEdicionAnexo(datosResult.error || ""),
			};
		}
		const datosPoliza = datosResult.datos;

		const [itemsCambio, pagosResult, docsResult] = await Promise.all([
			cargarItemsCambioAnexo(supabase, anexoId, datosPoliza.poliza.ramo),
			supabase
				.from("polizas_anexos_pagos")
				.select(
					"id, cuota_original_id, cuota_anexo_pago_id, tipo, numero_cuota, monto, direccion, fecha_vencimiento, observaciones",
				)
				.eq("anexo_id", anexoId)
				.order("numero_cuota", { ascending: true }),
			supabase
				.from("polizas_anexos_documentos")
				.select("id, tipo_documento, nombre_archivo, archivo_url, tamano_bytes")
				.eq("anexo_id", anexoId)
				.eq("estado", "activo"),
		]);

		const pagos = pagosResult.data || [];

		// Inclusión: plan de pago propio del anexo
		let planPagoInclusion: PlanPagoInclusion | null = null;
		const cuotasPropias = pagos.filter((p) => p.tipo === "cuota_propia");
		if (cuotasPropias.length > 0) {
			const cuotas = cuotasPropias.map((p) => ({
				numero_cuota: p.numero_cuota ?? 0,
				monto: Number(p.monto),
				fecha_vencimiento: p.fecha_vencimiento || "",
			}));
			const primaTotal = Math.round(cuotas.reduce((s, c) => s + c.monto, 0) * 100) / 100;
			planPagoInclusion = {
				modalidad: cuotas.length === 1 ? "contado" : "credito",
				prima_total: primaTotal,
				cuota_inicial: 0,
				cantidad_cuotas: cuotas.length,
				cuotas,
			};
		}

		// Exclusión: descuentos existentes mapeados sobre las cuotas descontables
		// (madre + inclusiones). El saldo disponible ya excluye los deltas de este
		// mismo anexo (obtenerDatosParaAnexo recibió excluirAnexoId), así que el
		// tope para reasignar es saldo_disponible.
		const ajustesMadre = new Map(
			pagos
				.filter((p) => p.tipo === "ajuste" && p.cuota_original_id)
				.map((p) => [p.cuota_original_id as string, p]),
		);
		const ajustesInclusion = new Map(
			pagos
				.filter((p) => p.tipo === "ajuste" && p.cuota_anexo_pago_id)
				.map((p) => [p.cuota_anexo_pago_id as string, p]),
		);
		const cuotasAjuste: CuotaAjuste[] = (datosPoliza.cuotas_descontables || []).map((d) => {
			const ajuste =
				d.origen === "madre"
					? d.cuota_original_id
						? ajustesMadre.get(d.cuota_original_id)
						: undefined
					: d.cuota_anexo_pago_id
						? ajustesInclusion.get(d.cuota_anexo_pago_id)
						: undefined;
			return {
				origen: d.origen,
				cuota_original_id: d.cuota_original_id,
				cuota_anexo_pago_id: d.cuota_anexo_pago_id,
				numero_anexo: d.numero_anexo,
				numero_cuota: d.numero_cuota,
				monto_original: d.monto,
				saldo_disponible: d.saldo_disponible,
				monto_delta: ajuste ? Number(ajuste.monto) : 0,
				fecha_vencimiento: ajuste?.fecha_vencimiento || d.fecha_vencimiento,
				estado_original: d.estado,
			};
		});

		// Anulación: vigencia corrida (monto en positivo + dirección)
		const vc = pagos.find((p) => p.tipo === "vigencia_corrida");
		const vigenciaCorrida = vc
			? {
					monto: Math.abs(Number(vc.monto)),
					direccion: ((vc.direccion as DireccionVigenciaCorrida | null) ??
						"cobro") as DireccionVigenciaCorrida,
					fecha_vencimiento: vc.fecha_vencimiento || "",
					observaciones: vc.observaciones || "",
				}
			: null;

		// Documentos existentes: identificados por id, ya en su ruta final
		const documentos: DocumentoPoliza[] = (docsResult.data || []).map((d) => ({
			id: d.id,
			tipo_documento: d.tipo_documento,
			nombre_archivo: d.nombre_archivo,
			archivo_url: d.archivo_url,
			storage_path: d.archivo_url,
			tamano_bytes: d.tamano_bytes || undefined,
			upload_status: "uploaded" as const,
			estado: "activo" as const,
		}));

		const formState: AnexoFormState = {
			paso_actual: 5,
			poliza_id: anexo.poliza_id,
			poliza_resumen: datosPoliza.poliza,
			config: {
				tipo_anexo: anexo.tipo_anexo,
				numero_anexo: anexo.numero_anexo,
				fecha_efectiva: anexo.fecha_efectiva,
				observaciones: anexo.observaciones,
			},
			items_cambio: itemsCambio,
			plan_pago_inclusion: planPagoInclusion,
			cuotas_ajuste: anexo.tipo_anexo === "exclusion" ? cuotasAjuste : [],
			vigencia_corrida: vigenciaCorrida,
			documentos,
			advertencias: [],
		};

		return { success: true, formState, datosPoliza, estadoAnexo: anexo.estado };
	} catch (error) {
		console.error("Error cargando anexo para edición:", error);
		const message = error instanceof Error ? error.message : "Error desconocido";
		return { success: false, error: message, errorKind: clasificarErrorEdicionAnexo(message) };
	}
}

/**
 * Actualiza un anexo editable: reemplaza items, ajusta documentos (soft
 * delete de los quitados, alta de los nuevos) y aplica revalidación
 * condicional — un anexo pendiente/rechazado siempre vuelve a pendiente; un
 * anexo activo solo vuelve a pendiente si cambian sus pagos (cuotas/montos),
 * las ediciones cosméticas (items, documentos, observaciones) preservan la
 * validación para no recargar a gerencia con nimiedades.
 */
export async function actualizarAnexo(
	anexoId: string,
	formState: AnexoFormState,
): Promise<{ success: boolean; anexo_id?: string; estado_final?: "pendiente" | "activo"; error?: string }> {
	try {
		const { supabase, user, anexo } = await verifyAnexoEditPermission(anexoId);

		if (!formState.config) {
			return { success: false, error: "Datos del anexo incompletos" };
		}

		if (formState.config.tipo_anexo !== anexo.tipo_anexo) {
			return {
				success: false,
				error: "El tipo de anexo no se puede cambiar. Si necesita otro tipo, cree un anexo nuevo.",
			};
		}

		// La póliza madre debe seguir activa, salvo que este anexo sea la
		// anulación activa que la dejó anulada
		const { data: poliza } = await supabase.from("polizas").select("id, estado").eq("id", anexo.poliza_id).single();

		const esAnulacionActiva = anexo.tipo_anexo === "anulacion" && anexo.estado === "activo";
		const polizaEditable =
			poliza && (poliza.estado === "activa" || (esAnulacionActiva && poliza.estado === "anulada"));
		if (!polizaEditable) {
			return { success: false, error: "La póliza no está activa. No se pueden editar sus anexos." };
		}

		// Validar plan de inclusión si corresponde
		if (anexo.tipo_anexo === "inclusion") {
			const plan = formState.plan_pago_inclusion;
			if (!plan || plan.prima_total <= 0 || plan.cuotas.length === 0) {
				return { success: false, error: "El plan de pago de la inclusión es requerido" };
			}
		}

		// Documento obligatorio (existentes que se mantienen o nuevos subidos)
		const docsValidos = formState.documentos.filter((d) => d.storage_path && d.upload_status === "uploaded");
		if (docsValidos.length === 0) {
			return { success: false, error: "El documento de anexo es obligatorio" };
		}

		// Validar descuentos de exclusión contra el saldo cobrable autoritativo
		// (excluyendo los propios deltas de este anexo para que su cupo se libere).
		const cuotasConDelta =
			anexo.tipo_anexo === "exclusion" ? formState.cuotas_ajuste.filter((c) => c.monto_delta !== 0) : [];
		if (anexo.tipo_anexo === "exclusion") {
			const validacion = await construirPagosAjusteExclusion(
				supabase,
				anexo.poliza_id,
				anexoId,
				formState.cuotas_ajuste,
				anexoId,
			);
			if (!validacion.ok) {
				return { success: false, error: validacion.error };
			}
		}

		// --- DETECTAR CAMBIO FINANCIERO (pagos: cuotas, montos, fechas) ---
		// Se compara el set de pagos resultante contra el existente. Solo un
		// cambio financiero obliga a revalidar un anexo activo; lo cosmético
		// (items, documentos, observaciones, número) preserva la validación.
		type PagoNuevo = {
			tipo: "vigencia_corrida" | "cuota_propia" | "ajuste";
			cuota_original_id: string | null;
			cuota_anexo_pago_id: string | null;
			numero_cuota: number | null;
			monto: number;
			direccion: DireccionVigenciaCorrida | null;
			fecha_vencimiento: string | null;
			observaciones: string;
		};
		const nuevosPagos: PagoNuevo[] = [];
		if (anexo.tipo_anexo === "anulacion") {
			if (formState.vigencia_corrida && formState.vigencia_corrida.monto > 0) {
				const direccion: DireccionVigenciaCorrida =
					formState.vigencia_corrida.direccion === "devolucion" ? "devolucion" : "cobro";
				nuevosPagos.push({
					tipo: "vigencia_corrida",
					cuota_original_id: null,
					cuota_anexo_pago_id: null,
					numero_cuota: 0,
					monto: Math.abs(formState.vigencia_corrida.monto),
					direccion,
					fecha_vencimiento: formState.vigencia_corrida.fecha_vencimiento,
					observaciones:
						formState.vigencia_corrida.observaciones?.trim() ||
						(direccion === "devolucion" ? "Devolución a favor del cliente" : "Cobro vigencia corrida"),
				});
			}
		} else if (anexo.tipo_anexo === "inclusion") {
			const plan = formState.plan_pago_inclusion!;
			for (const c of plan.cuotas) {
				nuevosPagos.push({
					tipo: "cuota_propia",
					cuota_original_id: null,
					cuota_anexo_pago_id: null,
					numero_cuota: c.numero_cuota,
					monto: c.monto,
					direccion: null,
					fecha_vencimiento: c.fecha_vencimiento,
					observaciones:
						plan.modalidad === "contado"
							? "Pago contado por inclusión"
							: `Cuota ${c.numero_cuota} de ${plan.cuotas.length} por inclusión`,
				});
			}
		} else {
			for (const c of cuotasConDelta) {
				nuevosPagos.push({
					tipo: "ajuste",
					cuota_original_id: c.origen === "madre" ? c.cuota_original_id : null,
					cuota_anexo_pago_id: c.origen === "inclusion" ? c.cuota_anexo_pago_id : null,
					numero_cuota: c.numero_cuota,
					monto: -Math.abs(c.monto_delta),
					direccion: null,
					fecha_vencimiento: c.fecha_vencimiento,
					observaciones: "Descuento por exclusión",
				});
			}
		}

		const { data: pagosExistentes, error: pagosExistentesError } = await supabase
			.from("polizas_anexos_pagos")
			.select(
				"id, tipo, cuota_original_id, cuota_anexo_pago_id, numero_cuota, monto, direccion, fecha_vencimiento, estado, fecha_pago",
			)
			.eq("anexo_id", anexoId);
		throwIfAnexoError(pagosExistentesError, "Error al verificar los pagos del anexo");

		// La dirección y la cuota objetivo (madre o inclusión) entran en la clave:
		// cambiar cobro↔devolución o reapuntar el descuento es un cambio financiero
		// (revierte un anexo activo a pendiente y reactiva la póliza).
		const clavePago = (p: {
			tipo: string;
			cuota_original_id: string | null;
			cuota_anexo_pago_id?: string | null;
			numero_cuota: number | null;
			monto: number;
			direccion?: string | null;
			fecha_vencimiento: string | null;
		}) =>
			`${p.tipo}|${p.cuota_original_id || ""}|${p.cuota_anexo_pago_id || ""}|${p.numero_cuota ?? ""}|${Number(p.monto).toFixed(2)}|${p.direccion || ""}|${p.fecha_vencimiento || ""}`;

		const clavesExistentes = (pagosExistentes || []).map(clavePago).sort().join("\n");
		const clavesNuevas = nuevosPagos.map(clavePago).sort().join("\n");
		const cambioFinanciero = clavesExistentes !== clavesNuevas;

		const eraActivo = anexo.estado === "activo";
		const mantieneValidacion = eraActivo && !cambioFinanciero;

		// Con pagos ya registrados (cobranza) no se pueden alterar los montos
		if (cambioFinanciero) {
			const tienePagosRegistrados = (pagosExistentes || []).some(
				(p) => p.fecha_pago || p.estado === "pagado" || p.estado === "parcial",
			);
			if (tienePagosRegistrados) {
				return {
					success: false,
					error: "El anexo tiene cuotas con pagos registrados; no se pueden modificar sus montos o cuotas. Contacte a un administrador.",
				};
			}
		}

		// --- ACTUALIZAR ANEXO PRINCIPAL ---
		const camposBase = {
			numero_anexo: formState.config.numero_anexo.trim(),
			fecha_efectiva: formState.config.fecha_efectiva,
			observaciones: formState.config.observaciones?.trim() || null,
			updated_by: user.id,
			updated_at: new Date().toISOString(),
		};
		const { error: updateError } = await supabase
			.from("polizas_anexos")
			.update(
				mantieneValidacion
					? camposBase
					: {
							...camposBase,
							estado: "pendiente",
							validado_por: null,
							fecha_validacion: null,
							motivo_rechazo: null,
							rechazado_por: null,
							fecha_rechazo: null,
						},
			)
			.eq("id", anexoId);

		if (updateError) {
			return { success: false, error: mapAnexoError(updateError, "Error al actualizar el anexo") };
		}

		// Anulación activa con cambio financiero: deshacer la anulación de la
		// póliza hasta que gerencia revalide el anexo (inverso de validarAnexo)
		if (esAnulacionActiva && cambioFinanciero) {
			const { error: polizaError } = await supabase
				.from("polizas")
				.update({ estado: "activa" })
				.eq("id", anexo.poliza_id)
				.eq("estado", "anulada");
			if (polizaError) {
				console.error("Error reactivando póliza tras editar anulación:", polizaError);
				return { success: false, error: "Anexo actualizado pero no se pudo reactivar la póliza" };
			}
			// Devolver las cuotas que esta anulación había marcado 'anulada'.
			const { error: restaurarError } = await restaurarCuotasPorAnulacion(supabase, anexo.poliza_id, anexoId);
			if (restaurarError) {
				console.error("Error restaurando cuotas tras editar anulación:", restaurarError);
				return { success: false, error: "Anexo actualizado pero no se pudieron restaurar las cuotas" };
			}
		}

		// --- REEMPLAZAR ITEMS (siempre) Y PAGOS (solo si cambiaron) ---
		try {
			const tablasItems = [
				"polizas_anexos_automotor_vehiculos",
				"polizas_anexos_salud_asegurados",
				"polizas_anexos_salud_beneficiarios",
				"polizas_anexos_ramos_tecnicos_equipos",
				"polizas_anexos_aeronavegacion_naves",
				"polizas_anexos_incendio_bienes",
				"polizas_anexos_riesgos_varios_bienes",
				"polizas_anexos_asegurados_nivel",
			];
			for (const tabla of tablasItems) {
				const { error: deleteError } = await supabase.from(tabla).delete().eq("anexo_id", anexoId);
				throwIfAnexoError(deleteError, "Error al limpiar los datos anteriores del anexo");
			}

			// Pagos sin cambios se conservan intactos (preserva estado/fecha_pago)
			if (cambioFinanciero) {
				const { error: deletePagosError } = await supabase
					.from("polizas_anexos_pagos")
					.delete()
					.eq("anexo_id", anexoId);
				throwIfAnexoError(deletePagosError, "Error al limpiar los pagos anteriores del anexo");

				if (nuevosPagos.length > 0) {
					const { error: pagosError } = await supabase.from("polizas_anexos_pagos").insert(
						nuevosPagos.map((p) => ({
							anexo_id: anexoId,
							cuota_original_id: p.cuota_original_id,
							cuota_anexo_pago_id: p.cuota_anexo_pago_id,
							tipo: p.tipo,
							numero_cuota: p.numero_cuota,
							monto: p.monto,
							direccion: p.direccion,
							fecha_vencimiento: p.fecha_vencimiento,
							estado: "pendiente" as const,
							observaciones: p.observaciones,
						})),
					);
					throwIfAnexoError(pagosError, "Error al guardar los pagos del anexo");
				}
			}

			if (formState.items_cambio && anexo.tipo_anexo !== "anulacion") {
				await insertarItemsRamo(supabase, anexoId, formState.items_cambio);
			}
		} catch (insertError) {
			console.error("Error reemplazando datos del anexo:", insertError);
			return {
				success: false,
				error:
					insertError instanceof Error
						? `${insertError.message}. Revise el anexo y vuelva a guardar.`
						: "Error guardando los datos del anexo. Revise el anexo y vuelva a guardar.",
			};
		}

		// --- DOCUMENTOS ---
		// Soft delete de los existentes que se quitaron del formulario
		const idsEnFormulario = new Set(formState.documentos.filter((d) => d.id).map((d) => d.id as string));
		const { data: docsActuales } = await supabase
			.from("polizas_anexos_documentos")
			.select("id")
			.eq("anexo_id", anexoId)
			.eq("estado", "activo");

		const idsDescartar = (docsActuales || []).map((d) => d.id as string).filter((id) => !idsEnFormulario.has(id));
		if (idsDescartar.length > 0) {
			await supabase.from("polizas_anexos_documentos").update({ estado: "descartado" }).in("id", idsDescartar);
		}

		// Registrar documentos nuevos (subidos a temp/ desde el cliente)
		for (const doc of docsValidos.filter((d) => !d.id)) {
			const tempPath = doc.storage_path!;
			const finalPath = generateFinalStoragePath(`anexos/${anexoId}`, doc.nombre_archivo);

			const { error: moveError } = await supabase.storage.from("polizas-documentos").move(tempPath, finalPath);
			const usedPath = moveError ? tempPath : finalPath;

			await supabase.from("polizas_anexos_documentos").insert({
				anexo_id: anexoId,
				tipo_documento: doc.tipo_documento || "Documento de Anexo",
				nombre_archivo: doc.nombre_archivo,
				archivo_url: usedPath,
				tamano_bytes: doc.tamano_bytes || null,
				uploaded_by: user.id,
			});
		}

		revalidatePath("/polizas");
		revalidatePath(`/polizas/${anexo.poliza_id}`);
		revalidatePath("/gerencia/validacion");

		return { success: true, anexo_id: anexoId, estado_final: mantieneValidacion ? "activo" : "pendiente" };
	} catch (error) {
		console.error("Error actualizando anexo:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}
