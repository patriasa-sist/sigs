import { requirePermission } from "@/utils/auth/helpers";
import ExportarProduccion from "@/components/gerencia/ExportarProduccion";
import ExportarContable from "@/components/gerencia/ExportarContable";
import ExportarAMLC from "@/components/gerencia/ExportarAMLC";

export default async function ReportesPage() {
	await requirePermission("gerencia.exportar");

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold text-foreground">Reportes</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Genera reportes consolidados para análisis y gestión
				</p>
			</div>

			<div className="space-y-6">
				<ExportarProduccion />
				<ExportarContable />
				<ExportarAMLC />
			</div>
		</div>
	);
}
