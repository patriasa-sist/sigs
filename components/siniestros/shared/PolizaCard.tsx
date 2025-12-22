"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X, User, Building, Calendar, DollarSign, File, CheckCircle, Clock, XCircle, Phone, Mail, AlertTriangle } from "lucide-react";
import DocumentosPolizaModal from "./DocumentosPolizaModal";
import type { PolizaParaSiniestro } from "@/types/siniestro";

interface PolizaCardProps {
	poliza: PolizaParaSiniestro;
	onDeselect?: () => void;
	showDeselectButton?: boolean;
}

export default function PolizaCard({ poliza, onDeselect, showDeselectButton = true }: PolizaCardProps) {
	const [showDocumentosModal, setShowDocumentosModal] = useState(false);
	const [showAllCuotas, setShowAllCuotas] = useState(false);

	// Calcular porcentaje de cuotas pagadas
	const porcentajePagado =
		poliza.cuotas_total && poliza.cuotas_total > 0
			? Math.round(((poliza.cuotas_pagadas || 0) / poliza.cuotas_total) * 100)
			: 0;

	// Contar cuotas vencidas
	const cuotasVencidas = poliza.cuotas?.filter(c => c.estado === "vencida").length || 0;

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
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">Cliente</p>
								<p className="font-medium">{poliza.cliente.nombre_completo}</p>
								<p className="text-sm text-muted-foreground">
									{poliza.cliente.tipo === "natural" ? "CI" : "NIT"}: {poliza.cliente.documento}
								</p>
								{/* Datos de contacto clickeables */}
								{poliza.cliente.celular && (
									<a
										href={`https://wa.me/591${poliza.cliente.celular.replace(/\D/g, "")}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
									>
										<Phone className="h-3 w-3" />
										{poliza.cliente.celular}
									</a>
								)}
								{poliza.cliente.correo_electronico && (
									<a
										href={`mailto:${poliza.cliente.correo_electronico}`}
										className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
									>
										<Mail className="h-3 w-3" />
										{poliza.cliente.correo_electronico}
									</a>
								)}
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

							{/* Alerta si hay cuotas vencidas */}
							{cuotasVencidas > 0 && (
								<div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
									<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
									<div className="text-red-900 dark:text-red-100">
										<p className="font-medium">Cliente con pagos atrasados</p>
										<p className="text-xs mt-1">
											{cuotasVencidas} cuota{cuotasVencidas > 1 ? "s" : ""} vencida{cuotasVencidas > 1 ? "s" : ""}. Considerar esta información antes de registrar el siniestro.
										</p>
									</div>
								</div>
							)}

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

							{/* Todas las cuotas */}
							{poliza.cuotas && poliza.cuotas.length > 0 && (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<p className="text-xs text-muted-foreground">
											{showAllCuotas ? "Todas las cuotas:" : "Últimas cuotas:"}
										</p>
										{poliza.cuotas.length > 3 && (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setShowAllCuotas(!showAllCuotas)}
												className="h-6 text-xs px-2"
											>
												{showAllCuotas ? "Ver menos" : `Ver todas (${poliza.cuotas.length})`}
											</Button>
										)}
									</div>

									{/* Lista de cuotas con scroll */}
									<div className={`space-y-1 ${showAllCuotas ? "max-h-96 overflow-y-auto" : ""}`}>
										{(showAllCuotas ? poliza.cuotas : poliza.cuotas.slice(0, 3)).map((cuota) => {
											const tieneProrrogas = cuota.prorrogas_historial && cuota.prorrogas_historial.length > 0;
											const esVencida = cuota.estado === "vencida";
											const esPagada = cuota.estado === "pagada";

											return (
												<div
													key={cuota.id}
													className={`flex items-center justify-between text-xs p-2 rounded border ${
														esVencida
															? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
															: esPagada
																? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
																: "bg-secondary/20 border-secondary"
													}`}
												>
													<div className="flex items-center gap-2">
														{esPagada ? (
															<CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
														) : esVencida ? (
															<XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
														) : (
															<Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
														)}
														<span className={esVencida ? "font-medium" : ""}>
															Cuota {cuota.numero_cuota}
														</span>
														{tieneProrrogas && (
															<span
																className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
																title={`${cuota.prorrogas_historial?.length} prórroga(s) aplicada(s)`}
															>
																<AlertTriangle className="h-3 w-3" />
																<span className="text-[10px]">{cuota.prorrogas_historial?.length}</span>
															</span>
														)}
														{esVencida && (
															<span className="text-[10px] bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 px-1 py-0.5 rounded">
																VENCIDA
															</span>
														)}
													</div>
													<div className="text-right">
														<p className="font-medium">
															{poliza.moneda} {cuota.monto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
														</p>
														<p className={`text-muted-foreground ${esVencida ? "font-medium text-red-600 dark:text-red-400" : ""}`}>
															{new Date(cuota.fecha_vencimiento).toLocaleDateString("es-BO")}
														</p>
														{tieneProrrogas && cuota.fecha_vencimiento_original && (
															<p className="text-[10px] text-amber-600 dark:text-amber-400">
																Original: {new Date(cuota.fecha_vencimiento_original).toLocaleDateString("es-BO")}
															</p>
														)}
													</div>
												</div>
											);
										})}
									</div>

									{!showAllCuotas && poliza.cuotas.length > 3 && (
										<p className="text-xs text-muted-foreground text-center italic">
											+{poliza.cuotas.length - 3} cuotas más (haz clic en "Ver todas" arriba)
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
