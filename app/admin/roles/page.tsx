// app/admin/roles/page.tsx
import { requireAdmin } from "@/utils/auth/helpers";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Calendar } from "lucide-react";
import { UserRoleManager } from "@/app/admin/roles/components/UserRoleManager";
import { VALID_ROLES, getRoleConfig, getRoleLabel } from "@/utils/auth/roles";

export default async function AdminRolesPage() {
	const adminProfile = await requireAdmin();
	const supabase = await createClient();

	const { data: users, error } = await supabase
		.from("profiles")
		.select("id, email, role, created_at, updated_at, full_name")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching users:", error);
		return (
			<div className="flex-1 w-full flex flex-col gap-8">
				<Card>
					<CardHeader>
						<CardTitle className="text-destructive">Error al Cargar Usuarios</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							No se pudo cargar los datos de usuario. Verifica la conexión a la base de datos.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const totalUsers = users?.length || 0;
	const roleCounts = VALID_ROLES.reduce((acc, role) => {
		acc[role] = users?.filter((u) => u.role === role).length || 0;
		return acc;
	}, {} as Record<string, number>);

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Gestión de Roles</h1>
					<p className="text-muted-foreground text-sm mt-1">Administrar permisos y roles de usuarios</p>
				</div>
				<Badge variant="secondary" className="px-3 py-1">
					<Shield className="w-4 h-4 mr-1" />
					Panel de Admin
				</Badge>
			</div>

			{/* Compact stats bar */}
			<Card>
				<CardContent className="py-4 px-5">
					<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
						{/* Total */}
						<div className="flex items-center gap-2">
							<span className="text-2xl font-semibold text-foreground">{totalUsers}</span>
							<span className="text-xs text-muted-foreground leading-tight">
								usuarios<br />en total
							</span>
						</div>

						<div className="hidden sm:block h-8 w-px bg-border" />

						{/* Per-role counts */}
						{VALID_ROLES.map((role) => {
							const config = getRoleConfig(role);
							const Icon = config.icon;
							return (
								<div key={role} className="flex items-center gap-1.5 min-w-0">
									<Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									<span className="text-sm font-semibold text-foreground">
										{roleCounts[role]}
									</span>
									<span className="text-xs text-muted-foreground truncate">
										{getRoleLabel(role)}
									</span>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{/* Users Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Todos los Usuarios</CardTitle>
					<CardDescription>Los cambios de rol se aplican inmediatamente.</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{users && users.length > 0 ? (
						<div className="divide-y divide-border">
							{users.map((user) => {
								const config = getRoleConfig(user.role);
								const Icon = config.icon;
								return (
									<div
										key={user.id}
										className="flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors"
									>
										{/* Left: user info */}
										<div className="flex items-center gap-3 min-w-0">
											<div className="flex flex-col min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													{user.full_name ? (
														<span className="text-sm font-medium text-foreground truncate">
															{user.full_name}
														</span>
													) : (
														<span className="text-sm font-medium text-muted-foreground italic truncate">
															Sin nombre
														</span>
													)}
													{user.id === adminProfile.id && (
														<Badge variant="outline" className="text-xs shrink-0">
															Tú
														</Badge>
													)}
												</div>
												<div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
													<span className="truncate">{user.email}</span>
													<span className="shrink-0 flex items-center gap-1">
														<Calendar className="h-3 w-3" />
														{new Date(user.created_at).toLocaleDateString("es-BO")}
													</span>
												</div>
											</div>
										</div>

										{/* Right: current badge + selector */}
										<div className="flex items-center gap-3 shrink-0">
											<Badge variant="secondary" className="text-xs hidden sm:flex items-center gap-1">
												<Icon className="h-3 w-3" />
												{getRoleLabel(user.role)}
											</Badge>
											<UserRoleManager
												userId={user.id}
												currentRole={user.role}
												userEmail={user.email}
												isCurrentUser={user.id === adminProfile.id}
											/>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="text-center py-12">
							<Users className="mx-auto h-10 w-10 text-muted-foreground" />
							<p className="mt-3 text-sm text-muted-foreground">No se encontraron usuarios</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Security Notice */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
						<Shield className="w-4 h-4" />
						Aviso de Seguridad
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
						<li>No puedes remover tus propios privilegios de admin</li>
						<li>Todos los cambios de roles son registrados automáticamente</li>
						<li>Los cambios se aplican inmediatamente en todas las sesiones activas</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
