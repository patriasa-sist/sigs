import { requirePermission } from "@/utils/auth/helpers";
import { obtenerMatrizPermisos, obtenerUsuariosConPermisos } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import MatrizPermisos from "./components/MatrizPermisos";
import PermisosUsuario from "./components/PermisosUsuario";

export const metadata = {
	title: "Gestión de Permisos - Administración",
	description: "Gestionar permisos de roles y usuarios del sistema",
};

export default async function PermisosPage() {
	await requirePermission("admin.permisos");

	const [matrizResult, usuariosResult] = await Promise.all([
		obtenerMatrizPermisos(),
		obtenerUsuariosConPermisos(),
	]);

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<Shield className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Gestión de Permisos</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Configura qué puede hacer cada rol y asigna permisos extra a usuarios
					</p>
				</div>
			</div>

			{/* Matriz Rol x Permiso */}
			<Card>
				<CardHeader>
					<CardTitle>Permisos por Rol</CardTitle>
				</CardHeader>
				<CardContent>
					{matrizResult.success ? (
						<MatrizPermisos
							permissions={matrizResult.data.permissions}
							rolePermissions={matrizResult.data.rolePermissions}
						/>
					) : (
						<p className="text-red-600">{matrizResult.error}</p>
					)}
				</CardContent>
			</Card>

			{/* Permisos extra por usuario */}
			<Card>
				<CardHeader>
					<CardTitle>Permisos Extra por Usuario</CardTitle>
				</CardHeader>
				<CardContent>
					{usuariosResult.success ? (
						<PermisosUsuario
							users={usuariosResult.data}
							permissions={matrizResult.success ? matrizResult.data.permissions : []}
						/>
					) : (
						<p className="text-red-600">{usuariosResult.error}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
