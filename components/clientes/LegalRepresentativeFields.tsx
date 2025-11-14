"use client";

import { UseFormReturn } from "react-hook-form";
import { JuridicClientFormData } from "@/types/clientForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LegalRepresentativeFieldsProps {
	form: UseFormReturn<JuridicClientFormData>;
	index: number;
	canRemove: boolean;
	onRemove: () => void;
}

export function LegalRepresentativeFields({
	form,
	index,
	canRemove,
	onRemove,
}: LegalRepresentativeFieldsProps) {
	const {
		register,
		formState: { errors },
	} = form;

	const repErrors = errors.legal_representatives?.[index];

	return (
		<Card className="p-4 relative">
			{canRemove && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onRemove}
					className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			)}

			<h4 className="font-medium mb-4 text-sm text-muted-foreground">
				Representante Legal {index + 1}
			</h4>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Nombre Completo */}
				<div className="md:col-span-2">
					<Label htmlFor={`rep-${index}-nombre`}>
						Nombre Completo <span className="text-red-500">*</span>
					</Label>
					<Input
						id={`rep-${index}-nombre`}
						{...register(`legal_representatives.${index}.nombre_completo`)}
						placeholder="Juan Pérez García"
					/>
					{repErrors?.nombre_completo && (
						<p className="text-sm text-red-500 mt-1">{repErrors.nombre_completo.message}</p>
					)}
				</div>

				{/* CI */}
				<div>
					<Label htmlFor={`rep-${index}-ci`}>
						CI <span className="text-red-500">*</span>
					</Label>
					<Input
						id={`rep-${index}-ci`}
						{...register(`legal_representatives.${index}.ci`)}
						placeholder="1234567"
					/>
					{repErrors?.ci && <p className="text-sm text-red-500 mt-1">{repErrors.ci.message}</p>}
				</div>

				{/* Cargo */}
				<div>
					<Label htmlFor={`rep-${index}-cargo`}>
						Cargo <span className="text-red-500">*</span>
					</Label>
					<Input
						id={`rep-${index}-cargo`}
						{...register(`legal_representatives.${index}.cargo`)}
						placeholder="Gerente General"
					/>
					{repErrors?.cargo && (
						<p className="text-sm text-red-500 mt-1">{repErrors.cargo.message}</p>
					)}
				</div>

				{/* Teléfono */}
				<div>
					<Label htmlFor={`rep-${index}-telefono`}>
						Teléfono <span className="text-red-500">*</span>
					</Label>
					<Input
						id={`rep-${index}-telefono`}
						{...register(`legal_representatives.${index}.telefono`)}
						placeholder="70123456"
					/>
					{repErrors?.telefono && (
						<p className="text-sm text-red-500 mt-1">{repErrors.telefono.message}</p>
					)}
				</div>

				{/* Email */}
				<div>
					<Label htmlFor={`rep-${index}-email`}>
						Email <span className="text-red-500">*</span>
					</Label>
					<Input
						id={`rep-${index}-email`}
						type="email"
						{...register(`legal_representatives.${index}.email`)}
						placeholder="representante@empresa.com"
					/>
					{repErrors?.email && (
						<p className="text-sm text-red-500 mt-1">{repErrors.email.message}</p>
					)}
				</div>
			</div>
		</Card>
	);
}
