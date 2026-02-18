/**
 * Database Client Types with Zod Validation
 * @module types/database/client
 * @description Type-safe schemas for client data from Supabase with runtime validation
 *
 * Architecture:
 * - Zod schemas for runtime validation
 * - Inferred TypeScript types for compile-time safety
 * - Separation of database models and view models
 * - Defensive parsing with proper error handling
 */

import { z } from "zod";

// ============================================
// ENUMERATIONS
// ============================================

/**
 * Client type enumeration
 */
export const ClientTypeEnum = z.enum(["natural", "juridica", "unipersonal"]);
export type ClientType = z.infer<typeof ClientTypeEnum>;

/**
 * Client status enumeration
 */
export const ClientStatusEnum = z.enum(["active", "inactive", "suspended"]);
export type ClientStatus = z.infer<typeof ClientStatusEnum>;

/**
 * Policy status enumeration
 */
export const PolicyStatusEnum = z.enum(["pendiente", "activa", "vencida", "cancelada", "renovada", "rechazada"]);
export type PolicyStatus = z.infer<typeof PolicyStatusEnum>;

/**
 * Payment modality enumeration
 */
export const PaymentModalityEnum = z.enum(["contado", "credito"]);
export type PaymentModality = z.infer<typeof PaymentModalityEnum>;

/**
 * Currency enumeration
 */
export const CurrencyEnum = z.enum(["Bs", "USD", "USDT", "UFV"]);
export type Currency = z.infer<typeof CurrencyEnum>;

// ============================================
// BASE CLIENT SCHEMA (clients table)
// ============================================

/**
 * Base client schema from clients table
 */
export const BaseClientSchema = z.object({
	id: z.string().uuid("ID de cliente inválido"),
	client_type: ClientTypeEnum,
	commercial_owner_id: z.string().nullable(),
	director_cartera_id: z.string().nullable(),
	status: ClientStatusEnum,
	notes: z.string().nullable(),
	created_at: z.coerce.string(),
	updated_at: z.coerce.string(),
	created_by: z.string().uuid("ID de creador inválido").nullable(),
});

export type BaseClient = z.infer<typeof BaseClientSchema>;

// ============================================
// NATURAL CLIENT SCHEMA (natural_clients table)
// ============================================

/**
 * Natural person client schema
 */
export const NaturalClientSchema = z.object({
	client_id: z.string().uuid(),
	primer_nombre: z.string().min(1, "Primer nombre requerido"),
	segundo_nombre: z.string().nullable(),
	primer_apellido: z.string().min(1, "Primer apellido requerido"),
	segundo_apellido: z.string().nullable(),
	tipo_documento: z.enum(["ci", "pasaporte"]),
	numero_documento: z.string().min(6, "Documento debe tener al menos 6 caracteres"),
	extension_ci: z.string().nullable(),
	nacionalidad: z.string().min(1, "Nacionalidad requerida"),
	fecha_nacimiento: z.string().date("Fecha de nacimiento inválida"),
	estado_civil: z.enum(["casado", "soltero", "divorciado", "viudo"]),
	direccion: z.string().min(1, "Dirección requerida"),
	correo_electronico: z.string().email("Email inválido"),
	celular: z.string().regex(/^[0-9]{5,}$/, "Teléfono inválido"),
	profesion_oficio: z.string().nullable(),
	actividad_economica: z.string().nullable(),
	lugar_trabajo: z.string().nullable(),
	pais_residencia: z.string().nullable(),
	genero: z.enum(["masculino", "femenino", "otro"]).nullable(),
	nivel_ingresos: z.coerce.number().nullable(),
	cargo: z.string().nullable(),
	anio_ingreso: z.coerce.string().nullable(),
	nit: z.string().nullable(),
	domicilio_comercial: z.string().nullable(),
	created_at: z.coerce.string().optional(),
	updated_at: z.coerce.string().optional(),
});

export type NaturalClient = z.infer<typeof NaturalClientSchema>;

// ============================================
// JURIDIC CLIENT SCHEMA (juridic_clients table)
// ============================================

/**
 * Juridic person (company) client schema
 */
export const JuridicClientSchema = z.object({
	client_id: z.string().uuid(),
	razon_social: z.string().min(1, "Razón social requerida"),
	tipo_sociedad: z.string().nullable(),
	nit: z.string().min(7, "NIT debe tener al menos 7 dígitos"),
	matricula_comercio: z.string().nullable(),
	pais_constitucion: z.string().nullable(),
	direccion_legal: z.string().min(1, "Dirección legal requerida"),
	actividad_economica: z.string().nullable(),
	correo_electronico: z.string().email("Email inválido").nullable(),
	telefono: z.string().nullable(),
	created_at: z.coerce.string().optional(),
	updated_at: z.coerce.string().optional(),
});

export type JuridicClient = z.infer<typeof JuridicClientSchema>;

// ============================================
// UNIPERSONAL CLIENT SCHEMA (unipersonal_clients table)
// ============================================

/**
 * Unipersonal (sole proprietorship) client schema
 */
export const UnipersonalClientSchema = z.object({
	client_id: z.string().uuid(),
	razon_social: z.string().min(1, "Razón social requerida"),
	nit: z.string().min(7, "NIT debe tener al menos 7 dígitos"),
	matricula_comercio: z.string().nullable(),
	domicilio_comercial: z.string().min(1, "Domicilio comercial requerido"),
	telefono_comercial: z.string().regex(/^[0-9]{5,}$/, "Teléfono inválido"),
	actividad_economica_comercial: z.string().min(1, "Actividad económica requerida"),
	nivel_ingresos: z.coerce.number().positive("Nivel de ingresos debe ser positivo"),
	correo_electronico_comercial: z.string().email("Email inválido"),
	nombre_propietario: z.string().min(1, "Nombre del propietario requerido"),
	apellido_propietario: z.string().min(1, "Apellido del propietario requerido"),
	documento_propietario: z.string().min(7, "Documento debe tener al menos 7 dígitos"),
	extension_propietario: z.string().nullable(),
	nacionalidad_propietario: z.string().min(1, "Nacionalidad requerida"),
	nombre_representante: z.string().min(1, "Nombre del representante requerido"),
	ci_representante: z.string().min(7, "CI debe tener al menos 7 dígitos"),
	extension_representante: z.string().nullable(),
	created_at: z.coerce.string().optional(),
	updated_at: z.coerce.string().optional(),
});

export type UnipersonalClient = z.infer<typeof UnipersonalClientSchema>;

// ============================================
// POLICY SCHEMA (polizas table)
// ============================================

/**
 * Policy (póliza) schema
 */
export const PolicySchema = z.object({
	id: z.string().uuid(),
	client_id: z.string().uuid(),
	numero_poliza: z.string().min(1, "Número de póliza requerido"),
	compania_aseguradora_id: z.string().uuid(),
	ramo: z.string().min(1, "Ramo requerido"),
	inicio_vigencia: z.coerce.string(),
	fin_vigencia: z.coerce.string(),
	fecha_emision_compania: z.coerce.string(),
	responsable_id: z.string().uuid(),
	regional_id: z.string().uuid(),
	categoria_id: z.string().uuid().nullable(),
	modalidad_pago: PaymentModalityEnum,
	prima_total: z.coerce.number().nonnegative("Prima total no puede ser negativa"),
	moneda: CurrencyEnum,
	prima_neta: z.coerce.number().nonnegative("Prima neta no puede ser negativa").nullable(),
	comision: z.coerce.number().nonnegative("Comisión no puede ser negativa").nullable(),
	estado: PolicyStatusEnum,
	validado_por: z.string().uuid().nullable(),
	fecha_validacion: z.coerce.string().nullable(),
	grupo_produccion: z.enum(["generales", "personales"]).nullable(),
	created_at: z.coerce.string(),
	updated_at: z.coerce.string(),
	created_by: z.string().uuid().nullable(),
	updated_by: z.string().uuid().nullable(),
});

export type Policy = z.infer<typeof PolicySchema>;

// ============================================
// COMPANY SCHEMA (companias_aseguradoras table)
// ============================================

/**
 * Insurance company schema
 */
export const InsuranceCompanySchema = z.object({
	id: z.string().uuid(),
	nombre: z.string().min(1, "Nombre de compañía requerido"),
	activo: z.boolean(),
	created_at: z.coerce.string().optional(),
});

export type InsuranceCompany = z.infer<typeof InsuranceCompanySchema>;

// ============================================
// VIEW MODEL SCHEMAS (For UI consumption)
// ============================================

/**
 * Policy view model for display (simplified and enriched)
 */
export const PolicyViewModelSchema = z.object({
	id: z.string().uuid(),
	policyNumber: z.string(),
	insuranceType: z.string(), // ramo
	insuranceCompany: z.string().optional(), // nombre de compañía
	status: PolicyStatusEnum,
	startDate: z.date(),
	expirationDate: z.date(),
	premium: z.number(),
	currency: CurrencyEnum,
	beneficiaryName: z.string().optional(),
	coverageDetails: z.string().optional(),
	notes: z.string().optional(),
});

export type PolicyViewModel = z.infer<typeof PolicyViewModelSchema>;

/**
 * Client view model for display (unified across all client types)
 */
export const ClientViewModelSchema = z.object({
	// Base identification
	id: z.string().uuid(),
	clientType: ClientTypeEnum,
	status: ClientStatusEnum,

	// Display information
	fullName: z.string(),
	idNumber: z.string(), // Carnet/Documento/NIT principal
	nit: z.string().optional(),

	// Contact information
	email: z.string().email().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),

	// Business information
	executiveInCharge: z.string().optional(),

	// Associated policies
	policies: z.array(PolicyViewModelSchema),

	// Metadata
	createdAt: z.date(),
	updatedAt: z.date(),
	notes: z.string().optional(),
});

export type ClientViewModel = z.infer<typeof ClientViewModelSchema>;

/**
 * Client search result view model
 */
export const ClientSearchResultSchema = ClientViewModelSchema.extend({
	matchedFields: z.array(z.string()),
	relevanceScore: z.number().min(0).max(100),
});

export type ClientSearchResult = z.infer<typeof ClientSearchResultSchema>;

// ============================================
// DATABASE QUERY RESULT SCHEMAS
// ============================================

/**
 * Complete client query result (with joins)
 * This represents the raw data structure returned from database queries
 */
export const ClientQueryResultSchema = z.object({
	// Base client data
	clients: BaseClientSchema,

	// Type-specific data (only one will be present)
	natural_clients: NaturalClientSchema.nullable(),
	juridic_clients: JuridicClientSchema.nullable(),
	unipersonal_clients: UnipersonalClientSchema.nullable(),

	// Executive information (from profiles table)
	executive: z.object({
		id: z.string().uuid(),
		full_name: z.string(),
		email: z.string().email(),
	}).nullable(),

	// Related policies with company info
	policies: z.array(
		PolicySchema.extend({
			companias_aseguradoras: InsuranceCompanySchema.nullable(),
		})
	).optional(),
});

export type ClientQueryResult = z.infer<typeof ClientQueryResultSchema>;

// ============================================
// TRANSFORMATION HELPERS
// ============================================

/**
 * Transform database query result to view model
 * @param queryResult - Raw database query result
 * @returns Validated and transformed client view model
 * @throws ZodError if validation fails
 */
export function transformClientToViewModel(queryResult: ClientQueryResult): ClientViewModel {
	const { clients, natural_clients, juridic_clients, unipersonal_clients, executive, policies } = queryResult;

	// Build full name and identification based on client type
	let fullName = "";
	let idNumber = "";
	let nit: string | undefined = undefined;
	let email: string | undefined = undefined;
	let phone: string | undefined = undefined;
	let address: string | undefined = undefined;

	switch (clients.client_type) {
		case "natural":
			if (!natural_clients) {
				throw new Error(`Natural client data missing for client ${clients.id}`);
			}
			fullName = [
				natural_clients.primer_nombre,
				natural_clients.segundo_nombre,
				natural_clients.primer_apellido,
				natural_clients.segundo_apellido,
			]
				.filter(Boolean)
				.join(" ");
			idNumber = natural_clients.extension_ci
				? `${natural_clients.numero_documento}-${natural_clients.extension_ci}`
				: natural_clients.numero_documento;
			nit = natural_clients.nit ?? undefined;
			email = natural_clients.correo_electronico;
			phone = natural_clients.celular;
			address = natural_clients.direccion;
			break;

		case "juridica":
			if (!juridic_clients) {
				throw new Error(`Juridic client data missing for client ${clients.id}`);
			}
			fullName = juridic_clients.razon_social;
			idNumber = juridic_clients.nit;
			nit = juridic_clients.nit;
			email = juridic_clients.correo_electronico ?? undefined;
			phone = juridic_clients.telefono ?? undefined;
			address = juridic_clients.direccion_legal;
			break;

		case "unipersonal":
			if (!unipersonal_clients) {
				throw new Error(`Unipersonal client data missing for client ${clients.id}`);
			}
			fullName = unipersonal_clients.razon_social;
			idNumber = unipersonal_clients.nit;
			nit = unipersonal_clients.nit;
			email = unipersonal_clients.correo_electronico_comercial;
			phone = unipersonal_clients.telefono_comercial;
			address = unipersonal_clients.domicilio_comercial;
			break;
	}

	// Transform policies with safe date parsing
	const transformedPolicies: PolicyViewModel[] = (policies ?? []).map((policy) => {
		// Parse dates safely - handle both ISO and PostgreSQL timestamp formats
		const parseDate = (dateStr: string): Date => {
			// PostgreSQL format: "2025-10-22 08:33:03.025175+00"
			// ISO format: "2025-10-22T08:33:03.025Z"
			return new Date(dateStr);
		};

		return {
			id: policy.id,
			policyNumber: policy.numero_poliza,
			insuranceType: policy.ramo,
			insuranceCompany: policy.companias_aseguradoras?.nombre,
			status: policy.estado,
			startDate: parseDate(policy.inicio_vigencia),
			expirationDate: parseDate(policy.fin_vigencia),
			premium: policy.prima_total,
			currency: policy.moneda,
			beneficiaryName: undefined, // To be enriched from specific policy data if needed
			coverageDetails: undefined,
			notes: undefined,
		};
	});

	// Build and validate view model
	const viewModel: ClientViewModel = {
		id: clients.id,
		clientType: clients.client_type,
		status: clients.status,
		fullName,
		idNumber,
		nit,
		email,
		phone,
		address,
		executiveInCharge: executive?.full_name ?? undefined,
		policies: transformedPolicies,
		createdAt: new Date(clients.created_at),
		updatedAt: new Date(clients.updated_at),
		notes: clients.notes ?? undefined,
	};

	// Validate the view model before returning
	return ClientViewModelSchema.parse(viewModel);
}
