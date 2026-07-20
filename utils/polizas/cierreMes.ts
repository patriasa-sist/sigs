import { hoyLaPaz } from "@/utils/formatters";

/**
 * Cierre de mes para edición de pólizas (acordado con Contabilidad 2026-07).
 * El mes de registro (created_at, zona America/La_Paz) define el período
 * contable de la póliza: mientras el mes está en curso, la edición sigue las
 * reglas normales (líder, permisos por póliza); desde el mes siguiente la
 * póliza ACTIVA queda cerrada y solo un administrador puede modificarla u
 * otorgar permisos de edición. Los anexos no se bloquean: fluyen en cualquier
 * mes.
 */

/** true si el mes calendario (La Paz) del timestamp ya pasó respecto de hoy. */
export function esMesRegistroCerrado(createdAt: string | Date): boolean {
	const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
	if (Number.isNaN(d.getTime())) return false;
	// "en-CA" produce YYYY-MM-DD; comparar por prefijo YYYY-MM
	const mesRegistro = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/La_Paz",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.format(d)
		.slice(0, 7);
	return mesRegistro < hoyLaPaz().slice(0, 7);
}

export const MENSAJE_MES_CERRADO =
	"Mes cerrado: las pólizas activas de meses anteriores solo puede modificarlas un administrador";
