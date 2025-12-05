"use client";

import { ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import type { DatosEspecificosPoliza } from "@/types/poliza";
import { Button } from "@/components/ui/button";

// Formularios específicos por ramo
import { AutomotorForm } from "../ramos/AutomotorForm";

type Props = {
	ramo: string;
	datos: DatosEspecificosPoliza | null;
	onChange: (datos: DatosEspecificosPoliza) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function DatosEspecificos({ ramo, datos, onChange, onSiguiente, onAnterior }: Props) {
	// Normalizar nombre del ramo (case-insensitive)
	const ramoNormalizado = ramo.toLowerCase().trim();

	// Determinar qué componente renderizar según el ramo
	const renderFormularioEspecifico = () => {
		// Automotores
		if (ramoNormalizado.includes("automotor")) {
			return (
				<AutomotorForm
					datos={datos?.tipo_ramo === "Automotores" ? datos.datos : null}
					onChange={(datosAutomotor) => {
						onChange({
							tipo_ramo: "Automotores",
							datos: datosAutomotor,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Salud
		if (ramoNormalizado.includes("salud") || ramoNormalizado.includes("enfermedad")) {
			return (
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<div className="text-center py-12">
						<AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Formulario en Desarrollo</h3>
						<p className="text-gray-600 mb-6">
							El formulario para pólizas de <strong>Salud</strong> está en desarrollo.
						</p>
						<div className="flex justify-between pt-6 border-t">
							<Button variant="outline" onClick={onAnterior}>
								<ChevronLeft className="mr-2 h-5 w-5" />
								Anterior
							</Button>
							<Button onClick={onSiguiente}>
								Continuar (Skip)
								<ChevronRight className="ml-2 h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>
			);
		}

		// Incendio
		if (ramoNormalizado.includes("incendio")) {
			return (
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<div className="text-center py-12">
						<AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Formulario en Desarrollo</h3>
						<p className="text-gray-600 mb-6">
							El formulario para pólizas de <strong>Incendio</strong> está en desarrollo.
						</p>
						<div className="flex justify-between pt-6 border-t">
							<Button variant="outline" onClick={onAnterior}>
								<ChevronLeft className="mr-2 h-5 w-5" />
								Anterior
							</Button>
							<Button onClick={onSiguiente}>
								Continuar (Skip)
								<ChevronRight className="ml-2 h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>
			);
		}

		// Otros ramos (genérico)
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="text-center py-12">
					<AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">Ramo: {ramo}</h3>
					<p className="text-gray-600 mb-6">
						El formulario específico para este ramo está en desarrollo.
						<br />
						Por ahora puede continuar sin datos específicos.
					</p>
					<div className="flex justify-between pt-6 border-t">
						<Button variant="outline" onClick={onAnterior}>
							<ChevronLeft className="mr-2 h-5 w-5" />
							Anterior
						</Button>
						<Button onClick={onSiguiente}>
							Continuar (Skip)
							<ChevronRight className="ml-2 h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>
		);
	};

	return renderFormularioEspecifico();
}
