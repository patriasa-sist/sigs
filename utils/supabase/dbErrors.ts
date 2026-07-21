/**
 * Helpers para traducir errores de PostgreSQL/Supabase a mensajes legibles.
 *
 * Postgres reporta una violación de unicidad (código 23505) en dos partes:
 *   - message: `duplicate key value violates unique constraint "nombre_constraint"`
 *   - details: `Key (col1, col2)=(v1, v2) already exists.` (a veces ausente bajo RLS)
 * Aquí se extrae el máximo detalle disponible de ambas para que el usuario
 * sepa QUÉ dato está duplicado, no solo que "hay un duplicado".
 */

/** Nombres legibles para columnas que participan en restricciones únicas. */
const COLUMNAS_LEGIBLES: Record<string, string> = {
	numero_poliza: "número de póliza",
	compania_aseguradora_id: "compañía aseguradora",
	inicio_vigencia: "inicio de vigencia",
	fin_vigencia: "fin de vigencia",
	poliza_id: "póliza",
	client_id: "cliente",
	numero_anexo: "número de anexo",
	nro_cuota: "número de cuota",
	placa: "placa",
	nro_serie: "número de serie",
	nivel_id: "nivel",
	titular_id: "titular",
	documento_identidad: "documento de identidad",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nombreColumna(col: string): string {
	return COLUMNAS_LEGIBLES[col] ?? col.replace(/_id$/, "").replace(/_/g, " ");
}

/**
 * Describe un error 23505 (unique constraint) con el detalle disponible.
 * Devuelve un fragmento en minúsculas para concatenar tras un contexto:
 * `"Error al guardar la póliza: " + describirErrorDuplicado(error)`.
 */
export function describirErrorDuplicado(error: {
	message?: string;
	details?: string;
	hint?: string;
}): string {
	const msg = error.message || "";
	const detail = error.details || error.hint || "";

	// Caso ideal: Postgres entrega columnas y valores duplicados.
	const kv = detail.match(/Key \((.+)\)=\((.+)\) already exists/);
	if (kv) {
		const cols = kv[1].split(",").map((c) => nombreColumna(c.trim()));
		const vals = kv[2].split(",").map((v) => v.trim());
		if (cols.length === vals.length) {
			// Los UUID internos no le dicen nada al usuario; solo la columna.
			const partes = cols.map((col, i) => (UUID_RE.test(vals[i]) ? col : `${col} «${vals[i]}»`));
			return `ya existe un registro con ${partes.join(", ")}`;
		}
		return `ya existe un registro con los mismos valores de: ${cols.join(", ")}`;
	}

	// Sin details (frecuente bajo RLS): al menos identificar la restricción violada.
	const constraint = msg.match(/unique constraint "([^"]+)"/)?.[1];
	if (constraint) {
		return `dato duplicado (restricción de unicidad «${constraint}»)`;
	}

	const extra = detail || msg;
	return `dato duplicado${extra ? ` — ${extra}` : ""}`;
}
