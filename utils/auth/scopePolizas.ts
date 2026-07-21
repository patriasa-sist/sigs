import type { DataScope } from "@/utils/auth/helpers";

/**
 * Scoping de pólizas con sello de equipo.
 *
 * Una póliza es visible para un usuario con aislamiento si:
 *   - su responsable_id es miembro ACTUAL de alguno de sus equipos, O
 *   - quedó sellada (polizas.equipo_id) con un equipo al que pertenece.
 *
 * El sello preserva la visibilidad histórica cuando un miembro cambia de
 * equipo: su producción anterior sigue visible para el equipo donde la hizo.
 * Con un JWT sin el claim team_ids (pre-migración), scope.teamIds está vacío
 * y estos helpers se comportan como el scoping clásico por responsable_id.
 */

interface ScopeableQuery<T> {
	in(column: string, values: string[]): T;
	or(filters: string, options?: { referencedTable?: string }): T;
}

/**
 * Aplica el filtro de alcance a una query de PostgREST sobre `polizas` (o con
 * `polizas` embebida vía `referencedTable`, que debe ser un join !inner para
 * filtrar las filas padre). No hace nada si el usuario no requiere scoping.
 */
export function aplicarScopePolizas<T extends ScopeableQuery<T>>(
	query: T,
	scope: DataScope,
	referencedTable?: string,
): T {
	if (!scope.needsScoping) return query;
	if (scope.teamIds.length === 0) {
		const col = referencedTable ? `${referencedTable}.responsable_id` : "responsable_id";
		return query.in(col, scope.teamMemberIds);
	}
	const filtros = `responsable_id.in.(${scope.teamMemberIds.join(",")}),equipo_id.in.(${scope.teamIds.join(",")})`;
	return referencedTable ? query.or(filtros, { referencedTable }) : query.or(filtros);
}

/**
 * Filtro "por equipo" (reportes/dashboards): pólizas cuyo responsable es
 * miembro ACTUAL del equipo O que quedaron selladas con ese equipo. Devuelve
 * la expresión para .or() (usar { referencedTable } si polizas va embebida).
 */
export function filtroEquipoOr(equipoId: string, memberIds: string[]): string {
	return memberIds.length > 0
		? `responsable_id.in.(${memberIds.join(",")}),equipo_id.eq.${equipoId}`
		: `equipo_id.eq.${equipoId}`;
}

/**
 * Guard puntual: ¿esta póliza está dentro del alcance del usuario?
 * La póliza debe traer responsable_id y equipo_id en su select.
 */
export function polizaDentroDeScope(
	scope: DataScope,
	poliza: { responsable_id?: string | null; equipo_id?: string | null },
): boolean {
	if (!scope.needsScoping) return true;
	if (poliza.responsable_id && scope.teamMemberIds.includes(poliza.responsable_id)) return true;
	return !!poliza.equipo_id && scope.teamIds.includes(poliza.equipo_id);
}
