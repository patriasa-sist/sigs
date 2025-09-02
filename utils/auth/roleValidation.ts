import { createClient } from "@/utils/supabase/server";
import { UserRole } from "./helpers";

export interface RoleChangeValidation {
	isValid: boolean;
	error?: string;
	currentUserRole?: UserRole;
}

export async function validateRoleChange(
	targetUserId: string,
	newRole: UserRole,
	currentUserId?: string
): Promise<RoleChangeValidation> {
	try {
		const supabase = await createClient();

		// Get current user if not provided
		if (!currentUserId) {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				return { isValid: false, error: "Authentication required" };
			}
			currentUserId = user.id;
		}

		// Get current user's role
		const { data: currentUserProfile, error: currentUserError } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", currentUserId)
			.single();

		if (currentUserError || !currentUserProfile) {
			return { isValid: false, error: "Unable to verify current user permissions" };
		}

		// Only admins can change roles
		if (currentUserProfile.role !== "admin") {
			return {
				isValid: false,
				error: "Only administrators can change user roles",
				currentUserRole: currentUserProfile.role,
			};
		}

		// Get target user's current role
		const { data: targetUserProfile, error: targetUserError } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", targetUserId)
			.single();

		if (targetUserError || !targetUserProfile) {
			return { isValid: false, error: "Target user not found" };
		}

		// Prevent self-demotion (admin removing their own admin privileges)
		if (currentUserId === targetUserId && currentUserProfile.role === "admin" && newRole !== "admin") {
			return {
				isValid: false,
				error: "Administrators cannot remove their own admin privileges",
				currentUserRole: currentUserProfile.role,
			};
		}

		return {
			isValid: true,
			currentUserRole: currentUserProfile.role,
		};
	} catch (error) {
		console.error("Role validation error:", error);
		return {
			isValid: false,
			error: "Role validation failed due to system error",
		};
	}
}
