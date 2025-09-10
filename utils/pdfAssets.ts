// utils/pdfAssets.ts
/**
 * Este archivo contiene las rutas a los recursos de imágenes
 * para ser utilizados en los PDFs.
 */

// Rutas relativas a la carpeta public
export const PDF_ASSETS = {
	// Logo de Patria S.A.
	PATRIA_LOGO: "/images/logo-patria.png",

	// Firmas
	SIGNATURE_CARMEN: "/images/firma-carmen-howard.png",
	SIGNATURE_MARIA: "/images/firma-maria-vargas.png",
};

// Función auxiliar para obtener la ruta completa de un asset
export function getAssetPath(assetName: keyof typeof PDF_ASSETS): string {
	return process.env.PUBLIC_URL + PDF_ASSETS[assetName];
}
