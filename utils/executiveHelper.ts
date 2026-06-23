// utils/executiveHelper.ts - Helper functions for executive information
import { excecutives } from "@/types/pdf";
import { createClient } from "@/utils/supabase/client";

export interface Executive {
	user: string;
	name: string;
	glyph: string;
	charge: string;
	telf: string;
	mail: string;
	signature: string;
}

/**
 * Firmante = perfil (profiles) que puede firmar cartas. Fuente de verdad en la BD.
 * Reemplaza al array hardcodeado `excecutives` (que queda solo como fallback).
 */
export interface Firmante {
	id: string;
	full_name: string;
	acronimo: string | null;
	cargo: string | null;
	telefono: string | null;
	email: string | null;
	firma_url: string | null;
	role?: string | null;
}

/**
 * Carga los firmantes desde profiles: cualquier perfil con firma cargada.
 * Pensado para componentes cliente (generación de PDF en el navegador).
 */
export async function obtenerFirmantes(): Promise<Firmante[]> {
	try {
		const supabase = createClient();

		// RPC SECURITY DEFINER: roster GLOBAL de firmantes, sin la RLS de profiles.
		// Necesario porque vencimientos lo usan agente/comercial, cuya RLS solo les deja
		// leer su propio perfil + su equipo; así faltaban firmantes válidos (p.ej. Carmen)
		// y la resolución caía al fallback legacy estampando una firma equivocada.
		const { data, error } = await supabase.rpc("obtener_firmantes");
		if (!error && data) {
			return (data as Firmante[]) || [];
		}
		if (error) {
			console.error("Error cargando firmantes (rpc):", error);
		}

		// Fallback: query directo sujeto a RLS (mejor el subconjunto visible que nada).
		const { data: fb, error: fbError } = await supabase
			.from("profiles")
			.select("id, full_name, acronimo, cargo, telefono, email, firma_url, role")
			.not("firma_url", "is", null)
			.order("full_name");

		if (fbError) {
			console.error("Error cargando firmantes (fallback):", fbError);
			return [];
		}
		return (fb as Firmante[]) || [];
	} catch (error) {
		console.error("Error inesperado cargando firmantes:", error);
		return [];
	}
}

/**
 * Convierte el array hardcodeado `excecutives` al shape Firmante.
 * Solo se usa como fallback para nombres que aún no tienen perfil con firma en la BD.
 */
export function legacyFirmantes(): Firmante[] {
	return excecutives.map((e) => ({
		id: `legacy:${e.user}`,
		full_name: e.name,
		acronimo: e.glyph,
		cargo: e.charge,
		telefono: e.telf,
		email: e.mail,
		firma_url: e.signature,
		role: null,
	}));
}

/** Tokens significativos de un nombre (minúsculas, >2 chars) para comparar por solapamiento. */
function tokensNombre(nombre: string): string[] {
	return nombre
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length > 2);
}

/**
 * Coincidencia tolerante de un nombre (texto libre del Excel) contra full_name.
 * Orden: coincidencia exacta → mayor solapamiento de tokens del nombre (>2 chars).
 *
 * Se elige al firmante que comparte MÁS palabras con el texto buscado, no el primero
 * que comparta una sola. Esto evita que, p.ej., "Carmen Rosario Ferrufino Howard" se
 * resuelva a "Diego Gandarillas Ferrufino" solo por compartir el apellido "Ferrufino":
 * Carmen comparte 3 tokens (carmen/ferrufino/howard) y gana sobre el que comparte 1.
 * NOTA: ante empate real de tokens (dos perfiles igual de parecidos) se toma el primero;
 * en ese caso el texto del Excel debe ser más específico (nombre completo).
 */
export function findFirmante(nombre: string | undefined | null, firmantes: Firmante[]): Firmante | null {
	if (!nombre) return null;
	const search = nombre.trim().toLowerCase();
	if (!search) return null;

	// Coincidencia exacta con full_name
	const exact = firmantes.find((f) => (f.full_name || "").toLowerCase() === search);
	if (exact) return exact;

	// Mayor solapamiento de tokens: cuántas palabras del full_name aparecen en el texto buscado.
	const searchTokens = new Set(tokensNombre(search));
	let best: Firmante | null = null;
	let bestScore = 0;
	for (const f of firmantes) {
		const score = tokensNombre(f.full_name || "").filter((t) => searchTokens.has(t)).length;
		if (score > bestScore) {
			bestScore = score;
			best = f;
		}
	}
	return bestScore > 0 ? best : null;
}

/**
 * Resuelve un nombre a un Firmante: primero contra la BD, luego contra el fallback legacy.
 * Devuelve null si no hay coincidencia (para no estampar una firma equivocada).
 */
export function resolverFirmante(nombre: string | undefined | null, firmantes: Firmante[]): Firmante | null {
	return findFirmante(nombre, firmantes) || findFirmante(nombre, legacyFirmantes());
}

/**
 * Find executive information based on name from letter data
 * @param executiveName - The executive name from the letter
 * @returns Executive information or null if not found
 */
export function findExecutiveByName(executiveName: string): Executive | null {
	if (!executiveName) return null;

	// Normalize the search name (remove extra spaces, convert to lowercase)
	const searchName = executiveName.trim().toLowerCase();

	// First try exact match with the 'user' field (short name)
	const exactUserMatch = excecutives.find((exec) => exec.user.toLowerCase() === searchName);
	if (exactUserMatch) return exactUserMatch;

	// Try exact match with full name
	const exactNameMatch = excecutives.find((exec) => exec.name.toLowerCase() === searchName);
	if (exactNameMatch) return exactNameMatch;

	// Try partial match with user field (for cases like "Tamara" matching "tamara")
	const partialUserMatch = excecutives.find(
		(exec) => searchName.includes(exec.user.toLowerCase()) || exec.user.toLowerCase().includes(searchName),
	);
	if (partialUserMatch) return partialUserMatch;

	// Try partial match with full name (for cases where only first name or last name is provided)
	const partialNameMatch = excecutives.find((exec) => {
		const execNameLower = exec.name.toLowerCase();
		const execNameParts = execNameLower.split(" ");

		// Check if search name contains any part of the executive's name
		return execNameParts.some(
			(part) => part.length > 2 && (searchName.includes(part) || part.includes(searchName)),
		);
	});

	return partialNameMatch || null;
}

/**
 * Get default executive information (fallback)
 * @returns Default executive (first in the list)
 */
export function getDefaultExecutive(): Executive {
	return excecutives[0]; // Returns admin account as default
}

/**
 * Get all available executives
 * @returns Array of all executives
 */
export function getAllExecutives(): Executive[] {
	return excecutives;
}
