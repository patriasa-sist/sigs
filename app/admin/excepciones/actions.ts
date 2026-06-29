"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Roles operativos que pueden cubrirse con una ventana de excepción. Son los
 * roles que dan de alta clientes; una ventana los exime de los documentos
 * obligatorios durante una carga retroactiva.
 */
export const ROLES_VENTANA = ["comercial", "agente"] as const;
export type RolVentana = (typeof ROLES_VENTANA)[number];

export interface UsuarioOption {
	id: string;
	nombre: string;
	role: string;
}

export interface VentanaRow {
	id: string;
	motivo: string;
	roles: string[];
	/** null → ventana por rol; array → ventana acotada a esos usuarios. */
	usuarios: string[] | null;
	inicio: string;
	fin: string;
	activo: boolean;
	created_at: string;
	creador_nombre: string | null;
	/** Nombres resueltos de los usuarios acotados (solo si usuarios != null). */
	usuarios_nombres: UsuarioOption[];
	/** activo && now ∈ [inicio, fin). */
	vigente: boolean;
	/** Clientes cargados bajo esta ventana (bloquea el borrado si > 0). */
	clientes_cargados: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Garantiza que el usuario actual es admin. Misma política que el resto de las
 * operaciones críticas (eliminación de clientes, reversión de pagos).
 */
async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { ok: false, error: "No autenticado." };

	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
	if (profile?.role !== "admin") {
		return { ok: false, error: "Solo administradores pueden gestionar ventanas de excepción." };
	}
	return { ok: true, userId: user.id };
}

/** Usuarios operativos seleccionables para acotar una ventana por persona. */
export async function listarUsuariosParaVentana(): Promise<ActionResult<UsuarioOption[]>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const admin = createAdminClient();
	const { data, error } = await admin
		.from("profiles")
		.select("id, full_name, role")
		.in("role", ROLES_VENTANA as unknown as string[])
		.order("full_name", { ascending: true });

	if (error) {
		console.error("[admin/excepciones] Error cargando usuarios:", error);
		return { success: false, error: "No se pudieron cargar los usuarios." };
	}

	const opciones: UsuarioOption[] = (data ?? []).map((u) => ({
		id: u.id,
		nombre: u.full_name || "—",
		role: u.role,
	}));
	return { success: true, data: opciones };
}

/** Lista todas las ventanas con su estado, creador y usuarios resueltos. */
export async function listarVentanas(): Promise<ActionResult<VentanaRow[]>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const admin = createAdminClient();
	const { data: ventanas, error } = await admin
		.from("document_exception_windows")
		.select("id, motivo, roles, usuarios, inicio, fin, activo, created_at, creado_por")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("[admin/excepciones] Error cargando ventanas:", error);
		return { success: false, error: "No se pudieron cargar las ventanas." };
	}

	const filas = ventanas ?? [];

	// Resolver nombres: creadores + usuarios acotados, en una sola consulta.
	const ids = new Set<string>();
	for (const v of filas) {
		if (v.creado_por) ids.add(v.creado_por);
		for (const u of v.usuarios ?? []) ids.add(u);
	}
	const nombrePorId = new Map<string, UsuarioOption>();
	if (ids.size > 0) {
		const { data: perfiles } = await admin
			.from("profiles")
			.select("id, full_name, role")
			.in("id", [...ids]);
		for (const p of perfiles ?? []) {
			nombrePorId.set(p.id, { id: p.id, nombre: p.full_name || "—", role: p.role });
		}
	}

	// Conteo de clientes cargados por ventana (para bloquear borrado).
	const conteoPorVentana = new Map<string, number>();
	const ventanaIds = filas.map((v) => v.id);
	if (ventanaIds.length > 0) {
		const { data: clientes } = await admin
			.from("clients")
			.select("carga_retroactiva_window_id")
			.in("carga_retroactiva_window_id", ventanaIds);
		for (const c of clientes ?? []) {
			const wid = c.carga_retroactiva_window_id as string | null;
			if (!wid) continue;
			conteoPorVentana.set(wid, (conteoPorVentana.get(wid) ?? 0) + 1);
		}
	}

	const ahora = Date.now();
	const rows: VentanaRow[] = filas.map((v) => {
		const inicioMs = new Date(v.inicio).getTime();
		const finMs = new Date(v.fin).getTime();
		return {
			id: v.id,
			motivo: v.motivo,
			roles: v.roles ?? [],
			usuarios: v.usuarios ?? null,
			inicio: v.inicio,
			fin: v.fin,
			activo: v.activo,
			created_at: v.created_at,
			creador_nombre: v.creado_por ? (nombrePorId.get(v.creado_por)?.nombre ?? null) : null,
			usuarios_nombres: (v.usuarios ?? [])
				.map((id: string) => nombrePorId.get(id))
				.filter((u: UsuarioOption | undefined): u is UsuarioOption => Boolean(u)),
			vigente: v.activo && ahora >= inicioMs && ahora < finMs,
			clientes_cargados: conteoPorVentana.get(v.id) ?? 0,
		};
	});

	return { success: true, data: rows };
}

export interface CrearVentanaInput {
	motivo: string;
	tipo: "rol" | "usuario";
	roles: string[];
	usuarios: string[];
	dias: number;
}

/** Crea una ventana nueva (por rol o acotada a usuarios) vigente por `dias` días. */
export async function crearVentana(input: CrearVentanaInput): Promise<ActionResult<null>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const motivo = input.motivo.trim();
	if (motivo.length < 5) return { success: false, error: "El motivo debe tener al menos 5 caracteres." };

	const dias = Math.floor(Number(input.dias));
	if (!Number.isFinite(dias) || dias < 1 || dias > 90) {
		return { success: false, error: "La duración debe estar entre 1 y 90 días." };
	}

	let roles: string[] = [];
	let usuarios: string[] | null = null;

	if (input.tipo === "usuario") {
		usuarios = [...new Set(input.usuarios)].filter(Boolean);
		if (usuarios.length === 0) return { success: false, error: "Seleccioná al menos un usuario." };
		roles = []; // Ignorado por la función de evaluación cuando usuarios != null.
	} else {
		const validos = new Set<string>(ROLES_VENTANA);
		roles = [...new Set(input.roles)].filter((r) => validos.has(r));
		if (roles.length === 0) return { success: false, error: "Seleccioná al menos un rol." };
		usuarios = null;
	}

	const admin = createAdminClient();
	const ahora = new Date();
	const fin = new Date(ahora.getTime() + dias * DIA_MS);

	const { error } = await admin.from("document_exception_windows").insert({
		motivo,
		roles,
		usuarios,
		inicio: ahora.toISOString(),
		fin: fin.toISOString(),
		activo: true,
		creado_por: auth.userId,
	});

	if (error) {
		console.error("[admin/excepciones] Error creando ventana:", error);
		// Pista habitual: la columna `usuarios` aún no existe (migración pendiente).
		const falta = /usuarios/.test(error.message) && /column/i.test(error.message);
		return {
			success: false,
			error: falta
				? "Falta la columna 'usuarios'. Ejecutá docs/migration_ventana_excepcion_por_usuario.sql primero."
				: "No se pudo crear la ventana.",
		};
	}

	revalidatePath("/admin/excepciones");
	return { success: true, data: null };
}

/** Reabre/extiende una ventana: fin = now() + dias, activo = true. */
export async function extenderVentana(id: string, dias: number): Promise<ActionResult<null>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const d = Math.floor(Number(dias));
	if (!Number.isFinite(d) || d < 1 || d > 90) {
		return { success: false, error: "La duración debe estar entre 1 y 90 días." };
	}

	const admin = createAdminClient();
	const fin = new Date(Date.now() + d * DIA_MS);
	const { error } = await admin
		.from("document_exception_windows")
		.update({ fin: fin.toISOString(), activo: true })
		.eq("id", id);

	if (error) {
		console.error("[admin/excepciones] Error extendiendo ventana:", error);
		return { success: false, error: "No se pudo extender la ventana." };
	}

	revalidatePath("/admin/excepciones");
	return { success: true, data: null };
}

/** Cierra (desactiva) una ventana de inmediato. No borra nada. */
export async function cerrarVentana(id: string): Promise<ActionResult<null>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const admin = createAdminClient();
	const { error } = await admin.from("document_exception_windows").update({ activo: false }).eq("id", id);

	if (error) {
		console.error("[admin/excepciones] Error cerrando ventana:", error);
		return { success: false, error: "No se pudo cerrar la ventana." };
	}

	revalidatePath("/admin/excepciones");
	return { success: true, data: null };
}

/**
 * Elimina una ventana de forma permanente. Bloqueado si hay clientes cargados
 * bajo ella (la FK clients.carga_retroactiva_window_id la referencia); en ese
 * caso conviene cerrarla en vez de borrarla, para preservar la trazabilidad.
 */
export async function eliminarVentana(id: string): Promise<ActionResult<null>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const admin = createAdminClient();

	const { count } = await admin
		.from("clients")
		.select("*", { count: "exact", head: true })
		.eq("carga_retroactiva_window_id", id);

	if ((count ?? 0) > 0) {
		return {
			success: false,
			error: `No se puede eliminar: ${count} cliente(s) se cargaron bajo esta ventana. Cerrala en su lugar.`,
		};
	}

	const { error } = await admin.from("document_exception_windows").delete().eq("id", id);
	if (error) {
		console.error("[admin/excepciones] Error eliminando ventana:", error);
		return { success: false, error: "No se pudo eliminar la ventana." };
	}

	revalidatePath("/admin/excepciones");
	return { success: true, data: null };
}
