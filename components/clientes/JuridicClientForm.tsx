"use client";

import { UseFormReturn, Controller, useFieldArray } from "react-hook-form";
import { JuridicClientFormData, Executive } from "@/types/clientForm";
import { FormSection } from "./FormSection";
import { LegalRepresentativeFields } from "./LegalRepresentativeFields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus } from "lucide-react";

interface JuridicClientFormProps {
	form: UseFormReturn<JuridicClientFormData>;
	executives: Executive[];
	onFieldBlur?: () => void;
}

export function JuridicClientForm({ form, executives, onFieldBlur }: JuridicClientFormProps) {
	const {
		register,
		control,
		formState: { errors },
		watch,
	} = form;

	const { fields, append, remove } = useFieldArray({
		control,
		name: "legal_representatives",
	});

	// Watch company data fields to determine completion
	const companyFields = watch([
		"razon_social",
		"nit",
		"direccion",
		"telefono",
		"email",
		"fecha_constitucion",
		"actividad_economica",
		"executive_id",
	]);

	const companyComplete =
		companyFields.every((field) => field !== undefined && field !== "" && field !== null) &&
		companyFields.length === 8;

	// Watch representatives for completion
	const representatives = watch("legal_representatives");
	const representativesComplete = representatives && representatives.length > 0;

	const handleAddRepresentative = () => {
		append({
			nombre_completo: "",
			ci: "",
			cargo: "",
			telefono: "",
			email: "",
		});
	};

	return (
		<div className="space-y-6">
			{/* Company Data Section */}
			<FormSection
				title="Datos de la Empresa"
				description="Información requerida de la persona jurídica"
				required
				completed={companyComplete}
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Razón Social */}
					<div className="md:col-span-2">
						<Label htmlFor="razon_social">
							Razón Social <span className="text-red-500">*</span>
						</Label>
						<Input
							id="razon_social"
							{...register("razon_social")}
							onBlur={onFieldBlur}
							placeholder="Empresa ABC S.R.L."
						/>
						{errors.razon_social && (
							<p className="text-sm text-red-500 mt-1">{errors.razon_social.message}</p>
						)}
					</div>

					{/* NIT */}
					<div>
						<Label htmlFor="nit">
							NIT <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nit"
							{...register("nit")}
							onBlur={onFieldBlur}
							placeholder="1234567890"
						/>
						{errors.nit && <p className="text-sm text-red-500 mt-1">{errors.nit.message}</p>}
					</div>

					{/* Fecha de Constitución */}
					<div>
						<Label htmlFor="fecha_constitucion">
							Fecha de Constitución <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="fecha_constitucion"
							control={control}
							render={({ field }) => (
								<DatePicker
									date={field.value}
									onSelect={(date) => {
										field.onChange(date);
										onFieldBlur?.();
									}}
									placeholder="DD-MM-AAAA"
								/>
							)}
						/>
						{errors.fecha_constitucion && (
							<p className="text-sm text-red-500 mt-1">{errors.fecha_constitucion.message}</p>
						)}
					</div>

					{/* Dirección */}
					<div className="md:col-span-2">
						<Label htmlFor="direccion">
							Dirección <span className="text-red-500">*</span>
						</Label>
						<Input
							id="direccion"
							{...register("direccion")}
							onBlur={onFieldBlur}
							placeholder="Av. Principal #123, Zona Centro"
						/>
						{errors.direccion && (
							<p className="text-sm text-red-500 mt-1">{errors.direccion.message}</p>
						)}
					</div>

					{/* Teléfono */}
					<div>
						<Label htmlFor="telefono">
							Teléfono <span className="text-red-500">*</span>
						</Label>
						<Input
							id="telefono"
							{...register("telefono")}
							onBlur={onFieldBlur}
							placeholder="2123456"
						/>
						{errors.telefono && (
							<p className="text-sm text-red-500 mt-1">{errors.telefono.message}</p>
						)}
					</div>

					{/* Email */}
					<div>
						<Label htmlFor="email">
							Email <span className="text-red-500">*</span>
						</Label>
						<Input
							id="email"
							type="email"
							{...register("email")}
							onBlur={onFieldBlur}
							placeholder="contacto@empresa.com"
						/>
						{errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
					</div>

					{/* Actividad Económica */}
					<div className="md:col-span-2">
						<Label htmlFor="actividad_economica">
							Actividad Económica <span className="text-red-500">*</span>
						</Label>
						<Input
							id="actividad_economica"
							{...register("actividad_economica")}
							onBlur={onFieldBlur}
							placeholder="Comercio al por mayor"
						/>
						{errors.actividad_economica && (
							<p className="text-sm text-red-500 mt-1">{errors.actividad_economica.message}</p>
						)}
					</div>

					{/* Ejecutivo a Cargo */}
					<div className="md:col-span-2">
						<Label htmlFor="executive_id">
							Ejecutivo a Cargo <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="executive_id"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value}
									onValueChange={(value) => {
										field.onChange(value);
										onFieldBlur?.();
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar ejecutivo" />
									</SelectTrigger>
									<SelectContent>
										{executives.map((exec) => (
											<SelectItem key={exec.id} value={exec.id}>
												{exec.full_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.executive_id && (
							<p className="text-sm text-red-500 mt-1">{errors.executive_id.message}</p>
						)}
					</div>
				</div>
			</FormSection>

			{/* Legal Representatives Section */}
			<FormSection
				title="Representantes Legales"
				description="Al menos un representante legal es requerido"
				required
				completed={representativesComplete}
			>
				<div className="space-y-4">
					{fields.map((field, index) => (
						<LegalRepresentativeFields
							key={field.id}
							form={form}
							index={index}
							canRemove={fields.length > 1}
							onRemove={() => remove(index)}
						/>
					))}

					<Button type="button" onClick={handleAddRepresentative} variant="outline" className="w-full">
						<Plus className="h-4 w-4 mr-2" />
						Agregar Otro Representante
					</Button>

					{errors.legal_representatives?.root && (
						<p className="text-sm text-red-500 mt-1">{errors.legal_representatives.root.message}</p>
					)}
				</div>
			</FormSection>
		</div>
	);
}
