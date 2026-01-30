"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { NaveEmbarcacion, NivelAPNave } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
	nave: NaveEmbarcacion | null;
	nivelesAP: NivelAPNave[];
	tipoNave: "aeronave" | "embarcacion";
	onGuardar: (nave: NaveEmbarcacion) => void;
	onCancelar: () => void;
};

const ANO_ACTUAL = new Date().getFullYear();
const ANO_MIN = 1950;

export function NaveModal({ nave, nivelesAP, tipoNave, onGuardar, onCancelar }: Props) {
	const [formData, setFormData] = useState<Partial<NaveEmbarcacion>>(
		nave || {
			matricula: "",
			marca: "",
			modelo: "",
			ano: ANO_ACTUAL,
			serie: "",
			uso: "privado",
			nro_pasajeros: 0,
			nro_tripulantes: 1,
			valor_casco: 0,
			valor_responsabilidad_civil: 0,
			nivel_ap_id: undefined,
		}
	);

	const [errores, setErrores] = useState<Record<string, string>>({});

	const handleChange = (campo: keyof NaveEmbarcacion, valor: string | number | undefined) => {
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

	const validar = (): boolean => {
		const nuevosErrores: Record<string, string> = {};

		// Validaciones obligatorias
		if (!formData.matricula?.trim()) {
			nuevosErrores.matricula = "La matrícula es obligatoria";
		}
		if (!formData.marca?.trim()) {
			nuevosErrores.marca = "La marca es obligatoria";
		}
		if (!formData.modelo?.trim()) {
			nuevosErrores.modelo = "El modelo es obligatorio";
		}
		if (!formData.ano || formData.ano < ANO_MIN || formData.ano > ANO_ACTUAL + 1) {
			nuevosErrores.ano = `El año debe estar entre ${ANO_MIN} y ${ANO_ACTUAL + 1}`;
		}
		if (!formData.serie?.trim()) {
			nuevosErrores.serie = "El número de serie es obligatorio";
		}
		if (!formData.uso) {
			nuevosErrores.uso = "El uso es obligatorio";
		}
		if (formData.nro_pasajeros === undefined || formData.nro_pasajeros < 0) {
			nuevosErrores.nro_pasajeros = "El número de pasajeros debe ser 0 o mayor";
		}
		if (formData.nro_tripulantes === undefined || formData.nro_tripulantes < 1) {
			nuevosErrores.nro_tripulantes = "Debe haber al menos 1 tripulante";
		}
		if (!formData.valor_casco || formData.valor_casco <= 0) {
			nuevosErrores.valor_casco = "El valor del casco debe ser mayor a 0";
		}
		if (formData.valor_responsabilidad_civil === undefined || formData.valor_responsabilidad_civil < 0) {
			nuevosErrores.valor_responsabilidad_civil = "El valor de RC debe ser 0 o mayor";
		}

		setErrores(nuevosErrores);
		return Object.keys(nuevosErrores).length === 0;
	};

	const handleGuardar = () => {
		if (!validar()) return;

		onGuardar(formData as NaveEmbarcacion);
	};

	const tipoLabel = tipoNave === "aeronave" ? "Aeronave" : "Nave/Embarcación";

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
					<h2 className="text-xl font-semibold">
						{nave ? `Editar ${tipoLabel}` : `Agregar ${tipoLabel}`}
					</h2>
					<Button variant="ghost" size="icon" onClick={onCancelar} className="rounded-full">
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Body */}
				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* DATOS DE IDENTIFICACIÓN */}
						<div className="md:col-span-2">
							<h3 className="text-sm font-semibold text-gray-900 mb-4">
								Datos de Identificación
							</h3>
						</div>

						{/* Matrícula */}
						<div className="space-y-2">
							<Label htmlFor="matricula">
								Matrícula <span className="text-red-500">*</span>
							</Label>
							<Input
								id="matricula"
								value={formData.matricula}
								onChange={(e) => handleChange("matricula", e.target.value.toUpperCase())}
								placeholder="Ej: CP-1234"
								className={errores.matricula ? "border-red-500" : ""}
							/>
							{errores.matricula && <p className="text-sm text-red-600">{errores.matricula}</p>}
						</div>

						{/* Serie */}
						<div className="space-y-2">
							<Label htmlFor="serie">
								Número de Serie <span className="text-red-500">*</span>
							</Label>
							<Input
								id="serie"
								value={formData.serie}
								onChange={(e) => handleChange("serie", e.target.value.toUpperCase())}
								placeholder="Ej: SN123456789"
								className={errores.serie ? "border-red-500" : ""}
							/>
							{errores.serie && <p className="text-sm text-red-600">{errores.serie}</p>}
						</div>

						{/* Marca */}
						<div className="space-y-2">
							<Label htmlFor="marca">
								Marca <span className="text-red-500">*</span>
							</Label>
							<Input
								id="marca"
								value={formData.marca}
								onChange={(e) => handleChange("marca", e.target.value)}
								placeholder={tipoNave === "aeronave" ? "Ej: Cessna, Boeing" : "Ej: Yamaha, Sea-Doo"}
								className={errores.marca ? "border-red-500" : ""}
							/>
							{errores.marca && <p className="text-sm text-red-600">{errores.marca}</p>}
						</div>

						{/* Modelo */}
						<div className="space-y-2">
							<Label htmlFor="modelo">
								Modelo <span className="text-red-500">*</span>
							</Label>
							<Input
								id="modelo"
								value={formData.modelo}
								onChange={(e) => handleChange("modelo", e.target.value)}
								placeholder={tipoNave === "aeronave" ? "Ej: 172 Skyhawk" : "Ej: FX Cruiser"}
								className={errores.modelo ? "border-red-500" : ""}
							/>
							{errores.modelo && <p className="text-sm text-red-600">{errores.modelo}</p>}
						</div>

						{/* Año */}
						<div className="space-y-2">
							<Label htmlFor="ano">
								Año <span className="text-red-500">*</span>
							</Label>
							<Input
								id="ano"
								type="number"
								min={ANO_MIN}
								max={ANO_ACTUAL + 1}
								value={formData.ano ?? ""}
								onChange={(e) => handleChange("ano", parseInt(e.target.value) || undefined)}
								placeholder="2020"
								className={errores.ano ? "border-red-500" : ""}
							/>
							{errores.ano && <p className="text-sm text-red-600">{errores.ano}</p>}
						</div>

						{/* Uso */}
						<div className="space-y-2">
							<Label htmlFor="uso">
								Uso <span className="text-red-500">*</span>
							</Label>
							<Select
								value={formData.uso}
								onValueChange={(value) => handleChange("uso", value as "privado" | "publico" | "recreacion")}
							>
								<SelectTrigger className={errores.uso ? "border-red-500" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="privado">Privado</SelectItem>
									<SelectItem value="publico">Público</SelectItem>
									<SelectItem value="recreacion">Recreación</SelectItem>
								</SelectContent>
							</Select>
							{errores.uso && <p className="text-sm text-red-600">{errores.uso}</p>}
						</div>

						{/* CAPACIDAD */}
						<div className="md:col-span-2 mt-4">
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Capacidad</h3>
						</div>

						{/* Número de Pasajeros */}
						<div className="space-y-2">
							<Label htmlFor="nro_pasajeros">
								Número de Pasajeros <span className="text-red-500">*</span>
							</Label>
							<Input
								id="nro_pasajeros"
								type="number"
								min="0"
								value={formData.nro_pasajeros ?? ""}
								onChange={(e) => handleChange("nro_pasajeros", parseInt(e.target.value) || 0)}
								placeholder="4"
								className={errores.nro_pasajeros ? "border-red-500" : ""}
							/>
							{errores.nro_pasajeros && (
								<p className="text-sm text-red-600">{errores.nro_pasajeros}</p>
							)}
						</div>

						{/* Número de Tripulantes */}
						<div className="space-y-2">
							<Label htmlFor="nro_tripulantes">
								Número de Tripulantes <span className="text-red-500">*</span>
							</Label>
							<Input
								id="nro_tripulantes"
								type="number"
								min="1"
								value={formData.nro_tripulantes ?? ""}
								onChange={(e) => handleChange("nro_tripulantes", parseInt(e.target.value) || 1)}
								placeholder="2"
								className={errores.nro_tripulantes ? "border-red-500" : ""}
							/>
							{errores.nro_tripulantes && (
								<p className="text-sm text-red-600">{errores.nro_tripulantes}</p>
							)}
						</div>

						{/* VALORES ASEGURADOS */}
						<div className="md:col-span-2 mt-4">
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Valores Asegurados</h3>
						</div>

						{/* Valor Casco */}
						<div className="space-y-2">
							<Label htmlFor="valor_casco">
								Valor Casco <span className="text-red-500">*</span>
							</Label>
							<Input
								id="valor_casco"
								type="number"
								min="0"
								step="0.01"
								value={formData.valor_casco ?? ""}
								onChange={(e) => handleChange("valor_casco", parseFloat(e.target.value) || 0)}
								placeholder="100000"
								className={errores.valor_casco ? "border-red-500" : ""}
							/>
							{errores.valor_casco && <p className="text-sm text-red-600">{errores.valor_casco}</p>}
							<p className="text-xs text-gray-500">Valor asegurado del casco de la {tipoNave}</p>
						</div>

						{/* Valor Responsabilidad Civil */}
						<div className="space-y-2">
							<Label htmlFor="valor_responsabilidad_civil">
								Responsabilidad Civil <span className="text-red-500">*</span>
							</Label>
							<Input
								id="valor_responsabilidad_civil"
								type="number"
								min="0"
								step="0.01"
								value={formData.valor_responsabilidad_civil ?? ""}
								onChange={(e) => handleChange("valor_responsabilidad_civil", parseFloat(e.target.value) || 0)}
								placeholder="50000"
								className={errores.valor_responsabilidad_civil ? "border-red-500" : ""}
							/>
							{errores.valor_responsabilidad_civil && (
								<p className="text-sm text-red-600">{errores.valor_responsabilidad_civil}</p>
							)}
							<p className="text-xs text-gray-500">Cobertura de responsabilidad civil</p>
						</div>

						{/* Nivel de Accidentes Personales */}
						<div className="md:col-span-2 space-y-2">
							<Label htmlFor="nivel_ap">
								Nivel de Accidentes Personales (opcional)
							</Label>
							<Select
								value={formData.nivel_ap_id || "none"}
								onValueChange={(value) => handleChange("nivel_ap_id", value === "none" ? undefined : value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione un nivel de AP" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Sin cobertura de AP</SelectItem>
									{nivelesAP.map((nivel) => (
										<SelectItem key={nivel.id} value={nivel.id}>
											{nivel.nombre} - Muerte: {nivel.monto_muerte_accidental.toLocaleString("es-BO")},
											Invalidez: {nivel.monto_invalidez.toLocaleString("es-BO")},
											G.Médicos: {nivel.monto_gastos_medicos.toLocaleString("es-BO")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-gray-500">
								Cobertura de accidentes personales para tripulantes y pasajeros
							</p>
							{nivelesAP.length === 0 && (
								<p className="text-xs text-amber-600">
									No hay niveles de AP configurados. Configure niveles en la sección superior para asignarlos.
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
					<Button variant="outline" onClick={onCancelar}>
						Cancelar
					</Button>
					<Button onClick={handleGuardar}>
						{nave ? "Guardar Cambios" : `Agregar ${tipoLabel}`}
					</Button>
				</div>
			</div>
		</div>
	);
}
