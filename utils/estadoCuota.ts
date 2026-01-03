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
