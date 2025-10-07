import { createClient } from "@/utils/supabase/server";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "usuario" | "agente" | "comercial" | "invitado" | "desactivado";

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
