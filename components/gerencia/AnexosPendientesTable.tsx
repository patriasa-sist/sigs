"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { validarAnexo, rechazarAnexo, type AnexoPendiente } from "@/app/gerencia/validacion-anexos/actions";
import { formatDate } from "@/utils/formatters";

type Props = {
	anexos: AnexoPendiente[];
};

const TIPO_BADGE = {
	inclusion: { label: "Inclusión", className: "bg-green-100 text-green-700 border-green-200" },
	exclusion: { label: "Exclusión", className: "bg-orange-100 text-orange-700 border-orange-200" },
	anulacion: { label: "Anulación", className: "bg-red-100 text-red-700 border-red-200" },
};

export default function AnexosPendientesTable({ anexos: initialAnexos }: Props) {
	const router = useRouter();
	const [anexos, setAnexos] = useState(initialAnexos);
	const [loading, setLoading] = useState<string | null>(null);

	// Dialog states
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedAnexo, setSelectedAnexo] = useState<AnexoPendiente | null>(null);
	const [dialogType, setDialogType] = useState<"validar" | "rechazar">("validar");
	const [motivoRechazo, setMotivoRechazo] = useState("");

	const openDialog = (anexo: AnexoPendiente, type: "validar" | "rechazar") => {
		setSelectedAnexo(anexo);
		setDialogType(type);
		setMotivoRechazo("");
		setDialogOpen(true);
	};

	const handleValidar = async () => {
		if (!selectedAnexo) return;
		setLoading(selectedAnexo.id);
		setDialogOpen(false);

		const result = await validarAnexo(selectedAnexo.id);
		if (result.success) {
			setAnexos((prev) => prev.filter((a) => a.id !== selectedAnexo.id));
			toast.success("Anexo validado exitosamente", {
				description: selectedAnexo.tipo_anexo === "anulacion"
					? "La póliza ha sido anulada"
					: `Anexo ${selectedAnexo.numero_anexo} activado`,
			});
		} else {
			toast.error("Error al validar", { description: result.error });
		}
		setLoading(null);
	};

	const handleRechazar = async () => {
		if (!selectedAnexo) return;
		if (motivoRechazo.trim().length < 10) {
			toast.error("Motivo insuficiente", { description: "El motivo debe tener al menos 10 caracteres" });
			return;
		}

		setLoading(selectedAnexo.id);
		setDialogOpen(false);

		const result = await rechazarAnexo(selectedAnexo.id, motivoRechazo);
		if (result.success) {
			setAnexos((prev) => prev.filter((a) => a.id !== selectedAnexo.id));
			toast.success("Anexo rechazado");
		} else {
			toast.error("Error al rechazar", { description: result.error });
		}
		setLoading(null);
	};

	if (anexos.length === 0) {
		return (
			<div className="text-center py-12 text-gray-500">
				<CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
				<p className="text-lg font-medium">No hay anexos pendientes</p>
				<p className="text-sm">Todos los anexos han sido procesados</p>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="h-8 text-xs">Nro. Anexo</TableHead>
							<TableHead className="h-8 text-xs">Tipo</TableHead>
							<TableHead className="h-8 text-xs">Póliza</TableHead>
							<TableHead className="h-8 text-xs">Ramo</TableHead>
							<TableHead className="h-8 text-xs text-right">Ajuste</TableHead>
							<TableHead className="h-8 text-xs">Creado por</TableHead>
							<TableHead className="h-8 text-xs">Fecha</TableHead>
							<TableHead className="h-8 text-xs text-center">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{anexos.map((anexo) => {
							const tipoBadge = TIPO_BADGE[anexo.tipo_anexo];
							const isLoading = loading === anexo.id;

							return (
								<TableRow key={anexo.id}>
									<TableCell className="py-1.5 font-medium">{anexo.numero_anexo}</TableCell>
									<TableCell className="py-1.5">
										<Badge variant="outline" className={tipoBadge.className}>
											{tipoBadge.label}
										</Badge>
									</TableCell>
									<TableCell className="py-1.5">{anexo.numero_poliza}</TableCell>
									<TableCell className="py-1.5">{anexo.ramo}</TableCell>
									<TableCell className="py-1.5 text-right">
										{anexo.monto_ajuste_total !== 0 ? (
											<span className={anexo.monto_ajuste_total >= 0 ? "text-green-600" : "text-red-600"}>
												{anexo.monto_ajuste_total >= 0 ? "+" : ""}
												{anexo.monto_ajuste_total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
											</span>
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell className="py-1.5">
										<div className="text-xs leading-tight">
											<div>{anexo.creado_por_nombre || "-"}</div>
											<div className="text-muted-foreground">{formatDate(anexo.created_at)}</div>
										</div>
									</TableCell>
									<TableCell className="py-1.5">{formatDate(anexo.fecha_anexo)}</TableCell>
									<TableCell className="py-1.5">
										<div className="flex justify-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												onClick={() => router.push(`/polizas/${anexo.poliza_id}#anexo-${anexo.id}`)}
												title="Ver en póliza"
											>
												<Eye className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
												disabled={isLoading}
												onClick={() => openDialog(anexo, "validar")}
												title="Validar"
											>
												{isLoading ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<CheckCircle className="h-4 w-4" />
												)}
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
												disabled={isLoading}
												onClick={() => openDialog(anexo, "rechazar")}
												title="Rechazar"
											>
												<XCircle className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{/* Dialog de confirmación */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{dialogType === "validar" ? "Validar Anexo" : "Rechazar Anexo"}
						</DialogTitle>
						<DialogDescription>
							{dialogType === "validar" ? (
								<>
									¿Confirma la validación del anexo{" "}
									<strong>{selectedAnexo?.numero_anexo}</strong>?
									{selectedAnexo?.tipo_anexo === "anulacion" && (
										<span className="block mt-2 text-red-600 font-medium">
											<AlertTriangle className="h-4 w-4 inline mr-1" />
											Esto anulará la póliza permanentemente
										</span>
									)}
								</>
							) : (
								<>
									Ingrese el motivo del rechazo del anexo{" "}
									<strong>{selectedAnexo?.numero_anexo}</strong>
								</>
							)}
						</DialogDescription>
					</DialogHeader>

					{dialogType === "rechazar" && (
						<Textarea
							value={motivoRechazo}
							onChange={(e) => setMotivoRechazo(e.target.value)}
							placeholder="Motivo del rechazo (mínimo 10 caracteres)..."
							rows={4}
						/>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancelar
						</Button>
						{dialogType === "validar" ? (
							<Button
								onClick={handleValidar}
								className="bg-green-600 hover:bg-green-700"
							>
								<CheckCircle className="h-4 w-4 mr-1" />
								Validar
							</Button>
						) : (
							<Button
								onClick={handleRechazar}
								variant="destructive"
								disabled={motivoRechazo.trim().length < 10}
							>
								<XCircle className="h-4 w-4 mr-1" />
								Rechazar
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
