// ============================================
// TIPOS PARA GESTIÓN DE CATÁLOGOS DE SEGUROS
// ============================================

// ============================================
// EMPRESAS ASEGURADORAS (Insurance Companies)
// ============================================

export type CompaniaAseguradoraDB = {
  id: string;
  nombre: string;
  codigo: number | null;
  activo: boolean;
  created_at: string;
};

export type CompaniaAseguradoraForm = {
  nombre: string;
  codigo?: number | null;
};

// ============================================
// TIPOS DE SEGUROS / RAMOS (Insurance Types)
// ============================================

export type TipoSeguroDB = {
  id: number;
  codigo: string;
  nombre: string;
  es_ramo_padre: boolean;
  ramo_padre_id: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type TipoSeguroConHijos = TipoSeguroDB & {
  hijos?: TipoSeguroDB[];
  ramo_padre?: {
    id: number;
    nombre: string;
    codigo: string;
  } | null;
};

export type TipoSeguroForm = {
  codigo: string;
  nombre: string;
  es_ramo_padre: boolean;
  ramo_padre_id?: number | null;
};

// ============================================
// PRODUCTOS DE ASEGURADORAS
// ============================================

export type ProductoAseguradoraDB = {
  id: string;
  compania_aseguradora_id: string;
  tipo_seguro_id: number;
  codigo_producto: string;
  nombre_producto: string;
  factor_contado: number;
  factor_credito: number;
  porcentaje_comision: number;
  activo: boolean;
  regional: string;
  created_at: string;
  updated_at: string;
};

export type ProductoConRelaciones = ProductoAseguradoraDB & {
  companias_aseguradoras: {
    id: string;
    nombre: string;
  } | null;
  tipos_seguros: {
    id: number;
    nombre: string;
    codigo: string;
  } | null;
};

export type ProductoAseguradoraForm = {
  compania_aseguradora_id: string;
  tipo_seguro_id: number;
  codigo_producto: string;
  nombre_producto: string;
  factor_contado: number;
  factor_credito: number;
  porcentaje_comision: number;
  regional: string;
};

// ============================================
// CATEGORIAS
// ============================================

export type CategoriaDB = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
};

export type CategoriaForm = {
  nombre: string;
  descripcion?: string | null;
};

// ============================================
// SHARED TYPES
// ============================================

export type CatalogoActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export type CatalogoStats = {
  total: number;
  activos: number;
  inactivos: number;
};
