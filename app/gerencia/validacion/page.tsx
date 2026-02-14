import { requirePermission } from "@/utils/auth/helpers";
import PolizasPendientesTable from "@/components/gerencia/PolizasPendientesTable";
import { obtenerPolizasPendientes } from "./actions";

export const metadata = {
	title: "Validación de Pólizas - Gerencia",
	description: "Validación de pólizas pendientes de aprobación",
};

export default async function ValidacionPage() {
	await requirePermission("polizas.validar");

	// Obtener pólizas pendientes
	const result = await obtenerPolizasPendientes();

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Validación de Pólizas</h1>
				<p className="text-gray-600">
					Revisa y valida las pólizas pendientes de aprobación gerencial
				</p>
			</div>

			{result.success ? (
				<PolizasPendientesTable polizas={result.polizas || []} />
			) : (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
					<p className="font-semibold">Error al cargar pólizas</p>
					<p className="text-sm mt-1">{result.error}</p>
				</div>
			)}
		</div>
	);
}
