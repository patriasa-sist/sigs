"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { obtenerEstadosCatalogo, cambiarEstadoSiniestro } from "@/app/siniestros/actions";
import type { EstadoSiniestroCatalogo, EstadoActualSiniestro } from "@/types/siniestro";
import { toast } from "sonner";

interface SeccionEstadosProps {
	siniestroId: string;
	estadoActual?: EstadoActualSiniestro;
	estadoSiniestro: string; // "abierto" | "rechazado" | etc
}

export default function SeccionEstados({ siniestroId, estadoActual, estadoSiniestro }: SeccionEstadosProps) {
	const [estados, setEstados] = useState<EstadoSiniestroCatalogo[]>([]);
	const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);

	const loadData = useCallback(async () => {
		setLoading(true);

		try {
			// Cargar catálogo de estados
			const estadosResponse = await obtenerEstadosCatalogo();
			if (estadosResponse.success && estadosResponse.data) {
				setEstados(estadosResponse.data.estados);
			}
		} catch (error) {
			console.error("Error loading estados:", error);
			toast.error("Error al cargar estados");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [siniestroId, loadData]);

	const handleOpenModal = () => {
		if (!estadoSeleccionado) {
			toast.error("Selecciona un estado primero");
			return;
		}
		setModalOpen(true);
	};

	const handleCambiarEstado = async () => {
		if (!estadoSeleccionado) {
			toast.error("Selecciona un estado");
			return;
		}

		setSaving(true);

		try {
			const response = await cambiarEstadoSiniestro(siniestroId, estadoSeleccionado);

			if (response.success) {
				toast.success("Estado cambiado exitosamente");
				setModalOpen(false);
				setEstadoSeleccionado("");

				// Si hay datos de WhatsApp, abrir automáticamente en nueva pestaña
				if (response.data.whatsapp?.url) {
					window.open(response.data.whatsapp.url, "_blank");
					toast.success("WhatsApp Web se abrirá en una nueva pestaña", {
						description: "El mensaje de notificación está listo para enviar",
					});
				}

				// Recargar historial
				await loadData();
				// Recargar página para actualizar
				window.location.reload();
			} else {
				toast.error(response.error || "Error al cambiar estado");
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Error al cambiar estado");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="py-8">
					<div className="flex items-center justify-center gap-2 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin" />
						<span>Cargando estados...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Solo permitir cambio si el siniestro está abierto
	const puedeEditarEstado = estadoSiniestro === "abierto";

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<Clock className="h-5 w-5 text-primary" />
						Estado del Seguimiento
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Estado Actual */}
					{estadoActual?.estado_actual_nombre && (
						<div className="bg-secondary/30 rounded-lg p-3 border">
							<p className="text-sm text-muted-foreground mb-1">Estado Actual:</p>
							<div className="flex items-center justify-between">
								<Badge variant="outline" className="text-base">
									{estadoActual.estado_actual_nombre}
								</Badge>
								{estadoActual.estado_actual_fecha && (
									<span className="text-xs text-muted-foreground">
										{new Date(estadoActual.estado_actual_fecha).toLocaleDateString("es-BO")}
									</span>
								)}
							</div>
							{estadoActual.estado_actual_observacion && (
								<p className="text-sm text-muted-foreground mt-2 italic">&quot;{estadoActual.estado_actual_observacion}&quot;</p>
							)}
						</div>
					)}

					{/* Selector de Nuevo Estado */}
					{puedeEditarEstado ? (
						<div className="space-y-3">
							<div>
								<Label htmlFor="estado-select">Cambiar Estado</Label>
								<div className="flex gap-2 mt-1">
									<Select value={estadoSeleccionado} onValueChange={setEstadoSeleccionado}>
										<SelectTrigger id="estado-select" className="flex-1">
											<SelectValue placeholder="Seleccionar estado..." />
										</SelectTrigger>
										<SelectContent>
											{estados.map((estado) => (
												<SelectItem key={estado.id} value={estado.id}>
													{estado.nombre}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button onClick={handleOpenModal} disabled={!estadoSeleccionado}>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Cambiar
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
							<div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm">
								<AlertCircle className="h-4 w-4" />
								<span>Los estados solo pueden cambiarse cuando el siniestro está abierto</span>
							</div>
						</div>
					)}

					{/* Nota: El historial de estados se muestra en el tab "Historial" junto con todos los cambios del siniestro */}
				</CardContent>
			</Card>

			{/* Modal de Confirmación */}
			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cambiar Estado del Siniestro</DialogTitle>
						<DialogDescription>
							Confirma el cambio de estado. Si necesitas agregar notas adicionales, usa el tab &quot;Observaciones&quot;.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Nuevo Estado</Label>
							<div className="bg-secondary/50 rounded-lg p-3">
								<p className="font-medium">
									{estados.find((e) => e.id === estadoSeleccionado)?.nombre || "Estado seleccionado"}
								</p>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
							Cancelar
						</Button>
						<Button onClick={handleCambiarEstado} disabled={saving}>
							{saving ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Guardando...
								</>
							) : (
								"Confirmar Cambio"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
