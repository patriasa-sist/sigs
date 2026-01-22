// utils/validationConstants.ts
// Constantes centralizadas para validaciones
// Este archivo es la única fuente de verdad para reglas de validación del sistema

/**
 * Reglas de validación para vehículos automotor
 */
export const VEHICULO_RULES = {
	// Año del vehículo
	ANO_MIN: 1950,
	ANO_MAX: 2050,

	// Coaseguro (porcentaje)
	COASEGURO_MIN: 0,
	COASEGURO_MAX: 100,

	// Franquicias disponibles (en Bolivianos)
	FRANQUICIAS_DISPONIBLES: [700, 1000, 1400] as const,

	// Departamentos de Bolivia para plaza de circulación
	DEPARTAMENTOS_BOLIVIA: [
		"La Paz",
		"Cochabamba",
		"Santa Cruz",
		"Oruro",
		"Potosí",
		"Tarija",
		"Chuquisaca",
		"Beni",
		"Pando",
	] as const,

	// Uso del vehículo
	TIPOS_USO: ["publico", "particular"] as const,
} as const;

/**
 * Reglas de validación para pólizas
 */
export const POLIZA_RULES = {
	// Grupos de producción
	GRUPOS_PRODUCCION: ["generales", "personales"] as const,

	// Monedas disponibles
	MONEDAS: ["Bs", "USD", "USDT", "UFV"] as const,

	// Estados de póliza
	ESTADOS: ["pendiente", "activa", "vencida", "cancelada", "renovada"] as const,

	// Modalidades de pago
	MODALIDADES_PAGO: ["contado", "credito"] as const,

	// Límites de cuotas
	CUOTAS_MIN: 1,
	CUOTAS_MAX: 12, // Cambiado de 24 a 12

	// Periodos de pago para crédito
	PERIODOS_PAGO: ["mensual", "trimestral", "semestral"] as const,
} as const;

/**
 * Reglas de validación para pagos
 */
export const PAGO_RULES = {
	// Cálculos automáticos (LEGACY - usar PRODUCTO_RULES para nuevas pólizas)
	PORCENTAJE_PRIMA_NETA: 0.87, // 87% de la prima total
	PORCENTAJE_COMISION: 0.02, // 2% de la prima neta

	// Límites
	MONTO_MIN: 0,
} as const;

/**
 * Reglas de validación para productos de aseguradoras
 * Valores por defecto cuando se crea un nuevo producto
 */
export const PRODUCTO_RULES = {
	// Factores por defecto para cálculo de prima neta
	// Fórmula: prima_neta = prima_total / (factor/100 + 1)
	FACTOR_CONTADO_DEFAULT: 35,
	FACTOR_CREDITO_DEFAULT: 40,

	// Porcentaje de comisión por defecto (15%)
	PORCENTAJE_COMISION_DEFAULT: 0.15,

	// Porcentaje de comisión usuario por defecto (50%)
	PORCENTAJE_COMISION_USUARIO_DEFAULT: 0.5,
} as const;

/**
 * Reglas de validación para documentos
 */
export const DOCUMENTO_RULES = {
	// Tipos de archivo permitidos
	TIPOS_PERMITIDOS: [
		"application/pdf",
		"image/jpeg",
		"image/jpg",
		"image/png",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-outlook", // .msg
		"message/rfc822", // .eml
	] as const,

	// Extensiones permitidas
	EXTENSIONES_PERMITIDAS: [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".msg", ".eml"] as const,

	// Tamaño máximo por archivo (en bytes)
	TAMANO_MAX_BYTES: 20 * 1024 * 1024, // 20 MB (aumentado de 10 MB)

	// Estados de documento
	ESTADOS: ["activo", "descartado"] as const,

	// Tipos de documento
	TIPOS_DOCUMENTO: [
		"Póliza firmada",
		"Comprobante de envio de poliza (correo)",
		"Plan de pago BROKER",
		"plan de pago CLIENTE",
		"Anexos",
		"Condicionado general",
		"Otro",
	] as const,
} as const;

/**
 * Reglas de validación para usuarios
 */
export const USUARIO_RULES = {
	// Roles disponibles
	ROLES: ["admin", "comercial", "usuario"] as const,

	// Estados de usuario
	ESTADOS: ["active", "inactive", "suspended"] as const,
} as const;

/**
 * Reglas de validación para clientes
 */
export const CLIENTE_RULES = {
	// Tipos de cliente
	TIPOS: ["natural", "juridica"] as const,

	// Tipos de documento
	TIPOS_DOCUMENTO: ["CI", "NIT", "Pasaporte", "RUC"] as const,

	// Estados de cliente
	ESTADOS: ["active", "inactive", "suspended"] as const,
} as const;

/**
 * Formatos de fecha y número para Bolivia
 */
export const FORMATOS_BOLIVIA = {
	// Locale para formateo
	LOCALE: "es-BO",

	// Opciones de formateo para números con 2 decimales
	NUMERO_DECIMAL_OPTIONS: {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	},

	// Opciones de formateo para moneda
	MONEDA_OPTIONS: {
		style: "currency",
		currency: "BOB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	},
} as const;

/**
 * Mensajes de validación estandarizados
 */
export const VALIDATION_MESSAGES = {
	CAMPO_REQUERIDO: "Este campo es requerido",
	VALOR_INVALIDO: "Valor inválido",
	RANGO_INVALIDO: (min: number, max: number) => `Debe estar entre ${min} y ${max}`,
	NUMERO_INVALIDO: "Debe ser un número válido",
	FECHA_INVALIDA: "Fecha inválida",
	EMAIL_INVALIDO: "Email inválido",
	ARCHIVO_GRANDE: (maxMB: number) => `El archivo no debe superar ${maxMB}MB`,
	TIPO_ARCHIVO_INVALIDO: "Tipo de archivo no permitido",
} as const;

// Tipos TypeScript derivados de las constantes (para type safety)
export type GrupoProduccion = (typeof POLIZA_RULES.GRUPOS_PRODUCCION)[number];
export type Moneda = (typeof POLIZA_RULES.MONEDAS)[number];
export type EstadoPoliza = (typeof POLIZA_RULES.ESTADOS)[number];
export type PeriodoPago = (typeof POLIZA_RULES.PERIODOS_PAGO)[number];
export type TipoUsoVehiculo = (typeof VEHICULO_RULES.TIPOS_USO)[number];
export type RolUsuario = (typeof USUARIO_RULES.ROLES)[number];
export type TipoCliente = (typeof CLIENTE_RULES.TIPOS)[number];
export type EstadoDocumento = (typeof DOCUMENTO_RULES.ESTADOS)[number];
