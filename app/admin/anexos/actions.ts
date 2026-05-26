"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requirePermission } from "@/utils/auth/helpers";
import { revalidatePath } from "next/cache";

export interface AnexoAdminRow {
	id: string;
	numero_anexo: string;
	tipo_anexo: "inclusion" | "exclusion" | "anulacion";
	estado: "pendiente" | "activo" | "rechazado";
	fecha_anexo: string;
	fecha_validacion: string | null;
	created_at: string;
	creado_por_nombre: string | null;
	validado_por_nombre: string | null;
	poliza_id: string;
	numero_poliza: string;
	poliza_estado: string;
	ramo: string;
	cantidad_documentos: number;
	cantidad_pagos: number;
}

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export async function buscarAnexosParaAdmin(query: string): Promise<ActionResult<AnexoAdminRow[]>> {
	await requirePermission("anexos.eliminar");
	const supabase = await createClient();

	const trimmed = query.trim();
	if (trimmed.length < 2) {
		return { success: false, error: "Ingresá al menos 2 caracteres para buscar." };
	}

	const { data, error } = await supabase
		.from("polizas_anexos")
		.select(`
			id,
			numero_anexo,
			tipo_anexo,
			estado,
			fecha_anexo,
			fecha_validacion,
			created_at,
			created_by,
			validado_por,
			poliza_id,
			polizas!inner (
				numero_poliza,
				estado,
				ramo
			),
			creado:profiles!polizas_anexos_created_by_fkey (full_name, email),
			validado:profiles!polizas_anexos_validado_por_fkey (full_name, email)
		`)
		.or(`numero_anexo.ilike.%${trimmed}%`)
		.order("created_at", { ascending: false })
		.limit(50);

	const { data: dataPorPoliza } = await supabase
		.from("polizas_anexos")
		.select(`
			id,
			numero_anexo,
			tipo_anexo,
			estado,
			fecha_anexo,
			fecha_validacion,
			created_at,
			created_by,
			validado_por,
			poliza_id,
			polizas!inner (
				numero_poliza,
				estado,
				ramo
			),
			creado:profiles!polizas_anexos_created_by_fkey (full_name, email),
			validado:profiles!polizas_anexos_validado_por_fkey (full_name, email)
		`)
		.ilike("polizas.numero_poliza", `%${trimmed}%`)
		.order("created_at", { ascending: false })
		.limit(50);

	if (error) {
		console.error("[admin/anexos] Error buscando:", error);
		return { success: false, error: "Error al buscar anexos." };
	}

	const combinados = [...(data ?? []), ...(dataPorPoliza ?? [])];
	const unicos = new Map<string, typeof combinados[number]>();
	for (const row of combinados) unicos.set(row.id, row);
	const filas = Array.from(unicos.values());

	if (filas.length === 0) {
		return { success: true, data: [] };
	}

	const ids = filas.map((r) => r.id);
	const [docsCount, pagosCount] = await Promise.all([
		supabase.from("polizas_anexos_documentos").select("anexo_id").in("anexo_id", ids),
		supabase.from("polizas_anexos_pagos").select("anexo_id").in("anexo_id", ids),
	]);

	const docsByAnexo = new Map<string, number>();
	for (const d of docsCount.data ?? []) {
		docsByAnexo.set(d.anexo_id, (docsByAnexo.get(d.anexo_id) ?? 0) + 1);
	}
	const pagosByAnexo = new Map<string, number>();
	for (const p of pagosCount.data ?? []) {
		pagosByAnexo.set(p.anexo_id, (pagosByAnexo.get(p.anexo_id) ?? 0) + 1);
	}

	type Profile = { full_name: string | null; email: string | null } | null;
	const result: AnexoAdminRow[] = filas
		.map((r) => {
			const poliza = Array.isArray(r.polizas) ? r.polizas[0] : r.polizas;
			const creado = (Array.isArray(r.creado) ? r.creado[0] : r.creado) as Profile;
			const validado = (Array.isArray(r.validado) ? r.validado[0] : r.validado) as Profile;
			return {
				id: r.id,
				numero_anexo: r.numero_anexo,
				tipo_anexo: r.tipo_anexo as AnexoAdminRow["tipo_anexo"],
				estado: r.estado as AnexoAdminRow["estado"],
				fecha_anexo: r.fecha_anexo,
				fecha_validacion: r.fecha_validacion,
				created_at: r.created_at,
				creado_por_nombre: creado?.full_name ?? creado?.email ?? null,
				validado_por_nombre: validado?.full_name ?? validado?.email ?? null,
				poliza_id: r.poliza_id,
				numero_poliza: poliza?.numero_poliza ?? "—",
				poliza_estado: poliza?.estado ?? "—",
				ramo: poliza?.ramo ?? "—",
				cantidad_documentos: docsByAnexo.get(r.id) ?? 0,
				cantidad_pagos: pagosByAnexo.get(r.id) ?? 0,
			};
		})
		.sort((a, b) => b.created_at.localeCompare(a.created_at));

	return { success: true, data: result };
}

export async function eliminarAnexoCompleto(
	anexoId: string,
	motivo: string
): Promise<ActionResult<{ poliza_id: string; reactivada: boolean }>> {
	const profile = await requirePermission("anexos.eliminar");

	const motivoLimpio = motivo.trim();
	if (motivoLimpio.length < 10) {
		return { success: false, error: "El motivo debe tener al menos 10 caracteres." };
	}

	const admin = createAdminClient();

	const { data: anexo, error: anexoError } = await admin
		.from("polizas_anexos")
		.select("id, poliza_id, tipo_anexo, estado, numero_anexo")
		.eq("id", anexoId)
		.single();

	if (anexoError || !anexo) {
		return { success: false, error: "Anexo no encontrado." };
	}

	const { data: documentos } = await admin
		.from("polizas_anexos_documentos")
		.select("archivo_url")
		.eq("anexo_id", anexoId);

	const rutasStorage = (documentos ?? [])
		.map((d) => d.archivo_url)
		.filter((u): u is string => Boolean(u));

	const { error: deleteAnexoError } = await admin
		.from("polizas_anexos")
		.delete()
		.eq("id", anexoId);

	if (deleteAnexoError) {
		console.error("[admin/anexos] Error eliminando anexo:", deleteAnexoError);
		return { success: false, error: "Error al eliminar el anexo." };
	}

	let reactivada = false;
	if (anexo.tipo_anexo === "anulacion" && anexo.estado === "activo") {
		const { data: polizaActual } = await admin
			.from("polizas")
			.select("estado")
			.eq("id", anexo.poliza_id)
			.single();

		if (polizaActual?.estado === "anulada") {
			const { error: updateError } = await admin
				.from("polizas")
				.update({ estado: "activa" })
				.eq("id", anexo.poliza_id)
				.eq("estado", "anulada");

			if (updateError) {
				console.error("[admin/anexos] Error reactivando póliza:", updateError);
				return { success: false, error: "Anexo eliminado pero falló reactivación de póliza. Revisar manualmente." };
			}
			reactivada = true;
		}
	}

	if (rutasStorage.length > 0) {
		const { error: storageError } = await admin.storage
			.from("polizas-documentos")
			.remove(rutasStorage);
		if (storageError) {
			console.error("[admin/anexos] Error borrando archivos de Storage:", storageError);
		}
	}

	const descripcion = reactivada
		? `Anexo ${anexo.numero_anexo} (${anexo.tipo_anexo}) eliminado por admin. Póliza reactivada. Motivo: ${motivoLimpio}`
		: `Anexo ${anexo.numero_anexo} (${anexo.tipo_anexo}) eliminado por admin. Motivo: ${motivoLimpio}`;

	await admin.from("polizas_historial_ediciones").insert({
		poliza_id: anexo.poliza_id,
		accion: "edicion",
		usuario_id: profile.id,
		campos_modificados: reactivada ? ["estado", "anexo"] : ["anexo"],
		descripcion,
	});

	revalidatePath("/polizas");
	revalidatePath(`/polizas/${anexo.poliza_id}`);
	revalidatePath("/gerencia/validacion");
	revalidatePath("/admin/anexos");

	return { success: true, data: { poliza_id: anexo.poliza_id, reactivada } };
}
