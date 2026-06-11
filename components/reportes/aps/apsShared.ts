import type { APSRegistro } from "@/app/reportes/actions-aps";

export type ModoAPS = "ingreso" | "egreso" | "general";

export const MODO_LABELS: Record<ModoAPS, string> = {
	ingreso: "INGRESO",
	egreso: "EGRESO",
	general: "GENERAL",
};

function keyRegistro(r: APSRegistro): string {
	return `${r.compania_codigo}|${r.compania_nombre}|${r.codigo_aps}|${r.riesgo}`;
}

/**
 * General = Ingreso − Egreso, registro a registro.
 * Un riesgo que solo tiene egreso aparece con montos negativos.
 */
export function calcularGeneral(ingreso: APSRegistro[], egreso: APSRegistro[]): APSRegistro[] {
	const resultado = new Map<string, APSRegistro>();
	for (const r of ingreso) {
		resultado.set(keyRegistro(r), { ...r });
	}
	for (const r of egreso) {
		const key = keyRegistro(r);
		const existente = resultado.get(key);
		if (existente) {
			existente.prima_total -= r.prima_total;
			existente.prima_neta -= r.prima_neta;
			existente.comision -= r.comision;
		} else {
			resultado.set(key, {
				...r,
				prima_total: -r.prima_total,
				prima_neta: -r.prima_neta,
				comision: -r.comision,
			});
		}
	}
	return Array.from(resultado.values());
}

/** Orden estable para todos los reportes: grupo → código APS → riesgo */
export function ordenarRegistros(registros: APSRegistro[]): APSRegistro[] {
	return [...registros].sort(
		(a, b) =>
			a.grupo_codigo.localeCompare(b.grupo_codigo) ||
			a.codigo_aps.localeCompare(b.codigo_aps) ||
			a.riesgo.localeCompare(b.riesgo),
	);
}

export type CompaniaAPS = { codigo: number | null; nombre: string };

/** Compañías presentes en el dataset, ordenadas alfabéticamente */
export function companiasDe(registros: APSRegistro[]): CompaniaAPS[] {
	const vistas = new Map<string, CompaniaAPS>();
	for (const r of registros) {
		if (!vistas.has(r.compania_nombre)) {
			vistas.set(r.compania_nombre, { codigo: r.compania_codigo, nombre: r.compania_nombre });
		}
	}
	return Array.from(vistas.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** 1234567.891 → "1,234,567.89" */
export function formatMonto(n: number): string {
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "2026-01-31" → "31/01/2026" (sin pasar por Date para evitar desfases de zona) */
export function formatFechaCorta(iso: string): string {
	const [y, m, d] = iso.split("-");
	return d && m && y ? `${d}/${m}/${y}` : iso;
}
