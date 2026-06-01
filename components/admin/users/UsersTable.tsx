"use client";

import { useMemo, useState } from "react";
import { Users, Calendar, MoreHorizontal, Shield, User, Search, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteUserDialog } from "@/components/ui/delete-user-dialog";
import { SendResetPasswordDialog } from "@/components/admin/send-reset-password-dialog";
import { UserEditDialog } from "@/components/admin/users/UserEditDialog";

export interface AdminUserRow {
	id: string;
	email: string;
	role: string;
	full_name: string | null;
	cargo: string | null;
	telefono: string | null;
	acronimo: string | null;
	porcentaje_comision: number | null;
	firma_url: string | null;
	created_at: string;
	updated_at: string;
}

const roleLabels: Record<string, string> = {
	admin: "Administrador",
	usuario: "Usuario",
	comercial: "Comercial",
	agente: "Agente",
	cobranza: "Cobranza",
	siniestros: "Siniestros",
	uif: "UIF",
	invitado: "Invitado",
	desactivado: "Desactivado",
};

function getInitials(user: AdminUserRow): string {
	if (user.full_name && user.full_name.trim()) {
		return user.full_name
			.trim()
			.split(/\s+/)
			.map((w) => w[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}
	return user.email.split("@")[0].slice(0, 2).toUpperCase();
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return users;
		return users.filter(
			(u) =>
				(u.full_name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
		);
	}, [users, query]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Todos los Usuarios
				</CardTitle>
				<CardDescription>Lista completa de usuarios registrados y sus detalles</CardDescription>
				<div className="relative mt-3 max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar por nombre o correo…"
						className="pl-9 h-9"
					/>
				</div>
			</CardHeader>
			<CardContent>
				{filtered.length > 0 ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Usuario</TableHead>
								<TableHead>Rol</TableHead>
								<TableHead>Firma</TableHead>
								<TableHead>Registrado</TableHead>
								<TableHead>Última Actualización</TableHead>
								<TableHead className="w-[70px]">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map((user) => {
								const RoleIcon = user.role === "admin" ? Shield : User;
								return (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="h-9 w-9">
													<AvatarFallback className="text-xs">
														{getInitials(user)}
													</AvatarFallback>
												</Avatar>
												<div className="space-y-1">
													<p className="text-sm font-medium leading-none">
														{user.full_name || (
															<span className="text-muted-foreground italic">
																Sin nombre
															</span>
														)}
													</p>
													<p className="text-xs text-muted-foreground">{user.email}</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant={user.role === "admin" ? "default" : "secondary"}
												className="flex items-center gap-1 w-fit"
											>
												<RoleIcon className="h-3 w-3" />
												{roleLabels[user.role] ?? user.role}
											</Badge>
										</TableCell>
										<TableCell>
											{user.firma_url ? (
												<span className="inline-flex items-center gap-1 text-xs text-accent">
													<CheckCircle2 className="h-3.5 w-3.5" />
													Cargada
												</span>
											) : (
												<span className="text-xs text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Calendar className="h-4 w-4" />
												{new Date(user.created_at).toLocaleDateString()}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm text-muted-foreground">
												{new Date(user.updated_at).toLocaleDateString()}
											</div>
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<UserEditDialog user={user} />
													<SendResetPasswordDialog
														user={{ id: user.id, email: user.email }}
													/>
													<DeleteUserDialog
														user={{
															id: user.id,
															email: user.email,
															role: user.role,
														}}
													/>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				) : (
					<div className="text-center py-8">
						<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<p className="text-sm text-muted-foreground">
							{query ? "No hay usuarios que coincidan con la búsqueda" : "No se encontraron usuarios"}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
