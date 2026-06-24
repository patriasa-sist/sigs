// utils/polizas/aporteAnexo.ts
//
// Fuente ÚNICA de verdad para el signo y la etiqueta del "aporte" de un anexo
// a lo que se debe cobrar. Antes cada pantalla sumaba `polizas_anexos_pagos.monto`
// a ciegas, lo que mostraba mal las anulaciones (la vigencia corrida positiva
// aparecía como un "+Ajuste" aunque fuera una devolución a favor del cliente).
//
// Convención de datos:
//   - El input del usuario es SIEMPRE un número sin signo (magnitud).
//   - `ajuste` (exclusión) se guarda en negativo y `cuota_propia` (inclusión)
//     en positivo: ya traen su signo.
//   - `vigencia_corrida` (anulación) se guarda en POSITIVO; el signo lo define
//     la `direccion`: cobro suma a cobrar, devolucion es a favor del cliente.

import type { TipoAnexo, DireccionVigenciaCorrida } from "@/types/anexo";

export type { DireccionVigenciaCorrida };

export type PagoAnexoLite = {
	tipo: "ajuste" | "vigencia_corrida" | "cuota_propia";
	monto: number;
	direccion?: DireccionVigenciaCorrida | null;
};

/** Signo que aporta un pago de anexo a "lo que se debe cobrar". */
export function signoPagoAnexo(pago: PagoAnexoLite): number {
	if (pago.tipo === "vigencia_corrida") {
		const signo = pago.direccion === "devolucion" ? -1 : 1;
		return signo * Math.abs(Number(pago.monto));
	}
	// ajuste (negativo) y cuota_propia (positivo) ya vienen firmados.
	return Number(pago.monto);
}

/**
 * Neto firmado del anexo contra "lo que se debe cobrar":
 *   > 0 agrega a cobrar, < 0 reduce / queda a favor del cliente, 0 neutro.
 */
export function netoAporteAnexo(pagos: PagoAnexoLite[]): number {
	return pagos.reduce((sum, p) => sum + signoPagoAnexo(p), 0);
}

export type AporteDescrito = {
	/** Etiqueta legible del aporte para mostrar junto al monto. */
	etiqueta: string;
	/** true si el monto NO entra a cobranzas (devolución informativa). */
	informativo: boolean;
	/** Tono semántico para el color: positivo agrega, negativo resta. */
	tono: "positivo" | "negativo" | "neutro";
};

/**
 * Describe el aporte de un anexo a partir de su tipo y su neto firmado.
 * El signo del neto ya desambigua cobro (>0) vs devolución (<0) en anulaciones.
 */
export function describirAporteAnexo(tipoAnexo: TipoAnexo, neto: number): AporteDescrito {
	if (tipoAnexo === "anulacion") {
		if (neto < 0) {
			return { etiqueta: "Devolución a favor del cliente", informativo: true, tono: "negativo" };
		}
		if (neto > 0) {
			return { etiqueta: "Cobro de vigencia corrida", informativo: false, tono: "positivo" };
		}
		return { etiqueta: "Anulación", informativo: false, tono: "neutro" };
	}
	if (tipoAnexo === "inclusion") {
		return { etiqueta: "Agrega", informativo: false, tono: "positivo" };
	}
	if (tipoAnexo === "exclusion") {
		return { etiqueta: "Descuenta", informativo: false, tono: "negativo" };
	}
	return { etiqueta: "Ajuste", informativo: false, tono: neto >= 0 ? "positivo" : "negativo" };
}
