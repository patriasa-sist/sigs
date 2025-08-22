import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

// Input validation schema
const inviteSchema = z.object({
	email: z.email("Invalid email format"),
});

export async function POST(request: Request) {
	try {
		// 1. Get the user making the request
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		// 2. Check if user is admin
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		if (profileError || profile?.role !== "admin") {
			return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
		}

		// 3. Validate request body
		const body = await request.json();
		const validationResult = inviteSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
		}

		const { email } = validationResult.data;

		// 4. Check if user already exists
		const { data: existingUser } = await supabase.auth.admin.listUsers();
		const userExists = existingUser.users.some((u) => u.email === email);

		if (userExists) {
			return NextResponse.json({ error: "User already exists" }, { status: 400 });
		}

		// 5. Check if invitation already exists and is valid
		const { data: existingInvite } = await supabase
			.from("invitations")
			.select("*")
			.eq("email", email)
			.is("used_at", null)
			.gt("expires_at", new Date().toISOString())
			.single();

		if (existingInvite) {
			return NextResponse.json({ error: "Active invitation already exists for this email" }, { status: 400 });
		}

		// 6. Create invitation record
		const { data: invitation, error: inviteError } = await supabase
			.from("invitations")
			.insert({
				email,
				invited_by: user.id,
			})
			.select()
			.single();

		if (inviteError) {
			console.error("Error creating invitation:", inviteError);
			return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
		}

		// 7. Send invitation email using admin client
		const supabaseAdmin = createAdminClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const { origin } = new URL(request.url);
		const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
			redirectTo: `${origin}/auth/signup?token=${invitation.token}`,
			data: {
				invitation_token: invitation.token,
			},
		});

		if (emailError) {
			// Clean up invitation if email fails
			await supabase.from("invitations").delete().eq("id", invitation.id);

			console.error("Error sending invitation email:", emailError);
			return NextResponse.json({ error: "Failed to send invitation email" }, { status: 500 });
		}

		return NextResponse.json({
			message: "Invitation sent successfully",
			invitation: {
				id: invitation.id,
				email: invitation.email,
				expires_at: invitation.expires_at,
			},
		});
	} catch (error) {
		console.error("Unexpected error in invite API:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
