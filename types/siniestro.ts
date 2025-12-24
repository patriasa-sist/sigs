// types/siniestro.ts - Sistema de Gestión de Siniestros

// ============================================
// TIPOS DE CATÁLOGOS Y ESTADOS
// ============================================

export type CoberturaCatalogo = {
	id: string;
	nombre: string;
	descripcion?: string;
	codigo_puc: string | null; // Código PUC del ramo (ej: "9105" para Automotores) - más robusto que nombre
	ramo: string; // Nombre del ramo (ej: "Automotores") - para compatibilidad con sistema existente
	es_custom: boolean;
	activo: boolean;
	created_at?: string;
};

export type MotivoRechazo = "Mora" | "Incumplimiento" | "Sin cobertura" | "No aplicable";
export type MotivoDeclinacion = "Solicitud cliente" | "Pagó otra póliza";
export type EstadoSiniestro = "abierto" | "rechazado" | "declinado" | "concluido";
export type MotivoCierreTipo = "rechazo" | "declinacion" | "indemnizacion";
export type Moneda = "Bs" | "USD" | "USDT" | "UFV";

// ============================================
// TIPOS PARA DOCUMENTOS
// ============================================

export const TIPOS_DOCUMENTO_SINIESTRO = [
	"fotografía VA",
	"fotografía RC",
	"formulario de denuncia",
	"licencia de conducir",
	"informe tránsito",
	"informe SOAT",
	"test alcoholemia",
	"franquicia y/o deducible",
	"proforma",
	"orden de compra/trabajo",
	"inspección",
	"liquidación",
	"carta_rechazo",
	"carta_respaldo",
	"archivo_uif",
	"archivo_pep",
	"Otro",
] as const;

export type TipoDocumentoSiniestro = (typeof TIPOS_DOCUMENTO_SINIESTRO)[number];

export type DocumentoSiniestro = {
	id?: string; // Opcional para nuevos documentos
	siniestro_id?: string;
	tipo_documento: TipoDocumentoSiniestro;
	nombre_archivo: string;
	archivo_url?: string; // Solo presente en documentos ya guardados
	file?: File; // Solo presente en nuevos documentos (antes de subir)
	tamano_bytes?: number;
	estado?: "activo" | "descartado";
	uploaded_at?: string;
	uploaded_by?: string;
};

export type DocumentoSiniestroConUsuario = DocumentoSiniestro & {
	usuario_nombre?: string; // Nombre del usuario que subió
};

// ============================================
// PASO 1: SELECCIÓN DE PÓLIZA
// ============================================

export type AseguradoDetalle = {
	tipo: "vehiculo" | "persona";
	// Para vehículos
	placa?: string;
	modelo?: string;
	ano?: string;
	marca?: string;
	valor_asegurado?: number;
	// Para personas
	nombre?: string;
	documento?: string;
	relacion?: string; // Titular, dependiente, etc.
};

export type ProrrogaCuota = {
	fecha_anterior: string;
	fecha_nueva: string;
	dias_prorroga: number;
	motivo?: string;
	otorgado_por?: string;
	fecha_otorgamiento: string;
};

export type CuotaPago = {
	id: string;
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string;
	estado: "pendiente" | "pagada" | "vencida" | "parcial";
	fecha_pago?: string;
	fecha_vencimiento_original?: string; // Fecha original antes de prórrogas
	prorrogas_historial?: ProrrogaCuota[]; // Array de prórrogas aplicadas
	observaciones?: string;
};

export type DocumentoPoliza = {
	id: string;
	tipo_documento: string;
	nombre_archivo: string;
	archivo_url: string;
	tamano_bytes?: number;
	estado: "activo" | "descartado";
};

export type PolizaParaSiniestro = {
	id: string;
	numero_poliza: string;
	ramo: string;
	inicio_vigencia: string;
	fin_vigencia: string;
	prima_total: number;
	moneda: string;

	// Información del cliente
	cliente: {
		id: string;
		nombre_completo: string;
		documento: string;
		tipo: "natural" | "juridica";
		celular?: string; // Para contacto directo
		correo_electronico?: string; // Para contacto directo
	};

	// Información del responsable
	responsable: {
		id: string;
		full_name: string;
	};

	// Información de la compañía
	compania: {
		id: string;
		nombre: string;
	};

	// Cuotas de pago detalladas
	cuotas?: CuotaPago[];
	cuotas_pendientes?: number;
	cuotas_pagadas?: number;
	cuotas_total?: number;

	// Documentos de la póliza
	documentos?: DocumentoPoliza[];
	total_documentos?: number;

	// Asegurados específicos (vehículos para automotor, personas para otros ramos)
	asegurados?: AseguradoDetalle[];
};

// ============================================
// PASO 2: DETALLES DEL SINIESTRO
// ============================================

export type ContactoSiniestro = {
	nombre: string; // Obligatorio
	telefono: string; // Obligatorio
	correo?: string; // Opcional
};

// Helper para normalizar contactos (retrocompatibilidad)
export function normalizarContactos(contactos: ContactoSiniestro[] | string[] | null | undefined): ContactoSiniestro[] {
	if (!contactos || contactos.length === 0) return [];

	// Si el primer elemento es string, son emails viejos
	if (typeof contactos[0] === "string") {
		return (contactos as string[]).map((email) => ({
			nombre: "Contacto",
			telefono: "N/A",
			correo: email,
		}));
	}

	// Si no, ya son objetos ContactoSiniestro
	return contactos as ContactoSiniestro[];
}

export type DetallesSiniestro = {
	fecha_siniestro: string; // ISO date string - Fecha en que ocurrió el siniestro
	fecha_reporte: string; // ISO date string - Fecha de reporte del siniestro (PATRIA)
	fecha_reporte_compania: string; // ISO date string - Fecha en que se reportó a la compañía aseguradora
	// NOTA: fecha cuando cliente reportó = created_at (timestamp automático)
	lugar_hecho: string;
	departamento_id: string; // FK a regionales
	monto_reserva: number;
	moneda: Moneda;
	descripcion: string;
	contactos: ContactoSiniestro[]; // Array de objetos contacto (actualizado de string[])
	responsable_id?: string; // FK a profiles - responsable del siniestro
};

// ============================================
// PASO 3: COBERTURAS
// ============================================

export type CoberturaSeleccionada = {
	id: string; // ID de la cobertura del catálogo
	nombre: string;
	descripcion?: string;
};

export type CoberturasStep = {
	coberturas_seleccionadas: CoberturaSeleccionada[];
	// Permite agregar coberturas custom
	nueva_cobertura?: {
		nombre: string;
		descripcion?: string;
	};
};

// ============================================
// PASO 4: DOCUMENTOS INICIALES
// ============================================

export type DocumentosIniciales = {
	documentos: DocumentoSiniestro[];
};

// ============================================
// FORMULARIO COMPLETO DE REGISTRO
// ============================================

export type RegistroSiniestroFormState = {
	paso_actual: 1 | 2 | 3 | 4;
	poliza_seleccionada: PolizaParaSiniestro | null;
	detalles: DetallesSiniestro | null;
	coberturas: CoberturasStep | null;
	documentos_iniciales: DocumentoSiniestro[];
	advertencias: string[];
};

// ============================================
// EDICIÓN DE SINIESTRO ABIERTO
// ============================================

export type ObservacionSiniestro = {
	id: string;
	siniestro_id: string;
	observacion: string;
	created_at: string;
	created_by?: string;
	usuario_nombre?: string; // Nombre del usuario que creó la observación
};

export type EdicionSiniestroFormState = {
	// Datos de solo lectura (readonly)
	siniestro_id: string;
	poliza: PolizaParaSiniestro;
	detalles: DetallesSiniestro;
	coberturas: CoberturaSeleccionada[];
	documentos_existentes: DocumentoSiniestroConUsuario[];
	observaciones_existentes: ObservacionSiniestro[];

	// Datos editables
	nuevos_documentos: DocumentoSiniestro[];
	nueva_observacion: string;
	fecha_llegada_repuestos?: string; // ISO date string

	// Estado de cierre
	tipo_cierre?: MotivoCierreTipo;
	datos_cierre?: DatosCierreRechazo | DatosCierreDeclinacion | DatosCierreIndemnizacion;
};

// ============================================
// TIPOS DE CIERRE (Discriminated Unions)
// ============================================

export type DatosCierreRechazo = {
	tipo: "rechazo";
	motivo_rechazo: MotivoRechazo;
	carta_rechazo: DocumentoSiniestro; // Archivo obligatorio
};

export type DatosCierreDeclinacion = {
	tipo: "declinacion";
	motivo_declinacion: MotivoDeclinacion;
	carta_respaldo: DocumentoSiniestro; // Archivo obligatorio
};

export type DatosCierreIndemnizacion = {
	tipo: "indemnizacion";
	archivo_uif: DocumentoSiniestro; // Archivo obligatorio
	archivo_pep: DocumentoSiniestro; // Archivo obligatorio
	monto_reclamado: number;
	moneda_reclamado: Moneda;
	deducible: number;
	moneda_deducible: Moneda;
	monto_pagado: number;
	moneda_pagado: Moneda;
	es_pago_comercial: boolean;
};

// ============================================
// SINIESTRO COMPLETO (desde BD)
// ============================================

export type Siniestro = {
	id: string;
	poliza_id: string;
	codigo_siniestro?: string; // Código correlativo AÑO-00001 (generado automáticamente)

	// Detalles
	fecha_siniestro: string; // Fecha en que ocurrió el siniestro
	fecha_reporte: string; // Fecha de reporte PATRIA
	fecha_reporte_compania: string; // Fecha en que se reportó a la compañía aseguradora
	// NOTA: fecha cuando cliente reportó = created_at (timestamp automático)
	lugar_hecho: string;
	departamento_id: string;
	monto_reserva: number;
	moneda: Moneda;
	descripcion: string;
	contactos: ContactoSiniestro[] | string[]; // Soporta ambos formatos (retrocompatibilidad)

	// Estado
	estado: EstadoSiniestro;
	motivo_cierre_tipo?: MotivoCierreTipo;
	fecha_cierre?: string;
	cerrado_por?: string;

	// Rechazo
	motivo_rechazo?: MotivoRechazo;

	// Declinación
	motivo_declinacion?: MotivoDeclinacion;

	// Indemnización
	monto_reclamado?: number;
	moneda_reclamado?: Moneda;
	deducible?: number;
	moneda_deducible?: Moneda;
	monto_pagado?: number;
	moneda_pagado?: Moneda;
	es_pago_comercial?: boolean;

	fecha_llegada_repuestos?: string;

	// Auditoría
	created_at: string;
	updated_at: string;
	created_by?: string;
	updated_by?: string;
	responsable_id?: string; // Responsable del siniestro (puede ser diferente de created_by)
};

// ============================================
// SINIESTRO VISTA (con datos relacionados)
// ============================================

export type SiniestroVista = Siniestro & {
	// Datos de la póliza
	numero_poliza: string;
	ramo: string;
	poliza_inicio_vigencia: string;
	poliza_fin_vigencia: string;

	// Datos del cliente
	cliente_nombre: string;
	cliente_documento: string;
	cliente_tipo: "natural" | "juridica";

	// Datos de compañía
	compania_nombre: string;
	compania_id: string;

	// Datos de departamento
	departamento_nombre: string;
	departamento_codigo: string;

	// Responsable de la póliza (comercial)
	poliza_responsable_nombre?: string;

	// Responsable del siniestro (NUEVO - usuario asignado al caso)
	responsable_nombre?: string;
	responsable_email?: string;

	// Auditoría
	creado_por_nombre?: string;
	cerrado_por_nombre?: string;
	fecha_creacion: string;

	// Contadores
	total_documentos: number;
	total_observaciones: number;
	total_coberturas: number;
};

// ============================================
// TIPOS PARA LISTADO Y FILTROS
// ============================================

export type FiltrosSiniestros = {
	searchTerm: string;
	estado?: EstadoSiniestro | "todos";
	departamento_id?: string;
	fecha_desde?: string;
	fecha_hasta?: string;
	ramo?: string;
	responsable_id?: string; // Filtro por responsable del siniestro
	compania_id?: string; // Filtro por compañía aseguradora
};

export type SiniestroListItem = {
	id: string;
	codigo_siniestro?: string;
	fecha_siniestro: string;
	numero_poliza: string;
	cliente_nombre: string;
	cliente_documento: string;
	departamento_nombre: string;
	responsable_nombre?: string; // Responsable del siniestro
	estado: EstadoSiniestro;
	monto_reserva: number;
	moneda: string;
	ramo: string;
	compania_nombre: string;
	total_documentos: number;
	lugar_hecho: string;
	created_at: string;
};

// ============================================
// ESTADÍSTICAS DEL DASHBOARD
// ============================================

export type SiniestrosStats = {
	total_abiertos: number;
	total_cerrados_mes: number;
	monto_total_reservado: number; // En Bs (convertido)
	promedio_dias_cierre: number;
	siniestros_por_estado: {
		abierto: number;
		rechazado: number;
		declinado: number;
		concluido: number;
	};
	siniestros_por_ramo: Array<{
		ramo: string;
		cantidad: number;
	}>;
};

// ============================================
// HISTORIAL DE AUDITORÍA
// ============================================

export type HistorialSiniestro = {
	id: string;
	siniestro_id: string;
	accion: string; // 'created', 'updated', 'documento_agregado', 'observacion_agregada', 'cambio_estado', 'estado_cambiado', 'cerrado'
	campo_modificado?: string;
	valor_anterior?: string;
	valor_nuevo?: string; // Para cambio_estado: nombre del nuevo estado
	detalles?: any; // JSONB - información adicional del cambio
	created_at: string;
	created_by?: string;
	usuario_nombre?: string;
};

// ============================================
// TIPOS PARA SERVER ACTIONS
// ============================================

export type ServerResponse<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
	  };

export type GuardarSiniestroResponse = ServerResponse<{
	siniestro_id: string;
}>;

export type ObtenerSiniestrosResponse = ServerResponse<{
	siniestros: SiniestroVistaConEstado[];
	stats: SiniestrosStats;
}>;

export type ObtenerSiniestroDetalleResponse = ServerResponse<{
	siniestro: SiniestroVistaConEstado;
	coberturas: CoberturaCatalogo[];
	documentos: DocumentoSiniestroConUsuario[];
	observaciones: ObservacionSiniestro[];
	historial: HistorialSiniestro[];
}>;

export type AgregarObservacionResponse = ServerResponse<{
	observacion_id: string;
}>;

export type AgregarDocumentosResponse = ServerResponse<{
	documentos_ids: string[];
}>;

export type CerrarSiniestroResponse = ServerResponse<{
	siniestro_id: string;
	estado_final: EstadoSiniestro;
}>;

// ============================================
// VALIDACIONES
// ============================================

export type ValidacionSiniestro = {
	valido: boolean;
	errores: string[];
	advertencias: string[];
};

// ============================================
// BÚSQUEDA DE PÓLIZAS ACTIVAS
// ============================================

export type BusquedaPolizasResponse = ServerResponse<{
	polizas: PolizaParaSiniestro[];
}>;

// ============================================
// COBERTURAS POR RAMO
// ============================================

export type ObtenerCoberturasPorRamoResponse = ServerResponse<{
	coberturas: CoberturaCatalogo[];
}>;

// ============================================
// SOFT DELETE DE DOCUMENTOS
// ============================================

export type DescartarDocumentoResponse = ServerResponse<void>;
export type RestaurarDocumentoResponse = ServerResponse<void>;
export type EliminarDocumentoResponse = ServerResponse<void>;

// ============================================
// GESTIÓN DE RESPONSABLES
// ============================================

export type UsuarioResponsable = {
	id: string;
	full_name: string;
	email: string;
	role: string;
};

export type ObtenerUsuariosResponsablesResponse = ServerResponse<{
	usuarios: UsuarioResponsable[];
}>;

// ============================================
// SISTEMA DE ESTADOS (NUEVO)
// ============================================

export type EstadoSiniestroCatalogo = {
	id: string;
	codigo: string;
	nombre: string;
	descripcion?: string;
	orden: number;
	activo: boolean;
	created_at?: string;
};

export type EstadoSiniestroHistorial = {
	id: string;
	siniestro_id: string;
	estado_id: string;
	observacion?: string;
	created_by?: string;
	created_at: string;
};

export type EstadoSiniestroHistorialConUsuario = EstadoSiniestroHistorial & {
	estado: EstadoSiniestroCatalogo;
	usuario_nombre?: string;
};

export type EstadoActualSiniestro = {
	estado_actual_id?: string;
	estado_actual_nombre?: string;
	estado_actual_codigo?: string;
	estado_actual_fecha?: string;
	estado_actual_observacion?: string;
};

// Siniestro con flag de atención (sin actualizaciones en 10+ días)
export type SiniestroConEstado = Siniestro & EstadoActualSiniestro & {
	requiere_atencion: boolean;
};

export type SiniestroVistaConEstado = SiniestroVista & EstadoActualSiniestro & {
	requiere_atencion: boolean;
};

// ============================================
// CONTACTO PARA WHATSAPP (NUEVO)
// ============================================

export type ContactoClienteSiniestro = {
	nombre_completo: string;
	documento?: string | null; // CI o NIT del cliente
	telefono?: string | null;
	celular?: string | null;
	correo?: string | null;
};

// ============================================
// DOCUMENTOS AGRUPADOS POR TIPO (NUEVO)
// ============================================

export type DocumentosAgrupadosPorTipo = {
	[K in TipoDocumentoSiniestro]: DocumentoSiniestroConUsuario[];
};

// ============================================
// RESPUESTAS DE SERVER ACTIONS PARA ESTADOS (NUEVO)
// ============================================

export type ObtenerEstadosCatalogoResponse = ServerResponse<{
	estados: EstadoSiniestroCatalogo[];
}>;

export type ObtenerHistorialEstadosResponse = ServerResponse<{
	historial: EstadoSiniestroHistorialConUsuario[];
}>;

export type CambiarEstadoSiniestroResponse = ServerResponse<{
	estado: EstadoSiniestroHistorial;
	whatsapp?: {
		url: string;
		mensaje: string;
		contacto: ContactoClienteSiniestro;
		estado_anterior: string;
		estado_nuevo: string;
	};
}>;

// ============================================
// RESPUESTAS DE SERVER ACTIONS PARA WHATSAPP (NUEVO)
// ============================================

export type EnviarWhatsAppSiniestroResponse = ServerResponse<{
	url: string; // URL de WhatsApp generada
}>;

export type ObtenerContactoParaWhatsAppResponse = ServerResponse<{
	contacto: ContactoClienteSiniestro;
}>;

export type CambiarResponsableResponse = ServerResponse<void>;
