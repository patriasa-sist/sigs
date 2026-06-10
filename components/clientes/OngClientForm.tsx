"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { OngClientFormData, type ExtraPhone } from "@/types/clientForm";
import type { ClienteDocumentoFormState, TipoDocumentoCliente } from "@/types/clienteDocumento";
import { FormSection } from "./FormSection";
import { ExtraPhonesInput } from "./ExtraPhonesInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClienteDocumentUpload } from "./ClienteDocumentUpload";

interface OngClientFormProps {
	form: UseFormReturn<OngClientFormData>;
	onFieldBlur?: () => void;
	exceptions?: TipoDocumentoCliente[];
}

export function OngClientForm({ form, onFieldBlur, exceptions = [] }: OngClientFormProps) {
	const {
		register,
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

	// Error border helper
	const eb = (hasErr: boolean) => (hasErr ? "border-destructive focus-visible:ring-destructive/20" : "");

	const documentos = watch("documentos") as ClienteDocumentoFormState[] | undefined;
	const celularesExtra = watch("celulares_extra") as ExtraPhone[] | undefined;

	return (
		<div className="space-y-6">
			{/* SECCIÓN 1: DATOS DE LA ONG */}
			<FormSection
				title="Datos de la ONG"
				description="Información de identificación de la organización"
				required
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="md:col-span-2">
						<Label htmlFor="nombre_ong">
							Nombre de la ONG <span className="text-destructive">*</span>
						</Label>
						<Input
							id="nombre_ong"
							{...ur("nombre_ong")}
							onBlur={onFieldBlur}
							placeholder="FUNDACIÓN EJEMPLO BOLIVIA"
							className={eb(!!errors.nombre_ong)}
						/>
						{errors.nombre_ong && (
							<p className="text-sm text-destructive mt-1">{errors.nombre_ong.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="sigla">Sigla / Acrónimo</Label>
						<Input id="sigla" {...ur("sigla")} onBlur={onFieldBlur} placeholder="FEB" />
					</div>

					<div>
						<Label htmlFor="pais_origen">
							País de Origen <span className="text-destructive">*</span>
						</Label>
						<Input
							id="pais_origen"
							{...ur("pais_origen")}
							onBlur={onFieldBlur}
							placeholder="BOLIVIA"
							defaultValue="BOLIVIA"
							className={eb(!!errors.pais_origen)}
						/>
						{errors.pais_origen && (
							<p className="text-sm text-destructive mt-1">{errors.pais_origen.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="nit">
							NIT o Equivalente <span className="text-muted-foreground text-xs">(opcional)</span>
						</Label>
						<Input id="nit" {...register("nit")} onBlur={onFieldBlur} placeholder="123456789" />
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

					<div className="md:col-span-2">
						<Label htmlFor="actividad_principal">Actividad Principal / Misión</Label>
						<Input
							id="actividad_principal"
							{...ur("actividad_principal")}
							onBlur={onFieldBlur}
							placeholder="DESARROLLO COMUNITARIO Y EDUCACIÓN"
						/>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 2: INFORMACIÓN DE CONTACTO */}
			<FormSection title="Información de Contacto" description="Datos de contacto de la ONG" required>
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
							placeholder="contacto@ong.org"
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
						{errors.telefono && <p className="text-sm text-destructive mt-1">{errors.telefono.message}</p>}
					</div>

					<div className="md:col-span-2">
						<ExtraPhonesInput
							phones={celularesExtra ?? []}
							onChange={(phones) => setValue("celulares_extra", phones)}
						/>
					</div>
				</div>
			</FormSection>

			{/* SECCIÓN 3: REPRESENTANTE LEGAL / MAE */}
			<FormSection
				title="Representante Legal / MAE"
				description="Máxima Autoridad Ejecutiva o representante legal de la ONG"
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
							placeholder="REPRESENTANTE LEGAL / DIRECTOR EJECUTIVO / MAE"
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
			<FormSection title="Documentos" description="Documentos requeridos para el registro de la ONG">
				<ClienteDocumentUpload
					clientType="ong"
					documentos={documentos ?? []}
					onDocumentosChange={(docs) => setValue("documentos", docs)}
					exceptions={exceptions}
				/>
			</FormSection>
		</div>
	);
}
