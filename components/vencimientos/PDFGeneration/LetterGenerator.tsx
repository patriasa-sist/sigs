// components/PDFGeneration/LetterGenerator.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
	FileText,
	Download,
	Eye,
	AlertTriangle,
	CheckCircle,
	X,
	Edit3,
	Save,
	RefreshCw,
	Package,
	Mail,
	Phone,
	PlusCircle,
	Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProcessedInsuranceRecord } from "@/types/insurance";
import {
	LetterData,
	GeneratedLetter,
	PDFGenerationResult,
	PolicyForLetter,
	VehicleForLetter,
	InsuredMemberWithType,
	BeneficiaryType,
} from "@/types/pdf";
import { groupRecordsForLetters, validateRecordForPDF, generateFileName, detectMissingData } from "@/utils/pdfutils";
import { generateLetterReference } from "@/utils/letterReferences";
import { cleanPhoneNumber, createWhatsAppMessage } from "@/utils/whatsapp";
import { pdf } from "@react-pdf/renderer";
import { HealthTemplate } from "./HealthTemplate";
import { AutomotorTemplate } from "./AutomotorTemplate"; // Cambiado
import { GeneralTemplate } from "./GeneralTemplate"; // Nuevo
import JSZip from "jszip";

// Icono de WhatsApp como componente SVG
const WhatsAppIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
	</svg>
);

interface LetterGeneratorProps {
	selectedRecords: ProcessedInsuranceRecord[];
	onClose: () => void;
	onGenerated?: (result: PDFGenerationResult) => void;
}

// Componente para input numérico validado
interface NumericInputProps {
	value: number | string;
	onChange: (value: number) => void;
	placeholder?: string;
	className?: string;
	label?: string;
}

function NumericInput({ value, onChange, placeholder, className, label }: NumericInputProps) {
	// ... (sin cambios en este componente)
	const [displayValue, setDisplayValue] = useState(value ? String(value) : "");

	useEffect(() => {
		setDisplayValue(value ? String(value) : "");
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const input = e.target.value;
		const numericValue = input.replace(/[^0-9.]/g, "");
		const parts = numericValue.split(".");
		const cleanValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : numericValue;

		setDisplayValue(cleanValue);
		const numValue = parseFloat(cleanValue);
		if (!isNaN(numValue) && numValue >= 0) {
			onChange(numValue);
		} else if (cleanValue === "" || cleanValue === ".") {
			onChange(0);
		}
	};

	const handleBlur = () => {
		const numValue = parseFloat(displayValue);
		if (!isNaN(numValue)) {
			setDisplayValue(numValue.toString());
		} else {
			setDisplayValue("");
			onChange(0);
		}
	};

	return (
		<div>
			{label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
			<Input
				type="text"
				value={displayValue}
				onChange={handleChange}
				onBlur={handleBlur}
				placeholder={placeholder}
				className={className}
			/>
		</div>
	);
}

// Componente para input de ramo editable con aviso de cambio
interface EditableRamoInputProps {
	value: string;
	onValueChange: (value: string) => void;
	label?: string;
	placeholder?: string;
	className?: string;
	originalRamo?: string; // Original ramo from Excel/PUC mapping
}

function EditableRamoInput({
	value,
	onValueChange,
	label,
	placeholder,
	className,
	originalRamo,
}: EditableRamoInputProps) {
	// Check if ramo was changed from original Excel/PUC value
	const ramoChanged = originalRamo && value !== originalRamo;

	return (
		<div>
			{label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
			<Input
				type="text"
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				placeholder={placeholder}
				className={`${className} ${ramoChanged ? "border-yellow-400" : ""}`}
			/>
			{ramoChanged && (
				<div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center">
					<AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
					Ramo cambiado difiere del original: {originalRamo} → {value}
				</div>
			)}
		</div>
	);
}

// Componente para input numérico con selección de moneda
interface NumericInputWithCurrencyProps {
	value: number | undefined;
	currency: "Bs." | "$us.";
	onValueChange: (value: number) => void;
	onCurrencyChange: (currency: "Bs." | "$us.") => void;
	label?: string;
	placeholder?: string;
	className?: string;
	originalCurrency?: "Bs." | "$us."; // Currency from Excel
	originalValue?: number; // Original value from Excel
}

function NumericInputWithCurrency({
	value,
	currency,
	onValueChange,
	onCurrencyChange,
	label,
	placeholder,
	className,
	originalCurrency,
	originalValue,
}: NumericInputWithCurrencyProps) {
	// ... (sin cambios en este componente)
	const [displayValue, setDisplayValue] = useState(value !== undefined && value !== null ? String(value) : "");

	useEffect(() => {
		setDisplayValue(value !== undefined && value !== null ? String(value) : "");
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const input = e.target.value;
		const numericValue = input.replace(/[^0-9.]/g, "");
		const parts = numericValue.split(".");
		const cleanValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : numericValue;

		setDisplayValue(cleanValue);
		const numValue = parseFloat(cleanValue);
		if (!isNaN(numValue) && numValue >= 0) {
			onValueChange(numValue);
		} else if (cleanValue === "" || cleanValue === ".") {
			onValueChange(0);
		}
	};

	const handleBlur = () => {
		const numValue = parseFloat(displayValue);
		if (!isNaN(numValue)) {
			setDisplayValue(numValue.toString());
		} else {
			setDisplayValue("");
			onValueChange(0);
		}
	};

	// Check if currency was changed from original Excel value
	const currencyChanged = originalCurrency && currency !== originalCurrency;
	// Check if value was changed from original Excel value
	const valueChanged = originalValue !== undefined && value !== originalValue;

	return (
		<div>
			{label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
			<div className="flex items-center space-x-2">
				<Input
					type="text"
					value={displayValue}
					onChange={handleChange}
					onBlur={handleBlur}
					placeholder={placeholder}
					className={`${className} ${valueChanged ? "border-yellow-400" : ""}`}
				/>
				<Select value={currency} onValueChange={(val: "Bs." | "$us.") => onCurrencyChange(val)}>
					<SelectTrigger className={`w-20 h-8 text-xs ${currencyChanged ? "border-yellow-400" : ""}`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="Bs.">Bs.</SelectItem>
						<SelectItem value="$us.">$us.</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{/* Warning for changed value */}
			{valueChanged && (
				<div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center">
					<AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
					Valor TOTAL cambiado difiere del original: {originalCurrency === "Bs."
						? `Bs. ${originalValue.toLocaleString('es-BO', {minimumFractionDigits: 2})}`
						: `$us. ${originalValue.toLocaleString('es-BO', {minimumFractionDigits: 2})}`
					} → {currency === "Bs."
						? `Bs. ${(value || 0).toLocaleString('es-BO', {minimumFractionDigits: 2})}`
						: `$us. ${(value || 0).toLocaleString('es-BO', {minimumFractionDigits: 2})}`
					}
				</div>
			)}
			{/* Warning for changed currency */}
			{currencyChanged && (
				<div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center">
					<AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
					Moneda cambiada difiere Excel: {originalCurrency} → {currency}
				</div>
			)}
		</div>
	);
}

// Componente para textarea
interface ConditionsTextareaProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	label?: string;
	rows?: number;
}

function ConditionsTextarea({ value, onChange, placeholder, label, rows = 3 }: ConditionsTextareaProps) {
	// ... (sin cambios en este componente)
	return (
		<div>
			{label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
			<textarea
				value={value || ""}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full p-2 text-xs border border-gray-300 rounded-md resize-y focus:ring-2 focus:ring-patria-blue focus:border-transparent"
				rows={rows}
			/>
		</div>
	);
}

// Componente para editar la lista de asegurados (Salud) con tipos de beneficiario
interface InsuredMembersWithTypeEditorProps {
	members: InsuredMemberWithType[];
	onChange: (newMembers: InsuredMemberWithType[]) => void;
	label?: string;
}

function InsuredMembersWithTypeEditor({ members, onChange, label }: InsuredMembersWithTypeEditorProps) {
	const handleMemberNameChange = (index: number, name: string) => {
		const newMembers = [...members];
		newMembers[index] = { ...newMembers[index], name };
		onChange(newMembers);
	};

	const handleMemberTypeChange = (index: number, beneficiaryType: BeneficiaryType) => {
		const newMembers = [...members];
		newMembers[index] = { ...newMembers[index], beneficiaryType };
		onChange(newMembers);
	};

	const addMember = () => {
		const newMember: InsuredMemberWithType = {
			id: `member_${Date.now()}`,
			name: "",
			beneficiaryType: "dependiente",
		};
		onChange([...members, newMember]);
	};

	const removeMember = (id: string) => {
		const newMembers = members.filter((member) => member.id !== id);
		onChange(newMembers);
	};

	// Validación de tipos de beneficiario
	const titularCount = members.filter((m) => m.beneficiaryType === "titular").length;
	const conyugueCount = members.filter((m) => m.beneficiaryType === "conyugue").length;

	const getBeneficiaryTypeOptions = (currentType: BeneficiaryType) => {
		const options: { value: BeneficiaryType; label: string; disabled?: boolean }[] = [
			{ value: "titular", label: "Titular", disabled: titularCount >= 1 && currentType !== "titular" },
			{ value: "conyugue", label: "Cónyuge", disabled: conyugueCount >= 1 && currentType !== "conyugue" },
			{ value: "dependiente", label: "Dependiente" },
		];
		return options;
	};

	return (
		<div>
			{label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
			{(titularCount > 1 || conyugueCount > 1) && (
				<div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
					⚠️ Solo puede haber un titular y un cónyuge por póliza
				</div>
			)}
			<div className="space-y-2">
				{members.map((member, index) => (
					<div key={member.id} className="flex items-center space-x-2">
						<Input
							type="text"
							value={member.name}
							onChange={(e) => handleMemberNameChange(index, e.target.value)}
							className="text-xs h-8 flex-grow"
							placeholder={`Nombre del asegurado`}
						/>
						<Select
							value={member.beneficiaryType}
							onValueChange={(value: BeneficiaryType) => handleMemberTypeChange(index, value)}
						>
							<SelectTrigger className="w-28 h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{getBeneficiaryTypeOptions(member.beneficiaryType).map((option) => (
									<SelectItem key={option.value} value={option.value} disabled={option.disabled}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={() => removeMember(member.id)}
							className="h-8 w-8 p-0 shrink-0"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				))}
				<Button type="button" size="sm" variant="outline" onClick={addMember} className="text-xs h-8">
					<PlusCircle className="h-4 w-4 mr-2" />
					Añadir Asegurado
				</Button>
			</div>
		</div>
	);
}

// Componente para editar la lista de vehículos (Automotor)
interface VehicleEditorProps {
	vehicles: VehicleForLetter[];
	onChange: (newVehicles: VehicleForLetter[]) => void;
	label?: string;
}

function VehicleEditor({ vehicles, onChange, label }: VehicleEditorProps) {
	const handleVehicleChange = (index: number, field: keyof Omit<VehicleForLetter, "id">, value: string | number) => {
		const newVehicles = vehicles.map((v, i) => (i === index ? { ...v, [field]: value } : v));
		onChange(newVehicles);
	};

	const addVehicle = () => {
		onChange([
			...vehicles,
			{
				id: `new_vehicle_${Date.now()}`,
				description: "",
				insuredValue: 0,
				currency: "$us.", // Default to USD for automotor
				// No original values for manually added vehicles
				originalInsuredValue: undefined,
				originalCurrency: undefined,
			},
		]);
	};

	const removeVehicle = (id: string) => {
		onChange(vehicles.filter((v) => v.id !== id));
	};

	return (
		<div>
			{label && <label className="text-xs text-gray-600 block mb-2 font-medium">{label}</label>}
			<div className="space-y-3">
				{vehicles.map((vehicle, index) => (
					<div key={vehicle.id} className="p-3 bg-gray-50 rounded-md border space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-xs font-semibold text-gray-700">Vehículo {index + 1}</span>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => removeVehicle(vehicle.id)}
								className="h-7 w-7 p-0 text-red-500 hover:bg-red-100"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
						<Input
							type="text"
							value={vehicle.description}
							onChange={(e) => handleVehicleChange(index, "description", e.target.value)}
							className="text-xs h-8"
							placeholder="Descripción del vehículo (ej. Vagoneta Toyota TACOMA)"
						/>
						<div className="space-y-2">
							<div className="flex items-center space-x-2">
								<Input
									type="text"
									value={vehicle.insuredValue || ""}
									onChange={(e) => {
										const numValue = parseFloat(e.target.value) || 0;
										handleVehicleChange(index, "insuredValue", numValue);
									}}
									className={`text-xs h-8 flex-grow ${
										vehicle.originalInsuredValue !== undefined &&
										vehicle.insuredValue !== vehicle.originalInsuredValue
											? "border-yellow-400"
											: ""
									}`}
									placeholder="0.00"
								/>
								<Select
									value={vehicle.currency || "$us."}
									onValueChange={(val: "Bs." | "$us.") => handleVehicleChange(index, "currency", val)}
								>
									<SelectTrigger
										className={`w-20 h-8 text-xs ${
											vehicle.originalCurrency && vehicle.currency !== vehicle.originalCurrency
												? "border-yellow-400"
												: ""
										}`}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Bs.">Bs.</SelectItem>
										<SelectItem value="$us.">$us.</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{/* Warning for changed insured value */}
							{vehicle.originalInsuredValue !== undefined &&
								vehicle.insuredValue !== vehicle.originalInsuredValue && (
									<div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center">
										<AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
										Valor cambiado difiere del original:{" "}
										{vehicle.originalCurrency === "Bs."
											? `Bs. ${vehicle.originalInsuredValue.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
											  })}`
											: `$us. ${vehicle.originalInsuredValue.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
											  })}`}{" "}
										→{" "}
										{vehicle.currency === "Bs."
											? `Bs. ${vehicle.insuredValue.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
											  })}`
											: `$us. ${vehicle.insuredValue.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
											  })}`}
									</div>
								)}
							{/* Warning for changed currency */}
							{vehicle.originalCurrency && vehicle.currency !== vehicle.originalCurrency && (
								<div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center">
									<AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
									Moneda cambiada difiere del original: {vehicle.originalCurrency} →{" "}
									{vehicle.currency}
								</div>
							)}
						</div>
					</div>
				))}
				<Button type="button" size="sm" variant="outline" onClick={addVehicle} className="text-xs h-8 mt-2">
					<PlusCircle className="h-4 w-4 mr-2" />
					Añadir Vehículo
				</Button>
			</div>
		</div>
	);
}

export default function LetterGenerator({ selectedRecords, onClose, onGenerated }: LetterGeneratorProps) {
	const [letters, setLetters] = useState<LetterData[]>([]);
	const [isGenerating, setIsGenerating] = useState(false);
	const [editingLetter, setEditingLetter] = useState<string | null>(null);
	const [previewLetter, setPreviewLetter] = useState<string | null>(null);
	const [generationResult, setGenerationResult] = useState<PDFGenerationResult | null>(null);

	const [preparedLetters, setPreparedLetters] = useState<{
		letters: LetterData[];
		validRecords: number;
		totalRecords: number;
		validationErrors: string[];
	}>({
		letters: [],
		validRecords: 0,
		totalRecords: 0,
		validationErrors: [],
	});

	// Process and validate records (reference numbers generated only during PDF creation)
	useEffect(() => {
		const processRecords = async () => {
			const validRecords: ProcessedInsuranceRecord[] = [];
			const validationErrors: string[] = [];

			selectedRecords.forEach((record, index) => {
				const validation = validateRecordForPDF(record);
				if (validation.valid) {
					validRecords.push(record);
				} else {
					validationErrors.push(
						`Registro ${index + 1} (${record.asegurado}): ${validation.errors.join(", ")}`
					);
				}
			});

			// Use synchronous method for letter preparation (no reference numbers yet)
			const groupedLetters = groupRecordsForLetters(validRecords);
			setPreparedLetters({
				letters: groupedLetters,
				validRecords: validRecords.length,
				totalRecords: selectedRecords.length,
				validationErrors,
			});
		};

		if (selectedRecords.length > 0) {
			processRecords();
		}
	}, [selectedRecords]);

	useEffect(() => {
		if (preparedLetters.letters.length > 0 && letters.length === 0) {
			setLetters(preparedLetters.letters);
		}
	}, [preparedLetters.letters, letters.length]);

	const stats = useMemo(() => {
		const saludCount = letters.filter((l) => l.templateType === "salud").length;
		const automotorCount = letters.filter((l) => l.templateType === "automotor").length;
		const generalCount = letters.filter((l) => l.templateType === "general").length;
		const needReviewCount = letters.filter((l) => l.needsReview).length;
		const totalPolicies = letters.reduce((sum, l) => sum + l.policies.length, 0);

		return {
			totalLetters: letters.length,
			saludCount,
			automotorCount,
			generalCount,
			needReviewCount,
			totalPolicies,
		};
	}, [letters]);

	const updateLetterData = (letterId: string, updates: Partial<LetterData>) => {
		// ... (sin cambios en esta función)
		setLetters((prev) => {
			const updated = prev.map((letter) => {
				if (letter.id === letterId) {
					const updatedLetter = { ...letter, ...updates };
					const missingData = detectMissingData(updatedLetter);
					updatedLetter.missingData = missingData;
					updatedLetter.needsReview = missingData.length > 0;
					return updatedLetter;
				}
				return letter;
			});
			return updated;
		});
	};

	const generateSinglePDF = async (
		letterData: LetterData
	): Promise<{ pdfBlob: Blob; finalLetterData: LetterData }> => {
		// Generate real reference number only when actually creating the PDF
		// and only if it's still a placeholder (not manually edited)
		let finalLetterData = letterData;
		const isPlaceholder =
			letterData.referenceNumber.includes("____") || letterData.referenceNumber.includes("ADM-00000");

		if (isPlaceholder) {
			try {
				const realReferenceNumber = await generateLetterReference();
				finalLetterData = {
					...letterData,
					referenceNumber: realReferenceNumber,
				};
			} catch (error) {
				console.error("Error generating reference number:", error);
				// Continue with placeholder if reference generation fails
			}
		}
		// If reference number was manually edited, use it as-is (no DB generation)

		let TemplateComponent;
		switch (finalLetterData.templateType) {
			case "salud":
				TemplateComponent = HealthTemplate;
				break;
			case "automotor":
				TemplateComponent = AutomotorTemplate;
				break;
			default:
				TemplateComponent = GeneralTemplate;
		}
		const pdfBlob = await pdf(<TemplateComponent letterData={finalLetterData} />).toBlob();
		return { pdfBlob, finalLetterData };
	};

	// Generate PDF for preview without touching the database
	const generatePreviewPDF = async (letterData: LetterData): Promise<Blob> => {
		// For preview, never generate real reference numbers - always use placeholder as-is
		let TemplateComponent;
		switch (letterData.templateType) {
			case "salud":
				TemplateComponent = HealthTemplate;
				break;
			case "automotor":
				TemplateComponent = AutomotorTemplate;
				break;
			default:
				TemplateComponent = GeneralTemplate;
		}
		const pdfBlob = await pdf(<TemplateComponent letterData={letterData} />).toBlob();
		return pdfBlob;
	};

	const handlePreview = async (letterId: string) => {
		setPreviewLetter(letterId);
		const letter = letters.find((l) => l.id === letterId);
		if (letter) {
			try {
				const pdfBlob = await generatePreviewPDF(letter); // Use preview function instead
				const pdfUrl = URL.createObjectURL(pdfBlob);
				window.open(pdfUrl, "_blank");
			} catch (error) {
				console.error("Error generating preview:", error);
				alert("Error al generar la vista previa");
			}
		}
		setPreviewLetter(null);
	};

	const downloadBlob = (blob: Blob, fileName: string) => {
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleDownloadSingle = async (letterId: string) => {
		const letter = letters.find((l) => l.id === letterId);
		if (!letter) return;

		try {
			setIsGenerating(true);
			const { pdfBlob, finalLetterData } = await generateSinglePDF(letter);
			const fileName = generateFileName(finalLetterData);
			downloadBlob(pdfBlob, fileName);

			const result: PDFGenerationResult = {
				success: true,
				letters: [
					{
						letterId: letter.id,
						sourceRecordIds: letter.sourceRecordIds,
						clientName: letter.client.name,
						clientPhone: letter.client.phone,
						clientEmail: letter.client.email,
						templateType: letter.templateType,
						fileName,
						pdfBlob,
						policyCount: letter.policies.length,
						needsReview: letter.needsReview,
						missingData: letter.missingData,
					},
				],
				errors: [],
				totalGenerated: 1,
			};
			setGenerationResult(result);
			onGenerated?.(result);
		} catch (error) {
			console.error("Error generating PDF:", error);
			alert("Error al generar el PDF");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleDownloadAll = async () => {
		try {
			setIsGenerating(true);
			const zip = new JSZip();
			const generatedLetters: GeneratedLetter[] = [];
			const errors: string[] = [];

			for (const letter of letters) {
				// Note: We no longer validate reference numbers here since they're generated during PDF creation
				try {
					const { pdfBlob, finalLetterData } = await generateSinglePDF(letter);
					const fileName = generateFileName(finalLetterData);

					zip.file(fileName, pdfBlob);

					generatedLetters.push({
						letterId: letter.id,
						sourceRecordIds: letter.sourceRecordIds,
						clientName: letter.client.name,
						clientPhone: letter.client.phone,
						clientEmail: letter.client.email,
						templateType: letter.templateType,
						fileName,
						pdfBlob,
						policyCount: letter.policies.length,
						needsReview: letter.needsReview,
						missingData: letter.missingData,
					});
				} catch (error) {
					const errorMsg = `Error generando carta para ${letter.client.name}: ${error}`;
					errors.push(errorMsg);
					console.error(errorMsg);
				}
			}

			if (generatedLetters.length > 0) {
				const zipBlob = await zip.generateAsync({ type: "blob" });
				const zipFileName = `Cartas_Vencimiento_${new Date().toISOString().slice(0, 10)}.zip`;
				downloadBlob(zipBlob, zipFileName);
			}

			const result: PDFGenerationResult = {
				success: generatedLetters.length > 0,
				letters: generatedLetters,
				errors,
				totalGenerated: generatedLetters.length,
			};

			setGenerationResult(result);
			onGenerated?.(result);
		} catch (error) {
			console.error("Error generating ZIP:", error);
			alert("Error al generar el archivo ZIP");
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSendWhatsApp = async (letterId: string) => {
		const letter = letters.find((l) => l.id === letterId);
		if (!letter || !letter.client.phone) return;

		try {
			setIsGenerating(true);
			const { pdfBlob, finalLetterData } = await generateSinglePDF(letter);
			const fileName = generateFileName(finalLetterData);
			downloadBlob(pdfBlob, fileName);

			const cleanedPhone = cleanPhoneNumber(letter.client.phone);
			const message = createWhatsAppMessage(letter);
			const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanedPhone}&text=${message}`;

			window.open(whatsappUrl, "_blank", "noopener,noreferrer");

			const result: PDFGenerationResult = {
				success: true,
				letters: [
					{
						letterId: letter.id,
						sourceRecordIds: letter.sourceRecordIds,
						clientName: letter.client.name,
						clientPhone: letter.client.phone,
						clientEmail: letter.client.email,
						templateType: letter.templateType,
						fileName,
						pdfBlob,
						policyCount: letter.policies.length,
						needsReview: letter.needsReview,
						missingData: letter.missingData,
					},
				],
				errors: [],
				totalGenerated: 1,
			};
			setGenerationResult(result);
			onGenerated?.(result);
		} catch (error) {
			console.error("Error preparing WhatsApp message:", error);
			alert("Error al preparar el mensaje de WhatsApp.");
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 flex items-center">
						<FileText className="h-6 w-6 mr-2 text-patria-blue" />
						Generador de Cartas
					</h2>
					<p className="text-gray-600">
						{stats.totalLetters} cartas para {stats.totalPolicies} pólizas
					</p>
				</div>

				<div className="flex items-center space-x-3">
					<Button
						onClick={handleDownloadAll}
						disabled={isGenerating || letters.length === 0}
						className="patria-btn-primary"
					>
						{isGenerating ? (
							<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Package className="h-4 w-4 mr-2" />
						)}
						Descargar Todo (ZIP)
					</Button>
					<Button variant="outline" onClick={onClose}>
						<X className="h-4 w-4 mr-2" />
						Cerrar
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-patria-blue">{stats.totalLetters}</div>
						<div className="text-sm text-gray-600">Total Cartas</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-patria-green">{stats.saludCount}</div>
						<div className="text-sm text-gray-600">Salud</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-blue-600">{stats.automotorCount}</div>
						<div className="text-sm text-gray-600">Automotor</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-gray-600">{stats.generalCount}</div>
						<div className="text-sm text-gray-600">General</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-red-600">{stats.needReviewCount}</div>
						<div className="text-sm text-gray-600">Revisar</div>
					</CardContent>
				</Card>
			</div>

			{/* Validation Errors */}
			{preparedLetters.validationErrors.length > 0 && (
				<Alert className="border-yellow-200 bg-yellow-50">
					<AlertTriangle className="h-4 w-4 text-yellow-600" />
					<AlertDescription className="text-yellow-800">
						<div className="font-medium mb-2">
							{preparedLetters.validationErrors.length} registros omitidos por datos faltantes:
						</div>
						<ul className="text-sm space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
							{preparedLetters.validationErrors.slice(0, 5).map((error, index) => (
								<li key={index}>{error}</li>
							))}
							{preparedLetters.validationErrors.length > 5 && (
								<li>... y {preparedLetters.validationErrors.length - 5} más</li>
							)}
						</ul>
					</AlertDescription>
				</Alert>
			)}

			<div className="space-y-4">
				{letters.map((letter) => (
					<LetterCard
						key={letter.id}
						letter={letter}
						isEditing={editingLetter === letter.id}
						isPreviewing={previewLetter === letter.id}
						isGenerating={isGenerating}
						onEdit={() => setEditingLetter(letter.id)}
						onSaveEdit={() => setEditingLetter(null)}
						onCancelEdit={() => setEditingLetter(null)}
						onPreview={() => handlePreview(letter.id)}
						onDownload={() => handleDownloadSingle(letter.id)}
						onWhatsApp={() => handleSendWhatsApp(letter.id)}
						onUpdateLetterData={updateLetterData}
					/>
				))}
			</div>

			{/* Generation Result */}
			{generationResult && (
				<Card
					className={
						generationResult.errors.length > 0
							? "border-yellow-200 bg-yellow-50"
							: "border-green-200 bg-green-50"
					}
				>
					<CardContent className="p-4">
						<div className="flex items-center">
							{generationResult.errors.length > 0 ? (
								<AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
							) : (
								<CheckCircle className="h-5 w-5 text-green-600 mr-2" />
							)}
							<div>
								<div
									className={`font-medium ${
										generationResult.errors.length > 0 ? "text-yellow-800" : "text-green-800"
									}`}
								>
									✅ {generationResult.totalGenerated} cartas generadas.
								</div>
								{generationResult.errors.length > 0 && (
									<div className="text-sm text-red-600 mt-1">
										{generationResult.errors.length} errores encontrados.
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Component for each individual letter
interface LetterCardProps {
	letter: LetterData;
	isEditing: boolean;
	isPreviewing: boolean;
	isGenerating: boolean;
	onEdit: () => void;
	onSaveEdit: () => void;
	onCancelEdit: () => void;
	onPreview: () => void;
	onDownload: () => void;
	onWhatsApp: () => void;
	onUpdateLetterData: (letterId: string, updates: Partial<LetterData>) => void;
}

function LetterCard({
	letter,
	isEditing,
	isPreviewing,
	isGenerating,
	onEdit,
	onSaveEdit,
	onCancelEdit,
	onPreview,
	onDownload,
	onWhatsApp,
	onUpdateLetterData,
}: LetterCardProps) {
	const [editedLetter, setEditedLetter] = useState<LetterData>(letter);
	const [isReferenceManuallyEdited, setIsReferenceManuallyEdited] = useState(false);

	const isReferenceValid = useMemo(
		() => letter.referenceNumber && letter.referenceNumber.length > 0, // Any reference number is valid now
		[letter.referenceNumber]
	);

	useEffect(() => {
		setEditedLetter(letter);
	}, [letter]);

	const handleFieldChange = <K extends keyof LetterData>(field: K, value: LetterData[K]) => {
		// Track if reference number is manually edited
		if (field === "referenceNumber" && typeof value === "string") {
			const isPlaceholder = value.includes("____") || value.includes("ADM-00000");
			setIsReferenceManuallyEdited(!isPlaceholder);
		}

		const updatedLetterData = { ...editedLetter, [field]: value };
		setEditedLetter(updatedLetterData);
		onUpdateLetterData(letter.id, { [field]: value });
	};

	const handleClientInfoChange = (field: "phone" | "email", value: string) => {
		const updatedClient = { ...editedLetter.client, [field]: value };
		handleFieldChange("client", updatedClient);
	};

	const updatePolicy = (
		policyIndex: number,
		field: keyof NonNullable<PolicyForLetter["manualFields"]>,
		value: string | number | string[] | VehicleForLetter[] | InsuredMemberWithType[]
	) => {
		const updatedPolicies = editedLetter.policies.map((policy, index) => {
			if (index === policyIndex) {
				const updatedManualFields = {
					...policy.manualFields,
					[field]: value,
				};

				// Special handling for branch field - store original value if not already set
				if (field === "branch" && !policy.manualFields?.originalBranch) {
					updatedManualFields.originalBranch = policy.branch;
				}

				if (field === "insuredMembers") {
					return { ...policy, insuredMembers: value as string[], manualFields: updatedManualFields };
				}
				if (field === "insuredMembersWithType") {
					return { ...policy, manualFields: updatedManualFields };
				}
				return { ...policy, manualFields: updatedManualFields };
			}
			return policy;
		});
		handleFieldChange("policies", updatedPolicies);
	};

	const updatePolicyVehicles = (policyIndex: number, newVehicles: VehicleForLetter[]) => {
		const updatedPolicies = editedLetter.policies.map((policy, index) => {
			if (index === policyIndex) {
				const updatedManualFields = {
					...policy.manualFields,
					vehicles: newVehicles,
				};
				return { ...policy, manualFields: updatedManualFields };
			}
			return policy;
		});
		handleFieldChange("policies", updatedPolicies);
	};

	const getTemplateIcon = (type: "salud" | "general" | "automotor") => {
		if (type === "salud") return "🏥";
		if (type === "automotor") return "🚗";
		return "📄";
	};

	const getTemplateColor = (type: "salud" | "general" | "automotor") => {
		if (type === "salud") return "border-green-200 bg-green-50";
		if (type === "automotor") return "border-blue-200 bg-blue-50";
		return "border-gray-200 bg-gray-50";
	};

	const formatMonetaryValue = (value: number | undefined, currency: "Bs." | "$us." | undefined) => {
		// ... (sin cambios)
		if (value === undefined || value === null || isNaN(value)) return "No especificado";
		const formattedValue = new Intl.NumberFormat("es-BO", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
		return currency === "$us." ? `$us. ${formattedValue}` : `Bs. ${formattedValue}`;
	};

	return (
		<Card
			className={`${getTemplateColor(letter.templateType)} ${
				letter.needsReview ? "border-l-4 border-l-red-500" : "border-l-4 border-l-green-500"
			}`}
		>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1 space-y-2">
						<div className="flex items-center space-x-3">
							<div className="text-2xl">{getTemplateIcon(letter.templateType)}</div>
							<div>
								<CardTitle className="text-lg">{letter.client.name}</CardTitle>
								{isEditing ? (
									<div className="mt-1">
										<label className="text-xs text-gray-600 block mb-1">
											Número de Referencia:
										</label>
										<Input
											value={editedLetter.referenceNumber}
											onChange={(e) => handleFieldChange("referenceNumber", e.target.value)}
											className="text-sm h-8"
											placeholder="SCPSA-ADM-00000/2025-09"
										/>
										{isReferenceManuallyEdited && (
											<div className="flex items-center mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
												<AlertTriangle className="h-3 w-3 mr-1" />
												<span>
													Número manual - no se generará automáticamente desde la base de
													datos
												</span>
											</div>
										)}
									</div>
								) : (
									<CardDescription>
										{letter.policies.length} póliza{letter.policies.length > 1 ? "s" : ""} • Ref:{" "}
										{letter.referenceNumber}
									</CardDescription>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-2">
						{letter.needsReview && (
							<Badge variant="destructive" className="text-xs">
								<AlertTriangle className="h-3 w-3 mr-1" />
								Revisar
							</Badge>
						)}
						{!letter.needsReview && (
							<Badge variant="default" className="text-xs bg-green-600">
								<CheckCircle className="h-3 w-3 mr-1" />
								Completo
							</Badge>
						)}
						<Badge variant={letter.templateType === "salud" ? "default" : "secondary"} className="text-xs">
							{letter.templateType.toUpperCase()}
						</Badge>
						<div className="flex space-x-1">
							{!isEditing ? (
								<>
									<Button size="sm" variant="outline" onClick={onEdit} disabled={isGenerating}>
										<Edit3 className="h-4 w-4" />
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={onPreview}
										disabled={isGenerating || isPreviewing || !isReferenceValid}
									>
										{isPreviewing ? (
											<RefreshCw className="h-4 w-4 animate-spin" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
									<Button
										size="sm"
										onClick={onDownload}
										disabled={isGenerating || !isReferenceValid}
										className="patria-btn-primary"
									>
										<Download className="h-4 w-4" />
									</Button>
									<Button
										size="sm"
										onClick={onWhatsApp}
										disabled={isGenerating || !letter.client.phone || !isReferenceValid}
										className="bg-green-500 hover:bg-green-600 text-white"
									>
										<WhatsAppIcon />
									</Button>
								</>
							) : (
								<>
									<Button size="sm" onClick={onSaveEdit} className="patria-btn-primary">
										<Save className="h-4 w-4" />
									</Button>
									<Button size="sm" variant="outline" onClick={onCancelEdit}>
										<X className="h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<div className="mb-4 p-3 bg-white rounded border">
					<h4 className="font-medium text-gray-900 mb-2">Información del Cliente</h4>
					{isEditing ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<label className="text-xs text-gray-600 mb-1 flex items-center">
									<Phone className="h-3 w-3 mr-1" />
									Teléfono
								</label>
								<Input
									value={editedLetter.client.phone || ""}
									onChange={(e) => handleClientInfoChange("phone", e.target.value)}
									placeholder="No especificado"
									className="text-sm h-8"
								/>
							</div>
							<div>
								<label className="text-xs text-gray-600 mb-1 flex items-center">
									<Mail className="h-3 w-3 mr-1" />
									Email
								</label>
								<Input
									value={editedLetter.client.email || ""}
									onChange={(e) => handleClientInfoChange("email", e.target.value)}
									placeholder="No especificado"
									className="text-sm h-8"
								/>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-gray-600">Teléfono:</span>{" "}
								{letter.client.phone || "No especificado"}
							</div>
							<div>
								<span className="text-gray-600">Email:</span> {letter.client.email || "No especificado"}
							</div>
						</div>
					)}
				</div>

				{isEditing && (
					<div className="mb-4 p-3 bg-white rounded border">
						<ConditionsTextarea
							label="Condiciones Adicionales (editable):"
							value={editedLetter.additionalConditions || ""}
							onChange={(v) => handleFieldChange("additionalConditions", v)}
							placeholder="Añade condiciones o notas aquí..."
							rows={6}
						/>
					</div>
				)}

				{/* Policies */}
				<div className="space-y-3">
					<h4 className="font-medium text-gray-900">Pólizas ({letter.policies.length})</h4>
					{editedLetter.policies.map((policy, index) => (
						<div key={index} className="p-3 bg-white rounded border">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
								<div>
									<div className="font-medium text-gray-900">{policy.company}</div>
									<div className="text-gray-600">Póliza: {policy.policyNumber}</div>
									<div className="text-gray-600">Vence: {policy.expiryDate}</div>
									<div className="text-gray-600">
										Ramo: {policy.manualFields?.branch || policy.branch}
										{policy.manualFields?.branch &&
											policy.manualFields.originalBranch &&
											policy.manualFields.branch !== policy.manualFields.originalBranch && (
												<span className="ml-1 text-yellow-600 text-xs">(editado)</span>
											)}
									</div>
								</div>
								<div>
									{letter.templateType === "automotor" && (
										<div className="mt-1">
											<div className="text-gray-600">Vehículos Originales:</div>
											<ul className="list-disc list-inside pl-2 italic text-gray-500">
												{(policy.manualFields?.originalVehicles || []).map((v, i) => (
													<li key={i}>{v.description}</li>
												))}
											</ul>
										</div>
									)}
								</div>
								<div className="space-y-2 md:col-span-3">
									{isEditing ? (
										<>
											<div className="mb-4">
												<EditableRamoInput
													label="Ramo (editable):"
													value={policy.manualFields?.branch || policy.branch}
													originalRamo={policy.manualFields?.originalBranch || policy.branch}
													onValueChange={(newBranch) =>
														updatePolicy(index, "branch", newBranch)
													}
													placeholder="Nombre del ramo de seguros"
													className="text-xs h-8"
												/>
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{letter.templateType === "salud" ? (
													<>
														<div className="space-y-2">
															<InsuredMembersWithTypeEditor
																label="Asegurados con tipo de beneficiario:"
																members={
																	policy.manualFields?.insuredMembersWithType || []
																}
																onChange={(newMembers) =>
																	updatePolicy(
																		index,
																		"insuredMembersWithType",
																		newMembers
																	)
																}
															/>
														</div>
														<div className="space-y-2">
															<NumericInputWithCurrency
																label="Valor asegurado TOTAL:"
																value={policy.manualFields?.insuredValue}
																currency={
																	policy.manualFields?.insuredValueCurrency || "Bs."
																}
																originalValue={policy.manualFields?.originalInsuredValue}
																originalCurrency={
																	policy.manualFields?.originalInsuredValueCurrency
																}
																onValueChange={(v) =>
																	updatePolicy(index, "insuredValue", v)
																}
																onCurrencyChange={(c) =>
																	updatePolicy(index, "insuredValueCurrency", c)
																}
																placeholder="0.00"
																className="text-xs h-8"
															/>
														</div>
													</>
												) : letter.templateType === "automotor" ? (
													<>
														<div className="space-y-2">
															<VehicleEditor
																label="Vehículos Asegurados (editable):"
																vehicles={policy.manualFields?.vehicles || []}
																onChange={(newVehicles) =>
																	updatePolicyVehicles(index, newVehicles)
																}
															/>
														</div>
														<div className="space-y-2">
															<NumericInputWithCurrency
																label="Valor Asegurado TOTAL:"
																value={policy.manualFields?.insuredValue}
																currency={
																	policy.manualFields?.insuredValueCurrency || "$us."
																}
																originalValue={policy.manualFields?.originalInsuredValue}
																originalCurrency={
																	policy.manualFields?.originalInsuredValueCurrency
																}
																onValueChange={(v) =>
																	updatePolicy(index, "insuredValue", v)
																}
																onCurrencyChange={(c) =>
																	updatePolicy(index, "insuredValueCurrency", c)
																}
																placeholder="0.00"
																className="text-xs h-8"
															/>
															<ConditionsTextarea
																label="Deducibles:"
																value={policy.manualFields?.deductibles || ""}
																onChange={(v) => updatePolicy(index, "deductibles", v)}
																placeholder="Ej: 10% del valor asegurado, mínimo Bs. 5,000"
																rows={2}
															/>
															<NumericInputWithCurrency
																label="Extraterritorialidad:"
																value={policy.manualFields?.territoriality}
																currency={
																	policy.manualFields?.territorialityCurrency || "Bs."
																}
																onValueChange={(v) =>
																	updatePolicy(index, "territoriality", v)
																}
																onCurrencyChange={(c) =>
																	updatePolicy(index, "territorialityCurrency", c)
																}
																placeholder="0.00"
																className="text-xs h-8"
															/>
															<ConditionsTextarea
																label="Condiciones específicas:"
																value={policy.manualFields?.specificConditions || ""}
																onChange={(v) =>
																	updatePolicy(index, "specificConditions", v)
																}
																placeholder="Condiciones adicionales..."
																rows={2}
															/>
														</div>
													</>
												) : (
													// General Template
													<>
														<div className="space-y-2">
															<ConditionsTextarea
																label="Materia Asegurada (editable):"
																value={policy.manualFields?.insuredMatter || ""}
																onChange={(v) =>
																	updatePolicy(index, "insuredMatter", v)
																}
																placeholder="Detalle la materia asegurada..."
																rows={2}
															/>
														</div>
														<div className="space-y-2">
															<NumericInputWithCurrency
																label="Valor Asegurado TOTAL:"
																value={policy.manualFields?.insuredValue}
																currency={
																	policy.manualFields?.insuredValueCurrency || "Bs."
																}
																originalCurrency={
																	policy.manualFields?.originalInsuredValueCurrency
																}
																onValueChange={(v) =>
																	updatePolicy(index, "insuredValue", v)
																}
																onCurrencyChange={(c) =>
																	updatePolicy(index, "insuredValueCurrency", c)
																}
																placeholder="0.00"
																className="text-xs h-8"
															/>
															<ConditionsTextarea
																label="Condiciones específicas:"
																value={policy.manualFields?.specificConditions || ""}
																onChange={(v) =>
																	updatePolicy(index, "specificConditions", v)
																}
																placeholder="Condiciones adicionales..."
																rows={2}
															/>
														</div>
													</>
												)}
											</div>
										</>
									) : (
										<div className="text-xs space-y-1">
											{letter.templateType === "salud" ? (
												<>
													{policy.manualFields?.insuredValue !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Valor asegurado:{" "}
															{formatMonetaryValue(
																policy.manualFields.insuredValue,
																policy.manualFields.insuredValueCurrency
															)}
														</div>
													)}
													{((policy.manualFields?.insuredMembersWithType &&
														policy.manualFields.insuredMembersWithType.length > 0) ||
														(policy.insuredMembers &&
															policy.insuredMembers.length > 0)) && (
														<div>
															<div className="text-green-700 font-medium">
																✓ Asegurados:
															</div>
															<ul className="list-disc list-inside pl-2">
																{policy.manualFields?.insuredMembersWithType &&
																policy.manualFields.insuredMembersWithType.length > 0
																	? policy.manualFields.insuredMembersWithType.map(
																			(member, i) => (
																				<li key={i}>
																					{member.name} (
																					{member.beneficiaryType})
																				</li>
																			)
																	  )
																	: policy.insuredMembers?.map((member, i) => (
																			<li key={i}>{member}</li>
																	  ))}
															</ul>
														</div>
													)}
												</>
											) : letter.templateType === "automotor" ? (
												<>
													{policy.manualFields?.insuredValue !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Valor Asegurado:{" "}
															{formatMonetaryValue(
																policy.manualFields.insuredValue,
																policy.manualFields.insuredValueCurrency
															)}
														</div>
													)}
													<div className="text-green-700 font-medium">✓ Vehículos:</div>
													<ul className="list-disc list-inside pl-2">
														{(policy.manualFields?.vehicles || []).map((v, i) => (
															<li key={i}>
																{v.description} - Asegurado:{" "}
																{v.currency === "Bs."
																	? `Bs. ${v.insuredValue.toLocaleString("es-BO", {
																			minimumFractionDigits: 2,
																	  })}`
																	: `$us. ${v.insuredValue.toLocaleString("es-BO", {
																			minimumFractionDigits: 2,
																	  })}`}
															</li>
														))}
													</ul>
													{policy.manualFields?.deductibles && (
														<div className="text-green-700 font-medium">
															✓ Deducibles: {policy.manualFields.deductibles}
														</div>
													)}
													{policy.manualFields?.territoriality !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Extraterritorialidad:{" "}
															{formatMonetaryValue(
																policy.manualFields.territoriality,
																policy.manualFields.territorialityCurrency
															)}
														</div>
													)}
													{policy.manualFields?.specificConditions && (
														<div className="text-green-700 font-medium">
															✓ Condiciones: {policy.manualFields.specificConditions}
														</div>
													)}
												</>
											) : (
												// General Template
												<>
													{policy.manualFields?.insuredValue !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Valor Asegurado:{" "}
															{formatMonetaryValue(
																policy.manualFields.insuredValue,
																policy.manualFields.insuredValueCurrency
															)}
														</div>
													)}
													{policy.manualFields?.insuredMatter && (
														<div className="text-green-700 font-medium">
															✓ Materia Asegurada: {policy.manualFields.insuredMatter}
														</div>
													)}
													{policy.manualFields?.specificConditions && (
														<div className="text-green-700 font-medium">
															✓ Condiciones: {policy.manualFields.specificConditions}
														</div>
													)}
												</>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>

				{letter.missingData.length > 0 && (
					<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
						<div className="flex items-center mb-2">
							<AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
							<span className="font-medium text-red-800">Datos faltantes a completar:</span>
						</div>
						<ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
							{letter.missingData.slice(0, 5).map((item, index) => (
								<li key={index}>{item}</li>
							))}
							{letter.missingData.length > 5 && <li>... y {letter.missingData.length - 5} más</li>}
						</ul>
					</div>
				)}

				{!letter.needsReview && (
					<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
						<div className="flex items-center">
							<CheckCircle className="h-4 w-4 text-green-600 mr-2" />
							<span className="font-medium text-green-800">
								Todos los datos necesarios están completos. Lista para generar.
							</span>
						</div>
					</div>
				)}

				<div className="mt-4 pt-3 border-t border-gray-200 text-sm text-gray-600">
					<span className="font-medium">Ejecutivo:</span> {letter.executive}
				</div>
			</CardContent>
		</Card>
	);
}
