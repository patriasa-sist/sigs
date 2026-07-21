/**
 * Policy Renewal Server Actions
 * @module app/polizas/[id]/renovar/actions
 * @description Carga una póliza existente como plantilla para crear una RENOVACIÓN.
 *
 * Una renovación es semánticamente una póliza NUEVA e independiente: se precargan
 * los datos base y los específicos del ramo, pero NO las cuotas ni los documentos
 * (se ingresan manualmente). Al guardar se usa el flujo normal de creación
 * (`guardarPoliza`); la póliza original nunca se modifica.
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { getDataScopeFilter } from "@/utils/auth/helpers";
import { polizaDentroDeScope } from "@/utils/auth/scopePolizas";
import { cargarPolizaFormState } from "@/utils/polizas/cargarFormState";
import type { ActionResult } from "@/types/policyPermission";
import type { PolizaFormState } from "@/types/poliza";

/**
 * Obtiene una póliza y la transforma en un PolizaFormState listo para renovar.
 * - Reutiliza el cargador compartido `cargarPolizaFormState` (mismo mapeo que edición).
 * - Verifica autenticación, alcance por equipo y que el estado sea renovable.
 * - Descarta cuotas/documentos y marca la nueva póliza como renovación.
 */
export async function obtenerPolizaParaRenovacion(polizaId: string): Promise<ActionResult<PolizaFormState>> {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Cargar estado y responsable para validar acceso y estado renovable
		const { data: poliza, error: errorPoliza } = await supabase
			.from("polizas")
			.select("estado, responsable_id, equipo_id")
			.eq("id", polizaId)
			.single();

		if (errorPoliza || !poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// Mismo guard de alcance por equipo que obtenerDetallePoliza
		const scope = await getDataScopeFilter("polizas");
		if (!polizaDentroDeScope(scope, poliza)) {
			return { success: false, error: "No tiene acceso a esta póliza" };
		}

		// Defensa contra navegación directa: solo activa/vencida son renovables
		if (poliza.estado !== "activa" && poliza.estado !== "vencida") {
			return { success: false, error: "Solo se pueden renovar pólizas activas o vencidas" };
		}

		// Reutilizar el cargador compartido (cliente + datos básicos + datos específicos)
		const base = await cargarPolizaFormState(supabase, polizaId);
		if (!base.success) {
			return base;
		}

		const original = base.data;
		const numeroOriginal = original.datos_basicos?.numero_poliza ?? "";

		// Transformar a estado de RENOVACIÓN: sin cuotas, sin documentos, póliza nueva
		const formState: PolizaFormState = {
			...original,
			paso_actual: 2, // Datos Básicos: número y fechas se ingresan nuevos
			poliza_id: undefined, // póliza nueva e independiente (no edita la original)
			en_edicion: false,
			modalidad_pago: null, // cuotas: ingreso manual
			documentos: [], // documentos: carga manual
			advertencias: [],
			datos_basicos: original.datos_basicos
				? {
						...original.datos_basicos,
						numero_poliza: "",
						es_renovacion: true,
						nro_poliza_anterior: numeroOriginal,
						inicio_vigencia: "",
						fin_vigencia: "",
						fecha_emision_compania: "",
						// Renovación = póliza del período corriente, nunca carga histórica.
						// Se conserva tipo_prima (una madre se renueva como madre).
						es_retroactiva: false,
					}
				: null,
		};

		return { success: true, data: formState };
	} catch (error) {
		console.error("[obtenerPolizaParaRenovacion] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
