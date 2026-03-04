import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Storage bucket names used across the application
 */
export const STORAGE_BUCKETS = {
	POLIZAS: "polizas-documentos",
	CLIENTES: "clientes-documentos",
	SINIESTROS: "siniestros-documentos",
	COMPROBANTES: "pagos-comprobantes",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Default signed URL expiration: 1 hour */
const DEFAULT_EXPIRES_IN = 3600;

/**
 * Extract the relative storage path from a value that may be a full public URL or already a relative path.
 *
 * Handles both formats:
 * - Full URL: "https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/file.pdf"
 * - Relative:  "path/file.pdf"
 */
export function extractStoragePath(archivoUrl: string, bucket: StorageBucket): string {
	if (!archivoUrl) return "";

	// Already a relative path
	if (!archivoUrl.startsWith("http")) return archivoUrl;

	// Extract from full public URL
	const marker = `/storage/v1/object/public/${bucket}/`;
	const idx = archivoUrl.indexOf(marker);
	if (idx !== -1) {
		return archivoUrl.slice(idx + marker.length);
	}

	// Fallback: try splitting by bucket name
	const parts = archivoUrl.split(`/${bucket}/`);
	return parts.length > 1 ? parts[parts.length - 1] : archivoUrl;
}

/**
 * Generate a signed URL for a storage object.
 * Works with both server-side and client-side Supabase clients.
 *
 * @param supabase - Supabase client instance
 * @param bucket - Storage bucket name
 * @param storagePath - Relative path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or empty string on error
 */
export async function getSignedUrl(
	supabase: SupabaseClient,
	bucket: StorageBucket,
	storagePath: string,
	expiresIn: number = DEFAULT_EXPIRES_IN,
): Promise<string> {
	if (!storagePath) return "";

	// Ensure we have a clean relative path
	const cleanPath = extractStoragePath(storagePath, bucket);
	if (!cleanPath) return "";

	const { data, error } = await supabase.storage
		.from(bucket)
		.createSignedUrl(cleanPath, expiresIn);

	if (error) {
		console.error(`[storage] Error creating signed URL for ${bucket}/${cleanPath}:`, error);
		return "";
	}

	return data.signedUrl;
}

/**
 * Generate signed URLs for multiple storage objects in a single call.
 *
 * @param supabase - Supabase client instance
 * @param bucket - Storage bucket name
 * @param storagePaths - Array of relative paths within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Map of storagePath → signedUrl
 */
export async function getSignedUrls(
	supabase: SupabaseClient,
	bucket: StorageBucket,
	storagePaths: string[],
	expiresIn: number = DEFAULT_EXPIRES_IN,
): Promise<Map<string, string>> {
	const result = new Map<string, string>();
	if (storagePaths.length === 0) return result;

	const cleanPaths = storagePaths.map((p) => extractStoragePath(p, bucket));

	const { data, error } = await supabase.storage
		.from(bucket)
		.createSignedUrls(cleanPaths, expiresIn);

	if (error) {
		console.error(`[storage] Error creating signed URLs for ${bucket}:`, error);
		return result;
	}

	if (data) {
		data.forEach((item, index) => {
			if (item.signedUrl) {
				result.set(storagePaths[index], item.signedUrl);
			}
		});
	}

	return result;
}
