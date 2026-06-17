"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPermission, getDataScopeFilter } from "@/utils/auth/helpers";
import { resolverNombresCliente } from "@/utils/polizas/resolverNombresCliente";

async function checkTeamLeaderForPolicy(
	supabase: Awaited<ReturnType<typeof createClient>>,
	userId: string,
	responsableId: string,
): Promise<boolean> {
	const { data: leaderTeams } = await supabase
		.from("equipo_miembros")
		.select("equipo_id")
		.eq("user_id", userId)
		.eq("rol_equipo", "lider");

	if (!leaderTeams || leaderTeams.length === 0) return false;

	const teamIds = leaderTeams.map((t: { equipo_id: string }) => t.equipo_id);

	const { count } = await supabase
		.from("equipo_miembros")
		.select("*", { count: "exact", head: true })
		.eq("user_id", responsableId)
		.in("equipo_id", teamIds);

	return (count ?? 0) > 0;
}

// ============================================
// TIPOS PARA LA TABLA DE PENDIENTES
// ============================================

export type AnexoPendiente = {
	id: string;
	numero_anexo: string;
	tipo_anexo: "inclusion" | "exclusion" | "anulacion";
	fecha_anexo: string;
	fecha_efectiva: string;
	observaciones: string | null;
	poliza_id: string;
	numero_poliza: string;
	ramo: string;
	compania_nombre: string;
	client_name: string;
	creado_por_nombre: string | null;
	creado_por_email: string | null;
	created_at: string;
	monto_ajuste_total: number;
};

// ============================================
// 1. OBTENER ANEXOS PENDIENTES
// ============================================

export async function obtenerAnexosPendientes(): Promise<{
	success: boolean;
	anexos?: AnexoPendiente[];
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const { allowed } = await checkPermission("polizas.validar");
		const { needsScoping, teamMemberIds } = await getDataScopeFilter("polizas");

		// Verificar si es líder de equipo (para usuarios sin permiso JWT pero con rol_equipo='lider')
		let esLider = false;
		if (!allowed) {
			const { data: leaderTeams } = await supabase
				.from("equipo_miembros")
				.select("equipo_id")
				.eq("user_id", user.id)
				.eq("rol_equipo", "lider");
			esLider = (leaderTeams?.length ?? 0) > 0;
			if (!esLider) {
				return { success: false, error: "No tiene permisos para validar" };
			}
		}

		const query = supabase
			.from("polizas_anexos")
			.select(
				`
				id, numero_anexo, tipo_anexo, fecha_anexo, fecha_efectiva,
				observaciones, created_at,
				poliza:polizas!poliza_id (
					id, numero_poliza, ramo, responsable_id,
					companias_aseguradoras!compania_aseguradora_id (nombre)
				),
				creador:profiles!created_by (full_name, email)
			`,
			)
			.eq("estado", "pendiente")
			.order("created_at", { ascending: false });

		const { data: anexos, error } = await query;

		if (error) {
			console.error("Error obteniendo anexos pendientes:", error);
			return { success: false, error: "Error al obtener anexos pendientes" };
		}

		if (!anexos || anexos.length === 0) {
			return { success: true, anexos: [] };
		}

		// Filtrar por scope: aplica para roles con aislamiento (comercial/agente) y para líderes sin permiso JWT
		let anexosFiltrados = anexos;
		if ((needsScoping || esLider) && teamMemberIds.length > 0) {
			anexosFiltrados = anexos.filter((a) => {
				const poliza = a.poliza as unknown as { responsable_id: string } | null;
				return poliza && teamMemberIds.includes(poliza.responsable_id);
			});
		}

		// Obtener nombres de clientes de las pólizas
		const polizaIds = [
			...new Set(anexosFiltrados.map((a) => (a.poliza as unknown as { id: string })?.id).filter(Boolean)),
		];

		// Obtener client_ids
		const { data: polizasClients } = await supabase.from("polizas").select("id, client_id").in("id", polizaIds);

		const clientIds = [...new Set((polizasClients || []).map((p) => p.client_id))];

		// Resolver nombres de clientes de todos los tipos en batch
		const clientNombresMap = await resolverNombresCliente(supabase, clientIds);
		const polizaClientMap = new Map((polizasClients || []).map((p) => [p.id, p.client_id]));

		// Obtener montos de ajuste
		const anexoIds = anexosFiltrados.map((a) => a.id);
		const { data: pagos } = await supabase
			.from("polizas_anexos_pagos")
			.select("anexo_id, monto")
			.in("anexo_id", anexoIds);

		const montoMap = new Map<string, number>();
		(pagos || []).forEach((p) => {
			montoMap.set(p.anexo_id, (montoMap.get(p.anexo_id) || 0) + Number(p.monto));
		});

		const resultado: AnexoPendiente[] = anexosFiltrados.map((a) => {
			const poliza = a.poliza as unknown as {
				id: string;
				numero_poliza: string;
				ramo: string;
				companias_aseguradoras: { nombre: string } | null;
			};
			const creador = a.creador as unknown as { full_name: string; email: string } | null;

			const clientId = polizaClientMap.get(poliza.id);
			const client_name = (clientId ? clientNombresMap.get(clientId)?.name : null) || "Desconocido";

			return {
				id: a.id,
				numero_anexo: a.numero_anexo,
				tipo_anexo: a.tipo_anexo as "inclusion" | "exclusion" | "anulacion",
				fecha_anexo: a.fecha_anexo,
				fecha_efectiva: a.fecha_efectiva,
				observaciones: a.observaciones,
				poliza_id: poliza.id,
				numero_poliza: poliza.numero_poliza,
				ramo: poliza.ramo,
				compania_nombre: poliza.companias_aseguradoras?.nombre || "-",
				client_name,
				creado_por_nombre: creador?.full_name || null,
				creado_por_email: creador?.email || null,
				created_at: a.created_at,
				monto_ajuste_total: montoMap.get(a.id) || 0,
			};
		});

		return { success: true, anexos: resultado };
	} catch (error) {
		console.error("Error general:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

// ============================================
// 2. VALIDAR ANEXO
// ============================================

export async function validarAnexo(anexoId: string): Promise<{
	success: boolean;
	error?: string;
}> {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const { allowed } = await checkPermission("polizas.validar");
		const { needsScoping, teamMemberIds } = await getDataScopeFilter("polizas");

		// Obtener el anexo con responsable de la póliza para verificar scope
		const { data: anexo } = await supabase
			.from("polizas_anexos")
			.select("id, estado, tipo_anexo, poliza_id, poliza:polizas!poliza_id(responsable_id)")
			.eq("id", anexoId)
			.single();

		if (!anexo) {
			return { success: false, error: "Anexo no encontrado" };
		}

		const responsableId = (anexo.poliza as unknown as { responsable_id: string } | null)?.responsable_id;

		// Si no tiene permiso JWT, verificar si es líder de equipo para este anexo
		if (!allowed) {
			const esLider = responsableId ? await checkTeamLeaderForPolicy(supabase, user.id, responsableId) : false;
			if (!esLider) {
				return { success: false, error: "No tiene permisos para validar" };
			}
		}

		// Enforcement de scope para usuarios con permiso pero con aislamiento de datos
		if (needsScoping && responsableId && !teamMemberIds.includes(responsableId)) {
			if (allowed) {
				return { success: false, error: "No tiene permisos para validar este anexo" };
			}
		}

		if (anexo.estado !== "pendiente") {
			return { success: false, error: "El anexo no está pendiente de validación" };
		}

		// Activar el anexo
		const { error: updateError } = await supabase
			.from("polizas_anexos")
			.update({
				estado: "activo",
				validado_por: user.id,
				fecha_validacion: new Date().toISOString(),
			})
			.eq("id", anexoId);

		if (updateError) {
			console.error("Error validando anexo:", updateError);
			return { success: false, error: "Error al validar el anexo" };
		}

		// Si es anulación, cambiar estado de la póliza a 'anulada'
		if (anexo.tipo_anexo === "anulacion") {
			const { error: polizaError } = await supabase
				.from("polizas")
				.update({ estado: "anulada" })
				.eq("id", anexo.poliza_id);

			if (polizaError) {
				console.error("Error anulando póliza:", polizaError);
				return { success: false, error: "Anexo validado pero error al anular la póliza" };
			}
		}

		revalidatePath("/gerencia/validacion");
		revalidatePath("/polizas");
		revalidatePath(`/polizas/${anexo.poliza_id}`);

		return { success: true };
	} catch (error) {
		console.error("Error general validando anexo:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

// ============================================
// 3. RECHAZAR ANEXO
// ============================================

export async function rechazarAnexo(
	anexoId: string,
	motivo: string,
): Promise<{
	success: boolean;
	error?: string;
}> {
	const supabase = await createClient();

	try {
		if (!motivo || motivo.trim().length < 10) {
			return { success: false, error: "El motivo del rechazo es obligatorio (mínimo 10 caracteres)" };
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const { allowed } = await checkPermission("polizas.validar");
		const { needsScoping, teamMemberIds } = await getDataScopeFilter("polizas");

		// Obtener el anexo con responsable de la póliza para verificar scope
		const { data: anexo } = await supabase
			.from("polizas_anexos")
			.select("id, estado, poliza_id, poliza:polizas!poliza_id(responsable_id)")
			.eq("id", anexoId)
			.single();

		if (!anexo) {
			return { success: false, error: "Anexo no encontrado" };
		}

		const responsableId = (anexo.poliza as unknown as { responsable_id: string } | null)?.responsable_id;

		// Si no tiene permiso JWT, verificar si es líder de equipo para este anexo
		if (!allowed) {
			const esLider = responsableId ? await checkTeamLeaderForPolicy(supabase, user.id, responsableId) : false;
			if (!esLider) {
				return { success: false, error: "No tiene permisos para rechazar" };
			}
		}

		// Enforcement de scope para usuarios con permiso pero con aislamiento de datos
		if (needsScoping && responsableId && !teamMemberIds.includes(responsableId)) {
			if (allowed) {
				return { success: false, error: "No tiene permisos para rechazar este anexo" };
			}
		}

		if (anexo.estado !== "pendiente") {
			return { success: false, error: "El anexo no está pendiente de validación" };
		}

		const { error: updateError } = await supabase
			.from("polizas_anexos")
			.update({
				estado: "rechazado",
				motivo_rechazo: motivo.trim(),
				rechazado_por: user.id,
				fecha_rechazo: new Date().toISOString(),
			})
			.eq("id", anexoId);

		if (updateError) {
			console.error("Error rechazando anexo:", updateError);
			return { success: false, error: "Error al rechazar el anexo" };
		}

		revalidatePath("/gerencia/validacion");
		revalidatePath("/polizas");
		revalidatePath(`/polizas/${anexo.poliza_id}`);

		return { success: true };
	} catch (error) {
		console.error("Error general rechazando anexo:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}
