"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type ArchivoStorage = {
	bucket: string;
	path: string;
};

type ResultadoEliminacion = {
	eliminado: boolean;
	mensaje: string;
	archivos_eliminados: number;
	registros_bd: Record<string, unknown>;
	archivos_storage_resultado: {
		exitosos: number;
		fallidos: number;
		errores: string[];
	};
};

/**
 * Elimina una póliza COMPLETAMENTE: registros de BD + archivos de Storage.
 * Solo para uso administrativo en casos excepcionales (crashes del sistema).
 *
 * Paso 1: Llama la función SQL eliminar_poliza_completo() que borra todos
 *         los registros de BD y retorna las rutas de archivos de Storage.
 * Paso 2: Usa la Storage API para borrar los archivos físicos.
 */
export async function eliminarPolizaNuclear(
	polizaId: string
): Promise<ResultadoEliminacion> {
	// Verificar que el usuario es admin
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return {
			eliminado: false,
			mensaje: "No autenticado",
			archivos_eliminados: 0,
			registros_bd: {},
			archivos_storage_resultado: { exitosos: 0, fallidos: 0, errores: [] },
		};
	}

	const { data: profile } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", user.id)
		.single();

	if (profile?.role !== "admin") {
		return {
			eliminado: false,
			mensaje: "Solo administradores pueden ejecutar eliminación nuclear",
			archivos_eliminados: 0,
			registros_bd: {},
			archivos_storage_resultado: { exitosos: 0, fallidos: 0, errores: [] },
		};
	}

	// Usar admin client para bypasear RLS en Storage
	const supabaseAdmin = createAdminClient();

	// Paso 1: Ejecutar función SQL
	const { data, error } = await supabaseAdmin.rpc("eliminar_poliza_completo", {
		p_poliza_id: polizaId,
		p_usuario_id: user.id,
	});

	if (error) {
		return {
			eliminado: false,
			mensaje: `Error SQL: ${error.message}`,
			archivos_eliminados: 0,
			registros_bd: {},
			archivos_storage_resultado: { exitosos: 0, fallidos: 0, errores: [] },
		};
	}

	const resultado = Array.isArray(data) ? data[0] : data;

	if (!resultado?.eliminado) {
		return {
			eliminado: false,
			mensaje: resultado?.mensaje ?? "Error desconocido",
			archivos_eliminados: 0,
			registros_bd: resultado?.detalles ?? {},
			archivos_storage_resultado: { exitosos: 0, fallidos: 0, errores: [] },
		};
	}

	// Paso 2: Borrar archivos de Storage via API
	const archivos: ArchivoStorage[] =
		resultado.detalles?.archivos_storage ?? [];
	let exitosos = 0;
	let fallidos = 0;
	const errores: string[] = [];

	// Agrupar archivos por bucket para borrado en lote
	const porBucket: Record<string, string[]> = {};
	for (const archivo of archivos) {
		if (archivo.bucket && archivo.path) {
			if (!porBucket[archivo.bucket]) {
				porBucket[archivo.bucket] = [];
			}
			porBucket[archivo.bucket].push(archivo.path);
		}
	}

	// Borrar por bucket (Storage API soporta borrado en lote)
	for (const [bucket, paths] of Object.entries(porBucket)) {
		const { data: removeData, error: removeError } = await supabaseAdmin.storage
			.from(bucket)
			.remove(paths);

		if (removeError) {
			fallidos += paths.length;
			errores.push(`${bucket}: ${removeError.message}`);
		} else {
			exitosos += removeData?.length ?? paths.length;
		}
	}

	return {
		eliminado: true,
		mensaje: resultado.mensaje,
		archivos_eliminados: exitosos,
		registros_bd: resultado.detalles ?? {},
		archivos_storage_resultado: { exitosos, fallidos, errores },
	};
}

/**
 * Vista previa del impacto de eliminar una póliza.
 * No borra nada, solo muestra conteos.
 */
export async function previsualizarEliminacion(polizaId: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { error: "No autenticado" };
	}

	const supabaseAdmin = createAdminClient();

	const { data, error } = await supabaseAdmin.rpc(
		"puede_eliminar_poliza_v2",
		{ p_poliza_id: polizaId }
	);

	if (error) {
		return { error: error.message };
	}

	const resultado = Array.isArray(data) ? data[0] : data;
	return resultado;
}
