"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, Circle, Edit, FileText, MessageSquare, XCircle, CheckCircle } from "lucide-react";
import type { HistorialSiniestro } from "@/types/siniestro";

interface UltimoCambioSiniestroProps {
	historial: HistorialSiniestro[];
	onVerHistorialCompleto?: () => void;
}

const ACCION_LABELS: Record<string, string> = {
	created: "Siniestro Creado",
	updated: "Siniestro Actualizado",
	documento_agregado: "Documento Agregado",
	observacion_agregada: "Observación Agregada",
	cambio_estado: "Estado de Seguimiento Cambiado",
	estado_cambiado: "Estado Cambiado",
	cerrado: "Siniestro Cerrado",
};

export default function UltimoCambioSiniestro({ historial, onVerHistorialCompleto }: UltimoCambioSiniestroProps) {
	const [ultimoCambio, setUltimoCambio] = useState<HistorialSiniestro | null>(null);

	useEffect(() => {
		if (historial && historial.length > 0) {
			// El historial ya viene ordenado por fecha descendente
			setUltimoCambio(historial[0]);
		}
	}, [historial]);

	if (!ultimoCambio) {
		return null;
	}

	return (
		<Card className="border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10">
			<CardHeader className="pb-3">
				<CardTitle className="text-base flex items-center gap-2">
					<Clock className="h-4 w-4 text-blue-600" />
					Último Cambio
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<p className="font-medium text-sm">
						{ACCION_LABELS[ultimoCambio.accion] || ultimoCambio.accion}
					</p>

					{/* Mostrar valor_nuevo para cambio_estado */}
					{ultimoCambio.accion === "cambio_estado" && ultimoCambio.valor_nuevo && (
						<p className="text-sm mt-1">
							Estado cambiado a:{" "}
							<span className="font-medium text-blue-600 dark:text-blue-400">
								{ultimoCambio.valor_nuevo}
							</span>
						</p>
					)}

					<p className="text-xs text-muted-foreground mt-1">
						Por: {ultimoCambio.usuario_nombre || "Sistema"} •{" "}
						{new Date(ultimoCambio.created_at).toLocaleDateString("es-BO")} a las{" "}
						{new Date(ultimoCambio.created_at).toLocaleTimeString("es-BO", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
				</div>

				{/* Mostrar detalles solo si NO es cambio_estado (ya mostramos valor_nuevo arriba) */}
				{ultimoCambio.accion !== "cambio_estado" && ultimoCambio.detalles && typeof ultimoCambio.detalles === "object" && (
					<div className="text-xs bg-white dark:bg-gray-900 rounded-md p-2 border">
						{Object.entries(ultimoCambio.detalles).map(([key, value]) => (
							<div key={key} className="text-muted-foreground">
								<span className="font-medium">{key}:</span> {String(value)}
							</div>
						))}
					</div>
				)}

				{onVerHistorialCompleto && (
					<Button
						variant="link"
						size="sm"
						onClick={onVerHistorialCompleto}
						className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
					>
						Ver historial completo
						<ExternalLink className="ml-1 h-3 w-3" />
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
