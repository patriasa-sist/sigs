/**
 * Policy Edit Server Actions
 * @module app/polizas/[id]/editar/actions
 * @description Server-side actions for editing existing policies
 *
 * Key behaviors:
 * - Verifies edit permission before any operation
 * - When editing a validated policy (estado='activa'), resets to 'pendiente'
 * - Clears validation fields (validado_por, fecha_validacion) when resetting
 * - Audit trail is automatically captured by database triggers
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
	PolizaFormState,
	AseguradoSeleccionado,
	DatosBasicosPoliza,
	DatosEspecificosPoliza,
	ModalidadPago,
	DocumentoPoliza,
	VehiculoAutomotor,
} from "@/types/poliza";
import type { ActionResult } from "@/types/policyPermission";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitiza un nombre de archivo para que sea compatible con Supabase Storage
 */
function sanitizarNombreArchivo(nombreArchivo: string): string {
	return (
		nombreArchivo
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/\s+/g, "_")
			.replace(/[^a-zA-Z0-9._-]/g, "")
			.replace(/_+/g, "_")
			.toLowerCase()
	);
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

	// Check if user is the creator of a rejected policy within edit window
	const { data: polizaRechazada } = await supabase
		.from("polizas")
		.select("created_by, estado, puede_editar_hasta")
		.eq("id", polizaId)
		.single();

	if (
		polizaRechazada?.estado === "rechazada" &&
		polizaRechazada.created_by === user.id &&
		polizaRechazada.puede_editar_hasta &&
		new Date(polizaRechazada.puede_editar_hasta) > new Date()
	) {
		// User is the creator and within the rejection edit window
		return { supabase, user, profile, canEdit: true };
	}

	// Only comercial role can have specific permissions
	if (profile.role !== "comercial") {
		throw new Error("No tienes permiso para editar pólizas");
	}

	// Check using database function for explicit permissions
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
export async function obtenerPolizaParaEdicion(
	polizaId: string
): Promise<ActionResult<PolizaFormState>> {
	try {
		const { supabase } = await verifyEditPermission(polizaId);

		// 1. Get main policy data
		const { data: poliza, error: errorPoliza } = await supabase
			.from("polizas")
			.select(`
				*,
				companias_aseguradoras (id, nombre),
				regionales (id, nombre),
				categorias (id, nombre),
				profiles!polizas_responsable_id_fkey (id, full_name)
			`)
			.eq("id", polizaId)
			.single();

		if (errorPoliza || !poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// 2. Get client information
		const { data: client } = await supabase
			.from("clients")
			.select("id, client_type, status, created_at")
			.eq("id", poliza.client_id)
			.single();

		if (!client) {
			return { success: false, error: "Cliente no encontrado" };
		}

		let asegurado: AseguradoSeleccionado;

		if (client.client_type === "natural") {
			const { data: naturalClient } = await supabase
				.from("natural_clients")
				.select("*")
				.eq("client_id", poliza.client_id)
				.single();

			if (!naturalClient) {
				return { success: false, error: "Datos del cliente no encontrados" };
			}

			const nombres = [naturalClient.primer_nombre, naturalClient.segundo_nombre]
				.filter(Boolean)
				.join(" ");
			const apellidos = [naturalClient.primer_apellido, naturalClient.segundo_apellido]
				.filter(Boolean)
				.join(" ");

			asegurado = {
				id: client.id,
				client_type: "natural",
				status: client.status,
				created_at: client.created_at,
				detalles: naturalClient,
				nombre_completo: `${nombres} ${apellidos}`.trim(),
				documento: naturalClient.numero_documento || "-",
			};
		} else {
			const { data: juridicClient } = await supabase
				.from("juridic_clients")
				.select("*")
				.eq("client_id", poliza.client_id)
				.single();

			if (!juridicClient) {
				return { success: false, error: "Datos del cliente no encontrados" };
			}

			asegurado = {
				id: client.id,
				client_type: "juridica",
				status: client.status,
				created_at: client.created_at,
				detalles: juridicClient,
				nombre_completo: juridicClient.razon_social,
				documento: juridicClient.nit || "-",
			};
		}

		// 3. Build datos_basicos
		const datos_basicos: DatosBasicosPoliza = {
			numero_poliza: poliza.numero_poliza,
			compania_aseguradora_id: poliza.compania_aseguradora_id,
			ramo: poliza.ramo,
			producto_id: poliza.producto_id || "",
			inicio_vigencia: poliza.inicio_vigencia,
			fin_vigencia: poliza.fin_vigencia,
			fecha_emision_compania: poliza.fecha_emision_compania,
			responsable_id: poliza.responsable_id,
			regional_id: poliza.regional_id,
			categoria_id: poliza.categoria_id || undefined,
			grupo_produccion: poliza.grupo_produccion || "generales",
			moneda: poliza.moneda,
		};

		// 4. Get payment data and build modalidad_pago
		const { data: pagos } = await supabase
			.from("polizas_pagos")
			.select("id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago, observaciones")
			.eq("poliza_id", polizaId)
			.order("numero_cuota", { ascending: true });

		let modalidad_pago: ModalidadPago;

		// Check if any cuota is paid (to block modality changes)
		const tienePagos = pagos?.some(p => p.estado === "pagado") || false;

		if (poliza.modalidad_pago === "contado") {
			const pago = pagos?.[0];
			modalidad_pago = {
				tipo: "contado",
				cuota_unica: pago?.monto || poliza.prima_total,
				fecha_pago_unico: pago?.fecha_vencimiento || poliza.inicio_vigencia,
				prima_total: poliza.prima_total,
				moneda: poliza.moneda,
				prima_neta: poliza.prima_neta,
				comision: poliza.comision,
				cuota_id: pago?.id,
				cuota_pagada: pago?.estado === "pagado",
			};
		} else {
			// Credito
			const cuotaInicial = pagos?.find(p => p.observaciones?.toLowerCase().includes("inicial"));
			const cuotasRestantes = pagos?.filter(p => !p.observaciones?.toLowerCase().includes("inicial")) || [];

			modalidad_pago = {
				tipo: "credito",
				prima_total: poliza.prima_total,
				moneda: poliza.moneda,
				cantidad_cuotas: cuotasRestantes.length + (cuotaInicial ? 1 : 0),
				cuota_inicial: cuotaInicial?.monto || 0,
				fecha_inicio_cuotas: cuotasRestantes[0]?.fecha_vencimiento || poliza.inicio_vigencia,
				periodo_pago: "mensual", // Default, this is calculated
				cuotas: cuotasRestantes.map((c) => ({
					id: c.id,
					numero: c.numero_cuota, // Preservar número original de la BD
					monto: c.monto,
					fecha_vencimiento: c.fecha_vencimiento,
					estado: c.estado as "pendiente" | "pagado" | "vencida",
					fecha_pago: c.fecha_pago || undefined,
				})),
				prima_neta: poliza.prima_neta,
				comision: poliza.comision,
				cuota_inicial_id: cuotaInicial?.id,
				cuota_inicial_pagada: cuotaInicial?.estado === "pagado",
				tiene_pagos: tienePagos,
			};
		}

		// 5. Get datos_especificos based on ramo
		let datos_especificos: DatosEspecificosPoliza | null = null;

		if (poliza.ramo.toLowerCase().includes("automotor")) {
			const { data: vehiculos } = await supabase
				.from("polizas_automotor_vehiculos")
				.select("*")
				.eq("poliza_id", polizaId);

			const vehiculosFormateados: VehiculoAutomotor[] = (vehiculos || []).map(v => ({
				id: v.id,
				placa: v.placa,
				valor_asegurado: v.valor_asegurado,
				franquicia: v.franquicia,
				nro_chasis: v.nro_chasis,
				uso: v.uso,
				coaseguro: v.coaseguro || 0,
				tipo_vehiculo_id: v.tipo_vehiculo_id || undefined,
				marca_id: v.marca_id || undefined,
				modelo: v.modelo || undefined,
				ano: v.ano || undefined,
				color: v.color || undefined,
				ejes: v.ejes || undefined,
				nro_motor: v.nro_motor || undefined,
				nro_asientos: v.nro_asientos || undefined,
				plaza_circulacion: v.plaza_circulacion || undefined,
			}));

			datos_especificos = {
				tipo_ramo: "Automotores",
				datos: {
					tipo_poliza: vehiculosFormateados.length > 1 ? "corporativo" : "individual",
					vehiculos: vehiculosFormateados,
				},
			};
		}
		// Add other ramo types as needed (Salud, Incendio, etc.)

		// 6. Get documents (only active ones)
		const { data: documentos } = await supabase
			.from("polizas_documentos")
			.select("id, tipo_documento, nombre_archivo, archivo_url, tamano_bytes")
			.eq("poliza_id", polizaId)
			.eq("estado", "activo");

		const documentosFormateados: DocumentoPoliza[] = (documentos || []).map(d => ({
			id: d.id,
			tipo_documento: d.tipo_documento,
			nombre_archivo: d.nombre_archivo,
			archivo_url: d.archivo_url,
			tamano_bytes: d.tamano_bytes,
			estado: "activo",
		}));

		// 7. Build complete PolizaFormState
		const formState: PolizaFormState = {
			paso_actual: 6, // Start at summary step for editing
			asegurado,
			datos_basicos,
			datos_especificos,
			modalidad_pago,
			documentos: documentosFormateados,
			advertencias: [],
			en_edicion: true,
			poliza_id: polizaId,
		};

		return { success: true, data: formState };
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
 * - Resets estado to 'pendiente' if policy was 'activa'
 * - Clears validation fields when resetting
 * - Updates related records (payments, vehicles, documents)
 */
export async function actualizarPoliza(
	polizaId: string,
	formState: PolizaFormState
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

		// Get current policy state
		const { data: currentPoliza, error: fetchError } = await supabase
			.from("polizas")
			.select("estado, modalidad_pago")
			.eq("id", polizaId)
			.single();

		if (fetchError || !currentPoliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// Get current payments to check for paid cuotas
		const { data: currentPagos } = await supabase
			.from("polizas_pagos")
			.select("id, estado, monto, numero_cuota, observaciones")
			.eq("poliza_id", polizaId);

		const cuotasPagadas = currentPagos?.filter(p => p.estado === "pagado") || [];
		const tienePagos = cuotasPagadas.length > 0;

		// Block modality change if there are paid cuotas
		if (tienePagos && currentPoliza.modalidad_pago !== formState.modalidad_pago.tipo) {
			return {
				success: false,
				error: "No se puede cambiar la modalidad de pago porque hay cuotas ya pagadas"
			};
		}

		// Determine if we need to reset to pending (from activa OR rechazada)
		const needsRevalidation = currentPoliza.estado === "activa" || currentPoliza.estado === "rechazada";

		// Build update payload
		const pagoData = formState.modalidad_pago as {
			prima_neta?: number;
			comision?: number;
			comision_empresa?: number;
			comision_encargado?: number;
		};

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
			responsable_id: formState.datos_basicos.responsable_id,
			regional_id: formState.datos_basicos.regional_id,
			categoria_id: formState.datos_basicos.categoria_id || null,
			modalidad_pago: formState.modalidad_pago.tipo,
			prima_total: formState.modalidad_pago.prima_total,
			moneda: formState.modalidad_pago.moneda,
			prima_neta: pagoData.prima_neta || null,
			comision: pagoData.comision_empresa || pagoData.comision || null,
			comision_empresa: pagoData.comision_empresa || null,
			comision_encargado: pagoData.comision_encargado || null,
		};

		// If policy was active or rejected, reset to pending and clear validation/rejection
		if (needsRevalidation) {
			updatePayload.estado = "pendiente";
			updatePayload.validado_por = null;
			updatePayload.fecha_validacion = null;
			// Clear rejection fields if it was rejected
			if (currentPoliza.estado === "rechazada") {
				updatePayload.motivo_rechazo = null;
				updatePayload.rechazado_por = null;
				updatePayload.fecha_rechazo = null;
				updatePayload.puede_editar_hasta = null;
			}
		}

		// 1. Update main policy
		const { error: updateError } = await supabase
			.from("polizas")
			.update(updatePayload)
			.eq("id", polizaId);

		if (updateError) {
			console.error("[actualizarPoliza] Update error:", updateError);
			return { success: false, error: "Error al actualizar la póliza" };
		}

		// 2. Update payments - usar UPDATE para cuotas existentes (evita problemas de constraint único)
		// Map de cuotas pagadas por id para verificación rápida
		const idsCuotasPagadas = new Set(cuotasPagadas.map(p => p.id));

		if (formState.modalidad_pago.tipo === "contado") {
			// Buscar la cuota existente para contado
			const cuotaExistente = currentPagos?.find(p => p.numero_cuota === 1);

			if (cuotaExistente) {
				// Solo actualizar si no está pagada
				if (!idsCuotasPagadas.has(cuotaExistente.id)) {
					const { error: updateError } = await supabase
						.from("polizas_pagos")
						.update({
							monto: formState.modalidad_pago.cuota_unica,
							fecha_vencimiento: formState.modalidad_pago.fecha_pago_unico,
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
					monto: formState.modalidad_pago.cuota_unica,
					fecha_vencimiento: formState.modalidad_pago.fecha_pago_unico,
					estado: "pendiente",
				});
				if (insertError) {
					console.error("[actualizarPoliza] Error inserting contado cuota:", insertError);
					return { success: false, error: "Error al guardar la cuota de pago" };
				}
			}
		} else {
			// Crédito: actualizar cuotas existentes, insertar nuevas
			const erroresActualizacion: string[] = [];

			// Procesar todas las cuotas del formulario
			for (const cuota of formState.modalidad_pago.cuotas) {
				// Skip cuotas pagadas - no se modifican
				const estaPagada = cuota.estado === "pagado" ||
					(cuota.id && idsCuotasPagadas.has(cuota.id));

				if (estaPagada) {
					continue;
				}

				if (cuota.id) {
					// Cuota existente - UPDATE
					const { error: updateError } = await supabase
						.from("polizas_pagos")
						.update({
							monto: cuota.monto,
							fecha_vencimiento: cuota.fecha_vencimiento,
							numero_cuota: cuota.numero,
						})
						.eq("id", cuota.id);

					if (updateError) {
						console.error(`[actualizarPoliza] Error updating cuota ${cuota.numero}:`, updateError);
						erroresActualizacion.push(`Cuota ${cuota.numero}: ${updateError.message}`);
					}
				} else {
					// Cuota nueva - INSERT
					const { error: insertError } = await supabase.from("polizas_pagos").insert({
						poliza_id: polizaId,
						numero_cuota: cuota.numero,
						monto: cuota.monto,
						fecha_vencimiento: cuota.fecha_vencimiento,
						estado: "pendiente",
					});

					if (insertError) {
						console.error(`[actualizarPoliza] Error inserting cuota ${cuota.numero}:`, insertError);
						erroresActualizacion.push(`Cuota ${cuota.numero}: ${insertError.message}`);
					}
				}
			}

			// Handle cuota inicial si existe y no está pagada
			if (formState.modalidad_pago.cuota_inicial > 0) {
				const cuotaInicialExistente = currentPagos?.find(
					p => p.observaciones?.toLowerCase().includes("inicial")
				);

				if (cuotaInicialExistente && !idsCuotasPagadas.has(cuotaInicialExistente.id)) {
					// Actualizar cuota inicial existente
					const { error: updateError } = await supabase
						.from("polizas_pagos")
						.update({
							monto: formState.modalidad_pago.cuota_inicial,
							fecha_vencimiento: formState.datos_basicos.inicio_vigencia,
						})
						.eq("id", cuotaInicialExistente.id);

					if (updateError) {
						erroresActualizacion.push(`Cuota inicial: ${updateError.message}`);
					}
				}
			}

			if (erroresActualizacion.length > 0) {
				return {
					success: false,
					error: `Error al actualizar cuotas: ${erroresActualizacion.join(", ")}`
				};
			}
		}

		// 3. Update vehicles for Automotor ramo
		if (formState.datos_especificos?.tipo_ramo === "Automotores") {
			// Delete existing vehicles
			await supabase
				.from("polizas_automotor_vehiculos")
				.delete()
				.eq("poliza_id", polizaId);

			// Insert new vehicles
			const vehiculos = formState.datos_especificos.datos.vehiculos.map(
				(vehiculo) => ({
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
				})
			);

			if (vehiculos.length > 0) {
				await supabase.from("polizas_automotor_vehiculos").insert(vehiculos);
			}
		}

		// 4. Handle new documents (documents with file property)
		const newDocuments = formState.documentos.filter((d) => d.file);

		for (const documento of newDocuments) {
			if (!documento.file) continue;

			const nombreSanitizado = sanitizarNombreArchivo(documento.nombre_archivo);
			const timestamp = Date.now();
			const nombreArchivo = `${polizaId}/${timestamp}-${nombreSanitizado}`;

			const { error: uploadError } = await supabase.storage
				.from("polizas-documentos")
				.upload(nombreArchivo, documento.file);

			if (uploadError) {
				console.error("[actualizarPoliza] Document upload error:", uploadError);
				continue;
			}

			const {
				data: { publicUrl },
			} = supabase.storage.from("polizas-documentos").getPublicUrl(nombreArchivo);

			await supabase.from("polizas_documentos").insert({
				poliza_id: polizaId,
				tipo_documento: documento.tipo_documento,
				nombre_archivo: documento.nombre_archivo,
				archivo_url: publicUrl,
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

		// Comparar cuotas antiguas vs nuevas
		const cuotasOriginales = (currentPagos || [])
			.filter(p => p.estado !== "pagado")
			.map(p => `${p.numero_cuota}:${p.monto}`)
			.sort()
			.join(",");
		const cuotasNuevas = (newPagos || [])
			.filter(p => !cuotasPagadas.some(cp => cp.numero_cuota === p.numero_cuota))
			.map(p => `${p.numero_cuota}:${p.monto}`)
			.sort()
			.join(",");

		if (cuotasOriginales !== cuotasNuevas) {
			const { data: { user } } = await supabase.auth.getUser();
			await supabase.from("polizas_historial_ediciones").insert({
				poliza_id: polizaId,
				accion: "edicion",
				usuario_id: user?.id,
				descripcion: "Modificado: cuotas de pago",
				campos_modificados: ["cuotas"],
			});
		}

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
