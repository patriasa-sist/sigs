"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkPermission } from "@/utils/auth/helpers";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

const uuidSchema = z.string().uuid();

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

		// Check admin permission
		const { allowed } = await checkPermission("admin.usuarios");
		if (!allowed) {
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
		const { error: deleteProfileError } = await supabase.from("profiles").delete().eq("id", userId);

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
				error: "Failed to delete authentication record. Profile was deleted.",
			};
		}

		// Revalidate the users page to show updated list
		revalidatePath("/admin/users");

		return {
			success: true,
			message: `User ${userToDelete.email} has been successfully deleted`,
		};
	} catch (error) {
		console.error("Error deleting user:", error);
		return { success: false, error: "An unexpected error occurred" };
	}
}

export async function sendPasswordResetEmail(userId: string) {
	// Validate userId is a proper UUID before any DB query
	const uuidResult = uuidSchema.safeParse(userId);
	if (!uuidResult.success) {
		return { success: false, error: "ID de usuario inválido" };
	}

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

		// Check admin permission
		const { allowed } = await checkPermission("admin.usuarios");
		if (!allowed) {
			return { success: false, error: "Se requieren privilegios de administrador" };
		}

		// Get user to send reset email
		const { data: targetUser, error: getUserError } = await supabase
			.from("profiles")
			.select("email")
			.eq("id", uuidResult.data)
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
		const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetUser.email, {
			redirectTo: `${baseUrl}/auth/confirm`,
		});

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

// ── Gestión de datos de firmante ──────────────────────────────────────────────

const FIRMA_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const FIRMA_MIME: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
};

const datosFirmanteSchema = z.object({
	full_name: z.string().trim().max(120),
	cargo: z.string().trim().max(120),
	telefono: z.string().trim().max(30),
	acronimo: z.string().trim().max(5),
	porcentaje_comision: z.number().min(0).max(100).nullable(),
});

export type DatosFirmanteInput = z.infer<typeof datosFirmanteSchema>;

/** Verifica que el usuario actual sea admin con permiso admin.usuarios */
async function verificarAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return { ok: false, error: "Acceso no autorizado" };

	const { allowed } = await checkPermission("admin.usuarios");
	if (!allowed) return { ok: false, error: "Se requieren privilegios de administrador" };
	return { ok: true };
}

/** Actualiza los datos de firmante (nombre, cargo, teléfono, acrónimo, comisión) de un usuario */
export async function actualizarDatosFirmante(userId: string, data: DatosFirmanteInput) {
	const uuid = uuidSchema.safeParse(userId);
	if (!uuid.success) return { success: false, error: "ID de usuario inválido" };

	const parsed = datosFirmanteSchema.safeParse(data);
	if (!parsed.success) return { success: false, error: "Datos inválidos" };

	const auth = await verificarAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	try {
		const adminClient = createAdminClient();
		const { error } = await adminClient
			.from("profiles")
			.update({
				full_name: parsed.data.full_name || null,
				cargo: parsed.data.cargo || null,
				telefono: parsed.data.telefono || null,
				acronimo: parsed.data.acronimo.toUpperCase().slice(0, 5) || null,
				porcentaje_comision: parsed.data.porcentaje_comision,
			})
			.eq("id", uuid.data);

		if (error) {
			console.error("Error actualizando datos de firmante:", error);
			return { success: false, error: "No se pudieron guardar los datos" };
		}

		revalidatePath("/admin/users");
		return { success: true, message: "Datos actualizados" };
	} catch (error) {
		console.error("Error inesperado actualizando firmante:", error);
		return { success: false, error: "Ocurrió un error inesperado" };
	}
}

/** Sube (o reemplaza) la firma de un usuario al bucket perfiles-firmas y guarda la URL */
export async function subirFirma(userId: string, formData: FormData) {
	const uuid = uuidSchema.safeParse(userId);
	if (!uuid.success) return { success: false, error: "ID de usuario inválido" };

	const auth = await verificarAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const file = formData.get("firma");
	if (!(file instanceof File) || file.size === 0) {
		return { success: false, error: "No se recibió ningún archivo" };
	}
	if (file.size > FIRMA_MAX_BYTES) {
		return { success: false, error: "La firma supera el límite de 2 MB" };
	}
	const ext = FIRMA_MIME[file.type];
	if (!ext) {
		return { success: false, error: "Formato no permitido (use PNG, JPG o WEBP)" };
	}

	try {
		const adminClient = createAdminClient();
		const storagePath = `firma_${uuid.data}.${ext}`;
		const buffer = Buffer.from(await file.arrayBuffer());

		const { error: uploadError } = await adminClient.storage
			.from("perfiles-firmas")
			.upload(storagePath, buffer, { contentType: file.type, upsert: true });

		if (uploadError) {
			console.error("Error subiendo firma:", uploadError);
			return { success: false, error: "No se pudo subir la firma" };
		}

		const {
			data: { publicUrl },
		} = adminClient.storage.from("perfiles-firmas").getPublicUrl(storagePath);

		// Cache-busting: la URL pública es estable al usar upsert, así que versionamos
		const firmaUrl = `${publicUrl}?v=${Date.now()}`;

		const { error: updateError } = await adminClient
			.from("profiles")
			.update({ firma_url: firmaUrl })
			.eq("id", uuid.data);

		if (updateError) {
			console.error("Error guardando firma_url:", updateError);
			return { success: false, error: "Se subió la firma pero no se pudo guardar la URL" };
		}

		revalidatePath("/admin/users");
		return { success: true, message: "Firma actualizada", firmaUrl };
	} catch (error) {
		console.error("Error inesperado subiendo firma:", error);
		return { success: false, error: "Ocurrió un error inesperado" };
	}
}

/** Quita la firma de un usuario: borra el archivo del bucket y limpia firma_url */
export async function quitarFirma(userId: string) {
	const uuid = uuidSchema.safeParse(userId);
	if (!uuid.success) return { success: false, error: "ID de usuario inválido" };

	const auth = await verificarAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	try {
		const adminClient = createAdminClient();

		// Borrado best-effort de las variantes posibles del archivo
		const paths = Object.values(FIRMA_MIME).map((ext) => `firma_${uuid.data}.${ext}`);
		await adminClient.storage.from("perfiles-firmas").remove(paths);

		const { error: updateError } = await adminClient
			.from("profiles")
			.update({ firma_url: null })
			.eq("id", uuid.data);

		if (updateError) {
			console.error("Error limpiando firma_url:", updateError);
			return { success: false, error: "No se pudo quitar la firma" };
		}

		revalidatePath("/admin/users");
		return { success: true, message: "Firma eliminada" };
	} catch (error) {
		console.error("Error inesperado quitando firma:", error);
		return { success: false, error: "Ocurrió un error inesperado" };
	}
}
