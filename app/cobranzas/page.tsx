import { requirePermission } from "@/utils/auth/helpers";
import Dashboard from "@/components/cobranzas/Dashboard";
import { obtenerPolizasConPendientes } from "./actions";

export const metadata = {
	title: "Cobranzas - Gestión de Pagos",
	description: "Módulo de cobranzas para gestionar pagos de pólizas activas",
};

export default async function CobranzasPage() {
	await requirePermission("cobranzas.ver");

	// Obtener pólizas con pagos pendientes
	const result = await obtenerPolizasConPendientes();

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Gestión de Cobranzas</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Administra los pagos de las pólizas activas y registra cobranzas
				</p>
			</div>

			{result.success && result.data ? (
				<Dashboard polizasIniciales={result.data.polizas} statsIniciales={result.data.stats} />
			) : (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
					<p className="font-semibold">Error al cargar datos</p>
					<p className="text-sm mt-1">{result.error}</p>
				</div>
			)}
		</div>
	);
}
