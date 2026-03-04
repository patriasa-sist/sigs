"use client";

import { useState, useEffect, useCallback } from "react";
import {
	FileText,
	CreditCard,
	FileDown,
	CheckCircle,
	XCircle,
	ChevronDown,
	ChevronUp,
	Loader2,
	AlertTriangle,
	Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
	obtenerAnexosPoliza,
	obtenerDetalleAnexo,
	type AnexoDetalle,
} from "@/app/polizas/anexos/actions";
import {
	validarAnexo,
	rechazarAnexo,
} from "@/app/gerencia/validacion-anexos/actions";
import { formatDate, formatCurrency } from "@/utils/formatters";
import type { AnexoResumen } from "@/types/anexo";

type Props = {
	polizaId: string;
	moneda: string;
	puedeValidar: boolean;
	onAnexoValidado?: () => void;
};

const TIPO_BADGE = {
	inclusion: { label: "Inclusión", className: "bg-green-100 text-green-700 border-green-200" },
	exclusion: { label: "Exclusión", className: "bg-orange-100 text-orange-700 border-orange-200" },
	anulacion: { label: "Anulación", className: "bg-red-100 text-red-700 border-red-200" },
};

const ESTADO_BADGE = {
	pendiente: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
	activo: { label: "Activo", className: "bg-green-100 text-green-800 border-green-200" },
	rechazado: { label: "Rechazado", className: "bg-red-100 text-red-800 border-red-200" },
};

export default function AnexoDetalleSection({ polizaId, moneda, puedeValidar, onAnexoValidado }: Props) {
	const [anexos, setAnexos] = useState<AnexoResumen[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAnexos, setShowAnexos] = useState(false);
	const [expandedAnexo, setExpandedAnexo] = useState<string | null>(null);
	const [detalleCache, setDetalleCache] = useState<Record<string, AnexoDetalle>>({});
	const [detalleLoading, setDetalleLoading] = useState<string | null>(null);

	// Validation dialog
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogType, setDialogType] = useState<"validar" | "rechazar">("validar");
	const [dialogAnexo, setDialogAnexo] = useState<AnexoResumen | null>(null);
	const [motivoRechazo, setMotivoRechazo] = useState("");
	const [actionLoading, setActionLoading] = useState(false);

	const cargarAnexos = useCallback(async () => {
		setLoading(true);
		const result = await obtenerAnexosPoliza(polizaId);
		if (result.success && result.anexos) {
			setAnexos(result.anexos);
			// Auto-expand if there are pending anexos
			const hasPendientes = result.anexos.some((a) => a.estado === "pendiente");
			if (hasPendientes) setShowAnexos(true);
		}
		setLoading(false);
	}, [polizaId]);

	useEffect(() => {
		cargarAnexos();
	}, [cargarAnexos]);

	const toggleDetalle = async (anexoId: string) => {
		if (expandedAnexo === anexoId) {
			setExpandedAnexo(null);
			return;
		}

		setExpandedAnexo(anexoId);

		// Load detail if not cached
		if (!detalleCache[anexoId]) {
			setDetalleLoading(anexoId);
			const result = await obtenerDetalleAnexo(anexoId);
			if (result.success && result.detalle) {
				setDetalleCache((prev) => ({ ...prev, [anexoId]: result.detalle! }));
			}
			setDetalleLoading(null);
		}
	};

	const openDialog = (anexo: AnexoResumen, type: "validar" | "rechazar") => {
		setDialogAnexo(anexo);
		setDialogType(type);
		setMotivoRechazo("");
		setDialogOpen(true);
	};

	const handleValidar = async () => {
		if (!dialogAnexo) return;
		setActionLoading(true);
		setDialogOpen(false);

		const result = await validarAnexo(dialogAnexo.id);
		if (result.success) {
			toast.success("Anexo validado exitosamente", {
				description: dialogAnexo.tipo_anexo === "anulacion"
					? "La póliza ha sido anulada"
					: `Anexo ${dialogAnexo.numero_anexo} activado`,
			});
			// Clear cache and reload
			setDetalleCache((prev) => {
				const next = { ...prev };
				delete next[dialogAnexo.id];
				return next;
			});
			await cargarAnexos();
			onAnexoValidado?.();
		} else {
			toast.error("Error al validar", { description: result.error });
		}
		setActionLoading(false);
	};

	const handleRechazar = async () => {
		if (!dialogAnexo) return;
		if (motivoRechazo.trim().length < 10) {
			toast.error("Motivo insuficiente", { description: "El motivo debe tener al menos 10 caracteres" });
			return;
		}

		setActionLoading(true);
		setDialogOpen(false);

		const result = await rechazarAnexo(dialogAnexo.id, motivoRechazo);
		if (result.success) {
			toast.success("Anexo rechazado");
			setDetalleCache((prev) => {
				const next = { ...prev };
				delete next[dialogAnexo.id];
				return next;
			});
			await cargarAnexos();
			onAnexoValidado?.();
		} else {
			toast.error("Error al rechazar", { description: result.error });
		}
		setActionLoading(false);
	};

	if (loading) return null;
	if (anexos.length === 0) return null;

	const pendientes = anexos.filter((a) => a.estado === "pendiente");
	const otrosAnexos = anexos.filter((a) => a.estado !== "pendiente");

	return (
		<>
			{/* Toggle button */}
			<div className="lg:col-span-3">
				<button
					onClick={() => setShowAnexos(!showAnexos)}
					className="w-full flex items-center justify-between px-6 py-4 bg-white rounded-lg shadow-sm border hover:bg-gray-50 transition-colors"
				>
					<div className="flex items-center gap-3">
						<Package className="h-5 w-5 text-primary" />
						<span className="text-lg font-semibold text-gray-900">
							Anexos ({anexos.length})
						</span>
						{pendientes.length > 0 && (
							<Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
								{pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}
							</Badge>
						)}
					</div>
					{showAnexos ? (
						<ChevronUp className="h-5 w-5 text-gray-400" />
					) : (
						<ChevronDown className="h-5 w-5 text-gray-400" />
					)}
				</button>
			</div>

			{showAnexos && (
				<div className="lg:col-span-3 space-y-6">
					{/* Pending first, then others */}
					{[...pendientes, ...otrosAnexos].map((anexo) => {
						const tipoBadge = TIPO_BADGE[anexo.tipo_anexo];
						const estadoBadge = ESTADO_BADGE[anexo.estado as keyof typeof ESTADO_BADGE] || {
							label: anexo.estado,
							className: "bg-gray-100 text-gray-800 border-gray-200",
						};
						const isExpanded = expandedAnexo === anexo.id;
						const detalle = detalleCache[anexo.id];
						const isLoadingDetalle = detalleLoading === anexo.id;

						return (
							<div
								key={anexo.id}
								id={`anexo-${anexo.id}`}
								className={`bg-white rounded-lg shadow-sm border ${
									anexo.estado === "pendiente" ? "border-yellow-300" : ""
								}`}
							>
								{/* Anexo Header */}
								<div className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<div className="flex items-center gap-3 mb-1">
												<FileText className="h-6 w-6 text-primary" />
												<h2 className="text-2xl font-bold text-gray-900">
													{anexo.numero_anexo}
												</h2>
												<Badge variant="outline" className={tipoBadge.className}>
													{tipoBadge.label}
												</Badge>
												<Badge variant="outline" className={estadoBadge.className}>
													{estadoBadge.label}
												</Badge>
											</div>
											<p className="text-sm text-gray-600 ml-9">
												Fecha efectiva: {formatDate(anexo.fecha_efectiva)}
												{anexo.created_by_nombre && (
													<span className="ml-3">Creado por: {anexo.created_by_nombre}</span>
												)}
											</p>
										</div>
										<div className="flex items-center gap-2">
											{/* Validation buttons for pending anexos */}
											{puedeValidar && anexo.estado === "pendiente" && (
												<>
													<Button
														variant="default"
														size="sm"
														onClick={() => openDialog(anexo, "validar")}
														disabled={actionLoading}
													>
														<CheckCircle className="h-4 w-4 mr-1" />
														Validar
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => openDialog(anexo, "rechazar")}
														disabled={actionLoading}
													>
														<XCircle className="h-4 w-4 mr-1" />
														Rechazar
													</Button>
												</>
											)}
											<Button
												variant="outline"
												size="sm"
												onClick={() => toggleDetalle(anexo.id)}
											>
												{isExpanded ? (
													<>
														<ChevronUp className="h-4 w-4 mr-1" />
														Ocultar
													</>
												) : (
													<>
														<ChevronDown className="h-4 w-4 mr-1" />
														Ver detalle
													</>
												)}
											</Button>
										</div>
									</div>

									{/* Summary bar */}
									<div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
										{(anexo.monto_ajuste_total ?? 0) !== 0 && (
											<span>
												Ajuste:{" "}
												<span
													className={`font-semibold ${
														(anexo.monto_ajuste_total ?? 0) >= 0 ? "text-green-600" : "text-red-600"
													}`}
												>
													{(anexo.monto_ajuste_total ?? 0) >= 0 ? "+" : ""}
													{formatCurrency(anexo.monto_ajuste_total ?? 0, moneda)}
												</span>
											</span>
										)}
										{anexo.cantidad_documentos > 0 && (
											<span>{anexo.cantidad_documentos} documento{anexo.cantidad_documentos > 1 ? "s" : ""}</span>
										)}
										{anexo.observaciones && (
											<span className="italic text-gray-500 truncate max-w-md">
												{anexo.observaciones}
											</span>
										)}
									</div>
								</div>

								{/* Expanded detail */}
								{isExpanded && (
									<div className="border-t px-6 py-6 space-y-6">
										{isLoadingDetalle ? (
											<div className="flex items-center justify-center py-8">
												<Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
												<span className="text-gray-600">Cargando detalle...</span>
											</div>
										) : detalle ? (
											<>
												{/* Items del ramo */}
												{detalle.items.length > 0 && (
													<div>
														<h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
															<Package className="h-5 w-5" />
															Datos Modificados ({detalle.items.length})
														</h3>
														<div className="space-y-3">
															{detalle.items.map((item) => (
																<div
																	key={item.id}
																	className={`border rounded-lg p-4 ${
																		item.accion === "inclusion"
																			? "border-green-200 bg-green-50/50"
																			: "border-orange-200 bg-orange-50/50"
																	}`}
																>
																	<div className="flex items-center gap-2 mb-2">
																		<Badge
																			variant="outline"
																			className={
																				item.accion === "inclusion"
																					? "bg-green-100 text-green-700 border-green-200"
																					: "bg-orange-100 text-orange-700 border-orange-200"
																			}
																		>
																			{item.accion === "inclusion" ? "Inclusión" : "Exclusión"}
																		</Badge>
																		<span className="font-medium text-gray-900">
																			{item.label}
																		</span>
																	</div>
																	<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
																		{Object.entries(item.detalles).map(([key, value]) => {
																			if (value === null || value === undefined || value === "") return null;
																			return (
																				<div key={key}>
																					<label className="text-xs font-medium text-gray-500">
																						{key}
																					</label>
																					<p className="text-sm text-gray-900">
																						{typeof value === "boolean"
																							? value ? "Sí" : "No"
																							: typeof value === "number"
																								? value.toLocaleString("es-BO")
																								: String(value)}
																					</p>
																				</div>
																			);
																		})}
																	</div>
																</div>
															))}
														</div>
													</div>
												)}

												{/* Pagos */}
												{detalle.pagos.length > 0 && (
													<div>
														<h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
															<CreditCard className="h-5 w-5" />
															Cuotas Modificadas ({detalle.pagos.length})
														</h3>
														<div className="overflow-x-auto">
															<table className="w-full text-sm">
																<thead className="bg-gray-50 border-b">
																	<tr>
																		<th className="px-4 py-2 text-left font-medium text-gray-600">Tipo</th>
																		<th className="px-4 py-2 text-left font-medium text-gray-600">Cuota</th>
																		<th className="px-4 py-2 text-right font-medium text-gray-600">Monto</th>
																		<th className="px-4 py-2 text-left font-medium text-gray-600">Vencimiento</th>
																		<th className="px-4 py-2 text-left font-medium text-gray-600">Observaciones</th>
																	</tr>
																</thead>
																<tbody className="divide-y">
																	{detalle.pagos.map((pago) => (
																		<tr key={pago.id} className="hover:bg-gray-50">
																			<td className="px-4 py-2">
																				<Badge
																					variant="outline"
																					className={
																						pago.tipo === "vigencia_corrida"
																							? "bg-purple-100 text-purple-700 border-purple-200"
																							: "bg-blue-100 text-blue-700 border-blue-200"
																					}
																				>
																					{pago.tipo === "vigencia_corrida" ? "Vigencia Corrida" : "Ajuste"}
																				</Badge>
																			</td>
																			<td className="px-4 py-2">
																				{pago.numero_cuota != null ? `Cuota ${pago.numero_cuota}` : "-"}
																			</td>
																			<td className="px-4 py-2 text-right font-semibold">
																				<span className={pago.monto >= 0 ? "text-green-600" : "text-red-600"}>
																					{pago.monto >= 0 ? "+" : ""}
																					{formatCurrency(pago.monto, moneda)}
																				</span>
																			</td>
																			<td className="px-4 py-2">
																				{pago.fecha_vencimiento ? formatDate(pago.fecha_vencimiento) : "-"}
																			</td>
																			<td className="px-4 py-2 text-gray-600">
																				{pago.observaciones || "-"}
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													</div>
												)}

												{/* Documentos */}
												{detalle.documentos.length > 0 && (
													<div>
														<h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
															<FileDown className="h-5 w-5" />
															Documentos ({detalle.documentos.length})
														</h3>
														<div className="space-y-2">
															{detalle.documentos.map((doc) => (
																<div
																	key={doc.id}
																	className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
																>
																	<div className="flex items-center gap-3">
																		<FileText className="h-5 w-5 text-gray-400" />
																		<div>
																			<p className="text-sm font-medium text-gray-900">
																				{doc.nombre_archivo}
																			</p>
																			<p className="text-xs text-gray-600">
																				{doc.tipo_documento} - {formatDate(doc.uploaded_at)}
																			</p>
																		</div>
																	</div>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={async () => {
																			const { createClient } = await import("@/utils/supabase/client");
																			const supabase = createClient();
																			const { extractStoragePath } = await import("@/utils/storage");
																			const path = extractStoragePath(doc.archivo_url, "polizas-documentos");
																			const { data } = await supabase.storage.from("polizas-documentos").createSignedUrl(path, 3600);
																			if (data?.signedUrl) window.open(data.signedUrl, "_blank");
																		}}
																	>
																		<FileDown className="h-4 w-4" />
																	</Button>
																</div>
															))}
														</div>
													</div>
												)}

												{/* Rejection info */}
												{detalle.estado === "rechazado" && detalle.motivo_rechazo && (
													<div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
														<p className="font-medium text-orange-800 mb-1">Anexo Rechazado</p>
														<p className="text-sm text-orange-900">
															{detalle.fecha_rechazo && formatDate(detalle.fecha_rechazo)}
															{detalle.rechazador_nombre && (
																<span> por {detalle.rechazador_nombre}</span>
															)}
														</p>
														<div className="mt-2 p-2 bg-white rounded border border-orange-200">
															<p className="text-sm text-gray-700">
																<strong>Motivo:</strong> {detalle.motivo_rechazo}
															</p>
														</div>
													</div>
												)}

												{/* Validation info */}
												{detalle.estado === "activo" && detalle.fecha_validacion && (
													<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
														<p className="text-sm text-green-800">
															Validado el {formatDate(detalle.fecha_validacion)}
															{detalle.validador_nombre && (
																<span> por {detalle.validador_nombre}</span>
															)}
														</p>
													</div>
												)}

												{/* Empty state */}
												{detalle.items.length === 0 && detalle.pagos.length === 0 && detalle.documentos.length === 0 && (
													<p className="text-center text-gray-500 py-4">
														{detalle.tipo_anexo === "anulacion"
															? "Anexo de anulación — no tiene datos específicos"
															: "No se encontraron datos de detalle"}
													</p>
												)}
											</>
										) : (
											<p className="text-center text-gray-500 py-4">
												Error al cargar el detalle
											</p>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Validation Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{dialogType === "validar" ? "Validar Anexo" : "Rechazar Anexo"}
						</DialogTitle>
						<DialogDescription>
							{dialogType === "validar" ? (
								<>
									¿Confirma la validación del anexo{" "}
									<strong>{dialogAnexo?.numero_anexo}</strong>?
									{dialogAnexo?.tipo_anexo === "anulacion" && (
										<span className="block mt-2 text-red-600 font-medium">
											<AlertTriangle className="h-4 w-4 inline mr-1" />
											Esto anulará la póliza permanentemente
										</span>
									)}
								</>
							) : (
								<>
									Ingrese el motivo del rechazo del anexo{" "}
									<strong>{dialogAnexo?.numero_anexo}</strong>
								</>
							)}
						</DialogDescription>
					</DialogHeader>

					{dialogType === "rechazar" && (
						<Textarea
							value={motivoRechazo}
							onChange={(e) => setMotivoRechazo(e.target.value)}
							placeholder="Motivo del rechazo (mínimo 10 caracteres)..."
							rows={4}
						/>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancelar
						</Button>
						{dialogType === "validar" ? (
							<Button
								onClick={handleValidar}
								className="bg-green-600 hover:bg-green-700"
								disabled={actionLoading}
							>
								<CheckCircle className="h-4 w-4 mr-1" />
								Validar
							</Button>
						) : (
							<Button
								onClick={handleRechazar}
								variant="destructive"
								disabled={motivoRechazo.trim().length < 10 || actionLoading}
							>
								<XCircle className="h-4 w-4 mr-1" />
								Rechazar
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
