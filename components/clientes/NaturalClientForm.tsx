"use client";

import { UseFormReturn, Controller } from "react-hook-form";
import {
	NaturalClientFormData,
	DOCUMENT_TYPES,
	CIVIL_STATUS,
	GENDER_OPTIONS,
	INCOME_LEVELS,
	ACCOUNT_STATES,
	Executive,
} from "@/types/clientForm";
import { FormSection } from "./FormSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

interface NaturalClientFormProps {
	form: UseFormReturn<NaturalClientFormData>;
	executives: Executive[];
	onFieldBlur?: () => void;
}

export function NaturalClientForm({ form, executives, onFieldBlur }: NaturalClientFormProps) {
	const {
		register,
		control,
		formState: { errors },
		watch,
	} = form;

	// Watch all tier 1 fields to determine completion
	const tier1Fields = watch([
		"primer_nombre",
		"primer_apellido",
		"tipo_documento",
		"numero_documento",
		"nacionalidad",
		"fecha_nacimiento",
		"direccion",
		"estado_civil",
		"fecha_ingreso_sarlaft",
		"executive_id",
	]);

	const tier1Complete =
		tier1Fields.every((field) => field !== undefined && field !== "" && field !== null) &&
		tier1Fields.length === 10;

	// Watch tier 2 & 3 fields for completion
	const tier2Fields = watch(["telefono", "actividad_economica", "lugar_trabajo"]);
	const tier2HasData = tier2Fields.some((field) => field && field !== "");

	const tier3Fields = watch([
		"email",
		"pais",
		"genero",
		"nivel_ingresos",
		"estado_cuenta",
		"saldo_promedio",
		"monto_ingreso",
		"monto_retiro",
	]);
	const tier3HasData = tier3Fields.some((field) => field && field !== "" && field !== 0);

	return (
		<div className="space-y-6">
			{/* TIER 1: Required Basic Data */}
			<FormSection
				title="Datos Básicos (Tier 1)"
				description="Información requerida para todos los clientes naturales"
				required
				completed={tier1Complete}
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Primer Nombre */}
					<div>
						<Label htmlFor="primer_nombre">
							Primer Nombre <span className="text-red-500">*</span>
						</Label>
						<Input
							id="primer_nombre"
							{...register("primer_nombre")}
							onBlur={onFieldBlur}
							placeholder="Juan"
						/>
						{errors.primer_nombre && (
							<p className="text-sm text-red-500 mt-1">{errors.primer_nombre.message}</p>
						)}
					</div>

					{/* Segundo Nombre */}
					<div>
						<Label htmlFor="segundo_nombre">Segundo Nombre</Label>
						<Input
							id="segundo_nombre"
							{...register("segundo_nombre")}
							onBlur={onFieldBlur}
							placeholder="Carlos"
						/>
					</div>

					{/* Primer Apellido */}
					<div>
						<Label htmlFor="primer_apellido">
							Primer Apellido <span className="text-red-500">*</span>
						</Label>
						<Input
							id="primer_apellido"
							{...register("primer_apellido")}
							onBlur={onFieldBlur}
							placeholder="Pérez"
						/>
						{errors.primer_apellido && (
							<p className="text-sm text-red-500 mt-1">{errors.primer_apellido.message}</p>
						)}
					</div>

					{/* Segundo Apellido */}
					<div>
						<Label htmlFor="segundo_apellido">Segundo Apellido</Label>
						<Input
							id="segundo_apellido"
							{...register("segundo_apellido")}
							onBlur={onFieldBlur}
							placeholder="García"
						/>
					</div>

					{/* Tipo de Documento */}
					<div>
						<Label htmlFor="tipo_documento">
							Tipo de Documento <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="tipo_documento"
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
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{DOCUMENT_TYPES.map((type) => (
											<SelectItem key={type} value={type}>
												{type}
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

					{/* Número de Documento */}
					<div>
						<Label htmlFor="numero_documento">
							Número de Documento <span className="text-red-500">*</span>
						</Label>
						<Input
							id="numero_documento"
							{...register("numero_documento")}
							onBlur={onFieldBlur}
							placeholder="1234567"
						/>
						{errors.numero_documento && (
							<p className="text-sm text-red-500 mt-1">{errors.numero_documento.message}</p>
						)}
					</div>

					{/* Nacionalidad */}
					<div>
						<Label htmlFor="nacionalidad">
							Nacionalidad <span className="text-red-500">*</span>
						</Label>
						<Input
							id="nacionalidad"
							{...register("nacionalidad")}
							onBlur={onFieldBlur}
							placeholder="Boliviana"
						/>
						{errors.nacionalidad && (
							<p className="text-sm text-red-500 mt-1">{errors.nacionalidad.message}</p>
						)}
					</div>

					{/* Fecha de Nacimiento */}
					<div>
						<Label htmlFor="fecha_nacimiento">
							Fecha de Nacimiento <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="fecha_nacimiento"
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
						{errors.fecha_nacimiento && (
							<p className="text-sm text-red-500 mt-1">{errors.fecha_nacimiento.message}</p>
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
							placeholder="Av. Principal #123"
						/>
						{errors.direccion && (
							<p className="text-sm text-red-500 mt-1">{errors.direccion.message}</p>
						)}
					</div>

					{/* Estado Civil */}
					<div>
						<Label htmlFor="estado_civil">
							Estado Civil <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="estado_civil"
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
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{CIVIL_STATUS.map((status) => (
											<SelectItem key={status} value={status}>
												{status}
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

					{/* Fecha de Ingreso SARLAFT */}
					<div>
						<Label htmlFor="fecha_ingreso_sarlaft">
							Fecha de Ingreso (SARLAFT) <span className="text-red-500">*</span>
						</Label>
						<Controller
							name="fecha_ingreso_sarlaft"
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
						{errors.fecha_ingreso_sarlaft && (
							<p className="text-sm text-red-500 mt-1">{errors.fecha_ingreso_sarlaft.message}</p>
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

			{/* TIER 2: Additional Data (Premium $1001-$5000) */}
			<FormSection
				title="Datos Adicionales (Tier 2)"
				description="Requerido cuando el cliente tenga pólizas con prima total entre $1001-$5000"
				required={false}
				completed={tier2HasData}
			>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Teléfono */}
					<div>
						<Label htmlFor="telefono">Teléfono</Label>
						<Input
							id="telefono"
							{...register("telefono")}
							onBlur={onFieldBlur}
							placeholder="70123456"
						/>
					</div>

					{/* Actividad Económica */}
					<div>
						<Label htmlFor="actividad_economica">Actividad Económica</Label>
						<Input
							id="actividad_economica"
							{...register("actividad_economica")}
							onBlur={onFieldBlur}
							placeholder="Comercio"
						/>
					</div>

					{/* Lugar de Trabajo */}
					<div>
						<Label htmlFor="lugar_trabajo">Lugar de Trabajo</Label>
						<Input
							id="lugar_trabajo"
							{...register("lugar_trabajo")}
							onBlur={onFieldBlur}
							placeholder="Empresa ABC"
						/>
					</div>
				</div>
			</FormSection>

			{/* TIER 3: Extended Data (Premium above $5000) */}
			<FormSection
				title="Datos Extendidos (Tier 3)"
				description="Requerido cuando el cliente tenga pólizas con prima total superior a $5000"
				required={false}
				completed={tier3HasData}
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Email */}
					<div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							{...register("email")}
							onBlur={onFieldBlur}
							placeholder="cliente@email.com"
						/>
						{errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
					</div>

					{/* País */}
					<div>
						<Label htmlFor="pais">País</Label>
						<Input id="pais" {...register("pais")} onBlur={onFieldBlur} placeholder="Bolivia" />
					</div>

					{/* Género */}
					<div>
						<Label htmlFor="genero">Género</Label>
						<Controller
							name="genero"
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
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{GENDER_OPTIONS.map((gender) => (
											<SelectItem key={gender} value={gender}>
												{gender}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					{/* Nivel de Ingresos */}
					<div>
						<Label htmlFor="nivel_ingresos">Nivel de Ingresos</Label>
						<Controller
							name="nivel_ingresos"
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
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{INCOME_LEVELS.map((level) => (
											<SelectItem key={level} value={level}>
												{level}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					{/* Estado de Cuenta */}
					<div>
						<Label htmlFor="estado_cuenta">Estado de Cuenta</Label>
						<Controller
							name="estado_cuenta"
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
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{ACCOUNT_STATES.map((state) => (
											<SelectItem key={state} value={state}>
												{state}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					</div>

					{/* Saldo Promedio */}
					<div>
						<Label htmlFor="saldo_promedio">Saldo Promedio (Bs)</Label>
						<Input
							id="saldo_promedio"
							type="number"
							{...register("saldo_promedio", { valueAsNumber: true })}
							onBlur={onFieldBlur}
							placeholder="10000"
						/>
					</div>

					{/* Monto Ingreso */}
					<div>
						<Label htmlFor="monto_ingreso">Monto Ingreso (Bs)</Label>
						<Input
							id="monto_ingreso"
							type="number"
							{...register("monto_ingreso", { valueAsNumber: true })}
							onBlur={onFieldBlur}
							placeholder="5000"
						/>
					</div>

					{/* Monto Retiro */}
					<div>
						<Label htmlFor="monto_retiro">Monto Retiro (Bs)</Label>
						<Input
							id="monto_retiro"
							type="number"
							{...register("monto_retiro", { valueAsNumber: true })}
							onBlur={onFieldBlur}
							placeholder="3000"
						/>
					</div>
				</div>
			</FormSection>
		</div>
	);
}
