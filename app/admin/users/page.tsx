import { createClient } from "@/utils/supabase/server";
import { Users, Mail, Calendar, MoreHorizontal, Shield, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteUserDialog } from "@/components/ui/delete-user-dialog";

export default async function ManageUsersPage() {
	const supabase = await createClient();

	// Get all users with profile information
	const { data: users, error } = await supabase
		.from("profiles")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching users:", error);
	}

	// Get user statistics
	const [{ count: totalUsers }, { count: adminUsers }, { count: regularUsers }] = await Promise.all([
		supabase.from("profiles").select("*", { count: "exact", head: true }),
		supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
		supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
	]);

	const getInitials = (email: string) => {
		return email.split("@")[0].slice(0, 2).toUpperCase();
	};

	const getRoleBadgeVariant = (role: string) => {
		return role === "admin" ? "default" : "secondary";
	};

	const getRoleIcon = (role: string) => {
		return role === "admin" ? Shield : User;
	};

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
					<p className="text-gray-600 mt-1">Administrar información de usuarios</p>
				</div>
			</div>

			{/* User Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalUsers || 0}</div>
						<p className="text-xs text-muted-foreground">Todos los usuarios registrados</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Administradores</CardTitle>
						<Shield className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{adminUsers || 0}</div>
						<p className="text-xs text-muted-foreground">Usuarios administradores</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Usuarios Regulares</CardTitle>
						<User className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{regularUsers || 0}</div>
						<p className="text-xs text-muted-foreground">Usuarios estándar</p>
					</CardContent>
				</Card>
			</div>

			{/* Users Table */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Todos los Usuarios
					</CardTitle>
					<CardDescription>Lista completa de usuarios registrados y sus detalles</CardDescription>
				</CardHeader>
				<CardContent>
					{users && users.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Usuario</TableHead>
									<TableHead>Rol</TableHead>
									<TableHead>Registrado</TableHead>
									<TableHead>Última Actualización</TableHead>
									<TableHead className="w-[70px]">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((user) => {
									const RoleIcon = getRoleIcon(user.role);
									return (
										<TableRow key={user.id}>
											<TableCell>
												<div className="flex items-center gap-3">
													<Avatar className="h-9 w-9">
														<AvatarFallback className="text-xs">
															{getInitials(user.email)}
														</AvatarFallback>
													</Avatar>
													<div className="space-y-1">
														<p className="text-sm font-medium leading-none">{user.email}</p>
														<p className="text-xs text-muted-foreground">
															ID: {user.id.slice(0, 8)}...
														</p>
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant={getRoleBadgeVariant(user.role)}
													className="flex items-center gap-1 w-fit"
												>
													<RoleIcon className="h-3 w-3" />
													{user.role}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2 text-sm">
													<Calendar className="h-4 w-4 text-muted-foreground" />
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
														<DropdownMenuItem>
															<Mail className="h-4 w-4 mr-2" />
															Enviar Mensaje
														</DropdownMenuItem>
														<DropdownMenuItem>Ver Perfil</DropdownMenuItem>
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
							<p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
