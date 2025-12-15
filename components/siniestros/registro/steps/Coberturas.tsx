"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import CoberturaSelector from "@/components/siniestros/shared/CoberturaSelector";
import type { CoberturasStep, CoberturaSeleccionada } from "@/types/siniestro";

interface CoberturasProps {
	ramo: string;
	coberturas: CoberturasStep | null;
	onCoberturasChange: (coberturas: CoberturasStep) => void;
}

export default function CoberturasStepComponent({ ramo, coberturas, onCoberturasChange }: CoberturasProps) {
	const handleCoberturaToggle = (cobertura: CoberturaSeleccionada, selected: boolean) => {
		const coberturasActuales = coberturas?.coberturas_seleccionadas || [];

		const nuevasCoberturas = selected
			? [...coberturasActuales, cobertura]
			: coberturasActuales.filter((c) => c.id !== cobertura.id);

		onCoberturasChange({
			...coberturas,
			coberturas_seleccionadas: nuevasCoberturas,
		} as CoberturasStep);
	};

	const handleCoberturaCustom = (nombre: string, descripcion?: string) => {
		if (nombre.trim().length === 0) {
			// Eliminar cobertura custom
			onCoberturasChange({
				...coberturas,
				nueva_cobertura: undefined,
			} as CoberturasStep);
		} else {
			// Agregar cobertura custom
			onCoberturasChange({
				...coberturas,
				nueva_cobertura: {
					nombre,
					descripcion,
				},
			} as CoberturasStep);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Paso 3: Coberturas Afectadas</CardTitle>
				<CardDescription>
					Selecciona las coberturas de la póliza que aplican a este siniestro
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Información del ramo */}
				<div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
					<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
					<div className="text-blue-900 dark:text-blue-100">
						<p className="font-medium mb-1">Ramo de la póliza: {ramo}</p>
						<p className="text-sm">
							Las coberturas mostradas corresponden a este tipo de seguro. Selecciona todas las que
							apliquen al siniestro reportado.
						</p>
					</div>
				</div>

				{/* Selector de coberturas */}
				<CoberturaSelector
					ramo={ramo}
					coberturasSeleccionadas={coberturas?.coberturas_seleccionadas || []}
					onCoberturaToggle={handleCoberturaToggle}
					onCobertulaCustom={handleCoberturaCustom}
					nuevaCobertura={coberturas?.nueva_cobertura}
				/>

				{/* Advertencia si no hay coberturas */}
				{(!coberturas?.coberturas_seleccionadas || coberturas.coberturas_seleccionadas.length === 0) &&
					!coberturas?.nueva_cobertura && (
						<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
							<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
							<p className="text-amber-900 dark:text-amber-100">
								Debes seleccionar al menos una cobertura o agregar una personalizada para continuar.
							</p>
						</div>
					)}
			</CardContent>
		</Card>
	);
}
