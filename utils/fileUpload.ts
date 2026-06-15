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
export function generateTempStoragePath(userId: string, sessionId: string, fileName: string): string {
	const sanitized = sanitizarNombreArchivo(fileName);
	const timestamp = Date.now();
	return `temp/${userId}/${sessionId}/${timestamp}-${sanitized}`;
}

/**
 * Genera la ruta final en Storage una vez se conoce el poliza_id.
 * Formato: {polizaId}/{timestamp}-{nombre_sanitizado}
 */
export function generateFinalStoragePath(polizaId: string, fileName: string): string {
	const sanitized = sanitizarNombreArchivo(fileName);
	const timestamp = Date.now();
	return `${polizaId}/${timestamp}-${sanitized}`;
}

/**
 * Infiere el content-type de un archivo a partir de su extensión cuando el navegador
 * no lo detecta (file.type vacío en escaneos, archivos de correo o equipos con la
 * asociación de archivos rota).
 *
 * Necesario porque supabase-js, al subir un File/Blob, toma el content-type del propio
 * Blob e IGNORA la opción `contentType`; un MIME vacío sube como `application/octet-stream`
 * y un bucket con `allowed_mime_types` lo rechaza (incluso un PDF válido). En el sitio de
 * subida, re-envolver con `new File([file], file.name, { type: inferirContentType(file) })`.
 */
export function inferirContentType(file: File): string {
	if (file.type) return file.type;
	const ext = file.name.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "pdf":
			return "application/pdf";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		default:
			return "application/octet-stream";
	}
}
