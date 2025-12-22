"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import CoberturaSelector from "@/components/siniestros/shared/CoberturaSelector";
import type { CoberturasStep, CoberturaSeleccionada } from "@/types/siniestro";

interface CoberturasProps {
	ramo: string;
	coberturas: CoberturasStep | null;
	onCoberturasChange: (coberturas: CoberturasStep) => void;
}

// ID especial para la cobertura de Gestión comercial
const GESTION_COMERCIAL_ID = "gestion-comercial-special";

export default function CoberturasStepComponent({ ramo, coberturas, onCoberturasChange }: CoberturasProps) {
	const [gestionComercialSeleccionada, setGestionComercialSeleccionada] = useState(false);

	// Inicializar estado si Gestión comercial ya está seleccionada
	useEffect(() => {
		const yaSeleccionada = coberturas?.coberturas_seleccionadas?.some(
			(c) => c.id === GESTION_COMERCIAL_ID
		);
		setGestionComercialSeleccionada(yaSeleccionada || false);
	}, [coberturas?.coberturas_seleccionadas]);

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

	const handleGestionComercialToggle = (checked: boolean) => {
		setGestionComercialSeleccionada(checked);

		const coberturasActuales = coberturas?.coberturas_seleccionadas || [];

		if (checked) {
			// Agregar Gestión comercial
			const gestionComercial: CoberturaSeleccionada = {
				id: GESTION_COMERCIAL_ID,
				nombre: "Gestión comercial",
				descripcion: "Cobertura especial aplicable a todos los ramos",
			};
			onCoberturasChange({
				...coberturas,
				coberturas_seleccionadas: [...coberturasActuales, gestionComercial],
			} as CoberturasStep);
		} else {
			// Quitar Gestión comercial
			const nuevasCoberturas = coberturasActuales.filter((c) => c.id !== GESTION_COMERCIAL_ID);
			onCoberturasChange({
				...coberturas,
				coberturas_seleccionadas: nuevasCoberturas,
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

				{/* Cobertura especial: Gestión comercial */}
				<Card className="border-2 border-dashed border-primary/30 bg-primary/5">
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							<Checkbox
								id="cobertura-gestion-comercial"
								checked={gestionComercialSeleccionada}
								onCheckedChange={(checked) => handleGestionComercialToggle(checked as boolean)}
							/>
							<div className="flex-1">
								<Label
									htmlFor="cobertura-gestion-comercial"
									className="font-medium cursor-pointer text-base"
								>
									Gestión comercial
								</Label>
								<p className="text-xs text-muted-foreground mt-1">
									Cobertura especial aplicable a todos los ramos
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Selector de coberturas del ramo */}
				<CoberturaSelector
					ramo={ramo}
					coberturasSeleccionadas={coberturas?.coberturas_seleccionadas || []}
					onCoberturaToggle={handleCoberturaToggle}
				/>

				{/* Advertencia si no hay coberturas */}
				{(!coberturas?.coberturas_seleccionadas || coberturas.coberturas_seleccionadas.length === 0) && (
					<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
						<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
						<p className="text-amber-900 dark:text-amber-100">
							Debes seleccionar al menos una cobertura para continuar.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
