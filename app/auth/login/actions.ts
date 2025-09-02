"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

	// Attempt to sign in
	const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (authError) {
		console.error("Authentication error:", authError.message);
		const errorMsg = encodeURIComponent(authError.message);
		redirect(`/auth/error?error=${errorMsg}`);
	}

	if (!authData.user) {
		console.error("User Auth Data error");
		redirect("/auth/error?error=Authentication%20failed");
	}

	// Check if user has a profile using admin client to bypass RLS policies
	const supabaseAdmin = createAdminClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	const { data: profile, error: profileError } = await supabaseAdmin
		.from("profiles")
		.select("role, email")
		.eq("id", authData.user.id)
		.single();

	let userProfile = profile;

	if (profileError) {
		console.error("Profile error:", profileError.message);
		// Create or update profile if it doesn't exist (using admin client to bypass RLS)
		const { error: upsertProfileError } = await supabaseAdmin.from("profiles").upsert(
			{
				id: authData.user.id,
				email: authData.user.email!,
				role: "user",
			},
			{
				onConflict: "id",
			}
		);

		if (upsertProfileError) {
			console.error("Upsert profile error:", upsertProfileError.message);
			const errorMsg = encodeURIComponent(upsertProfileError.message);
			redirect(`/auth/error?error=${errorMsg}`);
		}

		// Set default profile data since upsert was successful
		userProfile = { role: "user", email: authData.user.email! };
	}

	// Handle OTP verification if provided
	if (otp && otp.length === 6) {
		// Here you would implement your OTP verification logic
		// For now, we'll skip OTP verification
		console.log("OTP provided:", otp);
	}

	revalidatePath("/", "layout");

	// Redirect based on user role
	if (userProfile?.role === "admin") {
		console.log("Redirecting to admin dashboard");
		redirect("/admin");
	} else {
		redirect("/");
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

	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error("Sign out error:", error.message);
		redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
	}

	revalidatePath("/", "layout");
	redirect("/auth/login");
}
