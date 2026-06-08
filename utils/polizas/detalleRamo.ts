/**
 * Cargador de detalle específico por ramo para visualización (solo lectura).
 * @module utils/polizas/detalleRamo
 *
 * Server-only. Produce un `DatosEspecificosRamo` liviano y orientado a display
 * (nombres de catálogo resueltos, sin IDs de formulario) a partir de una póliza
 * existente. Lo consume el módulo de Cobranzas para mostrar autos, asegurados,
 * ubicaciones, naves, etc. al negociar un cobro.
 *
 * El despacho por ramo es ACENTO-INSENSIBLE: los valores reales de `polizas.ramo`
 * llevan tildes ("Ramos técnicos", "Aeronavegación") que un `includes("tecnico")`
 * ingenuo no detectaría.
 *
 * IMPORTANTE: no verifica permisos. Solo importar desde código de servidor que ya
 * haya validado el acceso. No exponer como Server Action.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	DatosEspecificosRamo,
	AseguradoPoliza,
	VehiculoAutomotor,
	VehiculoResumen,
	EquipoResumen,
	NaveResumen,
	BienResumen,
	NivelResumen,
} from "@/types/cobranza";

/** Normaliza un texto: minúsculas y sin diacríticos, para matching robusto. */
function normalizar(texto: string): string {
	return texto
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");
}

/**
 * Resuelve nombre/CI de clientes registrados en lote (evita N+1).
 * Busca primero en natural_clients y luego en juridic_clients para los faltantes.
 */
async function resolverNombresClientes(
	supabase: SupabaseClient,
	clientIds: string[]
): Promise<Map<string, { nombre: string; ci: string }>> {
	const map = new Map<string, { nombre: string; ci: string }>();
	const ids = [...new Set(clientIds.filter(Boolean))];
	if (ids.length === 0) return map;

	const { data: naturals } = await supabase
		.from("natural_clients")
		.select("client_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
		.in("client_id", ids);

	for (const n of naturals || []) {
		map.set(n.client_id, {
			nombre:
				[n.primer_nombre, n.segundo_nombre, n.primer_apellido, n.segundo_apellido]
					.filter(Boolean)
					.join(" ") || "Cliente",
			ci: n.numero_documento || "-",
		});
	}

	const faltantes = ids.filter((id) => !map.has(id));
	if (faltantes.length > 0) {
		const { data: juridicos } = await supabase
			.from("juridic_clients")
			.select("client_id, razon_social, nit")
			.in("client_id", faltantes);
		for (const j of juridicos || []) {
			map.set(j.client_id, { nombre: j.razon_social || "Cliente", ci: j.nit || "-" });
		}
	}

	return map;
}

/** Etiqueta legible para el rol de un beneficiario de salud. */
function etiquetaRol(rol: string | null | undefined): string {
	switch (rol) {
		case "titular":
			return "Titular";
		case "conyugue":
			return "Cónyuge";
		case "descendiente":
			return "Descendiente";
		case "contratante":
			return "Contratante";
		case "asegurado":
			return "Asegurado";
		default:
			return rol || "Asegurado";
	}
}

/**
 * Obtiene el detalle específico del ramo de una póliza, listo para mostrar.
 * Es best-effort: ante datos faltantes devuelve listas vacías en lugar de fallar.
 */
export async function obtenerDetalleRamo(
	supabase: SupabaseClient,
	polizaId: string,
	ramo: string
): Promise<DatosEspecificosRamo> {
	const r = normalizar(ramo);

	// ── Automotor ──────────────────────────────────────────────────────────
	if (r.includes("automotor")) {
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
		const { data } = await supabase
			.from("polizas_automotor_vehiculos")
			.select(
				"id, placa, valor_asegurado, modelo, ano, color, tipo_vehiculo:tipos_vehiculo(nombre), marca:marcas_vehiculo(nombre)"
			)
			.eq("poliza_id", polizaId);

		const vehiculos: VehiculoAutomotor[] = ((data as VehiculoRaw[] | null) || []).map((v) => ({
			id: v.id,
			placa: v.placa,
			tipo_vehiculo: v.tipo_vehiculo?.nombre,
			marca: v.marca?.nombre,
			modelo: v.modelo ?? undefined,
			ano: v.ano ?? undefined,
			color: v.color ?? undefined,
			valor_asegurado: v.valor_asegurado,
		}));
		return { tipo: "automotor", vehiculos };
	}

	// ── Salud / Enfermedad ─────────────────────────────────────────────────
	if (r.includes("salud") || r.includes("enfermedad")) {
		const [{ data: niveles }, { data: asegurados }, { data: beneficiarios }] = await Promise.all([
			supabase.from("polizas_salud_niveles").select("id, nombre, monto").eq("poliza_id", polizaId),
			supabase.from("polizas_salud_asegurados").select("client_id, nivel_id, rol").eq("poliza_id", polizaId),
			supabase
				.from("polizas_salud_beneficiarios")
				.select("nombre_completo, carnet, nivel_id, rol")
				.eq("poliza_id", polizaId),
		]);

		const nivelNombre = new Map((niveles || []).map((n) => [String(n.id), n.nombre as string]));
		const nombres = await resolverNombresClientes(
			supabase,
			(asegurados || []).map((a) => a.client_id)
		);

		const lista: AseguradoPoliza[] = [];
		for (const a of asegurados || []) {
			const c = nombres.get(a.client_id);
			lista.push({
				client_id: a.client_id,
				client_name: c?.nombre || "Cliente",
				client_ci: c?.ci || "-",
				nivel_nombre: nivelNombre.get(String(a.nivel_id)),
				relacion: etiquetaRol(a.rol),
			});
		}
		for (const b of beneficiarios || []) {
			lista.push({
				client_id: "",
				client_name: b.nombre_completo,
				client_ci: b.carnet || "-",
				nivel_nombre: nivelNombre.get(String(b.nivel_id)),
				relacion: etiquetaRol(b.rol),
			});
		}

		const nivelesResumen: NivelResumen[] = (niveles || []).map((n) => ({
			nombre: n.nombre as string,
			monto: n.monto != null ? Number(n.monto) : undefined,
		}));

		return { tipo: "salud", asegurados: lista, niveles: nivelesResumen, producto: ramo };
	}

	// ── Vida / Accidentes Personales / Sepelio (tablas compartidas) ─────────
	if (r.includes("vida") || r.includes("accidente") || r.includes("sepelio") || r.includes("defuncion")) {
		const tipo: "vida" | "ap" | "sepelio" = r.includes("accidente")
			? "ap"
			: r.includes("sepelio") || r.includes("defuncion")
			? "sepelio"
			: "vida";

		const [{ data: niveles }, { data: aseguradosNivel }, { data: beneficiarios }] = await Promise.all([
			supabase.from("polizas_niveles").select("id, nombre").eq("poliza_id", polizaId),
			supabase.from("polizas_asegurados_nivel").select("client_id, nivel_id, cargo, rol").eq("poliza_id", polizaId),
			supabase
				.from("polizas_beneficiarios")
				.select("nombre_completo, carnet, nivel_id, rol")
				.eq("poliza_id", polizaId)
				.eq("rol", "asegurado"),
		]);

		const nivelNombre = new Map((niveles || []).map((n) => [String(n.id), n.nombre as string]));
		const nombres = await resolverNombresClientes(
			supabase,
			(aseguradosNivel || []).map((a) => a.client_id)
		);

		const lista: AseguradoPoliza[] = [];
		for (const a of aseguradosNivel || []) {
			const c = nombres.get(a.client_id);
			lista.push({
				client_id: a.client_id,
				client_name: c?.nombre || "Cliente",
				client_ci: c?.ci || "-",
				nivel_nombre: nivelNombre.get(String(a.nivel_id)),
				cargo: a.cargo || undefined,
				relacion: a.rol ? etiquetaRol(a.rol) : "Contratante",
			});
		}
		for (const b of beneficiarios || []) {
			lista.push({
				client_id: "",
				client_name: b.nombre_completo,
				client_ci: b.carnet || "-",
				nivel_nombre: nivelNombre.get(String(b.nivel_id)),
				relacion: "Asegurado",
			});
		}

		const nivelesResumen: NivelResumen[] = (niveles || []).map((n) => ({ nombre: n.nombre as string }));
		return { tipo, asegurados: lista, niveles: nivelesResumen };
	}

	// ── Incendio y Aliados ─────────────────────────────────────────────────
	if (r.includes("incendio")) {
		const { bienes, ubicaciones, asegurados } = await cargarBienes(
			supabase,
			polizaId,
			"polizas_incendio_bienes",
			"polizas_incendio_items",
			"polizas_incendio_asegurados"
		);
		return { tipo: "incendio", ubicaciones, bienes, asegurados };
	}

	// ── Responsabilidad Civil ──────────────────────────────────────────────
	if (r.includes("responsabilidad") || r.includes("civil")) {
		type RcVehiculoRaw = {
			placa: string;
			modelo: string | null;
			ano: number | null;
			uso: string | null;
			tipo_vehiculo: { nombre: string } | null;
			marca: { nombre: string } | null;
		};
		const [{ data: rc }, { data: vehiculos }] = await Promise.all([
			supabase.from("polizas_responsabilidad_civil").select("tipo_poliza, valor_asegurado").eq("poliza_id", polizaId).maybeSingle(),
			supabase
				.from("polizas_rc_vehiculos")
				.select("placa, modelo, ano, uso, tipo_vehiculo:tipos_vehiculo(nombre), marca:marcas_vehiculo(nombre)")
				.eq("poliza_id", polizaId),
		]);

		const vehiculosResumen: VehiculoResumen[] = ((vehiculos as RcVehiculoRaw[] | null) || []).map((v) => ({
			placa: v.placa,
			tipo_vehiculo: v.tipo_vehiculo?.nombre,
			marca: v.marca?.nombre,
			modelo: v.modelo ?? undefined,
			ano: v.ano ?? undefined,
			uso: v.uso ?? undefined,
		}));

		return {
			tipo: "responsabilidad_civil",
			tipo_poliza: rc?.tipo_poliza ?? undefined,
			valor_asegurado: rc?.valor_asegurado != null ? Number(rc.valor_asegurado) : 0,
			vehiculos: vehiculosResumen,
		};
	}

	// ── Transportes ────────────────────────────────────────────────────────
	if (r.includes("transporte")) {
		type TransporteRaw = {
			materia_asegurada: string;
			tipo_transporte: string | null;
			ciudad_origen: string | null;
			ciudad_destino: string | null;
			valor_asegurado: number;
			modalidad: string | null;
			pais_origen: { nombre: string } | null;
			pais_destino: { nombre: string } | null;
		};
		const { data } = await supabase
			.from("polizas_transporte")
			.select(
				"materia_asegurada, tipo_transporte, ciudad_origen, ciudad_destino, valor_asegurado, modalidad, pais_origen:paises!pais_origen_id(nombre), pais_destino:paises!pais_destino_id(nombre)"
			)
			.eq("poliza_id", polizaId)
			.maybeSingle();

		const t = data as TransporteRaw | null;
		if (t) {
			return {
				tipo: "transporte",
				materia_asegurada: t.materia_asegurada,
				tipo_transporte: t.tipo_transporte ?? undefined,
				ciudad_origen: t.ciudad_origen ?? undefined,
				pais_origen: t.pais_origen?.nombre,
				ciudad_destino: t.ciudad_destino ?? undefined,
				pais_destino: t.pais_destino?.nombre,
				valor_asegurado: t.valor_asegurado != null ? Number(t.valor_asegurado) : 0,
				modalidad: t.modalidad ?? undefined,
			};
		}
		return { tipo: "otros", descripcion: ramo };
	}

	// ── Aeronavegación / Naves o embarcaciones ─────────────────────────────
	if (r.includes("aeronavegacion") || r.includes("nave") || r.includes("embarcacion")) {
		const subtipo: "aeronave" | "embarcacion" = r.includes("aeronavegacion") ? "aeronave" : "embarcacion";
		const { data } = await supabase
			.from("polizas_aeronavegacion_naves")
			.select("matricula, marca, modelo, ano, valor_casco")
			.eq("poliza_id", polizaId);

		const naves: NaveResumen[] = (data || []).map((n) => ({
			matricula: n.matricula,
			marca: n.marca ?? undefined,
			modelo: n.modelo ?? undefined,
			ano: n.ano ?? undefined,
			valor_casco: n.valor_casco != null ? Number(n.valor_casco) : undefined,
		}));
		return { tipo: "naves", subtipo, naves };
	}

	// ── Ramos Técnicos (equipos industriales) ──────────────────────────────
	if (r.includes("ramo") && r.includes("tecnico")) {
		type EquipoRaw = {
			nro_serie: string;
			valor_asegurado: number;
			modelo: string | null;
			ano: number | null;
			tipo_equipo: { nombre: string } | null;
			marca: { nombre: string } | null;
		};
		const [{ data: rt }, { data: equipos }] = await Promise.all([
			supabase.from("polizas_ramos_tecnicos").select("valor_asegurado").eq("poliza_id", polizaId).maybeSingle(),
			supabase
				.from("polizas_ramos_tecnicos_equipos")
				.select("nro_serie, valor_asegurado, modelo, ano, tipo_equipo:tipos_equipo(nombre), marca:marcas_equipo(nombre)")
				.eq("poliza_id", polizaId),
		]);

		const equiposResumen: EquipoResumen[] = ((equipos as EquipoRaw[] | null) || []).map((e) => ({
			nro_serie: e.nro_serie,
			tipo_equipo: e.tipo_equipo?.nombre,
			marca: e.marca?.nombre,
			modelo: e.modelo ?? undefined,
			ano: e.ano ?? undefined,
			valor_asegurado: e.valor_asegurado != null ? Number(e.valor_asegurado) : 0,
		}));

		return {
			tipo: "ramos_tecnicos",
			valor_asegurado: rt?.valor_asegurado != null ? Number(rt.valor_asegurado) : 0,
			equipos: equiposResumen,
		};
	}

	// ── Riesgos Varios Misceláneos ─────────────────────────────────────────
	if (r.includes("riesgo") && r.includes("vario")) {
		const { bienes, asegurados } = await cargarBienes(
			supabase,
			polizaId,
			"polizas_riesgos_varios_bienes",
			"polizas_riesgos_varios_items",
			"polizas_riesgos_varios_asegurados"
		);
		return { tipo: "riesgos_varios", bienes, asegurados };
	}

	// ── Otros (fianzas y ramos sin tabla de detalle) ───────────────────────
	return { tipo: "otros", descripcion: ramo };
}

/**
 * Carga bienes + items + asegurados con el patrón compartido por Incendio y
 * Riesgos Varios. Hace una sola query de items para todos los bienes (evita N+1).
 */
async function cargarBienes(
	supabase: SupabaseClient,
	polizaId: string,
	tablaBienes: string,
	tablaItems: string,
	tablaAsegurados: string
): Promise<{ bienes: BienResumen[]; ubicaciones: string[]; asegurados: AseguradoPoliza[] }> {
	const [{ data: bienesDB }, { data: aseguradosDB }] = await Promise.all([
		supabase.from(tablaBienes).select("id, direccion, valor_total_declarado").eq("poliza_id", polizaId),
		supabase.from(tablaAsegurados).select("client_id").eq("poliza_id", polizaId),
	]);

	const bienIds = (bienesDB || []).map((b) => b.id);
	const itemsPorBien = new Map<string, { nombre: string; monto: number }[]>();
	if (bienIds.length > 0) {
		const { data: itemsDB } = await supabase
			.from(tablaItems)
			.select("bien_id, nombre, monto")
			.in("bien_id", bienIds);
		for (const it of itemsDB || []) {
			const arr = itemsPorBien.get(it.bien_id) || [];
			arr.push({ nombre: it.nombre, monto: Number(it.monto) });
			itemsPorBien.set(it.bien_id, arr);
		}
	}

	const bienes: BienResumen[] = (bienesDB || []).map((b) => ({
		direccion: b.direccion,
		valor_total: b.valor_total_declarado != null ? Number(b.valor_total_declarado) : undefined,
		items: itemsPorBien.get(b.id) || [],
	}));

	const nombres = await resolverNombresClientes(
		supabase,
		(aseguradosDB || []).map((a) => a.client_id)
	);
	const asegurados: AseguradoPoliza[] = (aseguradosDB || []).map((a) => {
		const c = nombres.get(a.client_id);
		return {
			client_id: a.client_id,
			client_name: c?.nombre || "Cliente",
			client_ci: c?.ci || "-",
		};
	});

	return { bienes, ubicaciones: bienes.map((b) => b.direccion), asegurados };
}
