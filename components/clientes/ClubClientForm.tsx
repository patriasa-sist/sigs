"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import {
	ClubClientFormData,
	SPORTS_DISCIPLINES,
	CLUB_REGISTRY_TYPES,
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

interface ClubClientFormProps {
	form: UseFormReturn<ClubClientFormData>;
	onFieldBlur?: () => void;
	exceptions?: TipoDocumentoCliente[];
}

const DISCIPLINE_LABELS: Record<(typeof SPORTS_DISCIPLINES)[number], string> = {
	futbol: "Fútbol",
	basquetbol: "Básquetbol",
	voleibol: "Voleibol",
	tenis: "Tenis",
	natacion: "Natación",
	ciclismo: "Ciclismo",
	multiple: "Múltiple",
	otra: "Otra",
};

const REGISTRY_LABELS: Record<(typeof CLUB_REGISTRY_TYPES)[number], string> = {
	municipal: "Gobierno Municipal",
	gobernacion: "Gobernación Departamental",
	viceministerio_de_deportes: "Viceministerio de Deportes",
	otra: "Otra institución pública",
};

export function ClubClientForm({ form, onFieldBlur, exceptions = [] }: ClubClientFormProps) {
	const {
		register,
		control,
		formState: { errors },
		watch,
		setValue,
	} = form;

	// Auto-uppercase helper for text inputs
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
			{/* SECCIÓN 1: DATOS DEL CLUB */}
			<FormSection title="Datos del Club" description="Identificación del club deportivo" required>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="nombre_club">
							Nombre del Club <span className="text-destructive">*</span>
						</Label>
						<Input
							id="nombre_club"
							{...ur("nombre_club")}
							onBlur={onFieldBlur}
							placeholder="CLUB DEPORTIVO BOLÍVAR"
							className={eb(!!errors.nombre_club)}
						/>
						{errors.nombre_club && (
							<p className="text-sm text-destructive mt-1">{errors.nombre_club.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="sigla">Sigla / Acrónimo</Label>
						<Input
							id="sigla"
							{...ur("sigla")}
							onBlur={onFieldBlur}
							placeholder="CDB"
						/>
					</div>

					<div>
						<Label htmlFor="disciplina_principal">
							Disciplina Principal <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="disciplina_principal"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className={cn("w-full", eb(!!errors.disciplina_principal))}>
										<SelectValue placeholder="Seleccionar disciplina" />
									</SelectTrigger>
									<SelectContent>
										{SPORTS_DISCIPLINES.map((d) => (
											<SelectItem key={d} value={d}>
												{DISCIPLINE_LABELS[d]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.disciplina_principal && (
							<p className="text-sm text-destructive mt-1">{errors.disciplina_principal.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="nit">
							NIT <span className="text-muted-foreground text-xs">(opcional)</span>
						</Label>
						<Input
							id="nit"
							{...register("nit")}
							onBlur={onFieldBlur}
							placeholder="123456789"
						/>
					</div>

					<div>
						<Label htmlFor="numero_registro_vipfe">
							N° Registro VIPFE <span className="text-muted-foreground text-xs">(si corresponde)</span>
						</Label>
						<Input
							id="numero_registro_vipfe"
							{...ur("numero_registro_vipfe")}
							onBlur={onFieldBlur}
							placeholder="VIPFE-2024-001"
						/>
					</div>

					<div>
						<Label htmlFor="tipo_registro">
							Tipo de Registro <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="tipo_registro"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger className={cn("w-full", eb(!!errors.tipo_registro))}>
										<SelectValue placeholder="Seleccionar institución" />
									</SelectTrigger>
									<SelectContent>
										{CLUB_REGISTRY_TYPES.map((t) => (
											<SelectItem key={t} value={t}>
												{REGISTRY_LABELS[t]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.tipo_registro && (
							<p className="text-sm text-destructive mt-1">{errors.tipo_registro.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="entidad_registro">
							Entidad Emisora <span className="text-destructive">*</span>
						</Label>
						<Input
							id="entidad_registro"
							{...ur("entidad_registro")}
							onBlur={onFieldBlur}
							placeholder="GAMLP - LA PAZ"
							className={eb(!!errors.entidad_registro)}
						/>
						{errors.entidad_registro && (
							<p className="text-sm text-destructive mt-1">{errors.entidad_registro.message}</p>
						)}
					</div>

					<div className="md:col-span-2">
						<Label htmlFor="numero_registro">
							N° de Registro <span className="text-destructive">*</span>
						</Label>
						<Input
							id="numero_registro"
							{...ur("numero_registro")}
							onBlur={onFieldBlur}
							placeholder="REG-2024-0123"
							className={eb(!!errors.numero_registro)}
						/>
						{errors.numero_registro && (
							<p className="text-sm text-destructive mt-1">{errors.numero_registro.message}</p>
						)}
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 2: INFORMACIÓN DE CONTACTO */}
			<FormSection title="Información de Contacto" description="Datos de contacto del club" required>
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
							placeholder="contacto@club.org.bo"
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
				description="Presidente, director ejecutivo u otro representante legal"
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
							placeholder="PRESIDENTE / DIRECTOR EJECUTIVO"
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
			<FormSection title="Documentos" description="Documentos requeridos para el registro del club">
				<ClienteDocumentUpload
					clientType="club"
					documentos={documentos ?? []}
					onDocumentosChange={(docs) => setValue("documentos", docs)}
					exceptions={exceptions}
				/>
			</FormSection>
		</div>
	);
}
