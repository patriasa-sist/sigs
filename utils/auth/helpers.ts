import { createClient } from "@/utils/supabase/server";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "usuario" | "agente" | "comercial" | "cobranza" | "siniestros" | "invitado" | "desactivado";

/**
 * Permisos granulares del sistema.
 * Cada permiso representa una acción específica dentro de un módulo.
 * Formato: 'modulo.accion'
 */
export type Permission =
	| "polizas.ver"
	| "polizas.crear"
	| "polizas.editar"
	| "polizas.validar"
	| "polizas.exportar"
	| "clientes.ver"
	| "clientes.crear"
	| "clientes.editar"
	| "clientes.trazabilidad"
	| "cobranzas.ver"
	| "cobranzas.gestionar"
	| "siniestros.ver"
	| "siniestros.crear"
	| "siniestros.editar"
	| "vencimientos.ver"
	| "vencimientos.generar"
	| "documentos.descartar"
	| "documentos.restaurar"
	| "documentos.eliminar"
	| "admin.usuarios"
	| "admin.roles"
	| "admin.invitaciones"
	| "admin.reportes"
	| "admin.permisos";

export interface UserProfile {
	id: string;
	email: string;
	role: UserRole;
	created_at: string;
	updated_at: string;
}

// Server-side authentication helpers
export async function getCurrentUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	return user;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
	const user = await getCurrentUser();
	if (!user) return null;

	const supabase = await createClient();
	const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

	if (error || !profile) {
		return null;
	}

	return profile;
}

export async function getDisplayProfile(): Promise<UserProfile> {
	const user = await getCurrentUser();
	if (!user) {
		throw new Error("User not authenticated");
	}

	console.log("🔍 [getDisplayProfile] User ID:", user.id);
	console.log("🔍 [getDisplayProfile] User email:", user.email);

	const supabase = await createClient();
	const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

	if (error) {
		console.log("❌ [getDisplayProfile] RLS blocking profile access:");
		console.log("   Error code:", error.code);
		console.log("   Error message:", error.message);
		console.log("   Error details:", error.details);
		console.log("   Error hint:", error.hint);
		console.log("🔄 [getDisplayProfile] Falling back to user auth data");
	} else if (profile) {
		console.log("✅ [getDisplayProfile] Successfully fetched profile from Supabase:");
		console.log("   Profile ID:", profile.id);
		console.log("   Profile role:", profile.role);
		console.log("   Profile email:", profile.email);
	} else {
		console.log("⚠️ [getDisplayProfile] No error but profile is null - falling back to user auth data");
	}

	// Return profile data if available, otherwise fallback to user data
	return profile || {
		id: user.id,
		email: user.email!,
		role: "usuario" as const, // Default role, actual role verified by middleware for protected routes
		created_at: user.created_at,
		updated_at: user.updated_at || user.created_at,
	};
}

export async function requireAuth() {
	const user = await getCurrentUser();
	if (!user) {
		redirect("/auth/login");
	}
	return user;
}

export async function requireAdmin() {
	const profile = await getCurrentUserProfile();
	if (!profile) {
		redirect("/auth/login");
	}
	if (profile.role !== "admin") {
		redirect("/unauthorized");
	}
	return profile;
}

export async function hasRole(role: UserRole): Promise<boolean> {
	const profile = await getCurrentUserProfile();
	return profile?.role === role || false;
}

// Client-side authentication helpers
export async function getCurrentUserClient() {
	const supabase = createBrowserClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	return user;
}

export async function getCurrentUserProfileClient(): Promise<UserProfile | null> {
	const user = await getCurrentUserClient();
	if (!user) return null;

	const supabase = createBrowserClient();
	const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

	if (error || !profile) {
		return null;
	}

	return profile;
}

export async function hasRoleClient(role: UserRole): Promise<boolean> {
	const profile = await getCurrentUserProfileClient();
	return profile?.role === role || false;
}

// ============================================================================
// Permission-based authorization (server-side)
// ============================================================================

/**
 * Verifica si el usuario actual tiene un permiso específico.
 * Admin tiene bypass hardcodeado (siempre retorna true).
 * Para otros roles, consulta role_permissions + user_permissions en BD.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
	const profile = await getCurrentUserProfile();
	if (!profile) return false;
	if (profile.role === "admin") return true;

	const supabase = await createClient();
	const { data } = await supabase.rpc("user_has_permission", {
		p_user_id: profile.id,
		p_permission_id: permission,
	});
	return !!data;
}

/**
 * Requiere que el usuario tenga un permiso. Redirige a /unauthorized si no lo tiene.
 * Uso en server components y server actions que necesitan protección.
 */
export async function requirePermission(permission: Permission): Promise<UserProfile> {
	const profile = await getCurrentUserProfile();
	if (!profile) {
		redirect("/auth/login");
	}
	if (profile.role === "admin") return profile;

	const supabase = await createClient();
	const { data } = await supabase.rpc("user_has_permission", {
		p_user_id: profile.id,
		p_permission_id: permission,
	});

	if (!data) {
		redirect("/unauthorized");
	}
	return profile;
}

/**
 * Verifica permiso sin redirect - retorna resultado booleano.
 * Útil en server actions donde se quiere retornar error en vez de redirect.
 */
export async function checkPermission(permission: Permission): Promise<{ allowed: boolean; profile: UserProfile | null }> {
	const profile = await getCurrentUserProfile();
	if (!profile) return { allowed: false, profile: null };
	if (profile.role === "admin") return { allowed: true, profile };

	const supabase = await createClient();
	const { data } = await supabase.rpc("user_has_permission", {
		p_user_id: profile.id,
		p_permission_id: permission,
	});
	return { allowed: !!data, profile };
}

// ============================================================================
// Permission helpers for client-side (JWT-based, no DB call)
// ============================================================================

/**
 * Extrae los permisos del JWT del usuario actual (client-side).
 * No hace llamada a BD - lee directamente del token.
 */
export async function getPermissionsFromSession(): Promise<string[]> {
	const supabase = createBrowserClient();
	const { data: { session } } = await supabase.auth.getSession();
	if (!session?.access_token) return [];

	try {
		const payload = session.access_token.split(".")[1];
		const decoded = JSON.parse(
			atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
		);
		return decoded.user_permissions || [];
	} catch {
		return [];
	}
}

/**
 * Verifica un permiso desde el JWT (client-side, sin llamada a BD).
 * Admin bypass se verifica via user_role en el JWT.
 */
export async function hasPermissionClient(permission: Permission): Promise<boolean> {
	const supabase = createBrowserClient();
	const { data: { session } } = await supabase.auth.getSession();
	if (!session?.access_token) return false;

	try {
		const payload = session.access_token.split(".")[1];
		const decoded = JSON.parse(
			atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
		);
		if (decoded.user_role === "admin") return true;
		const permissions: string[] = decoded.user_permissions || [];
		return permissions.includes(permission);
	} catch {
		return false;
	}
}
