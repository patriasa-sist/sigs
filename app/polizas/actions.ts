"use server";

import { createClient } from "@/utils/supabase/server";
import { getDataScopeFilter } from "@/utils/auth/helpers";

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
	// Audit and validation fields
	creador_nombre: string | null;
	validado_por: string | null;
	fecha_validacion: string | null;
	validador_nombre: string | null;
	// Rejection fields
	motivo_rechazo: string | null;
	rechazado_por: string | null;
	fecha_rechazo: string | null;
	rechazador_nombre: string | null;
	puede_editar_hasta: string | null;
	// Renewal fields
	es_renovacion: boolean;
	nro_poliza_anterior: string | null;
	pagos: Array<{
		id: string;
		numero_cuota: number;
		monto: number;
		fecha_vencimiento: string;
		fecha_pago: string | null;
		estado: string;
		observaciones: string | null;
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
		nro_chasis: string | null;
		uso: string | null;
		coaseguro: number | null;
		color: string | null;
		ejes: number | null;
		nro_motor: string | null;
		nro_asientos: number | null;
		plaza_circulacion: string | null;
	}>;
	beneficiarios_salud?: Array<{
		id: string;
		nombre_completo: string;
		carnet: string;
		fecha_nacimiento: string;
		genero: string;
		rol: string;
	}>;
	transporte?: {
		materia_asegurada: string;
		tipo_embalaje: string;
		fecha_embarque: string;
		tipo_transporte: string;
		ciudad_origen: string;
		pais_origen: string;
		ciudad_destino: string;
		pais_destino: string;
		valor_asegurado: number;
		factura: string;
		fecha_factura: string;
		cobertura_a: boolean;
		cobertura_c: boolean;
		modalidad: string;
	};
	naves?: Array<{
		id: string;
		matricula: string;
		marca: string;
		modelo: string;
		ano: number;
		serie: string;
		uso: string;
		nro_pasajeros: number;
		nro_tripulantes: number;
		valor_casco: number;
		valor_responsabilidad_civil: number;
		nivel_ap_nombre: string | null;
	}>;
	niveles_ap_naves?: Array<{
		id: string;
		nombre: string;
		monto_muerte_accidental: number;
		monto_invalidez: number;
		monto_gastos_medicos: number;
	}>;
	equipos?: Array<{
		id: string;
		nro_serie: string;
		placa: string | null;
		valor_asegurado: number;
		franquicia: number;
		nro_chasis: string;
		uso: string;
		coaseguro: number;
		tipo_equipo: string | null;
		marca_equipo: string | null;
		modelo: string | null;
		ano: number | null;
		color: string | null;
		nro_motor: string | null;
		plaza_circulacion: string | null;
	}>;
	documentos: Array<{
		id: string;
		tipo_documento: string;
		nombre_archivo: string;
		archivo_url: string;
		uploaded_at: string;
	}>;
	historial: Array<{
		id: string;
		accion: string;
		usuario_nombre: string | null;
		campos_modificados: string[] | null;
		descripcion: string | null;
		timestamp: string;
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

		// Verificar si necesita aislamiento de datos
		const scope = await getDataScopeFilter();

		// Obtener pólizas con joins
		let query = supabase
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

		if (scope.needsScoping) {
			query = query.in("responsable_id", scope.teamMemberIds);
		}

		const { data: polizas, error } = await query;

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
					compania_nombre: (poliza.companias_aseguradoras as { nombre?: string } | null)?.nombre || "-",
					inicio_vigencia: poliza.inicio_vigencia,
					fin_vigencia: poliza.fin_vigencia,
					prima_total: poliza.prima_total,
					moneda: poliza.moneda,
					estado: poliza.estado,
					modalidad_pago: poliza.modalidad_pago,
					responsable_nombre: (poliza.profiles as { full_name?: string } | null)?.full_name || "-",
					regional_nombre: (poliza.regionales as { nombre?: string } | null)?.nombre || "-",
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

		// Verificar scoping por equipo
		const scope = await getDataScopeFilter('polizas');
		if (scope.needsScoping && !scope.teamMemberIds.includes(poliza.responsable_id)) {
			return { success: false, error: "No tiene acceso a esta póliza" };
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
			.select("id, numero_cuota, monto, fecha_vencimiento, fecha_pago, estado, observaciones")
			.eq("poliza_id", polizaId)
			.order("numero_cuota", { ascending: true });

		// Obtener datos específicos por ramo
		const ramoLower = (poliza.ramo || "").toLowerCase();

		// --- AUTOMOTOR ---
		let vehiculos: PolizaDetalle["vehiculos"];
		if (ramoLower.includes("automotor")) {
			const { data: vehiculosData } = await supabase
				.from("polizas_automotor_vehiculos")
				.select(
					`
					id, placa, valor_asegurado, franquicia, nro_chasis, uso, coaseguro,
					modelo, ano, color, ejes, nro_motor, nro_asientos, plaza_circulacion,
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
					tipo_vehiculo: (v.tipos_vehiculo as { nombre?: string } | null)?.nombre || null,
					marca: (v.marcas_vehiculo as { nombre?: string } | null)?.nombre || null,
					modelo: v.modelo,
					ano: v.ano?.toString() || null,
					nro_chasis: v.nro_chasis || null,
					uso: v.uso || null,
					coaseguro: v.coaseguro ?? null,
					color: v.color || null,
					ejes: v.ejes ?? null,
					nro_motor: v.nro_motor || null,
					nro_asientos: v.nro_asientos ?? null,
					plaza_circulacion: v.plaza_circulacion || null,
				})) || [];
			if (vehiculos.length === 0) vehiculos = undefined;
		}

		// --- SALUD (Beneficiarios) ---
		let beneficiarios_salud: PolizaDetalle["beneficiarios_salud"];
		if (ramoLower.includes("salud")) {
			const { data: beneficiariosData } = await supabase
				.from("polizas_salud_beneficiarios")
				.select("id, nombre_completo, carnet, fecha_nacimiento, genero, rol")
				.eq("poliza_id", polizaId);

			if (beneficiariosData && beneficiariosData.length > 0) {
				beneficiarios_salud = beneficiariosData;
			}
		}

		// --- TRANSPORTE ---
		let transporte: PolizaDetalle["transporte"];
		if (ramoLower.includes("transporte")) {
			const { data: transporteData } = await supabase
				.from("polizas_transporte")
				.select(
					`
					materia_asegurada, tipo_embalaje, fecha_embarque, tipo_transporte,
					ciudad_origen, ciudad_destino, valor_asegurado, factura, fecha_factura,
					cobertura_a, cobertura_c, modalidad,
					pais_origen:paises!polizas_transporte_pais_origen_id_fkey (nombre),
					pais_destino:paises!polizas_transporte_pais_destino_id_fkey (nombre)
				`
				)
				.eq("poliza_id", polizaId)
				.single();

			if (transporteData) {
				transporte = {
					materia_asegurada: transporteData.materia_asegurada,
					tipo_embalaje: transporteData.tipo_embalaje,
					fecha_embarque: transporteData.fecha_embarque,
					tipo_transporte: transporteData.tipo_transporte,
					ciudad_origen: transporteData.ciudad_origen,
					pais_origen: (transporteData.pais_origen as { nombre?: string } | null)?.nombre || "-",
					ciudad_destino: transporteData.ciudad_destino,
					pais_destino: (transporteData.pais_destino as { nombre?: string } | null)?.nombre || "-",
					valor_asegurado: transporteData.valor_asegurado,
					factura: transporteData.factura,
					fecha_factura: transporteData.fecha_factura,
					cobertura_a: transporteData.cobertura_a ?? false,
					cobertura_c: transporteData.cobertura_c ?? false,
					modalidad: transporteData.modalidad,
				};
			}
		}

		// --- AERONAVEGACIÓN / NAVES ---
		let naves: PolizaDetalle["naves"];
		let niveles_ap_naves: PolizaDetalle["niveles_ap_naves"];
		if (ramoLower.includes("aeronavegacion") || ramoLower.includes("aeronavegación") || ramoLower.includes("naves") || ramoLower.includes("embarcacion")) {
			const { data: navelesAP } = await supabase
				.from("polizas_aeronavegacion_niveles_ap")
				.select("id, nombre, monto_muerte_accidental, monto_invalidez, monto_gastos_medicos")
				.eq("poliza_id", polizaId);

			if (navelesAP && navelesAP.length > 0) {
				niveles_ap_naves = navelesAP;
			}

			const nivelesMap = new Map(navelesAP?.map(n => [n.id, n.nombre]) || []);

			const { data: navesData } = await supabase
				.from("polizas_aeronavegacion_naves")
				.select("id, matricula, marca, modelo, ano, serie, uso, nro_pasajeros, nro_tripulantes, valor_casco, valor_responsabilidad_civil, nivel_ap_id")
				.eq("poliza_id", polizaId);

			if (navesData && navesData.length > 0) {
				naves = navesData.map((n) => ({
					...n,
					nivel_ap_nombre: n.nivel_ap_id ? nivelesMap.get(n.nivel_ap_id) || null : null,
				}));
			}
		}

		// --- RAMOS TÉCNICOS (Equipos Industriales) ---
		let equipos: PolizaDetalle["equipos"];
		if (ramoLower.includes("técnicos") || ramoLower.includes("tecnicos")) {
			const { data: equiposData } = await supabase
				.from("polizas_ramos_tecnicos_equipos")
				.select(
					`
					id, nro_serie, placa, valor_asegurado, franquicia, nro_chasis, uso, coaseguro,
					modelo, ano, color, nro_motor, plaza_circulacion,
					tipos_equipo (nombre),
					marcas_equipo (nombre)
				`
				)
				.eq("poliza_id", polizaId);

			if (equiposData && equiposData.length > 0) {
				equipos = equiposData.map((e) => ({
					id: e.id,
					nro_serie: e.nro_serie,
					placa: e.placa || null,
					valor_asegurado: e.valor_asegurado,
					franquicia: e.franquicia,
					nro_chasis: e.nro_chasis,
					uso: e.uso,
					coaseguro: e.coaseguro,
					tipo_equipo: (e.tipos_equipo as { nombre?: string } | null)?.nombre || null,
					marca_equipo: (e.marcas_equipo as { nombre?: string } | null)?.nombre || null,
					modelo: e.modelo || null,
					ano: e.ano ?? null,
					color: e.color || null,
					nro_motor: e.nro_motor || null,
					plaza_circulacion: e.plaza_circulacion || null,
				}));
			}
		}

		// Obtener documentos (solo activos)
		const { data: documentos } = await supabase
			.from("polizas_documentos")
			.select("id, tipo_documento, nombre_archivo, archivo_url, uploaded_at")
			.eq("poliza_id", polizaId)
			.eq("estado", "activo")
			.order("uploaded_at", { ascending: false });

		// Obtener nombre del creador
		let creador_nombre: string | null = null;
		if (poliza.created_by) {
			const { data: creador } = await supabase
				.from("profiles")
				.select("full_name")
				.eq("id", poliza.created_by)
				.single();
			creador_nombre = creador?.full_name || null;
		}

		// Obtener nombre del validador
		let validador_nombre: string | null = null;
		if (poliza.validado_por) {
			const { data: validador } = await supabase
				.from("profiles")
				.select("full_name")
				.eq("id", poliza.validado_por)
				.single();
			validador_nombre = validador?.full_name || null;
		}

		// Obtener nombre del rechazador
		let rechazador_nombre: string | null = null;
		if (poliza.rechazado_por) {
			const { data: rechazador } = await supabase
				.from("profiles")
				.select("full_name")
				.eq("id", poliza.rechazado_por)
				.single();
			rechazador_nombre = rechazador?.full_name || null;
		}

		// Obtener historial de ediciones (últimos 20 registros)
		const { data: historialData } = await supabase
			.from("polizas_historial_ediciones")
			.select(`
				id,
				accion,
				usuario_id,
				campos_modificados,
				descripcion,
				timestamp,
				profiles!polizas_historial_ediciones_usuario_id_fkey (full_name)
			`)
			.eq("poliza_id", polizaId)
			.order("timestamp", { ascending: false })
			.limit(20);

		const historial = historialData?.map((h) => ({
			id: h.id,
			accion: h.accion,
			usuario_nombre: (h.profiles as { full_name?: string } | null)?.full_name || null,
			campos_modificados: h.campos_modificados,
			descripcion: h.descripcion,
			timestamp: h.timestamp,
		})) || [];

		const polizaDetalle: PolizaDetalle = {
			id: poliza.id,
			numero_poliza: poliza.numero_poliza,
			ramo: poliza.ramo,
			client_id: poliza.client_id,
			client_name,
			client_ci,
			compania_nombre: (poliza.companias_aseguradoras as { nombre?: string } | null)?.nombre || "-",
			inicio_vigencia: poliza.inicio_vigencia,
			fin_vigencia: poliza.fin_vigencia,
			fecha_emision_compania: poliza.fecha_emision_compania,
			prima_total: poliza.prima_total,
			prima_neta: poliza.prima_neta,
			comision: poliza.comision,
			moneda: poliza.moneda,
			estado: poliza.estado,
			modalidad_pago: poliza.modalidad_pago,
			responsable_nombre: (poliza.profiles as { full_name?: string } | null)?.full_name || "-",
			regional_nombre: (poliza.regionales as { nombre?: string } | null)?.nombre || "-",
			categoria_nombre: (poliza.categorias as { nombre?: string } | null)?.nombre || "-",
			created_at: poliza.created_at,
			creador_nombre,
			validado_por: poliza.validado_por || null,
			fecha_validacion: poliza.fecha_validacion || null,
			validador_nombre,
			// Rejection fields
			motivo_rechazo: poliza.motivo_rechazo || null,
			rechazado_por: poliza.rechazado_por || null,
			fecha_rechazo: poliza.fecha_rechazo || null,
			rechazador_nombre,
			puede_editar_hasta: poliza.puede_editar_hasta || null,
			es_renovacion: poliza.es_renovacion || false,
			nro_poliza_anterior: poliza.nro_poliza_anterior || null,
			pagos: pagos || [],
			vehiculos,
			beneficiarios_salud,
			transporte,
			naves,
			niveles_ap_naves,
			equipos,
			documentos: documentos || [],
			historial,
		};

		// Obtener rol del usuario actual
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single();

		return {
			success: true,
			poliza: polizaDetalle,
			userRole: profile?.role || null
		};
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

		// Verificar si necesita aislamiento de datos
		const scope = await getDataScopeFilter();

		// Buscar por número de póliza (búsqueda más común)
		let searchQuery = supabase
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

		if (scope.needsScoping) {
			searchQuery = searchQuery.in("responsable_id", scope.teamMemberIds);
		}

		const { data: polizas } = await searchQuery;

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
				compania_nombre: (poliza.companias_aseguradoras as { nombre?: string } | null)?.nombre || "-",
				inicio_vigencia: poliza.inicio_vigencia,
				fin_vigencia: poliza.fin_vigencia,
				prima_total: poliza.prima_total,
				moneda: poliza.moneda,
				estado: poliza.estado,
				modalidad_pago: poliza.modalidad_pago,
				responsable_nombre: (poliza.profiles as { full_name?: string } | null)?.full_name || "-",
				regional_nombre: (poliza.regionales as { nombre?: string } | null)?.nombre || "-",
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
