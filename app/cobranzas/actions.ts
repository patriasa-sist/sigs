"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
	PolizaConPagos,
	CobranzaStats,
	ObtenerPolizasConPagosResponse,
	RegistroPago,
	RegistrarPagoResponse,
	ExcessPaymentDistribution,
	RedistribuirExcesoResponse,
	ExportFilters,
	ExportRow,
	CobranzaServerResponse,
	CuotaPago,
} from "@/types/cobranza";

/**
 * Helper function to verify that the user has cobranza or admin role
 * Returns authorization status and user information
 */
async function verificarPermisoCobranza() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { authorized: false, error: "No autenticado" as const };
	}

	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

	if (!profile || (profile.role !== "cobranza" && profile.role !== "admin")) {
		return {
			authorized: false,
			error: "No tiene permisos para acceder al módulo de cobranzas" as const,
		};
	}

	return { authorized: true as const, userId: user.id, role: profile.role };
}

/**
 * Obtiene todas las pólizas activas con cuotas pendientes
 * Incluye estadísticas calculadas para el dashboard
 */
export async function obtenerPolizasConPendientes(): Promise<ObtenerPolizasConPagosResponse> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Query policies with estado='activa' that may have pending quotas
		const { data: polizas, error: polizasError } = await supabase
			.from("polizas")
			.select(
				`
        id,
        numero_poliza,
        ramo,
        prima_total,
        moneda,
        estado,
        inicio_vigencia,
        fin_vigencia,
        modalidad_pago,
        client:clients!client_id (
          id,
          client_type,
          natural_clients (
            primer_nombre,
            segundo_nombre,
            primer_apellido,
            segundo_apellido,
            numero_documento
          ),
          juridic_clients (
            razon_social,
            nit
          )
        ),
        compania:companias_aseguradoras!compania_aseguradora_id (
          id,
          nombre
        ),
        responsable:profiles!responsable_id (
          id,
          full_name
        )
      `
			)
			.eq("estado", "activa")
			.order("numero_poliza", { ascending: true });

		if (polizasError) {
			console.error("Error fetching policies:", polizasError);
			return { success: false, error: "Error al obtener pólizas" };
		}

		// For each policy, fetch payment quotas
		const polizasConPagos: PolizaConPagos[] = [];

		for (const poliza of polizas || []) {
			const { data: cuotas, error: cuotasError } = await supabase
				.from("polizas_pagos")
				.select("*")
				.eq("poliza_id", poliza.id)
				.order("numero_cuota", { ascending: true });

			if (cuotasError) {
				console.error(`Error fetching quotas for policy ${poliza.id}:`, cuotasError);
				continue;
			}

			// Calculate totals
			const cuotasPendientes =
				cuotas?.filter((c) => c.estado === "pendiente" || c.estado === "vencido" || c.estado === "parcial") ||
				[];

			// Skip policies with no pending quotas
			if (cuotasPendientes.length === 0) continue;

			const totalPagado =
				cuotas?.filter((c) => c.estado === "pagado").reduce((sum, c) => sum + c.monto, 0) || 0;

			const totalPendiente = cuotasPendientes.reduce((sum, c) => sum + c.monto, 0);

			const cuotasVencidas = cuotas?.filter((c) => c.estado === "vencido").length || 0;

			// Format client name
			const clientData = poliza.client;
			let nombreCompleto = "N/A";
			let documento = "N/A";

			if (clientData) {
				if (clientData.client_type === "natural") {
					const natural = (clientData.natural_clients as any)?.[0];
					if (natural) {
						nombreCompleto = `${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${natural.primer_apellido || ""} ${natural.segundo_apellido || ""}`.trim();
						documento = natural.numero_documento || "N/A";
					}
				} else {
					const juridic = (clientData.juridic_clients as any)?.[0];
					if (juridic) {
						nombreCompleto = juridic.razon_social || "N/A";
						documento = juridic.nit || "N/A";
					}
				}
			}

			polizasConPagos.push({
				id: poliza.id,
				numero_poliza: poliza.numero_poliza,
				ramo: poliza.ramo,
				prima_total: poliza.prima_total,
				moneda: poliza.moneda as any,
				estado: poliza.estado as any,
				inicio_vigencia: poliza.inicio_vigencia,
				fin_vigencia: poliza.fin_vigencia,
				modalidad_pago: poliza.modalidad_pago as any,
				client: {
					id: clientData.id,
					client_type: clientData.client_type as any,
					nombre_completo: nombreCompleto,
					documento: documento,
				},
				compania: {
					id: (poliza.compania as any)?.id || "",
					nombre: (poliza.compania as any)?.nombre || "N/A",
				},
				responsable: {
					id: (poliza.responsable as any)?.id || "",
					full_name: (poliza.responsable as any)?.full_name || "N/A",
				},
				cuotas: cuotas || [],
				total_pagado: totalPagado,
				total_pendiente: totalPendiente,
				cuotas_pendientes: cuotasPendientes.length,
				cuotas_vencidas: cuotasVencidas,
			});
		}

		// Calculate statistics
		const stats: CobranzaStats = {
			total_polizas: polizasConPagos.length,
			total_cuotas_pendientes: polizasConPagos.reduce((sum, p) => sum + p.cuotas_pendientes, 0),
			total_cuotas_vencidas: polizasConPagos.reduce((sum, p) => sum + p.cuotas_vencidas, 0),
			monto_total_pendiente: polizasConPagos.reduce((sum, p) => sum + p.total_pendiente, 0),
			monto_total_cobrado_hoy: 0,
			monto_total_cobrado_mes: 0,
			cuotas_por_vencer_7dias: 0,
		};

		// Calculate date-based stats
		const today = new Date().toISOString().split("T")[0];
		const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
			.toISOString()
			.split("T")[0];
		const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

		for (const poliza of polizasConPagos) {
			for (const cuota of poliza.cuotas) {
				// Count payments today
				if (cuota.fecha_pago === today && cuota.estado === "pagado") {
					stats.monto_total_cobrado_hoy += cuota.monto;
				}
				// Count payments this month
				if (cuota.fecha_pago && cuota.fecha_pago >= firstDayOfMonth && cuota.estado === "pagado") {
					stats.monto_total_cobrado_mes += cuota.monto;
				}
				// Count quotas due within 7 days
				if (cuota.estado === "pendiente" && cuota.fecha_vencimiento <= sevenDaysFromNow) {
					stats.cuotas_por_vencer_7dias++;
				}
			}
		}

		return {
			success: true,
			data: {
				polizas: polizasConPagos,
				stats,
			},
		};
	} catch (error) {
		console.error("Error general:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Registra un pago (parcial, exacto, o con exceso)
 * Incluye validación de mes para cuotas vencidas
 */
export async function registrarPago(registro: RegistroPago): Promise<RegistrarPagoResponse> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Fetch current quota
		const { data: cuota, error: cuotaError } = await supabase
			.from("polizas_pagos")
			.select("*")
			.eq("id", registro.cuota_id)
			.single();

		if (cuotaError || !cuota) {
			return { success: false, error: "Cuota no encontrada" };
		}

		// Validate quota is not already paid
		if (cuota.estado === "pagado") {
			return { success: false, error: "Esta cuota ya está marcada como pagada" };
		}

		// **VALIDACIÓN DE MES PARA CUOTAS VENCIDAS**
		if (cuota.estado === "vencido") {
			const fechaVencimiento = new Date(cuota.fecha_vencimiento);
			const fechaActual = new Date();

			const mesVencimiento = fechaVencimiento.getMonth();
			const anioVencimiento = fechaVencimiento.getFullYear();

			const mesActual = fechaActual.getMonth();
			const anioActual = fechaActual.getFullYear();

			if (mesVencimiento !== mesActual || anioVencimiento !== anioActual) {
				const mesNombre = fechaVencimiento.toLocaleDateString("es-BO", { month: "long", year: "numeric" });
				return {
					success: false,
					error: `No se puede registrar pago fuera del mes de vencimiento. Esta cuota venció en ${mesNombre}`,
				};
			}
		}

		const montoCuota = cuota.monto;
		const montoPagado = registro.monto_pagado;

		// Determine payment type
		let tipoPago: "parcial" | "exacto" | "exceso";
		let excesoGenerado = 0;
		let nuevoEstado: "pendiente" | "pagado" | "parcial" | "vencido";
		let observaciones = cuota.observaciones || "";

		if (montoPagado < montoCuota) {
			// PARTIAL PAYMENT
			tipoPago = "parcial";
			nuevoEstado = "parcial";
			observaciones += `\n[${registro.fecha_pago}] Pago parcial de ${montoPagado}. Saldo pendiente: ${montoCuota - montoPagado}.`;
		} else if (montoPagado === montoCuota) {
			// EXACT PAYMENT
			tipoPago = "exacto";
			nuevoEstado = "pagado";
			observaciones += `\n[${registro.fecha_pago}] Pago completo de ${montoPagado}.`;
		} else {
			// EXCESS PAYMENT
			tipoPago = "exceso";
			nuevoEstado = "pagado";
			excesoGenerado = montoPagado - montoCuota;
			observaciones += `\n[${registro.fecha_pago}] Pago de ${montoPagado}. Exceso generado: ${excesoGenerado}.`;
		}

		// Add custom observations
		if (registro.observaciones) {
			observaciones += `\n${registro.observaciones}`;
		}

		// Update quota
		const { error: updateError } = await supabase
			.from("polizas_pagos")
			.update({
				estado: nuevoEstado,
				fecha_pago: tipoPago !== "parcial" ? registro.fecha_pago : null,
				observaciones: observaciones.trim(),
			})
			.eq("id", registro.cuota_id);

		if (updateError) {
			console.error("Error updating quota:", updateError);
			return { success: false, error: "Error al registrar el pago" };
		}

		// Revalidate collections page
		revalidatePath("/cobranzas");

		return {
			success: true,
			data: {
				cuotas_actualizadas: [registro.cuota_id],
				tipo_pago: tipoPago,
				exceso_generado: excesoGenerado > 0 ? excesoGenerado : undefined,
			},
		};
	} catch (error) {
		console.error("Error registering payment:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Redistribuye el exceso de pago entre cuotas pendientes seleccionadas
 */
export async function redistribuirExceso(
	distribucion: ExcessPaymentDistribution
): Promise<RedistribuirExcesoResponse> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Validate that total distributed equals excess amount
		if (Math.abs(distribucion.total_distribuido - distribucion.monto_exceso) > 0.01) {
			return {
				success: false,
				error: `El monto distribuido (${distribucion.total_distribuido}) no coincide con el exceso (${distribucion.monto_exceso})`,
			};
		}

		let cuotasActualizadas = 0;
		const fecha_hoy = new Date().toISOString().split("T")[0];

		// Update each quota with distributed amount
		for (const dist of distribucion.distribuciones) {
			if (dist.monto_a_aplicar <= 0) continue;

			// Fetch current quota
			const { data: cuota, error: cuotaError } = await supabase
				.from("polizas_pagos")
				.select("*")
				.eq("id", dist.cuota_id)
				.single();

			if (cuotaError || !cuota) {
				console.error(`Error fetching quota ${dist.cuota_id}:`, cuotaError);
				continue;
			}

			const nuevoMonto = cuota.monto - dist.monto_a_aplicar;
			let nuevoEstado: "pendiente" | "pagado" | "parcial" | "vencido" = cuota.estado;
			let observaciones = cuota.observaciones || "";

			// If fully paid, mark as paid
			if (nuevoMonto <= 0.01) {
				nuevoEstado = "pagado";
				observaciones += `\n[${fecha_hoy}] Pago completo vía redistribución de exceso. Monto aplicado: ${dist.monto_a_aplicar}.`;
			} else {
				nuevoEstado = "parcial";
				observaciones += `\n[${fecha_hoy}] Pago parcial vía redistribución de exceso. Monto aplicado: ${dist.monto_a_aplicar}. Saldo: ${nuevoMonto}.`;
			}

			// Update quota
			const { error: updateError } = await supabase
				.from("polizas_pagos")
				.update({
					monto: Math.max(0, nuevoMonto),
					estado: nuevoEstado,
					fecha_pago: nuevoEstado === "pagado" ? fecha_hoy : cuota.fecha_pago,
					observaciones: observaciones.trim(),
				})
				.eq("id", dist.cuota_id);

			if (updateError) {
				console.error(`Error updating quota ${dist.cuota_id}:`, updateError);
				continue;
			}

			cuotasActualizadas++;
		}

		// Update original quota to record redistribution
		const { error: origenError } = await supabase
			.from("polizas_pagos")
			.update({
				observaciones: `Exceso de ${distribucion.monto_exceso} redistribuido entre ${cuotasActualizadas} cuotas.`,
			})
			.eq("id", distribucion.cuota_origen_id);

		if (origenError) {
			console.error("Error updating origin quota:", origenError);
		}

		// Revalidate
		revalidatePath("/cobranzas");

		return {
			success: true,
			data: {
				cuotas_actualizadas: cuotasActualizadas,
				monto_total_distribuido: distribucion.total_distribuido,
			},
		};
	} catch (error) {
		console.error("Error redistributing excess:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtiene cuotas pendientes de una póliza para redistribución de exceso
 * Helper usado en el frontend después de detectar exceso
 */
export async function obtenerCuotasPendientesPorPoliza(
	polizaId: string
): Promise<CobranzaServerResponse<CuotaPago[]>> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("polizas_pagos")
			.select("*")
			.eq("poliza_id", polizaId)
			.in("estado", ["pendiente", "vencido", "parcial"])
			.order("numero_cuota", { ascending: true });

		if (error) {
			return { success: false, error: "Error al obtener cuotas pendientes" };
		}

		return { success: true, data: data || [] };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Exporta reporte de cobranzas a Excel
 * Retorna datos formateados listos para generar Excel en el cliente
 */
export async function exportarReporte(filtros: ExportFilters): Promise<CobranzaServerResponse<ExportRow[]>> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Calculate date range based on period
		let fechaDesde: string | undefined;
		let fechaHasta: string | undefined;
		const today = new Date().toISOString().split("T")[0];

		switch (filtros.periodo) {
			case "today":
				fechaDesde = today;
				fechaHasta = today;
				break;
			case "week":
				const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
				fechaDesde = weekAgo;
				fechaHasta = today;
				break;
			case "month":
				const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
				fechaDesde = monthAgo;
				fechaHasta = today;
				break;
			case "custom":
				fechaDesde = filtros.fecha_desde;
				fechaHasta = filtros.fecha_hasta;
				break;
		}

		// Fetch all payment quotas with policy details
		let query = supabase.from("polizas_pagos").select(`
        *,
        poliza:polizas!poliza_id (
          numero_poliza,
          ramo,
          moneda,
          client:clients!client_id (
            id,
            client_type,
            natural_clients (
              primer_nombre,
              primer_apellido,
              numero_documento
            ),
            juridic_clients (
              razon_social,
              nit
            )
          ),
          compania:companias_aseguradoras!compania_aseguradora_id (
            nombre
          )
        )
      `);

		// Apply filters
		if (filtros.estado_cuota && filtros.estado_cuota !== "all") {
			query = query.eq("estado", filtros.estado_cuota);
		}

		if (fechaDesde) {
			query = query.gte("fecha_vencimiento", fechaDesde);
		}

		if (fechaHasta) {
			query = query.lte("fecha_vencimiento", fechaHasta);
		}

		const { data: pagos, error } = await query.order("fecha_vencimiento", { ascending: true });

		if (error) {
			console.error("Error fetching payments for export:", error);
			return { success: false, error: "Error al obtener datos para exportar" };
		}

		// Transform to export rows
		const exportRows: ExportRow[] = (pagos || []).map((pago: any) => {
			const poliza = pago.poliza;
			const clientData = poliza?.client;

			let cliente = "N/A";
			let ciNit = "N/A";

			if (clientData) {
				if (clientData.client_type === "natural") {
					const natural = clientData.natural_clients?.[0];
					if (natural) {
						cliente = `${natural.primer_nombre} ${natural.primer_apellido}`;
						ciNit = natural.numero_documento;
					}
				} else {
					const juridic = clientData.juridic_clients?.[0];
					if (juridic) {
						cliente = juridic.razon_social;
						ciNit = juridic.nit;
					}
				}
			}

			// Calculate days overdue
			const diasVencido =
				pago.estado === "vencido" || pago.estado === "pendiente"
					? Math.max(0, Math.floor((Date.now() - new Date(pago.fecha_vencimiento).getTime()) / (24 * 60 * 60 * 1000)))
					: 0;

			return {
				numero_poliza: poliza?.numero_poliza || "N/A",
				cliente,
				ci_nit: ciNit,
				compania: poliza?.compania?.nombre || "N/A",
				ramo: poliza?.ramo || "N/A",
				numero_cuota: pago.numero_cuota,
				monto_cuota: pago.monto,
				moneda: poliza?.moneda || "Bs",
				fecha_vencimiento: pago.fecha_vencimiento,
				fecha_pago: pago.fecha_pago,
				estado: pago.estado,
				dias_vencido: diasVencido,
				monto_pagado: pago.estado === "pagado" ? pago.monto : 0,
				observaciones: pago.observaciones || "",
			};
		});

		return { success: true, data: exportRows };
	} catch (error) {
		console.error("Error exporting report:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
