"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { calcularComisionesConProducto } from "@/utils/polizaValidation";
import { derivarFactorPrimaNeta } from "@/utils/polizas/factorDerivado";
import type { ProductoAseguradora } from "@/types/poliza";

// ============================================
// AJUSTE MANUAL DE PRIMA NETA (SOLO ADMIN)
// ============================================
// Para casos excepcionales (descuento interno, pago en otra divisa) donde
// el factor del producto no refleja los montos reales. Evita duplicar
// productos de aseguradora de un solo uso. La prima total NUNCA se toca
// desde aquí (afecta cuotas de cobranza; se modifica editando la póliza).
// El trigger de historial registra el cambio (usuario, fecha, motivo)
// automáticamente.

type ActionResult = { success: true } | { success: false; error: string };

export type AjustePrimaNetaInput = {
	prima_neta: number;
	comision_empresa: number;
	comision_encargado: number;
	motivo: string;
};

const redondear = (n: number) => Math.round(n * 100) / 100;
const redondear6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Verifica que el usuario actual sea admin. El ajuste manual de montos es
 * deliberadamente admin-only (sin permiso granular): es una herramienta
 * excepcional de administración/contabilidad.
 */
async function verifyAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("No autenticado");
	}

	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

	if (profile?.role !== "admin") {
		throw new Error("Solo un administrador puede ajustar la prima neta manualmente");
	}

	return supabase;
}

/**
 * Sobreescribe los montos autocalculados de una póliza (prima neta y
 * comisiones). La prima total y las cuotas no se tocan. No cambia el
 * estado de la póliza.
 */
export async function ajustarPrimaNeta(polizaId: string, input: AjustePrimaNetaInput): Promise<ActionResult> {
	try {
		const supabase = await verifyAdmin();

		const motivo = input.motivo?.trim();
		if (!motivo || motivo.length < 5) {
			return { success: false, error: "El motivo del ajuste es obligatorio (mínimo 5 caracteres)" };
		}
		if (!Number.isFinite(input.prima_neta) || input.prima_neta <= 0) {
			return { success: false, error: "La prima neta debe ser un monto mayor a 0" };
		}
		if (!Number.isFinite(input.comision_empresa) || input.comision_empresa < 0) {
			return { success: false, error: "La comisión empresa debe ser un monto válido (0 o mayor)" };
		}
		if (!Number.isFinite(input.comision_encargado) || input.comision_encargado < 0) {
			return { success: false, error: "La comisión encargado debe ser un monto válido (0 o mayor)" };
		}

		const { data: poliza, error: fetchError } = await supabase
			.from("polizas")
			.select("id, tipo_prima, prima_total")
			.eq("id", polizaId)
			.single();

		if (fetchError || !poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}
		if (poliza.tipo_prima === "sin_prima_propia") {
			return {
				success: false,
				error: "Esta póliza no tiene prima propia (madre/open-cover); la prima llega por anexos",
			};
		}

		// Factor/% EFECTIVOS del ajuste manual: derivados de los montos ajustados
		// (no del producto), para que reconcilien con la prima neta guardada.
		// La prima total queda la vigente en BD (nunca se toca desde aquí).
		const primaTotalVigente = Number(poliza.prima_total);
		const primaNetaAjustada = redondear(input.prima_neta);
		const comisionAjustada = redondear(input.comision_empresa);
		const { error: updateError } = await supabase
			.from("polizas")
			.update({
				prima_neta: primaNetaAjustada,
				comision: comisionAjustada,
				comision_empresa: comisionAjustada,
				comision_encargado: redondear(input.comision_encargado),
				factor_prima_neta: derivarFactorPrimaNeta(primaTotalVigente, primaNetaAjustada),
				porcentaje_comision: primaNetaAjustada !== 0 ? redondear6(comisionAjustada / primaNetaAjustada) : null,
				prima_neta_manual: true,
				prima_neta_ajuste_motivo: motivo,
			})
			.eq("id", polizaId);

		if (updateError) {
			console.error("[ajustarPrimaNeta] Update error:", updateError);
			return { success: false, error: "Error al guardar el ajuste de prima neta" };
		}

		revalidatePath(`/polizas/${polizaId}`);
		revalidatePath("/polizas");
		revalidatePath("/cobranzas");
		return { success: true };
	} catch (error) {
		console.error("[ajustarPrimaNeta] Error:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}

/**
 * Revierte un ajuste manual: recalcula prima neta y comisiones con el
 * producto vigente a partir de la prima total ACTUAL de la póliza (no
 * revierte prima total ni cuotas) y limpia la marca de ajuste manual.
 */
export async function restablecerPrimaNeta(polizaId: string): Promise<ActionResult> {
	try {
		const supabase = await verifyAdmin();

		const { data: poliza, error: fetchError } = await supabase
			.from("polizas")
			.select(
				"id, prima_total, modalidad_pago, usar_factores_contado, producto_id, tipo_prima, prima_neta_manual",
			)
			.eq("id", polizaId)
			.single();

		if (fetchError || !poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}
		if (!poliza.prima_neta_manual) {
			return { success: false, error: "Esta póliza no tiene un ajuste manual de prima neta" };
		}
		if (!poliza.producto_id) {
			return { success: false, error: "La póliza no tiene producto asignado; no se puede recalcular" };
		}

		const { data: producto, error: productoError } = await supabase
			.from("productos_aseguradoras")
			.select("*")
			.eq("id", poliza.producto_id)
			.single();

		if (productoError || !producto) {
			return { success: false, error: "Producto de aseguradora no encontrado" };
		}

		// Misma regla que el formulario: en crédito con usar_factores_contado se usa el factor de contado
		const modalidadParaCalculo =
			poliza.modalidad_pago === "credito" && poliza.usar_factores_contado ? "contado" : poliza.modalidad_pago;

		const calculo = calcularComisionesConProducto({
			prima_total: poliza.prima_total,
			modalidad_pago: modalidadParaCalculo as "contado" | "credito",
			producto: producto as ProductoAseguradora,
		});

		const { error: updateError } = await supabase
			.from("polizas")
			.update({
				prima_neta: calculo.prima_neta,
				comision: calculo.comision_empresa,
				comision_empresa: calculo.comision_empresa,
				comision_encargado: calculo.comision_encargado,
				factor_prima_neta: calculo.factor_usado,
				porcentaje_comision: calculo.porcentaje_comision,
				prima_neta_manual: false,
				prima_neta_ajuste_motivo: null,
			})
			.eq("id", polizaId);

		if (updateError) {
			console.error("[restablecerPrimaNeta] Update error:", updateError);
			return { success: false, error: "Error al restablecer la prima neta" };
		}

		revalidatePath(`/polizas/${polizaId}`);
		revalidatePath("/polizas");
		return { success: true };
	} catch (error) {
		console.error("[restablecerPrimaNeta] Error:", error);
		return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
	}
}
