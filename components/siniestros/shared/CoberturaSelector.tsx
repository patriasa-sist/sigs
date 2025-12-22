"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { obtenerCoberturasPorRamo } from "@/app/siniestros/actions";
import type { CoberturaCatalogo, CoberturaSeleccionada } from "@/types/siniestro";

interface CoberturaSelectorProps {
	ramo: string;
	coberturasSeleccionadas: CoberturaSeleccionada[];
	onCoberturaToggle: (cobertura: CoberturaSeleccionada, selected: boolean) => void;
}

export default function CoberturaSelector({
	ramo,
	coberturasSeleccionadas,
	onCoberturaToggle,
}: CoberturaSelectorProps) {
	const [coberturasCatalogo, setCoberturasCatalogo] = useState<CoberturaCatalogo[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Cargar coberturas del catálogo
	useEffect(() => {
		async function cargarCoberturas() {
			setLoading(true);
			setError(null);

			try {
				const result = await obtenerCoberturasPorRamo(ramo);

				if (result.success) {
					setCoberturasCatalogo(result.data.coberturas);
				} else {
					setError(result.error);
				}
			} catch {
				setError("Error al cargar coberturas");
			} finally {
				setLoading(false);
			}
		}

		if (ramo) {
			cargarCoberturas();
		}
	}, [ramo]);

	const isCoberturaSelected = (coberturaId: string) => {
		return coberturasSeleccionadas.some((c) => c.id === coberturaId);
	};

	const handleToggle = (cobertura: CoberturaCatalogo, checked: boolean) => {
		onCoberturaToggle(
			{
				id: cobertura.id,
				nombre: cobertura.nombre,
				descripcion: cobertura.descripcion,
			},
			checked
		);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				<span className="ml-2 text-muted-foreground">Cargando coberturas...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
				{error}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Coberturas del catálogo */}
			{coberturasCatalogo.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Coberturas Disponibles para {ramo}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{coberturasCatalogo.map((cobertura) => (
								<div
									key={cobertura.id}
									className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
								>
									<Checkbox
										id={`cobertura-${cobertura.id}`}
										checked={isCoberturaSelected(cobertura.id)}
										onCheckedChange={(checked) => handleToggle(cobertura, checked === true)}
									/>
									<div className="flex-1 min-w-0">
										<Label
											htmlFor={`cobertura-${cobertura.id}`}
											className="font-medium cursor-pointer"
										>
											{cobertura.nombre}
										</Label>
										{cobertura.descripcion && (
											<p className="text-sm text-muted-foreground mt-1">{cobertura.descripcion}</p>
										)}
									</div>
								</div>
							))}
						</div>

						{coberturasSeleccionadas.length > 0 && (
							<div className="mt-4 pt-4 border-t">
								<p className="text-sm font-medium mb-2">Coberturas seleccionadas:</p>
								<div className="flex flex-wrap gap-2">
									{coberturasSeleccionadas.map((cob) => (
										<span
											key={cob.id}
											className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
										>
											{cob.nombre}
										</span>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
