// utils/polizas/anulacionCuotas.ts
//
// Lógica compartida (server) para anular y restaurar las cuotas de una póliza
// cuando un anexo de anulación se valida o se revierte. La usan tanto
// `validarAnexo` (gerencia) como `actualizarAnexo` (edición que reactiva la
// póliza), para que el efecto sea idéntico en ambos caminos.
//
// Al anularse la póliza queda "muerta en todo sentido": sus cuotas no pagadas y
// las cuotas propias de anexos de inclusión activos pasan a `estado='anulada'`
// y dejan de cobrarse. Las cuotas con pago (pagado/parcial) se respetan.
//
// Escriben con el cliente admin: la RLS de polizas_pagos solo permite UPDATE a
// cobranza/admin, y quien valida anexos suele ser agente/comercial — con el
// cliente de sesión el UPDATE afectaba 0 filas sin error y las cuotas quedaban
// 'pendiente' en pólizas anuladas. Los callers ya verificaron el permiso.

import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Marca como 'anulada' las cuotas cobrables de una póliza al validar su
 * anulación: cuotas de la póliza madre aún no pagadas y cuotas propias de los
 * anexos de inclusión activos. Las cuotas con pago registrado no se tocan.
 */
export async function anularCuotasPorAnulacion(
	polizaId: string,
	anexoId: string,
): Promise<{ error: string | null }> {
	const supabase = createAdminClient();

	// 1) Cuotas de la póliza madre sin pago. El estado ALMACENADO de una cuota
	//    impaga es 'pendiente' ('vencido' solo existe como estado_real derivado),
	//    así que filtrar por estado='pendiente' alcanza para vencidas también.
	const { error: errPoliza } = await supabase
		.from("polizas_pagos")
		.update({ estado: "anulada", anulada_por_anexo_id: anexoId })
		.eq("poliza_id", polizaId)
		.is("fecha_pago", null)
		.eq("estado", "pendiente");
	if (errPoliza) return { error: errPoliza.message };

	// 2) Cuotas propias de los anexos de inclusión activos de esta póliza.
	const { data: inclusiones, error: errIncl } = await supabase
		.from("polizas_anexos")
		.select("id")
		.eq("poliza_id", polizaId)
		.eq("tipo_anexo", "inclusion")
		.eq("estado", "activo");
	if (errIncl) return { error: errIncl.message };

	const inclusionIds = (inclusiones || []).map((a) => a.id as string);
	if (inclusionIds.length > 0) {
		const { error: errCuotasPropias } = await supabase
			.from("polizas_anexos_pagos")
			.update({ estado: "anulada" })
			.in("anexo_id", inclusionIds)
			.eq("tipo", "cuota_propia")
			.eq("estado", "pendiente");
		if (errCuotasPropias) return { error: errCuotasPropias.message };
	}

	return { error: null };
}

/**
 * Restaura las cuotas que esta anulación había marcado 'anulada' cuando la
 * póliza vuelve a estar activa (al editar la anulación con cambio financiero).
 * Inverso exacto de `anularCuotasPorAnulacion`.
 */
export async function restaurarCuotasPorAnulacion(
	polizaId: string,
	anexoId: string,
): Promise<{ error: string | null }> {
	const supabase = createAdminClient();

	// 1) Cuotas de la póliza madre: restauración precisa vía anulada_por_anexo_id.
	const { error: errPoliza } = await supabase
		.from("polizas_pagos")
		.update({ estado: "pendiente", anulada_por_anexo_id: null })
		.eq("anulada_por_anexo_id", anexoId);
	if (errPoliza) return { error: errPoliza.message };

	// 2) Cuotas propias de inclusión: una póliza tiene a lo sumo una anulación,
	//    así que restaurar las 'anulada' de sus inclusiones activas es seguro.
	const { data: inclusiones, error: errIncl } = await supabase
		.from("polizas_anexos")
		.select("id")
		.eq("poliza_id", polizaId)
		.eq("tipo_anexo", "inclusion")
		.eq("estado", "activo");
	if (errIncl) return { error: errIncl.message };

	const inclusionIds = (inclusiones || []).map((a) => a.id as string);
	if (inclusionIds.length > 0) {
		const { error: errCuotasPropias } = await supabase
			.from("polizas_anexos_pagos")
			.update({ estado: "pendiente" })
			.in("anexo_id", inclusionIds)
			.eq("tipo", "cuota_propia")
			.eq("estado", "anulada");
		if (errCuotasPropias) return { error: errCuotasPropias.message };
	}

	return { error: null };
}
