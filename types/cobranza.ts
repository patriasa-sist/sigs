// types/cobranza.ts - Type definitions for the Cobranzas (Collections) module

// ============================================
// CORE TYPES
// ============================================

/** Estados posibles de una cuota de pago */
export type EstadoPago = "pendiente" | "pagado" | "vencido" | "parcial";

/** Monedas soportadas en el sistema */
export type Moneda = "Bs" | "USD" | "USDT" | "UFV";

/**
 * Cuota de pago desde la base de datos
 * Representa un registro de la tabla polizas_pagos
 */
export type CuotaPago = {
	id: string;
	poliza_id: string;
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string; // ISO date string
	fecha_pago: string | null; // ISO date string
	estado: EstadoPago;
	observaciones: string | null;
	created_at: string;
	updated_at: string;
	created_by: string | null;
	updated_by: string | null;
};

/**
 * Información del cliente (natural o jurídico)
 * Usado en PolizaConPagos
 */
export type ClienteInfo = {
	id: string;
	client_type: "natural" | "juridica";
	nombre_completo: string; // Nombre formateado (natural o razón social)
	documento: string; // CI o NIT
};

/**
 * Información de la compañía aseguradora
 */
export type CompaniaInfo = {
	id: string;
	nombre: string;
};

/**
 * Información del responsable de la póliza
 */
export type ResponsableInfo = {
	id: string;
	full_name: string;
};

/**
 * Póliza con información de cuotas de pago
 * Incluye datos calculados para el dashboard
 */
export type PolizaConPagos = {
	id: string;
	numero_poliza: string;
	ramo: string;
	prima_total: number;
	moneda: Moneda;
	estado: "pendiente" | "activa" | "vencida" | "cancelada" | "renovada";
	inicio_vigencia: string; // ISO date string
	fin_vigencia: string; // ISO date string
	modalidad_pago: "contado" | "credito";

	// Relaciones
	client: ClienteInfo;
	compania: CompaniaInfo;
	responsable: ResponsableInfo;

	// Cuotas de pago
	cuotas: CuotaPago[];

	// Campos calculados
	total_pagado: number;
	total_pendiente: number;
	cuotas_pendientes: number;
	cuotas_vencidas: number;
};

// ============================================
// PAYMENT RECORDING TYPES
// ============================================

/**
 * Tipo de pago basado en el monto pagado vs monto de la cuota
 */
export type TipoPago = "parcial" | "exacto" | "exceso";

/**
 * Datos para registrar un pago
 * Enviado desde el frontend al server action
 */
export type RegistroPago = {
	cuota_id: string;
	monto_pagado: number;
	fecha_pago: string; // ISO date string
	observaciones?: string;
};

/**
 * Distribución de exceso para una cuota específica
 * Usado en el modal de redistribución
 */
export type DistribucionExceso = {
	cuota_id: string;
	numero_cuota: number;
	monto_original: number;
	monto_a_aplicar: number; // Editable por el usuario
	nuevo_saldo: number; // Calculado: monto_original - monto_a_aplicar
};

/**
 * Estructura completa para redistribuir exceso de pago
 * Incluye validación y tracking de distribución
 */
export type ExcessPaymentDistribution = {
	poliza_id: string;
	cuota_origen_id: string; // Cuota donde se generó el exceso
	monto_exceso: number;
	distribuciones: DistribucionExceso[];
	total_distribuido: number; // Suma de todos monto_a_aplicar
	saldo_restante: number; // Para validación: debe ser 0 al confirmar
};

// ============================================
// DASHBOARD & FILTERING TYPES
// ============================================

/**
 * Estadísticas globales para el dashboard de cobranzas
 * Calculadas server-side
 */
export type CobranzaStats = {
	total_polizas: number;
	total_cuotas_pendientes: number;
	total_cuotas_vencidas: number;
	monto_total_pendiente: number;
	monto_total_cobrado_hoy: number;
	monto_total_cobrado_mes: number;
	cuotas_por_vencer_7dias: number; // Cuotas que vencen en los próximos 7 días
};

/**
 * Opciones de filtrado del dashboard
 * Administrado en el estado del cliente
 */
export type FilterOptions = {
	searchTerm: string; // Busca en: número póliza, nombre cliente, CI/NIT
	compania_id: string; // UUID de compañía o 'all'
	estado_cuota: EstadoPago | "all";
	regional_id: string; // UUID de regional o 'all'
	fecha_vencimiento_desde?: string; // ISO date string
	fecha_vencimiento_hasta?: string; // ISO date string
	solo_vencidas: boolean; // Quick filter para cuotas vencidas
};

/**
 * Campos disponibles para ordenamiento
 */
export type SortField =
	| "numero_poliza"
	| "cliente"
	| "fecha_vencimiento"
	| "monto_pendiente"
	| "cuotas_vencidas";

/**
 * Opciones de ordenamiento
 */
export type SortOptions = {
	field: SortField;
	direction: "asc" | "desc";
};

// ============================================
// EXCEL EXPORT TYPES
// ============================================

/**
 * Períodos predefinidos para exportación
 */
export type ExportPeriod = "today" | "week" | "month" | "custom";

/**
 * Filtros para exportación de reportes
 */
export type ExportFilters = {
	periodo: ExportPeriod;
	fecha_desde?: string; // Solo para período 'custom'
	fecha_hasta?: string; // Solo para período 'custom'
	estado_cuota?: EstadoPago | "all";
	compania_id?: string; // UUID o 'all'
};

/**
 * Fila de datos para exportación a Excel
 * Estructura que se convierte a fila en Excel
 */
export type ExportRow = {
	numero_poliza: string;
	cliente: string;
	ci_nit: string;
	compania: string;
	ramo: string;
	numero_cuota: number;
	monto_cuota: number;
	moneda: Moneda;
	fecha_vencimiento: string;
	fecha_pago: string | null;
	estado: EstadoPago;
	dias_vencido: number; // Calculado
	monto_pagado: number; // Para pagos parciales
	observaciones: string;
};

// ============================================
// SERVER ACTION RESPONSE TYPES
// ============================================

/**
 * Respuesta estándar de server actions
 * Generic para reutilizar con diferentes tipos de datos
 */
export type CobranzaServerResponse<T = void> = {
	success: boolean;
	data?: T;
	error?: string;
};

/**
 * Respuesta de obtenerPolizasConPendientes()
 */
export type ObtenerPolizasConPagosResponse = CobranzaServerResponse<{
	polizas: PolizaConPagos[];
	stats: CobranzaStats;
}>;

/**
 * Respuesta de registrarPago()
 * Incluye información sobre el tipo de pago y posible exceso generado
 */
export type RegistrarPagoResponse = CobranzaServerResponse<{
	cuotas_actualizadas: string[]; // Array de IDs de cuotas actualizadas
	tipo_pago: TipoPago;
	exceso_generado?: number; // Solo si tipo_pago === 'exceso'
}>;

/**
 * Respuesta de redistribuirExceso()
 */
export type RedistribuirExcesoResponse = CobranzaServerResponse<{
	cuotas_actualizadas: number; // Cantidad de cuotas modificadas
	monto_total_distribuido: number;
}>;

/**
 * Respuesta de exportarReporte()
 */
export type ExportarReporteResponse = CobranzaServerResponse<ExportRow[]>;

/**
 * Respuesta de obtenerEstadisticas()
 */
export type ObtenerEstadisticasResponse = CobranzaServerResponse<CobranzaStats>;
