"use client";

import { useState } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import {
	NaturalClientFormData,
	ClientPartnerData,
	DOCUMENT_TYPES,
	CIVIL_STATUS,
	GENDER_OPTIONS,
	INCOME_LEVELS,
	INCOME_VALUES,
	CI_EXTENSIONS,
} from "@/types/clientForm";
import { FormSection } from "./FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { SameAsCheckbox } from "@/components/ui/same-as-checkbox";

interface NaturalClientFormProps {
	form: UseFormReturn<NaturalClientFormData>;
	partnerForm?: UseFormReturn<ClientPartnerData>;
	onFieldBlur?: () => void;
}

export function NaturalClientForm({ form, partnerForm, onFieldBlur }: NaturalClientFormProps) {
	const {
		register,
		control,
		formState: { errors },
		watch,
		setValue,
	} = form;

	// Watch estado_civil to show/hide partner section
	const estadoCivil = watch("estado_civil");
	const showPartnerSection = estadoCivil === "casado";

	// Watch for "same as" checkbox
	const [useSameAsDireccion, setUseSameAsDireccion] = useState(false);
	const direccion = watch("direccion");

	return (
		<div className="space-y-6">
			{/* SECCIÓN 1: DATOS PERSONALES */}
			<FormSection title="Datos Personales" description="Información personal del cliente">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Nombres */}
					<div>
						<Label htmlFor="primer_nombre">
							Primer Nombre <span className="text-red-500">*</span>
						</Label>
						<Input id="primer_nombre" {...register("primer_nombre")} onBlur={onFieldBlur} />
						{errors.primer_nombre && (
							<p className="text-sm text-red-500 mt-1">{errors.primer_nombre.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="segundo_nombre">Segundo Nombre</Label>
						<Input id="segundo_nombre" {...register("segundo_nombre")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="primer_apellido">
							Primer Apellido <span className="text-red-500">*</span>
						</Label>
						<Input id="primer_apellido" {...register("primer_apellido")} onBlur={onFieldBlur} />
						{errors.primer_apellido && (
							<p className="text-sm text-red-500 mt-1">{errors.primer_apellido.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="segundo_apellido">Segundo Apellido</Label>
						<Input id="segundo_apellido" {...register("segundo_apellido")} onBlur={onFieldBlur} />
					</div>

					{/* Documento */}
					<div>
						<Label htmlFor="tipo_documento">
							Tipo de Documento <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="tipo_documento"
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
						{errors.tipo_documento && (
							<p className="text-sm text-red-500 mt-1">{errors.tipo_documento.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="numero_documento">
							Número de Documento <span className="text-red-500">*</span>
						</Label>
						<Input
							id="numero_documento"
							{...register("numero_documento")}
							onBlur={onFieldBlur}
							placeholder="Min. 6 caracteres"
						/>
						{errors.numero_documento && (
							<p className="text-sm text-red-500 mt-1">{errors.numero_documento.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="extension_ci">Extensión CI</Label>
						<Controller
							name="extension_ci"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{CI_EXTENSIONS.map((ext) => (
											<SelectItem key={ext} value={ext}>
												{ext}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					<div>
						<Label htmlFor="nacionalidad">
							Nacionalidad <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nacionalidad"
							{...register("nacionalidad")}
							onBlur={onFieldBlur}
							defaultValue="Boliviana"
						/>
						{errors.nacionalidad && (
							<p className="text-sm text-red-500 mt-1">{errors.nacionalidad.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="fecha_nacimiento">
							Fecha de Nacimiento <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="fecha_nacimiento"
							control={control}
							render={({ field }) => (
								<DatePicker date={field.value} onSelect={field.onChange} placeholder="DD-MM-AAAA" />
							)}
						/>
						{errors.fecha_nacimiento && (
							<p className="text-sm text-red-500 mt-1">{errors.fecha_nacimiento.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="estado_civil">
							Estado Civil <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="estado_civil"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
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
							<p className="text-sm text-red-500 mt-1">{errors.estado_civil.message}</p>
						)}
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 2: INFORMACIÓN DE CONTACTO */}
			<FormSection title="Información de Contacto" description="Datos de contacto del cliente">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="direccion">
							Dirección <span className="text-red-500">*</span>
						</Label>
						<Input id="direccion" {...register("direccion")} onBlur={onFieldBlur} />
						{errors.direccion && (
							<p className="text-sm text-red-500 mt-1">{errors.direccion.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="correo_electronico">
							Correo Electrónico <span className="text-red-500">*</span>
						</Label>
						<Input
							id="correo_electronico"
							type="email"
							{...register("correo_electronico")}
							onBlur={onFieldBlur}
							placeholder="ejemplo@correo.com"
						/>
						{errors.correo_electronico && (
							<p className="text-sm text-red-500 mt-1">{errors.correo_electronico.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="celular">
							Celular <span className="text-red-500">*</span>
						</Label>
						<Input
							id="celular"
							{...register("celular")}
							onBlur={onFieldBlur}
							placeholder="Solo números, min. 5 dígitos"
						/>
						{errors.celular && <p className="text-sm text-red-500 mt-1">{errors.celular.message}</p>}
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 3: OTROS DATOS */}
			<FormSection title="Otros Datos" description="Información adicional (opcional)">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label htmlFor="profesion_oficio">Profesión u Oficio</Label>
						<Input id="profesion_oficio" {...register("profesion_oficio")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="actividad_economica">Actividad Económica</Label>
						<Input id="actividad_economica" {...register("actividad_economica")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="lugar_trabajo">Lugar de Trabajo</Label>
						<Input id="lugar_trabajo" {...register("lugar_trabajo")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="pais_residencia">País de Residencia</Label>
						<Input
							id="pais_residencia"
							{...register("pais_residencia")}
							onBlur={onFieldBlur}
							defaultValue="Bolivia"
						/>
					</div>

					<div>
						<Label htmlFor="genero">Género</Label>
						<Controller
							name="genero"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
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

					<div>
						<Label htmlFor="nivel_ingresos">Nivel de Ingresos</Label>
						<Controller
							name="nivel_ingresos"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value?.toString()}
									onValueChange={(value) => field.onChange(Number(value))}
								>
									<SelectTrigger>
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{INCOME_LEVELS.map((level) => (
											<SelectItem key={level} value={INCOME_VALUES[level].toString()}>
												{level.charAt(0).toUpperCase() + level.slice(1)} ($
												{INCOME_VALUES[level].toLocaleString()})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					<div>
						<Label htmlFor="cargo">Cargo</Label>
						<Input id="cargo" {...register("cargo")} onBlur={onFieldBlur} />
					</div>

					<div>
						<Label htmlFor="anio_ingreso">Año de Ingreso</Label>
						<Controller
							name="anio_ingreso"
							control={control}
							render={({ field }) => (
								<DatePicker date={field.value} onSelect={field.onChange} placeholder="DD-MM-AAAA" />
							)}
						/>
					</div>

					<div>
						<Label htmlFor="nit">NIT</Label>
						<Input id="nit" {...register("nit")} onBlur={onFieldBlur} placeholder="Min. 7 dígitos" />
						{errors.nit && <p className="text-sm text-red-500 mt-1">{errors.nit.message}</p>}
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="domicilio_comercial">Domicilio Comercial</Label>
						<Input
							id="domicilio_comercial"
							{...register("domicilio_comercial")}
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
					description="Información del cónyuge (requerido para clientes casados)"
				>
					<PartnerFields form={partnerForm} onFieldBlur={onFieldBlur} />
				</FormSection>
			)}
		</div>
	);
}

// Partner fields component
function PartnerFields({
	form,
	onFieldBlur,
}: {
	form: UseFormReturn<ClientPartnerData>;
	onFieldBlur?: () => void;
}) {
	const {
		register,
		formState: { errors },
	} = form;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<Label htmlFor="partner_primer_nombre">
					Primer Nombre <span className="text-red-500">*</span>
				</Label>
				<Input id="partner_primer_nombre" {...register("primer_nombre")} onBlur={onFieldBlur} />
				{errors.primer_nombre && (
					<p className="text-sm text-red-500 mt-1">{errors.primer_nombre.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_segundo_nombre">Segundo Nombre</Label>
				<Input id="partner_segundo_nombre" {...register("segundo_nombre")} onBlur={onFieldBlur} />
			</div>

			<div>
				<Label htmlFor="partner_primer_apellido">
					Primer Apellido <span className="text-red-500">*</span>
				</Label>
				<Input id="partner_primer_apellido" {...register("primer_apellido")} onBlur={onFieldBlur} />
				{errors.primer_apellido && (
					<p className="text-sm text-red-500 mt-1">{errors.primer_apellido.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_segundo_apellido">Segundo Apellido</Label>
				<Input id="partner_segundo_apellido" {...register("segundo_apellido")} onBlur={onFieldBlur} />
			</div>

			<div className="md:col-span-2">
				<Label htmlFor="partner_direccion">
					Dirección <span className="text-red-500">*</span>
				</Label>
				<Input id="partner_direccion" {...register("direccion")} onBlur={onFieldBlur} />
				{errors.direccion && <p className="text-sm text-red-500 mt-1">{errors.direccion.message}</p>}
			</div>

			<div>
				<Label htmlFor="partner_celular">
					Celular <span className="text-red-500">*</span>
				</Label>
				<Input
					id="partner_celular"
					{...register("celular")}
					onBlur={onFieldBlur}
					placeholder="Solo números"
				/>
				{errors.celular && <p className="text-sm text-red-500 mt-1">{errors.celular.message}</p>}
			</div>

			<div>
				<Label htmlFor="partner_correo_electronico">
					Correo Electrónico <span className="text-red-500">*</span>
				</Label>
				<Input
					id="partner_correo_electronico"
					type="email"
					{...register("correo_electronico")}
					onBlur={onFieldBlur}
				/>
				{errors.correo_electronico && (
					<p className="text-sm text-red-500 mt-1">{errors.correo_electronico.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_profesion_oficio">
					Profesión u Oficio <span className="text-red-500">*</span>
				</Label>
				<Input id="partner_profesion_oficio" {...register("profesion_oficio")} onBlur={onFieldBlur} />
				{errors.profesion_oficio && (
					<p className="text-sm text-red-500 mt-1">{errors.profesion_oficio.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_actividad_economica">
					Actividad Económica <span className="text-red-500">*</span>
				</Label>
				<Input id="partner_actividad_economica" {...register("actividad_economica")} onBlur={onFieldBlur} />
				{errors.actividad_economica && (
					<p className="text-sm text-red-500 mt-1">{errors.actividad_economica.message}</p>
				)}
			</div>

			<div>
				<Label htmlFor="partner_lugar_trabajo">
					Lugar de Trabajo <span className="text-red-500">*</span>
				</Label>
				<Input id="partner_lugar_trabajo" {...register("lugar_trabajo")} onBlur={onFieldBlur} />
				{errors.lugar_trabajo && (
					<p className="text-sm text-red-500 mt-1">{errors.lugar_trabajo.message}</p>
				)}
			</div>
		</div>
	);
}
