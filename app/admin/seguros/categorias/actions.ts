"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  CategoriaDB,
  CategoriaForm,
  CatalogoActionResult,
  CatalogoStats,
} from "@/types/catalogo-seguros";

// ============================================
// Validation Schema
// ============================================

const categoriaSchema = z.object({
  nombre: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  descripcion: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .nullable()
    .optional(),
});

// ============================================
// READ Operations
// ============================================

export async function obtenerCategorias(
  includeInactive: boolean = false
): Promise<CategoriaDB[]> {
  const supabase = await createClient();

  let query = supabase
    .from("categorias")
    .select("*")
    .order("nombre", { ascending: true });

  if (!includeInactive) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching categorias:", error);
    return [];
  }

  return data || [];
}

export async function obtenerCategoriasStats(): Promise<CatalogoStats> {
  const supabase = await createClient();

  const [{ count: total }, { count: activos }] = await Promise.all([
    supabase.from("categorias").select("*", { count: "exact", head: true }),
    supabase
      .from("categorias")
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

export async function crearCategoria(
  data: CategoriaForm
): Promise<CatalogoActionResult<CategoriaDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = categoriaSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate name
  const { data: existing } = await supabase
    .from("categorias")
    .select("id")
    .ilike("nombre", data.nombre.trim())
    .single();

  if (existing) {
    return {
      success: false,
      error: "Ya existe una categoría con este nombre",
    };
  }

  // Insert
  const { data: newCategoria, error } = await supabase
    .from("categorias")
    .insert({
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating categoria:", error);
    return {
      success: false,
      error: "Error al crear la categoría",
    };
  }

  revalidatePath("/admin/seguros/categorias");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Categoría creada correctamente",
    data: newCategoria,
  };
}

// ============================================
// UPDATE Operation
// ============================================

export async function actualizarCategoria(
  id: string,
  data: CategoriaForm
): Promise<CatalogoActionResult<CategoriaDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = categoriaSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate name (excluding current record)
  const { data: existing } = await supabase
    .from("categorias")
    .select("id")
    .ilike("nombre", data.nombre.trim())
    .neq("id", id)
    .single();

  if (existing) {
    return {
      success: false,
      error: "Ya existe otra categoría con este nombre",
    };
  }

  // Update
  const { data: updatedCategoria, error } = await supabase
    .from("categorias")
    .update({
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating categoria:", error);
    return {
      success: false,
      error: "Error al actualizar la categoría",
    };
  }

  revalidatePath("/admin/seguros/categorias");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Categoría actualizada correctamente",
    data: updatedCategoria,
  };
}

// ============================================
// SOFT DELETE Operation
// ============================================

export async function desactivarCategoria(
  id: string
): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  // Check if category is in use by active policies
  const { count: polizasCount } = await supabase
    .from("polizas")
    .select("*", { count: "exact", head: true })
    .eq("categoria_id", id)
    .neq("estado", "cancelada");

  if (polizasCount && polizasCount > 0) {
    return {
      success: false,
      error: `Esta categoría está siendo usada por ${polizasCount} póliza(s) activa(s). No se puede desactivar.`,
    };
  }

  const { error } = await supabase
    .from("categorias")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating categoria:", error);
    return {
      success: false,
      error: "Error al desactivar la categoría",
    };
  }

  revalidatePath("/admin/seguros/categorias");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Categoría desactivada correctamente",
  };
}

// ============================================
// REACTIVATE Operation
// ============================================

export async function reactivarCategoria(
  id: string
): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("categorias")
    .update({ activo: true })
    .eq("id", id);

  if (error) {
    console.error("Error reactivating categoria:", error);
    return {
      success: false,
      error: "Error al reactivar la categoría",
    };
  }

  revalidatePath("/admin/seguros/categorias");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Categoría reactivada correctamente",
  };
}
