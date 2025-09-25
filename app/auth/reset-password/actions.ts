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

		// Redirect to login with success message
		redirect("/auth/login?message=Password%20updated%20successfully.%20Please%20log%20in%20with%20your%20new%20password.");
	} catch (error) {
		console.error("Unexpected password update error:", error);
		redirect("/auth/reset-password?error=An%20unexpected%20error%20occurred");
	}
}