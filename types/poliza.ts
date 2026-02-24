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

// --- CATÁLOGOS PARA RAMOS TÉCNICOS (Equipos Industriales) ---
export type TipoEquipo = {
	id: string;
	nombre: string; // "Excavadora", "Retroexcavadora", "Volqueta", etc.
	activo: boolean;
	created_at?: string;
};

export type MarcaEquipo = {
	id: string;
	nombre: string; // "Caterpillar", "Komatsu", "John Deere", etc.
	activo: boolean;
	created_at?: string;
};

// ============================================
// PRODUCTOS DE ASEGURADORAS
// ============================================

export type ProductoAseguradora = {
	id: string;
	compania_aseguradora_id: string;
	tipo_seguro_id: number;
	codigo_producto: string;
	nombre_producto: string;
	factor_contado: number;
	factor_credito: number;
	porcentaje_comision: number;
	activo: boolean;
	created_at?: string;
	updated_at?: string;
};

export type CalculoComisionParams = {
	prima_total: number;
	modalidad_pago: "contado" | "credito";
	producto: ProductoAseguradora;
	porcentaje_comision_usuario?: number;
};

export type CalculoComisionResult = {
	prima_neta: number;
	comision_empresa: number;
	comision_encargado: number;
	factor_usado: number;
	porcentaje_comision: number;
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

export type GrupoProduccion = "generales" | "personales";

export type DatosBasicosPoliza = {
	numero_poliza: string;
	compania_aseguradora_id: string;
	ramo: string; // Nombre del ramo de tipos_seguros
	producto_id: string; // ID del producto seleccionado (OBLIGATORIO)
	inicio_vigencia: string; // ISO date string
	fin_vigencia: string;
	fecha_emision_compania: string;
	responsable_id: string; // ID del usuario comercial
	regional_id: string;
	categoria_id?: string; // Ahora es opcional (grupo de negocios)
	grupo_produccion: GrupoProduccion; // NUEVO: generales o personales
	moneda: Moneda; // NUEVO: Moneda se define a nivel de póliza
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
	coaseguro: number; // NUEVO: Porcentaje de coaseguro (0-100)
	// Campos opcionales
	tipo_vehiculo_id?: string;
	marca_id?: string;
	modelo?: string;
	ano?: number; // Cambiado de string a number
	color?: string;
	ejes?: number;
	nro_motor?: string;
	nro_asientos?: number;
	plaza_circulacion?: string;
};

export type DatosAutomotor = {
	tipo_poliza: "individual" | "corporativo"; // NUEVO: Tipo de póliza (individual o corporativo)
	vehiculos: VehiculoAutomotor[];
};

// --- SALUD ---
// NUEVO: Nivel de cobertura para Salud (estructura simplificada)
export type NivelSalud = {
	id: string; // UUID generado en cliente
	nombre: string; // "Nivel 1", "Nivel 2", etc.
	monto: number; // Monto de cobertura del nivel
};

export type RolAseguradoSalud = "contratante" | "titular"; // Para clientes registrados con datos completos

export type RolBeneficiarioSalud = "dependiente" | "conyugue"; // Para beneficiarios sin registro completo

export type AseguradoSalud = {
	client_id: string;
	client_name: string;
	client_ci: string;
	nivel_id: string; // NUEVO: Referencia al NivelSalud
	rol: RolAseguradoSalud; // OBLIGATORIO: contratante o titular
};

// NUEVO: Beneficiario específico de póliza de salud (persona cubierta por el seguro)
// Diferencia con AseguradoSalud:
//   - AseguradoSalud: Clientes registrados (contratante/titular) con todos sus datos
//   - BeneficiarioSalud: Dependientes o cónyuges con datos mínimos
export type BeneficiarioSalud = {
	id: string; // UUID generado en cliente (temporal hasta guardar en DB)
	nombre_completo: string;
	carnet: string;
	fecha_nacimiento: string; // ISO date string
	genero: "M" | "F" | "Otro";
	nivel_id: string; // Referencia al NivelSalud
	rol: RolBeneficiarioSalud; // OBLIGATORIO: dependiente o conyugue
};

export type DatosSalud = {
	niveles: NivelSalud[]; // NUEVO: Niveles de cobertura configurados
	tipo_poliza: "individual" | "corporativo";
	regional_asegurado_id: string;
	tiene_maternidad: boolean; // NUEVO: Indica si la póliza incluye cobertura de maternidad
	asegurados: AseguradoSalud[]; // MODIFICADO: Clientes registrados que contratan la póliza
	beneficiarios: BeneficiarioSalud[]; // NUEVO: Personas cubiertas específicas de esta póliza
	// REMOVED: suma_asegurada (ahora está en niveles)
};

// --- INCENDIO Y ALIADOS ---
// NUEVO: Items asegurables para cada ubicación
export type ItemIncendio = {
	nombre:
		| "Edificaciones, instalaciones en general"
		| "Activos fijos en general"
		| "Equipos electronicos"
		| "Maquinaria fija o equipos"
		| "Existencias (mercaderia)"
		| "Dinero y valores dentro del predio"
		| "Vidrios y cristales";
	monto: number; // Monto asegurado para este item
};

export type BienAseguradoIncendio = {
	direccion: string;
	items: ItemIncendio[]; // NUEVO: Items asegurados en esta ubicación
	valor_total_declarado: number; // NUEVO: Suma de todos los items (calculado automáticamente)
	es_primer_riesgo: boolean;
	// REMOVED: valor_declarado (reemplazado por suma de items)
};

export type AseguradoIncendio = {
	client_id: string;
	client_name: string;
	client_ci: string;
};

export type DatosIncendio = {
	tipo_poliza: "individual" | "corporativo";
	regional_asegurado_id: string;
	valor_asegurado: number; // MODIFICADO: Ahora es la suma de todos los bienes' valor_total_declarado
	bienes: BienAseguradoIncendio[]; // MODIFICADO: Ahora incluye items
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
	// REMOVED: moneda (usa la moneda de toda la póliza definida en paso 2)
	// REMOVED: asegurados (no es necesario para este ramo)
};

// --- RIESGOS VARIOS MISCELÁNEOS ---
// NUEVO: Estructura para convenios con habilitación individual
export type ConvenioRiesgosVarios = {
	habilitado: boolean; // Si el convenio está habilitado
	monto: number; // Monto asegurado (solo aplicable si habilitado)
};

export type AseguradoRiesgosVarios = {
	client_id: string;
	client_name: string;
	client_ci: string;
};

export type DatosRiesgosVarios = {
	convenio_1_infidelidad_empleados: ConvenioRiesgosVarios; // MODIFICADO: Ahora es objeto con habilitado/monto
	convenio_2_perdidas_dentro_local: ConvenioRiesgosVarios; // MODIFICADO: Ahora es objeto con habilitado/monto
	convenio_3_perdidas_fuera_local: ConvenioRiesgosVarios; // MODIFICADO: Ahora es objeto con habilitado/monto
	convenio_4_pendiente: ConvenioRiesgosVarios; // NUEVO: Convenio 4 (temporal: "pendiente")
	convenio_5_pendiente: ConvenioRiesgosVarios; // NUEVO: Convenio 5 (temporal: "pendiente")
	valor_total_asegurado: number; // MODIFICADO: Suma solo de convenios habilitados
	asegurados: AseguradoRiesgosVarios[];
	// REMOVED: moneda (usa la moneda de toda la póliza definida en paso 2)
};

// --- RAMOS TÉCNICOS (Equipos Industriales) ---
export type EquipoIndustrial = {
	id?: string; // Solo para edición de equipos existentes
	// Campos obligatorios
	nro_serie: string; // Número de serie (identificador único del equipo)
	valor_asegurado: number;
	franquicia: number;
	nro_chasis: string;
	uso: "publico" | "particular";
	coaseguro: number; // Porcentaje de coaseguro (0-100)
	// Campos opcionales
	placa?: string; // Placa es opcional para equipos industriales
	tipo_equipo_id?: string; // Referencia a tipos_equipo
	marca_equipo_id?: string; // Referencia a marcas_equipo
	modelo?: string;
	ano?: number;
	color?: string;
	nro_motor?: string;
	plaza_circulacion?: string;
};

export type DatosRamosTecnicos = {
	tipo_poliza: "individual" | "corporativo";
	equipos: EquipoIndustrial[];
};

// --- TRANSPORTE ---
export type TipoTransporte = "terrestre" | "maritimo" | "aereo" | "ferreo" | "multimodal";

export type ModalidadTransporte = "flotante" | "flat" | "un_solo_embarque" | "flat_prima_minima_deposito";

export type Pais = {
	id: string;
	codigo_iso: string;
	nombre: string;
	activo: boolean;
};

export type DatosTransporte = {
	materia_asegurada: string; // Texto largo - descripción de la mercancía
	tipo_embalaje: string; // Tipo de embalaje
	fecha_embarque: string; // ISO date string
	tipo_transporte: TipoTransporte;
	ciudad_origen: string;
	pais_origen_id: string; // Referencia a tabla paises
	ciudad_destino: string;
	pais_destino_id: string; // Referencia a tabla paises
	valor_asegurado: number;
	factura: string; // Número de factura
	fecha_factura: string; // ISO date string
	cobertura_a: boolean; // Cobertura A (Todo Riesgo)
	cobertura_c: boolean; // Cobertura C (Riesgos Nombrados)
	modalidad: ModalidadTransporte;
};

// --- AERONAVEGACIÓN / NAVES Y EMBARCACIONES ---
// Tipo de uso para naves y aeronaves
export type UsoNave = "privado" | "publico" | "recreacion";

// Catálogos para naves
export type MarcaNave = {
	id: string;
	nombre: string; // "Cessna", "Boeing", "Yamaha", etc.
	tipo: "aeronave" | "embarcacion"; // Para filtrar según el tipo de seguro
	activo: boolean;
	created_at?: string;
};

// Nivel de Accidentes Personales específico para tripulantes/pasajeros de naves
export type NivelAPNave = {
	id: string; // UUID generado en cliente
	nombre: string; // "Nivel 1", "Nivel 2", etc.
	monto_muerte_accidental: number;
	monto_invalidez: number;
	monto_gastos_medicos: number;
};

// Nave o embarcación asegurada
export type NaveEmbarcacion = {
	id?: string; // Solo para edición de naves existentes
	// Campos obligatorios
	matricula: string; // Matrícula de la nave (identificador único)
	marca: string; // Marca de la nave
	modelo: string; // Modelo
	ano: number; // Año de fabricación
	serie: string; // Número de serie
	uso: UsoNave; // privado, publico, recreacion
	nro_pasajeros: number; // Número máximo de pasajeros
	nro_tripulantes: number; // Número de tripulantes
	// Valores asegurados
	valor_casco: number; // Valor asegurado del casco
	valor_responsabilidad_civil: number; // Valor de responsabilidad civil
	nivel_ap_id?: string; // Referencia al nivel de Accidentes Personales (opcional)
};

// Asegurado adicional (cliente registrado completo)
export type AseguradoAeronavegacion = {
	client_id: string;
	client_name: string;
	client_ci: string;
};

// Datos específicos del ramo Aeronavegación/Naves
export type DatosAeronavegacion = {
	tipo_poliza: "individual" | "corporativo";
	tipo_nave: "aeronave" | "embarcacion"; // Para distinguir entre aeronavegación y naves marítimas
	niveles_ap: NivelAPNave[]; // Niveles de Accidentes Personales configurados
	naves: NaveEmbarcacion[]; // Lista de naves/embarcaciones aseguradas
	asegurados_adicionales: AseguradoAeronavegacion[]; // Asegurados adicionales (clientes registrados)
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
	prima_nivel?: number; // NUEVO: Prima del nivel (solo para Accidentes Personales)
	coberturas: CoberturasAccidentesPersonales | CoberturasVida | CoberturaSepelio;
};

export type AseguradoConNivel = {
	client_id: string;
	client_name: string;
	client_ci: string;
	nivel_id: string; // Referencia al ID del nivel
	cargo?: string; // NUEVO: Cargo/posición (Ej: "Gerente", "Operador") - solo para Accidentes Personales corporativo
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
	producto: string; // MODIFICADO: Ahora obligatorio (nombre del producto seleccionado)
	producto_id?: string; // NUEVO: UUID referencia a productos_vida.id
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
	| { tipo_ramo: "Ramos técnicos"; datos: DatosRamosTecnicos }
	| { tipo_ramo: "Transportes"; datos: DatosTransporte }
	| { tipo_ramo: "Aeronavegación"; datos: DatosAeronavegacion }
	| { tipo_ramo: "Naves o embarcaciones"; datos: DatosAeronavegacion }
	| { tipo_ramo: "Accidentes Personales"; datos: DatosAccidentesPersonales }
	| { tipo_ramo: "Vida"; datos: DatosVida }
	| { tipo_ramo: "Sepelio"; datos: DatosSepelio }
	| { tipo_ramo: "Otro"; datos: Record<string, unknown> }; // Genérico para otros ramos

// ============================================
// PASO 4: MODALIDAD DE PAGO
// ============================================

export type Moneda = "Bs" | "USD" | "USDT" | "UFV";
export type PeriodoPago = "mensual" | "trimestral" | "semestral";

export type EstadoCuota = "pendiente" | "pagado" | "vencida";

export type CuotaCredito = {
	id?: string; // ID en BD (para cuotas existentes en edición)
	numero: number; // Número de cuota editable (permite cuotas no secuenciales)
	monto: number;
	fecha_vencimiento: string; // ISO date
	estado?: EstadoCuota; // Estado de la cuota (para edición)
	fecha_pago?: string; // Fecha en que se pagó (si está pagada)
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
	// Campos para edición
	cuota_id?: string; // ID de la cuota en BD
	cuota_pagada?: boolean; // Si la cuota única ya está pagada
};

export type PagoCredito = {
	tipo: "credito";
	prima_total: number;
	moneda: Moneda;
	cantidad_cuotas: number;
	cuota_inicial: number;
	fecha_inicio_cuotas: string; // ISO date - fecha desde donde se calculan las cuotas
	periodo_pago: PeriodoPago; // mensual, trimestral, semestral
	cuotas: CuotaCredito[];
	// Campos calculados (solo para display)
	prima_neta?: number;
	comision?: number;
	// Campos para edición
	cuota_inicial_id?: string; // ID de la cuota inicial en BD
	cuota_inicial_pagada?: boolean; // Si la cuota inicial ya está pagada
	tiene_pagos?: boolean; // Si hay al menos una cuota pagada (bloquea cambio de modalidad)
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
	storage_path?: string; // Ruta en bucket Storage (temp o final)
	upload_status?: "uploading" | "uploaded" | "error"; // Estado de subida client-side
	upload_error?: string; // Mensaje de error si la subida falló
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
	producto_id?: string; // Referencia al producto de la aseguradora
	inicio_vigencia: string;
	fin_vigencia: string;
	fecha_emision_compania: string;
	responsable_id: string;
	regional_id: string;
	categoria_id: string;
	modalidad_pago: "contado" | "credito";
	prima_total: number;
	moneda: Moneda;
	prima_neta: number;
	comision: number;
	comision_empresa?: number; // Comisión calculada para la empresa
	comision_encargado?: number; // Comisión calculada para el encargado
	estado: "pendiente" | "activa" | "vencida" | "cancelada" | "renovada" | "rechazada";
	validado_por?: string; // Usuario gerente que validó la póliza
	fecha_validacion?: string; // Fecha de validación gerencial
	// Campos de rechazo
	motivo_rechazo?: string; // Razón del rechazo por gerencia
	rechazado_por?: string; // UUID del gerente/admin que rechazó
	fecha_rechazo?: string; // Fecha y hora del rechazo
	puede_editar_hasta?: string; // Ventana de edición permitida (1 día desde rechazo)
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
	coaseguro: number; // NUEVO: Porcentaje de coaseguro (0-100)
	tipo_vehiculo_id?: string;
	marca_id?: string;
	modelo?: string;
	ano?: number; // Cambiado de string a number
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

export type EquipoIndustrialDB = {
	id: string;
	poliza_id: string;
	nro_serie: string;
	valor_asegurado: number;
	franquicia: number;
	nro_chasis: string;
	uso: "publico" | "particular";
	coaseguro: number;
	placa?: string;
	tipo_equipo_id?: string;
	marca_equipo_id?: string;
	modelo?: string;
	ano?: number;
	color?: string;
	nro_motor?: string;
	plaza_circulacion?: string;
	created_at: string;
	created_by?: string;
	updated_at?: string;
	updated_by?: string;
};

export type NaveEmbarcacionDB = {
	id: string;
	poliza_id: string;
	matricula: string;
	marca: string;
	modelo: string;
	ano: number;
	serie: string;
	uso: "privado" | "publico" | "recreacion";
	nro_pasajeros: number;
	nro_tripulantes: number;
	valor_casco: number;
	valor_responsabilidad_civil: number;
	nivel_ap_id?: string;
	created_at: string;
	created_by?: string;
	updated_at?: string;
	updated_by?: string;
};

export type AseguradoAeronavegacionDB = {
	id: string;
	poliza_id: string;
	client_id: string;
	created_at: string;
	created_by?: string;
};

export type NivelAPNaveDB = {
	id: string;
	poliza_id: string;
	nombre: string;
	monto_muerte_accidental: number;
	monto_invalidez: number;
	monto_gastos_medicos: number;
	created_at: string;
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
	coaseguro: number | string; // NUEVO: Porcentaje de coaseguro (0-100)
	tipo_vehiculo?: string;
	marca?: string;
	modelo?: string;
	ano?: number | string; // Puede venir como número o string del Excel
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

// ============================================
// TIPOS PARA EXCEL IMPORT (Ramos Técnicos)
// ============================================

export type EquipoExcelRow = {
	nro_serie: string;
	valor_asegurado: number | string;
	franquicia: number | string;
	nro_chasis: string;
	uso: string; // Se validará contra "publico" | "particular"
	coaseguro: number | string;
	placa?: string; // Opcional
	tipo_equipo?: string;
	marca_equipo?: string;
	modelo?: string;
	ano?: number | string;
	color?: string;
	nro_motor?: string;
	plaza_circulacion?: string;
};

export type EquipoExcelImportResult = {
	exito: boolean;
	equipos_validos: EquipoIndustrial[];
	errores: Array<{
		fila: number;
		errores: string[];
	}>;
};

// ============================================
// TIPOS PARA EXCEL IMPORT (Sepelio)
// ============================================

export type SepelioExcelRow = {
	ci: string; // CI del asegurado (debe existir en base de clientes)
	nivel_nombre: string; // Nombre del nivel (debe coincidir con niveles configurados)
};

export type SepelioExcelImportResult = {
	exito: boolean;
	asegurados_validos: AseguradoConNivel[]; // Asegurados validados y listos para agregar
	errores: Array<{
		fila: number;
		errores: string[]; // Lista de errores para esta fila
	}>;
};

// ============================================
// TIPOS PARA CATÁLOGO PRODUCTOS VIDA
// ============================================

export type ProductoVida = {
	id: string; // UUID del producto
	nombre: string; // Nombre del producto
	descripcion?: string; // Descripción opcional
	activo: boolean; // Estado del producto
	created_at: string;
	updated_at: string;
};
