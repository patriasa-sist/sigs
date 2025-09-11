// utils/pdfUtils.ts - Utilidades para generación de PDFs

import { ProcessedInsuranceRecord } from "@/types/insurance";
import { LetterData, PolicyForLetter, VehicleForLetter } from "@/types/pdf";

// Constantes para los textos de plantilla
const HEALTH_CONDITIONS_TEMPLATE = `Le informamos que a partir del *01/05/2025*, se excluye la cobertura del certificado asistencia al viajero y las pólizas se emiten en moneda nacional (BS)`;
const AUTOMOTOR_CONDITIONS_TEMPLATE = `A partir del *01/12/2024* se aplica :\n-Deducible coaseguro: 10% del valor del siniestro mínimo Bs 1.000 aplicable para las coberturas de Daños Propios, Conmoción Civil, Huelgas, Daño Malicioso, Sabotaje, Vandalismo y Terrorismo.\n-Extraterritorialidad: PAGO DE EXTRA PRIMA DE BS 400 (CONTADO) SI ES SOLICITADO EN LA RENOVACION DE LA POLIZA, POSTERIOR A LA RENOVACION DE LA POLIZA, EXTRA PRIMA DE BS 500.-\n“ La suscripción de los seguros seguro es Bs y considerando que en los últimos meses se ha observado un incremento significativo en el valor de mercado de los bienes en general en nuestro país, solicitamos la revisión del valor asegurado de su vehículo. La finalidad de esta actualización es garantizar una protección correcta de su patrimonio y acorde al valor real actual de los bien asegurado, con el fin de evitar la aplicación de infraseguro en caso de siniestro, como se encuentra establecido en el Código de Comercio, Art.1056.”`;
const GENERAL_CONDITIONS_TEMPLATE = ``;

export const PDF_CONSTANTS = {
	TEMPLATES: {
		SALUD: "salud",
		GENERAL: "general",
		AUTOMOTOR: "automotor",
	},
	PAGE_SIZE: "letter" as const,
	MARGINS: {
		top: 60,
		bottom: 60,
		left: 60,
		right: 60,
	},
	COLORS: {
		patriaBlue: "#172554",
		patriaGreen: "#16a34a",
		textPrimary: "#1f2937",
		textSecondary: "#6b7280",
		border: "#e5e7eb",
	},
	FONTS: {
		primary: "Cambria",
		bold: "Cambria-Bold",
		italic: "Cambria-Italic",
		size: {
			title: 14,
			header: 12,
			body: 10,
			small: 8,
		},
	},
} as const;

/**
 * Determina qué template usar basado en el RAMO
 */
export function determineTemplateType(ramo: string): "salud" | "automotor" | "general" {
	const ramoLower = ramo.toLowerCase();
	const saludKeywords = ["salud", "vida", "medic", "asistencia medica"];
	if (saludKeywords.some((keyword) => ramoLower.includes(keyword))) {
		return "salud";
	}
	const automotorKeywords = ["automotor", "aut"];
	if (automotorKeywords.some((keyword) => ramoLower.includes(keyword))) {
		return "automotor";
	}
	return "general";
}

/**
 * Agrupa registros por cliente y tipo de template.
 */
export function groupRecordsForLetters(records: ProcessedInsuranceRecord[]): LetterData[] {
	const groups: Record<string, ProcessedInsuranceRecord[]> = {};

	records.forEach((record) => {
		const templateType = determineTemplateType(record.ramo);
		const key = `${record.asegurado.trim().toUpperCase()}_${templateType}`;
		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(record);
	});

	return Object.entries(groups).map(([key, groupRecords], index) => {
		const firstRecord = groupRecords[0];
		const templateType = determineTemplateType(firstRecord.ramo);
		let policies: PolicyForLetter[] = [];
		const sourceRecordIds = groupRecords.map((r) => r.id!).filter((id) => id);

		const policyGroups: Record<string, ProcessedInsuranceRecord[]> = {};
		groupRecords.forEach((record) => {
			const policyKey = record.noPoliza.trim().toUpperCase();
			if (!policyGroups[policyKey]) {
				policyGroups[policyKey] = [];
			}
			policyGroups[policyKey].push(record);
		});

		Object.values(policyGroups).forEach((policyGroup) => {
			const mainRecord = policyGroup[0];
			const basePolicy: Omit<PolicyForLetter, "manualFields"> = {
				expiryDate: formatDate(new Date(mainRecord.finDeVigencia)),
				policyNumber: mainRecord.noPoliza,
				company: mainRecord.compania,
				branch: mainRecord.ramo,
			};

			let manualFields: PolicyForLetter["manualFields"] = {
				deductiblesCurrency: "Bs.",
				territorialityCurrency: "Bs.",
			};

			if (templateType === "salud") {
				const insuredMembers = [...new Set(policyGroup.map((r) => r.materiaAsegurada?.trim()).filter((name): name is string => !!name && name.toUpperCase() !== "TITULAR"))];
				const titular = mainRecord.asegurado.trim();
				const titularIndex = insuredMembers.findIndex((m) => m.toUpperCase() === titular.toUpperCase());
				if (titularIndex > -1) {
					insuredMembers.splice(titularIndex, 1);
				}
				insuredMembers.unshift(titular);
				// Use the insured value from the first record of this policy group
				const insuredValue = mainRecord.valorAsegurado || 0;
				manualFields = {
					...manualFields,
					insuredMembers: [...insuredMembers],
					originalInsuredMembers: [...insuredMembers],
					insuredValue: insuredValue,
					insuredValueCurrency: "Bs.",
				};
			} else if (templateType === "automotor") {
				const vehicles: VehicleForLetter[] = policyGroup.map((r, i) => ({
					id: `vehicle_${r.id || i}`,
					description: r.materiaAsegurada || "Vehículo sin descripción",
					insuredValue: r.valorAsegurado || 0,
				}));
				// Calculate total insured value from all vehicles
				const totalInsuredValue = vehicles.reduce((sum, vehicle) => sum + vehicle.insuredValue, 0);
				manualFields = {
					...manualFields,
					vehicles: vehicles,
					originalVehicles: JSON.parse(JSON.stringify(vehicles)),
					insuredValue: totalInsuredValue,
					insuredValueCurrency: "$us.",
				};
			} else {
				// 'general'
				const insuredMatter = policyGroup
					.map((r) => r.materiaAsegurada)
					.filter(Boolean)
					.join(", ");
				// Use the insured value from the first record
				const insuredValue = mainRecord.valorAsegurado || 0;
				manualFields = {
					...manualFields,
					insuredMatter: insuredMatter,
					originalInsuredMatter: insuredMatter,
					insuredValue: insuredValue,
					insuredValueCurrency: "Bs.",
				};
			}
			policies.push({ ...basePolicy, manualFields });
		});

		const letterDataBase = {
			id: `letter_${Date.now()}_${index}`,
			sourceRecordIds,
			templateType,
			referenceNumber: generateReferenceNumber(),
			date: formatDate(new Date()),
			client: {
				name: firstRecord.asegurado,
				phone: firstRecord.telefono,
				email: firstRecord.correoODireccion,
				address: "",
			},
			policies,
			executive: firstRecord.ejecutivo,
			additionalConditions: (() => {
				switch (templateType) {
					case "salud":
						return HEALTH_CONDITIONS_TEMPLATE;
					case "automotor":
						return AUTOMOTOR_CONDITIONS_TEMPLATE;
					default:
						return GENERAL_CONDITIONS_TEMPLATE;
				}
			})(),
		};

		const missingData = detectMissingData(letterDataBase);

		return {
			...letterDataBase,
			needsReview: missingData.length > 0 || templateType === "automotor" || templateType === "general",
			missingData,
		};
	});
}

/**
 * Detecta datos faltantes que requieren intervención manual
 */
export function detectMissingData(letterData: Omit<LetterData, "needsReview" | "missingData">): string[] {
	const missing: string[] = [];

	if (letterData.referenceNumber.includes("____")) {
		missing.push("Número de Referencia manual");
	}

	letterData.policies.forEach((policy, index) => {
		const policyLabel = `Póliza ${index + 1} (${policy.policyNumber})`;

		if (letterData.templateType === "salud") {
			if (!policy.manualFields?.insuredValue || policy.manualFields.insuredValue <= 0) {
				missing.push(`${policyLabel}: Valor asegurado`);
			}
		} else if (letterData.templateType === "automotor") {
			if (!policy.manualFields?.insuredValue || policy.manualFields.insuredValue <= 0) {
				missing.push(`${policyLabel}: Valor Asegurado`);
			}
			if (!policy.manualFields?.vehicles || policy.manualFields.vehicles.length === 0) {
				missing.push(`${policyLabel}: No se encontraron vehículos.`);
			} else {
				policy.manualFields.vehicles.forEach((vehicle, vIndex) => {
					if (!vehicle.description) missing.push(`${policyLabel}, Vehículo ${vIndex + 1}: Falta descripción.`);
					if (!vehicle.insuredValue || vehicle.insuredValue <= 0) missing.push(`${policyLabel}, Vehículo ${vIndex + 1}: Falta valor asegurado.`);
				});
			}
		} else {
			// General
			if (!policy.manualFields?.insuredValue || policy.manualFields.insuredValue <= 0) {
				missing.push(`${policyLabel}: Valor Asegurado`);
			}
			if (!policy.manualFields?.insuredMatter) {
				missing.push(`${policyLabel}: Materia Asegurada`);
			}
		}
	});

	return [...new Set(missing)]; // Evitar duplicados
}

export function generateReferenceNumber(): string {
	const now = new Date();
	const year = now.getFullYear();
	return `SCPSA-____/${year}`;
}

export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("es-BO", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
}

export function formatDateShort(date: Date): string {
	return new Intl.DateTimeFormat("es-BO", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.format(date)
		.replace(/\//g, "");
}

export function generateFileName(clientName: string, templateType: "salud" | "general" | "automotor"): string {
	const today = new Date();
	const dateStr = formatDateShort(today);

	const cleanName = clientName
		.replace(/[^a-zA-ZÀ-ÿ\u00f1\u00d1\s]/g, "")
		.trim()
		.replace(/\s+/g, "_")
		.toUpperCase();

	const typePrefixMap = {
		salud: "SALUD",
		automotor: "AUTO",
		general: "GEN",
	};
	const typePrefix = typePrefixMap[templateType] || "VCMTO";

	return `${dateStr}-AVISO_${typePrefix}_${cleanName}.pdf`;
}

export function validateRecordForPDF(record: ProcessedInsuranceRecord): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!record.asegurado || record.asegurado.trim().length < 2) {
		errors.push("Nombre del asegurado requerido");
	}
	if (!record.noPoliza || record.noPoliza.trim().length < 2) {
		errors.push("Número de póliza requerido");
	}
	if (!record.compania || record.compania.trim().length < 2) {
		errors.push("Compañía aseguradora requerida");
	}
	if (!record.ramo || record.ramo.trim().length < 2) {
		errors.push("Ramo del seguro requerido");
	}
	if (!record.finDeVigencia) {
		errors.push("Fecha de vencimiento requerida");
	}
	if (!record.ejecutivo || record.ejecutivo.trim().length < 2) {
		errors.push("Ejecutivo responsable requerido");
	}
	return {
		valid: errors.length === 0,
		errors,
	};
}

export function formatCurrency(amount: number): string {
	if (amount === undefined || amount === null || isNaN(amount)) return "No especificado";
	return new Intl.NumberFormat("es-BO", {
		style: "currency",
		currency: "BOB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

export function formatUSD(amount: number): string {
	if (amount === undefined || amount === null || isNaN(amount)) return "No especificado";
	const formattedNumber = new Intl.NumberFormat("es-BO", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
	return `$us. ${formattedNumber}`;
}
