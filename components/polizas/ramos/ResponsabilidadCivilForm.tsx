"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import type { DatosResponsabilidadCivil } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
	datos: DatosResponsabilidadCivil | null;
	onChange: (datos: DatosResponsabilidadCivil) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function ResponsabilidadCivilForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza || "individual"
	);
	const [valorAsegurado, setValorAsegurado] = useState<number>(datos?.valor_asegurado || 0);
	const [errores, setErrores] = useState<Record<string, string>>({});
	// REMOVED: moneda (se usa la moneda de toda la póliza del paso 2)
	// REMOVED: asegurados (no es necesario para este ramo)
	// REMOVED: mostrarBuscador

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (valorAsegurado <= 0) {
			nuevosErrores.valor_asegurado = "El valor asegurado debe ser mayor a 0";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		onChange({
			tipo_poliza: tipoPoliza,
			valor_asegurado: valorAsegurado,
		});

		onSiguiente();
	};

	const tieneDatos = valorAsegurado > 0;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: Datos Específicos - Responsabilidad Civil
					</h2>
					<p className="text-sm text-gray-600 mt-1">Configure los detalles de la póliza</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Datos completos</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
				{/* Tipo de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">
						Tipo de Póliza <span className="text-red-500">*</span>
					</Label>
					<Select value={tipoPoliza} onValueChange={(value: "individual" | "corporativo") => setTipoPoliza(value)}>
						<SelectTrigger className="max-w-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="individual">Individual</SelectItem>
							<SelectItem value="corporativo">Corporativo</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Valor Asegurado - Simplificado */}
				<div className="space-y-2 max-w-md">
					<Label htmlFor="valor_asegurado">
						Valor Asegurado <span className="text-red-500">*</span>
					</Label>
					<Input
						id="valor_asegurado"
						type="number"
						min="0"
						step="0.01"
						value={valorAsegurado || ""}
						onChange={(e) => {
							setValorAsegurado(parseFloat(e.target.value) || 0);
							if (errores.valor_asegurado) {
								// eslint-disable-next-line @typescript-eslint/no-unused-vars
								const { valor_asegurado: _removed, ...rest } = errores;
								setErrores(rest);
							}
						}}
						placeholder="100000.00"
						className={errores.valor_asegurado ? "border-red-500" : ""}
					/>
					{errores.valor_asegurado && <p className="text-sm text-red-600">{errores.valor_asegurado}</p>}
					<p className="text-xs text-gray-500">
						La moneda se toma de los datos básicos de la póliza (Paso 2)
					</p>
				</div>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 mt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>
				<Button onClick={handleContinuar}>
					Continuar
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
