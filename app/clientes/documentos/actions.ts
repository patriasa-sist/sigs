/**
 * Client Documents Server Actions
 * @module app/clientes/documentos/actions
 * @description Server-side actions for managing client documents during editing
 *
 * Features:
 * - Upload new documents
 * - Replace existing documents (with version history)
 * - Get document history for audit
 * - Authorization checks based on edit permissions
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { TipoDocumentoCliente, ClienteDocumento } from "@/types/clienteDocumento";

// ============================================
// TYPES
// ============================================

export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export interface DocumentHistoryItem {
	id: string;
	version: number;
	nombre_archivo: string;
	tamano_bytes: number;
	estado: string;
	fecha_subida: string;
	replaced_at: string | null;
	subido_por_nombre: string | null;
}

export interface UploadDocumentInput {
	client_id: string;
	tipo_documento: TipoDocumentoCliente;
	file_base64: string;
	file_name: string;
	file_type: string;
	file_size: number;
	descripcion?: string;
}

export interface ReplaceDocumentInput {
	document_id: string;
	file_base64: string;
	file_name: string;
	file_type: string;
	file_size: number;
	descripcion?: string;
}

// ============================================
// AUTHORIZATION
// ============================================

/**
 * Verify the current user can edit the specified client's documents
 */
async function authorizeClientDocumentEdit(clientId: string) {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		throw new Error("No autenticado");
	}

	// Get user profile
	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.select("id, role, full_name")
		.eq("id", user.id)
		.single();

	if (profileError || !profile) {
		throw new Error("Perfil no encontrado");
	}

	// Admin can always edit
	if (profile.role === "admin") {
		return { supabase, user, profile };
	}

	// Check if user has edit permission
	const { data: hasEditPerm } = await supabase.rpc("user_has_permission", {
		p_user_id: profile.id,
		p_permission_id: "clientes.editar",
	});
	if (!hasEditPerm) {
		throw new Error("No tiene permisos para editar documentos");
	}

	// Check specific permission using database function
	const { data: canEdit, error: rpcError } = await supabase.rpc(
		"can_edit_client",
		{
			p_client_id: clientId,
			p_user_id: user.id,
		}
	);

	if (rpcError) {
		console.error("[authorizeClientDocumentEdit] RPC error:", rpcError);
		throw new Error("Error al verificar permisos");
	}

	if (!canEdit) {
		throw new Error("No tiene permiso para editar documentos de este cliente");
	}

	return { supabase, user, profile };
}

// ============================================
// UPLOAD NEW DOCUMENT
// ============================================

/**
 * Upload a new document for a client
 */
export async function uploadClientDocument(
	input: UploadDocumentInput
): Promise<ActionResult<{ id: string }>> {
	try {
		const { supabase, user } = await authorizeClientDocumentEdit(input.client_id);

		// Decode base64 file
		const fileBuffer = Buffer.from(input.file_base64, "base64");

		// Generate storage path
		const timestamp = Date.now();
		const sanitizedFileName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
		const storagePath = `${input.client_id}/${timestamp}_${sanitizedFileName}`;

		// Upload to storage
		const { error: uploadError } = await supabase.storage
			.from("clientes-documentos")
			.upload(storagePath, fileBuffer, {
				contentType: input.file_type,
				upsert: false,
			});

		if (uploadError) {
			console.error("[uploadClientDocument] Storage error:", uploadError);
			return { success: false, error: "Error al subir archivo" };
		}

		// Check if there's an existing active document of this type
		const { data: existingDoc } = await supabase
			.from("clientes_documentos")
			.select("id, version")
			.eq("client_id", input.client_id)
			.eq("tipo_documento", input.tipo_documento)
			.eq("estado", "activo")
			.single();

		let newVersion = 1;
		if (existingDoc) {
			// Mark existing as replaced
			await supabase
				.from("clientes_documentos")
				.update({
					estado: "reemplazado",
					replaced_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq("id", existingDoc.id);

			newVersion = (existingDoc.version || 1) + 1;
		}

		// Insert document record
		const { data: docData, error: insertError } = await supabase
			.from("clientes_documentos")
			.insert({
				client_id: input.client_id,
				tipo_documento: input.tipo_documento,
				nombre_archivo: input.file_name,
				tipo_archivo: input.file_type,
				tamano_bytes: input.file_size,
				storage_path: storagePath,
				storage_bucket: "clientes-documentos",
				estado: "activo",
				subido_por: user.id,
				fecha_subida: new Date().toISOString(),
				descripcion: input.descripcion || null,
				version: newVersion,
			})
			.select("id")
			.single();

		if (insertError) {
			console.error("[uploadClientDocument] Insert error:", insertError);
			// Try to clean up uploaded file
			await supabase.storage.from("clientes-documentos").remove([storagePath]);
			return { success: false, error: "Error al registrar documento" };
		}

		// Update replaced_by on the old document if exists
		if (existingDoc) {
			await supabase
				.from("clientes_documentos")
				.update({ replaced_by: docData.id })
				.eq("id", existingDoc.id);
		}

		revalidatePath("/clientes");
		return { success: true, data: { id: docData.id } };
	} catch (error) {
		console.error("[uploadClientDocument] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// REPLACE EXISTING DOCUMENT
// ============================================

/**
 * Replace an existing document with a new version
 */
export async function replaceClientDocument(
	input: ReplaceDocumentInput
): Promise<ActionResult<{ id: string }>> {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Get the existing document
		const { data: existingDoc, error: fetchError } = await supabase
			.from("clientes_documentos")
			.select("*")
			.eq("id", input.document_id)
			.eq("estado", "activo")
			.single();

		if (fetchError || !existingDoc) {
			return { success: false, error: "Documento no encontrado o no está activo" };
		}

		// Authorize edit for this client
		await authorizeClientDocumentEdit(existingDoc.client_id);

		// Decode base64 file
		const fileBuffer = Buffer.from(input.file_base64, "base64");

		// Generate storage path
		const timestamp = Date.now();
		const sanitizedFileName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
		const storagePath = `${existingDoc.client_id}/${timestamp}_${sanitizedFileName}`;

		// Upload to storage
		const { error: uploadError } = await supabase.storage
			.from("clientes-documentos")
			.upload(storagePath, fileBuffer, {
				contentType: input.file_type,
				upsert: false,
			});

		if (uploadError) {
			console.error("[replaceClientDocument] Storage error:", uploadError);
			return { success: false, error: "Error al subir archivo" };
		}

		// Insert new document with incremented version
		const { data: newDoc, error: insertError } = await supabase
			.from("clientes_documentos")
			.insert({
				client_id: existingDoc.client_id,
				tipo_documento: existingDoc.tipo_documento,
				nombre_archivo: input.file_name,
				tipo_archivo: input.file_type,
				tamano_bytes: input.file_size,
				storage_path: storagePath,
				storage_bucket: "clientes-documentos",
				estado: "activo",
				subido_por: user.id,
				fecha_subida: new Date().toISOString(),
				descripcion: input.descripcion || existingDoc.descripcion,
				version: (existingDoc.version || 1) + 1,
			})
			.select("id")
			.single();

		if (insertError) {
			console.error("[replaceClientDocument] Insert error:", insertError);
			// Clean up uploaded file
			await supabase.storage.from("clientes-documentos").remove([storagePath]);
			return { success: false, error: "Error al registrar documento" };
		}

		// Mark old document as replaced
		const { error: updateError } = await supabase
			.from("clientes_documentos")
			.update({
				estado: "reemplazado",
				replaced_by: newDoc.id,
				replaced_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", input.document_id);

		if (updateError) {
			console.error("[replaceClientDocument] Update error:", updateError);
			// The new document is created but old one isn't marked - log for manual fix
		}

		revalidatePath("/clientes");
		return { success: true, data: { id: newDoc.id } };
	} catch (error) {
		console.error("[replaceClientDocument] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET DOCUMENT HISTORY (Admin only)
// ============================================

/**
 * Get version history for a specific document type
 */
export async function getDocumentHistory(
	clientId: string,
	tipoDocumento: TipoDocumentoCliente
): Promise<ActionResult<DocumentHistoryItem[]>> {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Only admin can see full history
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		if (!profile || profile.role !== "admin") {
			return { success: false, error: "Solo administradores pueden ver el historial" };
		}

		const { data, error } = await supabase
			.from("clientes_documentos")
			.select(`
				id,
				version,
				nombre_archivo,
				tamano_bytes,
				estado,
				fecha_subida,
				replaced_at,
				subido_por,
				profiles:subido_por (full_name)
			`)
			.eq("client_id", clientId)
			.eq("tipo_documento", tipoDocumento)
			.order("version", { ascending: false });

		if (error) {
			console.error("[getDocumentHistory] Query error:", error);
			return { success: false, error: "Error al obtener historial" };
		}

		const history: DocumentHistoryItem[] = (data || []).map((doc) => {
			const profileData = doc.profiles;
			const subidoPorNombre = Array.isArray(profileData)
				? profileData[0]?.full_name
				: (profileData as { full_name: string } | null)?.full_name;

			return {
				id: doc.id,
				version: doc.version || 1,
				nombre_archivo: doc.nombre_archivo,
				tamano_bytes: doc.tamano_bytes,
				estado: doc.estado,
				fecha_subida: doc.fecha_subida,
				replaced_at: doc.replaced_at,
				subido_por_nombre: subidoPorNombre || null,
			};
		});

		return { success: true, data: history };
	} catch (error) {
		console.error("[getDocumentHistory] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// GET ACTIVE DOCUMENTS
// ============================================

/**
 * Get all active documents for a client
 */
export async function getActiveDocuments(
	clientId: string
): Promise<ActionResult<ClienteDocumento[]>> {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		const { data, error } = await supabase
			.from("clientes_documentos")
			.select("*")
			.eq("client_id", clientId)
			.eq("estado", "activo")
			.order("tipo_documento");

		if (error) {
			console.error("[getActiveDocuments] Query error:", error);
			return { success: false, error: "Error al obtener documentos" };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		console.error("[getActiveDocuments] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// DISCARD DOCUMENT
// ============================================

/**
 * Discard (soft delete) a document
 */
export async function discardClientDocument(
	documentId: string
): Promise<ActionResult<void>> {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Get document to check client
		const { data: doc, error: fetchError } = await supabase
			.from("clientes_documentos")
			.select("client_id, estado")
			.eq("id", documentId)
			.single();

		if (fetchError || !doc) {
			return { success: false, error: "Documento no encontrado" };
		}

		if (doc.estado !== "activo") {
			return { success: false, error: "Solo se pueden descartar documentos activos" };
		}

		// Authorize edit
		await authorizeClientDocumentEdit(doc.client_id);

		// Mark as discarded
		const { error: updateError } = await supabase
			.from("clientes_documentos")
			.update({
				estado: "descartado",
				descartado_por: user.id,
				fecha_descarte: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", documentId);

		if (updateError) {
			console.error("[discardClientDocument] Update error:", updateError);
			return { success: false, error: "Error al descartar documento" };
		}

		revalidatePath("/clientes");
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[discardClientDocument] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
