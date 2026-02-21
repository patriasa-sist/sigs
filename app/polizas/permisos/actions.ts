/**
 * Policy Edit Permission Server Actions
 * @module app/polizas/permisos/actions
 * @description Server-side actions for managing policy edit permissions
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
	PolicyEditPermissionViewModel,
	GrantPolicyPermissionInput,
	PolicyPermissionCheckResult,
	ComercialUser,
	ActionResult,
} from "@/types/policyPermission";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Checks if a user is a team leader for a policy's responsable.
 * Returns true if the user has rol_equipo='lider' in any team
 * that also contains the policy's responsable_id.
 */
async function isUserTeamLeaderForResponsable(
	supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>,
	userId: string,
	responsableId: string
): Promise<boolean> {
	// Get all teams where current user is a leader
	const { data: leaderTeams } = await supabase
		.from("equipo_miembros")
		.select("equipo_id")
		.eq("user_id", userId)
		.eq("rol_equipo", "lider");

	if (!leaderTeams || leaderTeams.length === 0) return false;

	const teamIds = leaderTeams.map((t: { equipo_id: string }) => t.equipo_id);

	// Check if responsable belongs to any of those teams
	const { count } = await supabase
		.from("equipo_miembros")
		.select("*", { count: "exact", head: true })
		.eq("user_id", responsableId)
		.in("equipo_id", teamIds);

	return (count ?? 0) > 0;
}

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
 * Verify the current user is an admin OR a team leader for the given policy.
 * Returns isTeamLeader flag to allow downstream scope filtering.
 */
async function requireAdminOrTeamLeaderForPolicy(polizaId: string) {
	const { supabase, user, profile } = await getAuthenticatedUserWithRole();

	if (profile.role === "admin") {
		return { supabase, user, profile, isTeamLeader: false };
	}

	// Check admin.permisos permission (non-admin users with explicit admin permissions)
	const { data: allowed } = await supabase.rpc("user_has_permission", {
		p_user_id: profile.id,
		p_permission_id: "admin.permisos",
	});
	if (allowed) {
		return { supabase, user, profile, isTeamLeader: false };
	}

	// Check if team leader for this policy
	const { data: poliza } = await supabase
		.from("polizas")
		.select("responsable_id")
		.eq("id", polizaId)
		.single();

	if (poliza?.responsable_id) {
		const isLeader = await isUserTeamLeaderForResponsable(supabase, user.id, poliza.responsable_id);
		if (isLeader) {
			return { supabase, user, profile, isTeamLeader: true };
		}
	}

	throw new Error("Sin permisos para gestionar permisos de esta póliza");
}

// ============================================
// CHECK EDIT PERMISSION
// ============================================

/**
 * Check if the current user can edit a specific policy
 *
 * @param polizaId - UUID of the policy to check
 * @returns Permission check result with canEdit flag and reason
 */
export async function checkPolicyEditPermission(
	polizaId: string
): Promise<ActionResult<PolicyPermissionCheckResult>> {
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
					isTeamLeader: false,
				},
			};
		}

		// Fetch policy data for multiple checks (rejection window + team leader)
		const { data: polizaData } = await supabase
			.from("polizas")
			.select("created_by, estado, puede_editar_hasta, responsable_id")
			.eq("id", polizaId)
			.single();

		// Check if user is the creator of a rejected policy within edit window
		if (
			polizaData?.estado === "rechazada" &&
			polizaData.created_by === user.id &&
			polizaData.puede_editar_hasta &&
			new Date(polizaData.puede_editar_hasta) > new Date()
		) {
			const expiresAt = new Date(polizaData.puede_editar_hasta);
			const now = new Date();
			const hoursRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

			return {
				success: true,
				data: {
					canEdit: true,
					reason: `Ventana de edicion por rechazo (${hoursRemaining}h restantes)`,
					isAdmin: false,
					isTeamLeader: false,
					permission: {
						id: "rejection-window",
						expires_at: polizaData.puede_editar_hasta,
						granted_by_name: "Sistema (Rechazo)",
					},
				},
			};
		}

		// Check if user is a team leader for this policy
		if (polizaData?.responsable_id) {
			const teamLeader = await isUserTeamLeaderForResponsable(
				supabase,
				user.id,
				polizaData.responsable_id
			);
			if (teamLeader) {
				return {
					success: true,
					data: {
						canEdit: true,
						reason: "Líder de equipo",
						isAdmin: false,
						isTeamLeader: true,
					},
				};
			}
		}

		// Only comercial and agente roles can have explicit per-policy permissions
		if (profile.role !== "comercial" && profile.role !== "agente") {
			return {
				success: true,
				data: {
					canEdit: false,
					reason: "Rol no autorizado para editar pólizas",
					isAdmin: false,
					isTeamLeader: false,
				},
			};
		}

		// Check specific permission for comercial user
		const { data: permission, error } = await supabase
			.from("policy_edit_permissions")
			.select(
				`
				id,
				expires_at,
				granted_by,
				granter:profiles!granted_by (full_name)
			`
			)
			.eq("poliza_id", polizaId)
			.eq("user_id", user.id)
			.is("revoked_at", null)
			.single();

		if (error || !permission) {
			return {
				success: true,
				data: {
					canEdit: false,
					reason: "Sin permiso asignado para esta póliza",
					isAdmin: false,
					isTeamLeader: false,
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
					isTeamLeader: false,
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
				isTeamLeader: false,
				permission: {
					id: permission.id,
					expires_at: permission.expires_at,
					granted_by_name: granterData?.full_name || "Desconocido",
				},
			},
		};
	} catch (error) {
		console.error("[checkPolicyEditPermission] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GRANT PERMISSION (Admin or Team Leader)
// ============================================

/**
 * Grant edit permission to a comercial user for a specific policy.
 * Admins can grant to any comercial user.
 * Team leaders can only grant to comercial members of their team.
 *
 * @param input - Permission grant input (poliza_id, user_id, optional expires_at and notes)
 * @returns Result with the new permission ID
 */
export async function grantPolicyEditPermission(
	input: GrantPolicyPermissionInput
): Promise<ActionResult<{ id: string }>> {
	try {
		const { supabase, user, isTeamLeader } = await requireAdminOrTeamLeaderForPolicy(input.poliza_id);

		// Verify target user exists and is comercial
		const { data: targetProfile, error: targetError } = await supabase
			.from("profiles")
			.select("id, role, full_name")
			.eq("id", input.user_id)
			.single();

		if (targetError || !targetProfile) {
			return { success: false, error: "Usuario no encontrado" };
		}

		if (targetProfile.role !== "comercial" && targetProfile.role !== "agente") {
			return {
				success: false,
				error: "Solo se pueden otorgar permisos a usuarios con rol comercial o agente",
			};
		}

		// Team leaders can only grant permissions to members of their team
		if (isTeamLeader) {
			const { data: leaderTeams } = await supabase
				.from("equipo_miembros")
				.select("equipo_id")
				.eq("user_id", user.id)
				.eq("rol_equipo", "lider");

			const teamIds = (leaderTeams ?? []).map((t: { equipo_id: string }) => t.equipo_id);

			const { count } = await supabase
				.from("equipo_miembros")
				.select("*", { count: "exact", head: true })
				.eq("user_id", input.user_id)
				.in("equipo_id", teamIds);

			if ((count ?? 0) === 0) {
				return {
					success: false,
					error: "Solo puedes otorgar permisos a miembros de tu equipo",
				};
			}
		}

		// Verify policy exists
		const { data: policyData, error: policyError } = await supabase
			.from("polizas")
			.select("id, numero_poliza")
			.eq("id", input.poliza_id)
			.single();

		if (policyError || !policyData) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// Check if an active permission already exists
		const { data: existing } = await supabase
			.from("policy_edit_permissions")
			.select("id")
			.eq("poliza_id", input.poliza_id)
			.eq("user_id", input.user_id)
			.is("revoked_at", null)
			.single();

		if (existing) {
			return {
				success: false,
				error: `${targetProfile.full_name} ya tiene un permiso activo para esta póliza`,
			};
		}

		// Insert new permission
		const { data, error } = await supabase
			.from("policy_edit_permissions")
			.insert({
				poliza_id: input.poliza_id,
				user_id: input.user_id,
				granted_by: user.id,
				expires_at: input.expires_at || null,
				notes: input.notes || null,
			})
			.select("id")
			.single();

		if (error) {
			console.error("[grantPolicyEditPermission] Insert error:", error);
			return { success: false, error: "Error al otorgar permiso" };
		}

		revalidatePath(`/polizas/${input.poliza_id}`);
		return { success: true, data: { id: data.id } };
	} catch (error) {
		console.error("[grantPolicyEditPermission] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// REVOKE PERMISSION (Admin or Team Leader)
// ============================================

/**
 * Revoke an existing edit permission.
 * Admins can revoke any permission.
 * Team leaders can revoke permissions for policies in their team.
 *
 * @param permissionId - UUID of the permission to revoke
 * @param notes - Optional reason for revocation
 * @returns Success/failure result
 */
export async function revokePolicyEditPermission(
	permissionId: string,
	notes?: string
): Promise<ActionResult<void>> {
	try {
		const { supabase, user, profile } = await getAuthenticatedUserWithRole();

		// Verify permission exists and is active
		const { data: existing, error: findError } = await supabase
			.from("policy_edit_permissions")
			.select("id, revoked_at, poliza_id")
			.eq("id", permissionId)
			.single();

		if (findError || !existing) {
			return { success: false, error: "Permiso no encontrado" };
		}

		if (existing.revoked_at) {
			return { success: false, error: "El permiso ya fue revocado" };
		}

		// Verify user has rights: admin, or team leader for this policy
		if (profile.role !== "admin") {
			const { data: adminPerm } = await supabase.rpc("user_has_permission", {
				p_user_id: profile.id,
				p_permission_id: "admin.permisos",
			});
			if (!adminPerm) {
				// Check if team leader for this policy
				const { data: polizaForCheck } = await supabase
					.from("polizas")
					.select("responsable_id")
					.eq("id", existing.poliza_id)
					.single();
				const isLeader = polizaForCheck?.responsable_id
					? await isUserTeamLeaderForResponsable(supabase, user.id, polizaForCheck.responsable_id)
					: false;
				if (!isLeader) {
					return { success: false, error: "Sin permisos para revocar este permiso" };
				}
			}
		}

		// Soft delete: set revoked_at timestamp
		const { error } = await supabase
			.from("policy_edit_permissions")
			.update({
				revoked_at: new Date().toISOString(),
				revoked_by: user.id,
				notes: notes
					? `Revocado: ${notes}`
					: "Revocado",
			})
			.eq("id", permissionId);

		if (error) {
			console.error("[revokePolicyEditPermission] Update error:", error);
			return { success: false, error: "Error al revocar permiso" };
		}

		revalidatePath(`/polizas/${existing.poliza_id}`);
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[revokePolicyEditPermission] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET POLICY PERMISSIONS (Admin or Team Leader)
// ============================================

/**
 * Get all active permissions for a specific policy.
 * Accessible by admins and team leaders for their team's policies.
 *
 * @param polizaId - UUID of the policy
 * @returns List of active permissions with user info
 */
export async function getPolicyPermissions(
	polizaId: string
): Promise<ActionResult<PolicyEditPermissionViewModel[]>> {
	try {
		const { supabase } = await requireAdminOrTeamLeaderForPolicy(polizaId);

		const { data, error } = await supabase
			.from("policy_edit_permissions")
			.select(
				`
				id,
				poliza_id,
				user_id,
				granted_by,
				granted_at,
				expires_at,
				notes,
				user:profiles!user_id (full_name, email),
				granter:profiles!granted_by (full_name)
			`
			)
			.eq("poliza_id", polizaId)
			.is("revoked_at", null)
			.order("granted_at", { ascending: false });

		if (error) {
			console.error("[getPolicyPermissions] Query error:", error);
			return { success: false, error: "Error al obtener permisos" };
		}

		// Transform to view model - handle both array and object forms from Supabase
		const permissions: PolicyEditPermissionViewModel[] = (data || []).map(
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
					poliza_id: p.poliza_id,
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
		console.error("[getPolicyPermissions] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET COMERCIAL USERS (Admin or Team Leader)
// ============================================

/**
 * Get comercial users for permission granting dropdown.
 * Admins see all comercial users.
 * Team leaders see only comercial users in their team(s).
 *
 * @returns List of comercial users
 */
export async function getComercialUsers(): Promise<
	ActionResult<ComercialUser[]>
> {
	try {
		const { supabase, user, profile } = await getAuthenticatedUserWithRole();

		// Check if admin or has admin.permisos permission
		let isAdmin = profile.role === "admin";
		if (!isAdmin) {
			const { data: adminPerm } = await supabase.rpc("user_has_permission", {
				p_user_id: profile.id,
				p_permission_id: "admin.permisos",
			});
			isAdmin = !!adminPerm;
		}

		if (isAdmin) {
			// Admin: return all comercial and agente users
			const { data, error } = await supabase
				.from("profiles")
				.select("id, full_name, email")
				.in("role", ["comercial", "agente"])
				.order("full_name");

			if (error) {
				console.error("[getComercialUsers] Query error:", error);
				return { success: false, error: "Error al obtener usuarios" };
			}
			return { success: true, data: data || [] };
		}

		// Check if team leader: return only comercial users in their team(s)
		const { data: leaderTeams } = await supabase
			.from("equipo_miembros")
			.select("equipo_id")
			.eq("user_id", user.id)
			.eq("rol_equipo", "lider");

		if (!leaderTeams || leaderTeams.length === 0) {
			throw new Error("Sin permisos para gestionar permisos de edición");
		}

		const teamIds = leaderTeams.map((t: { equipo_id: string }) => t.equipo_id);

		const { data: teamMembers } = await supabase
			.from("equipo_miembros")
			.select("user_id")
			.in("equipo_id", teamIds);

		const memberIds = (teamMembers ?? []).map((m: { user_id: string }) => m.user_id);

		if (memberIds.length === 0) {
			return { success: true, data: [] };
		}

		const { data, error } = await supabase
			.from("profiles")
			.select("id, full_name, email")
			.in("role", ["comercial", "agente"])
			.in("id", memberIds)
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
 * Useful for showing a comercial user which policies they can edit
 *
 * @returns List of policy IDs the user can edit
 */
export async function getMyPolicyEditPermissions(): Promise<
	ActionResult<Array<{ poliza_id: string; expires_at: string | null }>>
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
			.from("policy_edit_permissions")
			.select("poliza_id, expires_at")
			.eq("user_id", user.id)
			.is("revoked_at", null);

		if (error) {
			console.error("[getMyPolicyEditPermissions] Query error:", error);
			return { success: false, error: "Error al obtener permisos" };
		}

		// Filter out expired permissions
		const activePermissions = (data || []).filter(
			(p) => !p.expires_at || new Date(p.expires_at) > new Date()
		);

		return { success: true, data: activePermissions };
	} catch (error) {
		console.error("[getMyPolicyEditPermissions] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
