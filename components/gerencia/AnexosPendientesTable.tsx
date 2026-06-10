"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
	inclusion: { label: "Inclusión", className: "bg-teal-50 text-teal-800 border-teal-200" },
	exclusion: { label: "Exclusión", className: "bg-amber-50 text-amber-800 border-amber-200" },
	anulacion: { label: "Anulación", className: "bg-rose-50 text-rose-800 border-rose-200" },
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
				description:
					selectedAnexo.tipo_anexo === "anulacion"
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
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-bg mb-4">
					<CheckCircle className="h-6 w-6 text-accent" />
				</span>
				<p className="text-sm font-medium text-foreground">Sin anexos pendientes</p>
				<p className="text-sm text-muted-foreground mt-1">Todos los anexos han sido procesados</p>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-lg border hidden md:block">
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
											<span
												className={
													anexo.monto_ajuste_total >= 0 ? "text-accent" : "text-destructive"
												}
											>
												{anexo.monto_ajuste_total >= 0 ? "+" : ""}
												{anexo.monto_ajuste_total.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
												})}
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
										<div className="flex justify-center gap-1.5">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-slate-600 bg-slate-100 hover:text-slate-900 hover:bg-slate-200"
												onClick={() =>
													router.push(`/polizas/${anexo.poliza_id}#anexo-${anexo.id}`)
												}
												title="Ver en póliza"
											>
												<Eye className="h-[18px] w-[18px]" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-teal-700 bg-teal-50 hover:text-teal-800 hover:bg-teal-100"
												disabled={isLoading}
												onClick={() => openDialog(anexo, "validar")}
												title="Validar"
											>
												{isLoading ? (
													<Loader2 className="h-[18px] w-[18px] animate-spin" />
												) : (
													<CheckCircle className="h-[18px] w-[18px]" />
												)}
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-rose-600 bg-rose-50 hover:text-rose-700 hover:bg-rose-100"
												disabled={isLoading}
												onClick={() => openDialog(anexo, "rechazar")}
												title="Rechazar"
											>
												<XCircle className="h-[18px] w-[18px]" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{/* Tarjetas movil (< md) */}
			<div className="md:hidden space-y-3">
				{anexos.map((anexo) => {
					const tipoBadge = TIPO_BADGE[anexo.tipo_anexo];
					const isLoading = loading === anexo.id;
					return (
						<div key={anexo.id} className="rounded-lg border bg-card p-3">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="font-medium text-sm text-foreground">{anexo.numero_anexo}</div>
									<div className="text-xs text-muted-foreground mt-0.5">
										Poliza {anexo.numero_poliza} · {anexo.ramo}
									</div>
								</div>
								<Badge variant="outline" className={`${tipoBadge.className} shrink-0`}>
									{tipoBadge.label}
								</Badge>
							</div>
							<div className="mt-2 flex items-center justify-between gap-3">
								<div className="text-xs text-muted-foreground">
									<div>{anexo.creado_por_nombre || "-"}</div>
									<div>{formatDate(anexo.fecha_anexo)}</div>
								</div>
								<div className="text-sm font-medium tabular-nums">
									{anexo.monto_ajuste_total !== 0 ? (
										<span
											className={
												anexo.monto_ajuste_total >= 0 ? "text-accent" : "text-destructive"
											}
										>
											{anexo.monto_ajuste_total >= 0 ? "+" : ""}
											{anexo.monto_ajuste_total.toLocaleString("es-BO", {
												minimumFractionDigits: 2,
											})}
										</span>
									) : (
										<span className="text-muted-foreground">-</span>
									)}
								</div>
							</div>
							<div className="mt-3 grid grid-cols-3 gap-2">
								<Button
									variant="outline"
									size="sm"
									className="text-slate-700"
									onClick={() => router.push(`/polizas/${anexo.poliza_id}#anexo-${anexo.id}`)}
								>
									<Eye className="h-4 w-4 mr-1" /> Ver
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="text-teal-700 border-teal-200"
									disabled={isLoading}
									onClick={() => openDialog(anexo, "validar")}
								>
									{isLoading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<>
											<CheckCircle className="h-4 w-4 mr-1" /> Validar
										</>
									)}
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="text-rose-600 border-rose-200"
									disabled={isLoading}
									onClick={() => openDialog(anexo, "rechazar")}
								>
									<XCircle className="h-4 w-4 mr-1" /> Rechazar
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Dialog de confirmación */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{dialogType === "validar" ? "Validar Anexo" : "Rechazar Anexo"}</DialogTitle>
						<DialogDescription>
							{dialogType === "validar" ? (
								<>
									¿Confirma la validación del anexo <strong>{selectedAnexo?.numero_anexo}</strong>?
									{selectedAnexo?.tipo_anexo === "anulacion" && (
										<span className="block mt-2 text-destructive font-medium">
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
							<Button onClick={handleValidar} className="bg-green-600 hover:bg-green-700">
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
