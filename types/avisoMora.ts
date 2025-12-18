// types/avisoMora.ts - Type definitions for Aviso de Mora PDF generation

import type { PolizaConPagos, ContactoCliente, CuotaVencidaConMora, Moneda } from "./cobranza";

/**
 * Datos completos para generar PDF de aviso de mora
 * Usado por AvisoMoraTemplate component
 */
export type AvisoMoraPDFData = {
	// Información del documento
	numero_referencia: string; // Formato: AM-YYYYMMDD-XXXXX
	fecha_generacion: string; // Formato legible: "18 de diciembre de 2025"
	fecha_emision_iso: string; // ISO string para cálculos

	// Información de la póliza
	poliza: {
		numero_poliza: string;
		ramo: string;
		compania_aseguradora: string;
		inicio_vigencia: string; // Formato legible
		fin_vigencia: string; // Formato legible
		prima_total: number;
		moneda: Moneda;
	};

	// Información del cliente
	cliente: {
		nombre_completo: string;
		documento: string; // CI o NIT
		telefono: string | null;
		celular: string | null;
		correo: string | null;
	};

	// Cuotas vencidas con detalle de mora
	cuotas_vencidas: CuotaDetalleMora[];

	// Totales calculados
	totales: {
		total_adeudado: number;
		cantidad_cuotas_vencidas: number;
		dias_mora_promedio: number;
		dias_mora_maxima: number;
	};

	// Información del responsable
	responsable: {
		nombre: string;
		regional?: string;
	};
};

/**
 * Detalle de cuota vencida para el PDF
 */
export type CuotaDetalleMora = {
	numero_cuota: number;
	monto: number;
	fecha_vencimiento: string; // Formato legible
	fecha_vencimiento_iso: string; // ISO string
	dias_mora: number;
	estado: "vencido" | "parcial"; // Solo cuotas vencidas y parciales
	monto_pendiente?: number; // Para cuotas parciales
};

/**
 * Configuración de estilos para el PDF
 */
export type AvisoMoraStyleConfig = {
	colorPrimario: string; // Color principal (rojo para urgencia)
	colorSecundario: string; // Color secundario
	colorFondo: string; // Color de fondo
	fontSize: {
		titulo: number;
		subtitulo: number;
		cuerpo: number;
		pequeno: number;
	};
};

/**
 * Opciones para generar el PDF
 */
export type GenerarAvisoMoraOptions = {
	incluir_logo: boolean;
	incluir_firma: boolean;
	incluir_instrucciones_pago: boolean;
	estilo?: Partial<AvisoMoraStyleConfig>;
};
