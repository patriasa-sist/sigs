// Parche temporal (criterio de contabilidad, jul-2026): una anulación CON
// vigencia corrida de COBRO no pierde toda la producción de la póliza — la
// prima del período corrido ya se ganó. Mientras se confirma el tratamiento
// definitivo ante la APS:
//   - Reporte de producción: la fila de la anulación registra la VC en
//     NEGATIVO (prima total = -VC, con neta y comisión derivadas de los
//     factores congelados de la póliza).
//   - APS Egreso: declara esos mismos montos (en positivo, convención del
//     egreso) en lugar de revertir la póliza completa.
// Anulaciones SIN vigencia corrida o con VC de DEVOLUCIÓN mantienen la
// reversión completa de la póliza y no aportan monto propio en producción.

export type FinancierosPolizaVC = {
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
 * derivadas del monto de vigencia corrida, usando los factores congelados de
 * la póliza madre; si faltan (registros previos a la persistencia), se derivan
 * de las primas guardadas.
 */
export function computarPrimaVigenciaCorrida(
	montoVC: number,
	poliza: FinancierosPolizaVC,
): { prima_total: number; prima_neta: number; comision: number } {
	const monto = Math.abs(Number(montoVC));

	const factor = num(poliza.factor_prima_neta);
	const polTotal = num(poliza.prima_total);
	const polNeta = num(poliza.prima_neta);
	const ratioNeta =
		factor != null && factor > -100
			? 1 / (1 + factor / 100)
			: polTotal != null && polTotal !== 0 && polNeta != null
				? polNeta / polTotal
				: 1;
	const primaNeta = round2(monto * ratioNeta);

	const comisionPoliza = num(poliza.comision_empresa) ?? num(poliza.comision);
	const fraccion =
		num(poliza.porcentaje_comision) ??
		(polNeta != null && polNeta !== 0 && comisionPoliza != null ? comisionPoliza / polNeta : 0);
	const comision = round2(primaNeta * fraccion);

	return { prima_total: monto, prima_neta: primaNeta, comision };
}
