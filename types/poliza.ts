// types/poliza.ts - Sistema de Pólizas

// ============================================
// TIPOS DE CATÁLOGOS DE BASE DE DATOS
// ============================================

export type CompaniaAseguradora = {
	id: string;
	nombre: string;
	activo: boolean;
	created_at?: string;
};

export type Regional = {
	id: string;
	nombre: string;
	codigo: string; // "LP", "SC", "CB", etc.
	activo: boolean;
	created_at?: string;
};

export type Categoria = {
	id: string;
	nombre: string;
	descripcion?: string;
	activo: boolean;
	created_at?: string;
};

export type TipoVehiculo = {
	id: string;
	nombre: string; // "Moto", "Vagoneta", "Camioneta", etc.
	activo: boolean;
	created_at?: string;
};

export type MarcaVehiculo = {
	id: string;
	nombre: string; // "Toyota", "Honda", etc.
	activo: boolean;
	created_at?: string;
};

// ============================================
// PASO 1: BÚSQUEDA Y SELECCIÓN DE ASEGURADO
// ============================================

export type ClienteNatural = {
	client_id: string;
	primer_nombre: string;
	segundo_nombre?: string;
	primer_apellido: string;
	segundo_apellido?: string;
	tipo_documento: string;
	numero_documento: string;
	extension_ci?: string;
	fecha_nacimiento: string;
	direccion: string;
	celular?: string;
	correo_electronico?: string;
};

export type ClienteJuridico = {
	client_id: string;
	razon_social: string;
	tipo_sociedad?: string;
	nit: string;
	matricula_comercio?: string;
	direccion_legal: string;
	correo_electronico?: string;
	telefono?: string;
};

export type ClienteBase = {
	id: string;
	client_type: "natural" | "juridica";
	status: "active" | "inactive" | "suspended";
	created_at: string;
};

// Tipo unificado para el paso 1
export type AseguradoSeleccionado = ClienteBase & {
	detalles: ClienteNatural | ClienteJuridico;
	// Campos calculados para display
	nombre_completo: string;
	documento: string;
};

// ============================================
// PASO 2: DATOS BÁSICOS DE LA PÓLIZA
// ============================================

export type DatosBasicosPoliza = {
	numero_poliza: string;
	compania_aseguradora_id: string;
	ramo: string; // Nombre del ramo de tipos_seguros
	inicio_vigencia: string; // ISO date string
	fin_vigencia: string;
	fecha_emision_compania: string;
	responsable_id: string; // ID del usuario comercial
	regional_id: string;
	categoria_id: string;
};

// ============================================
// PASO 3: DATOS ESPECÍFICOS POR RAMO
// ============================================

// --- AUTOMOTOR ---
export type VehiculoAutomotor = {
	id?: string; // Solo para edición de vehículos existentes
	// Campos obligatorios
	placa: string;
	valor_asegurado: number;
	franquicia: number;
	nro_chasis: string;
	uso: "publico" | "particular";
	// Campos opcionales
	tipo_vehiculo_id?: string;
	marca_id?: string;
	modelo?: string;
	ano?: string;
	color?: string;
	ejes?: number;
	nro_motor?: string;
	nro_asientos?: number;
	plaza_circulacion?: string;
};

export type DatosAutomotor = {
	vehiculos: VehiculoAutomotor[];
};

// --- SALUD ---
export type RolAseguradoSalud = "contratante" | "titular" | "conyugue" | "dependiente";

export type AseguradoSalud = {
	client_id: string;
	client_name: string;
	client_ci: string;
	rol: RolAseguradoSalud;
};

export type DatosSalud = {
	tipo_poliza: "individual" | "corporativo";
	suma_asegurada: number;
	regional_asegurado_id: string;
	asegurados: AseguradoSalud[];
};

// --- INCENDIO Y ALIADOS ---
export type BienAseguradoIncendio = {
	direccion: string;
	valor_declarado: number;
	es_primer_riesgo: boolean;
};

export type AseguradoIncendio = {
	client_id: string;
	client_name: string;
	client_ci: string;
};

export type DatosIncendio = {
	tipo_poliza: "individual" | "corporativo";
	regional_asegurado_id: string;
	valor_asegurado: number;
	bienes: BienAseguradoIncendio[];
	asegurados: AseguradoIncendio[];
};

// --- RESPONSABILIDAD CIVIL ---
export type AseguradoResponsabilidadCivil = {
	client_id: string;
	client_name: string;
	client_ci: string;
};

export type DatosResponsabilidadCivil = {
	tipo_poliza: "individual" | "corporativo";
	valor_asegurado: number;
	moneda: "Bs" | "USD";
	asegurados: AseguradoResponsabilidadCivil[];
};

// --- RIESGOS VARIOS MISCELÁNEOS ---
export type AseguradoRiesgosVarios = {
	client_id: string;
	client_name: string;
	client_ci: string;
};

export type DatosRiesgosVarios = {
	convenio_1_infidelidad_empleados: number;
	convenio_2_perdidas_dentro_local: number;
	convenio_3_perdidas_fuera_local: number;
	valor_total_asegurado: number;
	moneda: "Bs" | "USD";
	asegurados: AseguradoRiesgosVarios[];
};

// --- ACCIDENTES PERSONALES, VIDA, SEPELIO (CON NIVELES) ---
export type CoberturasAccidentesPersonales = {
	muerte_accidental: { habilitado: boolean; valor: number };
	invalidez_total_parcial: { habilitado: boolean; valor: number };
	gastos_medicos: { habilitado: boolean; valor: number };
	sepelio: { habilitado: boolean; valor: number };
};

export type CoberturasVida = {
	muerte: { habilitado: boolean; valor: number };
	dima: { habilitado: boolean; valor: number };
	sepelio: { habilitado: boolean; valor: number };
	gastos_medicos: { habilitado: boolean; valor: number };
	indm_enfermedades_graves: { habilitado: boolean; valor: number };
};

export type CoberturaSepelio = {
	sepelio: { habilitado: boolean; valor: number };
};

export type NivelCobertura = {
	id: string; // UUID generado en cliente
	nombre: string; // "Nivel 1", "Nivel 2", etc.
	coberturas: CoberturasAccidentesPersonales | CoberturasVida | CoberturaSepelio;
};

export type AseguradoConNivel = {
	client_id: string;
	client_name: string;
	client_ci: string;
	nivel_id: string; // Referencia al ID del nivel
};

export type DatosAccidentesPersonales = {
	niveles: NivelCobertura[]; // Configurados en paso 2.1
	tipo_poliza: "individual" | "corporativo";
	regional_asegurado_id: string;
	asegurados: AseguradoConNivel[];
	producto?: string; // Opcional
};

export type DatosVida = {
	niveles: NivelCobertura[]; // Configurados en paso 2.1
	tipo_poliza: "individual" | "corporativo";
	regional_asegurado_id: string;
	asegurados: AseguradoConNivel[];
	producto?: string; // Opcional
};

export type DatosSepelio = {
	niveles: NivelCobertura[]; // Configurados en paso 2.1
	tipo_poliza: "individual" | "corporativo";
	regional_asegurado_id: string;
	asegurados: AseguradoConNivel[];
	producto?: string; // Opcional
};

// Tipo discriminado para datos específicos
export type DatosEspecificosPoliza =
	| { tipo_ramo: "Automotores"; datos: DatosAutomotor }
	| { tipo_ramo: "Salud"; datos: DatosSalud }
	| { tipo_ramo: "Incendio y Aliados"; datos: DatosIncendio }
	| { tipo_ramo: "Responsabilidad Civil"; datos: DatosResponsabilidadCivil }
	| { tipo_ramo: "Riesgos Varios Misceláneos"; datos: DatosRiesgosVarios }
	| { tipo_ramo: "Accidentes Personales"; datos: DatosAccidentesPersonales }
	| { tipo_ramo: "Vida"; datos: DatosVida }
	| { tipo_ramo: "Sepelio"; datos: DatosSepelio }
	| { tipo_ramo: "Otro"; datos: Record<string, unknown> }; // Genérico para otros ramos

// ============================================
// PASO 4: MODALIDAD DE PAGO
// ============================================

export type Moneda = "Bs" | "USD" | "USDT" | "UFV";

export type CuotaCredito = {
	numero: number;
	monto: number;
	fecha_vencimiento: string; // ISO date
};

export type PagoContado = {
	tipo: "contado";
	cuota_unica: number;
	fecha_pago_unico: string; // ISO date
	prima_total: number;
	moneda: Moneda;
	// Campos calculados (solo para display)
	prima_neta?: number; // prima_total * 0.87
	comision?: number; // prima_neta * 0.02
};

export type PagoCredito = {
	tipo: "credito";
	prima_total: number;
	moneda: Moneda;
	cantidad_cuotas: number;
	cuota_inicial: number;
	cuotas: CuotaCredito[];
	// Campos calculados (solo para display)
	prima_neta?: number;
	comision?: number;
};

export type ModalidadPago = PagoContado | PagoCredito;

// ============================================
// PASO 5: DOCUMENTOS
// ============================================

export type DocumentoPoliza = {
	id?: string; // Solo si ya existe en BD
	tipo_documento: string; // "Póliza firmada", "CI asegurado", etc.
	nombre_archivo: string;
	archivo_url?: string; // URL en Supabase Storage después de subir
	tamano_bytes?: number;
	file?: File; // Archivo en memoria antes de subir
	estado?: "activo" | "descartado"; // Estado del documento (soft delete)
};

// ============================================
// PASO 6: RESUMEN Y ADVERTENCIAS
// ============================================

export type AdvertenciaPoliza = {
	tipo: "warning" | "info" | "error";
	campo: string;
	mensaje: string;
};

// ============================================
// ESTADO COMPLETO DEL FORMULARIO
// ============================================

export type PasoFormulario = 1 | 2 | 3 | 4 | 5 | 6;

export type PolizaFormState = {
	paso_actual: PasoFormulario;

	// Paso 1: Asegurado
	asegurado: AseguradoSeleccionado | null;

	// Paso 2: Datos básicos
	datos_basicos: DatosBasicosPoliza | null;

	// Paso 3: Datos específicos del ramo
	datos_especificos: DatosEspecificosPoliza | null;

	// Paso 4: Modalidad de pago
	modalidad_pago: ModalidadPago | null;

	// Paso 5: Documentos
	documentos: DocumentoPoliza[];

	// Paso 6: Advertencias para el resumen
	advertencias: AdvertenciaPoliza[];

	// Metadata
	en_edicion: boolean; // true si se está editando una póliza existente
	poliza_id?: string; // ID de la póliza si se está editando
};

// ============================================
// TIPOS DE BASE DE DATOS (Para queries)
// ============================================

export type PolizaDB = {
	id: string;
	client_id: string;
	numero_poliza: string;
	compania_aseguradora_id: string;
	ramo: string;
	inicio_vigencia: string;
	fin_vigencia: string;
	fecha_emision_compania: string;
	responsable_id: string;
	regional_id: string;
	categoria_id: string;
	modalidad_pago: "contado" | "credito";
	prima_total: number;
	moneda: Moneda;
	prima_neta: number; // Generado automáticamente
	comision: number; // Generado automáticamente
	estado: "activa" | "vencida" | "cancelada" | "renovada";
	created_at: string;
	updated_at: string;
	created_by?: string;
	updated_by?: string;
};

export type PagoPolizaDB = {
	id: string;
	poliza_id: string;
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string;
	fecha_pago?: string;
	estado: "pendiente" | "pagado" | "vencido" | "parcial";
	observaciones?: string;
	created_at: string;
	updated_at: string;
	created_by?: string;
	updated_by?: string;
};

export type DocumentoPolizaDB = {
	id: string;
	poliza_id: string;
	tipo_documento: string;
	nombre_archivo: string;
	archivo_url: string;
	tamano_bytes?: number;
	uploaded_at: string;
	uploaded_by?: string;
};

export type VehiculoAutomotorDB = {
	id: string;
	poliza_id: string;
	placa: string;
	valor_asegurado: number;
	franquicia: number;
	nro_chasis: string;
	uso: "publico" | "particular";
	tipo_vehiculo_id?: string;
	marca_id?: string;
	modelo?: string;
	ano?: string;
	color?: string;
	ejes?: number;
	nro_motor?: string;
	nro_asientos?: number;
	plaza_circulacion?: string;
	created_at: string;
	created_by?: string;
	updated_at?: string;
	updated_by?: string;
};

// ============================================
// TIPOS PARA VALIDACIÓN Y UTILIDADES
// ============================================

export type ValidationError = {
	campo: string;
	mensaje: string;
};

export type ValidationResult = {
	valido: boolean;
	errores: ValidationError[];
};

// ============================================
// TIPOS PARA EXCEL IMPORT (Automotor)
// ============================================

export type VehiculoExcelRow = {
	placa: string;
	valor_asegurado: number | string;
	franquicia: number | string;
	nro_chasis: string;
	uso: string; // Se validará contra "publico" | "particular"
	tipo_vehiculo?: string;
	marca?: string;
	modelo?: string;
	ano?: string;
	color?: string;
	ejes?: number | string;
	nro_motor?: string;
	nro_asientos?: number | string;
	plaza_circulacion?: string;
};

export type ExcelImportResult = {
	exito: boolean;
	vehiculos_validos: VehiculoAutomotor[];
	errores: Array<{
		fila: number;
		errores: string[];
	}>;
};
