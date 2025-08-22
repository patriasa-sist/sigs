import { createClient } from "@/utils/supabase/server";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "user";

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
