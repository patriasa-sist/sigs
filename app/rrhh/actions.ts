"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  EmpleadoFormState,
  ChecklistItem,
  EmployeeDetail,
  EmployeeListItem,
} from "@/types/rrhh";
import { crearChecklistVacio } from "@/types/rrhh";

// -----------------------------------------------
// Listar empleados
// -----------------------------------------------
export async function listarEmpleados(): Promise<{
  data: EmployeeListItem[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "No autenticado" };

  const { data, error } = await supabase
    .from("employees")
    .select(`
      id, nombres, apellidos, nro_documento, cargo, fecha_ingreso, activo,
      employee_checklist ( items )
    `)
    .order("apellidos", { ascending: true });

  if (error) return { data: [], error: error.message };

  const lista: EmployeeListItem[] = (data ?? []).map((e) => {
    const items = (e.employee_checklist as { items?: Record<string, ChecklistItem> }[])?.[0]?.items ?? {};
    const total = 28; // items 6-33
    const completados = Object.values(items).filter((i) => i.estado !== null && i.estado !== undefined).length;
    const completitud_checklist = total > 0 ? Math.round((completados / total) * 100) : 0;

    return {
      id: e.id as string,
      nombres: e.nombres as string,
      apellidos: e.apellidos as string,
      nro_documento: e.nro_documento as string,
      cargo: e.cargo as string,
      fecha_ingreso: e.fecha_ingreso as string,
      activo: e.activo as boolean,
      completitud_checklist,
    };
  });

  return { data: lista, error: null };
}

// -----------------------------------------------
// Obtener detalle de empleado
// -----------------------------------------------
export async function obtenerEmpleado(id: string): Promise<{
  data: EmployeeDetail | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("employees")
    .select(`
      *,
      employee_family_refs ( * ),
      employee_patrimony (
        *,
        employee_patrimony_items ( * )
      ),
      employee_checklist ( * ),
      employee_documents ( * )
    `)
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };

  // Normalizar patrimony (puede ser array por el join)
  const raw = data as Record<string, unknown>;
  const patrimonyArr = raw.employee_patrimony as Record<string, unknown>[] | null;
  const patrimony = Array.isArray(patrimonyArr) && patrimonyArr.length > 0
    ? patrimonyArr[0]
    : null;

  const checklistArr = raw.employee_checklist as Record<string, unknown>[] | null;
  const checklist = Array.isArray(checklistArr) && checklistArr.length > 0
    ? checklistArr[0]
    : null;

  return {
    data: { ...raw, employee_patrimony: patrimony, employee_checklist: checklist } as unknown as EmployeeDetail,
    error: null,
  };
}

// -----------------------------------------------
// Guardar empleado (nuevo)
// -----------------------------------------------
export async function guardarEmpleado(
  formState: EmpleadoFormState
): Promise<{ success: boolean; employee_id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { identificacion, direccion, laboral, patrimonio, checklist, documentos } = formState;

  if (!identificacion || !laboral) {
    return { success: false, error: "Datos de identificación y laborales son obligatorios" };
  }

  // 1. Insertar empleado principal
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .insert({
      nombres:                  identificacion.nombres,
      apellidos:                identificacion.apellidos,
      tipo_documento:           identificacion.tipo_documento,
      extension:                identificacion.extension || null,
      nro_documento:            identificacion.nro_documento,
      complemento:              identificacion.complemento || null,
      nro_nua_cua:              identificacion.nro_nua_cua || null,
      nit:                      identificacion.nit || null,
      fecha_nacimiento:         identificacion.fecha_nacimiento,
      genero:                   identificacion.genero,
      nacionalidad:             identificacion.otra_nacionalidad || identificacion.nacionalidad,
      estado_civil:             identificacion.estado_civil || null,
      nombre_conyuge:           identificacion.nombre_conyuge || null,
      av_calle_pasaje:          direccion?.av_calle_pasaje || null,
      zona_barrio:              direccion?.zona_barrio || null,
      urbanizacion_condominio:  direccion?.urbanizacion_condominio || null,
      edif_bloque_piso:         direccion?.edif_bloque_piso || null,
      casilla:                  direccion?.casilla || null,
      referencia_direccion:     direccion?.referencia_direccion || null,
      departamento:             direccion?.departamento || null,
      pais:                     direccion?.pais || "Bolivia",
      lat:                      direccion?.lat ?? null,
      lng:                      direccion?.lng ?? null,
      telefono:                 direccion?.telefono || null,
      email:                    direccion?.email || null,
      fecha_ingreso:            laboral.fecha_ingreso,
      cargo:                    laboral.cargo,
      haber_basico:             laboral.haber_basico ?? null,
      area_solicitante:         laboral.area_solicitante || null,
      medio_comunicacion:       laboral.medio_comunicacion || null,
      medio_comunicacion_desc:  laboral.medio_comunicacion_desc || null,
      entrevistado_por_nombre:  laboral.entrevistado_por_nombre || null,
      entrevistado_por_cargo:   laboral.entrevistado_por_cargo || null,
      entrevistado_fecha:       laboral.entrevistado_fecha || null,
      aprobado_por_nombre:      laboral.aprobado_por_nombre || null,
      aprobado_por_cargo:       laboral.aprobado_por_cargo || null,
      aprobado_fecha:           laboral.aprobado_fecha || null,
      created_by:               user.id,
      updated_by:               user.id,
    })
    .select("id")
    .single();

  if (empError || !employee) {
    return { success: false, error: empError?.message ?? "Error al guardar el empleado" };
  }

  const employeeId = employee.id as string;

  // 2. Referencias familiares
  if (direccion?.referencias) {
    for (let i = 0; i < 2; i++) {
      const ref = direccion.referencias[i as 0 | 1];
      if (ref?.nombres_apellidos?.trim()) {
        await supabase.from("employee_family_refs").insert({
          employee_id:      employeeId,
          orden:            i + 1,
          nombres_apellidos: ref.nombres_apellidos,
          telefono:         ref.telefono || null,
          parentesco:       ref.parentesco || null,
        });
      }
    }
  }

  // 3. Estado patrimonial
  if (patrimonio) {
    const { data: pat, error: patError } = await supabase
      .from("employee_patrimony")
      .insert({
        employee_id:       employeeId,
        disponible:        patrimonio.disponible ?? 0,
        lugar_fecha:       patrimonio.lugar_fecha || null,
        fecha_declaracion: patrimonio.fecha_declaracion || null,
      })
      .select("id")
      .single();

    if (!patError && pat) {
      const items = [
        ...patrimonio.inmuebles.map((i, idx) => ({ ...i, categoria: "inmueble" as const, orden: idx })),
        ...patrimonio.vehiculos.map((i, idx) => ({ ...i, categoria: "vehiculo" as const, orden: idx })),
        ...patrimonio.otros_bienes.map((i, idx) => ({ ...i, categoria: "otro_bien" as const, orden: idx })),
        ...patrimonio.deudas.map((i, idx) => ({ ...i, categoria: "deuda" as const, orden: idx })),
      ].filter((i) => i.descripcion?.trim() || i.modelo_marca?.trim() || i.entidad?.trim() || (i.valor ?? 0) > 0);

      if (items.length > 0) {
        const rows = items.map((i) => ({
          patrimony_id:      pat.id,
          categoria:         i.categoria,
          descripcion:       i.descripcion || null,
          ubicacion:         "ubicacion" in i ? (i as { ubicacion: string }).ubicacion || null : null,
          modelo_marca:      "modelo_marca" in i ? (i as { modelo_marca: string }).modelo_marca || null : null,
          placa:             "placa" in i ? (i as { placa: string }).placa || null : null,
          entidad:           "entidad" in i ? (i as { entidad: string }).entidad || null : null,
          tipo_deuda:        "tipo_deuda" in i ? (i as { tipo_deuda: string }).tipo_deuda || null : null,
          fecha_vencimiento: "fecha_vencimiento" in i ? (i as { fecha_vencimiento: string }).fecha_vencimiento || null : null,
          valor:             i.valor ?? 0,
          orden:             i.orden,
        }));
        await supabase.from("employee_patrimony_items").insert(rows);
      }
    }
  }

  // 4. Checklist
  const checklistData = checklist ?? crearChecklistVacio();
  await supabase.from("employee_checklist").insert({
    employee_id: employeeId,
    items:       checklistData,
    updated_by:  user.id,
  });

  // 5. Documentos (los que ya fueron subidos a Storage)
  const docsParaRegistrar = documentos.filter((d) => d.storage_path && d.upload_status === "uploaded");
  if (docsParaRegistrar.length > 0) {
    await supabase.from("employee_documents").insert(
      docsParaRegistrar.map((d) => ({
        employee_id:    employeeId,
        tipo_documento: d.tipo_documento,
        nombre_archivo: d.nombre_archivo,
        archivo_url:    d.storage_path!,
        tamano_bytes:   d.tamano_bytes,
        estado:         "activo",
        created_by:     user.id,
      }))
    );
  }

  revalidatePath("/rrhh");

  return { success: true, employee_id: employeeId };
}

// -----------------------------------------------
// Actualizar checklist
// -----------------------------------------------
export async function actualizarChecklist(
  employeeId: string,
  items: Record<string, ChecklistItem>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("employee_checklist")
    .upsert(
      { employee_id: employeeId, items, updated_by: user.id },
      { onConflict: "employee_id" }
    );

  if (error) return { success: false, error: error.message };

  revalidatePath(`/rrhh/${employeeId}`);
  return { success: true };
}

// -----------------------------------------------
// Subir documento
// -----------------------------------------------
export async function subirDocumentoEmpleado(
  employeeId: string,
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const file = formData.get("file") as File | null;
  const tipoDocumento = formData.get("tipo_documento") as string;

  if (!file) return { success: false, error: "Archivo no recibido" };

  const ext = file.name.split(".").pop();
  const path = `${employeeId}/${Date.now()}_${tipoDocumento}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("rrhh-documentos")
    .upload(path, file);

  if (uploadError) return { success: false, error: uploadError.message };

  const { error: dbError } = await supabase.from("employee_documents").insert({
    employee_id:    employeeId,
    tipo_documento: tipoDocumento,
    nombre_archivo: file.name,
    archivo_url:    path,
    tamano_bytes:   file.size,
    estado:         "activo",
    created_by:     user.id,
  });

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath(`/rrhh/${employeeId}`);
  return { success: true, path };
}

// -----------------------------------------------
// Descartar documento
// -----------------------------------------------
export async function descartarDocumentoEmpleado(
  documentId: string,
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { error } = await supabase
    .from("employee_documents")
    .update({ estado: "descartado" })
    .eq("id", documentId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/rrhh/${employeeId}`);
  return { success: true };
}

// -----------------------------------------------
// Obtener URL firmada de documento
// -----------------------------------------------
export async function obtenerUrlDocumentoEmpleado(
  path: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("rrhh-documentos")
    .createSignedUrl(path, 3600); // 1 hora

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

// -----------------------------------------------
// Subir croquis (imagen de ubicación)
// -----------------------------------------------
export async function subirCroquis(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "Archivo no recibido" };

  const ext = file.name.split(".").pop();
  const path = `croquis/${Date.now()}_${user.id}.${ext}`;

  const { error } = await supabase.storage
    .from("rrhh-documentos")
    .upload(path, file);

  if (error) return { success: false, error: error.message };
  return { success: true, path };
}
