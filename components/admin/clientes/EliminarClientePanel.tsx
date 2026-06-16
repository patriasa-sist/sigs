"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, AlertTriangle, ExternalLink, ChevronLeft, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
	buscarClientesAdmin,
	obtenerResumenEliminacionCliente,
	eliminarClientePermanente,
	type ClienteAdminRow,
	type ResumenEliminacionCliente,
} from "@/app/admin/clientes/actions";

const TIPO_LABEL: Record<string, string> = {
	natural: "Natural",
	unipersonal: "Unipersonal",
	juridica: "Jurídica",
	ong: "ONG",
	club_deportivo: "Club deportivo",
	asociacion_civil: "Asociación civil",
};

export default function EliminarClientePanel() {
	const [query, setQuery] = useState("");
	const [clientes, setClientes] = useState<ClienteAdminRow[]>([]);
	const [buscando, setBuscando] = useState(false);
	const [buscado, setBuscado] = useState(false);

	const [resumen, setResumen] = useState<ResumenEliminacionCliente | null>(null);
	const [cargandoResumen, setCargandoResumen] = useState(false);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [confirmacion, setConfirmacion] = useState("");
	const [confirmo, setConfirmo] = useState(false);
	const [eliminando, setEliminando] = useState(false);

	async function ejecutarBusqueda(e: React.FormEvent) {
		e.preventDefault();
		if (query.trim().length < 2) {
			toast.error("Ingresá al menos 2 caracteres.");
			return;
		}
		setBuscando(true);
		setBuscado(true);
		setResumen(null);
		const result = await buscarClientesAdmin(query);
		setBuscando(false);
		if (!result.success) {
			toast.error(result.error);
			setClientes([]);
			return;
		}
		setClientes(result.data);
	}

	async function seleccionarCliente(cliente: ClienteAdminRow) {
		setCargandoResumen(true);
		setResumen(null);
		const result = await obtenerResumenEliminacionCliente(cliente.client_id);
		setCargandoResumen(false);
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		setResumen(result.data);
	}

	function abrirConfirmacion() {
		setConfirmacion("");
		setConfirmo(false);
		setDialogOpen(true);
	}

	const textoEsperado = resumen
		? resumen.documento && resumen.documento !== "—"
			? resumen.documento
			: resumen.nombre
		: "";

	async function confirmarEliminacion() {
		if (!resumen) return;
		if (confirmacion.trim() !== textoEsperado.trim()) {
			toast.error("La confirmación no coincide.");
			return;
		}
		if (!confirmo) {
			toast.error("Marcá la casilla de confirmación.");
			return;
		}
		setEliminando(true);
		const result = await eliminarClientePermanente(resumen.client_id, confirmacion);
		setEliminando(false);
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		toast.success(
			`Cliente "${result.data.nombre}" eliminado. ${result.data.documentos_borrados} documento(s), ${result.data.archivos_storage_borrados} archivo(s).`,
		);
		setDialogOpen(false);
		setClientes((prev) => prev.filter((c) => c.client_id !== resumen.client_id));
		setResumen(null);
	}

	// Vista de detalle del cliente seleccionado
	if (resumen) {
		const r = resumen;
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between gap-2">
					<Button variant="ghost" size="sm" onClick={() => setResumen(null)}>
						<ChevronLeft className="h-4 w-4 mr-1" />
						Volver a resultados
					</Button>
					<Link
						href={`/clientes/${r.client_id}`}
						target="_blank"
						className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
					>
						Ver ficha
						<ExternalLink className="h-3 w-3" />
					</Link>
				</div>

				<div className="rounded-md bg-muted p-3 text-sm space-y-1">
					<div>
						<span className="text-muted-foreground">Cliente:</span> <strong>{r.nombre}</strong>{" "}
						<Badge variant="outline">{TIPO_LABEL[r.client_type] ?? r.client_type}</Badge>
					</div>
					<div>
						<span className="text-muted-foreground">Documento / NIT:</span> {r.documento}
					</div>
				</div>

				{r.bloqueado ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-2">
						<div className="flex items-center gap-2 text-destructive font-medium">
							<ShieldAlert className="h-4 w-4" />
							Eliminación bloqueada
						</div>
						<ul className="list-disc pl-5 text-destructive/90 space-y-0.5">
							{r.motivos_bloqueo.map((m) => (
								<li key={m}>{m}</li>
							))}
						</ul>
						<p className="text-muted-foreground">
							Para eliminar este cliente, primero quitá o transferí las pólizas asociadas.
						</p>
					</div>
				) : (
					<div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm space-y-2">
						<p className="text-foreground">
							Este cliente <strong>no tiene pólizas</strong> y puede eliminarse. Se borrará
							permanentemente:
						</p>
						<ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-muted-foreground sm:grid-cols-3">
							<li>{r.documentos} documento(s)</li>
							<li>{r.telefonos} teléfono(s)</li>
							<li>{r.conyuges} cónyuge(s)</li>
							<li>{r.representantes} representante(s)</li>
							<li>{r.auditorias} auditoría(s)</li>
							<li>{r.historial} registro(s) de historial</li>
						</ul>
					</div>
				)}

				<div className="flex justify-end">
					<Button variant="destructive" disabled={r.bloqueado} onClick={abrirConfirmacion}>
						<Trash2 className="h-4 w-4 mr-2" />
						Eliminar permanentemente
					</Button>
				</div>

				{renderDialog()}
			</div>
		);
	}

	// Vista de búsqueda
	return (
		<div className="space-y-6">
			<form onSubmit={ejecutarBusqueda} className="flex gap-2 items-end">
				<div className="flex-1">
					<Label htmlFor="busqueda" className="text-sm">
						Nombre, razón social o documento / NIT
					</Label>
					<Input
						id="busqueda"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Ej: VERACON o 342160022"
						autoComplete="off"
					/>
				</div>
				<Button type="submit" disabled={buscando}>
					{buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
					<span className="ml-2">Buscar</span>
				</Button>
			</form>

			{cargandoResumen && (
				<div className="flex items-center justify-center py-6 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					Cargando cliente...
				</div>
			)}

			{buscado && !buscando && clientes.length === 0 && (
				<div className="text-sm text-muted-foreground text-center py-8">
					Sin resultados para &quot;{query}&quot;.
				</div>
			)}

			{clientes.length > 0 && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Cliente</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead>Documento / NIT</TableHead>
								<TableHead className="text-center">Pólizas</TableHead>
								<TableHead className="text-right">Acción</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{clientes.map((c) => {
								const involucrado = c.polizas_count + c.asegurado_count;
								return (
									<TableRow key={c.client_id}>
										<TableCell className="font-medium">{c.nombre}</TableCell>
										<TableCell>
											<Badge variant="outline">
												{TIPO_LABEL[c.client_type] ?? c.client_type}
											</Badge>
										</TableCell>
										<TableCell>{c.documento}</TableCell>
										<TableCell className="text-center">
											{involucrado > 0 ? (
												<Badge variant="destructive">{involucrado}</Badge>
											) : (
												<Badge variant="secondary">0</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="outline"
												size="sm"
												onClick={() => seleccionarCliente(c)}
												disabled={cargandoResumen}
											>
												Revisar
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}

			{renderDialog()}
		</div>
	);

	function renderDialog() {
		return (
			<AlertDialog open={dialogOpen} onOpenChange={(open) => !eliminando && setDialogOpen(open)}>
				<AlertDialogContent className="max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							Eliminar cliente permanentemente
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3 text-left">
								{resumen && (
									<div className="rounded-md bg-muted p-3 text-sm space-y-1">
										<div>
											<span className="text-muted-foreground">Cliente:</span>{" "}
											<strong>{resumen.nombre}</strong>
										</div>
										<div>
											<span className="text-muted-foreground">Documento / NIT:</span>{" "}
											{resumen.documento}
										</div>
										<div className="text-destructive/90">
											Se borrará todo su rastro. Esta acción es irreversible.
										</div>
									</div>
								)}

								<div className="space-y-2">
									<Label htmlFor="confirmacion" className="text-sm">
										Escribí <strong className="text-foreground">{textoEsperado}</strong> para
										confirmar
									</Label>
									<Input
										id="confirmacion"
										value={confirmacion}
										onChange={(e) => setConfirmacion(e.target.value)}
										placeholder={textoEsperado}
										autoComplete="off"
										disabled={eliminando}
									/>
								</div>

								<label className="flex items-start gap-2 cursor-pointer text-sm">
									<Checkbox
										checked={confirmo}
										onCheckedChange={(v) => setConfirmo(v === true)}
										disabled={eliminando}
									/>
									<span>
										Entiendo que esta acción borra permanentemente al cliente y todos sus datos
										asociados, sin posibilidad de deshacer.
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
							disabled={eliminando || confirmacion.trim() !== textoEsperado.trim() || !confirmo}
							className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
						>
							{eliminando ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Eliminando...
								</>
							) : (
								"Eliminar"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}
}
