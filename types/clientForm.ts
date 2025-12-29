/**
 * Client Form Type Definitions and Validation Schemas
 * Updated: 2025-11-14 (Restructured)
 * Used for adding/editing natural, unipersonal, and juridic clients
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const CLIENT_TYPES = ['natural', 'juridica', 'unipersonal'] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const DOCUMENT_TYPES = ['ci', 'pasaporte', 'cex'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const CIVIL_STATUS = ['casado', 'soltero', 'divorciado', 'viudo'] as const;
export type CivilStatus = (typeof CIVIL_STATUS)[number];

export const GENDER_OPTIONS = ['masculino', 'femenino', 'otro'] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const INCOME_LEVELS = ['bajo', 'medio', 'alto'] as const;
export type IncomeLevel = (typeof INCOME_LEVELS)[number];

// Income level numeric values
export const INCOME_VALUES: Record<IncomeLevel, number> = {
  bajo: 2000,
  medio: 5000,
  alto: 10000,
};

export const COMPANY_TYPES = [
  'SRL',
  'SCO',
  'SCS',
  'SA',
  'SCA',
  'AAP',
  'SEM',
  'LIM',
  'EPB',
  'UNI',
  'MIC',
  'FUN',
  'SCI',
  'IED',
  'ORR',
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const CI_EXTENSIONS = ['LP', 'CB', 'SC', 'OR', 'PT', 'TJ', 'CH', 'BE', 'PD'] as const;
export type CIExtension = (typeof CI_EXTENSIONS)[number];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const phoneValidation = z
  .string()
  .min(5, 'Debe tener al menos 5 dígitos')
  .regex(/^[0-9]+$/, 'Solo números permitidos');

const emailValidation = z.string().email('Email inválido').min(1, 'Email es requerido');

const documentValidation = z.string().min(6, 'Debe tener al menos 6 caracteres');

const nitValidation = z
  .string()
  .min(7, 'Debe tener al menos 7 dígitos')
  .regex(/^[0-9]+$/, 'Solo números permitidos');

// ============================================================================
// NATURAL CLIENT
// ============================================================================

// Section 1: Datos Personales
export interface NaturalClientPersonalData {
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  tipo_documento: DocumentType;
  numero_documento: string;
  extension_ci?: string;
  nacionalidad: string;
  fecha_nacimiento: Date;
  estado_civil: CivilStatus;
}

export const naturalClientPersonalSchema = z.object({
  primer_nombre: z.string().min(1, 'Primer nombre es requerido'),
  segundo_nombre: z.string().optional(),
  primer_apellido: z.string().min(1, 'Primer apellido es requerido'),
  segundo_apellido: z.string().optional(),
  tipo_documento: z.enum(DOCUMENT_TYPES, { message: 'Tipo de documento es requerido' }),
  numero_documento: documentValidation,
  extension_ci: z.string().optional(),
  nacionalidad: z.string().min(1, 'Nacionalidad es requerida'),
  fecha_nacimiento: z
    .date({ message: 'Fecha de nacimiento es requerida' })
    .max(new Date(), 'La fecha de nacimiento no puede ser mayor a hoy'),
  estado_civil: z.enum(CIVIL_STATUS, { message: 'Estado civil es requerido' }),
});

// Section 2: Información de Contacto
export interface NaturalClientContactData {
  direccion: string;
  correo_electronico: string;
  celular: string;
}

export const naturalClientContactSchema = z.object({
  direccion: z.string().min(1, 'Dirección es requerida'),
  correo_electronico: emailValidation,
  celular: phoneValidation,
});

// Section 3: Otros Datos
export interface NaturalClientOtherData {
  profesion_oficio: string;
  actividad_economica?: string;
  lugar_trabajo?: string;
  pais_residencia: string;
  genero?: Gender;
  nivel_ingresos?: number;
  cargo?: string;
  anio_ingreso?: Date;
  nit?: string;
  domicilio_comercial?: string;
}

export const naturalClientOtherSchema = z.object({
  profesion_oficio: z.string().min(1, 'Profesión u oficio es requerido'),
  actividad_economica: z.string().optional(),
  lugar_trabajo: z.string().optional(),
  pais_residencia: z.string().min(1, 'País de residencia es requerido'),
  genero: z.enum(GENDER_OPTIONS).optional(),
  nivel_ingresos: z.number().positive().optional(),
  cargo: z.string().optional(),
  anio_ingreso: z.date().optional(),
  nit: z
    .string()
    .min(7, 'NIT debe tener al menos 7 dígitos')
    .regex(/^[0-9]+$/, 'Solo números permitidos')
    .optional(),
  domicilio_comercial: z.string().optional(),
});

// Combined Natural Client Form Data
export interface NaturalClientFormData
  extends NaturalClientPersonalData,
    NaturalClientContactData,
    NaturalClientOtherData {
  executive_in_charge?: string;
}

export const naturalClientFormSchema = naturalClientPersonalSchema
  .merge(naturalClientContactSchema)
  .merge(naturalClientOtherSchema)
  .extend({
    executive_in_charge: z.string().optional(),
  });

// ============================================================================
// CLIENT PARTNER (for married natural clients)
// ============================================================================

export interface ClientPartnerData {
  id?: string;
  client_id: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  direccion: string;
  celular: string;
  correo_electronico: string;
  profesion_oficio: string;
  actividad_economica: string;
  lugar_trabajo: string;
}

export const clientPartnerSchema = z.object({
  id: z.string().optional(),
  client_id: z.string(),
  primer_nombre: z.string().min(1, 'Primer nombre es requerido'),
  segundo_nombre: z.string().optional(),
  primer_apellido: z.string().min(1, 'Primer apellido es requerido'),
  segundo_apellido: z.string().optional(),
  direccion: z.string().min(1, 'Dirección es requerida'),
  celular: phoneValidation,
  correo_electronico: emailValidation,
  profesion_oficio: z.string().min(1, 'Profesión u oficio es requerido'),
  actividad_economica: z.string().min(1, 'Actividad económica es requerida'),
  lugar_trabajo: z.string().min(1, 'Lugar de trabajo es requerido'),
});

// ============================================================================
// UNIPERSONAL CLIENT
// ============================================================================

// Extends natural client with commercial data

// Section 4: Datos Comerciales
export interface UnipersonalCommercialData {
  razon_social: string;
  nit: string;
  matricula_comercio?: string;
  domicilio_comercial: string;
  telefono_comercial: string;
  actividad_economica_comercial: string;
  nivel_ingresos: number;
  correo_electronico_comercial: string;
}

export const unipersonalCommercialSchema = z.object({
  razon_social: z.string().min(1, 'Razón social es requerida'),
  nit: nitValidation,
  matricula_comercio: z.string().min(7, 'Debe tener al menos 7 caracteres').optional(),
  domicilio_comercial: z.string().min(1, 'Domicilio comercial es requerido'),
  telefono_comercial: phoneValidation,
  actividad_economica_comercial: z.string().min(1, 'Actividad económica es requerida'),
  nivel_ingresos: z.number().positive('Nivel de ingresos es requerido'),
  correo_electronico_comercial: emailValidation,
});

// Section 5: Datos del Propietario
export interface UnipersonalOwnerData {
  nombre_propietario: string;
  apellido_propietario: string;
  documento_propietario: string;
  extension_propietario?: string;
  nacionalidad_propietario: string;
}

export const unipersonalOwnerSchema = z.object({
  nombre_propietario: z.string().min(1, 'Nombre del propietario es requerido'),
  apellido_propietario: z.string().min(1, 'Apellido del propietario es requerido'),
  documento_propietario: z
    .string()
    .min(7, 'Debe tener al menos 7 dígitos')
    .regex(/^[0-9]+$/, 'Solo números permitidos'),
  extension_propietario: z.string().optional(),
  nacionalidad_propietario: z.string().min(1, 'Nacionalidad es requerida'),
});

// Section 6: Representante Legal
export interface UnipersonalRepresentativeData {
  nombre_representante: string;
  ci_representante: string;
  extension_representante?: string;
}

export const unipersonalRepresentativeSchema = z.object({
  nombre_representante: z.string().min(1, 'Nombre del representante es requerido'),
  ci_representante: z
    .string()
    .min(7, 'Debe tener al menos 7 dígitos')
    .regex(/^[0-9]+$/, 'Solo números permitidos'),
  extension_representante: z.string().optional(),
});

// Combined Unipersonal Client Form Data
export interface UnipersonalClientFormData
  extends NaturalClientPersonalData,
    NaturalClientContactData,
    Omit<NaturalClientOtherData, 'nit' | 'domicilio_comercial' | 'nivel_ingresos'>, // Exclude overlapping optional fields
    UnipersonalCommercialData, // Use required fields from commercial
    UnipersonalOwnerData,
    UnipersonalRepresentativeData {
  executive_in_charge?: string;
}

export const unipersonalClientFormSchema = naturalClientPersonalSchema
  .merge(naturalClientContactSchema)
  .merge(naturalClientOtherSchema.omit({ nit: true, domicilio_comercial: true, nivel_ingresos: true })) // Remove overlapping optional fields
  .merge(unipersonalCommercialSchema) // Use required fields from commercial
  .merge(unipersonalOwnerSchema.partial()) // Make owner fields optional (auto-filled from personal data)
  .merge(unipersonalRepresentativeSchema)
  .extend({
    executive_in_charge: z.string().optional(),
  });

// ============================================================================
// JURIDIC CLIENT (Company)
// ============================================================================

// Section 1: Datos de la Empresa
export interface JuridicClientCompanyData {
  razon_social: string;
  tipo_sociedad?: CompanyType;
  tipo_documento?: string; // Always "NIT", has default value
  nit: string;
  matricula_comercio?: string;
  pais_constitucion: string;
  actividad_economica: string;
}

export const juridicClientCompanySchema = z.object({
  razon_social: z.string().min(1, 'Razón social es requerida'),
  tipo_sociedad: z.enum(COMPANY_TYPES).optional(),
  tipo_documento: z.string().default('NIT'),
  nit: nitValidation,
  matricula_comercio: z.string().min(7, 'Debe tener al menos 7 caracteres').optional(),
  pais_constitucion: z.string().min(1, 'País de constitución es requerido'),
  actividad_economica: z.string().min(1, 'Actividad económica es requerida'),
});

// Section 2: Información de Contacto
export interface JuridicClientContactData {
  direccion_legal: string;
  correo_electronico?: string;
  telefono?: string;
}

export const juridicClientContactSchema = z.object({
  direccion_legal: z.string().min(1, 'Dirección legal es requerida'),
  correo_electronico: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z
    .string()
    .min(5, 'Debe tener al menos 5 dígitos')
    .regex(/^[0-9]+$/, 'Solo números permitidos')
    .optional()
    .or(z.literal('')),
});

// ============================================================================
// LEGAL REPRESENTATIVE (for Juridic Clients)
// ============================================================================

export interface LegalRepresentativeData {
  id?: string;
  juridic_client_id?: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  tipo_documento: DocumentType;
  numero_documento: string;
  extension?: string;
  is_primary?: boolean;
  cargo?: string;
  telefono?: string;
  correo_electronico?: string;
}

export const legalRepresentativeSchema = z.object({
  id: z.string().optional(),
  juridic_client_id: z.string().optional(),
  primer_nombre: z.string().min(1, 'Primer nombre es requerido'),
  segundo_nombre: z.string().optional(),
  primer_apellido: z.string().min(1, 'Primer apellido es requerido'),
  segundo_apellido: z.string().optional(),
  tipo_documento: z.enum(DOCUMENT_TYPES, { message: 'Tipo de documento es requerido' }),
  numero_documento: documentValidation,
  extension: z.string().optional(),
  is_primary: z.boolean().optional().default(true),
  cargo: z.string().optional(),
  telefono: z.string().optional(),
  correo_electronico: z.string().email('Email inválido').optional().or(z.literal('')),
});

// Combined Juridic Client Form Data
export interface JuridicClientFormData
  extends JuridicClientCompanyData,
    JuridicClientContactData {
  executive_in_charge?: string;
  legal_representatives: LegalRepresentativeData[];
}

export const juridicClientFormSchema = juridicClientCompanySchema
  .merge(juridicClientContactSchema)
  .extend({
    executive_in_charge: z.string().optional(),
    legal_representatives: z
      .array(legalRepresentativeSchema.omit({ juridic_client_id: true }))
      .min(1, 'Al menos un representante legal es requerido'),
  });

// ============================================================================
// FORM STATE
// ============================================================================

export interface ClientFormState {
  clientType: ClientType | null;
  naturalData?: Partial<NaturalClientFormData>;
  unipersonalData?: Partial<UnipersonalClientFormData>;
  juridicData?: Partial<JuridicClientFormData>;
  partnerData?: Partial<ClientPartnerData>; // When estado_civil = 'casado'
  currentStep: number;
  completedSections: {
    personalData?: boolean;
    contactInfo?: boolean;
    otherData?: boolean;
    partnerData?: boolean;
    commercialData?: boolean;
    ownerData?: boolean;
    representativeData?: boolean;
    companyData?: boolean;
    legalReps?: boolean;
    documents?: boolean;
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

export type FormMode = 'create' | 'edit';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  sectionNumber?: number;
  totalSections?: number;
}

// ============================================================================
// "SAME AS" CHECKBOX STATE
// ============================================================================

export interface SameAsState {
  useSameAsDireccion?: boolean; // For domicilio_comercial
  useSameAsEmail?: boolean; // For correo_electronico_comercial
  useSameAsNombre?: boolean; // For nombre_propietario
  useSameAsApellido?: boolean; // For apellido_propietario
  useSameAsDocumento?: boolean; // For documento_propietario
  useSameAsExtension?: boolean; // For extension_propietario
  useSameAsNacionalidad?: boolean; // For nacionalidad_propietario
  useSameAsPropietario?: boolean; // For representante legal (copy from propietario)
}

// ============================================================================
// DATABASE PAYLOAD TYPES (for submission)
// ============================================================================

export interface ClientBasePayload {
  client_type: ClientType;
  executive_in_charge?: string;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  created_by?: string;
}

export interface NaturalClientPayload extends NaturalClientFormData {
  client_id: string;
}

export interface ClientPartnerPayload extends ClientPartnerData {
  client_id: string;
}

export interface UnipersonalClientPayload {
  natural_data: NaturalClientPayload;
  unipersonal_data: {
    client_id: string;
    razon_social: string;
    nit: string;
    matricula_comercio?: string;
    domicilio_comercial: string;
    telefono_comercial: string;
    actividad_economica_comercial: string;
    nivel_ingresos: number;
    correo_electronico_comercial: string;
    nombre_propietario: string;
    apellido_propietario: string;
    documento_propietario: string;
    extension_propietario?: string;
    nacionalidad_propietario: string;
    nombre_representante: string;
    ci_representante: string;
    extension_representante?: string;
  };
}

export interface JuridicClientPayload {
  company_data: {
    client_id: string;
    razon_social: string;
    tipo_sociedad?: CompanyType;
    tipo_documento: string;
    nit: string;
    matricula_comercio?: string;
    pais_constitucion: string;
    direccion_legal: string;
    actividad_economica: string;
    correo_electronico?: string;
    telefono?: string;
  };
  legal_representatives: LegalRepresentativeData[];
}
