// types/pdf.ts - Tipos específicos para generación de PDFs

import { ProcessedInsuranceRecord } from "./insurance";

// NUEVO: Interfaz para los detalles del vehículo
export interface VehicleForLetter {
	id: string; // ID único para el vehículo, útil para React keys
	description: string;
	declaredValue: number;
	insuredValue: number;
}

export interface LetterData {
	id: string;
	sourceRecordIds: string[];
	templateType: "salud" | "general" | "automotor";
	referenceNumber: string;
	date: string;
	client: {
		name: string;
		phone?: string;
		email?: string;
		address?: string;
	};
	policies: PolicyForLetter[];
	executive: string;
	needsReview: boolean;
	missingData: string[];
	additionalConditions?: string;
}

export interface PolicyForLetter {
	expiryDate: string;
	policyNumber: string;
	company: string;
	branch: string;
	insuredMembers?: string[]; // Para pólizas de salud
	manualFields?: {
		// Campos para Pólizas de Automotores
		vehicles?: VehicleForLetter[];
		originalVehicles?: VehicleForLetter[];
		premium?: number;
		premiumCurrency?: "Bs." | "$us.";

		// Campos para Pólizas de Salud
		insuredMembers?: string[];
		originalInsuredMembers?: string[];
		renewalPremium?: number;
		renewalPremiumCurrency?: "Bs." | "$us.";

		// NUEVO: Campos para Pólizas Generales
		insuredMatter?: string;
		originalInsuredMatter?: string;

		// Campos comunes
		specificConditions?: string;
		deductibles?: number;
		deductiblesCurrency?: "Bs." | "$us.";
		territoriality?: number;
		territorialityCurrency?: "Bs." | "$us.";
		originalPremium?: number;
		coinsurance?: string;
	};
}

export interface PDFGenerationOptions {
	selectedRecords: ProcessedInsuranceRecord[];
	groupByClient: boolean;
	generateZip: boolean;
	previewMode: boolean;
}

export interface GeneratedLetter {
	letterId: string;
	sourceRecordIds: string[];
	clientName: string;
	clientPhone?: string;
	clientEmail?: string;
	templateType: "salud" | "general" | "automotor";
	fileName: string;
	pdfBlob?: Blob;
	policyCount: number;
	needsReview: boolean;
	missingData: string[];
}

export interface PDFGenerationResult {
	success: boolean;
	letters: GeneratedLetter[];
	errors: string[];
	totalGenerated: number;
}
