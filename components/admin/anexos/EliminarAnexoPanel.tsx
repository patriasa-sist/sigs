"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	buscarAnexosParaAdmin,
	eliminarAnexoCompleto,
	type AnexoAdminRow,
} from "@/app/admin/anexos/actions";

const TIPO_LABEL: Record<AnexoAdminRow["tipo_anexo"], string> = {
	inclusion: "Inclusión",
	exclusion: "Exclusión",
	anulacion: "Anulación",
};

const TIPO_BADGE_VARIANT: Record<AnexoAdminRow["tipo_anexo"], "secondary" | "default" | "destructive"> = {
	inclusion: "secondary",
	exclusion: "default",
	anulacion: "destructive",
};

const ESTADO_BADGE_VARIANT: Record<AnexoAdminRow["estado"], "secondary" | "default" | "outline"> = {
	pendiente: "secondary",
	activo: "default",
	rechazado: "outline",
};

function formatDate(value: string | null): string {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function EliminarAnexoPanel() {
	const [query, setQuery] = useState("");
	const [resultados, setResultados] = useState<AnexoAdminRow[]>([]);
	const [buscando, setBuscando] = useState(false);
	const [buscado, setBuscado] = useState(false);

	const [anexoSeleccionado, setAnexoSeleccionado] = useState<AnexoAdminRow | null>(null);
	const [motivo, setMotivo] = useState("");
	const [confirmoConsecuencias, setConfirmoConsecuencias] = useState(false);
	const [eliminando, setEliminando] = useState(false);

	async function ejecutarBusqueda(e: React.FormEvent) {
		e.preventDefault();
		if (query.trim().length < 2) {
			toast.error("Ingresá al menos 2 caracteres.");
			return;
		}
		setBuscando(true);
		setBuscado(true);
		const result = await buscarAnexosParaAdmin(query);
		setBuscando(false);
		if (!result.success) {
			toast.error(result.error);
			setResultados([]);
			return;
		}
		setResultados(result.data);
	}

	function abrirConfirmacion(anexo: AnexoAdminRow) {
		setAnexoSeleccionado(anexo);
		setMotivo("");
		setConfirmoConsecuencias(false);
	}

	function cerrarConfirmacion() {
		setAnexoSeleccionado(null);
		setMotivo("");
		setConfirmoConsecuencias(false);
	}

	async function confirmarEliminacion() {
		if (!anexoSeleccionado) return;
		if (motivo.trim().length < 10) {
			toast.error("El motivo debe tener al menos 10 caracteres.");
			return;
		}
		if (!confirmoConsecuencias) {
			toast.error("Marcá la casilla de confirmación.");
			return;
		}
		setEliminando(true);
		const result = await eliminarAnexoCompleto(anexoSeleccionado.id, motivo);
		setEliminando(false);
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		toast.success(
			result.data.reactivada
				? "Anexo eliminado y póliza reactivada."
				: "Anexo eliminado correctamente."
		);
		setResultados((prev) => prev.filter((r) => r.id !== anexoSeleccionado.id));
		cerrarConfirmacion();
	}

	const reactivara =
		anexoSeleccionado?.tipo_anexo === "anulacion" &&
		anexoSeleccionado?.estado === "activo" &&
		anexoSeleccionado?.poliza_estado === "anulada";

	return (
		<div className="space-y-6">
			<form onSubmit={ejecutarBusqueda} className="flex gap-2 items-end">
				<div className="flex-1">
					<Label htmlFor="busqueda" className="text-sm">
						Número de póliza o número de anexo
					</Label>
					<Input
						id="busqueda"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Ej: AUMB-SC2-000033 o ANEXO 2"
						autoComplete="off"
					/>
				</div>
				<Button type="submit" disabled={buscando}>
					{buscando ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Search className="h-4 w-4" />
					)}
					<span className="ml-2">Buscar</span>
				</Button>
			</form>

			{buscado && !buscando && resultados.length === 0 && (
				<div className="text-sm text-muted-foreground text-center py-8">
					Sin resultados para &quot;{query}&quot;.
				</div>
			)}

			{resultados.length > 0 && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Anexo</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead>Póliza</TableHead>
								<TableHead>Estado póliza</TableHead>
								<TableHead>Creado</TableHead>
								<TableHead>Validado</TableHead>
								<TableHead className="text-center">Docs</TableHead>
								<TableHead className="text-center">Pagos</TableHead>
								<TableHead className="text-right">Acción</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{resultados.map((row) => (
								<TableRow key={row.id}>
									<TableCell className="font-medium">{row.numero_anexo}</TableCell>
									<TableCell>
										<Badge variant={TIPO_BADGE_VARIANT[row.tipo_anexo]}>
											{TIPO_LABEL[row.tipo_anexo]}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={ESTADO_BADGE_VARIANT[row.estado]} className="capitalize">
											{row.estado}
										</Badge>
									</TableCell>
									<TableCell>
										<Link
											href={`/polizas/${row.poliza_id}`}
											target="_blank"
											className="text-primary hover:underline inline-flex items-center gap-1"
										>
											{row.numero_poliza}
											<ExternalLink className="h-3 w-3" />
										</Link>
										<div className="text-xs text-muted-foreground">{row.ramo}</div>
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="capitalize">
											{row.poliza_estado}
										</Badge>
									</TableCell>
									<TableCell className="text-xs">
										<div>{row.creado_por_nombre ?? "—"}</div>
										<div className="text-muted-foreground">{formatDate(row.fecha_anexo)}</div>
									</TableCell>
									<TableCell className="text-xs">
										<div>{row.validado_por_nombre ?? "—"}</div>
										<div className="text-muted-foreground">{formatDate(row.fecha_validacion)}</div>
									</TableCell>
									<TableCell className="text-center">{row.cantidad_documentos}</TableCell>
									<TableCell className="text-center">{row.cantidad_pagos}</TableCell>
									<TableCell className="text-right">
										<Button
											variant="destructive"
											size="sm"
											onClick={() => abrirConfirmacion(row)}
										>
											Eliminar
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<AlertDialog open={Boolean(anexoSeleccionado)} onOpenChange={(open) => !open && cerrarConfirmacion()}>
				<AlertDialogContent className="max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							Eliminar anexo
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3 text-left">
								{anexoSeleccionado && (
									<div className="rounded-md bg-muted p-3 text-sm space-y-1">
										<div>
											<span className="text-muted-foreground">Anexo:</span>{" "}
											<strong>{anexoSeleccionado.numero_anexo}</strong>{" "}
											({TIPO_LABEL[anexoSeleccionado.tipo_anexo]})
										</div>
										<div>
											<span className="text-muted-foreground">Póliza:</span>{" "}
											<strong>{anexoSeleccionado.numero_poliza}</strong>{" "}
											({anexoSeleccionado.ramo})
										</div>
										<div>
											<span className="text-muted-foreground">Documentos:</span>{" "}
											{anexoSeleccionado.cantidad_documentos} ·{" "}
											<span className="text-muted-foreground">Pagos:</span>{" "}
											{anexoSeleccionado.cantidad_pagos}
										</div>
									</div>
								)}

								{reactivara && (
									<div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
										Este anexo es una <strong>anulación activa</strong>. Al eliminarlo, la
										póliza volverá al estado <strong>activa</strong>.
									</div>
								)}

								<div className="space-y-2">
									<Label htmlFor="motivo" className="text-sm">
										Motivo de la eliminación <span className="text-destructive">*</span>
									</Label>
									<Textarea
										id="motivo"
										value={motivo}
										onChange={(e) => setMotivo(e.target.value)}
										placeholder="Ej: Anulación validada por error, póliza sigue vigente."
										rows={3}
										disabled={eliminando}
									/>
									<p className="text-xs text-muted-foreground">
										Mínimo 10 caracteres. Queda registrado en el historial.
									</p>
								</div>

								<label className="flex items-start gap-2 cursor-pointer text-sm">
									<Checkbox
										checked={confirmoConsecuencias}
										onCheckedChange={(v) => setConfirmoConsecuencias(v === true)}
										disabled={eliminando}
									/>
									<span>
										Entiendo que esta acción es irreversible{reactivara ? " y reactivará la póliza" : ""}.
									</span>
								</label>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								confirmarEliminacion();
							}}
							disabled={eliminando || motivo.trim().length < 10 || !confirmoConsecuencias}
							className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
						>
							{eliminando ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Eliminando...
								</>
							) : (
								"Eliminar anexo"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
