"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Phone,
	Mail,
	MessageCircle,
	Users,
	Calendar,
	Clock,
	FileWarning,
	Send,
	Paperclip,
	Loader2,
	AlertCircle,
	BellRing,
	RefreshCw,
	StickyNote,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import type { PolizaConPagos, CuotaPago, PolizaConPagosExtendida, EstadoPago } from "@/types/cobranza";
import type { CuotaAnexoPropia } from "@/types/anexo";
import {
	obtenerDetallePolizaParaCuotas,
	prepararDatosAvisoMora,
	obtenerComprobanteAbono,
	obtenerComprobanteCuotaSinAbono,
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
import RegistrarProrrogaModal, { type CuotaProrrogable } from "./RegistrarProrrogaModal";
import SustituirComprobanteModal from "./SustituirComprobanteModal";
import RamoDetalle from "./RamoDetalle";
import NotasCuotaModal, { type NotasTarget } from "./NotasCuotaModal";
import RegistrarPagoAnexoModal, { type CuotaAnexoTarget } from "./RegistrarPagoAnexoModal";
import { toast } from "sonner";

interface CuotasModalProps {
	poliza: PolizaConPagos | null;
	open: boolean;
	onClose: () => void;
	onSelectQuota: (cuota: CuotaPago) => void;
	isAdmin?: boolean;
}

/** Status badge using design system palette and rounded-md */
function EstadoBadge({ estado }: { estado: string }) {
	const styles: Record<string, string> = {
		pendiente: "bg-amber-50 text-amber-800 border-amber-200",
		vencido: "bg-rose-50  text-rose-800  border-rose-200",
		parcial: "bg-orange-50 text-orange-800 border-orange-200",
		pagado: "bg-teal-50  text-teal-800  border-teal-200",
		saldado: "bg-emerald-50 text-emerald-800 border-emerald-200",
		anulada: "bg-secondary text-muted-foreground border-border line-through",
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

export default function CuotasModal({ poliza, open, onClose, onSelectQuota, isAdmin = false }: CuotasModalProps) {
	const [polizaExtendida, setPolizaExtendida] = useState<PolizaConPagosExtendida | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [selectedCuotaProrroga, setSelectedCuotaProrroga] = useState<CuotaProrrogable | null>(null);
	const [prorrogaEsAnexo, setProrrogaEsAnexo] = useState(false);
	const [prorrogaModalOpen, setProrrogaModalOpen] = useState(false);
	const [generatingPDF, setGeneratingPDF] = useState(false);
	const [loadingComprobante, setLoadingComprobante] = useState<string | null>(null);
	const [sustituirAbono, setSustituirAbono] = useState<{ abonoId: string; cuotaNumero?: number } | null>(null);
	const [sustituirModalOpen, setSustituirModalOpen] = useState(false);
	const [expandedCuotas, setExpandedCuotas] = useState<Set<string>>(new Set());
	const [notasTarget, setNotasTarget] = useState<NotasTarget | null>(null);
	const [notasOpen, setNotasOpen] = useState(false);
	const [pagoAnexoTarget, setPagoAnexoTarget] = useState<CuotaAnexoTarget | null>(null);
	const [pagoAnexoOpen, setPagoAnexoOpen] = useState(false);

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
				const telefono = polizaExtendida?.contacto?.celular || polizaExtendida?.contacto?.telefono;
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
			polizaExtendida.client.nombre_completo,
		);
	};

	const handleEmailReminder = (cuota: CuotaPago) => {
		if (!polizaExtendida) return;
		enviarRecordatorioEmail(
			cuota,
			polizaExtendida,
			polizaExtendida.contacto,
			polizaExtendida.client.nombre_completo,
		);
	};

	const handleConsolidadoWhatsApp = () => {
		if (!polizaExtendida) return;
		const cuotasVencidasLista = cuotasToRender.filter(
			(c) => obtenerEstadoReal(c) === "vencido" || obtenerEstadoReal(c) === "parcial",
		);
		enviarRecordatorioConsolidadoWhatsApp(
			cuotasVencidasLista,
			polizaExtendida,
			polizaExtendida.contacto,
			polizaExtendida.client.nombre_completo,
		);
	};

	const handleConsolidadoEmail = () => {
		if (!polizaExtendida) return;
		const cuotasVencidasLista = cuotasToRender.filter(
			(c) => obtenerEstadoReal(c) === "vencido" || obtenerEstadoReal(c) === "parcial",
		);
		enviarRecordatorioConsolidadoEmail(
			cuotasVencidasLista,
			polizaExtendida,
			polizaExtendida.contacto,
			polizaExtendida.client.nombre_completo,
		);
	};

	const handleOpenProrroga = (cuota: CuotaProrrogable, esAnexo = false) => {
		setSelectedCuotaProrroga(cuota);
		setProrrogaEsAnexo(esAnexo);
		setProrrogaModalOpen(true);
	};

	const handleProrrogaSuccess = () => {
		setProrrogaModalOpen(false);
		setSelectedCuotaProrroga(null);
		setProrrogaEsAnexo(false);
		toast.success("Prórroga registrada exitosamente", {
			description: "La fecha de vencimiento ha sido actualizada",
		});
		loadExtendedData();
	};

	const handleVerComprobanteAbono = async (abonoId: string) => {
		setLoadingComprobante(abonoId);
		try {
			const response = await obtenerComprobanteAbono(abonoId);
			if (response.success && response.data) {
				window.open(response.data.publicUrl, "_blank");
			} else {
				toast.info("Sin comprobante", {
					description: response.error || "No se encontró comprobante para este abono",
				});
			}
		} catch {
			toast.error("Error al obtener comprobante");
		} finally {
			setLoadingComprobante(null);
		}
	};

	// Comprobante legado cargado antes del sistema de abonos (sin abono asociado)
	const handleVerComprobanteCuota = async (cuotaId: string) => {
		setLoadingComprobante(cuotaId);
		try {
			const response = await obtenerComprobanteCuotaSinAbono(cuotaId);
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

	const handleSustituirAbono = (abonoId: string, cuotaNumero?: number) => {
		setSustituirAbono({ abonoId, cuotaNumero });
		setSustituirModalOpen(true);
	};

	const toggleExpand = (cuotaId: string) => {
		setExpandedCuotas((prev) => {
			const next = new Set(prev);
			if (next.has(cuotaId)) next.delete(cuotaId);
			else next.add(cuotaId);
			return next;
		});
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

	const puedeProrroga = (estado: string) => estado === "pendiente" || estado === "vencido" || estado === "parcial";

	// Adapta una cuota de anexo al shape de CuotaPago para reutilizar los
	// recordatorios de WhatsApp/Email (que sólo leen numero_cuota, monto,
	// fecha_vencimiento, estado y fecha_pago).
	const anexoCuotaParaRecordatorio = (ci: CuotaAnexoPropia): CuotaPago => ({
		id: ci.id,
		poliza_id: poliza.id,
		numero_cuota: ci.numero_cuota,
		monto: ci.monto,
		fecha_vencimiento: ci.fecha_vencimiento,
		fecha_pago: null,
		estado: (ci.estado as EstadoPago) ?? "pendiente",
		observaciones: ci.observaciones ?? null,
		fecha_vencimiento_original: ci.fecha_vencimiento_original ?? null,
		created_at: "",
		updated_at: "",
		created_by: null,
		updated_by: null,
	});

	// cuotas se obtienen del detalle extendido (cargado al abrir el modal)
	const cuotasToRender = polizaExtendida?.cuotas ?? [];
	const cuotasVencidas = contarCuotasVencidas(cuotasToRender);
	const puedeGenerarAvisoMora = cuotasVencidas >= 3;
	const cuotasPendientesNotif = cuotasToRender.filter(
		(c) => obtenerEstadoReal(c) === "vencido" || obtenerEstadoReal(c) === "parcial",
	);
	const puedeNotificarConsolidado = cuotasPendientesNotif.length >= 2;

	const telefono = polizaExtendida?.contacto?.celular || polizaExtendida?.contacto?.telefono;
	const correo = polizaExtendida?.contacto?.correo;

	return (
		<>
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold">
							Cuotas de Póliza <span className="text-primary">{poliza.numero_poliza}</span>
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
							{polizaExtendida?.director_cartera && (
								<div>
									<p className="text-xs text-muted-foreground">Director de cartera</p>
									<p className="font-medium mt-0.5">{polizaExtendida.director_cartera}</p>
								</div>
							)}
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
								<RamoDetalle datos={polizaExtendida.datos_ramo} moneda={polizaExtendida.moneda} />
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
												<p className="text-sm font-semibold text-destructive">Mora Detectada</p>
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
							<div className="rounded-md border border-border overflow-x-auto">
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
											const hasPhone = !!(
												polizaExtendida?.contacto?.celular ||
												polizaExtendida?.contacto?.telefono
											);
											const hasEmail = !!polizaExtendida?.contacto?.correo;
											const abonos = polizaExtendida?.abonos_por_cuota?.[cuota.id] ?? [];
											const abonado = abonos.reduce((s, a) => s + a.monto, 0);
											// Descuento de exclusión activo: reduce el cobrable; si lo cubre
											// todo, la cuota queda "saldada" (no se cobra, no es dinero).
											// Una cuota ya pagada se respeta como tal (el descuento es no-op,
											// no se devuelve dinero).
											const descuento = cuota.monto_descuento ?? 0;
											const estadoBase = obtenerEstadoReal(cuota);
											const saldadaExcl =
												estadoBase !== "pagado" &&
												descuento > 0 &&
												descuento + abonado >= cuota.monto - 0.01;
											const estadoReal = saldadaExcl ? "saldado" : estadoBase;
											const isExpanded = expandedCuotas.has(cuota.id);

											return (
												<Fragment key={cuota.id}>
													<tr
														className={`border-b border-border hover:bg-secondary/50 transition-colors duration-150 border-l-2 ${
															estadoReal === "vencido"
																? "border-l-destructive"
																: "border-l-transparent"
														}`}
													>
														{/* N° + expand de abonos */}
														<td className="px-4 py-3 text-sm font-medium">
															<div className="flex items-center gap-1">
																{abonos.length > 0 ? (
																	<button
																		onClick={() => toggleExpand(cuota.id)}
																		className="text-muted-foreground hover:text-foreground"
																		title={
																			isExpanded
																				? "Ocultar abonos"
																				: `Ver ${abonos.length} abono(s)`
																		}
																	>
																		{isExpanded ? (
																			<ChevronDown className="h-4 w-4" />
																		) : (
																			<ChevronRight className="h-4 w-4" />
																		)}
																	</button>
																) : (
																	<span className="inline-block w-4" />
																)}
																{cuota.numero_cuota}
															</div>
														</td>

														{/* Monto */}
														<td className="px-4 py-3 text-sm font-medium tabular-nums whitespace-nowrap">
															{poliza.moneda} {formatCurrency(cuota.monto)}
															{abonado > 0.01 && abonado < cuota.monto - 0.01 && (
																<div className="text-xs font-normal text-muted-foreground">
																	abonado {formatCurrency(abonado)}
																</div>
															)}
															{descuento > 0.01 && estadoBase !== "pagado" && (
																<div className="text-xs font-normal text-emerald-700">
																	{saldadaExcl
																		? `saldada por exclusión`
																		: `descuento ${formatCurrency(descuento)}`}
																</div>
															)}
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
																{/* Primary: Registrar Pago (no en pólizas anuladas: sus cuotas no se cobran) */}
																{poliza?.estado !== "anulada" &&
																	puedeRegistrarPago(estadoReal) && (
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
																{poliza?.estado !== "anulada" &&
																	puedeProrroga(estadoReal) && (
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

																{/* Notas */}
																{polizaExtendida && (
																	<Button
																		size="icon"
																		variant="ghost"
																		className="h-8 w-8 relative"
																		onClick={() => {
																			setNotasTarget({
																				pagoId: cuota.id,
																				label: `Cuota #${cuota.numero_cuota}`,
																			});
																			setNotasOpen(true);
																		}}
																		title="Notas de la cuota"
																	>
																		<StickyNote className="h-4 w-4 text-muted-foreground" />
																		{(polizaExtendida.notas_por_cuota?.[cuota.id]
																			?.length ?? 0) > 0 && (
																			<span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] leading-none rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
																				{
																					polizaExtendida.notas_por_cuota![
																						cuota.id
																					].length
																				}
																			</span>
																		)}
																	</Button>
																)}

																{/* Comprobantes: ver en la sub-fila expandible de abonos (chevron en col. N°).
																	    Fallback: comprobante legado cargado antes del sistema de abonos. */}
																{polizaExtendida?.comprobantes_sin_abono?.[
																	cuota.id
																] && (
																	<Button
																		size="sm"
																		variant="ghost"
																		className="gap-1 h-8"
																		onClick={() =>
																			handleVerComprobanteCuota(cuota.id)
																		}
																		disabled={loadingComprobante === cuota.id}
																		title="Ver comprobante"
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

													{/* Sub-fila: abonos de la cuota, cada uno con su comprobante */}
													{isExpanded && abonos.length > 0 && (
														<tr className="bg-secondary/30">
															<td colSpan={6} className="px-4 py-2">
																<div className="pl-6 space-y-1.5">
																	<p className="text-xs font-medium text-muted-foreground">
																		Abonos ({abonos.length}) — {poliza.moneda}{" "}
																		{formatCurrency(abonado)} de{" "}
																		{formatCurrency(cuota.monto)}
																	</p>
																	{abonos.map((abono, idx) => (
																		<div
																			key={abono.id}
																			className="flex items-center gap-3 text-sm bg-card border border-border rounded-md px-3 py-1.5"
																		>
																			<span className="text-xs text-muted-foreground w-6">
																				#{idx + 1}
																			</span>
																			<span className="font-medium tabular-nums">
																				{poliza.moneda}{" "}
																				{formatCurrency(abono.monto)}
																			</span>
																			<span className="text-xs text-muted-foreground">
																				{formatearFecha(
																					abono.fecha_pago,
																					"corto",
																				)}
																			</span>
																			{abono.autor && (
																				<span className="text-xs text-muted-foreground truncate hidden sm:inline">
																					· {abono.autor}
																				</span>
																			)}
																			<div className="ml-auto flex items-center gap-1">
																				{abono.tiene_comprobante ? (
																					<Button
																						size="sm"
																						variant="ghost"
																						className="gap-1 h-7"
																						onClick={() =>
																							handleVerComprobanteAbono(
																								abono.id,
																							)
																						}
																						disabled={
																							loadingComprobante ===
																							abono.id
																						}
																						title="Ver comprobante"
																					>
																						{loadingComprobante ===
																						abono.id ? (
																							<Loader2 className="h-4 w-4 animate-spin" />
																						) : (
																							<Paperclip className="h-4 w-4" />
																						)}
																						Comprobante
																					</Button>
																				) : (
																					<span className="text-xs text-muted-foreground">
																						Sin comprobante
																					</span>
																				)}
																				{isAdmin && (
																					<Button
																						size="icon"
																						variant="ghost"
																						className="h-7 w-7"
																						onClick={() =>
																							handleSustituirAbono(
																								abono.id,
																								cuota.numero_cuota,
																							)
																						}
																						title="Sustituir comprobante del abono"
																					>
																						<RefreshCw className="h-4 w-4 text-muted-foreground" />
																					</Button>
																				)}
																			</div>
																		</div>
																	))}
																</div>
															</td>
														</tr>
													)}
												</Fragment>
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
							<div className="border border-green-200 rounded-lg overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-green-50">
										<tr>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">
												Anexo
											</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">
												N° Cuota
											</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">
												Monto
											</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">
												Vencimiento
											</th>
											<th className="px-4 py-2 text-left text-xs font-medium text-green-700">
												Estado
											</th>
											<th className="px-4 py-2 text-right text-xs font-medium text-green-700">
												Acciones
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-green-100">
										{polizaExtendida.cuotas_inclusion.map((ci) => {
											const abonosAnexo = polizaExtendida.abonos_por_cuota?.[ci.id] ?? [];
											const abonadoAnexo = abonosAnexo.reduce((s, a) => s + a.monto, 0);
											const notasCount = polizaExtendida.notas_por_cuota?.[ci.id]?.length ?? 0;
											const descuentoCi = ci.monto_descuento ?? 0;
											// 'saldado' = descuento de exclusión cubre la cuota: no cobrable.
											const pagable = ci.estado !== "pagado" && ci.estado !== "saldado";
											const hasPhone = !!(
												polizaExtendida?.contacto?.celular ||
												polizaExtendida?.contacto?.telefono
											);
											const hasEmail = !!polizaExtendida?.contacto?.correo;
											const isExpanded = expandedCuotas.has(ci.id);
											const cuotaRecordatorio = anexoCuotaParaRecordatorio(ci);
											return (
												<Fragment key={ci.id}>
													<tr className="hover:bg-green-50/50">
														<td className="px-4 py-2 text-xs font-medium text-green-800">
															{ci.numero_anexo}
														</td>
														<td className="px-4 py-2 text-xs">
															<div className="flex items-center gap-1">
																{abonosAnexo.length > 0 ? (
																	<button
																		onClick={() => toggleExpand(ci.id)}
																		className="text-muted-foreground hover:text-foreground"
																		title={
																			isExpanded
																				? "Ocultar abonos"
																				: `Ver ${abonosAnexo.length} abono(s)`
																		}
																	>
																		{isExpanded ? (
																			<ChevronDown className="h-4 w-4" />
																		) : (
																			<ChevronRight className="h-4 w-4" />
																		)}
																	</button>
																) : (
																	<span className="inline-block w-4" />
																)}
																{ci.numero_cuota}
															</div>
														</td>
														<td className="px-4 py-2 text-xs font-medium tabular-nums">
															{poliza.moneda} {formatCurrency(ci.monto)}
															{abonadoAnexo > 0.01 && abonadoAnexo < ci.monto - 0.01 && (
																<span className="block text-[11px] font-normal text-muted-foreground">
																	abonado {formatCurrency(abonadoAnexo)}
																</span>
															)}
															{descuentoCi > 0.01 && ci.estado !== "pagado" && (
																<span className="block text-[11px] font-normal text-emerald-700">
																	{ci.estado === "saldado"
																		? "saldada por exclusión"
																		: `descuento ${formatCurrency(descuentoCi)}`}
																</span>
															)}
														</td>
														<td className="px-4 py-2 text-xs">
															{ci.fecha_vencimiento
																? formatearFecha(ci.fecha_vencimiento, "corto")
																: "—"}
															{ci.fecha_vencimiento_original && (
																<div className="mt-0.5">
																	<span className="inline-block text-xs bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded-md">
																		Prorrogada
																	</span>
																</div>
															)}
														</td>
														<td className="px-4 py-2">
															<EstadoBadge estado={ci.estado} />
														</td>
														<td className="px-4 py-2">
															<div className="flex items-center justify-end gap-1.5 flex-wrap">
																{pagable && (
																	<Button
																		size="sm"
																		variant="default"
																		onClick={() => {
																			setPagoAnexoTarget({
																				id: ci.id,
																				numero_anexo: ci.numero_anexo,
																				numero_cuota: ci.numero_cuota,
																				monto: ci.monto,
																			});
																			setPagoAnexoOpen(true);
																		}}
																	>
																		Registrar Pago
																	</Button>
																)}

																{pagable && (
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={() =>
																			handleOpenProrroga(
																				{
																					id: ci.id,
																					numero_cuota: ci.numero_cuota,
																					monto: ci.monto,
																					fecha_vencimiento:
																						ci.fecha_vencimiento,
																				},
																				true,
																			)
																		}
																	>
																		Prórroga
																	</Button>
																)}

																{hasPhone && (
																	<Button
																		size="icon"
																		variant="ghost"
																		className="h-8 w-8"
																		onClick={() =>
																			handleWhatsAppReminder(cuotaRecordatorio)
																		}
																		title="Enviar recordatorio por WhatsApp"
																	>
																		<MessageCircle className="h-4 w-4 text-success" />
																	</Button>
																)}

																{hasEmail && (
																	<Button
																		size="icon"
																		variant="ghost"
																		className="h-8 w-8"
																		onClick={() =>
																			handleEmailReminder(cuotaRecordatorio)
																		}
																		title="Enviar recordatorio por Email"
																	>
																		<Send className="h-4 w-4 text-info" />
																	</Button>
																)}

																<Button
																	size="icon"
																	variant="ghost"
																	className="h-8 w-8 relative"
																	title="Notas de la cuota"
																	onClick={() => {
																		setNotasTarget({
																			anexoPagoId: ci.id,
																			label: `Anexo ${ci.numero_anexo} · Cuota ${ci.numero_cuota}`,
																		});
																		setNotasOpen(true);
																	}}
																>
																	<StickyNote className="h-4 w-4 text-muted-foreground" />
																	{notasCount > 0 && (
																		<span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] leading-none rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
																			{notasCount}
																		</span>
																	)}
																</Button>
															</div>
														</td>
													</tr>

													{/* Sub-fila: abonos de la cuota de anexo, cada uno con su comprobante */}
													{isExpanded && abonosAnexo.length > 0 && (
														<tr className="bg-green-50/40">
															<td colSpan={6} className="px-4 py-2">
																<div className="pl-6 space-y-1.5">
																	<p className="text-xs font-medium text-muted-foreground">
																		Abonos ({abonosAnexo.length}) — {poliza.moneda}{" "}
																		{formatCurrency(abonadoAnexo)} de{" "}
																		{formatCurrency(ci.monto)}
																	</p>
																	{abonosAnexo.map((abono, idx) => (
																		<div
																			key={abono.id}
																			className="flex items-center gap-3 text-sm bg-card border border-border rounded-md px-3 py-1.5"
																		>
																			<span className="text-xs text-muted-foreground w-6">
																				#{idx + 1}
																			</span>
																			<span className="font-medium tabular-nums">
																				{poliza.moneda}{" "}
																				{formatCurrency(abono.monto)}
																			</span>
																			<span className="text-xs text-muted-foreground">
																				{formatearFecha(
																					abono.fecha_pago,
																					"corto",
																				)}
																			</span>
																			{abono.autor && (
																				<span className="text-xs text-muted-foreground truncate hidden sm:inline">
																					· {abono.autor}
																				</span>
																			)}
																			<div className="ml-auto flex items-center gap-1">
																				{abono.tiene_comprobante ? (
																					<Button
																						size="sm"
																						variant="ghost"
																						className="gap-1 h-7"
																						onClick={() =>
																							handleVerComprobanteAbono(
																								abono.id,
																							)
																						}
																						disabled={
																							loadingComprobante ===
																							abono.id
																						}
																						title="Ver comprobante"
																					>
																						{loadingComprobante ===
																						abono.id ? (
																							<Loader2 className="h-4 w-4 animate-spin" />
																						) : (
																							<Paperclip className="h-4 w-4" />
																						)}
																						Comprobante
																					</Button>
																				) : (
																					<span className="text-xs text-muted-foreground">
																						Sin comprobante
																					</span>
																				)}
																				{isAdmin && (
																					<Button
																						size="icon"
																						variant="ghost"
																						className="h-7 w-7"
																						onClick={() =>
																							handleSustituirAbono(
																								abono.id,
																								ci.numero_cuota,
																							)
																						}
																						title="Sustituir comprobante del abono"
																					>
																						<RefreshCw className="h-4 w-4 text-muted-foreground" />
																					</Button>
																				)}
																			</div>
																		</div>
																	))}
																</div>
															</td>
														</tr>
													)}
												</Fragment>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Cobro de Vigencia Corrida (póliza anulada): saldo cobrable del endoso */}
					{polizaExtendida?.vigencia_corrida_cobrable &&
						polizaExtendida.vigencia_corrida_cobrable.length > 0 && (
							<div className="mt-4">
								<h3 className="text-sm font-semibold mb-2 text-purple-700 flex items-center gap-1.5">
									<span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
									Cobro de Vigencia Corrida
								</h3>
								<div className="border border-purple-200 rounded-lg overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-purple-50">
											<tr>
												<th className="px-4 py-2 text-left text-xs font-medium text-purple-700">
													Anexo
												</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-purple-700">
													Concepto
												</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-purple-700">
													Monto
												</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-purple-700">
													Vencimiento
												</th>
												<th className="px-4 py-2 text-left text-xs font-medium text-purple-700">
													Estado
												</th>
												<th className="px-4 py-2 text-right text-xs font-medium text-purple-700">
													Acciones
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-purple-100">
											{polizaExtendida.vigencia_corrida_cobrable.map((vc) => {
												const abonosVc = polizaExtendida.abonos_por_cuota?.[vc.id] ?? [];
												const abonadoVc = abonosVc.reduce((s, a) => s + a.monto, 0);
												const notasCount =
													polizaExtendida.notas_por_cuota?.[vc.id]?.length ?? 0;
												const pagable = vc.estado !== "pagado";
												const isExpanded = expandedCuotas.has(vc.id);
												return (
													<Fragment key={vc.id}>
														<tr className="hover:bg-purple-50/50">
															<td className="px-4 py-2 text-xs font-medium text-purple-800">
																{vc.numero_anexo}
															</td>
															<td className="px-4 py-2 text-xs">
																<div className="flex items-center gap-1">
																	{abonosVc.length > 0 ? (
																		<button
																			onClick={() => toggleExpand(vc.id)}
																			className="text-muted-foreground hover:text-foreground"
																			title={
																				isExpanded
																					? "Ocultar abonos"
																					: `Ver ${abonosVc.length} abono(s)`
																			}
																		>
																			{isExpanded ? (
																				<ChevronDown className="h-4 w-4" />
																			) : (
																				<ChevronRight className="h-4 w-4" />
																			)}
																		</button>
																	) : (
																		<span className="inline-block w-4" />
																	)}
																	Vigencia corrida
																</div>
															</td>
															<td className="px-4 py-2 text-xs font-medium tabular-nums">
																{poliza.moneda} {formatCurrency(vc.monto)}
																{abonadoVc > 0.01 && abonadoVc < vc.monto - 0.01 && (
																	<span className="block text-[11px] font-normal text-muted-foreground">
																		abonado {formatCurrency(abonadoVc)}
																	</span>
																)}
															</td>
															<td className="px-4 py-2 text-xs">
																{vc.fecha_vencimiento
																	? formatearFecha(vc.fecha_vencimiento, "corto")
																	: "—"}
															</td>
															<td className="px-4 py-2">
																<EstadoBadge estado={vc.estado} />
															</td>
															<td className="px-4 py-2">
																<div className="flex items-center justify-end gap-1.5 flex-wrap">
																	{pagable && (
																		<Button
																			size="sm"
																			variant="default"
																			onClick={() => {
																				setPagoAnexoTarget({
																					id: vc.id,
																					numero_anexo: vc.numero_anexo,
																					numero_cuota: vc.numero_cuota,
																					monto: vc.monto,
																				});
																				setPagoAnexoOpen(true);
																			}}
																		>
																			Registrar Pago
																		</Button>
																	)}
																	{pagable && (
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={() =>
																				handleOpenProrroga(
																					{
																						id: vc.id,
																						numero_cuota: vc.numero_cuota,
																						monto: vc.monto,
																						fecha_vencimiento:
																							vc.fecha_vencimiento,
																					},
																					true,
																				)
																			}
																		>
																			Prórroga
																		</Button>
																	)}
																	<Button
																		size="icon"
																		variant="ghost"
																		className="h-8 w-8 relative"
																		title="Notas"
																		onClick={() => {
																			setNotasTarget({
																				anexoPagoId: vc.id,
																				label: `Vigencia corrida · Anexo ${vc.numero_anexo}`,
																			});
																			setNotasOpen(true);
																		}}
																	>
																		<StickyNote className="h-4 w-4 text-muted-foreground" />
																		{notasCount > 0 && (
																			<span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] leading-none rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
																				{notasCount}
																			</span>
																		)}
																	</Button>
																</div>
															</td>
														</tr>

														{isExpanded && abonosVc.length > 0 && (
															<tr className="bg-purple-50/40">
																<td colSpan={6} className="px-4 py-2">
																	<div className="pl-6 space-y-1.5">
																		<p className="text-xs font-medium text-muted-foreground">
																			Abonos ({abonosVc.length}) — {poliza.moneda}{" "}
																			{formatCurrency(abonadoVc)} de{" "}
																			{formatCurrency(vc.monto)}
																		</p>
																		{abonosVc.map((abono, idx) => (
																			<div
																				key={abono.id}
																				className="flex items-center gap-3 text-sm bg-card border border-border rounded-md px-3 py-1.5"
																			>
																				<span className="text-xs text-muted-foreground w-6">
																					#{idx + 1}
																				</span>
																				<span className="font-medium tabular-nums">
																					{poliza.moneda}{" "}
																					{formatCurrency(abono.monto)}
																				</span>
																				<span className="text-xs text-muted-foreground">
																					{formatearFecha(
																						abono.fecha_pago,
																						"corto",
																					)}
																				</span>
																				{abono.autor && (
																					<span className="text-xs text-muted-foreground truncate hidden sm:inline">
																						· {abono.autor}
																					</span>
																				)}
																				<div className="ml-auto flex items-center gap-1">
																					{abono.tiene_comprobante ? (
																						<Button
																							size="sm"
																							variant="ghost"
																							className="gap-1 h-7"
																							onClick={() =>
																								handleVerComprobanteAbono(
																									abono.id,
																								)
																							}
																							disabled={
																								loadingComprobante ===
																								abono.id
																							}
																							title="Ver comprobante"
																						>
																							{loadingComprobante ===
																							abono.id ? (
																								<Loader2 className="h-4 w-4 animate-spin" />
																							) : (
																								<Paperclip className="h-4 w-4" />
																							)}
																							Comprobante
																						</Button>
																					) : (
																						<span className="text-xs text-muted-foreground">
																							Sin comprobante
																						</span>
																					)}
																				</div>
																			</div>
																		))}
																	</div>
																</td>
															</tr>
														)}
													</Fragment>
												);
											})}
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
				esAnexo={prorrogaEsAnexo}
				open={prorrogaModalOpen}
				onClose={() => setProrrogaModalOpen(false)}
				onSuccess={handleProrrogaSuccess}
			/>

			<SustituirComprobanteModal
				abonoId={sustituirAbono?.abonoId ?? null}
				cuotaNumero={sustituirAbono?.cuotaNumero}
				open={sustituirModalOpen}
				onClose={() => {
					setSustituirModalOpen(false);
					setSustituirAbono(null);
				}}
				onSuccess={() => {
					toast.success("Comprobante actualizado correctamente");
					loadExtendedData();
				}}
			/>

			<NotasCuotaModal
				target={notasTarget}
				notasIniciales={
					notasTarget
						? ((notasTarget.pagoId
								? polizaExtendida?.notas_por_cuota?.[notasTarget.pagoId]
								: notasTarget.anexoPagoId
									? polizaExtendida?.notas_por_cuota?.[notasTarget.anexoPagoId]
									: undefined) ?? [])
						: []
				}
				open={notasOpen}
				onClose={() => {
					setNotasOpen(false);
					setNotasTarget(null);
				}}
				onAdded={loadExtendedData}
			/>

			<RegistrarPagoAnexoModal
				cuota={pagoAnexoTarget}
				moneda={poliza.moneda}
				open={pagoAnexoOpen}
				onClose={() => {
					setPagoAnexoOpen(false);
					setPagoAnexoTarget(null);
				}}
				onSuccess={() => {
					setPagoAnexoOpen(false);
					setPagoAnexoTarget(null);
					loadExtendedData();
				}}
			/>
		</>
	);
}
