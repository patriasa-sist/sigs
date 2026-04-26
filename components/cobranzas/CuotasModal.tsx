"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Phone,
	Mail,
	MessageCircle,
	Car,
	Users,
	MapPin,
	Calendar,
	Clock,
	FileWarning,
	Send,
	Paperclip,
	Loader2,
	AlertCircle,
	BellRing,
} from "lucide-react";
import type { PolizaConPagos, CuotaPago, PolizaConPagosExtendida } from "@/types/cobranza";
import {
	obtenerDetallePolizaParaCuotas,
	prepararDatosAvisoMora,
	obtenerComprobanteCuota,
} from "@/app/cobranzas/actions";
import {
	enviarRecordatorioWhatsApp,
	enviarRecordatorioEmail,
	enviarRecordatorioConsolidadoWhatsApp,
	enviarRecordatorioConsolidadoEmail,
	formatearFecha,
	formatearMonto,
} from "@/utils/cobranza";
import { generarURLWhatsApp } from "@/utils/whatsapp";
import { contarCuotasVencidas, obtenerEstadoReal } from "@/utils/estadoCuota";
import RegistrarProrrogaModal from "./RegistrarProrrogaModal";
import { toast } from "sonner";

interface CuotasModalProps {
	poliza: PolizaConPagos | null;
	open: boolean;
	onClose: () => void;
	onSelectQuota: (cuota: CuotaPago) => void;
}

/** Status badge using design system palette and rounded-md */
function EstadoBadge({ estado }: { estado: string }) {
	const styles: Record<string, string> = {
		pendiente: "bg-amber-50 text-amber-800 border-amber-200",
		vencido:   "bg-rose-50  text-rose-800  border-rose-200",
		parcial:   "bg-orange-50 text-orange-800 border-orange-200",
		pagado:    "bg-teal-50  text-teal-800  border-teal-200",
	};
	return (
		<span
			className={`inline-flex items-center text-xs font-medium border px-2 py-0.5 rounded-md ${
				styles[estado] ?? "bg-secondary text-secondary-foreground border-border"
			}`}
		>
			{estado.charAt(0).toUpperCase() + estado.slice(1)}
		</span>
	);
}

export default function CuotasModal({
	poliza,
	open,
	onClose,
	onSelectQuota,
}: CuotasModalProps) {
	const [polizaExtendida, setPolizaExtendida] = useState<PolizaConPagosExtendida | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [selectedCuotaProrroga, setSelectedCuotaProrroga] = useState<CuotaPago | null>(null);
	const [prorrogaModalOpen, setProrrogaModalOpen] = useState(false);
	const [generatingPDF, setGeneratingPDF] = useState(false);
	const [loadingComprobante, setLoadingComprobante] = useState<string | null>(null);

	useEffect(() => {
		if (open && poliza) loadExtendedData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, poliza]);

	const loadExtendedData = async () => {
		if (!poliza) return;
		setLoading(true);
		setError(null);
		try {
			const response = await obtenerDetallePolizaParaCuotas(poliza.id);
			if (response.success && response.data) {
				setPolizaExtendida(response.data);
			} else {
				setError(response.error || "Error al cargar datos");
			}
		} catch (err) {
			console.error("Error loading extended data:", err);
			setError("Error al cargar información extendida");
		} finally {
			setLoading(false);
		}
	};

	const handleGenerarAvisoMora = async () => {
		if (!poliza) return;
		setGeneratingPDF(true);
		setError(null);
		try {
			const response = await prepararDatosAvisoMora(poliza.id);
			if (response.success && response.data) {
				const avisoData = response.data;
				const { generarYDescargarAvisoMoraPDF } = await import("@/utils/cobranza");
				await generarYDescargarAvisoMoraPDF(avisoData);
				toast.success("PDF de aviso de mora generado", {
					description: "El documento se ha descargado correctamente",
				});
				const mensaje = `Estimado/a cliente, se ha generado un aviso de mora para su póliza ${poliza.numero_poliza}. Tiene ${avisoData.cuotas_vencidas.length} cuotas vencidas por un total de ${formatearMonto(avisoData.total_adeudado, poliza.moneda)}. Por favor, regularice su situación a la brevedad. Adjunto encontrará el documento detallado.`;
				const telefono =
					polizaExtendida?.contacto?.celular || polizaExtendida?.contacto?.telefono;
				if (telefono) {
					window.open(generarURLWhatsApp(telefono, mensaje), "_blank");
				} else {
					toast.warning("Sin número de teléfono", {
						description: "No se encontró contacto para enviar por WhatsApp",
					});
				}
			} else {
				setError(response.error || "Error al preparar aviso de mora");
				toast.error("Error al generar aviso", {
					description: response.error || "No se pudo preparar el aviso de mora",
				});
			}
		} catch (err) {
			console.error("Error generating aviso de mora:", err);
			const msg = err instanceof Error ? err.message : "Error al generar aviso de mora";
			setError(msg);
			toast.error("Error al generar PDF", { description: msg });
		} finally {
			setGeneratingPDF(false);
		}
	};

	const handleWhatsAppReminder = (cuota: CuotaPago) => {
		if (!polizaExtendida) return;
		enviarRecordatorioWhatsApp(
			cuota,
			polizaExtendida,
			polizaExtendida.contacto,
			polizaExtendida.client.nombre_completo
		);
	};

	const handleEmailReminder = (cuota: CuotaPago) => {
		if (!polizaExtendida) return;
		enviarRecordatorioEmail(
			cuota,
			polizaExtendida,
			polizaExtendida.contacto,
			polizaExtendida.client.nombre_completo
		);
	};

	const handleConsolidadoWhatsApp = () => {
		if (!polizaExtendida) return;
		const cuotasVencidasLista = cuotasToRender.filter(
			(c) => obtenerEstadoReal(c) === "vencido" || obtenerEstadoReal(c) === "parcial"
		);
		enviarRecordatorioConsolidadoWhatsApp(
			cuotasVencidasLista,
			polizaExtendida,
			polizaExtendida.contacto,
			polizaExtendida.client.nombre_completo
		);
	};

	const handleConsolidadoEmail = () => {
		if (!polizaExtendida) return;
		const cuotasVencidasLista = cuotasToRender.filter(
			(c) => obtenerEstadoReal(c) === "vencido" || obtenerEstadoReal(c) === "parcial"
		);
		enviarRecordatorioConsolidadoEmail(
			cuotasVencidasLista,
			polizaExtendida,
			polizaExtendida.contacto,
			polizaExtendida.client.nombre_completo
		);
	};

	const handleOpenProrroga = (cuota: CuotaPago) => {
		setSelectedCuotaProrroga(cuota);
		setProrrogaModalOpen(true);
	};

	const handleProrrogaSuccess = () => {
		setProrrogaModalOpen(false);
		setSelectedCuotaProrroga(null);
		toast.success("Prórroga registrada exitosamente", {
			description: "La fecha de vencimiento ha sido actualizada",
		});
		loadExtendedData();
	};

	const handleVerComprobante = async (cuota: CuotaPago) => {
		setLoadingComprobante(cuota.id);
		try {
			const response = await obtenerComprobanteCuota(cuota.id);
			if (response.success && response.data) {
				window.open(response.data.publicUrl, "_blank");
			} else {
				toast.info("Sin comprobante", {
					description: response.error || "No se encontró comprobante para esta cuota",
				});
			}
		} catch {
			toast.error("Error al obtener comprobante");
		} finally {
			setLoadingComprobante(null);
		}
	};

	if (!poliza) return null;

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);

	const puedeRegistrarPago = (estado: string) =>
		estado === "pendiente" || estado === "vencido" || estado === "parcial";

	const puedeProrroga = (estado: string) =>
		estado === "pendiente" || estado === "vencido" || estado === "parcial";

	// cuotas se obtienen del detalle extendido (cargado al abrir el modal)
	const cuotasToRender = polizaExtendida?.cuotas ?? [];
	const cuotasVencidas = contarCuotasVencidas(cuotasToRender);
	const puedeGenerarAvisoMora = cuotasVencidas >= 3;
	const cuotasPendientesNotif = cuotasToRender.filter(
		(c) => obtenerEstadoReal(c) === "vencido" || obtenerEstadoReal(c) === "parcial"
	);
	const puedeNotificarConsolidado = cuotasPendientesNotif.length >= 2;

	const telefono =
		polizaExtendida?.contacto?.celular || polizaExtendida?.contacto?.telefono;
	const correo = polizaExtendida?.contacto?.correo;

	return (
		<>
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold">
							Cuotas de Póliza{" "}
							<span className="text-primary">{poliza.numero_poliza}</span>
						</DialogTitle>
					</DialogHeader>

					{/* Policy summary strip */}
					<div className="rounded-md border border-border bg-secondary px-4 py-3 text-sm">
						<div className="flex flex-wrap gap-x-8 gap-y-2">
							<div>
								<p className="text-xs text-muted-foreground">Cliente</p>
								<p className="font-medium mt-0.5">{poliza.client.nombre_completo}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Compañía</p>
								<p className="font-medium mt-0.5">{poliza.compania.nombre}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Ramo</p>
								<p className="font-medium mt-0.5">{poliza.ramo}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Prima Total</p>
								<p className="font-semibold tabular-nums mt-0.5">
									{poliza.moneda} {formatCurrency(poliza.prima_total)}
								</p>
							</div>
						</div>
					</div>

					{/* Loading state */}
					{loading && (
						<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Cargando información…
						</div>
					)}

					{/* Error state */}
					{error && (
						<div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
							<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					{!loading && polizaExtendida && (
						<div className="space-y-4">
							{/* Contact info */}
							<div className="rounded-md border border-border p-4">
								<h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
									<Users className="h-4 w-4 text-primary" />
									Información de Contacto
								</h3>
								<div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
									{/* Phone */}
									<div>
										<p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
											<Phone className="h-3 w-3" />
											Teléfono
										</p>
										{telefono ? (
											<button
												onClick={() => {
													const url = generarURLWhatsApp(telefono, "");
													window.open(url, "_blank");
												}}
												className="flex items-center gap-1.5 text-primary hover:underline font-medium"
											>
												<MessageCircle className="h-3.5 w-3.5" />
												{telefono}
											</button>
										) : (
											<span className="text-muted-foreground">No disponible</span>
										)}
									</div>

									{/* Email */}
									<div>
										<p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
											<Mail className="h-3 w-3" />
											Correo
										</p>
										{correo ? (
											<a
												href={`mailto:${correo}`}
												className="text-primary hover:underline font-medium"
											>
												{correo}
											</a>
										) : (
											<span className="text-muted-foreground">No disponible</span>
										)}
									</div>

									{/* Vigencia */}
									<div>
										<p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
											<Calendar className="h-3 w-3" />
											Inicio vigencia
										</p>
										<p className="font-medium">
											{formatearFecha(polizaExtendida.inicio_vigencia, "corto")}
										</p>
									</div>

									<div>
										<p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
											<Clock className="h-3 w-3" />
											Fin vigencia
										</p>
										<p className="font-medium">
											{formatearFecha(polizaExtendida.fin_vigencia, "corto")}
										</p>
									</div>
								</div>
							</div>

							{/* Ramo-specific data */}
							{polizaExtendida.datos_ramo && (
								<div className="rounded-md border border-border p-4">
									{/* Automotor */}
									{polizaExtendida.datos_ramo.tipo === "automotor" && (
										<>
											<h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
												<Car className="h-4 w-4 text-primary" />
												Vehículos Asegurados ({polizaExtendida.datos_ramo.vehiculos.length})
											</h3>
											<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
												{polizaExtendida.datos_ramo.vehiculos.map((vehiculo) => (
													<div
														key={vehiculo.id}
														className="rounded-md border border-border bg-card p-3"
													>
														<p className="font-semibold text-primary text-sm">
															{vehiculo.placa}
														</p>
														<p className="text-xs text-muted-foreground mt-0.5">
															{[vehiculo.marca, vehiculo.modelo, vehiculo.ano]
																.filter(Boolean)
																.join(" ")}
														</p>
														<p className="text-xs font-medium text-foreground mt-1.5 tabular-nums">
															{polizaExtendida.moneda}{" "}
															{formatCurrency(vehiculo.valor_asegurado)}
														</p>
													</div>
												))}
											</div>
										</>
									)}

									{/* Salud / Vida / AP / Sepelio */}
									{(polizaExtendida.datos_ramo.tipo === "salud" ||
										polizaExtendida.datos_ramo.tipo === "vida" ||
										polizaExtendida.datos_ramo.tipo === "ap" ||
										polizaExtendida.datos_ramo.tipo === "sepelio") && (
										<>
											<h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
												<Users className="h-4 w-4 text-primary" />
												Asegurados ({polizaExtendida.datos_ramo.asegurados.length})
											</h3>
											{polizaExtendida.datos_ramo.asegurados.length > 0 ? (
												<div className="space-y-2">
													{polizaExtendida.datos_ramo.asegurados.map((asegurado, idx) => (
														<div
															key={idx}
															className="border-l-2 border-l-primary pl-3 py-0.5 text-sm"
														>
															<p className="font-medium">{asegurado.client_name}</p>
															<p className="text-xs text-muted-foreground">
																CI: {asegurado.client_ci}
																{asegurado.nivel_nombre &&
																	` · Nivel: ${asegurado.nivel_nombre}`}
																{asegurado.cargo && ` · ${asegurado.cargo}`}
															</p>
														</div>
													))}
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													No hay asegurados registrados
												</p>
											)}
											{polizaExtendida.datos_ramo.producto && (
												<p className="text-sm mt-2">
													<span className="font-medium text-muted-foreground">
														Producto:
													</span>{" "}
													{polizaExtendida.datos_ramo.producto}
												</p>
											)}
										</>
									)}

									{/* Incendio */}
									{polizaExtendida.datos_ramo.tipo === "incendio" && (
										<>
											<h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
												<MapPin className="h-4 w-4 text-primary" />
												Ubicaciones Aseguradas
											</h3>
											{polizaExtendida.datos_ramo.ubicaciones.length > 0 ? (
												<div className="space-y-1.5">
													{polizaExtendida.datos_ramo.ubicaciones.map((ub, idx) => (
														<div key={idx} className="flex items-start gap-2 text-sm">
															<MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
															<span>{ub}</span>
														</div>
													))}
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													No hay ubicaciones registradas
												</p>
											)}
										</>
									)}

									{/* Otros */}
									{polizaExtendida.datos_ramo.tipo === "otros" && (
										<p className="text-sm text-muted-foreground">
											{polizaExtendida.datos_ramo.descripcion}
										</p>
									)}
								</div>
							)}

							{/* Notificación consolidada para 2+ cuotas vencidas */}
							{puedeNotificarConsolidado && (
								<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-start gap-3">
											<BellRing className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
											<div>
												<p className="text-sm font-semibold text-amber-800">
													{cuotasPendientesNotif.length} cuotas vencidas o parciales
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													Notificar al cliente con un solo mensaje consolidado
												</p>
											</div>
										</div>
										<div className="flex gap-2 shrink-0">
											{telefono && (
												<Button
													variant="outline"
													size="sm"
													className="border-amber-300 text-amber-800 hover:bg-amber-100"
													onClick={handleConsolidadoWhatsApp}
												>
													<MessageCircle className="h-4 w-4 mr-1.5" />
													WhatsApp
												</Button>
											)}
											{correo && (
												<Button
													variant="outline"
													size="sm"
													className="border-amber-300 text-amber-800 hover:bg-amber-100"
													onClick={handleConsolidadoEmail}
												>
													<Send className="h-4 w-4 mr-1.5" />
													Email
												</Button>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Aviso de Mora */}
							{puedeGenerarAvisoMora && (
								<div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-start gap-3">
											<FileWarning className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
											<div>
												<p className="text-sm font-semibold text-destructive">
													Mora Detectada
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{cuotasVencidas} cuotas vencidas — requiere aviso formal
												</p>
											</div>
										</div>
										<Button
											variant="destructive"
											size="sm"
											onClick={handleGenerarAvisoMora}
											disabled={generatingPDF}
											className="shrink-0"
										>
											{generatingPDF ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin mr-1.5" />
													Generando…
												</>
											) : (
												"Generar Aviso de Mora"
											)}
										</Button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Quotas table */}
					<div>
						{loading ? (
							<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Cargando cuotas…
							</div>
						) : cuotasToRender.length > 0 ? (
							<div className="rounded-md border border-border overflow-hidden">
								<table className="w-full">
									<thead className="bg-secondary text-secondary-foreground">
										<tr>
											<th className="px-4 py-3 text-left text-sm font-medium w-12">N°</th>
											<th className="px-4 py-3 text-left text-sm font-medium">Monto</th>
											<th className="px-4 py-3 text-left text-sm font-medium">Vencimiento</th>
											<th className="px-4 py-3 text-left text-sm font-medium">F. Pago</th>
											<th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
											<th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
										</tr>
									</thead>
									<tbody>
										{cuotasToRender.map((cuota) => {
											const estadoReal = obtenerEstadoReal(cuota);
											const hasPhone = !!(
												polizaExtendida?.contacto?.celular ||
												polizaExtendida?.contacto?.telefono
											);
											const hasEmail = !!polizaExtendida?.contacto?.correo;

											return (
												<tr
													key={cuota.id}
													className={`border-b border-border hover:bg-secondary/50 transition-colors duration-150 border-l-2 ${
														estadoReal === "vencido"
															? "border-l-destructive"
															: "border-l-transparent"
													}`}
												>
													{/* N° */}
													<td className="px-4 py-3 text-sm font-medium">
														{cuota.numero_cuota}
													</td>

													{/* Monto */}
													<td className="px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap">
														{poliza.moneda} {formatCurrency(cuota.monto)}
													</td>

													{/* Vencimiento */}
													<td className="px-4 py-3 text-sm">
														<div>
															{formatearFecha(cuota.fecha_vencimiento, "corto")}
														</div>
														{cuota.fecha_vencimiento_original && (
															<div className="mt-0.5">
																<span className="inline-block text-xs bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded-md">
																	Prorrogada
																</span>
															</div>
														)}
													</td>

													{/* Fecha de pago */}
													<td className="px-4 py-3 text-sm text-muted-foreground">
														{cuota.fecha_pago
															? formatearFecha(cuota.fecha_pago, "corto")
															: "—"}
													</td>

													{/* Estado */}
													<td className="px-4 py-3">
														<EstadoBadge estado={estadoReal} />
													</td>

													{/* Acciones */}
													<td className="px-4 py-3">
														<div className="flex items-center justify-end gap-1.5 flex-wrap">
															{/* Primary: Registrar Pago */}
															{puedeRegistrarPago(estadoReal) && (
																<Button
																	size="sm"
																	variant="default"
																	onClick={() => {
																		onSelectQuota(cuota);
																		onClose();
																	}}
																>
																	Registrar Pago
																</Button>
															)}

															{/* Secondary: Prórroga */}
															{puedeProrroga(estadoReal) && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() => handleOpenProrroga(cuota)}
																>
																	Prórroga
																</Button>
															)}

															{/* Ghost: WhatsApp */}
															{polizaExtendida && hasPhone && (
																<Button
																	size="icon"
																	variant="ghost"
																	className="h-8 w-8"
																	onClick={() => handleWhatsAppReminder(cuota)}
																	title="Enviar recordatorio por WhatsApp"
																>
																	<MessageCircle className="h-4 w-4 text-success" />
																</Button>
															)}

															{/* Ghost: Email */}
															{polizaExtendida && hasEmail && (
																<Button
																	size="icon"
																	variant="ghost"
																	className="h-8 w-8"
																	onClick={() => handleEmailReminder(cuota)}
																	title="Enviar recordatorio por Email"
																>
																	<Send className="h-4 w-4 text-info" />
																</Button>
															)}

															{/* Comprobante */}
															{estadoReal === "pagado" && (
																<Button
																	size="sm"
																	variant="ghost"
																	onClick={() => handleVerComprobante(cuota)}
																	disabled={loadingComprobante === cuota.id}
																	title="Ver comprobante de pago"
																	className="gap-1"
																>
																	{loadingComprobante === cuota.id ? (
																		<Loader2 className="h-4 w-4 animate-spin" />
																	) : (
																		<Paperclip className="h-4 w-4" />
																	)}
																	Comprobante
																</Button>
															)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<div className="text-center py-10 text-muted-foreground text-sm">
								No hay cuotas registradas para esta póliza
							</div>
						)}
					</div>

					{/* Cuotas de anexos de inclusión */}
					{polizaExtendida?.cuotas_inclusion && polizaExtendida.cuotas_inclusion.length > 0 && (
						<div className="mt-4">
							<h3 className="text-sm font-semibold mb-2 text-green-700 flex items-center gap-1.5">
								<span className="inline-block w-2 h-2 rounded-full bg-green-500" />
								Cuotas de Inclusiones
							</h3>
							<div className="border border-green-200 rounded-lg overflow-hidden">
								<table className="w-full text-sm">
									<thead className="bg-green-50">
										<tr>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">Anexo</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">N° Cuota</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">Monto</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">Vencimiento</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">Estado</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-green-100">
										{polizaExtendida.cuotas_inclusion.map((ci) => (
											<tr key={ci.id} className="hover:bg-green-50/50">
												<td className="px-4 py-2 text-xs font-medium text-green-800">
													{ci.numero_anexo}
												</td>
												<td className="px-4 py-2 text-xs">{ci.numero_cuota}</td>
												<td className="px-4 py-2 text-xs font-medium tabular-nums">
													{poliza.moneda} {formatCurrency(ci.monto)}
												</td>
												<td className="px-4 py-2 text-xs">
													{ci.fecha_vencimiento ? formatearFecha(ci.fecha_vencimiento, "corto") : "—"}
												</td>
												<td className="px-4 py-2">
													<EstadoBadge estado={ci.estado as "pendiente" | "pagado" | "vencido" | "parcial"} />
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="flex justify-end pt-1">
						<Button variant="outline" onClick={onClose}>
							Cerrar
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<RegistrarProrrogaModal
				cuota={selectedCuotaProrroga}
				poliza={poliza}
				open={prorrogaModalOpen}
				onClose={() => setProrrogaModalOpen(false)}
				onSuccess={handleProrrogaSuccess}
			/>
		</>
	);
}
