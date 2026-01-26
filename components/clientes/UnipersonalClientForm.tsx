"use client";

import { useState } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import {
	UnipersonalClientFormData,
	ClientPartnerData,
	DOCUMENT_TYPES,
	CIVIL_STATUS,
	GENDER_OPTIONS,
	INCOME_LEVELS,
	INCOME_VALUES,
} from "@/types/clientForm";
import type { ClienteDocumentoFormState } from "@/types/clienteDocumento";
import { FormSection } from "./FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SameAsCheckbox } from "@/components/ui/same-as-checkbox";
import { ExecutiveDropdown } from "@/components/shared/ExecutiveDropdown";
import { ClienteDocumentUpload } from "./ClienteDocumentUpload";

interface UnipersonalClientFormProps {
	form: UseFormReturn<UnipersonalClientFormData>;
	partnerForm?: UseFormReturn<ClientPartnerData>;
	onFieldBlur?: () => void;
}

export function UnipersonalClientForm({ form, partnerForm, onFieldBlur }: UnipersonalClientFormProps) {
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

	// "Same As" checkbox states
	const [useSameAsDireccion, setUseSameAsDireccion] = useState(false);
	const [useSameAsEmail, setUseSameAsEmail] = useState(false);
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

	// Helper function to combine nombres for "same as" checkbox
	const combineNombreCompleto = () => {
		const nombreCompleto = [primerNombre, segundoNombre, primerApellido, segundoApellido].filter(Boolean).join(" ");
		return nombreCompleto || undefined;
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
						<Input
							id="fecha_nacimiento"
							type="date"
							{...register("fecha_nacimiento")}
							onBlur={onFieldBlur}
							className={errors.fecha_nacimiento ? "border-red-500" : ""}
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

					{/* Ejecutivo a Cargo */}
					<div>
						<Controller
							name="executive_in_charge"
							control={control}
							render={({ field }) => (
								<ExecutiveDropdown
									value={field.value}
									onValueChange={field.onChange}
									error={errors.executive_in_charge?.message}
									label="Director de cartera"
									placeholder="Seleccione un director"
									required={true}
									showRole={false}
								/>
							)}
						/>
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
						{errors.direccion && <p className="text-sm text-red-500 mt-1">{errors.direccion.message}</p>}
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
						<Label htmlFor="profesion_oficio">
							Profesión u Oficio <span className="text-red-500">*</span>
						</Label>
						<Input id="profesion_oficio" {...register("profesion_oficio")} onBlur={onFieldBlur} />
						{errors.profesion_oficio && (
							<p className="text-sm text-red-500 mt-1">{errors.profesion_oficio.message}</p>
						)}
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
						<Label htmlFor="pais_residencia">
							País de Residencia <span className="text-red-500">*</span>
						</Label>
						<Input
							id="pais_residencia"
							{...register("pais_residencia")}
							onBlur={onFieldBlur}
							defaultValue="Bolivia"
							readOnly
							className="bg-muted cursor-not-allowed"
						/>
						{errors.pais_residencia && (
							<p className="text-sm text-red-500 mt-1">{errors.pais_residencia.message}</p>
						)}
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
						<Input
							id="anio_ingreso"
							type="number"
							min={1900}
							max={new Date().getFullYear()}
							placeholder="Ej: 2020"
							{...register("anio_ingreso", { valueAsNumber: true })}
							onBlur={onFieldBlur}
							className={errors.anio_ingreso ? "border-red-500" : ""}
						/>
						{errors.anio_ingreso && (
							<p className="text-sm text-red-500 mt-1">{errors.anio_ingreso.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="nit">NIT de Facturación</Label>
						<Input id="nit" {...register("nit")} onBlur={onFieldBlur} placeholder="Min. 7 dígitos" />
						{errors.nit && <p className="text-sm text-red-500 mt-1">{errors.nit.message}</p>}
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="domicilio_comercial">Dirección de Facturación</Label>
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
						<Label htmlFor="matricula_comercio">Matrícula de Comercio SEPREC</Label>
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
							type="tel"
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
							Nivel de Ingresos aproximado<span className="text-red-500">*</span>
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
												{level.charAt(0).toUpperCase() + level.slice(1)} (Bs.
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

			{/* SECCIÓN 5: REPRESENTANTE LEGAL */}
			<FormSection title="Representante Legal" description="Persona autorizada para actuar en nombre del negocio">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<div className="mb-2">
							<SameAsCheckbox
								id="same-as-propietario"
								label="Mismos datos personales"
								checked={useSameAsPropietario}
								onCheckedChange={(checked) => {
									setUseSameAsPropietario(checked);
									if (checked) {
										setValue("nombre_representante", combineNombreCompleto() || "");
										setValue("ci_representante", numeroDocumento || "");
										setValue("extension_representante", extensionCi || "");
									}
								}}
								sourceValue={combineNombreCompleto()}
								onCopyValue={(value) => setValue("nombre_representante", value as string)}
							/>
						</div>
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

			{/* SECCIÓN 7: DATOS DEL CÓNYUGE (Conditional) */}
			{showPartnerSection && partnerForm && (
				<FormSection
					title="Datos del Cónyuge"
					description="Información del cónyuge (requerido para clientes casados)"
				>
					<PartnerFields form={partnerForm} onFieldBlur={onFieldBlur} />
				</FormSection>
			)}

			{/* SECCIÓN: DOCUMENTOS DEL CLIENTE */}
			<FormSection
				title="Documentos del Cliente"
				description="Cargue los documentos requeridos del cliente unipersonal"
			>
				<ClienteDocumentUpload
					clientType="unipersonal"
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

// Partner fields component
function PartnerFields({ form, onFieldBlur }: { form: UseFormReturn<ClientPartnerData>; onFieldBlur?: () => void }) {
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
				{errors.primer_nombre && <p className="text-sm text-red-500 mt-1">{errors.primer_nombre.message}</p>}
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
				<Input id="partner_celular" {...register("celular")} onBlur={onFieldBlur} placeholder="Solo números" />
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
				{errors.lugar_trabajo && <p className="text-sm text-red-500 mt-1">{errors.lugar_trabajo.message}</p>}
			</div>
		</div>
	);
}
