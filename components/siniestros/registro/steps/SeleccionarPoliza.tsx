"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import BuscarPoliza from "@/components/siniestros/shared/BuscarPoliza";
import PolizaCard from "@/components/siniestros/shared/PolizaCard";
import type { PolizaParaSiniestro } from "@/types/siniestro";

interface SeleccionarPolizaProps {
	polizaSeleccionada: PolizaParaSiniestro | null;
	onPolizaSelect: (poliza: PolizaParaSiniestro) => void;
	onPolizaDeselect: () => void;
}

export default function SeleccionarPoliza({
	polizaSeleccionada,
	onPolizaSelect,
	onPolizaDeselect,
}: SeleccionarPolizaProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Paso 1: Seleccionar Póliza</CardTitle>
				<CardDescription>
					Busca y selecciona la póliza activa en la que ocurrió el siniestro
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Instrucciones */}
				<div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
					<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
					<div className="text-blue-900 dark:text-blue-100">
						<p className="font-medium mb-1">Instrucciones:</p>
						<ul className="list-disc list-inside space-y-1 text-sm">
							<li>Solo se pueden registrar siniestros en pólizas con estado &quot;activa&quot;</li>
							<li>Busca por número de póliza, CI, NIT, nombre o apellido del cliente</li>
							<li>Verifica que los datos del cliente y la vigencia sean correctos antes de continuar</li>
						</ul>
					</div>
				</div>

				{/* Buscador de pólizas */}
				{!polizaSeleccionada && (
					<BuscarPoliza onPolizaSelect={onPolizaSelect} polizaSeleccionada={polizaSeleccionada} />
				)}

				{/* Póliza seleccionada */}
				{polizaSeleccionada && (
					<PolizaCard poliza={polizaSeleccionada} onDeselect={onPolizaDeselect} showDeselectButton={true} />
				)}
			</CardContent>
		</Card>
	);
}
