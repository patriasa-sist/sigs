"use server";

import { createClient } from "@/utils/supabase/server";
import { validateRoleChange } from "@/utils/auth/roleValidation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UserRole } from "@/utils/auth/helpers";
import { VALID_ROLES } from "@/utils/auth/roles";

const updateRoleSchema = z.object({
	userId: z.uuid("Invalid user ID format"),
	newRole: z.enum(VALID_ROLES as readonly [UserRole, ...UserRole[]], {
		message: `Role must be one of: ${VALID_ROLES.join(", ")}`,
	}),
});

export async function updateUserRole(formData: FormData) {
	try {
		// Validate input
		const rawData = {
			userId: formData.get("userId") as string,
			newRole: formData.get("newRole") as UserRole,
		};

		const validation = updateRoleSchema.safeParse(rawData);
		if (!validation.success) {
			return {
				success: false,
				error: validation.error.message,
			};
		}

		const { userId, newRole } = validation.data;

		// Validate role change permissions
		const roleValidation = await validateRoleChange(userId, newRole);
		if (!roleValidation.isValid) {
			return {
				success: false,
				error: roleValidation.error || "Role change not permitted",
			};
		}

		// Perform the role update
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("profiles")
			.update({ role: newRole, updated_at: new Date().toISOString() })
			.eq("id", userId)
			.select("id, email, role")
			.single();

		if (error) {
			console.error("Database error updating role:", error);
			return {
				success: false,
				error: "Failed to update user role in database",
			};
		}

		// Revalidate relevant pages
		revalidatePath("/admin");
		revalidatePath("/admin/users");

		return {
			success: true,
			data: {
				userId: data.id,
				email: data.email,
				newRole: data.role,
			},
		};
	} catch (error) {
		console.error("Unexpected error in updateUserRole:", error);
		return {
			success: false,
			error: "An unexpected error occurred while updating the user role",
		};
	}
}
