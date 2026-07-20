"use server";

import { createClient } from "@/utils/supabase/server";
import { checkPermission } from "@/utils/auth/helpers";
import { captureError } from "@/utils/sentry";
import { ESTADO_ANEXO } from "@/types/anexo";
import { computarPrimaVigenciaCorrida } from "@/utils/polizas/vigenciaCorridaAnulacion";

// ============================================================================
// REPORTES APS
// Consolida producción para la Autoridad de Fiscalización (APS).
// FECHA MAESTRA (acordado con Contabilidad 2026-07): el mes de reporte lo fija
// la fecha de REGISTRO en el sistema (created_at, zona La Paz), nunca la de
// validación — una póliza cargada en junio es de junio aunque se valide en
// julio. La validación sigue siendo requisito para aparecer (pendientes y
// rechazadas quedan fuera), pero no mueve la póliza de mes: así el reporte es
// reproducible y no cambia al re-validar.
// - Ingreso: pólizas registradas en el período y validadas, más los anexos de
//   INCLUSIÓN registrados en el período y validados (prima propia del anexo).
//   Las retroactivas (ya reportadas en meses pasados) se excluyen por defecto,
//   pero el filtro es configurable; a los anexos no les aplica: un anexo del
//   período es movimiento nuevo aunque su madre sea retroactiva.
// - Egreso: pólizas cuyo anexo de anulación se registró en el período (y está
//   validado), revirtiendo los montos completos de la póliza, más los anexos
//   de EXCLUSIÓN registrados en el período y validados (prima propia, en
//   positivo: el General la resta). Parche contabilidad: si la anulación tiene
//   vigencia corrida de COBRO, en vez de revertir la póliza completa se
//   declaran los montos derivados de la VC (utils/polizas/vigenciaCorridaAnulacion.ts).
// Todos los montos se devuelven en Bs (USD convertido con el tipo de cambio
// indicado). La agregación es por compañía + código APS + riesgo, donde el
// código APS = código de ramo (ej. 9105 → "91-05") + código de producto.
// ============================================================================

export type APSRegistro = {
	compania_codigo: number | null;
	compania_nombre: string;
	grupo_codigo: string; // "91", "92", "93", "94"
	grupo_nombre: string; // "Seguros Generales", etc.
	codigo_aps: string; // "91-05-41"
	riesgo: string; // nombre del producto (ej. "AUT - AUTOMOTORES")
	prima_total: number;
	prima_neta: number;
	comision: number;
};

export type APSDatos = {
	ingreso: APSRegistro[];
	egreso: APSRegistro[];
	meta: {
		polizas_ingreso: number;
		anexos_ingreso: number;
		polizas_egreso: number;
		anexos_egreso: number;
	};
};

export type APSFiltros = {
	fecha_desde: string; // YYYY-MM-DD
	fecha_hasta: string; // YYYY-MM-DD
	tipo_cambio: number; // Bs por USD
	excluir_retroactivas?: boolean; // default true: omitidas por ya haberse reportado antes
};

export type APSResponse = { success: true; data: APSDatos } | { success: false; error: string };

type CompaniaJoin = { codigo: number | null; nombre: string } | null;
type ProductoJoin = {
	codigo_producto: string | null;
	nombre_producto: string | null;
	tipo_seguro: { codigo: string | null; nombre: string | null } | null;
} | null;

type PolizaFinanciera = {
	id: string;
	prima_total: number | null;
	prima_neta: number | null;
	comision: number | null;
	comision_empresa: number | null;
	factor_prima_neta: number | null;
	porcentaje_comision: number | null;
	moneda: string | null;
	ramo: string | null;
	compania: CompaniaJoin;
	producto: ProductoJoin;
};

type AnexoFinanciero = {
	id: string;
	prima_total: number | null;
	prima_neta: number | null;
	comision: number | null;
	comision_empresa: number | null;
	poliza: PolizaFinanciera | null;
};

const PAGE_SIZE = 1000;

const POLIZA_FINANCIERA_SELECT = `
	id,
	prima_total,
	prima_neta,
	comision,
	comision_empresa,
	factor_prima_neta,
	porcentaje_comision,
	moneda,
	ramo,
	compania:companias_aseguradoras!compania_aseguradora_id (
		codigo,
		nombre
	),
	producto:productos_aseguradoras!producto_id (
		codigo_producto,
		nombre_producto,
		tipo_seguro:tipos_seguros!tipo_seguro_id (
			codigo,
			nombre
		)
	)
`;

/**
 * Anexos de inclusión/exclusión registrados en el período (created_at) y ya
 * validados, mapeados como filas financieras: prima propia del anexo +
 * compañía/producto/moneda de la madre. Las exclusiones se guardan en negativo
 * y se voltean a positivo (convención del egreso APS: montos positivos que el
 * General resta). Anexos sin prima propia registrada (anteriores a la feature)
 * se omiten para no generar filas en cero.
 */
async function obtenerAnexosFinancieros(
	supabase: Awaited<ReturnType<typeof createClient>>,
	tipoAnexo: "inclusion" | "exclusion",
	desdeTs: string,
	hastaTs: string,
): Promise<PolizaFinanciera[]> {
	const signo = tipoAnexo === "exclusion" ? -1 : 1;
	const resultado: PolizaFinanciera[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await supabase
			.from("polizas_anexos")
			.select(
				`id, prima_total, prima_neta, comision, comision_empresa, poliza:polizas!poliza_id (${POLIZA_FINANCIERA_SELECT})`,
			)
			.eq("tipo_anexo", tipoAnexo)
			.eq("estado", ESTADO_ANEXO.ACTIVO)
			.gte("created_at", desdeTs)
			.lte("created_at", hastaTs)
			.order("id", { ascending: true })
			.range(from, from + PAGE_SIZE - 1);
		if (error) throw error;
		for (const anexo of (data ?? []) as unknown as AnexoFinanciero[]) {
			if (!anexo.poliza) continue;
			if (anexo.prima_total == null && anexo.prima_neta == null && anexo.comision == null) continue;
			const conSigno = (v: number | null) => (v != null ? signo * Number(v) : null);
			resultado.push({
				...anexo.poliza,
				prima_total: conSigno(anexo.prima_total),
				prima_neta: conSigno(anexo.prima_neta),
				comision: conSigno(anexo.comision),
				comision_empresa: conSigno(anexo.comision_empresa),
			});
		}
		if (!data || data.length < PAGE_SIZE) break;
	}
	return resultado;
}

/**
 * Suma de vigencias corridas de COBRO por anexo de anulación. Las de
 * devolución no cuentan: esas anulaciones mantienen la reversión completa.
 */
async function obtenerVigenciasCorridasCobro(
	supabase: Awaited<ReturnType<typeof createClient>>,
	anexoIds: string[],
): Promise<Map<string, number>> {
	const vcCobro = new Map<string, number>();
	for (let i = 0; i < anexoIds.length; i += 500) {
		const { data, error } = await supabase
			.from("polizas_anexos_pagos")
			.select("anexo_id, monto, direccion")
			.eq("tipo", "vigencia_corrida")
			.in("anexo_id", anexoIds.slice(i, i + 500));
		if (error) throw error;
		for (const pago of (data ?? []) as { anexo_id: string; monto: number | null; direccion: string | null }[]) {
			if (pago.direccion === "devolucion") continue;
			const monto = Math.abs(Number(pago.monto ?? 0));
			if (monto > 0) vcCobro.set(pago.anexo_id, (vcCobro.get(pago.anexo_id) ?? 0) + monto);
		}
	}
	return vcCobro;
}

function convertirABs(monto: number | null | undefined, moneda: string | null, tipoCambio: number): number {
	const valor = monto != null ? Number(monto) : 0;
	if (!Number.isFinite(valor)) return 0;
	return moneda === "USD" ? valor * tipoCambio : valor;
}

/** "9105" + "41" → "91-05-41" */
function formatCodigoAps(ramoCodigo: string | null, codigoProducto: string | null): string {
	if (!ramoCodigo) return "S/D";
	const base = ramoCodigo.length === 4 ? `${ramoCodigo.slice(0, 2)}-${ramoCodigo.slice(2)}` : ramoCodigo;
	return codigoProducto ? `${base}-${codigoProducto}` : base;
}

function agregarRegistros(
	polizas: PolizaFinanciera[],
	tipoCambio: number,
	grupoNombres: Map<string, string>,
): APSRegistro[] {
	const acumulado = new Map<string, APSRegistro>();

	for (const p of polizas) {
		const ramoCodigo = p.producto?.tipo_seguro?.codigo ?? null;
		const grupoCodigo = ramoCodigo ? ramoCodigo.slice(0, 2) : "S/D";
		const codigoAps = formatCodigoAps(ramoCodigo, p.producto?.codigo_producto ?? null);
		const riesgo = p.producto?.nombre_producto || p.ramo || "Sin producto";
		const companiaCodigo = p.compania?.codigo ?? null;
		const companiaNombre = p.compania?.nombre || "Sin compañía";

		const key = `${companiaCodigo}|${companiaNombre}|${codigoAps}|${riesgo}`;
		let registro = acumulado.get(key);
		if (!registro) {
			registro = {
				compania_codigo: companiaCodigo,
				compania_nombre: companiaNombre,
				grupo_codigo: grupoCodigo,
				grupo_nombre: grupoNombres.get(grupoCodigo) || grupoCodigo,
				codigo_aps: codigoAps,
				riesgo,
				prima_total: 0,
				prima_neta: 0,
				comision: 0,
			};
			acumulado.set(key, registro);
		}

		registro.prima_total += convertirABs(p.prima_total, p.moneda, tipoCambio);
		registro.prima_neta += convertirABs(p.prima_neta, p.moneda, tipoCambio);
		// Mismo fallback que los demás reportes: comision_empresa con fallback al campo legacy
		registro.comision += convertirABs(p.comision_empresa ?? p.comision, p.moneda, tipoCambio);
	}

	return Array.from(acumulado.values());
}

export async function obtenerDatosAPS(filtros: APSFiltros): Promise<APSResponse> {
	const { allowed } = await checkPermission("gerencia.aps");
	if (!allowed) {
		return { success: false, error: "No tiene permisos para generar los reportes APS" };
	}

	if (!filtros.fecha_desde || !filtros.fecha_hasta || filtros.fecha_desde > filtros.fecha_hasta) {
		return { success: false, error: "Rango de fechas inválido" };
	}
	const tipoCambio = Number(filtros.tipo_cambio);
	if (!Number.isFinite(tipoCambio) || tipoCambio <= 0) {
		return { success: false, error: "Tipo de cambio inválido" };
	}

	const supabase = await createClient();
	// created_at es timestamptz: los límites del período van anclados a
	// America/La_Paz (UTC-4 fijo, sin horario de verano)
	const desdeTs = `${filtros.fecha_desde}T00:00:00-04:00`;
	const hastaTs = `${filtros.fecha_hasta}T23:59:59.999-04:00`;

	try {
		// Nombres de los grupos APS (ramos padre: 91, 92, 93, 94)
		const { data: padres, error: padresError } = await supabase
			.from("tipos_seguros")
			.select("codigo, nombre")
			.eq("es_ramo_padre", true);
		if (padresError) throw padresError;
		const grupoNombres = new Map<string, string>(
			(padres ?? []).map((p) => [p.codigo as string, p.nombre as string]),
		);

		// INGRESO: pólizas registradas en el período (fecha maestra) y validadas
		const excluirRetroactivas = filtros.excluir_retroactivas !== false;
		const polizasIngreso: PolizaFinanciera[] = [];
		for (let from = 0; ; from += PAGE_SIZE) {
			let query = supabase
				.from("polizas")
				.select(POLIZA_FINANCIERA_SELECT)
				.gte("created_at", desdeTs)
				.lte("created_at", hastaTs)
				.not("fecha_validacion", "is", null);
			if (excluirRetroactivas) {
				query = query.eq("es_retroactiva", false);
			}
			const { data, error } = await query.order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
			if (error) throw error;
			polizasIngreso.push(...((data ?? []) as unknown as PolizaFinanciera[]));
			if (!data || data.length < PAGE_SIZE) break;
		}

		// INGRESO: anexos de inclusión registrados en el período y validados (prima propia)
		const anexosIngreso = await obtenerAnexosFinancieros(supabase, "inclusion", desdeTs, hastaTs);

		// EGRESO: pólizas cuyo anexo de anulación se registró en el período y está validado
		const anulaciones: { anexoId: string; poliza: PolizaFinanciera }[] = [];
		for (let from = 0; ; from += PAGE_SIZE) {
			const { data, error } = await supabase
				.from("polizas_anexos")
				.select(`id, poliza:polizas!poliza_id (${POLIZA_FINANCIERA_SELECT})`)
				.eq("tipo_anexo", "anulacion")
				.eq("estado", ESTADO_ANEXO.ACTIVO)
				.gte("created_at", desdeTs)
				.lte("created_at", hastaTs)
				.order("id", { ascending: true })
				.range(from, from + PAGE_SIZE - 1);
			if (error) throw error;
			for (const anexo of (data ?? []) as unknown as { id: string; poliza: PolizaFinanciera | null }[]) {
				if (anexo.poliza) anulaciones.push({ anexoId: anexo.id, poliza: anexo.poliza });
			}
			if (!data || data.length < PAGE_SIZE) break;
		}

		// Parche contabilidad: anulación con VC de cobro declara los montos
		// derivados de la VC en lugar de revertir la póliza completa.
		const vcCobroMap = await obtenerVigenciasCorridasCobro(
			supabase,
			anulaciones.map((a) => a.anexoId),
		);
		const polizasEgreso: PolizaFinanciera[] = anulaciones.map(({ anexoId, poliza }) => {
			const montoVC = vcCobroMap.get(anexoId);
			if (!montoVC) return poliza;
			const vc = computarPrimaVigenciaCorrida(montoVC, poliza);
			return {
				...poliza,
				prima_total: vc.prima_total,
				prima_neta: vc.prima_neta,
				comision: vc.comision,
				comision_empresa: vc.comision,
			};
		});

		// EGRESO: anexos de exclusión registrados en el período y validados (prima propia en positivo)
		const anexosEgreso = await obtenerAnexosFinancieros(supabase, "exclusion", desdeTs, hastaTs);

		return {
			success: true,
			data: {
				ingreso: agregarRegistros([...polizasIngreso, ...anexosIngreso], tipoCambio, grupoNombres),
				egreso: agregarRegistros([...polizasEgreso, ...anexosEgreso], tipoCambio, grupoNombres),
				meta: {
					polizas_ingreso: polizasIngreso.length,
					anexos_ingreso: anexosIngreso.length,
					polizas_egreso: polizasEgreso.length,
					anexos_egreso: anexosEgreso.length,
				},
			},
		};
	} catch (error) {
		await captureError(error, "obtenerDatosAPS", { filtros: { ...filtros } }, { feature: "reportes-aps" });
		return { success: false, error: "Error al obtener los datos para los reportes APS" };
	}
}
