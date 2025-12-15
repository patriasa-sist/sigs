"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X, User, Building, Calendar, DollarSign, File, CheckCircle, Clock, XCircle } from "lucide-react";
import DocumentosPolizaModal from "./DocumentosPolizaModal";
import type { PolizaParaSiniestro } from "@/types/siniestro";

interface PolizaCardProps {
	poliza: PolizaParaSiniestro;
	onDeselect?: () => void;
	showDeselectButton?: boolean;
}

export default function PolizaCard({ poliza, onDeselect, showDeselectButton = true }: PolizaCardProps) {
	const [showDocumentosModal, setShowDocumentosModal] = useState(false);

	// Calcular porcentaje de cuotas pagadas
	const porcentajePagado =
		poliza.cuotas_total && poliza.cuotas_total > 0
			? Math.round(((poliza.cuotas_pagadas || 0) / poliza.cuotas_total) * 100)
			: 0;

	return (
		<>
			<Card className="border-2 border-primary/20 bg-primary/5">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg flex items-center gap-2">
							<FileText className="h-5 w-5 text-primary" />
							Póliza Seleccionada
						</CardTitle>
						{showDeselectButton && onDeselect && (
							<Button variant="ghost" size="sm" onClick={onDeselect} className="h-8 w-8 p-0">
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Número de póliza y ramo */}
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">Número de Póliza</p>
							<p className="text-xl font-bold">{poliza.numero_poliza}</p>
						</div>
						<span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
							{poliza.ramo}
						</span>
					</div>

					{/* Cliente */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
						<div className="flex gap-2">
							<User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Cliente</p>
								<p className="font-medium">{poliza.cliente.nombre_completo}</p>
								<p className="text-sm text-muted-foreground">
									{poliza.cliente.tipo === "natural" ? "CI" : "NIT"}: {poliza.cliente.documento}
								</p>
							</div>
						</div>

						{/* Compañía */}
						<div className="flex gap-2">
							<Building className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Compañía Aseguradora</p>
								<p className="font-medium">{poliza.compania.nombre}</p>
							</div>
						</div>

						{/* Responsable */}
						<div className="flex gap-2">
							<User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Responsable</p>
								<p className="font-medium">{poliza.responsable.full_name}</p>
							</div>
						</div>

						{/* Vigencia */}
						<div className="flex gap-2">
							<Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Vigencia</p>
								<p className="font-medium text-sm">
									{new Date(poliza.inicio_vigencia).toLocaleDateString("es-BO")} -{" "}
									{new Date(poliza.fin_vigencia).toLocaleDateString("es-BO")}
								</p>
							</div>
						</div>

						{/* Prima */}
						<div className="flex gap-2 md:col-span-2">
							<DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Prima Total</p>
								<p className="font-medium">
									{poliza.moneda} {poliza.prima_total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
								</p>
							</div>
						</div>
					</div>

					{/* Asegurados (si existen) */}
					{poliza.asegurados && poliza.asegurados.length > 0 && (
						<div className="pt-2 border-t">
							<p className="text-sm text-muted-foreground mb-2">Asegurados:</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
								{poliza.asegurados.map((aseg, idx) => (
									<div key={idx} className="bg-secondary/30 rounded-lg p-2 text-sm">
										{aseg.tipo === "vehiculo" ? (
											<div>
												<p className="font-medium">
													Placa: {aseg.placa} {aseg.marca && `- ${aseg.marca}`}
												</p>
												{aseg.modelo && <p className="text-xs text-muted-foreground">Modelo: {aseg.modelo}</p>}
												{aseg.valor_asegurado && (
													<p className="text-xs text-muted-foreground">
														Valor: Bs {aseg.valor_asegurado.toLocaleString("es-BO")}
													</p>
												)}
											</div>
										) : (
											<div>
												<p className="font-medium">{aseg.nombre}</p>
												{aseg.documento && (
													<p className="text-xs text-muted-foreground">CI: {aseg.documento}</p>
												)}
												{aseg.relacion && <p className="text-xs text-muted-foreground">{aseg.relacion}</p>}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Estado de Cuotas de Pago */}
					{poliza.cuotas_total !== undefined && poliza.cuotas_total > 0 && (
						<div className="pt-2 border-t space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">Estado de Pagos</p>
								<span className="text-xs text-muted-foreground">
									{porcentajePagado}% completado
								</span>
							</div>

							{/* Barra de progreso */}
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
								<div
									className={`h-2 rounded-full transition-all ${
										porcentajePagado === 100
											? "bg-green-500"
											: porcentajePagado >= 50
												? "bg-blue-500"
												: "bg-amber-500"
									}`}
									style={{ width: `${porcentajePagado}%` }}
								/>
							</div>

							{/* Resumen de cuotas */}
							<div className="grid grid-cols-3 gap-2 text-xs">
								<div className="flex items-center gap-1 bg-green-50 dark:bg-green-950/20 p-2 rounded">
									<CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
									<div>
										<p className="text-green-700 dark:text-green-300 font-medium">
											{poliza.cuotas_pagadas || 0}
										</p>
										<p className="text-green-600 dark:text-green-400">Pagadas</p>
									</div>
								</div>

								<div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
									<Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
									<div>
										<p className="text-amber-700 dark:text-amber-300 font-medium">
											{poliza.cuotas_pendientes || 0}
										</p>
										<p className="text-amber-600 dark:text-amber-400">Pendientes</p>
									</div>
								</div>

								<div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
									<DollarSign className="h-3 w-3 text-blue-600 dark:text-blue-400" />
									<div>
										<p className="text-blue-700 dark:text-blue-300 font-medium">{poliza.cuotas_total}</p>
										<p className="text-blue-600 dark:text-blue-400">Total</p>
									</div>
								</div>
							</div>

							{/* Mostrar primeras 3 cuotas si están disponibles */}
							{poliza.cuotas && poliza.cuotas.length > 0 && (
								<div className="space-y-1 mt-2">
									<p className="text-xs text-muted-foreground mb-1">Últimas cuotas:</p>
									{poliza.cuotas.slice(0, 3).map((cuota) => (
										<div
											key={cuota.id}
											className="flex items-center justify-between text-xs p-2 bg-secondary/20 rounded"
										>
											<div className="flex items-center gap-2">
												{cuota.estado === "pagada" ? (
													<CheckCircle className="h-3 w-3 text-green-500" />
												) : cuota.estado === "vencida" ? (
													<XCircle className="h-3 w-3 text-red-500" />
												) : (
													<Clock className="h-3 w-3 text-amber-500" />
												)}
												<span>Cuota {cuota.numero_cuota}</span>
											</div>
											<div className="text-right">
												<p className="font-medium">
													{poliza.moneda} {cuota.monto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
												</p>
												<p className="text-muted-foreground">
													{new Date(cuota.fecha_vencimiento).toLocaleDateString("es-BO")}
												</p>
											</div>
										</div>
									))}
									{poliza.cuotas.length > 3 && (
										<p className="text-xs text-muted-foreground text-center">
											+{poliza.cuotas.length - 3} cuotas más
										</p>
									)}
								</div>
							)}
						</div>
					)}

					{/* Documentos de la Póliza */}
					<div className="pt-2 border-t">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDocumentosModal(true)}
							className="w-full"
						>
							<File className="h-4 w-4 mr-2" />
							Ver Documentos de la Póliza
							{poliza.total_documentos !== undefined && poliza.total_documentos > 0 && (
								<span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
									{poliza.total_documentos}
								</span>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Modal de documentos */}
			<DocumentosPolizaModal
				numeroPoliza={poliza.numero_poliza}
				documentos={poliza.documentos || []}
				open={showDocumentosModal}
				onOpenChange={setShowDocumentosModal}
			/>
		</>
	);
}
