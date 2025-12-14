// app/admin/roles/page.tsx
import { requireAdmin } from "@/utils/auth/helpers";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Crown, Calendar } from "lucide-react";
import { UserRoleManager } from "@/app/admin/roles/components/UserRoleManager";
import { VALID_ROLES, getRoleConfig, getRoleLabel } from "@/utils/auth/roles";

export default async function AdminRolesPage() {
	// Ensure user is admin
	const adminProfile = await requireAdmin();
	const supabase = await createClient();

	// Get all users with their profiles
	const { data: users, error } = await supabase
		.from("profiles")
		.select("id, email, role, created_at, updated_at")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching users:", error);
		return (
			<div className="flex-1 w-full flex flex-col gap-8">
				<div className="w-full">
					<Card>
						<CardHeader>
							<CardTitle className="text-red-600">Error al Cargar Usuarios</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								No se pudo cargar los datos de usuario. Por favor verifica tu conexión a la base de datos y permisos.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// Calculate statistics
	const totalUsers = users?.length || 0;
	// Generate role counts dynamically
	const roleCounts = VALID_ROLES.reduce((acc, role) => {
		acc[role] = users?.filter((user) => user.role === role).length || 0;
		return acc;
	}, {} as Record<string, number>);

	return (
		<div className="flex-1 w-full flex flex-col gap-8">
			{/* Header */}
			<div className="w-full">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Gestión de Roles de Usuario</h1>
						<p className="text-gray-600 mt-1">Administrar permisos y roles de usuarios</p>
					</div>
					<Badge variant="secondary" className="px-3 py-1">
						<Shield className="w-4 h-4 mr-1" />
						Panel de Admin
					</Badge>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
				{/* Total Users Card */}
				<Card className="bg-gradient-to-br from-purple-50 to-white">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
						<CardTitle className="text-xs font-medium">Total</CardTitle>
						<Users className="h-3 w-3 text-purple-600" />
					</CardHeader>
					<CardContent className="pb-3">
						<div className="text-xl font-bold text-purple-600">{totalUsers}</div>
					</CardContent>
				</Card>

				{/* Dynamic Role Cards */}
				{VALID_ROLES.map((role) => {
					const config = getRoleConfig(role);
					const Icon = config.icon;
					return (
						<Card key={role} className={`bg-gradient-to-br ${config.colorClasses.gradient}`}>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
								<CardTitle className="text-xs font-medium">{getRoleLabel(role)}</CardTitle>
								<Icon className={`h-3 w-3 ${config.colorClasses.text}`} />
							</CardHeader>
							<CardContent className="pb-3">
								<div className={`text-xl font-bold ${config.colorClasses.text}`}>
									{roleCounts[role]}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Users Table */}
			<Card>
				<CardHeader>
					<CardTitle>Todos los Usuarios</CardTitle>
					<CardDescription>Ver y administrar roles de usuario. Los cambios se aplican inmediatamente.</CardDescription>
				</CardHeader>
				<CardContent>
					{users && users.length > 0 ? (
						<div className="space-y-4">
							{users.map((user) => (
								<div
									key={user.id}
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
								>
									<div className="space-y-1">
										<div className="flex items-center space-x-3">
											<div className="font-medium text-sm">{user.email}</div>
											<Badge
												variant={user.role === "admin" ? "default" : "secondary"}
												className="text-xs"
											>
												{(() => {
													const config = getRoleConfig(user.role);
													const Icon = config.icon;
													return (
														<>
															<Icon className="w-3 h-3 mr-1" />
															{getRoleLabel(user.role)}
														</>
													);
												})()}
											</Badge>
											{user.id === adminProfile.id && (
												<Badge variant="outline" className="text-xs">
													Tú
												</Badge>
											)}
										</div>
										<div className="flex items-center space-x-4 text-xs text-muted-foreground">
											<div className="flex items-center space-x-1">
												<Calendar className="w-3 h-3" />
												<span>Registrado: {new Date(user.created_at).toLocaleDateString()}</span>
											</div>
											<div>
												<span>Actualizado: {new Date(user.updated_at).toLocaleDateString()}</span>
											</div>
										</div>
									</div>

									<div className="flex items-center space-x-2">
										<UserRoleManager
											userId={user.id}
											currentRole={user.role}
											userEmail={user.email}
											isCurrentUser={user.id === adminProfile.id}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<Users className="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 className="mt-2 text-sm font-semibold text-muted-foreground">No se encontraron usuarios</h3>
							<p className="mt-1 text-sm text-muted-foreground">Todavía no hay usuarios en el sistema.</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Security Notice */}
			<Card className="border-yellow-200 bg-yellow-50">
				<CardHeader>
					<CardTitle className="text-yellow-800 text-sm flex items-center">
						<Shield className="w-4 h-4 mr-2" />
						Aviso de Seguridad
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-yellow-700 space-y-2">
						<p>• No puedes remover tus propios privilegios de admin para prevenir bloqueo del sistema</p>
						<p>• Todos los cambios de roles son registrados y auditados automáticamente</p>
						<p>• Los triggers de base de datos previenen intentos de escalación no autorizados</p>
						<p>• Los cambios se aplican inmediatamente en todas las sesiones de usuario</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
