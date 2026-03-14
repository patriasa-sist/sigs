// ============================================
// Types para el dashboard gerencial
// ============================================

/** Filtros compartidos para todas las secciones del dashboard */
export type GerenciaFiltros = {
	mes?: number; // 1-12, undefined = todos los meses
	anio: number;
	regional_id?: string;
	compania_id?: string;
	equipo_id?: string;
};

// ============================================
// PRODUCCIÓN
// ============================================

export type KPIProduccion = {
	prima_total_mes: number;
	prima_acumulada_anio: number;
	comisiones_mes: number;
	cantidad_polizas_mes: number;
};

export type PrimaPorMes = {
	mes: number;
	label: string;
	prima_total: number;
};

export type DistribucionPorRamo = {
	ramo: string;
	prima_total: number;
	porcentaje: number;
};

export type PrimaPorCompania = {
	compania: string;
	prima_total: number;
};

export type ProduccionPorResponsable = {
	responsable: string;
	prima_total: number;
	cantidad_polizas: number;
};

export type EstadisticasProduccion = {
	kpis: KPIProduccion;
	primaPorMes: PrimaPorMes[];
	distribucionPorRamo: DistribucionPorRamo[];
	primaPorCompania: PrimaPorCompania[];
	topResponsables: ProduccionPorResponsable[];
};

// ============================================
// COBRANZAS
// ============================================

export type KPICobranzas = {
	cuotas_pendientes: number;
	monto_pendiente: number;
	cuotas_vencidas: number;
	monto_vencido: number;
	monto_cobrado_mes: number;
	tasa_cobranza: number; // porcentaje 0-100
};

export type CobradoVsPendientePorMes = {
	mes: number;
	label: string;
	cobrado: number;
	pendiente: number;
};

export type DistribucionEstadosPago = {
	estado: string;
	cantidad: number;
	monto: number;
};

export type ProximaCuotaPorVencer = {
	numero_poliza: string;
	cliente: string;
	monto: number;
	fecha_vencimiento: string;
	moneda: string;
};

export type EstadisticasCobranzas = {
	kpis: KPICobranzas;
	cobradoVsPendiente: CobradoVsPendientePorMes[];
	distribucionEstados: DistribucionEstadosPago[];
	proximasCuotas: ProximaCuotaPorVencer[];
};

// ============================================
// SINIESTROS
// ============================================

export type KPISiniestros = {
	siniestros_abiertos: number;
	cerrados_mes: number;
	monto_reservado: number;
	promedio_dias_resolucion: number | null;
};

export type SiniestrosPorMes = {
	mes: number;
	label: string;
	abiertos: number;
	cerrados: number;
};

export type SiniestrosPorRamo = {
	ramo: string;
	cantidad: number;
};

export type SiniestroAbierto = {
	codigo_siniestro: string;
	cliente: string;
	ramo: string;
	fecha_siniestro: string;
	dias_abierto: number;
	monto_reserva: number;
	moneda: string;
};

export type EstadisticasSiniestros = {
	kpis: KPISiniestros;
	siniestrosPorMes: SiniestrosPorMes[];
	siniestrosPorRamo: SiniestrosPorRamo[];
	siniestrosAbiertos: SiniestroAbierto[];
};

// ============================================
// FILTROS DATA (para dropdowns)
// ============================================

export type FiltrosData = {
	regionales: { id: string; nombre: string }[];
	companias: { id: string; nombre: string }[];
	equipos: { id: string; nombre: string }[];
};

// ============================================
// RESPONSE GENÉRICO
// ============================================

export type GerenciaResponse<T> =
	| { success: true; data: T }
	| { success: false; error: string };
