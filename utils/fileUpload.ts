/**
 * Utilidades compartidas para manejo de archivos en Supabase Storage.
 * Usado tanto en cliente (CargarDocumentos) como en servidor (server actions).
 */

/**
 * Sanitiza un nombre de archivo para compatibilidad con Supabase Storage.
 * - Reemplaza espacios por guiones bajos
 * - Elimina o reemplaza caracteres especiales
 * - Normaliza caracteres acentuados
 */
export function sanitizarNombreArchivo(nombreArchivo: string): string {
	return (
		nombreArchivo
			// Normalizar caracteres acentuados (á -> a, ñ -> n, etc.)
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			// Reemplazar espacios por guiones bajos
			.replace(/\s+/g, "_")
			// Eliminar caracteres especiales excepto: letras, números, puntos, guiones y guiones bajos
			.replace(/[^a-zA-Z0-9._-]/g, "")
			// Reemplazar múltiples guiones bajos consecutivos por uno solo
			.replace(/_+/g, "_")
			// Convertir a minúsculas para consistencia
			.toLowerCase()
	);
}

/**
 * Genera una ruta temporal en Storage para un archivo antes de conocer el poliza_id.
 * Formato: temp/{userId}/{sessionId}/{timestamp}-{nombre_sanitizado}
 */
export function generateTempStoragePath(
	userId: string,
	sessionId: string,
	fileName: string
): string {
	const sanitized = sanitizarNombreArchivo(fileName);
	const timestamp = Date.now();
	return `temp/${userId}/${sessionId}/${timestamp}-${sanitized}`;
}

/**
 * Genera la ruta final en Storage una vez se conoce el poliza_id.
 * Formato: {polizaId}/{timestamp}-{nombre_sanitizado}
 */
export function generateFinalStoragePath(
	polizaId: string,
	fileName: string
): string {
	const sanitized = sanitizarNombreArchivo(fileName);
	const timestamp = Date.now();
	return `${polizaId}/${timestamp}-${sanitized}`;
}
