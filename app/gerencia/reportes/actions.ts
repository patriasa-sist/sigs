"use server";

import { createClient } from "@/utils/supabase/server";
import { checkPermission, getDataScopeFilter } from "@/utils/auth/helpers";
import type {
	ExportProduccionFilters,
	ExportProduccionRow,
	ExportProduccionNuevoRow,
	TipoPolizaReporte,
	ProduccionServerResponse,
} from "@/types/reporte";

/**
 * Verifica que el usuario tenga permiso gerencia.exportar
 */
async function verificarPermisoExportar(): Promise<
	| { authorized: true; userId: string }
	| { authorized: false; error: string }
> {
	const { allowed, profile } = await checkPermission("gerencia.exportar");

	if (!allowed || !profile) {
		return { authorized: false, error: "No tiene permisos para exportar reportes" };
	}

	return { authorized: true, userId: profile.id };
}

// Tipos auxiliares para los datos de cliente
type NaturalClientData = {
	primer_nombre: string | null;
	segundo_nombre: string | null;
	primer_apellido: string | null;
	segundo_apellido: string | null;
	numero_documento: string | null;
};

type JuridicClientData = {
	razon_social: string | null;
	nit: string | null;
};

type ClientQueryResult = {
	id: string;
	client_type: "natural" | "juridica";
	natural_clients: NaturalClientData | null;
	juridic_clients: JuridicClientData | null;
};

/**
 * Exporta el reporte consolidado de producción mensual
 * Incluye campos financieros calculados: prima neta, comisión, etc.
 * Aplica data scoping: comercial/agente solo ven datos de su equipo.
 */
export async function exportarProduccion(
	filtros: ExportProduccionFilters
): Promise<ProduccionServerResponse<ExportProduccionRow[]>> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
		// Calcular rango de fechas para el mes seleccionado
		const primerDiaMes = new Date(filtros.anio, filtros.mes - 1, 1);
		const ultimoDiaMes = new Date(filtros.anio, filtros.mes, 0);
		const fechaDesde = primerDiaMes.toISOString().split("T")[0];
		const fechaHasta = ultimoDiaMes.toISOString().split("T")[0];

		// Consulta principal con todos los JOINs necesarios
		let query = supabase.from("polizas_pagos").select(`
			*,
			poliza:polizas!poliza_id (
				numero_poliza,
				ramo,
				moneda,
				prima_total,
				prima_neta,
				comision,
				comision_empresa,
				modalidad_pago,
				usar_factores_contado,
				inicio_vigencia,
				fin_vigencia,
				responsable_id,
				producto_id,
				producto:productos_aseguradoras!producto_id (
					factor_contado,
					factor_credito,
					porcentaje_comision
				),
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

		// Filtrar por inicio de vigencia dentro del mes seleccionado
		query = query.gte("poliza.inicio_vigencia", fechaDesde);
		query = query.lte("poliza.inicio_vigencia", fechaHasta);

		// Data scoping: comercial/agente solo ven datos de su equipo
		if (scope.needsScoping) {
			query = query.in("poliza.responsable_id", scope.teamMemberIds);
		}

		// Filtrar por estado de póliza si se especifica
		if (filtros.estado_poliza && filtros.estado_poliza !== "all") {
			query = query.eq("poliza.estado", filtros.estado_poliza);
		}

		// Filtrar por regional si se especifica
		if (filtros.regional_id) {
			query = query.eq("poliza.regional_id", filtros.regional_id);
		}

		// Filtrar por compañía si se especifica
		if (filtros.compania_id) {
			query = query.eq("poliza.compania_aseguradora_id", filtros.compania_id);
		}

		// Filtrar por equipo si se especifica
		if (filtros.equipo_id) {
			const { data: teamMemberIds } = await supabase
				.from("equipo_miembros")
				.select("user_id")
				.eq("equipo_id", filtros.equipo_id);

			if (teamMemberIds && teamMemberIds.length > 0) {
				const memberIds = teamMemberIds.map((m) => m.user_id);
				query = query.in("poliza.responsable_id", memberIds);
			}
		}

		const { data: pagos, error } = await query
			.order("poliza_id", { ascending: true })
			.order("numero_cuota", { ascending: true });

		if (error) {
			console.error("Error fetching data for production report:", error);
			return { success: false, error: "Error al obtener datos para el reporte" };
		}

		// Transformar los datos con los cálculos financieros
		const exportRows: ExportProduccionRow[] = (pagos || [])
			.filter((pago) => pago.poliza !== null) // Filtrar pagos sin póliza
			.map(
				(pago: {
					id: string;
					numero_cuota: number;
					monto: number;
					fecha_vencimiento: string;
					estado: string;
					poliza: {
						numero_poliza: string;
						ramo: string;
						moneda: string;
						prima_total: number;
						prima_neta: number | null;
						comision: number | null;
						comision_empresa: number | null;
						modalidad_pago: "contado" | "credito";
						usar_factores_contado?: boolean;
						inicio_vigencia: string;
						fin_vigencia: string;
						responsable_id: string;
						producto_id: string | null;
						producto?: {
							factor_contado: number;
							factor_credito: number;
							porcentaje_comision: number;
						} | null;
						client: ClientQueryResult | null;
						compania?: { nombre?: string } | null;
						responsable?: { full_name?: string } | null;
						regional?: { nombre?: string } | null;
					};
				}) => {
					const poliza = pago.poliza;
					const clientData = poliza?.client;
					const producto = poliza?.producto;

					// Extraer nombre del cliente
					let cliente = "N/A";
					let ciNit = "N/A";

					if (clientData) {
						if (clientData.client_type === "natural") {
							const natural = clientData.natural_clients;
							if (natural) {
								cliente = `${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${natural.primer_apellido || ""} ${natural.segundo_apellido || ""}`.trim();
								ciNit = natural.numero_documento || "N/A";
							}
						} else {
							const juridic = clientData.juridic_clients;
							if (juridic) {
								cliente = juridic.razon_social || "N/A";
								ciNit = juridic.nit || "N/A";
							}
						}
					}

					// Datos financieros: leer de la DB (no recalcular)
					const primaNeta = poliza.prima_neta != null ? Number(poliza.prima_neta) : null;
					const comisionEmpresa = poliza.comision_empresa != null
						? Number(poliza.comision_empresa)
						: poliza.comision != null ? Number(poliza.comision) : null;

					// Factor y porcentaje de comisión: referencia del producto
					let factorPrimaNeta: number | null = null;
					let porcentajeComision: number | null = null;
					if (producto) {
						const usarContado = poliza.modalidad_pago === "contado" || poliza.usar_factores_contado === true;
						factorPrimaNeta = Number(usarContado ? producto.factor_contado : producto.factor_credito);
						porcentajeComision = Number(producto.porcentaje_comision) * 100;
					}

					// Valores por cuota: proporcionar desde los totales de la DB
					let montoCuotaPN: number | null = null;
					let montoCuotaComision: number | null = null;
					const primaTotalNum = Number(poliza.prima_total);
					if (primaNeta != null && primaTotalNum > 0) {
						const ratio = primaNeta / primaTotalNum;
						montoCuotaPN = Number(pago.monto) * ratio;
						if (comisionEmpresa != null) {
							const ratioComision = comisionEmpresa / primaTotalNum;
							montoCuotaComision = Number(pago.monto) * ratioComision;
						}
					}

					return {
						numero_poliza: poliza?.numero_poliza || "N/A",
						cliente,
						ci_nit: ciNit,
						compania: poliza?.compania?.nombre || "N/A",
						ramo: poliza?.ramo || "N/A",
						responsable: poliza?.responsable?.full_name || "N/A",
						regional: poliza?.regional?.nombre || "N/A",
						prima_total: Number(poliza?.prima_total) || 0,
						prima_neta: primaNeta,
						comision_empresa: comisionEmpresa,
						factor_prima_neta: factorPrimaNeta,
						porcentaje_comision: porcentajeComision,
						inicio_vigencia: poliza?.inicio_vigencia || "",
						fin_vigencia: poliza?.fin_vigencia || "",
						numero_cuota: pago.numero_cuota,
						monto_cuota_pt: Number(pago.monto),
						monto_cuota_pn: montoCuotaPN,
						monto_cuota_comision: montoCuotaComision,
						moneda: poliza?.moneda || "Bs",
						fecha_vencimiento: pago.fecha_vencimiento,
						estado_cuota: pago.estado,
						modalidad_pago: poliza?.modalidad_pago || "N/A",
					};
				}
			);

		// Ordenar por número de póliza y luego por número de cuota
		exportRows.sort((a, b) => {
			const polizaCompare = a.numero_poliza.localeCompare(b.numero_poliza);
			if (polizaCompare !== 0) return polizaCompare;
			return a.numero_cuota - b.numero_cuota;
		});

		return { success: true, data: exportRows };
	} catch (error) {
		console.error("Error exporting production report:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtiene la lista de equipos para el filtro de reportes.
 * Agentes/comerciales solo ven los equipos a los que pertenecen.
 */
export async function obtenerEquiposParaFiltro(): Promise<
	ProduccionServerResponse<{ id: string; nombre: string }[]>
> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	if (scope.needsScoping) {
		// Solo mostrar equipos donde el usuario es miembro
		const { data: miembros, error } = await supabase
			.from("equipo_miembros")
			.select("equipo:equipos!equipo_id (id, nombre)")
			.eq("user_id", scope.userId);

		if (error) {
			return { success: false, error: "Error al obtener equipos" };
		}

		const equipos = (miembros || [])
			.map((m) => m.equipo as unknown as { id: string; nombre: string })
			.filter(Boolean)
			.sort((a, b) => a.nombre.localeCompare(b.nombre));

		return { success: true, data: equipos };
	}

	const { data, error } = await supabase
		.from("equipos")
		.select("id, nombre")
		.order("nombre");

	if (error) {
		return { success: false, error: "Error al obtener equipos" };
	}

	return { success: true, data: data || [] };
}

/**
 * Obtiene la lista de regionales para el filtro
 */
export async function obtenerRegionales(): Promise<
	ProduccionServerResponse<{ id: string; nombre: string }[]>
> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	const { data, error } = await supabase
		.from("regionales")
		.select("id, nombre")
		.eq("activo", true)
		.order("nombre");

	if (error) {
		return { success: false, error: "Error al obtener regionales" };
	}

	return { success: true, data: data || [] };
}

/**
 * Obtiene la lista de compañías aseguradoras para el filtro
 */
export async function obtenerCompanias(): Promise<
	ProduccionServerResponse<{ id: string; nombre: string }[]>
> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	const { data, error } = await supabase
		.from("companias_aseguradoras")
		.select("id, nombre")
		.eq("activo", true)
		.order("nombre");

	if (error) {
		return { success: false, error: "Error al obtener compañías" };
	}

	return { success: true, data: data || [] };
}

// ============================================
// REPORTE DE PRODUCCIÓN (nuevo - una fila por póliza/anexo)
// ============================================

// Mapeo de ramos a sus tablas de valor asegurado
const RAMO_VALOR_ASEGURADO_MAP: Record<
	string,
	{ table: string; sumColumn: string } | null
> = {
	Automotores: {
		table: "polizas_automotor_vehiculos",
		sumColumn: "valor_asegurado",
	},
	"Ramos técnicos": {
		table: "polizas_ramos_tecnicos_equipos",
		sumColumn: "valor_asegurado",
	},
	"Responsabilidad civil": {
		table: "polizas_responsabilidad_civil",
		sumColumn: "valor_asegurado",
	},
	Transportes: { table: "polizas_transporte", sumColumn: "valor_asegurado" },
	"Incendio y aliados": {
		table: "polizas_incendio_bienes",
		sumColumn: "valor_total_declarado",
	},
	"Riesgos varios misceláneos": {
		table: "polizas_riesgos_varios_bienes",
		sumColumn: "valor_total_declarado",
	},
	Aeronavegación: {
		table: "polizas_aeronavegacion_naves",
		sumColumn: "valor_casco",
	},
};

/**
 * Obtiene el valor asegurado para un conjunto de pólizas, agrupado por poliza_id
 */
async function obtenerValoresAsegurados(
	supabase: Awaited<ReturnType<typeof createClient>>,
	polizaIds: string[],
	ramos: Set<string>
): Promise<Map<string, number>> {
	const valorMap = new Map<string, number>();
	if (polizaIds.length === 0) return valorMap;

	// Determinar qué tablas necesitamos consultar
	const tablesToQuery = new Set<{ table: string; sumColumn: string }>();
	for (const ramo of ramos) {
		const mapping = RAMO_VALOR_ASEGURADO_MAP[ramo];
		if (mapping) tablesToQuery.add(mapping);
	}

	// Consultar cada tabla en paralelo
	const queries = Array.from(tablesToQuery).map(async ({ table, sumColumn }) => {
		const { data } = await supabase
			.from(table)
			.select("*")
			.in("poliza_id", polizaIds);

		if (data) {
			for (const row of data) {
				const pid = (row as Record<string, unknown>).poliza_id as string;
				const val = Number((row as Record<string, unknown>)[sumColumn] ?? 0);
				valorMap.set(pid, (valorMap.get(pid) || 0) + val);
			}
		}
	});

	await Promise.all(queries);
	return valorMap;
}

/**
 * Extrae nombre y CI/NIT de un cliente
 */
function extraerDatosCliente(clientData: ClientQueryResult | null): {
	cliente: string;
	ciNit: string;
} {
	if (!clientData) return { cliente: "N/A", ciNit: "N/A" };

	if (clientData.client_type === "natural") {
		const n = clientData.natural_clients;
		if (!n) return { cliente: "N/A", ciNit: "N/A" };
		return {
			cliente:
				`${n.primer_nombre || ""} ${n.segundo_nombre || ""} ${n.primer_apellido || ""} ${n.segundo_apellido || ""}`.trim() ||
				"N/A",
			ciNit: n.numero_documento || "N/A",
		};
	}

	const j = clientData.juridic_clients;
	if (!j) return { cliente: "N/A", ciNit: "N/A" };
	return {
		cliente: j.razon_social || "N/A",
		ciNit: j.nit || "N/A",
	};
}

/**
 * Exporta el reporte de producción (una fila por póliza + anexos validados)
 * Aplica data scoping: comercial/agente solo ven datos de su equipo.
 */
export async function exportarProduccionNuevo(
	filtros: ExportProduccionFilters
): Promise<ProduccionServerResponse<ExportProduccionNuevoRow[]>> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
		const primerDiaMes = new Date(filtros.anio, filtros.mes - 1, 1);
		const ultimoDiaMes = new Date(filtros.anio, filtros.mes, 0);
		const fechaDesde = primerDiaMes.toISOString().split("T")[0];
		const fechaHasta = ultimoDiaMes.toISOString().split("T")[0];

		// Resolver miembros de equipo si se filtra por equipo
		let memberIds: string[] | null = null;
		if (filtros.equipo_id) {
			const { data: teamMemberIds } = await supabase
				.from("equipo_miembros")
				.select("user_id")
				.eq("equipo_id", filtros.equipo_id);

			if (teamMemberIds && teamMemberIds.length > 0) {
				memberIds = teamMemberIds.map((m) => m.user_id);
			}
		}

		// ---- CONSULTA 1: Pólizas ----
		let polizaQuery = supabase.from("polizas").select(`
			id,
			numero_poliza,
			ramo,
			moneda,
			prima_total,
			prima_neta,
			comision,
			comision_empresa,
			modalidad_pago,
			usar_factores_contado,
			inicio_vigencia,
			fin_vigencia,
			fecha_emision_compania,
			created_at,
			es_renovacion,
			responsable_id,
			producto_id,
			producto:productos_aseguradoras!producto_id (
				factor_contado,
				factor_credito,
				porcentaje_comision
			),
			client:clients!client_id (
				id,
				client_type,
				director_cartera:directores_cartera!director_cartera_id (
					nombre,
					apellidos
				),
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
				nombre,
				codigo
			),
			responsable:profiles!responsable_id (
				full_name
			),
			regional:regionales!regional_id (
				nombre
			)
		`);

		polizaQuery = polizaQuery.gte("inicio_vigencia", fechaDesde);
		polizaQuery = polizaQuery.lte("inicio_vigencia", fechaHasta);

		// Data scoping: comercial/agente solo ven datos de su equipo
		if (scope.needsScoping) {
			polizaQuery = polizaQuery.in("responsable_id", scope.teamMemberIds);
		}

		if (filtros.estado_poliza && filtros.estado_poliza !== "all") {
			polizaQuery = polizaQuery.eq("estado", filtros.estado_poliza);
		}
		if (filtros.regional_id) {
			polizaQuery = polizaQuery.eq("regional_id", filtros.regional_id);
		}
		if (filtros.compania_id) {
			polizaQuery = polizaQuery.eq(
				"compania_aseguradora_id",
				filtros.compania_id
			);
		}
		if (memberIds) {
			polizaQuery = polizaQuery.in("responsable_id", memberIds);
		}

		// ---- CONSULTA 2: Anexos validados ----
		let anexoQuery = supabase.from("polizas_anexos").select(`
			id,
			poliza_id,
			numero_anexo,
			tipo_anexo,
			fecha_anexo,
			created_at,
			poliza:polizas!poliza_id (
				id,
				numero_poliza,
				ramo,
				moneda,
				prima_total,
				prima_neta,
				comision,
				comision_empresa,
				modalidad_pago,
				usar_factores_contado,
				inicio_vigencia,
				fin_vigencia,
				fecha_emision_compania,
				responsable_id,
				producto_id,
				producto:productos_aseguradoras!producto_id (
					factor_contado,
					factor_credito,
					porcentaje_comision
				),
				client:clients!client_id (
					id,
					client_type,
					director_cartera:directores_cartera!director_cartera_id (
						nombre,
						apellidos
					),
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
					nombre,
					codigo
				),
				responsable:profiles!responsable_id (
					full_name
				),
				regional:regionales!regional_id (
					nombre
				)
			)
		`);

		anexoQuery = anexoQuery.eq("estado", "activa");
		anexoQuery = anexoQuery.gte("fecha_anexo", fechaDesde);
		anexoQuery = anexoQuery.lte("fecha_anexo", fechaHasta);

		// Data scoping for anexos
		if (scope.needsScoping) {
			anexoQuery = anexoQuery.in("poliza.responsable_id", scope.teamMemberIds);
		}

		if (filtros.regional_id) {
			anexoQuery = anexoQuery.eq("poliza.regional_id", filtros.regional_id);
		}
		if (filtros.compania_id) {
			anexoQuery = anexoQuery.eq(
				"poliza.compania_aseguradora_id",
				filtros.compania_id
			);
		}
		if (memberIds) {
			anexoQuery = anexoQuery.in("poliza.responsable_id", memberIds);
		}

		// Ejecutar ambas consultas en paralelo
		const [polizasRes, anexosRes] = await Promise.all([
			polizaQuery.order("numero_poliza", { ascending: true }),
			anexoQuery.order("fecha_anexo", { ascending: true }),
		]);

		if (polizasRes.error) {
			console.error("Error fetching polizas for production report:", polizasRes.error);
			return { success: false, error: "Error al obtener pólizas para el reporte" };
		}
		if (anexosRes.error) {
			console.error("Error fetching anexos for production report:", anexosRes.error);
			return { success: false, error: "Error al obtener anexos para el reporte" };
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const polizas = (polizasRes.data || []) as Array<any>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const anexos = (anexosRes.data || []) as Array<any>;

		// Obtener valores asegurados para las pólizas
		const polizaIds = polizas.map((p: { id: string }) => p.id);
		const ramosSet = new Set(polizas.map((p: { ramo: string }) => p.ramo));
		const valorAseguradoMap = await obtenerValoresAsegurados(
			supabase,
			polizaIds,
			ramosSet
		);

		// Helper para extraer campos financieros desde la DB (sin recalcular)
		function extraerFinancieros(
			polizaData: {
				prima_neta: number | null;
				comision: number | null;
				comision_empresa: number | null;
				modalidad_pago: "contado" | "credito";
				usar_factores_contado?: boolean;
			},
			producto?: {
				factor_contado: number;
				factor_credito: number;
				porcentaje_comision: number;
			} | null
		) {
			// Prima neta y comisión: directamente de la DB
			const primaNeta = polizaData.prima_neta != null ? Number(polizaData.prima_neta) : null;
			const comisionEmpresa = polizaData.comision_empresa != null
				? Number(polizaData.comision_empresa)
				: polizaData.comision != null ? Number(polizaData.comision) : null;

			// Factor y porcentaje: referencia del producto
			let factorPrimaNeta: number | null = null;
			let porcentajeComision: number | null = null;
			if (producto) {
				const usarContado = polizaData.modalidad_pago === "contado" || polizaData.usar_factores_contado === true;
				factorPrimaNeta = Number(usarContado ? producto.factor_contado : producto.factor_credito);
				porcentajeComision = Number(producto.porcentaje_comision) * 100;
			}

			return {
				prima_neta: primaNeta,
				comision_empresa: comisionEmpresa,
				factor_prima_neta: factorPrimaNeta,
				porcentaje_comision: porcentajeComision,
			};
		}

		// Construir filas de pólizas
		const rows: ExportProduccionNuevoRow[] = polizas.map(
			(p: {
				id: string;
				numero_poliza: string;
				ramo: string;
				moneda: string;
				prima_total: number;
				prima_neta: number | null;
				comision: number | null;
				comision_empresa: number | null;
				modalidad_pago: "contado" | "credito";
				usar_factores_contado?: boolean;
				inicio_vigencia: string;
				fin_vigencia: string;
				fecha_emision_compania: string;
				created_at: string;
				es_renovacion: boolean;
				producto?: {
					factor_contado: number;
					factor_credito: number;
					porcentaje_comision: number;
				} | null;
				client:
					| (ClientQueryResult & {
							director_cartera?: {
								nombre: string;
								apellidos: string;
							} | null;
					  })
					| null;
				compania?: { nombre?: string; codigo?: number } | null;
				responsable?: { full_name?: string } | null;
				regional?: { nombre?: string } | null;
			}) => {
				const { cliente, ciNit } = extraerDatosCliente(
					p.client as ClientQueryResult | null
				);
				const dc = p.client?.director_cartera;
				const financieros = extraerFinancieros(p, p.producto);

				const valorAseg = valorAseguradoMap.get(p.id) ?? null;
				const ramoTieneTabla = p.ramo in RAMO_VALOR_ASEGURADO_MAP;

				return {
					numero_poliza: p.numero_poliza,
					numero_anexo: null,
					tipo_poliza: (p.es_renovacion
						? "Renovada"
						: "Nueva") as TipoPolizaReporte,
					cliente,
					ci_nit: ciNit,
					director_cartera: dc
						? `${dc.nombre} ${dc.apellidos}`.trim()
						: "N/A",
					compania: p.compania?.nombre || "N/A",
					cod_aps: p.compania?.codigo ?? null,
					ramo: p.ramo,
					responsable: p.responsable?.full_name || "N/A",
					regional: p.regional?.nombre || "N/A",
					prima_total: Number(p.prima_total),
					...financieros,
					moneda: p.moneda || "Bs",
					valor_asegurado: ramoTieneTabla
						? valorAseg
						: Number(p.prima_total),
					inicio_vigencia: p.inicio_vigencia || "",
					fin_vigencia: p.fin_vigencia || "",
					fecha_emision_compania: p.fecha_emision_compania || "",
					fecha_produccion_sistema: p.created_at || "",
				};
			}
		);

		// Construir filas de anexos
		const tipoAnexoMap: Record<string, TipoPolizaReporte> = {
			exclusion: "Exclusión",
			inclusion: "Inclusión",
			anulacion: "Anulación",
		};

		for (const anexo of anexos) {
			const pol = anexo.poliza;
			if (!pol) continue;

			const { cliente, ciNit } = extraerDatosCliente(
				pol.client as ClientQueryResult | null
			);
			const dc = pol.client?.director_cartera;
			const financieros = extraerFinancieros(pol, pol.producto);

			const valorAseg = valorAseguradoMap.get(pol.id) ?? null;
			const ramoTieneTabla = pol.ramo in RAMO_VALOR_ASEGURADO_MAP;

			rows.push({
				numero_poliza: pol.numero_poliza,
				numero_anexo: anexo.numero_anexo,
				tipo_poliza: tipoAnexoMap[anexo.tipo_anexo] || anexo.tipo_anexo,
				cliente,
				ci_nit: ciNit,
				director_cartera: dc
					? `${dc.nombre} ${dc.apellidos}`.trim()
					: "N/A",
				compania: pol.compania?.nombre || "N/A",
				cod_aps: pol.compania?.codigo ?? null,
				ramo: pol.ramo,
				responsable: pol.responsable?.full_name || "N/A",
				regional: pol.regional?.nombre || "N/A",
				prima_total: Number(pol.prima_total),
				...financieros,
				moneda: pol.moneda || "Bs",
				valor_asegurado: ramoTieneTabla
					? valorAseg
					: Number(pol.prima_total),
				inicio_vigencia: pol.inicio_vigencia || "",
				fin_vigencia: pol.fin_vigencia || "",
				fecha_emision_compania: pol.fecha_emision_compania || "",
				fecha_produccion_sistema: anexo.created_at || "",
			});
		}

		// Ordenar por número de póliza
		rows.sort((a, b) => a.numero_poliza.localeCompare(b.numero_poliza));

		return { success: true, data: rows };
	} catch (error) {
		console.error("Error exporting new production report:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
