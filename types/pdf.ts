// types/pdf.ts - Tipos específicos para generación de PDFs

import { ProcessedInsuranceRecord } from "./insurance";

// NUEVO: Interfaz para los detalles del vehículo
export interface VehicleForLetter {
	id: string; // ID único para el vehículo, útil para React keys
	description: string;
	insuredValue: number;
	currency: "Bs." | "$us."; // Currency for this specific vehicle
	originalInsuredValue?: number; // Original value from Excel data
	originalCurrency?: "Bs." | "$us."; // Original currency from Excel data
}

// Interfaz para items asegurados en incendios
export interface InsuredPlaceForLetter {
	id: string; // ID único para el lugar asegurado
	description: string; // Descripción del lugar
	insuredValue: number;
	currency: "Bs." | "$us.";
	originalInsuredValue?: number; // Original value from Excel data
	originalCurrency?: "Bs." | "$us."; // Original currency from Excel data
}

// Tipos de beneficiarios para seguros de salud
export type BeneficiaryType = "titular" | "conyugue" | "dependiente";

// Interfaz para asegurado con tipo de beneficiario
export interface InsuredMemberWithType {
	id: string; // ID único para React keys
	name: string;
	beneficiaryType: BeneficiaryType;
}

export interface LetterData {
	id: string;
	sourceRecordIds: string[];
	templateType: "salud" | "accidentes" | "incendios" | "general" | "automotor";
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
	originalExecutive?: string; // Original executive from Excel data
	needsReview: boolean;
	missingData: string[];
	additionalConditions?: string;
}

export interface PolicyForLetter {
	expiryDate: string;
	policyNumber: string;
	company: string;
	branch: string;
	insuredMembers?: string[]; // Para pólizas de salud (legacy)
	insuredMembersWithType?: InsuredMemberWithType[]; // Para pólizas de salud con tipos de beneficiario
	manualFields?: {
		// Campos para Pólizas de Automotores
		vehicles?: VehicleForLetter[];
		originalVehicles?: VehicleForLetter[];

		// Campos para Pólizas de Salud
		insuredMembers?: string[];
		originalInsuredMembers?: string[];
		insuredMembersWithType?: InsuredMemberWithType[];
		originalInsuredMembersWithType?: InsuredMemberWithType[];
		insuredValue?: number;
		insuredValueCurrency?: "Bs." | "$us.";
		originalInsuredValue?: number; // Original total value from Excel file
		originalInsuredValueCurrency?: "Bs." | "$us."; // Currency from Excel file

		// NUEVO: Campos para Pólizas Generales
		insuredMatter?: string;
		originalInsuredMatter?: string;

		// NUEVO: Campos para Pólizas de Incendios
		insuredPlaces?: InsuredPlaceForLetter[];
		originalInsuredPlaces?: InsuredPlaceForLetter[];
		riskLocation?: string; // Ubicación de riesgo
		originalRiskLocation?: string;
		activity?: string; // Actividad
		originalActivity?: string;

		// NUEVO: Campos para Ramo editable
		branch?: string; // Manually edited ramo name
		originalBranch?: string; // Original ramo from Excel/PUC mapping

		// NUEVO: Campos para Producto editable
		producto?: string; // Manually edited producto name
		originalProducto?: string; // Original producto from Excel

		// Campos comunes
		specificConditions?: string;
		deductibles?: string;
		deductiblesCurrency?: "Bs." | "$us.";
		territoriality?: number;
		territorialityCurrency?: "Bs." | "$us.";
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
	templateType: "salud" | "accidentes" | "incendios" | "general" | "automotor";
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

export const excecutives = [
	{
		user: "patriasamaestro",
		name: "Diego Gandarillas Ferrufino",
		glyph: "DGF",
		charge: "Analista de sistemas",
		telf: "69005037",
		mail: "patriasamaestro@gmail.com",
		signature: "/images/firma_diego.png",
	},
	{
		user: "Tamara",
		name: "Tamara Torrez Dencker",
		glyph: "TTD",
		charge: "Ejecutiva de Cuentas",
		telf: "77342938",
		mail: "tamara.torrez@patria-sa.com",
		signature: "/images/firma_tamara.png",
	},
	{
		user: "Eliana",
		name: "Eliana Ortiz Chávez",
		glyph: "EOC",
		charge: "Ejecutiva de Cuentas",
		telf: "76031710",
		mail: "comercial1@patria-sa.com",
		signature: "/images/firma_eliana.png",
	},
	{
		user: "Carmen",
		name: "Carmen Ferrufino Howard",
		glyph: "CFH",
		charge: "Ejecutiva de Cuentas Especiales",
		telf: "69050289",
		mail: "cferrufino@patria-sa.com",
		signature: "/images/firma_carmen.png",
	},
	{
		user: "Patricia",
		name: "Patricia Osuna Banegas",
		glyph: "POB",
		charge: "Subgerente Técnico",
		telf: "77602062",
		mail: "patricia.osuna@patria-sa.com",
		signature: "/images/firma_patricia.png",
	},
	{
		user: "Ercilia",
		name: "Maria Ercilia Vargas Becerra",
		glyph: "MEV",
		charge: "Jefe de Producción",
		telf: "78006016",
		mail: "maria.vargas@patria-sa.com",
		signature: "/images/firma_ercilia.png",
	},
	{
		user: "Flavio",
		name: "Flavio Colombo Vargas",
		glyph: "FCV",
		charge: "Gerente Comercial",
		telf: "62243775",
		mail: "flavio.colombo@patria-sa.com",
		signature: "/images/firma_flavio.png",
	},
	{
		user: "Marco",
		name: "Marco A. Eid Aramayo",
		glyph: "MAE",
		charge: "Gerente Regional",
		telf: "75672652",
		mail: "marco.eid@patria-sa.com",
		signature: "/images/firma_marco.png",
	},
	{
		user: "Roxana",
		name: "Roxana Chavez Paz",
		glyph: "RCP",
		charge: "Directora Comercial",
		telf: "78463787",
		mail: "roxana.chavez@patria-sa.com",
		signature: "/images/firma_roxana.png",
	},
	{
		user: "Veronica",
		name: "Veronica Martinez Cespedes",
		glyph: "VMC",
		charge: "Asesor Comercial",
		telf: "68563888",
		mail: "vmartinez@patria-sa.com",
		signature: "/images/firma_veronica.png",
	},
	{
		user: "Alcides",
		name: "Alcides Gutiérrez Rodríguez",
		glyph: "APM",
		charge: "Asesor Comercial",
		telf: "76000610",
		mail: "asistente.comercial@patria-sa.com",
		signature: "/images/firma_alcides.png",
	},
];
