"use server";

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/utils/auth/helpers";

export interface EquipoMetricas {
	equipo_id: string;
	equipo_nombre: string;
	miembros: { id: string; full_name: string; role: string }[];
	total_polizas: number;
	total_polizas_activas: number;
	total_clientes: number;
	total_siniestros_abiertos: number;
	prima_total: number;
}

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export async function obtenerMetricasPorEquipo(): Promise<ActionResult<EquipoMetricas[]>> {
	await requirePermission("admin.equipos");
	const supabase = await createClient();

	try {
		// Obtener todos los equipos con sus miembros
		const { data: equipos, error: equiposError } = await supabase
			.from("equipos")
			.select("id, nombre")
			.order("nombre");

		if (equiposError) throw equiposError;
		if (!equipos || equipos.length === 0) {
			return { success: true, data: [] };
		}

		const metricas: EquipoMetricas[] = [];

		for (const equipo of equipos) {
			// Obtener miembros del equipo
			const { data: miembrosData } = await supabase
				.from("equipo_miembros")
				.select("user_id, profiles!user_id (full_name, role)")
				.eq("equipo_id", equipo.id);

			const memberIds = (miembrosData || []).map((m) => m.user_id);
			const miembros = (miembrosData || []).map((m) => {
				const profile = m.profiles as unknown as { full_name: string; role: string } | null;
				return {
					id: m.user_id,
					full_name: profile?.full_name || "Sin nombre",
					role: profile?.role || "desconocido",
				};
			});

			if (memberIds.length === 0) {
				metricas.push({
					equipo_id: equipo.id,
					equipo_nombre: equipo.nombre,
					miembros: [],
					total_polizas: 0,
					total_polizas_activas: 0,
					total_clientes: 0,
					total_siniestros_abiertos: 0,
					prima_total: 0,
				});
				continue;
			}

			// Obtener metricas en paralelo
			const [
				polizasCount,
				polizasActivasResult,
				clientesCount,
				siniestrosCount,
				primaResult,
			] = await Promise.all([
				supabase
					.from("polizas")
					.select("id", { count: "exact", head: true })
					.in("responsable_id", memberIds),
				supabase
					.from("polizas")
					.select("id", { count: "exact", head: true })
					.in("responsable_id", memberIds)
					.eq("estado", "activa"),
				supabase
					.from("clients")
					.select("id", { count: "exact", head: true })
					.in("executive_in_charge", memberIds),
				supabase
					.from("siniestros")
					.select("id", { count: "exact", head: true })
					.in("responsable_id", memberIds)
					.eq("estado", "abierto"),
				supabase
					.from("polizas")
					.select("prima_total")
					.in("responsable_id", memberIds)
					.eq("estado", "activa"),
			]);

			const primaTotal = (primaResult.data || []).reduce(
				(sum, p) => sum + (Number(p.prima_total) || 0),
				0
			);

			metricas.push({
				equipo_id: equipo.id,
				equipo_nombre: equipo.nombre,
				miembros,
				total_polizas: polizasCount.count || 0,
				total_polizas_activas: polizasActivasResult.count || 0,
				total_clientes: clientesCount.count || 0,
				total_siniestros_abiertos: siniestrosCount.count || 0,
				prima_total: primaTotal,
			});
		}

		return { success: true, data: metricas };
	} catch (error) {
		console.error("Error obteniendo métricas por equipo:", error);
		return { success: false, error: "Error al obtener métricas" };
	}
}
