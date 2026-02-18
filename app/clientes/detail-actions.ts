"use server";

import { createClient } from "@/utils/supabase/server";
import { getDataScopeFilter } from "@/utils/auth/helpers";
import type { ClienteDocumento } from "@/types/clienteDocumento";
import type { NaturalClient, JuridicClient, UnipersonalClient } from "@/types/database/client";

// Database types for partner and legal representatives
type PartnerData = {
	id: string;
	client_id: string;
	primer_nombre: string;
	segundo_nombre: string | null;
	primer_apellido: string;
	segundo_apellido: string | null;
	tipo_documento: string;
	numero_documento: string;
	fecha_nacimiento: string;
	nacionalidad: string;
	direccion: string;
	celular: string;
	correo_electronico: string;
	profesion_oficio: string | null;
	actividad_economica: string | null;
	lugar_trabajo: string | null;
	created_at: string;
	updated_at: string;
};

type LegalRepresentative = {
	id: string;
	juridic_client_id: string;
	nombre_completo: string;
	primer_nombre: string;
	segundo_nombre: string | null;
	primer_apellido: string;
	segundo_apellido: string | null;
	tipo_documento: string;
	numero_documento: string;
	extension: string | null;
	cargo: string;
	telefono: string | null;
	correo_electronico: string | null;
	is_primary: boolean;
	created_at: string;
	updated_at: string;
};

type PolicyData = {
	id: string;
	numero_poliza: string;
	ramo: string;
	estado: string;
	inicio_vigencia: string;
	fin_vigencia: string;
	prima_total: number;
	moneda: string;
	companias_aseguradoras: { nombre: string } | null;
};

/**
 * Complete client details including documents, partner, and legal representatives
 */
export type ClienteDetalleCompleto = {
	// Base client info
	id: string;
	client_type: "natural" | "juridica" | "unipersonal";
	status: string;
	commercial_owner_id?: string;
	commercial_owner_name?: string;
	created_at: string;
	updated_at: string;

	// Type-specific data
	natural_data?: NaturalClient | null;
	juridic_data?: JuridicClient | null;
	unipersonal_data?: UnipersonalClient | null;

	// Partner data (for married natural/unipersonal clients)
	partner?: PartnerData | null;

	// Legal representatives (for juridic clients)
	legal_representatives?: LegalRepresentative[];

	// Documents
	documents?: ClienteDocumento[];

	// Policies
	policies?: PolicyData[];
};

export type ActionResult<T> = {
	success: boolean;
	data?: T;
	error?: string;
	details?: unknown;
};

/**
 * Get complete client details including all related data
 */
export async function getClientDetailsComplete(
	clientId: string
): Promise<ActionResult<ClienteDetalleCompleto>> {
	try {
		const supabase = await createClient();

		// Check authentication
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return {
				success: false,
				error: "Usuario no autenticado",
			};
		}

		// 1. Get base client data with type-specific data
		const { data: clientData, error: clientError } = await supabase
			.from("clients")
			.select(
				`
        *,
        natural_clients (*),
        juridic_clients (*),
        unipersonal_clients (*),
        commercial_owner:profiles!commercial_owner_id (
          id,
          full_name,
          email
        )
      `
			)
			.eq("id", clientId)
			.single();

		if (clientError || !clientData) {
			console.error("[getClientDetailsComplete] Client error:", clientError);
			return {
				success: false,
				error: "Cliente no encontrado",
				details: clientError,
			};
		}

		// Verificar scoping por equipo
		const scope = await getDataScopeFilter('clientes');
		if (scope.needsScoping && clientData.commercial_owner_id && !scope.teamMemberIds.includes(clientData.commercial_owner_id)) {
			return {
				success: false,
				error: "No tiene acceso a este cliente",
			};
		}

		// Handle Supabase returning either object or array for 1:1 relationships
		const naturalData = Array.isArray(clientData.natural_clients)
			? clientData.natural_clients[0] ?? null
			: clientData.natural_clients ?? null;

		const juridicData = Array.isArray(clientData.juridic_clients)
			? clientData.juridic_clients[0] ?? null
			: clientData.juridic_clients ?? null;

		const unipersonalData = Array.isArray(clientData.unipersonal_clients)
			? clientData.unipersonal_clients[0] ?? null
			: clientData.unipersonal_clients ?? null;

		console.log("[getClientDetailsComplete] Client data loaded:", {
			id: clientData.id,
			type: clientData.client_type,
			has_natural: !!naturalData,
			has_juridic: !!juridicData,
			has_unipersonal: !!unipersonalData,
		});

		// 2. Get partner data if natural or unipersonal client
		let partnerData = null;
		if (clientData.client_type === "natural" || clientData.client_type === "unipersonal") {
			const { data: partner, error: partnerError } = await supabase
				.from("client_partners")
				.select("*")
				.eq("client_id", clientId)
				.maybeSingle();

			if (partnerError) {
				console.error("[getClientDetailsComplete] Partner error:", partnerError);
			}
			partnerData = partner;
			console.log("[getClientDetailsComplete] Partner data:", !!partner);
		}

		// 3. Get legal representatives if juridic client
		let legalReps: LegalRepresentative[] = [];
		if (clientData.client_type === "juridica" && juridicData) {
			const juridicId = juridicData.client_id;
			if (juridicId) {
				const { data: reps } = await supabase
					.from("legal_representatives")
					.select("*")
					.eq("juridic_client_id", juridicId)
					.order("is_primary", { ascending: false });

				legalReps = reps || [];
				console.log("[getClientDetailsComplete] Legal reps:", legalReps.length);
			}
		}

		// 4. Get documents
		const { data: documents } = await supabase
			.from("clientes_documentos")
			.select("*")
			.eq("client_id", clientId)
			.eq("estado", "activo")
			.order("created_at", { ascending: false });

		console.log("[getClientDetailsComplete] Documents:", documents?.length || 0);

		// 5. Get policies
		const { data: policies, error: policiesError } = await supabase
			.from("polizas")
			.select(
				`
        id,
        numero_poliza,
        ramo,
        estado,
        inicio_vigencia,
        fin_vigencia,
        prima_total,
        moneda,
        companias_aseguradoras:compania_aseguradora_id (nombre)
      `
			)
			.eq("client_id", clientId)
			.order("created_at", { ascending: false });

		if (policiesError) {
			console.error("[getClientDetailsComplete] Policies error:", policiesError);
		}
		console.log("[getClientDetailsComplete] Policies:", policies?.length || 0);

		// Normalize policies data - handle Supabase returning array for FK relationship
		const normalizedPolicies: PolicyData[] = (policies || []).map((policy) => ({
			...policy,
			companias_aseguradoras: Array.isArray(policy.companias_aseguradoras)
				? policy.companias_aseguradoras[0] ?? null
				: policy.companias_aseguradoras ?? null,
		}));

		// Build result
		const commercialOwnerData = Array.isArray(clientData.commercial_owner)
			? clientData.commercial_owner[0] ?? null
			: clientData.commercial_owner ?? null;

		const result: ClienteDetalleCompleto = {
			id: clientData.id,
			client_type: clientData.client_type,
			status: clientData.status,
			commercial_owner_id: clientData.commercial_owner_id,
			commercial_owner_name: commercialOwnerData?.full_name,
			created_at: clientData.created_at,
			updated_at: clientData.updated_at,
			natural_data: naturalData,
			juridic_data: juridicData,
			unipersonal_data: unipersonalData,
			partner: partnerData,
			legal_representatives: legalReps,
			documents: documents || [],
			policies: normalizedPolicies,
		};

		console.log("[getClientDetailsComplete] Returning result:", {
			id: result.id,
			type: result.client_type,
			has_natural_data: !!result.natural_data,
			has_juridic_data: !!result.juridic_data,
			has_unipersonal_data: !!result.unipersonal_data,
			docs_count: result.documents?.length,
			policies_count: result.policies?.length,
		});

		return {
			success: true,
			data: result,
		};
	} catch (error) {
		console.error("[getClientDetailsComplete] Error:", error);
		return {
			success: false,
			error: "Error al obtener detalles del cliente",
			details: error,
		};
	}
}
