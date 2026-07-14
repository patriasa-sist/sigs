/**
 * Normaliza la columna jsonb `items` de los bienes de anexos (Incendio / Riesgos Varios).
 *
 * Filas antiguas se insertaron con JSON.stringify() sobre la columna jsonb, por lo que
 * PostgREST devuelve un string JSON en lugar de un array (crasheaba el detalle de póliza).
 */
export function parseItemsJson<T>(raw: unknown): T[] {
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed as T[]) : [];
		} catch {
			return [];
		}
	}
	return Array.isArray(raw) ? (raw as T[]) : [];
}
