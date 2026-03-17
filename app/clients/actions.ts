"use server";

import { createClient } from "@/utils/supabase/server";

export type ClienteBusqueda = {
	id: string;
	nombre_completo?: string;
	razon_social?: string;
	numero_documento?: string;
	nit?: string;
	tipo: "natural" | "juridica" | "unipersonal";
};

/**
 * Busca clientes (naturales, unipersonales y jurídicos) por término de búsqueda.
 * - natural_clients cubre naturales + unipersonales (por nombre/CI)
 * - unipersonal_clients cubre búsqueda por razón social/NIT
 * - juridic_clients cubre jurídicos
 * Se deduplica por client_id.
 */
export async function buscarClientes(termino: string) {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		const terminoNormalizado = termino.trim();

		if (!terminoNormalizado) {
			return { success: true, clientes: [] };
		}

		const patron = `%${terminoNormalizado}%`;

		// 1. natural_clients: cubre naturales y unipersonales por nombre/documento
		const { data: naturalClients, error: errorNat } = await supabase
			.from("natural_clients")
			.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento, clients!inner(status, client_type)")
			.eq("clients.status", "active")
			.or(
				`primer_nombre.ilike.${patron},` +
				`segundo_nombre.ilike.${patron},` +
				`primer_apellido.ilike.${patron},` +
				`segundo_apellido.ilike.${patron},` +
				`numero_documento.ilike.${patron}`
			)
			.limit(20);

		if (errorNat) {
			throw new Error(`Error buscando clientes naturales: ${errorNat.message}`);
		}

		// 2. unipersonal_clients: cubre búsqueda por razón social/NIT
		const { data: unipersonalClients, error: errorUni } = await supabase
			.from("unipersonal_clients")
			.select("client_id, razon_social, nit, clients!inner(status)")
			.eq("clients.status", "active")
			.or(`razon_social.ilike.${patron},nit.ilike.${patron}`)
			.limit(20);

		if (errorUni) {
			throw new Error(`Error buscando clientes unipersonales: ${errorUni.message}`);
		}

		// 3. juridic_clients
		const { data: juridicClients, error: errorJur } = await supabase
			.from("juridic_clients")
			.select("client_id, razon_social, nit, clients!inner(status)")
			.eq("clients.status", "active")
			.or(`razon_social.ilike.${patron},nit.ilike.${patron}`)
			.limit(20);

		if (errorJur) {
			throw new Error(`Error buscando clientes jurídicos: ${errorJur.message}`);
		}

		// Deduplicar por client_id
		const vistos = new Set<string>();
		const resultados: ClienteBusqueda[] = [];

		// Naturales (incluye unipersonales buscados por nombre)
		if (naturalClients) {
			for (const nc of naturalClients) {
				if (vistos.has(nc.client_id)) continue;
				vistos.add(nc.client_id);

				const nombres = [nc.primer_nombre, nc.segundo_nombre].filter(Boolean).join(" ");
				const apellidos = [nc.primer_apellido, nc.segundo_apellido].filter(Boolean).join(" ");
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const clientType = (nc.clients as any)?.client_type;

				resultados.push({
					id: nc.client_id,
					nombre_completo: `${nombres} ${apellidos}`.trim(),
					numero_documento: nc.numero_documento || undefined,
					tipo: clientType === "unipersonal" ? "unipersonal" : "natural",
				});
			}
		}

		// Unipersonales encontrados por razón social/NIT (que no hayan salido por nombre)
		if (unipersonalClients) {
			for (const uc of unipersonalClients) {
				if (vistos.has(uc.client_id)) continue;
				vistos.add(uc.client_id);

				resultados.push({
					id: uc.client_id,
					razon_social: uc.razon_social,
					nit: uc.nit || undefined,
					tipo: "unipersonal",
				});
			}
		}

		// Jurídicos
		if (juridicClients) {
			for (const jc of juridicClients) {
				if (vistos.has(jc.client_id)) continue;
				vistos.add(jc.client_id);

				resultados.push({
					id: jc.client_id,
					razon_social: jc.razon_social,
					nit: jc.nit || undefined,
					tipo: "juridica",
				});
			}
		}

		return { success: true, clientes: resultados.slice(0, 20) };
	} catch (error) {
		console.error("Error buscando clientes:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
