"use server";

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/utils/auth/helpers";
import { revalidatePath } from "next/cache";

// ============================================
// TYPES
// ============================================

export interface UsuarioConDatos {
	id: string;
	full_name: string;
	email: string;
	role: string;
	total_polizas: number;
	total_clientes: number;
}

export interface PolizaTransferible {
	id: string;
	numero_poliza: string;
	ramo: string;
	estado: string;
	compania_nombre: string;
	cliente_nombre: string;
	inicio_vigencia: string;
	fin_vigencia: string;
}

export interface ClienteTransferible {
	id: string;
	client_type: string;
	nombre: string;
	documento: string;
	status: string;
}

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

// ============================================
// SERVER ACTIONS
// ============================================

export async function obtenerUsuariosConDatos(): Promise<ActionResult<UsuarioConDatos[]>> {
	await requirePermission("admin.equipos");
	const supabase = await createClient();

	try {
		// Obtener todos los usuarios con roles relevantes
		const { data: profiles, error: profilesError } = await supabase
			.from("profiles")
			.select("id, full_name, email, role")
			.in("role", ["comercial", "agente", "admin", "usuario"])
			.order("full_name");

		if (profilesError) throw profilesError;

		// Contar polizas y clientes por usuario
		const usuarios: UsuarioConDatos[] = [];

		for (const profile of profiles || []) {
			const [polizasCount, clientesCount] = await Promise.all([
				supabase
					.from("polizas")
					.select("id", { count: "exact", head: true })
					.eq("responsable_id", profile.id),
				supabase
					.from("clients")
					.select("id", { count: "exact", head: true })
					.eq("executive_in_charge", profile.id),
			]);

			usuarios.push({
				...profile,
				full_name: profile.full_name || profile.email,
				total_polizas: polizasCount.count || 0,
				total_clientes: clientesCount.count || 0,
			});
		}

		return { success: true, data: usuarios };
	} catch (error) {
		console.error("Error obteniendo usuarios:", error);
		return { success: false, error: "Error al obtener usuarios" };
	}
}

export async function obtenerPolizasPorUsuario(
	userId: string
): Promise<ActionResult<PolizaTransferible[]>> {
	await requirePermission("admin.equipos");
	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from("polizas")
			.select(`
				id,
				numero_poliza,
				ramo,
				estado,
				inicio_vigencia,
				fin_vigencia,
				companias_aseguradoras (nombre)
			`)
			.eq("responsable_id", userId)
			.order("numero_poliza");

		if (error) throw error;

		// Obtener nombres de clientes
		const polizas: PolizaTransferible[] = [];
		for (const p of data || []) {
			polizas.push({
				id: p.id,
				numero_poliza: p.numero_poliza,
				ramo: p.ramo,
				estado: p.estado,
				compania_nombre: (p.companias_aseguradoras as unknown as { nombre: string } | null)?.nombre || "N/A",
				cliente_nombre: "",
				inicio_vigencia: p.inicio_vigencia,
				fin_vigencia: p.fin_vigencia,
			});
		}

		return { success: true, data: polizas };
	} catch (error) {
		console.error("Error obteniendo pólizas:", error);
		return { success: false, error: "Error al obtener pólizas del usuario" };
	}
}

export async function obtenerClientesPorUsuario(
	userId: string
): Promise<ActionResult<ClienteTransferible[]>> {
	await requirePermission("admin.equipos");
	const supabase = await createClient();

	try {
		const { data: rawClients, error } = await supabase
			.from("clients")
			.select(`
				id,
				client_type,
				status,
				natural_clients (primer_nombre, primer_apellido, numero_documento),
				juridic_clients (razon_social, nit),
				unipersonal_clients (razon_social, nit)
			`)
			.eq("executive_in_charge", userId)
			.order("created_at", { ascending: false });

		if (error) throw error;

		const clientes: ClienteTransferible[] = (rawClients || []).map((c) => {
			const nc = Array.isArray(c.natural_clients)
				? c.natural_clients[0]
				: c.natural_clients;
			const jc = Array.isArray(c.juridic_clients)
				? c.juridic_clients[0]
				: c.juridic_clients;
			const uc = Array.isArray(c.unipersonal_clients)
				? c.unipersonal_clients[0]
				: c.unipersonal_clients;

			let nombre = "Desconocido";
			let documento = "-";

			if (c.client_type === "natural" && nc) {
				nombre = `${nc.primer_nombre} ${nc.primer_apellido}`;
				documento = nc.numero_documento || "-";
			} else if (c.client_type === "juridica" && jc) {
				nombre = jc.razon_social || "Desconocido";
				documento = jc.nit || "-";
			} else if (c.client_type === "unipersonal" && uc) {
				nombre = uc.razon_social || "Desconocido";
				documento = uc.nit || "-";
			}

			return {
				id: c.id,
				client_type: c.client_type,
				nombre,
				documento,
				status: c.status,
			};
		});

		return { success: true, data: clientes };
	} catch (error) {
		console.error("Error obteniendo clientes:", error);
		return { success: false, error: "Error al obtener clientes del usuario" };
	}
}

export async function transferirPolizas(
	polizaIds: string[],
	nuevoResponsableId: string,
	motivo?: string
): Promise<ActionResult<{ transferidos: number }>> {
	const profile = await requirePermission("admin.equipos");
	const supabase = await createClient();

	try {
		if (!polizaIds.length) {
			return { success: false, error: "No se seleccionaron pólizas" };
		}

		// Verificar que el nuevo responsable existe
		const { data: targetUser, error: targetError } = await supabase
			.from("profiles")
			.select("id, full_name")
			.eq("id", nuevoResponsableId)
			.single();

		if (targetError || !targetUser) {
			return { success: false, error: "Usuario destino no encontrado" };
		}

		// Actualizar responsable_id en lotes
		const { error: updateError, count } = await supabase
			.from("polizas")
			.update({ responsable_id: nuevoResponsableId })
			.in("id", polizaIds);

		if (updateError) throw updateError;

		// Registrar en historial
		const historialEntries = polizaIds.map((polizaId) => ({
			poliza_id: polizaId,
			accion: "transferencia",
			usuario_id: profile.id,
			campos_modificados: ["responsable_id"],
			descripcion: `Transferencia de responsable a ${targetUser.full_name}${motivo ? ` - Motivo: ${motivo}` : ""}`,
		}));

		await supabase.from("polizas_historial_ediciones").insert(historialEntries);

		revalidatePath("/polizas");
		revalidatePath("/admin/transferencias");

		return { success: true, data: { transferidos: count || polizaIds.length } };
	} catch (error) {
		console.error("Error transfiriendo pólizas:", error);
		return { success: false, error: "Error al transferir pólizas" };
	}
}

export async function transferirClientes(
	clientIds: string[],
	nuevoEjecutivoId: string,
	motivo?: string
): Promise<ActionResult<{ transferidos: number }>> {
	const profile = await requirePermission("admin.equipos");
	const supabase = await createClient();

	try {
		if (!clientIds.length) {
			return { success: false, error: "No se seleccionaron clientes" };
		}

		// Verificar que el nuevo ejecutivo existe
		const { data: targetUser, error: targetError } = await supabase
			.from("profiles")
			.select("id, full_name")
			.eq("id", nuevoEjecutivoId)
			.single();

		if (targetError || !targetUser) {
			return { success: false, error: "Usuario destino no encontrado" };
		}

		// Actualizar executive_in_charge
		const { error: updateError, count } = await supabase
			.from("clients")
			.update({ executive_in_charge: nuevoEjecutivoId })
			.in("id", clientIds);

		if (updateError) throw updateError;

		// Registrar en historial
		const historialEntries = clientIds.map((clientId) => ({
			client_id: clientId,
			tabla_modificada: "clients",
			tipo_cambio: "modificacion",
			campo_modificado: "executive_in_charge",
			valor_nuevo: `Transferido a ${targetUser.full_name}${motivo ? ` - Motivo: ${motivo}` : ""}`,
			modificado_por: profile.id,
		}));

		await supabase.from("clientes_historial_ediciones").insert(historialEntries);

		revalidatePath("/clientes");
		revalidatePath("/admin/transferencias");

		return { success: true, data: { transferidos: count || clientIds.length } };
	} catch (error) {
		console.error("Error transfiriendo clientes:", error);
		return { success: false, error: "Error al transferir clientes" };
	}
}
