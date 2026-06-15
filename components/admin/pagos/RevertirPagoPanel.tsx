"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, AlertTriangle, ExternalLink, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
	buscarPolizasAdmin,
	obtenerCuotasConPagoAdmin,
	revertirPagoCuota,
	type PolizaPagoAdminRow,
	type CuotaPagoAdminRow,
} from "@/app/admin/pagos/actions";

const ESTADO_BADGE_VARIANT: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
	pagado: "default",
	parcial: "secondary",
	pendiente: "outline",
	vencido: "destructive",
};

export default function RevertirPagoPanel() {
	const [query, setQuery] = useState("");
	const [polizas, setPolizas] = useState<PolizaPagoAdminRow[]>([]);
	const [buscando, setBuscando] = useState(false);
	const [buscado, setBuscado] = useState(false);

	const [polizaSel, setPolizaSel] = useState<PolizaPagoAdminRow | null>(null);
	const [cuotas, setCuotas] = useState<CuotaPagoAdminRow[]>([]);
	const [cargandoCuotas, setCargandoCuotas] = useState(false);

	const [cuotaSel, setCuotaSel] = useState<CuotaPagoAdminRow | null>(null);
	const [motivo, setMotivo] = useState("");
	const [confirmo, setConfirmo] = useState(false);
	const [revirtiendo, setRevirtiendo] = useState(false);

	async function ejecutarBusqueda(e: React.FormEvent) {
		e.preventDefault();
		if (query.trim().length < 2) {
			toast.error("Ingresá al menos 2 caracteres.");
			return;
		}
		setBuscando(true);
		setBuscado(true);
		setPolizaSel(null);
		setCuotas([]);
		const result = await buscarPolizasAdmin(query);
		setBuscando(false);
		if (!result.success) {
			toast.error(result.error);
			setPolizas([]);
			return;
		}
		setPolizas(result.data);
	}

	async function seleccionarPoliza(poliza: PolizaPagoAdminRow) {
		setPolizaSel(poliza);
		setCargandoCuotas(true);
		setCuotas([]);
		const result = await obtenerCuotasConPagoAdmin(poliza.poliza_id);
		setCargandoCuotas(false);
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		setCuotas(result.data);
	}

	function abrirConfirmacion(cuota: CuotaPagoAdminRow) {
		setCuotaSel(cuota);
		setMotivo("");
		setConfirmo(false);
	}

	function cerrarConfirmacion() {
		setCuotaSel(null);
		setMotivo("");
		setConfirmo(false);
	}

	async function confirmarReversion() {
		if (!cuotaSel) return;
		if (motivo.trim().length < 10) {
			toast.error("El motivo debe tener al menos 10 caracteres.");
			return;
		}
		if (!confirmo) {
			toast.error("Marcá la casilla de confirmación.");
			return;
		}
		setRevirtiendo(true);
		const result = await revertirPagoCuota(cuotaSel.id, cuotaSel.tipo, motivo);
		setRevirtiendo(false);
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		toast.success(
			`Pago revertido. Borrados: ${result.data.abonos_borrados} abono(s), ${result.data.archivos_borrados} archivo(s), ${result.data.notas_borradas} nota(s).`,
		);
		setCuotas((prev) => prev.filter((c) => c.id !== cuotaSel.id));
		cerrarConfirmacion();
	}

	function etiquetaCuota(c: CuotaPagoAdminRow): string {
		if (c.tipo === "anexo") {
			return `Anexo ${c.numero_anexo ?? "?"} · cuota ${c.numero_cuota ?? "—"}`;
		}
		return `Cuota ${c.numero_cuota ?? "—"}`;
	}

	// Vista de cuotas de la póliza seleccionada
	if (polizaSel) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between gap-2">
					<Button variant="ghost" size="sm" onClick={() => setPolizaSel(null)}>
						<ChevronLeft className="h-4 w-4 mr-1" />
						Volver a resultados
					</Button>
					<Link
						href={`/polizas/${polizaSel.poliza_id}`}
						target="_blank"
						className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
					>
						{polizaSel.numero_poliza}
						<ExternalLink className="h-3 w-3" />
					</Link>
				</div>

				<div className="rounded-md bg-muted p-3 text-sm">
					<span className="text-muted-foreground">Póliza:</span> <strong>{polizaSel.numero_poliza}</strong> ·{" "}
					{polizaSel.ramo}
				</div>

				{cargandoCuotas ? (
					<div className="flex items-center justify-center py-10 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin mr-2" />
						Cargando cuotas...
					</div>
				) : cuotas.length === 0 ? (
					<div className="text-sm text-muted-foreground text-center py-8">
						Esta póliza no tiene cuotas con pagos registrados.
					</div>
				) : (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Cuota</TableHead>
									<TableHead>Estado</TableHead>
									<TableHead className="text-right">Monto</TableHead>
									<TableHead className="text-right">Abonado</TableHead>
									<TableHead>Fecha pago</TableHead>
									<TableHead className="text-center">Abonos</TableHead>
									<TableHead className="text-center">Comprob.</TableHead>
									<TableHead className="text-center">Notas</TableHead>
									<TableHead className="text-right">Acción</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{cuotas.map((c) => (
									<TableRow key={`${c.tipo}-${c.id}`}>
										<TableCell className="font-medium">{etiquetaCuota(c)}</TableCell>
										<TableCell>
											<Badge
												variant={ESTADO_BADGE_VARIANT[c.estado] ?? "outline"}
												className="capitalize"
											>
												{c.estado}
											</Badge>
										</TableCell>
										<TableCell className="text-right">{formatCurrency(c.monto)}</TableCell>
										<TableCell className="text-right">{formatCurrency(c.monto_abonado)}</TableCell>
										<TableCell>{formatDate(c.fecha_pago)}</TableCell>
										<TableCell className="text-center">{c.cantidad_abonos}</TableCell>
										<TableCell className="text-center">{c.cantidad_comprobantes}</TableCell>
										<TableCell className="text-center">{c.cantidad_notas}</TableCell>
										<TableCell className="text-right">
											<Button
												variant="destructive"
												size="sm"
												onClick={() => abrirConfirmacion(c)}
											>
												Revertir
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}

				{renderDialog()}
			</div>
		);
	}

	// Vista de búsqueda de pólizas
	return (
		<div className="space-y-6">
			<form onSubmit={ejecutarBusqueda} className="flex gap-2 items-end">
				<div className="flex-1">
					<Label htmlFor="busqueda" className="text-sm">
						Número de póliza
					</Label>
					<Input
						id="busqueda"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Ej: POL-CORB-SC-500001-2025-02"
						autoComplete="off"
					/>
				</div>
				<Button type="submit" disabled={buscando}>
					{buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
					<span className="ml-2">Buscar</span>
				</Button>
			</form>

			{buscado && !buscando && polizas.length === 0 && (
				<div className="text-sm text-muted-foreground text-center py-8">
					Sin resultados para &quot;{query}&quot;.
				</div>
			)}

			{polizas.length > 0 && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Póliza</TableHead>
								<TableHead>Ramo</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="text-right">Acción</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{polizas.map((p) => (
								<TableRow key={p.poliza_id}>
									<TableCell className="font-medium">{p.numero_poliza}</TableCell>
									<TableCell>{p.ramo}</TableCell>
									<TableCell>
										<Badge variant="outline" className="capitalize">
											{p.estado}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button variant="outline" size="sm" onClick={() => seleccionarPoliza(p)}>
											Ver cuotas
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{renderDialog()}
		</div>
	);

	function renderDialog() {
		return (
			<AlertDialog open={Boolean(cuotaSel)} onOpenChange={(open) => !open && cerrarConfirmacion()}>
				<AlertDialogContent className="max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							Revertir pago de cuota
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3 text-left">
								{cuotaSel && (
									<div className="rounded-md bg-muted p-3 text-sm space-y-1">
										<div>
											<span className="text-muted-foreground">Póliza:</span>{" "}
											<strong>{polizaSel?.numero_poliza}</strong>
										</div>
										<div>
											<span className="text-muted-foreground">Cuota:</span>{" "}
											<strong>{etiquetaCuota(cuotaSel)}</strong> ·{" "}
											{formatCurrency(cuotaSel.monto)}
										</div>
										<div>
											<span className="text-muted-foreground">Se borrarán:</span>{" "}
											{cuotaSel.cantidad_abonos} abono(s), {cuotaSel.cantidad_comprobantes}{" "}
											comprobante(s) y {cuotaSel.cantidad_notas} nota(s). La cuota volverá a{" "}
											<strong>pendiente</strong>.
										</div>
									</div>
								)}

								<div className="space-y-2">
									<Label htmlFor="motivo" className="text-sm">
										Motivo de la reversión <span className="text-destructive">*</span>
									</Label>
									<Textarea
										id="motivo"
										value={motivo}
										onChange={(e) => setMotivo(e.target.value)}
										placeholder="Ej: Cobranzas registró esta cuota por error, debía cobrarse solo la anterior."
										rows={3}
										disabled={revirtiendo}
									/>
									<p className="text-xs text-muted-foreground">
										Mínimo 10 caracteres. Queda registrado en el historial de la póliza.
									</p>
								</div>

								<label className="flex items-start gap-2 cursor-pointer text-sm">
									<Checkbox
										checked={confirmo}
										onCheckedChange={(v) => setConfirmo(v === true)}
										disabled={revirtiendo}
									/>
									<span>
										Entiendo que esta acción es irreversible y borra permanentemente los pagos,
										archivos y notas de la cuota.
									</span>
								</label>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={revirtiendo}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								confirmarReversion();
							}}
							disabled={revirtiendo || motivo.trim().length < 10 || !confirmo}
							className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
						>
							{revirtiendo ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Revirtiendo...
								</>
							) : (
								"Revertir pago"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}
}
