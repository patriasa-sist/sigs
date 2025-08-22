"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
	email: z.email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
	otp: z.string().optional(), // OTP is optional for now
});

const signupSchema = z.object({
	email: z.email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function login(formData: FormData) {
	const supabase = await createClient();

	// Extract and validate form data
	const rawData = {
		email: formData.get("email") as string,
		password: formData.get("password") as string,
		otp: formData.get("otp") as string,
	};

	const validationResult = loginSchema.safeParse(rawData);

	if (!validationResult.success) {
		console.error("Validation errors:", validationResult.error);
		redirect("/auth/error?error=Invalid input data");
	}

	const { email, password, otp } = validationResult.data;

	try {
		// Attempt to sign in
		const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (authError) {
			console.error("Authentication error:", authError.message);
			redirect(`/auth/error?error=${encodeURIComponent(authError.message)}`);
		}

		if (!authData.user) {
			redirect("/auth/error?error=Authentication failed");
		}

		// Check if user has a profile (should exist due to trigger)
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("role, email")
			.eq("id", authData.user.id)
			.single();

		if (profileError) {
			console.error("Profile error:", profileError.message);
			// Create profile if it doesn't exist (fallback)
			const { error: createProfileError } = await supabase.from("profiles").insert({
				id: authData.user.id,
				email: authData.user.email!,
				role: "user",
			});

			if (createProfileError) {
				console.error("Create profile error:", createProfileError.message);
				redirect("/auth/error?error=Failed to initialize user profile");
			}
		}

		// Handle OTP verification if provided
		if (otp && otp.length === 6) {
			// Here you would implement your OTP verification logic
			// For now, we'll skip OTP verification
			console.log("OTP provided:", otp);
		}

		revalidatePath("/", "layout");

		// Redirect based on user role
		if (profile?.role === "admin") {
			redirect("/admin");
		} else {
			redirect("/dashboard");
		}
	} catch (error) {
		console.error("Unexpected login error:", error);
		redirect("/auth/error?error=An unexpected error occurred during login");
	}
}

export async function signup(formData: FormData) {
	const supabase = await createClient();

	// Extract and validate form data
	const rawData = {
		email: formData.get("email") as string,
		password: formData.get("password") as string,
	};

	const validationResult = signupSchema.safeParse(rawData);

	if (!validationResult.success) {
		console.error("Validation errors:", validationResult.error);
		redirect("/auth/error?error=Invalid input data");
	}

	const { email, password } = validationResult.data;

	try {
		// Check if there's a valid invitation for this email
		const { data: invitation } = await supabase
			.from("invitations")
			.select("*")
			.eq("email", email)
			.is("used_at", null)
			.gt("expires_at", new Date().toISOString())
			.single();

		if (!invitation) {
			redirect("/auth/error?error=Valid invitation required to create an account");
		}

		const { data: authData, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					invitation_token: invitation.token,
				},
			},
		});

		if (authError) {
			console.error("Signup error:", authError.message);
			redirect(`/auth/error?error=${encodeURIComponent(authError.message)}`);
		}

		// Mark invitation as used
		if (authData.user) {
			await supabase.from("invitations").update({ used_at: new Date().toISOString() }).eq("id", invitation.id);
		}

		revalidatePath("/", "layout");
		redirect("/auth/login?message=Please check your email to confirm your account");
	} catch (error) {
		console.error("Unexpected signup error:", error);
		redirect("/auth/error?error=An unexpected error occurred during signup");
	}
}

export async function signOut() {
	const supabase = await createClient();

	try {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Sign out error:", error.message);
			redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
		}

		revalidatePath("/", "layout");
		redirect("/auth/login");
	} catch (error) {
		console.error("Unexpected sign out error:", error);
		redirect("/auth/error?error=An unexpected error occurred during sign out");
	}
}
