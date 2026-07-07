"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	FileText,
	X,
	User,
	Building,
	Calendar,
	DollarSign,
	File,
	CheckCircle,
	Clock,
	XCircle,
	Phone,
	Mail,
	AlertTriangle,
	Loader2,
	Car,
	Wrench,
	Plane,
	Package,
	Home,
	Users,
	Check,
} from "lucide-react";
import DocumentosPolizaModal from "./DocumentosPolizaModal";
import { obtenerAseguradosPoliza } from "@/app/siniestros/actions";
import { claveAseguradoDetalle } from "@/types/siniestro";
import type { PolizaParaSiniestro, CuotaPago, AseguradoDetalle } from "@/types/siniestro";
import { formatDate, hoyLaPaz } from "@/utils/formatters";

interface PolizaCardProps {
	poliza: PolizaParaSiniestro;
	onDeselect?: () => void;
	showDeselectButton?: boolean;
	// Selección opcional de ítems siniestrados (registro de siniestros): si se
	// pasa el callback, el desglose de asegurados se vuelve seleccionable.
	itemsSeleccionados?: AseguradoDetalle[];
	onItemsSeleccionadosChange?: (items: AseguradoDetalle[]) => void;
}

// Estado mostrado de una cuota. Se DERIVA de las fechas (igual que cobranzas en
// utils/estadoCuota.ts), no de la columna `estado` (legacy/manual que solo guarda
// pendiente|pagado|parcial). Se separa "por_cobrar" (aún no vence, no es culpa del
// cliente) de "vencida"/"mora" para no mostrar cuotas futuras como si fueran un atraso.
type EstadoCuotaUI = "pagada" | "parcial" | "por_cobrar" | "vencida" | "mora";

const DIAS_PARA_MORA = 10; // venció hace más de estos días => MORA

function clasificarCuota(cuota: CuotaPago): EstadoCuotaUI {
	if (cuota.fecha_pago || cuota.estado === "pagado") return "pagada";
	if (cuota.estado === "parcial") return "parcial";
	const fechaVencimiento = new Date(`${cuota.fecha_vencimiento}T00:00:00`);
	const hoy = new Date(`${hoyLaPaz()}T00:00:00`);
	const diasVencidos = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
	if (diasVencidos <= 0) return "por_cobrar"; // aún no vence
	if (diasVencidos > DIAS_PARA_MORA) return "mora";
	return "vencida";
}

export default function PolizaCard({
	poliza,
	onDeselect,
	showDeselectButton = true,
	itemsSeleccionados,
	onItemsSeleccionadosChange,
}: PolizaCardProps) {
	const [showDocumentosModal, setShowDocumentosModal] = useState(false);
	const [showAllCuotas, setShowAllCuotas] = useState(false);

	// Desglose de asegurados (personas, vehículos, bienes). Se carga al seleccionar la póliza,
	// no en la búsqueda, para mantenerla liviana. Si ya viene precargado, se reutiliza.
	const [asegurados, setAsegurados] = useState<AseguradoDetalle[] | undefined>(poliza.asegurados);
	const [loadingAsegurados, setLoadingAsegurados] = useState(false);
	const [showAllAsegurados, setShowAllAsegurados] = useState(false);

	useEffect(() => {
		if (poliza.asegurados !== undefined) {
			setAsegurados(poliza.asegurados);
			return;
		}
		let activo = true;
		setLoadingAsegurados(true);
		obtenerAseguradosPoliza(poliza.id, poliza.ramo)
			.then((res) => {
				if (!activo) return;
				setAsegurados(res.success ? res.data.asegurados : []);
			})
			.finally(() => {
				if (activo) setLoadingAsegurados(false);
			});
		return () => {
			activo = false;
		};
	}, [poliza.id, poliza.ramo, poliza.asegurados]);

	// Conteos para la alerta de pagos atrasados (vencida = venció hace <=10 días; mora = >10 días)
	const cuotasVencidas = poliza.cuotas?.filter((c) => clasificarCuota(c) === "vencida").length || 0;
	const cuotasEnMora = poliza.cuotas?.filter((c) => clasificarCuota(c) === "mora").length || 0;

	// Selección de ítems siniestrados (solo si el padre pasó el callback)
	const seleccionable = !!onItemsSeleccionadosChange;
	const clavesSeleccionadas = new Set((itemsSeleccionados || []).map(claveAseguradoDetalle));

	const toggleItem = (aseg: AseguradoDetalle) => {
		if (!onItemsSeleccionadosChange) return;
		const clave = claveAseguradoDetalle(aseg);
		const actuales = itemsSeleccionados || [];
		onItemsSeleccionadosChange(
			clavesSeleccionadas.has(clave)
				? actuales.filter((i) => claveAseguradoDetalle(i) !== clave)
				: [...actuales, aseg],
		);
	};

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
						<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
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
										className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
									>
										<Phone className="h-3 w-3" />
										{poliza.cliente.celular}
									</a>
								)}
								{poliza.cliente.correo_electronico && (
									<a
										href={`mailto:${poliza.cliente.correo_electronico}`}
										className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
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
									{formatDate(poliza.inicio_vigencia)} - {formatDate(poliza.fin_vigencia)}
								</p>
							</div>
						</div>

						{/* Prima */}
						<div className="flex gap-2 md:col-span-2">
							<DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Prima Total</p>
								<p className="font-medium">
									{poliza.moneda}{" "}
									{poliza.prima_total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
								</p>
							</div>
						</div>
					</div>

					{/* Desglose de asegurados (personas, vehículos, bienes) */}
					<div className="pt-2 border-t">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm font-medium flex items-center gap-1.5">
								<Users className="h-4 w-4 text-muted-foreground" />
								Desglose de asegurados
								{asegurados && asegurados.length > 0 && (
									<span className="text-xs text-muted-foreground">({asegurados.length})</span>
								)}
								{seleccionable && clavesSeleccionadas.size > 0 && (
									<span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
										{clavesSeleccionadas.size} seleccionado{clavesSeleccionadas.size !== 1 ? "s" : ""}
									</span>
								)}
							</p>
							{asegurados && asegurados.length > 6 && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowAllAsegurados(!showAllAsegurados)}
									className="h-7 text-xs px-3"
								>
									{showAllAsegurados ? "Ver menos" : `Ver todos (${asegurados.length})`}
								</Button>
							)}
						</div>

						{seleccionable && asegurados && asegurados.length > 0 && (
							<p className="text-xs text-muted-foreground mb-2">
								Opcional: marca el o los ítems afectados por el siniestro. Podrás modificarlos después
								desde la edición del siniestro.
							</p>
						)}

						{loadingAsegurados ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Cargando desglose...
							</div>
						) : !asegurados || asegurados.length === 0 ? (
							<p className="text-sm text-muted-foreground italic py-1">
								Esta póliza no tiene un desglose de asegurados registrado.
							</p>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
								{(showAllAsegurados ? asegurados : asegurados.slice(0, 6)).map((aseg, idx) => (
									<AseguradoItem
										key={idx}
										aseg={aseg}
										moneda={poliza.moneda}
										seleccionable={seleccionable}
										seleccionado={clavesSeleccionadas.has(claveAseguradoDetalle(aseg))}
										onToggle={() => toggleItem(aseg)}
									/>
								))}
							</div>
						)}
					</div>

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
								<div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
									<AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
									<div className="text-red-900">
										<p className="font-medium">Cliente con pagos atrasados</p>
										<div className="text-xs mt-1 space-y-0.5">
											{cuotasEnMora > 0 && (
												<p className="font-semibold">
													⚠️ {cuotasEnMora} cuota{cuotasEnMora > 1 ? "s" : ""} en MORA (más de
													10 días vencida{cuotasEnMora > 1 ? "s" : ""})
												</p>
											)}
											{cuotasVencidas > 0 && (
												<p>
													{cuotasVencidas} cuota{cuotasVencidas > 1 ? "s" : ""} vencida
													{cuotasVencidas > 1 ? "s" : ""}
												</p>
											)}
											<p className="mt-1 italic">
												Considerar esta información antes de registrar el siniestro.
											</p>
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
									<div
										className={`space-y-1 ${showAllCuotas ? "max-h-96 overflow-y-auto pr-1" : ""}`}
									>
										{(showAllCuotas ? poliza.cuotas : poliza.cuotas.slice(0, 5)).map((cuota) => {
											const tieneProrrogas =
												cuota.prorrogas_historial && cuota.prorrogas_historial.length > 0;
											const estadoCuota = clasificarCuota(cuota);
											const esPagada = estadoCuota === "pagada";
											const esVencida = estadoCuota === "vencida";
											const enMora = estadoCuota === "mora";
											// Énfasis de texto solo para atrasos reales: rojo (mora), ámbar (vencida)
											const emphTextClass = enMora
												? "text-red-700"
												: esVencida
													? "text-amber-700"
													: "";

											return (
												<div
													key={cuota.id}
													className={`grid grid-cols-12 gap-2 text-xs p-2 rounded border ${
														enMora
															? "bg-red-100 border-red-300"
															: esVencida
																? "bg-amber-50 border-amber-200"
																: estadoCuota === "parcial"
																	? "bg-orange-50 border-orange-200"
																	: esPagada
																		? "bg-green-50 border-green-200"
																		: "bg-secondary/20 border-secondary"
													}`}
												>
													{/* Número de cuota */}
													<div className="col-span-2 flex items-center">
														<span className={`font-medium ${emphTextClass}`}>
															#{cuota.numero_cuota}
														</span>
													</div>

													{/* Estado */}
													<div className="col-span-3 flex items-center gap-1">
														{esPagada ? (
															<>
																<CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
																<span className="text-green-700">Pagada</span>
															</>
														) : enMora ? (
															<>
																<XCircle className="h-3 w-3 text-red-700 flex-shrink-0" />
																<span className="text-red-800 font-bold">MORA</span>
															</>
														) : esVencida ? (
															<>
																<AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
																<span className="text-amber-700 font-medium">
																	Vencida
																</span>
															</>
														) : estadoCuota === "parcial" ? (
															<>
																<Clock className="h-3 w-3 text-orange-600 flex-shrink-0" />
																<span className="text-orange-700">Parcial</span>
															</>
														) : (
															<>
																<Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
																<span className="text-muted-foreground">
																	Por cobrar
																</span>
															</>
														)}
													</div>

													{/* Monto */}
													<div className="col-span-3 flex items-center justify-end">
														<span className={`font-medium ${emphTextClass}`}>
															{poliza.moneda}{" "}
															{cuota.monto.toLocaleString("es-BO", {
																minimumFractionDigits: 2,
															})}
														</span>
													</div>

													{/* Fecha vencimiento */}
													<div className="col-span-4 flex flex-col items-end justify-center">
														<div className="flex items-center gap-1">
															<span
																className={
																	emphTextClass ? `font-medium ${emphTextClass}` : ""
																}
															>
																{formatDate(cuota.fecha_vencimiento)}
															</span>
															{tieneProrrogas && (
																<span
																	className="flex items-center gap-0.5 text-amber-600"
																	title={`${cuota.prorrogas_historial?.length} prórroga(s) aplicada(s)`}
																>
																	<AlertTriangle className="h-3 w-3" />
																</span>
															)}
														</div>
														{tieneProrrogas && cuota.fecha_vencimiento_original && (
															<span className="text-[10px] text-amber-600">
																Original: {formatDate(cuota.fecha_vencimiento_original)}
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

// Tarjeta individual del desglose: muestra un asegurado según su tipo (persona,
// vehículo, bien, etc.). En modo seleccionable se comporta como toggle (marca el
// ítem como afectado por el siniestro).
function AseguradoItem({
	aseg,
	moneda,
	seleccionable = false,
	seleccionado = false,
	onToggle,
}: {
	aseg: AseguradoDetalle;
	moneda: string;
	seleccionable?: boolean;
	seleccionado?: boolean;
	onToggle?: () => void;
}) {
	const valor =
		aseg.valor_asegurado != null
			? `${moneda} ${aseg.valor_asegurado.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`
			: null;

	let contenido: ReactNode;

	if (aseg.tipo === "persona") {
		contenido = (
			<>
				<User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
				<div className="min-w-0">
					<p className="font-medium truncate">{aseg.nombre}</p>
					{aseg.documento && <p className="text-xs text-muted-foreground">CI/Doc: {aseg.documento}</p>}
					{aseg.relacion && <p className="text-xs text-muted-foreground">{aseg.relacion}</p>}
				</div>
			</>
		);
	} else if (aseg.tipo === "bien") {
		contenido = (
			<>
				<Home className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
				<div className="min-w-0">
					<p className="font-medium truncate">{aseg.direccion || "Bien asegurado"}</p>
					{valor && <p className="text-xs text-muted-foreground">Valor: {valor}</p>}
				</div>
			</>
		);
	} else if (aseg.tipo === "carga") {
		contenido = (
			<>
				<Package className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
				<div className="min-w-0">
					<p className="font-medium truncate">{aseg.descripcion || "Carga asegurada"}</p>
					{aseg.identificador && <p className="text-xs text-muted-foreground">Factura: {aseg.identificador}</p>}
					{valor && <p className="text-xs text-muted-foreground">Valor: {valor}</p>}
				</div>
			</>
		);
	} else {
		// vehiculo | equipo | nave (ítems con marca/modelo/identificador)
		const Icon = aseg.tipo === "equipo" ? Wrench : aseg.tipo === "nave" ? Plane : Car;
		const titulo = aseg.placa
			? `Placa: ${aseg.placa}`
			: aseg.identificador
				? `${aseg.tipo === "equipo" ? "Serie" : "Matrícula"}: ${aseg.identificador}`
				: aseg.marca || "Ítem asegurado";

		contenido = (
			<>
				<Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
				<div className="min-w-0">
					<p className="font-medium truncate">
						{titulo}
						{aseg.marca && aseg.placa && ` - ${aseg.marca}`}
					</p>
					{(aseg.modelo || aseg.ano) && (
						<p className="text-xs text-muted-foreground">
							{[aseg.modelo, aseg.ano].filter(Boolean).join(" · ")}
						</p>
					)}
					{aseg.placa && aseg.identificador && (
						<p className="text-xs text-muted-foreground">Chasis: {aseg.identificador}</p>
					)}
					{valor && <p className="text-xs text-muted-foreground">Valor: {valor}</p>}
				</div>
			</>
		);
	}

	if (!seleccionable) {
		return (
			<div className="bg-secondary/30 rounded-lg p-2 text-sm">
				<div className="flex items-start gap-2">{contenido}</div>
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={seleccionado}
			className={`w-full text-left rounded-lg p-2 text-sm border transition-colors ${
				seleccionado ? "border-primary bg-primary/10" : "border-transparent bg-secondary/30 hover:border-primary/40"
			}`}
		>
			<div className="flex items-start gap-2">
				<span
					aria-hidden
					className={`h-4 w-4 shrink-0 mt-0.5 rounded border flex items-center justify-center transition-colors ${
						seleccionado ? "bg-primary border-primary text-primary-foreground" : "border-input bg-card"
					}`}
				>
					{seleccionado && <Check className="h-3 w-3" />}
				</span>
				{contenido}
			</div>
		</button>
	);
}
