"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Marcar documento como descartado (soft delete)
 * Usuarios comerciales y admins pueden ejecutar esta acción
 */
export async function descartarDocumento(documentoId: string) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Llamar a la función de base de datos que verifica permisos
		const { error } = await supabase.rpc("descartar_documento", {
			documento_id: documentoId,
		});

		if (error) {
			console.error("Error descartando documento:", error);
			return { success: false, error: error.message };
		}

		revalidatePath("/polizas");
		return { success: true };
	} catch (error) {
		console.error("Error general descartando documento:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Restaurar documento descartado (cambiar estado a activo)
 * Solo usuarios admin pueden ejecutar esta acción
 */
export async function restaurarDocumento(documentoId: string) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Llamar a la función de base de datos que verifica permisos
		const { error } = await supabase.rpc("restaurar_documento", {
			documento_id: documentoId,
		});

		if (error) {
			console.error("Error restaurando documento:", error);
			return { success: false, error: error.message };
		}

		revalidatePath("/polizas");
		return { success: true };
	} catch (error) {
		console.error("Error general restaurando documento:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Eliminar documento permanentemente (borrar de BD y Storage)
 * Solo usuarios admin pueden ejecutar esta acción
 */
export async function eliminarDocumentoPermanente(documentoId: string, archivoUrl: string) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Extraer el path del archivo de la URL
		// Ejemplo URL: https://xxx.supabase.co/storage/v1/object/public/polizas-documentos/path/file.pdf
		const urlParts = archivoUrl.split("/polizas-documentos/");
		const filePath = urlParts.length > 1 ? urlParts[1] : null;

		if (!filePath) {
			return { success: false, error: "URL de archivo inválida" };
		}

		// Llamar a la función de base de datos que elimina el registro (verifica permisos)
		const { error: errorDB } = await supabase.rpc("eliminar_documento_permanente", {
			documento_id: documentoId,
		});

		if (errorDB) {
			console.error("Error eliminando documento de BD:", errorDB);
			return { success: false, error: errorDB.message };
		}

		// Eliminar archivo del Storage
		const { error: errorStorage } = await supabase.storage
			.from("polizas-documentos")
			.remove([filePath]);

		if (errorStorage) {
			console.error("Error eliminando archivo del Storage:", errorStorage);
			// El registro ya fue eliminado de BD, pero el archivo quedó en Storage
			// Esto se puede limpiar manualmente o con un job programado
			return {
				success: false,
				error: "Documento eliminado de BD pero falló la eliminación del archivo",
			};
		}

		revalidatePath("/polizas");
		return { success: true };
	} catch (error) {
		console.error("Error general eliminando documento:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtener documentos activos de una póliza
 * Filtra documentos con estado 'activo'
 */
export async function obtenerDocumentosActivos(polizaId: string) {
	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("polizas_documentos")
			.select("*")
			.eq("poliza_id", polizaId)
			.eq("estado", "activo")
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error obteniendo documentos:", error);
			return { success: false, error: error.message, documentos: [] };
		}

		return { success: true, documentos: data };
	} catch (error) {
		console.error("Error general obteniendo documentos:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
			documentos: [],
		};
	}
}

/**
 * Obtener todos los documentos de una póliza (incluyendo descartados)
 * Solo para admins
 */
export async function obtenerTodosDocumentos(polizaId: string) {
	const supabase = await createClient();

	try {
		// Verificar que el usuario sea admin
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado", documentos: [] };
		}

		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		if (profile?.role !== "admin") {
			return {
				success: false,
				error: "Solo administradores pueden ver documentos descartados",
				documentos: [],
			};
		}

		const { data, error } = await supabase
			.from("polizas_documentos")
			.select("*")
			.eq("poliza_id", polizaId)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error obteniendo documentos:", error);
			return { success: false, error: error.message, documentos: [] };
		}

		return { success: true, documentos: data };
	} catch (error) {
		console.error("Error general obteniendo documentos:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
			documentos: [],
		};
	}
}
