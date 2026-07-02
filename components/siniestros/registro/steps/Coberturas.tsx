"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, X } from "lucide-react";
import CoberturaSelector from "@/components/siniestros/shared/CoberturaSelector";
import type { CoberturasStep, CoberturaSeleccionada } from "@/types/siniestro";

interface CoberturasProps {
	ramo: string;
	coberturas: CoberturasStep | null;
	onCoberturasChange: (coberturas: CoberturasStep) => void;
	showMinError?: boolean;
}

export default function CoberturasStepComponent({
	ramo,
	coberturas,
	onCoberturasChange,
	showMinError,
}: CoberturasProps) {
	const [nuevaCobertura, setNuevaCobertura] = useState("");

	const seleccionadas = coberturas?.coberturas_seleccionadas || [];
	const escritas = coberturas?.nuevas_coberturas || [];
	const totalCoberturas = seleccionadas.length + escritas.length;

	const handleCoberturaToggle = (cobertura: CoberturaSeleccionada, selected: boolean) => {
		const nuevasSeleccionadas = selected
			? [...seleccionadas, cobertura]
			: seleccionadas.filter((c) => c.id !== cobertura.id);

		onCoberturasChange({
			...coberturas,
			coberturas_seleccionadas: nuevasSeleccionadas,
		} as CoberturasStep);
	};

	const agregarCoberturaEscrita = () => {
		const nombre = nuevaCobertura.trim();
		if (!nombre) return;

		// Evitar duplicados (case-insensitive) frente a lo ya escrito o seleccionado.
		const yaExiste =
			escritas.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase()) ||
			seleccionadas.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase());

		if (!yaExiste) {
			onCoberturasChange({
				...coberturas,
				coberturas_seleccionadas: seleccionadas,
				nuevas_coberturas: [...escritas, { nombre }],
			} as CoberturasStep);
		}
		setNuevaCobertura("");
	};

	const quitarCoberturaEscrita = (nombre: string) => {
		onCoberturasChange({
			...coberturas,
			coberturas_seleccionadas: seleccionadas,
			nuevas_coberturas: escritas.filter((c) => c.nombre !== nombre),
		} as CoberturasStep);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Paso 3: Coberturas Afectadas</CardTitle>
				<CardDescription>
					Indica las coberturas de la póliza que se están aplicando a este siniestro
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Error inline si no hay ninguna cobertura */}
				{showMinError && totalCoberturas === 0 && (
					<p className="text-sm text-destructive flex items-center gap-1.5">
						<AlertCircle className="h-3.5 w-3.5" />
						Debe indicar al menos una cobertura
					</p>
				)}

				{/* Input de texto libre: escribir 1 o más coberturas aplicadas */}
				<div className="space-y-2">
					<label className="text-sm font-medium text-foreground">Coberturas aplicadas</label>
					<div className="flex gap-2">
						<Input
							value={nuevaCobertura}
							onChange={(e) => setNuevaCobertura(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									agregarCoberturaEscrita();
								}
							}}
							placeholder="Escribe una cobertura y presiona Enter o Agregar…"
						/>
						<Button
							type="button"
							variant="outline"
							onClick={agregarCoberturaEscrita}
							disabled={!nuevaCobertura.trim()}
							className="shrink-0"
						>
							<Plus className="h-4 w-4" />
							Agregar
						</Button>
					</div>

					{escritas.length > 0 && (
						<div className="flex flex-wrap gap-2 pt-1">
							{escritas.map((cob) => (
								<span
									key={cob.nombre}
									className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-sm"
								>
									{cob.nombre}
									<button
										type="button"
										onClick={() => quitarCoberturaEscrita(cob.nombre)}
										className="hover:text-destructive transition-colors"
										aria-label={`Quitar ${cob.nombre}`}
									>
										<X className="h-3.5 w-3.5" />
									</button>
								</span>
							))}
						</div>
					)}
				</div>

				{/* Selector de coberturas del catálogo del ramo (donde existan) */}
				<CoberturaSelector
					ramo={ramo}
					coberturasSeleccionadas={seleccionadas}
					onCoberturaToggle={handleCoberturaToggle}
				/>

				{/* Advertencia si no hay ninguna cobertura */}
				{totalCoberturas === 0 && (
					<div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
						<AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
						<p className="text-amber-900">
							Debes indicar al menos una cobertura (escríbela arriba o selecciónala del catálogo) para
							continuar.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
