"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Circle, User, Calendar, FileText, MessageSquare, Edit, XCircle, CheckCircle } from "lucide-react";
import type { HistorialSiniestro } from "@/types/siniestro";

interface HistorialCronologicoProps {
	historial: HistorialSiniestro[];
}

// Etiquetas legibles para campos conocidos
const FIELD_LABELS: Record<string, string> = {
	nombre: "Nombre",
	telefono: "Teléfono",
	correo: "Correo",
	estado: "Estado",
	etapa: "Etapa",
	responsable: "Responsable",
	motivo: "Motivo",
	observacion: "Observación",
	tipo: "Tipo",
	archivo: "Archivo",
	fecha: "Fecha",
	monto: "Monto",
	descripcion: "Descripción",
	lugar_hecho: "Lugar del hecho",
	fecha_siniestro: "Fecha del siniestro",
	fecha_reporte: "Fecha de reporte",
	nombre_estado: "Nuevo estado",
};

function DetallesHistorial({ detalles }: { detalles: Record<string, unknown> }) {
	const entries = Object.entries(detalles).filter(([, v]) => v !== null && v !== undefined && v !== "");
	if (entries.length === 0) return null;
	return (
		<div className="mt-2 p-2 bg-secondary/50 rounded text-xs space-y-1">
			{entries.map(([key, value]) => {
				const label = FIELD_LABELS[key] || key.replace(/_/g, " ");
				let display: string;
				if (typeof value === "object") {
					display = JSON.stringify(value);
				} else {
					display = String(value);
				}
				// Truncate long values
				if (display.length > 120) display = display.slice(0, 120) + "…";
				return (
					<div key={key} className="flex gap-1.5">
						<span className="text-muted-foreground capitalize min-w-[80px]">{label}:</span>
						<span className="font-medium break-all">{display}</span>
					</div>
				);
			})}
		</div>
	);
}

const ACCION_ICONS = {
	created: <Circle className="h-4 w-4 text-green-500" />,
	updated: <Edit className="h-4 w-4 text-blue-500" />,
	documento_agregado: <FileText className="h-4 w-4 text-purple-500" />,
	observacion_agregada: <MessageSquare className="h-4 w-4 text-amber-500" />,
	cambio_estado: <XCircle className="h-4 w-4 text-blue-500" />,
	estado_cambiado: <XCircle className="h-4 w-4 text-red-500" />,
	cerrado: <CheckCircle className="h-4 w-4 text-gray-500" />,
};

const ACCION_LABELS = {
	created: "Siniestro Creado",
	updated: "Siniestro Actualizado",
	documento_agregado: "Documento Agregado",
	observacion_agregada: "Observación Agregada",
	cambio_estado: "Etapa de Seguimiento Cambiado",
	estado_cambiado: "Estado Cambiado",
	cerrado: "Siniestro Cerrado",
};

export default function HistorialCronologico({ historial }: HistorialCronologicoProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg flex items-center gap-2">
					<History className="h-5 w-5 text-primary" />
					Historial de Cambios
				</CardTitle>
			</CardHeader>
			<CardContent>
				{historial.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-8">No hay cambios registrados</p>
				) : (
					<div className="relative space-y-4">
						{/* Timeline line */}
						<div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

						{historial.map((item, index) => (
							<div key={item.id || `historial-${index}`} className="relative pl-8">
								{/* Timeline dot */}
								<div className="absolute left-0 top-1.5 z-10 bg-background p-1">
									{ACCION_ICONS[item.accion as keyof typeof ACCION_ICONS] || (
										<Circle className="h-4 w-4 text-muted-foreground" />
									)}
								</div>

								{/* Content */}
								<div
									className={`p-3 rounded-lg border ${
										index === 0
											? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
											: "bg-secondary/30"
									}`}
								>
									<div className="flex items-start justify-between gap-2 mb-2">
										<div>
											<p className="font-medium text-sm">
												{ACCION_LABELS[item.accion as keyof typeof ACCION_LABELS] ||
													item.accion}
											</p>
											<div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
												<User className="h-3 w-3" />
												<span>{item.usuario_nombre || "Sistema"}</span>
											</div>
										</div>
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Calendar className="h-3 w-3" />
											<span>
												{new Date(item.created_at).toLocaleDateString("es-BO")} -{" "}
												{new Date(item.created_at).toLocaleTimeString("es-BO", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>
									</div>

									{/* Mostrar valor_nuevo como descripción para cambio_estado */}
									{item.accion === "cambio_estado" && item.valor_nuevo && (
										<div className="mt-2 text-sm">
											<p className="text-muted-foreground">
												Estado cambiado a:{" "}
												<span className="font-medium text-blue-600 dark:text-blue-400">
													{item.valor_nuevo}
												</span>
											</p>
										</div>
									)}

									{/* Detalles del cambio (para otros tipos de acciones) */}
									{item.accion !== "cambio_estado" && (
										<>
											{item.campo_modificado && (
												<div className="mt-2 text-xs">
													<span className="text-muted-foreground">Campo modificado: </span>
													<span className="font-medium">{item.campo_modificado}</span>
												</div>
											)}

											{item.valor_anterior && (
												<div className="mt-1 text-xs">
													<span className="text-muted-foreground">Valor anterior: </span>
													<span className="line-through opacity-70">
														{item.valor_anterior}
													</span>
												</div>
											)}

											{item.valor_nuevo && (
												<div className="mt-1 text-xs">
													<span className="text-muted-foreground">Valor nuevo: </span>
													<span className="font-medium text-green-600 dark:text-green-400">
														{item.valor_nuevo}
													</span>
												</div>
											)}
										</>
									)}

									{item.detalles && Object.keys(item.detalles).length > 0 && (
										<DetallesHistorial detalles={item.detalles} />
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
