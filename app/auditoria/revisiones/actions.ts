"use server";

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/utils/auth/helpers";
import { ALL_DOCUMENT_TYPES, type TipoDocumentoCliente } from "@/types/clienteDocumento";
import { enviarEmailDocumentosIncorrectos } from "@/utils/resend";
import type {
	RevisionInput,
	GuardarRevisionResult,
	DestinatarioNotificacion,
	HistorialFiltros,
	HistorialRevisionRow,
	ResumenRevisiones,
	UltimaRevisionCliente,
	AuditorUif,
	RevisionDocumentoProblema,
} from "@/types/auditoria";

const CLIENT_TYPE_LABELS: Record<string, string> = {
	natural: "Persona Natural",
	juridica: "Persona Jurídica",
	unipersonal: "Empresa Unipersonal",
	ong: "ONG",
	club: "Club Deportivo",
	asociacion_civil: "Asociación Civil",
};

function docLabel(tipo: string): string {
	return ALL_DOCUMENT_TYPES[tipo as TipoDocumentoCliente] || tipo;
}

// ================================================
// Destinatario de notificación (creador del cliente)
// ================================================

export async function obtenerDestinatarioNotificacion(clientId: string): Promise<DestinatarioNotificacion> {
	await requirePermission("auditoria.ver");
	const supabase = await createClient();

	const { data: client, error } = await supabase.from("clients").select("created_by").eq("id", clientId).single();

	if (error || !client) {
		return { ok: false, motivo: "No se pudo cargar el cliente." };
	}

	if (!client.created_by) {
		return {
			ok: false,
			motivo: "El cliente no tiene un creador registrado. No es posible notificar automáticamente.",
		};
	}

	const { data: creador } = await supabase
		.from("profiles")
		.select("full_name, email")
		.eq("id", client.created_by)
		.single();

	if (!creador?.email) {
		return {
			ok: false,
			motivo: "El creador del cliente no tiene un correo registrado.",
		};
	}

	return { ok: true, nombre: creador.full_name || creador.email, email: creador.email };
}

// ================================================
// Guardar revisión (correcta o incorrecta + notificación)
// ================================================

async function enviarNotificacion(params: {
	clientId: string;
	clienteNombre: string;
	clientType: string;
	auditorNombre: string;
	documentos: RevisionDocumentoProblema[];
	notas?: string | null;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
	const destino = await obtenerDestinatarioNotificacion(params.clientId);
	if (!destino.ok) {
		return { ok: false, error: destino.motivo };
	}

	const documentosIncorrectos = params.documentos
		.filter((d) => d.problema === "incorrecto")
		.map((d) => ({ label: docLabel(d.tipo_documento), nota: d.nota }));
	const documentosFaltantes = params.documentos
		.filter((d) => d.problema === "faltante")
		.map((d) => docLabel(d.tipo_documento));

	try {
		await enviarEmailDocumentosIncorrectos({
			destinatario: { nombre: destino.nombre, email: destino.email },
			cliente: {
				nombre: params.clienteNombre,
				tipo: CLIENT_TYPE_LABELS[params.clientType] || params.clientType,
			},
			auditor: params.auditorNombre,
			documentosIncorrectos,
			documentosFaltantes,
			notas: params.notas,
		});
		return { ok: true, email: destino.email };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "Error al enviar el correo.",
		};
	}
}

export async function guardarRevision(input: RevisionInput): Promise<GuardarRevisionResult> {
	const profile = await requirePermission("auditoria.ver");
	const supabase = await createClient();

	// Nombre del auditor para el correo
	const { data: auditorProfile } = await supabase
		.from("profiles")
		.select("full_name, email")
		.eq("id", profile.id)
		.single();
	const auditorNombre = auditorProfile?.full_name || auditorProfile?.email || "Auditoría";

	const esIncorrecta = input.resultado === "incorrecto";

	// Para revisiones incorrectas, validar destinatario ANTES de guardar
	if (esIncorrecta) {
		const destino = await obtenerDestinatarioNotificacion(input.client_id);
		if (!destino.ok) {
			return { success: false, error: destino.motivo };
		}
	}

	// Insertar revisión
	const { data: revision, error: insertError } = await supabase
		.from("auditoria_revisiones")
		.insert({
			client_id: input.client_id,
			client_type: input.client_type,
			nombre_cliente: input.nombre_cliente,
			revisado_por: profile.id,
			resultado: input.resultado,
			notas: input.notas || null,
		})
		.select("id")
		.single();

	if (insertError || !revision) {
		console.error("[guardarRevision] insert error:", insertError);
		return { success: false, error: "No se pudo guardar la revisión." };
	}

	// Insertar documentos problemáticos
	if (input.documentos_problema.length > 0) {
		const { error: docsError } = await supabase.from("auditoria_revision_documentos").insert(
			input.documentos_problema.map((d) => ({
				revision_id: revision.id,
				documento_id: d.documento_id,
				tipo_documento: d.tipo_documento,
				problema: d.problema,
				nota: d.nota || null,
			})),
		);
		if (docsError) {
			console.error("[guardarRevision] docs insert error:", docsError);
		}
	}

	// Revisión correcta: no hay notificación
	if (!esIncorrecta) {
		return { success: true, revisionId: revision.id, notificado: false };
	}

	// Revisión incorrecta: enviar correo y marcar notificado
	const envio = await enviarNotificacion({
		clientId: input.client_id,
		clienteNombre: input.nombre_cliente,
		clientType: input.client_type,
		auditorNombre,
		documentos: input.documentos_problema,
		notas: input.notas,
	});

	if (!envio.ok) {
		return {
			success: true,
			revisionId: revision.id,
			notificado: false,
			notificadoError: envio.error,
		};
	}

	await supabase
		.from("auditoria_revisiones")
		.update({
			notificado: true,
			fecha_notificacion: new Date().toISOString(),
			notificado_a: envio.email,
		})
		.eq("id", revision.id);

	return { success: true, revisionId: revision.id, notificado: true };
}

// ================================================
// Reintento de notificación
// ================================================

export async function reintentarNotificacion(revisionId: string): Promise<GuardarRevisionResult> {
	const profile = await requirePermission("auditoria.ver");
	const supabase = await createClient();

	const { data: revision, error } = await supabase
		.from("auditoria_revisiones")
		.select("id, client_id, client_type, nombre_cliente, notas, notificado")
		.eq("id", revisionId)
		.single();

	if (error || !revision) {
		return { success: false, error: "No se encontró la revisión." };
	}
	if (revision.notificado) {
		return { success: true, revisionId: revision.id, notificado: true };
	}

	const { data: docs } = await supabase
		.from("auditoria_revision_documentos")
		.select("documento_id, tipo_documento, problema, nota")
		.eq("revision_id", revisionId);

	const { data: auditorProfile } = await supabase
		.from("profiles")
		.select("full_name, email")
		.eq("id", profile.id)
		.single();
	const auditorNombre = auditorProfile?.full_name || auditorProfile?.email || "Auditoría";

	const envio = await enviarNotificacion({
		clientId: revision.client_id,
		clienteNombre: revision.nombre_cliente || "Cliente",
		clientType: revision.client_type || "",
		auditorNombre,
		documentos: (docs || []) as RevisionDocumentoProblema[],
		notas: revision.notas,
	});

	if (!envio.ok) {
		return { success: true, revisionId: revision.id, notificado: false, notificadoError: envio.error };
	}

	await supabase
		.from("auditoria_revisiones")
		.update({
			notificado: true,
			fecha_notificacion: new Date().toISOString(),
			notificado_a: envio.email,
		})
		.eq("id", revisionId);

	return { success: true, revisionId: revision.id, notificado: true };
}

// ================================================
// Última revisión por cliente (etiqueta en sampler)
// ================================================

export async function obtenerUltimasRevisiones(clientIds: string[]): Promise<UltimaRevisionCliente[]> {
	await requirePermission("auditoria.ver");
	if (clientIds.length === 0) return [];
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("auditoria_revisiones")
		.select("client_id, fecha_revision, resultado")
		.in("client_id", clientIds)
		.order("fecha_revision", { ascending: false });

	if (error || !data) return [];

	const latest = new Map<string, UltimaRevisionCliente>();
	for (const row of data) {
		if (!latest.has(row.client_id)) {
			latest.set(row.client_id, {
				client_id: row.client_id,
				fecha_revision: row.fecha_revision,
				resultado: row.resultado,
			});
		}
	}
	return Array.from(latest.values());
}

// ================================================
// Historial de revisiones (reporte)
// ================================================

export async function obtenerHistorialRevisiones(filtros: HistorialFiltros = {}): Promise<HistorialRevisionRow[]> {
	const profile = await requirePermission("auditoria.ver");
	const supabase = await createClient();
	const isAdmin = profile.role === "admin";

	let query = supabase.from("auditoria_revisiones").select("*").order("fecha_revision", { ascending: false });

	// Solo admin puede filtrar por auditor; uif está limitado a lo suyo por RLS
	if (isAdmin && filtros.auditorId) {
		query = query.eq("revisado_por", filtros.auditorId);
	}
	if (filtros.desde) query = query.gte("fecha_revision", `${filtros.desde}T00:00:00`);
	if (filtros.hasta) query = query.lte("fecha_revision", `${filtros.hasta}T23:59:59`);

	const { data: revisiones, error } = await query;
	if (error || !revisiones) {
		console.error("[obtenerHistorialRevisiones] error:", error);
		return [];
	}
	if (revisiones.length === 0) return [];

	const revisionIds = revisiones.map((r) => r.id);
	const auditorIds = Array.from(new Set(revisiones.map((r) => r.revisado_por)));

	const [{ data: docs }, { data: auditores }] = await Promise.all([
		supabase
			.from("auditoria_revision_documentos")
			.select("revision_id, documento_id, tipo_documento, problema, nota")
			.in("revision_id", revisionIds),
		supabase.from("profiles").select("id, email, full_name").in("id", auditorIds),
	]);

	const docsByRevision = new Map<string, RevisionDocumentoProblema[]>();
	for (const d of docs || []) {
		const arr = docsByRevision.get(d.revision_id) || [];
		arr.push({
			documento_id: d.documento_id,
			tipo_documento: d.tipo_documento,
			problema: d.problema,
			nota: d.nota,
		});
		docsByRevision.set(d.revision_id, arr);
	}

	const auditorById = new Map((auditores || []).map((a) => [a.id, a]));

	return revisiones.map((r) => {
		const auditor = auditorById.get(r.revisado_por);
		return {
			...r,
			auditor_email: auditor?.email ?? null,
			auditor_nombre: auditor?.full_name ?? null,
			documentos_problema: docsByRevision.get(r.id) || [],
		};
	});
}

// ================================================
// Resumen (hoy / ayer / semana / mes)
// ================================================

export async function obtenerResumenRevisiones(auditorId?: string): Promise<ResumenRevisiones> {
	const profile = await requirePermission("auditoria.ver");
	const supabase = await createClient();
	const isAdmin = profile.role === "admin";

	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfYesterday = new Date(startOfToday);
	startOfYesterday.setDate(startOfYesterday.getDate() - 1);
	// Inicio de semana (lunes)
	const startOfWeek = new Date(startOfToday);
	const dow = (startOfToday.getDay() + 6) % 7; // 0 = lunes
	startOfWeek.setDate(startOfWeek.getDate() - dow);
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const earliest = new Date(Math.min(startOfYesterday.getTime(), startOfWeek.getTime(), startOfMonth.getTime()));

	let query = supabase
		.from("auditoria_revisiones")
		.select("fecha_revision")
		.gte("fecha_revision", earliest.toISOString());
	if (isAdmin && auditorId) query = query.eq("revisado_por", auditorId);

	const { data, error } = await query;
	if (error || !data) return { hoy: 0, ayer: 0, semana: 0, mes: 0 };

	const resumen: ResumenRevisiones = { hoy: 0, ayer: 0, semana: 0, mes: 0 };
	for (const row of data) {
		const f = new Date(row.fecha_revision);
		if (f >= startOfToday) resumen.hoy++;
		else if (f >= startOfYesterday) resumen.ayer++;
		if (f >= startOfWeek) resumen.semana++;
		if (f >= startOfMonth) resumen.mes++;
	}
	return resumen;
}

// ================================================
// Auditores uif (filtro para admin)
// ================================================

export async function obtenerAuditoresUif(): Promise<AuditorUif[]> {
	const profile = await requirePermission("auditoria.ver");
	if (profile.role !== "admin") return [];
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("profiles")
		.select("id, email, full_name")
		.eq("role", "uif")
		.order("email");

	if (error || !data) return [];
	return data;
}
