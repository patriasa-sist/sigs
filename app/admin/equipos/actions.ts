"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/utils/auth/helpers";

// ============================================
// TYPES
// ============================================

export interface EquipoMiembro {
	user_id: string;
	rol_equipo: "lider" | "miembro";
	added_at: string;
	// Joined from profiles
	user_email: string;
	user_full_name: string | null;
	user_role: string;
}

export interface Equipo {
	id: string;
	nombre: string;
	descripcion: string | null;
	created_at: string;
	miembros: EquipoMiembro[];
}

export interface UsuarioDisponible {
	id: string;
	email: string;
	full_name: string | null;
	role: string;
}

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

// ============================================
// AUTHORIZATION
// ============================================

async function requireAdminEquipos() {
	const { allowed, profile } = await checkPermission("admin.equipos");
	if (!allowed || !profile) {
		throw new Error("No tiene permisos para gestionar equipos");
	}
	return profile;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Obtiene todos los equipos con sus miembros
 */
export async function obtenerEquipos(): Promise<ActionResult<Equipo[]>> {
	try {
		await requireAdminEquipos();
		const supabase = await createClient();

		const { data: equipos, error: equiposError } = await supabase
			.from("equipos")
			.select("id, nombre, descripcion, created_at")
			.order("nombre");

		if (equiposError) {
			return { success: false, error: equiposError.message };
		}

		if (!equipos || equipos.length === 0) {
			return { success: true, data: [] };
		}

		const equipoIds = equipos.map((e) => e.id);

		const { data: miembros, error: miembrosError } = await supabase
			.from("equipo_miembros")
			.select("equipo_id, user_id, rol_equipo, added_at")
			.in("equipo_id", equipoIds);

		if (miembrosError) {
			return { success: false, error: miembrosError.message };
		}

		// Get profile info for all members
		const userIds = [...new Set((miembros || []).map((m) => m.user_id))];
		let profilesMap: Record<string, { email: string; full_name: string | null; role: string }> = {};

		if (userIds.length > 0) {
			const { data: profiles } = await supabase
				.from("profiles")
				.select("id, email, full_name, role")
				.in("id", userIds);

			if (profiles) {
				profilesMap = Object.fromEntries(
					profiles.map((p) => [p.id, { email: p.email, full_name: p.full_name, role: p.role }])
				);
			}
		}

		const result: Equipo[] = equipos.map((e) => ({
			...e,
			miembros: (miembros || [])
				.filter((m) => m.equipo_id === e.id)
				.map((m) => ({
					user_id: m.user_id,
					rol_equipo: m.rol_equipo as "lider" | "miembro",
					added_at: m.added_at,
					user_email: profilesMap[m.user_id]?.email || "",
					user_full_name: profilesMap[m.user_id]?.full_name || null,
					user_role: profilesMap[m.user_id]?.role || "",
				})),
		}));

		return { success: true, data: result };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtiene usuarios disponibles para agregar a equipos (agentes, comerciales y siniestros)
 */
export async function obtenerUsuariosDisponibles(): Promise<ActionResult<UsuarioDisponible[]>> {
	try {
		await requireAdminEquipos();
		const supabase = await createClient();

		const { data, error } = await supabase
			.from("profiles")
			.select("id, email, full_name, role")
			.in("role", ["agente", "comercial", "siniestros"])
			.order("role")
			.order("full_name");

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Crear un nuevo equipo
 */
export async function crearEquipo(
	nombre: string,
	descripcion?: string
): Promise<ActionResult<{ id: string }>> {
	try {
		const profile = await requireAdminEquipos();
		const supabase = await createClient();

		const trimmedNombre = nombre.trim();
		if (!trimmedNombre) {
			return { success: false, error: "El nombre del equipo es requerido" };
		}

		const { data, error } = await supabase
			.from("equipos")
			.insert({
				nombre: trimmedNombre,
				descripcion: descripcion?.trim() || null,
				created_by: profile.id,
			})
			.select("id")
			.single();

		if (error) {
			if (error.code === "23505") {
				return { success: false, error: `Ya existe un equipo con el nombre "${trimmedNombre}"` };
			}
			return { success: false, error: error.message };
		}

		revalidatePath("/admin/equipos");
		return { success: true, data: { id: data.id } };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Eliminar un equipo (CASCADE elimina miembros)
 */
export async function eliminarEquipo(equipoId: string): Promise<ActionResult<null>> {
	try {
		await requireAdminEquipos();
		const supabase = await createClient();

		const { error } = await supabase.from("equipos").delete().eq("id", equipoId);

		if (error) {
			return { success: false, error: error.message };
		}

		revalidatePath("/admin/equipos");
		return { success: true, data: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Agregar un miembro a un equipo
 */
export async function agregarMiembro(
	equipoId: string,
	userId: string,
	rolEquipo: "lider" | "miembro" = "miembro"
): Promise<ActionResult<null>> {
	try {
		const profile = await requireAdminEquipos();
		const supabase = await createClient();

		const { error } = await supabase.from("equipo_miembros").insert({
			equipo_id: equipoId,
			user_id: userId,
			rol_equipo: rolEquipo,
			added_by: profile.id,
		});

		if (error) {
			if (error.code === "23505") {
				return { success: false, error: "Este usuario ya es miembro del equipo" };
			}
			return { success: false, error: error.message };
		}

		revalidatePath("/admin/equipos");
		return { success: true, data: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Remover un miembro de un equipo
 */
export async function removerMiembro(
	equipoId: string,
	userId: string
): Promise<ActionResult<null>> {
	try {
		await requireAdminEquipos();
		const supabase = await createClient();

		const { error } = await supabase
			.from("equipo_miembros")
			.delete()
			.eq("equipo_id", equipoId)
			.eq("user_id", userId);

		if (error) {
			return { success: false, error: error.message };
		}

		revalidatePath("/admin/equipos");
		return { success: true, data: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Cambiar rol de un miembro dentro del equipo
 */
export async function cambiarRolMiembro(
	equipoId: string,
	userId: string,
	nuevoRol: "lider" | "miembro"
): Promise<ActionResult<null>> {
	try {
		await requireAdminEquipos();
		const supabase = await createClient();

		const { error } = await supabase
			.from("equipo_miembros")
			.update({ rol_equipo: nuevoRol })
			.eq("equipo_id", equipoId)
			.eq("user_id", userId);

		if (error) {
			return { success: false, error: error.message };
		}

		revalidatePath("/admin/equipos");
		return { success: true, data: null };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
