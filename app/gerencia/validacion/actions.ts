"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Obtiene todas las pólizas pendientes de validación
 */
export async function obtenerPolizasPendientes() {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Verificar que el usuario sea admin o gerente
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		if (!profile || (profile.role !== "admin" && profile.role !== "usuario")) {
			return { success: false, error: "No tiene permisos para validar pólizas" };
		}

		// Obtener pólizas pendientes con joins
		const { data: polizas, error } = await supabase
			.from("polizas")
			.select(`
				*,
				client:clients!client_id (
					id,
					client_type,
					natural_clients (
						primer_nombre,
						segundo_nombre,
						primer_apellido,
						segundo_apellido
					),
					juridic_clients (
						razon_social
					)
				),
				compania:companias_aseguradoras!compania_aseguradora_id (
					nombre
				),
				responsable:profiles!responsable_id (
					full_name
				),
				regional:regionales!regional_id (
					nombre
				),
				categoria:categorias!categoria_id (
					nombre
				),
				created_by_user:profiles!created_by (
					full_name,
					email
				)
			`)
			.eq("estado", "pendiente")
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error obteniendo pólizas pendientes:", error);
			return { success: false, error: "Error al obtener pólizas pendientes" };
		}

		return { success: true, polizas: polizas || [] };
	} catch (error) {
		console.error("Error general:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Valida una póliza (cambia estado de pendiente a activa)
 */
export async function validarPoliza(polizaId: string) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Verificar que el usuario sea admin o gerente
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		if (!profile || (profile.role !== "admin" && profile.role !== "usuario")) {
			return { success: false, error: "No tiene permisos para validar pólizas" };
		}

		// Verificar que la póliza exista y esté pendiente
		const { data: poliza } = await supabase
			.from("polizas")
			.select("id, estado")
			.eq("id", polizaId)
			.single();

		if (!poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		if (poliza.estado !== "pendiente") {
			return { success: false, error: "La póliza no está pendiente de validación" };
		}

		// Actualizar póliza a estado activa
		const { error: updateError } = await supabase
			.from("polizas")
			.update({
				estado: "activa",
				validado_por: user.id,
				fecha_validacion: new Date().toISOString(),
			})
			.eq("id", polizaId);

		if (updateError) {
			console.error("Error validando póliza:", updateError);
			return { success: false, error: "Error al validar la póliza" };
		}

		// Revalidar rutas
		revalidatePath("/gerencia/validacion");
		revalidatePath("/polizas");

		return { success: true };
	} catch (error) {
		console.error("Error general validando póliza:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Rechaza una póliza (puede eliminarla o marcarla como rechazada)
 * Por ahora solo cambia el estado a "cancelada"
 */
export async function rechazarPoliza(polizaId: string, motivo?: string) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Verificar que el usuario sea admin o gerente
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		if (!profile || (profile.role !== "admin" && profile.role !== "usuario")) {
			return { success: false, error: "No tiene permisos para rechazar pólizas" };
		}

		// Verificar que la póliza exista y esté pendiente
		const { data: poliza } = await supabase
			.from("polizas")
			.select("id, estado")
			.eq("id", polizaId)
			.single();

		if (!poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		if (poliza.estado !== "pendiente") {
			return { success: false, error: "La póliza no está pendiente de validación" };
		}

		// Actualizar póliza a estado cancelada
		// En el futuro podrías crear un estado "rechazada" específico
		const { error: updateError } = await supabase
			.from("polizas")
			.update({
				estado: "cancelada",
			})
			.eq("id", polizaId);

		if (updateError) {
			console.error("Error rechazando póliza:", updateError);
			return { success: false, error: "Error al rechazar la póliza" };
		}

		// Opcional: registrar el motivo en el historial
		if (motivo) {
			await supabase.from("polizas_historial_ediciones").insert({
				poliza_id: polizaId,
				accion: "edicion",
				usuario_id: user.id,
				descripcion: `Póliza rechazada por gerencia. Motivo: ${motivo}`,
			});
		}

		// Revalidar rutas
		revalidatePath("/gerencia/validacion");
		revalidatePath("/polizas");

		return { success: true };
	} catch (error) {
		console.error("Error general rechazando póliza:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
