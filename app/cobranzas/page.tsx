import { requirePermission } from "@/utils/auth/helpers";
import Dashboard from "@/components/cobranzas/Dashboard";
import { obtenerPolizasConPendientes } from "./actions";

export const metadata = {
	title: "Cobranzas — Gestión de Pagos",
	description: "Módulo de cobranzas para gestionar pagos de pólizas activas",
};

export default async function CobranzasPage() {
	await requirePermission("cobranzas.ver");

	const result = await obtenerPolizasConPendientes();

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-foreground">Cobranzas</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Gestión de pagos y cuotas de pólizas activas
				</p>
			</div>

			{result.success && result.data ? (
				<Dashboard polizasIniciales={result.data.polizas} statsIniciales={result.data.stats} />
			) : (
				<div className="border border-destructive/30 rounded-md p-4 text-destructive bg-destructive/5">
					<p className="font-medium text-sm">Error al cargar datos de cobranzas</p>
					<p className="text-xs text-muted-foreground mt-1">{result.error}</p>
				</div>
			)}
		</div>
	);
}
