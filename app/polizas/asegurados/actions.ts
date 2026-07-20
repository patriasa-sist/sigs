"use server";

/**
 * Lista global consolidada de asegurados para pólizas de personas
 * (Salud/Enfermedad, Accidentes Personales, Vida, Sepelio).
 *
 * Vista de SOLO LECTURA que reconstruye el roster vigente de la póliza a partir
 * de eventos: los asegurados iniciales de la madre (alta al inicio de vigencia)
 * más los anexos ACTIVOS (inclusión = alta, exclusión = baja; un reemplazo
 * aporta un alta y una baja). La identidad de la persona se resuelve por
 * client_id cuando existe, si no por carnet y como último recurso por nombre
 * normalizado, de modo que una baja y una re-alta posterior (ej. personal que
 * sale en marzo y vuelve en octubre) quedan como DOS eventos de la MISMA
 * persona: ni se bloquea el reingreso ni se duplica la fila.
 */

import { createClient } from "@/utils/supabase/server";
import { resolverNombresCliente } from "@/utils/polizas/resolverNombresCliente";
import { ESTADO_ANEXO } from "@/types/anexo";

export type EventoAsegurado = {
	fecha: string; // YYYY-MM-DD
	tipo: "alta" | "baja";
	origen: string; // "Póliza" | "Anexo N (Inclusión)" | ...
};

export type AseguradoConsolidado = {
	nombre: string;
	documento: string;
	rol: string | null;
	cargo: string | null;
	nivel: string | null;
	estado: "activo" | "excluido";
	eventos: EventoAsegurado[];
};

export type AseguradosConsolidadosResult =
	| { success: true; ramoSoportado: false }
	| { success: true; ramoSoportado: true; asegurados: AseguradoConsolidado[] }
	| { success: false; error: string };

function normalizarTexto(texto: string): string {
	return texto
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** Clave de identidad de una persona: client_id > carnet > nombre normalizado. */
function claveIdentidad(clientId: string | null, carnet: string | null, nombre: string | null): string {
	if (clientId) return `c:${clientId}`;
	const doc = (carnet || "").replace(/[\s.\-]/g, "").toLowerCase();
	if (doc) return `d:${doc}`;
	return `n:${normalizarTexto(nombre || "")}`;
}

function etiquetaRol(rol: string | null | undefined): string | null {
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
			return rol || null;
	}
}

const TIPO_ANEXO_LABEL: Record<string, string> = {
	inclusion: "Inclusión",
	exclusion: "Exclusión",
	reemplazo: "Reemplazo",
	anulacion: "Anulación",
};

/** Ítem de persona (madre o anexo) ya homogeneizado. */
type ItemPersona = {
	itemId: string;
	clientId: string | null;
	carnet: string | null;
	nombre: string | null;
	rol: string | null;
	cargo: string | null;
	nivelId: string | null;
};

export async function obtenerAseguradosConsolidados(polizaId: string): Promise<AseguradosConsolidadosResult> {
	const supabase = await createClient();

	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return { success: false, error: "No autenticado" };

		const { data: poliza, error: polizaError } = await supabase
			.from("polizas")
			.select("id, ramo, inicio_vigencia")
			.eq("id", polizaId)
			.single();

		if (polizaError || !poliza) return { success: false, error: "Póliza no encontrada" };

		const r = normalizarTexto(poliza.ramo || "");
		const esSalud = r.includes("salud") || r.includes("enfermedad");
		const esNivel =
			r.includes("accidente") || r.includes("vida") || r.includes("sepelio") || r.includes("defuncion");

		if (!esSalud && !esNivel) return { success: true, ramoSoportado: false };

		// Anexos ACTIVOS de la póliza (los pendientes/rechazados no afectan el roster)
		const { data: anexos } = await supabase
			.from("polizas_anexos")
			.select("id, numero_anexo, tipo_anexo, fecha_efectiva, fecha_anexo")
			.eq("poliza_id", polizaId)
			.eq("estado", ESTADO_ANEXO.ACTIVO);

		const anexoIds = (anexos || []).map((a) => a.id);
		const anexoInfo = new Map(
			(anexos || []).map((a) => [
				a.id,
				{
					fecha: (a.fecha_efectiva || a.fecha_anexo || "") as string,
					origen: `Anexo ${a.numero_anexo} (${TIPO_ANEXO_LABEL[a.tipo_anexo] || a.tipo_anexo})`,
				},
			]),
		);

		// ── Cargar ítems madre y de anexos según la familia del ramo ─────────
		let itemsMadre: ItemPersona[] = [];
		let itemsAnexo: (ItemPersona & { anexoId: string; accion: string; originalItemId: string | null })[] = [];
		let nivelNombre = new Map<string, string>();

		if (esSalud) {
			const [nivelesRes, asegRes, benefRes, anexoAsegRes, anexoBenefRes] = await Promise.all([
				supabase.from("polizas_salud_niveles").select("id, nombre").eq("poliza_id", polizaId),
				supabase
					.from("polizas_salud_asegurados")
					.select("id, client_id, nivel_id, rol")
					.eq("poliza_id", polizaId),
				supabase
					.from("polizas_salud_beneficiarios")
					.select("id, nombre_completo, carnet, nivel_id, rol")
					.eq("poliza_id", polizaId),
				anexoIds.length > 0
					? supabase
							.from("polizas_anexos_salud_asegurados")
							.select("id, anexo_id, accion, original_item_id, client_id, nivel_id, rol")
							.in("anexo_id", anexoIds)
					: Promise.resolve({ data: [] }),
				anexoIds.length > 0
					? supabase
							.from("polizas_anexos_salud_beneficiarios")
							.select("id, anexo_id, accion, original_item_id, nombre_completo, carnet, nivel_id, rol")
							.in("anexo_id", anexoIds)
					: Promise.resolve({ data: [] }),
			]);

			nivelNombre = new Map((nivelesRes.data || []).map((n) => [String(n.id), n.nombre as string]));
			itemsMadre = [
				...(asegRes.data || []).map((a) => ({
					itemId: a.id as string,
					clientId: a.client_id as string | null,
					carnet: null,
					nombre: null,
					rol: a.rol as string | null,
					cargo: null,
					nivelId: a.nivel_id != null ? String(a.nivel_id) : null,
				})),
				...(benefRes.data || []).map((b) => ({
					itemId: b.id as string,
					clientId: null,
					carnet: b.carnet as string | null,
					nombre: b.nombre_completo as string | null,
					rol: b.rol as string | null,
					cargo: null,
					nivelId: b.nivel_id != null ? String(b.nivel_id) : null,
				})),
			];
			itemsAnexo = [
				...(anexoAsegRes.data || []).map((a) => ({
					itemId: a.id as string,
					anexoId: a.anexo_id as string,
					accion: a.accion as string,
					originalItemId: a.original_item_id as string | null,
					clientId: a.client_id as string | null,
					carnet: null,
					nombre: null,
					rol: a.rol as string | null,
					cargo: null,
					nivelId: a.nivel_id != null ? String(a.nivel_id) : null,
				})),
				...(anexoBenefRes.data || []).map((b) => ({
					itemId: b.id as string,
					anexoId: b.anexo_id as string,
					accion: b.accion as string,
					originalItemId: b.original_item_id as string | null,
					clientId: null,
					carnet: b.carnet as string | null,
					nombre: b.nombre_completo as string | null,
					rol: b.rol as string | null,
					cargo: null,
					nivelId: b.nivel_id != null ? String(b.nivel_id) : null,
				})),
			];
		} else {
			const [nivelesRes, asegRes, benefRes, anexoAsegRes] = await Promise.all([
				supabase.from("polizas_niveles").select("id, nombre").eq("poliza_id", polizaId),
				supabase
					.from("polizas_asegurados_nivel")
					.select("id, client_id, nivel_id, cargo, rol")
					.eq("poliza_id", polizaId),
				// Solo rol 'asegurado': el resto son beneficiarios de indemnización, no personas aseguradas
				supabase
					.from("polizas_beneficiarios")
					.select("id, nombre_completo, carnet, nivel_id, rol")
					.eq("poliza_id", polizaId)
					.eq("rol", "asegurado"),
				anexoIds.length > 0
					? supabase
							.from("polizas_anexos_asegurados_nivel")
							.select("id, anexo_id, accion, original_item_id, client_id, nivel_id, cargo")
							.in("anexo_id", anexoIds)
					: Promise.resolve({ data: [] }),
			]);

			nivelNombre = new Map((nivelesRes.data || []).map((n) => [String(n.id), n.nombre as string]));
			itemsMadre = [
				...(asegRes.data || []).map((a) => ({
					itemId: a.id as string,
					clientId: a.client_id as string | null,
					carnet: null,
					nombre: null,
					rol: a.rol as string | null,
					cargo: a.cargo as string | null,
					nivelId: a.nivel_id != null ? String(a.nivel_id) : null,
				})),
				...(benefRes.data || []).map((b) => ({
					itemId: b.id as string,
					clientId: null,
					carnet: b.carnet as string | null,
					nombre: b.nombre_completo as string | null,
					rol: b.rol as string | null,
					cargo: null,
					nivelId: b.nivel_id != null ? String(b.nivel_id) : null,
				})),
			];
			itemsAnexo = (anexoAsegRes.data || []).map((a) => ({
				itemId: a.id as string,
				anexoId: a.anexo_id as string,
				accion: a.accion as string,
				originalItemId: a.original_item_id as string | null,
				clientId: a.client_id as string | null,
				carnet: null,
				nombre: null,
				rol: null,
				cargo: a.cargo as string | null,
				nivelId: a.nivel_id != null ? String(a.nivel_id) : null,
			}));
		}

		// Nombres de clientes registrados (batch, 6 tipos)
		const clientIds = [...itemsMadre, ...itemsAnexo].map((i) => i.clientId).filter(Boolean) as string[];
		const nombresMap = await resolverNombresCliente(supabase, clientIds);

		// Identidad por ítem: las exclusiones suelen referenciar el ítem original
		// (original_item_id); si existe, heredan su identidad exacta.
		const identidadPorItem = new Map<string, string>();
		const identidadDe = (i: ItemPersona) => claveIdentidad(i.clientId, i.carnet, i.nombre);
		for (const i of [...itemsMadre, ...itemsAnexo]) identidadPorItem.set(i.itemId, identidadDe(i));

		type Persona = {
			nombre: string;
			documento: string;
			rol: string | null;
			cargo: string | null;
			nivel: string | null;
			eventos: (EventoAsegurado & { orden: number })[];
		};
		const personas = new Map<string, Persona>();

		const datosDisplay = (i: ItemPersona) => {
			const c = i.clientId ? nombresMap.get(i.clientId) : null;
			return {
				nombre: c?.name || i.nombre || "Desconocido",
				documento: c?.ci || i.carnet || "-",
				rol: etiquetaRol(i.rol),
				cargo: i.cargo,
				nivel: i.nivelId ? nivelNombre.get(i.nivelId) || null : null,
			};
		};

		const registrarEvento = (clave: string, evento: EventoAsegurado & { orden: number }, item: ItemPersona) => {
			let p = personas.get(clave);
			if (!p) {
				p = { ...datosDisplay(item), eventos: [] };
				personas.set(clave, p);
			}
			p.eventos.push(evento);
			// Un alta posterior refresca los datos mostrados (nivel/rol pueden cambiar)
			if (evento.tipo === "alta") {
				const d = datosDisplay(item);
				p.nombre = d.nombre;
				p.documento = d.documento;
				p.rol = d.rol ?? p.rol;
				p.cargo = d.cargo ?? p.cargo;
				p.nivel = d.nivel ?? p.nivel;
			}
		};

		// Eventos de la madre: alta al inicio de vigencia (orden 0 desempata a favor de la madre)
		for (const i of itemsMadre) {
			registrarEvento(
				identidadDe(i),
				{ fecha: poliza.inicio_vigencia || "", tipo: "alta", origen: "Póliza", orden: 0 },
				i,
			);
		}

		// Eventos de anexos activos
		for (const i of itemsAnexo) {
			const info = anexoInfo.get(i.anexoId);
			if (!info) continue;
			const clave = (i.originalItemId && identidadPorItem.get(i.originalItemId)) || identidadDe(i);
			registrarEvento(
				clave,
				{ fecha: info.fecha, tipo: i.accion === "exclusion" ? "baja" : "alta", origen: info.origen, orden: 1 },
				i,
			);
		}

		const asegurados: AseguradoConsolidado[] = Array.from(personas.values()).map((p) => {
			const eventos = p.eventos
				.sort((a, b) => (a.fecha !== b.fecha ? a.fecha.localeCompare(b.fecha) : a.orden - b.orden))
				.map(({ fecha, tipo, origen }) => ({ fecha, tipo, origen }));
			const ultimo = eventos[eventos.length - 1];
			return {
				nombre: p.nombre,
				documento: p.documento,
				rol: p.rol,
				cargo: p.cargo,
				nivel: p.nivel,
				estado: ultimo?.tipo === "baja" ? "excluido" : "activo",
				eventos,
			};
		});

		// Activos primero, luego alfabético
		asegurados.sort((a, b) => {
			if (a.estado !== b.estado) return a.estado === "activo" ? -1 : 1;
			return a.nombre.localeCompare(b.nombre, "es");
		});

		return { success: true, ramoSoportado: true, asegurados };
	} catch (error) {
		console.error("Error obteniendo asegurados consolidados:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}
