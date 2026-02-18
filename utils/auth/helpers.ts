import { createClient } from "@/utils/supabase/server";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { cache } from "react";

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
	| "admin.permisos"
	| "admin.equipos";

export interface UserProfile {
	id: string;
	email: string;
	role: UserRole;
	created_at: string;
	updated_at: string;
}

// Server-side authentication helpers

/**
 * Obtiene el usuario actual validando el JWT con Supabase.
 * Cacheado con React cache() para evitar múltiples llamadas getUser()
 * dentro del mismo Server Component o Server Action.
 */
export const getCurrentUser = cache(async () => {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	return user;
});

/**
 * Lee los claims personalizados del JWT sin consultar la BD.
 * Debe llamarse después de getCurrentUser() que valida el token.
 * Cacheado por request para evitar decodificaciones repetidas.
 *
 * Claims inyectados por custom_access_token_hook:
 *   - user_role: rol del usuario
 *   - user_permissions: permisos efectivos
 *   - team_member_ids: IDs de compañeros de equipo (Fase 4)
 */
const getJWTClaimsServer = cache(async (): Promise<{
	user_role: string;
	user_permissions: string[];
	team_member_ids: string[];
}> => {
	const supabase = await createClient();
	const { data: { session } } = await supabase.auth.getSession();
	if (!session?.access_token) {
		return { user_role: "invitado", user_permissions: [], team_member_ids: [] };
	}
	try {
		const payload = JSON.parse(
			Buffer.from(
				session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
				"base64"
			).toString("utf-8")
		);
		return {
			user_role: payload.user_role || "invitado",
			user_permissions: Array.isArray(payload.user_permissions) ? payload.user_permissions : [],
			team_member_ids: Array.isArray(payload.team_member_ids)
				? payload.team_member_ids.map(String)
				: [],
		};
	} catch {
		return { user_role: "invitado", user_permissions: [], team_member_ids: [] };
	}
});

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
	const user = await getCurrentUser();
	if (!user) redirect("/auth/login");
	const claims = await getJWTClaimsServer();
	if (claims.user_role !== "admin") redirect("/unauthorized");
	return {
		id: user.id,
		email: user.email ?? "",
		role: "admin" as UserRole,
		created_at: user.created_at,
		updated_at: user.updated_at ?? user.created_at,
	} satisfies UserProfile;
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
 * Fase 4: Lee permisos del JWT, sin consultas a BD.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
	const user = await getCurrentUser();
	if (!user) return false;
	const claims = await getJWTClaimsServer();
	if (claims.user_role === "admin") return true;
	return claims.user_permissions.includes(permission);
}

/**
 * Requiere que el usuario tenga un permiso. Redirige a /unauthorized si no lo tiene.
 * Uso en server components y server actions que necesitan protección.
 * Fase 4: Lee permisos del JWT, sin consultas a BD.
 */
export async function requirePermission(permission: Permission): Promise<UserProfile> {
	const user = await getCurrentUser();
	if (!user) redirect("/auth/login");
	const claims = await getJWTClaimsServer();
	const profile: UserProfile = {
		id: user.id,
		email: user.email ?? "",
		role: (claims.user_role as UserRole) || "invitado",
		created_at: user.created_at,
		updated_at: user.updated_at ?? user.created_at,
	};
	if (claims.user_role === "admin") return profile;
	if (!claims.user_permissions.includes(permission)) redirect("/unauthorized");
	return profile;
}

/**
 * Verifica permiso sin redirect - retorna resultado booleano.
 * Útil en server actions donde se quiere retornar error en vez de redirect.
 * Fase 4: Lee permisos del JWT, sin consultas a BD.
 */
export async function checkPermission(permission: Permission): Promise<{ allowed: boolean; profile: UserProfile | null }> {
	const user = await getCurrentUser();
	if (!user) return { allowed: false, profile: null };
	const claims = await getJWTClaimsServer();
	const profile: UserProfile = {
		id: user.id,
		email: user.email ?? "",
		role: (claims.user_role as UserRole) || "invitado",
		created_at: user.created_at,
		updated_at: user.updated_at ?? user.created_at,
	};
	if (claims.user_role === "admin") return { allowed: true, profile };
	return { allowed: claims.user_permissions.includes(permission), profile };
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

// ============================================================================
// Data scoping helpers (server-side)
// ============================================================================

/**
 * Determina si el usuario actual necesita aislamiento de datos
 * y retorna los IDs de sus compañeros de equipo.
 *
 * @param module - Modulo que solicita el filtro. El rol 'siniestros' solo se
 *   aisla cuando consulta su propio modulo; para polizas/clientes ve todo.
 *
 * Roles sin aislamiento: admin, usuario, cobranza (siempre)
 * Roles con aislamiento: agente, comercial (siempre), siniestros (solo en modulo siniestros)
 *
 * Fase 4: Lee rol y team_member_ids del JWT, sin consultas a BD.
 * Fallback al RPC get_team_member_ids() si el JWT es anterior a la migración Fase 4.
 */
export async function getDataScopeFilter(module?: 'polizas' | 'clientes' | 'siniestros'): Promise<{
	needsScoping: boolean;
	teamMemberIds: string[];
	userId: string;
	role: string;
}> {
	const user = await getCurrentUser();
	if (!user) return { needsScoping: false, teamMemberIds: [], userId: "", role: "" };

	const claims = await getJWTClaimsServer();
	const role = claims.user_role;

	// Roles que nunca necesitan aislamiento
	if (["admin", "usuario", "cobranza"].includes(role)) {
		return { needsScoping: false, teamMemberIds: [], userId: user.id, role };
	}

	// Rol siniestros: aislado solo en su modulo, libre en polizas/clientes
	if (role === "siniestros" && module !== "siniestros") {
		return { needsScoping: false, teamMemberIds: [], userId: user.id, role };
	}

	// Agente, comercial, siniestros (en su módulo): necesitan aislamiento.
	// Fase 4: usar team_member_ids del JWT si están disponibles (evita RPC).
	if (claims.team_member_ids.length > 0) {
		return {
			needsScoping: true,
			teamMemberIds: claims.team_member_ids,
			userId: user.id,
			role,
		};
	}

	// Fallback: JWT antiguo (antes de migración Fase 4) → llamar RPC
	const supabase = await createClient();
	const { data } = await supabase.rpc("get_team_member_ids", {
		p_user_id: user.id,
	});
	return {
		needsScoping: true,
		teamMemberIds: data || [user.id],
		userId: user.id,
		role,
	};
}

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
