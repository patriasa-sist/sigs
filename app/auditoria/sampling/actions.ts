"use server";

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/utils/auth/helpers";
import type { ClienteDocumento, TipoDocumentoCliente } from "@/types/clienteDocumento";
import { REQUIRED_DOCUMENTS } from "@/types/clienteDocumento";

// ================================================
// TYPES
// ================================================

export type ClienteSampling = {
	id: string;
	client_type: "natural" | "juridica" | "unipersonal";
	status: string;
	nombre_display: string;
	created_at: string;
};

export type ClienteSamplingDetalle = ClienteSampling & {
	documentos: ClienteDocumento[];
	documentos_requeridos: TipoDocumentoCliente[];
	documentos_subidos: TipoDocumentoCliente[];
	documentos_faltantes: TipoDocumentoCliente[];
};

// ================================================
// SERVER ACTIONS
// ================================================

/**
 * Fetch 3 random clients for document sampling audit.
 * Uses Supabase's random ordering with limit.
 */
export async function obtenerMuestraAleatoria(): Promise<ClienteSampling[]> {
	await requirePermission("auditoria.ver");

	const supabase = await createClient();

	// Get 3 random clients with their display name
	const { data: clients, error } = await supabase
		.from("clients")
		.select(
			`
			id,
			client_type,
			status,
			created_at,
			natural_clients (primer_nombre, primer_apellido),
			juridic_clients (razon_social),
			unipersonal_clients (nombre_propietario, apellido_propietario, razon_social)
		`
		)
		.eq("status", "active")
		.order("id") // needed before limit with random workaround
		.limit(100); // fetch a pool to randomize from

	if (error || !clients || clients.length === 0) {
		console.error("[obtenerMuestraAleatoria] Error:", error);
		return [];
	}

	// Shuffle and pick 3 client-side (Supabase doesn't support ORDER BY random())
	const shuffled = clients.sort(() => Math.random() - 0.5);
	const sample = shuffled.slice(0, Math.min(3, shuffled.length));

	return sample.map((c) => {
		const natural = Array.isArray(c.natural_clients)
			? c.natural_clients[0]
			: c.natural_clients;
		const juridic = Array.isArray(c.juridic_clients)
			? c.juridic_clients[0]
			: c.juridic_clients;
		const unipersonal = Array.isArray(c.unipersonal_clients)
			? c.unipersonal_clients[0]
			: c.unipersonal_clients;

		let nombre_display = "Sin nombre";
		if (c.client_type === "natural" && natural) {
			nombre_display = `${natural.primer_nombre} ${natural.primer_apellido}`;
		} else if (c.client_type === "juridica" && juridic) {
			nombre_display = juridic.razon_social;
		} else if (c.client_type === "unipersonal" && unipersonal) {
			nombre_display = unipersonal.razon_social || `${unipersonal.nombre_propietario} ${unipersonal.apellido_propietario}`;
		}

		return {
			id: c.id,
			client_type: c.client_type as "natural" | "juridica" | "unipersonal",
			status: c.status,
			nombre_display,
			created_at: c.created_at,
		};
	});
}

/**
 * Fetch complete document details for a specific client for sampling audit.
 * Returns documents uploaded vs required, with storage paths for preview.
 */
export async function obtenerDetalleSampling(
	clientId: string
): Promise<ClienteSamplingDetalle | null> {
	await requirePermission("auditoria.ver");

	const supabase = await createClient();

	// Fetch client base info
	const { data: client, error: clientError } = await supabase
		.from("clients")
		.select(
			`
			id,
			client_type,
			status,
			created_at,
			natural_clients (primer_nombre, primer_apellido),
			juridic_clients (razon_social),
			unipersonal_clients (nombre_propietario, apellido_propietario, razon_social)
		`
		)
		.eq("id", clientId)
		.single();

	if (clientError || !client) {
		console.error("[obtenerDetalleSampling] Client error:", clientError);
		return null;
	}

	// Fetch active documents
	const { data: documentos, error: docError } = await supabase
		.from("clientes_documentos")
		.select("*")
		.eq("client_id", clientId)
		.eq("estado", "activo")
		.order("tipo_documento");

	if (docError) {
		console.error("[obtenerDetalleSampling] Documents error:", docError);
	}

	// Build display name
	const natural = Array.isArray(client.natural_clients)
		? client.natural_clients[0]
		: client.natural_clients;
	const juridic = Array.isArray(client.juridic_clients)
		? client.juridic_clients[0]
		: client.juridic_clients;
	const unipersonal = Array.isArray(client.unipersonal_clients)
		? client.unipersonal_clients[0]
		: client.unipersonal_clients;

	let nombre_display = "Sin nombre";
	const clientType = client.client_type as "natural" | "juridica" | "unipersonal";
	if (clientType === "natural" && natural) {
		nombre_display = `${natural.primer_nombre} ${natural.primer_apellido}`;
	} else if (clientType === "juridica" && juridic) {
		nombre_display = juridic.razon_social;
	} else if (clientType === "unipersonal" && unipersonal) {
		nombre_display = unipersonal.razon_social || `${unipersonal.nombre_propietario} ${unipersonal.apellido_propietario}`;
	}

	const docs = (documentos || []) as ClienteDocumento[];
	const documentos_requeridos = [...REQUIRED_DOCUMENTS[clientType]] as TipoDocumentoCliente[];
	const documentos_subidos = docs.map((d) => d.tipo_documento);
	const documentos_faltantes = documentos_requeridos.filter(
		(req) => !documentos_subidos.includes(req)
	);

	return {
		id: client.id,
		client_type: clientType,
		status: client.status,
		nombre_display,
		created_at: client.created_at,
		documentos: docs,
		documentos_requeridos,
		documentos_subidos,
		documentos_faltantes,
	};
}
