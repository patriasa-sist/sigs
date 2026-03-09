"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ExtraPhone, type PhoneLabel, PHONE_LABELS } from "@/types/clientForm";

const LABEL_DISPLAY: Record<PhoneLabel, string> = {
	personal: "Personal",
	trabajo: "Trabajo",
	casa: "Casa",
	whatsapp: "WhatsApp",
	otro: "Otro",
};

interface ExtraPhonesInputProps {
	phones: ExtraPhone[];
	onChange: (phones: ExtraPhone[]) => void;
	disabled?: boolean;
}

export function ExtraPhonesInput({ phones, onChange, disabled = false }: ExtraPhonesInputProps) {
	const addPhone = () => {
		onChange([...phones, { numero: "", etiqueta: "otro" }]);
	};

	const removePhone = (index: number) => {
		onChange(phones.filter((_, i) => i !== index));
	};

	const updatePhone = (index: number, field: keyof ExtraPhone, value: string) => {
		const updated = phones.map((p, i) =>
			i === index ? { ...p, [field]: value } : p
		);
		onChange(updated);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-medium">Celulares Adicionales</Label>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addPhone}
					disabled={disabled}
				>
					<Plus className="h-3.5 w-3.5 mr-1" />
					Agregar
				</Button>
			</div>

			{phones.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No hay celulares adicionales registrados.
				</p>
			)}

			{phones.map((phone, index) => (
				<div key={index} className="flex items-start gap-2">
					<div className="flex-1">
						<Input
							placeholder="Solo números, min. 5 dígitos"
							value={phone.numero}
							onChange={(e) => {
								const val = e.target.value.replace(/\D/g, "");
								updatePhone(index, "numero", val);
							}}
							disabled={disabled}
						/>
						{phone.numero.length > 0 && phone.numero.length < 5 && (
							<p className="text-xs text-red-500 mt-0.5">Mínimo 5 dígitos</p>
						)}
					</div>
					<Select
						value={phone.etiqueta}
						onValueChange={(val) => updatePhone(index, "etiqueta", val)}
						disabled={disabled}
					>
						<SelectTrigger className="w-[130px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PHONE_LABELS.map((label) => (
								<SelectItem key={label} value={label}>
									{LABEL_DISPLAY[label]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => removePhone(index)}
						disabled={disabled}
						className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			))}
		</div>
	);
}
