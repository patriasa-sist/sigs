"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Boxes, Pencil, Loader2, AlertCircle, User, Home, Package, Wrench, Plane, Car } from "lucide-react";
import { obtenerAseguradosPoliza, actualizarItemsSiniestro } from "@/app/siniestros/actions";
import { claveAseguradoDetalle, describirAseguradoDetalle } from "@/types/siniestro";
import type { AseguradoDetalle, SiniestroItem } from "@/types/siniestro";
import { captureError } from "@/utils/sentry";
import { toast } from "sonner";

const ICONO_TIPO = {
	vehiculo: Car,
	persona: User,
	bien: Home,
	equipo: Wrench,
	nave: Plane,
	carga: Package,
} as const;

const ETIQUETA_TIPO: Record<AseguradoDetalle["tipo"], string> = {
	vehiculo: "Vehículo",
	persona: "Persona",
	bien: "Bien",
	equipo: "Equipo",
	nave: "Nave",
	carga: "Carga",
};

// Reconstruye el AseguradoDetalle de un ítem guardado. El snapshot `detalle`
// siempre se persiste al guardar; el fallback mínimo cubre datos degradados.
function detalleDeItem(item: SiniestroItem): AseguradoDetalle {
	return item.detalle ?? { tipo: item.tipo, origen_id: item.origen_id ?? undefined, descripcion: item.descripcion };
}

interface ItemsSiniestradosProps {
	siniestroId: string;
	polizaId: string;
	ramo: string;
	items: SiniestroItem[];
	estadoSiniestro: string;
	onItemsChange: () => void;
	soloLectura?: boolean;
}

export default function ItemsSiniestrados({
	siniestroId,
	polizaId,
	ramo,
	items,
	estadoSiniestro,
	onItemsChange,
	soloLectura = false,
}: ItemsSiniestradosProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	// Opciones del diálogo: ítems vigentes de la póliza + ítems ya registrados
	// que dejaron de figurar en ella (para no perderlos al editar).
	const [opciones, setOpciones] = useState<AseguradoDetalle[]>([]);
	const [clavesNoVigentes, setClavesNoVigentes] = useState<Set<string>>(new Set());
	const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

	const puedeEditar = estadoSiniestro === "abierto" && !soloLectura;

	const cargarOpciones = async () => {
		setLoading(true);
		try {
			const res = await obtenerAseguradosPoliza(polizaId, ramo);
			const disponibles = res.success ? res.data.asegurados : [];
			if (!res.success) {
				toast.error(res.error || "Error al cargar los ítems de la póliza");
			}

			const detallesActuales = items.map(detalleDeItem);
			const clavesDisponibles = new Set(disponibles.map(claveAseguradoDetalle));
			const extras = detallesActuales.filter((d) => !clavesDisponibles.has(claveAseguradoDetalle(d)));

			setOpciones([...disponibles, ...extras]);
			setClavesNoVigentes(new Set(extras.map(claveAseguradoDetalle)));
			setSeleccionadas(new Set(detallesActuales.map(claveAseguradoDetalle)));
		} catch (error) {
			captureError(error, "ItemsSiniestrados.cargarOpciones", { siniestroId, polizaId });
			toast.error("Error al cargar los ítems de la póliza");
		} finally {
			setLoading(false);
		}
	};

	const handleOpenChange = (abierto: boolean) => {
		setOpen(abierto);
		if (abierto) cargarOpciones();
	};

	const toggle = (clave: string) => {
		setSeleccionadas((prev) => {
			const next = new Set(prev);
			if (next.has(clave)) {
				next.delete(clave);
			} else {
				next.add(clave);
			}
			return next;
		});
	};

	const handleGuardar = async () => {
		setSaving(true);
		try {
			const seleccion = opciones.filter((o) => seleccionadas.has(claveAseguradoDetalle(o)));
			const result = await actualizarItemsSiniestro(siniestroId, seleccion);
			if (result.success) {
				toast.success("Ítems siniestrados actualizados");
				setOpen(false);
				onItemsChange();
			} else {
				toast.error(result.error || "Error al actualizar los ítems");
			}
		} catch (error) {
			captureError(error, "ItemsSiniestrados.handleGuardar", { siniestroId });
			toast.error("Error al actualizar los ítems");
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<CardTitle className="text-lg flex items-center gap-2">
							<Boxes className="h-5 w-5 text-primary" />
							Ítems Siniestrados
							{items.length > 0 && (
								<span className="text-xs font-normal text-muted-foreground">({items.length})</span>
							)}
						</CardTitle>
						{puedeEditar && (
							<Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
								<Pencil className="h-3.5 w-3.5 mr-1.5" />
								Editar
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{items.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No se registraron ítems específicos para este siniestro.
						</p>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{items.map((item) => {
								const Icon = ICONO_TIPO[item.tipo] ?? Package;
								return (
									<div
										key={item.id}
										className="bg-secondary/30 rounded-lg p-3 flex items-start gap-2"
									>
										<Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
										<div className="min-w-0">
											<p className="text-sm font-medium">{item.descripcion}</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												{ETIQUETA_TIPO[item.tipo] ?? item.tipo}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Boxes className="h-5 w-5 text-primary" />
							Editar Ítems Siniestrados
						</DialogTitle>
						<DialogDescription>
							Marca el o los ítems de la póliza afectados por el siniestro. La selección es opcional.
						</DialogDescription>
					</DialogHeader>

					<div className="py-2">
						{loading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : opciones.length === 0 ? (
							<div className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
								<AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
								<p>Esta póliza no tiene un desglose de asegurados registrado.</p>
							</div>
						) : (
							<div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
								{opciones.map((opcion) => {
									const clave = claveAseguradoDetalle(opcion);
									const Icon = ICONO_TIPO[opcion.tipo] ?? Package;
									const marcado = seleccionadas.has(clave);
									return (
										<label
											key={clave}
											className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${
												marcado
													? "border-primary bg-primary/10"
													: "border-border bg-secondary/20 hover:border-primary/40"
											}`}
										>
											<Checkbox
												checked={marcado}
												onCheckedChange={() => toggle(clave)}
												className="mt-0.5"
											/>
											<Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
											<div className="min-w-0">
												<p className="font-medium">{describirAseguradoDetalle(opcion)}</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{ETIQUETA_TIPO[opcion.tipo] ?? opcion.tipo}
													{clavesNoVigentes.has(clave) && (
														<span className="text-warning">
															{" "}
															· Ya no figura en la póliza
														</span>
													)}
												</p>
											</div>
										</label>
									);
								})}
							</div>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
							Cancelar
						</Button>
						<Button onClick={handleGuardar} disabled={saving || loading}>
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
		</>
	);
}
