import { createClient } from "@/utils/supabase/server";
import { Users, Shield, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable, type AdminUserRow } from "@/components/admin/users/UsersTable";

export default async function ManageUsersPage() {
	const supabase = await createClient();

	// Traer usuarios con sus datos de firmante (una sola query)
	const { data: users, error } = await supabase
		.from("profiles")
		.select(
			"id, email, role, full_name, cargo, telefono, acronimo, porcentaje_comision, firma_url, created_at, updated_at"
		)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching users:", error);
	}

	const lista: AdminUserRow[] = (users as AdminUserRow[]) || [];
	const totalUsers = lista.length;
	const adminUsers = lista.filter((u) => u.role === "admin").length;
	const firmantesUsers = lista.filter((u) => !!u.firma_url).length;

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Gestión de Usuarios</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Administrar información de usuarios y firmas
					</p>
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
						<div className="text-2xl font-semibold text-foreground">{totalUsers}</div>
						<p className="text-xs text-muted-foreground">Todos los usuarios registrados</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Administradores</CardTitle>
						<Shield className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold text-primary">{adminUsers}</div>
						<p className="text-xs text-muted-foreground">Usuarios administradores</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Firmantes Registrados</CardTitle>
						<PenLine className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold text-accent">{firmantesUsers}</div>
						<p className="text-xs text-muted-foreground">Con firma cargada para PDFs</p>
					</CardContent>
				</Card>
			</div>

			{/* Users Table (búsqueda + edición) */}
			<UsersTable users={lista} />
		</div>
	);
}
