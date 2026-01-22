"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CIVIL_STATUS,
	DOCUMENT_TYPES,
	CI_EXTENSIONS,
	GENDER_OPTIONS,
	COMPANY_TYPES,
	type CivilStatus,
	type DocumentType,
	type Gender,
	type CompanyType,
} from "@/types/clientForm";

// ============================================
// TYPES
// ============================================

interface BaseFieldProps {
	isEditing: boolean;
	label: string;
	value: string | number | null | undefined;
}

interface TextFieldProps extends BaseFieldProps {
	type?: "text" | "email" | "tel" | "date" | "number";
	onChange?: (value: string) => void;
	required?: boolean;
	placeholder?: string;
	maxLength?: number;
}

interface SelectFieldProps extends BaseFieldProps {
	options: readonly string[] | Array<{ value: string; label: string }>;
	onChange?: (value: string) => void;
	required?: boolean;
	placeholder?: string;
}

interface TextareaFieldProps extends BaseFieldProps {
	onChange?: (value: string) => void;
	rows?: number;
	maxLength?: number;
}

// ============================================
// HELPER: Display value formatting
// ============================================

function formatDisplayValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined || value === "") {
		return "-";
	}
	return String(value);
}

// ============================================
// EDITABLE TEXT FIELD
// ============================================

export function EditableTextField({
	isEditing,
	label,
	value,
	type = "text",
	onChange,
	required = false,
	placeholder,
	maxLength,
}: TextFieldProps) {
	if (!isEditing) {
		return (
			<div className="grid grid-cols-3 gap-4">
				<p className="text-sm text-gray-600">{label}:</p>
				<p className="col-span-2 font-medium">{formatDisplayValue(value)}</p>
			</div>
		);
	}

	return (
		<div className="space-y-1">
			<Label className="text-sm">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</Label>
			<Input
				type={type}
				value={value ?? ""}
				onChange={(e) => onChange?.(e.target.value)}
				placeholder={placeholder}
				maxLength={maxLength}
				required={required}
			/>
		</div>
	);
}

// ============================================
// EDITABLE SELECT FIELD
// ============================================

export function EditableSelectField({
	isEditing,
	label,
	value,
	options,
	onChange,
	required = false,
	placeholder = "Seleccionar...",
}: SelectFieldProps) {
	// Normalize options to array of {value, label}
	const normalizedOptions = options.map((opt) => {
		if (typeof opt === "string") {
			return { value: opt, label: opt };
		}
		return opt;
	});

	if (!isEditing) {
		const selectedOption = normalizedOptions.find(
			(opt) => opt.value === value
		);
		return (
			<div className="grid grid-cols-3 gap-4">
				<p className="text-sm text-gray-600">{label}:</p>
				<p className="col-span-2 font-medium">
					{selectedOption?.label || formatDisplayValue(value)}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-1">
			<Label className="text-sm">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</Label>
			<Select value={String(value ?? "")} onValueChange={onChange}>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{normalizedOptions.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

// ============================================
// EDITABLE TEXTAREA FIELD
// ============================================

export function EditableTextareaField({
	isEditing,
	label,
	value,
	onChange,
	rows = 2,
	maxLength,
}: TextareaFieldProps) {
	if (!isEditing) {
		return (
			<div className="grid grid-cols-3 gap-4">
				<p className="text-sm text-gray-600">{label}:</p>
				<p className="col-span-2 font-medium whitespace-pre-wrap">
					{formatDisplayValue(value)}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-1">
			<Label className="text-sm">{label}</Label>
			<Textarea
				value={value ?? ""}
				onChange={(e) => onChange?.(e.target.value)}
				rows={rows}
				maxLength={maxLength}
			/>
		</div>
	);
}

// ============================================
// PREDEFINED SELECT OPTIONS
// ============================================

export const documentTypeOptions = DOCUMENT_TYPES.map((type) => ({
	value: type,
	label: type.toUpperCase(),
}));

export const civilStatusOptions: Array<{ value: CivilStatus; label: string }> = [
	{ value: "soltero", label: "Soltero/a" },
	{ value: "casado", label: "Casado/a" },
	{ value: "divorciado", label: "Divorciado/a" },
	{ value: "viudo", label: "Viudo/a" },
];

export const genderOptions: Array<{ value: Gender; label: string }> = [
	{ value: "masculino", label: "Masculino" },
	{ value: "femenino", label: "Femenino" },
	{ value: "otro", label: "Otro" },
];

export const ciExtensionOptions = CI_EXTENSIONS.map((ext) => ({
	value: ext,
	label: ext,
}));

export const companyTypeOptions: Array<{ value: CompanyType; label: string }> = [
	{ value: "SRL", label: "SRL - Sociedad de Responsabilidad Limitada" },
	{ value: "SA", label: "SA - Sociedad Anónima" },
	{ value: "SCS", label: "SCS - Sociedad en Comandita Simple" },
	{ value: "SCA", label: "SCA - Sociedad en Comandita por Acciones" },
	{ value: "SCO", label: "SCO - Sociedad Colectiva" },
	{ value: "AAP", label: "AAP - Asociación Accidental o de Participación" },
	{ value: "SEM", label: "SEM - Sociedad de Economía Mixta" },
	{ value: "LIM", label: "LIM - Sucursal de Sociedad Extranjera" },
	{ value: "EPB", label: "EPB - Empresa Pública" },
	{ value: "UNI", label: "UNI - Empresa Unipersonal" },
	{ value: "MIC", label: "MIC - Microempresa" },
	{ value: "FUN", label: "FUN - Fundación" },
	{ value: "SCI", label: "SCI - Sociedad Civil" },
	{ value: "IED", label: "IED - Institución Educativa" },
	{ value: "ORR", label: "ORR - ONG / Organización" },
];

// ============================================
// SECTION WRAPPER
// ============================================

interface EditableSectionProps {
	title: string;
	children: React.ReactNode;
	isEditing?: boolean;
}

export function EditableSection({ title, children, isEditing }: EditableSectionProps) {
	return (
		<div className="border rounded-lg p-4">
			<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
				{title}
				{isEditing && (
					<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
						Editando
					</span>
				)}
			</h3>
			<div className={isEditing ? "space-y-4" : "space-y-3"}>{children}</div>
		</div>
	);
}

// ============================================
// EXPORTS FOR CONVENIENCE
// ============================================

export {
	CIVIL_STATUS,
	DOCUMENT_TYPES,
	CI_EXTENSIONS,
	GENDER_OPTIONS,
	COMPANY_TYPES,
};
