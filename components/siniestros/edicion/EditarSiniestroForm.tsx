"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, MessageSquare, History, User, UserCog } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import ResumenReadonly from "./ResumenReadonly";
import AgregarObservacion from "./AgregarObservacion";
import HistorialCronologico from "./HistorialCronologico";
import CerrarSiniestro from "./CerrarSiniestro";
import UltimoCambioSiniestro from "./UltimoCambioSiniestro";
import SeccionEstados from "./SeccionEstados";
import CambiarResponsable from "./CambiarResponsable";
import DocumentosPorTipo from "./DocumentosPorTipo";
import type {
	SiniestroVistaConEstado,
	CoberturaCatalogo,
	DocumentoSiniestro,
	ObservacionSiniestro,
	HistorialSiniestro,
} from "@/types/siniestro";

interface EditarSiniestroFormProps {
	siniestro: SiniestroVistaConEstado;
	coberturas: CoberturaCatalogo[];
	documentos: DocumentoSiniestro[];
	observaciones: ObservacionSiniestro[];
	historial: HistorialSiniestro[];
	esAdmin: boolean;
}

export default function EditarSiniestroForm({
	siniestro,
	coberturas,
	documentos,
	observaciones,
	historial,
	esAdmin,
}: EditarSiniestroFormProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState("resumen");

	const handleRefresh = () => {
		router.refresh();
	};

	const estaAbierto = siniestro.estado === "abierto";

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 space-y-5">
			{/* Botón volver */}
			<Button variant="ghost" size="sm" asChild className="-ml-2">
				<Link href="/siniestros">
					<ArrowLeft className="h-4 w-4 mr-2" />
					Volver a Siniestros
				</Link>
			</Button>

			{/* Header del siniestro */}
			<Card className="shadow-sm">
				<CardContent className="p-5">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-3 flex-wrap">
								<h1 className="text-xl font-semibold text-foreground">
									{siniestro.codigo_siniestro
										? `Siniestro ${siniestro.codigo_siniestro}`
										: "Siniestro"}
								</h1>
								<StatusBadge status={siniestro.estado} />
								{siniestro.estado_actual_nombre && (
									<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-sky-50 text-sky-800 border-sky-200">
										{siniestro.estado_actual_nombre}
									</span>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
								<Link
									href={`/polizas/${siniestro.poliza_id}`}
									className="hover:text-primary hover:underline transition-colors"
								>
									Póliza {siniestro.numero_poliza}
								</Link>
								<span className="text-border">·</span>
								<span>{siniestro.cliente_nombre}</span>
								<span className="text-border">·</span>
								<span>{siniestro.ramo}</span>
								<span className="text-border">·</span>
								<span>
									{new Date(siniestro.fecha_siniestro).toLocaleDateString("es-BO")}
								</span>
							</div>
						</div>
					</div>

					{/* Resumen de métricas */}
					<div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div>
							<p className="text-xs text-muted-foreground">Monto reserva</p>
							<p className="text-sm font-medium text-foreground mt-0.5">
								{siniestro.moneda}{" "}
								{siniestro.monto_reserva.toLocaleString("es-BO", {
									minimumFractionDigits: 2,
								})}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Compañía</p>
							<p className="text-sm font-medium text-foreground mt-0.5">
								{siniestro.compania_nombre}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Departamento</p>
							<p className="text-sm font-medium text-foreground mt-0.5">
								{siniestro.departamento_nombre}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Responsable</p>
							<p className="text-sm font-medium text-foreground mt-0.5">
								{siniestro.responsable_nombre || (
									<span className="text-muted-foreground italic">Sin asignar</span>
								)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Layout principal: tabs (izquierda) + sidebar (derecha) */}
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5 items-start">
				{/* Columna principal — tabs */}
				<div>
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList className="grid w-full grid-cols-4">
							<TabsTrigger value="resumen" className="flex items-center gap-1.5">
								<FileText className="h-3.5 w-3.5" />
								<span>Resumen</span>
							</TabsTrigger>
							<TabsTrigger value="documentos" className="flex items-center gap-1.5">
								<span>Documentos</span>
								{documentos.length > 0 && (
									<span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
										{documentos.length}
									</span>
								)}
							</TabsTrigger>
							<TabsTrigger value="observaciones" className="flex items-center gap-1.5">
								<MessageSquare className="h-3.5 w-3.5" />
								<span>Notas</span>
								{observaciones.length > 0 && (
									<span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
										{observaciones.length}
									</span>
								)}
							</TabsTrigger>
							<TabsTrigger value="historial" className="flex items-center gap-1.5">
								<History className="h-3.5 w-3.5" />
								<span>Historial</span>
							</TabsTrigger>
						</TabsList>

						{/* Resumen */}
						<TabsContent value="resumen" className="mt-5 space-y-5">
							<UltimoCambioSiniestro
								historial={historial}
								onVerHistorialCompleto={() => setActiveTab("historial")}
							/>
							<ResumenReadonly siniestro={siniestro} coberturas={coberturas} />
						</TabsContent>

						{/* Documentos */}
						<TabsContent value="documentos" className="mt-5">
							<DocumentosPorTipo
								siniestroId={siniestro.id}
								documentos={documentos}
								onDocumentosChange={handleRefresh}
								estadoSiniestro={siniestro.estado}
								esAdmin={esAdmin}
							/>
						</TabsContent>

						{/* Observaciones / Notas internas */}
						<TabsContent value="observaciones" className="mt-5">
							<AgregarObservacion
								siniestroId={siniestro.id}
								observacionesIniciales={observaciones}
								estadoSiniestro={siniestro.estado}
							/>
						</TabsContent>

						{/* Historial */}
						<TabsContent value="historial" className="mt-5">
							<HistorialCronologico historial={historial} />
						</TabsContent>
					</Tabs>
				</div>

				{/* Sidebar derecha */}
				<div className="space-y-4">
					{/* Etapa de seguimiento — siempre visible */}
					<SeccionEstados
						siniestroId={siniestro.id}
						estadoActual={siniestro}
						estadoSiniestro={siniestro.estado}
					/>

					{/* Zona de cierre — solo si está abierto */}
					{estaAbierto && (
						<Card className="shadow-sm" style={{ borderColor: "hsl(var(--destructive) / 0.25)" }}>
							<CardContent className="p-4 space-y-3">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
									Cerrar siniestro
								</p>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Registra el resultado final: rechazo, declinación o indemnización. Acción irreversible.
								</p>
								<CerrarSiniestro
									siniestroId={siniestro.id}
									numeroPoliza={siniestro.numero_poliza}
								/>
							</CardContent>
						</Card>
					)}

					{/* Info de cierre — si ya está cerrado */}
					{!estaAbierto && (
						<Card className="shadow-sm">
							<CardContent className="p-5 space-y-2">
								<p className="text-sm font-medium text-foreground">
									Siniestro cerrado
								</p>
								{siniestro.motivo_cierre_tipo && (
									<p className="text-xs text-muted-foreground capitalize">
										Tipo: {siniestro.motivo_cierre_tipo}
									</p>
								)}
								{siniestro.fecha_cierre && (
									<p className="text-xs text-muted-foreground">
										Fecha:{" "}
										{new Date(siniestro.fecha_cierre).toLocaleDateString("es-BO")}
									</p>
								)}
								{siniestro.cerrado_por_nombre && (
									<p className="text-xs text-muted-foreground">
										Por: {siniestro.cerrado_por_nombre}
									</p>
								)}
							</CardContent>
						</Card>
					)}

					{/* Responsable */}
					<Card className="shadow-sm">
						<CardContent className="p-4">
							<div className="flex items-center gap-2 mb-3">
								<UserCog className="h-4 w-4 text-muted-foreground" />
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
									Responsable
								</p>
							</div>
							<div className="flex items-center gap-2 mb-3">
								<User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<p className="text-sm font-medium text-foreground truncate">
									{siniestro.responsable_nombre || (
										<span className="text-muted-foreground italic font-normal">Sin asignar</span>
									)}
								</p>
							</div>
							{estaAbierto && (
								<CambiarResponsable
									siniestroId={siniestro.id}
									responsableActualId={siniestro.responsable_id}
									responsableActualNombre={siniestro.responsable_nombre}
									estadoSiniestro={siniestro.estado}
								/>
							)}
						</CardContent>
					</Card>

					{/* Contadores rápidos */}
					<Card className="shadow-sm">
						<CardContent className="p-5">
							<div className="grid grid-cols-2 gap-3">
								<div className="text-center">
									<p className="text-2xl font-semibold text-foreground tabular-nums">
										{documentos.length}
									</p>
									<p className="text-xs text-muted-foreground mt-0.5">Documentos</p>
								</div>
								<div className="text-center">
									<p className="text-2xl font-semibold text-foreground tabular-nums">
										{observaciones.length}
									</p>
									<p className="text-xs text-muted-foreground mt-0.5">Notas</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
