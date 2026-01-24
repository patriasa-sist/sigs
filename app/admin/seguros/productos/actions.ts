"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  ProductoAseguradoraDB,
  ProductoConRelaciones,
  ProductoAseguradoraForm,
  CatalogoActionResult,
  CatalogoStats,
} from "@/types/catalogo-seguros";

// ============================================
// Validation Schema
// ============================================

const productoSchema = z.object({
  compania_aseguradora_id: z.string().uuid("Debe seleccionar una aseguradora"),
  tipo_seguro_id: z.number().int().positive("Debe seleccionar un ramo"),
  codigo_producto: z
    .string()
    .min(1, "El código es requerido")
    .max(50, "El código no puede exceder 50 caracteres"),
  nombre_producto: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(300, "El nombre no puede exceder 300 caracteres"),
  factor_contado: z
    .number()
    .positive("El factor debe ser positivo")
    .max(100, "El factor no puede exceder 100"),
  factor_credito: z
    .number()
    .positive("El factor debe ser positivo")
    .max(100, "El factor no puede exceder 100"),
  porcentaje_comision: z
    .number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(1, "El porcentaje no puede exceder 1 (100%)"),
  regional: z
    .string()
    .min(2, "La regional debe tener al menos 2 caracteres")
    .max(50, "La regional no puede exceder 50 caracteres"),
});

// ============================================
// READ Operations
// ============================================

export async function obtenerProductos(
  filters?: {
    compania_id?: string;
    tipo_seguro_id?: number;
    includeInactive?: boolean;
  }
): Promise<ProductoConRelaciones[]> {
  const supabase = await createClient();

  let query = supabase
    .from("productos_aseguradoras")
    .select(
      `
      *,
      companias_aseguradoras (id, nombre),
      tipos_seguros (id, nombre, codigo)
    `
    )
    .order("nombre_producto", { ascending: true });

  if (!filters?.includeInactive) {
    query = query.eq("activo", true);
  }

  if (filters?.compania_id) {
    query = query.eq("compania_aseguradora_id", filters.compania_id);
  }

  if (filters?.tipo_seguro_id) {
    query = query.eq("tipo_seguro_id", filters.tipo_seguro_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching productos:", error);
    return [];
  }

  return (data as ProductoConRelaciones[]) || [];
}

export async function obtenerProductosStats(): Promise<CatalogoStats> {
  const supabase = await createClient();

  const [{ count: total }, { count: activos }] = await Promise.all([
    supabase
      .from("productos_aseguradoras")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("productos_aseguradoras")
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

export async function crearProducto(
  data: ProductoAseguradoraForm
): Promise<CatalogoActionResult<ProductoAseguradoraDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = productoSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate code within same company
  const { data: existingCode } = await supabase
    .from("productos_aseguradoras")
    .select("id")
    .eq("compania_aseguradora_id", data.compania_aseguradora_id)
    .ilike("codigo_producto", data.codigo_producto.trim())
    .single();

  if (existingCode) {
    return {
      success: false,
      error: "Ya existe un producto con este código para esta aseguradora",
    };
  }

  // Insert
  const { data: newProducto, error } = await supabase
    .from("productos_aseguradoras")
    .insert({
      compania_aseguradora_id: data.compania_aseguradora_id,
      tipo_seguro_id: data.tipo_seguro_id,
      codigo_producto: data.codigo_producto.trim(),
      nombre_producto: data.nombre_producto.trim(),
      factor_contado: data.factor_contado,
      factor_credito: data.factor_credito,
      porcentaje_comision: data.porcentaje_comision,
      regional: data.regional.trim(),
      activo: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating producto:", error);
    return {
      success: false,
      error: "Error al crear el producto",
    };
  }

  revalidatePath("/admin/seguros/productos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Producto creado correctamente",
    data: newProducto,
  };
}

// ============================================
// UPDATE Operation
// ============================================

export async function actualizarProducto(
  id: string,
  data: ProductoAseguradoraForm
): Promise<CatalogoActionResult<ProductoAseguradoraDB>> {
  const supabase = await createClient();

  // Validate input
  const validation = productoSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0].message,
    };
  }

  // Check for duplicate code within same company (excluding current record)
  const { data: existingCode } = await supabase
    .from("productos_aseguradoras")
    .select("id")
    .eq("compania_aseguradora_id", data.compania_aseguradora_id)
    .ilike("codigo_producto", data.codigo_producto.trim())
    .neq("id", id)
    .single();

  if (existingCode) {
    return {
      success: false,
      error: "Ya existe otro producto con este código para esta aseguradora",
    };
  }

  // Update
  const { data: updatedProducto, error } = await supabase
    .from("productos_aseguradoras")
    .update({
      compania_aseguradora_id: data.compania_aseguradora_id,
      tipo_seguro_id: data.tipo_seguro_id,
      codigo_producto: data.codigo_producto.trim(),
      nombre_producto: data.nombre_producto.trim(),
      factor_contado: data.factor_contado,
      factor_credito: data.factor_credito,
      porcentaje_comision: data.porcentaje_comision,
      regional: data.regional.trim(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating producto:", error);
    return {
      success: false,
      error: "Error al actualizar el producto",
    };
  }

  revalidatePath("/admin/seguros/productos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Producto actualizado correctamente",
    data: updatedProducto,
  };
}

// ============================================
// SOFT DELETE Operation
// ============================================

export async function desactivarProducto(
  id: string
): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  // Check if product is in use by active policies
  const { count: polizasCount } = await supabase
    .from("polizas")
    .select("*", { count: "exact", head: true })
    .eq("producto_id", id)
    .neq("estado", "cancelada");

  if (polizasCount && polizasCount > 0) {
    return {
      success: false,
      error: `Este producto está siendo usado por ${polizasCount} póliza(s) activa(s). No se puede desactivar.`,
    };
  }

  const { error } = await supabase
    .from("productos_aseguradoras")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating producto:", error);
    return {
      success: false,
      error: "Error al desactivar el producto",
    };
  }

  revalidatePath("/admin/seguros/productos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Producto desactivado correctamente",
  };
}

// ============================================
// REACTIVATE Operation
// ============================================

export async function reactivarProducto(
  id: string
): Promise<CatalogoActionResult> {
  const supabase = await createClient();

  // Get product info to check if related entities are active
  const { data: producto } = await supabase
    .from("productos_aseguradoras")
    .select("compania_aseguradora_id, tipo_seguro_id")
    .eq("id", id)
    .single();

  if (producto) {
    // Check if company is active
    const { data: company } = await supabase
      .from("companias_aseguradoras")
      .select("activo, nombre")
      .eq("id", producto.compania_aseguradora_id)
      .single();

    if (company && !company.activo) {
      return {
        success: false,
        error: `No se puede reactivar porque la aseguradora "${company.nombre}" está inactiva. Reactívela primero.`,
      };
    }

    // Check if ramo is active
    const { data: ramo } = await supabase
      .from("tipos_seguros")
      .select("activo, nombre")
      .eq("id", producto.tipo_seguro_id)
      .single();

    if (ramo && !ramo.activo) {
      return {
        success: false,
        error: `No se puede reactivar porque el ramo "${ramo.nombre}" está inactivo. Reactívelo primero.`,
      };
    }
  }

  const { error } = await supabase
    .from("productos_aseguradoras")
    .update({ activo: true })
    .eq("id", id);

  if (error) {
    console.error("Error reactivating producto:", error);
    return {
      success: false,
      error: "Error al reactivar el producto",
    };
  }

  revalidatePath("/admin/seguros/productos");
  revalidatePath("/admin/seguros");

  return {
    success: true,
    message: "Producto reactivado correctamente",
  };
}
