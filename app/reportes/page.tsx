import { redirect } from "next/navigation";
import { checkPermission } from "@/utils/auth/helpers";
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
	const [exportar, amlc] = await Promise.all([
		checkPermission("gerencia.exportar"),
		checkPermission("gerencia.amlc"),
	]);

	if (!exportar.allowed && !amlc.allowed) {
		redirect("/unauthorized");
	}

	// Cargar datos de filtros solo si el usuario los va a usar (gerencia.exportar)
	const [regionalesRes, companiasRes, equiposRes, directoresRes] = exportar.allowed
		? await Promise.all([
				obtenerRegionales(),
				obtenerCompanias(),
				obtenerEquiposParaFiltro(),
				obtenerDirectoresParaFiltro(),
			])
		: [
				{ success: true as const, data: [] },
				{ success: true as const, data: [] },
				{ success: true as const, data: [] },
				{ success: true as const, data: [] },
			];

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
				{exportar.allowed && (
					<>
						<ExportarProduccion regionales={regionales} companias={companias} equipos={equipos} />
						<ExportarContable regionales={regionales} companias={companias} equipos={equipos} />
						<ExportarComisionesDirector
							regionales={regionales}
							companias={companias}
							equipos={equipos}
							directores={directores}
						/>
					</>
				)}
				{amlc.allowed && <ExportarAMLC />}
			</div>
		</div>
	);
}
