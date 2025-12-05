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
 */
export function formatDate(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("es-BO");
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: string | Date): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleString("es-BO");
}
