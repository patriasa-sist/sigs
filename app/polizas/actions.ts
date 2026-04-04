"use server";

import { createClient } from "@/utils/supabase/server";
import { getDataScopeFilter } from "@/utils/auth/helpers";
import type { CuotaConsolidada, CuotaVigenciaCorrida } from "@/types/anexo";

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
	director_cartera_nombre: string;
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
	// Campos ramo-específicos almacenados en polizas
	regional_asegurado_id: string | null;
	regional_asegurado_nombre: string | null;
	tiene_maternidad: boolean;
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
		_origen_anexo?: string;
		_excluido_por?: string;
	}>;
	// Salud: asegurados (contratante/titular) + niveles + beneficiarios
	asegurados_salud?: Array<{
		id: string;
		client_id: string;
		client_name: string;
		client_ci: string;
		nivel_nombre: string | null;
		rol: string;
	}>;
	niveles_salud?: Array<{
		id: string;
		nombre: string;
		monto: number;
	}>;
	beneficiarios_salud?: Array<{
		id: string;
		nombre_completo: string;
		carnet: string;
		fecha_nacimiento: string;
		genero: string;
		rol: string;
		_origen_anexo?: string;
		_excluido_por?: string;
	}>;
	// Incendio: bienes con items + asegurados
	incendio_bienes?: Array<{
		id: string;
		direccion: string;
		valor_total_declarado: number;
		es_primer_riesgo: boolean;
		items: Array<{ nombre: string; monto: number }>;
		_origen_anexo?: string;
		_excluido_por?: string;
	}>;
	incendio_asegurados?: Array<{
		id: string;
		client_name: string;
		client_ci: string;
	}>;
	// Riesgos Varios: bienes con items + asegurados
	riesgos_varios_bienes?: Array<{
		id: string;
		direccion: string;
		valor_total_declarado: number;
		es_primer_riesgo: boolean;
		items: Array<{ nombre: string; monto: number }>;
		_origen_anexo?: string;
		_excluido_por?: string;
	}>;
	riesgos_varios_asegurados?: Array<{
		id: string;
		client_name: string;
		client_ci: string;
	}>;
	// Responsabilidad Civil
	responsabilidad_civil?: {
		tipo_poliza: string;
		valor_asegurado: number;
	};
	// Vida / Accidentes Personales / Sepelio (genéricos con niveles)
	niveles_cobertura?: Array<{
		id: string;
		nombre: string;
		prima_nivel: number | null;
		coberturas: Record<string, { habilitado: boolean; valor: number }>;
	}>;
	asegurados_nivel?: Array<{
		id: string;
		client_name: string;
		client_ci: string;
		nivel_nombre: string | null;
		cargo: string | null;
		rol: string | null;
		_origen_anexo?: string;
		_excluido_por?: string;
	}>;
	beneficiarios_nivel?: Array<{
		id: string;
		nombre_completo: string;
		carnet: string;
		fecha_nacimiento: string;
		genero: string;
		nivel_nombre: string | null;
		rol: string;
		_origen_anexo?: string;
		_excluido_por?: string;
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
		_origen_anexo?: string;
		_excluido_por?: string;
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
		_origen_anexo?: string;
		_excluido_por?: string;
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
	// Consolidación de anexos activos
	tiene_anexos_activos: boolean;
	cuotas_consolidadas?: CuotaConsolidada[];
	vigencia_corrida?: CuotaVigenciaCorrida[];
	monto_ajustes_total?: number;
};

/**
 * Obtiene todas las pólizas con información básica
 */
export type ObtenerPolizasParams = {
	page?: number;
	pageSize?: number;
	search?: string;
	ramo?: string;
	compania_id?: string;
	estado?: string;
	responsable_id?: string;
};

export type FiltrosPolizasData = {
	ramos: string[];
	ejecutivos: { id: string; nombre: string }[];
	companias: { id: string; nombre: string }[];
	estados: string[];
};

/** Mapea una fila de póliza + mapas de clientes a PolizaListItem */
function mapPolizaToListItem(
	poliza: {
		id: string;
		numero_poliza: string;
		ramo: string;
		client_id: string;
		compania_aseguradora_id: string;
		inicio_vigencia: string;
		fin_vigencia: string;
		prima_total: number;
		moneda: string;
		estado: string;
		modalidad_pago: string;
		responsable_id: string;
		regional_id: string;
		created_at: string;
		companias_aseguradoras: unknown;
		directores_cartera: unknown;
		profiles: unknown;
		regionales: unknown;
	},
	clientsMap: Map<string, { id: string; client_type: string }>,
	naturalClientsMap: Map<string, { client_id: string; primer_nombre: string; segundo_nombre: string; primer_apellido: string; segundo_apellido: string; numero_documento: string }>,
	juridicClientsMap: Map<string, { client_id: string; razon_social: string; nit: string }>,
	unipersonalClientsMap: Map<string, { client_id: string; razon_social: string; nit: string }>,
): PolizaListItem {
	const client = clientsMap.get(poliza.client_id);
	let client_name = "Cliente Desconocido";
	let client_ci = "-";

	if (client?.client_type === "natural" || client?.client_type === "unipersonal") {
		const naturalClient = naturalClientsMap.get(poliza.client_id);
		if (naturalClient) {
			const nombres = [naturalClient.primer_nombre, naturalClient.segundo_nombre].filter(Boolean).join(" ");
			const apellidos = [naturalClient.primer_apellido, naturalClient.segundo_apellido].filter(Boolean).join(" ");
			client_name = `${nombres} ${apellidos}`.trim();
			client_ci = naturalClient.numero_documento || "-";
		}
		if (client?.client_type === "unipersonal") {
			const uni = unipersonalClientsMap.get(poliza.client_id);
			if (uni) {
				client_name = `${client_name} (${uni.razon_social})`;
				client_ci = uni.nit || client_ci;
			}
		}
	} else if (client?.client_type === "juridica") {
		const jur = juridicClientsMap.get(poliza.client_id);
		if (jur) {
			client_name = jur.razon_social;
			client_ci = jur.nit || "-";
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
		director_cartera_nombre: (() => {
			const dc = poliza.directores_cartera as { nombre?: string; apellidos?: string } | null;
			return dc ? `${dc.nombre || ""} ${dc.apellidos || ""}`.trim() : "-";
		})(),
		responsable_nombre: (poliza.profiles as { full_name?: string } | null)?.full_name || "-",
		regional_nombre: (poliza.regionales as { nombre?: string } | null)?.nombre || "-",
		created_at: poliza.created_at,
	};
}

export async function obtenerPolizas(params: ObtenerPolizasParams = {}) {
	const { page = 1, pageSize = 20, search, ramo, compania_id, estado, responsable_id } = params;
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado", polizas: [], total: 0 };

		const scope = await getDataScopeFilter();

		// Si hay búsqueda de texto, obtener client_ids coincidentes en paralelo
		let searchClientIds: string[] = [];
		if (search?.trim()) {
			const q = search.trim();
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

		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

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
				directores_cartera (nombre, apellidos),
				profiles!polizas_responsable_id_fkey (full_name),
				regionales!polizas_regional_id_fkey (nombre)
			`,
				{ count: "exact" }
			)
			.order("created_at", { ascending: false })
			.range(from, to);

		if (scope.needsScoping) query = query.in("responsable_id", scope.teamMemberIds);
		if (ramo) query = query.eq("ramo", ramo);
		if (compania_id) query = query.eq("compania_aseguradora_id", compania_id);
		if (estado) query = query.eq("estado", estado);
		if (responsable_id) query = query.eq("responsable_id", responsable_id);

		if (search?.trim()) {
			if (searchClientIds.length > 0) {
				query = query.or(
					`numero_poliza.ilike.%${search.trim()}%,client_id.in.(${searchClientIds.join(",")})`
				);
			} else {
				query = query.ilike("numero_poliza", `%${search.trim()}%`);
			}
		}

		const { data: polizas, error, count } = await query;

		if (error) {
			console.error("Error obteniendo pólizas:", error);
			return { success: false, error: error.message, polizas: [], total: 0 };
		}

		if (!polizas?.length) return { success: true, polizas: [], total: count ?? 0 };

		// Obtener info de clientes solo para la página actual
		const clientIds = [...new Set(polizas.map((p) => p.client_id))];
		const [
			{ data: clients },
			{ data: naturalClients },
			{ data: juridicClients },
			{ data: unipersonalClients },
		] = await Promise.all([
			supabase.from("clients").select("id, client_type").in("id", clientIds),
			supabase.from("natural_clients")
				.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
				.in("client_id", clientIds),
			supabase.from("juridic_clients").select("client_id, razon_social, nit").in("client_id", clientIds),
			supabase.from("unipersonal_clients").select("client_id, razon_social, nit").in("client_id", clientIds),
		]);

		const clientsMap = new Map(clients?.map((c) => [c.id, c]) ?? []);
		const naturalClientsMap = new Map(naturalClients?.map((c) => [c.client_id, c]) ?? []);
		const juridicClientsMap = new Map(juridicClients?.map((c) => [c.client_id, c]) ?? []);
		const unipersonalClientsMap = new Map(unipersonalClients?.map((c) => [c.client_id, c]) ?? []);

		const polizasFormateadas = polizas.map((p) =>
			mapPolizaToListItem(p as Parameters<typeof mapPolizaToListItem>[0], clientsMap as Map<string, { id: string; client_type: string }>, naturalClientsMap as Map<string, { client_id: string; primer_nombre: string; segundo_nombre: string; primer_apellido: string; segundo_apellido: string; numero_documento: string }>, juridicClientsMap as Map<string, { client_id: string; razon_social: string; nit: string }>, unipersonalClientsMap as Map<string, { client_id: string; razon_social: string; nit: string }>)
		);

		return { success: true, polizas: polizasFormateadas, total: count ?? 0 };
	} catch (error) {
		console.error("Error general obteniendo pólizas:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido", polizas: [], total: 0 };
	}
}

export async function obtenerFiltrosPolizas() {
	const supabase = await createClient();

	try {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado", data: null };

		const scope = await getDataScopeFilter();

		// Obtener ramos, responsable_ids y compania_ids usados en pólizas (scoped, solo 3 columnas)
		let metaQuery = supabase.from("polizas").select("ramo, responsable_id, compania_aseguradora_id");
		if (scope.needsScoping) metaQuery = metaQuery.in("responsable_id", scope.teamMemberIds);
		const { data: meta } = await metaQuery;

		const ramos = [...new Set(meta?.map((p) => p.ramo).filter(Boolean) ?? [])].sort() as string[];
		const responsableIds = [...new Set(meta?.map((p) => p.responsable_id).filter(Boolean) ?? [])] as string[];
		const companiaIds = [...new Set(meta?.map((p) => p.compania_aseguradora_id).filter(Boolean) ?? [])] as string[];

		// Obtener nombres en paralelo
		const [profilesRes, companiasRes] = await Promise.all([
			supabase.from("profiles").select("id, full_name").in("id", responsableIds).order("full_name"),
			supabase.from("companias_aseguradoras").select("id, nombre").in("id", companiaIds).order("nombre"),
		]);

		const data: FiltrosPolizasData = {
			ramos,
			ejecutivos: profilesRes.data?.map((p) => ({ id: p.id, nombre: p.full_name || "" })) ?? [],
			companias: companiasRes.data?.map((c) => ({ id: c.id, nombre: c.nombre })) ?? [],
			estados: ["pendiente", "activa", "vencida", "cancelada", "renovada", "anulada"],
		};

		return { success: true, data };
	} catch (error) {
		console.error("Error obteniendo filtros:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido", data: null };
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
				directores_cartera (nombre, apellidos),
				profiles!polizas_responsable_id_fkey (full_name),
				regionales!polizas_regional_id_fkey (nombre),
				regional_asegurado:regionales!polizas_regional_asegurado_id_fkey (nombre),
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

		if (client?.client_type === "natural" || client?.client_type === "unipersonal") {
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

			if (client?.client_type === "unipersonal") {
				const { data: unipersonalClient } = await supabase
					.from("unipersonal_clients")
					.select("razon_social, nit")
					.eq("client_id", poliza.client_id)
					.single();

				if (unipersonalClient) {
					client_name = `${client_name} (${unipersonalClient.razon_social})`;
					client_ci = unipersonalClient.nit || client_ci;
				}
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

		// --- SALUD ---
		let asegurados_salud: PolizaDetalle["asegurados_salud"];
		let niveles_salud: PolizaDetalle["niveles_salud"];
		let beneficiarios_salud: PolizaDetalle["beneficiarios_salud"];
		if (ramoLower.includes("salud")) {
			// Niveles de cobertura
			const { data: nivelesData } = await supabase
				.from("polizas_salud_niveles")
				.select("id, nombre, monto")
				.eq("poliza_id", polizaId);

			if (nivelesData && nivelesData.length > 0) {
				niveles_salud = nivelesData;
			}
			const nivelMap = new Map(nivelesData?.map(n => [n.id, n.nombre]) || []);

			// Asegurados (contratante/titular)
			const { data: aseguradosData } = await supabase
				.from("polizas_salud_asegurados")
				.select("id, client_id, nivel_id, rol")
				.eq("poliza_id", polizaId);

			if (aseguradosData && aseguradosData.length > 0) {
				// Resolver nombres de clientes
				const clientIds = aseguradosData.map(a => a.client_id);
				const { data: clients } = await supabase
					.from("clients")
					.select("id, client_type")
					.in("id", clientIds);

				const clientMap = new Map<string, { name: string; ci: string }>();
				for (const c of clients || []) {
					if (c.client_type === "natural" || c.client_type === "unipersonal") {
						const { data: nc } = await supabase
							.from("natural_clients")
							.select("primer_nombre, primer_apellido, numero_documento")
							.eq("client_id", c.id)
							.single();
						if (nc) clientMap.set(c.id, { name: `${nc.primer_nombre} ${nc.primer_apellido}`, ci: nc.numero_documento || "-" });
					} else if (c.client_type === "juridica") {
						const { data: jc } = await supabase
							.from("juridic_clients")
							.select("razon_social, nit")
							.eq("client_id", c.id)
							.single();
						if (jc) clientMap.set(c.id, { name: jc.razon_social, ci: jc.nit || "-" });
					}
				}

				asegurados_salud = aseguradosData.map(a => ({
					id: a.id,
					client_id: a.client_id,
					client_name: clientMap.get(a.client_id)?.name || "Desconocido",
					client_ci: clientMap.get(a.client_id)?.ci || "-",
					nivel_nombre: a.nivel_id ? nivelMap.get(a.nivel_id) || null : null,
					rol: a.rol,
				}));
			}

			// Beneficiarios (dependientes/conyugues)
			const { data: beneficiariosData } = await supabase
				.from("polizas_salud_beneficiarios")
				.select("id, nombre_completo, carnet, fecha_nacimiento, genero, rol")
				.eq("poliza_id", polizaId);

			if (beneficiariosData && beneficiariosData.length > 0) {
				beneficiarios_salud = beneficiariosData;
			}
		}

		// --- INCENDIO ---
		let incendio_bienes: PolizaDetalle["incendio_bienes"];
		let incendio_asegurados: PolizaDetalle["incendio_asegurados"];
		if (ramoLower.includes("incendio")) {
			// Bienes asegurados
			const { data: bienesData } = await supabase
				.from("polizas_incendio_bienes")
				.select("id, direccion, valor_total_declarado, es_primer_riesgo")
				.eq("poliza_id", polizaId);

			if (bienesData && bienesData.length > 0) {
				// Obtener items de cada bien
				const bienIds = bienesData.map(b => b.id);
				const { data: itemsData } = await supabase
					.from("polizas_incendio_items")
					.select("bien_id, nombre, monto")
					.in("bien_id", bienIds);

				const itemsByBien = new Map<string, Array<{ nombre: string; monto: number }>>();
				for (const item of itemsData || []) {
					const arr = itemsByBien.get(item.bien_id) || [];
					arr.push({ nombre: item.nombre, monto: Number(item.monto) });
					itemsByBien.set(item.bien_id, arr);
				}

				incendio_bienes = bienesData.map(b => ({
					id: b.id,
					direccion: b.direccion,
					valor_total_declarado: Number(b.valor_total_declarado),
					es_primer_riesgo: b.es_primer_riesgo,
					items: itemsByBien.get(b.id) || [],
				}));
			}

			// Asegurados adicionales
			const { data: asegIncendio } = await supabase
				.from("polizas_incendio_asegurados")
				.select("id, client_id")
				.eq("poliza_id", polizaId);

			if (asegIncendio && asegIncendio.length > 0) {
				const resolved: PolizaDetalle["incendio_asegurados"] = [];
				for (const a of asegIncendio) {
					const { data: cl } = await supabase.from("clients").select("client_type").eq("id", a.client_id).single();
					let name = "Desconocido", ci = "-";
					if (cl?.client_type === "natural") {
						const { data: nc } = await supabase.from("natural_clients").select("primer_nombre, primer_apellido, numero_documento").eq("client_id", a.client_id).single();
						if (nc) { name = `${nc.primer_nombre} ${nc.primer_apellido}`; ci = nc.numero_documento || "-"; }
					} else if (cl?.client_type === "juridica") {
						const { data: jc } = await supabase.from("juridic_clients").select("razon_social, nit").eq("client_id", a.client_id).single();
						if (jc) { name = jc.razon_social; ci = jc.nit || "-"; }
					}
					resolved.push({ id: a.id, client_name: name, client_ci: ci });
				}
				incendio_asegurados = resolved;
			}
		}

		// --- RIESGOS VARIOS ---
		let riesgos_varios_bienes: PolizaDetalle["riesgos_varios_bienes"];
		let riesgos_varios_asegurados: PolizaDetalle["riesgos_varios_asegurados"];
		if (ramoLower.includes("riesgos varios")) {
			const { data: bienesData } = await supabase
				.from("polizas_riesgos_varios_bienes")
				.select("id, direccion, valor_total_declarado, es_primer_riesgo")
				.eq("poliza_id", polizaId);

			if (bienesData && bienesData.length > 0) {
				const bienIds = bienesData.map(b => b.id);
				const { data: itemsData } = await supabase
					.from("polizas_riesgos_varios_items")
					.select("bien_id, nombre, monto")
					.in("bien_id", bienIds);

				const itemsByBien = new Map<string, Array<{ nombre: string; monto: number }>>();
				for (const item of itemsData || []) {
					const arr = itemsByBien.get(item.bien_id) || [];
					arr.push({ nombre: item.nombre, monto: Number(item.monto) });
					itemsByBien.set(item.bien_id, arr);
				}

				riesgos_varios_bienes = bienesData.map(b => ({
					id: b.id,
					direccion: b.direccion,
					valor_total_declarado: Number(b.valor_total_declarado),
					es_primer_riesgo: b.es_primer_riesgo,
					items: itemsByBien.get(b.id) || [],
				}));
			}

			const { data: asegRV } = await supabase
				.from("polizas_riesgos_varios_asegurados")
				.select("id, client_id")
				.eq("poliza_id", polizaId);

			if (asegRV && asegRV.length > 0) {
				const resolved: PolizaDetalle["riesgos_varios_asegurados"] = [];
				for (const a of asegRV) {
					const { data: cl } = await supabase.from("clients").select("client_type").eq("id", a.client_id).single();
					let name = "Desconocido", ci = "-";
					if (cl?.client_type === "natural") {
						const { data: nc } = await supabase.from("natural_clients").select("primer_nombre, primer_apellido, numero_documento").eq("client_id", a.client_id).single();
						if (nc) { name = `${nc.primer_nombre} ${nc.primer_apellido}`; ci = nc.numero_documento || "-"; }
					} else if (cl?.client_type === "juridica") {
						const { data: jc } = await supabase.from("juridic_clients").select("razon_social, nit").eq("client_id", a.client_id).single();
						if (jc) { name = jc.razon_social; ci = jc.nit || "-"; }
					}
					resolved.push({ id: a.id, client_name: name, client_ci: ci });
				}
				riesgos_varios_asegurados = resolved;
			}
		}

		// --- RESPONSABILIDAD CIVIL ---
		let responsabilidad_civil: PolizaDetalle["responsabilidad_civil"];
		if (ramoLower.includes("responsabilidad civil")) {
			const { data: rcData } = await supabase
				.from("polizas_responsabilidad_civil")
				.select("tipo_poliza, valor_asegurado")
				.eq("poliza_id", polizaId)
				.single();

			if (rcData) {
				responsabilidad_civil = {
					tipo_poliza: rcData.tipo_poliza,
					valor_asegurado: Number(rcData.valor_asegurado),
				};
			}
		}

		// --- VIDA / ACCIDENTES PERSONALES / SEPELIO (genéricos con niveles) ---
		let niveles_cobertura: PolizaDetalle["niveles_cobertura"];
		let asegurados_nivel: PolizaDetalle["asegurados_nivel"];
		let beneficiarios_nivel: PolizaDetalle["beneficiarios_nivel"];
		if (ramoLower.includes("vida") || ramoLower.includes("accidentes personales") || ramoLower.includes("sepelio")) {
			const { data: nivelesData } = await supabase
				.from("polizas_niveles")
				.select("id, nombre, prima_nivel, coberturas")
				.eq("poliza_id", polizaId);

			if (nivelesData && nivelesData.length > 0) {
				niveles_cobertura = nivelesData.map(n => ({
					id: n.id,
					nombre: n.nombre,
					prima_nivel: n.prima_nivel != null ? Number(n.prima_nivel) : null,
					coberturas: (n.coberturas || {}) as Record<string, { habilitado: boolean; valor: number }>,
				}));
			}
			const nivelMap = new Map(nivelesData?.map(n => [n.id, n.nombre]) || []);

			const { data: asegNivelData } = await supabase
				.from("polizas_asegurados_nivel")
				.select("id, client_id, nivel_id, cargo, rol")
				.eq("poliza_id", polizaId);

			if (asegNivelData && asegNivelData.length > 0) {
				const clientIds = [...new Set(asegNivelData.map(a => a.client_id))];
				const clientMap = new Map<string, { name: string; ci: string }>();

				// Batch resolve client names
				const { data: clients } = await supabase
					.from("clients")
					.select("id, client_type")
					.in("id", clientIds);

				for (const c of clients || []) {
					if (c.client_type === "natural" || c.client_type === "unipersonal") {
						const { data: nc } = await supabase
							.from("natural_clients")
							.select("primer_nombre, primer_apellido, numero_documento")
							.eq("client_id", c.id)
							.single();
						if (nc) clientMap.set(c.id, { name: `${nc.primer_nombre} ${nc.primer_apellido}`, ci: nc.numero_documento || "-" });
					} else if (c.client_type === "juridica") {
						const { data: jc } = await supabase
							.from("juridic_clients")
							.select("razon_social, nit")
							.eq("client_id", c.id)
							.single();
						if (jc) clientMap.set(c.id, { name: jc.razon_social, ci: jc.nit || "-" });
					}
				}

				asegurados_nivel = asegNivelData.map(a => ({
					id: a.id,
					client_name: clientMap.get(a.client_id)?.name || "Desconocido",
					client_ci: clientMap.get(a.client_id)?.ci || "-",
					nivel_nombre: a.nivel_id ? nivelMap.get(a.nivel_id) || null : null,
					cargo: a.cargo || null,
					rol: a.rol || null,
				}));
			}

			// Beneficiarios (Vida y Accidentes Personales)
			if (ramoLower.includes("vida") || ramoLower.includes("accidentes personales")) {
				const { data: benefData } = await supabase
					.from("polizas_beneficiarios")
					.select("id, nombre_completo, carnet, fecha_nacimiento, genero, nivel_id, rol")
					.eq("poliza_id", polizaId);

				if (benefData && benefData.length > 0) {
					beneficiarios_nivel = benefData.map(b => ({
						id: b.id,
						nombre_completo: b.nombre_completo,
						carnet: b.carnet,
						fecha_nacimiento: b.fecha_nacimiento,
						genero: b.genero,
						nivel_nombre: b.nivel_id ? nivelMap.get(b.nivel_id) || null : null,
						rol: b.rol,
					}));
				}
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

		// ============================================
		// CONSOLIDACIÓN DE ANEXOS ACTIVOS
		// ============================================
		const { data: anexosActivos } = await supabase
			.from("polizas_anexos")
			.select(`
				id, numero_anexo, tipo_anexo, estado, created_at,
				fecha_validacion, fecha_rechazo, motivo_rechazo,
				creador:profiles!created_by (full_name),
				validador:profiles!validado_por (full_name),
				rechazador:profiles!rechazado_por (full_name)
			`)
			.eq("poliza_id", polizaId)
			.order("created_at", { ascending: false });

		const anexosActivosFiltrados = (anexosActivos || []).filter((a) => a.estado === "activo");
		const tiene_anexos_activos = anexosActivosFiltrados.length > 0;
		let cuotas_consolidadas: CuotaConsolidada[] | undefined;
		let vigencia_corrida: CuotaVigenciaCorrida[] | undefined;
		let monto_ajustes_total: number | undefined;

		if (tiene_anexos_activos) {
			// Merge items del ramo
			const anexoIds = anexosActivosFiltrados.map((a) => a.id);
			const anexoNumeroMap = new Map(anexosActivosFiltrados.map((a) => [a.id, a.numero_anexo]));

			// Automotor
			if (vehiculos) {
				const { data: anexoVehiculos } = await supabase
					.from("polizas_anexos_automotor_vehiculos")
					.select("id, anexo_id, accion, original_item_id, placa, valor_asegurado, franquicia, nro_chasis, uso, coaseguro, modelo, ano, color, ejes, nro_motor, nro_asientos, plaza_circulacion")
					.in("anexo_id", anexoIds);

				for (const av of anexoVehiculos || []) {
					const nroAnexo = anexoNumeroMap.get(av.anexo_id) || "?";
					if (av.accion === "exclusion" && av.original_item_id) {
						const original = vehiculos.find((v) => v.id === av.original_item_id);
						if (original) original._excluido_por = nroAnexo;
					} else if (av.accion === "inclusion") {
						vehiculos.push({
							id: av.id,
							placa: av.placa,
							valor_asegurado: Number(av.valor_asegurado),
							franquicia: Number(av.franquicia),
							tipo_vehiculo: null,
							marca: null,
							modelo: av.modelo,
							ano: av.ano?.toString() || null,
							nro_chasis: av.nro_chasis,
							uso: av.uso,
							coaseguro: av.coaseguro != null ? Number(av.coaseguro) : null,
							color: av.color,
							ejes: av.ejes,
							nro_motor: av.nro_motor,
							nro_asientos: av.nro_asientos,
							plaza_circulacion: av.plaza_circulacion,
							_origen_anexo: nroAnexo,
						});
					}
				}
			}

			// Ramos técnicos
			if (equipos) {
				const { data: anexoEquipos } = await supabase
					.from("polizas_anexos_ramos_tecnicos_equipos")
					.select("id, anexo_id, accion, original_item_id, nro_serie, placa, valor_asegurado, franquicia, nro_chasis, uso, coaseguro, modelo, ano, color, nro_motor, plaza_circulacion")
					.in("anexo_id", anexoIds);

				for (const ae of anexoEquipos || []) {
					const nroAnexo = anexoNumeroMap.get(ae.anexo_id) || "?";
					if (ae.accion === "exclusion" && ae.original_item_id) {
						const original = equipos.find((e) => e.id === ae.original_item_id);
						if (original) original._excluido_por = nroAnexo;
					} else if (ae.accion === "inclusion") {
						equipos.push({
							id: ae.id,
							nro_serie: ae.nro_serie,
							placa: ae.placa,
							valor_asegurado: Number(ae.valor_asegurado),
							franquicia: Number(ae.franquicia),
							nro_chasis: ae.nro_chasis,
							uso: ae.uso,
							coaseguro: Number(ae.coaseguro || 0),
							tipo_equipo: null,
							marca_equipo: null,
							modelo: ae.modelo,
							ano: ae.ano,
							color: ae.color,
							nro_motor: ae.nro_motor,
							plaza_circulacion: ae.plaza_circulacion,
							_origen_anexo: nroAnexo,
						});
					}
				}
			}

			// Aeronavegación/Naves
			if (naves) {
				const { data: anexoNaves } = await supabase
					.from("polizas_anexos_aeronavegacion_naves")
					.select("id, anexo_id, accion, original_item_id, matricula, marca, modelo, ano, serie, uso, nro_pasajeros, nro_tripulantes, valor_casco, valor_responsabilidad_civil")
					.in("anexo_id", anexoIds);

				for (const an of anexoNaves || []) {
					const nroAnexo = anexoNumeroMap.get(an.anexo_id) || "?";
					if (an.accion === "exclusion" && an.original_item_id) {
						const original = naves.find((n) => n.id === an.original_item_id);
						if (original) original._excluido_por = nroAnexo;
					} else if (an.accion === "inclusion") {
						naves.push({
							id: an.id,
							matricula: an.matricula,
							marca: an.marca,
							modelo: an.modelo,
							ano: an.ano,
							serie: an.serie,
							uso: an.uso,
							nro_pasajeros: an.nro_pasajeros,
							nro_tripulantes: an.nro_tripulantes,
							valor_casco: Number(an.valor_casco),
							valor_responsabilidad_civil: Number(an.valor_responsabilidad_civil),
							nivel_ap_nombre: null,
							_origen_anexo: nroAnexo,
						});
					}
				}
			}

			// Beneficiarios salud
			if (beneficiarios_salud) {
				const { data: anexoBenef } = await supabase
					.from("polizas_anexos_salud_beneficiarios")
					.select("id, anexo_id, accion, original_item_id, nombre_completo, carnet, fecha_nacimiento, genero, rol")
					.in("anexo_id", anexoIds);

				for (const ab of anexoBenef || []) {
					const nroAnexo = anexoNumeroMap.get(ab.anexo_id) || "?";
					if (ab.accion === "exclusion" && ab.original_item_id) {
						const original = beneficiarios_salud.find((b) => b.id === ab.original_item_id);
						if (original) original._excluido_por = nroAnexo;
					} else if (ab.accion === "inclusion") {
						beneficiarios_salud.push({
							id: ab.id,
							nombre_completo: ab.nombre_completo,
							carnet: ab.carnet,
							fecha_nacimiento: ab.fecha_nacimiento,
							genero: ab.genero,
							rol: ab.rol,
							_origen_anexo: nroAnexo,
						});
					}
				}
			}

			// Incendio bienes
			if (incendio_bienes) {
				const { data: anexoBienes } = await supabase
					.from("polizas_anexos_incendio_bienes")
					.select("id, anexo_id, accion, original_item_id, direccion, valor_total_declarado, es_primer_riesgo, items")
					.in("anexo_id", anexoIds);

				for (const ab of anexoBienes || []) {
					const nroAnexo = anexoNumeroMap.get(ab.anexo_id) || "?";
					if (ab.accion === "exclusion" && ab.original_item_id) {
						const original = incendio_bienes.find((b) => b.id === ab.original_item_id);
						if (original) original._excluido_por = nroAnexo;
					} else if (ab.accion === "inclusion") {
						incendio_bienes.push({
							id: ab.id,
							direccion: ab.direccion,
							valor_total_declarado: Number(ab.valor_total_declarado),
							es_primer_riesgo: ab.es_primer_riesgo,
							items: (ab.items as Array<{ nombre: string; monto: number }>) || [],
							_origen_anexo: nroAnexo,
						});
					}
				}
			}

			// Riesgos Varios bienes
			if (riesgos_varios_bienes) {
				const { data: anexoBienes } = await supabase
					.from("polizas_anexos_riesgos_varios_bienes")
					.select("id, anexo_id, accion, original_item_id, direccion, valor_total_declarado, es_primer_riesgo, items")
					.in("anexo_id", anexoIds);

				for (const ab of anexoBienes || []) {
					const nroAnexo = anexoNumeroMap.get(ab.anexo_id) || "?";
					if (ab.accion === "exclusion" && ab.original_item_id) {
						const original = riesgos_varios_bienes.find((b) => b.id === ab.original_item_id);
						if (original) original._excluido_por = nroAnexo;
					} else if (ab.accion === "inclusion") {
						riesgos_varios_bienes.push({
							id: ab.id,
							direccion: ab.direccion,
							valor_total_declarado: Number(ab.valor_total_declarado),
							es_primer_riesgo: ab.es_primer_riesgo,
							items: (ab.items as Array<{ nombre: string; monto: number }>) || [],
							_origen_anexo: nroAnexo,
						});
					}
				}
			}

			// Asegurados con nivel (Vida/AP/Sepelio)
			if (asegurados_nivel) {
				const { data: anexoAseg } = await supabase
					.from("polizas_anexos_asegurados_nivel")
					.select("id, anexo_id, accion, original_item_id, client_id, nivel_id, cargo")
					.in("anexo_id", anexoIds);

				for (const aa of anexoAseg || []) {
					const nroAnexo = anexoNumeroMap.get(aa.anexo_id) || "?";
					if (aa.accion === "exclusion" && aa.original_item_id) {
						const original = asegurados_nivel.find((a) => a.id === aa.original_item_id);
						if (original) original._excluido_por = nroAnexo;
					} else if (aa.accion === "inclusion") {
						asegurados_nivel.push({
							id: aa.id,
							client_name: "Incluido por anexo",
							client_ci: "-",
							nivel_nombre: null,
							cargo: aa.cargo || null,
							rol: null,
							_origen_anexo: nroAnexo,
						});
					}
				}
			}

			// Cuotas consolidadas
			const { data: cuotasConsolResult } = await supabase
				.from("polizas_anexos_pagos")
				.select(`
					id, anexo_id, cuota_original_id, tipo, numero_cuota,
					monto, fecha_vencimiento, estado, observaciones,
					polizas_anexos!inner (id, numero_anexo, tipo_anexo, estado)
				`)
				.in("anexo_id", anexoIds);

			if (cuotasConsolResult && cuotasConsolResult.length > 0) {
				const ajustes = cuotasConsolResult.filter((p) => p.tipo === "ajuste");
				const vc = cuotasConsolResult.filter((p) => p.tipo === "vigencia_corrida");

				// Build consolidated cuotas
				const ajustesPorCuota = new Map<string, typeof ajustes>();
				for (const a of ajustes) {
					if (!a.cuota_original_id) continue;
					const arr = ajustesPorCuota.get(a.cuota_original_id) || [];
					arr.push(a);
					ajustesPorCuota.set(a.cuota_original_id, arr);
				}

				cuotas_consolidadas = (pagos || []).map((cuota) => {
					const cuotaAjustes = ajustesPorCuota.get(cuota.id) || [];
					const montoAjustes = cuotaAjustes.reduce((sum, a) => sum + Number(a.monto), 0);
					return {
						cuota_original_id: cuota.id,
						numero_cuota: cuota.numero_cuota,
						monto_original: Number(cuota.monto),
						monto_ajustes: montoAjustes,
						monto_consolidado: Number(cuota.monto) + montoAjustes,
						fecha_vencimiento: cuota.fecha_vencimiento,
						estado: cuota.estado || "pendiente",
						fecha_pago: cuota.fecha_pago || undefined,
						ajustes: cuotaAjustes.map((a) => {
							const anexoInfo = a.polizas_anexos as unknown as { id: string; numero_anexo: string; tipo_anexo: string };
							return {
								anexo_id: anexoInfo.id,
								numero_anexo: anexoInfo.numero_anexo,
								tipo_anexo: anexoInfo.tipo_anexo as "inclusion" | "exclusion" | "anulacion",
								monto_delta: Number(a.monto),
							};
						}),
					};
				});

				vigencia_corrida = vc.map((p) => {
					const anexoInfo = p.polizas_anexos as unknown as { id: string; numero_anexo: string };
					return {
						anexo_id: anexoInfo.id,
						numero_anexo: anexoInfo.numero_anexo,
						monto: Number(p.monto),
						fecha_vencimiento: p.fecha_vencimiento || "",
						estado: p.estado || "pendiente",
						observaciones: p.observaciones || undefined,
					};
				});

				monto_ajustes_total = cuotasConsolResult.reduce((sum, p) => sum + Number(p.monto), 0);
			}
		}

		// Historial de anexos (todos, no solo activos)
		const anexoHistorial = (anexosActivos || []).flatMap((a) => {
			const creador = (a.creador as unknown as { full_name: string } | null)?.full_name || null;
			const validador = (a.validador as unknown as { full_name: string } | null)?.full_name || null;
			const rechazador = (a.rechazador as unknown as { full_name: string } | null)?.full_name || null;
			const tipoLabel = a.tipo_anexo === "inclusion" ? "inclusión" : a.tipo_anexo === "exclusion" ? "exclusión" : "anulación";
			const entries: typeof historial = [];

			entries.push({
				id: `anexo-created-${a.id}`,
				accion: "anexo_creacion",
				usuario_nombre: creador,
				campos_modificados: null,
				descripcion: `Anexo ${a.numero_anexo} (${tipoLabel}) creado`,
				timestamp: a.created_at,
			});

			if (a.fecha_validacion) {
				entries.push({
					id: `anexo-validated-${a.id}`,
					accion: "anexo_validacion",
					usuario_nombre: validador,
					campos_modificados: null,
					descripcion: `Anexo ${a.numero_anexo} (${tipoLabel}) validado`,
					timestamp: a.fecha_validacion,
				});
			}

			if (a.fecha_rechazo) {
				entries.push({
					id: `anexo-rejected-${a.id}`,
					accion: "anexo_rechazo",
					usuario_nombre: rechazador,
					campos_modificados: null,
					descripcion: `Anexo ${a.numero_anexo} rechazado: ${a.motivo_rechazo || ""}`,
					timestamp: a.fecha_rechazo,
				});
			}

			return entries;
		});

		// Merge and sort all historial chronologically
		const historialCompleto = [...historial, ...anexoHistorial]
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, 30);

		const regionalAseguradoNombre = (poliza.regional_asegurado as { nombre?: string } | null)?.nombre || null;

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
			director_cartera_nombre: (() => {
				const dc = poliza.directores_cartera as { nombre?: string; apellidos?: string } | null;
				return dc ? `${dc.nombre || ""} ${dc.apellidos || ""}`.trim() : "-";
			})(),
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
			regional_asegurado_id: poliza.regional_asegurado_id || null,
			regional_asegurado_nombre: regionalAseguradoNombre,
			tiene_maternidad: poliza.tiene_maternidad ?? false,
			pagos: pagos || [],
			vehiculos,
			asegurados_salud,
			niveles_salud,
			beneficiarios_salud,
			incendio_bienes,
			incendio_asegurados,
			riesgos_varios_bienes,
			riesgos_varios_asegurados,
			responsabilidad_civil,
			niveles_cobertura,
			asegurados_nivel,
			beneficiarios_nivel,
			transporte,
			naves,
			niveles_ap_naves,
			equipos,
			documentos: documentos || [],
			historial: historialCompleto,
			tiene_anexos_activos,
			cuotas_consolidadas,
			vigencia_corrida,
			monto_ajustes_total,
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
				directores_cartera (nombre, apellidos),
				profiles!polizas_responsable_id_fkey (full_name),
				regionales!polizas_regional_id_fkey (nombre)
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
				director_cartera_nombre: (() => {
					const dc = poliza.directores_cartera as { nombre?: string; apellidos?: string } | null;
					return dc ? `${dc.nombre || ""} ${dc.apellidos || ""}`.trim() : "-";
				})(),
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
