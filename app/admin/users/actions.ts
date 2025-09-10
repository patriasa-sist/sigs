"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

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