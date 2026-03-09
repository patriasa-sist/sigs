"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { ExtraPhone } from "@/types/clientForm";

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

/**
 * Get extra phones for a client
 */
export async function getExtraPhones(
	clientId: string
): Promise<ActionResult<ExtraPhone[]>> {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const { data, error } = await supabase
			.from("client_extra_phones")
			.select("id, client_id, numero, etiqueta")
			.eq("client_id", clientId)
			.order("created_at");

		if (error) {
			console.error("[getExtraPhones] Error:", error);
			return { success: false, error: "Error al obtener celulares extra" };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		console.error("[getExtraPhones] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Save extra phones for a client (replaces all existing)
 * Used during client creation and editing
 */
export async function saveExtraPhones(
	clientId: string,
	phones: ExtraPhone[]
): Promise<ActionResult<void>> {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		// Delete existing extra phones
		const { error: deleteError } = await supabase
			.from("client_extra_phones")
			.delete()
			.eq("client_id", clientId);

		if (deleteError) {
			console.error("[saveExtraPhones] Delete error:", deleteError);
			return { success: false, error: "Error al actualizar celulares extra" };
		}

		// Insert new phones
		if (phones.length > 0) {
			const phonesToInsert = phones
				.filter((p) => p.numero.trim().length >= 5)
				.map((p) => ({
					client_id: clientId,
					numero: p.numero.trim(),
					etiqueta: p.etiqueta || "otro",
				}));

			if (phonesToInsert.length > 0) {
				const { error: insertError } = await supabase
					.from("client_extra_phones")
					.insert(phonesToInsert);

				if (insertError) {
					console.error("[saveExtraPhones] Insert error:", insertError);
					return { success: false, error: "Error al guardar celulares extra" };
				}
			}
		}

		revalidatePath("/clientes");
		revalidatePath(`/clientes/${clientId}`);
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[saveExtraPhones] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
