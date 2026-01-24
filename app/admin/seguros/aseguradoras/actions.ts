"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  CompaniaAseguradoraDB,
  CompaniaAseguradoraForm,
  CatalogoActionResult,
  CatalogoStats,
} from "@/types/catalogo-seguros";

// ============================================
// Validation Schema
// ============================================

const aseguradoraSchema = z.object({
  nombre: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede exceder 200 caracteres"),
  codigo: z
    .number()
    .int("El código debe ser un número entero")
    .positive("El código debe ser positivo")
    .nullable()
    .optional(),
});

// ============================================
// READ Operations
// ============================================

export async function obtenerAseguradoras(
  includeInactive: boolean = false
): Promise<CompaniaAseguradoraDB[]> {
  const supabase = await createClient();

  let query = supabase
    .from("companias_aseguradoras")
    .select("*")
    .order("nombre", { ascending: true });

  if (!includeInactive) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching aseguradoras:", error);
    return [];
  }

  return data || [];
}

export async function obtenerAseguradorasStats(): Promise<CatalogoStats> {
  const supabase = await createClient();

  const [{ count: total }, { count: activos }] = await Promise.all([
    supabase.from("companias_aseguradoras").select("*", { count: "exact", head: true }),
    supabase
      .from("companias_aseguradoras")
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

export async function crearAseguradora(
  data: CompaniaAseguradoraForm
): Promise<CatalogoActionResult<CompaniaAseguradoraDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = aseguradoraSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate name
  const { data: existingName } = await supabase
    .from("companias_aseguradoras")
    .select("id")
    .ilike("nombre", data.nombre.trim())
    .single();

  if (existingName) {
    return {
      success: false,
      error: "Ya existe una aseguradora con este nombre",
    };
  }

  // Check for duplicate code if provided
  if (data.codigo) {
    const { data: existingCode } = await supabase
      .from("companias_aseguradoras")
      .select("id")
      .eq("codigo", data.codigo)
      .single();

    if (existingCode) {
      return {
        success: false,
        error: "Ya existe una aseguradora con este código",
      };
    }
  }

  // Insert
  const { data: newAseguradora, error } = await supabase
    .from("companias_aseguradoras")
    .insert({
      nombre: data.nombre.trim(),
      codigo: data.codigo || null,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating aseguradora:", error);
    return {
      success: false,
      error: "Error al crear la aseguradora",
    };
  }

  revalidatePath("/admin/seguros/aseguradoras");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Aseguradora creada correctamente",
    data: newAseguradora,
  };
}

// ============================================
// UPDATE Operation
// ============================================

export async function actualizarAseguradora(
  id: string,
  data: CompaniaAseguradoraForm
): Promise<CatalogoActionResult<CompaniaAseguradoraDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = aseguradoraSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate name (excluding current record)
  const { data: existingName } = await supabase
    .from("companias_aseguradoras")
    .select("id")
    .ilike("nombre", data.nombre.trim())
    .neq("id", id)
    .single();

  if (existingName) {
    return {
      success: false,
      error: "Ya existe otra aseguradora con este nombre",
    };
  }

  // Check for duplicate code if provided (excluding current record)
  if (data.codigo) {
    const { data: existingCode } = await supabase
      .from("companias_aseguradoras")
      .select("id")
      .eq("codigo", data.codigo)
      .neq("id", id)
      .single();

    if (existingCode) {
      return {
        success: false,
        error: "Ya existe otra aseguradora con este código",
      };
    }
  }

  // Update
  const { data: updatedAseguradora, error } = await supabase
    .from("companias_aseguradoras")
    .update({
      nombre: data.nombre.trim(),
      codigo: data.codigo || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating aseguradora:", error);
    return {
      success: false,
      error: "Error al actualizar la aseguradora",
    };
  }

  revalidatePath("/admin/seguros/aseguradoras");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Aseguradora actualizada correctamente",
    data: updatedAseguradora,
  };
}

// ============================================
// SOFT DELETE Operation
// ============================================

export async function desactivarAseguradora(
  id: string
): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  // Check if aseguradora is in use by active policies
  const { count: polizasCount } = await supabase
    .from("polizas")
    .select("*", { count: "exact", head: true })
    .eq("compania_aseguradora_id", id)
    .neq("estado", "cancelada");

  if (polizasCount && polizasCount > 0) {
    return {
      success: false,
      error: `Esta aseguradora tiene ${polizasCount} póliza(s) activa(s). No se puede desactivar.`,
    };
  }

  // Check if aseguradora has active products
  const { count: productosCount } = await supabase
    .from("productos_aseguradoras")
    .select("*", { count: "exact", head: true })
    .eq("compania_aseguradora_id", id)
    .eq("activo", true);

  if (productosCount && productosCount > 0) {
    return {
      success: false,
      error: `Esta aseguradora tiene ${productosCount} producto(s) activo(s). Desactívelos primero.`,
    };
  }

  const { error } = await supabase
    .from("companias_aseguradoras")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating aseguradora:", error);
    return {
      success: false,
      error: "Error al desactivar la aseguradora",
    };
  }

  revalidatePath("/admin/seguros/aseguradoras");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Aseguradora desactivada correctamente",
  };
}

// ============================================
// REACTIVATE Operation
// ============================================

export async function reactivarAseguradora(
  id: string
): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("companias_aseguradoras")
    .update({ activo: true })
    .eq("id", id);

  if (error) {
    console.error("Error reactivating aseguradora:", error);
    return {
      success: false,
      error: "Error al reactivar la aseguradora",
    };
  }

  revalidatePath("/admin/seguros/aseguradoras");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Aseguradora reactivada correctamente",
  };
}
