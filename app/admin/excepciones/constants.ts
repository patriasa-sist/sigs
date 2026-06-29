/**
 * Constantes compartidas entre el server action y el cliente. Viven fuera de
 * `actions.ts` porque ese archivo es "use server": ahí solo pueden exportarse
 * funciones async (un export de valor se transforma en una referencia de
 * server action y deja de ser el array en el cliente).
 */

/**
 * Roles operativos que pueden cubrirse con una ventana de excepción. Son los
 * roles que dan de alta clientes; una ventana los exime de los documentos
 * obligatorios durante una carga retroactiva.
 */
export const ROLES_VENTANA = ["comercial", "agente"] as const;
export type RolVentana = (typeof ROLES_VENTANA)[number];
