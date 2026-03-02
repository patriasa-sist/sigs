"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Minus, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ConfigAnexo as ConfigAnexoType } from "@/types/anexo";

type Props = {
	config: ConfigAnexoType | null;
	tieneAnulacionPendiente: boolean;
	onChange: (config: ConfigAnexoType) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

const TIPOS_ANEXO = [
	{
		value: "inclusion" as const,
		label: "Inclusión",
		description: "Agregar bienes o beneficiarios a la póliza, aumentando la prima",
		icon: Plus,
		color: "border-green-200 bg-green-50 text-green-700",
		selectedColor: "border-green-500 bg-green-100 ring-2 ring-green-500",
	},
	{
		value: "exclusion" as const,
		label: "Exclusión",
		description: "Quitar bienes o beneficiarios de la póliza, reduciendo la prima",
		icon: Minus,
		color: "border-orange-200 bg-orange-50 text-orange-700",
		selectedColor: "border-orange-500 bg-orange-100 ring-2 ring-orange-500",
	},
	{
		value: "anulacion" as const,
		label: "Anulación",
		description: "Anular la póliza completamente. No se permitirán más operaciones.",
		icon: XCircle,
		color: "border-red-200 bg-red-50 text-red-700",
		selectedColor: "border-red-500 bg-red-100 ring-2 ring-red-500",
	},
];

export function ConfigAnexo({ config, tieneAnulacionPendiente, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoAnexo, setTipoAnexo] = useState(config?.tipo_anexo || "");
	const [numeroAnexo, setNumeroAnexo] = useState(config?.numero_anexo || "");
	const [fechaEfectiva, setFechaEfectiva] = useState(config?.fecha_efectiva || new Date().toISOString().split("T")[0]);
	const [observaciones, setObservaciones] = useState(config?.observaciones || "");
	const [errores, setErrores] = useState<string[]>([]);

	const handleContinuar = () => {
		const nuevosErrores: string[] = [];

		if (!tipoAnexo) {
			nuevosErrores.push("Seleccione el tipo de anexo");
		}

		if (!numeroAnexo.trim()) {
			nuevosErrores.push("El número de anexo es obligatorio");
		}

		if (!fechaEfectiva) {
			nuevosErrores.push("La fecha efectiva es obligatoria");
		}

		if (nuevosErrores.length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		setErrores([]);
		onChange({
			tipo_anexo: tipoAnexo as "inclusion" | "exclusion" | "anulacion",
			numero_anexo: numeroAnexo.trim(),
			fecha_efectiva: fechaEfectiva,
			observaciones: observaciones.trim(),
		});
		onSiguiente();
	};

	return (
		<div className="bg-white border rounded-lg p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-6">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
					2
				</div>
				<h2 className="text-lg font-semibold">Configuración del Anexo</h2>
			</div>

			{/* Tipo de Anexo */}
			<div className="mb-6">
				<Label className="text-sm font-medium mb-3 block">Tipo de Anexo</Label>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{TIPOS_ANEXO.map((tipo) => {
						const Icon = tipo.icon;
						const isSelected = tipoAnexo === tipo.value;
						const isDisabled = tipo.value === "anulacion" && tieneAnulacionPendiente;

						return (
							<button
								key={tipo.value}
								type="button"
								disabled={isDisabled}
								onClick={() => setTipoAnexo(tipo.value)}
								className={`p-4 rounded-lg border-2 text-left transition-all ${
									isDisabled
										? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
										: isSelected
										? tipo.selectedColor
										: `${tipo.color} hover:shadow-md cursor-pointer`
								}`}
							>
								<div className="flex items-center gap-2 mb-2">
									<Icon className="h-5 w-5" />
									<span className="font-semibold">{tipo.label}</span>
								</div>
								<p className="text-xs opacity-80">{tipo.description}</p>
								{isDisabled && (
									<p className="text-xs text-red-600 mt-2">Ya existe una anulación pendiente</p>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Warning para anulación */}
			{tipoAnexo === "anulacion" && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
					<AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-medium text-red-800">Atención: Anulación de póliza</p>
						<p className="text-xs text-red-600 mt-1">
							Al validarse este anexo, la póliza quedará permanentemente anulada.
							No se podrán crear más anexos ni editar la póliza.
						</p>
					</div>
				</div>
			)}

			{/* Número de Anexo */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div>
					<Label htmlFor="numero_anexo">Número de Anexo *</Label>
					<Input
						id="numero_anexo"
						value={numeroAnexo}
						onChange={(e) => setNumeroAnexo(e.target.value)}
						placeholder="Ej: ANX-001"
					/>
				</div>
				<div>
					<Label htmlFor="fecha_efectiva">Fecha Efectiva *</Label>
					<Input
						id="fecha_efectiva"
						type="date"
						value={fechaEfectiva}
						onChange={(e) => setFechaEfectiva(e.target.value)}
					/>
				</div>
			</div>

			{/* Observaciones */}
			<div className="mb-6">
				<Label htmlFor="observaciones">Observaciones</Label>
				<Textarea
					id="observaciones"
					value={observaciones}
					onChange={(e) => setObservaciones(e.target.value)}
					placeholder="Notas adicionales sobre este anexo..."
					rows={3}
				/>
			</div>

			{/* Errores */}
			{errores.length > 0 && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
					{errores.map((err, i) => (
						<p key={i} className="text-sm text-red-700">{err}</p>
					))}
				</div>
			)}

			{/* Navegación */}
			<div className="flex justify-between">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="h-4 w-4 mr-1" />
					Anterior
				</Button>
				<Button onClick={handleContinuar} disabled={!tipoAnexo}>
					Siguiente
					<ChevronRight className="h-4 w-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}
