"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function marcarInvitacionUsada(email: string) {
	try {
		const supabaseAdmin = createAdminClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		const { error } = await supabaseAdmin
			.from("invitations")
			.update({ used_at: new Date().toISOString() })
			.eq("email", email)
			.is("used_at", null);

		if (error) {
			console.error("Error marking invitation as used:", error);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error) {
		console.error("Unexpected error marking invitation:", error);
		return { success: false, error: "Unexpected error" };
	}
}

export async function deleteInvitationAndUser(invitationId: string, email: string) {
	try {
		// Use admin client to bypass RLS for deletion
		const supabaseAdmin = createAdminClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!
		);

		// First, check the invitation status
		const { data: invitation } = await supabaseAdmin
			.from("invitations")
			.select("used_at")
			.eq("id", invitationId)
			.single();

		if (!invitation) {
			return {
				success: false,
				error: "Invitación no encontrada",
			};
		}

		// Prevent deletion of used invitations to protect active users
		if (invitation.used_at) {
			return {
				success: false,
				error: "No se puede eliminar una invitación ya usada. El usuario asociado tiene datos en el sistema.",
			};
		}

		// Check if there's a user with this email (shouldn't exist for unused invitations)
		const { data: profile } = await supabaseAdmin
			.from("profiles")
			.select("id")
			.eq("email", email)
			.single();

		// Only delete user if invitation is unused (extra safety check)
		if (profile?.id) {
			const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);

			if (authError) {
				console.error("Error deleting user from auth:", authError);
				return {
					success: false,
					error: `Error al eliminar usuario: ${authError.message}`,
				};
			}
		}

		// Delete the invitation record
		const { error: invitationError } = await supabaseAdmin
			.from("invitations")
			.delete()
			.eq("id", invitationId);

		if (invitationError) {
			console.error("Error deleting invitation:", invitationError);
			return {
				success: false,
				error: `Error al eliminar invitación: ${invitationError.message}`,
			};
		}

		// Revalidate the page to reflect changes
		revalidatePath("/admin/invitations");
		revalidatePath("/admin");

		return {
			success: true,
			message: profile?.id
				? "Invitación y usuario asociado eliminados exitosamente"
				: "Invitación eliminada exitosamente",
		};
	} catch (error) {
		console.error("Unexpected error:", error);
		return {
			success: false,
			error: "Ocurrió un error inesperado",
		};
	}
}
