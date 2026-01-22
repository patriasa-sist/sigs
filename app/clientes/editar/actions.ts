/**
 * Client Edit Server Actions
 * @module app/clientes/editar/actions
 * @description Server-side actions for editing client data
 *
 * Security:
 * - All operations verify edit permission before execution
 * - Admin can edit any client
 * - Comercial can only edit clients they have permission for
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
	NaturalClientFormData,
	JuridicClientFormData,
	UnipersonalClientFormData,
	ClientPartnerData,
	LegalRepresentativeData,
} from "@/types/clientForm";

// ============================================
// TYPES
// ============================================

export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

// ============================================
// AUTHORIZATION
// ============================================

/**
 * Verify the current user can edit the specified client
 * Uses the database function can_edit_client()
 */
async function authorizeClientEdit(clientId: string) {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		throw new Error("No autenticado");
	}

	// Get user profile
	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.select("id, role, full_name")
		.eq("id", user.id)
		.single();

	if (profileError || !profile) {
		throw new Error("Perfil no encontrado");
	}

	// Admin can always edit
	if (profile.role === "admin") {
		return { supabase, user, profile };
	}

	// Only comercial role can have edit permissions
	if (profile.role !== "comercial") {
		throw new Error("No tiene permisos para editar clientes");
	}

	// Check specific permission using database function
	const { data: canEdit, error: rpcError } = await supabase.rpc(
		"can_edit_client",
		{
			p_client_id: clientId,
			p_user_id: user.id,
		}
	);

	if (rpcError) {
		console.error("[authorizeClientEdit] RPC error:", rpcError);
		throw new Error("Error al verificar permisos");
	}

	if (!canEdit) {
		throw new Error("No tiene permiso para editar este cliente");
	}

	return { supabase, user, profile };
}

// ============================================
// UPDATE NATURAL CLIENT
// ============================================

/**
 * Update a natural client's data
 */
export async function updateNaturalClient(
	clientId: string,
	data: Partial<NaturalClientFormData>
): Promise<ActionResult<void>> {
	try {
		const { supabase, user } = await authorizeClientEdit(clientId);

		// Verify client exists and is natural type
		const { data: clientData, error: clientError } = await supabase
			.from("clients")
			.select("id, client_type")
			.eq("id", clientId)
			.single();

		if (clientError || !clientData) {
			return { success: false, error: "Cliente no encontrado" };
		}

		if (clientData.client_type !== "natural") {
			return {
				success: false,
				error: "Este cliente no es de tipo natural",
			};
		}

		// Update clients table (executive_in_charge)
		if (data.executive_in_charge) {
			const { error: updateClientError } = await supabase
				.from("clients")
				.update({
					executive_in_charge: data.executive_in_charge,
					updated_by: user.id,
					updated_at: new Date().toISOString(),
				})
				.eq("id", clientId);

			if (updateClientError) {
				console.error("[updateNaturalClient] Client update error:", updateClientError);
				return { success: false, error: "Error al actualizar datos del cliente" };
			}
		}

		// Update natural_clients table
		const { error: updateNaturalError } = await supabase
			.from("natural_clients")
			.update({
				primer_nombre: data.primer_nombre,
				segundo_nombre: data.segundo_nombre || null,
				primer_apellido: data.primer_apellido,
				segundo_apellido: data.segundo_apellido || null,
				tipo_documento: data.tipo_documento,
				numero_documento: data.numero_documento,
				extension_ci: data.extension_ci || null,
				nacionalidad: data.nacionalidad,
				fecha_nacimiento: data.fecha_nacimiento,
				estado_civil: data.estado_civil,
				direccion: data.direccion,
				correo_electronico: data.correo_electronico,
				celular: data.celular,
				profesion_oficio: data.profesion_oficio || null,
				actividad_economica: data.actividad_economica || null,
				lugar_trabajo: data.lugar_trabajo || null,
				pais_residencia: data.pais_residencia || null,
				genero: data.genero || null,
				nivel_ingresos: data.nivel_ingresos || null,
				cargo: data.cargo || null,
				anio_ingreso: data.anio_ingreso || null,
				nit: data.nit || null,
				domicilio_comercial: data.domicilio_comercial || null,
			})
			.eq("client_id", clientId);

		if (updateNaturalError) {
			console.error("[updateNaturalClient] Natural client update error:", updateNaturalError);
			return { success: false, error: "Error al actualizar datos personales" };
		}

		revalidatePath("/clientes");
		revalidatePath(`/clientes/${clientId}`);
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[updateNaturalClient] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// UPDATE JURIDIC CLIENT
// ============================================

/**
 * Update a juridic client's data
 */
export async function updateJuridicClient(
	clientId: string,
	data: Partial<JuridicClientFormData>
): Promise<ActionResult<void>> {
	try {
		const { supabase, user } = await authorizeClientEdit(clientId);

		// Verify client exists and is juridica type
		const { data: clientData, error: clientError } = await supabase
			.from("clients")
			.select("id, client_type")
			.eq("id", clientId)
			.single();

		if (clientError || !clientData) {
			return { success: false, error: "Cliente no encontrado" };
		}

		if (clientData.client_type !== "juridica") {
			return {
				success: false,
				error: "Este cliente no es de tipo jurídica",
			};
		}

		// Update clients table (executive_in_charge)
		if (data.executive_in_charge) {
			const { error: updateClientError } = await supabase
				.from("clients")
				.update({
					executive_in_charge: data.executive_in_charge,
					updated_by: user.id,
					updated_at: new Date().toISOString(),
				})
				.eq("id", clientId);

			if (updateClientError) {
				console.error("[updateJuridicClient] Client update error:", updateClientError);
				return { success: false, error: "Error al actualizar datos del cliente" };
			}
		}

		// Update juridic_clients table
		const { error: updateJuridicError } = await supabase
			.from("juridic_clients")
			.update({
				razon_social: data.razon_social,
				tipo_sociedad: data.tipo_sociedad || null,
				tipo_documento: data.tipo_documento || "NIT",
				nit: data.nit,
				matricula_comercio: data.matricula_comercio || null,
				pais_constitucion: data.pais_constitucion,
				direccion_legal: data.direccion_legal,
				actividad_economica: data.actividad_economica,
				correo_electronico: data.correo_electronico || null,
				telefono: data.telefono || null,
			})
			.eq("client_id", clientId);

		if (updateJuridicError) {
			console.error("[updateJuridicClient] Juridic client update error:", updateJuridicError);
			return { success: false, error: "Error al actualizar datos de la empresa" };
		}

		revalidatePath("/clientes");
		revalidatePath(`/clientes/${clientId}`);
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[updateJuridicClient] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// UPDATE UNIPERSONAL CLIENT
// ============================================

/**
 * Update a unipersonal client's data
 */
export async function updateUnipersonalClient(
	clientId: string,
	data: Partial<UnipersonalClientFormData>
): Promise<ActionResult<void>> {
	try {
		const { supabase, user } = await authorizeClientEdit(clientId);

		// Verify client exists and is unipersonal type
		const { data: clientData, error: clientError } = await supabase
			.from("clients")
			.select("id, client_type")
			.eq("id", clientId)
			.single();

		if (clientError || !clientData) {
			return { success: false, error: "Cliente no encontrado" };
		}

		if (clientData.client_type !== "unipersonal") {
			return {
				success: false,
				error: "Este cliente no es de tipo unipersonal",
			};
		}

		// Update clients table (executive_in_charge)
		if (data.executive_in_charge) {
			const { error: updateClientError } = await supabase
				.from("clients")
				.update({
					executive_in_charge: data.executive_in_charge,
					updated_by: user.id,
					updated_at: new Date().toISOString(),
				})
				.eq("id", clientId);

			if (updateClientError) {
				console.error("[updateUnipersonalClient] Client update error:", updateClientError);
				return { success: false, error: "Error al actualizar datos del cliente" };
			}
		}

		// Update natural_clients table (personal data)
		const { error: updateNaturalError } = await supabase
			.from("natural_clients")
			.update({
				primer_nombre: data.primer_nombre,
				segundo_nombre: data.segundo_nombre || null,
				primer_apellido: data.primer_apellido,
				segundo_apellido: data.segundo_apellido || null,
				tipo_documento: data.tipo_documento,
				numero_documento: data.numero_documento,
				extension_ci: data.extension_ci || null,
				nacionalidad: data.nacionalidad,
				fecha_nacimiento: data.fecha_nacimiento,
				estado_civil: data.estado_civil,
				direccion: data.direccion,
				correo_electronico: data.correo_electronico,
				celular: data.celular,
				profesion_oficio: data.profesion_oficio || null,
				actividad_economica: data.actividad_economica || null,
				lugar_trabajo: data.lugar_trabajo || null,
				pais_residencia: data.pais_residencia || null,
				genero: data.genero || null,
				cargo: data.cargo || null,
				anio_ingreso: data.anio_ingreso || null,
			})
			.eq("client_id", clientId);

		if (updateNaturalError) {
			console.error("[updateUnipersonalClient] Natural client update error:", updateNaturalError);
			return { success: false, error: "Error al actualizar datos personales" };
		}

		// Update unipersonal_clients table (commercial data)
		const { error: updateUnipersonalError } = await supabase
			.from("unipersonal_clients")
			.update({
				razon_social: data.razon_social,
				nit: data.nit,
				matricula_comercio: data.matricula_comercio || null,
				domicilio_comercial: data.domicilio_comercial,
				telefono_comercial: data.telefono_comercial,
				actividad_economica_comercial: data.actividad_economica_comercial,
				nivel_ingresos: data.nivel_ingresos,
				correo_electronico_comercial: data.correo_electronico_comercial,
				nombre_propietario: data.nombre_propietario,
				apellido_propietario: data.apellido_propietario,
				documento_propietario: data.documento_propietario,
				extension_propietario: data.extension_propietario || null,
				nacionalidad_propietario: data.nacionalidad_propietario,
				nombre_representante: data.nombre_representante,
				ci_representante: data.ci_representante,
				extension_representante: data.extension_representante || null,
			})
			.eq("client_id", clientId);

		if (updateUnipersonalError) {
			console.error("[updateUnipersonalClient] Unipersonal client update error:", updateUnipersonalError);
			return { success: false, error: "Error al actualizar datos comerciales" };
		}

		revalidatePath("/clientes");
		revalidatePath(`/clientes/${clientId}`);
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[updateUnipersonalClient] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// UPDATE PARTNER DATA
// ============================================

/**
 * Update partner (spouse) data for a natural/unipersonal client
 */
export async function updatePartnerData(
	clientId: string,
	data: Partial<ClientPartnerData>
): Promise<ActionResult<void>> {
	try {
		const { supabase } = await authorizeClientEdit(clientId);

		// Check if partner exists
		const { data: existingPartner, error: findError } = await supabase
			.from("client_partners")
			.select("id")
			.eq("client_id", clientId)
			.single();

		if (findError && findError.code !== "PGRST116") {
			// PGRST116 = no rows found
			console.error("[updatePartnerData] Find error:", findError);
			return { success: false, error: "Error al buscar datos del cónyuge" };
		}

		if (existingPartner) {
			// Update existing partner
			const { error: updateError } = await supabase
				.from("client_partners")
				.update({
					primer_nombre: data.primer_nombre,
					segundo_nombre: data.segundo_nombre || null,
					primer_apellido: data.primer_apellido,
					segundo_apellido: data.segundo_apellido || null,
					direccion: data.direccion,
					celular: data.celular,
					correo_electronico: data.correo_electronico,
					profesion_oficio: data.profesion_oficio || null,
					actividad_economica: data.actividad_economica || null,
					lugar_trabajo: data.lugar_trabajo || null,
					updated_at: new Date().toISOString(),
				})
				.eq("id", existingPartner.id);

			if (updateError) {
				console.error("[updatePartnerData] Update error:", updateError);
				return { success: false, error: "Error al actualizar datos del cónyuge" };
			}
		} else {
			// Insert new partner
			const { error: insertError } = await supabase
				.from("client_partners")
				.insert({
					client_id: clientId,
					primer_nombre: data.primer_nombre,
					segundo_nombre: data.segundo_nombre || null,
					primer_apellido: data.primer_apellido,
					segundo_apellido: data.segundo_apellido || null,
					direccion: data.direccion,
					celular: data.celular,
					correo_electronico: data.correo_electronico,
					profesion_oficio: data.profesion_oficio || null,
					actividad_economica: data.actividad_economica || null,
					lugar_trabajo: data.lugar_trabajo || null,
				});

			if (insertError) {
				console.error("[updatePartnerData] Insert error:", insertError);
				return { success: false, error: "Error al crear datos del cónyuge" };
			}
		}

		revalidatePath("/clientes");
		revalidatePath(`/clientes/${clientId}`);
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[updatePartnerData] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// UPDATE LEGAL REPRESENTATIVES
// ============================================

/**
 * Update legal representatives for a juridic client
 * This replaces all existing representatives with the new list
 */
export async function updateLegalRepresentatives(
	clientId: string,
	representatives: LegalRepresentativeData[]
): Promise<ActionResult<void>> {
	try {
		const { supabase } = await authorizeClientEdit(clientId);

		// Get the juridic_client id
		const { data: juridicData, error: juridicError } = await supabase
			.from("juridic_clients")
			.select("client_id")
			.eq("client_id", clientId)
			.single();

		if (juridicError || !juridicData) {
			return { success: false, error: "Cliente jurídico no encontrado" };
		}

		// Delete existing representatives
		const { error: deleteError } = await supabase
			.from("legal_representatives")
			.delete()
			.eq("juridic_client_id", clientId);

		if (deleteError) {
			console.error("[updateLegalRepresentatives] Delete error:", deleteError);
			return { success: false, error: "Error al eliminar representantes existentes" };
		}

		// Insert new representatives
		if (representatives.length > 0) {
			const repsToInsert = representatives.map((rep, index) => ({
				juridic_client_id: clientId,
				primer_nombre: rep.primer_nombre,
				segundo_nombre: rep.segundo_nombre || null,
				primer_apellido: rep.primer_apellido,
				segundo_apellido: rep.segundo_apellido || null,
				tipo_documento: rep.tipo_documento,
				numero_documento: rep.numero_documento,
				extension: rep.extension || null,
				cargo: rep.cargo || null,
				telefono: rep.telefono || null,
				correo_electronico: rep.correo_electronico || null,
				is_primary: index === 0, // First one is primary
			}));

			const { error: insertError } = await supabase
				.from("legal_representatives")
				.insert(repsToInsert);

			if (insertError) {
				console.error("[updateLegalRepresentatives] Insert error:", insertError);
				return { success: false, error: "Error al insertar representantes" };
			}
		}

		revalidatePath("/clientes");
		revalidatePath(`/clientes/${clientId}`);
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[updateLegalRepresentatives] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET EXECUTIVES LIST (for dropdown)
// ============================================

/**
 * Get list of executives for the director de cartera dropdown
 */
export async function getExecutives(): Promise<
	ActionResult<Array<{ id: string; full_name: string; email: string }>>
> {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		const { data, error } = await supabase
			.from("profiles")
			.select("id, full_name, email")
			.in("role", ["admin", "comercial", "usuario"])
			.order("full_name");

		if (error) {
			console.error("[getExecutives] Query error:", error);
			return { success: false, error: "Error al obtener ejecutivos" };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		console.error("[getExecutives] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
