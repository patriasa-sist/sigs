import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Consulta global de pólizas (#43).
 *
 * Cualquier usuario autenticado puede VER una póliza que está fuera de su
 * alcance de equipo —el caso típico es verificar el duplicado que le bloquea
 * un registro y que cargó otro equipo— pero en SOLO LECTURA: ninguna acción
 * (editar, anexos, validar, cobrar) queda habilitada.
 *
 * Leer fuera de alcance necesita el cliente admin porque el RLS scopea por
 * equipo tres tablas: `polizas`, `polizas_pagos` y `polizas_documentos` (el
 * resto de tablas de la póliza ya es legible por cualquier autenticado). El
 * cliente admin se usa aquí SOLO para SELECT; la escritura sigue pasando por
 * el cliente del usuario y por los guards de scope de cada acción.
 */

export type SupabaseLectura = Awaited<ReturnType<typeof createClient>>;

/** Cliente de solo lectura que alcanza todas las pólizas (service role). */
export function clienteLecturaGlobal(): SupabaseLectura {
	return createAdminClient() as unknown as SupabaseLectura;
}
