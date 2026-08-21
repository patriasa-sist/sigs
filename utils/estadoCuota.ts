/**
 * Utility functions for handling quota states
 * Provides backward compatibility during migration to estado_real generated column
 */

import type { CuotaPago, EstadoPago } from "@/types/cobranza";

/**
 * Get the real state of a quota
 * Uses estado_real (generated column) if available, otherwise calculates it
 * This provides backward compatibility during migration
 *
 * @param cuota - The quota object
 * @returns The real state of the quota
 */
export function obtenerEstadoReal(cuota: CuotaPago): EstadoPago {
	// If estado_real exists (after migration), use it
	if (cuota.estado_real) {
		return cuota.estado_real;
	}

	// Fallback: calculate manually (before migration)
	if (cuota.fecha_pago) return "pagado";
	if (cuota.estado === "parcial") return "parcial";

	const hoy = new Date().toISOString().split("T")[0];
	if (cuota.fecha_vencimiento < hoy) return "vencido";

	return "pendiente";
}

/**
 * Saldo realmente cobrable de una cuota: el monto bruto menos los descuentos de
 * exclusión activos y lo ya abonado. Es la misma regla que aplica la vista
 * `cobranzas_polizas_resumen` y el plan consolidado del detalle de póliza.
 *
 * @param cuota - The quota object
 * @param abonado - Sum of partial payments already registered on the quota
 * @returns The remaining collectible balance (never negative)
 */
export function saldoCobrable(cuota: CuotaPago, abonado = 0): number {
	return Math.max(cuota.monto - (cuota.monto_descuento || 0) - abonado, 0);
}

/**
 * Cuota saldada: ya no tiene saldo por cobrar porque el descuento de exclusión
 * más lo abonado cubren su monto. No es un pago (no entró todo ese dinero), pero
 * tampoco se cobra ni se reclama.
 *
 * @param cuota - The quota object
 * @param abonado - Sum of partial payments already registered on the quota
 * @returns True if there is nothing left to collect
 */
export function cuotaSaldada(cuota: CuotaPago, abonado = 0): boolean {
	return obtenerEstadoReal(cuota) !== "pagado" && saldoCobrable(cuota, abonado) <= 0.01;
}

/**
 * Count overdue quotas in a list
 *
 * @param cuotas - Array of quotas
 * @returns Number of overdue quotas
 */
export function contarCuotasVencidas(cuotas: CuotaPago[]): number {
	return cuotas.filter((c) => obtenerEstadoReal(c) === "vencido").length;
}

/**
 * Filter overdue quotas from a list
 *
 * @param cuotas - Array of quotas
 * @returns Array of overdue quotas
 */
export function filtrarCuotasVencidas(cuotas: CuotaPago[]): CuotaPago[] {
	return cuotas.filter((c) => obtenerEstadoReal(c) === "vencido");
}

/**
 * Check if a quota is overdue
 *
 * @param cuota - The quota to check
 * @returns True if the quota is overdue
 */
export function esCuotaVencida(cuota: CuotaPago): boolean {
	return obtenerEstadoReal(cuota) === "vencido";
}
