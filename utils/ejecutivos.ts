import { createClient } from "@/utils/supabase/server";

export type EjecutivoFiltro = { id: string; full_name: string };

const ROLES_EJECUTIVO = ["comercial", "admin", "agente", "usuario"];

/**
 * Devuelve el roster de ejecutivos para los filtros de listado/dashboard.
 *
 * A diferencia de derivar la lista de los `responsable_id` ya presentes en las
 * pólizas, incluye a TODOS los ejecutivos activos (comercial/agente/admin) aunque
 * todavía no tengan pólizas asignadas. Esto mantiene el filtro consistente con el
 * desplegable de creación (ExecutiveDropdown), que también usa el roster completo.
 *
 * Respeta el scoping de equipo: agente/comercial solo ven a los miembros de su(s)
 * equipo(s); admin/usuario/cobranza/siniestros ven el roster completo.
 *
 * @param scope - Resultado de getDataScopeFilter() del módulo que solicita el filtro.
 */
export async function obtenerEjecutivosFiltro(scope: {
	needsScoping: boolean;
	teamMemberIds: string[];
	role: string;
}): Promise<EjecutivoFiltro[]> {
	const supabase = await createClient();

	let roster: EjecutivoFiltro[] = [];

	// get_usuarios_comerciales (SECURITY DEFINER) ignora la RLS de profiles, pero solo
	// autoriza a roles ejecutivos y lanza excepción para cobranza/siniestros. Para esos
	// roles vamos directo al query: su RLS de profiles ya les permite ver el roster.
	if (ROLES_EJECUTIVO.includes(scope.role)) {
		const { data, error } = await supabase.rpc("get_usuarios_comerciales");
		if (!error && data) {
			roster = (data as { id: string; full_name: string | null }[]).map((p) => ({
				id: p.id,
				full_name: p.full_name ?? "",
			}));
		}
	}

	// Fallback / roles no-ejecutivos: query directo sujeto a RLS.
	if (roster.length === 0) {
		const { data } = await supabase
			.from("profiles")
			.select("id, full_name")
			.in("role", ROLES_EJECUTIVO)
			.order("full_name");
		roster = (data ?? []).map((p) => ({ id: p.id, full_name: p.full_name ?? "" }));
	}

	// Scoping de equipo para agente/comercial.
	if (scope.needsScoping) {
		const allowed = new Set(scope.teamMemberIds);
		roster = roster.filter((e) => allowed.has(e.id));
	}

	return roster.sort((a, b) => a.full_name.localeCompare(b.full_name));
}
