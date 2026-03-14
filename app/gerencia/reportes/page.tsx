import { requirePermission } from "@/utils/auth/helpers";
import { FileSpreadsheet } from "lucide-react";
import ExportarProduccion from "@/components/gerencia/ExportarProduccion";
import ExportarContable from "@/components/gerencia/ExportarContable";

export default async function ReportesPage() {
	await requirePermission("gerencia.exportar");

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<FileSpreadsheet className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
					<p className="text-gray-600 mt-1">
						Genera reportes consolidados para análisis y gestión
					</p>
				</div>
			</div>

			{/* Reporte de Producción (nuevo) */}
			<ExportarProduccion />

			{/* Reporte Contable (ex Producción) */}
			<ExportarContable />
		</div>
	);
}
