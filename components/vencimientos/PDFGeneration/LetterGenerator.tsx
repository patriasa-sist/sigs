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
import { LetterData, GeneratedLetter, PDFGenerationResult, PolicyForLetter, VehicleForLetter } from "@/types/pdf";
import {
	groupRecordsForLetters,
	validateRecordForPDF,
	generateFileName,
	formatUSD,
	detectMissingData,
} from "@/utils/pdfutils";
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

// Componente para input numérico con selección de moneda
interface NumericInputWithCurrencyProps {
	value: number | undefined;
	currency: "Bs." | "$us.";
	onValueChange: (value: number) => void;
	onCurrencyChange: (currency: "Bs." | "$us.") => void;
	label?: string;
	placeholder?: string;
	className?: string;
}

function NumericInputWithCurrency({
	value,
	currency,
	onValueChange,
	onCurrencyChange,
	label,
	placeholder,
	className,
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
					className={className}
				/>
				<Select value={currency} onValueChange={(val: "Bs." | "$us.") => onCurrencyChange(val)}>
					<SelectTrigger className="w-20 h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="Bs.">Bs.</SelectItem>
						<SelectItem value="$us.">$us.</SelectItem>
					</SelectContent>
				</Select>
			</div>
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

// Componente para editar la lista de asegurados (Salud)
interface InsuredMembersEditorProps {
	members: string[];
	onChange: (newMembers: string[]) => void;
	label?: string;
}

function InsuredMembersEditor({ members, onChange, label }: InsuredMembersEditorProps) {
	// ... (sin cambios en este componente)
	const handleMemberChange = (index: number, value: string) => {
		const newMembers = [...members];
		newMembers[index] = value;
		onChange(newMembers);
	};

	const addMember = () => {
		onChange([...members, ""]);
	};

	const removeMember = (index: number) => {
		const newMembers = members.filter((_, i) => i !== index);
		onChange(newMembers);
	};

	return (
		<div>
			{label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
			<div className="space-y-2">
				{members.map((member, index) => (
					<div key={index} className="flex items-center space-x-2">
						<Input
							type="text"
							value={member}
							onChange={(e) => handleMemberChange(index, e.target.value)}
							className="text-xs h-8 flex-grow"
							placeholder={`Asegurado ${index + 1}`}
						/>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={() => removeMember(index)}
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
	// ... (sin cambios en este componente)
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
				declaredValue: 0,
				insuredValue: 0,
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
						<div className="grid grid-cols-2 gap-2">
							<NumericInput
								label="Valor Declarado ($us.)"
								value={vehicle.declaredValue}
								onChange={(v) => handleVehicleChange(index, "declaredValue", v)}
								className="text-xs h-8"
								placeholder="0.00"
							/>
							<NumericInput
								label="Valor Asegurado ($us.)"
								value={vehicle.insuredValue}
								onChange={(v) => handleVehicleChange(index, "insuredValue", v)}
								className="text-xs h-8"
								placeholder="0.00"
							/>
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

	const preparedLetters = useMemo(() => {
		// ... (sin cambios en esta sección)
		const validRecords: ProcessedInsuranceRecord[] = [];
		const validationErrors: string[] = [];

		selectedRecords.forEach((record, index) => {
			const validation = validateRecordForPDF(record);
			if (validation.valid) {
				validRecords.push(record);
			} else {
				validationErrors.push(`Registro ${index + 1} (${record.asegurado}): ${validation.errors.join(", ")}`);
			}
		});

		const groupedLetters = groupRecordsForLetters(validRecords);
		return {
			letters: groupedLetters,
			validRecords: validRecords.length,
			totalRecords: selectedRecords.length,
			validationErrors,
		};
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

	const generateSinglePDF = async (letterData: LetterData): Promise<Blob> => {
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

	// ... (sin cambios en handlePreview, downloadBlob, handleDownloadSingle, handleDownloadAll, handleSendWhatsApp)
	const handlePreview = async (letterId: string) => {
		setPreviewLetter(letterId);
		const letter = letters.find((l) => l.id === letterId);
		if (letter) {
			try {
				const pdfBlob = await generateSinglePDF(letter);
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
			const pdfBlob = await generateSinglePDF(letter);
			const fileName = generateFileName(letter.client.name, letter.templateType);
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
				if (letter.referenceNumber.includes("____")) {
					errors.push(`Error: Número de referencia no válido para ${letter.client.name}.`);
					continue;
				}
				try {
					const pdfBlob = await generateSinglePDF(letter);
					const fileName = generateFileName(letter.client.name, letter.templateType);

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
			const pdfBlob = await generateSinglePDF(letter);
			const fileName = generateFileName(letter.client.name, letter.templateType);
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

	const isReferenceValid = useMemo(
		() => letter.referenceNumber && !letter.referenceNumber.includes("____"),
		[letter.referenceNumber]
	);

	useEffect(() => {
		setEditedLetter(letter);
	}, [letter]);

	const handleFieldChange = <K extends keyof LetterData>(field: K, value: LetterData[K]) => {
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
		value: string | number | string[] | VehicleForLetter[]
	) => {
		const updatedPolicies = editedLetter.policies.map((policy, index) => {
			if (index === policyIndex) {
				const updatedManualFields = {
					...policy.manualFields,
					[field]: value,
				};
				if (field === "insuredMembers") {
					return { ...policy, insuredMembers: value as string[], manualFields: updatedManualFields };
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
											placeholder="SCPSA-____/2025"
										/>
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
									<div className="text-gray-600">Ramo: {policy.branch}</div>
								</div>
								<div>
									<div className="text-gray-600">
										Prima Original:{" "}
										{formatMonetaryValue(policy.manualFields?.originalPremium, "Bs.")}
									</div>
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
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{letter.templateType === "salud" ? (
												<>
													<div className="space-y-2">
														<InsuredMembersEditor
															label="Asegurados (editable):"
															members={policy.manualFields?.insuredMembers || []}
															onChange={(newMembers) =>
																updatePolicy(index, "insuredMembers", newMembers)
															}
														/>
													</div>
													<div className="space-y-2">
														<NumericInputWithCurrency
															label="Prima renovación:"
															value={policy.manualFields?.renewalPremium}
															currency={
																policy.manualFields?.renewalPremiumCurrency || "$us."
															}
															onValueChange={(v) =>
																updatePolicy(index, "renewalPremium", v)
															}
															onCurrencyChange={(c) =>
																updatePolicy(index, "renewalPremiumCurrency", c)
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
															label="Valor Asegurado:"
															value={policy.manualFields?.premium}
															currency={policy.manualFields?.premiumCurrency || "Bs."}
															onValueChange={(v) => updatePolicy(index, "premium", v)}
															onCurrencyChange={(c) =>
																updatePolicy(index, "premiumCurrency", c)
															}
															placeholder="0.00"
															className="text-xs h-8"
														/>
														<NumericInputWithCurrency
															label="Deducibles:"
															value={policy.manualFields?.deductibles}
															currency={policy.manualFields?.deductiblesCurrency || "Bs."}
															onValueChange={(v) => updatePolicy(index, "deductibles", v)}
															onCurrencyChange={(c) =>
																updatePolicy(index, "deductiblesCurrency", c)
															}
															placeholder="0.00"
															className="text-xs h-8"
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
															onChange={(v) => updatePolicy(index, "insuredMatter", v)}
															placeholder="Detalle la materia asegurada..."
															rows={2}
														/>
													</div>
													<div className="space-y-2">
														<NumericInputWithCurrency
															label="Valor Asegurado:"
															value={policy.manualFields?.premium}
															currency={policy.manualFields?.premiumCurrency || "Bs."}
															onValueChange={(v) => updatePolicy(index, "premium", v)}
															onCurrencyChange={(c) =>
																updatePolicy(index, "premiumCurrency", c)
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
									) : (
										<div className="text-xs space-y-1">
											{letter.templateType === "salud" ? (
												<>
													{policy.manualFields?.renewalPremium !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Prima renovación:{" "}
															{formatMonetaryValue(
																policy.manualFields.renewalPremium,
																policy.manualFields.renewalPremiumCurrency
															)}
														</div>
													)}
													{policy.insuredMembers && policy.insuredMembers.length > 0 && (
														<div>
															<div className="text-green-700 font-medium">
																✓ Asegurados:
															</div>
															<ul className="list-disc list-inside pl-2">
																{policy.insuredMembers.map((member, i) => (
																	<li key={i}>{member}</li>
																))}
															</ul>
														</div>
													)}
												</>
											) : letter.templateType === "automotor" ? (
												<>
													{policy.manualFields?.premium !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Valor Asegurado:{" "}
															{formatMonetaryValue(
																policy.manualFields.premium,
																policy.manualFields.premiumCurrency
															)}
														</div>
													)}
													<div className="text-green-700 font-medium">✓ Vehículos:</div>
													<ul className="list-disc list-inside pl-2">
														{(policy.manualFields?.vehicles || []).map((v, i) => (
															<li key={i}>
																{v.description} - Declarado:{" "}
																{formatUSD(v.declaredValue)} / Asegurado:{" "}
																{formatUSD(v.insuredValue)}
															</li>
														))}
													</ul>
													{policy.manualFields?.deductibles !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Deducibles:{" "}
															{formatMonetaryValue(
																policy.manualFields.deductibles,
																policy.manualFields.deductiblesCurrency
															)}
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
													{policy.manualFields?.premium !== undefined && (
														<div className="text-green-700 font-medium">
															✓ Valor Asegurado:{" "}
															{formatMonetaryValue(
																policy.manualFields.premium,
																policy.manualFields.premiumCurrency
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
								Todos los datos están completos. Lista para generar.
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
