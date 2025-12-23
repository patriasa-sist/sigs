"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserCog, Loader2, AlertCircle } from "lucide-react";
import { obtenerUsuariosResponsables, cambiarResponsableSiniestro } from "@/app/siniestros/actions";
import type { UsuarioResponsable } from "@/types/siniestro";
import { toast } from "sonner";

interface CambiarResponsableProps {
	siniestroId: string;
	responsableActualId?: string;
	responsableActualNombre?: string;
	estadoSiniestro: string;
}

export default function CambiarResponsable({
	siniestroId,
	responsableActualId,
	responsableActualNombre,
	estadoSiniestro,
}: CambiarResponsableProps) {
	const [open, setOpen] = useState(false);
	const [usuarios, setUsuarios] = useState<UsuarioResponsable[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string>(responsableActualId || "");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Cargar usuarios cuando se abre el modal
	useEffect(() => {
		if (open && usuarios.length === 0) {
			cargarUsuarios();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const cargarUsuarios = async () => {
		setLoading(true);
		try {
			const result = await obtenerUsuariosResponsables();
			if (result.success && result.data) {
				setUsuarios(result.data.usuarios);
			} else if (!result.success) {
				toast.error(result.error || "Error al cargar usuarios");
			}
		} catch (error) {
			console.error("Error cargando usuarios:", error);
			toast.error("Error al cargar usuarios");
		} finally {
			setLoading(false);
		}
	};

	const handleGuardar = async () => {
		if (!selectedUserId) {
			toast.error("Selecciona un responsable");
			return;
		}

		if (selectedUserId === responsableActualId) {
			toast.info("El responsable seleccionado ya está asignado");
			setOpen(false);
			return;
		}

		setSaving(true);
		try {
			const result = await cambiarResponsableSiniestro(siniestroId, selectedUserId);
			if (result.success) {
				toast.success("Responsable actualizado correctamente");
				setOpen(false);
				// Recargar página para mostrar cambios
				window.location.reload();
			} else {
				toast.error(result.error || "Error al cambiar responsable");
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Error al cambiar responsable");
		} finally {
			setSaving(false);
		}
	};

	// Solo permitir cambios en siniestros abiertos
	const puedeEditar = estadoSiniestro === "abierto";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" disabled={!puedeEditar}>
					<UserCog className="h-4 w-4 mr-2" />
					Cambiar Responsable
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserCog className="h-5 w-5 text-primary" />
						Cambiar Responsable del Siniestro
					</DialogTitle>
					<DialogDescription>
						Asigna un nuevo responsable para gestionar este siniestro. El cambio será registrado en el
						historial.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Responsable actual */}
					{responsableActualNombre && (
						<div className="p-3 bg-secondary/30 rounded-lg">
							<p className="text-sm text-muted-foreground">Responsable Actual</p>
							<p className="font-medium">{responsableActualNombre}</p>
						</div>
					)}

					{/* Selector de nuevo responsable */}
					<div className="space-y-2">
						<Label htmlFor="responsable">Nuevo Responsable</Label>
						{loading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : usuarios.length === 0 ? (
							<div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
								<AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
								<p>No hay usuarios disponibles con permisos de siniestros</p>
							</div>
						) : (
							<Select value={selectedUserId} onValueChange={setSelectedUserId}>
								<SelectTrigger id="responsable">
									<SelectValue placeholder="Selecciona un usuario" />
								</SelectTrigger>
								<SelectContent>
									{usuarios.map((usuario) => (
										<SelectItem key={usuario.id} value={usuario.id}>
											<div className="flex flex-col">
												<span className="font-medium">{usuario.full_name}</span>
												<span className="text-xs text-muted-foreground">
													{usuario.email} • {usuario.role}
												</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					{/* Info */}
					<div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
						<AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
						<p>
							Solo usuarios con rol <strong>siniestros</strong>, <strong>comercial</strong> o{" "}
							<strong>admin</strong> pueden ser asignados como responsables.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={handleGuardar} disabled={saving || loading || !selectedUserId}>
						{saving ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Guardando...
							</>
						) : (
							"Guardar Cambios"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
