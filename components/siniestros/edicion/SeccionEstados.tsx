"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { obtenerEstadosCatalogo, obtenerHistorialEstados, cambiarEstadoSiniestro } from "@/app/siniestros/actions";
import type { EstadoSiniestroCatalogo, EstadoSiniestroHistorialConUsuario, EstadoActualSiniestro } from "@/types/siniestro";
import { toast } from "sonner";

interface SeccionEstadosProps {
	siniestroId: string;
	estadoActual?: EstadoActualSiniestro;
	estadoSiniestro: string; // "abierto" | "rechazado" | etc
}

export default function SeccionEstados({ siniestroId, estadoActual, estadoSiniestro }: SeccionEstadosProps) {
	const [estados, setEstados] = useState<EstadoSiniestroCatalogo[]>([]);
	const [historial, setHistorial] = useState<EstadoSiniestroHistorialConUsuario[]>([]);
	const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("");
	const [observacion, setObservacion] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);

	useEffect(() => {
		loadData();
	}, [siniestroId]);

	const loadData = async () => {
		setLoading(true);

		try {
			// Cargar catálogo de estados
			const estadosResponse = await obtenerEstadosCatalogo();
			if (estadosResponse.success && estadosResponse.data) {
				setEstados(estadosResponse.data.estados);
			}

			// Cargar historial de estados
			const historialResponse = await obtenerHistorialEstados(siniestroId);
			if (historialResponse.success && historialResponse.data) {
				setHistorial(historialResponse.data.historial);
			}
		} catch (error) {
			console.error("Error loading estados:", error);
			toast.error("Error al cargar estados");
		} finally {
			setLoading(false);
		}
	};

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

		if (!observacion || observacion.trim() === "") {
			toast.error("La observación es obligatoria");
			return;
		}

		setSaving(true);

		try {
			const response = await cambiarEstadoSiniestro(siniestroId, estadoSeleccionado, observacion);

			if (response.success) {
				toast.success("Estado cambiado exitosamente");
				setModalOpen(false);
				setEstadoSeleccionado("");
				setObservacion("");
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
								<p className="text-sm text-muted-foreground mt-2 italic">"{estadoActual.estado_actual_observacion}"</p>
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

					{/* Historial de Estados */}
					{historial.length > 0 && (
						<div className="pt-4 border-t">
							<h4 className="text-sm font-medium mb-3">Historial de Estados</h4>
							<div className="space-y-3">
								{historial.map((item, index) => (
									<div key={item.id} className="flex gap-3">
										<div className="flex flex-col items-center">
											<div
												className={`h-2 w-2 rounded-full mt-1 ${
													index === 0 ? "bg-primary" : "bg-muted-foreground"
												}`}
											/>
											{index !== historial.length - 1 && <div className="w-px h-full bg-border mt-1" />}
										</div>
										<div className="flex-1 pb-3">
											<p className="text-sm font-medium">{item.estado.nombre}</p>
											<p className="text-xs text-muted-foreground">
												{item.usuario_nombre || "Sistema"} •{" "}
												{new Date(item.created_at).toLocaleDateString("es-BO")} a las{" "}
												{new Date(item.created_at).toLocaleTimeString("es-BO", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
											{item.observacion && (
												<p className="text-xs text-muted-foreground mt-1 italic">"{item.observacion}"</p>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Modal de Confirmación */}
			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cambiar Estado del Siniestro</DialogTitle>
						<DialogDescription>
							Confirma el cambio de estado. Opcionalmente puedes agregar una observación.
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

						<div className="space-y-2">
							<Label htmlFor="observacion-modal">
								Observación <span className="text-red-500">*</span>
							</Label>
							<Textarea
								id="observacion-modal"
								placeholder="Agrega una observación sobre este cambio de estado... (obligatorio)"
								value={observacion}
								onChange={(e) => setObservacion(e.target.value)}
								rows={3}
								required
							/>
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
