/**
 * Tipos para el Reporte Consolidado de Producción Mensual
 */

export type ExportProduccionFilters = {
	mes: number; // 1-12
	anio: number;
	estado_poliza?: "activa" | "all";
	regional_id?: string;
	compania_id?: string;
	equipo_id?: string;
};

export type ExportProduccionRow = {
	// Campos de identificación
	numero_poliza: string;
	cliente: string;
	ci_nit: string;
	compania: string;
	ramo: string;
	responsable: string;
	regional: string;

	// Campos financieros de póliza (pueden ser null si no hay producto asignado)
	prima_total: number;
	prima_neta: number | null;
	comision_empresa: number | null;
	factor_prima_neta: number | null;
	porcentaje_comision: number | null; // Se muestra como % (ej: 15, no 0.15)

	// Campos de vigencia
	inicio_vigencia: string;
	fin_vigencia: string;

	// Campos de cuota
	numero_cuota: number;
	monto_cuota_pt: number;
	monto_cuota_pn: number | null;
	monto_cuota_comision: number | null;
	moneda: string;

	// Campos adicionales
	fecha_vencimiento: string;
	estado_cuota: string;
	modalidad_pago: string;
};

export type ProduccionServerResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string };
