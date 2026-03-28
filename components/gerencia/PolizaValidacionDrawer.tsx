"use client";

import { useEffect, useState, useTransition } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
	CheckCircle,
	XCircle,
	Loader2,
	ExternalLink,
	User,
	Building2,
	MapPin,
	CalendarRange,
	Car,
	CreditCard,
	AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { obtenerDetallePolizaParaValidacion, validarPoliza } from "@/app/gerencia/validacion/actions";
import { RechazoPolizaModal } from "./RechazoPolizaModal";
import { rechazarPoliza } from "@/app/gerencia/validacion/actions";
import { formatDate, formatCurrency } from "@/utils/formatters";

type ObtenerDetalleResult = Awaited<ReturnType<typeof obtenerDetallePolizaParaValidacion>>;
type DetallePoliza = Extract<ObtenerDetalleResult, { success: true }>["detalle"];

interface Props {
	polizaId: string | null;
	numeroPoliza: string;
	onClose: () => void;
	onValidated: (id: string) => void;
	onRejected: (id: string) => void;
}

const ESTADO_CUOTA: Record<string, { label: string; className: string }> = {
	pendiente: {
		label: "Pendiente",
		className: "bg-amber-50 text-amber-800 border border-amber-200",
	},
	pagado: {
		label: "Pagado",
		className: "bg-teal-50 text-teal-800 border border-teal-200",
	},
	vencido: {
		label: "Vencida",
		className: "bg-rose-50 text-rose-800 border border-rose-200",
	},
	parcial: {
		label: "Parcial",
		className: "bg-sky-50 text-sky-800 border border-sky-200",
	},
};

function isFechaPasada(fechaStr: string): boolean {
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	const fecha = new Date(fechaStr + "T00:00:00");
	return fecha < hoy;
}

export function PolizaValidacionDrawer({ polizaId, numeroPoliza, onClose, onValidated, onRejected }: Props) {
	const router = useRouter();
	const [detalle, setDetalle] = useState<DetallePoliza | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [rechazoOpen, setRechazoOpen] = useState(false);

	const isOpen = polizaId !== null;

	useEffect(() => {
		if (!polizaId) {
			setDetalle(null);
			setLoadError(null);
			return;
		}
		setDetalle(null);
		setLoadError(null);
		startTransition(async () => {
			const result = await obtenerDetallePolizaParaValidacion(polizaId);
			if (result.success) {
				setDetalle(result.detalle);
			} else {
				setLoadError(result.error ?? "Error al cargar detalle");
			}
		});
	}, [polizaId]);

	const handleValidar = () => {
		if (!polizaId || !detalle) return;
		startTransition(async () => {
			const result = await validarPoliza(polizaId);
			if (result.success) {
				toast.success("Póliza validada", {
					description: `${detalle.numero_poliza} ha sido activada`,
				});
				onValidated(polizaId);
			} else {
				toast.error("Error al validar", { description: result.error });
			}
		});
	};

	const handleRechazar = async (motivo: string) => {
		if (!polizaId || !detalle) return;
		const result = await rechazarPoliza(polizaId, motivo);
		if (result.success) {
			toast.success("Póliza rechazada", {
				description: `Se notificó al responsable`,
			});
			setRechazoOpen(false);
			onRejected(polizaId);
		} else {
			toast.error("Error al rechazar", { description: result.error });
		}
	};

	// Contar cuotas con fechas en el pasado
	const cuotasConFechaErronea =
		detalle?.pagos?.filter((p) => p.estado === "pendiente" && isFechaPasada(p.fecha_vencimiento)) ?? [];

	return (
		<>
			<Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
				<SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
					{/* Header */}
					<SheetHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
						<div className="flex items-start justify-between gap-3">
							<div>
								<SheetTitle className="text-base font-semibold text-foreground font-mono">
									{detalle?.numero_poliza ?? numeroPoliza}
								</SheetTitle>
								<SheetDescription className="sr-only">
									Detalle de póliza pendiente de validación
								</SheetDescription>
								{detalle && (
									<p className="text-sm text-muted-foreground mt-0.5">
										{(detalle.compania as unknown as { nombre: string } | null)?.nombre ?? "—"} ·{" "}
										{detalle.ramo}
									</p>
								)}
							</div>
							{detalle && (
								<Button
									variant="ghost"
									size="sm"
									className="shrink-0 text-muted-foreground h-8 gap-1.5"
									onClick={() => router.push(`/polizas/${polizaId}`)}
								>
									<ExternalLink className="h-3.5 w-3.5" />
									Ver póliza
								</Button>
							)}
						</div>
					</SheetHeader>

					{/* Body */}
					<ScrollArea className="flex-1 min-h-0">
						<div className="px-6 py-5 space-y-6">
							{/* Loading */}
							{isPending && !detalle && (
								<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
									<Loader2 className="h-5 w-5 animate-spin" />
									<span className="text-sm">Cargando detalle…</span>
								</div>
							)}

							{/* Error */}
							{loadError && (
								<div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
									{loadError}
								</div>
							)}

							{detalle && (
								<>
									{/* Alerta cuotas con fecha errónea */}
									{cuotasConFechaErronea.length > 0 && (
										<div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
											<AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
											<div className="text-sm text-amber-800">
												<span className="font-semibold">
													{cuotasConFechaErronea.length} cuota
													{cuotasConFechaErronea.length > 1 ? "s" : ""} con fecha en el
													pasado.
												</span>{" "}
												Verifica las fechas de vencimiento antes de validar.
											</div>
										</div>
									)}

									{/* Sección: Datos generales */}
									<Section icon={<Building2 className="h-4 w-4" />} title="Datos generales">
										<DataGrid>
											<DataItem
												label="Cliente"
												value={detalle.clienteNombre}
												icon={<User className="h-3.5 w-3.5" />}
											/>
											<DataItem
												label="Regional"
												value={
													(detalle.regional as unknown as { nombre: string } | null)
														?.nombre ?? "—"
												}
												icon={<MapPin className="h-3.5 w-3.5" />}
											/>
											<DataItem
												label="Responsable"
												value={
													(detalle.responsable as unknown as { full_name: string } | null)
														?.full_name ?? "—"
												}
											/>
											<DataItem
												label="Ingresado por"
												value={
													// eslint-disable-next-line @typescript-eslint/no-explicit-any
													(detalle.created_by_user as any)?.full_name ?? "—"
												}
											/>
										</DataGrid>
									</Section>

									{/* Sección: Vigencia y prima */}
									<Section icon={<CalendarRange className="h-4 w-4" />} title="Vigencia y prima">
										<DataGrid>
											<DataItem
												label="Inicio vigencia"
												value={formatDate(detalle.inicio_vigencia)}
											/>
											<DataItem label="Fin vigencia" value={formatDate(detalle.fin_vigencia)} />
											<DataItem
												label="Prima total"
												value={formatCurrency(detalle.prima_total, detalle.moneda)}
												highlight
											/>
											<DataItem
												label="Prima neta"
												value={formatCurrency(detalle.prima_neta, detalle.moneda)}
											/>
										</DataGrid>
									</Section>

									{/* Sección: Vehículos (solo Automotor) */}
									{detalle.ramo === "Automotor" && detalle.vehiculos.length > 0 && (
										<Section
											icon={<Car className="h-4 w-4" />}
											title={`Vehículos (${detalle.vehiculos.length})`}
										>
											<div className="rounded-md border border-border overflow-hidden">
												<table className="w-full text-sm">
													<thead>
														<tr className="bg-secondary border-b border-border">
															<th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
																Placa
															</th>
															<th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
																Tipo / Marca
															</th>
															<th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
																Valor aseg.
															</th>
															<th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
																Franquicia
															</th>
														</tr>
													</thead>
													<tbody>
														{detalle.vehiculos.map((v, i) => (
															<tr
																key={v.id}
																className={
																	i < detalle.vehiculos.length - 1
																		? "border-b border-border"
																		: ""
																}
															>
																<td className="px-3 py-2 font-mono text-xs font-medium text-foreground">
																	{v.placa}
																</td>
																<td className="px-3 py-2 text-xs text-muted-foreground">
																	<div>{v.tipo_vehiculo?.nombre ?? "—"}</div>
																	{v.marca?.nombre && (
																		<div className="text-xs">
																			{v.marca.nombre}
																			{v.modelo ? ` ${v.modelo}` : ""}
																			{v.ano ? ` ${v.ano}` : ""}
																		</div>
																	)}
																</td>
																<td className="px-3 py-2 text-xs text-right tabular-nums">
																	{formatCurrency(v.valor_asegurado, detalle.moneda)}
																</td>
																<td className="px-3 py-2 text-xs text-right tabular-nums text-muted-foreground">
																	{formatCurrency(v.franquicia, detalle.moneda)}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</Section>
									)}

									{/* Sección: Cuotas */}
									{detalle.pagos && detalle.pagos.length > 0 && (
										<Section
											icon={<CreditCard className="h-4 w-4" />}
											title={
												detalle.modalidad_pago === "contado"
													? "Pago al contado"
													: `Cuotas (${detalle.pagos.length})`
											}
										>
											{detalle.modalidad_pago === "contado" ? (
												<DataGrid>
													<DataItem
														label="Monto"
														value={formatCurrency(
															detalle.pagos[0]?.monto ?? detalle.prima_total,
															detalle.moneda,
														)}
														highlight
													/>
													<DataItem
														label="Fecha vencimiento"
														value={
															detalle.pagos[0]
																? formatDate(detalle.pagos[0].fecha_vencimiento)
																: "—"
														}
														alert={
															detalle.pagos[0]
																? isFechaPasada(detalle.pagos[0].fecha_vencimiento)
																: false
														}
													/>
												</DataGrid>
											) : (
												<div className="rounded-md border border-border overflow-hidden">
													<table className="w-full text-sm">
														<thead>
															<tr className="bg-secondary border-b border-border">
																<th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground w-10">
																	#
																</th>
																<th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">
																	Monto
																</th>
																<th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
																	Vencimiento
																</th>
																<th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
																	Estado
																</th>
															</tr>
														</thead>
														<tbody>
															{detalle.pagos.map((cuota, i) => {
																const esPasada =
																	cuota.estado === "pendiente" &&
																	isFechaPasada(cuota.fecha_vencimiento);
																const badge =
																	ESTADO_CUOTA[cuota.estado] ??
																	ESTADO_CUOTA.pendiente;
																return (
																	<tr
																		key={cuota.id}
																		className={[
																			i < detalle.pagos.length - 1
																				? "border-b border-border"
																				: "",
																			esPasada ? "bg-amber-50/60" : "",
																		].join(" ")}
																	>
																		<td className="px-3 py-2 text-xs text-center text-muted-foreground tabular-nums">
																			{cuota.numero_cuota}
																		</td>
																		<td className="px-3 py-2 text-xs text-right tabular-nums font-medium">
																			{formatCurrency(
																				cuota.monto,
																				detalle.moneda,
																			)}
																		</td>
																		<td className="px-3 py-2 text-xs">
																			<span
																				className={
																					esPasada
																						? "text-amber-700 font-medium"
																						: "text-foreground"
																				}
																			>
																				{formatDate(cuota.fecha_vencimiento)}
																			</span>
																			{esPasada && (
																				<AlertTriangle className="h-3 w-3 text-amber-500 inline ml-1" />
																			)}
																		</td>
																		<td className="px-3 py-2 text-xs">
																			<span
																				className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}
																			>
																				{badge.label}
																			</span>
																		</td>
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>
											)}
										</Section>
									)}
								</>
							)}
						</div>
					</ScrollArea>

					{/* Footer con acciones */}
					<div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between gap-3 bg-card">
						<Button
							variant="outline"
							size="sm"
							onClick={onClose}
							disabled={isPending}
							className="min-w-[80px]"
						>
							Cerrar
						</Button>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive min-w-[100px]"
								onClick={() => setRechazoOpen(true)}
								disabled={isPending || !detalle}
							>
								<XCircle className="h-3.5 w-3.5 mr-1.5" />
								Rechazar
							</Button>
							<Button
								size="sm"
								className="min-w-[100px]"
								onClick={handleValidar}
								disabled={isPending || !detalle}
							>
								{isPending ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
								) : (
									<CheckCircle className="h-3.5 w-3.5 mr-1.5" />
								)}
								Validar
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* Modal de rechazo */}
			{detalle && (
				<RechazoPolizaModal
					isOpen={rechazoOpen}
					onClose={() => setRechazoOpen(false)}
					onConfirm={handleRechazar}
					poliza={{
						id: detalle.id,
						numero_poliza: detalle.numero_poliza,
						prima_total: detalle.prima_total,
						moneda: detalle.moneda,
					}}
					isLoading={isPending}
				/>
			)}
		</>
	);
}

/* ─── Helpers de layout interno ─────────────────────────────────────────── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2 text-sm font-medium text-foreground">
				<span className="text-primary">{icon}</span>
				{title}
			</div>
			{children}
		</div>
	);
}

function DataGrid({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}

function DataItem({
	label,
	value,
	icon,
	highlight,
	alert,
}: {
	label: string;
	value: string;
	icon?: React.ReactNode;
	highlight?: boolean;
	alert?: boolean;
}) {
	return (
		<div className="min-w-0">
			<p className="text-xs text-muted-foreground mb-0.5">{label}</p>
			<p
				className={[
					"text-sm truncate flex items-center gap-1",
					highlight ? "font-semibold text-foreground" : "text-foreground",
					alert ? "text-amber-700 font-medium" : "",
				].join(" ")}
			>
				{icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
				{value}
				{alert && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
			</p>
		</div>
	);
}
