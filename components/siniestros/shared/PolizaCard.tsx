"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X, User, Building, Calendar, DollarSign, File, CheckCircle, Clock, XCircle, Phone, Mail, AlertTriangle } from "lucide-react";
import DocumentosPolizaModal from "./DocumentosPolizaModal";
import type { PolizaParaSiniestro, CuotaPago } from "@/types/siniestro";

interface PolizaCardProps {
	poliza: PolizaParaSiniestro;
	onDeselect?: () => void;
	showDeselectButton?: boolean;
}

export default function PolizaCard({ poliza, onDeselect, showDeselectButton = true }: PolizaCardProps) {
	const [showDocumentosModal, setShowDocumentosModal] = useState(false);
	const [showAllCuotas, setShowAllCuotas] = useState(false);

	// Contar cuotas vencidas
	const cuotasVencidas = poliza.cuotas?.filter(c => c.estado === "vencida").length || 0;

	// Función para determinar si una cuota está en mora (pendiente + más de 10 días vencida)
	const esMora = (cuota: CuotaPago) => {
		if (cuota.estado !== "pendiente") return false;
		const fechaVencimiento = new Date(cuota.fecha_vencimiento);
		const hoy = new Date();
		const diasVencidos = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
		return diasVencidos > 10;
	};

	// Contar cuotas en mora
	const cuotasEnMora = poliza.cuotas?.filter(esMora).length || 0;

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
								<p className="text-sm font-medium">Cuotas de Pago</p>
								{poliza.cuotas && poliza.cuotas.length > 0 && (
									<span className="text-xs text-muted-foreground">
										{poliza.cuotas.length} cuota{poliza.cuotas.length > 1 ? "s" : ""}
									</span>
								)}
							</div>

							{/* Alerta si hay cuotas vencidas o en mora */}
							{(cuotasVencidas > 0 || cuotasEnMora > 0) && (
								<div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
									<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
									<div className="text-red-900 dark:text-red-100">
										<p className="font-medium">Cliente con pagos atrasados</p>
										<div className="text-xs mt-1 space-y-0.5">
											{cuotasEnMora > 0 && (
												<p className="font-semibold">
													⚠️ {cuotasEnMora} cuota{cuotasEnMora > 1 ? "s" : ""} en MORA (más de 10 días vencida{cuotasEnMora > 1 ? "s" : ""})
												</p>
											)}
											{cuotasVencidas > 0 && (
												<p>
													{cuotasVencidas} cuota{cuotasVencidas > 1 ? "s" : ""} vencida{cuotasVencidas > 1 ? "s" : ""}
												</p>
											)}
											<p className="mt-1 italic">Considerar esta información antes de registrar el siniestro.</p>
										</div>
									</div>
								</div>
							)}

							{/* Tabla de cuotas */}
							{poliza.cuotas && poliza.cuotas.length > 0 && (
								<div className="space-y-2">
									{/* Controles de visualización */}
									<div className="flex items-center justify-between">
										{poliza.cuotas.length > 5 && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => setShowAllCuotas(!showAllCuotas)}
												className="h-7 text-xs px-3"
											>
												{showAllCuotas ? "Ver menos" : `Ver todas (${poliza.cuotas.length})`}
											</Button>
										)}
									</div>

									{/* Encabezados de tabla */}
									<div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 py-1 border-b">
										<div className="col-span-2">Cuota</div>
										<div className="col-span-3">Estado</div>
										<div className="col-span-3 text-right">Monto</div>
										<div className="col-span-4 text-right">Vencimiento</div>
									</div>

									{/* Lista de cuotas con scroll */}
									<div className={`space-y-1 ${showAllCuotas ? "max-h-96 overflow-y-auto pr-1" : ""}`}>
										{(showAllCuotas ? poliza.cuotas : poliza.cuotas.slice(0, 5)).map((cuota) => {
											const tieneProrrogas = cuota.prorrogas_historial && cuota.prorrogas_historial.length > 0;
											const esVencida = cuota.estado === "vencida";
											const esPagada = cuota.estado === "pagada";
											const enMora = esMora(cuota);

											return (
												<div
													key={cuota.id}
													className={`grid grid-cols-12 gap-2 text-xs p-2 rounded border ${
														esVencida
															? "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-700"
															: enMora
																? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
																: esPagada
																	? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
																	: "bg-secondary/20 border-secondary"
													}`}
												>
													{/* Número de cuota */}
													<div className="col-span-2 flex items-center">
														<span className={`font-medium ${enMora || esVencida ? "text-red-700 dark:text-red-300" : ""}`}>
															#{cuota.numero_cuota}
														</span>
													</div>

													{/* Estado */}
													<div className="col-span-3 flex items-center gap-1">
														{esPagada ? (
															<>
																<CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
																<span className="text-green-700 dark:text-green-300">Pagada</span>
															</>
														) : enMora ? (
															<>
																<XCircle className="h-3 w-3 text-red-700 dark:text-red-300 flex-shrink-0" />
																<span className="text-red-800 dark:text-red-200 font-bold">MORA</span>
															</>
														) : esVencida ? (
															<>
																<XCircle className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
																<span className="text-red-700 dark:text-red-300 font-medium">Vencida</span>
															</>
														) : (
															<>
																<Clock className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
																<span className="text-amber-700 dark:text-amber-300">Pendiente</span>
															</>
														)}
													</div>

													{/* Monto */}
													<div className="col-span-3 flex items-center justify-end">
														<span className={`font-medium ${enMora || esVencida ? "text-red-700 dark:text-red-300" : ""}`}>
															{poliza.moneda} {cuota.monto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
														</span>
													</div>

													{/* Fecha vencimiento */}
													<div className="col-span-4 flex flex-col items-end justify-center">
														<div className="flex items-center gap-1">
															<span className={`${enMora || esVencida ? "font-medium text-red-700 dark:text-red-300" : ""}`}>
																{new Date(cuota.fecha_vencimiento).toLocaleDateString("es-BO")}
															</span>
															{tieneProrrogas && (
																<span
																	className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
																	title={`${cuota.prorrogas_historial?.length} prórroga(s) aplicada(s)`}
																>
																	<AlertTriangle className="h-3 w-3" />
																</span>
															)}
														</div>
														{tieneProrrogas && cuota.fecha_vencimiento_original && (
															<span className="text-[10px] text-amber-600 dark:text-amber-400">
																Original: {new Date(cuota.fecha_vencimiento_original).toLocaleDateString("es-BO")}
															</span>
														)}
													</div>
												</div>
											);
										})}
									</div>

									{!showAllCuotas && poliza.cuotas.length > 5 && (
										<p className="text-xs text-muted-foreground text-center italic py-1">
											+{poliza.cuotas.length - 5} cuotas más
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
