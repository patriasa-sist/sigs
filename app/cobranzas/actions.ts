"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { obtenerEstadoReal } from "@/utils/estadoCuota";
import type {
	CuotaPago,
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
	Moneda,
	EstadoPago,
	// New types for improvements
	PolizaConPagosExtendida,
	ContactoCliente,
	DatosEspecificosRamo,
	VehiculoAutomotor,
	TipoComprobante,
	ObtenerDetallePolizaResponse,
	SubirComprobanteResponse,
	RegistroProrroga,
	RegistrarProrrogaResponse,
	AvisoMoraData,
	CuotaVencidaConMora,
	PrepararAvisoMoraResponse,
} from "@/types/cobranza";

// Helper types for Supabase query results
// Note: natural_clients and juridic_clients are 1:1 relationships, not arrays
type ClientQueryResult = {
	id: string;
	client_type: "natural" | "juridica";
	natural_clients: {
		primer_nombre?: string;
		segundo_nombre?: string;
		primer_apellido?: string;
		segundo_apellido?: string;
		numero_documento?: string;
	} | null;
	juridic_clients: {
		razon_social?: string;
		nit?: string;
	} | null;
} | null;

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

			const cuotasVencidas = cuotas?.filter((c) => obtenerEstadoReal(c) === "vencido").length || 0;

			// Format client name
			const clientData = poliza.client as unknown as ClientQueryResult;
			let nombreCompleto = "N/A";
			let documento = "N/A";

			if (clientData) {
				if (clientData.client_type === "natural") {
					// natural_clients is a 1:1 relationship object
					const natural = clientData.natural_clients;
					if (natural) {
						nombreCompleto = `${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${natural.primer_apellido || ""} ${natural.segundo_apellido || ""}`.trim();
						documento = natural.numero_documento || "N/A";
					}
				} else {
					// juridic_clients is a 1:1 relationship object
					const juridic = clientData.juridic_clients;
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
				moneda: poliza.moneda as Moneda,
				estado: poliza.estado as "pendiente" | "activa" | "vencida" | "cancelada" | "renovada",
				inicio_vigencia: poliza.inicio_vigencia,
				fin_vigencia: poliza.fin_vigencia,
				modalidad_pago: poliza.modalidad_pago as "contado" | "credito",
				client: {
					id: clientData?.id || "",
					client_type: (clientData?.client_type as "natural" | "juridica") || "natural",
					nombre_completo: nombreCompleto,
					documento: documento,
				},
				compania: {
					id: (poliza.compania as { id?: string; nombre?: string } | null)?.id || "",
					nombre: (poliza.compania as { id?: string; nombre?: string } | null)?.nombre || "N/A",
				},
				responsable: {
					id: (poliza.responsable as { id?: string; full_name?: string } | null)?.id || "",
					full_name: (poliza.responsable as { id?: string; full_name?: string } | null)?.full_name || "N/A",
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
		const sevenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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

		// MEJORA #2: Restricción mensual eliminada - Las cuotas vencidas ahora pueden pagarse en cualquier momento

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
		let aplicarFiltroFecha = true; // Flag para controlar si se aplica filtro de fecha
		const today = new Date().toISOString().split("T")[0];

		switch (filtros.periodo) {
			case "today":
				// Filtrar por pagos realizados hoy
				fechaDesde = today;
				fechaHasta = today;
				break;
			case "week":
			case "month":
				// Para week/month, NO filtrar por fecha si no se especifica tipo_filtro_fecha
				// Esto permite ver TODAS las cuotas según su estado, sin importar cuándo vencen
				// Solo aplicar filtro si el usuario explícitamente lo solicitó
				if (filtros.tipo_filtro_fecha) {
					if (filtros.periodo === "week") {
						const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
						fechaDesde = weekAgo;
						fechaHasta = today;
					} else {
						const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
						fechaDesde = monthAgo;
						fechaHasta = today;
					}
				} else {
					// No aplicar filtro de fecha para week/month
					aplicarFiltroFecha = false;
				}
				break;
			case "custom":
				// Modo personalizado: el usuario decide
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
          prima_total,
          inicio_vigencia,
          fin_vigencia,
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
            nombre
          ),
          responsable:profiles!responsable_id (
            full_name
          ),
          regional:regionales!regional_id (
            nombre
          )
        )
      `);

		// Apply filters
		if (filtros.estado_cuota && filtros.estado_cuota !== "all") {
			query = query.eq("estado", filtros.estado_cuota);
		}

		// Apply date filters only if aplicarFiltroFecha is true
		if (aplicarFiltroFecha && (fechaDesde || fechaHasta)) {
			// Determine which date field to filter by
			// Para "today" usamos fecha_pago por defecto para mostrar pagos del día
			const tipoFiltro = filtros.tipo_filtro_fecha || (filtros.periodo === "today" ? "fecha_pago" : "fecha_vencimiento");

			if (fechaDesde) {
				query = query.gte(tipoFiltro, fechaDesde);
			}

			if (fechaHasta) {
				query = query.lte(tipoFiltro, fechaHasta);
			}
		}

		const { data: pagos, error } = await query.order("fecha_vencimiento", { ascending: true });

		if (error) {
			console.error("Error fetching payments for export:", error);
			return { success: false, error: "Error al obtener datos para exportar" };
		}

		// Transform to export rows
		const exportRows: ExportRow[] = (pagos || []).map((pago: {
			id: string;
			numero_cuota: number;
			monto: number;
			fecha_vencimiento: string;
			fecha_vencimiento_original: string | null;
			fecha_pago: string | null;
			estado: EstadoPago;
			observaciones: string | null;
			prorrogas_historial: unknown;
			poliza: {
				numero_poliza: string;
				ramo: string;
				moneda: string;
				prima_total: number;
				inicio_vigencia: string;
				fin_vigencia: string;
				client: ClientQueryResult;
				compania?: { nombre?: string } | null;
				responsable?: { full_name?: string } | null;
				regional?: { nombre?: string } | null;
			} | null;
		}) => {
			const poliza = pago.poliza;
			const clientData = poliza?.client;

			let cliente = "N/A";
			let ciNit = "N/A";

			if (clientData) {
				if (clientData.client_type === "natural") {
					// natural_clients is a 1:1 relationship object
					const natural = clientData.natural_clients;
					if (natural) {
						cliente = `${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${natural.primer_apellido || ""} ${natural.segundo_apellido || ""}`.trim();
						ciNit = natural.numero_documento || "N/A";
					}
				} else {
					// juridic_clients is a 1:1 relationship object
					const juridic = clientData.juridic_clients;
					if (juridic) {
						cliente = juridic.razon_social || "N/A";
						ciNit = juridic.nit || "N/A";
					}
				}
			}

			// Calculate days overdue
			const diasVencido =
				pago.estado === "vencido" || pago.estado === "pendiente"
					? Math.max(0, Math.floor((Date.now() - new Date(pago.fecha_vencimiento).getTime()) / (24 * 60 * 60 * 1000)))
					: 0;

			// Check if quota has prorroga
			const tieneProrroga = Array.isArray(pago.prorrogas_historial) && pago.prorrogas_historial.length > 0;

			return {
				numero_poliza: poliza?.numero_poliza || "N/A",
				cliente,
				ci_nit: ciNit,
				compania: poliza?.compania?.nombre || "N/A",
				ramo: poliza?.ramo || "N/A",
				responsable: poliza?.responsable?.full_name || "N/A",
				regional: poliza?.regional?.nombre || "N/A",
				prima_total: poliza?.prima_total || 0,
				inicio_vigencia: poliza?.inicio_vigencia || "",
				fin_vigencia: poliza?.fin_vigencia || "",
				numero_cuota: pago.numero_cuota,
				monto_cuota: pago.monto,
				moneda: (poliza?.moneda as Moneda) || "Bs",
				fecha_vencimiento: pago.fecha_vencimiento,
				fecha_vencimiento_original: pago.fecha_vencimiento_original,
				fecha_pago: pago.fecha_pago,
				estado: pago.estado,
				dias_vencido: diasVencido,
				monto_pagado: pago.estado === "pagado" ? pago.monto : 0,
				tiene_prorroga: tieneProrroga,
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

// =============================================
// NEW SERVER ACTIONS - COBRANZAS IMPROVEMENTS
// =============================================

/**
 * MEJORA #3: Obtener detalle extendido de póliza para visualización de cuotas
 * Incluye: contacto del cliente y datos específicos según el ramo
 */
export async function obtenerDetallePolizaParaCuotas(
	polizaId: string
): Promise<ObtenerDetallePolizaResponse> {
	try {
		const supabase = await createClient();

		// Get authenticated user
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Query policy with all related data
		const { data: poliza, error: polizaError } = await supabase
			.from("polizas")
			.select(
				`
				*,
				client:clients!client_id(
					id,
					client_type,
					natural_clients(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento, celular, correo_electronico),
					juridic_clients(razon_social, nit, telefono, correo_electronico)
				),
				compania:companias_aseguradoras!compania_aseguradora_id(id, nombre),
				responsable:profiles!responsable_id(id, full_name),
				cuotas:polizas_pagos(*)
			`
			)
			.eq("id", polizaId)
			.single();

		if (polizaError || !poliza) {
			console.error("Error fetching poliza:", polizaError);
			return { success: false, error: "Póliza no encontrada" };
		}

		// DEBUG: Log the raw data from Supabase
		console.log("=== DEBUG: Poliza data from Supabase ===");
		console.log("Client:", JSON.stringify(poliza.client, null, 2));
		console.log("Client type:", poliza.client?.client_type);
		console.log("Natural clients:", poliza.client?.natural_clients);
		console.log("Juridic clients:", poliza.client?.juridic_clients);

		// Extract contact info based on client type
		let contacto: ContactoCliente = {
			telefono: null,
			correo: null,
			celular: null,
		};

		if (poliza.client.client_type === "natural") {
			// natural_clients is an object, not an array
			const natural = poliza.client.natural_clients;
			if (natural) {
				contacto = {
					telefono: null, // natural_clients doesn't have telefono field
					correo: natural.correo_electronico || null,
					celular: natural.celular || null,
				};
			}
		} else {
			// juridic_clients is an object, not an array
			const juridic = poliza.client.juridic_clients;
			if (juridic) {
				contacto = {
					telefono: juridic.telefono || null,
					correo: juridic.correo_electronico || null,
					celular: null, // Juridic clients don't have celular
				};
			}
		}

		// Get ramo-specific data
		let datos_ramo: DatosEspecificosRamo;

		switch (poliza.ramo.toLowerCase()) {
			case "automotor":
			case "automotores": {
				// Query vehicles from separate table
				type VehiculoRaw = {
					id: string;
					placa: string;
					valor_asegurado: number;
					tipo_vehiculo: { nombre: string } | null;
					marca: { nombre: string } | null;
					modelo: string | null;
					ano: number | null;
					color: string | null;
				};

				const { data: vehiculos, error: vehiculosError } = await supabase
					.from("polizas_automotor_vehiculos")
					.select(
						`
						id,
						placa,
						valor_asegurado,
						tipo_vehiculo:tipos_vehiculo(nombre),
						marca:marcas_vehiculo(nombre),
						modelo,
						ano,
						color
					`
					)
					.eq("poliza_id", polizaId);

				if (vehiculosError) {
					console.error("Error fetching vehiculos:", vehiculosError);
				}

				const vehiculosFormateados: VehiculoAutomotor[] =
					(vehiculos as VehiculoRaw[] | null)?.map((v) => ({
						id: v.id,
						placa: v.placa,
						tipo_vehiculo: v.tipo_vehiculo?.nombre,
						marca: v.marca?.nombre,
						modelo: v.modelo ?? undefined,
						ano: v.ano ?? undefined,
						color: v.color ?? undefined,
						valor_asegurado: v.valor_asegurado,
					})) || [];

				datos_ramo = {
					tipo: "automotor",
					vehiculos: vehiculosFormateados,
				};
				break;
			}

			case "salud":
			case "vida":
			case "ap":
			case "accidentes personales":
			case "sepelio": {
				// For now, return placeholder - these would need their own table queries
				// TODO: Implement queries for polizas_salud, polizas_vida, etc.
				datos_ramo = {
					tipo: "salud", // Normalize type
					asegurados: [],
					producto: poliza.ramo,
				};
				break;
			}

			case "incendio":
			case "incendio y aliados": {
				// TODO: Implement query for polizas_incendio table
				datos_ramo = {
					tipo: "incendio",
					ubicaciones: [],
				};
				break;
			}

			default:
				datos_ramo = {
					tipo: "otros",
					descripcion: poliza.ramo,
				};
		}

		// Calculate totals
		const cuotas = poliza.cuotas || [];
		const total_pagado = cuotas
			.filter((c: CuotaPago) => c.estado === "pagado")
			.reduce((sum: number, c: CuotaPago) => sum + c.monto, 0);
		const total_pendiente = cuotas
			.filter((c: CuotaPago) => c.estado !== "pagado")
			.reduce((sum: number, c: CuotaPago) => sum + c.monto, 0);
		const cuotas_pendientes = cuotas.filter((c: CuotaPago) => c.estado === "pendiente").length;
		const cuotas_vencidas = cuotas.filter((c: CuotaPago) => obtenerEstadoReal(c) === "vencido").length;

		// Build extended policy object
		const polizaExtendida: PolizaConPagosExtendida = {
			id: poliza.id,
			numero_poliza: poliza.numero_poliza,
			ramo: poliza.ramo,
			prima_total: poliza.prima_total,
			moneda: poliza.moneda as Moneda,
			estado: poliza.estado,
			inicio_vigencia: poliza.inicio_vigencia,
			fin_vigencia: poliza.fin_vigencia,
			modalidad_pago: poliza.modalidad_pago,
			client: {
				id: poliza.client.id,
				client_type: poliza.client.client_type,
				nombre_completo:
					poliza.client.client_type === "natural"
						? [
							poliza.client.natural_clients?.primer_nombre,
							poliza.client.natural_clients?.segundo_nombre,
							poliza.client.natural_clients?.primer_apellido,
							poliza.client.natural_clients?.segundo_apellido,
					  ]
							.filter(Boolean)
							.join(" ")
							.trim() || "N/A"
						: poliza.client.juridic_clients?.razon_social || "N/A",
				documento:
					poliza.client.client_type === "natural"
						? poliza.client.natural_clients?.numero_documento || "N/A"
						: poliza.client.juridic_clients?.nit || "N/A",
			},
			compania: {
				id: poliza.compania.id,
				nombre: poliza.compania.nombre,
			},
			responsable: {
				id: poliza.responsable.id,
				full_name: poliza.responsable.full_name,
			},
			cuotas: cuotas as CuotaPago[],
			total_pagado,
			total_pendiente,
			cuotas_pendientes,
			cuotas_vencidas,
			contacto,
			datos_ramo,
		};

		return { success: true, data: polizaExtendida };
	} catch (error) {
		console.error("Error obtaining policy details:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * MEJORA #1: Subir comprobante de pago a Supabase Storage
 */
export async function subirComprobantePago(
	pagoId: string,
	fileData: FormData
): Promise<SubirComprobanteResponse> {
	try {
		const supabase = await createClient();

		// Get authenticated user
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Extract file and tipo from FormData
		const file = fileData.get("file") as File;
		const tipoArchivo = fileData.get("tipo_archivo") as TipoComprobante;

		if (!file) {
			return { success: false, error: "No se proporcionó archivo" };
		}

		// Validate file size (max 10MB)
		const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
		if (file.size > MAX_SIZE) {
			return { success: false, error: "El archivo excede el tamaño máximo de 10MB" };
		}

		// Validate file type
		const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
		if (!allowedTypes.includes(file.type)) {
			return {
				success: false,
				error: "Tipo de archivo no permitido. Use JPG, PNG, WebP o PDF",
			};
		}

		// Generate unique filename with user folder
		const fileExt = file.name.split(".").pop();
		const fileName = `${user.id}/${pagoId}_${Date.now()}.${fileExt}`;

		// Upload to Supabase Storage
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from("pagos-comprobantes")
			.upload(fileName, file, {
				contentType: file.type,
				upsert: false,
			});

		if (uploadError) {
			console.error("Error uploading file:", uploadError);
			return { success: false, error: `Error al subir archivo: ${uploadError.message}` };
		}

		// Get public URL
		const {
			data: { publicUrl },
		} = supabase.storage.from("pagos-comprobantes").getPublicUrl(uploadData.path);

		// Create record in database
		const { data: comprobante, error: dbError } = await supabase
			.from("polizas_pagos_comprobantes")
			.insert({
				pago_id: pagoId,
				nombre_archivo: file.name,
				archivo_url: publicUrl,
				tamano_bytes: file.size,
				tipo_archivo: tipoArchivo,
				uploaded_by: user.id,
			})
			.select()
			.single();

		if (dbError) {
			console.error("Error creating comprobante record:", dbError);
			// Try to delete uploaded file if DB insert fails
			await supabase.storage.from("pagos-comprobantes").remove([uploadData.path]);
			return { success: false, error: `Error al registrar comprobante: ${dbError.message}` };
		}

		return {
			success: true,
			data: {
				comprobante_id: comprobante.id,
				archivo_url: publicUrl,
			},
		};
	} catch (error) {
		console.error("Error in subirComprobantePago:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * MEJORA #8: Registrar prórroga de cuota
 * Llama a la función de base de datos que maneja todo el historial
 */
export async function registrarProrroga(registro: RegistroProrroga): Promise<RegistrarProrrogaResponse> {
	try {
		const supabase = await createClient();

		// Get authenticated user
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Validate inputs
		if (!registro.cuota_id || !registro.nueva_fecha) {
			return { success: false, error: "Datos incompletos para registrar prórroga" };
		}

		// Validate that nueva_fecha is in the future
		const nuevaFecha = new Date(registro.nueva_fecha);
		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);

		if (nuevaFecha <= hoy) {
			return { success: false, error: "La nueva fecha debe ser futura" };
		}

		// Call database function
		const { data, error } = await supabase.rpc("registrar_prorroga_cuota", {
			p_cuota_id: registro.cuota_id,
			p_nueva_fecha: registro.nueva_fecha,
			p_usuario_id: user.id,
			p_motivo: registro.motivo || null,
		});

		if (error) {
			console.error("Error calling registrar_prorroga_cuota:", error);
			return { success: false, error: error.message };
		}

		// Get updated quota to count total prorrogas
		const { data: cuotaActualizada, error: cuotaError } = await supabase
			.from("polizas_pagos")
			.select("prorrogas_historial, fecha_vencimiento")
			.eq("id", registro.cuota_id)
			.single();

		if (cuotaError) {
			console.error("Error fetching updated quota:", cuotaError);
		}

		const totalProrrogas = Array.isArray(cuotaActualizada?.prorrogas_historial)
			? cuotaActualizada.prorrogas_historial.length
			: 0;

		// Revalidate cobranzas page
		revalidatePath("/cobranzas");

		return {
			success: true,
			data: {
				prorroga: data,
				nueva_fecha_vencimiento: registro.nueva_fecha,
				total_prorrogas: totalProrrogas,
			},
		};
	} catch (error) {
		console.error("Error registering prórroga:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * MEJORA #4: Preparar datos para generar PDF de aviso de mora
 * Requiere al menos 3 cuotas vencidas
 */
export async function prepararDatosAvisoMora(polizaId: string): Promise<PrepararAvisoMoraResponse> {
	try {
		const supabase = await createClient();

		// Get authenticated user
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Get extended policy details (reuse function)
		const polizaResponse = await obtenerDetallePolizaParaCuotas(polizaId);
		if (!polizaResponse.success || !polizaResponse.data) {
			return { success: false, error: polizaResponse.error || "Error al obtener datos de póliza" };
		}

		const poliza = polizaResponse.data;

		// Filter overdue quotas
		const cuotasVencidas = poliza.cuotas.filter((c) => obtenerEstadoReal(c) === "vencido");

		// Validate minimum 3 overdue quotas
		if (cuotasVencidas.length < 3) {
			return {
				success: false,
				error: `Se requieren al menos 3 cuotas vencidas. Esta póliza tiene ${cuotasVencidas.length}`,
			};
		}

		// Calculate days overdue for each quota
		const hoy = new Date();
		const cuotasConMora: CuotaVencidaConMora[] = cuotasVencidas.map((cuota) => {
			const fechaVencimiento = new Date(cuota.fecha_vencimiento);
			const diasMora = Math.max(
				0,
				Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
			);

			return {
				...cuota,
				dias_mora: diasMora,
			};
		});

		// Calculate total owed
		const totalAdeudado = cuotasConMora.reduce((sum, c) => sum + c.monto, 0);

		// Generate reference number: AM-YYYYMMDD-{poliza_number}
		const fechaStr = hoy.toISOString().split("T")[0].replace(/-/g, "");
		const numeroReferencia = `AM-${fechaStr}-${poliza.numero_poliza}`;

		// Build aviso de mora data
		const avisoMoraData: AvisoMoraData = {
			poliza: poliza,
			cliente: poliza.contacto,
			cuotas_vencidas: cuotasConMora,
			total_adeudado: totalAdeudado,
			fecha_generacion: hoy.toISOString(),
			numero_referencia: numeroReferencia,
		};

		return { success: true, data: avisoMoraData };
	} catch (error) {
		console.error("Error preparing aviso de mora data:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
