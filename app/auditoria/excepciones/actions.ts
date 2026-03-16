"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser, requirePermission } from "@/utils/auth/helpers";
import { revalidatePath } from "next/cache";
import {
	type TipoDocumentoCliente,
	type ExcepcionDocumento,
	type ExcepcionDocumentoVista,
	NON_EXCEPTABLE_DOCUMENTS,
	ALL_DOCUMENT_TYPES,
} from "@/types/clienteDocumento";

// ============================================================================
// Otorgar excepción (UIF/Admin only)
// ============================================================================

export async function otorgarExcepcion(data: {
	userId: string;
	tipoDocumento: TipoDocumentoCliente | TipoDocumentoCliente[];
	motivo: string;
}): Promise<{ success: boolean; error?: string; count?: number }> {
	const profile = await requirePermission("auditoria.excepciones");

	// Normalize to array
	const documentos = Array.isArray(data.tipoDocumento) ? data.tipoDocumento : [data.tipoDocumento];

	if (documentos.length === 0) {
		return { success: false, error: "Seleccione al menos un documento." };
	}

	// Validate all document types
	for (const doc of documentos) {
		if (!(doc in ALL_DOCUMENT_TYPES)) {
			return { success: false, error: `Tipo de documento inválido: ${doc}` };
		}
		if (NON_EXCEPTABLE_DOCUMENTS.includes(doc)) {
			return {
				success: false,
				error: `El documento "${ALL_DOCUMENT_TYPES[doc]}" no puede ser exceptuado. Es obligatorio por normativa.`,
			};
		}
	}

	// Validate motivo
	if (!data.motivo || data.motivo.trim().length < 10) {
		return { success: false, error: "El motivo debe tener al menos 10 caracteres." };
	}

	const supabase = await createClient();

	// Check for duplicates
	const { data: existing } = await supabase
		.from("document_exceptions")
		.select("tipo_documento")
		.eq("user_id", data.userId)
		.in("tipo_documento", documentos)
		.eq("estado", "activa");

	if (existing && existing.length > 0) {
		const dupes = existing.map((e) => ALL_DOCUMENT_TYPES[e.tipo_documento as TipoDocumentoCliente] || e.tipo_documento);
		return {
			success: false,
			error: `Ya existen excepciones activas para: ${dupes.join(", ")}`,
		};
	}

	// Insert all exceptions
	const rows = documentos.map((doc) => ({
		user_id: data.userId,
		tipo_documento: doc,
		motivo: data.motivo.trim(),
		otorgado_por: profile.id,
	}));

	const { error } = await supabase.from("document_exceptions").insert(rows);

	if (error) {
		console.error("Error otorgando excepción:", error);
		return { success: false, error: "Error al otorgar la(s) excepción(es)." };
	}

	revalidatePath("/auditoria");
	return { success: true, count: documentos.length };
}

// ============================================================================
// Revocar excepción (UIF/Admin only)
// ============================================================================

export async function revocarExcepcion(
	exceptionId: string
): Promise<{ success: boolean; error?: string }> {
	const profile = await requirePermission("auditoria.excepciones");
	const supabase = await createClient();

	// Verify exception exists and is active
	const { data: exception } = await supabase
		.from("document_exceptions")
		.select("id, estado")
		.eq("id", exceptionId)
		.single();

	if (!exception) {
		return { success: false, error: "Excepción no encontrada." };
	}

	if (exception.estado !== "activa") {
		return { success: false, error: "Solo se pueden revocar excepciones activas." };
	}

	const { error } = await supabase
		.from("document_exceptions")
		.update({
			estado: "revocada",
			revocado_por: profile.id,
			fecha_revocacion: new Date().toISOString(),
		})
		.eq("id", exceptionId);

	if (error) {
		console.error("Error revocando excepción:", error);
		return { success: false, error: "Error al revocar la excepción." };
	}

	revalidatePath("/auditoria");
	return { success: true };
}

// ============================================================================
// Obtener excepciones del usuario actual (para formulario de cliente)
// ============================================================================

export async function obtenerMisExcepciones(): Promise<ExcepcionDocumento[]> {
	const user = await getCurrentUser();
	if (!user) return [];

	const supabase = await createClient();
	const { data, error } = await supabase
		.from("document_exceptions")
		.select("*")
		.eq("user_id", user.id)
		.eq("estado", "activa");

	if (error) {
		console.error("Error obteniendo excepciones:", error);
		return [];
	}

	return (data ?? []) as ExcepcionDocumento[];
}

// ============================================================================
// Consumir excepciones al crear cliente
// ============================================================================

export async function consumirExcepciones(
	documentosFaltantes: TipoDocumentoCliente[],
	clientId: string
): Promise<{ success: boolean; error?: string }> {
	const user = await getCurrentUser();
	if (!user) return { success: false, error: "No autenticado." };

	if (documentosFaltantes.length === 0) return { success: true };

	const supabase = await createClient();

	// Find active exceptions for the missing documents
	const { data: activeExceptions, error: fetchError } = await supabase
		.from("document_exceptions")
		.select("id, tipo_documento")
		.eq("user_id", user.id)
		.eq("estado", "activa")
		.in("tipo_documento", documentosFaltantes);

	if (fetchError) {
		console.error("Error buscando excepciones activas:", fetchError);
		return { success: false, error: "Error al consumir excepciones." };
	}

	if (!activeExceptions || activeExceptions.length === 0) return { success: true };

	// Mark each matching exception as used
	const ids = activeExceptions.map((e) => e.id);
	const { error: updateError } = await supabase
		.from("document_exceptions")
		.update({
			estado: "usada",
			usado_en_client_id: clientId,
			fecha_uso: new Date().toISOString(),
		})
		.in("id", ids);

	if (updateError) {
		console.error("Error consumiendo excepciones:", updateError);
		return { success: false, error: "Error al registrar uso de excepciones." };
	}

	return { success: true };
}

// ============================================================================
// Obtener todas las excepciones (para UI de auditoría - UIF/Admin)
// ============================================================================

export async function obtenerExcepcionesCompletas(filtros?: {
	estado?: "activa" | "usada" | "revocada";
	userId?: string;
}): Promise<ExcepcionDocumentoVista[]> {
	await requirePermission("auditoria.excepciones");
	const supabase = await createClient();

	let query = supabase
		.from("document_exceptions_vista")
		.select("*")
		.order("created_at", { ascending: false })
		.limit(200);

	if (filtros?.estado) {
		query = query.eq("estado", filtros.estado);
	}

	if (filtros?.userId) {
		query = query.eq("user_id", filtros.userId);
	}

	const { data, error } = await query;

	if (error) {
		console.error("Error obteniendo excepciones:", error);
		return [];
	}

	return (data ?? []) as ExcepcionDocumentoVista[];
}

// ============================================================================
// Obtener usuarios operativos (para el selector de usuario en el form)
// ============================================================================

export async function obtenerUsuariosOperativos(): Promise<
	{ id: string; email: string; role: string; full_name: string | null }[]
> {
	await requirePermission("auditoria.excepciones");
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("profiles")
		.select("id, email, role, full_name")
		.not("role", "in", '("invitado","desactivado","uif")')
		.order("full_name");

	if (error) {
		console.error("Error obteniendo usuarios:", error);
		return [];
	}

	return data ?? [];
}
