import type { z } from "zod";

/**
 * Traduce los mensajes por defecto (en inglés) que genera Zod a español.
 * Los mensajes personalizados de cada esquema ya están en español y se respetan tal cual.
 */
const MENSAJES_ES: Record<string, string> = {
	"Invalid input": "Valor inválido",
	Required: "Campo requerido",
	"Invalid email": "Correo electrónico inválido",
	"Invalid url": "URL inválida",
	"Invalid date": "Fecha inválida",
	"Invalid uuid": "Identificador inválido",
};

type ZodIssue = z.ZodError["issues"][number];

/** Devuelve el mensaje de un issue de Zod traducido a español si es un default en inglés. */
export function traducirMensajeZod(issue: ZodIssue): string {
	return MENSAJES_ES[issue.message] ?? issue.message;
}

/**
 * Formatea el primer error de validación de un ZodError en un mensaje legible en español.
 *
 * @example
 * if (!validation.success) {
 *   return { success: false, error: formatearErrorZod(validation.error) };
 * }
 */
export function formatearErrorZod(error: z.ZodError, prefijo = "Datos inválidos"): string {
	const issue = error.issues[0];
	const campo = issue.path.join(".");
	const mensaje = traducirMensajeZod(issue);
	return campo ? `${prefijo}: ${campo} - ${mensaje}` : `${prefijo}: ${mensaje}`;
}
