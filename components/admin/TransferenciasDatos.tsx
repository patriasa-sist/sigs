"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { fechaISOLaPaz, formatFechaLaPaz } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react";
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
import type { UsuarioConDatos, PolizaTransferible, ClienteTransferible } from "@/app/admin/transferencias/actions";
import {
	obtenerPolizasPorUsuario,
	obtenerClientesPorUsuario,
	transferirPolizas,
	transferirClientes,
} from "@/app/admin/transferencias/actions";

type Props = {
	usuarios: UsuarioConDatos[];
};

export default function TransferenciasDatos({ usuarios }: Props) {
	const [origenId, setOrigenId] = useState("");
	const [destinoId, setDestinoId] = useState("");
	const [motivo, setMotivo] = useState("");

	// Polizas state
	const [polizas, setPolizas] = useState<PolizaTransferible[]>([]);
	const [polizasSeleccionadas, setPolizasSeleccionadas] = useState<Set<string>>(new Set());
	const [cargandoPolizas, setCargandoPolizas] = useState(false);

	// Filtros de pólizas (fecha de registro en La Paz + director de cartera)
	const [filtroDesde, setFiltroDesde] = useState("");
	const [filtroHasta, setFiltroHasta] = useState("");
	const [filtroDirector, setFiltroDirector] = useState("all");

	// Clientes state
	const [clientes, setClientes] = useState<ClienteTransferible[]>([]);
	const [clientesSeleccionados, setClientesSeleccionados] = useState<Set<string>>(new Set());
	const [cargandoClientes, setCargandoClientes] = useState(false);

	// Dialog state
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [transferType, setTransferType] = useState<"polizas" | "clientes">("polizas");
	const [transfiriendo, setTransfiriendo] = useState(false);

	const origenUsuario = usuarios.find((u) => u.id === origenId);
	const destinoUsuario = usuarios.find((u) => u.id === destinoId);

	// Directores presentes en las pólizas cargadas (clave "sin" = sin director)
	const directores = useMemo(() => {
		const map = new Map<string, string>();
		for (const p of polizas) map.set(p.director_cartera_id ?? "sin", p.director_cartera_nombre);
		return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
	}, [polizas]);

	const polizasFiltradas = useMemo(() => {
		return polizas.filter((p) => {
			const fecha = fechaISOLaPaz(p.created_at);
			if (filtroDesde && fecha < filtroDesde) return false;
			if (filtroHasta && fecha > filtroHasta) return false;
			if (filtroDirector !== "all" && (p.director_cartera_id ?? "sin") !== filtroDirector) return false;
			return true;
		});
	}, [polizas, filtroDesde, filtroHasta, filtroDirector]);

	const hayFiltros = filtroDesde !== "" || filtroHasta !== "" || filtroDirector !== "all";

	function limpiarFiltros() {
		setFiltroDesde("");
		setFiltroHasta("");
		setFiltroDirector("all");
	}

	async function cargarDatosOrigen(userId: string) {
		setOrigenId(userId);
		setPolizasSeleccionadas(new Set());
		setClientesSeleccionados(new Set());
		limpiarFiltros();

		setCargandoPolizas(true);
		setCargandoClientes(true);

		const [polizasResult, clientesResult] = await Promise.all([
			obtenerPolizasPorUsuario(userId),
			obtenerClientesPorUsuario(userId),
		]);

		if (polizasResult.success) setPolizas(polizasResult.data);
		else toast.error(polizasResult.error);

		if (clientesResult.success) setClientes(clientesResult.data);
		else toast.error(clientesResult.error);

		setCargandoPolizas(false);
		setCargandoClientes(false);
	}

	function togglePoliza(id: string) {
		setPolizasSeleccionadas((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleCliente(id: string) {
		setClientesSeleccionados((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	// Selecciona/deselecciona lo FILTRADO, preservando selecciones fuera del filtro
	function toggleAllPolizas() {
		const idsFiltradas = polizasFiltradas.map((p) => p.id);
		const todasSeleccionadas = idsFiltradas.length > 0 && idsFiltradas.every((id) => polizasSeleccionadas.has(id));
		setPolizasSeleccionadas((prev) => {
			const next = new Set(prev);
			for (const id of idsFiltradas) {
				if (todasSeleccionadas) next.delete(id);
				else next.add(id);
			}
			return next;
		});
	}

	function toggleAllClientes() {
		if (clientesSeleccionados.size === clientes.length) {
			setClientesSeleccionados(new Set());
		} else {
			setClientesSeleccionados(new Set(clientes.map((c) => c.id)));
		}
	}

	function iniciarTransferencia(tipo: "polizas" | "clientes") {
		if (!destinoId) {
			toast.error("Seleccione un usuario destino");
			return;
		}
		if (origenId === destinoId) {
			toast.error("El usuario origen y destino no pueden ser el mismo");
			return;
		}
		const count = tipo === "polizas" ? polizasSeleccionadas.size : clientesSeleccionados.size;
		if (count === 0) {
			toast.error(`No se seleccionaron ${tipo}`);
			return;
		}
		setTransferType(tipo);
		setConfirmDialogOpen(true);
	}

	async function ejecutarTransferencia() {
		setTransfiriendo(true);
		try {
			if (transferType === "polizas") {
				const result = await transferirPolizas(
					Array.from(polizasSeleccionadas),
					destinoId,
					motivo || undefined,
				);
				if (result.success) {
					toast.success(`${result.data.transferidos} pólizas transferidas exitosamente`);
					setPolizasSeleccionadas(new Set());
					await cargarDatosOrigen(origenId);
				} else {
					toast.error(result.error);
				}
			} else {
				const result = await transferirClientes(
					Array.from(clientesSeleccionados),
					destinoId,
					motivo || undefined,
				);
				if (result.success) {
					toast.success(`${result.data.transferidos} clientes transferidos exitosamente`);
					setClientesSeleccionados(new Set());
					await cargarDatosOrigen(origenId);
				} else {
					toast.error(result.error);
				}
			}
		} catch {
			toast.error("Error inesperado al transferir");
		} finally {
			setTransfiriendo(false);
			setConfirmDialogOpen(false);
			setMotivo("");
		}
	}

	return (
		<div className="space-y-6">
			{/* Selectores de usuario */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
				<div className="space-y-2">
					<Label>Usuario origen</Label>
					<Select value={origenId} onValueChange={cargarDatosOrigen}>
						<SelectTrigger>
							<SelectValue placeholder="Seleccione usuario origen" />
						</SelectTrigger>
						<SelectContent>
							{usuarios.map((u) => (
								<SelectItem key={u.id} value={u.id}>
									{u.full_name} ({u.role}) - {u.total_polizas}P / {u.total_clientes}C
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex justify-center">
					<ArrowRight className="h-6 w-6 text-gray-400" />
				</div>

				<div className="space-y-2">
					<Label>Usuario destino</Label>
					<Select value={destinoId} onValueChange={setDestinoId}>
						<SelectTrigger>
							<SelectValue placeholder="Seleccione usuario destino" />
						</SelectTrigger>
						<SelectContent>
							{usuarios
								.filter((u) => u.id !== origenId)
								.map((u) => (
									<SelectItem key={u.id} value={u.id}>
										{u.full_name} ({u.role})
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Tabs de Polizas y Clientes */}
			{origenId && (
				<Tabs defaultValue="polizas">
					<TabsList>
						<TabsTrigger value="polizas">Pólizas ({polizas.length})</TabsTrigger>
						<TabsTrigger value="clientes">Clientes ({clientes.length})</TabsTrigger>
					</TabsList>

					<TabsContent value="polizas" className="space-y-4">
						{cargandoPolizas ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin" />
							</div>
						) : polizas.length === 0 ? (
							<p className="text-gray-500 text-center py-8">
								{origenUsuario?.full_name} no tiene pólizas asignadas
							</p>
						) : (
							<>
								{/* Filtros: fecha de registro (La Paz) + director de cartera */}
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
									<div className="space-y-1">
										<Label htmlFor="filtro-desde">Registradas desde</Label>
										<Input
											id="filtro-desde"
											type="date"
											value={filtroDesde}
											onChange={(e) => setFiltroDesde(e.target.value)}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="filtro-hasta">Registradas hasta</Label>
										<Input
											id="filtro-hasta"
											type="date"
											value={filtroHasta}
											onChange={(e) => setFiltroHasta(e.target.value)}
										/>
									</div>
									<div className="space-y-1">
										<Label>Director de cartera</Label>
										<Select value={filtroDirector} onValueChange={setFiltroDirector}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">Todos</SelectItem>
												{directores.map(([id, nombre]) => (
													<SelectItem key={id} value={id}>
														{nombre}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									{hayFiltros && (
										<Button variant="outline" size="sm" onClick={limpiarFiltros}>
											Limpiar filtros
										</Button>
									)}
								</div>

								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Checkbox
											checked={
												polizasFiltradas.length > 0 &&
												polizasFiltradas.every((p) => polizasSeleccionadas.has(p.id))
											}
											onCheckedChange={toggleAllPolizas}
										/>
										<span className="text-sm text-muted-foreground">
											{polizasSeleccionadas.size} seleccionadas · {polizasFiltradas.length}{" "}
											{hayFiltros ? "filtradas" : "en total"}
											{hayFiltros ? ` de ${polizas.length}` : ""}
										</span>
									</div>
									<Button
										onClick={() => iniciarTransferencia("polizas")}
										disabled={polizasSeleccionadas.size === 0 || !destinoId}
										size="sm"
									>
										Transferir seleccionadas
									</Button>
								</div>

								<div className="border rounded-md overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="p-2 w-10"></th>
												<th className="p-2 text-left">N° Póliza</th>
												<th className="p-2 text-left">Cliente</th>
												<th className="p-2 text-left">Ramo</th>
												<th className="p-2 text-left">Compañía</th>
												<th className="p-2 text-left">Director</th>
												<th className="p-2 text-left">Estado</th>
												<th className="p-2 text-left">F. Registro</th>
												<th className="p-2 text-left">Vigencia</th>
											</tr>
										</thead>
										<tbody>
											{polizasFiltradas.map((p) => (
												<tr key={p.id} className="border-t hover:bg-gray-50">
													<td className="p-2 text-center">
														<Checkbox
															checked={polizasSeleccionadas.has(p.id)}
															onCheckedChange={() => togglePoliza(p.id)}
														/>
													</td>
													<td className="p-2 font-mono">{p.numero_poliza}</td>
													<td className="p-2">{p.cliente_nombre}</td>
													<td className="p-2">{p.ramo}</td>
													<td className="p-2">{p.compania_nombre}</td>
													<td className="p-2">{p.director_cartera_nombre}</td>
													<td className="p-2">
														<Badge
															variant={p.estado === "activa" ? "default" : "secondary"}
														>
															{p.estado}
														</Badge>
													</td>
													<td className="p-2 text-xs">{formatFechaLaPaz(p.created_at)}</td>
													<td className="p-2 text-xs">
														{p.inicio_vigencia} - {p.fin_vigencia}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}
					</TabsContent>

					<TabsContent value="clientes" className="space-y-4">
						{cargandoClientes ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin" />
							</div>
						) : clientes.length === 0 ? (
							<p className="text-gray-500 text-center py-8">
								{origenUsuario?.full_name} no tiene clientes asignados
							</p>
						) : (
							<>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Checkbox
											checked={clientesSeleccionados.size === clientes.length}
											onCheckedChange={toggleAllClientes}
										/>
										<span className="text-sm text-gray-600">
											{clientesSeleccionados.size} de {clientes.length} seleccionados
										</span>
									</div>
									<Button
										onClick={() => iniciarTransferencia("clientes")}
										disabled={clientesSeleccionados.size === 0 || !destinoId}
										size="sm"
									>
										Transferir seleccionados
									</Button>
								</div>

								<div className="border rounded-md overflow-x-auto">
									<table className="w-full text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="p-2 w-10"></th>
												<th className="p-2 text-left">Nombre</th>
												<th className="p-2 text-left">Tipo</th>
												<th className="p-2 text-left">Documento</th>
												<th className="p-2 text-left">Estado</th>
											</tr>
										</thead>
										<tbody>
											{clientes.map((c) => (
												<tr key={c.id} className="border-t hover:bg-gray-50">
													<td className="p-2 text-center">
														<Checkbox
															checked={clientesSeleccionados.has(c.id)}
															onCheckedChange={() => toggleCliente(c.id)}
														/>
													</td>
													<td className="p-2">{c.nombre}</td>
													<td className="p-2">
														<Badge variant="outline">{c.client_type}</Badge>
													</td>
													<td className="p-2 font-mono">{c.documento}</td>
													<td className="p-2">
														<Badge
															variant={c.status === "active" ? "default" : "secondary"}
														>
															{c.status}
														</Badge>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}
					</TabsContent>
				</Tabs>
			)}

			{/* Dialogo de confirmacion */}
			<AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-yellow-500" />
							Confirmar transferencia
						</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							<span className="block">
								Se transferirán{" "}
								<strong>
									{transferType === "polizas"
										? `${polizasSeleccionadas.size} pólizas`
										: `${clientesSeleccionados.size} clientes`}
								</strong>{" "}
								de <strong>{origenUsuario?.full_name}</strong> a{" "}
								<strong>{destinoUsuario?.full_name}</strong>.
							</span>
							<span className="block text-yellow-600">
								Esta acción se registrará en el historial de auditoría.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="py-2">
						<Label htmlFor="motivo">Motivo (opcional)</Label>
						<Input
							id="motivo"
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							placeholder="Motivo de la transferencia..."
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={transfiriendo}>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={ejecutarTransferencia} disabled={transfiriendo}>
							{transfiriendo ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Transfiriendo...
								</>
							) : (
								"Confirmar transferencia"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
