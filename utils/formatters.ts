/**
 * Formatea un número como moneda
 */
export function formatCurrency(amount: number, currency: string = "Bs"): string {
	const formatted = new Intl.NumberFormat("es-BO", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);

	return `${formatted} ${currency}`;
}

/**
 * Formatea una fecha
 * Maneja correctamente fechas en formato YYYY-MM-DD para evitar problemas de timezone
 */
export function formatDate(date: string | Date | null | undefined): string {
	if (date == null) return "-";
	if (typeof date === "string") {
		// Si es formato YYYY-MM-DD, parsear manualmente para evitar problemas de timezone
		const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (match) {
			const [, year, month, day] = match;
			const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
			return d.toLocaleDateString("es-BO");
		}
		// Fallback para otros formatos
		return new Date(date).toLocaleDateString("es-BO");
	}
	return date.toLocaleDateString("es-BO");
}

/**
 * Formatea una fecha con hora
 * Maneja correctamente fechas en formato YYYY-MM-DD para evitar problemas de timezone
 */
export function formatDateTime(date: string | Date | null | undefined): string {
	if (date == null) return "-";
	if (typeof date === "string") {
		// Si es solo fecha (YYYY-MM-DD), parsear manualmente
		const matchDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (matchDate) {
			const [, year, month, day] = matchDate;
			const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
			return d.toLocaleString("es-BO");
		}
		// Para fechas con hora, usar el constructor normal
		return new Date(date).toLocaleString("es-BO");
	}
	return date.toLocaleString("es-BO");
}

/**
 * Zona horaria de Bolivia (La Paz, UTC-4, sin horario de verano).
 */
export const LA_PAZ_TZ = "America/La_Paz";

/**
 * Fecha de hoy en zona horaria de La Paz (UTC-4), en formato YYYY-MM-DD.
 *
 * Úsese para valores `max`/`min`/defaults de inputs `date` y para comparaciones
 * de "fecha futura", en lugar de `new Date().toISOString().split("T")[0]`, que
 * usa UTC y puede adelantarse un día durante la noche en Bolivia.
 */
export function hoyLaPaz(): string {
	// "en-CA" produce el formato YYYY-MM-DD
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: LA_PAZ_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

/**
 * Formatea un timestamp (timestamptz / ISO con hora, p.ej. created_at,
 * updated_at, fecha_cierre) mostrando solo la fecha en zona horaria de La Paz.
 *
 * Para columnas `date` (YYYY-MM-DD) usar `formatDate`, NO esta función.
 */
export function formatFechaLaPaz(date: string | Date | null | undefined): string {
	if (date == null) return "-";
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleDateString("es-BO", { timeZone: LA_PAZ_TZ });
}

/**
 * Formatea un timestamp mostrando fecha y hora en zona horaria de La Paz (UTC-4).
 */
export function formatFechaHoraLaPaz(date: string | Date | null | undefined): string {
	if (date == null) return "-";
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleString("es-BO", { timeZone: LA_PAZ_TZ });
}

/**
 * Devuelve un `Date` en medianoche local que representa el día calendario
 * correcto en La Paz, apto para celdas de Excel con formato `dd/mm/yyyy`.
 *
 * - Columnas `date` (YYYY-MM-DD): respeta el día tal cual, sin desfase.
 * - Columnas `timestamptz`: toma el día calendario visto en zona La Paz.
 *
 * Devuelve `null` si la fecha es nula o inválida (celda vacía).
 */
export function toExcelDateLaPaz(date: string | Date | null | undefined): Date | null {
	if (date == null) return null;
	if (typeof date === "string") {
		const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (m) {
			return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
		}
	}
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return null;
	const ymd = new Intl.DateTimeFormat("en-CA", {
		timeZone: LA_PAZ_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(d);
	const [y, mo, da] = ymd.split("-");
	return new Date(parseInt(y), parseInt(mo) - 1, parseInt(da));
}

/**
 * Formatea solo la hora (HH:mm) de un timestamp en zona horaria de La Paz (UTC-4).
 */
export function formatHoraLaPaz(date: string | Date | null | undefined): string {
	if (date == null) return "-";
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleTimeString("es-BO", {
		timeZone: LA_PAZ_TZ,
		hour: "2-digit",
		minute: "2-digit",
	});
}
