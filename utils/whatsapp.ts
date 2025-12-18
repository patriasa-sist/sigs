// utils/whatsapp.ts - Utilidades para la integración con WhatsApp

import { LetterData } from "@/types/pdf";
import { findExecutiveByName, getDefaultExecutive } from "@/utils/executiveHelper";

/**
 * Limpia y formatea un número de teléfono para usarlo con la API de WhatsApp.
 * Asume el código de país de Bolivia (591).
 * @param phone - El número de teléfono a limpiar.
 * @returns El número limpio y formateado.
 */
export function cleanPhoneNumber(phone: string): string {
	// Eliminar todos los caracteres que no sean dígitos
	let cleaned = phone.replace(/\D/g, "");

	// Si el número tiene 8 dígitos (longitud estándar en Bolivia), se asume que falta el código de país.
	if (cleaned.length === 8) {
		cleaned = `591${cleaned}`;
	}

	// Si tiene el prefijo de Bolivia duplicado (ej. 591591... a veces pasa por errores de tipeo)
	if (cleaned.startsWith("591591") && cleaned.length > 11) {
		cleaned = cleaned.substring(3);
	}

	return cleaned;
}

/**
 * Genera el mensaje predefinido para WhatsApp.
 * @param letterData - Los datos de la carta para personalizar el mensaje.
 * @returns El mensaje de saludo codificado para URL.
 */
export function createWhatsAppMessage(letterData: LetterData): string {
	const clientName = letterData.client.name;

	// Use fallback mechanism similar to ExecutiveFooter component
	const executive = findExecutiveByName(letterData.executive) || getDefaultExecutive();
	const executiveName = executive.name;

	const message = `Estimado(a) ${clientName},
Le saluda ${executiveName} de Patria S.A. Corredores de Seguros.
Le hacemos llegar un recordatorio sobre el próximo vencimiento de su póliza de seguro.

Adjuntamos la carta formal para su referencia y quedamos a su disposición para cualquier consulta.
Saludos cordiales.`;

	return encodeURIComponent(message);
}

/**
 * Genera la URL completa de WhatsApp Web con número y mensaje.
 * @param phoneNumber - El número de teléfono del destinatario.
 * @param message - El mensaje a enviar (será codificado automáticamente).
 * @returns La URL completa para abrir WhatsApp Web.
 */
export function generarURLWhatsApp(phoneNumber: string, message: string): string {
	const cleanedNumber = cleanPhoneNumber(phoneNumber);
	const encodedMessage = encodeURIComponent(message);
	return `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
}
