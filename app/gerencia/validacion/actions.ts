"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPermission, getDataScopeFilter } from "@/utils/auth/helpers";
import { enviarEmailRechazoPoliza } from "@/utils/resend";

/**
 * Verifica si un usuario es líder de equipo para un responsable dado.
 * Retorna true si el usuario tiene rol_equipo='lider' en algún equipo
 * que también contenga al responsable_id.
 */
async function checkTeamLeaderForPolicy(
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

		const { allowed } = await checkPermission("polizas.validar");
		if (!allowed) {
			return { success: false, error: "No tiene permisos para validar pólizas" };
		}

		const { needsScoping, teamMemberIds } = await getDataScopeFilter("polizas");

		// Obtener pólizas pendientes con joins
		let query = supabase
			.from("polizas")
			.select(
				`
				id,
				numero_poliza,
				ramo,
				prima_total,
				prima_neta,
				moneda,
				modalidad_pago,
				inicio_vigencia,
				fin_vigencia,
				created_at,
				responsable_id,
				compania:companias_aseguradoras!compania_aseguradora_id (
					nombre
				),
				responsable:profiles!responsable_id (
					full_name
				),
				regional:regionales!regional_id (
					nombre
				),
				created_by_user:profiles!created_by (
					full_name
				)
			`,
			)
			.eq("estado", "pendiente")
			.order("created_at", { ascending: false });

		if (needsScoping && teamMemberIds.length > 0) {
			query = query.in("responsable_id", teamMemberIds);
		}

		const { data: polizas, error } = await query;

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

		const { allowed } = await checkPermission("polizas.validar");

		const { needsScoping, teamMemberIds } = await getDataScopeFilter("polizas");

		// Verificar que la póliza exista y esté pendiente
		const { data: poliza } = await supabase
			.from("polizas")
			.select("id, estado, responsable_id")
			.eq("id", polizaId)
			.single();

		if (!poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// Si no tiene permiso JWT, verificar si es líder de equipo para esta póliza
		if (!allowed) {
			const esLider = poliza.responsable_id
				? await checkTeamLeaderForPolicy(supabase, user.id, poliza.responsable_id)
				: false;
			if (!esLider) {
				return { success: false, error: "No tiene permisos para validar pólizas" };
			}
		}

		if (needsScoping && (!poliza.responsable_id || !teamMemberIds.includes(poliza.responsable_id))) {
			// Allow team leaders even when needsScoping - they already passed the esLider check above
			if (allowed) {
				return { success: false, error: "No tiene permisos para validar esta póliza" };
			}
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
 * Obtiene el detalle completo de una póliza para su revisión en el panel de validación.
 * Carga: datos básicos, cliente, vehículos (Automotor) y cuotas de pago.
 */
export async function obtenerDetallePolizaParaValidacion(polizaId: string) {
	const supabase = await createClient();

	try {
		const { data: poliza, error } = await supabase
			.from("polizas")
			.select(
				`
				id, numero_poliza, ramo, prima_total, prima_neta, moneda,
				modalidad_pago,
				inicio_vigencia, fin_vigencia,
				client_id,
				compania:companias_aseguradoras!compania_aseguradora_id(nombre),
				responsable:profiles!responsable_id(full_name),
				regional:regionales!regional_id(nombre),
				created_by_user:profiles!created_by(full_name),
				pagos:polizas_pagos(
					id, numero_cuota, monto, fecha_vencimiento, fecha_pago, estado
				)
			`,
			)
			.eq("id", polizaId)
			.single();

		if (error || !poliza) {
			console.error("[obtenerDetallePolizaParaValidacion] error:", error, "polizaId:", polizaId);
			return { success: false as const, error: "Póliza no encontrada" };
		}

		// Ordenar cuotas por numero_cuota en el cliente (evita .order con referencedTable)
		if (Array.isArray(poliza.pagos)) {
			(poliza.pagos as Array<{ numero_cuota: number }>).sort(
				(a, b) => a.numero_cuota - b.numero_cuota,
			);
		}

		// Resolver nombre del cliente según su tipo
		let clienteNombre = "Sin cliente";
		if (poliza.client_id) {
			const { data: client } = await supabase
				.from("clients")
				.select("client_type")
				.eq("id", poliza.client_id)
				.single();

			if (client?.client_type === "natural" || client?.client_type === "unipersonal") {
				const { data: nc } = await supabase
					.from("natural_clients")
					.select(
						"primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, tipo_documento, numero_documento",
					)
					.eq("client_id", poliza.client_id)
					.single();
				if (nc) {
					const nombre = [nc.primer_nombre, nc.segundo_nombre].filter(Boolean).join(" ");
					const apellido = [nc.primer_apellido, nc.segundo_apellido].filter(Boolean).join(" ");
					clienteNombre = `${nombre} ${apellido}`.trim();
				}
			} else if (client?.client_type === "juridica") {
				const { data: jc } = await supabase
					.from("juridic_clients")
					.select("razon_social")
					.eq("client_id", poliza.client_id)
					.single();
				if (jc) clienteNombre = jc.razon_social;
			}
		}

		// Vehículos (solo Automotor)
		let vehiculos: Array<{
			id: string;
			placa: string;
			valor_asegurado: number;
			franquicia: number;
			nro_chasis: string;
			uso: string;
			coaseguro: number;
			modelo: string | null;
			ano: number | null;
			color: string | null;
			tipo_vehiculo: { nombre: string } | null;
			marca: { nombre: string } | null;
		}> = [];

		if (poliza.ramo === "Automotor") {
			const { data: veh } = await supabase
				.from("polizas_automotor_vehiculos")
				.select(
					`
					id, placa, valor_asegurado, franquicia, nro_chasis, uso, coaseguro,
					modelo, ano, color,
					tipo_vehiculo:tipos_vehiculo!tipo_vehiculo_id(nombre),
					marca:marcas_vehiculo!marca_id(nombre)
				`,
				)
				.eq("poliza_id", polizaId)
				.order("created_at", { ascending: true });
			if (veh) vehiculos = veh as unknown as typeof vehiculos;
		}

		return {
			success: true as const,
			detalle: {
				...poliza,
				clienteNombre,
				vehiculos,
			},
		};
	} catch (error) {
		return {
			success: false as const,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Rechaza una póliza con motivo obligatorio
 * Cambia el estado a "rechazada" y otorga permiso de edición por 1 día
 */
export async function rechazarPoliza(polizaId: string, motivo: string) {
	const supabase = await createClient();

	try {
		// Validar que el motivo esté presente y tenga contenido
		if (!motivo || motivo.trim().length < 10) {
			return { success: false, error: "El motivo del rechazo es obligatorio (mínimo 10 caracteres)" };
		}

		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		const { allowed } = await checkPermission("polizas.validar");

		const { needsScoping, teamMemberIds } = await getDataScopeFilter("polizas");

		// Verificar que la póliza exista, esté pendiente y traer datos para el email
		const { data: poliza } = await supabase
			.from("polizas")
			.select(
				`
				id,
				estado,
				numero_poliza,
				ramo,
				responsable_id,
				responsable:profiles!responsable_id (
					full_name,
					email
				)
			`,
			)
			.eq("id", polizaId)
			.single();

		if (!poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// Si no tiene permiso JWT, verificar si es líder de equipo para esta póliza
		if (!allowed) {
			const esLider = poliza.responsable_id
				? await checkTeamLeaderForPolicy(supabase, user.id, poliza.responsable_id)
				: false;
			if (!esLider) {
				return { success: false, error: "No tiene permisos para rechazar pólizas" };
			}
		}

		if (needsScoping && (!poliza.responsable_id || !teamMemberIds.includes(poliza.responsable_id))) {
			if (allowed) {
				return { success: false, error: "No tiene permisos para rechazar esta póliza" };
			}
		}

		if (poliza.estado !== "pendiente") {
			return { success: false, error: "La póliza no está pendiente de validación" };
		}

		// Calcular ventana de edición (1 día desde ahora)
		const puedeEditarHasta = new Date();
		puedeEditarHasta.setDate(puedeEditarHasta.getDate() + 1);

		// Actualizar póliza a estado rechazada con todos los campos de trazabilidad
		const { error: updateError } = await supabase
			.from("polizas")
			.update({
				estado: "rechazada",
				motivo_rechazo: motivo.trim(),
				rechazado_por: user.id,
				fecha_rechazo: new Date().toISOString(),
				puede_editar_hasta: puedeEditarHasta.toISOString(),
			})
			.eq("id", polizaId);

		if (updateError) {
			console.error("Error rechazando póliza:", updateError);
			return { success: false, error: "Error al rechazar la póliza" };
		}

		// Registrar en el historial con tipo de acción "rechazo"
		await supabase.from("polizas_historial_ediciones").insert({
			poliza_id: polizaId,
			accion: "rechazo",
			usuario_id: user.id,
			descripcion: `Póliza rechazada por gerencia. Motivo: ${motivo.trim()}`,
			campos_modificados: ["estado", "motivo_rechazo", "rechazado_por", "fecha_rechazo", "puede_editar_hasta"],
		});

		// Obtener nombre del que rechaza para el email
		const { data: rejector } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

		// Obtener email del líder del equipo del responsable para CC
		let ccLider: string | undefined;
		if (poliza.responsable_id) {
			const { data: equipoDelResponsable } = await supabase
				.from("equipo_miembros")
				.select("equipo_id")
				.eq("user_id", poliza.responsable_id)
				.limit(1)
				.single();

			if (equipoDelResponsable) {
				const { data: lider } = await supabase
					.from("equipo_miembros")
					.select("user:profiles!user_id(email)")
					.eq("equipo_id", equipoDelResponsable.equipo_id)
					.eq("rol_equipo", "lider")
					.limit(1)
					.single();

				const liderEmail = (lider?.user as unknown as { email: string } | null)?.email;
				const responsableEmail = (poliza.responsable as unknown as { email: string } | null)?.email;
				if (liderEmail && liderEmail !== responsableEmail) {
					ccLider = liderEmail;
				}
			}
		}

		// Enviar email de notificación al responsable con CC al líder (sin bloquear el flujo)
		const responsable = poliza.responsable as unknown as { full_name: string; email: string } | null;
		if (responsable?.email) {
			enviarEmailRechazoPoliza({
				destinatario: {
					nombre: responsable.full_name,
					email: responsable.email,
				},
				poliza: {
					numero: poliza.numero_poliza,
					ramo: poliza.ramo,
				},
				rechazadoPor: rejector?.full_name ?? "Gerencia",
				motivo: motivo.trim(),
				puedeEditarHasta,
				ccLider,
			}).catch((err) => console.error("Fallo al enviar email de rechazo:", err));
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
