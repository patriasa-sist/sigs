import { requirePermission } from "@/utils/auth/helpers";
import { obtenerEquipos, obtenerUsuariosDisponibles } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import GestionEquipos from "./components/GestionEquipos";

export const metadata = {
	title: "Gestión de Equipos - Administración",
	description: "Gestionar equipos de trabajo y asignar miembros",
};

export default async function EquiposPage() {
	await requirePermission("admin.equipos");

	const [equiposResult, usuariosResult] = await Promise.all([
		obtenerEquipos(),
		obtenerUsuariosDisponibles(),
	]);

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<Users className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Gestión de Equipos</h1>
					<p className="text-gray-500">
						Crea equipos y asigna agentes y comerciales para compartir datos entre miembros
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Equipos</CardTitle>
				</CardHeader>
				<CardContent>
					{equiposResult.success && usuariosResult.success ? (
						<GestionEquipos
							equiposIniciales={equiposResult.data}
							usuariosDisponibles={usuariosResult.data}
						/>
					) : (
						<p className="text-red-600">
							{(!equiposResult.success && equiposResult.error) ||
								(!usuariosResult.success && usuariosResult.error)}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
