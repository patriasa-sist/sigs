import { hoyLaPaz } from "@/utils/formatters";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Cierre de mes para edición de pólizas (acordado con Contabilidad 2026-07).
 * El mes de registro (created_at, zona America/La_Paz) define el período
 * contable de la póliza: mientras el mes está en curso, la edición sigue las
 * reglas normales (líder, permisos por póliza); desde el mes siguiente la
 * póliza ACTIVA queda cerrada y solo puede modificarla un administrador o un
 * usuario con permiso de edición sobre la póliza OTORGADO POR UN ADMIN
 * (los permisos otorgados por líderes no levantan el candado). Los anexos no
 * se bloquean: fluyen en cualquier mes.
 */

/** true si el mes calendario (La Paz) del timestamp ya pasó respecto de hoy. */
export function esMesRegistroCerrado(createdAt: string | Date): boolean {
	const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
	if (Number.isNaN(d.getTime())) return false;
	// "en-CA" produce YYYY-MM-DD; comparar por prefijo YYYY-MM
	const mesRegistro = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/La_Paz",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.format(d)
		.slice(0, 7);
	return mesRegistro < hoyLaPaz().slice(0, 7);
}

export const MENSAJE_MES_CERRADO =
	"Mes cerrado: las pólizas activas de meses anteriores solo puede modificarlas un administrador o un usuario con permiso de edición otorgado por administración";

/**
 * true si el usuario tiene un permiso de edición VIGENTE sobre la póliza
 * otorgado por un ADMIN. Es la única llave que levanta el candado de mes
 * cerrado para no-administradores; los permisos otorgados por líderes de
 * equipo no cuentan aquí (sí sirven para la edición normal del mes en curso).
 */
export async function tienePermisoDeAdminParaPoliza(polizaId: string, userId: string): Promise<boolean> {
	// Cliente admin (service role): el RLS de profiles solo deja al beneficiario
	// leer perfiles de su propio equipo, y aquí se necesita el rol de quien
	// otorgó (un admin, que normalmente NO es compañero de equipo). El lookup es
	// puntual y por IDs controlados por el servidor.
	const supabase = createAdminClient();
	const { data } = await supabase
		.from("policy_edit_permissions")
		.select("id, expires_at, granter:profiles!granted_by (role)")
		.eq("poliza_id", polizaId)
		.eq("user_id", userId)
		.is("revoked_at", null)
		.maybeSingle();

	if (!data) return false;
	if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return false;

	const granter = Array.isArray(data.granter) ? data.granter[0] : data.granter;
	return (granter as { role?: string } | null)?.role === "admin";
}
