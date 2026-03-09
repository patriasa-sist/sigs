"use client";

import React from "react";
import { UseFormReturn, Controller, useFieldArray } from "react-hook-form";
import { JuridicClientFormData, DOCUMENT_TYPES, COMPANY_TYPES, type ExtraPhone } from "@/types/clientForm";
import type { ClienteDocumentoFormState } from "@/types/clienteDocumento";
import { FormSection } from "./FormSection";
import { ExtraPhonesInput } from "./ExtraPhonesInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { DirectorCarteraDropdown } from "@/components/shared/DirectorCarteraDropdown";
import { ClienteDocumentUpload } from "./ClienteDocumentUpload";

interface JuridicClientFormProps {
	form: UseFormReturn<JuridicClientFormData>;
	onFieldBlur?: () => void;
}

export function JuridicClientForm({ form, onFieldBlur }: JuridicClientFormProps) {
	const {
		register,
		control,
		formState: { errors },
		watch,
		setValue,
	} = form;

	// Helper: register + auto-uppercase for text inputs
	const ur = (name: Parameters<typeof register>[0], options?: Parameters<typeof register>[1]) => {
		const { onChange, ...rest } = register(name, options);
		return {
			...rest,
			onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
				const start = e.target.selectionStart;
				const end = e.target.selectionEnd;
				e.target.value = e.target.value.toUpperCase();
				e.target.setSelectionRange(start, end);
				return onChange(e);
			},
		};
	};

	const { fields, append, remove } = useFieldArray({
		control,
		name: "legal_representatives",
	});

	const handleAddRepresentative = () => {
		append({
			primer_nombre: "",
			segundo_nombre: "",
			primer_apellido: "",
			segundo_apellido: "",
			tipo_documento: "ci",
			numero_documento: "",
			extension: "",
			is_primary: fields.length === 0, // First one is primary
			cargo: "",
			telefono: "",
			correo_electronico: "",
		});
	};

	return (
		<div className="space-y-6">
			{/* SECCIÓN 1: DATOS DE LA EMPRESA */}
			<FormSection title="Datos de la Empresa" description="Información de la persona jurídica">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="razon_social">
							Razón Social <span className="text-red-500">*</span>
						</Label>
						<Input
							id="razon_social"
							{...ur("razon_social")}
							onBlur={onFieldBlur}
							placeholder="Empresa ABC S.R.L."
						/>
						{errors.razon_social && (
							<p className="text-sm text-red-500 mt-1">{errors.razon_social.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="tipo_sociedad">Tipo de Sociedad</Label>
						<Controller
							name="tipo_sociedad"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{COMPANY_TYPES.map((type) => (
											<SelectItem key={type} value={type}>
												{type}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.tipo_sociedad && (
							<p className="text-sm text-red-500 mt-1">{errors.tipo_sociedad.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="nit">
							NIT <span className="text-red-500">*</span>
						</Label>
						<Input id="nit" {...register("nit")} onBlur={onFieldBlur} placeholder="Min. 7 dígitos" />
						{errors.nit && <p className="text-sm text-red-500 mt-1">{errors.nit.message}</p>}
					</div>

					<div>
						<Label htmlFor="matricula_comercio">Matrícula de Comercio</Label>
						<Input
							id="matricula_comercio"
							{...register("matricula_comercio")}
							onBlur={onFieldBlur}
							placeholder="Min. 7 caracteres"
						/>
						{errors.matricula_comercio && (
							<p className="text-sm text-red-500 mt-1">{errors.matricula_comercio.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="pais_constitucion">
							País de Constitución <span className="text-red-500">*</span>
						</Label>
						<Input
							id="pais_constitucion"
							{...ur("pais_constitucion")}
							onBlur={onFieldBlur}
							defaultValue="Bolivia"
						/>
						{errors.pais_constitucion && (
							<p className="text-sm text-red-500 mt-1">{errors.pais_constitucion.message}</p>
						)}
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="actividad_economica">
							Actividad Económica <span className="text-red-500">*</span>
						</Label>
						<Input
							id="actividad_economica"
							{...ur("actividad_economica")}
							onBlur={onFieldBlur}
							placeholder="Comercio al por mayor"
						/>
						{errors.actividad_economica && (
							<p className="text-sm text-red-500 mt-1">{errors.actividad_economica.message}</p>
						)}
					</div>

					{/* Director de cartera */}
					<div>
						<Controller
							name="director_cartera_id"
							control={control}
							render={({ field }) => (
								<DirectorCarteraDropdown
									value={field.value}
									onValueChange={field.onChange}
									error={errors.director_cartera_id?.message}
								required
								/>
							)}
						/>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 2: INFORMACIÓN DE CONTACTO */}
			<FormSection title="Información de Contacto" description="Datos de contacto de la empresa">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="direccion_legal">
							Dirección Legal <span className="text-red-500">*</span>
						</Label>
						<Input
							id="direccion_legal"
							{...ur("direccion_legal")}
							onBlur={onFieldBlur}
							placeholder="Av. Principal #123, Zona Centro"
						/>
						{errors.direccion_legal && (
							<p className="text-sm text-red-500 mt-1">{errors.direccion_legal.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="correo_electronico">Correo Electrónico</Label>
						<Input
							id="correo_electronico"
							type="email"
							{...register("correo_electronico")}
							onBlur={onFieldBlur}
							placeholder="contacto@empresa.com"
						/>
						{errors.correo_electronico && (
							<p className="text-sm text-red-500 mt-1">{errors.correo_electronico.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="telefono">Teléfono</Label>
						<Input
							id="telefono"
							{...register("telefono")}
							onBlur={onFieldBlur}
							placeholder="Solo números, min. 5 dígitos"
						/>
						{errors.telefono && <p className="text-sm text-red-500 mt-1">{errors.telefono.message}</p>}
					</div>

					<div className="md:col-span-2">
						<ExtraPhonesInput
							phones={watch("celulares_extra") || []}
							onChange={(phones: ExtraPhone[]) => {
								setValue("celulares_extra", phones);
								onFieldBlur?.();
							}}
						/>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 3: REPRESENTANTES LEGALES */}
			<FormSection
				title="Representantes Legales"
				description="Información de los representantes legales (mínimo 1 requerido)"
			>
				<div className="space-y-6">
					{fields.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No hay representantes legales agregados. Haga clic en el botón de abajo para agregar uno.
						</p>
					)}

					{fields.map((field, index) => (
						<div key={field.id} className="border rounded-lg p-4 space-y-4">
							<div className="flex items-center justify-between mb-2">
								<h4 className="font-medium">
									Representante {index + 1}
									{index === 0 && (
										<span className="ml-2 text-xs text-muted-foreground">(Principal)</span>
									)}
								</h4>
								{index > 0 && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => remove(index)}
										className="text-red-500 hover:text-red-700"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor={`rep_${index}_primer_nombre`}>
										Primer Nombre <span className="text-red-500">*</span>
									</Label>
									<Input
										id={`rep_${index}_primer_nombre`}
										{...ur(`legal_representatives.${index}.primer_nombre`)}
										onBlur={onFieldBlur}
									/>
									{errors.legal_representatives?.[index]?.primer_nombre && (
										<p className="text-sm text-red-500 mt-1">
											{errors.legal_representatives[index]?.primer_nombre?.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor={`rep_${index}_segundo_nombre`}>Segundo Nombre</Label>
									<Input
										id={`rep_${index}_segundo_nombre`}
										{...ur(`legal_representatives.${index}.segundo_nombre`)}
										onBlur={onFieldBlur}
									/>
								</div>

								<div>
									<Label htmlFor={`rep_${index}_primer_apellido`}>
										Primer Apellido <span className="text-red-500">*</span>
									</Label>
									<Input
										id={`rep_${index}_primer_apellido`}
										{...ur(`legal_representatives.${index}.primer_apellido`)}
										onBlur={onFieldBlur}
									/>
									{errors.legal_representatives?.[index]?.primer_apellido && (
										<p className="text-sm text-red-500 mt-1">
											{errors.legal_representatives[index]?.primer_apellido?.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor={`rep_${index}_segundo_apellido`}>Segundo Apellido</Label>
									<Input
										id={`rep_${index}_segundo_apellido`}
										{...ur(`legal_representatives.${index}.segundo_apellido`)}
										onBlur={onFieldBlur}
									/>
								</div>

								<div>
									<Label htmlFor={`rep_${index}_tipo_documento`}>
										Tipo de Documento <span className="text-red-500">*</span>
									</Label>
									<Controller
										name={`legal_representatives.${index}.tipo_documento`}
										control={control}
										render={({ field }) => (
											<Select value={field.value} onValueChange={field.onChange}>
												<SelectTrigger>
													<SelectValue placeholder="Seleccionar" />
												</SelectTrigger>
												<SelectContent>
													{DOCUMENT_TYPES.map((type) => (
														<SelectItem key={type} value={type}>
															{type.toUpperCase()}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									{errors.legal_representatives?.[index]?.tipo_documento && (
										<p className="text-sm text-red-500 mt-1">
											{errors.legal_representatives[index]?.tipo_documento?.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor={`rep_${index}_numero_documento`}>
										Número de Documento <span className="text-red-500">*</span>
									</Label>
									<Input
										id={`rep_${index}_numero_documento`}
										{...register(`legal_representatives.${index}.numero_documento`)}
										onBlur={onFieldBlur}
										placeholder="Min. 6 caracteres"
									/>
									{errors.legal_representatives?.[index]?.numero_documento && (
										<p className="text-sm text-red-500 mt-1">
											{errors.legal_representatives[index]?.numero_documento?.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor={`rep_${index}_extension`}>Extensión</Label>
									<Input
										id={`rep_${index}_extension`}
										{...ur(`legal_representatives.${index}.extension`)}
										onBlur={onFieldBlur}
										placeholder="Ej: A, CC, etc."
										maxLength={10}
									/>
								</div>

								<div>
									<Label htmlFor={`rep_${index}_cargo`}>Cargo</Label>
									<Input
										id={`rep_${index}_cargo`}
										{...ur(`legal_representatives.${index}.cargo`)}
										onBlur={onFieldBlur}
										placeholder="Gerente General"
									/>
								</div>

								<div>
									<Label htmlFor={`rep_${index}_telefono`}>Teléfono</Label>
									<Input
										id={`rep_${index}_telefono`}
										{...register(`legal_representatives.${index}.telefono`)}
										onBlur={onFieldBlur}
										placeholder="Solo números"
									/>
								</div>

								<div>
									<Label htmlFor={`rep_${index}_correo_electronico`}>Correo Electrónico</Label>
									<Input
										id={`rep_${index}_correo_electronico`}
										type="email"
										{...register(`legal_representatives.${index}.correo_electronico`)}
										onBlur={onFieldBlur}
										placeholder="representante@empresa.com"
									/>
									{errors.legal_representatives?.[index]?.correo_electronico && (
										<p className="text-sm text-red-500 mt-1">
											{errors.legal_representatives[index]?.correo_electronico?.message}
										</p>
									)}
								</div>
							</div>
						</div>
					))}

					<Button type="button" variant="outline" onClick={handleAddRepresentative} className="w-full">
						<Plus className="h-4 w-4 mr-2" />
						Agregar Representante Legal
					</Button>

					{errors.legal_representatives?.root && (
						<p className="text-sm text-red-500">{errors.legal_representatives.root.message}</p>
					)}
				</div>
			</FormSection>

			{/* SECCIÓN: DOCUMENTOS DEL CLIENTE */}
			<FormSection
				title="Documentos del Cliente"
				description="Cargue los documentos requeridos de la persona jurídica"
			>
				<ClienteDocumentUpload
					clientType="juridica"
					documentos={watch("documentos") || []}
					onDocumentosChange={(docs: ClienteDocumentoFormState[]) => {
						setValue("documentos", docs);
						onFieldBlur?.();
					}}
				/>
			</FormSection>
		</div>
	);
}
