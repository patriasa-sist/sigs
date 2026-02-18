"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================
// Types
// ============================================

export type DirectorCarteraDB = {
  id: string;
  nombre: string;
  apellidos: string | null;
  activo: boolean;
  created_at: string;
  created_by: string | null;
};

export type DirectorCarteraForm = {
  nombre: string;
  apellidos?: string | null;
};

export type DirectorActionResult<T = undefined> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export type DirectorStats = {
  total: number;
  activos: number;
  inactivos: number;
};

// ============================================
// Validation Schema
// ============================================

const directorSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  apellidos: z
    .string()
    .max(100, "Los apellidos no pueden exceder 100 caracteres")
    .optional()
    .nullable(),
});

// ============================================
// READ Operations
// ============================================

export async function obtenerDirectoresCartera(
  includeInactive: boolean = false
): Promise<DirectorCarteraDB[]> {
  const supabase = await createClient();

  let query = supabase
    .from("directores_cartera")
    .select("*")
    .order("nombre", { ascending: true });

  if (!includeInactive) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching directores de cartera:", error);
    return [];
  }

  return data || [];
}

export async function obtenerDirectoresStats(): Promise<DirectorStats> {
  const supabase = await createClient();

  const [{ count: total }, { count: activos }] = await Promise.all([
    supabase
      .from("directores_cartera")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("directores_cartera")
      .select("*", { count: "exact", head: true })
      .eq("activo", true),
  ]);

  return {
    total: total || 0,
    activos: activos || 0,
    inactivos: (total || 0) - (activos || 0),
  };
}

// ============================================
// CREATE Operation
// ============================================

export async function crearDirectorCartera(
  data: DirectorCarteraForm
): Promise<DirectorActionResult<DirectorCarteraDB>> {
  const supabase = await createClient();

  const validation = directorSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const nombreTrim = data.nombre.trim();
  const apellidosTrim = data.apellidos?.trim() || null;

  // Check duplicate
  const { data: existing } = await supabase
    .from("directores_cartera")
    .select("id")
    .ilike("nombre", nombreTrim)
    .single();

  if (existing) {
    return { success: false, error: "Ya existe un director con ese nombre" };
  }

  const { data: newDirector, error } = await supabase
    .from("directores_cartera")
    .insert({ nombre: nombreTrim, apellidos: apellidosTrim, activo: true })
    .select()
    .single();

  if (error) {
    console.error("Error creating director:", error);
    return { success: false, error: "Error al crear el director" };
  }

  revalidatePath("/admin/directores-cartera");

  return {
    success: true,
    message: "Director creado correctamente",
    data: newDirector,
  };
}

// ============================================
// UPDATE Operation
// ============================================

export async function actualizarDirectorCartera(
  id: string,
  data: DirectorCarteraForm
): Promise<DirectorActionResult<DirectorCarteraDB>> {
  const supabase = await createClient();

  const validation = directorSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const nombreTrim = data.nombre.trim();
  const apellidosTrim = data.apellidos?.trim() || null;

  // Check duplicate (excluding current)
  const { data: existing } = await supabase
    .from("directores_cartera")
    .select("id")
    .ilike("nombre", nombreTrim)
    .neq("id", id)
    .single();

  if (existing) {
    return {
      success: false,
      error: "Ya existe otro director con ese nombre",
    };
  }

  const { data: updated, error } = await supabase
    .from("directores_cartera")
    .update({ nombre: nombreTrim, apellidos: apellidosTrim })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating director:", error);
    return { success: false, error: "Error al actualizar el director" };
  }

  revalidatePath("/admin/directores-cartera");

  return {
    success: true,
    message: "Director actualizado correctamente",
    data: updated,
  };
}

// ============================================
// SOFT DELETE Operation
// ============================================

export async function desactivarDirectorCartera(
  id: string
): Promise<DirectorActionResult> {
  const supabase = await createClient();

  // Check if director has active clients
  const { count: clientesCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("director_cartera_id", id);

  if (clientesCount && clientesCount > 0) {
    return {
      success: false,
      error: `Este director tiene ${clientesCount} cliente(s) asignado(s). Reasígnalos antes de desactivar.`,
    };
  }

  const { error } = await supabase
    .from("directores_cartera")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating director:", error);
    return { success: false, error: "Error al desactivar el director" };
  }

  revalidatePath("/admin/directores-cartera");

  return { success: true, message: "Director desactivado correctamente" };
}

// ============================================
// REACTIVATE Operation
// ============================================

export async function reactivarDirectorCartera(
  id: string
): Promise<DirectorActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("directores_cartera")
    .update({ activo: true })
    .eq("id", id);

  if (error) {
    console.error("Error reactivating director:", error);
    return { success: false, error: "Error al reactivar el director" };
  }

  revalidatePath("/admin/directores-cartera");

  return { success: true, message: "Director reactivado correctamente" };
}
