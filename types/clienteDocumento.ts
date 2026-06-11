import { z } from "zod";

// ================================================
// DOCUMENT TYPES BY CLIENT TYPE
// ================================================

/**
 * Document types for Natural Person clients
 */
export const NATURAL_DOCUMENT_TYPES = {
	documento_identidad: "CI (completo o anverso)",
	documento_identidad_reverso: "CI Reverso",
	certificacion_pep: "Certificación PEP",
	carta_nombramiento: "carta de nombramiento",
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
	documento_identidad_representante: "CI Representante Legal (completo)",
	ci_representante_anverso: "CI Anverso Representante Legal",
	ci_representante_reverso: "CI Reverso Representante Legal",
	certificacion_pep: "Certificación PEP",
	carta_nombramiento: "carta de nombramiento",
	formulario_kyc: "Formulario Conoce a tu Cliente (KYC)",
} as const;

/**
 * Document types for ONG clients
 */
export const ONG_DOCUMENT_TYPES = {
	acreditacion_resolucion: "Acreditación/Resolución en Bolivia",
	poder_representante_mae: "Poder Representante Legal / Designación MAE",
	ci_representante_mae: "CI Representante Legal o MAE",
	formulario_registro_ong: "Formulario de Registro de Clientes",
	nit_ong: "NIT o Equivalente",
	registro_vipfe: "Número de Registro VIPFE",
} as const;

/**
 * Document types for Club deportivo clients
 */
export const CLUB_DOCUMENT_TYPES = {
	nit_club: "NIT (si corresponde)",
	registro_existencia_legal: "Registro de Existencia Legal (Municipio/Gobernación/VMI)",
	estatutos_o_reglamento: "Estatutos o Reglamento Interno",
	ci_representante_club: "CI del Representante Legal",
	poder_representante_club: "Poder del Representante Legal",
	registro_vipfe_club: "Número de Registro VIPFE (si corresponde)",
	estados_financieros_club: "Estados Financieros (prima > $US 10.000)",
	formulario_d_club: "Formulario D — Solicitud de Datos Persona Jurídica",
} as const;

/**
 * Document types for Asociación Civil clients (sin fines de lucro)
 */
export const ASOCIACION_CIVIL_DOCUMENT_TYPES = {
	testimonio_constitucion_asociacion: "Escritura o Testimonio de Constitución",
	resolucion_personeria_juridica: "Resolución Administrativa de Reconocimiento de Personería Jurídica",
	nit_asociacion: "NIT (cuando corresponda)",
	estatutos_asociacion: "Estatutos (opcional)",
	poder_representante_asociacion: "Poder o Documento que Acredita la Administración",
	ci_representante_asociacion: "CI del Representante Legal (vigente)",
	estados_financieros_asociacion: "Balance General y Estados de Resultado (prima ≥ $US 10.000)",
} as const;

/**
 * All possible document types
 */
export const ALL_DOCUMENT_TYPES = {
	...NATURAL_DOCUMENT_TYPES,
	...UNIPERSONAL_DOCUMENT_TYPES,
	...JURIDIC_DOCUMENT_TYPES,
	...ONG_DOCUMENT_TYPES,
	...CLUB_DOCUMENT_TYPES,
	...ASOCIACION_CIVIL_DOCUMENT_TYPES,
} as const;

/**
 * Document type keys
 */
export type TipoDocumentoCliente = keyof typeof ALL_DOCUMENT_TYPES;

/**
 * Required documents by client type
 */
/**
 * Required documents by client type.
 * ALL documents are now mandatory by default.
 * UIF can grant single-use exceptions for specific documents (except NON_EXCEPTABLE_DOCUMENTS).
 */
export const REQUIRED_DOCUMENTS = {
	natural: ["documento_identidad", "certificacion_pep", "carta_nombramiento", "formulario_kyc"] as const,
	unipersonal: [
		"documento_identidad",
		"certificacion_pep",
		"carta_nombramiento",
		"formulario_kyc",
		"nit",
		"matricula_comercio",
	] as const,
	juridica: [
		"nit",
		"matricula_comercio",
		"testimonio_constitucion",
		"balance_estado_resultados",
		"poder_representacion",
		"documento_identidad_representante",
		"ci_representante_anverso",
		"certificacion_pep",
		"carta_nombramiento",
		"formulario_kyc",
	] as const,
	ong: [
		"acreditacion_resolucion",
		"poder_representante_mae",
		"ci_representante_mae",
		"formulario_registro_ong",
	] as const,
	club: [
		"registro_existencia_legal",
		"estatutos_o_reglamento",
		"ci_representante_club",
		"poder_representante_club",
		"formulario_d_club",
	] as const,
	asociacion_civil: [
		"testimonio_constitucion_asociacion",
		"resolucion_personeria_juridica",
		"poder_representante_asociacion",
		"ci_representante_asociacion",
	] as const,
} as const;

/**
 * Documents that can NEVER be excepted, even by UIF.
 * These are always mandatory regardless of any exception.
 */
export const NON_EXCEPTABLE_DOCUMENTS: readonly TipoDocumentoCliente[] = [] as const;

/**
 * Get document types for a specific client type
 */
export function getDocumentTypesForClientType(
	clientType: "natural" | "unipersonal" | "juridica" | "ong" | "club" | "asociacion_civil",
) {
	switch (clientType) {
		case "natural":
			return NATURAL_DOCUMENT_TYPES;
		case "unipersonal":
			return UNIPERSONAL_DOCUMENT_TYPES;
		case "juridica":
			return JURIDIC_DOCUMENT_TYPES;
		case "ong":
			return ONG_DOCUMENT_TYPES;
		case "club":
			return CLUB_DOCUMENT_TYPES;
		case "asociacion_civil":
			return ASOCIACION_CIVIL_DOCUMENT_TYPES;
		default:
			return NATURAL_DOCUMENT_TYPES;
	}
}

/**
 * Check if a document is required for a client type
 */
export function isDocumentRequired(
	documentType: TipoDocumentoCliente,
	clientType: "natural" | "unipersonal" | "juridica" | "ong" | "club" | "asociacion_civil",
): boolean {
	const required = REQUIRED_DOCUMENTS[clientType] as readonly string[];
	return required.includes(documentType);
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
 * Document estado (soft delete + versioning)
 */
export const ESTADO_DOCUMENTO = {
	activo: "activo",
	descartado: "descartado",
	reemplazado: "reemplazado",
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
		"documento_identidad_reverso",
		"certificacion_pep",
		"formulario_kyc",
		"nit",
		"matricula_comercio",
		"testimonio_constitucion",
		"balance_estado_resultados",
		"poder_representacion",
		"documento_identidad_representante",
		"ci_representante_anverso",
		"ci_representante_reverso",
		"carta_nombramiento",
		"acreditacion_resolucion",
		"poder_representante_mae",
		"ci_representante_mae",
		"formulario_registro_ong",
		"nit_ong",
		"registro_vipfe",
		"nit_club",
		"registro_existencia_legal",
		"estatutos_o_reglamento",
		"ci_representante_club",
		"poder_representante_club",
		"registro_vipfe_club",
		"estados_financieros_club",
		"formulario_d_club",
		"testimonio_constitucion_asociacion",
		"resolucion_personeria_juridica",
		"nit_asociacion",
		"estatutos_asociacion",
		"poder_representante_asociacion",
		"ci_representante_asociacion",
		"estados_financieros_asociacion",
	]),
	nombre_archivo: z.string(),
	tipo_archivo: z.string(),
	tamano_bytes: z.number(),
	storage_path: z.string(),
	storage_bucket: z.string(),
	estado: z.enum(["activo", "descartado", "reemplazado"]),
	subido_por: z.string().uuid().nullable(),
	fecha_subida: z.string(), // ISO timestamp
	descartado_por: z.string().uuid().nullable(),
	fecha_descarte: z.string().nullable(),
	descripcion: z.string().nullable(),
	// Versioning fields
	version: z.number().default(1),
	replaced_by: z.string().uuid().nullable(),
	replaced_at: z.string().nullable(),
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
	return (ALLOWED_FILE_TYPES as readonly string[]).includes(file.type);
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
	if (!(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
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
 * Validate uploaded documents for a client type.
 * Accepts optional exceptions array: documents the user is allowed to skip (granted by UIF).
 * NON_EXCEPTABLE_DOCUMENTS are always required regardless of exceptions.
 */
export function validateClientDocuments(
	uploadedDocuments: ClienteDocumentoFormState[],
	clientType: "natural" | "unipersonal" | "juridica" | "ong" | "club" | "asociacion_civil",
	exceptions: TipoDocumentoCliente[] = [],
): DocumentValidationResult {
	const allRequired = REQUIRED_DOCUMENTS[clientType];
	const uploadedTypes = uploadedDocuments.map((d) => d.tipo_documento);

	// Effective required = all required MINUS exceptions (but NON_EXCEPTABLE always stay required)
	const effectiveRequired = allRequired.filter(
		(docType) =>
			NON_EXCEPTABLE_DOCUMENTS.includes(docType as TipoDocumentoCliente) ||
			!exceptions.includes(docType as TipoDocumentoCliente),
	);

	const missingDocuments = effectiveRequired.filter((docType) => !uploadedTypes.includes(docType));

	return {
		hasAllRequired: missingDocuments.length === 0,
		missingDocuments: missingDocuments as TipoDocumentoCliente[],
		uploadedDocuments: uploadedTypes,
	};
}

/**
 * Check if a document type can be excepted by UIF
 */
export function isDocumentExceptable(documentType: TipoDocumentoCliente): boolean {
	return !NON_EXCEPTABLE_DOCUMENTS.includes(documentType);
}

/**
 * Get exceptable document types for a client type (excludes NON_EXCEPTABLE)
 */
export function getExceptableDocuments(
	clientType: "natural" | "unipersonal" | "juridica" | "ong" | "club" | "asociacion_civil",
): TipoDocumentoCliente[] {
	const allDocs = Object.keys(getDocumentTypesForClientType(clientType)) as TipoDocumentoCliente[];
	return allDocs.filter((doc) => isDocumentExceptable(doc));
}

// ================================================
// DOCUMENT EXCEPTION TYPES
// ================================================

/**
 * Estado de una excepción de documento
 */
export type EstadoExcepcion = "activa" | "usada" | "revocada";

/**
 * Excepción de documento otorgada por UIF.
 * Uso único: se consume al crear el siguiente cliente.
 */
export type ExcepcionDocumento = {
	id: string;
	user_id: string;
	tipo_documento: TipoDocumentoCliente;
	motivo: string;
	estado: EstadoExcepcion;
	otorgado_por: string;
	fecha_otorgamiento: string;
	usado_en_client_id: string | null;
	fecha_uso: string | null;
	revocado_por: string | null;
	fecha_revocacion: string | null;
};

/**
 * Excepción con datos enriquecidos de usuarios (para la UI de auditoría)
 */
export type ExcepcionDocumentoVista = ExcepcionDocumento & {
	user_email: string;
	user_role: string;
	otorgado_por_email: string;
	revocado_por_email: string | null;
};
