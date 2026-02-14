"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/utils/auth/helpers";
import type { Permission, UserRole } from "@/utils/auth/helpers";

// ============================================
// TYPES
// ============================================

export interface PermissionRow {
	id: string;
	module: string;
	action: string;
	description: string | null;
}

export interface RolePermissionRow {
	role: string;
	permission_id: string;
}

export interface UserPermissionRow {
	user_id: string;
	permission_id: string;
	granted_by: string | null;
	granted_at: string;
	expires_at: string | null;
	// Joined fields
	user_email?: string;
	user_full_name?: string;
	granted_by_name?: string;
}

export interface PermissionMatrix {
	permissions: PermissionRow[];
	rolePermissions: RolePermissionRow[];
}

export interface UserWithPermissions {
	id: string;
	email: string;
	full_name: string | null;
	role: string;
	extraPermissions: UserPermissionRow[];
}

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

// ============================================
// AUTHORIZATION
// ============================================

async function requireAdminPermisos() {
	const { allowed, profile } = await checkPermission("admin.permisos");
	if (!allowed || !profile) {
		throw new Error("No tiene permisos para gestionar permisos del sistema");
	}
	return profile;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene la matriz completa de permisos por rol
 */
export async function obtenerMatrizPermisos(): Promise<ActionResult<PermissionMatrix>> {
	try {
		await requireAdminPermisos();
		const supabase = await createClient();

		const [permissionsResult, rolePermissionsResult] = await Promise.all([
			supabase.from("permissions").select("*").order("module").order("action"),
			supabase.from("role_permissions").select("*").order("role").order("permission_id"),
		]);

		if (permissionsResult.error) {
			return { success: false, error: permissionsResult.error.message };
		}
		if (rolePermissionsResult.error) {
			return { success: false, error: rolePermissionsResult.error.message };
		}

		return {
			success: true,
			data: {
				permissions: permissionsResult.data,
				rolePermissions: rolePermissionsResult.data,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtiene los permisos extra de un usuario específico
 */
export async function obtenerPermisosUsuario(userId: string): Promise<ActionResult<UserPermissionRow[]>> {
	try {
		await requireAdminPermisos();
		const supabase = await createClient();

		const { data, error } = await supabase
			.from("user_permissions")
			.select("*")
			.eq("user_id", userId)
			.order("permission_id");

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtiene todos los usuarios con sus permisos extra
 */
export async function obtenerUsuariosConPermisos(): Promise<ActionResult<UserWithPermissions[]>> {
	try {
		await requireAdminPermisos();
		const supabase = await createClient();

		const { data: profiles, error: profilesError } = await supabase
			.from("profiles")
			.select("id, email, full_name, role")
			.order("role")
			.order("email");

		if (profilesError) {
			return { success: false, error: profilesError.message };
		}

		const { data: userPerms, error: permsError } = await supabase
			.from("user_permissions")
			.select("*")
			.order("permission_id");

		if (permsError) {
			return { success: false, error: permsError.message };
		}

		const users: UserWithPermissions[] = (profiles || []).map((p) => ({
			id: p.id,
			email: p.email,
			full_name: p.full_name,
			role: p.role,
			extraPermissions: (userPerms || []).filter((up) => up.user_id === p.id),
		}));

		return { success: true, data: users };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Toggle un permiso para un rol
 */
export async function actualizarPermisoRol(
	role: UserRole,
	permissionId: Permission,
	enabled: boolean
): Promise<ActionResult<null>> {
	try {
		await requireAdminPermisos();

		if (role === "admin") {
			return { success: false, error: "No se pueden modificar los permisos del rol admin (tiene bypass permanente)" };
		}

		const supabase = await createClient();

		if (enabled) {
			const { error } = await supabase
				.from("role_permissions")
				.upsert({ role, permission_id: permissionId }, { onConflict: "role,permission_id" });

			if (error) {
				return { success: false, error: error.message };
			}
		} else {
			const { error } = await supabase
				.from("role_permissions")
				.delete()
				.eq("role", role)
				.eq("permission_id", permissionId);

			if (error) {
				return { success: false, error: error.message };
			}
		}

		revalidatePath("/admin/permisos");
		return { success: true, data: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Asignar permiso extra a un usuario
 */
export async function asignarPermisoUsuario(
	userId: string,
	permissionId: Permission,
	expiresAt?: string
): Promise<ActionResult<null>> {
	try {
		const adminProfile = await requireAdminPermisos();
		const supabase = await createClient();

		const { error } = await supabase
			.from("user_permissions")
			.upsert(
				{
					user_id: userId,
					permission_id: permissionId,
					granted_by: adminProfile.id,
					granted_at: new Date().toISOString(),
					expires_at: expiresAt || null,
				},
				{ onConflict: "user_id,permission_id" }
			);

		if (error) {
			return { success: false, error: error.message };
		}

		revalidatePath("/admin/permisos");
		return { success: true, data: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Revocar permiso extra de un usuario
 */
export async function revocarPermisoUsuario(
	userId: string,
	permissionId: Permission
): Promise<ActionResult<null>> {
	try {
		await requireAdminPermisos();
		const supabase = await createClient();

		const { error } = await supabase
			.from("user_permissions")
			.delete()
			.eq("user_id", userId)
			.eq("permission_id", permissionId);

		if (error) {
			return { success: false, error: error.message };
		}

		revalidatePath("/admin/permisos");
		return { success: true, data: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
