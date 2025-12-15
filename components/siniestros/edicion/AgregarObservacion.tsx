"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, User, Calendar } from "lucide-react";
import { agregarObservacion } from "@/app/siniestros/actions";
import type { ObservacionSiniestro } from "@/types/siniestro";
import { toast } from "sonner";

interface AgregarObservacionProps {
	siniestroId: string;
	observacionesIniciales: ObservacionSiniestro[];
	estadoSiniestro: string;
}

export default function AgregarObservacion({
	siniestroId,
	observacionesIniciales,
	estadoSiniestro,
}: AgregarObservacionProps) {
	const [observacion, setObservacion] = useState("");
	const [loading, setLoading] = useState(false);
	const [observaciones, setObservaciones] = useState<ObservacionSiniestro[]>(observacionesIniciales);

	const handleSubmit = useCallback(async () => {
		if (!observacion.trim()) {
			toast.error("La observación no puede estar vacía");
			return;
		}

		setLoading(true);

		try {
			const result = await agregarObservacion(siniestroId, observacion.trim());

			if (result.success) {
				toast.success("Observación agregada correctamente");

				// Agregar la nueva observación a la lista (optimistic UI)
				const nuevaObservacion: ObservacionSiniestro = {
					id: result.data.observacion_id,
					siniestro_id: siniestroId,
					observacion: observacion.trim(),
					created_at: new Date().toISOString(),
					created_by: "", // Will be filled by DB
					usuario_nombre: "Tú", // Placeholder
				};

				setObservaciones([nuevaObservacion, ...observaciones]);
				setObservacion("");

				// Reload page to get updated data from server
				window.location.reload();
			} else {
				toast.error(result.error || "Error al agregar observación");
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Error al agregar observación");
		} finally {
			setLoading(false);
		}
	}, [observacion, siniestroId, observaciones]);

	return (
		<div className="space-y-4">
			{/* Form para agregar observación */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<MessageSquare className="h-5 w-5 text-primary" />
						Agregar Nueva Observación
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Textarea
						placeholder="Escribe una observación sobre el siniestro..."
						value={observacion}
						onChange={(e) => setObservacion(e.target.value)}
						rows={4}
						className="resize-none"
						disabled={loading || estadoSiniestro !== "abierto"}
					/>

					{estadoSiniestro !== "abierto" && (
						<p className="text-sm text-amber-600 dark:text-amber-400">
							No se pueden agregar observaciones a siniestros cerrados
						</p>
					)}

					<div className="flex justify-end">
						<Button
							onClick={handleSubmit}
							disabled={loading || !observacion.trim() || estadoSiniestro !== "abierto"}
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Guardando...
								</>
							) : (
								"Agregar Observación"
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Lista de observaciones */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">
						Historial de Observaciones ({observaciones.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{observaciones.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-8">
							No hay observaciones registradas
						</p>
					) : (
						<div className="space-y-3">
							{observaciones.map((obs, index) => (
								<div
									key={obs.id}
									className={`p-4 rounded-lg border ${
										index === 0
											? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
											: "bg-secondary/30"
									}`}
								>
									<div className="flex items-start justify-between gap-2 mb-2">
										<div className="flex items-center gap-2 text-sm">
											<User className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">{obs.usuario_nombre || "Usuario"}</span>
										</div>
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Calendar className="h-3 w-3" />
											<span>
												{new Date(obs.created_at).toLocaleDateString("es-BO")} -{" "}
												{new Date(obs.created_at).toLocaleTimeString("es-BO", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>
									</div>
									<p className="text-sm whitespace-pre-wrap">{obs.observacion}</p>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
