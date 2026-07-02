/**
 * Tipos para los Reportes de Producción y Contable
 */

// ============================================
// FILTROS COMPARTIDOS
// ============================================

export type ExportProduccionFilters = {
	mes?: number; // 1-12
	anio?: number;
	/** Rango de fechas personalizado (override mes/anio si ambos presentes) */
	fecha_desde?: string; // YYYY-MM-DD
	fecha_hasta?: string; // YYYY-MM-DD
	estado_poliza?: "activa" | "pendiente" | "rechazada" | "all";
	regional_id?: string;
	compania_id?: string;
	equipo_id?: string;
	/** Si true, excluye las pólizas cargadas retroactivamente (históricas). Default: incluir. */
	excluir_retroactivas?: boolean;
};

// ============================================
// REPORTE CONTABLE (ex Reporte Producción)
// ============================================

export type ExportProduccionRow = {
	numero_poliza: string;
	cliente: string;
	ci_nit: string;
	compania: string;
	ramo: string;
	responsable: string;
	regional: string;

	prima_total: number;
	prima_neta: number | null;
	comision_empresa: number | null;
	factor_prima_neta: number | null;
	porcentaje_comision: number | null;

	inicio_vigencia: string;
	fin_vigencia: string;

	numero_cuota: number;
	monto_cuota_pt: number;
	monto_cuota_pn: number | null;
	monto_cuota_comision: number | null;
	moneda: string;

	fecha_vencimiento: string;
	estado_cuota: string;
	modalidad_pago: string;
};

// ============================================
// REPORTE DE PRODUCCIÓN (nuevo)
// ============================================

export type TipoPolizaReporte = "Nueva" | "Renovada" | "Exclusión" | "Inclusión" | "Anulación";

export type ExportProduccionNuevoRow = {
	numero_poliza: string;
	numero_anexo: string | null;
	tipo_poliza: TipoPolizaReporte;
	// Independiente del tipo: una retroactiva puede ser Nueva o Renovada
	retroactiva: "Sí" | "";
	validacion: "Validado" | "Por validar";
	cliente: string;
	ci_nit: string;
	director_cartera: string;
	compania: string;
	cod_aps: number | null; // código de la compañía (APS)
	cod_ramo_aps: string | null; // código de ramo APS (ej. "91-05")
	ramo: string;
	responsable: string;
	regional: string;

	prima_total: number;
	prima_neta: number | null;
	comision_empresa: number | null;
	factor_prima_neta: number | null;
	porcentaje_comision: number | null;
	moneda: string;

	valor_asegurado: number | null;

	cantidad_cuotas: number;
	cuota_inicial: number | null;

	inicio_vigencia: string;
	fin_vigencia: string;
	fecha_emision_compania: string;
	fecha_produccion_sistema: string;

	persona_registro: string;
	categoria: string;
	producto: string;
	cod_producto: string | null; // código de producto de la aseguradora
};

// ============================================
// REPORTE COMISIONES DIRECTOR DE CARTERA
// ============================================

export type ExportComisionesDirectorFilters = {
	fecha_desde: string; // YYYY-MM-DD
	fecha_hasta: string; // YYYY-MM-DD
	director_id?: string;
	regional_id?: string;
	compania_id?: string;
	equipo_id?: string;
};

export type ExportComisionesDirectorRow = {
	director_cartera: string;
	numero_poliza: string;
	cliente: string;
	ci_nit: string;
	compania: string;
	ramo: string;
	regional: string;
	responsable: string;
	numero_cuota: number;
	estado_cuota: "pagada" | "por_cobrar";
	monto_cuota_pt: number;
	monto_cuota_pn: number | null;
	porcentaje_compania: number | null; // % comisión del producto/compañía (informativo)
	monto_cuota_comision: number | null;
	porcentaje_comision_director: number | null;
	monto_comision_director: number | null;
	it_3pct: number | null; // 3% IT sobre monto_comision_director
	total_importe: number | null; // monto_comision_director - it_3pct
	retencion_rciva: number | null; // 13% sobre total_importe, solo si director no factura
	retencion_it: number | null; // 3% sobre total_importe, solo si director no factura
	total_comision: number | null; // total_importe - retenciones
	director_factura: boolean; // true = presenta factura fiscal
	moneda: string;
	fecha: string; // fecha_pago si pagada, fecha_vencimiento si por cobrar
};

// ============================================
// REPORTE DE VENCIMIENTOS (pólizas por vencer en un rango)
// ============================================

export type ExportVencimientosFilters = {
	fecha_desde: string; // YYYY-MM-DD
	fecha_hasta: string; // YYYY-MM-DD
	estado_poliza?: "activa" | "all";
	regional_id?: string;
	compania_id?: string;
	equipo_id?: string;
};

export type ExportVencimientosRow = {
	numero_poliza: string;
	cliente: string;
	ci_nit: string;
	compania: string;
	ramo: string;
	responsable: string;
	regional: string;
	estado: string;
	moneda: string;
	prima_total: number;
	inicio_vigencia: string;
	fin_vigencia: string;
	dias_para_vencer: number;
	producto: string;
};

export type ExportVencimientosResponse = {
	data: ExportVencimientosRow[];
	meta: ExportReporteMeta;
};

// ============================================
// DATOS DE FILTROS (compartidos)
// ============================================

export type FilterData = {
	regionales: { id: string; nombre: string }[];
	companias: { id: string; nombre: string }[];
	equipos: { id: string; nombre: string }[];
};

// ============================================
// RESPUESTA GENÉRICA
// ============================================

export type ProduccionServerResponse<T> = { success: true; data: T } | { success: false; error: string };

export type ExportProduccionNuevoResponse = {
	data: ExportProduccionNuevoRow[];
	meta: {
		usuario_email: string;
		fecha_desde: string;
		fecha_hasta: string;
	};
};

export type ExportReporteMeta = {
	usuario_email: string;
	fecha_desde: string;
	fecha_hasta: string;
};

export type ExportProduccionContableResponse = {
	data: ExportProduccionRow[];
	meta: ExportReporteMeta;
};

export type ExportComisionesDirectorResponse = {
	data: ExportComisionesDirectorRow[];
	meta: ExportReporteMeta;
};
