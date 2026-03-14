"use server";

import { createClient } from "@/utils/supabase/server";
import { checkPermission, getDataScopeFilter } from "@/utils/auth/helpers";
import type {
	GerenciaFiltros,
	EstadisticasProduccion,
	EstadisticasCobranzas,
	EstadisticasSiniestros,
	FiltrosData,
	GerenciaResponse,
	PrimaPorMes,
	DistribucionPorRamo,
	PrimaPorCompania,
	ProduccionPorResponsable,
	CobradoVsPendientePorMes,
	DistribucionEstadosPago,
	ProximaCuotaPorVencer,
	SiniestrosPorMes,
	SiniestrosPorRamo,
	SiniestroAbierto,
} from "@/types/gerencia";

const MESES_LABELS = [
	"Ene", "Feb", "Mar", "Abr", "May", "Jun",
	"Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/**
 * Calcula rango de fechas según filtros.
 * Si mes está definido, retorna rango del mes; sino rango del año completo.
 */
function calcularRangos(filtros: GerenciaFiltros) {
	const fechaAnioDesde = `${filtros.anio}-01-01`;
	const fechaAnioHasta = `${filtros.anio}-12-31`;

	if (filtros.mes) {
		const mes = filtros.mes;
		const fechaDesde = `${filtros.anio}-${String(mes).padStart(2, "0")}-01`;
		const ultimoDia = new Date(filtros.anio, mes, 0).getDate();
		const fechaHasta = `${filtros.anio}-${String(mes).padStart(2, "0")}-${ultimoDia}`;
		return { fechaDesde, fechaHasta, fechaAnioDesde, fechaAnioHasta, esAnual: false };
	}

	return { fechaDesde: fechaAnioDesde, fechaHasta: fechaAnioHasta, fechaAnioDesde, fechaAnioHasta, esAnual: true };
}

// ============================================
// PRODUCCIÓN
// ============================================

export async function obtenerEstadisticasProduccion(
	filtros: GerenciaFiltros
): Promise<GerenciaResponse<EstadisticasProduccion>> {
	const { allowed } = await checkPermission("gerencia.ver");
	if (!allowed) return { success: false, error: "Sin permiso" };

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
		const { fechaDesde, fechaHasta, fechaAnioDesde, fechaAnioHasta, esAnual } = calcularRangos(filtros);

		// Query base: pólizas activas/pendientes/renovadas del año
		let query = supabase
			.from("polizas")
			.select(`
				id,
				prima_total,
				comision_empresa,
				ramo,
				inicio_vigencia,
				responsable_id,
				compania:companias_aseguradoras!compania_aseguradora_id ( nombre ),
				responsable:profiles!responsable_id ( full_name )
			`)
			.in("estado", ["activa", "pendiente", "renovada"])
			.gte("inicio_vigencia", fechaAnioDesde)
			.lte("inicio_vigencia", fechaAnioHasta);

		if (scope.needsScoping) {
			query = query.in("responsable_id", scope.teamMemberIds);
		}
		if (filtros.regional_id) {
			query = query.eq("regional_id", filtros.regional_id);
		}
		if (filtros.compania_id) {
			query = query.eq("compania_aseguradora_id", filtros.compania_id);
		}
		if (filtros.equipo_id) {
			const { data: members } = await supabase
				.from("equipo_miembros")
				.select("user_id")
				.eq("equipo_id", filtros.equipo_id);
			if (members && members.length > 0) {
				query = query.in("responsable_id", members.map((m) => m.user_id));
			}
		}

		const { data: polizas, error } = await query;
		if (error) {
			console.error("Error fetching polizas for stats:", error);
			return { success: false, error: "Error al obtener estadísticas de producción" };
		}

		const rows = polizas || [];

		// Período seleccionado: si es anual usa todas, si es mes filtra
		const polizasPeriodo = esAnual
			? rows
			: rows.filter((p) => {
				const d = p.inicio_vigencia as string;
				return d >= fechaDesde && d <= fechaHasta;
			});

		const kpis = {
			prima_total_mes: polizasPeriodo.reduce((sum, p) => sum + Number(p.prima_total || 0), 0),
			prima_acumulada_anio: rows.reduce((sum, p) => sum + Number(p.prima_total || 0), 0),
			comisiones_mes: polizasPeriodo.reduce((sum, p) => sum + Number(p.comision_empresa || 0), 0),
			cantidad_polizas_mes: polizasPeriodo.length,
		};

		// Prima por mes (12 meses del año)
		const primaPorMesMap = new Map<number, number>();
		for (let m = 1; m <= 12; m++) primaPorMesMap.set(m, 0);
		for (const p of rows) {
			const mes = new Date(p.inicio_vigencia as string).getMonth() + 1;
			primaPorMesMap.set(mes, (primaPorMesMap.get(mes) || 0) + Number(p.prima_total || 0));
		}
		const primaPorMes: PrimaPorMes[] = Array.from(primaPorMesMap.entries()).map(
			([mes, prima]) => ({ mes, label: MESES_LABELS[mes - 1], prima_total: prima })
		);

		// Distribución por ramo (período seleccionado)
		const ramoMap = new Map<string, number>();
		for (const p of polizasPeriodo) {
			const ramo = (p.ramo as string) || "Otro";
			ramoMap.set(ramo, (ramoMap.get(ramo) || 0) + Number(p.prima_total || 0));
		}
		const totalPrimaRamo = Array.from(ramoMap.values()).reduce((a, b) => a + b, 0);
		const distribucionPorRamo: DistribucionPorRamo[] = Array.from(ramoMap.entries())
			.map(([ramo, prima]) => ({
				ramo,
				prima_total: prima,
				porcentaje: totalPrimaRamo > 0 ? (prima / totalPrimaRamo) * 100 : 0,
			}))
			.sort((a, b) => b.prima_total - a.prima_total);

		// Prima por compañía (período seleccionado)
		const companiaMap = new Map<string, number>();
		for (const p of polizasPeriodo) {
			const comp = (p.compania as { nombre?: string })?.nombre || "Sin asignar";
			companiaMap.set(comp, (companiaMap.get(comp) || 0) + Number(p.prima_total || 0));
		}
		const primaPorCompania: PrimaPorCompania[] = Array.from(companiaMap.entries())
			.map(([compania, prima]) => ({ compania, prima_total: prima }))
			.sort((a, b) => b.prima_total - a.prima_total);

		// Top responsables (período seleccionado)
		const respMap = new Map<string, { prima: number; count: number }>();
		for (const p of polizasPeriodo) {
			const resp = (p.responsable as { full_name?: string })?.full_name || "Sin asignar";
			const existing = respMap.get(resp) || { prima: 0, count: 0 };
			existing.prima += Number(p.prima_total || 0);
			existing.count += 1;
			respMap.set(resp, existing);
		}
		const topResponsables: ProduccionPorResponsable[] = Array.from(respMap.entries())
			.map(([responsable, data]) => ({
				responsable,
				prima_total: data.prima,
				cantidad_polizas: data.count,
			}))
			.sort((a, b) => b.prima_total - a.prima_total)
			.slice(0, 10);

		return {
			success: true,
			data: { kpis, primaPorMes, distribucionPorRamo, primaPorCompania, topResponsables },
		};
	} catch (err) {
		console.error("Error in obtenerEstadisticasProduccion:", err);
		return { success: false, error: "Error interno" };
	}
}

// ============================================
// COBRANZAS
// ============================================

export async function obtenerEstadisticasCobranzas(
	filtros: GerenciaFiltros
): Promise<GerenciaResponse<EstadisticasCobranzas>> {
	const { allowed } = await checkPermission("gerencia.ver");
	if (!allowed) return { success: false, error: "Sin permiso" };

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
		const { fechaDesde, fechaHasta, fechaAnioDesde, fechaAnioHasta, esAnual } = calcularRangos(filtros);

		// Query pagos con poliza join para scoping
		let query = supabase
			.from("polizas_pagos")
			.select(`
				id,
				monto,
				fecha_vencimiento,
				fecha_pago,
				estado,
				numero_cuota,
				poliza:polizas!poliza_id (
					id,
					numero_poliza,
					responsable_id,
					moneda,
					client:clients!client_id (
						id,
						client_type,
						natural_clients ( primer_nombre, primer_apellido ),
						juridic_clients ( razon_social )
					)
				)
			`)
			.gte("fecha_vencimiento", fechaAnioDesde)
			.lte("fecha_vencimiento", fechaAnioHasta);

		if (scope.needsScoping) {
			query = query.in("poliza.responsable_id", scope.teamMemberIds);
		}
		if (filtros.regional_id) {
			query = query.eq("poliza.regional_id", filtros.regional_id);
		}
		if (filtros.compania_id) {
			query = query.eq("poliza.compania_aseguradora_id", filtros.compania_id);
		}
		if (filtros.equipo_id) {
			const { data: members } = await supabase
				.from("equipo_miembros")
				.select("user_id")
				.eq("equipo_id", filtros.equipo_id);
			if (members && members.length > 0) {
				query = query.in("poliza.responsable_id", members.map((m) => m.user_id));
			}
		}

		const { data: pagos, error } = await query;
		if (error) {
			console.error("Error fetching pagos for stats:", error);
			return { success: false, error: "Error al obtener estadísticas de cobranzas" };
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rows = (pagos || []).filter((p: any) => p.poliza !== null) as Array<any>;

		// Período seleccionado: si anual usa todas, sino filtra por mes
		const cuotasPeriodo = esAnual
			? rows
			: rows.filter(
				(p) => p.fecha_vencimiento >= fechaDesde && p.fecha_vencimiento <= fechaHasta
			);

		const pendientes = cuotasPeriodo.filter((p) => p.estado === "pendiente");
		const vencidas = cuotasPeriodo.filter((p) => p.estado === "vencido");
		const pagadas = cuotasPeriodo.filter((p) => p.estado === "pagado");

		const montoPendiente = pendientes.reduce((s, p) => s + Number(p.monto || 0), 0);
		const montoVencido = vencidas.reduce((s, p) => s + Number(p.monto || 0), 0);
		const montoCobrado = pagadas.reduce((s, p) => s + Number(p.monto || 0), 0);
		const totalRelevante = montoCobrado + montoPendiente + montoVencido;

		const kpis: EstadisticasCobranzas["kpis"] = {
			cuotas_pendientes: pendientes.length,
			monto_pendiente: montoPendiente,
			cuotas_vencidas: vencidas.length,
			monto_vencido: montoVencido,
			monto_cobrado_mes: montoCobrado,
			tasa_cobranza: totalRelevante > 0 ? (montoCobrado / totalRelevante) * 100 : 0,
		};

		// Cobrado vs Pendiente por mes (año completo)
		const cobradoMap = new Map<number, number>();
		const pendienteMap = new Map<number, number>();
		for (let m = 1; m <= 12; m++) {
			cobradoMap.set(m, 0);
			pendienteMap.set(m, 0);
		}
		for (const p of rows) {
			const mes = new Date(p.fecha_vencimiento).getMonth() + 1;
			if (p.estado === "pagado") {
				cobradoMap.set(mes, (cobradoMap.get(mes) || 0) + Number(p.monto || 0));
			} else {
				pendienteMap.set(mes, (pendienteMap.get(mes) || 0) + Number(p.monto || 0));
			}
		}
		const cobradoVsPendiente: CobradoVsPendientePorMes[] = Array.from(
			{ length: 12 },
			(_, i) => ({
				mes: i + 1,
				label: MESES_LABELS[i],
				cobrado: cobradoMap.get(i + 1) || 0,
				pendiente: pendienteMap.get(i + 1) || 0,
			})
		);

		// Distribución estados de pago (período seleccionado)
		const estadoMap = new Map<string, { cantidad: number; monto: number }>();
		for (const p of cuotasPeriodo) {
			const estado = (p.estado as string) || "desconocido";
			const existing = estadoMap.get(estado) || { cantidad: 0, monto: 0 };
			existing.cantidad += 1;
			existing.monto += Number(p.monto || 0);
			estadoMap.set(estado, existing);
		}
		const distribucionEstados: DistribucionEstadosPago[] = Array.from(estadoMap.entries())
			.map(([estado, data]) => ({ estado, ...data }));

		// Próximas cuotas por vencer (30 días desde hoy)
		const hoy = new Date().toISOString().split("T")[0];
		const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

		const proximasCuotas: ProximaCuotaPorVencer[] = rows
			.filter(
				(p) =>
					p.estado === "pendiente" &&
					p.fecha_vencimiento >= hoy &&
					p.fecha_vencimiento <= en30Dias
			)
			.sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
			.slice(0, 20)
			.map((p) => {
				const poliza = p.poliza;
				let cliente = "N/A";
				if (poliza?.client) {
					const c = poliza.client;
					if (c.client_type === "natural" && c.natural_clients) {
						cliente = `${c.natural_clients.primer_nombre || ""} ${c.natural_clients.primer_apellido || ""}`.trim();
					} else if (c.juridic_clients) {
						cliente = c.juridic_clients.razon_social || "N/A";
					}
				}
				return {
					numero_poliza: poliza?.numero_poliza || "N/A",
					cliente,
					monto: Number(p.monto || 0),
					fecha_vencimiento: p.fecha_vencimiento,
					moneda: poliza?.moneda || "Bs",
				};
			});

		return {
			success: true,
			data: { kpis, cobradoVsPendiente, distribucionEstados, proximasCuotas },
		};
	} catch (err) {
		console.error("Error in obtenerEstadisticasCobranzas:", err);
		return { success: false, error: "Error interno" };
	}
}

// ============================================
// SINIESTROS
// ============================================

export async function obtenerEstadisticasSiniestros(
	filtros: GerenciaFiltros
): Promise<GerenciaResponse<EstadisticasSiniestros>> {
	const { allowed } = await checkPermission("gerencia.ver");
	if (!allowed) return { success: false, error: "Sin permiso" };

	const supabase = await createClient();
	const scope = await getDataScopeFilter("siniestros");

	try {
		const { fechaDesde, fechaHasta, fechaAnioDesde, fechaAnioHasta, esAnual } = calcularRangos(filtros);

		// Query siniestros del año con poliza join
		let query = supabase
			.from("siniestros")
			.select(`
				id,
				codigo_siniestro,
				fecha_siniestro,
				fecha_cierre,
				estado,
				monto_reserva,
				moneda,
				responsable_id,
				created_at,
				poliza:polizas!poliza_id (
					ramo,
					numero_poliza,
					client:clients!client_id (
						id,
						client_type,
						natural_clients ( primer_nombre, primer_apellido ),
						juridic_clients ( razon_social )
					)
				)
			`)
			.gte("fecha_siniestro", fechaAnioDesde)
			.lte("fecha_siniestro", fechaAnioHasta);

		if (scope.needsScoping) {
			query = query.in("responsable_id", scope.teamMemberIds);
		}

		const { data: siniestros, error } = await query;
		if (error) {
			console.error("Error fetching siniestros for stats:", error);
			return { success: false, error: "Error al obtener estadísticas de siniestros" };
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rows = (siniestros || []) as Array<any>;

		// KPIs
		const abiertos = rows.filter((s) => s.estado === "abierto");
		const cerradosPeriodo = esAnual
			? rows.filter((s) => s.fecha_cierre)
			: rows.filter(
				(s) =>
					s.fecha_cierre &&
					s.fecha_cierre >= fechaDesde &&
					s.fecha_cierre <= fechaHasta
			);

		let promedioDias: number | null = null;
		if (cerradosPeriodo.length > 0) {
			const totalDias = cerradosPeriodo.reduce((sum, s) => {
				const inicio = new Date(s.fecha_siniestro).getTime();
				const cierre = new Date(s.fecha_cierre).getTime();
				return sum + (cierre - inicio) / (1000 * 60 * 60 * 24);
			}, 0);
			promedioDias = Math.round(totalDias / cerradosPeriodo.length);
		}

		const kpis: EstadisticasSiniestros["kpis"] = {
			siniestros_abiertos: abiertos.length,
			cerrados_mes: cerradosPeriodo.length,
			monto_reservado: abiertos.reduce((s, r) => s + Number(r.monto_reserva || 0), 0),
			promedio_dias_resolucion: promedioDias,
		};

		// Siniestros por mes
		const abiertosMesMap = new Map<number, number>();
		const cerradosMesMap = new Map<number, number>();
		for (let m = 1; m <= 12; m++) {
			abiertosMesMap.set(m, 0);
			cerradosMesMap.set(m, 0);
		}
		for (const s of rows) {
			const mesS = new Date(s.fecha_siniestro).getMonth() + 1;
			abiertosMesMap.set(mesS, (abiertosMesMap.get(mesS) || 0) + 1);
			if (s.fecha_cierre) {
				const mesC = new Date(s.fecha_cierre).getMonth() + 1;
				cerradosMesMap.set(mesC, (cerradosMesMap.get(mesC) || 0) + 1);
			}
		}
		const siniestrosPorMes: SiniestrosPorMes[] = Array.from(
			{ length: 12 },
			(_, i) => ({
				mes: i + 1,
				label: MESES_LABELS[i],
				abiertos: abiertosMesMap.get(i + 1) || 0,
				cerrados: cerradosMesMap.get(i + 1) || 0,
			})
		);

		// Por ramo (período seleccionado)
		const siniestrosPeriodo = esAnual
			? rows
			: rows.filter((s) => {
				const d = s.fecha_siniestro as string;
				return d >= fechaDesde && d <= fechaHasta;
			});

		const ramoMap = new Map<string, number>();
		for (const s of siniestrosPeriodo) {
			const ramo = s.poliza?.ramo || "Sin ramo";
			ramoMap.set(ramo, (ramoMap.get(ramo) || 0) + 1);
		}
		const siniestrosPorRamo: SiniestrosPorRamo[] = Array.from(ramoMap.entries())
			.map(([ramo, cantidad]) => ({ ramo, cantidad }))
			.sort((a, b) => b.cantidad - a.cantidad);

		// Siniestros abiertos más antiguos
		const hoy = new Date();
		const siniestrosAbiertos: SiniestroAbierto[] = abiertos
			.sort((a, b) => a.fecha_siniestro.localeCompare(b.fecha_siniestro))
			.slice(0, 10)
			.map((s) => {
				const poliza = s.poliza;
				let cliente = "N/A";
				if (poliza?.client) {
					const c = poliza.client;
					if (c.client_type === "natural" && c.natural_clients) {
						cliente = `${c.natural_clients.primer_nombre || ""} ${c.natural_clients.primer_apellido || ""}`.trim();
					} else if (c.juridic_clients) {
						cliente = c.juridic_clients.razon_social || "N/A";
					}
				}
				const diasAbierto = Math.round(
					(hoy.getTime() - new Date(s.fecha_siniestro).getTime()) / (1000 * 60 * 60 * 24)
				);
				return {
					codigo_siniestro: s.codigo_siniestro || "N/A",
					cliente,
					ramo: poliza?.ramo || "N/A",
					fecha_siniestro: s.fecha_siniestro,
					dias_abierto: diasAbierto,
					monto_reserva: Number(s.monto_reserva || 0),
					moneda: s.moneda || "Bs",
				};
			});

		return {
			success: true,
			data: { kpis, siniestrosPorMes, siniestrosPorRamo, siniestrosAbiertos },
		};
	} catch (err) {
		console.error("Error in obtenerEstadisticasSiniestros:", err);
		return { success: false, error: "Error interno" };
	}
}

// ============================================
// FILTROS
// ============================================

export async function obtenerFiltrosGerencia(): Promise<GerenciaResponse<FiltrosData>> {
	const { allowed } = await checkPermission("gerencia.ver");
	if (!allowed) return { success: false, error: "Sin permiso" };

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	const [regionalesRes, companiasRes] = await Promise.all([
		supabase.from("regionales").select("id, nombre").eq("activo", true).order("nombre"),
		supabase.from("companias_aseguradoras").select("id, nombre").eq("activo", true).order("nombre"),
	]);

	// Equipos: si el usuario necesita scoping, solo mostrar sus equipos
	let equipos: { id: string; nombre: string }[] = [];
	if (scope.needsScoping) {
		// Obtener equipos donde el usuario es miembro
		const { data: miembros } = await supabase
			.from("equipo_miembros")
			.select("equipo:equipos!equipo_id (id, nombre)")
			.eq("user_id", scope.userId);

		if (miembros) {
			equipos = miembros
				.map((m) => m.equipo as unknown as { id: string; nombre: string })
				.filter(Boolean)
				.sort((a, b) => a.nombre.localeCompare(b.nombre));
		}
	} else {
		const { data } = await supabase.from("equipos").select("id, nombre").order("nombre");
		equipos = data || [];
	}

	return {
		success: true,
		data: {
			regionales: regionalesRes.data || [],
			companias: companiasRes.data || [],
			equipos,
		},
	};
}
