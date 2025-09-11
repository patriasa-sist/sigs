// Tipos principales para el sistema de seguros de Patria S.A.

export interface InsuranceRecord {
	id?: string;
	nro?: number;
	inicioDeVigencia?: Date | string;
	finDeVigencia: Date | string;
	compania: string;
	ramo: string;
	noPoliza: string;
	telefono?: string;
	correoODireccion?: string;
	asegurado: string;
	cartera?: string;
	materiaAsegurada?: string;
	valorAsegurado: number;
	prima: number;
	ejecutivo: string;
	responsable?: string;
	cartaAvisoVto?: string;
	seguimiento?: string;
	cartaDeNoRenov?: string;
	renueva?: string;
	pendiente?: string;
	noRenueva?: string;
	avance?: number;
	cantidad?: number;
	observaciones?: string;
	tipoMoneda?: string; // Nueva columna para tipo de moneda desde Excel
}

export interface ProcessedInsuranceRecord extends Omit<InsuranceRecord, "finDeVigencia" | "inicioDeVigencia"> {
	inicioDeVigencia?: Date;
	finDeVigencia: Date;
	daysUntilExpiry: number;
	status: InsuranceStatus;
	selected?: boolean;
}

export type InsuranceStatus =
	| "pending" // 30+ días hasta vencimiento
	| "due_soon" // 6-30 días hasta vencimiento
	| "critical" // 5 días o menos hasta vencimiento
	| "expired" // Ya venció
	| "sent"; // Carta ya enviada

export interface ExcelUploadResult {
	success: boolean;
	data?: ProcessedInsuranceRecord[];
	errors?: string[];
	warnings?: string[];
	totalRecords?: number;
	validRecords?: number;
}

export interface FilterOptions {
	ejecutivo?: string;
	compania?: string;
	ramo?: string;
	status?: InsuranceStatus[];
	dateRange?: {
		from: Date;
		to: Date;
	};
	searchTerm?: string;
}

export interface SortOptions {
	field: keyof ProcessedInsuranceRecord;
	direction: "asc" | "desc";
}

export interface DashboardStats {
	total: number;
	pending: number;
	dueSoon: number;
	critical: number;
	expired: number;
	sent: number;
	totalValue: number;
	averagePremium: number;
}

export interface EmailTemplate {
	type: "health" | "general";
	subject: string;
	htmlContent: string;
	attachmentName: string;
}

export interface EmailSendResult {
	success: boolean;
	messageId?: string;
	error?: string;
	recipient: string;
	policyNumber: string;
}

export interface BulkEmailResult {
	total: number;
	successful: number;
	failed: number;
	results: EmailSendResult[];
	errors: string[];
}

export interface LetterGenerationOptions {
	records: ProcessedInsuranceRecord[];
	includeLogos: boolean;
	generatePdf: boolean;
	emailDelivery: boolean;
	downloadAsZip: boolean;
}

export interface User {
	id: string;
	email: string;
	name: string;
	role: "admin" | "ejecutivo";
	permissions: {
		canViewAll: boolean;
		canSendEmails: boolean;
		canDownloadReports: boolean;
		canManageUsers?: boolean;
		assignedCompanies?: string[];
	};
	createdAt: Date;
	lastLogin?: Date;
}

export interface AuditLog {
	id: string;
	userId: string;
	action: "upload" | "email_sent" | "bulk_email" | "download" | "login" | "export";
	details: {
		recordsAffected?: number;
		recipient?: string;
		fileName?: string;
		filters?: FilterOptions;
	};
	timestamp: Date;
}

export interface Company {
	id: string;
	name: string;
	code: string;
	active: boolean;
	contactInfo?: {
		email?: string;
		phone?: string;
		website?: string;
	};
}

export interface Executive {
	id: string;
	name: string;
	email: string;
	active: boolean;
	assignedCompanies?: string[];
}

// Utilidades para validación de datos
export interface ValidationRule {
	field: keyof InsuranceRecord;
	required: boolean;
	type: "string" | "number" | "date" | "email";
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
}

export const VALIDATION_RULES: ValidationRule[] = [
	{ field: "finDeVigencia", required: true, type: "date" },
	{ field: "compania", required: true, type: "string", minLength: 2 },
	{ field: "ramo", required: true, type: "string", minLength: 2 },
	{ field: "noPoliza", required: true, type: "string", minLength: 3 },
	{ field: "asegurado", required: true, type: "string", minLength: 3 },
	{ field: "valorAsegurado", required: true, type: "number" },
	{ field: "prima", required: true, type: "number" },
	{ field: "ejecutivo", required: true, type: "string", minLength: 2 },
];

// Constantes del sistema
export const SYSTEM_CONSTANTS = {
	DAYS_BEFORE_EXPIRY_TO_SEND: 30,
	CRITICAL_DAYS_THRESHOLD: 5,
	DUE_SOON_DAYS_THRESHOLD: 6,
	MAX_UPLOAD_SIZE: 30 * 1024 * 1024, // 30MB
	SUPPORTED_FILE_TYPES: [".xlsx", ".xls"],
	DEFAULT_PAGE_SIZE: 50,
	MAX_BULK_EMAIL_SIZE: 100,
} as const;

// Tipos para exportación de reportes
export interface ReportOptions {
	format: "csv" | "xlsx" | "pdf";
	includeFilters: boolean;
	dateRange?: {
		from: Date;
		to: Date;
	};
	fields: (keyof ProcessedInsuranceRecord)[];
}

export interface ReportData {
	title: string;
	generatedAt: Date;
	generatedBy: string;
	filters: FilterOptions;
	records: ProcessedInsuranceRecord[];
	stats: DashboardStats;
}
