/**
 * Client Edit Permission Server Actions
 * @module app/clientes/permisos/actions
 * @description Server-side actions for managing client edit permissions
 *
 * Security:
 * - Only admins can grant/revoke permissions
 * - Only comercial role users can receive permissions
 * - Users can check their own permissions
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
	ClientEditPermissionViewModel,
	GrantPermissionInput,
	PermissionCheckResult,
	ComercialUser,
} from "@/types/clientPermission";

// ============================================
// TYPES
// ============================================

export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get authenticated user with profile
 */
async function getAuthenticatedUserWithRole() {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		throw new Error("No autenticado");
	}

	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.select("id, role, full_name")
		.eq("id", user.id)
		.single();

	if (profileError || !profile) {
		throw new Error("Perfil no encontrado");
	}

	return { supabase, user, profile };
}

/**
 * Verify the current user is an admin
 */
async function requireAdmin() {
	const { supabase, user, profile } = await getAuthenticatedUserWithRole();

	if (profile.role !== "admin") {
		const { data: allowed } = await supabase.rpc("user_has_permission", {
			p_user_id: profile.id,
			p_permission_id: "admin.permisos",
		});
		if (!allowed) {
			throw new Error("Solo administradores pueden realizar esta acción");
		}
	}

	return { supabase, user, profile };
}

// ============================================
// CHECK EDIT PERMISSION
// ============================================

/**
 * Check if the current user can edit a specific client
 *
 * @param clientId - UUID of the client to check
 * @returns Permission check result with canEdit flag and reason
 */
export async function checkEditPermission(
	clientId: string
): Promise<ActionResult<PermissionCheckResult>> {
	try {
		const { supabase, user, profile } = await getAuthenticatedUserWithRole();

		// Admin can always edit
		if (profile.role === "admin") {
			return {
				success: true,
				data: {
					canEdit: true,
					reason: "Administrador",
					isAdmin: true,
				},
			};
		}

		// Only comercial role can have specific permissions
		if (profile.role !== "comercial") {
			return {
				success: true,
				data: {
					canEdit: false,
					reason: "Rol no autorizado para editar clientes",
					isAdmin: false,
				},
			};
		}

		// Check specific permission for comercial user
		const { data: permission, error } = await supabase
			.from("client_edit_permissions")
			.select(
				`
				id,
				expires_at,
				granted_by,
				granter:profiles!granted_by (full_name)
			`
			)
			.eq("client_id", clientId)
			.eq("user_id", user.id)
			.is("revoked_at", null)
			.single();

		if (error || !permission) {
			return {
				success: true,
				data: {
					canEdit: false,
					reason: "Sin permiso asignado para este cliente",
					isAdmin: false,
				},
			};
		}

		// Check expiration
		if (permission.expires_at && new Date(permission.expires_at) < new Date()) {
			return {
				success: true,
				data: {
					canEdit: false,
					reason: "Permiso expirado",
					isAdmin: false,
				},
			};
		}

		// Get granter name safely - handle both array and object forms from Supabase
		const granterRaw = permission.granter;
		const granterData = Array.isArray(granterRaw) ? granterRaw[0] : granterRaw;

		return {
			success: true,
			data: {
				canEdit: true,
				reason: "Permiso activo",
				isAdmin: false,
				permission: {
					id: permission.id,
					expires_at: permission.expires_at,
					granted_by_name: granterData?.full_name || "Desconocido",
				},
			},
		};
	} catch (error) {
		console.error("[checkEditPermission] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GRANT PERMISSION (Admin only)
// ============================================

/**
 * Grant edit permission to a comercial user for a specific client
 *
 * @param input - Permission grant input (client_id, user_id, optional expires_at and notes)
 * @returns Result with the new permission ID
 */
export async function grantEditPermission(
	input: GrantPermissionInput
): Promise<ActionResult<{ id: string }>> {
	try {
		const { supabase, user } = await requireAdmin();

		// Verify target user exists and is comercial
		const { data: targetProfile, error: targetError } = await supabase
			.from("profiles")
			.select("id, role, full_name")
			.eq("id", input.user_id)
			.single();

		if (targetError || !targetProfile) {
			return { success: false, error: "Usuario no encontrado" };
		}

		if (targetProfile.role !== "comercial") {
			return {
				success: false,
				error: "Solo se pueden otorgar permisos a usuarios con rol comercial",
			};
		}

		// Verify client exists
		const { data: clientData, error: clientError } = await supabase
			.from("clients")
			.select("id")
			.eq("id", input.client_id)
			.single();

		if (clientError || !clientData) {
			return { success: false, error: "Cliente no encontrado" };
		}

		// Check if an active permission already exists
		const { data: existing } = await supabase
			.from("client_edit_permissions")
			.select("id")
			.eq("client_id", input.client_id)
			.eq("user_id", input.user_id)
			.is("revoked_at", null)
			.single();

		if (existing) {
			return {
				success: false,
				error: `${targetProfile.full_name} ya tiene un permiso activo para este cliente`,
			};
		}

		// Insert new permission
		const { data, error } = await supabase
			.from("client_edit_permissions")
			.insert({
				client_id: input.client_id,
				user_id: input.user_id,
				granted_by: user.id,
				expires_at: input.expires_at || null,
				notes: input.notes || null,
			})
			.select("id")
			.single();

		if (error) {
			console.error("[grantEditPermission] Insert error:", error);
			return { success: false, error: "Error al otorgar permiso" };
		}

		revalidatePath("/clientes");
		return { success: true, data: { id: data.id } };
	} catch (error) {
		console.error("[grantEditPermission] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// REVOKE PERMISSION (Admin only)
// ============================================

/**
 * Revoke an existing edit permission
 *
 * @param permissionId - UUID of the permission to revoke
 * @param notes - Optional reason for revocation
 * @returns Success/failure result
 */
export async function revokeEditPermission(
	permissionId: string,
	notes?: string
): Promise<ActionResult<void>> {
	try {
		const { supabase, user } = await requireAdmin();

		// Verify permission exists and is active
		const { data: existing, error: findError } = await supabase
			.from("client_edit_permissions")
			.select("id, revoked_at")
			.eq("id", permissionId)
			.single();

		if (findError || !existing) {
			return { success: false, error: "Permiso no encontrado" };
		}

		if (existing.revoked_at) {
			return { success: false, error: "El permiso ya fue revocado" };
		}

		// Soft delete: set revoked_at timestamp
		const { error } = await supabase
			.from("client_edit_permissions")
			.update({
				revoked_at: new Date().toISOString(),
				revoked_by: user.id,
				notes: notes
					? `Revocado: ${notes}`
					: "Revocado por administrador",
			})
			.eq("id", permissionId);

		if (error) {
			console.error("[revokeEditPermission] Update error:", error);
			return { success: false, error: "Error al revocar permiso" };
		}

		revalidatePath("/clientes");
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[revokeEditPermission] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET CLIENT PERMISSIONS (Admin only)
// ============================================

/**
 * Get all active permissions for a specific client
 *
 * @param clientId - UUID of the client
 * @returns List of active permissions with user info
 */
export async function getClientPermissions(
	clientId: string
): Promise<ActionResult<ClientEditPermissionViewModel[]>> {
	try {
		const { supabase } = await requireAdmin();

		const { data, error } = await supabase
			.from("client_edit_permissions")
			.select(
				`
				id,
				client_id,
				user_id,
				granted_by,
				granted_at,
				expires_at,
				notes,
				user:profiles!user_id (full_name, email),
				granter:profiles!granted_by (full_name)
			`
			)
			.eq("client_id", clientId)
			.is("revoked_at", null)
			.order("granted_at", { ascending: false });

		if (error) {
			console.error("[getClientPermissions] Query error:", error);
			return { success: false, error: "Error al obtener permisos" };
		}

		// Transform to view model - handle both array and object forms from Supabase
		const permissions: ClientEditPermissionViewModel[] = (data || []).map(
			(p) => {
				const userRaw = p.user;
				const granterRaw = p.granter;
				const userData = Array.isArray(userRaw) ? userRaw[0] : userRaw;
				const granterData = Array.isArray(granterRaw) ? granterRaw[0] : granterRaw;

				// Calculate if active (not expired)
				const isActive =
					!p.expires_at || new Date(p.expires_at) > new Date();

				return {
					id: p.id,
					client_id: p.client_id,
					user_id: p.user_id,
					user_name: userData?.full_name || "Desconocido",
					user_email: userData?.email || "",
					granted_by: p.granted_by,
					granted_by_name: granterData?.full_name || "Desconocido",
					granted_at: p.granted_at,
					expires_at: p.expires_at,
					is_active: isActive,
					notes: p.notes,
				};
			}
		);

		return { success: true, data: permissions };
	} catch (error) {
		console.error("[getClientPermissions] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET COMERCIAL USERS (Admin only)
// ============================================

/**
 * Get all users with comercial role for permission granting dropdown
 *
 * @returns List of comercial users
 */
export async function getComercialUsers(): Promise<
	ActionResult<ComercialUser[]>
> {
	try {
		const { supabase } = await requireAdmin();

		const { data, error } = await supabase
			.from("profiles")
			.select("id, full_name, email")
			.eq("role", "comercial")
			.order("full_name");

		if (error) {
			console.error("[getComercialUsers] Query error:", error);
			return { success: false, error: "Error al obtener usuarios" };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		console.error("[getComercialUsers] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET USER'S PERMISSIONS (for current user)
// ============================================

/**
 * Get all active permissions for the current user
 * Useful for showing a comercial user which clients they can edit
 *
 * @returns List of client IDs the user can edit
 */
export async function getMyEditPermissions(): Promise<
	ActionResult<Array<{ client_id: string; expires_at: string | null }>>
> {
	try {
		const { supabase, user, profile } = await getAuthenticatedUserWithRole();

		// Admin doesn't need specific permissions
		if (profile.role === "admin") {
			return {
				success: true,
				data: [], // Empty means admin can edit all
			};
		}

		// Only comercial role has permissions
		if (profile.role !== "comercial") {
			return { success: true, data: [] };
		}

		const { data, error } = await supabase
			.from("client_edit_permissions")
			.select("client_id, expires_at")
			.eq("user_id", user.id)
			.is("revoked_at", null);

		if (error) {
			console.error("[getMyEditPermissions] Query error:", error);
			return { success: false, error: "Error al obtener permisos" };
		}

		// Filter out expired permissions
		const activePermissions = (data || []).filter(
			(p) => !p.expires_at || new Date(p.expires_at) > new Date()
		);

		return { success: true, data: activePermissions };
	} catch (error) {
		console.error("[getMyEditPermissions] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
