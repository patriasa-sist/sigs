"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { obtenerCoberturasPorRamo } from "@/app/siniestros/actions";
import type { CoberturaCatalogo, CoberturaSeleccionada } from "@/types/siniestro";

interface CoberturaSelectorProps {
	ramo: string;
	coberturasSeleccionadas: CoberturaSeleccionada[];
	onCoberturaToggle: (cobertura: CoberturaSeleccionada, selected: boolean) => void;
	onCobertulaCustom?: (nombre: string, descripcion?: string) => void;
	nuevaCobertura?: { nombre: string; descripcion?: string };
}

export default function CoberturaSelector({
	ramo,
	coberturasSeleccionadas,
	onCoberturaToggle,
	onCobertulaCustom,
	nuevaCobertura,
}: CoberturaSelectorProps) {
	const [coberturasCatalogo, setCoberturasCatalogo] = useState<CoberturaCatalogo[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCustomForm, setShowCustomForm] = useState(false);
	const [customNombre, setCustomNombre] = useState("");
	const [customDescripcion, setCustomDescripcion] = useState("");

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
			} catch (err) {
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

	const handleAgregarCustom = () => {
		if (customNombre.trim().length === 0) return;

		if (onCobertulaCustom) {
			onCobertulaCustom(customNombre.trim(), customDescripcion.trim() || undefined);
			setCustomNombre("");
			setCustomDescripcion("");
			setShowCustomForm(false);
		}
	};

	const handleCancelarCustom = () => {
		setCustomNombre("");
		setCustomDescripcion("");
		setShowCustomForm(false);
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

			{/* Agregar cobertura personalizada */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Cobertura Personalizada</CardTitle>
				</CardHeader>
				<CardContent>
					{!showCustomForm && !nuevaCobertura ? (
						<Button variant="outline" onClick={() => setShowCustomForm(true)} className="w-full">
							<Plus className="h-4 w-4 mr-2" />
							Agregar Cobertura Personalizada
						</Button>
					) : showCustomForm ? (
						<div className="space-y-3">
							<div>
								<Label htmlFor="custom-nombre">Nombre de la Cobertura *</Label>
								<Input
									id="custom-nombre"
									placeholder="Ej: Cobertura especial por daños..."
									value={customNombre}
									onChange={(e) => setCustomNombre(e.target.value)}
								/>
							</div>

							<div>
								<Label htmlFor="custom-descripcion">Descripción (Opcional)</Label>
								<Textarea
									id="custom-descripcion"
									placeholder="Descripción detallada de la cobertura..."
									value={customDescripcion}
									onChange={(e) => setCustomDescripcion(e.target.value)}
									rows={3}
								/>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={handleAgregarCustom}
									disabled={customNombre.trim().length === 0}
									className="flex-1"
								>
									Agregar
								</Button>
								<Button variant="outline" onClick={handleCancelarCustom}>
									Cancelar
								</Button>
							</div>
						</div>
					) : (
						nuevaCobertura && (
							<div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1">
										<p className="font-medium text-green-900 dark:text-green-100">
											{nuevaCobertura.nombre}
										</p>
										{nuevaCobertura.descripcion && (
											<p className="text-sm text-green-700 dark:text-green-300 mt-1">
												{nuevaCobertura.descripcion}
											</p>
										)}
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											if (onCobertulaCustom) {
												onCobertulaCustom("", undefined);
											}
										}}
										className="h-6 w-6 p-0"
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)
					)}
				</CardContent>
			</Card>
		</div>
	);
}
