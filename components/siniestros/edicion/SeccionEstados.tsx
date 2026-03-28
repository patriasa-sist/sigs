"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
	const router = useRouter();
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

				router.refresh();
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
				<CardContent className="p-4 space-y-4">
					{/* Encabezado */}
					<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
						<Clock className="h-3.5 w-3.5 text-primary" />
						Etapa del Seguimiento
					</div>

					{/* Estado Actual */}
					{estadoActual?.estado_actual_nombre && (
						<div>
							<p className="text-xs text-muted-foreground mb-1">Estado actual</p>
							<p className="text-sm font-medium text-foreground leading-snug">
								{estadoActual.estado_actual_nombre}
							</p>
							{estadoActual.estado_actual_fecha && (
								<p className="text-xs text-muted-foreground mt-0.5">
									{new Date(estadoActual.estado_actual_fecha).toLocaleDateString("es-BO")}
								</p>
							)}
							{estadoActual.estado_actual_observacion && (
								<p className="text-xs text-muted-foreground mt-1 italic">
									&quot;{estadoActual.estado_actual_observacion}&quot;
								</p>
							)}
						</div>
					)}

					{/* Separador */}
					{estadoActual?.estado_actual_nombre && puedeEditarEstado && (
						<div className="border-t border-border" />
					)}

					{/* Selector de Nuevo Estado */}
					{puedeEditarEstado ? (
						<div className="space-y-2">
							<Button
								onClick={handleOpenModal}
								disabled={!estadoSeleccionado}
								className="w-full"
								size="sm"
							>
								<CheckCircle2 className="mr-2 h-4 w-4" />
								Aplicar cambio de etapa
							</Button>
							<div>
								<Label htmlFor="estado-select" className="text-xs text-muted-foreground">
									Nueva etapa
								</Label>
								<Select value={estadoSeleccionado} onValueChange={setEstadoSeleccionado}>
									<SelectTrigger id="estado-select" className="mt-1 h-auto min-h-9 py-4 px-3 text-sm [&>span]:whitespace-normal [&>span]:text-left [&>span]:leading-snug [&>span]:pr-2">
										<SelectValue placeholder="Seleccionar etapa..." />
									</SelectTrigger>
									<SelectContent>
										{estados.map((estado) => (
											<SelectItem key={estado.id} value={estado.id} className="whitespace-normal">
												{estado.nombre}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					) : (
						<div className="flex items-start gap-2 text-xs text-muted-foreground">
							<AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
							<span>Solo editable cuando el siniestro está abierto</span>
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
							Confirma el cambio de estado. Si necesitas agregar notas adicionales, usa el tab
							&quot;Observaciones&quot;.
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
