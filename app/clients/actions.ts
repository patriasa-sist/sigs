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

		const palabras = terminoNormalizado.split(/\s+/).filter(Boolean);
		const patronCompleto = `%${terminoNormalizado}%`;

		// 1. natural_clients: búsqueda multi-palabra (AND por palabra, OR por campo)
		let naturalQuery = supabase
			.from("natural_clients")
			.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento, clients!inner(status, client_type)")
			.eq("clients.status", "active");
		for (const p of palabras) {
			naturalQuery = naturalQuery.or(
				`primer_nombre.ilike.%${p}%,segundo_nombre.ilike.%${p}%,primer_apellido.ilike.%${p}%,segundo_apellido.ilike.%${p}%,numero_documento.ilike.%${p}%`
			);
		}

		// Ejecutar búsquedas en paralelo
		const [
			{ data: naturalClients, error: errorNat },
			{ data: unipersonalClients, error: errorUni },
			{ data: juridicClients, error: errorJur },
			{ data: vehiculosData },
		] = await Promise.all([
			naturalQuery.limit(20),
			supabase.from("unipersonal_clients")
				.select("client_id, razon_social, nit, clients!inner(status)")
				.eq("clients.status", "active")
				.or(`razon_social.ilike.${patronCompleto},nit.ilike.${patronCompleto}`)
				.limit(20),
			supabase.from("juridic_clients")
				.select("client_id, razon_social, nit, clients!inner(status)")
				.eq("clients.status", "active")
				.or(`razon_social.ilike.${patronCompleto},nit.ilike.${patronCompleto}`)
				.limit(20),
			supabase.from("polizas_automotor_vehiculos")
				.select("poliza_id, polizas(client_id)")
				.ilike("placa", patronCompleto)
				.limit(10),
		]);

		if (errorNat) throw new Error(`Error buscando clientes naturales: ${errorNat.message}`);
		if (errorUni) throw new Error(`Error buscando clientes unipersonales: ${errorUni.message}`);
		if (errorJur) throw new Error(`Error buscando clientes jurídicos: ${errorJur.message}`);

		// Recolectar client_ids encontrados por placa
		const clientIdsDeVehiculos = (vehiculosData ?? [])
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.map((v) => (v.polizas as any)?.client_id as string | undefined)
			.filter((id): id is string => !!id);

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

		// Clientes encontrados por placa de vehículo (aún no procesados)
		const idsNuevosDeVehiculos = clientIdsDeVehiculos.filter((id) => !vistos.has(id));
		if (idsNuevosDeVehiculos.length > 0) {
			const [{ data: natVeh }, { data: uniVeh }, { data: jurVeh }] = await Promise.all([
				supabase.from("natural_clients")
					.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento, clients!inner(status, client_type)")
					.in("client_id", idsNuevosDeVehiculos),
				supabase.from("unipersonal_clients")
					.select("client_id, razon_social, nit")
					.in("client_id", idsNuevosDeVehiculos),
				supabase.from("juridic_clients")
					.select("client_id, razon_social, nit")
					.in("client_id", idsNuevosDeVehiculos),
			]);

			for (const nc of natVeh ?? []) {
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
			for (const uc of uniVeh ?? []) {
				if (vistos.has(uc.client_id)) continue;
				vistos.add(uc.client_id);
				resultados.push({ id: uc.client_id, razon_social: uc.razon_social, nit: uc.nit || undefined, tipo: "unipersonal" });
			}
			for (const jc of jurVeh ?? []) {
				if (vistos.has(jc.client_id)) continue;
				vistos.add(jc.client_id);
				resultados.push({ id: jc.client_id, razon_social: jc.razon_social, nit: jc.nit || undefined, tipo: "juridica" });
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
