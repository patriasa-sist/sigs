"use client";

import React, { useState } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import {
	NaturalClientFormData,
	ClientPartnerData,
	DOCUMENT_TYPES,
	CIVIL_STATUS,
	GENDER_OPTIONS,
	INCOME_LEVELS,
	INCOME_VALUES,
} from "@/types/clientForm";
import type { ExtraPhone } from "@/types/clientForm";
import type { ClienteDocumentoFormState, TipoDocumentoCliente } from "@/types/clienteDocumento";
import { FormSection } from "./FormSection";
import { ExtraPhonesInput } from "./ExtraPhonesInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SameAsCheckbox } from "@/components/ui/same-as-checkbox";
import { ClienteDocumentUpload } from "./ClienteDocumentUpload";
import { cn } from "@/lib/utils";

interface NaturalClientFormProps {
	form: UseFormReturn<NaturalClientFormData>;
	partnerForm?: UseFormReturn<ClientPartnerData>;
	onFieldBlur?: () => void;
	exceptions?: TipoDocumentoCliente[];
}

export function NaturalClientForm({ form, partnerForm, onFieldBlur, exceptions = [] }: NaturalClientFormProps) {
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

	// Watch estado_civil to show/hide partner section
	const estadoCivil = watch("estado_civil");
	const showPartnerSection = estadoCivil === "casado";

	// Watch for "same as" checkbox
	const [useSameAsDireccion, setUseSameAsDireccion] = useState(false);
	const direccion = watch("direccion");

	// Shorthand for error border class
	const eb = (hasErr: boolean) => (hasErr ? "border-destructive focus-visible:ring-destructive/20" : "");

	return (
		<div className="space-y-6">
			{/* SECCIÓN 1: DATOS PERSONALES */}
			<FormSection
				title="Datos Personales"
				description="Información personal del cliente"
				required
			>
				{/* Nombres y apellidos — grid 2 columnas */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label htmlFor="primer_nombre">
							Primer Nombre <span className="text-destructive">*</span>
						</Label>
						<Input id="primer_nombre" {...ur("primer_nombre")} onBlur={onFieldBlur} className={eb(!!errors.primer_nombre)} />
						{errors.primer_nombre && (
							<p className="text-sm text-destructive mt-1">{errors.primer_nombre.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="segundo_nombre">Segundo Nombre</Label>
						<Input id="segundo_nombre" {...ur("segundo_nombre")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="primer_apellido">
							Primer Apellido <span className="text-destructive">*</span>
						</Label>
						<Input id="primer_apellido" {...ur("primer_apellido")} onBlur={onFieldBlur} className={eb(!!errors.primer_apellido)} />
						{errors.primer_apellido && (
							<p className="text-sm text-destructive mt-1">{errors.primer_apellido.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="segundo_apellido">Segundo Apellido</Label>
						<Input id="segundo_apellido" {...ur("segundo_apellido")} onBlur={onFieldBlur} />
					</div>
				</div>

				{/* Documento — grid 4 columnas */}
				<div className="grid grid-cols-4 gap-4 mt-4">
					<div className="col-span-1">
						<Label htmlFor="tipo_documento">
							Tipo Doc. <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="tipo_documento"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className={cn("w-full min-w-[7.5rem]", eb(!!errors.tipo_documento))}>
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
						{errors.tipo_documento && (
							<p className="text-sm text-destructive mt-1">{errors.tipo_documento.message}</p>
						)}
					</div>

					<div className="col-span-2">
						<Label htmlFor="numero_documento">
							Número de Documento <span className="text-destructive">*</span>
						</Label>
						<Input
							id="numero_documento"
							{...ur("numero_documento")}
							onBlur={onFieldBlur}
							placeholder="Mín. 6 caracteres"
							className={eb(!!errors.numero_documento)}
						/>
						{errors.numero_documento && (
							<p className="text-sm text-destructive mt-1">{errors.numero_documento.message}</p>
						)}
					</div>

					<div className="col-span-1">
						<Label htmlFor="extension_ci">Extensión CI</Label>
						<Input
							id="extension_ci"
							{...ur("extension_ci")}
							onBlur={onFieldBlur}
							placeholder="Ej: A, SC"
							maxLength={10}
						/>
					</div>
				</div>

				{/* Fecha, Nacionalidad, Género, Estado Civil — grid 4 columnas */}
				<div className="grid grid-cols-4 gap-4 mt-4">
					<div className="col-span-1">
						<Label htmlFor="fecha_nacimiento">
							Fecha de Nacimiento <span className="text-destructive">*</span>
						</Label>
						<Input
							id="fecha_nacimiento"
							type="date"
							{...register("fecha_nacimiento")}
							onBlur={onFieldBlur}
							className={eb(!!errors.fecha_nacimiento)}
						/>
						{errors.fecha_nacimiento && (
							<p className="text-sm text-destructive mt-1">{errors.fecha_nacimiento.message}</p>
						)}
					</div>

					<div className="col-span-1">
						<Label htmlFor="nacionalidad">
							Nacionalidad <span className="text-destructive">*</span>
						</Label>
						<Input
							id="nacionalidad"
							{...ur("nacionalidad")}
							onBlur={onFieldBlur}
							defaultValue="Boliviana"
							className={eb(!!errors.nacionalidad)}
						/>
						{errors.nacionalidad && (
							<p className="text-sm text-destructive mt-1">{errors.nacionalidad.message}</p>
						)}
					</div>

					<div className="col-span-1">
						<Label htmlFor="genero_personal">Género</Label>
						<Controller
							name="genero"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{GENDER_OPTIONS.map((gender) => (
											<SelectItem key={gender} value={gender}>
												{gender.charAt(0).toUpperCase() + gender.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					<div className="col-span-1">
						<Label htmlFor="estado_civil">
							Estado Civil <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="estado_civil"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className={cn("w-full", eb(!!errors.estado_civil))}>
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{CIVIL_STATUS.map((status) => (
											<SelectItem key={status} value={status}>
												{status.charAt(0).toUpperCase() + status.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.estado_civil && (
							<p className="text-sm text-destructive mt-1">{errors.estado_civil.message}</p>
						)}
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 2: INFORMACIÓN DE CONTACTO */}
			<FormSection
				title="Información de Contacto"
				description="Datos de contacto del cliente"
				required
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="direccion">
							Dirección <span className="text-destructive">*</span>
						</Label>
						<Input id="direccion" {...ur("direccion")} onBlur={onFieldBlur} className={eb(!!errors.direccion)} />
						{errors.direccion && <p className="text-sm text-destructive mt-1">{errors.direccion.message}</p>}
					</div>

					<div>
						<Label htmlFor="correo_electronico">
							Correo Electrónico <span className="text-destructive">*</span>
						</Label>
						<Input
							id="correo_electronico"
							type="email"
							{...register("correo_electronico")}
							onBlur={onFieldBlur}
							placeholder="ejemplo@correo.com"
							className={eb(!!errors.correo_electronico)}
						/>
						{errors.correo_electronico && (
							<p className="text-sm text-destructive mt-1">{errors.correo_electronico.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="celular">
							Celular <span className="text-destructive">*</span>
						</Label>
						<Input
							id="celular"
							{...register("celular")}
							onBlur={onFieldBlur}
							placeholder="Solo números, min. 5 dígitos"
							className={eb(!!errors.celular)}
						/>
						{errors.celular && <p className="text-sm text-destructive mt-1">{errors.celular.message}</p>}
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

			{/* SECCIÓN 3: OTROS DATOS */}
			<FormSection title="Otros Datos" description="Información adicional del cliente" required>
				{/* Grupo 1: datos laborales */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label htmlFor="profesion_oficio">
							Profesión u Oficio <span className="text-destructive">*</span>
						</Label>
						<Input id="profesion_oficio" {...ur("profesion_oficio")} onBlur={onFieldBlur} className={eb(!!errors.profesion_oficio)} />
						{errors.profesion_oficio && (
							<p className="text-sm text-destructive mt-1">{errors.profesion_oficio.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="actividad_economica">Actividad Económica</Label>
						<Input id="actividad_economica" {...ur("actividad_economica")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="lugar_trabajo">Lugar de Trabajo</Label>
						<Input id="lugar_trabajo" {...ur("lugar_trabajo")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="cargo">Cargo</Label>
						<Input id="cargo" {...ur("cargo")} onBlur={onFieldBlur} />
					</div>
				</div>

				{/* Grupo 2: contexto — campos cortos */}
				<div className="grid grid-cols-4 gap-4 mt-4">
					<div className="col-span-1">
						<Label htmlFor="anio_ingreso">Año de Ingreso</Label>
						<Input
							id="anio_ingreso"
							type="number"
							min={1900}
							max={new Date().getFullYear()}
							placeholder="Ej: 2020"
							{...register("anio_ingreso", { valueAsNumber: true })}
							onBlur={onFieldBlur}
							className={eb(!!errors.anio_ingreso)}
						/>
						{errors.anio_ingreso && (
							<p className="text-sm text-destructive mt-1">{errors.anio_ingreso.message}</p>
						)}
					</div>

					<div className="col-span-1">
						<Label htmlFor="pais_residencia">
							País de Residencia <span className="text-destructive">*</span>
						</Label>
						<Input
							id="pais_residencia"
							{...register("pais_residencia")}
							onBlur={onFieldBlur}
							defaultValue="Bolivia"
							readOnly
							className="bg-muted cursor-not-allowed"
						/>
					</div>

					<div className="col-span-2">
						<Label htmlFor="nivel_ingresos">Nivel de Ingresos aproximado</Label>
						<Controller
							name="nivel_ingresos"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value?.toString()}
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{INCOME_LEVELS.map((level) => (
											<SelectItem key={level} value={INCOME_VALUES[level].toString()}>
												{level.charAt(0).toUpperCase() + level.slice(1)} (Bs.{" "}
												{INCOME_VALUES[level].toLocaleString()})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>
				</div>

				{/* Grupo 3: facturación */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					<div>
						<Label htmlFor="nit">NIT de Facturación</Label>
						<Input id="nit" {...register("nit")} onBlur={onFieldBlur} placeholder="Mín. 7 dígitos" className={eb(!!errors.nit)} />
						{errors.nit && <p className="text-sm text-destructive mt-1">{errors.nit.message}</p>}
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="domicilio_comercial">Dirección de Facturación</Label>
						<Input
							id="domicilio_comercial"
							{...ur("domicilio_comercial")}
							onBlur={onFieldBlur}
							disabled={useSameAsDireccion}
						/>
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-direccion"
								label="Mismo que dirección personal"
								checked={useSameAsDireccion}
								onCheckedChange={setUseSameAsDireccion}
								sourceValue={direccion}
								onCopyValue={(value) => setValue("domicilio_comercial", value as string)}
							/>
						</div>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 4: DATOS DEL CÓNYUGE (Conditional) */}
			{showPartnerSection && partnerForm && (
				<FormSection
					title="Datos del Cónyuge"
					description="Información del cónyuge (todos los campos son opcionales)"
				>
					<PartnerFields form={partnerForm} onFieldBlur={onFieldBlur} />
				</FormSection>
			)}

			{/* SECCIÓN 5: DOCUMENTOS DEL CLIENTE */}
			<FormSection
				title="Documentos del Cliente"
				description="Cargue los documentos requeridos del cliente"
				required
			>
				<ClienteDocumentUpload
					clientType="natural"
					documentos={watch("documentos") || []}
					onDocumentosChange={(docs: ClienteDocumentoFormState[]) => {
						setValue("documentos", docs);
						onFieldBlur?.();
					}}
					exceptions={exceptions}
				/>
			</FormSection>
		</div>
	);
}

// Partner fields component
function PartnerFields({ form, onFieldBlur }: { form: UseFormReturn<ClientPartnerData>; onFieldBlur?: () => void }) {
	const {
		register,
		formState: { errors },
	} = form;

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

	const { onChange: onCelularChange, ...celularRest } = register("celular");

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{/* Nombres */}
			<div>
				<Label htmlFor="partner_primer_nombre">Primer Nombre</Label>
				<Input id="partner_primer_nombre" {...ur("primer_nombre")} onBlur={onFieldBlur} />
				{errors.primer_nombre && <p className="text-sm text-destructive mt-1">{errors.primer_nombre.message}</p>}
			</div>

			<div>
				<Label htmlFor="partner_segundo_nombre">Segundo Nombre</Label>
				<Input id="partner_segundo_nombre" {...ur("segundo_nombre")} onBlur={onFieldBlur} />
			</div>

			<div>
				<Label htmlFor="partner_primer_apellido">Primer Apellido</Label>
				<Input id="partner_primer_apellido" {...ur("primer_apellido")} onBlur={onFieldBlur} />
				{errors.primer_apellido && (
					<p className="text-sm text-destructive mt-1">{errors.primer_apellido.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_segundo_apellido">Segundo Apellido</Label>
				<Input id="partner_segundo_apellido" {...ur("segundo_apellido")} onBlur={onFieldBlur} />
			</div>

			{/* Contacto */}
			<div>
				<Label htmlFor="partner_celular">Celular</Label>
				<Input
					id="partner_celular"
					inputMode="numeric"
					placeholder="Solo números"
					{...celularRest}
					onChange={(e) => {
						e.target.value = e.target.value.replace(/\D/g, "");
						onCelularChange(e);
					}}
					onBlur={onFieldBlur}
				/>
				{errors.celular && <p className="text-sm text-destructive mt-1">{errors.celular.message}</p>}
			</div>

			<div>
				<Label htmlFor="partner_correo_electronico">Correo Electrónico</Label>
				<Input
					id="partner_correo_electronico"
					type="email"
					{...register("correo_electronico")}
					onBlur={onFieldBlur}
				/>
				{errors.correo_electronico && (
					<p className="text-sm text-destructive mt-1">{errors.correo_electronico.message}</p>
				)}
			</div>

			{/* Dirección */}
			<div className="md:col-span-2">
				<Label htmlFor="partner_direccion">Dirección</Label>
				<Input id="partner_direccion" {...ur("direccion")} onBlur={onFieldBlur} />
				{errors.direccion && <p className="text-sm text-destructive mt-1">{errors.direccion.message}</p>}
			</div>

			{/* Datos laborales */}
			<div>
				<Label htmlFor="partner_profesion_oficio">Profesión u Oficio</Label>
				<Input id="partner_profesion_oficio" {...ur("profesion_oficio")} onBlur={onFieldBlur} />
				{errors.profesion_oficio && (
					<p className="text-sm text-destructive mt-1">{errors.profesion_oficio.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_actividad_economica">Actividad Económica</Label>
				<Input id="partner_actividad_economica" {...ur("actividad_economica")} onBlur={onFieldBlur} />
				{errors.actividad_economica && (
					<p className="text-sm text-destructive mt-1">{errors.actividad_economica.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_lugar_trabajo">Lugar de Trabajo</Label>
				<Input id="partner_lugar_trabajo" {...ur("lugar_trabajo")} onBlur={onFieldBlur} />
				{errors.lugar_trabajo && <p className="text-sm text-destructive mt-1">{errors.lugar_trabajo.message}</p>}
			</div>
		</div>
	);
}
