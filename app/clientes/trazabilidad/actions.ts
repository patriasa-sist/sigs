/**
 * Client Audit Trail Server Actions
 * @module app/clientes/trazabilidad/actions
 * @description Server-side actions for retrieving client audit trail data
 *
 * Features:
 * - Client creation history
 * - Modification history
 * - Permission grant/revoke history
 * - Document upload/replacement history
 */

"use server";

import { createClient } from "@/utils/supabase/server";

// ============================================
// TYPES
// ============================================

export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export type AuditEventType =
	| "client_created"
	| "client_modified"
	| "field_changed"
	| "permission_granted"
	| "permission_revoked"
	| "permission_expired"
	| "document_uploaded"
	| "document_replaced"
	| "document_discarded";

export interface AuditEvent {
	id: string;
	type: AuditEventType;
	timestamp: string;
	user_id: string | null;
	user_name: string | null;
	user_email: string | null;
	description: string;
	details?: Record<string, unknown>;
}

export interface ClientAuditTrail {
	client_id: string;
	client_name: string;
	client_type: "natural" | "juridica" | "unipersonal";
	events: AuditEvent[];
	summary: {
		created_at: string;
		created_by_name: string | null;
		last_modified_at: string | null;
		last_modified_by_name: string | null;
		total_permissions_granted: number;
		total_documents_uploaded: number;
		total_field_changes: number;
	};
}

// Field name translations for display
const FIELD_TRANSLATIONS: Record<string, string> = {
	primer_nombre: "Primer nombre",
	segundo_nombre: "Segundo nombre",
	primer_apellido: "Primer apellido",
	segundo_apellido: "Segundo apellido",
	tipo_documento: "Tipo de documento",
	numero_documento: "Número de documento",
	extension_ci: "Extensión CI",
	nacionalidad: "Nacionalidad",
	fecha_nacimiento: "Fecha de nacimiento",
	estado_civil: "Estado civil",
	genero: "Género",
	direccion: "Dirección",
	celular: "Celular",
	correo_electronico: "Correo electrónico",
	profesion_oficio: "Profesión/Oficio",
	actividad_economica: "Actividad económica",
	lugar_trabajo: "Lugar de trabajo",
	cargo: "Cargo",
	nivel_ingresos: "Nivel de ingresos",
	nit: "NIT",
	domicilio_comercial: "Domicilio comercial",
	razon_social: "Razón social",
	tipo_sociedad: "Tipo de sociedad",
	matricula_comercio: "Matrícula de comercio",
	pais_constitucion: "País de constitución",
	direccion_legal: "Dirección legal",
	telefono: "Teléfono",
	telefono_comercial: "Teléfono comercial",
	correo_electronico_comercial: "Correo comercial",
	actividad_economica_comercial: "Actividad económica comercial",
	nombre_representante: "Nombre del representante",
	ci_representante: "CI del representante",
};

// ============================================
// MAIN ACTION
// ============================================

/**
 * Get complete audit trail for a client
 */
export async function getClientAuditTrail(
	clientId: string
): Promise<ActionResult<ClientAuditTrail>> {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Get user role
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		// Only admin can see full audit trail
		if (!profile || profile.role !== "admin") {
			return { success: false, error: "Solo administradores pueden ver la trazabilidad" };
		}

		// 1. Get base client data with creator info
		const { data: clientData, error: clientError } = await supabase
			.from("clients")
			.select(`
				id,
				client_type,
				status,
				created_at,
				updated_at,
				created_by,
				updated_by,
				natural_clients (primer_nombre, primer_apellido),
				juridic_clients (razon_social),
				unipersonal_clients (razon_social)
			`)
			.eq("id", clientId)
			.single();

		if (clientError || !clientData) {
			console.error("[getClientAuditTrail] Client error:", clientError);
			return { success: false, error: "Cliente no encontrado" };
		}

		// 2. Get creator info separately
		let creatorData: { full_name: string; email: string } | null = null;
		if (clientData.created_by) {
			const { data: creator } = await supabase
				.from("profiles")
				.select("full_name, email")
				.eq("id", clientData.created_by)
				.single();
			creatorData = creator;
		}

		// 3. Get modifier info separately (only if updated_by exists)
		let modifierData: { full_name: string; email: string } | null = null;
		if (clientData.updated_by) {
			const { data: modifier } = await supabase
				.from("profiles")
				.select("full_name, email")
				.eq("id", clientData.updated_by)
				.single();
			modifierData = modifier;
		}

		// Get client name based on type
		let clientName = "Cliente";
		const naturalData = Array.isArray(clientData.natural_clients)
			? clientData.natural_clients[0]
			: clientData.natural_clients;
		const juridicData = Array.isArray(clientData.juridic_clients)
			? clientData.juridic_clients[0]
			: clientData.juridic_clients;
		const unipersonalData = Array.isArray(clientData.unipersonal_clients)
			? clientData.unipersonal_clients[0]
			: clientData.unipersonal_clients;

		if (clientData.client_type === "natural" && naturalData) {
			clientName = `${naturalData.primer_nombre} ${naturalData.primer_apellido}`;
		} else if (clientData.client_type === "juridica" && juridicData) {
			clientName = juridicData.razon_social;
		} else if (clientData.client_type === "unipersonal" && unipersonalData) {
			clientName = unipersonalData.razon_social;
		}

		const events: AuditEvent[] = [];

		// 2. Add creation event
		events.push({
			id: `creation-${clientData.id}`,
			type: "client_created",
			timestamp: clientData.created_at,
			user_id: clientData.created_by,
			user_name: creatorData?.full_name || null,
			user_email: creatorData?.email || null,
			description: `Cliente creado`,
			details: { client_type: clientData.client_type },
		});

		// 3. Add last modification event (if different from creation)
		if (
			clientData.updated_at &&
			clientData.updated_at !== clientData.created_at &&
			clientData.updated_by
		) {
			events.push({
				id: `modification-${clientData.id}`,
				type: "client_modified",
				timestamp: clientData.updated_at,
				user_id: clientData.updated_by,
				user_name: modifierData?.full_name || null,
				user_email: modifierData?.email || null,
				description: `Datos del cliente modificados`,
			});
		}

		// 4. Get permission history
		const { data: permissionHistory } = await supabase
			.from("client_edit_permissions")
			.select(`
				id,
				granted_at,
				granted_by,
				expires_at,
				revoked_at,
				revoked_by,
				notes,
				user:profiles!user_id (full_name, email),
				granter:profiles!granted_by (full_name, email),
				revoker:profiles!revoked_by (full_name, email)
			`)
			.eq("client_id", clientId)
			.order("granted_at", { ascending: false });

		let totalPermissionsGranted = 0;

		if (permissionHistory) {
			for (const perm of permissionHistory) {
				const userData = Array.isArray(perm.user) ? perm.user[0] : perm.user;
				const granterData = Array.isArray(perm.granter) ? perm.granter[0] : perm.granter;
				const revokerData = Array.isArray(perm.revoker) ? perm.revoker[0] : perm.revoker;

				totalPermissionsGranted++;

				// Permission granted event
				events.push({
					id: `perm-granted-${perm.id}`,
					type: "permission_granted",
					timestamp: perm.granted_at,
					user_id: perm.granted_by,
					user_name: granterData?.full_name || null,
					user_email: granterData?.email || null,
					description: `Permiso de edición otorgado a ${userData?.full_name || "usuario desconocido"}`,
					details: {
						target_user: userData?.full_name,
						target_email: userData?.email,
						expires_at: perm.expires_at,
						notes: perm.notes,
					},
				});

				// Permission revoked event (if applicable)
				if (perm.revoked_at && perm.revoked_by) {
					events.push({
						id: `perm-revoked-${perm.id}`,
						type: "permission_revoked",
						timestamp: perm.revoked_at,
						user_id: perm.revoked_by,
						user_name: revokerData?.full_name || null,
						user_email: revokerData?.email || null,
						description: `Permiso de edición revocado a ${userData?.full_name || "usuario desconocido"}`,
						details: {
							target_user: userData?.full_name,
							notes: perm.notes,
						},
					});
				}

				// Permission expired event (if applicable)
				if (perm.expires_at && !perm.revoked_at) {
					const expirationDate = new Date(perm.expires_at);
					if (expirationDate < new Date()) {
						events.push({
							id: `perm-expired-${perm.id}`,
							type: "permission_expired",
							timestamp: perm.expires_at,
							user_id: null,
							user_name: null,
							user_email: null,
							description: `Permiso de edición expirado para ${userData?.full_name || "usuario desconocido"}`,
							details: {
								target_user: userData?.full_name,
							},
						});
					}
				}
			}
		}

		// 5. Get document history
		const { data: documentHistory } = await supabase
			.from("clientes_documentos")
			.select(`
				id,
				tipo_documento,
				nombre_archivo,
				estado,
				version,
				fecha_subida,
				subido_por,
				replaced_at,
				fecha_descarte,
				descartado_por,
				uploader:profiles!subido_por (full_name, email),
				discarder:profiles!descartado_por (full_name, email)
			`)
			.eq("client_id", clientId)
			.order("fecha_subida", { ascending: false });

		let totalDocumentsUploaded = 0;

		if (documentHistory) {
			for (const doc of documentHistory) {
				const uploaderData = Array.isArray(doc.uploader) ? doc.uploader[0] : doc.uploader;
				const discarderData = Array.isArray(doc.discarder) ? doc.discarder[0] : doc.discarder;

				totalDocumentsUploaded++;

				// Document uploaded event
				if (doc.version === 1) {
					events.push({
						id: `doc-upload-${doc.id}`,
						type: "document_uploaded",
						timestamp: doc.fecha_subida,
						user_id: doc.subido_por,
						user_name: uploaderData?.full_name || null,
						user_email: uploaderData?.email || null,
						description: `Documento subido: ${doc.nombre_archivo}`,
						details: {
							tipo_documento: doc.tipo_documento,
							nombre_archivo: doc.nombre_archivo,
							version: doc.version,
						},
					});
				} else {
					// Document replaced (new version)
					events.push({
						id: `doc-replace-${doc.id}`,
						type: "document_replaced",
						timestamp: doc.fecha_subida,
						user_id: doc.subido_por,
						user_name: uploaderData?.full_name || null,
						user_email: uploaderData?.email || null,
						description: `Documento reemplazado: ${doc.nombre_archivo} (v${doc.version})`,
						details: {
							tipo_documento: doc.tipo_documento,
							nombre_archivo: doc.nombre_archivo,
							version: doc.version,
						},
					});
				}

				// Document discarded event (if applicable)
				if (doc.estado === "descartado" && doc.fecha_descarte) {
					events.push({
						id: `doc-discard-${doc.id}`,
						type: "document_discarded",
						timestamp: doc.fecha_descarte,
						user_id: doc.descartado_por,
						user_name: discarderData?.full_name || null,
						user_email: discarderData?.email || null,
						description: `Documento descartado: ${doc.nombre_archivo}`,
						details: {
							tipo_documento: doc.tipo_documento,
							nombre_archivo: doc.nombre_archivo,
						},
					});
				}
			}
		}

		// 6. Get field change history from clientes_historial_ediciones
		let totalFieldChanges = 0;
		const { data: fieldHistory } = await supabase
			.from("clientes_historial_ediciones")
			.select(`
				id,
				tabla_modificada,
				tipo_cambio,
				campo_modificado,
				valor_anterior,
				valor_nuevo,
				fecha_modificacion,
				modificado_por,
				modifier:profiles!modificado_por (full_name, email)
			`)
			.eq("client_id", clientId)
			.eq("tipo_cambio", "modificacion")
			.order("fecha_modificacion", { ascending: false });

		if (fieldHistory) {
			for (const change of fieldHistory) {
				const modifierInfo = Array.isArray(change.modifier) ? change.modifier[0] : change.modifier;
				totalFieldChanges++;

				const fieldName = change.campo_modificado || "campo desconocido";
				const fieldLabel = FIELD_TRANSLATIONS[fieldName] || fieldName;

				events.push({
					id: `field-change-${change.id}`,
					type: "field_changed",
					timestamp: change.fecha_modificacion,
					user_id: change.modificado_por,
					user_name: modifierInfo?.full_name || null,
					user_email: modifierInfo?.email || null,
					description: `Campo "${fieldLabel}" modificado`,
					details: {
						campo: fieldLabel,
						valor_anterior: change.valor_anterior,
						valor_nuevo: change.valor_nuevo,
						tabla: change.tabla_modificada,
					},
				});
			}
		}

		// Sort events by timestamp (most recent first)
		events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		const result: ClientAuditTrail = {
			client_id: clientId,
			client_name: clientName,
			client_type: clientData.client_type as "natural" | "juridica" | "unipersonal",
			events,
			summary: {
				created_at: clientData.created_at,
				created_by_name: creatorData?.full_name || null,
				last_modified_at: clientData.updated_at !== clientData.created_at ? clientData.updated_at : null,
				last_modified_by_name:
					clientData.updated_at !== clientData.created_at ? modifierData?.full_name || null : null,
				total_permissions_granted: totalPermissionsGranted,
				total_documents_uploaded: totalDocumentsUploaded,
				total_field_changes: totalFieldChanges,
			},
		};

		return { success: true, data: result };
	} catch (error) {
		console.error("[getClientAuditTrail] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
