import type { TipoDocumentoCliente } from "@/types/clienteDocumento";

// ================================================
// AUDITORÍA — Revisiones de documentos (sampling)
// ================================================

export type ResultadoRevision = "correcto" | "incorrecto";
export type ProblemaDocumento = "incorrecto" | "faltante";

/**
 * Documento observado dentro de una revisión incorrecta.
 * documento_id es null cuando el problema es 'faltante' (no existe el archivo).
 */
export type RevisionDocumentoProblema = {
	documento_id: string | null;
	tipo_documento: TipoDocumentoCliente | string;
	problema: ProblemaDocumento;
	nota?: string | null;
};

/**
 * Payload para guardar una revisión desde el cliente.
 */
export type RevisionInput = {
	client_id: string;
	client_type: string;
	nombre_cliente: string;
	resultado: ResultadoRevision;
	notas?: string;
	documentos_problema: RevisionDocumentoProblema[];
};

/**
 * Fila de auditoria_revisiones (DB).
 */
export type RevisionAuditoria = {
	id: string;
	client_id: string;
	client_type: string | null;
	nombre_cliente: string | null;
	revisado_por: string;
	fecha_revision: string;
	resultado: ResultadoRevision;
	notas: string | null;
	notificado: boolean;
	fecha_notificacion: string | null;
	notificado_a: string | null;
	created_at: string;
};

/**
 * Fila enriquecida para el reporte/historial.
 */
export type HistorialRevisionRow = RevisionAuditoria & {
	auditor_email: string | null;
	auditor_nombre: string | null;
	documentos_problema: RevisionDocumentoProblema[];
};

export type HistorialFiltros = {
	auditorId?: string;
	desde?: string; // YYYY-MM-DD
	hasta?: string; // YYYY-MM-DD
};

export type ResumenRevisiones = {
	hoy: number;
	ayer: number;
	semana: number;
	mes: number;
};

/**
 * Resultado de resolver el destinatario de la notificación (creador del cliente).
 */
export type DestinatarioNotificacion =
	| { ok: true; nombre: string; email: string }
	| { ok: false; motivo: string };

/**
 * Resultado de guardar una revisión.
 */
export type GuardarRevisionResult =
	| { success: true; revisionId: string; notificado: boolean; notificadoError?: string }
	| { success: false; error: string };

/**
 * Última revisión por cliente (para la etiqueta "Revisado hace X" en el sampler).
 */
export type UltimaRevisionCliente = {
	client_id: string;
	fecha_revision: string;
	resultado: ResultadoRevision;
};

/**
 * Auditor (rol uif) para el filtro del admin.
 */
export type AuditorUif = {
	id: string;
	email: string;
	full_name: string | null;
};
