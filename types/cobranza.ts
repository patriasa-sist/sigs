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
	fecha_vencimiento_original?: string | null; // Fecha original antes de prórrogas
	prorrogas_historial?: any[] | null; // Array de prórrogas aplicadas
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

// ============================================
// FILE UPLOAD & COMPROBANTES TYPES
// ============================================

/**
 * Tipo de comprobante de pago
 */
export type TipoComprobante = "factura" | "recibo" | "comprobante_deposito" | "otro";

/**
 * Comprobante de pago adjunto a una cuota
 * Representa un registro de la tabla polizas_pagos_comprobantes
 */
export type Comprobante = {
	id: string;
	pago_id: string;
	nombre_archivo: string;
	archivo_url: string;
	tamano_bytes: number;
	tipo_archivo: TipoComprobante;
	estado: "activo" | "descartado";
	uploaded_at: string;
	uploaded_by: string | null;
	created_at: string;
	updated_at: string;
};

/**
 * Datos para subir un comprobante de pago
 */
export type SubirComprobanteData = {
	pago_id: string;
	file: File;
	tipo_archivo: TipoComprobante;
};

// ============================================
// PRÓRROGA TYPES
// ============================================

/**
 * Registro individual de prórroga en el historial
 * Almacenado en el array JSONB prorrogas_historial
 */
export type ProrrogaHistorial = {
	fecha_anterior: string; // ISO date string
	fecha_nueva: string; // ISO date string
	fecha_registro: string; // ISO timestamp
	usuario_id: string;
	usuario_nombre: string;
	motivo: string | null;
	dias_extension: number;
};

/**
 * Datos para registrar una prórroga
 */
export type RegistroProrroga = {
	cuota_id: string;
	nueva_fecha: string; // ISO date string
	motivo?: string;
};

// ============================================
// CLIENT CONTACT & RAMO-SPECIFIC DATA TYPES
// ============================================

/**
 * Información de contacto del cliente
 * Obtenida de natural_clients o juridic_clients
 */
export type ContactoCliente = {
	telefono: string | null;
	correo: string | null;
	celular: string | null;
};

/**
 * Vehículo de póliza Automotor
 */
export type VehiculoAutomotor = {
	id: string;
	placa: string;
	tipo_vehiculo?: string;
	marca?: string;
	modelo?: string;
	ano?: number;
	color?: string;
	valor_asegurado: number;
};

/**
 * Asegurado en pólizas de Salud, Vida, AP, Sepelio
 */
export type AseguradoPoliza = {
	id?: string;
	client_id: string;
	client_name: string;
	client_ci: string;
	nivel_nombre?: string;
	cargo?: string;
};

/**
 * Datos específicos según el tipo de ramo (discriminated union)
 */
export type DatosEspecificosRamo =
	| {
			tipo: "automotor";
			vehiculos: VehiculoAutomotor[];
	  }
	| {
			tipo: "salud" | "vida" | "ap" | "sepelio";
			asegurados: AseguradoPoliza[];
			producto?: string; // Para Vida
	  }
	| {
			tipo: "incendio";
			ubicaciones: string[]; // Array de direcciones
	  }
	| {
			tipo: "otros";
			descripcion: string;
	  };

/**
 * Póliza con información extendida para visualización de cuotas
 * Incluye contacto del cliente y datos específicos del ramo
 */
export type PolizaConPagosExtendida = PolizaConPagos & {
	contacto: ContactoCliente;
	datos_ramo: DatosEspecificosRamo;
};

// ============================================
// AVISO DE MORA TYPES
// ============================================

/**
 * Cuota vencida con cálculo de días de mora
 */
export type CuotaVencidaConMora = CuotaPago & {
	dias_mora: number;
};

/**
 * Datos completos para generar PDF de aviso de mora
 */
export type AvisoMoraData = {
	poliza: PolizaConPagos;
	cliente: ContactoCliente;
	cuotas_vencidas: CuotaVencidaConMora[];
	total_adeudado: number;
	fecha_generacion: string; // ISO date string
	numero_referencia: string; // Auto-generado formato: AM-YYYYMMDD-XXXXX
};

// ============================================
// ENHANCED SORTING & FILTERING TYPES
// ============================================

/**
 * Campos disponibles para ordenamiento (extendido)
 * Incluye todos los campos ordenables del dashboard
 */
export type SortFieldEnhanced =
	| "numero_poliza"
	| "cliente"
	| "compania"
	| "fecha_vencimiento"
	| "monto_pendiente"
	| "cuotas_vencidas"
	| "cuotas_pendientes"
	| "prima_total"
	| "inicio_vigencia";

/**
 * Opciones de ordenamiento mejoradas
 */
export type SortOptionsEnhanced = {
	field: SortFieldEnhanced;
	direction: "asc" | "desc";
};

// ============================================
// SERVER ACTION RESPONSE TYPES (EXTENDED)
// ============================================

/**
 * Respuesta de obtenerDetallePolizaParaCuotas()
 */
export type ObtenerDetallePolizaResponse = CobranzaServerResponse<PolizaConPagosExtendida>;

/**
 * Respuesta de subirComprobantePago()
 */
export type SubirComprobanteResponse = CobranzaServerResponse<{
	comprobante_id: string;
	archivo_url: string;
}>;

/**
 * Respuesta de registrarPago() actualizada
 * Ahora incluye información del comprobante si fue subido
 */
export type RegistrarPagoResponseExtendida = CobranzaServerResponse<{
	cuotas_actualizadas: string[];
	tipo_pago: TipoPago;
	exceso_generado?: number;
	comprobante?: {
		id: string;
		url: string;
	};
}>;

/**
 * Respuesta de registrarProrroga()
 */
export type RegistrarProrrogaResponse = CobranzaServerResponse<{
	prorroga: ProrrogaHistorial;
	nueva_fecha_vencimiento: string;
	total_prorrogas: number;
}>;

/**
 * Respuesta de prepararDatosAvisoMora()
 */
export type PrepararAvisoMoraResponse = CobranzaServerResponse<AvisoMoraData>;

/**
 * Respuesta de descartarComprobante()
 */
export type DescartarComprobanteResponse = CobranzaServerResponse<{
	comprobante_id: string;
	descartado: boolean;
}>;
