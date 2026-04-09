import { requirePermission } from "@/utils/auth/helpers";
import ExportarProduccion from "@/components/gerencia/ExportarProduccion";
import ExportarContable from "@/components/gerencia/ExportarContable";
import ExportarAMLC from "@/components/gerencia/ExportarAMLC";
import ExportarComisionesDirector from "@/components/gerencia/ExportarComisionesDirector";
import {
	obtenerRegionales,
	obtenerCompanias,
	obtenerEquiposParaFiltro,
	obtenerDirectoresParaFiltro,
} from "@/app/gerencia/reportes/actions";

export default async function ReportesPage() {
	await requirePermission("gerencia.exportar");

	// Cargar todos los datos de filtros una sola vez en el servidor
	const [regionalesRes, companiasRes, equiposRes, directoresRes] = await Promise.all([
		obtenerRegionales(),
		obtenerCompanias(),
		obtenerEquiposParaFiltro(),
		obtenerDirectoresParaFiltro(),
	]);

	const regionales = regionalesRes.success ? regionalesRes.data : [];
	const companias = companiasRes.success ? companiasRes.data : [];
	const equipos = equiposRes.success ? equiposRes.data : [];
	const directores = directoresRes.success ? directoresRes.data : [];

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold text-foreground">Reportes</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Genera reportes consolidados para análisis y gestión
				</p>
			</div>

			<div className="space-y-6">
				<ExportarProduccion regionales={regionales} companias={companias} equipos={equipos} />
				<ExportarContable regionales={regionales} companias={companias} equipos={equipos} />
				<ExportarComisionesDirector
					regionales={regionales}
					companias={companias}
					equipos={equipos}
					directores={directores}
				/>
				<ExportarAMLC />
			</div>
		</div>
	);
}
