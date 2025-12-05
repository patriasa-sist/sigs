"use server";

import { createClient } from "@/utils/supabase/server";

export type PolizaListItem = {
	id: string;
	numero_poliza: string;
	ramo: string;
	client_id: string;
	client_name: string;
	client_ci: string;
	compania_nombre: string;
	inicio_vigencia: string;
	fin_vigencia: string;
	prima_total: number;
	moneda: string;
	estado: string;
	modalidad_pago: string;
	responsable_nombre: string;
	regional_nombre: string;
	created_at: string;
};

export type PolizaDetalle = PolizaListItem & {
	fecha_emision_compania: string;
	prima_neta: number;
	comision: number;
	categoria_nombre: string;
	pagos: Array<{
		id: string;
		numero_cuota: number;
		monto: number;
		fecha_vencimiento: string;
		fecha_pago: string | null;
		estado: string;
	}>;
	vehiculos?: Array<{
		id: string;
		placa: string;
		valor_asegurado: number;
		franquicia: number;
		tipo_vehiculo: string | null;
		marca: string | null;
		modelo: string | null;
		ano: string | null;
	}>;
	documentos: Array<{
		id: string;
		tipo_documento: string;
		nombre_archivo: string;
		archivo_url: string;
		uploaded_at: string;
	}>;
};

/**
 * Obtiene todas las pólizas con información básica
 */
export async function obtenerPolizas() {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Obtener pólizas con joins
		const { data: polizas, error } = await supabase
			.from("polizas")
			.select(
				`
				id,
				numero_poliza,
				ramo,
				client_id,
				compania_aseguradora_id,
				inicio_vigencia,
				fin_vigencia,
				prima_total,
				moneda,
				estado,
				modalidad_pago,
				responsable_id,
				regional_id,
				created_at,
				companias_aseguradoras (nombre),
				profiles!polizas_responsable_id_fkey (full_name),
				regionales (nombre)
			`
			)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error obteniendo pólizas:", error);
			return { success: false, error: error.message };
		}

		// Obtener IDs únicos de clientes
		const clientIds = [...new Set(polizas?.map((p) => p.client_id))];

		// Obtener información de clientes
		const { data: clients } = await supabase.from("clients").select("id, client_type").in("id", clientIds);

		const { data: naturalClients } = await supabase
			.from("natural_clients")
			.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
			.in("client_id", clientIds);

		const { data: juridicClients } = await supabase
			.from("juridic_clients")
			.select("client_id, razon_social, nit")
			.in("client_id", clientIds);

		// Crear mapas de clientes
		const clientsMap = new Map(clients?.map((c) => [c.id, c]) || []);
		const naturalClientsMap = new Map(naturalClients?.map((c) => [c.client_id, c]) || []);
		const juridicClientsMap = new Map(juridicClients?.map((c) => [c.client_id, c]) || []);

		// Mapear datos
		const polizasFormateadas: PolizaListItem[] =
			polizas?.map((poliza) => {
				const client = clientsMap.get(poliza.client_id);
				let client_name = "Cliente Desconocido";
				let client_ci = "-";

				if (client?.client_type === "natural") {
					const naturalClient = naturalClientsMap.get(poliza.client_id);
					if (naturalClient) {
						const nombres = [naturalClient.primer_nombre, naturalClient.segundo_nombre]
							.filter(Boolean)
							.join(" ");
						const apellidos = [naturalClient.primer_apellido, naturalClient.segundo_apellido]
							.filter(Boolean)
							.join(" ");
						client_name = `${nombres} ${apellidos}`.trim();
						client_ci = naturalClient.numero_documento || "-";
					}
				} else if (client?.client_type === "juridica") {
					const juridicClient = juridicClientsMap.get(poliza.client_id);
					if (juridicClient) {
						client_name = juridicClient.razon_social;
						client_ci = juridicClient.nit || "-";
					}
				}

				return {
					id: poliza.id,
					numero_poliza: poliza.numero_poliza,
					ramo: poliza.ramo,
					client_id: poliza.client_id,
					client_name,
					client_ci,
					compania_nombre: (poliza.companias_aseguradoras as any)?.nombre || "-",
					inicio_vigencia: poliza.inicio_vigencia,
					fin_vigencia: poliza.fin_vigencia,
					prima_total: poliza.prima_total,
					moneda: poliza.moneda,
					estado: poliza.estado,
					modalidad_pago: poliza.modalidad_pago,
					responsable_nombre: (poliza.profiles as any)?.full_name || "-",
					regional_nombre: (poliza.regionales as any)?.nombre || "-",
					created_at: poliza.created_at,
				};
			}) || [];

		return { success: true, polizas: polizasFormateadas };
	} catch (error) {
		console.error("Error general obteniendo pólizas:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Obtiene el detalle completo de una póliza
 */
export async function obtenerDetallePoliza(polizaId: string) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Obtener póliza con joins
		const { data: poliza, error: errorPoliza } = await supabase
			.from("polizas")
			.select(
				`
				*,
				companias_aseguradoras (nombre),
				profiles!polizas_responsable_id_fkey (full_name),
				regionales (nombre),
				categorias (nombre)
			`
			)
			.eq("id", polizaId)
			.single();

		if (errorPoliza || !poliza) {
			console.error("Error obteniendo póliza:", errorPoliza);
			return { success: false, error: "Póliza no encontrada" };
		}

		// Obtener información del cliente
		const { data: client } = await supabase.from("clients").select("client_type").eq("id", poliza.client_id).single();

		let client_name = "Cliente Desconocido";
		let client_ci = "-";

		if (client?.client_type === "natural") {
			const { data: naturalClient } = await supabase
				.from("natural_clients")
				.select("primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
				.eq("client_id", poliza.client_id)
				.single();

			if (naturalClient) {
				const nombres = [naturalClient.primer_nombre, naturalClient.segundo_nombre].filter(Boolean).join(" ");
				const apellidos = [naturalClient.primer_apellido, naturalClient.segundo_apellido].filter(Boolean).join(" ");
				client_name = `${nombres} ${apellidos}`.trim();
				client_ci = naturalClient.numero_documento || "-";
			}
		} else if (client?.client_type === "juridica") {
			const { data: juridicClient } = await supabase
				.from("juridic_clients")
				.select("razon_social, nit")
				.eq("client_id", poliza.client_id)
				.single();

			if (juridicClient) {
				client_name = juridicClient.razon_social;
				client_ci = juridicClient.nit || "-";
			}
		}

		// Obtener pagos
		const { data: pagos } = await supabase
			.from("polizas_pagos")
			.select("id, numero_cuota, monto, fecha_vencimiento, fecha_pago, estado")
			.eq("poliza_id", polizaId)
			.order("numero_cuota", { ascending: true });

		// Obtener vehículos si es ramo automotor
		let vehiculos: any[] = [];
		if (poliza.ramo.toLowerCase().includes("automotor")) {
			const { data: vehiculosData } = await supabase
				.from("polizas_automotor_vehiculos")
				.select(
					`
					id,
					placa,
					valor_asegurado,
					franquicia,
					modelo,
					ano,
					tipos_vehiculo (nombre),
					marcas_vehiculo (nombre)
				`
				)
				.eq("poliza_id", polizaId);

			vehiculos =
				vehiculosData?.map((v) => ({
					id: v.id,
					placa: v.placa,
					valor_asegurado: v.valor_asegurado,
					franquicia: v.franquicia,
					tipo_vehiculo: (v.tipos_vehiculo as any)?.nombre || null,
					marca: (v.marcas_vehiculo as any)?.nombre || null,
					modelo: v.modelo,
					ano: v.ano,
				})) || [];
		}

		// Obtener documentos (solo activos)
		const { data: documentos } = await supabase
			.from("polizas_documentos")
			.select("id, tipo_documento, nombre_archivo, archivo_url, uploaded_at")
			.eq("poliza_id", polizaId)
			.eq("estado", "activo")
			.order("uploaded_at", { ascending: false });

		const polizaDetalle: PolizaDetalle = {
			id: poliza.id,
			numero_poliza: poliza.numero_poliza,
			ramo: poliza.ramo,
			client_id: poliza.client_id,
			client_name,
			client_ci,
			compania_nombre: (poliza.companias_aseguradoras as any)?.nombre || "-",
			inicio_vigencia: poliza.inicio_vigencia,
			fin_vigencia: poliza.fin_vigencia,
			fecha_emision_compania: poliza.fecha_emision_compania,
			prima_total: poliza.prima_total,
			prima_neta: poliza.prima_neta,
			comision: poliza.comision,
			moneda: poliza.moneda,
			estado: poliza.estado,
			modalidad_pago: poliza.modalidad_pago,
			responsable_nombre: (poliza.profiles as any)?.full_name || "-",
			regional_nombre: (poliza.regionales as any)?.nombre || "-",
			categoria_nombre: (poliza.categorias as any)?.nombre || "-",
			created_at: poliza.created_at,
			pagos: pagos || [],
			vehiculos: vehiculos.length > 0 ? vehiculos : undefined,
			documentos: documentos || [],
		};

		return { success: true, poliza: polizaDetalle };
	} catch (error) {
		console.error("Error general obteniendo detalle póliza:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}

/**
 * Busca pólizas por término
 */
export async function buscarPolizas(query: string) {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// Buscar por número de póliza (búsqueda más común)
		const { data: polizas } = await supabase
			.from("polizas")
			.select(
				`
				id,
				numero_poliza,
				ramo,
				client_id,
				compania_aseguradora_id,
				inicio_vigencia,
				fin_vigencia,
				prima_total,
				moneda,
				estado,
				modalidad_pago,
				responsable_id,
				regional_id,
				created_at,
				companias_aseguradoras (nombre),
				profiles!polizas_responsable_id_fkey (full_name),
				regionales (nombre)
			`
			)
			.ilike("numero_poliza", `%${query}%`)
			.order("created_at", { ascending: false })
			.limit(50);

		if (!polizas || polizas.length === 0) {
			return { success: true, polizas: [] };
		}

		// Obtener información de clientes
		const clientIds = [...new Set(polizas.map((p) => p.client_id))];

		const { data: clients } = await supabase.from("clients").select("id, client_type").in("id", clientIds);

		const { data: naturalClients } = await supabase
			.from("natural_clients")
			.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
			.in("client_id", clientIds);

		const { data: juridicClients } = await supabase
			.from("juridic_clients")
			.select("client_id, razon_social, nit")
			.in("client_id", clientIds);

		// Crear mapas
		const clientsMap = new Map(clients?.map((c) => [c.id, c]) || []);
		const naturalClientsMap = new Map(naturalClients?.map((c) => [c.client_id, c]) || []);
		const juridicClientsMap = new Map(juridicClients?.map((c) => [c.client_id, c]) || []);

		// Mapear datos
		const polizasFormateadas: PolizaListItem[] = polizas.map((poliza) => {
			const client = clientsMap.get(poliza.client_id);
			let client_name = "Cliente Desconocido";
			let client_ci = "-";

			if (client?.client_type === "natural") {
				const naturalClient = naturalClientsMap.get(poliza.client_id);
				if (naturalClient) {
					const nombres = [naturalClient.primer_nombre, naturalClient.segundo_nombre].filter(Boolean).join(" ");
					const apellidos = [naturalClient.primer_apellido, naturalClient.segundo_apellido]
						.filter(Boolean)
						.join(" ");
					client_name = `${nombres} ${apellidos}`.trim();
					client_ci = naturalClient.numero_documento || "-";
				}
			} else if (client?.client_type === "juridica") {
				const juridicClient = juridicClientsMap.get(poliza.client_id);
				if (juridicClient) {
					client_name = juridicClient.razon_social;
					client_ci = juridicClient.nit || "-";
				}
			}

			return {
				id: poliza.id,
				numero_poliza: poliza.numero_poliza,
				ramo: poliza.ramo,
				client_id: poliza.client_id,
				client_name,
				client_ci,
				compania_nombre: (poliza.companias_aseguradoras as any)?.nombre || "-",
				inicio_vigencia: poliza.inicio_vigencia,
				fin_vigencia: poliza.fin_vigencia,
				prima_total: poliza.prima_total,
				moneda: poliza.moneda,
				estado: poliza.estado,
				modalidad_pago: poliza.modalidad_pago,
				responsable_nombre: (poliza.profiles as any)?.full_name || "-",
				regional_nombre: (poliza.regionales as any)?.nombre || "-",
				created_at: poliza.created_at,
			};
		});

		return { success: true, polizas: polizasFormateadas };
	} catch (error) {
		console.error("Error buscando pólizas:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
