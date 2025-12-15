"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Marcar documento como descartado (soft delete)
 * Usuarios siniestros, comerciales y admins pueden ejecutar esta acción
 */
export async function descartarDocumentoSiniestro(documentoId: string, siniestroId: string) {
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
		const { data, error } = await supabase.rpc("descartar_documento_siniestro", {
			documento_id: documentoId,
		});

		if (error) {
			console.error("Error descartando documento:", error);
			return { success: false, error: error.message };
		}

		revalidatePath(`/siniestros/editar/${siniestroId}`);
		revalidatePath("/siniestros");
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
export async function restaurarDocumentoSiniestro(documentoId: string, siniestroId: string) {
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
		const { data, error } = await supabase.rpc("restaurar_documento_siniestro", {
			documento_id: documentoId,
		});

		if (error) {
			console.error("Error restaurando documento:", error);
			return { success: false, error: error.message };
		}

		revalidatePath(`/siniestros/editar/${siniestroId}`);
		revalidatePath("/siniestros");
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
export async function eliminarDocumentoSiniestroPermanente(
	documentoId: string,
	archivoUrl: string,
	siniestroId: string
) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Llamar a la función de base de datos que verifica permisos y elimina de BD
		const { data, error } = await supabase.rpc("eliminar_documento_siniestro_permanente", {
			documento_id: documentoId,
		});

		if (error) {
			console.error("Error eliminando documento de BD:", error);
			return { success: false, error: error.message };
		}

		// Si se eliminó de BD exitosamente, eliminar de Storage
		try {
			// Extraer el path del storage desde archivo_url
			// archivo_url puede ser: "siniestro_id/timestamp-filename.ext" o una URL completa
			let storagePath = archivoUrl;

			if (archivoUrl.includes("/storage/v1/object/public/siniestros-documentos/")) {
				storagePath = archivoUrl.split("/storage/v1/object/public/siniestros-documentos/")[1];
			}

			const { error: storageError } = await supabase.storage
				.from("siniestros-documentos")
				.remove([storagePath]);

			if (storageError) {
				console.error("Error eliminando archivo de Storage:", storageError);
				// No fallar la operación completa si solo falla Storage
			}
		} catch (storageError) {
			console.error("Error al intentar eliminar de Storage:", storageError);
			// No fallar la operación completa
		}

		revalidatePath(`/siniestros/editar/${siniestroId}`);
		revalidatePath("/siniestros");
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
 * Obtener documentos activos de un siniestro
 */
export async function obtenerDocumentosActivos(siniestroId: string) {
	const supabase = await createClient();

	try {
		const { data: documentos, error } = await supabase
			.from("siniestros_documentos")
			.select("*, uploaded_by")
			.eq("siniestro_id", siniestroId)
			.eq("estado", "activo")
			.order("uploaded_at", { ascending: false });

		if (error) throw error;

		// Enriquecer con nombres de usuario
		const documentosEnriquecidos = await Promise.all(
			(documentos || []).map(async (doc: any) => {
				if (!doc.uploaded_by) {
					return { ...doc, usuario_nombre: "Sistema" };
				}

				const { data: usuario } = await supabase
					.from("profiles")
					.select("full_name")
					.eq("id", doc.uploaded_by)
					.single();

				return {
					...doc,
					usuario_nombre: usuario?.full_name || "Usuario",
				};
			})
		);

		return { success: true, data: documentosEnriquecidos };
	} catch (error) {
		console.error("Error obteniendo documentos:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtener todos los documentos de un siniestro (incluyendo descartados)
 * Solo admin puede ver documentos descartados
 */
export async function obtenerTodosDocumentos(siniestroId: string) {
	const supabase = await createClient();

	try {
		// Verificar que el usuario sea admin
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

		if (profile?.role !== "admin") {
			return { success: false, error: "Solo administradores pueden ver documentos descartados" };
		}

		const { data: documentos, error } = await supabase
			.from("siniestros_documentos")
			.select("*, uploaded_by")
			.eq("siniestro_id", siniestroId)
			.order("uploaded_at", { ascending: false });

		if (error) throw error;

		// Enriquecer con nombres de usuario
		const documentosEnriquecidos = await Promise.all(
			(documentos || []).map(async (doc: any) => {
				if (!doc.uploaded_by) {
					return { ...doc, usuario_nombre: "Sistema" };
				}

				const { data: usuario } = await supabase
					.from("profiles")
					.select("full_name")
					.eq("id", doc.uploaded_by)
					.single();

				return {
					...doc,
					usuario_nombre: usuario?.full_name || "Usuario",
				};
			})
		);

		return { success: true, data: documentosEnriquecidos };
	} catch (error) {
		console.error("Error obteniendo todos los documentos:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
