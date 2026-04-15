// =============================================
// Tipos del Módulo RRHH (Recursos Humanos)
// =============================================

// --- Catálogos / Enums ---

export type TipoDocumento = "cedula" | "pasaporte" | "rnu";
export type Genero = "M" | "F";
export type EstadoCivil = "soltero" | "casado" | "union_libre" | "divorciado" | "viudo";
export type AreaSolicitante = "comercial_produccion" | "cobranzas" | "reclamos" | "recepcion" | "contabilidad";
export type MedioComunicacion = "publicacion" | "invitacion_personal" | "otro";
export type CategoriaPatrimonio = "inmueble" | "vehiculo" | "otro_bien" | "deuda";
export type EstadoDocumento = "activo" | "descartado";

export const EXTENSIONES_BOLIVIA = [
  "Santa Cruz", "La Paz", "Cochabamba", "Oruro", "Potosí",
  "Chuquisaca", "Tarija", "Beni", "Pando", "Extranjero",
] as const;

export const DEPARTAMENTOS_BOLIVIA = [
  "Santa Cruz", "La Paz", "Cochabamba", "Oruro", "Potosí",
  "Chuquisaca", "Tarija", "Beni", "Pando",
] as const;

export type TipoDocumentoEmpleado =
  | "ficha_identificacion"
  | "estado_patrimonial"
  | "carta_confidencialidad"
  | "acuse_recibo"
  | "contrato_trabajo"
  | "curriculum"
  | "cedula_identidad"
  | "certificado_nacimiento"
  | "rejap"
  | "pep_ofac"
  | "examen_preocupacional"
  | "otro";

export const TIPOS_DOCUMENTO_EMPLEADO: Record<TipoDocumentoEmpleado, string> = {
  ficha_identificacion:   "Ficha de Identificación",
  estado_patrimonial:     "Estado Patrimonial",
  carta_confidencialidad: "Carta de Confidencialidad",
  acuse_recibo:           "Acuse de Recibo (Manual / Código de Ética)",
  contrato_trabajo:       "Contrato de Trabajo",
  curriculum:             "Curriculum Vitae",
  cedula_identidad:       "Fotocopia Cédula de Identidad",
  certificado_nacimiento: "Fotocopia Certificado de Nacimiento",
  rejap:                  "REJAP / Antecedentes FELCC",
  pep_ofac:               "Consulta PEP/OFAC/ONU",
  examen_preocupacional:  "Examen Preocupacional",
  otro:                   "Otro",
};

// --- Checklist de documentos ---

export interface ChecklistItem {
  id: string;              // ej: "item_6"
  numero: number;          // número original del PDF
  label: string;
  seccion: "recepcionada" | "adjunto" | "otros";
  estado: "si" | "no" | null;
  // Campos especiales
  vigente?: "si" | "no" | null;  // solo item 7 (CI)
  subsidios?: {                   // solo item 33
    prenatal: boolean;
    natalidad: boolean;
    lactancia: boolean;
    sepelio: boolean;
  };
}

export const CHECKLIST_DEFINICION: Omit<ChecklistItem, "estado" | "vigente" | "subsidios">[] = [
  // Sección 1: Documentación Recepcionada
  { id: "item_6",  numero: 6,  label: "Ficha de Identificación Personal",                    seccion: "recepcionada" },
  { id: "item_7",  numero: 7,  label: "Fotocopia de Cédula de Identidad",                    seccion: "recepcionada" },
  { id: "item_8",  numero: 8,  label: "Fotocopia Certificado de Nacimiento",                  seccion: "recepcionada" },
  { id: "item_9",  numero: 9,  label: "REJAP y/o Antecedentes de la FELCC",                  seccion: "recepcionada" },
  { id: "item_10", numero: 10, label: "Consulta PEP/OFAC/ONU",                               seccion: "recepcionada" },
  { id: "item_11", numero: 11, label: "Reporte Declaración Patrimonial",                      seccion: "recepcionada" },
  { id: "item_12", numero: 12, label: "Registro Domiciliario (Aviso de cobranza de Luz)",     seccion: "recepcionada" },
  { id: "item_13", numero: 13, label: "Curriculum Vitae - Hoja de Vida",                      seccion: "recepcionada" },
  { id: "item_14", numero: 14, label: "Perfil de Riesgos",                                    seccion: "recepcionada" },
  { id: "item_15", numero: 15, label: "Carta de Confidencialidad de Información",             seccion: "recepcionada" },
  { id: "item_16", numero: 16, label: "Acuse de Recibo de Manual Interno y Código de Ética",  seccion: "recepcionada" },
  { id: "item_17", numero: 17, label: "Capacitación UIF",                                     seccion: "recepcionada" },
  // Sección 2: Documentos Adjunto al File
  { id: "item_18", numero: 18, label: "Contrato de Trabajo",                                  seccion: "adjunto" },
  { id: "item_19", numero: 19, label: "Descripción y Aceptación de Funciones del Cargo conforme Manual Interno", seccion: "adjunto" },
  { id: "item_20", numero: 20, label: "Recepción y Aceptación del Manual Interno de Prevención LGI/FT/FPADM",     seccion: "adjunto" },
  { id: "item_21", numero: 21, label: "Recepción y Aceptación del Código de Ética y Conducta de la Empresa",      seccion: "adjunto" },
  { id: "item_22", numero: 22, label: "Capacitaciones y Certificaciones",                    seccion: "adjunto" },
  { id: "item_23", numero: 23, label: "Evaluaciones",                                        seccion: "adjunto" },
  // Sección 3: Otros Documentos Adjuntos al File
  { id: "item_24", numero: 24, label: "Aviso de Alta en la CSBP",                            seccion: "otros" },
  { id: "item_25", numero: 25, label: "Hoja de Ruta de Trámite de Afiliación",               seccion: "otros" },
  { id: "item_26", numero: 26, label: "Examen Preocupacional",                               seccion: "otros" },
  { id: "item_27", numero: 27, label: "Notas Internas",                                      seccion: "otros" },
  { id: "item_28", numero: 28, label: "Comunicados Internos",                                seccion: "otros" },
  { id: "item_29", numero: 29, label: "Pago de Indemnizaciones (Anticipo Solicitado)",       seccion: "otros" },
  { id: "item_30", numero: 30, label: "Certificados de Incapacidad Temporal y/o Certificación Médica", seccion: "otros" },
  { id: "item_31", numero: 31, label: "Control de Permisos y Vacaciones",                    seccion: "otros" },
  { id: "item_32", numero: 32, label: "Certificados de Empresa a Solicitud",                 seccion: "otros" },
  { id: "item_33", numero: 33, label: "Subsidios",                                           seccion: "otros" },
];

// Estado inicial del checklist
export function crearChecklistVacio(): Record<string, ChecklistItem> {
  const result: Record<string, ChecklistItem> = {};
  for (const def of CHECKLIST_DEFINICION) {
    const item: ChecklistItem = { ...def, estado: null };
    if (def.id === "item_7")  item.vigente = null;
    if (def.id === "item_33") item.subsidios = { prenatal: false, natalidad: false, lactancia: false, sepelio: false };
    result[def.id] = item;
  }
  return result;
}

// Calcular % de completitud del checklist
export function calcularCompletitudChecklist(items: Record<string, ChecklistItem>): number {
  const total = CHECKLIST_DEFINICION.length;
  const completados = CHECKLIST_DEFINICION.filter(
    (def) => items[def.id]?.estado !== null
  ).length;
  return Math.round((completados / total) * 100);
}

// --- Tipos de datos del formulario multi-step ---

export interface DatosIdentificacion {
  nombres: string;
  apellidos: string;
  tipo_documento: TipoDocumento;
  extension: string;
  nro_documento: string;
  complemento: string;
  nro_nua_cua: string;
  nit: string;
  fecha_nacimiento: string; // ISO date string
  genero: Genero;
  nacionalidad: string;
  otra_nacionalidad: string;
  estado_civil: EstadoCivil | "";
  nombre_conyuge: string;
}

export interface ReferenciaFamiliar {
  nombres_apellidos: string;
  telefono: string;
  parentesco: string;
}

export interface DatosDireccion {
  av_calle_pasaje: string;
  zona_barrio: string;
  urbanizacion_condominio: string;
  edif_bloque_piso: string;
  casilla: string;
  referencia_direccion: string;
  departamento: string;
  pais: string;
  lat: number | null;
  lng: number | null;
  croquis_file: File | null;         // archivo a subir
  croquis_preview: string | null;    // data URL para preview
  telefono: string;
  email: string;
  referencias: [ReferenciaFamiliar, ReferenciaFamiliar];
}

export interface DatosLaborales {
  fecha_ingreso: string;
  cargo: string;
  haber_basico: number | null;
  area_solicitante: AreaSolicitante | "";
  medio_comunicacion: MedioComunicacion | "";
  medio_comunicacion_desc: string;
  entrevistado_por_nombre: string;
  entrevistado_por_cargo: string;
  entrevistado_fecha: string;
  aprobado_por_nombre: string;
  aprobado_por_cargo: string;
  aprobado_fecha: string;
}

export interface ItemPatrimonio {
  id: string; // local UUID para key en React
  descripcion: string;
  ubicacion: string;       // solo inmuebles
  modelo_marca: string;    // solo vehículos
  placa: string;           // solo vehículos
  entidad: string;         // solo deudas
  tipo_deuda: string;      // solo deudas
  fecha_vencimiento: string; // solo deudas
  valor: number | null;
}

export interface DatosPatrimonio {
  disponible: number | null;
  inmuebles: ItemPatrimonio[];
  vehiculos: ItemPatrimonio[];
  otros_bienes: ItemPatrimonio[];
  deudas: ItemPatrimonio[];
  lugar_fecha: string;
  fecha_declaracion: string;
}

export interface DocumentoEmpleado {
  id: string;              // local UUID
  tipo_documento: TipoDocumentoEmpleado;
  nombre_archivo: string;
  tamano_bytes: number;
  file?: File;             // solo en memoria, no persistido
  storage_path?: string;   // path en Supabase Storage
  upload_status: "pending" | "uploaded" | "error";
}

// Estado global del formulario
export interface EmpleadoFormState {
  identificacion: DatosIdentificacion | null;
  direccion: DatosDireccion | null;
  laboral: DatosLaborales | null;
  patrimonio: DatosPatrimonio | null;
  checklist: Record<string, ChecklistItem> | null;
  documentos: DocumentoEmpleado[];
}

// --- Tipos de respuesta de la BD ---

export interface EmployeeListItem {
  id: string;
  nombres: string;
  apellidos: string;
  nro_documento: string;
  cargo: string;
  fecha_ingreso: string;
  activo: boolean;
  completitud_checklist: number; // calculado en cliente
}

export interface EmployeeDetail {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: TipoDocumento;
  extension: string | null;
  nro_documento: string;
  complemento: string | null;
  nro_nua_cua: string | null;
  nit: string | null;
  fecha_nacimiento: string;
  genero: Genero;
  nacionalidad: string;
  estado_civil: EstadoCivil | null;
  nombre_conyuge: string | null;
  av_calle_pasaje: string | null;
  zona_barrio: string | null;
  urbanizacion_condominio: string | null;
  edif_bloque_piso: string | null;
  casilla: string | null;
  referencia_direccion: string | null;
  departamento: string | null;
  pais: string | null;
  lat: number | null;
  lng: number | null;
  croquis_url: string | null;
  telefono: string | null;
  email: string | null;
  fecha_ingreso: string;
  cargo: string;
  haber_basico: number | null;
  area_solicitante: string | null;
  medio_comunicacion: string | null;
  medio_comunicacion_desc: string | null;
  entrevistado_por_nombre: string | null;
  entrevistado_por_cargo: string | null;
  entrevistado_fecha: string | null;
  aprobado_por_nombre: string | null;
  aprobado_por_cargo: string | null;
  aprobado_fecha: string | null;
  activo: boolean;
  fecha_egreso: string | null;
  motivo_egreso: string | null;
  created_at: string;
  updated_at: string;
  employee_family_refs: FamilyRefDB[];
  employee_patrimony: PatrimonyDB | null;
  employee_checklist: ChecklistDB | null;
  employee_documents: DocumentDB[];
}

export interface FamilyRefDB {
  id: string;
  orden: 1 | 2;
  nombres_apellidos: string;
  telefono: string | null;
  parentesco: string | null;
}

export interface PatrimonyDB {
  id: string;
  disponible: number;
  lugar_fecha: string | null;
  fecha_declaracion: string | null;
  employee_patrimony_items: PatrimonyItemDB[];
}

export interface PatrimonyItemDB {
  id: string;
  categoria: CategoriaPatrimonio;
  descripcion: string | null;
  ubicacion: string | null;
  modelo_marca: string | null;
  placa: string | null;
  entidad: string | null;
  tipo_deuda: string | null;
  fecha_vencimiento: string | null;
  valor: number;
  orden: number;
}

export interface ChecklistDB {
  id: string;
  items: Record<string, ChecklistItem>;
  updated_at: string;
}

export interface DocumentDB {
  id: string;
  tipo_documento: TipoDocumentoEmpleado;
  nombre_archivo: string;
  archivo_url: string;
  tamano_bytes: number | null;
  estado: EstadoDocumento;
  created_at: string;
}

// --- Helpers de visualización ---

export const LABEL_GENERO: Record<Genero, string> = {
  M: "Masculino",
  F: "Femenino",
};

export const LABEL_ESTADO_CIVIL: Record<EstadoCivil, string> = {
  soltero:     "Soltero/a",
  casado:      "Casado/a",
  union_libre: "Unión Libre",
  divorciado:  "Divorciado/a",
  viudo:       "Viudo/a",
};

export const LABEL_AREA: Record<AreaSolicitante, string> = {
  comercial_produccion: "Comercial / Producción",
  cobranzas:            "Cobranzas",
  reclamos:             "Reclamos",
  recepcion:            "Recepción",
  contabilidad:         "Contabilidad",
};

export const LABEL_MEDIO: Record<MedioComunicacion, string> = {
  publicacion:        "Publicación",
  invitacion_personal: "Invitación Personal",
  otro:               "Otro",
};

// Calcula totales patrimoniales
export function calcularTotalesPatrimonio(patrimonio: DatosPatrimonio) {
  const totalInmuebles  = patrimonio.inmuebles.reduce((s, i)    => s + (i.valor ?? 0), 0);
  const totalVehiculos  = patrimonio.vehiculos.reduce((s, i)    => s + (i.valor ?? 0), 0);
  const totalOtros      = patrimonio.otros_bienes.reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalDeudas     = patrimonio.deudas.reduce((s, i)       => s + (i.valor ?? 0), 0);
  const disponible      = patrimonio.disponible ?? 0;

  const activo_total  = disponible + totalInmuebles + totalVehiculos + totalOtros;
  const pasivo_total  = totalDeudas;
  const patrimonio_neto = activo_total - pasivo_total;

  return {
    disponible,
    totalInmuebles,
    totalVehiculos,
    totalOtros,
    totalDeudas,
    activo_total,
    pasivo_total,
    patrimonio_neto,
  };
}
