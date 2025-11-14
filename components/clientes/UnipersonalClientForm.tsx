"use client";

import { useState } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import {
	UnipersonalClientFormData,
	DOCUMENT_TYPES,
	CIVIL_STATUS,
	GENDER_OPTIONS,
	INCOME_LEVELS,
	INCOME_VALUES,
} from "@/types/clientForm";
import { FormSection } from "./FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { SameAsCheckbox } from "@/components/ui/same-as-checkbox";

interface UnipersonalClientFormProps {
	form: UseFormReturn<UnipersonalClientFormData>;
	onFieldBlur?: () => void;
}

export function UnipersonalClientForm({ form, onFieldBlur }: UnipersonalClientFormProps) {
	const {
		register,
		control,
		formState: { errors },
		watch,
		setValue,
	} = form;

	// "Same As" checkbox states
	const [useSameAsDireccion, setUseSameAsDireccion] = useState(false);
	const [useSameAsEmail, setUseSameAsEmail] = useState(false);
	const [useSameAsNombre, setUseSameAsNombre] = useState(false);
	const [useSameAsApellido, setUseSameAsApellido] = useState(false);
	const [useSameAsDocumento, setUseSameAsDocumento] = useState(false);
	const [useSameAsExtension, setUseSameAsExtension] = useState(false);
	const [useSameAsNacionalidad, setUseSameAsNacionalidad] = useState(false);
	const [useSameAsPropietario, setUseSameAsPropietario] = useState(false);

	// Watch values for "same as" functionality
	const direccion = watch("direccion");
	const correoElectronico = watch("correo_electronico");
	const primerNombre = watch("primer_nombre");
	const segundoNombre = watch("segundo_nombre");
	const primerApellido = watch("primer_apellido");
	const segundoApellido = watch("segundo_apellido");
	const numeroDocumento = watch("numero_documento");
	const extensionCi = watch("extension_ci");
	const nacionalidad = watch("nacionalidad");
	const nombrePropietario = watch("nombre_propietario");
	const apellidoPropietario = watch("apellido_propietario");
	const documentoPropietario = watch("documento_propietario");
	const extensionPropietario = watch("extension_propietario");

	// Helper function to combine nombres for "same as" checkbox
	const combineNombres = () => {
		const nombres = [primerNombre, segundoNombre].filter(Boolean).join(" ");
		return nombres || undefined;
	};

	const combineApellidos = () => {
		const apellidos = [primerApellido, segundoApellido].filter(Boolean).join(" ");
		return apellidos || undefined;
	};

	const combinePropietarioNombre = () => {
		const nombre = [nombrePropietario, apellidoPropietario].filter(Boolean).join(" ");
		return nombre || undefined;
	};

	return (
		<div className="space-y-6">
			{/* SECCIÓN 1: DATOS PERSONALES */}
			<FormSection title="Datos Personales" description="Información personal del propietario">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
						<Input
							id="extension_ci"
							{...register("extension_ci")}
							onBlur={onFieldBlur}
							placeholder="Ej: A, CC, etc."
							maxLength={10}
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
			<FormSection title="Información de Contacto" description="Datos de contacto personal">
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

			{/* SECCIÓN 3: OTROS DATOS PERSONALES */}
			<FormSection title="Otros Datos Personales" description="Información adicional (opcional)">
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
						<Label htmlFor="nit">NIT Personal</Label>
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

			{/* SECCIÓN 4: DATOS COMERCIALES */}
			<FormSection title="Datos Comerciales" description="Información del emprendimiento">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="razon_social">
							Razón Social <span className="text-red-500">*</span>
						</Label>
						<Input id="razon_social" {...register("razon_social")} onBlur={onFieldBlur} />
						{errors.razon_social && (
							<p className="text-sm text-red-500 mt-1">{errors.razon_social.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="nit_comercial">
							NIT <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nit_comercial"
							{...register("nit")}
							onBlur={onFieldBlur}
							placeholder="Min. 7 dígitos"
						/>
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

					<div className="md:col-span-2">
						<Label htmlFor="domicilio_comercial_uni">
							Domicilio Comercial <span className="text-red-500">*</span>
						</Label>
						<Input
							id="domicilio_comercial_uni"
							{...register("domicilio_comercial")}
							onBlur={onFieldBlur}
							disabled={useSameAsDireccion}
						/>
						{errors.domicilio_comercial && (
							<p className="text-sm text-red-500 mt-1">{errors.domicilio_comercial.message}</p>
						)}
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-direccion-comercial"
								label="Mismo que dirección personal"
								checked={useSameAsDireccion}
								onCheckedChange={setUseSameAsDireccion}
								sourceValue={direccion}
								onCopyValue={(value) => setValue("domicilio_comercial", value as string)}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="telefono_comercial">
							Teléfono Comercial <span className="text-red-500">*</span>
						</Label>
						<Input
							id="telefono_comercial"
							{...register("telefono_comercial")}
							onBlur={onFieldBlur}
							placeholder="Solo números, min. 5 dígitos"
						/>
						{errors.telefono_comercial && (
							<p className="text-sm text-red-500 mt-1">{errors.telefono_comercial.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="actividad_economica_comercial">
							Actividad Económica <span className="text-red-500">*</span>
						</Label>
						<Input
							id="actividad_economica_comercial"
							{...register("actividad_economica_comercial")}
							onBlur={onFieldBlur}
						/>
						{errors.actividad_economica_comercial && (
							<p className="text-sm text-red-500 mt-1">{errors.actividad_economica_comercial.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="nivel_ingresos">
							Nivel de Ingresos <span className="text-red-500">*</span>
						</Label>
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
						{errors.nivel_ingresos && (
							<p className="text-sm text-red-500 mt-1">{errors.nivel_ingresos.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="correo_electronico_comercial">
							Correo Electrónico Comercial <span className="text-red-500">*</span>
						</Label>
						<Input
							id="correo_electronico_comercial"
							type="email"
							{...register("correo_electronico_comercial")}
							onBlur={onFieldBlur}
							disabled={useSameAsEmail}
							placeholder="comercial@correo.com"
						/>
						{errors.correo_electronico_comercial && (
							<p className="text-sm text-red-500 mt-1">{errors.correo_electronico_comercial.message}</p>
						)}
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-email"
								label="Mismo que correo personal"
								checked={useSameAsEmail}
								onCheckedChange={setUseSameAsEmail}
								sourceValue={correoElectronico}
								onCopyValue={(value) => setValue("correo_electronico_comercial", value as string)}
							/>
						</div>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 5: DATOS DEL PROPIETARIO */}
			<FormSection title="Datos del Propietario" description="Información del propietario del emprendimiento">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="nombre_propietario">
							Nombre del Propietario <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nombre_propietario"
							{...register("nombre_propietario")}
							onBlur={onFieldBlur}
							disabled={useSameAsNombre}
						/>
						{errors.nombre_propietario && (
							<p className="text-sm text-red-500 mt-1">{errors.nombre_propietario.message}</p>
						)}
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-nombre"
								label="Mismo que nombres personales"
								checked={useSameAsNombre}
								onCheckedChange={setUseSameAsNombre}
								sourceValue={combineNombres()}
								onCopyValue={(value) => setValue("nombre_propietario", value as string)}
							/>
						</div>
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="apellido_propietario">
							Apellido del Propietario <span className="text-red-500">*</span>
						</Label>
						<Input
							id="apellido_propietario"
							{...register("apellido_propietario")}
							onBlur={onFieldBlur}
							disabled={useSameAsApellido}
						/>
						{errors.apellido_propietario && (
							<p className="text-sm text-red-500 mt-1">{errors.apellido_propietario.message}</p>
						)}
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-apellido"
								label="Mismo que apellidos personales"
								checked={useSameAsApellido}
								onCheckedChange={setUseSameAsApellido}
								sourceValue={combineApellidos()}
								onCopyValue={(value) => setValue("apellido_propietario", value as string)}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="documento_propietario">
							Número de Documento <span className="text-red-500">*</span>
						</Label>
						<Input
							id="documento_propietario"
							{...register("documento_propietario")}
							onBlur={onFieldBlur}
							disabled={useSameAsDocumento}
							placeholder="Min. 7 dígitos"
						/>
						{errors.documento_propietario && (
							<p className="text-sm text-red-500 mt-1">{errors.documento_propietario.message}</p>
						)}
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-documento"
								label="Mismo que documento personal"
								checked={useSameAsDocumento}
								onCheckedChange={setUseSameAsDocumento}
								sourceValue={numeroDocumento}
								onCopyValue={(value) => setValue("documento_propietario", value as string)}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="extension_propietario">Extensión</Label>
						<Input
							id="extension_propietario"
							{...register("extension_propietario")}
							onBlur={onFieldBlur}
							disabled={useSameAsExtension}
						/>
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-extension"
								label="Mismo que extensión personal"
								checked={useSameAsExtension}
								onCheckedChange={setUseSameAsExtension}
								sourceValue={extensionCi}
								onCopyValue={(value) => setValue("extension_propietario", value as string)}
							/>
						</div>
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="nacionalidad_propietario">
							Nacionalidad <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nacionalidad_propietario"
							{...register("nacionalidad_propietario")}
							onBlur={onFieldBlur}
							disabled={useSameAsNacionalidad}
							defaultValue="Boliviana"
						/>
						{errors.nacionalidad_propietario && (
							<p className="text-sm text-red-500 mt-1">{errors.nacionalidad_propietario.message}</p>
						)}
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-nacionalidad"
								label="Mismo que nacionalidad personal"
								checked={useSameAsNacionalidad}
								onCheckedChange={setUseSameAsNacionalidad}
								sourceValue={nacionalidad}
								onCopyValue={(value) => setValue("nacionalidad_propietario", value as string)}
							/>
						</div>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 6: REPRESENTANTE LEGAL */}
			<FormSection title="Representante Legal" description="Datos del representante legal">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="nombre_representante">
							Nombre del Representante <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nombre_representante"
							{...register("nombre_representante")}
							onBlur={onFieldBlur}
							disabled={useSameAsPropietario}
						/>
						{errors.nombre_representante && (
							<p className="text-sm text-red-500 mt-1">{errors.nombre_representante.message}</p>
						)}
						<div className="mt-2">
							<SameAsCheckbox
								id="same-as-propietario"
								label="Mismo que propietario"
								checked={useSameAsPropietario}
								onCheckedChange={(checked) => {
									setUseSameAsPropietario(checked);
									if (checked) {
										setValue("nombre_representante", combinePropietarioNombre() || "");
										setValue("ci_representante", documentoPropietario || "");
										setValue("extension_representante", extensionPropietario || "");
									}
								}}
								sourceValue={combinePropietarioNombre()}
								onCopyValue={(value) => setValue("nombre_representante", value as string)}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor="ci_representante">
							CI del Representante <span className="text-red-500">*</span>
						</Label>
						<Input
							id="ci_representante"
							{...register("ci_representante")}
							onBlur={onFieldBlur}
							disabled={useSameAsPropietario}
							placeholder="Min. 7 dígitos"
						/>
						{errors.ci_representante && (
							<p className="text-sm text-red-500 mt-1">{errors.ci_representante.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="extension_representante">Extensión</Label>
						<Input
							id="extension_representante"
							{...register("extension_representante")}
							onBlur={onFieldBlur}
							disabled={useSameAsPropietario}
						/>
					</div>
				</div>
			</FormSection>
		</div>
	);
}
