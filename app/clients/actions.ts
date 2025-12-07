"use server";

import { createClient } from "@/utils/supabase/server";

export type ClienteBusqueda = {
	id: string;
	nombre_completo?: string;
	razon_social?: string;
	numero_documento?: string;
	nit?: string;
	tipo: "natural" | "juridica";
};

/**
 * Busca clientes (naturales y jurídicos) por término de búsqueda
 */
export async function buscarClientes(termino: string) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Normalizar término de búsqueda
		const terminoNormalizado = termino.trim().toLowerCase();

		if (!terminoNormalizado) {
			return { success: true, clientes: [] };
		}

		// Buscar en clientes base
		const { data: clients } = await supabase
			.from("clients")
			.select("id, client_type")
			.limit(50);

		if (!clients || clients.length === 0) {
			return { success: true, clientes: [] };
		}

		const clientIds = clients.map((c) => c.id);

		// Buscar en clientes naturales
		const { data: naturalClients } = await supabase
			.from("natural_clients")
			.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
			.in("client_id", clientIds);

		// Buscar en clientes jurídicos
		const { data: juridicClients } = await supabase
			.from("juridic_clients")
			.select("client_id, razon_social, nit")
			.in("client_id", clientIds);

		// Mapear y filtrar resultados
		const resultados: ClienteBusqueda[] = [];

		// Procesar clientes naturales
		if (naturalClients) {
			for (const naturalClient of naturalClients) {
				const nombres = [naturalClient.primer_nombre, naturalClient.segundo_nombre]
					.filter(Boolean)
					.join(" ");
				const apellidos = [naturalClient.primer_apellido, naturalClient.segundo_apellido]
					.filter(Boolean)
					.join(" ");
				const nombreCompleto = `${nombres} ${apellidos}`.trim().toLowerCase();
				const documento = (naturalClient.numero_documento || "").toLowerCase();

				// Filtrar por término de búsqueda
				if (
					nombreCompleto.includes(terminoNormalizado) ||
					documento.includes(terminoNormalizado)
				) {
					resultados.push({
						id: naturalClient.client_id,
						nombre_completo: `${nombres} ${apellidos}`.trim(),
						numero_documento: naturalClient.numero_documento || undefined,
						tipo: "natural",
					});
				}
			}
		}

		// Procesar clientes jurídicos
		if (juridicClients) {
			for (const juridicClient of juridicClients) {
				const razonSocial = (juridicClient.razon_social || "").toLowerCase();
				const nit = (juridicClient.nit || "").toLowerCase();

				// Filtrar por término de búsqueda
				if (razonSocial.includes(terminoNormalizado) || nit.includes(terminoNormalizado)) {
					resultados.push({
						id: juridicClient.client_id,
						razon_social: juridicClient.razon_social,
						nit: juridicClient.nit || undefined,
						tipo: "juridica",
					});
				}
			}
		}

		// Limitar a 20 resultados
		const resultadosLimitados = resultados.slice(0, 20);

		return { success: true, clientes: resultadosLimitados };
	} catch (error) {
		console.error("Error buscando clientes:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
