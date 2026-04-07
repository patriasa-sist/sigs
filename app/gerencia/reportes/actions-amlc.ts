"use server";

import { createClient } from "@/utils/supabase/server";
import { checkPermission } from "@/utils/auth/helpers";

// ============================================================================
// AMLC LOOKUP TABLES (based on PARAMETROS_FINAL_v53)
// ============================================================================

const SUCURSALES = [
	{ reg_id: "SC", codigo_sucursal: "0001" },
	{ reg_id: "LP", codigo_sucursal: "0002" },
	{ reg_id: "CBBA", codigo_sucursal: "0003" },
	{ reg_id: "SUCRE", codigo_sucursal: "0004" },
	{ reg_id: "SD", codigo_sucursal: "SD" },
];

const RANGOS_TIEMPO = [
	{ codigo: 1, min: 0, max: 17, tipo: 1 },
	{ codigo: 2, min: 18, max: 25, tipo: 1 },
	{ codigo: 3, min: 26, max: 30, tipo: 1 },
	{ codigo: 4, min: 31, max: 40, tipo: 1 },
	{ codigo: 5, min: 41, max: 50, tipo: 1 },
	{ codigo: 6, min: 51, max: 60, tipo: 1 },
	{ codigo: 7, min: 61, max: 70, tipo: 1 },
	{ codigo: 8, min: 71, max: 80, tipo: 1 },
	{ codigo: 9, min: 81, max: 100, tipo: 1 },
	{ codigo: 11, min: 0, max: 2, tipo: 2 },
	{ codigo: 12, min: 3, max: 5, tipo: 2 },
	{ codigo: 13, min: 6, max: 8, tipo: 2 },
	{ codigo: 14, min: 8, max: 10, tipo: 2 },
	{ codigo: 15, min: 11, max: 100, tipo: 2 },
];

const RANGOS_INGRESO = [
	{ codigo: 1, min: 0, max: 2500, tipo: 1 },
	{ codigo: 2, min: 2501, max: 5000, tipo: 1 },
	{ codigo: 3, min: 5001, max: 10000, tipo: 1 },
	{ codigo: 4, min: 10001, max: 15000, tipo: 1 },
	{ codigo: 5, min: 15001, max: 20000, tipo: 1 },
	{ codigo: 6, min: 20001, max: 50000, tipo: 1 },
	{ codigo: 7, min: 0, max: 20000, tipo: 2 },
	{ codigo: 8, min: 20001, max: 50000, tipo: 2 },
	{ codigo: 9, min: 50001, max: 100000, tipo: 2 },
	{ codigo: 10, min: 100001, max: 500000, tipo: 2 },
	{ codigo: 11, min: 500001, max: 1000000, tipo: 2 },
	{ codigo: 12, min: 1000001, max: 100000000, tipo: 2 },
];

// ============================================================================
// MAPPING HELPERS
// ============================================================================

function mapRegionalToSucursal(nombreRegional: string | null | undefined): string {
	if (!nombreRegional) return "SD";
	const lower = nombreRegional.toLowerCase();
	if (lower.includes("santa cruz") || lower.includes("sc")) return "0001";
	if (lower.includes("la paz") || lower.includes("paz")) return "0002";
	if (lower.includes("cochabamba") || lower.includes("cbba")) return "0003";
	if (lower.includes("sucre") || lower.includes("chuquisaca")) return "0004";
	return "0001"; // default
}

function mapRamoToProducto(ramo: string | null | undefined): string {
	if (!ramo) return "01M9109";
	const lower = ramo.toLowerCase();
	if (lower.includes("automotor")) return "01M9105";
	if (lower.includes("salud")) return "01M9111";
	if (lower.includes("incendio")) return "01M9101";
	if (lower.includes("transporte")) return "01M9103";
	if (lower.includes("técnico") || lower.includes("tecnico")) return "01M9107";
	if (lower.includes("responsabilidad civil")) return "01M9108";
	if (lower.includes("varios") || lower.includes("misceláneo") || lower.includes("miscelaneo")) return "01M9109";
	if (lower.includes("aeronaveg")) return "01M9106";
	if (lower.includes("accidente")) return "01M9112";
	if (lower.includes("fianza")) return "01M9221";
	if (lower.includes("vida")) return "01M9342";
	return "01M9109";
}

function mapMoneda(moneda: string | null | undefined): string {
	if (!moneda) return "BOB";
	const lower = moneda.toLowerCase();
	if (lower === "usd" || lower.includes("dólar") || lower.includes("dolar") || lower === "$us") return "USD";
	return "BOB";
}

function mapEstadoPoliza(estado: string | null | undefined, finVigencia: string | null | undefined): string {
	if (!estado) return "VIG";
	const lower = estado.toLowerCase();
	if (lower === "cancelada" || lower === "anulada") return "ANU";
	if (lower === "vencida") return "NVG";
	if (lower === "activa") {
		if (finVigencia) {
			const fin = new Date(finVigencia);
			if (fin < new Date()) return "NVG";
		}
		return "VIG";
	}
	return "VIG";
}

function mapTipoCertificado(esRenovacion: boolean | null | undefined, estado: string | null | undefined): string {
	const lower = (estado || "").toLowerCase();
	if (lower === "cancelada" || lower === "anulada") return "ANUL";
	if (esRenovacion) return "RENV";
	return "NUEV";
}

function mapTipoCliente(clientType: string | null | undefined): string {
	if (!clientType) return "SD";
	return clientType === "natural" ? "NAT" : "JUR";
}

function mapTipoDocumento(tipoDoc: string | null | undefined, hasDoc: boolean): string {
	if (!hasDoc) return "SD";
	if (!tipoDoc) return "CI";
	const lower = tipoDoc.toLowerCase();
	if (lower === "nit") return "NIT";
	return "CI";
}

function mapGenero(genero: string | null | undefined): string {
	if (!genero) return "NA";
	const lower = genero.toLowerCase();
	if (lower === "masculino" || lower === "m" || lower === "mas") return "MAS";
	if (lower === "femenino" || lower === "f" || lower === "fem") return "FEM";
	return "NA";
}

function mapEstadoCivil(estadoCivil: string | null | undefined): string {
	if (!estadoCivil) return "NA";
	const lower = estadoCivil.toLowerCase();
	if (lower === "soltero" || lower === "soltera") return "SOL";
	if (lower === "casado" || lower === "casada") return "CAS";
	if (lower === "divorciado" || lower === "divorciada") return "DIV";
	if (lower === "viudo" || lower === "viuda") return "VIU";
	if (lower.includes("union") || lower.includes("libre")) return "ULI";
	return "NA";
}

function mapActividadEconomica(actividad: string | null | undefined): string {
	if (!actividad) return "SD";
	const upper = actividad.toUpperCase();
	if (upper.includes("AGRICULTUR") || upper.includes("AGRO")) return "AGR";
	if (upper.includes("GANAD") || upper.includes("PECUARIO")) return "GAN";
	if (upper.includes("PESCA")) return "PES";
	if (upper.includes("MINER")) return "MIN";
	if (
		upper.includes("INDUSTRIA") ||
		upper.includes("MANUFACTUR") ||
		upper.includes("CONFECCION") ||
		upper.includes("FABRICA")
	)
		return "IND";
	if (upper.includes("ENERGI") || upper.includes("ELECTRICIDAD") || upper.includes("COMBUSTIBLE")) return "ENE";
	if (upper.includes("TURISMO") || upper.includes("HOTELERIA") || upper.includes("GASTRONOM")) return "TUR";
	if (upper.includes("BANCA") || upper.includes("FINANZ") || upper.includes("CREDITO") || upper.includes("SEGUROS"))
		return "BFI";
	if (
		upper.includes("EDUCACI") ||
		upper.includes("DOCENTE") ||
		upper.includes("MAESTRO") ||
		upper.includes("PROFESOR") ||
		upper.includes("UNIVERSIDAD") ||
		upper.includes("COLEGIO")
	)
		return "EDU";
	if (upper.includes("SALUD") || upper.includes("MEDICO") || upper.includes("MEDICA") || upper.includes("DOCTOR") || upper.includes("ENFERM"))
		return "SAL";
	if (
		upper.includes("CONSTRUCCI") ||
		upper.includes("ARQUITECT") ||
		upper.includes("INGENI")
	)
		return "CON";
	if (upper.includes("TECNOLOG") || upper.includes("SOFTWARE") || upper.includes("INFORMAT") || upper.includes("SISTEM"))
		return "TIC";
	if (upper.includes("EXPORTACI") || upper.includes("IMPORT") || upper.includes("EXTERIOR")) return "CEX";
	if (upper.includes("ARTE") || upper.includes("ARTISTA")) return "ART";
	if (upper.includes("CULTURA")) return "CUL";
	if (
		upper.includes("COMERCIO") ||
		upper.includes("VENTA") ||
		upper.includes("VENTAS") ||
		upper.includes("COMERCIALIZACI")
	)
		return "COM";
	if (
		upper.includes("SERVICIO") ||
		upper.includes("EJECUTIVO") ||
		upper.includes("DIRECTOR") ||
		upper.includes("PILOT") ||
		upper.includes("LABORES") ||
		upper.includes("AMA DE CASA") ||
		upper.includes("DEPENDIENTE") ||
		upper.includes("CONSULTOR") ||
		upper.includes("JUBILAD") ||
		upper.includes("INDEPENDIENTE")
	)
		return "SRV";
	return "OTR";
}

function mapNacionalidad(nacionalidad: string | null | undefined): string {
	if (!nacionalidad) return "BOL";
	const lower = nacionalidad.toLowerCase();
	if (lower.includes("bolivi")) return "BOL";
	if (lower.includes("argentin")) return "ARG";
	if (lower.includes("venezuel")) return "VEN";
	if (lower.includes("brasil") || lower.includes("brazil")) return "BRA";
	if (lower.includes("chile") || lower.includes("chilen")) return "CHL";
	if (lower.includes("ecuador")) return "ECU";
	if (lower.includes("paraguay") || lower.includes("paraguayo")) return "PRY";
	if (lower.includes("canad")) return "CAN";
	if (lower.includes("estados unidos") || lower.includes("usa") || lower.includes("eeuu") || lower.includes("americano")) return "USA";
	if (lower.includes("cuba")) return "CUB";
	if (lower.includes("haiti")) return "HTI";
	if (lower.includes("mexico") || lower.includes("mexicano")) return "MEX";
	if (lower.includes("españ") || lower.includes("spain") || lower.includes("español")) return "ESP";
	if (lower.includes("franc")) return "FRA";
	if (lower.includes("ital")) return "ITA";
	if (lower.includes("rus")) return "RUS";
	if (lower.includes("chin")) return "CHN";
	if (lower.includes("japon") || lower.includes("japón")) return "JPN";
	return "BOL"; // default to Bolivia
}

function mapResidencia(paisResidencia: string | null | undefined): string {
	if (!paisResidencia) return "BOL";
	const lower = paisResidencia.toLowerCase();
	if (lower.includes("bolivi") || lower === "bo" || lower === "") return "BOL";
	return "EXT";
}

function mapTipoSociedad(tipoSociedad: string | null | undefined, isNatural: boolean): string {
	if (isNatural) return "0";
	if (!tipoSociedad) return "SD";
	const upper = tipoSociedad.toUpperCase();
	if (upper.includes("SRL") || upper.includes("S.R.L")) return "SRL";
	if (upper.includes("SA") || upper.includes("S.A.")) return "SA";
	if (upper === "UNIPERSONAL" || upper.includes("UNIPERS")) return "UNI";
	if (upper.includes("FUNDACION") || upper.includes("FUNDACIÓN")) return "FUN";
	if (upper.includes("ASOCIACION") || upper.includes("ASOCIACIÓN")) return "AAP";
	if (upper.includes("LIMITADA")) return "LIM";
	if (upper.includes("MICROEMPRESA")) return "MIC";
	return "SD";
}

function calcularEdad(fechaNacimiento: string | null | undefined): number | null {
	if (!fechaNacimiento) return null;
	const birth = new Date(fechaNacimiento);
	if (isNaN(birth.getTime())) return null;
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const m = today.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
	return age >= 0 && age <= 120 ? age : null;
}

function getRangoTiempo(edad: number | null, tipoPersona: 1 | 2): number {
	if (edad === null) return tipoPersona === 1 ? 2 : 11;
	const rango = RANGOS_TIEMPO.find((r) => r.tipo === tipoPersona && edad >= r.min && edad <= r.max);
	return rango?.codigo ?? (tipoPersona === 1 ? 2 : 11);
}

function getRangoIngreso(montoIngreso: number, tipoPersona: 1 | 2): number {
	const rango = RANGOS_INGRESO.find(
		(r) => r.tipo === tipoPersona && montoIngreso >= r.min && montoIngreso <= r.max
	);
	return rango?.codigo ?? (tipoPersona === 1 ? 1 : 7);
}

function limpiarDoc(doc: string | null | undefined): string {
	if (!doc) return "";
	return String(doc).replace(/[\s.]/g, "").replace(/^0+(?=\d)/, "");
}

// ============================================================================
// TYPES
// ============================================================================

export interface AMLCCliente {
	suc_codigo: string;
	tcli_codigo: string;
	tpep_codigo: string;
	tlis_codigo: string;
	aeco_codigo: string;
	aeco_codigo2: string;
	aeco_codigo3: string;
	nac_codigo: string;
	pres_codigo: string;
	rtie_codigo: number;
	ring_codigo: number;
	reco_codigo: string;
	ftra_codigo: string;
	tdoc_codigo: string;
	tgru_codigo: string;
	est_codigo: string;
	codigo_cliente: string;
	nro_documento: string;
	extension: string;
	fecha_nacimiento: string;
	edad: number | string;
	monto_ingreso: number;
	monto_ingreso2: string;
	monto_ingreso3: string;
	fecha_registro: string;
}

export interface AMLCDetalle {
	codigo_cliente: string;
	gen_codigo: string;
	eciv_codigo: string;
	nedu_codigo: string;
	tviv_codigo: string;
	nombre_razon: string;
	apaterno: string;
	amaterno: string;
	direccion: string;
	zona: string;
	telefono: string;
	celular: string;
	fax: string;
	email: string;
	apcasado: string;
	pais_residencia: string;
	profesion: string;
	lugar_trabajo: string;
	cargo: string;
	fecha_ingreso_trabajo: string;
	nit: string;
	registro_comercio: string;
	año_ingreso_trabajo: string;
	direccion_comercial: string;
	lugar_nacimiento: string;
	representante_nrodocumento: string;
	representante_nombre_apellido: string;
	dempresa_nrodocumento: string;
	dempresa_nombre_apellido: string;
	codigo_tsociedad: string;
}

export interface AMLCCuenta {
	codigo_cliente: string;
	suc_codigo: string;
	pro_codigo: string;
	mon_codigo: string;
	ofon_codigo: string;
	pcue_codigo: string;
	ring_codigo: number;
	est_codigo: string;
	nrocuenta: string;
	fecha_apertura: string;
	monto_prima: number;
	monto_saldoprima: string;
	fecha_saldoprima: string;
	monto_asegurado: string;
	nro_debito: string;
	monto_valorcomercial: string;
	nro_credito: string;
	fecha_vencimiento: string;
	can_codigo: string;
	monto_asegurado_anterior: string;
	tipo_certificiado_codigo: string;
}

export interface AMLCFilters {
	fecha_desde: string;
	fecha_hasta: string;
	estado_poliza: "activa" | "all";
}

export type AMLCResponse =
	| {
			success: true;
			data: {
				clientes: AMLCCliente[];
				clientes_detalles: AMLCDetalle[];
				cuentas: AMLCCuenta[];
				meta: { total_clientes: number; total_polizas: number; fecha_desde: string; fecha_hasta: string };
			};
	  }
	| { success: false; error: string };

// ============================================================================
// SERVER ACTION
// ============================================================================

export async function exportarAMLC(filtros: AMLCFilters): Promise<AMLCResponse> {
	const { allowed } = await checkPermission("gerencia.exportar");
	if (!allowed) {
		return { success: false, error: "No tiene permisos para exportar reportes" };
	}

	const supabase = await createClient();

	try {
		// Query polizas with client data and regional (filtered by date range)
		let query = supabase.from("polizas").select(`
			id,
			numero_poliza,
			ramo,
			moneda,
			prima_total,
			inicio_vigencia,
			fin_vigencia,
			es_renovacion,
			estado,
			created_at,
			client:clients!client_id (
				id,
				client_type,
				status,
				created_at,
				natural_clients (
					primer_nombre,
					segundo_nombre,
					primer_apellido,
					segundo_apellido,
					tipo_documento,
					numero_documento,
					extension_ci,
					nacionalidad,
					fecha_nacimiento,
					estado_civil,
					direccion,
					profesion_oficio,
					celular,
					actividad_economica,
					lugar_trabajo,
					correo_electronico,
					pais_residencia,
					genero,
					nivel_ingresos,
					cargo,
					anio_ingreso,
					nit,
					domicilio_comercial
				),
				juridic_clients (
					razon_social,
					tipo_sociedad,
					tipo_documento,
					nit,
					matricula_comercio,
					pais_constitucion,
					direccion_legal,
					actividad_economica,
					correo_electronico,
					telefono
				)
			),
			regional:regionales!regional_id (
				nombre
			)
		`);

		query = query.gte("inicio_vigencia", filtros.fecha_desde);
		query = query.lte("inicio_vigencia", filtros.fecha_hasta);

		if (filtros.estado_poliza === "activa") {
			query = query.eq("estado", "activa");
		}

		const { data: polizas, error } = await query.order("numero_poliza", { ascending: true });

		if (error) {
			console.error("AMLC query error:", error);
			return { success: false, error: "Error al obtener datos para el reporte AMLC" };
		}

		if (!polizas || polizas.length === 0) {
			return { success: false, error: "No se encontraron pólizas para el período seleccionado" };
		}

		// Helper to get client as typed object (Supabase infers as array for relations)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		type ClientRow = Record<string, any>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const getClient = (p: any): ClientRow | null => p.client as ClientRow | null;

		// Deduplicate clients (one entry per unique client)
		const clienteMap = new Map<string, ClientRow>();
		for (const p of polizas) {
			const client = getClient(p);
			if (client && !clienteMap.has(client.id)) {
				clienteMap.set(client.id, client);
			}
		}

		// Build a map of clientId -> sucursal (use regional from first poliza of this client)
		const clienteSucursalMap = new Map<string, string>();
		for (const p of polizas) {
			const client = getClient(p);
			if (client && !clienteSucursalMap.has(client.id)) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const regional = (p.regional as any)?.nombre as string | null;
				clienteSucursalMap.set(client.id, mapRegionalToSucursal(regional));
			}
		}

		// Build clientId -> ring_codigo for use in cuentas
		const clienteRingoMap = new Map<string, number>();

		// Transform clients
		const clientes: AMLCCliente[] = [];
		const clientes_detalles: AMLCDetalle[] = [];

		for (const [clientId, client] of clienteMap) {
			if (!client) continue;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const nat = (client as any).natural_clients as Record<string, unknown> | null;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const jur = (client as any).juridic_clients as Record<string, unknown> | null;
			const isNatural = client.client_type === "natural";
			const tipoPersona: 1 | 2 = isNatural ? 1 : 2;
			const sucursal = clienteSucursalMap.get(clientId) ?? "0001";

			// Document
			const doc = isNatural
				? limpiarDoc(nat?.numero_documento as string)
				: limpiarDoc(jur?.nit as string);
			const codigoCliente = doc || clientId.slice(0, 8);

			// Age and rango tiempo
			const edad = isNatural ? calcularEdad(nat?.fecha_nacimiento as string) : null;
			const rangoTiempo = getRangoTiempo(edad, tipoPersona);

			// Income
			const nivelIngresos = isNatural
				? parseFloat((nat?.nivel_ingresos as string) || "0") || 0
				: 0;
			const rangoIngreso = getRangoIngreso(nivelIngresos, tipoPersona);
			clienteRingoMap.set(clientId, rangoIngreso);

			// Activity
			const actividad = isNatural
				? (nat?.actividad_economica as string)
				: (jur?.actividad_economica as string);
			const actCodigo = mapActividadEconomica(actividad);

			// Estado del cliente
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const estCodigo = (client as any).status === "inactive" ? "NVG" : "VIG";

			// Tipo documento
			const tipoDoc = isNatural
				? (nat?.tipo_documento as string)
				: (jur?.tipo_documento as string);
			const docCodigo = mapTipoDocumento(tipoDoc, !!doc);

			// Nacionalidad y residencia (solo natural)
			const nacCodigo = isNatural ? mapNacionalidad(nat?.nacionalidad as string) : "BOL";
			const presCodigo = isNatural
				? mapResidencia(nat?.pais_residencia as string)
				: mapResidencia(jur?.pais_constitucion as string);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const fechaRegistro = ((client as any).created_at as string)?.slice(0, 10) ?? "";

			clientes.push({
				suc_codigo: sucursal,
				tcli_codigo: mapTipoCliente(client.client_type),
				tpep_codigo: "NOPEP",
				tlis_codigo: "NA",
				aeco_codigo: actCodigo,
				aeco_codigo2: "",
				aeco_codigo3: "",
				nac_codigo: nacCodigo,
				pres_codigo: presCodigo,
				rtie_codigo: rangoTiempo,
				ring_codigo: rangoIngreso,
				reco_codigo: "NA",
				ftra_codigo: "NA",
				tdoc_codigo: docCodigo,
				tgru_codigo: "SD",
				est_codigo: estCodigo,
				codigo_cliente: codigoCliente,
				nro_documento: codigoCliente,
				extension: isNatural ? ((nat?.extension_ci as string) ?? "") : "",
				fecha_nacimiento: isNatural ? ((nat?.fecha_nacimiento as string) ?? "") : "",
				edad: edad !== null ? edad : "",
				monto_ingreso: nivelIngresos,
				monto_ingreso2: "",
				monto_ingreso3: "",
				fecha_registro: fechaRegistro,
			});

			// Details
			const genCodigo = isNatural ? mapGenero(nat?.genero as string) : "NA";
			const ecivCodigo = isNatural ? mapEstadoCivil(nat?.estado_civil as string) : "NA";

			const nombreRazon = isNatural
				? [
						nat?.primer_nombre,
						nat?.segundo_nombre,
						nat?.primer_apellido,
						nat?.segundo_apellido,
					]
						.filter(Boolean)
						.join(" ")
						.trim()
				: ((jur?.razon_social as string) ?? "");

			clientes_detalles.push({
				codigo_cliente: codigoCliente,
				gen_codigo: genCodigo,
				eciv_codigo: ecivCodigo,
				nedu_codigo: "NA",
				tviv_codigo: "NA",
				nombre_razon: nombreRazon,
				apaterno: isNatural ? ((nat?.primer_apellido as string) ?? "") : "",
				amaterno: isNatural ? ((nat?.segundo_apellido as string) ?? "") : "",
				direccion: isNatural
					? ((nat?.direccion as string) ?? "").replace(/[\r\n]+/g, " ").trim()
					: ((jur?.direccion_legal as string) ?? "").replace(/[\r\n]+/g, " ").trim(),
				zona: "",
				telefono: "",
				celular: isNatural ? ((nat?.celular as string) ?? "").replace(/\D/g, "") : ((jur?.telefono as string) ?? "").replace(/\D/g, ""),
				fax: "",
				email: isNatural ? ((nat?.correo_electronico as string) ?? "") : ((jur?.correo_electronico as string) ?? ""),
				apcasado: "",
				pais_residencia: isNatural ? ((nat?.pais_residencia as string) ?? "") : "",
				profesion: isNatural ? ((nat?.profesion_oficio as string) ?? "") : "",
				lugar_trabajo: isNatural ? ((nat?.lugar_trabajo as string) ?? "") : "",
				cargo: isNatural ? ((nat?.cargo as string) ?? "") : "",
				fecha_ingreso_trabajo: "",
				nit: isNatural
					? ((nat?.nit as string) ?? "")
					: ((jur?.nit as string) ?? ""),
				registro_comercio: isNatural ? "" : ((jur?.matricula_comercio as string) ?? ""),
				año_ingreso_trabajo: isNatural && nat?.anio_ingreso ? String(nat.anio_ingreso) : "",
				direccion_comercial: isNatural ? ((nat?.domicilio_comercial as string) ?? "") : "",
				lugar_nacimiento: "",
				representante_nrodocumento: "",
				representante_nombre_apellido: "",
				dempresa_nrodocumento: "",
				dempresa_nombre_apellido: "",
				codigo_tsociedad: mapTipoSociedad(isNatural ? null : (jur?.tipo_sociedad as string), isNatural),
			});
		}

		// Transform polizas to cuentas
		const cuentas: AMLCCuenta[] = polizas
			.filter((p) => p.client !== null)
			.map((p) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const client = p.client as any;
				const isNatural = client?.client_type === "natural";
				const nat = client?.natural_clients as Record<string, unknown> | null;
				const jur = client?.juridic_clients as Record<string, unknown> | null;

				const doc = isNatural
					? limpiarDoc(nat?.numero_documento as string)
					: limpiarDoc(jur?.nit as string);
				const codigoCliente = doc || ((client?.id as string)?.slice(0, 8) ?? "SD");

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const regional = (p.regional as any)?.nombre as string | null;
				const sucursal = mapRegionalToSucursal(regional);

				const tipoPersona: 1 | 2 = isNatural ? 1 : 2;
				const ringCodigo = clienteRingoMap.get(client?.id ?? "") ?? (tipoPersona === 1 ? 1 : 7);

				return {
					codigo_cliente: codigoCliente,
					suc_codigo: sucursal,
					pro_codigo: mapRamoToProducto(p.ramo),
					mon_codigo: mapMoneda(p.moneda),
					ofon_codigo: "NA",
					pcue_codigo: "NA",
					ring_codigo: ringCodigo,
					est_codigo: mapEstadoPoliza(p.estado, p.fin_vigencia),
					nrocuenta: p.numero_poliza ?? "",
					fecha_apertura: p.inicio_vigencia ?? "",
					monto_prima: Number(p.prima_total) || 0,
					monto_saldoprima: "",
					fecha_saldoprima: "",
					monto_asegurado: "",
					nro_debito: "",
					monto_valorcomercial: "",
					nro_credito: "",
					fecha_vencimiento: p.fin_vigencia ?? "",
					can_codigo: "DIR",
					monto_asegurado_anterior: "",
					tipo_certificiado_codigo: mapTipoCertificado(p.es_renovacion, p.estado),
				};
			});

		return {
			success: true,
			data: {
				clientes,
				clientes_detalles,
				cuentas,
				meta: {
					total_clientes: clientes.length,
					total_polizas: cuentas.length,
					fecha_desde: filtros.fecha_desde,
					fecha_hasta: filtros.fecha_hasta,
				},
			},
		};
	} catch (err) {
		console.error("AMLC export error:", err);
		return {
			success: false,
			error: err instanceof Error ? err.message : "Error desconocido al generar reporte AMLC",
		};
	}
}
