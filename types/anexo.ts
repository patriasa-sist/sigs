// types/anexo.ts - Sistema de Anexos para Pólizas

import type {
	VehiculoAutomotor,
	ContratanteSalud,
	TitularSalud,
	EquipoIndustrial,
	NaveEmbarcacion,
	BienAseguradoIncendio,
	BienAseguradoRiesgosVarios,
	AseguradoConNivel,
	DocumentoPoliza,
	AdvertenciaPoliza,
	Moneda,
} from "./poliza";

// ============================================
// TIPOS BASE
// ============================================

export type TipoAnexo = "inclusion" | "exclusion" | "anulacion";
export type EstadoAnexo = "pendiente" | "activo" | "rechazado";
export type PasoAnexo = 1 | 2 | 3 | 4 | 5;

// ============================================
// PASO 1: BÚSQUEDA DE PÓLIZA
// ============================================

export type PolizaResumenAnexo = {
	id: string;
	numero_poliza: string;
	ramo: string;
	client_name: string;
	client_ci: string;
	compania_nombre: string;
	prima_total: number;
	moneda: Moneda;
	inicio_vigencia: string;
	fin_vigencia: string;
	estado: string;
	modalidad_pago: "contado" | "credito";
	tiene_anulacion_pendiente: boolean;
};

// ============================================
// PASO 2: CONFIGURACIÓN DEL ANEXO
// ============================================

export type ConfigAnexo = {
	tipo_anexo: TipoAnexo;
	numero_anexo: string;
	fecha_efectiva: string; // ISO date
	observaciones: string;
};

// ============================================
// PASO 3: ITEMS DE CAMBIO POR RAMO
// ============================================

export type AnexoItemChange<T> = {
	accion: "inclusion" | "exclusion";
	original_item_id?: string; // ID del item original (para exclusiones)
	data: T;
};

// Discriminated union por ramo
export type AnexoItemsCambio =
	| { tipo_ramo: "Automotores"; items: AnexoItemChange<VehiculoAutomotor>[] }
	| {
			tipo_ramo: "Salud";
			items_asegurados: AnexoItemChange<ContratanteSalud>[];
			items_beneficiarios: AnexoItemChange<TitularSalud>[];
	  }
	| { tipo_ramo: "Ramos técnicos"; items: AnexoItemChange<EquipoIndustrial>[] }
	| {
			tipo_ramo: "Aeronavegación" | "Naves o embarcaciones";
			items: AnexoItemChange<NaveEmbarcacion>[];
	  }
	| {
			tipo_ramo: "Incendio y Aliados";
			items: AnexoItemChange<BienAseguradoIncendio>[];
	  }
	| {
			tipo_ramo: "Riesgos Varios Misceláneos";
			items: AnexoItemChange<BienAseguradoRiesgosVarios>[];
	  }
	| {
			tipo_ramo: "Accidentes Personales" | "Vida" | "Sepelio";
			items: AnexoItemChange<AseguradoConNivel>[];
	  };

// ============================================
// PASO 4: AJUSTE DE PAGOS
// ============================================

// Para exclusiones: descuento aplicado a cuota original (puede estar pagada)
export type CuotaAjuste = {
	cuota_original_id: string;
	numero_cuota: number;
	monto_original: number;
	monto_delta: number; // siempre negativo para exclusiones
	fecha_vencimiento: string;
	estado_original: string; // pendiente, pagado, vencido, parcial
};

// Para inclusiones: cuota propia del anexo (independiente de la póliza madre)
export type CuotaPropia = {
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string; // YYYY-MM-DD
};

export type PlanPagoInclusion = {
	modalidad: "contado" | "credito";
	prima_total: number;
	cuota_inicial: number;   // crédito: monto de la primera cuota (0 = todas iguales)
	cantidad_cuotas: number; // crédito: número total de cuotas
	cuotas: CuotaPropia[];  // lista final de cuotas calculadas/editadas
};

export type VigenciaCorrida = {
	monto: number;
	fecha_vencimiento: string; // ISO date
	observaciones: string;
};

// ============================================
// ESTADO DEL FORMULARIO
// ============================================

export type AnexoFormState = {
	paso_actual: PasoAnexo;

	// Paso 1: Póliza seleccionada
	poliza_id: string | null;
	poliza_resumen: PolizaResumenAnexo | null;

	// Paso 2: Configuración
	config: ConfigAnexo | null;

	// Paso 3: Items de cambio (null para anulación)
	items_cambio: AnexoItemsCambio | null;

	// Paso 4: Pagos y documentos
	plan_pago_inclusion: PlanPagoInclusion | null; // para inclusión: plan propio
	cuotas_ajuste: CuotaAjuste[];                  // para exclusión: descuentos a cuotas originales
	vigencia_corrida: VigenciaCorrida | null;       // para anulación
	documentos: DocumentoPoliza[];

	// Paso 5: Advertencias
	advertencias: AdvertenciaPoliza[];
};

// ============================================
// DATOS CARGADOS DE LA PÓLIZA ORIGINAL
// ============================================

export type DatosPolizaParaAnexo = {
	poliza: PolizaResumenAnexo;
	cuotas: CuotaOriginalInfo[];
	// Items existentes del ramo (para mostrar como contexto)
	items_actuales: ItemsActualesRamo | null;
	// Anexos previos activos
	anexos_activos: AnexoResumen[];
};

export type CuotaOriginalInfo = {
	id: string;
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string;
	estado: string;
	fecha_pago?: string;
};

// Items actuales por ramo (para mostrar en readonly)
export type ItemsActualesRamo =
	| { tipo_ramo: "Automotores"; vehiculos: (VehiculoAutomotor & { id: string })[] }
	| {
			tipo_ramo: "Salud";
			asegurados: (ContratanteSalud & { id: string })[];
			beneficiarios: (TitularSalud & { id: string })[];
	  }
	| { tipo_ramo: "Ramos técnicos"; equipos: (EquipoIndustrial & { id: string })[] }
	| {
			tipo_ramo: "Aeronavegación" | "Naves o embarcaciones";
			naves: (NaveEmbarcacion & { id: string })[];
	  }
	| {
			tipo_ramo: "Incendio y Aliados";
			bienes: (BienAseguradoIncendio & { id: string })[];
	  }
	| {
			tipo_ramo: "Riesgos Varios Misceláneos";
			bienes: (BienAseguradoRiesgosVarios & { id: string })[];
	  }
	| {
			tipo_ramo: "Accidentes Personales" | "Vida" | "Sepelio";
			asegurados: (AseguradoConNivel & { id: string })[];
	  };

// ============================================
// TIPOS DE BASE DE DATOS
// ============================================

export type AnexoDB = {
	id: string;
	poliza_id: string;
	numero_anexo: string;
	tipo_anexo: TipoAnexo;
	fecha_anexo: string;
	fecha_efectiva: string;
	observaciones?: string;
	estado: EstadoAnexo;
	validado_por?: string;
	fecha_validacion?: string;
	motivo_rechazo?: string;
	rechazado_por?: string;
	fecha_rechazo?: string;
	created_at: string;
	updated_at: string;
	created_by?: string;
	updated_by?: string;
};

export type AnexoPagoDB = {
	id: string;
	anexo_id: string;
	cuota_original_id?: string;
	tipo: "ajuste" | "vigencia_corrida" | "cuota_propia";
	numero_cuota?: number;
	monto: number;
	fecha_vencimiento?: string;
	estado: "pendiente" | "pagado" | "vencido";
	observaciones?: string;
	created_at: string;
};

// ============================================
// TIPOS PARA VISTA CONSOLIDADA
// ============================================

export type CuotaConsolidada = {
	cuota_original_id: string;
	numero_cuota: number;
	monto_original: number;
	monto_ajustes: number; // suma de todos los deltas de anexos activos
	monto_consolidado: number; // monto_original + monto_ajustes
	fecha_vencimiento: string;
	estado: string;
	fecha_pago?: string;
	// Detalle de ajustes por anexo
	ajustes: {
		anexo_id: string;
		numero_anexo: string;
		tipo_anexo: TipoAnexo;
		monto_delta: number;
	}[];
};

export type CuotaVigenciaCorrida = {
	anexo_id: string;
	numero_anexo: string;
	monto: number;
	fecha_vencimiento: string;
	estado: string;
	observaciones?: string;
};

// Cuota propia de un anexo de inclusión (independiente de las cuotas de la póliza madre)
export type CuotaAnexoPropia = {
	id: string;
	anexo_id: string;
	numero_anexo: string;
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string;
	estado: string;
	observaciones?: string;
};

// ============================================
// TIPOS PARA RESÚMENES Y LISTADOS
// ============================================

export type AnexoResumen = {
	id: string;
	numero_anexo: string;
	tipo_anexo: TipoAnexo;
	fecha_anexo: string;
	fecha_efectiva: string;
	estado: EstadoAnexo;
	observaciones?: string;
	created_by_nombre?: string;
	validado_por_nombre?: string;
	fecha_validacion?: string;
	cantidad_documentos: number;
	// Resumen de cambios
	items_incluidos?: number;
	items_excluidos?: number;
	monto_ajuste_total?: number;
};
