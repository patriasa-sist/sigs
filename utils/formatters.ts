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
export function formatDate(date: string | Date): string {
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
export function formatDateTime(date: string | Date): string {
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
