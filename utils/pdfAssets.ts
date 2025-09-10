// utils/pdfAssets.ts
/**
 * Este archivo contiene las rutas a los recursos de imágenes
 * para ser utilizados en los PDFs.
 */

// Rutas relativas a la carpeta public
export const PDF_ASSETS = {
	// Logo de Patria S.A.
	PATRIA_LOGO: "/patria-horizontal.png",

	// Firmas
	SIGNATURE_CARMEN: "/images/firma_carmen.png",
	SIGNATURE_ELIANA: "/images/firma_eliana.png",
	SIGNATURE_ERCILIA: "/images/firma_ercilia.png",
	SIGNATURE_MARCO: "/images/firma_marco.png",
	SIGNATURE_FLAVIO: "/images/firma_flavio.png",
	SIGNATURE_PATRICIA: "/images/firma_patricia.png",
	SIGNATURE_TAMARA: "/images/firma_tamara.png",
};

// Función auxiliar para obtener la ruta completa de un asset
export function getAssetPath(assetName: keyof typeof PDF_ASSETS): string {
	return process.env.PUBLIC_URL + PDF_ASSETS[assetName];
}
