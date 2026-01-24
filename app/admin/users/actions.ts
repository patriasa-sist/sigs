"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function deleteUser(userId: string) {
	try {
		const supabase = await createClient();
		const adminClient = createAdminClient();

		// Get current user to verify admin permissions
		const {
			data: { user: currentUser },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !currentUser) {
			return { success: false, error: "Unauthorized access" };
		}

		// Get current user's profile to check role
		const { data: currentProfile, error: profileError } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", currentUser.id)
			.single();

		if (profileError || currentProfile?.role !== "admin") {
			return { success: false, error: "Admin privileges required" };
		}

		// Prevent admin from deleting themselves
		if (currentUser.id === userId) {
			return { success: false, error: "Cannot delete your own account" };
		}

		// Get user to delete
		const { data: userToDelete, error: getUserError } = await supabase
			.from("profiles")
			.select("email, role")
			.eq("id", userId)
			.single();

		if (getUserError || !userToDelete) {
			return { success: false, error: "User not found" };
		}

		// Check if this is the last admin (prevent system lockout)
		if (userToDelete.role === "admin") {
			const { count: adminCount, error: countError } = await supabase
				.from("profiles")
				.select("*", { count: "exact", head: true })
				.eq("role", "admin");

			if (countError) {
				return { success: false, error: "Failed to verify admin count" };
			}

			if (adminCount && adminCount <= 1) {
				return { success: false, error: "Cannot delete the last admin user" };
			}
		}

		// Delete from profiles table first (due to foreign key constraint)
		const { error: deleteProfileError } = await supabase
			.from("profiles")
			.delete()
			.eq("id", userId);

		if (deleteProfileError) {
			return { success: false, error: "Failed to delete user profile" };
		}

		// Delete from auth.users using admin API
		const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

		if (deleteAuthError) {
			// If auth deletion fails, we should try to restore the profile
			// But for simplicity, we'll just log the error and continue
			console.error("Failed to delete auth user:", deleteAuthError);
			return { 
				success: false, 
				error: "Failed to delete authentication record. Profile was deleted." 
			};
		}

		// Revalidate the users page to show updated list
		revalidatePath("/admin/users");

		return { 
			success: true, 
			message: `User ${userToDelete.email} has been successfully deleted` 
		};

	} catch (error) {
		console.error("Error deleting user:", error);
		return { success: false, error: "An unexpected error occurred" };
	}
}

export async function sendPasswordResetEmail(userId: string) {
	try {
		const supabase = await createClient();

		// Get current user to verify admin permissions
		const {
			data: { user: currentUser },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !currentUser) {
			return { success: false, error: "Acceso no autorizado" };
		}

		// Get current user's profile to check role
		const { data: currentProfile, error: profileError } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", currentUser.id)
			.single();

		if (profileError || currentProfile?.role !== "admin") {
			return { success: false, error: "Se requieren privilegios de administrador" };
		}

		// Get user to send reset email
		const { data: targetUser, error: getUserError } = await supabase
			.from("profiles")
			.select("email")
			.eq("id", userId)
			.single();

		if (getUserError || !targetUser) {
			return { success: false, error: "Usuario no encontrado" };
		}

		// Get the origin for redirect URL
		const headersList = await headers();
		const origin = headersList.get("origin") || headersList.get("x-forwarded-host") || "http://localhost:3000";
		const protocol = headersList.get("x-forwarded-proto") || "http";
		const baseUrl = origin.startsWith("http") ? origin : `${protocol}://${origin}`;

		// Send password reset email via Supabase
		const { error: resetError } = await supabase.auth.resetPasswordForEmail(
			targetUser.email,
			{
				redirectTo: `${baseUrl}/auth/confirm`,
			}
		);

		if (resetError) {
			console.error("Error sending reset email:", resetError);
			return { success: false, error: "Error al enviar el correo de recuperación" };
		}

		return {
			success: true,
			message: `Correo de recuperación enviado a ${targetUser.email}`,
		};
	} catch (error) {
		console.error("Error sending password reset email:", error);
		return { success: false, error: "Ocurrió un error inesperado" };
	}
}