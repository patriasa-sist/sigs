"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPermission, getDataScopeFilter } from "@/utils/auth/helpers";
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
	ExportFilterOptions,
	ExportRow,
	CobranzaServerResponse,
	Moneda,
	MontoPorMoneda,
	EstadoPago,
	// New types for improvements
	PolizaConPagosExtendida,
	ContactoCliente,
	DatosEspecificosRamo,
	VehiculoAutomotor,
	TipoComprobante,
	Comprobante,
	ObtenerDetallePolizaResponse,
	SubirComprobanteResponse,
	RegistroProrroga,
	RegistrarProrrogaResponse,
	AvisoMoraData,
	CuotaVencidaConMora,
	PrepararAvisoMoraResponse,
	// Pagination
	CobranzaFiltros,
	FiltrosCobranzaOptions,
	CobranzaSortField,
} from "@/types/cobranza";

// Helper types for Supabase query results
// Note: natural_clients and juridic_clients are 1:1 relationships, not arrays
type ClientQueryResult = {
	id: string;
	client_type: "natural" | "juridica" | "unipersonal";
	natural_clients: {
		primer_nombre?: string;
		segundo_nombre?: string;
		primer_apellido?: string;
		segundo_apellido?: string;
		numero_documento?: string;
		celular?: string;
		correo_electronico?: string;
	} | null;
	juridic_clients: {
		razon_social?: string;
		nit?: string;
		telefono?: string;
		correo_electronico?: string;
	} | null;
	unipersonal_clients: {
		razon_social?: string;
		nit?: string;
		telefono_comercial?: string;
		correo_electronico_comercial?: string;
	} | null;
} | null;

/**
 * Helper function to verify that the user has cobranza or admin role
 * Returns authorization status and user information
 */
async function verificarPermisoCobranza() {
	const { allowed, profile } = await checkPermission("cobranzas.ver");

	if (!allowed || !profile) {
		return {
			authorized: false,
			error: "No tiene permisos para acceder al módulo de cobranzas" as const,
		};
	}

	return { authorized: true as const, userId: profile.id, role: profile.role };
}

/**
 * Obtiene pólizas activas con sus cuotas de pago.
 * Por defecto solo incluye pólizas con cuotas pendientes.
 * Con incluirPagadas=true, incluye también pólizas completamente pagadas.
 */
export async function obtenerPolizasConPendientes(incluirPagadas: boolean = false): Promise<ObtenerPolizasConPagosResponse> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Data scoping: agentes/comerciales solo ven datos de su equipo
		const scope = await getDataScopeFilter("polizas");

		const today = new Date().toISOString().split("T")[0];
		const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
			.toISOString()
			.split("T")[0];

		// ── Round 1: polizas (sin cuotas) + cobrados del mes en paralelo ────
		let polizasQueryBase = supabase
			.from("polizas")
			.select(
				`id, numero_poliza, ramo, prima_total, moneda, estado,
				inicio_vigencia, fin_vigencia, modalidad_pago,
				client:clients!client_id (
					id, client_type,
					natural_clients (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento),
					juridic_clients (razon_social, nit),
					unipersonal_clients (razon_social, nit)
				),
				compania:companias_aseguradoras!compania_aseguradora_id (id, nombre),
				responsable:profiles!responsable_id (id, full_name),
				regional:regionales!regional_id (id, nombre)`
			)
			.eq("estado", "activa")
			.order("numero_poliza", { ascending: true });

		if (scope.needsScoping) {
			polizasQueryBase = polizasQueryBase.in("responsable_id", scope.teamMemberIds);
		}

		let cobradosQueryBase = supabase
			.from("polizas_pagos")
			.select("monto, fecha_pago, poliza:polizas!poliza_id(moneda, responsable_id)")
			.eq("estado", "pagado")
			.gte("fecha_pago", firstDayOfMonth);

		if (scope.needsScoping) {
			cobradosQueryBase = cobradosQueryBase.in("poliza.responsable_id", scope.teamMemberIds);
		}

		const [{ data: polizas, error: polizasError }, { data: cuotasCobradas }] = await Promise.all([
			polizasQueryBase,
			cobradosQueryBase,
		]);

		if (polizasError) {
			console.error("Error fetching policies:", polizasError);
			return { success: false, error: "Error al obtener pólizas" };
		}

		const polizaIds = (polizas || []).map((p) => p.id);

		// ── Round 2: resumen de cuotas (solo campos necesarios, sin JSONB) ───
		const { data: cuotaRows } = polizaIds.length > 0
			? await supabase
				.from("polizas_pagos")
				.select("poliza_id, estado, estado_real, fecha_pago, fecha_vencimiento, monto")
				.in("poliza_id", polizaIds)
			: { data: [] };

		// Función equivalente a obtenerEstadoReal pero sobre los campos mínimos
		type CuotaRow = { poliza_id: string; estado: string; estado_real: string | null; fecha_pago: string | null; fecha_vencimiento: string; monto: number };
		const estadoEfectivo = (c: CuotaRow): string => {
			if (c.estado_real) return c.estado_real;
			if (c.fecha_pago) return "pagado";
			if (c.estado === "parcial") return "parcial";
			return c.fecha_vencimiento < today ? "vencido" : "pendiente";
		};

		// Agrupar cuotas por poliza_id
		type CuotaSummary = {
			cuotas_pendientes: number;
			cuotas_vencidas: number;
			total_pendiente: number;
			total_pagado: number;
			proxima_fecha: string | null;
		};
		const cuotasByPoliza = new Map<string, CuotaSummary>();
		for (const c of (cuotaRows as CuotaRow[] | null) || []) {
			if (!cuotasByPoliza.has(c.poliza_id)) {
				cuotasByPoliza.set(c.poliza_id, { cuotas_pendientes: 0, cuotas_vencidas: 0, total_pendiente: 0, total_pagado: 0, proxima_fecha: null });
			}
			const s = cuotasByPoliza.get(c.poliza_id)!;
			const estado = estadoEfectivo(c);
			if (estado === "pagado") {
				s.total_pagado += c.monto;
			} else {
				s.total_pendiente += c.monto;
				if (estado === "vencido") {
					s.cuotas_vencidas++;
				} else {
					// pendiente o parcial
					s.cuotas_pendientes++;
					if (!s.proxima_fecha || c.fecha_vencimiento < s.proxima_fecha) {
						s.proxima_fecha = c.fecha_vencimiento;
					}
				}
			}
		}

		// ── Construir lista de pólizas ────────────────────────────────────
		const polizasConPagos: PolizaConPagos[] = [];

		for (const poliza of polizas || []) {
			const s = cuotasByPoliza.get(poliza.id) ?? { cuotas_pendientes: 0, cuotas_vencidas: 0, total_pendiente: 0, total_pagado: 0, proxima_fecha: null };

			// Omitir pólizas sin cuotas pendientes (a menos que se pidan pagadas)
			if (!incluirPagadas && s.cuotas_pendientes === 0 && s.cuotas_vencidas === 0) continue;

			const clientData = poliza.client as unknown as ClientQueryResult;
			let nombreCompleto = "N/A";
			let documento = "N/A";

			if (clientData) {
				if (clientData.client_type === "natural" || clientData.client_type === "unipersonal") {
					const natural = clientData.natural_clients;
					if (natural) {
						nombreCompleto = `${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${
							natural.primer_apellido || ""
						} ${natural.segundo_apellido || ""}`.trim();
						documento = natural.numero_documento || "N/A";
					}
					if (clientData.client_type === "unipersonal") {
						const unipersonal = clientData.unipersonal_clients;
						if (unipersonal) {
							nombreCompleto = `${nombreCompleto} (${unipersonal.razon_social || ""})`.trim();
							documento = unipersonal.nit || documento;
						}
					}
				} else {
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
				estado: poliza.estado as "pendiente" | "activa" | "vencida" | "cancelada" | "renovada" | "rechazada",
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
				regional: {
					id: (poliza.regional as { id?: string; nombre?: string } | null)?.id || "",
					nombre: (poliza.regional as { id?: string; nombre?: string } | null)?.nombre || "N/A",
				},
				cuotas: [], // no se precarga; se obtiene bajo demanda al abrir CuotasModal
				total_pagado: s.total_pagado,
				total_pendiente: s.total_pendiente,
				cuotas_pendientes: s.cuotas_pendientes,
				cuotas_vencidas: s.cuotas_vencidas,
				proxima_fecha_vencimiento: s.proxima_fecha,
			});
		}

		// ── Estadísticas KPI ──────────────────────────────────────────────
		const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

		const pendientesPorMoneda = new Map<string, number>();
		let totalCuotasPendientes = 0;
		let totalCuotasVencidas = 0;
		let cuotasPorVencer10dias = 0;

		for (const poliza of polizasConPagos) {
			pendientesPorMoneda.set(poliza.moneda, (pendientesPorMoneda.get(poliza.moneda) || 0) + poliza.total_pendiente);
			totalCuotasPendientes += poliza.cuotas_pendientes;
			totalCuotasVencidas += poliza.cuotas_vencidas;
		}

		// cuotas_por_vencer_10dias: de las filas de cuota con estado pendiente/parcial
		for (const c of (cuotaRows as CuotaRow[] | null) || []) {
			const estado = estadoEfectivo(c);
			if ((estado === "pendiente" || estado === "parcial") && c.fecha_vencimiento <= tenDaysFromNow) {
				cuotasPorVencer10dias++;
			}
		}

		// Cobrado hoy/mes
		const cobradosHoyPorMoneda = new Map<string, number>();
		const cobradosMesPorMoneda = new Map<string, number>();

		for (const cuota of cuotasCobradas || []) {
			const polizaData = cuota.poliza as unknown as { moneda: string; responsable_id: string } | null;
			if (!polizaData) continue;
			const moneda = polizaData.moneda;
			cobradosMesPorMoneda.set(moneda, (cobradosMesPorMoneda.get(moneda) || 0) + cuota.monto);
			if (cuota.fecha_pago === today) {
				cobradosHoyPorMoneda.set(moneda, (cobradosHoyPorMoneda.get(moneda) || 0) + cuota.monto);
			}
		}

		const toMontoPorMoneda = (map: Map<string, number>): MontoPorMoneda[] =>
			Array.from(map.entries())
				.map(([moneda, monto]) => ({ moneda: moneda as Moneda, monto }))
				.sort((a, b) => a.moneda.localeCompare(b.moneda));

		const stats: CobranzaStats = {
			total_polizas: polizasConPagos.length,
			total_cuotas_pendientes: totalCuotasPendientes,
			total_cuotas_vencidas: totalCuotasVencidas,
			montos_pendientes: toMontoPorMoneda(pendientesPorMoneda),
			montos_cobrados_hoy: toMontoPorMoneda(cobradosHoyPorMoneda),
			montos_cobrados_mes: toMontoPorMoneda(cobradosMesPorMoneda),
			cuotas_por_vencer_10dias: cuotasPorVencer10dias,
		};

		return { success: true, data: { polizas: polizasConPagos, stats } };
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
			observaciones += `\n[${registro.fecha_pago}] Pago parcial de ${montoPagado}. Saldo pendiente: ${
				montoCuota - montoPagado
			}.`;
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
		const updatePayload: Record<string, unknown> = {
			estado: nuevoEstado,
			fecha_pago: tipoPago !== "parcial" ? registro.fecha_pago : null,
			observaciones: observaciones.trim(),
		};
		// Reduce monto to remaining balance on partial payment, consistent with redistribuirExceso
		if (tipoPago === "parcial") {
			updatePayload.monto = montoCuota - montoPagado;
		}
		const { error: updateError } = await supabase
			.from("polizas_pagos")
			.update(updatePayload)
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
export async function redistribuirExceso(distribucion: ExcessPaymentDistribution): Promise<RedistribuirExcesoResponse> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		// Validate that total distributed does not exceed the excess amount
		// (distributing less than the excess is allowed when pending quotas are insufficient)
		if (distribucion.total_distribuido > distribucion.monto_exceso + 0.01) {
			return {
				success: false,
				error: `El monto distribuido (${distribucion.total_distribuido}) supera el exceso disponible (${distribucion.monto_exceso})`,
			};
		}
		if (distribucion.total_distribuido <= 0) {
			return {
				success: false,
				error: "Debes distribuir al menos un monto a alguna cuota",
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
export async function obtenerCuotasPendientesPorPoliza(polizaId: string): Promise<CobranzaServerResponse<CuotaPago[]>> {
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

		// Data scoping: agentes/comerciales solo ven datos de su equipo
		const scope = await getDataScopeFilter("polizas");

		// Query starts from polizas (left join to pagos) to include policies without payment records
		let query = supabase.from("polizas").select(`
			id,
			numero_poliza,
			ramo,
			moneda,
			prima_total,
			inicio_vigencia,
			fin_vigencia,
			responsable_id,
			compania_aseguradora_id,
			regional_id,
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
				),
				unipersonal_clients (
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
			),
			cuotas:polizas_pagos (*)
		`)
		.eq("estado", "activa");

		// Apply entity filters directly on polizas
		if (filtros.compania_id && filtros.compania_id !== "all") {
			query = query.eq("compania_aseguradora_id", filtros.compania_id);
		}
		if (filtros.ramo && filtros.ramo !== "all") {
			query = query.eq("ramo", filtros.ramo);
		}
		if (filtros.responsable_id && filtros.responsable_id !== "all") {
			query = query.eq("responsable_id", filtros.responsable_id);
		}
		if (filtros.regional_id && filtros.regional_id !== "all") {
			query = query.eq("regional_id", filtros.regional_id);
		}

		// Scoping: agentes/comerciales solo ven datos de su equipo
		if (scope.needsScoping) {
			query = query.in("responsable_id", scope.teamMemberIds);
		}

		const { data: polizas, error } = await query.order("numero_poliza", { ascending: true });

		if (error) {
			console.error("Error fetching policies for export:", error);
			return { success: false, error: "Error al obtener datos para exportar" };
		}

		// Flatten: each poliza's cuotas become individual export rows
		// Policies with no cuotas get a single row with empty quota fields
		const exportRows: ExportRow[] = [];

		for (const poliza of polizas || []) {
			const clientData = poliza.client as unknown as ClientQueryResult;

			let cliente = "N/A";
			let ciNit = "N/A";

			if (clientData) {
				if (clientData.client_type === "natural" || clientData.client_type === "unipersonal") {
					const natural = clientData.natural_clients;
					if (natural) {
						cliente = `${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${
							natural.primer_apellido || ""
						} ${natural.segundo_apellido || ""}`.trim();
						ciNit = natural.numero_documento || "N/A";
					}
					if (clientData.client_type === "unipersonal") {
						const unipersonal = clientData.unipersonal_clients;
						if (unipersonal) {
							cliente = `${cliente} (${unipersonal.razon_social || ""})`.trim();
							ciNit = unipersonal.nit || ciNit;
						}
					}
				} else {
					const juridic = clientData.juridic_clients;
					if (juridic) {
						cliente = juridic.razon_social || "N/A";
						ciNit = juridic.nit || "N/A";
					}
				}
			}

			const cuotas = ((poliza.cuotas || []) as Array<{
				numero_cuota: number;
				monto: number;
				fecha_vencimiento: string;
				fecha_vencimiento_original: string | null;
				fecha_pago: string | null;
				estado: EstadoPago;
				observaciones: string | null;
				prorrogas_historial: unknown;
			}>).sort((a, b) => a.numero_cuota - b.numero_cuota);

			// Apply quota-level filters
			let cuotasFiltradas = cuotas;

			if (filtros.estado_cuota && filtros.estado_cuota !== "all") {
				cuotasFiltradas = cuotasFiltradas.filter((c) => c.estado === filtros.estado_cuota);
			}

			if (aplicarFiltroFecha && (fechaDesde || fechaHasta)) {
				const tipoFiltro =
					filtros.tipo_filtro_fecha || (filtros.periodo === "today" ? "fecha_pago" : "fecha_vencimiento");

				cuotasFiltradas = cuotasFiltradas.filter((c) => {
					const fechaCampo = tipoFiltro === "fecha_pago" ? c.fecha_pago : c.fecha_vencimiento;
					if (!fechaCampo) return false;
					if (fechaDesde && fechaCampo < fechaDesde) return false;
					if (fechaHasta && fechaCampo > fechaHasta) return false;
					return true;
				});
			}

			// If no quotas match filters, include a single row for the policy (so it's not lost)
			if (cuotasFiltradas.length === 0) {
				exportRows.push({
					numero_poliza: poliza.numero_poliza,
					cliente,
					ci_nit: ciNit,
					compania: (poliza.compania as { nombre?: string } | null)?.nombre || "N/A",
					ramo: poliza.ramo || "N/A",
					responsable: (poliza.responsable as { full_name?: string } | null)?.full_name || "N/A",
					regional: (poliza.regional as { nombre?: string } | null)?.nombre || "N/A",
					prima_total: poliza.prima_total || 0,
					inicio_vigencia: poliza.inicio_vigencia || "",
					fin_vigencia: poliza.fin_vigencia || "",
					numero_cuota: 0,
					monto_cuota: 0,
					moneda: (poliza.moneda as Moneda) || "Bs",
					fecha_vencimiento: "",
					fecha_vencimiento_original: null,
					fecha_pago: null,
					estado: cuotas.length === 0 ? "pendiente" : "pagado",
					dias_vencido: 0,
					monto_pagado: 0,
					tiene_prorroga: false,
					observaciones: cuotas.length === 0 ? "Sin cuotas registradas" : "Todas las cuotas pagadas",
				});
				continue;
			}

			for (const pago of cuotasFiltradas) {
				const diasVencido =
					pago.estado === "vencido" || pago.estado === "pendiente"
						? Math.max(
								0,
								Math.floor(
									(Date.now() - new Date(pago.fecha_vencimiento).getTime()) / (24 * 60 * 60 * 1000)
								)
						  )
						: 0;

				const tieneProrroga = Array.isArray(pago.prorrogas_historial) && pago.prorrogas_historial.length > 0;

				exportRows.push({
					numero_poliza: poliza.numero_poliza,
					cliente,
					ci_nit: ciNit,
					compania: (poliza.compania as { nombre?: string } | null)?.nombre || "N/A",
					ramo: poliza.ramo || "N/A",
					responsable: (poliza.responsable as { full_name?: string } | null)?.full_name || "N/A",
					regional: (poliza.regional as { nombre?: string } | null)?.nombre || "N/A",
					prima_total: poliza.prima_total || 0,
					inicio_vigencia: poliza.inicio_vigencia || "",
					fin_vigencia: poliza.fin_vigencia || "",
					numero_cuota: pago.numero_cuota,
					monto_cuota: pago.monto,
					moneda: (poliza.moneda as Moneda) || "Bs",
					fecha_vencimiento: pago.fecha_vencimiento,
					fecha_vencimiento_original: pago.fecha_vencimiento_original,
					fecha_pago: pago.fecha_pago,
					estado: pago.estado,
					dias_vencido: diasVencido,
					monto_pagado: pago.estado === "pagado" ? pago.monto : 0,
					tiene_prorroga: tieneProrroga,
					observaciones: pago.observaciones || "",
				});
			}
		}

		return { success: true, data: exportRows };
	} catch (error) {
		console.error("Error exporting report:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtiene las opciones disponibles para los filtros de exportación.
 * Respeta scoping: agentes/comerciales solo ven opciones de su equipo.
 */
export async function obtenerOpcionesFiltroExport(): Promise<CobranzaServerResponse<ExportFilterOptions>> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const scope = await getDataScopeFilter("polizas");

		// Obtener compañías, regionales de catálogos
		const [companiasRes, regionalesRes] = await Promise.all([
			supabase.from("companias_aseguradoras").select("id, nombre").order("nombre"),
			supabase.from("regionales").select("id, nombre").order("nombre"),
		]);

		// Obtener ramos y responsables únicos de pólizas activas (respetando scope)
		let polizasQuery = supabase
			.from("polizas")
			.select("ramo, responsable_id, responsable:profiles!responsable_id(id, full_name)")
			.eq("estado", "activa");

		if (scope.needsScoping) {
			polizasQuery = polizasQuery.in("responsable_id", scope.teamMemberIds);
		}

		const { data: polizasData } = await polizasQuery;

		// Extraer ramos únicos
		const ramosSet = new Set<string>();
		const responsablesMap = new Map<string, string>();

		for (const p of polizasData || []) {
			if (p.ramo) ramosSet.add(p.ramo);
			const resp = p.responsable as { id?: string; full_name?: string } | null;
			if (resp?.id && resp?.full_name) {
				responsablesMap.set(resp.id, resp.full_name);
			}
		}

		const ramos = Array.from(ramosSet).sort();
		const responsables = Array.from(responsablesMap.entries())
			.map(([id, full_name]) => ({ id, full_name }))
			.sort((a, b) => a.full_name.localeCompare(b.full_name));

		return {
			success: true,
			data: {
				companias: companiasRes.data || [],
				ramos,
				responsables,
				regionales: regionalesRes.data || [],
			},
		};
	} catch (error) {
		console.error("Error fetching filter options:", error);
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
export async function obtenerDetallePolizaParaCuotas(polizaId: string): Promise<ObtenerDetallePolizaResponse> {
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
					juridic_clients(razon_social, nit, telefono, correo_electronico),
					unipersonal_clients(razon_social, nit, telefono_comercial, correo_electronico_comercial)
				),
				compania:companias_aseguradoras!compania_aseguradora_id(id, nombre),
				responsable:profiles!responsable_id(id, full_name),
				regional:regionales!regional_id(id, nombre),
				cuotas:polizas_pagos(*)
			`
			)
			.eq("id", polizaId)
			.single();

		if (polizaError || !poliza) {
			console.error("Error fetching poliza:", polizaError);
			return { success: false, error: "Póliza no encontrada" };
		}



		// Extract contact info based on client type
		let contacto: ContactoCliente = {
			telefono: null,
			correo: null,
			celular: null,
		};

		if (poliza.client.client_type === "natural" || poliza.client.client_type === "unipersonal") {
			const natural = poliza.client.natural_clients;
			if (natural) {
				contacto = {
					telefono: null,
					correo: natural.correo_electronico || null,
					celular: natural.celular || null,
				};
			}
			// For unipersonal, prefer commercial contact if available
			if (poliza.client.client_type === "unipersonal") {
				const unipersonal = poliza.client.unipersonal_clients;
				if (unipersonal) {
					contacto = {
						telefono: unipersonal.telefono_comercial || contacto.telefono,
						correo: unipersonal.correo_electronico_comercial || contacto.correo,
						celular: contacto.celular,
					};
				}
			}
		} else {
			const juridic = poliza.client.juridic_clients;
			if (juridic) {
				contacto = {
					telefono: juridic.telefono || null,
					correo: juridic.correo_electronico || null,
					celular: null,
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
		const cuotas = (poliza.cuotas || []) as CuotaPago[];
		const todayStr = new Date().toISOString().split("T")[0];
		const total_pagado = cuotas
			.filter((c: CuotaPago) => c.estado === "pagado")
			.reduce((sum: number, c: CuotaPago) => sum + c.monto, 0);
		const total_pendiente = cuotas
			.filter((c: CuotaPago) => c.estado !== "pagado")
			.reduce((sum: number, c: CuotaPago) => sum + c.monto, 0);
		const cuotas_pendientes = cuotas.filter((c: CuotaPago) => c.estado === "pendiente").length;
		const cuotas_vencidas = cuotas.filter((c: CuotaPago) => obtenerEstadoReal(c) === "vencido").length;
		const proxima_fecha_vencimiento = cuotas
			.filter((c: CuotaPago) => obtenerEstadoReal(c) !== "pagado" && c.fecha_vencimiento >= todayStr)
			.sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0]?.fecha_vencimiento ?? null;

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
				client_type: poliza.client.client_type as "natural" | "juridica",
				nombre_completo: (() => {
					if (poliza.client.client_type === "natural" || poliza.client.client_type === "unipersonal") {
						const nombre = [
							poliza.client.natural_clients?.primer_nombre,
							poliza.client.natural_clients?.segundo_nombre,
							poliza.client.natural_clients?.primer_apellido,
							poliza.client.natural_clients?.segundo_apellido,
						].filter(Boolean).join(" ").trim() || "N/A";
						if (poliza.client.client_type === "unipersonal" && poliza.client.unipersonal_clients?.razon_social) {
							return `${nombre} (${poliza.client.unipersonal_clients.razon_social})`;
						}
						return nombre;
					}
					return poliza.client.juridic_clients?.razon_social || "N/A";
				})(),
				documento: (() => {
					if (poliza.client.client_type === "natural") {
						return poliza.client.natural_clients?.numero_documento || "N/A";
					}
					if (poliza.client.client_type === "unipersonal") {
						return poliza.client.unipersonal_clients?.nit || poliza.client.natural_clients?.numero_documento || "N/A";
					}
					return poliza.client.juridic_clients?.nit || "N/A";
				})(),
			},
			compania: {
				id: poliza.compania.id,
				nombre: poliza.compania.nombre,
			},
			responsable: {
				id: poliza.responsable.id,
				full_name: poliza.responsable.full_name,
			},
			regional: {
				id: poliza.regional?.id || "",
				nombre: poliza.regional?.nombre || "N/A",
			},
			cuotas: cuotas as CuotaPago[],
			total_pagado,
			total_pendiente,
			cuotas_pendientes,
			cuotas_vencidas,
			proxima_fecha_vencimiento,
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
export async function subirComprobantePago(pagoId: string, fileData: FormData): Promise<SubirComprobanteResponse> {
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

		// Create record in database with relative storage path (not public URL)
		const { data: comprobante, error: dbError } = await supabase
			.from("polizas_pagos_comprobantes")
			.insert({
				pago_id: pagoId,
				nombre_archivo: file.name,
				archivo_url: uploadData.path,
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
				archivo_url: uploadData.path,
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

		// Get current user profile
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("full_name")
			.eq("id", user.id)
			.single();

		if (profileError || !profile) {
			return { success: false, error: "Error al obtener perfil del usuario" };
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
			generado_por: profile.full_name,
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

/**
 * Obtiene el comprobante de pago de una cuota y retorna una URL firmada temporal para visualización
 * El bucket pagos-comprobantes es privado, por lo que se usa createSignedUrl
 */
export async function obtenerComprobanteCuota(
	pagoId: string
): Promise<CobranzaServerResponse<{ comprobante: Comprobante; publicUrl: string }>> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("polizas_pagos_comprobantes")
			.select("*")
			.eq("pago_id", pagoId)
			.eq("estado", "activo")
			.maybeSingle();

		if (error) {
			console.error("Error fetching comprobante:", error);
			return { success: false, error: "Error al obtener comprobante" };
		}

		if (!data) {
			return { success: false, error: "No se encontró comprobante para esta cuota" };
		}

		// Generate signed URL (valid for 1 hour) since bucket is private
		const { data: signedUrlData, error: signedUrlError } = await supabase.storage
			.from("pagos-comprobantes")
			.createSignedUrl(data.archivo_url, 3600);

		if (signedUrlError || !signedUrlData?.signedUrl) {
			console.error("Error creating signed URL:", signedUrlError);
			return { success: false, error: "Error al generar URL de acceso al archivo" };
		}

		return {
			success: true,
			data: {
				comprobante: data as Comprobante,
				publicUrl: signedUrlData.signedUrl,
			},
		};
	} catch (error) {
		console.error("Error in obtenerComprobanteCuota:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE PAGINATION
// Requiere la vista cobranzas_polizas_resumen (docs/migration_cobranzas_view.sql)
// ─────────────────────────────────────────────────────────────────────────────

/** Mapeo de CobranzaSortField → columna en la vista */
const SORT_COLUMN_MAP: Record<CobranzaSortField, string> = {
	numero_poliza:    "numero_poliza",
	cuotas_vencidas:  "cuotas_vencidas",
	cuotas_pendientes:"cuotas_pendientes",
	monto_pendiente:  "total_pendiente",
	fecha_vencimiento:"proxima_fecha_vencimiento",
	prima_total:      "prima_total",
	inicio_vigencia:  "inicio_vigencia",
};

/**
 * Lista paginada de pólizas de cobranzas usando la vista pre-computada.
 * Round 1: filtra/ordena/pagina sobre la vista (computed cuota fields).
 * Round 2: enriquece los ≤20 IDs con cliente/compañía/responsable/regional.
 */
export async function obtenerCobranzasPaginadas(params: CobranzaFiltros = {}): Promise<
	CobranzaServerResponse<{ polizas: PolizaConPagos[]; total: number }>
> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) return { success: false, error: permiso.error };

	const supabase = await createClient();
	const {
		page = 1,
		pageSize = 20,
		search,
		ramo,
		compania_id,
		responsable_id,
		regional_id,
		soloVencidas = false,
		incluirPagadas = false,
		sortField = "cuotas_vencidas",
		sortDirection = "desc",
	} = params;

	try {
		const scope = await getDataScopeFilter("polizas");

		// ── Pre-paso: búsqueda de texto → client_ids coincidentes ─────────
		let searchClientIds: string[] | null = null;
		let searchPolizaMatch = "";
		if (search?.trim()) {
			const q = search.trim().substring(0, 100);
			searchPolizaMatch = q;
			const [natRes, jurRes, uniRes] = await Promise.all([
				supabase.from("natural_clients")
					.select("client_id")
					.or(`primer_nombre.ilike.%${q}%,primer_apellido.ilike.%${q}%,segundo_apellido.ilike.%${q}%,numero_documento.ilike.%${q}%`),
				supabase.from("juridic_clients")
					.select("client_id")
					.or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`),
				supabase.from("unipersonal_clients")
					.select("client_id")
					.or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`),
			]);
			searchClientIds = [
				...(natRes.data?.map((r) => r.client_id) ?? []),
				...(jurRes.data?.map((r) => r.client_id) ?? []),
				...(uniRes.data?.map((r) => r.client_id) ?? []),
			];
		}

		// ── Round 1: vista con filtros, orden y paginación ─────────────────
		const from = (page - 1) * pageSize;
		const to   = from + pageSize - 1;
		const sortCol = SORT_COLUMN_MAP[sortField];
		const ascending = sortDirection === "asc";

		let query = supabase
			.from("cobranzas_polizas_resumen")
			.select("id,numero_poliza,ramo,prima_total,moneda,estado,inicio_vigencia,fin_vigencia,modalidad_pago,client_id,compania_aseguradora_id,responsable_id,regional_id,cuotas_vencidas,cuotas_pendientes,total_pendiente,total_pagado,proxima_fecha_vencimiento", { count: "exact" });

		// Data scoping
		if (scope.needsScoping) {
			query = query.in("responsable_id", scope.teamMemberIds);
		}

		// Filtros opcionales
		if (ramo)         query = query.eq("ramo", ramo);
		if (compania_id)  query = query.eq("compania_aseguradora_id", compania_id);
		if (responsable_id) query = query.eq("responsable_id", responsable_id);
		if (regional_id)  query = query.eq("regional_id", regional_id);
		if (soloVencidas) query = query.gt("cuotas_vencidas", 0);

		// Solo sin cuotas pendientes/vencidas → excluir las totalmente pagadas
		if (!incluirPagadas) {
			query = query.or("cuotas_pendientes.gt.0,cuotas_vencidas.gt.0");
		}

		// Texto: número de póliza O cliente
		if (searchClientIds !== null) {
			// combinar: poliza ilike O client_id IN (...)
			const clientFilter = searchClientIds.length > 0
				? `client_id.in.(${searchClientIds.join(",")})`
				: "client_id.eq.00000000-0000-0000-0000-000000000000"; // sin resultados
			query = query.or(`numero_poliza.ilike.%${searchPolizaMatch}%,${clientFilter}`);
		}

		// Orden + paginación
		// proxima_fecha_vencimiento puede ser null (pólizas sin cuotas pendientes)
		// NULLs al final en ascendente, al inicio en descendente
		const nullsFirst = sortField === "fecha_vencimiento" && sortDirection === "desc";
		query = query
			.order(sortCol, { ascending, nullsFirst })
			.range(from, to);

		const { data: resumen, error: resumenError, count } = await query;

		if (resumenError) {
			console.error("Error en cobranzas_polizas_resumen:", resumenError);
			return { success: false, error: "Error al obtener pólizas de cobranzas" };
		}
		if (!resumen || resumen.length === 0) {
			return { success: true, data: { polizas: [], total: count ?? 0 } };
		}

		// ── Round 2: enriquecer los ≤20 IDs con datos de cliente/compañía ──
		const polizaIds = resumen.map((r) => r.id);

		const { data: detalle } = await supabase
			.from("polizas")
			.select(`
				id,
				client:clients!client_id (
					id, client_type,
					natural_clients (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento),
					juridic_clients (razon_social, nit),
					unipersonal_clients (razon_social, nit)
				),
				compania:companias_aseguradoras!compania_aseguradora_id (id, nombre),
				responsable:profiles!responsable_id (id, full_name),
				regional:regionales!regional_id (id, nombre)
			`)
			.in("id", polizaIds);

		// Indexar por id para O(1) lookup
		const detalleMap = new Map((detalle ?? []).map((d) => [d.id, d]));

		// ── Construir PolizaConPagos desde vista + detalle ─────────────────
		const polizas: PolizaConPagos[] = resumen.map((r) => {
			const d = detalleMap.get(r.id);
			const clientData = d?.client as unknown as ClientQueryResult;

			let nombreCompleto = "N/A";
			let documento = "N/A";

			if (clientData) {
				if (clientData.client_type === "natural" || clientData.client_type === "unipersonal") {
					const natural = clientData.natural_clients;
					if (natural) {
						nombreCompleto = `${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${natural.primer_apellido || ""} ${natural.segundo_apellido || ""}`.trim();
						documento = natural.numero_documento || "N/A";
					}
					if (clientData.client_type === "unipersonal" && clientData.unipersonal_clients) {
						const uc = clientData.unipersonal_clients;
						nombreCompleto = `${nombreCompleto} (${uc.razon_social || ""})`.trim();
						documento = uc.nit || documento;
					}
				} else if (clientData.client_type === "juridica" && clientData.juridic_clients) {
					nombreCompleto = clientData.juridic_clients.razon_social || "N/A";
					documento = clientData.juridic_clients.nit || "N/A";
				}
			}

			return {
				id: r.id,
				numero_poliza: r.numero_poliza,
				ramo: r.ramo,
				prima_total: r.prima_total,
				moneda: r.moneda as Moneda,
				estado: r.estado as PolizaConPagos["estado"],
				inicio_vigencia: r.inicio_vigencia,
				fin_vigencia: r.fin_vigencia,
				modalidad_pago: r.modalidad_pago as "contado" | "credito",
				client: {
					id: clientData?.id || "",
					client_type: (clientData?.client_type ?? "natural") as "natural" | "juridica",
					nombre_completo: nombreCompleto,
					documento,
				},
				compania: {
					id: (d?.compania as { id?: string; nombre?: string } | null)?.id || "",
					nombre: (d?.compania as { id?: string; nombre?: string } | null)?.nombre || "N/A",
				},
				responsable: {
					id: (d?.responsable as { id?: string; full_name?: string } | null)?.id || "",
					full_name: (d?.responsable as { id?: string; full_name?: string } | null)?.full_name || "N/A",
				},
				regional: {
					id: (d?.regional as { id?: string; nombre?: string } | null)?.id || "",
					nombre: (d?.regional as { id?: string; nombre?: string } | null)?.nombre || "N/A",
				},
				cuotas: [],
				total_pagado: r.total_pagado ?? 0,
				total_pendiente: r.total_pendiente ?? 0,
				cuotas_pendientes: r.cuotas_pendientes ?? 0,
				cuotas_vencidas: r.cuotas_vencidas ?? 0,
				proxima_fecha_vencimiento: r.proxima_fecha_vencimiento ?? null,
			};
		});

		return { success: true, data: { polizas, total: count ?? 0 } };
	} catch (error) {
		console.error("Error en obtenerCobranzasPaginadas:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

/**
 * KPIs globales del dashboard de cobranzas.
 * Usa la vista para agregar totales y una query separada para cobrados hoy/mes.
 */
export async function obtenerCobranzaStats(): Promise<CobranzaServerResponse<CobranzaStats>> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) return { success: false, error: permiso.error };

	const supabase = await createClient();

	try {
		const scope = await getDataScopeFilter("polizas");
		const today = new Date().toISOString().split("T")[0];
		const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
			.toISOString().split("T")[0];
		const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
			.toISOString().split("T")[0];

		// ── Paralelo: vista (agregados) + cuotas próximas + cobrados del mes ──
		let vistaQuery = supabase
			.from("cobranzas_polizas_resumen")
			.select("moneda,cuotas_vencidas,cuotas_pendientes,total_pendiente,proxima_fecha_vencimiento");
		if (scope.needsScoping) vistaQuery = vistaQuery.in("responsable_id", scope.teamMemberIds);

		const cobradosQuery = supabase
			.from("polizas_pagos")
			.select("monto,fecha_pago,poliza:polizas!poliza_id(moneda,responsable_id)")
			.eq("estado", "pagado")
			.gte("fecha_pago", firstDayOfMonth);
		// scoping en cobrados via join filter no soportado directamente; filtrar post-fetch

		const [{ data: vistaRows }, { data: cuotasCobradas }] = await Promise.all([
			vistaQuery,
			cobradosQuery,
		]);

		type VistaRow = {
			moneda: string;
			cuotas_vencidas: number;
			cuotas_pendientes: number;
			total_pendiente: number;
			proxima_fecha_vencimiento: string | null;
		};

		const rows = (vistaRows ?? []) as VistaRow[];

		// Filtrar solo pólizas con cuotas pendientes o vencidas para stats
		const rowsActivas = rows.filter((r) => r.cuotas_vencidas > 0 || r.cuotas_pendientes > 0);

		const pendientesPorMoneda = new Map<string, number>();
		let totalCuotasPendientes = 0;
		let totalCuotasVencidas = 0;
		let cuotasPorVencer10dias = 0;

		for (const r of rowsActivas) {
			pendientesPorMoneda.set(r.moneda, (pendientesPorMoneda.get(r.moneda) || 0) + r.total_pendiente);
			totalCuotasPendientes += r.cuotas_pendientes;
			totalCuotasVencidas   += r.cuotas_vencidas;
			if (r.proxima_fecha_vencimiento && r.proxima_fecha_vencimiento <= tenDaysFromNow) {
				cuotasPorVencer10dias++;
			}
		}

		// Cobrados hoy/mes (con scoping aplicado post-fetch)
		const cobradosHoyPorMoneda  = new Map<string, number>();
		const cobradosMesPorMoneda  = new Map<string, number>();

		for (const cuota of cuotasCobradas ?? []) {
			const polizaData = cuota.poliza as unknown as { moneda: string; responsable_id: string } | null;
			if (!polizaData) continue;
			if (scope.needsScoping && !scope.teamMemberIds.includes(polizaData.responsable_id)) continue;
			const moneda = polizaData.moneda;
			cobradosMesPorMoneda.set(moneda, (cobradosMesPorMoneda.get(moneda) || 0) + cuota.monto);
			if (cuota.fecha_pago === today) {
				cobradosHoyPorMoneda.set(moneda, (cobradosHoyPorMoneda.get(moneda) || 0) + cuota.monto);
			}
		}

		const toMontoPorMoneda = (map: Map<string, number>): MontoPorMoneda[] =>
			Array.from(map.entries())
				.map(([moneda, monto]) => ({ moneda: moneda as Moneda, monto }))
				.sort((a, b) => a.moneda.localeCompare(b.moneda));

		const stats: CobranzaStats = {
			total_polizas: rowsActivas.length,
			total_cuotas_pendientes: totalCuotasPendientes,
			total_cuotas_vencidas:   totalCuotasVencidas,
			montos_pendientes:    toMontoPorMoneda(pendientesPorMoneda),
			montos_cobrados_hoy:  toMontoPorMoneda(cobradosHoyPorMoneda),
			montos_cobrados_mes:  toMontoPorMoneda(cobradosMesPorMoneda),
			cuotas_por_vencer_10dias: cuotasPorVencer10dias,
		};

		return { success: true, data: stats };
	} catch (error) {
		console.error("Error en obtenerCobranzaStats:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

/**
 * Opciones de filtro para los dropdowns del dashboard.
 * Retorna valores distintos de pólizas activas.
 */
export async function obtenerFiltrosCobranza(): Promise<CobranzaServerResponse<FiltrosCobranzaOptions>> {
	const permiso = await verificarPermisoCobranza();
	if (!permiso.authorized) return { success: false, error: permiso.error };

	const supabase = await createClient();

	try {
		const scope = await getDataScopeFilter("polizas");

		let polizasQuery = supabase
			.from("polizas")
			.select(`
				ramo,
				compania:companias_aseguradoras!compania_aseguradora_id (id, nombre),
				responsable:profiles!responsable_id (id, full_name),
				regional:regionales!regional_id (id, nombre)
			`)
			.eq("estado", "activa");

		if (scope.needsScoping) {
			polizasQuery = polizasQuery.in("responsable_id", scope.teamMemberIds);
		}

		const { data: rows } = await polizasQuery;

		const ramos       = [...new Set((rows ?? []).map((r) => r.ramo).filter(Boolean))].sort();
		const companiaMap = new Map<string, string>();
		const responsableMap = new Map<string, string>();
		const regionalMap = new Map<string, string>();

		for (const r of rows ?? []) {
			const comp = r.compania as { id?: string; nombre?: string } | null;
			if (comp?.id && comp.nombre) companiaMap.set(comp.id, comp.nombre);
			const resp = r.responsable as { id?: string; full_name?: string } | null;
			if (resp?.id && resp.full_name) responsableMap.set(resp.id, resp.full_name);
			const reg = r.regional as { id?: string; nombre?: string } | null;
			if (reg?.id && reg.nombre) regionalMap.set(reg.id, reg.nombre);
		}

		return {
			success: true,
			data: {
				ramos,
				companias:    [...companiaMap.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
				responsables: [...responsableMap.entries()].map(([id, full_name]) => ({ id, full_name })).sort((a, b) => a.full_name.localeCompare(b.full_name)),
				regionales:   [...regionalMap.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
			},
		};
	} catch (error) {
		console.error("Error en obtenerFiltrosCobranza:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}
