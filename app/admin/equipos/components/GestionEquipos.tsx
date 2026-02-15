"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UserPlus, Crown, User, X } from "lucide-react";
import { toast } from "sonner";
import {
	crearEquipo,
	eliminarEquipo,
	agregarMiembro,
	removerMiembro,
	cambiarRolMiembro,
} from "../actions";
import type { Equipo, UsuarioDisponible } from "../actions";

interface Props {
	equiposIniciales: Equipo[];
	usuariosDisponibles: UsuarioDisponible[];
}

export default function GestionEquipos({ equiposIniciales, usuariosDisponibles }: Props) {
	const [equipos, setEquipos] = useState<Equipo[]>(equiposIniciales);
	const [nuevoNombre, setNuevoNombre] = useState("");
	const [nuevaDescripcion, setNuevaDescripcion] = useState("");
	const [crearDialogOpen, setCrearDialogOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	// ========== CREAR EQUIPO ==========
	async function handleCrear() {
		if (!nuevoNombre.trim()) return;
		setLoading(true);
		const result = await crearEquipo(nuevoNombre, nuevaDescripcion);
		setLoading(false);

		if (result.success) {
			setEquipos((prev) => [
				...prev,
				{
					id: result.data.id,
					nombre: nuevoNombre.trim(),
					descripcion: nuevaDescripcion.trim() || null,
					created_at: new Date().toISOString(),
					miembros: [],
				},
			]);
			setNuevoNombre("");
			setNuevaDescripcion("");
			setCrearDialogOpen(false);
			toast.success(`Equipo "${nuevoNombre.trim()}" creado`);
		} else {
			toast.error(result.error);
		}
	}

	// ========== ELIMINAR EQUIPO ==========
	async function handleEliminar(equipoId: string, nombre: string) {
		const result = await eliminarEquipo(equipoId);
		if (result.success) {
			setEquipos((prev) => prev.filter((e) => e.id !== equipoId));
			toast.success(`Equipo "${nombre}" eliminado`);
		} else {
			toast.error(result.error);
		}
	}

	// ========== AGREGAR MIEMBRO ==========
	async function handleAgregarMiembro(equipoId: string, userId: string) {
		const result = await agregarMiembro(equipoId, userId, "miembro");
		if (result.success) {
			const usuario = usuariosDisponibles.find((u) => u.id === userId);
			if (usuario) {
				setEquipos((prev) =>
					prev.map((e) =>
						e.id === equipoId
							? {
									...e,
									miembros: [
										...e.miembros,
										{
											user_id: userId,
											rol_equipo: "miembro",
											added_at: new Date().toISOString(),
											user_email: usuario.email,
											user_full_name: usuario.full_name,
											user_role: usuario.role,
										},
									],
								}
							: e
					)
				);
			}
			toast.success("Miembro agregado");
		} else {
			toast.error(result.error);
		}
	}

	// ========== REMOVER MIEMBRO ==========
	async function handleRemoverMiembro(equipoId: string, userId: string) {
		const result = await removerMiembro(equipoId, userId);
		if (result.success) {
			setEquipos((prev) =>
				prev.map((e) =>
					e.id === equipoId
						? { ...e, miembros: e.miembros.filter((m) => m.user_id !== userId) }
						: e
				)
			);
			toast.success("Miembro removido");
		} else {
			toast.error(result.error);
		}
	}

	// ========== CAMBIAR ROL ==========
	async function handleCambiarRol(
		equipoId: string,
		userId: string,
		nuevoRol: "lider" | "miembro"
	) {
		const result = await cambiarRolMiembro(equipoId, userId, nuevoRol);
		if (result.success) {
			setEquipos((prev) =>
				prev.map((e) =>
					e.id === equipoId
						? {
								...e,
								miembros: e.miembros.map((m) =>
									m.user_id === userId ? { ...m, rol_equipo: nuevoRol } : m
								),
							}
						: e
				)
			);
			toast.success(`Rol cambiado a ${nuevoRol}`);
		} else {
			toast.error(result.error);
		}
	}

	return (
		<div className="space-y-6">
			{/* Botón crear equipo */}
			<Dialog open={crearDialogOpen} onOpenChange={setCrearDialogOpen}>
				<DialogTrigger asChild>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						Nuevo Equipo
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Crear Equipo</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium">Nombre *</label>
							<Input
								value={nuevoNombre}
								onChange={(e) => setNuevoNombre(e.target.value)}
								placeholder="Ej: Equipo Comercial A"
							/>
						</div>
						<div>
							<label className="text-sm font-medium">Descripcion</label>
							<Input
								value={nuevaDescripcion}
								onChange={(e) => setNuevaDescripcion(e.target.value)}
								placeholder="Descripcion opcional"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCrearDialogOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleCrear} disabled={loading || !nuevoNombre.trim()}>
							{loading ? "Creando..." : "Crear"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Lista de equipos */}
			{equipos.length === 0 ? (
				<div className="text-center py-12 text-gray-500">
					<p className="text-lg">No hay equipos creados</p>
					<p className="text-sm mt-1">
						Crea un equipo para agrupar agentes o comerciales y que compartan datos entre si
					</p>
				</div>
			) : (
				<div className="grid gap-4">
					{equipos.map((equipo) => (
						<EquipoCard
							key={equipo.id}
							equipo={equipo}
							usuariosDisponibles={usuariosDisponibles}
							onEliminar={handleEliminar}
							onAgregarMiembro={handleAgregarMiembro}
							onRemoverMiembro={handleRemoverMiembro}
							onCambiarRol={handleCambiarRol}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ========== EQUIPO CARD ==========

interface EquipoCardProps {
	equipo: Equipo;
	usuariosDisponibles: UsuarioDisponible[];
	onEliminar: (id: string, nombre: string) => void;
	onAgregarMiembro: (equipoId: string, userId: string) => void;
	onRemoverMiembro: (equipoId: string, userId: string) => void;
	onCambiarRol: (equipoId: string, userId: string, nuevoRol: "lider" | "miembro") => void;
}

function EquipoCard({
	equipo,
	usuariosDisponibles,
	onEliminar,
	onAgregarMiembro,
	onRemoverMiembro,
	onCambiarRol,
}: EquipoCardProps) {
	const [selectedUserId, setSelectedUserId] = useState("");

	// Filter out users already in this team
	const miembroIds = new Set(equipo.miembros.map((m) => m.user_id));
	const disponibles = usuariosDisponibles.filter((u) => !miembroIds.has(u.id));

	function handleAgregar() {
		if (!selectedUserId) return;
		onAgregarMiembro(equipo.id, selectedUserId);
		setSelectedUserId("");
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">{equipo.nombre}</CardTitle>
						{equipo.descripcion && (
							<p className="text-sm text-gray-500 mt-1">{equipo.descripcion}</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{equipo.miembros.length} miembros</Badge>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
									<Trash2 className="h-4 w-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Eliminar equipo</AlertDialogTitle>
									<AlertDialogDescription>
										Se eliminara el equipo &quot;{equipo.nombre}&quot; y todos sus miembros seran removidos.
										Los datos (polizas, clientes) no se eliminan.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => onEliminar(equipo.id, equipo.nombre)}
										className="bg-red-600 hover:bg-red-700"
									>
										Eliminar
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Miembros */}
				{equipo.miembros.length > 0 ? (
					<div className="space-y-2">
						{equipo.miembros.map((m) => (
							<div
								key={m.user_id}
								className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
							>
								<div className="flex items-center gap-3">
									{m.rol_equipo === "lider" ? (
										<Crown className="h-4 w-4 text-amber-500" />
									) : (
										<User className="h-4 w-4 text-gray-400" />
									)}
									<div>
										<span className="font-medium text-sm">
											{m.user_full_name || m.user_email}
										</span>
										{m.user_full_name && (
											<span className="text-xs text-gray-500 ml-2">{m.user_email}</span>
										)}
									</div>
									<Badge variant="secondary" className="text-xs">
										{m.user_role}
									</Badge>
								</div>
								<div className="flex items-center gap-2">
									<Select
										value={m.rol_equipo}
										onValueChange={(val) =>
											onCambiarRol(equipo.id, m.user_id, val as "lider" | "miembro")
										}
									>
										<SelectTrigger className="w-28 h-8 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="miembro">Miembro</SelectItem>
											<SelectItem value="lider">Lider</SelectItem>
										</SelectContent>
									</Select>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-gray-400 hover:text-red-500"
										onClick={() => onRemoverMiembro(equipo.id, m.user_id)}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-gray-400 py-2">Sin miembros</p>
				)}

				{/* Agregar miembro */}
				{disponibles.length > 0 && (
					<div className="flex items-center gap-2 pt-2 border-t">
						<Select value={selectedUserId} onValueChange={setSelectedUserId}>
							<SelectTrigger className="flex-1">
								<SelectValue placeholder="Seleccionar usuario..." />
							</SelectTrigger>
							<SelectContent>
								{disponibles.map((u) => (
									<SelectItem key={u.id} value={u.id}>
										<span className="flex items-center gap-2">
											{u.full_name || u.email}
											<Badge variant="outline" className="text-xs ml-1">
												{u.role}
											</Badge>
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button size="sm" onClick={handleAgregar} disabled={!selectedUserId}>
							<UserPlus className="h-4 w-4 mr-1" />
							Agregar
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
