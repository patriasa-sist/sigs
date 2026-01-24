"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  TipoSeguroDB,
  TipoSeguroConHijos,
  TipoSeguroForm,
  CatalogoActionResult,
  CatalogoStats,
} from "@/types/catalogo-seguros";

// ============================================
// Validation Schema
// ============================================

const ramoSchema = z
  .object({
    codigo: z
      .string()
      .min(2, "El código debe tener al menos 2 caracteres")
      .max(10, "El código no puede exceder 10 caracteres"),
    nombre: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(200, "El nombre no puede exceder 200 caracteres"),
    es_ramo_padre: z.boolean(),
    ramo_padre_id: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) => {
      // If not parent, must have parent_id
      if (!data.es_ramo_padre && !data.ramo_padre_id) {
        return false;
      }
      return true;
    },
    { message: "Un ramo hijo debe tener un ramo padre asignado" }
  );

// ============================================
// READ Operations
// ============================================

export async function obtenerRamos(
  includeInactive: boolean = false
): Promise<TipoSeguroConHijos[]> {
  const supabase = await createClient();

  let query = supabase
    .from("tipos_seguros")
    .select("*")
    .order("es_ramo_padre", { ascending: false })
    .order("nombre", { ascending: true });

  if (!includeInactive) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching ramos:", error);
    return [];
  }

  // Organize hierarchically
  const ramos = data || [];
  const padres = ramos.filter((r) => r.es_ramo_padre);
  const hijos = ramos.filter((r) => !r.es_ramo_padre);

  // Get parent names for all children
  const ramosConPadre: TipoSeguroConHijos[] = hijos.map((hijo) => {
    const padre = padres.find((p) => p.id === hijo.ramo_padre_id);
    return {
      ...hijo,
      ramo_padre: padre
        ? {
            id: padre.id,
            nombre: padre.nombre,
            codigo: padre.codigo,
          }
        : null,
    };
  });

  // Return flat list with hierarchy info for table display (parents first, then children)
  return [...padres, ...ramosConPadre];
}

export async function obtenerRamosPadre(): Promise<TipoSeguroDB[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tipos_seguros")
    .select("*")
    .eq("es_ramo_padre", true)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error fetching ramos padre:", error);
    return [];
  }

  return data || [];
}

export async function obtenerRamosStats(): Promise<
  CatalogoStats & { padres: number; hijos: number }
> {
  const supabase = await createClient();

  const [{ count: total }, { count: activos }, { count: padres }] =
    await Promise.all([
      supabase.from("tipos_seguros").select("*", { count: "exact", head: true }),
      supabase
        .from("tipos_seguros")
        .select("*", { count: "exact", head: true })
        .eq("activo", true),
      supabase
        .from("tipos_seguros")
        .select("*", { count: "exact", head: true })
        .eq("es_ramo_padre", true)
        .eq("activo", true),
    ]);

  return {
    total: total || 0,
    activos: activos || 0,
    inactivos: (total || 0) - (activos || 0),
    padres: padres || 0,
    hijos: (activos || 0) - (padres || 0),
  };
}

// ============================================
// CREATE Operation
// ============================================

export async function crearRamo(
  data: TipoSeguroForm
): Promise<CatalogoActionResult<TipoSeguroDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = ramoSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate code
  const { data: existingCode } = await supabase
    .from("tipos_seguros")
    .select("id")
    .ilike("codigo", data.codigo.trim())
    .single();

  if (existingCode) {
    return {
      success: false,
      error: "Ya existe un ramo con este código",
    };
  }

  // Insert
  const { data: newRamo, error } = await supabase
    .from("tipos_seguros")
    .insert({
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim(),
      es_ramo_padre: data.es_ramo_padre,
      ramo_padre_id: data.es_ramo_padre ? null : data.ramo_padre_id,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating ramo:", error);
    return {
      success: false,
      error: "Error al crear el ramo",
    };
  }

  revalidatePath("/admin/seguros/ramos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Ramo creado correctamente",
    data: newRamo,
  };
}

// ============================================
// UPDATE Operation
// ============================================

export async function actualizarRamo(
  id: number,
  data: TipoSeguroForm
): Promise<CatalogoActionResult<TipoSeguroDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = ramoSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate code (excluding current record)
  const { data: existingCode } = await supabase
    .from("tipos_seguros")
    .select("id")
    .ilike("codigo", data.codigo.trim())
    .neq("id", id)
    .single();

  if (existingCode) {
    return {
      success: false,
      error: "Ya existe otro ramo con este código",
    };
  }

  // If changing from parent to child, check for existing children
  const { data: currentRamo } = await supabase
    .from("tipos_seguros")
    .select("es_ramo_padre")
    .eq("id", id)
    .single();

  if (currentRamo?.es_ramo_padre && !data.es_ramo_padre) {
    const { count: childrenCount } = await supabase
      .from("tipos_seguros")
      .select("*", { count: "exact", head: true })
      .eq("ramo_padre_id", id);

    if (childrenCount && childrenCount > 0) {
      return {
        success: false,
        error: `No puede cambiar a ramo hijo porque tiene ${childrenCount} ramo(s) hijo(s) asignado(s)`,
      };
    }
  }

  // Update
  const { data: updatedRamo, error } = await supabase
    .from("tipos_seguros")
    .update({
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim(),
      es_ramo_padre: data.es_ramo_padre,
      ramo_padre_id: data.es_ramo_padre ? null : data.ramo_padre_id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating ramo:", error);
    return {
      success: false,
      error: "Error al actualizar el ramo",
    };
  }

  revalidatePath("/admin/seguros/ramos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Ramo actualizado correctamente",
    data: updatedRamo,
  };
}

// ============================================
// SOFT DELETE Operation
// ============================================

export async function desactivarRamo(id: number): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  // Check if ramo has active children
  const { count: childrenCount } = await supabase
    .from("tipos_seguros")
    .select("*", { count: "exact", head: true })
    .eq("ramo_padre_id", id)
    .eq("activo", true);

  if (childrenCount && childrenCount > 0) {
    return {
      success: false,
      error: `Este ramo tiene ${childrenCount} ramo(s) hijo(s) activo(s). Desactívelos primero.`,
    };
  }

  // Check if ramo has active products
  const { count: productosCount } = await supabase
    .from("productos_aseguradoras")
    .select("*", { count: "exact", head: true })
    .eq("tipo_seguro_id", id)
    .eq("activo", true);

  if (productosCount && productosCount > 0) {
    return {
      success: false,
      error: `Este ramo tiene ${productosCount} producto(s) activo(s). Desactívelos primero.`,
    };
  }

  const { error } = await supabase
    .from("tipos_seguros")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating ramo:", error);
    return {
      success: false,
      error: "Error al desactivar el ramo",
    };
  }

  revalidatePath("/admin/seguros/ramos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Ramo desactivado correctamente",
  };
}

// ============================================
// REACTIVATE Operation
// ============================================

export async function reactivarRamo(id: number): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  // Get ramo info
  const { data: ramo } = await supabase
    .from("tipos_seguros")
    .select("ramo_padre_id")
    .eq("id", id)
    .single();

  // If it's a child, check if parent is active
  if (ramo?.ramo_padre_id) {
    const { data: parent } = await supabase
      .from("tipos_seguros")
      .select("activo, nombre")
      .eq("id", ramo.ramo_padre_id)
      .single();

    if (parent && !parent.activo) {
      return {
        success: false,
        error: `No se puede reactivar porque el ramo padre "${parent.nombre}" está inactivo. Reactívelo primero.`,
      };
    }
  }

  const { error } = await supabase
    .from("tipos_seguros")
    .update({ activo: true })
    .eq("id", id);

  if (error) {
    console.error("Error reactivating ramo:", error);
    return {
      success: false,
      error: "Error al reactivar el ramo",
    };
  }

  revalidatePath("/admin/seguros/ramos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Ramo reactivado correctamente",
  };
}
