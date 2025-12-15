"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, FileText } from "lucide-react";
import { buscarPolizasActivas } from "@/app/siniestros/actions";
import type { PolizaParaSiniestro } from "@/types/siniestro";

interface BuscarPolizaProps {
	onPolizaSelect: (poliza: PolizaParaSiniestro) => void;
	polizaSeleccionada?: PolizaParaSiniestro | null;
}

export default function BuscarPoliza({ onPolizaSelect, polizaSeleccionada }: BuscarPolizaProps) {
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const [resultados, setResultados] = useState<PolizaParaSiniestro[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Debounced search
	useEffect(() => {
		if (query.length < 3) {
			setResultados([]);
			return;
		}

		const timer = setTimeout(async () => {
			setLoading(true);
			setError(null);

			try {
				const result = await buscarPolizasActivas(query);

				if (result.success) {
					setResultados(result.data.polizas);
					if (result.data.polizas.length === 0) {
						setError("No se encontraron pólizas activas con ese número");
					}
				} else {
					setError(result.error);
					setResultados([]);
				}
			} catch (err) {
				setError("Error al buscar pólizas");
				setResultados([]);
			} finally {
				setLoading(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	const handleSelect = useCallback(
		(poliza: PolizaParaSiniestro) => {
			onPolizaSelect(poliza);
			setQuery("");
			setResultados([]);
		},
		[onPolizaSelect]
	);

	// Si ya hay una póliza seleccionada, no mostrar el input
	if (polizaSeleccionada) {
		return null;
	}

	return (
		<div className="space-y-4">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Buscar póliza por número (ej: 12345)..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="pl-10"
				/>
				{loading && (
					<Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
				)}
			</div>

			{error && (
				<div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
					{error}
				</div>
			)}

			{resultados.length > 0 && (
				<div className="space-y-2 max-h-96 overflow-y-auto">
					<p className="text-sm text-muted-foreground">
						Se encontraron {resultados.length} {resultados.length === 1 ? "póliza" : "pólizas"}
					</p>
					{resultados.map((poliza) => (
						<Card
							key={poliza.id}
							className="cursor-pointer hover:bg-accent transition-colors"
							onClick={() => handleSelect(poliza)}
						>
							<CardContent className="p-4">
								<div className="flex items-start gap-3">
									<FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2 mb-2">
											<h4 className="font-semibold text-base">Póliza N° {poliza.numero_poliza}</h4>
											<span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
												{poliza.ramo}
											</span>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
											<div>
												<span className="text-muted-foreground">Cliente:</span>{" "}
												<span className="font-medium">{poliza.cliente.nombre_completo}</span>
											</div>
											<div>
												<span className="text-muted-foreground">Documento:</span>{" "}
												<span className="font-medium">{poliza.cliente.documento}</span>
											</div>
											<div>
												<span className="text-muted-foreground">Compañía:</span>{" "}
												<span className="font-medium">{poliza.compania.nombre}</span>
											</div>
											<div>
												<span className="text-muted-foreground">Responsable:</span>{" "}
												<span className="font-medium">{poliza.responsable.full_name}</span>
											</div>
											<div className="md:col-span-2">
												<span className="text-muted-foreground">Vigencia:</span>{" "}
												<span className="font-medium">
													{new Date(poliza.inicio_vigencia).toLocaleDateString("es-BO")} -{" "}
													{new Date(poliza.fin_vigencia).toLocaleDateString("es-BO")}
												</span>
											</div>
										</div>

										{poliza.asegurados && poliza.asegurados.length > 0 && (
											<div className="mt-2 pt-2 border-t">
												<p className="text-xs text-muted-foreground mb-1">Asegurados:</p>
												<div className="flex flex-wrap gap-1">
													{poliza.asegurados.slice(0, 3).map((aseg, idx) => (
														<span
															key={idx}
															className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
														>
															{aseg.tipo === "vehiculo" ? (
																<>Placa: {aseg.placa}</>
															) : (
																<>{aseg.nombre}</>
															)}
														</span>
													))}
													{poliza.asegurados.length > 3 && (
														<span className="text-xs text-muted-foreground">
															+{poliza.asegurados.length - 3} más
														</span>
													)}
												</div>
											</div>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{query.length > 0 && query.length < 3 && (
				<p className="text-sm text-muted-foreground">Ingrese al menos 3 caracteres para buscar</p>
			)}
		</div>
	);
}
