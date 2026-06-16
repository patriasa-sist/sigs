"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface ClienteAdminRow {
	client_id: string;
	client_type: string;
	nombre: string;
	documento: string;
	status: string;
	polizas_count: number;
	asegurado_count: number;
}

export interface ResumenEliminacionCliente {
	client_id: string;
	client_type: string;
	nombre: string;
	documento: string;
	status: string;
	/** Suma de involucramiento en pólizas (titular + asegurado en pólizas ajenas). Si > 0, bloquea. */
	polizas_titular: number;
	asegurado_en_polizas: number;
	bloqueado: boolean;
	motivos_bloqueo: string[];
	// Rastro que se borrará si se elimina
	documentos: number;
	auditorias: number;
	telefonos: number;
	conyuges: number;
	representantes: number;
	historial: number;
}

export interface EliminarClienteResultado {
	nombre: string;
	documento: string;
	documentos_borrados: number;
	archivos_storage_borrados: number;
	auditorias_borradas: number;
}

/**
 * Tablas donde un cliente puede figurar como ASEGURADO dentro de una póliza
 * (de otro titular). Aparecer en cualquiera de ellas cuenta como tener una
 * póliza en el sistema y por lo tanto bloquea el borrado. `polizas` (titular)
 * se cuenta aparte.
 */
const TABLAS_ASEGURADO = [
	"polizas_aeronavegacion_asegurados",
	"polizas_asegurados_nivel",
	"polizas_incendio_asegurados",
	"polizas_riesgos_varios_asegurados",
	"polizas_salud_asegurados",
	"polizas_anexos_asegurados_nivel",
	"polizas_anexos_salud_asegurados",
] as const;

/**
 * Garantiza que el usuario actual es admin. Utilidad destructiva de uso
 * exclusivo de administradores (mismo criterio que la eliminación nuclear de
 * pólizas y la reversión de pagos).
 */
async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { ok: false, error: "No autenticado." };

	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
	if (profile?.role !== "admin") {
		return { ok: false, error: "Solo administradores pueden eliminar clientes." };
	}
	return { ok: true, userId: user.id };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function primero<T>(rel: any): T | null {
	if (!rel) return null;
	return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Construye nombre + documento legibles a partir de un cliente con sus subtablas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nombreYDocumento(c: any): { nombre: string; documento: string } {
	const nat = primero<{ primer_nombre?: string; primer_apellido?: string; numero_documento?: string }>(
		c.natural_clients,
	);
	const jur = primero<{ razon_social?: string; nit?: string }>(c.juridic_clients);
	const uni = primero<{ razon_social?: string; nit?: string }>(c.unipersonal_clients);
	const ong = primero<{ nombre_ong?: string; nit?: string }>(c.ong_clients);
	const club = primero<{ nombre_club?: string; nit?: string }>(c.club_clients);
	const asoc = primero<{ nombre_asociacion?: string; nit?: string }>(c.asociacion_civil_clients);

	switch (c.client_type) {
		case "natural":
			return {
				nombre: nat ? `${nat.primer_nombre ?? ""} ${nat.primer_apellido ?? ""}`.trim() || "—" : "—",
				documento: nat?.numero_documento || "—",
			};
		case "unipersonal":
			return { nombre: uni?.razon_social || "—", documento: uni?.nit || "—" };
		case "juridica":
			return { nombre: jur?.razon_social || "—", documento: jur?.nit || "—" };
		case "ong":
			return { nombre: ong?.nombre_ong || "—", documento: ong?.nit || "—" };
		case "club_deportivo":
			return { nombre: club?.nombre_club || "—", documento: club?.nit || "—" };
		case "asociacion_civil":
			return { nombre: asoc?.nombre_asociacion || "—", documento: asoc?.nit || "—" };
		default:
			return { nombre: "—", documento: "—" };
	}
}

const SELECT_SUBTIPOS =
	"id, client_type, status, natural_clients (primer_nombre, primer_apellido, numero_documento), juridic_clients (razon_social, nit), unipersonal_clients (razon_social, nit), ong_clients (nombre_ong, nit), club_clients (nombre_club, nit), asociacion_civil_clients (nombre_asociacion, nit)";

/** Cuenta el involucramiento de un cliente en pólizas (titular + asegurado). */
async function contarInvolucramientoPolizas(
	clientId: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: any,
): Promise<{ titular: number; asegurado: number }> {
	const titularPromise = supabase
		.from("polizas")
		.select("id", { count: "exact", head: true })
		.eq("client_id", clientId);
	const aseguradoPromises = TABLAS_ASEGURADO.map((t) =>
		supabase.from(t).select("*", { count: "exact", head: true }).eq("client_id", clientId),
	);

	const [titularRes, ...aseguradoRes] = await Promise.all([titularPromise, ...aseguradoPromises]);
	const titular = titularRes.count ?? 0;
	const asegurado = aseguradoRes.reduce((acc, r) => acc + (r.count ?? 0), 0);
	return { titular, asegurado };
}

/**
 * Busca clientes por nombre / razón social / documento. Devuelve filas mínimas
 * + conteos de involucramiento en pólizas para advertir desde la lista.
 */
export async function buscarClientesAdmin(query: string): Promise<ActionResult<ClienteAdminRow[]>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const q = query.trim().substring(0, 100);
	if (q.length < 2) {
		return { success: false, error: "Ingresá al menos 2 caracteres para buscar." };
	}

	const supabase = await createClient();

	// Buscar client_ids coincidentes en cada subtabla (en paralelo)
	const [nat, jur, uni, ong, club, asoc] = await Promise.all([
		supabase
			.from("natural_clients")
			.select("client_id")
			.or(
				`primer_nombre.ilike.%${q}%,primer_apellido.ilike.%${q}%,numero_documento.ilike.%${q}%,nit.ilike.%${q}%`,
			)
			.limit(40),
		supabase.from("juridic_clients").select("client_id").or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`).limit(40),
		supabase
			.from("unipersonal_clients")
			.select("client_id")
			.or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`)
			.limit(40),
		supabase
			.from("ong_clients")
			.select("client_id")
			.or(`nombre_ong.ilike.%${q}%,sigla.ilike.%${q}%,nit.ilike.%${q}%`),
		supabase
			.from("club_clients")
			.select("client_id")
			.or(`nombre_club.ilike.%${q}%,sigla.ilike.%${q}%,nit.ilike.%${q}%`),
		supabase
			.from("asociacion_civil_clients")
			.select("client_id")
			.or(`nombre_asociacion.ilike.%${q}%,sigla.ilike.%${q}%,nit.ilike.%${q}%`),
	]);

	const ids = [
		...new Set(
			[
				...(nat.data ?? []),
				...(jur.data ?? []),
				...(uni.data ?? []),
				...(ong.data ?? []),
				...(club.data ?? []),
				...(asoc.data ?? []),
			]
				.map((r) => r.client_id as string)
				.filter(Boolean),
		),
	].slice(0, 25);

	if (ids.length === 0) return { success: true, data: [] };

	const { data: clients, error } = await supabase.from("clients").select(SELECT_SUBTIPOS).in("id", ids);
	if (error) {
		console.error("[admin/clientes] Error cargando clientes:", error);
		return { success: false, error: "Error al cargar los clientes." };
	}

	// Conteo de pólizas (titular) en lote para todos los resultados
	const { data: polizasRows } = await supabase.from("polizas").select("client_id").in("client_id", ids);
	const polizasPorCliente = new Map<string, number>();
	for (const p of polizasRows ?? []) {
		polizasPorCliente.set(p.client_id, (polizasPorCliente.get(p.client_id) ?? 0) + 1);
	}

	// Conteo de "asegurado en pólizas ajenas" en lote por cada tabla
	const aseguradoPorCliente = new Map<string, number>();
	const aseguradoRes = await Promise.all(
		TABLAS_ASEGURADO.map((t) => supabase.from(t).select("client_id").in("client_id", ids)),
	);
	for (const res of aseguradoRes) {
		for (const r of res.data ?? []) {
			if (!r.client_id) continue;
			aseguradoPorCliente.set(r.client_id, (aseguradoPorCliente.get(r.client_id) ?? 0) + 1);
		}
	}

	const filas: ClienteAdminRow[] = (clients ?? []).map((c) => {
		const { nombre, documento } = nombreYDocumento(c);
		return {
			client_id: c.id,
			client_type: c.client_type,
			nombre,
			documento,
			status: c.status ?? "—",
			polizas_count: polizasPorCliente.get(c.id) ?? 0,
			asegurado_count: aseguradoPorCliente.get(c.id) ?? 0,
		};
	});

	filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
	return { success: true, data: filas };
}

/** Resumen detallado de lo que se borraría y de lo que bloquea, para un cliente. */
export async function obtenerResumenEliminacionCliente(
	clientId: string,
): Promise<ActionResult<ResumenEliminacionCliente>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const supabase = await createClient();

	const { data: client, error } = await supabase.from("clients").select(SELECT_SUBTIPOS).eq("id", clientId).single();
	if (error || !client) return { success: false, error: "Cliente no encontrado." };

	const { nombre, documento } = nombreYDocumento(client);
	const { titular, asegurado } = await contarInvolucramientoPolizas(clientId, supabase);

	const conteo = (tabla: string, col = "client_id") =>
		supabase.from(tabla).select("*", { count: "exact", head: true }).eq(col, clientId);

	const [docs, auds, tels, partners, reps, hist] = await Promise.all([
		conteo("clientes_documentos"),
		conteo("auditoria_revisiones"),
		conteo("client_extra_phones"),
		conteo("client_partners"),
		// representantes legales cuelgan de juridic_clients, cuyo id = client_id
		supabase
			.from("legal_representatives")
			.select("*", { count: "exact", head: true })
			.eq("juridic_client_id", clientId),
		conteo("clientes_historial_ediciones"),
	]);

	const motivos: string[] = [];
	if (titular > 0) motivos.push(`Es titular de ${titular} póliza(s).`);
	if (asegurado > 0) motivos.push(`Figura como asegurado en ${asegurado} póliza(s) de terceros.`);

	return {
		success: true,
		data: {
			client_id: clientId,
			client_type: client.client_type,
			nombre,
			documento,
			status: client.status ?? "—",
			polizas_titular: titular,
			asegurado_en_polizas: asegurado,
			bloqueado: motivos.length > 0,
			motivos_bloqueo: motivos,
			documentos: docs.count ?? 0,
			auditorias: auds.count ?? 0,
			telefonos: tels.count ?? 0,
			conyuges: partners.count ?? 0,
			representantes: reps.count ?? 0,
			historial: hist.count ?? 0,
		},
	};
}

/**
 * Elimina PERMANENTEMENTE un cliente y todo su rastro, SIEMPRE Y CUANDO no esté
 * involucrado en ninguna póliza (ni como titular ni como asegurado). Borrado
 * irreversible: subtablas, documentos (+ archivos en Storage), teléfonos,
 * cónyuge, representantes, historial y revisiones de auditoría.
 *
 * La mayoría de las tablas hijas caen por ON DELETE CASCADE; aquí se manejan
 * explícitamente las excepciones: archivos de Storage (no cascadean) y
 * auditoria_revisiones (FK NO ACTION, bloquearía el DELETE).
 */
export async function eliminarClientePermanente(
	clientId: string,
	confirmacion: string,
): Promise<ActionResult<EliminarClienteResultado>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const admin = createAdminClient();

	// Cargar cliente para validar confirmación y nombre/documento
	const { data: client, error: clientErr } = await admin
		.from("clients")
		.select(SELECT_SUBTIPOS)
		.eq("id", clientId)
		.single();
	if (clientErr || !client) return { success: false, error: "Cliente no encontrado." };
	const { nombre, documento } = nombreYDocumento(client);

	// Re-chequear el guard de bloqueo en el servidor (autoridad final)
	const { titular, asegurado } = await contarInvolucramientoPolizas(clientId, admin);
	if (titular > 0 || asegurado > 0) {
		const partes: string[] = [];
		if (titular > 0) partes.push(`${titular} póliza(s) como titular`);
		if (asegurado > 0) partes.push(`${asegurado} póliza(s) como asegurado`);
		return {
			success: false,
			error: `No se puede eliminar: el cliente está involucrado en ${partes.join(" y ")}. Quitá esas pólizas primero.`,
		};
	}

	// Validar la frase de confirmación (documento exacto, o nombre si no hay documento)
	const esperado = documento && documento !== "—" ? documento : nombre;
	if (confirmacion.trim() !== esperado.trim()) {
		return { success: false, error: `La confirmación no coincide. Escribí exactamente: ${esperado}` };
	}

	// 1) Recolectar archivos de Storage ANTES de borrar (las filas cascadean)
	const { data: documentos } = await admin
		.from("clientes_documentos")
		.select("storage_bucket, storage_path")
		.eq("client_id", clientId);
	const docsCount = documentos?.length ?? 0;

	// 2) Borrar revisiones de auditoría (FK NO ACTION; cascadea sus documentos)
	const { count: audCount } = await admin
		.from("auditoria_revisiones")
		.select("*", { count: "exact", head: true })
		.eq("client_id", clientId);
	if ((audCount ?? 0) > 0) {
		const { error: audErr } = await admin.from("auditoria_revisiones").delete().eq("client_id", clientId);
		if (audErr) {
			console.error("[admin/clientes] Error borrando auditorías:", audErr);
			return { success: false, error: "Error al borrar las revisiones de auditoría del cliente." };
		}
	}

	// 3) Borrar el cliente; el resto de las tablas hijas caen por CASCADE
	const { error: delErr } = await admin.from("clients").delete().eq("id", clientId);
	if (delErr) {
		console.error("[admin/clientes] Error borrando cliente:", delErr);
		return {
			success: false,
			error: "Error al borrar el cliente. Es posible que tenga datos asociados que lo impiden.",
		};
	}

	// 4) Borrar archivos físicos de Storage (agrupados por bucket)
	let archivosBorrados = 0;
	const porBucket = new Map<string, string[]>();
	for (const d of documentos ?? []) {
		if (!d.storage_bucket || !d.storage_path) continue;
		const arr = porBucket.get(d.storage_bucket) ?? [];
		arr.push(d.storage_path);
		porBucket.set(d.storage_bucket, arr);
	}
	for (const [bucket, paths] of porBucket) {
		const { data: removed, error: stErr } = await admin.storage.from(bucket).remove(paths);
		if (stErr) {
			console.error(`[admin/clientes] Error borrando archivos de Storage (${bucket}):`, stErr);
		} else {
			archivosBorrados += removed?.length ?? 0;
		}
	}

	revalidatePath("/clientes");
	revalidatePath("/admin/clientes");

	return {
		success: true,
		data: {
			nombre,
			documento,
			documentos_borrados: docsCount,
			archivos_storage_borrados: archivosBorrados,
			auditorias_borradas: audCount ?? 0,
		},
	};
}
