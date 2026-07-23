// utils/polizas/anulacionReporte.ts
//
// Tratamiento contable de una anulación en los reportes (criterio de
// Contabilidad, jul-2026). Una anulación con vigencia corrida genera DOS
// movimientos separados:
//   1. "Anulación": las cuotas que no llegaron a pagarse (madre + cuotas
//      propias de inclusiones) y que ya no se cobrarán. Siempre en negativo
//      en producción; en el APS entra a la matriz de Egreso.
//   2. El saldo de la vigencia corrida, según su dirección:
//      - "Devolución" (favor cliente): negativo en producción; en el APS va
//        en archivos propios (Produccion/Comision/PrimaNeta Devolución).
//      - "P. Corrida" (favor compañía, el cliente debe pagar el período
//        corrido): positivo en producción; archivos propios en el APS.
// Prima neta y comisión de cada movimiento se derivan del monto con los
// factores congelados de la póliza madre.

import type { createClient } from "@/utils/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const CHUNK = 500;

export type FinancierosPolizaBase = {
	prima_total: number | string | null;
	prima_neta: number | string | null;
	comision: number | string | null;
	comision_empresa: number | string | null;
	/** Porcentaje congelado (54 = 54%): prima_neta = prima_total / (1 + factor/100) */
	factor_prima_neta: number | string | null;
	/** Fracción congelada (0.1657): comision = prima_neta × fracción */
	porcentaje_comision: number | string | null;
};

const num = (v: number | string | null | undefined): number | null => {
	if (v == null) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Prima total/neta/comisión (magnitudes positivas, en la moneda de la póliza)
 * derivadas de un monto, usando los factores congelados de la póliza madre;
 * si faltan (registros previos a la persistencia), se derivan de las primas
 * guardadas.
 */
export function computarPrimaDesdeMonto(
	monto: number,
	poliza: FinancierosPolizaBase,
): { prima_total: number; prima_neta: number; comision: number } {
	const magnitud = Math.abs(Number(monto));

	const factor = num(poliza.factor_prima_neta);
	const polTotal = num(poliza.prima_total);
	const polNeta = num(poliza.prima_neta);
	const ratioNeta =
		factor != null && factor > -100
			? 1 / (1 + factor / 100)
			: polTotal != null && polTotal !== 0 && polNeta != null
				? polNeta / polTotal
				: 1;
	const primaNeta = round2(magnitud * ratioNeta);

	const comisionPoliza = num(poliza.comision_empresa) ?? num(poliza.comision);
	const fraccion =
		num(poliza.porcentaje_comision) ??
		(polNeta != null && polNeta !== 0 && comisionPoliza != null ? comisionPoliza / polNeta : 0);
	const comision = round2(primaNeta * fraccion);

	return { prima_total: magnitud, prima_neta: primaNeta, comision };
}

export type VigenciaCorridaAnexo = { cobro: number; devolucion: number };

/**
 * Vigencias corridas por anexo de anulación, separadas por dirección
 * (magnitudes positivas): cobro = el cliente debe el período corrido,
 * devolucion = saldo a favor del cliente.
 */
export async function obtenerVigenciasCorridasAnulacion(
	supabase: SupabaseServer,
	anexoIds: string[],
): Promise<Map<string, VigenciaCorridaAnexo>> {
	const resultado = new Map<string, VigenciaCorridaAnexo>();
	for (let i = 0; i < anexoIds.length; i += CHUNK) {
		const { data, error } = await supabase
			.from("polizas_anexos_pagos")
			.select("anexo_id, monto, direccion")
			.eq("tipo", "vigencia_corrida")
			.in("anexo_id", anexoIds.slice(i, i + CHUNK));
		if (error) throw error;
		for (const pago of (data ?? []) as { anexo_id: string; monto: number | null; direccion: string | null }[]) {
			const monto = Math.abs(Number(pago.monto ?? 0));
			if (!(monto > 0)) continue;
			const vc = resultado.get(pago.anexo_id) ?? { cobro: 0, devolucion: 0 };
			if (pago.direccion === "devolucion") vc.devolucion += monto;
			else vc.cobro += monto;
			resultado.set(pago.anexo_id, vc);
		}
	}
	return resultado;
}

/**
 * Suma por póliza de las cuotas que no llegaron a pagarse al anularse: cuotas
 * de la madre sin pago (estado 'anulada', o 'pendiente' en anulaciones previas
 * al sello anulada_por_anexo_id) más las cuotas propias de sus anexos de
 * inclusión activos. Las cuotas con pago (pagado/parcial) no cuentan.
 */
export async function obtenerMontoNoPagadoPolizas(
	supabase: SupabaseServer,
	polizaIds: string[],
): Promise<Map<string, number>> {
	const resultado = new Map<string, number>();
	const sumar = (polizaId: string, monto: number | null) => {
		const valor = Math.abs(Number(monto ?? 0));
		if (valor > 0) resultado.set(polizaId, (resultado.get(polizaId) ?? 0) + valor);
	};

	for (let i = 0; i < polizaIds.length; i += CHUNK) {
		const ids = polizaIds.slice(i, i + CHUNK);

		// Cuotas de la póliza madre sin pago
		const { data: cuotas, error: errCuotas } = await supabase
			.from("polizas_pagos")
			.select("poliza_id, monto, estado, fecha_pago")
			.in("poliza_id", ids)
			.in("estado", ["anulada", "pendiente"]);
		if (errCuotas) throw errCuotas;
		for (const c of (cuotas ?? []) as {
			poliza_id: string;
			monto: number | null;
			estado: string;
			fecha_pago: string | null;
		}[]) {
			if (c.estado === "pendiente" && c.fecha_pago != null) continue;
			sumar(c.poliza_id, c.monto);
		}

		// Cuotas propias de los anexos de inclusión activos de esas pólizas
		const { data: inclusiones, error: errIncl } = await supabase
			.from("polizas_anexos")
			.select("id, poliza_id")
			.in("poliza_id", ids)
			.eq("tipo_anexo", "inclusion")
			.eq("estado", "activo");
		if (errIncl) throw errIncl;
		const inclusionPoliza = new Map((inclusiones ?? []).map((a) => [a.id as string, a.poliza_id as string]));
		const inclusionIds = Array.from(inclusionPoliza.keys());
		for (let j = 0; j < inclusionIds.length; j += CHUNK) {
			const { data: cuotasIncl, error: errCuotasIncl } = await supabase
				.from("polizas_anexos_pagos")
				.select("anexo_id, monto")
				.in("anexo_id", inclusionIds.slice(j, j + CHUNK))
				.eq("tipo", "cuota_propia")
				.in("estado", ["anulada", "pendiente"]);
			if (errCuotasIncl) throw errCuotasIncl;
			for (const c of (cuotasIncl ?? []) as { anexo_id: string; monto: number | null }[]) {
				const polizaId = inclusionPoliza.get(c.anexo_id);
				if (polizaId) sumar(polizaId, c.monto);
			}
		}
	}
	return resultado;
}
