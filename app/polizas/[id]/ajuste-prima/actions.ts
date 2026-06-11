"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { calcularComisionesConProducto } from "@/utils/polizaValidation";
import type { ProductoAseguradora } from "@/types/poliza";

// ============================================
// AJUSTE MANUAL DE PRIMA NETA (SOLO ADMIN)
// ============================================
// Para casos excepcionales (descuento interno, pago en otra divisa) donde
// el factor del producto no refleja los montos reales. Evita duplicar
// productos de aseguradora de un solo uso. Si la prima total cambia, la
// diferencia se reparte proporcionalmente entre las cuotas NO pagadas para
// que lo cobrado siga cuadrando. El trigger de historial registra el cambio
// (usuario, fecha, motivo) automáticamente.

type ActionResult = { success: true } | { success: false; error: string };

export type AjustePrimaNetaInput = {
	prima_neta: number;
	prima_total: number;
	comision_empresa: number;
	comision_encargado: number;
	motivo: string;
};

const redondear = (n: number) => Math.round(n * 100) / 100;

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
 * Sobreescribe los montos autocalculados de una póliza (prima neta,
 * comisiones y opcionalmente prima total). Si la prima total cambia, la
 * diferencia se redistribuye proporcionalmente entre las cuotas no pagadas
 * (las pagadas nunca se tocan). No cambia el estado de la póliza.
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
		if (!Number.isFinite(input.prima_total) || input.prima_total <= 0) {
			return { success: false, error: "La prima total debe ser un monto mayor a 0" };
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

		const nuevaPrimaTotal = redondear(input.prima_total);
		const delta = redondear(nuevaPrimaTotal - Number(poliza.prima_total));

		// Si la prima total cambia, repartir la diferencia entre cuotas no pagadas
		if (Math.abs(delta) >= 0.01) {
			const { data: cuotas, error: cuotasError } = await supabase
				.from("polizas_pagos")
				.select("id, monto, estado, numero_cuota")
				.eq("poliza_id", polizaId)
				.order("numero_cuota", { ascending: true });

			if (cuotasError) {
				return { success: false, error: "Error al leer las cuotas de la póliza" };
			}

			const pendientes = (cuotas || []).filter((c) => c.estado !== "pagado");
			if (pendientes.length === 0) {
				return {
					success: false,
					error: "No hay cuotas pendientes que puedan absorber la diferencia de prima total. Ajusta las cuotas desde Cobranzas o mantén la prima total actual.",
				};
			}

			const sumaPendientes = pendientes.reduce((acc, c) => acc + Number(c.monto), 0);
			if (sumaPendientes <= 0) {
				return { success: false, error: "Las cuotas pendientes no tienen montos válidos para redistribuir" };
			}

			// Abonos parciales ya registrados: una cuota nunca puede quedar por
			// debajo de lo ya abonado
			const { data: abonos } = await supabase
				.from("polizas_pagos_abonos")
				.select("pago_id, monto")
				.in(
					"pago_id",
					pendientes.map((c) => c.id),
				);
			const abonadoPorCuota = new Map<string, number>();
			for (const a of abonos || []) {
				abonadoPorCuota.set(a.pago_id, (abonadoPorCuota.get(a.pago_id) || 0) + Number(a.monto));
			}

			// Reparto proporcional del delta; la última cuota absorbe el residuo de redondeo
			let deltaAcumulado = 0;
			const nuevosMontos: Array<{ id: string; numero_cuota: number; monto: number }> = pendientes.map(
				(cuota, idx) => {
					let parte: number;
					if (idx === pendientes.length - 1) {
						parte = redondear(delta - deltaAcumulado);
					} else {
						parte = redondear(delta * (Number(cuota.monto) / sumaPendientes));
						deltaAcumulado = redondear(deltaAcumulado + parte);
					}
					return {
						id: cuota.id,
						numero_cuota: cuota.numero_cuota,
						monto: redondear(Number(cuota.monto) + parte),
					};
				},
			);

			for (const nm of nuevosMontos) {
				if (nm.monto <= 0) {
					return {
						success: false,
						error: `El ajuste dejaría la cuota ${nm.numero_cuota} con monto ${nm.monto.toFixed(2)} (debe ser mayor a 0). Reduce la diferencia o ajusta las cuotas desde la edición de la póliza.`,
					};
				}
				const abonado = abonadoPorCuota.get(nm.id) || 0;
				if (nm.monto < abonado) {
					return {
						success: false,
						error: `El ajuste dejaría la cuota ${nm.numero_cuota} (${nm.monto.toFixed(2)}) por debajo de lo ya abonado (${abonado.toFixed(2)}). Resuelve los abonos en Cobranzas primero.`,
					};
				}
			}

			for (const nm of nuevosMontos) {
				const { error: cuotaUpdateError } = await supabase
					.from("polizas_pagos")
					.update({ monto: nm.monto })
					.eq("id", nm.id);
				if (cuotaUpdateError) {
					console.error("[ajustarPrimaNeta] Error actualizando cuota:", nm.id, cuotaUpdateError);
					return {
						success: false,
						error: `Error al actualizar la cuota ${nm.numero_cuota}. Revisa las cuotas de la póliza antes de reintentar.`,
					};
				}
			}
		}

		const { error: updateError } = await supabase
			.from("polizas")
			.update({
				prima_total: nuevaPrimaTotal,
				prima_neta: redondear(input.prima_neta),
				comision: redondear(input.comision_empresa),
				comision_empresa: redondear(input.comision_empresa),
				comision_encargado: redondear(input.comision_encargado),
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
