/**
 * Client Form Type Definitions and Validation Schemas
 * Used for adding/editing natural and juridic clients
 */

import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const CLIENT_TYPES = ["natural", "juridico"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const DOCUMENT_TYPES = ["CI", "Pasaporte", "Otro"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const CIVIL_STATUS = [
	"Soltero/a",
	"Casado/a",
	"Divorciado/a",
	"Viudo/a",
	"Unión Libre",
] as const;
export type CivilStatus = (typeof CIVIL_STATUS)[number];

export const GENDER_OPTIONS = ["Masculino", "Femenino", "Otro"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const INCOME_LEVELS = [
	"Bajo",
	"Medio-Bajo",
	"Medio",
	"Medio-Alto",
	"Alto",
] as const;
export type IncomeLevel = (typeof INCOME_LEVELS)[number];

export const ACCOUNT_STATES = ["Activa", "Inactiva", "Suspendida"] as const;
export type AccountState = (typeof ACCOUNT_STATES)[number];

// ============================================================================
// LEGAL REPRESENTATIVE (for Juridic Clients)
// ============================================================================

export interface LegalRepresentativeData {
	id?: string; // For editing existing representatives
	nombre_completo: string;
	ci: string;
	cargo: string;
	telefono: string;
	email: string;
}

export const legalRepresentativeSchema = z.object({
	id: z.string().optional(),
	nombre_completo: z.string().min(1, "Nombre completo es requerido"),
	ci: z.string().min(1, "CI es requerido"),
	cargo: z.string().min(1, "Cargo es requerido"),
	telefono: z.string().min(1, "Teléfono es requerido"),
	email: z.string().email("Email inválido").min(1, "Email es requerido"),
});

// ============================================================================
// NATURAL CLIENT (Tier-based)
// ============================================================================

// Tier 1: Required for all natural clients (premium up to $1000)
export interface NaturalClientTier1Data {
	primer_nombre: string;
	segundo_nombre?: string;
	primer_apellido: string;
	segundo_apellido?: string;
	tipo_documento: DocumentType;
	numero_documento: string;
	nacionalidad: string;
	fecha_nacimiento: Date;
	direccion: string;
	estado_civil: CivilStatus;
	fecha_ingreso_sarlaft: Date;
	executive_id: string;
}

export const naturalClientTier1Schema = z.object({
	primer_nombre: z.string().min(1, "Primer nombre es requerido"),
	segundo_nombre: z.string().optional(),
	primer_apellido: z.string().min(1, "Primer apellido es requerido"),
	segundo_apellido: z.string().optional(),
	tipo_documento: z.enum(DOCUMENT_TYPES, {
		required_error: "Tipo de documento es requerido",
	}),
	numero_documento: z.string().min(1, "Número de documento es requerido"),
	nacionalidad: z.string().min(1, "Nacionalidad es requerida"),
	fecha_nacimiento: z.date({
		required_error: "Fecha de nacimiento es requerida",
	}),
	direccion: z.string().min(1, "Dirección es requerida"),
	estado_civil: z.enum(CIVIL_STATUS, {
		required_error: "Estado civil es requerido",
	}),
	fecha_ingreso_sarlaft: z.date({
		required_error: "Fecha de ingreso (SARLAFT) es requerida",
	}),
	executive_id: z.string().min(1, "Ejecutivo es requerido"),
});

// Tier 2: Additional fields (premium $1001-$5000)
export interface NaturalClientTier2Data {
	telefono?: string;
	actividad_economica?: string;
	lugar_trabajo?: string;
}

export const naturalClientTier2Schema = z.object({
	telefono: z.string().optional(),
	actividad_economica: z.string().optional(),
	lugar_trabajo: z.string().optional(),
});

// Tier 3: Additional fields (premium above $5000)
export interface NaturalClientTier3Data {
	email?: string;
	pais?: string;
	genero?: Gender;
	nivel_ingresos?: IncomeLevel;
	estado_cuenta?: AccountState;
	saldo_promedio?: number;
	monto_ingreso?: number;
	monto_retiro?: number;
}

export const naturalClientTier3Schema = z.object({
	email: z.string().email("Email inválido").optional().or(z.literal("")),
	pais: z.string().optional(),
	genero: z.enum(GENDER_OPTIONS).optional(),
	nivel_ingresos: z.enum(INCOME_LEVELS).optional(),
	estado_cuenta: z.enum(ACCOUNT_STATES).optional(),
	saldo_promedio: z.coerce.number().positive().optional().or(z.literal(0)),
	monto_ingreso: z.coerce.number().positive().optional().or(z.literal(0)),
	monto_retiro: z.coerce.number().positive().optional().or(z.literal(0)),
});

// Combined Natural Client Form Data
export interface NaturalClientFormData
	extends NaturalClientTier1Data,
		NaturalClientTier2Data,
		NaturalClientTier3Data {}

export const naturalClientFormSchema = naturalClientTier1Schema
	.merge(naturalClientTier2Schema)
	.merge(naturalClientTier3Schema);

// ============================================================================
// JURIDIC CLIENT (Company)
// ============================================================================

export interface JuridicClientFormData {
	razon_social: string;
	nit: string;
	direccion: string;
	telefono: string;
	email: string;
	fecha_constitucion: Date;
	actividad_economica: string;
	executive_id: string;
	legal_representatives: LegalRepresentativeData[];
}

export const juridicClientFormSchema = z.object({
	razon_social: z.string().min(1, "Razón social es requerida"),
	nit: z.string().min(1, "NIT es requerido"),
	direccion: z.string().min(1, "Dirección es requerida"),
	telefono: z.string().min(1, "Teléfono es requerido"),
	email: z.string().email("Email inválido").min(1, "Email es requerido"),
	fecha_constitucion: z.date({
		required_error: "Fecha de constitución es requerida",
	}),
	actividad_economica: z.string().min(1, "Actividad económica es requerida"),
	executive_id: z.string().min(1, "Ejecutivo es requerido"),
	legal_representatives: z
		.array(legalRepresentativeSchema)
		.min(1, "Al menos un representante legal es requerido"),
});

// ============================================================================
// FORM STATE
// ============================================================================

export interface ClientFormState {
	clientType: ClientType | null;
	naturalData?: Partial<NaturalClientFormData>;
	juridicData?: Partial<JuridicClientFormData>;
	currentStep: number; // 1-4
	completedSections: {
		tier1?: boolean;
		tier2?: boolean;
		tier3?: boolean;
		company?: boolean;
		representatives?: boolean;
	};
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface Executive {
	id: string;
	full_name: string;
	email: string;
}

export type FormMode = "create" | "edit";
