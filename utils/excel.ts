import * as ExcelJS from "exceljs";
import {
	InsuranceRecord,
	ProcessedInsuranceRecord,
	ExcelUploadResult,
	InsuranceStatus,
	VALIDATION_RULES,
	SYSTEM_CONSTANTS,
} from "@/types/insurance";

/**
 * Convierte fecha serial de Excel a objeto Date - CORREGIDO
 */
export function excelDateToJSDate(excelDate: number | Date): Date {
	if (excelDate instanceof Date) {
		let tiempoMili = excelDate.getTime();
		let tiempoActual = new Date(1899, 11, 30).getTime();
		// Si ya es Date pero viene de Excel, convertir a número para aplicar corrección
		const excelSerial = (tiempoMili - tiempoActual) / (24 * 60 * 60 * 1000);
		return excelDateToJSDate(excelSerial);
	}

	const correctedSerial = excelDate > 59 ? excelDate - 1 : excelDate;
	const excelEpoch = new Date(1900, 0, 1);
	const resultDate = new Date(excelEpoch);
	resultDate.setDate(excelEpoch.getDate() + correctedSerial);
	return resultDate;
}

/**
 * Calcula los días hasta el vencimiento
 */
export function calculateDaysUntilExpiry(expiryDate: Date): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	expiryDate.setHours(0, 0, 0, 0);

	const diffTime = expiryDate.getTime() - today.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determina el estatus basado en días hasta vencimiento
 */
export function determineStatus(daysUntilExpiry: number): InsuranceStatus {
	if (daysUntilExpiry < 0) return "expired";
	if (daysUntilExpiry <= SYSTEM_CONSTANTS.CRITICAL_DAYS_THRESHOLD) return "critical";
	if (daysUntilExpiry <= SYSTEM_CONSTANTS.DUE_SOON_DAYS_THRESHOLD) return "due_soon";
	return "pending";
}

/**
 * Limpia y normaliza strings, manejando texto enriquecido de Excel.
 * Esta función es clave para prevenir errores de '[object Object]' y mejorar la seguridad.
 */
export function cleanString(value: any): string {
	if (value === null || value === undefined) {
		return "";
	}

	// Caso 1: El valor es un objeto de texto enriquecido (hyperlink de Excel)
	// { text: 'user@example.com', hyperlink: 'mailto:user@example.com' }
	if (typeof value === "object" && value !== null && "text" in value) {
		return String(value.text).trim();
	}

	// Caso 2: El valor es un objeto con una propiedad 'result' (fórmulas de Excel)
	if (typeof value === "object" && value !== null && "result" in value) {
		return String(value.result).trim();
	}

	// Caso 3: Es cualquier otro tipo de dato, lo convertimos a string de forma segura.
	return String(value).trim();
}

/**
 * Convierte valor a número, manejando diferentes formatos
 */
export function parseNumber(value: any): number {
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const cleaned = value.replace(/[^\d.-]/g, "");
		const parsed = parseFloat(cleaned);
		return isNaN(parsed) ? 0 : parsed;
	}
	return 0;
}

/**
 * Valida un registro individual
 */
export function validateRecord(record: any, rowIndex: number): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	VALIDATION_RULES.forEach((rule) => {
		const value = record[rule.field];

		if (rule.required && (value === null || value === undefined || value === "")) {
			errors.push(`Fila ${rowIndex}: Campo "${rule.field}" es requerido`);
			return;
		}

		if (value !== null && value !== undefined && value !== "") {
			switch (rule.type) {
				case "string":
					const strValue = cleanString(value);
					if (rule.minLength && strValue.length < rule.minLength) {
						errors.push(
							`Fila ${rowIndex}: "${rule.field}" debe tener al menos ${rule.minLength} caracteres`
						);
					}
					if (rule.maxLength && strValue.length > rule.maxLength) {
						errors.push(
							`Fila ${rowIndex}: "${rule.field}" no puede tener más de ${rule.maxLength} caracteres`
						);
					}
					break;

				case "number":
					const numValue = parseNumber(value);
					if (isNaN(numValue)) {
						errors.push(`Fila ${rowIndex}: "${rule.field}" debe ser un número válido`);
					}
					break;

				case "date":
					let dateValue: Date;
					if (typeof value === "number") {
						dateValue = excelDateToJSDate(value);
					} else {
						dateValue = new Date(value);
					}
					if (isNaN(dateValue.getTime())) {
						errors.push(`Fila ${rowIndex}: "${rule.field}" debe ser una fecha válida`);
					}
					break;

				case "email":
					const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
					if (!emailPattern.test(cleanString(value))) {
						errors.push(`Fila ${rowIndex}: "${rule.field}" debe ser un email válido`);
					}
					break;
			}
		}
	});

	return { isValid: errors.length === 0, errors };
}

/**
 * Mapea las columnas del Excel a nuestro tipo InsuranceRecord
 */
export function mapExcelRowToRecord(row: any): InsuranceRecord {
	return {
		nro: parseNumber(row["NRO."]),
		inicioDeVigencia: row["INICIO DE VIGENCIA"],
		finDeVigencia: row["FIN DE VIGENCIA"],
		compania: cleanString(row["COMPAÑÍA"]) || "Sin especificar",
		ramo: cleanString(row["RAMO"]) || "Sin especificar",
		noPoliza: cleanString(row["NO. PÓLIZA"]) || "Sin número",
		telefono: cleanString(row["TELEFONO"]),
		correoODireccion: cleanString(row["CORREO/DIRECCION"]),
		asegurado: cleanString(row["ASEGURADO"]) || "Sin nombre",
		cartera: cleanString(row["CARTERA"]),
		materiaAsegurada: cleanString(row["MATERIA ASEGURADA"]),
		valorAsegurado: parseNumber(row[" VALOR ASEGURADO "] || row["VALOR ASEGURADO"]),
		prima: parseNumber(row[" PRIMA "] || row["PRIMA"]),
		ejecutivo: cleanString(row["EJECUTIVO"]) || "Sin asignar",
		responsable: cleanString(row["RESPONSABLE"]),
		cartaAvisoVto: cleanString(row["CARTA AVISO VTO."]),
		seguimiento: cleanString(row["SEGUIMIENTO"]),
		cartaDeNoRenov: cleanString(row["CARTA DE NO RENOV."]),
		renueva: cleanString(row["RENUEVA"]),
		pendiente: cleanString(row["PENDIENTE"]),
		noRenueva: cleanString(row["NO RENUEVA"]),
		avance: parseNumber(row["Avance"]),
		cantidad: parseNumber(row["Cantidad"]),
		observaciones: cleanString(row["Observaciones2"] || row["Observaciones"]),
	};
}

/**
 * Procesa un registro para agregar campos calculados
 */
export function processRecord(record: InsuranceRecord, index: number): ProcessedInsuranceRecord {
	let expiryDate: Date;
	if (typeof record.finDeVigencia === "number" || record.finDeVigencia instanceof Date) {
		expiryDate = excelDateToJSDate(record.finDeVigencia);
	} else if (typeof record.finDeVigencia === "string") {
		expiryDate = new Date(record.finDeVigencia);
		if (isNaN(expiryDate.getTime())) {
			const parts = record.finDeVigencia.split("/");
			if (parts.length === 3) {
				const day = parseInt(parts[0]);
				const month = parseInt(parts[1]) - 1;
				const year = parseInt(parts[2]);
				expiryDate = new Date(year, month, day);
			}
		}
	} else {
		expiryDate = new Date(record.finDeVigencia);
	}

	// Process start date (inicioDeVigencia) if available
	let startDate: Date | undefined;
	if (record.inicioDeVigencia) {
		if (typeof record.inicioDeVigencia === "number" || record.inicioDeVigencia instanceof Date) {
			startDate = excelDateToJSDate(record.inicioDeVigencia);
		} else if (typeof record.inicioDeVigencia === "string") {
			startDate = new Date(record.inicioDeVigencia);
			if (isNaN(startDate.getTime())) {
				const parts = record.inicioDeVigencia.split("/");
				if (parts.length === 3) {
					const day = parseInt(parts[0]);
					const month = parseInt(parts[1]) - 1;
					const year = parseInt(parts[2]);
					startDate = new Date(year, month, day);
				}
			}
		} else {
			startDate = new Date(record.inicioDeVigencia);
		}
		// If start date parsing failed, set to undefined
		if (isNaN(startDate.getTime())) {
			startDate = undefined;
		}
	}

	const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
	const status = determineStatus(daysUntilExpiry);

	return {
		...record,
		id: `record_${index}_${Date.now()}`,
		inicioDeVigencia: startDate,
		finDeVigencia: expiryDate,
		daysUntilExpiry,
		status,
		selected: false,
	};
}

/**
 * Función principal para procesar archivo Excel
 */
export async function processExcelFile(file: File): Promise<ExcelUploadResult> {
	try {
		if (file.size > SYSTEM_CONSTANTS.MAX_UPLOAD_SIZE) {
			return {
				success: false,
				errors: [
					`El archivo es demasiado grande. Tamaño máximo: ${
						SYSTEM_CONSTANTS.MAX_UPLOAD_SIZE / 1024 / 1024
					}MB`,
				],
			};
		}

		const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
		if (!(SYSTEM_CONSTANTS.SUPPORTED_FILE_TYPES as readonly string[]).includes(fileExtension)) {
			return {
				success: false,
				errors: [
					`Tipo de archivo no soportado. Tipos permitidos: ${SYSTEM_CONSTANTS.SUPPORTED_FILE_TYPES.join(
						", "
					)}`,
				],
			};
		}

		const arrayBuffer = await file.arrayBuffer();
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(arrayBuffer);

		if (workbook.worksheets.length === 0) {
			return {
				success: false,
				errors: ["El archivo Excel no contiene hojas válidas"],
			};
		}

		const worksheet = workbook.worksheets[0];

		if (worksheet.rowCount < 2) {
			return {
				success: false,
				errors: ["El archivo no contiene datos suficientes (mínimo: headers + 1 fila de datos)"],
			};
		}

		const headerRow = worksheet.getRow(1);
		const headers: string[] = [];

		headerRow.eachCell((cell, colNumber) => {
			headers[colNumber] = cell.value ? cell.value.toString().trim() : "";
		});

		const requiredHeaders = ["FIN DE VIGENCIA", "COMPAÑÍA", "NO. PÓLIZA", "ASEGURADO", "EJECUTIVO"];

		const missingHeaders = requiredHeaders.filter(
			(header) => !headers.some((h) => h && h.toUpperCase().includes(header.toUpperCase()))
		);

		if (missingHeaders.length > 0) {
			return {
				success: false,
				errors: [`Headers faltantes: ${missingHeaders.join(", ")}`],
			};
		}

		const processedRecords: ProcessedInsuranceRecord[] = [];
		const errors: string[] = [];
		const warnings: string[] = [];

		for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
			const row = worksheet.getRow(rowNumber);
			const rowObject: any = {};
			let hasData = false;

			row.eachCell((cell, colNumber) => {
				const header = headers[colNumber];
				if (header && cell.value !== null && cell.value !== undefined) {
					rowObject[header] = cell.value;
					hasData = true;
				}
			});

			if (!hasData) {
				warnings.push(`Fila ${rowNumber}: Fila vacía, se omitirá`);
				continue;
			}

			try {
				const insuranceRecord = mapExcelRowToRecord(rowObject);
				const validation = validateRecord(insuranceRecord, rowNumber);
				if (!validation.isValid) {
					errors.push(...validation.errors);
					continue;
				}
				const processedRecord = processRecord(insuranceRecord, rowNumber - 2);
				processedRecords.push(processedRecord);
			} catch (error) {
				errors.push(
					`Fila ${rowNumber}: Error al procesar - ${
						error instanceof Error ? error.message : "Error desconocido"
					}`
				);
			}
		}

		if (processedRecords.length === 0 && errors.length > 0) {
			return {
				success: false,
				errors: ["No se pudieron procesar registros válidos", ...errors],
			};
		}

		const policyNumbers = new Set<string>();
		const duplicates: string[] = [];

		processedRecords.forEach((record, index) => {
			if (policyNumbers.has(record.noPoliza)) {
				duplicates.push(`Póliza duplicada: ${record.noPoliza} (fila ${index + 2})`);
			} else {
				policyNumbers.add(record.noPoliza);
			}
		});

		if (duplicates.length > 0) {
			warnings.push(...duplicates);
		}

		return {
			success: true,
			data: processedRecords,
			errors: errors.length > 0 ? errors : undefined,
			warnings: warnings.length > 0 ? warnings : undefined,
			totalRecords: worksheet.rowCount - 1,
			validRecords: processedRecords.length,
		};
	} catch (error) {
		console.error("Error procesando archivo Excel:", error);
		return {
			success: false,
			errors: [
				"Error al procesar el archivo Excel",
				error instanceof Error ? error.message : "Error desconocido",
			],
		};
	}
}

/**
 * Filtra registros que necesitan carta de vencimiento
 */
export function getRecordsNeedingNotification(records: ProcessedInsuranceRecord[]): ProcessedInsuranceRecord[] {
	return records.filter((record) => {
		const daysUntil = record.daysUntilExpiry;
		return daysUntil <= SYSTEM_CONSTANTS.DAYS_BEFORE_EXPIRY_TO_SEND && daysUntil > 0;
	});
}

/**
 * Filtra registros críticos
 */
export function getCriticalRecords(records: ProcessedInsuranceRecord[]): ProcessedInsuranceRecord[] {
	return records.filter((record) => record.status === "critical");
}

/**
 * Obtiene valores únicos de una propiedad para filtros
 */
export function getUniqueValues<T extends keyof ProcessedInsuranceRecord>(
	records: ProcessedInsuranceRecord[],
	property: T
): string[] {
	const values = records
		.map((record) => record[property])
		.filter((value) => typeof value === "string" && value.trim() !== "" && value !== null && value !== undefined)
		.map((value) => (value as string).trim());

	return [...new Set(values)].sort();
}

/**
 * Formatea número como moneda boliviana
 */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("es-BO", {
		style: "currency",
		currency: "BOB",
		minimumFractionDigits: 2,
	}).format(amount);
}

/**
 * Formatea fecha para mostrar
 */
export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("es-BO", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

/**
 * Genera nombre de archivo para carta PDF
 */
export function generateLetterFileName(record: ProcessedInsuranceRecord): string {
	const today = new Date();
	const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

	const cleanName = record.asegurado
		.replace(/[^a-zA-Z\s]/g, "")
		.trim()
		.replace(/\s+/g, "_")
		.toUpperCase();

	return `AVISO_VCMTO_${cleanName}_${dateStr}.pdf`;
}
