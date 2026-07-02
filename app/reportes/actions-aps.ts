"use server";

import { createClient } from "@/utils/supabase/server";
import { checkPermission } from "@/utils/auth/helpers";
import { captureError } from "@/utils/sentry";
import { ESTADO_ANEXO } from "@/types/anexo";

// ============================================================================
// REPORTES APS
// Consolida producción para la Autoridad de Fiscalización (APS):
// - Ingreso: pólizas validadas en el período (fecha_validacion), excluyendo
//   pendientes y rechazadas. Las retroactivas (ya reportadas en meses pasados)
//   se excluyen por defecto, pero el filtro es configurable. El egreso no las
//   filtra: una anulación validada en el período se reporta siempre, sin
//   importar cuándo se reportó el ingreso original.
// - Egreso: pólizas anuladas en el período (fecha_validacion del anexo de
//   anulación), revirtiendo los montos completos de la póliza.
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
		polizas_egreso: number;
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
	moneda: string | null;
	ramo: string | null;
	compania: CompaniaJoin;
	producto: ProductoJoin;
};

const PAGE_SIZE = 1000;

const POLIZA_FINANCIERA_SELECT = `
	id,
	prima_total,
	prima_neta,
	comision,
	comision_empresa,
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
	const desdeTs = `${filtros.fecha_desde}T00:00:00`;
	const hastaTs = `${filtros.fecha_hasta}T23:59:59`;

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

		// INGRESO: pólizas validadas en el período
		const excluirRetroactivas = filtros.excluir_retroactivas !== false;
		const polizasIngreso: PolizaFinanciera[] = [];
		for (let from = 0; ; from += PAGE_SIZE) {
			let query = supabase
				.from("polizas")
				.select(POLIZA_FINANCIERA_SELECT)
				.gte("fecha_validacion", desdeTs)
				.lte("fecha_validacion", hastaTs);
			if (excluirRetroactivas) {
				query = query.eq("es_retroactiva", false);
			}
			const { data, error } = await query.order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
			if (error) throw error;
			polizasIngreso.push(...((data ?? []) as unknown as PolizaFinanciera[]));
			if (!data || data.length < PAGE_SIZE) break;
		}

		// EGRESO: pólizas cuyo anexo de anulación fue validado en el período
		const polizasEgreso: PolizaFinanciera[] = [];
		for (let from = 0; ; from += PAGE_SIZE) {
			const { data, error } = await supabase
				.from("polizas_anexos")
				.select(`id, poliza:polizas!poliza_id (${POLIZA_FINANCIERA_SELECT})`)
				.eq("tipo_anexo", "anulacion")
				.eq("estado", ESTADO_ANEXO.ACTIVO)
				.gte("fecha_validacion", desdeTs)
				.lte("fecha_validacion", hastaTs)
				.order("id", { ascending: true })
				.range(from, from + PAGE_SIZE - 1);
			if (error) throw error;
			for (const anexo of (data ?? []) as unknown as { poliza: PolizaFinanciera | null }[]) {
				if (anexo.poliza) polizasEgreso.push(anexo.poliza);
			}
			if (!data || data.length < PAGE_SIZE) break;
		}

		return {
			success: true,
			data: {
				ingreso: agregarRegistros(polizasIngreso, tipoCambio, grupoNombres),
				egreso: agregarRegistros(polizasEgreso, tipoCambio, grupoNombres),
				meta: {
					polizas_ingreso: polizasIngreso.length,
					polizas_egreso: polizasEgreso.length,
				},
			},
		};
	} catch (error) {
		await captureError(error, "obtenerDatosAPS", { filtros: { ...filtros } }, { feature: "reportes-aps" });
		return { success: false, error: "Error al obtener los datos para los reportes APS" };
	}
}
