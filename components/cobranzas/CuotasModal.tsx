"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
	Send
} from "lucide-react";
import type { PolizaConPagos, CuotaPago, PolizaConPagosExtendida } from "@/types/cobranza";
import { obtenerDetallePolizaParaCuotas, prepararDatosAvisoMora } from "@/app/cobranzas/actions";
import { enviarRecordatorioWhatsApp, enviarRecordatorioEmail, formatearFecha, formatearMonto } from "@/utils/cobranza";
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

/**
 * MEJORAS #3, #4, #7, #8: Modal mejorado de cuotas con:
 * - Información de contacto del cliente (teléfono, correo)
 * - Datos específicos según el ramo (placas, asegurados, ubicaciones)
 * - Botones de recordatorio por WhatsApp y Email
 * - Botón "Registrar Prórroga"
 * - Botón "Generar Aviso de Mora" (si 3+ cuotas vencidas)
 */
export default function CuotasModal({ poliza, open, onClose, onSelectQuota }: CuotasModalProps) {
	const [polizaExtendida, setPolizaExtendida] = useState<PolizaConPagosExtendida | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Modal states
	const [selectedCuotaProrroga, setSelectedCuotaProrroga] = useState<CuotaPago | null>(null);
	const [prorrogaModalOpen, setProrrogaModalOpen] = useState(false);
	const [generatingPDF, setGeneratingPDF] = useState(false);

	useEffect(() => {
		if (open && poliza) {
			loadExtendedData();
		}
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
				// Generate PDF and open WhatsApp
				const avisoData = response.data;

				// TODO: Generate PDF using AvisoMoraTemplate
				// For now, open WhatsApp with message
				const mensaje = `Estimado/a cliente, se ha generado un aviso de mora para su póliza ${poliza.numero_poliza}. Tiene ${avisoData.cuotas_vencidas.length} cuotas vencidas por un total de ${formatearMonto(avisoData.total_adeudado, poliza.moneda)}. Por favor, regularice su situación a la brevedad.`;

				const telefono = polizaExtendida?.contacto?.celular || polizaExtendida?.contacto?.telefono;
				if (telefono) {
					const url = generarURLWhatsApp(telefono, mensaje);
					window.open(url, "_blank");
				} else {
					alert("No se encontró número de teléfono para este cliente");
				}
			} else {
				setError(response.error || "Error al preparar aviso de mora");
			}
		} catch (err) {
			console.error("Error generating aviso de mora:", err);
			setError("Error al generar aviso de mora");
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

	const handleOpenProrroga = (cuota: CuotaPago) => {
		setSelectedCuotaProrroga(cuota);
		setProrrogaModalOpen(true);
	};

	const handleProrrogaSuccess = () => {
		setProrrogaModalOpen(false);
		setSelectedCuotaProrroga(null);
		toast.success("Prórroga registrada exitosamente", {
			description: "La fecha de vencimiento ha sido actualizada"
		});
		loadExtendedData(); // Reload data
	};

	if (!poliza) return null;

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	const getEstadoBadge = (estado: string) => {
		switch (estado) {
			case "pendiente":
				return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
			case "vencido":
				return <Badge variant="destructive">Vencido</Badge>;
			case "parcial":
				return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Parcial</Badge>;
			case "pagado":
				return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pagado</Badge>;
			default:
				return <Badge variant="outline">{estado}</Badge>;
		}
	};

	const puedeRegistrarPago = (estado: string) => {
		return estado === "pendiente" || estado === "vencido" || estado === "parcial";
	};

	const puedeProrroga = (estado: string) => {
		return estado === "pendiente" || estado === "vencido" || estado === "parcial";
	};

	const cuotasVencidas = contarCuotasVencidas(poliza.cuotas || []);
	const puedeGenerarAvisoMora = cuotasVencidas >= 3;

	return (
		<>
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="!max-w-[95vw] sm:!max-w-[95vw] md:!max-w-[95vw] lg:!max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-xl">
							Cuotas de Póliza {poliza.numero_poliza}
						</DialogTitle>
						<DialogDescription asChild>
							<div className="space-y-1 text-sm text-muted-foreground">
								<div><span className="font-semibold">Cliente:</span> {poliza.client.nombre_completo}</div>
								<div><span className="font-semibold">Compañía:</span> {poliza.compania.nombre}</div>
								<div><span className="font-semibold">Ramo:</span> {poliza.ramo}</div>
								<div><span className="font-semibold">Prima Total:</span> {poliza.moneda} {formatCurrency(poliza.prima_total)}</div>
							</div>
						</DialogDescription>
					</DialogHeader>

					{loading && (
						<div className="text-center py-4 text-muted-foreground">
							Cargando información...
						</div>
					)}

					{error && (
						<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
							{error}
						</div>
					)}

					{!loading && polizaExtendida && (
						<>
							{/* MEJORA #3: Contact Information Section */}
							<div className="rounded-md border p-4 bg-muted/30">
								<h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
									<Users className="h-4 w-4" />
									Información de Contacto
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
									{/* Client Name */}
									<div className="flex items-center gap-2 col-span-full">
										<Users className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">Cliente:</span>
										<span>{polizaExtendida.client.nombre_completo}</span>
									</div>

									{/* Phone */}
									{(polizaExtendida.contacto.celular || polizaExtendida.contacto.telefono) ? (
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">Teléfono:</span>
											<Button
												variant="link"
												size="sm"
												className="h-auto p-0 text-blue-600"
												onClick={() => {
													const tel = polizaExtendida.contacto.celular || polizaExtendida.contacto.telefono;
													if (tel) {
														const url = generarURLWhatsApp(tel, "");
														window.open(url, "_blank");
													}
												}}
											>
												<MessageCircle className="h-3 w-3 mr-1" />
												{polizaExtendida.contacto.celular || polizaExtendida.contacto.telefono}
											</Button>
										</div>
									) : (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Phone className="h-4 w-4" />
											<span className="font-medium">Teléfono:</span>
											<span>No disponible</span>
										</div>
									)}

									{/* Email */}
									{polizaExtendida.contacto.correo ? (
										<div className="flex items-center gap-2">
											<Mail className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">Correo:</span>
											<a
												href={`mailto:${polizaExtendida.contacto.correo}`}
												className="text-blue-600 hover:underline"
											>
												{polizaExtendida.contacto.correo}
											</a>
										</div>
									) : (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Mail className="h-4 w-4" />
											<span className="font-medium">Correo:</span>
											<span>No disponible</span>
										</div>
									)}

									{/* Vigencia dates */}
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">Inicio vigencia:</span>
										<span>{formatearFecha(polizaExtendida.inicio_vigencia, "corto")}</span>
									</div>

									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">Fin vigencia:</span>
										<span>{formatearFecha(polizaExtendida.fin_vigencia, "corto")}</span>
									</div>
								</div>
							</div>

							{/* MEJORA #3: Ramo-Specific Data Section */}
							{polizaExtendida.datos_ramo && (
								<div className="rounded-md border p-4 bg-muted/30">
									{polizaExtendida.datos_ramo.tipo === "automotor" && (
										<>
											<h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
												<Car className="h-4 w-4" />
												Vehículos Asegurados ({polizaExtendida.datos_ramo.vehiculos.length})
											</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
												{polizaExtendida.datos_ramo.vehiculos.map((vehiculo) => (
													<div key={vehiculo.id} className="border rounded-md p-3 bg-background">
														<div className="font-semibold text-blue-600">{vehiculo.placa}</div>
														<div className="text-sm text-muted-foreground">
															{vehiculo.marca} {vehiculo.modelo} {vehiculo.ano}
														</div>
														<div className="text-xs text-muted-foreground mt-1">
															{polizaExtendida.moneda} {formatCurrency(vehiculo.valor_asegurado)}
														</div>
													</div>
												))}
											</div>
										</>
									)}

									{(polizaExtendida.datos_ramo.tipo === "salud" ||
									  polizaExtendida.datos_ramo.tipo === "vida" ||
									  polizaExtendida.datos_ramo.tipo === "ap" ||
									  polizaExtendida.datos_ramo.tipo === "sepelio") && (
										<>
											<h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
												<Users className="h-4 w-4" />
												Asegurados ({polizaExtendida.datos_ramo.asegurados.length})
											</h3>
											{polizaExtendida.datos_ramo.asegurados.length > 0 ? (
												<div className="space-y-2">
													{polizaExtendida.datos_ramo.asegurados.map((asegurado, idx) => (
														<div key={idx} className="text-sm border-l-2 border-blue-500 pl-3">
															<div className="font-medium">{asegurado.client_name}</div>
															<div className="text-muted-foreground">CI: {asegurado.client_ci}</div>
															{asegurado.nivel_nombre && (
																<div className="text-xs text-muted-foreground">
																	Nivel: {asegurado.nivel_nombre}
																</div>
															)}
															{asegurado.cargo && (
																<div className="text-xs text-muted-foreground">
																	Cargo: {asegurado.cargo}
																</div>
															)}
														</div>
													))}
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													No hay asegurados registrados (datos en proceso de migración)
												</p>
											)}
											{polizaExtendida.datos_ramo.producto && (
												<div className="mt-2 text-sm">
													<span className="font-medium">Producto:</span> {polizaExtendida.datos_ramo.producto}
												</div>
											)}
										</>
									)}

									{polizaExtendida.datos_ramo.tipo === "incendio" && (
										<>
											<h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
												<MapPin className="h-4 w-4" />
												Ubicaciones Aseguradas
											</h3>
											{polizaExtendida.datos_ramo.ubicaciones.length > 0 ? (
												<div className="space-y-2">
													{polizaExtendida.datos_ramo.ubicaciones.map((ubicacion, idx) => (
														<div key={idx} className="text-sm flex items-start gap-2">
															<MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
															<span>{ubicacion}</span>
														</div>
													))}
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													No hay ubicaciones registradas (datos en proceso de migración)
												</p>
											)}
										</>
									)}

									{polizaExtendida.datos_ramo.tipo === "otros" && (
										<div className="text-sm text-muted-foreground">
											{polizaExtendida.datos_ramo.descripcion}
										</div>
									)}
								</div>
							)}

							<Separator />

							{/* MEJORA #4: Aviso de Mora Button */}
							{puedeGenerarAvisoMora && (
								<div className="rounded-md border-2 border-red-200 bg-red-50 p-3">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-red-700">
											<FileWarning className="h-5 w-5" />
											<div>
												<div className="font-semibold">Mora Detectada</div>
												<div className="text-sm">
													Esta póliza tiene {cuotasVencidas} cuotas vencidas
												</div>
											</div>
										</div>
										<Button
											variant="destructive"
											onClick={handleGenerarAvisoMora}
											disabled={generatingPDF}
										>
											{generatingPDF ? "Generando..." : "Generar Aviso de Mora"}
										</Button>
									</div>
								</div>
							)}
						</>
					)}

					{/* Quotas Table */}
					<div className="mt-4">
						<div className="rounded-md border">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr>
										<th className="p-3 text-left text-sm font-medium">N° Cuota</th>
										<th className="p-3 text-left text-sm font-medium">Monto</th>
										<th className="p-3 text-left text-sm font-medium">F. Vencimiento</th>
										<th className="p-3 text-left text-sm font-medium">F. Pago</th>
										<th className="p-3 text-left text-sm font-medium">Estado</th>
										<th className="p-3 text-left text-sm font-medium">Acciones</th>
									</tr>
								</thead>
								<tbody>
									{poliza.cuotas.map((cuota, index) => (
										<tr
											key={cuota.id}
											className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
										>
											<td className="p-3 text-sm">{cuota.numero_cuota}</td>
											<td className="p-3 text-sm font-medium">
												{poliza.moneda} {formatCurrency(cuota.monto)}
											</td>
											<td className="p-3 text-sm">
												<div className="flex flex-col gap-1">
													<span>{formatearFecha(cuota.fecha_vencimiento, "corto")}</span>
													{cuota.fecha_vencimiento_original && (
														<div className="flex items-center gap-1">
															<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
																Prorrogada
															</Badge>
															<span className="text-xs text-muted-foreground">
																(Original: {formatearFecha(cuota.fecha_vencimiento_original, "corto")})
															</span>
														</div>
													)}
												</div>
											</td>
											<td className="p-3 text-sm">
												{cuota.fecha_pago ? formatearFecha(cuota.fecha_pago, "corto") : "-"}
											</td>
											<td className="p-3 text-sm">{getEstadoBadge(obtenerEstadoReal(cuota))}</td>
											<td className="p-3 text-sm">
												<div className="flex items-center gap-2 flex-wrap">
													{/* Registrar Pago */}
													{puedeRegistrarPago(obtenerEstadoReal(cuota)) && (
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

													{/* MEJORA #8: Registrar Prórroga */}
													{puedeProrroga(obtenerEstadoReal(cuota)) && (
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleOpenProrroga(cuota)}
														>
															Prórroga
														</Button>
													)}

													{/* MEJORA #7: WhatsApp Reminder */}
													{polizaExtendida && (polizaExtendida.contacto.celular || polizaExtendida.contacto.telefono) && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleWhatsAppReminder(cuota)}
															title="Enviar recordatorio por WhatsApp"
														>
															<MessageCircle className="h-4 w-4 text-green-600" />
														</Button>
													)}

													{/* MEJORA #7: Email Reminder */}
													{polizaExtendida && polizaExtendida.contacto.correo && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleEmailReminder(cuota)}
															title="Enviar recordatorio por Email"
														>
															<Send className="h-4 w-4 text-blue-600" />
														</Button>
													)}

													{obtenerEstadoReal(cuota) === "pagado" && (
														<span className="text-muted-foreground">-</span>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{poliza.cuotas.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No hay cuotas registradas para esta póliza
							</div>
						)}
					</div>

					<div className="mt-4 flex justify-end">
						<Button variant="outline" onClick={onClose}>
							Cerrar
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* MEJORA #8: Prórroga Modal */}
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
