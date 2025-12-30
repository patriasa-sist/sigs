import { z } from "zod";

// ================================================
// DOCUMENT TYPES BY CLIENT TYPE
// ================================================

/**
 * Document types for Natural Person clients
 */
export const NATURAL_DOCUMENT_TYPES = {
	documento_identidad: "Documento de Identidad",
	certificacion_pep: "Certificación PEP",
	formulario_kyc: "Formulario Conoce a tu Cliente (KYC)",
} as const;

/**
 * Document types for Unipersonal clients (natural + commercial)
 */
export const UNIPERSONAL_DOCUMENT_TYPES = {
	...NATURAL_DOCUMENT_TYPES,
	nit: "NIT",
	matricula_comercio: "Matrícula de Comercio",
} as const;

/**
 * Document types for Juridic (legal entity) clients
 */
export const JURIDIC_DOCUMENT_TYPES = {
	nit: "NIT",
	matricula_comercio: "Matrícula de Comercio",
	testimonio_constitucion: "Testimonio de Constitución Social",
	balance_estado_resultados: "Balance General y Estado de Resultados",
	poder_representacion: "Poder de Representación",
	documento_identidad_representante: "Documento de Identidad del Representante Legal",
	certificacion_pep: "Certificación PEP",
	formulario_kyc: "Formulario Conoce a tu Cliente (KYC)",
} as const;

/**
 * All possible document types
 */
export const ALL_DOCUMENT_TYPES = {
	...NATURAL_DOCUMENT_TYPES,
	...UNIPERSONAL_DOCUMENT_TYPES,
	...JURIDIC_DOCUMENT_TYPES,
} as const;

/**
 * Document type keys
 */
export type TipoDocumentoCliente = keyof typeof ALL_DOCUMENT_TYPES;

/**
 * Required documents by client type
 */
export const REQUIRED_DOCUMENTS = {
	natural: ["documento_identidad", "formulario_kyc"] as const,
	unipersonal: ["documento_identidad", "formulario_kyc"] as const,
	juridica: ["formulario_kyc"] as const,
} as const;

/**
 * Get document types for a specific client type
 */
export function getDocumentTypesForClientType(clientType: "natural" | "unipersonal" | "juridica") {
	switch (clientType) {
		case "natural":
			return NATURAL_DOCUMENT_TYPES;
		case "unipersonal":
			return UNIPERSONAL_DOCUMENT_TYPES;
		case "juridica":
			return JURIDIC_DOCUMENT_TYPES;
		default:
			return NATURAL_DOCUMENT_TYPES;
	}
}

/**
 * Check if a document is required for a client type
 */
export function isDocumentRequired(
	documentType: TipoDocumentoCliente,
	clientType: "natural" | "unipersonal" | "juridica"
): boolean {
	const required = REQUIRED_DOCUMENTS[clientType];
	return required.includes(documentType as any);
}

// ================================================
// FILE UPLOAD TYPES
// ================================================

/**
 * Uploaded file with metadata (before saving to database)
 */
export type ClienteDocumentoUpload = {
	tipo_documento: TipoDocumentoCliente;
	file: File;
	descripcion?: string;
};

/**
 * Document state in form
 */
export type ClienteDocumentoFormState = {
	tipo_documento: TipoDocumentoCliente;
	nombre_archivo: string;
	tipo_archivo: string;
	tamano_bytes: number;
	file: File;
	descripcion?: string;
};

// ================================================
// DATABASE TYPES
// ================================================

/**
 * Document estado (soft delete)
 */
export const ESTADO_DOCUMENTO = {
	activo: "activo",
	descartado: "descartado",
} as const;

export type EstadoDocumento = (typeof ESTADO_DOCUMENTO)[keyof typeof ESTADO_DOCUMENTO];

/**
 * Client document from database
 */
export const clienteDocumentoSchema = z.object({
	id: z.string().uuid(),
	client_id: z.string().uuid(),
	tipo_documento: z.enum([
		"documento_identidad",
		"certificacion_pep",
		"formulario_kyc",
		"nit",
		"matricula_comercio",
		"testimonio_constitucion",
		"balance_estado_resultados",
		"poder_representacion",
		"documento_identidad_representante",
	]),
	nombre_archivo: z.string(),
	tipo_archivo: z.string(),
	tamano_bytes: z.number(),
	storage_path: z.string(),
	storage_bucket: z.string(),
	estado: z.enum(["activo", "descartado"]),
	subido_por: z.string().uuid().nullable(),
	fecha_subida: z.string(), // ISO timestamp
	descartado_por: z.string().uuid().nullable(),
	fecha_descarte: z.string().nullable(),
	descripcion: z.string().nullable(),
	created_at: z.string(),
	updated_at: z.string(),
});

export type ClienteDocumento = z.infer<typeof clienteDocumentoSchema>;

/**
 * Client document with audit information (from view)
 */
export const clienteDocumentoConAuditoriaSchema = clienteDocumentoSchema.extend({
	subido_por_email: z.string().nullable(),
	subido_por_nombre: z.string().nullable(),
	descartado_por_email: z.string().nullable(),
	descartado_por_nombre: z.string().nullable(),
});

export type ClienteDocumentoConAuditoria = z.infer<typeof clienteDocumentoConAuditoriaSchema>;

// ================================================
// VALIDATION CONSTANTS
// ================================================

/**
 * Allowed file types for client documents
 */
export const ALLOWED_FILE_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/jpg",
	"image/png",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/**
 * Allowed file extensions
 */
export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"] as const;

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Human-readable file size
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate file type
 */
export function isValidFileType(file: File): boolean {
	return ALLOWED_FILE_TYPES.includes(file.type as any);
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File): boolean {
	return file.size <= MAX_FILE_SIZE;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
	const parts = filename.split(".");
	return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : "";
}

/**
 * Validate file
 */
export type FileValidationError = {
	field: "type" | "size" | "extension";
	message: string;
};

export function validateFile(file: File): FileValidationError | null {
	// Validate type
	if (!isValidFileType(file)) {
		return {
			field: "type",
			message: "Tipo de archivo no permitido. Solo se permiten PDF, JPG, PNG, DOC, DOCX.",
		};
	}

	// Validate size
	if (!isValidFileSize(file)) {
		return {
			field: "size",
			message: `El archivo es demasiado grande. Tamaño máximo: ${formatFileSize(MAX_FILE_SIZE)}.`,
		};
	}

	// Validate extension
	const extension = getFileExtension(file.name);
	if (!ALLOWED_FILE_EXTENSIONS.includes(extension as any)) {
		return {
			field: "extension",
			message: "Extensión de archivo no permitida.",
		};
	}

	return null;
}

// ================================================
// STORAGE HELPERS
// ================================================

/**
 * Generate storage path for client document
 */
export function generateStoragePath(clientId: string, fileName: string): string {
	const timestamp = Date.now();
	const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
	return `${clientId}/${timestamp}_${sanitizedFileName}`;
}

/**
 * Get public URL for document (from storage)
 */
export function getDocumentPublicUrl(storagePath: string, supabaseUrl: string): string {
	return `${supabaseUrl}/storage/v1/object/public/clientes-documentos/${storagePath}`;
}

// ================================================
// FORM HELPER TYPES
// ================================================

/**
 * Document validation result for form
 */
export type DocumentValidationResult = {
	hasAllRequired: boolean;
	missingDocuments: TipoDocumentoCliente[];
	uploadedDocuments: TipoDocumentoCliente[];
};

/**
 * Validate uploaded documents for a client type
 */
export function validateClientDocuments(
	uploadedDocuments: ClienteDocumentoFormState[],
	clientType: "natural" | "unipersonal" | "juridica"
): DocumentValidationResult {
	const required = REQUIRED_DOCUMENTS[clientType];
	const uploadedTypes = uploadedDocuments.map((d) => d.tipo_documento);

	const missingDocuments = required.filter((docType) => !uploadedTypes.includes(docType));

	return {
		hasAllRequired: missingDocuments.length === 0,
		missingDocuments: missingDocuments as TipoDocumentoCliente[],
		uploadedDocuments: uploadedTypes,
	};
}
