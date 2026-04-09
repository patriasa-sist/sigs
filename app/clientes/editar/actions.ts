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
import {
	naturalClientFormSchema,
	unipersonalClientFormSchema,
	juridicClientCompanySchema,
	juridicClientContactSchema,
	clientPartnerSchema,
	legalRepresentativeSchema,
} from "@/types/clientForm";
import {
	normalizeNaturalClientData,
	normalizeJuridicClientData,
	normalizeUnipersonalClientData,
	normalizePartnerData,
	normalizeLegalRepresentativeData,
} from "@/utils/formNormalization";
import { z } from "zod";

const uuidSchema = z.string().uuid();

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
 * Verify the current user can edit the specified client.
 *
 * Authorization paths (any one is sufficient):
 * 1. Admin role — always allowed
 * 2. Role has "clientes.editar" permission — allowed for all clients
 * 3. Team leader for the client's commercial_owner
 * 4. Explicit per-client grant in client_edit_permissions
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

	// Path 1: Admin can always edit
	if (profile.role === "admin") {
		return { supabase, user, profile };
	}

	// Path 2: Role-level permission is sufficient
	const { data: hasEditPerm } = await supabase.rpc("user_has_permission", {
		p_user_id: profile.id,
		p_permission_id: "clientes.editar",
	});
	if (hasEditPerm) {
		return { supabase, user, profile };
	}

	// Path 3: Team leader for the client's commercial_owner
	const { data: clientData } = await supabase
		.from("clients")
		.select("commercial_owner_id")
		.eq("id", clientId)
		.single();

	if (clientData?.commercial_owner_id) {
		const { data: leaderTeams } = await supabase
			.from("equipo_miembros")
			.select("equipo_id")
			.eq("user_id", user.id)
			.eq("rol_equipo", "lider");

		if (leaderTeams && leaderTeams.length > 0) {
			const teamIds = leaderTeams.map((t: { equipo_id: string }) => t.equipo_id);
			const { count } = await supabase
				.from("equipo_miembros")
				.select("*", { count: "exact", head: true })
				.eq("user_id", clientData.commercial_owner_id)
				.in("equipo_id", teamIds);

			if ((count ?? 0) > 0) {
				return { supabase, user, profile };
			}
		}
	}

	// Path 4: Explicit per-client permission
	const { data: permission } = await supabase
		.from("client_edit_permissions")
		.select("id, expires_at")
		.eq("client_id", clientId)
		.eq("user_id", user.id)
		.is("revoked_at", null)
		.single();

	if (permission) {
		const isActive = !permission.expires_at || new Date(permission.expires_at) > new Date();
		if (isActive) {
			return { supabase, user, profile };
		}
	}

	throw new Error("No tiene permiso para editar este cliente");
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
	if (!uuidSchema.safeParse(clientId).success) {
		return { success: false, error: "ID de cliente inválido" };
	}

	const validation = naturalClientFormSchema.partial().safeParse(data);
	if (!validation.success) {
		const firstError = validation.error.issues[0];
		return { success: false, error: `Datos inválidos: ${firstError.path.join(".")} - ${firstError.message}` };
	}

	try {
		const { supabase } = await authorizeClientEdit(clientId);

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

		// Normalize text fields before saving
		const normalized = normalizeNaturalClientData(data as Record<string, unknown>);
		Object.assign(data, normalized);

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
	if (!uuidSchema.safeParse(clientId).success) {
		return { success: false, error: "ID de cliente inválido" };
	}

	const juridicSchema = juridicClientCompanySchema.merge(juridicClientContactSchema);
	const validation = juridicSchema.partial().safeParse(data);
	if (!validation.success) {
		const firstError = validation.error.issues[0];
		return { success: false, error: `Datos inválidos: ${firstError.path.join(".")} - ${firstError.message}` };
	}

	try {
		const { supabase } = await authorizeClientEdit(clientId);

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

		// Normalize text fields before saving
		const normalized = normalizeJuridicClientData(data as Record<string, unknown>);
		Object.assign(data, normalized);

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
	if (!uuidSchema.safeParse(clientId).success) {
		return { success: false, error: "ID de cliente inválido" };
	}

	const validation = unipersonalClientFormSchema.partial().safeParse(data);
	if (!validation.success) {
		const firstError = validation.error.issues[0];
		return { success: false, error: `Datos inválidos: ${firstError.path.join(".")} - ${firstError.message}` };
	}

	try {
		const { supabase } = await authorizeClientEdit(clientId);

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

		// Normalize text fields before saving
		const normalized = normalizeUnipersonalClientData(data as Record<string, unknown>);
		Object.assign(data, normalized);

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
	if (!uuidSchema.safeParse(clientId).success) {
		return { success: false, error: "ID de cliente inválido" };
	}

	const validation = clientPartnerSchema.omit({ client_id: true }).partial().safeParse(data);
	if (!validation.success) {
		const firstError = validation.error.issues[0];
		return { success: false, error: `Datos inválidos: ${firstError.path.join(".")} - ${firstError.message}` };
	}

	try {
		const { supabase } = await authorizeClientEdit(clientId);

		// Normalize text fields before saving
		const normalized = normalizePartnerData(data as Record<string, unknown>);
		Object.assign(data, normalized);

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
					primer_nombre: data.primer_nombre || null,
					segundo_nombre: data.segundo_nombre || null,
					primer_apellido: data.primer_apellido || null,
					segundo_apellido: data.segundo_apellido || null,
					direccion: data.direccion || null,
					celular: data.celular || null,
					correo_electronico: data.correo_electronico || null,
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
					primer_nombre: data.primer_nombre || null,
					segundo_nombre: data.segundo_nombre || null,
					primer_apellido: data.primer_apellido || null,
					segundo_apellido: data.segundo_apellido || null,
					direccion: data.direccion || null,
					celular: data.celular || null,
					correo_electronico: data.correo_electronico || null,
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
	if (!uuidSchema.safeParse(clientId).success) {
		return { success: false, error: "ID de cliente inválido" };
	}

	const repArraySchema = z.array(legalRepresentativeSchema.omit({ juridic_client_id: true }));
	const validation = repArraySchema.safeParse(representatives);
	if (!validation.success) {
		const firstError = validation.error.issues[0];
		return { success: false, error: `Datos de representante inválidos: ${firstError.path.join(".")} - ${firstError.message}` };
	}

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
			const repsToInsert = representatives.map((rep, index) => {
				const normalizedRep = normalizeLegalRepresentativeData(rep as unknown as Record<string, unknown>);
				return {
					juridic_client_id: clientId,
					primer_nombre: normalizedRep.primer_nombre,
					segundo_nombre: normalizedRep.segundo_nombre || null,
					primer_apellido: normalizedRep.primer_apellido,
					segundo_apellido: normalizedRep.segundo_apellido || null,
					tipo_documento: normalizedRep.tipo_documento,
					numero_documento: normalizedRep.numero_documento,
					extension: normalizedRep.extension || null,
					cargo: normalizedRep.cargo || null,
					telefono: normalizedRep.telefono || null,
					correo_electronico: normalizedRep.correo_electronico || null,
					is_primary: index === 0, // First one is primary
				};
			});

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
