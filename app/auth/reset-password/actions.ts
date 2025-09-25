"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const updatePasswordSchema = z.object({
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.regex(/(?=.*[A-Z])/, "At least one uppercase character required")
		.regex(/(?=.*[a-z])/, "At least one lowercase character required")
		.regex(/(?=.*\d)/, "At least one digit required")
		.regex(/[$&+,:;=?@#|'<>.^*()%!-]/, "At least one special character required"),
});

export async function updatePassword(formData: FormData) {
	const supabase = await createClient();

	// Extract and validate form data
	const rawData = {
		password: formData.get("password") as string,
	};

	const validationResult = updatePasswordSchema.safeParse(rawData);

	if (!validationResult.success) {
		console.error("Validation errors:", validationResult.error);
		const errorMessage = validationResult.error.issues[0]?.message || "Invalid password format";
		redirect(`/auth/reset-password?error=${encodeURIComponent(errorMessage)}`);
	}

	const { password } = validationResult.data;

	try {
		// First check if we have a valid session
		const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

		if (sessionError || !sessionData.session) {
			console.error("Session error:", sessionError?.message || "No active session");
			redirect(
				"/auth/reset-password?error=Session%20expired.%20Please%20use%20the%20password%20reset%20link%20again."
			);
		}

		console.log("Sesion encontrada! actualizando contraseña de usuario:", sessionData.session.user.id);

		// Update the user's password
		const { data, error } = await supabase.auth.updateUser({
			password: password,
		});

		if (error) {
			console.error("Password update error:", error.message);
			redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
		}

		if (!data.user) {
			redirect("/auth/reset-password?error=User%20not%20found");
		}

		console.log("Password updated successfully for user:", data.user.id);

		// Return success instead of redirect
		return { success: true, message: "Password updated successfully" };
	} catch (error) {
		console.error("Unexpected password update error:", error);
		redirect("/auth/reset-password?error=An%20unexpected%20error%20occurred");
	}
}
