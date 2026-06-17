import type { createClient } from "@/utils/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type NombreClienteInfo = { name: string; ci: string };

/**
 * Resuelve nombre y documento de display para una lista de clientes, cubriendo
 * los 6 tipos: natural, unipersonal, jurídica, ONG, club deportivo y asociación
 * civil. Hace una consulta batcheada por tabla (sin N+1) y devuelve un Map por
 * client_id. Los ids no encontrados quedan como "Cliente Desconocido" / "-".
 */
export async function resolverNombresCliente(
	supabase: SupabaseServerClient,
	clientIds: string[],
): Promise<Map<string, NombreClienteInfo>> {
	const resultado = new Map<string, NombreClienteInfo>();
	const ids = [...new Set(clientIds.filter(Boolean))];
	if (ids.length === 0) return resultado;

	const [clientsRes, natRes, jurRes, uniRes, ongRes, clubRes, asocRes] = await Promise.all([
		supabase.from("clients").select("id, client_type").in("id", ids),
		supabase
			.from("natural_clients")
			.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
			.in("client_id", ids),
		supabase.from("juridic_clients").select("client_id, razon_social, nit").in("client_id", ids),
		supabase.from("unipersonal_clients").select("client_id, razon_social, nit").in("client_id", ids),
		supabase.from("ong_clients").select("client_id, nombre_ong, nit").in("client_id", ids),
		supabase.from("club_clients").select("client_id, nombre_club, nit").in("client_id", ids),
		supabase.from("asociacion_civil_clients").select("client_id, nombre_asociacion, nit").in("client_id", ids),
	]);

	const porClientId = <T extends { client_id: string }>(rows: T[] | null) =>
		new Map((rows ?? []).map((r) => [r.client_id, r]));
	const nat = porClientId(natRes.data);
	const jur = porClientId(jurRes.data);
	const uni = porClientId(uniRes.data);
	const ong = porClientId(ongRes.data);
	const club = porClientId(clubRes.data);
	const asoc = porClientId(asocRes.data);

	for (const c of clientsRes.data ?? []) {
		let name = "Cliente Desconocido";
		let ci = "-";
		if (c.client_type === "natural" || c.client_type === "unipersonal") {
			const nc = nat.get(c.id);
			if (nc) {
				name = [nc.primer_nombre, nc.segundo_nombre, nc.primer_apellido, nc.segundo_apellido]
					.filter(Boolean)
					.join(" ");
				ci = nc.numero_documento || "-";
			}
			if (c.client_type === "unipersonal") {
				const u = uni.get(c.id);
				if (u) {
					name = name && name !== "Cliente Desconocido" ? `${name} (${u.razon_social})` : u.razon_social;
					ci = u.nit || ci;
				}
			}
		} else if (c.client_type === "juridica") {
			const j = jur.get(c.id);
			if (j) {
				name = j.razon_social;
				ci = j.nit || "-";
			}
		} else if (c.client_type === "ong") {
			const o = ong.get(c.id);
			if (o) {
				name = o.nombre_ong;
				ci = o.nit || "-";
			}
		} else if (c.client_type === "club") {
			const cc = club.get(c.id);
			if (cc) {
				name = cc.nombre_club;
				ci = cc.nit || "-";
			}
		} else if (c.client_type === "asociacion_civil") {
			const a = asoc.get(c.id);
			if (a) {
				name = a.nombre_asociacion;
				ci = a.nit || "-";
			}
		}
		resultado.set(c.id, { name, ci });
	}
	return resultado;
}
