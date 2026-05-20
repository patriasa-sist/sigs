"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import {
	AsociacionCivilClientFormData,
	ASOCIACION_CIVIL_TYPES,
	type ExtraPhone,
} from "@/types/clientForm";
import type { ClienteDocumentoFormState, TipoDocumentoCliente } from "@/types/clienteDocumento";
import { FormSection } from "./FormSection";
import { ExtraPhonesInput } from "./ExtraPhonesInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ClienteDocumentUpload } from "./ClienteDocumentUpload";
import { cn } from "@/lib/utils";

interface AsociacionCivilClientFormProps {
	form: UseFormReturn<AsociacionCivilClientFormData>;
	onFieldBlur?: () => void;
	exceptions?: TipoDocumentoCliente[];
}

const ASOCIACION_TYPE_LABELS: Record<(typeof ASOCIACION_CIVIL_TYPES)[number], string> = {
	sociedad_profesional: "Sociedad Profesional",
	asociacion_gremial: "Asociación Gremial",
	fundacion: "Fundación",
	otra: "Otra",
};

export function AsociacionCivilClientForm({ form, onFieldBlur, exceptions = [] }: AsociacionCivilClientFormProps) {
	const {
		register,
		control,
		formState: { errors },
		watch,
		setValue,
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

	const eb = (hasErr: boolean) => (hasErr ? "border-destructive focus-visible:ring-destructive/20" : "");

	const documentos = watch("documentos") as ClienteDocumentoFormState[] | undefined;
	const celularesExtra = watch("celulares_extra") as ExtraPhone[] | undefined;

	return (
		<div className="space-y-6">
			{/* SECCIÓN 1: DATOS DE LA ASOCIACIÓN */}
			<FormSection title="Datos de la Asociación" description="Identificación de la asociación civil sin fines de lucro" required>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="nombre_asociacion">
							Nombre de la Asociación <span className="text-destructive">*</span>
						</Label>
						<Input
							id="nombre_asociacion"
							{...ur("nombre_asociacion")}
							onBlur={onFieldBlur}
							placeholder="SOCIEDAD DE ARQUITECTOS DE LA PAZ"
							className={eb(!!errors.nombre_asociacion)}
						/>
						{errors.nombre_asociacion && (
							<p className="text-sm text-destructive mt-1">{errors.nombre_asociacion.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="sigla">Sigla / Acrónimo</Label>
						<Input
							id="sigla"
							{...ur("sigla")}
							onBlur={onFieldBlur}
							placeholder="SALP"
						/>
					</div>

					<div>
						<Label htmlFor="tipo_asociacion">
							Tipo de Asociación <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="tipo_asociacion"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className={cn("w-full", eb(!!errors.tipo_asociacion))}>
										<SelectValue placeholder="Seleccionar tipo" />
									</SelectTrigger>
									<SelectContent>
										{ASOCIACION_CIVIL_TYPES.map((t) => (
											<SelectItem key={t} value={t}>
												{ASOCIACION_TYPE_LABELS[t]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.tipo_asociacion && (
							<p className="text-sm text-destructive mt-1">{errors.tipo_asociacion.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="rubro_actividad">
							Rubro o Actividad <span className="text-destructive">*</span>
						</Label>
						<Input
							id="rubro_actividad"
							{...ur("rubro_actividad")}
							onBlur={onFieldBlur}
							placeholder="ARQUITECTURA / MEDICINA / INGENIERÍA"
							className={eb(!!errors.rubro_actividad)}
						/>
						{errors.rubro_actividad && (
							<p className="text-sm text-destructive mt-1">{errors.rubro_actividad.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="nit">
							NIT <span className="text-muted-foreground text-xs">(cuando corresponda)</span>
						</Label>
						<Input
							id="nit"
							{...register("nit")}
							onBlur={onFieldBlur}
							placeholder="123456789"
						/>
					</div>

					<div>
						<Label htmlFor="numero_personeria_juridica">
							N° Personería Jurídica <span className="text-destructive">*</span>
						</Label>
						<Input
							id="numero_personeria_juridica"
							{...ur("numero_personeria_juridica")}
							onBlur={onFieldBlur}
							placeholder="RES-ADM-2024-001"
							className={eb(!!errors.numero_personeria_juridica)}
						/>
						{errors.numero_personeria_juridica && (
							<p className="text-sm text-destructive mt-1">{errors.numero_personeria_juridica.message}</p>
						)}
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="entidad_otorgante_personeria">
							Entidad Otorgante <span className="text-destructive">*</span>
						</Label>
						<Input
							id="entidad_otorgante_personeria"
							{...ur("entidad_otorgante_personeria")}
							onBlur={onFieldBlur}
							placeholder="GOBERNACIÓN DE LA PAZ / MIN. DE AUTONOMÍAS"
							className={eb(!!errors.entidad_otorgante_personeria)}
						/>
						{errors.entidad_otorgante_personeria && (
							<p className="text-sm text-destructive mt-1">{errors.entidad_otorgante_personeria.message}</p>
						)}
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 2: INFORMACIÓN DE CONTACTO */}
			<FormSection title="Información de Contacto" description="Datos de contacto de la asociación" required>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="direccion">
							Dirección <span className="text-destructive">*</span>
						</Label>
						<Input
							id="direccion"
							{...ur("direccion")}
							onBlur={onFieldBlur}
							placeholder="AV. EJEMPLO N° 123, LA PAZ"
							className={eb(!!errors.direccion)}
						/>
						{errors.direccion && (
							<p className="text-sm text-destructive mt-1">{errors.direccion.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="correo_electronico">Correo Electrónico</Label>
						<Input
							id="correo_electronico"
							type="email"
							{...register("correo_electronico")}
							onBlur={onFieldBlur}
							placeholder="contacto@asociacion.org.bo"
							className={eb(!!errors.correo_electronico)}
						/>
						{errors.correo_electronico && (
							<p className="text-sm text-destructive mt-1">{errors.correo_electronico.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="telefono">Teléfono</Label>
						<Input
							id="telefono"
							{...register("telefono")}
							onBlur={onFieldBlur}
							placeholder="22123456"
							className={eb(!!errors.telefono)}
						/>
						{errors.telefono && (
							<p className="text-sm text-destructive mt-1">{errors.telefono.message}</p>
						)}
					</div>

					<div className="md:col-span-2">
						<ExtraPhonesInput
							phones={celularesExtra ?? []}
							onChange={(phones) => setValue("celulares_extra", phones)}
						/>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 3: REPRESENTANTE LEGAL */}
			<FormSection
				title="Representante Legal"
				description="Presidente, decano, director ejecutivo u otro representante legal"
				required
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label htmlFor="nombre_representante">
							Nombre(s) <span className="text-destructive">*</span>
						</Label>
						<Input
							id="nombre_representante"
							{...ur("nombre_representante")}
							onBlur={onFieldBlur}
							placeholder="JUAN PABLO"
							className={eb(!!errors.nombre_representante)}
						/>
						{errors.nombre_representante && (
							<p className="text-sm text-destructive mt-1">{errors.nombre_representante.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="apellido_representante">
							Apellido(s) <span className="text-destructive">*</span>
						</Label>
						<Input
							id="apellido_representante"
							{...ur("apellido_representante")}
							onBlur={onFieldBlur}
							placeholder="QUISPE MAMANI"
							className={eb(!!errors.apellido_representante)}
						/>
						{errors.apellido_representante && (
							<p className="text-sm text-destructive mt-1">{errors.apellido_representante.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="cargo_representante">
							Cargo <span className="text-destructive">*</span>
						</Label>
						<Input
							id="cargo_representante"
							{...ur("cargo_representante")}
							onBlur={onFieldBlur}
							placeholder="PRESIDENTE / DECANO / DIRECTOR EJECUTIVO"
							className={eb(!!errors.cargo_representante)}
						/>
						{errors.cargo_representante && (
							<p className="text-sm text-destructive mt-1">{errors.cargo_representante.message}</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div>
							<Label htmlFor="ci_representante">
								CI <span className="text-destructive">*</span>
							</Label>
							<Input
								id="ci_representante"
								{...register("ci_representante")}
								onBlur={onFieldBlur}
								placeholder="1234567"
								className={eb(!!errors.ci_representante)}
							/>
							{errors.ci_representante && (
								<p className="text-sm text-destructive mt-1">{errors.ci_representante.message}</p>
							)}
						</div>

						<div>
							<Label htmlFor="extension_ci_representante">
								Extensión CI
								<span className="ml-1 text-xs text-muted-foreground font-normal">(A, B, K…)</span>
							</Label>
							{(() => {
								const { onChange, ...restExt } = register("extension_ci_representante");
								return (
									<Input
										id="extension_ci_representante"
										{...restExt}
										onBlur={onFieldBlur}
										placeholder="A"
										maxLength={4}
										onChange={(e) => {
											const start = e.target.selectionStart;
											const end = e.target.selectionEnd;
											e.target.value = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase();
											e.target.setSelectionRange(start, end);
											return onChange(e);
										}}
									/>
								);
							})()}
						</div>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 4: DOCUMENTOS */}
			<FormSection title="Documentos" description="Documentos requeridos para el registro de la asociación civil">
				<ClienteDocumentUpload
					clientType="asociacion_civil"
					documentos={documentos ?? []}
					onDocumentosChange={(docs) => setValue("documentos", docs)}
					exceptions={exceptions}
				/>
			</FormSection>
		</div>
	);
}
