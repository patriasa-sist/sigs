/**
 * Tipos para los Reportes de Producción y Contable
 */

// ============================================
// FILTROS COMPARTIDOS
// ============================================

export type ExportProduccionFilters = {
	mes: number; // 1-12
	anio: number;
	estado_poliza?: "activa" | "all";
	regional_id?: string;
	compania_id?: string;
	equipo_id?: string;
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

export type TipoPolizaReporte =
	| "Nueva"
	| "Renovada"
	| "Exclusión"
	| "Inclusión"
	| "Anulación";

export type ExportProduccionNuevoRow = {
	numero_poliza: string;
	numero_anexo: string | null;
	tipo_poliza: TipoPolizaReporte;
	cliente: string;
	ci_nit: string;
	director_cartera: string;
	compania: string;
	cod_aps: number | null;
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

	inicio_vigencia: string;
	fin_vigencia: string;
	fecha_emision_compania: string;
	fecha_produccion_sistema: string;
};

// ============================================
// RESPUESTA GENÉRICA
// ============================================

export type ProduccionServerResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string };
