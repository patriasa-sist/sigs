import { requirePermission } from "@/utils/auth/helpers";
import { obtenerUsuariosConDatos } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft } from "lucide-react";
import TransferenciasDatos from "@/components/admin/TransferenciasDatos";

export const metadata = {
	title: "Transferencia de Datos - Administración",
	description: "Transferir pólizas y clientes entre usuarios",
};

export default async function TransferenciasPage() {
	await requirePermission("admin.equipos");

	const usuariosResult = await obtenerUsuariosConDatos();

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<ArrowRightLeft className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Transferencia de Datos</h1>
					<p className="text-gray-500">
						Transfiere pólizas y clientes entre usuarios o equipos
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Transferencias</CardTitle>
				</CardHeader>
				<CardContent>
					{usuariosResult.success ? (
						<TransferenciasDatos usuarios={usuariosResult.data} />
					) : (
						<p className="text-red-600">{usuariosResult.error}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
