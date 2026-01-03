// utils/cobranza.ts - Utility functions for Cobranzas module

import React from "react";
import { pdf } from "@react-pdf/renderer";
import type { CuotaPago, PolizaConPagos, ContactoCliente, Moneda, AvisoMoraData } from "@/types/cobranza";
import { cleanPhoneNumber } from "./whatsapp";

/**
 * MEJORA #7: Genera mensaje cordial de recordatorio de pago para WhatsApp o Email
 */
export function generarMensajeRecordatorio(cuota: CuotaPago, poliza: PolizaConPagos, clienteNombre: string): string {
	const formatCurrency = (amount: number, moneda: Moneda) => {
		return `${moneda} ${new Intl.NumberFormat("es-BO", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount)}`;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	};

	const mensaje = `Estimado/a ${clienteNombre},

Nos comunicamos con usted para recordarle el vencimiento de la cuota N° ${cuota.numero_cuota} de su póliza ${
		poliza.numero_poliza
	}.

Monto: ${formatCurrency(cuota.monto, poliza.moneda)}
Fecha de vencimiento: ${formatDate(cuota.fecha_vencimiento)}
Estado: ${cuota.estado === "vencido" ? "VENCIDA" : cuota.estado === "pendiente" ? "Por vencer" : "Pago parcial"}

Por favor, realice el pago a la brevedad posible para mantener su cobertura activa.

Para cualquier consulta, no dude en contactarnos.

Atentamente,
Patria S.A.`;

	return mensaje;
}

/**
 * Genera mensaje de WhatsApp con recordatorio de pago
 * Abre WhatsApp Web con el mensaje pre-cargado
 */
export function enviarRecordatorioWhatsApp(
	cuota: CuotaPago,
	poliza: PolizaConPagos,
	contacto: ContactoCliente,
	clienteNombre: string
): void {
	// Determine which phone number to use (priority: celular > telefono)
	const numeroTelefono = contacto.celular || contacto.telefono;

	if (!numeroTelefono) {
		alert("No se encontró número de teléfono para este cliente");
		return;
	}

	// Clean phone number
	const numeroLimpio = cleanPhoneNumber(numeroTelefono);

	// Generate message
	const mensaje = generarMensajeRecordatorio(cuota, poliza, clienteNombre);

	// Encode message for URL
	const mensajeCodificado = encodeURIComponent(mensaje);

	// Open WhatsApp Web
	const url = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
	window.open(url, "_blank");
}

/**
 * Genera enlace mailto para recordatorio por correo
 * Abre el cliente de correo con el mensaje pre-cargado
 */
export function enviarRecordatorioEmail(
	cuota: CuotaPago,
	poliza: PolizaConPagos,
	contacto: ContactoCliente,
	clienteNombre: string
): void {
	if (!contacto.correo) {
		alert("No se encontró correo electrónico para este cliente");
		return;
	}

	// Generate message
	const mensaje = generarMensajeRecordatorio(cuota, poliza, clienteNombre);

	// Create subject
	const asunto = `Recordatorio de pago - Póliza ${poliza.numero_poliza} - Cuota ${cuota.numero_cuota}`;

	// Encode for mailto
	const asuntoCodificado = encodeURIComponent(asunto);
	const mensajeCodificado = encodeURIComponent(mensaje);

	// Open email client
	const mailtoUrl = `mailto:${contacto.correo}?subject=${asuntoCodificado}&body=${mensajeCodificado}`;
	window.location.href = mailtoUrl;
}

/**
 * Calcula días de mora para una cuota
 */
export function calcularDiasMora(fechaVencimiento: string): number {
	const hoy = new Date();
	const vencimiento = new Date(fechaVencimiento);

	// Reset hours to compare dates only
	hoy.setHours(0, 0, 0, 0);
	vencimiento.setHours(0, 0, 0, 0);

	const diferenciaMilisegundos = hoy.getTime() - vencimiento.getTime();
	const diasMora = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

	return Math.max(0, diasMora);
}

/**
 * Formatea monto con moneda para visualización
 */
export function formatearMonto(monto: number, moneda: Moneda): string {
	const montoFormateado = new Intl.NumberFormat("es-BO", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(monto);

	return `${moneda} ${montoFormateado}`;
}

/**
 * Formatea fecha a formato legible en español
 */
export function formatearFecha(fechaISO: string, formato: "corto" | "largo" = "corto"): string {
	const fecha = new Date(fechaISO);

	if (formato === "largo") {
		return fecha.toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	}

	return fecha.toLocaleDateString("es-BO", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Valida tamaño de archivo para comprobantes
 */
export function validarTamanoArchivo(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
	const maxSizeBytes = maxSizeMB * 1024 * 1024;

	if (file.size > maxSizeBytes) {
		return {
			valid: false,
			error: `El archivo excede el tamaño máximo de ${maxSizeMB}MB`,
		};
	}

	return { valid: true };
}

/**
 * Valida tipo de archivo para comprobantes
 */
export function validarTipoArchivo(file: File): { valid: boolean; error?: string } {
	const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

	if (!allowedTypes.includes(file.type)) {
		return {
			valid: false,
			error: "Tipo de archivo no permitido. Use JPG, PNG, WebP o PDF",
		};
	}

	return { valid: true };
}

/**
 * Formatea tamaño de archivo para visualización
 */
export function formatearTamanoArchivo(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Genera número de referencia para aviso de mora
 * Formato: AM-YYYYMMDD-XXXXX
 */
export function generarNumeroReferenciaAvisoMora(numeroPoliza: string): string {
	const hoy = new Date();
	const fecha = hoy.toISOString().split("T")[0].replace(/-/g, "");
	return `AM-${fecha}-${numeroPoliza}`;
}

/**
 * Determina color de badge según estado de cuota
 */
export function getColorEstadoCuota(estado: string): {
	background: string;
	text: string;
	border: string;
} {
	switch (estado) {
		case "pendiente":
			return {
				background: "bg-yellow-50",
				text: "text-yellow-700",
				border: "border-yellow-200",
			};
		case "vencido":
			return {
				background: "bg-red-50",
				text: "text-red-700",
				border: "border-red-200",
			};
		case "parcial":
			return {
				background: "bg-orange-50",
				text: "text-orange-700",
				border: "border-orange-200",
			};
		case "pagado":
			return {
				background: "bg-green-50",
				text: "text-green-700",
				border: "border-green-200",
			};
		default:
			return {
				background: "bg-gray-50",
				text: "text-gray-700",
				border: "border-gray-200",
			};
	}
}

/**
 * Determina si una cuota puede ser prorrogada
 */
export function puedeProrrogar(estado: string): boolean {
	return estado === "pendiente" || estado === "vencido" || estado === "parcial";
}

/**
 * Determina si una cuota puede recibir pago
 */
export function puedeRegistrarPago(estado: string): boolean {
	return estado === "pendiente" || estado === "vencido" || estado === "parcial";
}

/**
 * Genera y descarga el PDF del Aviso de Mora
 * Utiliza el template AvisoMoraTemplate consistente con las cartas de vencimiento
 */
export async function generarYDescargarAvisoMoraPDF(avisoData: AvisoMoraData): Promise<void> {
	// Dynamic import to avoid bundling in server components
	const { AvisoMoraTemplate } = await import("@/components/cobranzas/PDFGeneration/AvisoMoraTemplate");

	// Generate PDF blob
	const pdfBlob = await pdf(<AvisoMoraTemplate avisoData={avisoData} />).toBlob();

	// Generate filename
	const fileName = `Aviso_Mora_${avisoData.poliza.numero_poliza}_${avisoData.numero_referencia}.pdf`;

	// Download blob
	const url = URL.createObjectURL(pdfBlob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
