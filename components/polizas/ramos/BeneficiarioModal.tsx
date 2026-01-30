"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { BeneficiarioSalud, NivelSalud } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
	beneficiario: BeneficiarioSalud | null;
	niveles: NivelSalud[];
	onGuardar: (beneficiario: BeneficiarioSalud) => void;
	onCancelar: () => void;
};

type ErroresBeneficiario = {
	nombre_completo?: string;
	carnet?: string;
	fecha_nacimiento?: string;
	genero?: string;
	nivel_id?: string;
	rol?: string;
};

export function BeneficiarioModal({ beneficiario, niveles, onGuardar, onCancelar }: Props) {
	const [formData, setFormData] = useState<Partial<BeneficiarioSalud>>(
		beneficiario || {
			id: crypto.randomUUID(),
			nombre_completo: "",
			carnet: "",
			fecha_nacimiento: "",
			genero: "M",
			nivel_id: niveles[0]?.id || "",
			rol: "dependiente",
		}
	);

	const [errores, setErrores] = useState<ErroresBeneficiario>({});

	const handleChange = (campo: keyof ErroresBeneficiario, valor: string) => {
		setFormData((prev) => ({
			...prev,
			[campo]: valor,
		}));

		// Limpiar error del campo
		if (errores[campo]) {
			const nuevosErrores = { ...errores };
			delete nuevosErrores[campo];
			setErrores(nuevosErrores);
		}
	};

	const validarBeneficiario = (): { valido: boolean; errores: ErroresBeneficiario } => {
		const nuevosErrores: ErroresBeneficiario = {};

		// Validar nombre completo
		if (!formData.nombre_completo || formData.nombre_completo.trim() === "") {
			nuevosErrores.nombre_completo = "El nombre completo es obligatorio";
		}

		// Validar carnet
		if (!formData.carnet || formData.carnet.trim() === "") {
			nuevosErrores.carnet = "El carnet es obligatorio";
		}

		// Validar fecha de nacimiento
		if (!formData.fecha_nacimiento || formData.fecha_nacimiento.trim() === "") {
			nuevosErrores.fecha_nacimiento = "La fecha de nacimiento es obligatoria";
		} else {
			// Validar que la fecha no sea futura
			const fechaNac = new Date(formData.fecha_nacimiento);
			const hoy = new Date();
			if (fechaNac > hoy) {
				nuevosErrores.fecha_nacimiento = "La fecha de nacimiento no puede ser futura";
			}

			// Validar que sea mayor de edad (opcional, ajustar según necesidad)
			const edad = hoy.getFullYear() - fechaNac.getFullYear();
			if (edad > 150) {
				nuevosErrores.fecha_nacimiento = "La fecha de nacimiento no es válida";
			}
		}

		// Validar género
		if (!formData.genero) {
			nuevosErrores.genero = "El género es obligatorio";
		}

		// Validar nivel
		if (!formData.nivel_id) {
			nuevosErrores.nivel_id = "Debe seleccionar un nivel de cobertura";
		}

		// Validar rol
		if (!formData.rol) {
			nuevosErrores.rol = "El rol es obligatorio";
		}

		return {
			valido: Object.keys(nuevosErrores).length === 0,
			errores: nuevosErrores,
		};
	};

	const handleGuardar = () => {
		const validacion = validarBeneficiario();

		if (!validacion.valido) {
			setErrores(validacion.errores);
			return;
		}

		onGuardar(formData as BeneficiarioSalud);
	};

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
					<h2 className="text-xl font-semibold">
						{beneficiario ? "Editar Beneficiario" : "Agregar Beneficiario"}
					</h2>
					<Button variant="ghost" size="icon" onClick={onCancelar} className="rounded-full">
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Body */}
				<div className="p-6">
					<div className="space-y-6">
						{/* Información de ayuda */}
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div className="flex items-start gap-2">
								<AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
								<div className="text-sm text-blue-900">
									<p className="font-medium mb-1">Beneficiarios de la póliza</p>
									<p>
										Los beneficiarios son dependientes (hijos, familiares) o cónyuges cubiertos por
										esta póliza. No necesitan estar registrados como clientes en el sistema. Los
										contratantes y titulares deben ser clientes registrados.
									</p>
								</div>
							</div>
						</div>

						{/* Nombre Completo */}
						<div className="space-y-2">
							<Label htmlFor="nombre_completo">
								Nombre Completo <span className="text-red-500">*</span>
							</Label>
							<Input
								id="nombre_completo"
								value={formData.nombre_completo}
								onChange={(e) => handleChange("nombre_completo", e.target.value)}
								placeholder="Juan Carlos Pérez López"
								className={errores.nombre_completo ? "border-red-500" : ""}
							/>
							{errores.nombre_completo && (
								<p className="text-sm text-red-600">{errores.nombre_completo}</p>
							)}
						</div>

						{/* Carnet */}
						<div className="space-y-2">
							<Label htmlFor="carnet">
								Carnet de Identidad <span className="text-red-500">*</span>
							</Label>
							<Input
								id="carnet"
								value={formData.carnet}
								onChange={(e) => handleChange("carnet", e.target.value)}
								placeholder="1234567 LP"
								className={errores.carnet ? "border-red-500" : ""}
							/>
							{errores.carnet && <p className="text-sm text-red-600">{errores.carnet}</p>}
							<p className="text-xs text-gray-500">
								Incluya el complemento si corresponde (ej: 1234567 LP)
							</p>
						</div>

						{/* Grid de 2 columnas para Fecha de Nacimiento y Género */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Fecha de Nacimiento */}
							<div className="space-y-2">
								<Label htmlFor="fecha_nacimiento">
									Fecha de Nacimiento <span className="text-red-500">*</span>
								</Label>
								<Input
									id="fecha_nacimiento"
									type="date"
									lang="es"
									value={formData.fecha_nacimiento}
									onChange={(e) => handleChange("fecha_nacimiento", e.target.value)}
									className={errores.fecha_nacimiento ? "border-red-500" : ""}
								/>
								{errores.fecha_nacimiento && (
									<p className="text-sm text-red-600">{errores.fecha_nacimiento}</p>
								)}
							</div>

							{/* Género */}
							<div className="space-y-2">
								<Label htmlFor="genero">
									Género <span className="text-red-500">*</span>
								</Label>
								<Select
									value={formData.genero}
									onValueChange={(value: "M" | "F" | "Otro") => handleChange("genero", value)}
								>
									<SelectTrigger className={errores.genero ? "border-red-500" : ""}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="M">Masculino</SelectItem>
										<SelectItem value="F">Femenino</SelectItem>
										<SelectItem value="Otro">Otro</SelectItem>
									</SelectContent>
								</Select>
								{errores.genero && <p className="text-sm text-red-600">{errores.genero}</p>}
							</div>
						</div>

						{/* Grid de 2 columnas para Nivel de Cobertura y Rol */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Nivel de Cobertura */}
							<div className="space-y-2">
								<Label htmlFor="nivel_id">
									Nivel de Cobertura <span className="text-red-500">*</span>
								</Label>
								<Select
									value={formData.nivel_id}
									onValueChange={(value) => handleChange("nivel_id", value)}
								>
									<SelectTrigger className={errores.nivel_id ? "border-red-500" : ""}>
										<SelectValue placeholder="Seleccione un nivel" />
									</SelectTrigger>
									<SelectContent>
										{niveles.map((nivel) => (
											<SelectItem key={nivel.id} value={nivel.id}>
												{nivel.nombre} - Bs {nivel.monto.toLocaleString()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errores.nivel_id && <p className="text-sm text-red-600">{errores.nivel_id}</p>}
								<p className="text-xs text-gray-500">Nivel de cobertura del beneficiario</p>
							</div>

							{/* Rol */}
							<div className="space-y-2">
								<Label htmlFor="rol">
									Rol <span className="text-red-500">*</span>
								</Label>
								<Select value={formData.rol} onValueChange={(value) => handleChange("rol", value)}>
									<SelectTrigger className={errores.rol ? "border-red-500" : ""}>
										<SelectValue placeholder="Seleccione un rol" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="dependiente">Dependiente</SelectItem>
										<SelectItem value="conyugue">Cónyuge</SelectItem>
									</SelectContent>
								</Select>
								{errores.rol && <p className="text-sm text-red-600">{errores.rol}</p>}
								<p className="text-xs text-gray-500">Dependiente (hijo/familiar) o cónyuge</p>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
					<Button variant="outline" onClick={onCancelar}>
						Cancelar
					</Button>
					<Button onClick={handleGuardar}>Guardar Beneficiario</Button>
				</div>
			</div>
		</div>
	);
}
