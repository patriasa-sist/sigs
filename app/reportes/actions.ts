"use server";

import { createClient } from "@/utils/supabase/server";
import { checkPermission, getDataScopeFilter } from "@/utils/auth/helpers";
import { resolverNombresCliente } from "@/utils/polizas/resolverNombresCliente";
import { hoyLaPaz } from "@/utils/formatters";
import type {
	ExportProduccionFilters,
	ExportProduccionRow,
	ExportProduccionNuevoRow,
	ExportProduccionNuevoResponse,
	ExportProduccionContableResponse,
	ExportComisionesDirectorResponse,
	TipoPolizaReporte,
	ProduccionServerResponse,
	ExportComisionesDirectorFilters,
	ExportComisionesDirectorRow,
	ExportVencimientosFilters,
	ExportVencimientosRow,
	ExportVencimientosResponse,
} from "@/types/reporte";

/**
 * Verifica que el usuario tenga permiso gerencia.exportar
 */
async function verificarPermisoExportar(): Promise<
	{ authorized: true; userId: string; email: string } | { authorized: false; error: string }
> {
	const { allowed, profile } = await checkPermission("gerencia.exportar");

	if (!allowed || !profile) {
		return { authorized: false, error: "No tiene permisos para exportar reportes" };
	}

	return { authorized: true, userId: profile.id, email: profile.email || "N/A" };
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
	client_type: "natural" | "juridica" | "unipersonal";
	natural_clients: NaturalClientData | null;
	juridic_clients: JuridicClientData | null;
	unipersonal_clients: JuridicClientData | null;
};

/**
 * Exporta el reporte consolidado de producción mensual
 * Incluye campos financieros calculados: prima neta, comisión, etc.
 * Aplica data scoping: comercial/agente solo ven datos de su equipo.
 */
export async function exportarProduccion(
	filtros: ExportProduccionFilters,
): Promise<ProduccionServerResponse<ExportProduccionContableResponse>> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
		// Usar rango de fechas directo si se proporciona, o calcular desde mes/anio
		let fechaDesde: string;
		let fechaHasta: string;
		if (filtros.fecha_desde && filtros.fecha_hasta) {
			fechaDesde = filtros.fecha_desde;
			fechaHasta = filtros.fecha_hasta;
		} else {
			const anio = filtros.anio ?? new Date().getFullYear();
			const mes = filtros.mes ?? new Date().getMonth() + 1;
			fechaDesde = new Date(anio, mes - 1, 1).toISOString().split("T")[0];
			fechaHasta = new Date(anio, mes, 0).toISOString().split("T")[0];
		}

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
								cliente =
									`${natural.primer_nombre || ""} ${natural.segundo_nombre || ""} ${natural.primer_apellido || ""} ${natural.segundo_apellido || ""}`.trim();
								ciNit = natural.numero_documento || "N/A";
							}
						} else {
							const empresa =
								clientData.client_type === "unipersonal"
									? clientData.unipersonal_clients
									: clientData.juridic_clients;
							if (empresa) {
								cliente = empresa.razon_social || "N/A";
								ciNit = empresa.nit || "N/A";
							}
						}
					}

					// Datos financieros: leer de la DB (no recalcular)
					const primaNeta = poliza.prima_neta != null ? Number(poliza.prima_neta) : null;
					const comisionEmpresa =
						poliza.comision_empresa != null
							? Number(poliza.comision_empresa)
							: poliza.comision != null
								? Number(poliza.comision)
								: null;

					// Factor y porcentaje de comisión: referencia del producto
					let factorPrimaNeta: number | null = null;
					let porcentajeComision: number | null = null;
					if (producto) {
						const usarContado =
							poliza.modalidad_pago === "contado" || poliza.usar_factores_contado === true;
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
				},
			);

		// Ordenar por número de póliza y luego por número de cuota
		exportRows.sort((a, b) => {
			const polizaCompare = a.numero_poliza.localeCompare(b.numero_poliza);
			if (polizaCompare !== 0) return polizaCompare;
			return a.numero_cuota - b.numero_cuota;
		});

		return {
			success: true,
			data: {
				data: exportRows,
				meta: {
					usuario_email: permiso.email,
					fecha_desde: fechaDesde,
					fecha_hasta: fechaHasta,
				},
			},
		};
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
export async function obtenerEquiposParaFiltro(): Promise<ProduccionServerResponse<{ id: string; nombre: string }[]>> {
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

	const { data, error } = await supabase.from("equipos").select("id, nombre").order("nombre");

	if (error) {
		return { success: false, error: "Error al obtener equipos" };
	}

	return { success: true, data: data || [] };
}

/**
 * Obtiene la lista de regionales para el filtro
 */
export async function obtenerRegionales(): Promise<ProduccionServerResponse<{ id: string; nombre: string }[]>> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	const { data, error } = await supabase.from("regionales").select("id, nombre").eq("activo", true).order("nombre");

	if (error) {
		return { success: false, error: "Error al obtener regionales" };
	}

	return { success: true, data: data || [] };
}

/**
 * Obtiene la lista de compañías aseguradoras para el filtro
 */
export async function obtenerCompanias(): Promise<ProduccionServerResponse<{ id: string; nombre: string }[]>> {
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
const RAMO_VALOR_ASEGURADO_MAP: Record<string, { table: string; sumColumn: string } | null> = {
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
	ramos: Set<string>,
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
		const { data } = await supabase.from(table).select("*").in("poliza_id", polizaIds);

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

	const j = clientData.client_type === "unipersonal" ? clientData.unipersonal_clients : clientData.juridic_clients;
	if (!j) return { cliente: "N/A", ciNit: "N/A" };
	return {
		cliente: j.razon_social || "N/A",
		ciNit: j.nit || "N/A",
	};
}

// Supabase corta cada request en 1000 filas. Pagina con .range() hasta traerlas todas.
// Reutilizar el builder es seguro: postgrest-js hace range()->searchParams.set y then()
// relanza el fetch, así que cada await re-ejecuta la consulta con el nuevo rango.
async function fetchAllPaginated(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	query: { range: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }> },
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: any[]; error: any }> {
	const PAGE_SIZE = 1000;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const all: any[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
		if (error) return { data: all, error };
		const batch = data ?? [];
		all.push(...batch);
		if (batch.length < PAGE_SIZE) break;
	}
	return { data: all, error: null };
}

/**
 * Exporta el reporte de producción (una fila por póliza + anexos validados)
 * Aplica data scoping: comercial/agente solo ven datos de su equipo.
 */
export async function exportarProduccionNuevo(
	filtros: ExportProduccionFilters,
): Promise<ProduccionServerResponse<ExportProduccionNuevoResponse>> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
		// Si hay rango de fechas personalizado, usarlo; sino calcular desde mes/año
		let fechaDesde: string;
		let fechaHasta: string;
		if (filtros.fecha_desde && filtros.fecha_hasta) {
			fechaDesde = filtros.fecha_desde;
			fechaHasta = filtros.fecha_hasta;
		} else {
			const anio = filtros.anio ?? new Date().getFullYear();
			const mes = filtros.mes ?? new Date().getMonth() + 1;
			fechaDesde = new Date(anio, mes - 1, 1).toISOString().split("T")[0];
			fechaHasta = new Date(anio, mes, 0).toISOString().split("T")[0];
		}

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
			estado,
			fecha_validacion,
			es_renovacion,
			responsable_id,
			producto_id,
			producto:productos_aseguradoras!producto_id (
				factor_contado,
				factor_credito,
				porcentaje_comision,
				nombre_producto,
				codigo_producto,
				tipo_seguro:tipos_seguros!tipo_seguro_id (
					codigo
				)
			),
			created_by_profile:profiles!created_by (
				full_name
			),
			categoria:categorias!categoria_id (
				nombre
			),
			director_cartera:directores_cartera!director_cartera_id (
				nombre,
				apellidos
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

		// Fecha efectiva que ubica la póliza en un periodo de reporte:
		// - validada: fecha_validacion (cuando se habilita la gestión a otras áreas)
		// - pendiente (sin validar): created_at (fecha de registro)
		const desdeTs = `${fechaDesde}T00:00:00`;
		const hastaTs = `${fechaHasta}T23:59:59`;
		polizaQuery = polizaQuery.or(
			`and(fecha_validacion.gte.${desdeTs},fecha_validacion.lte.${hastaTs}),` +
				`and(fecha_validacion.is.null,created_at.gte.${desdeTs},created_at.lte.${hastaTs})`,
		);

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
			polizaQuery = polizaQuery.eq("compania_aseguradora_id", filtros.compania_id);
		}
		if (filtros.excluir_retroactivas) {
			polizaQuery = polizaQuery.eq("es_retroactiva", false);
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
			created_by_profile:profiles!created_by (
				full_name
			),
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
					porcentaje_comision,
					nombre_producto,
					codigo_producto,
					tipo_seguro:tipos_seguros!tipo_seguro_id (
						codigo
					)
				),
				categoria:categorias!categoria_id (
					nombre
				),
				director_cartera:directores_cartera!director_cartera_id (
					nombre,
					apellidos
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
					),
					unipersonal_clients (
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
			anexoQuery = anexoQuery.eq("poliza.compania_aseguradora_id", filtros.compania_id);
		}
		// Mismo filtro de estado que las pólizas: los anexos cuya póliza no coincide vuelven con
		// poliza=null y se descartan abajo (if (!pol) continue), igual que el resto de filtros anidados.
		if (filtros.estado_poliza && filtros.estado_poliza !== "all") {
			anexoQuery = anexoQuery.eq("poliza.estado", filtros.estado_poliza);
		}
		if (memberIds) {
			anexoQuery = anexoQuery.in("poliza.responsable_id", memberIds);
		}

		// Ejecutar ambas consultas en paralelo, paginadas (Supabase corta en 1000 filas/request,
		// lo que hacía que rangos multi-mes con >1000 registros se truncaran silenciosamente).
		// Se ordena por "id" (único) para que la paginación sea estable; el orden final del
		// reporte se aplica luego en memoria (rows.sort por fecha de registro).
		const [polizasRes, anexosRes] = await Promise.all([
			fetchAllPaginated(polizaQuery.order("id", { ascending: true })),
			fetchAllPaginated(anexoQuery.order("id", { ascending: true })),
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
		const valorAseguradoMap = await obtenerValoresAsegurados(supabase, polizaIds, ramosSet);

		// Obtener cantidad de cuotas y cuota inicial por póliza
		const cuotasMap = new Map<string, { cantidad: number; cuota_inicial: number | null }>();
		if (polizaIds.length > 0) {
			const { data: pagosData } = await supabase
				.from("polizas_pagos")
				.select("poliza_id, numero_cuota, monto")
				.in("poliza_id", polizaIds)
				.order("numero_cuota", { ascending: true });

			if (pagosData) {
				for (const pago of pagosData) {
					const existing = cuotasMap.get(pago.poliza_id);
					if (!existing) {
						cuotasMap.set(pago.poliza_id, {
							cantidad: 1,
							cuota_inicial: pago.numero_cuota === 1 ? Number(pago.monto) : null,
						});
					} else {
						existing.cantidad++;
						if (pago.numero_cuota === 1) {
							existing.cuota_inicial = Number(pago.monto);
						}
					}
				}
			}
		}

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
			} | null,
		) {
			// Prima neta y comisión: directamente de la DB
			const primaNeta = polizaData.prima_neta != null ? Number(polizaData.prima_neta) : null;
			const comisionEmpresa =
				polizaData.comision_empresa != null
					? Number(polizaData.comision_empresa)
					: polizaData.comision != null
						? Number(polizaData.comision)
						: null;

			// Factor y porcentaje: referencia del producto
			let factorPrimaNeta: number | null = null;
			let porcentajeComision: number | null = null;
			if (producto) {
				const usarContado =
					polizaData.modalidad_pago === "contado" || polizaData.usar_factores_contado === true;
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

		// Código de ramo APS (ej. "9105" → "91-05"), tomado del tipo de seguro del producto
		const formatRamoAps = (ramoCodigo: string | null | undefined): string | null => {
			if (!ramoCodigo) return null;
			return ramoCodigo.length === 4 ? `${ramoCodigo.slice(0, 2)}-${ramoCodigo.slice(2)}` : ramoCodigo;
		};

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
				fecha_validacion: string | null;
				es_renovacion: boolean;
				producto?: {
					factor_contado: number;
					factor_credito: number;
					porcentaje_comision: number;
					nombre_producto?: string;
					codigo_producto?: string | null;
					tipo_seguro?: { codigo?: string | null } | null;
				} | null;
				created_by_profile?: { full_name?: string } | null;
				categoria?: { nombre?: string } | null;
				director_cartera?: {
					nombre: string;
					apellidos: string;
				} | null;
				client: ClientQueryResult | null;
				compania?: { nombre?: string; codigo?: number } | null;
				responsable?: { full_name?: string } | null;
				regional?: { nombre?: string } | null;
			}) => {
				const { cliente, ciNit } = extraerDatosCliente(p.client as ClientQueryResult | null);
				const dc = p.director_cartera;
				const financieros = extraerFinancieros(p, p.producto);

				const valorAseg = valorAseguradoMap.get(p.id) ?? null;
				const ramoTieneTabla = p.ramo in RAMO_VALOR_ASEGURADO_MAP;
				const cuotasInfo = cuotasMap.get(p.id);

				return {
					numero_poliza: p.numero_poliza,
					numero_anexo: null,
					tipo_poliza: (p.es_renovacion ? "Renovada" : "Nueva") as TipoPolizaReporte,
					validacion: p.fecha_validacion ? ("Validado" as const) : ("Por validar" as const),
					cliente,
					ci_nit: ciNit,
					director_cartera: dc ? `${dc.nombre} ${dc.apellidos}`.trim() : "N/A",
					compania: p.compania?.nombre || "N/A",
					cod_aps: p.compania?.codigo ?? null,
					cod_ramo_aps: formatRamoAps(p.producto?.tipo_seguro?.codigo),
					cod_producto: p.producto?.codigo_producto ?? null,
					ramo: p.ramo,
					responsable: p.responsable?.full_name || "N/A",
					regional: p.regional?.nombre || "N/A",
					prima_total: Number(p.prima_total),
					...financieros,
					moneda: p.moneda || "Bs",
					valor_asegurado: ramoTieneTabla ? valorAseg : Number(p.prima_total),
					cantidad_cuotas: cuotasInfo?.cantidad ?? 1,
					cuota_inicial: cuotasInfo?.cuota_inicial ?? null,
					inicio_vigencia: p.inicio_vigencia || "",
					fin_vigencia: p.fin_vigencia || "",
					fecha_emision_compania: p.fecha_emision_compania || "",
					fecha_produccion_sistema: p.created_at || "",
					persona_registro: p.created_by_profile?.full_name || "N/A",
					categoria: p.categoria?.nombre || "N/A",
					producto: p.producto?.nombre_producto || "N/A",
				};
			},
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

			const { cliente, ciNit } = extraerDatosCliente(pol.client as ClientQueryResult | null);
			const dc = pol.director_cartera;
			const financieros = extraerFinancieros(pol, pol.producto);

			const valorAseg = valorAseguradoMap.get(pol.id) ?? null;
			const ramoTieneTabla = pol.ramo in RAMO_VALOR_ASEGURADO_MAP;
			const cuotasInfo = cuotasMap.get(pol.id);

			rows.push({
				numero_poliza: pol.numero_poliza,
				numero_anexo: anexo.numero_anexo,
				tipo_poliza: tipoAnexoMap[anexo.tipo_anexo] || anexo.tipo_anexo,
				validacion: "Validado" as const,
				cliente,
				ci_nit: ciNit,
				director_cartera: dc ? `${dc.nombre} ${dc.apellidos}`.trim() : "N/A",
				compania: pol.compania?.nombre || "N/A",
				cod_aps: pol.compania?.codigo ?? null,
				cod_ramo_aps: formatRamoAps(pol.producto?.tipo_seguro?.codigo),
				cod_producto: pol.producto?.codigo_producto ?? null,
				ramo: pol.ramo,
				responsable: pol.responsable?.full_name || "N/A",
				regional: pol.regional?.nombre || "N/A",
				prima_total: Number(pol.prima_total),
				...financieros,
				moneda: pol.moneda || "Bs",
				valor_asegurado: ramoTieneTabla ? valorAseg : Number(pol.prima_total),
				cantidad_cuotas: cuotasInfo?.cantidad ?? 1,
				cuota_inicial: cuotasInfo?.cuota_inicial ?? null,
				inicio_vigencia: pol.inicio_vigencia || "",
				fin_vigencia: pol.fin_vigencia || "",
				fecha_emision_compania: pol.fecha_emision_compania || "",
				fecha_produccion_sistema: anexo.created_at || "",
				persona_registro: anexo.created_by_profile?.full_name || "N/A",
				categoria: pol.categoria?.nombre || "N/A",
				producto: pol.producto?.nombre_producto || "N/A",
			});
		}

		// Ordenar por fecha de registro en el sistema (producción) y, como desempate, por número de póliza.
		// El correlativo del Excel se asigna luego según este orden.
		rows.sort((a, b) => {
			const fa = a.fecha_produccion_sistema || "";
			const fb = b.fecha_produccion_sistema || "";
			if (fa !== fb) return fa.localeCompare(fb);
			return a.numero_poliza.localeCompare(b.numero_poliza);
		});

		return {
			success: true,
			data: {
				data: rows,
				meta: {
					usuario_email: permiso.email,
					fecha_desde: fechaDesde,
					fecha_hasta: fechaHasta,
				},
			},
		};
	} catch (error) {
		console.error("Error exporting new production report:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// REPORTE COMISIONES DIRECTOR DE CARTERA
// ============================================

/**
 * Obtiene directores activos para el filtro del reporte de comisiones.
 */
export async function obtenerDirectoresParaFiltro(): Promise<
	ProduccionServerResponse<{ id: string; nombre: string; apellidos: string | null }[]>
> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

	const { data, error } = await supabase
		.from("directores_cartera")
		.select("id, nombre, apellidos")
		.eq("activo", true)
		.order("nombre");

	if (error) {
		return { success: false, error: "Error al obtener directores" };
	}

	return { success: true, data: data || [] };
}

/**
 * Exporta el reporte de comisiones por director de cartera.
 * Solo incluye cuotas pagadas en el rango de fechas seleccionado.
 * Ordenado por director, póliza, número de cuota.
 */
export async function exportarComisionesDirector(
	filtros: ExportComisionesDirectorFilters,
): Promise<ProduccionServerResponse<ExportComisionesDirectorResponse>> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
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

		const polizaSelect = `
			numero_poliza,
			ramo,
			moneda,
			prima_total,
			prima_neta,
			comision_empresa,
			responsable_id,
			producto:productos_aseguradoras!producto_id (
				porcentaje_comision
			),
			director_cartera:directores_cartera!director_cartera_id (
				nombre,
				apellidos,
				porcentaje_comision,
				factura
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
			)
		`;

		// Query 1: cuotas pagadas (completas, no prorrogadas) con fecha_pago en el rango
		let pagadasQuery = supabase
			.from("polizas_pagos")
			.select(
				`numero_cuota, monto, fecha_pago, fecha_vencimiento, estado, poliza:polizas!poliza_id (${polizaSelect})`,
			)
			.eq("estado", "pagado")
			.is("fecha_vencimiento_original", null) // excluye cuotas prorrogadas
			.gte("fecha_pago", filtros.fecha_desde)
			.lte("fecha_pago", filtros.fecha_hasta);

		if (scope.needsScoping) {
			pagadasQuery = pagadasQuery.in("poliza.responsable_id", scope.teamMemberIds);
		}
		if (filtros.regional_id) pagadasQuery = pagadasQuery.eq("poliza.regional_id", filtros.regional_id);
		if (filtros.compania_id) pagadasQuery = pagadasQuery.eq("poliza.compania_aseguradora_id", filtros.compania_id);
		if (filtros.director_id) pagadasQuery = pagadasQuery.eq("poliza.director_cartera_id", filtros.director_id);
		if (memberIds) pagadasQuery = pagadasQuery.in("poliza.responsable_id", memberIds);

		// Query 2: cuotas por cobrar (sin parciales ni prorrogadas) con fecha_vencimiento en el rango
		let porCobrarQuery = supabase
			.from("polizas_pagos")
			.select(
				`numero_cuota, monto, fecha_pago, fecha_vencimiento, estado, poliza:polizas!poliza_id (${polizaSelect})`,
			)
			.in("estado", ["pendiente", "vencido"]) // excluye 'parcial'
			.is("fecha_vencimiento_original", null) // excluye cuotas prorrogadas
			.gte("fecha_vencimiento", filtros.fecha_desde)
			.lte("fecha_vencimiento", filtros.fecha_hasta);

		if (scope.needsScoping) {
			porCobrarQuery = porCobrarQuery.in("poliza.responsable_id", scope.teamMemberIds);
		}
		if (filtros.regional_id) porCobrarQuery = porCobrarQuery.eq("poliza.regional_id", filtros.regional_id);
		if (filtros.compania_id)
			porCobrarQuery = porCobrarQuery.eq("poliza.compania_aseguradora_id", filtros.compania_id);
		if (filtros.director_id) porCobrarQuery = porCobrarQuery.eq("poliza.director_cartera_id", filtros.director_id);
		if (memberIds) porCobrarQuery = porCobrarQuery.in("poliza.responsable_id", memberIds);

		const [pagadasRes, porCobrarRes] = await Promise.all([pagadasQuery, porCobrarQuery]);

		if (pagadasRes.error) {
			console.error("Error fetching comisiones director (pagadas):", pagadasRes.error);
			return { success: false, error: "Error al obtener cuotas pagadas para el reporte" };
		}
		if (porCobrarRes.error) {
			console.error("Error fetching comisiones director (por cobrar):", porCobrarRes.error);
			return { success: false, error: "Error al obtener cuotas por cobrar para el reporte" };
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mapRow = (pago: any, estadoCuota: "pagada" | "por_cobrar"): ExportComisionesDirectorRow => {
			const poliza = pago.poliza;
			const dc = poliza.director_cartera;
			const { cliente, ciNit } = extraerDatosCliente(poliza.client as ClientQueryResult | null);

			const primaTotalNum = Number(poliza.prima_total) || 0;
			const primaNeta = poliza.prima_neta != null ? Number(poliza.prima_neta) : null;
			const comisionEmpresa = poliza.comision_empresa != null ? Number(poliza.comision_empresa) : null;
			const montoCuotaPT = Number(pago.monto);

			let montoCuotaPN: number | null = null;
			let montoCuotaComision: number | null = null;
			if (primaNeta != null && primaTotalNum > 0) {
				const ratioPN = primaNeta / primaTotalNum;
				montoCuotaPN = montoCuotaPT * ratioPN;
				if (comisionEmpresa != null) {
					montoCuotaComision = montoCuotaPT * (comisionEmpresa / primaTotalNum);
				}
			}

			const pctDirector = dc?.porcentaje_comision != null ? Number(dc.porcentaje_comision) : null;
			const montoComisionDirector =
				pctDirector != null && montoCuotaComision != null ? montoCuotaComision * (pctDirector / 100) : null;

			// % comisión del producto/compañía (informativo)
			const porcentajeCompania =
				poliza.producto?.porcentaje_comision != null ? Number(poliza.producto.porcentaje_comision) * 100 : null;

			// Desglose fiscal sobre la comisión del director
			const facturaDirector = dc?.factura === true; // true = presenta factura fiscal
			const it3 = montoComisionDirector != null ? montoComisionDirector * 0.03 : null;
			const totalImporte = montoComisionDirector != null ? montoComisionDirector - (it3 ?? 0) : null;
			const aplicaRetencion = !facturaDirector && totalImporte != null;
			const retencionRcIva = aplicaRetencion ? totalImporte! * 0.13 : null;
			const retencionIt = aplicaRetencion ? totalImporte! * 0.03 : null;
			const totalComision =
				totalImporte != null ? totalImporte - (retencionRcIva ?? 0) - (retencionIt ?? 0) : null;

			return {
				director_cartera: dc ? `${dc.nombre} ${dc.apellidos || ""}`.trim() : "Sin director",
				numero_poliza: poliza.numero_poliza || "N/A",
				cliente,
				ci_nit: ciNit,
				compania: poliza.compania?.nombre || "N/A",
				ramo: poliza.ramo || "N/A",
				regional: poliza.regional?.nombre || "N/A",
				responsable: poliza.responsable?.full_name || "N/A",
				numero_cuota: pago.numero_cuota,
				estado_cuota: estadoCuota,
				monto_cuota_pt: montoCuotaPT,
				monto_cuota_pn: montoCuotaPN,
				porcentaje_compania: porcentajeCompania,
				monto_cuota_comision: montoCuotaComision,
				porcentaje_comision_director: pctDirector,
				monto_comision_director: montoComisionDirector,
				it_3pct: it3,
				total_importe: totalImporte,
				retencion_rciva: retencionRcIva,
				retencion_it: retencionIt,
				total_comision: totalComision,
				director_factura: facturaDirector,
				moneda: poliza.moneda || "Bs",
				fecha: estadoCuota === "pagada" ? pago.fecha_pago : pago.fecha_vencimiento,
			};
		};

		const rows: ExportComisionesDirectorRow[] = [
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			...(pagadasRes.data || []).filter((p: any) => p.poliza).map((p: any) => mapRow(p, "pagada")),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			...(porCobrarRes.data || []).filter((p: any) => p.poliza).map((p: any) => mapRow(p, "por_cobrar")),
		];

		// Ordenar: director > estado (pagadas primero) > póliza > cuota
		rows.sort((a, b) => {
			const dirCmp = a.director_cartera.localeCompare(b.director_cartera);
			if (dirCmp !== 0) return dirCmp;
			if (a.estado_cuota !== b.estado_cuota) {
				return a.estado_cuota === "pagada" ? -1 : 1;
			}
			const polCmp = a.numero_poliza.localeCompare(b.numero_poliza);
			if (polCmp !== 0) return polCmp;
			return a.numero_cuota - b.numero_cuota;
		});

		return {
			success: true,
			data: {
				data: rows,
				meta: {
					usuario_email: permiso.email,
					fecha_desde: filtros.fecha_desde,
					fecha_hasta: filtros.fecha_hasta,
				},
			},
		};
	} catch (error) {
		console.error("Error exporting comisiones director:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

// ============================================
// REPORTE DE VENCIMIENTOS (pólizas por vencer en un rango)
// ============================================

/** Diferencia en días entre dos fechas YYYY-MM-DD (hasta - desde), sin TZ. */
function diferenciaDias(desde: string, hasta: string): number {
	const d = desde.match(/^(\d{4})-(\d{2})-(\d{2})/);
	const h = hasta.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!d || !h) return 0;
	const desdeMs = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]));
	const hastaMs = Date.UTC(Number(h[1]), Number(h[2]) - 1, Number(h[3]));
	return Math.round((hastaMs - desdeMs) / (1000 * 60 * 60 * 24));
}

/**
 * Exporta el reporte de pólizas por vencer dentro de un rango de fechas
 * (filtra por fin_vigencia). Aplica los mismos filtros y data scoping que el
 * resto de los reportes: comercial/agente solo ven datos de su equipo.
 */
export async function exportarVencimientos(
	filtros: ExportVencimientosFilters,
): Promise<ProduccionServerResponse<ExportVencimientosResponse>> {
	const permiso = await verificarPermisoExportar();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();
	const scope = await getDataScopeFilter("polizas");

	try {
		const fechaDesde = filtros.fecha_desde;
		const fechaHasta = filtros.fecha_hasta;

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

		let query = supabase.from("polizas").select(`
			id,
			client_id,
			numero_poliza,
			ramo,
			moneda,
			prima_total,
			estado,
			inicio_vigencia,
			fin_vigencia,
			responsable_id,
			producto:productos_aseguradoras!producto_id (
				nombre_producto
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
		`);

		// Pólizas cuyo fin de vigencia cae dentro del rango seleccionado
		query = query.gte("fin_vigencia", fechaDesde);
		query = query.lte("fin_vigencia", fechaHasta);

		// Data scoping: comercial/agente solo ven datos de su equipo
		if (scope.needsScoping) {
			query = query.in("responsable_id", scope.teamMemberIds);
		}

		// Por defecto solo pólizas vigentes ("activa"); "all" incluye todas
		if (filtros.estado_poliza && filtros.estado_poliza !== "all") {
			query = query.eq("estado", filtros.estado_poliza);
		}
		if (filtros.regional_id) {
			query = query.eq("regional_id", filtros.regional_id);
		}
		if (filtros.compania_id) {
			query = query.eq("compania_aseguradora_id", filtros.compania_id);
		}
		if (memberIds) {
			query = query.in("responsable_id", memberIds);
		}

		const { data, error } = await query.order("fin_vigencia", { ascending: true });

		if (error) {
			console.error("Error fetching polizas for vencimientos report:", error);
			return { success: false, error: "Error al obtener pólizas para el reporte" };
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const polizas = (data || []) as Array<any>;

		// Resolver nombre/documento de cliente para los 6 tipos en batch
		const nombresMap = await resolverNombresCliente(
			supabase,
			polizas.map((p: { client_id: string }) => p.client_id),
		);

		const hoy = hoyLaPaz();

		const rows: ExportVencimientosRow[] = polizas.map(
			(p: {
				client_id: string;
				numero_poliza: string;
				ramo: string;
				moneda: string;
				prima_total: number;
				estado: string;
				inicio_vigencia: string;
				fin_vigencia: string;
				producto?: { nombre_producto?: string } | null;
				compania?: { nombre?: string } | null;
				responsable?: { full_name?: string } | null;
				regional?: { nombre?: string } | null;
			}) => {
				const info = nombresMap.get(p.client_id);
				return {
					numero_poliza: p.numero_poliza || "N/A",
					cliente: info?.name || "Cliente Desconocido",
					ci_nit: info?.ci || "-",
					compania: p.compania?.nombre || "N/A",
					ramo: p.ramo || "N/A",
					responsable: p.responsable?.full_name || "N/A",
					regional: p.regional?.nombre || "N/A",
					estado: p.estado || "N/A",
					moneda: p.moneda || "Bs",
					prima_total: Number(p.prima_total) || 0,
					inicio_vigencia: p.inicio_vigencia || "",
					fin_vigencia: p.fin_vigencia || "",
					dias_para_vencer: p.fin_vigencia ? diferenciaDias(hoy, p.fin_vigencia) : 0,
					producto: p.producto?.nombre_producto || "N/A",
				};
			},
		);

		return {
			success: true,
			data: {
				data: rows,
				meta: {
					usuario_email: permiso.email,
					fecha_desde: fechaDesde,
					fecha_hasta: fechaHasta,
				},
			},
		};
	} catch (error) {
		console.error("Error exporting vencimientos report:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
