"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Users2, UserCog, CalendarClock, Power, Trash2, AlertTriangle, Search } from "lucide-react";
import { captureError } from "@/utils/sentry";
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
	listarVentanas,
	listarUsuariosParaVentana,
	crearVentana,
	extenderVentana,
	cerrarVentana,
	eliminarVentana,
	ROLES_VENTANA,
	type VentanaRow,
	type UsuarioOption,
} from "@/app/admin/excepciones/actions";
import { formatFechaLaPaz } from "@/utils/formatters";

const ROL_LABEL: Record<string, string> = {
	comercial: "Comercial",
	agente: "Agente",
};

type Tipo = "rol" | "usuario";

export default function VentanasExcepcionPanel() {
	const [ventanas, setVentanas] = useState<VentanaRow[]>([]);
	const [cargando, setCargando] = useState(true);
	const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);

	// Formulario de creación
	const [motivo, setMotivo] = useState("");
	const [tipo, setTipo] = useState<Tipo>("rol");
	const [rolesSel, setRolesSel] = useState<Set<string>>(new Set(["comercial", "agente"]));
	const [usuariosSel, setUsuariosSel] = useState<Set<string>>(new Set());
	const [busquedaUsuario, setBusquedaUsuario] = useState("");
	const [dias, setDias] = useState(3);
	const [creando, setCreando] = useState(false);

	// Diálogos
	const [extender, setExtender] = useState<{ ventana: VentanaRow; dias: number } | null>(null);
	const [confirmar, setConfirmar] = useState<{ ventana: VentanaRow; accion: "cerrar" | "eliminar" } | null>(null);
	const [procesando, setProcesando] = useState(false);

	async function recargar() {
		setCargando(true);
		const result = await listarVentanas();
		setCargando(false);
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		setVentanas(result.data);
	}

	useEffect(() => {
		let activo = true;
		// Carga inicial: `cargando` ya arranca en true, así que no seteamos estado
		// de forma síncrona dentro del efecto (solo tras el await).
		(async () => {
			const result = await listarVentanas();
			if (!activo) return;
			setCargando(false);
			if (!result.success) {
				toast.error(result.error);
				return;
			}
			setVentanas(result.data);
		})();
		listarUsuariosParaVentana().then((r) => {
			if (activo && r.success) setUsuarios(r.data);
		});
		return () => {
			activo = false;
		};
	}, []);

	function toggleRol(rol: string) {
		setRolesSel((prev) => {
			const next = new Set(prev);
			if (next.has(rol)) next.delete(rol);
			else next.add(rol);
			return next;
		});
	}

	function toggleUsuario(id: string) {
		setUsuariosSel((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	async function onCrear(e: React.FormEvent) {
		e.preventDefault();
		setCreando(true);
		try {
			const result = await crearVentana({
				motivo,
				tipo,
				roles: [...rolesSel],
				usuarios: [...usuariosSel],
				dias,
			});
			if (!result.success) {
				toast.error(result.error);
				return;
			}
			toast.success("Ventana creada.");
			setMotivo("");
			setUsuariosSel(new Set());
			setBusquedaUsuario("");
			setDias(3);
			await recargar();
		} catch (err) {
			captureError(err, "VentanasExcepcionPanel.crear");
			toast.error("Error inesperado al crear la ventana.");
		} finally {
			setCreando(false);
		}
	}

	async function onExtender() {
		if (!extender) return;
		setProcesando(true);
		try {
			const result = await extenderVentana(extender.ventana.id, extender.dias);
			if (!result.success) {
				toast.error(result.error);
				return;
			}
			toast.success("Ventana extendida.");
			setExtender(null);
			await recargar();
		} catch (err) {
			captureError(err, "VentanasExcepcionPanel.extender");
			toast.error("Error inesperado.");
		} finally {
			setProcesando(false);
		}
	}

	async function onConfirmar() {
		if (!confirmar) return;
		setProcesando(true);
		try {
			const { ventana, accion } = confirmar;
			const result = accion === "cerrar" ? await cerrarVentana(ventana.id) : await eliminarVentana(ventana.id);
			if (!result.success) {
				toast.error(result.error);
				return;
			}
			toast.success(accion === "cerrar" ? "Ventana cerrada." : "Ventana eliminada.");
			setConfirmar(null);
			await recargar();
		} catch (err) {
			captureError(err, "VentanasExcepcionPanel.accion");
			toast.error("Error inesperado.");
		} finally {
			setProcesando(false);
		}
	}

	const usuariosFiltrados = usuarios.filter((u) => u.nombre.toLowerCase().includes(busquedaUsuario.toLowerCase()));

	return (
		<div className="space-y-8">
			{/* ── Crear ventana ─────────────────────────────────────────── */}
			<form onSubmit={onCrear} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="motivo">Motivo</Label>
					<Input
						id="motivo"
						value={motivo}
						onChange={(e) => setMotivo(e.target.value)}
						placeholder="Ej: Carga retroactiva de ~100 clientes antiguos sin documentos"
						autoComplete="off"
					/>
				</div>

				{/* Tipo de alcance */}
				<div className="space-y-2">
					<Label>Alcance</Label>
					<div className="flex gap-2">
						<Button
							type="button"
							variant={tipo === "rol" ? "default" : "outline"}
							size="sm"
							onClick={() => setTipo("rol")}
						>
							<Users2 className="h-4 w-4 mr-2" />
							Por rol
						</Button>
						<Button
							type="button"
							variant={tipo === "usuario" ? "default" : "outline"}
							size="sm"
							onClick={() => setTipo("usuario")}
						>
							<UserCog className="h-4 w-4 mr-2" />
							Por usuario
						</Button>
					</div>
				</div>

				{tipo === "rol" ? (
					<div className="space-y-2">
						<Label>Roles cubiertos</Label>
						<div className="flex flex-wrap gap-4">
							{ROLES_VENTANA.map((rol) => (
								<label key={rol} className="flex items-center gap-2 cursor-pointer text-sm">
									<Checkbox checked={rolesSel.has(rol)} onCheckedChange={() => toggleRol(rol)} />
									<span>{ROL_LABEL[rol] ?? rol}</span>
								</label>
							))}
						</div>
						<p className="text-xs text-muted-foreground">
							Cubre a todos los usuarios de los roles marcados.
						</p>
					</div>
				) : (
					<div className="space-y-2">
						<Label>Usuarios cubiertos</Label>
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								value={busquedaUsuario}
								onChange={(e) => setBusquedaUsuario(e.target.value)}
								placeholder="Buscar usuario..."
								className="pl-8"
								autoComplete="off"
							/>
						</div>
						<div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
							{usuariosFiltrados.length === 0 ? (
								<p className="p-3 text-sm text-muted-foreground">Sin usuarios.</p>
							) : (
								usuariosFiltrados.map((u) => (
									<label
										key={u.id}
										className="flex items-center gap-2 p-2.5 cursor-pointer text-sm hover:bg-secondary"
									>
										<Checkbox
											checked={usuariosSel.has(u.id)}
											onCheckedChange={() => toggleUsuario(u.id)}
										/>
										<span className="flex-1">{u.nombre}</span>
										<Badge variant="outline" className="text-xs">
											{ROL_LABEL[u.role] ?? u.role}
										</Badge>
									</label>
								))
							)}
						</div>
						{usuariosSel.size > 0 && (
							<p className="text-xs text-muted-foreground">
								{usuariosSel.size} usuario(s) seleccionado(s).
							</p>
						)}
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="dias">Duración (días)</Label>
					<Input
						id="dias"
						type="number"
						min={1}
						max={90}
						value={dias}
						onChange={(e) => setDias(Number(e.target.value))}
						className="w-32"
					/>
				</div>

				<Button type="submit" disabled={creando}>
					{creando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
					Crear ventana
				</Button>
			</form>

			{/* ── Lista de ventanas ─────────────────────────────────────── */}
			<div className="space-y-3">
				<h3 className="text-sm font-medium text-foreground">Ventanas registradas</h3>
				{cargando ? (
					<div className="flex items-center justify-center py-8 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin mr-2" />
						Cargando...
					</div>
				) : ventanas.length === 0 ? (
					<p className="text-sm text-muted-foreground py-6 text-center">No hay ventanas registradas.</p>
				) : (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Motivo</TableHead>
									<TableHead>Alcance</TableHead>
									<TableHead>Vence</TableHead>
									<TableHead className="text-center">Estado</TableHead>
									<TableHead className="text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{ventanas.map((v) => (
									<TableRow key={v.id}>
										<TableCell className="max-w-xs">
											<div className="font-medium truncate" title={v.motivo}>
												{v.motivo}
											</div>
											{v.creador_nombre && (
												<div className="text-xs text-muted-foreground">
													por {v.creador_nombre}
												</div>
											)}
										</TableCell>
										<TableCell>
											{v.usuarios && v.usuarios.length > 0 ? (
												<div
													className="text-sm"
													title={v.usuarios_nombres.map((u) => u.nombre).join(", ")}
												>
													<Badge variant="secondary">{v.usuarios.length} usuario(s)</Badge>
												</div>
											) : (
												<div className="flex flex-wrap gap-1">
													{v.roles.map((r) => (
														<Badge key={r} variant="outline">
															{ROL_LABEL[r] ?? r}
														</Badge>
													))}
												</div>
											)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatFechaLaPaz(v.fin)}
										</TableCell>
										<TableCell className="text-center">
											{v.vigente ? (
												<Badge className="bg-success/15 text-success border-success/30">
													Vigente
												</Badge>
											) : v.activo ? (
												<Badge variant="outline" className="text-muted-foreground">
													Expirada
												</Badge>
											) : (
												<Badge variant="secondary">Inactiva</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setExtender({ ventana: v, dias: 3 })}
													title="Reabrir / extender"
												>
													<CalendarClock className="h-4 w-4" />
												</Button>
												{v.vigente && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setConfirmar({ ventana: v, accion: "cerrar" })}
														title="Cerrar ahora"
													>
														<Power className="h-4 w-4" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive hover:text-destructive"
													onClick={() => setConfirmar({ ventana: v, accion: "eliminar" })}
													title="Eliminar"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			{/* ── Diálogo extender ──────────────────────────────────────── */}
			<AlertDialog open={!!extender} onOpenChange={(o) => !procesando && !o && setExtender(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<CalendarClock className="h-5 w-5 text-primary" />
							Reabrir / extender ventana
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3 text-left">
								<p>
									La ventana quedará activa y vencerá dentro de los días indicados a partir de ahora.
								</p>
								<div className="space-y-2">
									<Label htmlFor="extender-dias">Días desde ahora</Label>
									<Input
										id="extender-dias"
										type="number"
										min={1}
										max={90}
										value={extender?.dias ?? 3}
										onChange={(e) =>
											setExtender((prev) =>
												prev ? { ...prev, dias: Number(e.target.value) } : prev,
											)
										}
										className="w-32"
										disabled={procesando}
									/>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								onExtender();
							}}
							disabled={procesando}
						>
							{procesando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
							Confirmar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Diálogo cerrar / eliminar ─────────────────────────────── */}
			<AlertDialog open={!!confirmar} onOpenChange={(o) => !procesando && !o && setConfirmar(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							{confirmar?.accion === "cerrar" ? "Cerrar ventana" : "Eliminar ventana"}
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2 text-left">
								{confirmar?.accion === "cerrar" ? (
									<p>
										La ventana dejará de aplicar de inmediato. No se borra nada y podés reabrirla
										luego.
									</p>
								) : (
									<p>
										Se elimina la ventana permanentemente. Bloqueado si hay clientes cargados bajo
										ella.
									</p>
								)}
								{confirmar && (
									<div className="rounded-md bg-muted p-3 text-sm">
										<strong>{confirmar.ventana.motivo}</strong>
									</div>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={procesando}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								onConfirmar();
							}}
							disabled={procesando}
							className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
						>
							{procesando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
							{confirmar?.accion === "cerrar" ? "Cerrar" : "Eliminar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
