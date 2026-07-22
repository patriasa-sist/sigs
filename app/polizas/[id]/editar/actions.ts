/**
 * Policy Edit Server Actions
 * @module app/polizas/[id]/editar/actions
 * @description Server-side actions for editing existing policies
 *
 * Key behaviors:
 * - Verifies edit permission before any operation
 * - A validated policy (estado='activa') NEVER resets to 'pendiente' on edit,
 *   regardless of which fields change (financial or cosmetic). This preserves
 *   fecha_validacion so production already reported to APS is never re-reported
 *   in a later period. Re-validation only happens through an explicit admin
 *   rejection (which moves it to 'rechazada' → 'pendiente' on resubmit).
 * - A 'rechazada' policy always resets to 'pendiente' (fix-and-resubmit flow)
 * - Clears validation fields (validado_por, fecha_validacion) when resetting
 * - Audit trail is automatically captured by database triggers
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateFinalStoragePath } from "@/utils/fileUpload";
import type { PolizaFormState, FamiliarSalud, DatosSepelio, DatosVida } from "@/types/poliza";
import type { ActionResult } from "@/types/policyPermission";
import { cargarPolizaFormState } from "@/utils/polizas/cargarFormState";
import { esMesRegistroCerrado, MENSAJE_MES_CERRADO, tienePermisoDeAdminParaPoliza } from "@/utils/polizas/cierreMes";
import { describirErrorDuplicado } from "@/utils/supabase/dbErrors";

/**
 * Mapea errores de Supabase/PostgreSQL a mensajes legibles para el usuario.
 */
function mapSupabaseError(
	error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
	context: string,
): string {
	if (!error) return context;

	const code = error.code ?? "";
	const detail = error.details || error.hint || "";
	const msg = error.message || "";

	switch (code) {
		case "23505": {
			const target = msg + detail;
			if (target.includes("numero_poliza") || target.includes("polizas_numero_compania_vigencia")) {
				return "Ya existe una póliza de esta compañía con ese número y la misma fecha de inicio de vigencia. Verifique el número y la vigencia ingresados.";
			}
			return `${context}: ${describirErrorDuplicado(error)}`;
		}
		case "23503":
			return `${context}: referencia inválida${detail ? ` — ${detail}` : ""}. Verifique compañía, regional, responsable o producto.`;
		case "23514":
			return `${context}: valor no permitido${detail ? ` — ${detail}` : ""}`;
		case "42501":
			return `${context}: sin permisos para realizar esta operación`;
		default:
			return `${context}: ${msg || "error desconocido"}${detail ? ` (${detail})` : ""}`;
	}
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verifica si un usuario es líder de equipo para el responsable de una póliza.
 */
async function isTeamLeaderForResponsable(
	supabase: Awaited<ReturnType<typeof createClient>>,
	userId: string,
	responsableId: string,
): Promise<boolean> {
	const { data: leaderTeams } = await supabase
		.from("equipo_miembros")
		.select("equipo_id")
		.eq("user_id", userId)
		.eq("rol_equipo", "lider");

	if (!leaderTeams || leaderTeams.length === 0) return false;

	const teamIds = leaderTeams.map((t: { equipo_id: string }) => t.equipo_id);

	const { count } = await supabase
		.from("equipo_miembros")
		.select("*", { count: "exact", head: true })
		.eq("user_id", responsableId)
		.in("equipo_id", teamIds);

	return (count ?? 0) > 0;
}

/**
 * Get authenticated user with profile
 */
async function getAuthenticatedUserWithRole() {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		throw new Error("No autenticado");
	}

	const { data: profile, error: profileError } = await supabase
		.from("profiles")
		.select("id, role, full_name")
		.eq("id", user.id)
		.single();

	if (profileError || !profile) {
		throw new Error("Perfil no encontrado");
	}

	return { supabase, user, profile };
}

/**
 * Verify edit permission for a policy
 */
async function verifyEditPermission(polizaId: string) {
	const { supabase, user, profile } = await getAuthenticatedUserWithRole();

	// Admin can always edit
	if (profile.role === "admin") {
		return { supabase, user, profile, canEdit: true };
	}

	// Fetch policy data for multiple checks
	const { data: polizaData } = await supabase
		.from("polizas")
		.select("created_by, estado, puede_editar_hasta, responsable_id, created_at")
		.eq("id", polizaId)
		.single();

	// Check if user is the creator of a rejected policy within edit window
	if (
		polizaData?.estado === "rechazada" &&
		polizaData.created_by === user.id &&
		polizaData.puede_editar_hasta &&
		new Date(polizaData.puede_editar_hasta) > new Date()
	) {
		return { supabase, user, profile, canEdit: true };
	}

	// Cierre de mes: una póliza ACTIVA de un mes de registro ya cerrado solo la
	// edita un administrador o quien tenga permiso de edición otorgado por un
	// admin sobre esta póliza (los permisos de líderes no levantan el candado).
	// Las pendientes/rechazadas quedan fuera del candado (subsanación del cierre).
	// Si el permiso existe, NO se retorna aquí: la evaluación normal de permisos
	// de abajo sigue aplicando (rol, polizas.editar, permiso explícito).
	if (polizaData?.estado === "activa" && polizaData.created_at && esMesRegistroCerrado(polizaData.created_at)) {
		const permisoDeAdmin = await tienePermisoDeAdminParaPoliza(supabase, polizaId, user.id);
		if (!permisoDeAdmin) {
			throw new Error(MENSAJE_MES_CERRADO);
		}
	}

	// Check if user is a team leader for this policy
	if (polizaData?.responsable_id) {
		const esLider = await isTeamLeaderForResponsable(supabase, user.id, polizaData.responsable_id);
		if (esLider) {
			return { supabase, user, profile, canEdit: true };
		}
	}

	// Check if user has the module-level edit permission
	const { data: hasEditPerm } = await supabase.rpc("user_has_permission", {
		p_user_id: profile.id,
		p_permission_id: "polizas.editar",
	});
	if (!hasEditPerm) {
		throw new Error("No tienes permiso para editar pólizas");
	}

	// Check explicit permission record (works for agente and comercial roles)
	const { data: explicitPerm } = await supabase
		.from("policy_edit_permissions")
		.select("id, expires_at")
		.eq("poliza_id", polizaId)
		.eq("user_id", user.id)
		.is("revoked_at", null)
		.maybeSingle();

	if (explicitPerm && (!explicitPerm.expires_at || new Date(explicitPerm.expires_at) > new Date())) {
		return { supabase, user, profile, canEdit: true };
	}

	// Fallback: check using database RPC (handles comercial role backward compatibility)
	const { data: canEdit, error } = await supabase.rpc("can_edit_policy", {
		p_poliza_id: polizaId,
		p_user_id: user.id,
	});

	if (error) {
		console.error("[verifyEditPermission] RPC error:", error);
		throw new Error("Error verificando permisos");
	}

	if (!canEdit) {
		throw new Error("No tienes permiso para editar esta póliza");
	}

	return { supabase, user, profile, canEdit: true };
}

// ============================================
// LOAD POLICY FOR EDITING
// ============================================

/**
 * Loads a policy with all its data and transforms it to PolizaFormState format
 * for use in the edit form
 */
export async function obtenerPolizaParaEdicion(polizaId: string): Promise<ActionResult<PolizaFormState>> {
	try {
		const { supabase } = await verifyEditPermission(polizaId);
		return await cargarPolizaFormState(supabase, polizaId);
	} catch (error) {
		console.error("[obtenerPolizaParaEdicion] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// UPDATE POLICY
// ============================================

/**
 * Updates an existing policy with new data
 * - Never resets a policy that was 'activa' to 'pendiente' on edit; an active
 *   policy only returns to validation through an explicit admin rejection
 * - Always resets a 'rechazada' policy to 'pendiente'
 * - Clears validation fields when resetting
 * - Updates related records (payments, vehicles, documents)
 */
export async function actualizarPoliza(
	polizaId: string,
	formState: PolizaFormState,
): Promise<ActionResult<{ id: string }>> {
	try {
		const { supabase } = await verifyEditPermission(polizaId);

		// Validate required data
		if (!formState.asegurado) {
			return { success: false, error: "Asegurado no seleccionado" };
		}
		if (!formState.datos_basicos) {
			return { success: false, error: "Datos básicos incompletos" };
		}
		if (!formState.modalidad_pago) {
			return { success: false, error: "Modalidad de pago no definida" };
		}

		// Validar datos_especificos para ramos que lo requieren
		const ramoNorm = formState.datos_basicos.ramo
			.toLowerCase()
			.trim()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "");
		const requiereDatosEspecificos =
			ramoNorm.includes("automotor") ||
			ramoNorm.includes("salud") ||
			ramoNorm.includes("enfermedad") ||
			ramoNorm.includes("incendio") ||
			ramoNorm.includes("responsabilidad") ||
			ramoNorm.includes("civil") ||
			ramoNorm.includes("transporte") ||
			ramoNorm.includes("aeronavegacion") ||
			ramoNorm.includes("nave") ||
			ramoNorm.includes("embarcacion") ||
			ramoNorm.includes("accidente") ||
			ramoNorm.includes("vida") ||
			ramoNorm.includes("sepelio") ||
			ramoNorm.includes("defuncion") ||
			(ramoNorm.includes("riesgo") && ramoNorm.includes("vario")) ||
			(ramoNorm.includes("ramo") && ramoNorm.includes("tecnico"));

		if (requiereDatosEspecificos && !formState.datos_especificos) {
			return {
				success: false,
				error: `Datos específicos del ramo "${formState.datos_basicos.ramo}" son obligatorios`,
			};
		}

		// Get current policy state
		const { data: currentPoliza, error: fetchError } = await supabase
			.from("polizas")
			.select(
				"estado, modalidad_pago, prima_total, producto_id, usar_factores_contado, prima_neta_manual, prima_neta, comision, comision_empresa, comision_encargado, factor_prima_neta, porcentaje_comision, compania_aseguradora_id, ramo, moneda, tipo_prima, es_retroactiva",
			)
			.eq("id", polizaId)
			.single();

		if (fetchError || !currentPoliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// Get current payments to check for paid cuotas
		const { data: currentPagos } = await supabase
			.from("polizas_pagos")
			.select("id, estado, monto, numero_cuota, fecha_vencimiento, observaciones")
			.eq("poliza_id", polizaId);

		const cuotasPagadas = currentPagos?.filter((p) => p.estado === "pagado") || [];
		const tienePagos = cuotasPagadas.length > 0;

		// Block modality change if there are paid cuotas
		if (tienePagos && currentPoliza.modalidad_pago !== formState.modalidad_pago.tipo) {
			return {
				success: false,
				error: "No se puede cambiar la modalidad de pago porque hay cuotas ya pagadas",
			};
		}

		// Build update payload
		const pagoData = formState.modalidad_pago as {
			prima_neta?: number;
			comision?: number;
			comision_empresa?: number;
			comision_encargado?: number;
			factor_usado?: number;
			porcentaje_comision?: number;
		};
		const sinPrimaPropia = formState.datos_basicos.tipo_prima === "sin_prima_propia";
		const esRetro = formState.datos_basicos.es_retroactiva === true;

		// Extraer campos ramo-específicos que se guardan en la tabla polizas
		const datosEsp = formState.datos_especificos?.datos;
		// El "Regional Asegurado" lo usan varios ramos (Salud, Vida, AP, Sepelio, Incendio).
		// Se persiste siempre que el form del ramo lo incluya en sus datos; sin lista de ramos,
		// que ya se había desincronizado (omitía "Incendio y Aliados" y lo guardaba como null).
		const regionalAseguradoId =
			datosEsp && "regional_asegurado_id" in datosEsp
				? (datosEsp as { regional_asegurado_id: string }).regional_asegurado_id || null
				: null;
		const tieneMaternidad =
			formState.datos_especificos?.tipo_ramo === "Salud" && datosEsp && "tiene_maternidad" in datosEsp
				? (datosEsp as { tiene_maternidad: boolean }).tiene_maternidad
				: false;

		const updatePayload: Record<string, unknown> = {
			client_id: formState.asegurado.id,
			numero_poliza: formState.datos_basicos.numero_poliza,
			compania_aseguradora_id: formState.datos_basicos.compania_aseguradora_id,
			ramo: formState.datos_basicos.ramo,
			producto_id: formState.datos_basicos.producto_id,
			grupo_produccion: formState.datos_basicos.grupo_produccion,
			inicio_vigencia: formState.datos_basicos.inicio_vigencia,
			fin_vigencia: formState.datos_basicos.fin_vigencia,
			fecha_emision_compania: formState.datos_basicos.fecha_emision_compania,
			director_cartera_id: formState.datos_basicos.director_cartera_id || null,
			responsable_id: formState.datos_basicos.responsable_id,
			regional_id: formState.datos_basicos.regional_id,
			categoria_id: formState.datos_basicos.categoria_id || null,
			modalidad_pago: formState.modalidad_pago.tipo,
			prima_total: formState.modalidad_pago.prima_total,
			moneda: formState.modalidad_pago.moneda,
			prima_neta: sinPrimaPropia ? null : pagoData.prima_neta || null,
			comision: sinPrimaPropia ? null : pagoData.comision_empresa || pagoData.comision || null,
			comision_empresa: sinPrimaPropia ? null : pagoData.comision_empresa || null,
			comision_encargado: sinPrimaPropia ? null : pagoData.comision_encargado || null,
			// Factor y % congelados con el valor EXACTO recalculado en esta edición.
			factor_prima_neta: sinPrimaPropia ? null : (pagoData.factor_usado ?? null),
			porcentaje_comision: sinPrimaPropia ? null : (pagoData.porcentaje_comision ?? null),
			usar_factores_contado:
				formState.modalidad_pago.tipo === "credito" && formState.modalidad_pago.usar_factores_contado === true,
			tipo_prima: formState.datos_basicos.tipo_prima ?? "directa",
			es_retroactiva: formState.datos_basicos.es_retroactiva ?? false,
			es_renovacion: formState.datos_basicos.es_renovacion || false,
			nro_poliza_anterior: formState.datos_basicos.es_renovacion
				? formState.datos_basicos.nro_poliza_anterior || null
				: null,
			regional_asegurado_id: regionalAseguradoId,
			tiene_maternidad: tieneMaternidad,
		};

		// Ajuste manual de prima neta (admin): si la base de cálculo no cambió
		// (prima total, producto, modalidad, factores), preservar los montos
		// ajustados a mano; si cambió, el ajuste pierde sustento y se limpia
		// (entran los montos recalculados por el formulario).
		if (currentPoliza.prima_neta_manual === true) {
			const baseCalculoCambio =
				sinPrimaPropia ||
				Number(currentPoliza.prima_total) !== formState.modalidad_pago.prima_total ||
				currentPoliza.producto_id !== formState.datos_basicos.producto_id ||
				currentPoliza.modalidad_pago !== formState.modalidad_pago.tipo ||
				(currentPoliza.usar_factores_contado ?? false) !== (updatePayload.usar_factores_contado as boolean);

			if (baseCalculoCambio) {
				updatePayload.prima_neta_manual = false;
				updatePayload.prima_neta_ajuste_motivo = null;
			} else {
				updatePayload.prima_neta = currentPoliza.prima_neta;
				updatePayload.comision = currentPoliza.comision;
				updatePayload.comision_empresa = currentPoliza.comision_empresa;
				updatePayload.comision_encargado = currentPoliza.comision_encargado;
				// El factor/% también quedan con lo ajustado a mano (efectivo, no del producto).
				updatePayload.factor_prima_neta = currentPoliza.factor_prima_neta;
				updatePayload.porcentaje_comision = currentPoliza.porcentaje_comision;
			}
		}

		// Una póliza 'activa' (ya validada) NUNCA vuelve a 'pendiente' al editarse,
		// sin importar qué campos cambien. Así fecha_validacion se mantiene fija y
		// la producción ya reportada a la APS no se re-reporta en un período
		// posterior. La única vía de revalidación es un rechazo explícito de un
		// admin/gerencia (estado='rechazada'), que reinicia el flujo aquí abajo.
		// Rechazada siempre vuelve a 'pendiente' (flujo de corrección y reenvío).
		if (currentPoliza.estado === "rechazada") {
			updatePayload.estado = "pendiente";
			updatePayload.validado_por = null;
			updatePayload.fecha_validacion = null;
			// motivo_rechazo, rechazado_por y fecha_rechazo se conservan: el validador
			// necesita ver qué se observó para revisar que esté corregido. Solo se
			// cierra la ventana de edición del flujo de rechazo.
			updatePayload.puede_editar_hasta = null;
		}

		// 1. Update main policy
		const { error: updateError } = await supabase.from("polizas").update(updatePayload).eq("id", polizaId);

		if (updateError) {
			console.error("[actualizarPoliza] Update error:", updateError);
			return { success: false, error: mapSupabaseError(updateError, "Error al actualizar la póliza") };
		}

		// 2. Update payments - usar UPDATE para cuotas existentes (evita problemas de constraint único)
		// Map de cuotas pagadas por id para verificación rápida
		const idsCuotasPagadas = new Set(cuotasPagadas.map((p) => p.id));

		if (sinPrimaPropia) {
			// Póliza madre / open-cover: no debe tener cuotas propias.
			// Eliminar cuotas no pagadas existentes (la prima llega por anexos).
			const idsNoPagadas = (currentPagos || []).filter((p) => p.estado !== "pagado").map((p) => p.id);
			if (idsNoPagadas.length > 0) {
				const supabaseAdmin = createAdminClient();
				const { error: deleteError } = await supabaseAdmin
					.from("polizas_pagos")
					.delete()
					.in("id", idsNoPagadas);
				if (deleteError) {
					console.error("[actualizarPoliza] Error deleting cuotas (sin_prima_propia):", deleteError);
					return {
						success: false,
						error: mapSupabaseError(deleteError, "Error al limpiar cuotas anteriores"),
					};
				}
			}
		} else if (formState.modalidad_pago.tipo === "contado") {
			// Limpiar cuotas sobrantes no pagadas de un plan a crédito previo:
			// contado solo conserva la cuota única (numero_cuota === 1). Sin esto,
			// al cambiar crédito → contado las cuotas 2..N quedaban huérfanas y el
			// plan de pagos seguía mostrando el total viejo.
			const idsCuotasSobrantes = (currentPagos || [])
				.filter((p) => p.numero_cuota !== 1 && p.estado !== "pagado")
				.map((p) => p.id);
			if (idsCuotasSobrantes.length > 0) {
				const supabaseAdmin = createAdminClient();
				const { error: deleteError } = await supabaseAdmin
					.from("polizas_pagos")
					.delete()
					.in("id", idsCuotasSobrantes);
				if (deleteError) {
					console.error("[actualizarPoliza] Error deleting leftover credito cuotas:", deleteError);
					return {
						success: false,
						error: mapSupabaseError(deleteError, "Error al limpiar cuotas anteriores"),
					};
				}
			}

			const cuotaUnica = formState.modalidad_pago.cuota_unica;
			// Carga retroactiva al contado: la cuota ya fue cobrada antes de cargar la póliza,
			// no se registra (solo prima total para trazabilidad). Igual que cuota 0 / sin prima.
			if (esRetro || !cuotaUnica || cuotaUnica <= 0) {
				// Si quedó una cuota previa no pagada, eliminarla
				const cuotaPrevia = currentPagos?.find((p) => p.numero_cuota === 1 && p.estado !== "pagado");
				if (cuotaPrevia) {
					const supabaseAdmin = createAdminClient();
					await supabaseAdmin.from("polizas_pagos").delete().eq("id", cuotaPrevia.id);
				}
			} else {
				// Buscar la cuota existente para contado
				const cuotaExistente = currentPagos?.find((p) => p.numero_cuota === 1);

				if (cuotaExistente) {
					// Solo actualizar si no está pagada
					if (!idsCuotasPagadas.has(cuotaExistente.id)) {
						const { error: updateError } = await supabase
							.from("polizas_pagos")
							.update({
								monto: cuotaUnica,
								fecha_vencimiento: formState.modalidad_pago.fecha_pago_unico,
								estado: "pendiente",
								fecha_pago: null,
								observaciones: null,
							})
							.eq("id", cuotaExistente.id);

						if (updateError) {
							console.error("[actualizarPoliza] Error updating contado cuota:", updateError);
							return { success: false, error: "Error al actualizar la cuota de pago" };
						}
					}
				} else {
					// No existe, crear nueva
					const { error: insertError } = await supabase.from("polizas_pagos").insert({
						poliza_id: polizaId,
						numero_cuota: 1,
						monto: cuotaUnica,
						fecha_vencimiento: formState.modalidad_pago.fecha_pago_unico,
						estado: "pendiente",
						fecha_pago: null,
					});
					if (insertError) {
						console.error("[actualizarPoliza] Error inserting contado cuota:", insertError);
						return { success: false, error: "Error al guardar la cuota de pago" };
					}
				}
			}
		} else {
			// Crédito: eliminar cuotas no pagadas y reinsertar las del formulario
			// Usa admin client para DELETE ya que RLS no tiene política de delete en polizas_pagos
			// La autorización ya fue verificada en verifyEditPermission()

			const supabaseAdmin = createAdminClient();

			// 1. Eliminar cuotas no pagadas (las pagadas se preservan intactas)
			const idsNoPagadas = (currentPagos || []).filter((p) => p.estado !== "pagado").map((p) => p.id);

			if (idsNoPagadas.length > 0) {
				const { error: deleteError } = await supabaseAdmin
					.from("polizas_pagos")
					.delete()
					.in("id", idsNoPagadas);

				if (deleteError) {
					console.error("[actualizarPoliza] Error deleting old cuotas:", deleteError);
					return {
						success: false,
						error: mapSupabaseError(deleteError, "Error al limpiar cuotas anteriores"),
					};
				}
			}

			// 2. Construir nuevas cuotas a insertar (solo las no pagadas)
			const nuevasCuotas: Array<{
				poliza_id: string;
				numero_cuota: number;
				monto: number;
				fecha_vencimiento: string;
				estado: string;
				fecha_pago?: string | null;
				observaciones?: string;
			}> = [];

			// Cuota inicial
			if (formState.modalidad_pago.cuota_inicial > 0) {
				const cuotaInicialPagada = cuotasPagadas.some((p) =>
					p.observaciones?.toLowerCase().includes("inicial"),
				);

				if (!cuotaInicialPagada) {
					nuevasCuotas.push({
						poliza_id: polizaId,
						numero_cuota: 1,
						monto: formState.modalidad_pago.cuota_inicial,
						fecha_vencimiento: formState.modalidad_pago.fecha_inicio_cuotas,
						estado: "pendiente",
						fecha_pago: null,
						observaciones: "Cuota inicial",
					});
				}
			}

			// Cuotas regulares
			for (const cuota of formState.modalidad_pago.cuotas) {
				const estaPagada = cuota.estado === "pagado" || (cuota.id && idsCuotasPagadas.has(cuota.id));

				if (!estaPagada) {
					nuevasCuotas.push({
						poliza_id: polizaId,
						numero_cuota: cuota.numero,
						monto: cuota.monto,
						fecha_vencimiento: cuota.fecha_vencimiento,
						estado: "pendiente",
						fecha_pago: null,
					});
				}
			}

			// 3. Insertar todas las cuotas nuevas en una sola operación
			if (nuevasCuotas.length > 0) {
				const { error: insertError } = await supabase.from("polizas_pagos").insert(nuevasCuotas);

				if (insertError) {
					console.error("[actualizarPoliza] Error inserting cuotas:", insertError);
					return { success: false, error: mapSupabaseError(insertError, "Error al guardar cuotas de pago") };
				}
			}
		}

		// 2b. Si la edición cambió el ramo, limpiar la materia asegurada del ramo
		// anterior: los bloques de abajo solo hacen delete-then-insert de las tablas
		// del ramo NUEVO, por lo que las filas del ramo viejo quedarían huérfanas.
		// Las tablas hijas sin poliza_id (items de incendio/riesgos varios,
		// asegurados por nivel) cascadean desde sus padres.
		if (currentPoliza.ramo !== formState.datos_basicos.ramo) {
			const supabaseAdmin = createAdminClient();
			const tablasRamo = [
				"polizas_automotor_vehiculos",
				"polizas_salud_beneficiarios",
				"polizas_salud_asegurados",
				"polizas_salud_niveles",
				"polizas_beneficiarios",
				"polizas_asegurados_nivel",
				"polizas_niveles",
				"polizas_incendio_bienes",
				"polizas_incendio_asegurados",
				"polizas_responsabilidad_civil",
				"polizas_rc_vehiculos",
				"polizas_desgravamen",
				"polizas_transporte",
				"polizas_aeronavegacion_naves",
				"polizas_aeronavegacion_niveles_ap",
				"polizas_aeronavegacion_asegurados",
				"polizas_ramos_tecnicos",
				"polizas_ramos_tecnicos_equipos",
				"polizas_riesgos_varios_bienes",
				"polizas_riesgos_varios_asegurados",
			];
			const resultados = await Promise.all(
				tablasRamo.map((tabla) => supabaseAdmin.from(tabla).delete().eq("poliza_id", polizaId)),
			);
			const fallo = resultados.find((r) => r.error);
			if (fallo?.error) {
				console.error("[actualizarPoliza] Error limpiando datos del ramo anterior:", fallo.error);
				return { success: false, error: "Error al limpiar los datos del ramo anterior" };
			}
		}

		// 3. Update vehicles for Automotor ramo
		if (formState.datos_especificos?.tipo_ramo === "Automotores") {
			const supabaseAdmin = createAdminClient();

			// Delete existing vehicles (requires admin client — RLS restricts DELETE to admin role)
			const { error: delVehError } = await supabaseAdmin
				.from("polizas_automotor_vehiculos")
				.delete()
				.eq("poliza_id", polizaId);

			if (delVehError) {
				console.error("[actualizarPoliza] Error deleting vehicles:", delVehError);
				return { success: false, error: "Error al actualizar vehículos" };
			}

			// Insert new vehicles
			const vehiculos = formState.datos_especificos.datos.vehiculos.map((vehiculo) => ({
				poliza_id: polizaId,
				placa: vehiculo.placa,
				valor_asegurado: vehiculo.valor_asegurado,
				franquicia: vehiculo.franquicia,
				nro_chasis: vehiculo.nro_chasis,
				uso: vehiculo.uso,
				coaseguro: vehiculo.coaseguro || 0,
				tipo_vehiculo_id: vehiculo.tipo_vehiculo_id || null,
				marca_id: vehiculo.marca_id || null,
				modelo: vehiculo.modelo || null,
				ano: vehiculo.ano || null,
				color: vehiculo.color || null,
				ejes: vehiculo.ejes || null,
				nro_motor: vehiculo.nro_motor || null,
				nro_asientos: vehiculo.nro_asientos || null,
				plaza_circulacion: vehiculo.plaza_circulacion || null,
			}));

			if (vehiculos.length > 0) {
				const { error: insVehError } = await supabaseAdmin
					.from("polizas_automotor_vehiculos")
					.insert(vehiculos);

				if (insVehError) {
					console.error("[actualizarPoliza] Error inserting vehicles:", insVehError);
					return { success: false, error: "Error al guardar vehículos actualizados" };
				}
			}
		}

		// 3b. Update Salud data
		if (formState.datos_especificos?.tipo_ramo === "Salud") {
			const supabaseAdmin = createAdminClient();
			const datosSalud = formState.datos_especificos.datos;

			// Delete existing data (niveles, asegurados, beneficiarios)
			const { error: delBenef } = await supabaseAdmin
				.from("polizas_salud_beneficiarios")
				.delete()
				.eq("poliza_id", polizaId);
			if (delBenef) {
				return { success: false, error: `Error al limpiar beneficiarios de salud: ${delBenef.message}` };
			}

			const { error: delAseg } = await supabaseAdmin
				.from("polizas_salud_asegurados")
				.delete()
				.eq("poliza_id", polizaId);
			if (delAseg) {
				return { success: false, error: `Error al limpiar asegurados de salud: ${delAseg.message}` };
			}

			const { error: delNiv } = await supabaseAdmin
				.from("polizas_salud_niveles")
				.delete()
				.eq("poliza_id", polizaId);
			if (delNiv) {
				return { success: false, error: `Error al limpiar niveles de salud: ${delNiv.message}` };
			}

			// Insert new niveles
			if (datosSalud.niveles.length > 0) {
				const { error: errNiveles } = await supabase.from("polizas_salud_niveles").insert(
					datosSalud.niveles.map((n) => ({
						id: n.id,
						poliza_id: polizaId,
						nombre: n.nombre,
						monto: n.monto,
					})),
				);
				if (errNiveles) {
					return { success: false, error: `Error al guardar niveles de salud: ${errNiveles.message}` };
				}
			}

			// Insert contratante
			if (datosSalud.contratante) {
				const { error: errAseg } = await supabase.from("polizas_salud_asegurados").insert({
					poliza_id: polizaId,
					client_id: datosSalud.contratante.client_id,
					nivel_id: datosSalud.contratante.nivel_id,
					rol: datosSalud.contratante.rol,
				});
				if (errAseg) {
					return { success: false, error: `Error al guardar contratante de salud: ${errAseg.message}` };
				}
			}

			// Insert titulares and their familiares
			for (const titular of datosSalud.titulares) {
				const { data: titularDB, error: errTit } = await supabase
					.from("polizas_salud_beneficiarios")
					.insert({
						poliza_id: polizaId,
						nombre_completo: titular.nombre_completo,
						carnet: titular.carnet,
						fecha_nacimiento: titular.fecha_nacimiento || null,
						genero: titular.genero || null,
						nivel_id: titular.nivel_id,
						rol: "titular",
						titular_id: null,
					})
					.select("id")
					.single();
				if (errTit) {
					return { success: false, error: `Error al guardar titular de salud: ${errTit.message}` };
				}
				const familiaresTitular: FamiliarSalud[] = [
					...(titular.conyugue ? [titular.conyugue] : []),
					...(titular.descendientes || []),
				];
				for (const familiar of familiaresTitular) {
					const { error: errFam } = await supabase.from("polizas_salud_beneficiarios").insert({
						poliza_id: polizaId,
						nombre_completo: familiar.nombre_completo,
						carnet: familiar.carnet,
						fecha_nacimiento: familiar.fecha_nacimiento || null,
						genero: familiar.genero || null,
						nivel_id: familiar.nivel_id,
						rol: familiar.rol,
						titular_id: titularDB?.id || null,
					});
					if (errFam) {
						return { success: false, error: `Error al guardar familiar del titular: ${errFam.message}` };
					}
				}
			}

			// Insert contratante-titular's familiares (titular_id = null)
			if (datosSalud.contratante?.rol === "contratante-titular") {
				const familiaresContratante: FamiliarSalud[] = [
					...(datosSalud.contratante.conyugue ? [datosSalud.contratante.conyugue] : []),
					...(datosSalud.contratante.descendientes || []),
				];
				for (const familiar of familiaresContratante) {
					const { error: errFam } = await supabase.from("polizas_salud_beneficiarios").insert({
						poliza_id: polizaId,
						nombre_completo: familiar.nombre_completo,
						carnet: familiar.carnet,
						fecha_nacimiento: familiar.fecha_nacimiento || null,
						genero: familiar.genero || null,
						nivel_id: familiar.nivel_id,
						rol: familiar.rol,
						titular_id: null,
					});
					if (errFam) {
						return {
							success: false,
							error: `Error al guardar familiar del contratante: ${errFam.message}`,
						};
					}
				}
			}
		}

		// 3c. Update Vida / Accidentes Personales / Sepelio data
		if (
			formState.datos_especificos?.tipo_ramo === "Vida" ||
			formState.datos_especificos?.tipo_ramo === "Accidentes Personales" ||
			formState.datos_especificos?.tipo_ramo === "Sepelio"
		) {
			const supabaseAdmin = createAdminClient();
			const datosNivel = formState.datos_especificos.datos;
			const tipoRamo = formState.datos_especificos.tipo_ramo;

			// Delete existing data (beneficiarios first due to FK, then asegurados, then niveles)
			if (tipoRamo === "Vida" || tipoRamo === "Accidentes Personales") {
				const { error: delBenef } = await supabaseAdmin
					.from("polizas_beneficiarios")
					.delete()
					.eq("poliza_id", polizaId);
				if (delBenef) {
					return { success: false, error: `Error al limpiar beneficiarios: ${delBenef.message}` };
				}
			}

			const { error: delAseg } = await supabaseAdmin
				.from("polizas_asegurados_nivel")
				.delete()
				.eq("poliza_id", polizaId);
			if (delAseg) {
				return { success: false, error: `Error al limpiar asegurados: ${delAseg.message}` };
			}

			const { error: delNiv } = await supabaseAdmin.from("polizas_niveles").delete().eq("poliza_id", polizaId);
			if (delNiv) {
				return { success: false, error: `Error al limpiar niveles: ${delNiv.message}` };
			}

			// Insert new niveles and build ID map (client ID -> DB ID)
			const nivelIdMap = new Map<string, string>();
			for (const nivel of datosNivel.niveles || []) {
				const { data: nivelDB, error: errNivel } = await supabase
					.from("polizas_niveles")
					.insert({
						poliza_id: polizaId,
						nombre: nivel.nombre,
						prima_nivel: nivel.prima_nivel || null,
						coberturas: nivel.coberturas,
					})
					.select("id")
					.single();

				if (errNivel) {
					return { success: false, error: `Error al guardar nivel: ${errNivel.message}` };
				}
				if (nivelDB) {
					nivelIdMap.set(nivel.id, nivelDB.id);
				}
			}

			if (tipoRamo === "Sepelio") {
				// Sepelio: DB clients stored in polizas_asegurados_nivel
				const sepData = datosNivel as DatosSepelio;
				const aseguradosSep = sepData.asegurados || [];
				if (aseguradosSep.length > 0) {
					const insertData = aseguradosSep
						.filter((a) => nivelIdMap.has(a.nivel_id))
						.map((a) => ({
							poliza_id: polizaId,
							client_id: a.client_id,
							nivel_id: nivelIdMap.get(a.nivel_id)!,
							cargo: a.cargo || null,
							rol: a.rol || null,
						}));
					if (insertData.length > 0) {
						const { error: errAseg } = await supabase.from("polizas_asegurados_nivel").insert(insertData);
						if (errAseg) {
							return { success: false, error: `Error al guardar asegurados: ${errAseg.message}` };
						}
					}
				}
			} else {
				// Vida / Accidentes Personales: contratante in polizas_asegurados_nivel, asegurados (minimal) in polizas_beneficiarios
				const apVidaData = datosNivel as DatosVida;
				if (apVidaData.contratante && nivelIdMap.has(apVidaData.contratante.nivel_id)) {
					const { error: errAseg } = await supabase.from("polizas_asegurados_nivel").insert({
						poliza_id: polizaId,
						client_id: apVidaData.contratante.client_id,
						nivel_id: nivelIdMap.get(apVidaData.contratante.nivel_id)!,
						rol: apVidaData.contratante.rol,
						cargo: null,
					});
					if (errAseg) {
						return { success: false, error: `Error al guardar contratante: ${errAseg.message}` };
					}
				}
				const aseguradosMin = apVidaData.asegurados || [];
				if (aseguradosMin.length > 0) {
					const insertData = aseguradosMin
						.filter((a) => nivelIdMap.has(a.nivel_id))
						.map((a) => ({
							poliza_id: polizaId,
							nombre_completo: a.nombre_completo,
							carnet: a.carnet,
							fecha_nacimiento: a.fecha_nacimiento || null,
							genero: a.genero || null,
							nivel_id: nivelIdMap.get(a.nivel_id)!,
							rol: "asegurado",
						}));
					if (insertData.length > 0) {
						const { error: errBenef } = await supabase.from("polizas_beneficiarios").insert(insertData);
						if (errBenef) {
							return { success: false, error: `Error al guardar asegurados: ${errBenef.message}` };
						}
					}
				}
			}
		}

		// 3d. Update Incendio y Aliados data
		if (formState.datos_especificos?.tipo_ramo === "Incendio y Aliados") {
			const datosIncendio = formState.datos_especificos.datos;

			// Delete existing bienes (items cascade automatically via FK)
			const { error: delBienes } = await supabase
				.from("polizas_incendio_bienes")
				.delete()
				.eq("poliza_id", polizaId);
			if (delBienes) {
				return { success: false, error: `Error al limpiar bienes de incendio: ${delBienes.message}` };
			}

			// Delete existing asegurados
			const { error: delAsegIncendio } = await supabase
				.from("polizas_incendio_asegurados")
				.delete()
				.eq("poliza_id", polizaId);
			if (delAsegIncendio) {
				return { success: false, error: `Error al limpiar asegurados de incendio: ${delAsegIncendio.message}` };
			}

			// Insert new bienes and their items
			for (const bien of datosIncendio.bienes) {
				const { data: bienDB, error: errBien } = await supabase
					.from("polizas_incendio_bienes")
					.insert({
						poliza_id: polizaId,
						direccion: bien.direccion,
						valor_total_declarado: bien.valor_total_declarado,
						es_primer_riesgo: bien.es_primer_riesgo,
					})
					.select("id")
					.single();

				if (errBien || !bienDB) {
					return { success: false, error: `Error al guardar bien de incendio: ${errBien?.message}` };
				}

				if (bien.items.length > 0) {
					const { error: errItems } = await supabase.from("polizas_incendio_items").insert(
						bien.items.map((item) => ({
							bien_id: bienDB.id,
							nombre: item.nombre,
							monto: item.monto,
						})),
					);
					if (errItems) {
						return { success: false, error: `Error al guardar items de incendio: ${errItems.message}` };
					}
				}
			}

			// Insert new asegurados
			const aseguradosIncendio = datosIncendio.asegurados || [];
			if (aseguradosIncendio.length > 0) {
				const { error: errAsegIncendio } = await supabase.from("polizas_incendio_asegurados").insert(
					aseguradosIncendio.map((a) => ({
						poliza_id: polizaId,
						client_id: a.client_id,
					})),
				);
				if (errAsegIncendio) {
					return {
						success: false,
						error: `Error al guardar asegurados de incendio: ${errAsegIncendio.message}`,
					};
				}
			}
		}

		// 3e. Update Responsabilidad Civil vehicles
		if (formState.datos_especificos?.tipo_ramo === "Responsabilidad Civil") {
			const datosRC = formState.datos_especificos.datos;

			// Update main RC record
			const { error: errRC } = await supabase
				.from("polizas_responsabilidad_civil")
				.update({
					tipo_poliza: datosRC.tipo_poliza,
					valor_asegurado: datosRC.valor_asegurado,
				})
				.eq("poliza_id", polizaId);
			if (errRC) {
				return {
					success: false,
					error: `Error al actualizar datos de responsabilidad civil: ${errRC.message}`,
				};
			}

			// Replace vehicles: delete all and re-insert
			const { error: delVehiculos } = await supabase
				.from("polizas_rc_vehiculos")
				.delete()
				.eq("poliza_id", polizaId);
			if (delVehiculos) {
				return { success: false, error: `Error al limpiar vehículos RC: ${delVehiculos.message}` };
			}

			if (datosRC.vehiculos && datosRC.vehiculos.length > 0) {
				const { error: insVehiculos } = await supabase.from("polizas_rc_vehiculos").insert(
					datosRC.vehiculos.map((v) => ({
						poliza_id: polizaId,
						placa: v.placa,
						nro_chasis: v.nro_chasis,
						uso: v.uso,
						tipo_vehiculo_id: v.tipo_vehiculo_id ?? null,
						marca_vehiculo_id: v.marca_vehiculo_id ?? null,
						modelo: v.modelo ?? null,
						ano: v.ano ?? null,
						color: v.color ?? null,
						nro_motor: v.nro_motor ?? null,
						servicio: v.servicio ?? null,
						capacidad: v.capacidad ?? null,
						region_uso: v.region_uso ?? null,
						tipo_carroceria: v.tipo_carroceria ?? null,
						propiedad: v.propiedad ?? null,
						ejes: v.ejes ?? null,
						asientos: v.asientos ?? null,
						cilindrada: v.cilindrada ?? null,
					})),
				);
				if (insVehiculos) {
					return { success: false, error: `Error al guardar vehículos RC: ${insVehiculos.message}` };
				}
			}
		}

		// 3e-bis. Update/insert Desgravamen (fila 1:1; valor asegurado puede ser 0)
		if (formState.datos_especificos?.tipo_ramo === "Desgravamen") {
			const { error: errDesg } = await supabase.from("polizas_desgravamen").upsert(
				{
					poliza_id: polizaId,
					valor_asegurado: formState.datos_especificos.datos.valor_asegurado,
				},
				{ onConflict: "poliza_id" },
			);
			if (errDesg) {
				return { success: false, error: `Error al actualizar datos de desgravamen: ${errDesg.message}` };
			}
		}

		// 3f. Update Transporte data (fila 1:1 — UPDATE si existe, si no INSERT; sin política DELETE)
		if (formState.datos_especificos?.tipo_ramo === "Transportes") {
			const datosTransporte = formState.datos_especificos.datos;

			const payloadTransporte = {
				materia_asegurada: datosTransporte.materia_asegurada,
				tipo_embalaje: datosTransporte.tipo_embalaje,
				fecha_embarque: datosTransporte.fecha_embarque,
				tipo_transporte: datosTransporte.tipo_transporte,
				pais_origen_id: datosTransporte.pais_origen_id,
				ciudad_origen: datosTransporte.ciudad_origen,
				pais_destino_id: datosTransporte.pais_destino_id,
				ciudad_destino: datosTransporte.ciudad_destino,
				valor_asegurado: datosTransporte.valor_asegurado,
				factura: datosTransporte.factura,
				fecha_factura: datosTransporte.fecha_factura,
				cobertura_a: datosTransporte.cobertura_a,
				cobertura_c: datosTransporte.cobertura_c,
				modalidad: datosTransporte.modalidad,
			};

			const { data: existeTransporte } = await supabase
				.from("polizas_transporte")
				.select("id")
				.eq("poliza_id", polizaId)
				.maybeSingle();

			if (existeTransporte) {
				const { error: errTransporte } = await supabase
					.from("polizas_transporte")
					.update(payloadTransporte)
					.eq("poliza_id", polizaId);
				if (errTransporte) {
					return {
						success: false,
						error: `Error al actualizar datos de transporte: ${errTransporte.message}`,
					};
				}
			} else {
				const { error: errTransporte } = await supabase
					.from("polizas_transporte")
					.insert({ poliza_id: polizaId, ...payloadTransporte });
				if (errTransporte) {
					return { success: false, error: `Error al guardar datos de transporte: ${errTransporte.message}` };
				}
			}
		}

		// 3g. Update Aeronavegación / Naves o embarcaciones data (niveles + naves + asegurados por reemplazo)
		if (
			formState.datos_especificos?.tipo_ramo === "Aeronavegación" ||
			formState.datos_especificos?.tipo_ramo === "Naves o embarcaciones"
		) {
			const datosAero = formState.datos_especificos.datos;

			// Borrar naves antes que niveles (FK nivel_ap_id es ON DELETE SET NULL), luego asegurados
			const { error: delNaves } = await supabase
				.from("polizas_aeronavegacion_naves")
				.delete()
				.eq("poliza_id", polizaId);
			if (delNaves) {
				return { success: false, error: `Error al limpiar naves: ${delNaves.message}` };
			}

			const { error: delNiveles } = await supabase
				.from("polizas_aeronavegacion_niveles_ap")
				.delete()
				.eq("poliza_id", polizaId);
			if (delNiveles) {
				return { success: false, error: `Error al limpiar niveles AP: ${delNiveles.message}` };
			}

			const { error: delAsegAero } = await supabase
				.from("polizas_aeronavegacion_asegurados")
				.delete()
				.eq("poliza_id", polizaId);
			if (delAsegAero) {
				return {
					success: false,
					error: `Error al limpiar asegurados de aeronavegación: ${delAsegAero.message}`,
				};
			}

			// Reinsertar niveles AP y mapear id de cliente -> id de BD para las naves
			const nivelApIdMap = new Map<string, string>();
			for (const nivel of datosAero.niveles_ap || []) {
				const { data: nivelDB, error: errNivel } = await supabase
					.from("polizas_aeronavegacion_niveles_ap")
					.insert({
						poliza_id: polizaId,
						nombre: nivel.nombre,
						monto_muerte_accidental: nivel.monto_muerte_accidental,
						monto_invalidez: nivel.monto_invalidez,
						monto_gastos_medicos: nivel.monto_gastos_medicos,
					})
					.select("id")
					.single();
				if (errNivel) {
					return { success: false, error: `Error al guardar nivel de AP: ${errNivel.message}` };
				}
				if (nivelDB) {
					nivelApIdMap.set(nivel.id, nivelDB.id);
				}
			}

			const naves = datosAero.naves || [];
			if (naves.length > 0) {
				const { error: errNaves } = await supabase.from("polizas_aeronavegacion_naves").insert(
					naves.map((nave) => ({
						poliza_id: polizaId,
						matricula: nave.matricula,
						marca: nave.marca,
						modelo: nave.modelo,
						ano: nave.ano,
						serie: nave.serie || "",
						uso: nave.uso,
						nro_pasajeros: nave.nro_pasajeros,
						nro_tripulantes: nave.nro_tripulantes,
						valor_casco: nave.valor_casco,
						valor_responsabilidad_civil: nave.valor_responsabilidad_civil,
						nivel_ap_id: nave.nivel_ap_id ? nivelApIdMap.get(nave.nivel_ap_id) || null : null,
					})),
				);
				if (errNaves) {
					return { success: false, error: `Error al guardar naves/embarcaciones: ${errNaves.message}` };
				}
			}

			const aseguradosAero = datosAero.asegurados_adicionales || [];
			if (aseguradosAero.length > 0) {
				const { error: errAsegAero } = await supabase.from("polizas_aeronavegacion_asegurados").insert(
					aseguradosAero.map((a) => ({
						poliza_id: polizaId,
						client_id: a.client_id,
					})),
				);
				if (errAsegAero) {
					return {
						success: false,
						error: `Error al guardar asegurados de aeronavegación: ${errAsegAero.message}`,
					};
				}
			}
		}

		// 3h. Update Ramos técnicos data (fila 1:1 principal sin DELETE + equipos por reemplazo)
		if (formState.datos_especificos?.tipo_ramo === "Ramos técnicos") {
			const datosRT = formState.datos_especificos.datos;

			const { data: existeRT } = await supabase
				.from("polizas_ramos_tecnicos")
				.select("id")
				.eq("poliza_id", polizaId)
				.maybeSingle();

			if (existeRT) {
				const { error: errRT } = await supabase
					.from("polizas_ramos_tecnicos")
					.update({
						valor_asegurado: datosRT.valor_asegurado,
						tipo_poliza: datosRT.tipo_poliza,
					})
					.eq("poliza_id", polizaId);
				if (errRT) {
					return { success: false, error: `Error al actualizar datos de ramos técnicos: ${errRT.message}` };
				}
			} else {
				const { error: errRT } = await supabase.from("polizas_ramos_tecnicos").insert({
					poliza_id: polizaId,
					valor_asegurado: datosRT.valor_asegurado,
					tipo_poliza: datosRT.tipo_poliza,
				});
				if (errRT) {
					return { success: false, error: `Error al guardar datos de ramos técnicos: ${errRT.message}` };
				}
			}

			// Reemplazar equipos: borrar todos y reinsertar
			const { error: delEquipos } = await supabase
				.from("polizas_ramos_tecnicos_equipos")
				.delete()
				.eq("poliza_id", polizaId);
			if (delEquipos) {
				return { success: false, error: `Error al limpiar equipos: ${delEquipos.message}` };
			}

			const equipos = datosRT.equipos || [];
			if (equipos.length > 0) {
				const { error: insEquipos } = await supabase.from("polizas_ramos_tecnicos_equipos").insert(
					equipos.map((equipo) => ({
						poliza_id: polizaId,
						nro_serie: equipo.nro_serie,
						valor_asegurado: equipo.valor_asegurado,
						franquicia: equipo.franquicia,
						nro_chasis: equipo.nro_chasis,
						uso: equipo.uso,
						coaseguro: equipo.coaseguro,
						placa: equipo.placa || null,
						tipo_equipo_id: equipo.tipo_equipo_id || null,
						marca_equipo_id: equipo.marca_equipo_id || null,
						modelo: equipo.modelo || null,
						ano: equipo.ano || null,
						color: equipo.color || null,
						nro_motor: equipo.nro_motor || null,
						plaza_circulacion: equipo.plaza_circulacion || null,
					})),
				);
				if (insEquipos) {
					return { success: false, error: `Error al guardar equipos: ${insEquipos.message}` };
				}
			}
		}

		// 3i. Update Riesgos Varios Misceláneos data (bienes con items en cascada + asegurados)
		if (formState.datos_especificos?.tipo_ramo === "Riesgos Varios Misceláneos") {
			const datosRV = formState.datos_especificos.datos;

			// Borrar bienes (items se eliminan en cascada por FK) y asegurados
			const { error: delBienesRV } = await supabase
				.from("polizas_riesgos_varios_bienes")
				.delete()
				.eq("poliza_id", polizaId);
			if (delBienesRV) {
				return { success: false, error: `Error al limpiar bienes de riesgos varios: ${delBienesRV.message}` };
			}

			const { error: delAsegRV } = await supabase
				.from("polizas_riesgos_varios_asegurados")
				.delete()
				.eq("poliza_id", polizaId);
			if (delAsegRV) {
				return { success: false, error: `Error al limpiar asegurados de riesgos varios: ${delAsegRV.message}` };
			}

			// Reinsertar bienes y sus items
			for (const bien of datosRV.bienes) {
				const { data: bienDB, error: errBien } = await supabase
					.from("polizas_riesgos_varios_bienes")
					.insert({
						poliza_id: polizaId,
						direccion: bien.direccion,
						valor_total_declarado: bien.valor_total_declarado,
						es_primer_riesgo: bien.es_primer_riesgo,
					})
					.select("id")
					.single();
				if (errBien || !bienDB) {
					return { success: false, error: `Error al guardar bien de riesgos varios: ${errBien?.message}` };
				}

				if (bien.items.length > 0) {
					const { error: errItems } = await supabase.from("polizas_riesgos_varios_items").insert(
						bien.items.map((item) => ({
							bien_id: bienDB.id,
							nombre: item.nombre,
							monto: item.monto,
						})),
					);
					if (errItems) {
						return {
							success: false,
							error: `Error al guardar items de riesgos varios: ${errItems.message}`,
						};
					}
				}
			}

			// Reinsertar asegurados
			const aseguradosRV = datosRV.asegurados || [];
			if (aseguradosRV.length > 0) {
				const { error: errAsegRV } = await supabase.from("polizas_riesgos_varios_asegurados").insert(
					aseguradosRV.map((a) => ({
						poliza_id: polizaId,
						client_id: a.client_id,
					})),
				);
				if (errAsegRV) {
					return {
						success: false,
						error: `Error al guardar asegurados de riesgos varios: ${errAsegRV.message}`,
					};
				}
			}
		}

		// 4. Soft-delete documentos existentes que el usuario quitó durante la edición.
		// Los documentos que se conservan llegan en formState con su `id` de BD; cualquier
		// documento activo en BD cuyo id ya no esté presente fue removido en la UI.
		// IMPORTANTE: este paso DEBE correr ANTES de insertar los documentos nuevos. Los
		// documentos nuevos no traen `id` de form, así que su `id` recién creado en BD nunca
		// estaría en `idsConservados` y serían descartados de inmediato (bug de orden previo).
		const idsConservados = new Set(formState.documentos.filter((d) => d.id).map((d) => d.id));

		const { data: docsActuales } = await supabase
			.from("polizas_documentos")
			.select("id")
			.eq("poliza_id", polizaId)
			.eq("estado", "activo");

		const docsRemovidos = (docsActuales || []).filter((d) => !idsConservados.has(d.id));

		for (const doc of docsRemovidos) {
			const { error: descartarError } = await supabase.rpc("descartar_documento", {
				documento_id: doc.id,
			});
			if (descartarError) {
				console.error("[actualizarPoliza] Error descartando documento removido:", descartarError);
			}
		}

		// 4b. Handle new documents (uploaded client-side to temp/)
		const newDocuments = formState.documentos.filter(
			(d) => d.storage_path && d.upload_status === "uploaded" && !d.id,
		);

		for (const documento of newDocuments) {
			const tempPath = documento.storage_path!;
			const finalPath = generateFinalStoragePath(polizaId, documento.nombre_archivo);

			// Mover archivo de temp/ a {polizaId}/
			let usedPath = finalPath;
			const { error: moveError } = await supabase.storage.from("polizas-documentos").move(tempPath, finalPath);

			if (moveError) {
				console.error("[actualizarPoliza] Error moviendo documento, usando ruta temporal:", moveError);
				usedPath = tempPath;
			}

			await supabase.from("polizas_documentos").insert({
				poliza_id: polizaId,
				tipo_documento: documento.tipo_documento,
				nombre_archivo: documento.nombre_archivo,
				archivo_url: usedPath,
				tamano_bytes: documento.tamano_bytes,
				estado: "activo",
			});
		}

		// Nota: El historial de la tabla polizas es manejado por el trigger 'trigger_historial_polizas'
		// Pero las cuotas están en otra tabla, así que las registramos manualmente si hubo cambios

		// Detectar si hubo cambios en cuotas (comparar con currentPagos)
		const { data: newPagos } = await supabase
			.from("polizas_pagos")
			.select("numero_cuota, monto, fecha_vencimiento")
			.eq("poliza_id", polizaId)
			.order("numero_cuota");

		// Comparar cuotas antiguas vs nuevas (monto y fecha forman parte del plan de pagos)
		const firmaCuota = (p: { numero_cuota: number; monto: number; fecha_vencimiento: string | null }) =>
			`${p.numero_cuota}:${p.monto}:${p.fecha_vencimiento}`;
		const cuotasOriginales = (currentPagos || [])
			.filter((p) => p.estado !== "pagado")
			.map(firmaCuota)
			.sort()
			.join(",");
		const cuotasNuevas = (newPagos || [])
			.filter((p) => !cuotasPagadas.some((cp) => cp.numero_cuota === p.numero_cuota))
			.map(firmaCuota)
			.sort()
			.join(",");
		const cuotasCambiaron = cuotasOriginales !== cuotasNuevas;

		if (cuotasCambiaron) {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			await supabase.from("polizas_historial_ediciones").insert({
				poliza_id: polizaId,
				accion: "edicion",
				usuario_id: user?.id,
				descripcion: "Modificado: cuotas de pago",
				campos_modificados: ["cuotas"],
			});
		}

		// Nota: editar el plan de pagos de una póliza activa ya NO la regresa a
		// 'pendiente' (solo un rechazo de admin reinicia la validación). El cambio
		// de cuotas se registra arriba en el historial para dejar audit trail.

		// Revalidate paths
		revalidatePath(`/polizas/${polizaId}`);
		revalidatePath("/polizas");
		revalidatePath("/gerencia/validacion");

		return { success: true, data: { id: polizaId } };
	} catch (error) {
		console.error("[actualizarPoliza] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
