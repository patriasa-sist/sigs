"use server";

import { createClient } from "@/utils/supabase/server";
import type {
	ExportProduccionFilters,
	ExportProduccionRow,
	ProduccionServerResponse,
} from "@/types/reporte";

/**
 * Verifica que el usuario tenga rol admin
 */
async function verificarPermisoAdmin(): Promise<
	| { authorized: true; userId: string }
	| { authorized: false; error: string }
> {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { authorized: false, error: "No autenticado" };
	}

	const { data: profile, error } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", user.id)
		.single();

	if (error || !profile) {
		return { authorized: false, error: "Error al verificar permisos" };
	}

	if (profile.role !== "admin") {
		return { authorized: false, error: "No tiene permisos de administrador" };
	}

	return { authorized: true, userId: user.id };
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
 */
export async function exportarProduccion(
	filtros: ExportProduccionFilters
): Promise<ProduccionServerResponse<ExportProduccionRow[]>> {
	const permiso = await verificarPermisoAdmin();
	if (!permiso.authorized) {
		return { success: false, error: permiso.error };
	}

	const supabase = await createClient();

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
				modalidad_pago,
				inicio_vigencia,
				fin_vigencia,
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
						modalidad_pago: "contado" | "credito";
						inicio_vigencia: string;
						fin_vigencia: string;
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

					// Cálculos financieros (solo si hay producto asignado)
					let primaNeta: number | null = null;
					let comisionEmpresa: number | null = null;
					let factorPrimaNeta: number | null = null;
					let porcentajeComision: number | null = null;
					let montoCuotaPN: number | null = null;
					let montoCuotaComision: number | null = null;

					if (producto) {
						// Determinar qué factor usar según modalidad de pago
						const factor =
							poliza.modalidad_pago === "contado"
								? producto.factor_contado
								: producto.factor_credito;

						factorPrimaNeta = Number(factor);
						// Porcentaje de comisión: almacenado como decimal (0.15), mostrar como % (15)
						porcentajeComision = Number(producto.porcentaje_comision) * 100;

						// Calcular prima neta: prima_total / (1 + factor/100)
						const divisor = 1 + factorPrimaNeta / 100;
						primaNeta = Number(poliza.prima_total) / divisor;

						// Calcular comisión empresa: prima_neta * porcentaje_comision
						comisionEmpresa = primaNeta * Number(producto.porcentaje_comision);

						// Calcular valores por cuota
						montoCuotaPN = Number(pago.monto) / divisor;
						montoCuotaComision = montoCuotaPN * Number(producto.porcentaje_comision);
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
 * Obtiene la lista de regionales para el filtro
 */
export async function obtenerRegionales(): Promise<
	ProduccionServerResponse<{ id: string; nombre: string }[]>
> {
	const permiso = await verificarPermisoAdmin();
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
	const permiso = await verificarPermisoAdmin();
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
