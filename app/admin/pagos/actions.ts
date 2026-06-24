"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export type CuotaTipo = "poliza" | "anexo";

export interface PolizaPagoAdminRow {
	poliza_id: string;
	numero_poliza: string;
	ramo: string;
	estado: string;
}

export interface CuotaPagoAdminRow {
	id: string;
	tipo: CuotaTipo;
	numero_cuota: number | null;
	numero_anexo: string | null;
	monto: number;
	monto_abonado: number;
	estado: string;
	fecha_pago: string | null;
	fecha_vencimiento: string | null;
	cantidad_abonos: number;
	cantidad_comprobantes: number;
	cantidad_notas: number;
}

export interface RevertirPagoResultado {
	abonos_borrados: number;
	comprobantes_borrados: number;
	archivos_borrados: number;
	notas_borradas: number;
}

export interface AbonoAdminRow {
	id: string;
	monto: number;
	fecha_pago: string | null;
	observaciones: string | null;
	created_at: string;
}

export interface CorregirFechaCambio {
	abono_id: string;
	fecha_pago: string; // YYYY-MM-DD
}

/**
 * Garantiza que el usuario actual es admin. Esta utilidad es destructiva y de
 * uso exclusivo de administradores (mismo criterio que la eliminación nuclear).
 */
async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return { ok: false, error: "No autenticado." };

	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
	if (profile?.role !== "admin") {
		return { ok: false, error: "Solo administradores pueden revertir pagos." };
	}
	return { ok: true, userId: user.id };
}

/**
 * Busca pólizas por número (parcial). Devuelve datos mínimos; las cuotas con
 * pagos se cargan después con obtenerCuotasConPagoAdmin().
 */
export async function buscarPolizasAdmin(query: string): Promise<ActionResult<PolizaPagoAdminRow[]>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const trimmed = query.trim();
	if (trimmed.length < 2) {
		return { success: false, error: "Ingresá al menos 2 caracteres para buscar." };
	}

	const supabase = await createClient();
	const { data, error } = await supabase
		.from("polizas")
		.select("id, numero_poliza, ramo, estado")
		.ilike("numero_poliza", `%${trimmed}%`)
		.order("numero_poliza", { ascending: true })
		.limit(25);

	if (error) {
		console.error("[admin/pagos] Error buscando pólizas:", error);
		return { success: false, error: "Error al buscar pólizas." };
	}

	const filas: PolizaPagoAdminRow[] = (data ?? []).map((p) => ({
		poliza_id: p.id,
		numero_poliza: p.numero_poliza,
		ramo: p.ramo ?? "—",
		estado: p.estado ?? "—",
	}));

	return { success: true, data: filas };
}

/**
 * Devuelve, para una póliza, las cuotas (propias y de anexos) que tienen al
 * menos un abono registrado — es decir, las cuotas cuyo pago se puede revertir.
 */
export async function obtenerCuotasConPagoAdmin(polizaId: string): Promise<ActionResult<CuotaPagoAdminRow[]>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const supabase = await createClient();

	// Cuotas propias de la póliza
	const { data: cuotas, error: cuotasError } = await supabase
		.from("polizas_pagos")
		.select("id, numero_cuota, monto, estado, fecha_pago, fecha_vencimiento")
		.eq("poliza_id", polizaId)
		.order("numero_cuota", { ascending: true });

	if (cuotasError) {
		console.error("[admin/pagos] Error cargando cuotas:", cuotasError);
		return { success: false, error: "Error al cargar las cuotas." };
	}

	// Cuotas de anexos de la póliza
	const { data: anexos } = await supabase.from("polizas_anexos").select("id, numero_anexo").eq("poliza_id", polizaId);
	const anexoIds = (anexos ?? []).map((a) => a.id);
	const numeroAnexoPorId = new Map<string, string>();
	for (const a of anexos ?? []) numeroAnexoPorId.set(a.id, a.numero_anexo);

	let cuotasAnexo: {
		id: string;
		anexo_id: string;
		numero_cuota: number | null;
		monto: number;
		estado: string | null;
		fecha_pago: string | null;
		fecha_vencimiento: string | null;
	}[] = [];
	if (anexoIds.length > 0) {
		const { data: ca } = await supabase
			.from("polizas_anexos_pagos")
			.select("id, anexo_id, numero_cuota, monto, estado, fecha_pago, fecha_vencimiento")
			.in("anexo_id", anexoIds);
		cuotasAnexo = ca ?? [];
	}

	const pagoIds = (cuotas ?? []).map((c) => c.id);
	const anexoPagoIds = cuotasAnexo.map((c) => c.id);

	// Conteos de abonos / comprobantes / notas en lote
	const [abonosPoliza, abonosAnexo, compsPoliza, compsAnexo, notasPoliza, notasAnexo] = await Promise.all([
		pagoIds.length
			? supabase.from("polizas_pagos_abonos").select("pago_id, monto").in("pago_id", pagoIds)
			: Promise.resolve({ data: [] as { pago_id: string | null; monto: number }[] }),
		anexoPagoIds.length
			? supabase.from("polizas_pagos_abonos").select("anexo_pago_id, monto").in("anexo_pago_id", anexoPagoIds)
			: Promise.resolve({ data: [] as { anexo_pago_id: string | null; monto: number }[] }),
		pagoIds.length
			? supabase.from("polizas_pagos_comprobantes").select("pago_id").in("pago_id", pagoIds)
			: Promise.resolve({ data: [] as { pago_id: string | null }[] }),
		anexoPagoIds.length
			? supabase.from("polizas_pagos_comprobantes").select("anexo_pago_id").in("anexo_pago_id", anexoPagoIds)
			: Promise.resolve({ data: [] as { anexo_pago_id: string | null }[] }),
		pagoIds.length
			? supabase.from("polizas_cuotas_notas").select("pago_id").in("pago_id", pagoIds)
			: Promise.resolve({ data: [] as { pago_id: string | null }[] }),
		anexoPagoIds.length
			? supabase.from("polizas_cuotas_notas").select("anexo_pago_id").in("anexo_pago_id", anexoPagoIds)
			: Promise.resolve({ data: [] as { anexo_pago_id: string | null }[] }),
	]);

	const abonadoPorPago = new Map<string, { count: number; suma: number }>();
	for (const a of abonosPoliza.data ?? []) {
		if (!a.pago_id) continue;
		const prev = abonadoPorPago.get(a.pago_id) ?? { count: 0, suma: 0 };
		abonadoPorPago.set(a.pago_id, { count: prev.count + 1, suma: prev.suma + Number(a.monto) });
	}
	const abonadoPorAnexo = new Map<string, { count: number; suma: number }>();
	for (const a of abonosAnexo.data ?? []) {
		if (!a.anexo_pago_id) continue;
		const prev = abonadoPorAnexo.get(a.anexo_pago_id) ?? { count: 0, suma: 0 };
		abonadoPorAnexo.set(a.anexo_pago_id, { count: prev.count + 1, suma: prev.suma + Number(a.monto) });
	}

	const contar = <T extends string>(rows: { [k in T]: string | null }[] | null, key: T) => {
		const m = new Map<string, number>();
		for (const r of rows ?? []) {
			const id = r[key];
			if (!id) continue;
			m.set(id, (m.get(id) ?? 0) + 1);
		}
		return m;
	};
	const compsPorPago = contar(compsPoliza.data, "pago_id");
	const compsPorAnexo = contar(compsAnexo.data, "anexo_pago_id");
	const notasPorPago = contar(notasPoliza.data, "pago_id");
	const notasPorAnexo = contar(notasAnexo.data, "anexo_pago_id");

	const filas: CuotaPagoAdminRow[] = [];

	for (const c of cuotas ?? []) {
		const ab = abonadoPorPago.get(c.id);
		if (!ab || ab.count === 0) continue; // solo cuotas con pago
		filas.push({
			id: c.id,
			tipo: "poliza",
			numero_cuota: c.numero_cuota,
			numero_anexo: null,
			monto: Number(c.monto),
			monto_abonado: ab.suma,
			estado: c.estado ?? "—",
			fecha_pago: c.fecha_pago,
			fecha_vencimiento: c.fecha_vencimiento,
			cantidad_abonos: ab.count,
			cantidad_comprobantes: compsPorPago.get(c.id) ?? 0,
			cantidad_notas: notasPorPago.get(c.id) ?? 0,
		});
	}

	for (const c of cuotasAnexo) {
		const ab = abonadoPorAnexo.get(c.id);
		if (!ab || ab.count === 0) continue;
		filas.push({
			id: c.id,
			tipo: "anexo",
			numero_cuota: c.numero_cuota,
			numero_anexo: numeroAnexoPorId.get(c.anexo_id) ?? null,
			monto: Number(c.monto),
			monto_abonado: ab.suma,
			estado: c.estado ?? "—",
			fecha_pago: c.fecha_pago,
			fecha_vencimiento: c.fecha_vencimiento,
			cantidad_abonos: ab.count,
			cantidad_comprobantes: compsPorAnexo.get(c.id) ?? 0,
			cantidad_notas: notasPorAnexo.get(c.id) ?? 0,
		});
	}

	return { success: true, data: filas };
}

/**
 * Revierte por completo el pago de una cuota: borra TODOS sus abonos, sus
 * comprobantes (registros + archivos físicos en Storage) y sus notas, y deja la
 * cuota en estado 'pendiente'. Borrado permanente, sin deshacer.
 */
export async function revertirPagoCuota(
	cuotaId: string,
	tipo: CuotaTipo,
	motivo: string,
): Promise<ActionResult<RevertirPagoResultado>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const motivoLimpio = motivo.trim();
	if (motivoLimpio.length < 10) {
		return { success: false, error: "El motivo debe tener al menos 10 caracteres." };
	}

	const admin = createAdminClient();

	const columnaCuota = tipo === "poliza" ? "pago_id" : "anexo_pago_id";

	// Datos de la cuota + póliza asociada (para validar y para el historial)
	let polizaId: string;
	let descripcionCuota: string;
	if (tipo === "poliza") {
		const { data: cuota, error } = await admin
			.from("polizas_pagos")
			.select("id, poliza_id, numero_cuota")
			.eq("id", cuotaId)
			.single();
		if (error || !cuota) return { success: false, error: "Cuota no encontrada." };
		polizaId = cuota.poliza_id;
		descripcionCuota = `cuota ${cuota.numero_cuota ?? "?"} de póliza`;
	} else {
		const { data: cuota, error } = await admin
			.from("polizas_anexos_pagos")
			.select("id, numero_cuota, anexo_id, polizas_anexos!inner ( poliza_id, numero_anexo )")
			.eq("id", cuotaId)
			.single();
		if (error || !cuota) return { success: false, error: "Cuota de anexo no encontrada." };
		const anexo = Array.isArray(cuota.polizas_anexos) ? cuota.polizas_anexos[0] : cuota.polizas_anexos;
		polizaId = anexo?.poliza_id;
		descripcionCuota = `cuota ${cuota.numero_cuota ?? "?"} del anexo ${anexo?.numero_anexo ?? "?"}`;
	}

	// Recolectar archivos de Storage ANTES de borrar los registros
	const { data: comprobantes } = await admin
		.from("polizas_pagos_comprobantes")
		.select("archivo_url")
		.eq(columnaCuota, cuotaId);
	const rutasStorage = (comprobantes ?? []).map((c) => c.archivo_url).filter((u): u is string => Boolean(u));

	// Contar lo que se va a borrar (para el resultado)
	const { data: abonos } = await admin.from("polizas_pagos_abonos").select("id").eq(columnaCuota, cuotaId);
	const { data: notas } = await admin.from("polizas_cuotas_notas").select("id").eq(columnaCuota, cuotaId);
	const abonosCount = abonos?.length ?? 0;
	const comprobantesCount = comprobantes?.length ?? 0;
	const notasCount = notas?.length ?? 0;

	if (abonosCount === 0) {
		return { success: false, error: "Esta cuota no tiene pagos registrados." };
	}

	// Borrar comprobantes (registros). Se borran explícitamente para cubrir los
	// que estén ligados a la cuota sin abono; los ligados a abonos caen igual por
	// cascade al borrar el abono.
	const { error: errComp } = await admin.from("polizas_pagos_comprobantes").delete().eq(columnaCuota, cuotaId);
	if (errComp) {
		console.error("[admin/pagos] Error borrando comprobantes:", errComp);
		return { success: false, error: "Error al borrar los comprobantes." };
	}

	// Borrar abonos
	const { error: errAbonos } = await admin.from("polizas_pagos_abonos").delete().eq(columnaCuota, cuotaId);
	if (errAbonos) {
		console.error("[admin/pagos] Error borrando abonos:", errAbonos);
		return { success: false, error: "Error al borrar los abonos." };
	}

	// Borrar notas de la cuota
	const { error: errNotas } = await admin.from("polizas_cuotas_notas").delete().eq(columnaCuota, cuotaId);
	if (errNotas) {
		console.error("[admin/pagos] Error borrando notas:", errNotas);
		return { success: false, error: "Error al borrar las notas." };
	}

	// Dejar la cuota como pendiente (el trigger deriva estado_real en póliza)
	if (tipo === "poliza") {
		const { error: errCuota } = await admin
			.from("polizas_pagos")
			.update({ estado: "pendiente", fecha_pago: null })
			.eq("id", cuotaId);
		if (errCuota) {
			console.error("[admin/pagos] Error reseteando cuota:", errCuota);
			return { success: false, error: "Pagos borrados pero falló el reseteo de la cuota. Revisar manualmente." };
		}
	} else {
		const { error: errCuota } = await admin
			.from("polizas_anexos_pagos")
			.update({
				estado: "pendiente",
				fecha_pago: null,
				updated_by: auth.userId,
				updated_at: new Date().toISOString(),
			})
			.eq("id", cuotaId);
		if (errCuota) {
			console.error("[admin/pagos] Error reseteando cuota de anexo:", errCuota);
			return { success: false, error: "Pagos borrados pero falló el reseteo de la cuota. Revisar manualmente." };
		}
	}

	// Borrar archivos físicos de Storage
	let archivosBorrados = 0;
	if (rutasStorage.length > 0) {
		const { data: removed, error: errStorage } = await admin.storage
			.from("pagos-comprobantes")
			.remove(rutasStorage);
		if (errStorage) {
			console.error("[admin/pagos] Error borrando archivos de Storage:", errStorage);
		} else {
			archivosBorrados = removed?.length ?? rutasStorage.length;
		}
	}

	// Registrar en el historial de la póliza
	if (polizaId) {
		await admin.from("polizas_historial_ediciones").insert({
			poliza_id: polizaId,
			accion: "edicion",
			usuario_id: auth.userId,
			campos_modificados: ["pago"],
			descripcion: `Pago revertido por admin (${descripcionCuota}). Borrados: ${abonosCount} abono(s), ${comprobantesCount} comprobante(s), ${notasCount} nota(s). Motivo: ${motivoLimpio}`,
		});
	}

	revalidatePath("/cobranzas");
	revalidatePath("/admin/pagos");
	if (polizaId) revalidatePath(`/polizas/${polizaId}`);

	return {
		success: true,
		data: {
			abonos_borrados: abonosCount,
			comprobantes_borrados: comprobantesCount,
			archivos_borrados: archivosBorrados,
			notas_borradas: notasCount,
		},
	};
}

/**
 * Devuelve los abonos de una cuota (propia o de anexo) para corregir la fecha de
 * pago. Los abonos son la fuente de verdad del libro de abonos; la "F. Pago" que
 * se muestra se deriva de ellos.
 */
export async function obtenerAbonosCuotaAdmin(
	cuotaId: string,
	tipo: CuotaTipo,
): Promise<ActionResult<AbonoAdminRow[]>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const supabase = await createClient();
	const columnaCuota = tipo === "poliza" ? "pago_id" : "anexo_pago_id";

	const { data, error } = await supabase
		.from("polizas_pagos_abonos")
		.select("id, monto, fecha_pago, observaciones, created_at")
		.eq(columnaCuota, cuotaId)
		.order("created_at", { ascending: true });

	if (error) {
		console.error("[admin/pagos] Error cargando abonos:", error);
		return { success: false, error: "Error al cargar los abonos de la cuota." };
	}

	const filas: AbonoAdminRow[] = (data ?? []).map((a) => ({
		id: a.id,
		monto: Number(a.monto),
		fecha_pago: a.fecha_pago,
		observaciones: a.observaciones,
		created_at: a.created_at,
	}));

	return { success: true, data: filas };
}

const FECHA_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Corrige la fecha de pago de uno o más abonos de una cuota (típicamente un error
 * de tipeo en cobranzas) y recalcula la fecha_pago/estado de la cuota a partir de
 * sus abonos. NO borra nada: solo ajusta fechas. Queda registrado en el historial.
 */
export async function corregirFechasPagoCuota(
	cuotaId: string,
	tipo: CuotaTipo,
	cambios: CorregirFechaCambio[],
	motivo: string,
): Promise<ActionResult<{ abonos_corregidos: number; fecha_pago_cuota: string | null }>> {
	const auth = await requireAdmin();
	if (!auth.ok) return { success: false, error: auth.error };

	const motivoLimpio = motivo.trim();
	if (motivoLimpio.length < 10) {
		return { success: false, error: "El motivo debe tener al menos 10 caracteres." };
	}
	if (cambios.length === 0) {
		return { success: false, error: "No hay cambios de fecha que aplicar." };
	}
	for (const c of cambios) {
		if (!FECHA_ISO_RE.test(c.fecha_pago)) {
			return { success: false, error: "Hay una fecha con formato inválido." };
		}
	}

	const admin = createAdminClient();
	const columnaCuota = tipo === "poliza" ? "pago_id" : "anexo_pago_id";

	// Datos de la cuota + póliza (para validar y para el historial)
	let polizaId: string;
	let descripcionCuota: string;
	let montoCuota: number;
	if (tipo === "poliza") {
		const { data: cuota, error } = await admin
			.from("polizas_pagos")
			.select("id, poliza_id, numero_cuota, monto")
			.eq("id", cuotaId)
			.single();
		if (error || !cuota) return { success: false, error: "Cuota no encontrada." };
		polizaId = cuota.poliza_id;
		montoCuota = Number(cuota.monto);
		descripcionCuota = `cuota ${cuota.numero_cuota ?? "?"} de póliza`;
	} else {
		const { data: cuota, error } = await admin
			.from("polizas_anexos_pagos")
			.select("id, numero_cuota, monto, anexo_id, polizas_anexos!inner ( poliza_id, numero_anexo )")
			.eq("id", cuotaId)
			.single();
		if (error || !cuota) return { success: false, error: "Cuota de anexo no encontrada." };
		const anexo = Array.isArray(cuota.polizas_anexos) ? cuota.polizas_anexos[0] : cuota.polizas_anexos;
		polizaId = anexo?.poliza_id;
		montoCuota = Number(cuota.monto);
		descripcionCuota = `cuota ${cuota.numero_cuota ?? "?"} del anexo ${anexo?.numero_anexo ?? "?"}`;
	}

	// Aplicar las correcciones de fecha en cada abono (acotando por la cuota para
	// no tocar abonos de otra cuota si llegara un id incorrecto).
	let corregidos = 0;
	for (const cambio of cambios) {
		const { data: updated, error: errAbono } = await admin
			.from("polizas_pagos_abonos")
			.update({ fecha_pago: cambio.fecha_pago })
			.eq("id", cambio.abono_id)
			.eq(columnaCuota, cuotaId)
			.select("id");
		if (errAbono) {
			console.error("[admin/pagos] Error corrigiendo fecha de abono:", errAbono);
			return { success: false, error: "Error al corregir la fecha de un abono." };
		}
		corregidos += updated?.length ?? 0;
	}

	if (corregidos === 0) {
		return { success: false, error: "Ningún abono coincidió con la cuota indicada." };
	}

	// Recalcular fecha_pago/estado de la cuota a partir de TODOS sus abonos.
	const { data: abonos } = await admin
		.from("polizas_pagos_abonos")
		.select("monto, fecha_pago")
		.eq(columnaCuota, cuotaId);
	const abonado = (abonos ?? []).reduce((s, a) => s + Number(a.monto), 0);
	const fechas = (abonos ?? []).map((a) => a.fecha_pago).filter((f): f is string => Boolean(f));
	const maxFecha = fechas.length > 0 ? fechas.reduce((max, f) => (f > max ? f : max)) : null;

	let estado: "pendiente" | "parcial" | "pagado";
	let fechaPagoCuota: string | null;
	if (abonado >= montoCuota - 0.01) {
		estado = "pagado";
		fechaPagoCuota = maxFecha;
	} else if (abonado > 0) {
		estado = "parcial";
		fechaPagoCuota = null;
	} else {
		estado = "pendiente";
		fechaPagoCuota = null;
	}

	if (tipo === "poliza") {
		const { error: errCuota } = await admin
			.from("polizas_pagos")
			.update({ estado, fecha_pago: fechaPagoCuota })
			.eq("id", cuotaId);
		if (errCuota) {
			console.error("[admin/pagos] Error recalculando cuota:", errCuota);
			return { success: false, error: "Fechas corregidas pero falló el recálculo de la cuota. Revisar." };
		}
	} else {
		const { error: errCuota } = await admin
			.from("polizas_anexos_pagos")
			.update({
				estado,
				fecha_pago: fechaPagoCuota,
				updated_by: auth.userId,
				updated_at: new Date().toISOString(),
			})
			.eq("id", cuotaId);
		if (errCuota) {
			console.error("[admin/pagos] Error recalculando cuota de anexo:", errCuota);
			return { success: false, error: "Fechas corregidas pero falló el recálculo de la cuota. Revisar." };
		}
	}

	// Registrar en el historial de la póliza
	if (polizaId) {
		await admin.from("polizas_historial_ediciones").insert({
			poliza_id: polizaId,
			accion: "edicion",
			usuario_id: auth.userId,
			campos_modificados: ["fecha_pago"],
			descripcion: `Fecha de pago corregida por admin (${descripcionCuota}). ${corregidos} abono(s) ajustado(s); F. Pago de la cuota: ${fechaPagoCuota ?? "—"}. Motivo: ${motivoLimpio}`,
		});
	}

	revalidatePath("/cobranzas");
	revalidatePath("/admin/pagos");
	if (polizaId) revalidatePath(`/polizas/${polizaId}`);

	return { success: true, data: { abonos_corregidos: corregidos, fecha_pago_cuota: fechaPagoCuota } };
}
