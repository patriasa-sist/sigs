import { requirePermission, checkPermission } from "@/utils/auth/helpers";
import { BarChart3, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GerenciaDashboard from "@/components/gerencia/GerenciaDashboard";
import {
	obtenerEstadisticasProduccion,
	obtenerEstadisticasCobranzas,
	obtenerEstadisticasSiniestros,
	obtenerFiltrosGerencia,
} from "./actions";
import type { GerenciaFiltros } from "@/types/gerencia";

export const metadata = {
	title: "Gerencia - Dashboard",
	description: "Dashboard gerencial con estadísticas de producción, cobranzas y siniestros",
};

export default async function GerenciaPage() {
	await requirePermission("gerencia.ver");
	const canExportar = await checkPermission("gerencia.exportar");

	const currentYear = new Date().getFullYear();
	const defaultFiltros: GerenciaFiltros = { anio: currentYear };

	const [produccionRes, cobranzasRes, siniestrosRes, filtrosRes] = await Promise.all([
		obtenerEstadisticasProduccion(defaultFiltros),
		obtenerEstadisticasCobranzas(defaultFiltros),
		obtenerEstadisticasSiniestros(defaultFiltros),
		obtenerFiltrosGerencia(),
	]);

	// Defaults vacíos si algún fetch falla
	const emptyProduccion = {
		kpis: { prima_total_mes: 0, prima_acumulada_anio: 0, comisiones_mes: 0, cantidad_polizas_mes: 0 },
		primaPorMes: [],
		distribucionPorRamo: [],
		primaPorCompania: [],
		topResponsables: [],
	};

	const emptyCobranzas = {
		kpis: { cuotas_pendientes: 0, monto_pendiente: 0, cuotas_vencidas: 0, monto_vencido: 0, monto_cobrado_mes: 0, tasa_cobranza: 0 },
		cobradoVsPendiente: [],
		distribucionEstados: [],
		proximasCuotas: [],
	};

	const emptySiniestros = {
		kpis: { siniestros_abiertos: 0, cerrados_mes: 0, monto_reservado: 0, promedio_dias_resolucion: null },
		siniestrosPorMes: [],
		siniestrosPorRamo: [],
		siniestrosAbiertos: [],
	};

	return (
		<div className="flex-1 w-full">
			<div className="container mx-auto py-8 px-4">
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center gap-4">
						<BarChart3 className="h-8 w-8 text-primary" />
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
							<p className="text-gray-600 mt-1">
								Estadísticas de producción, cobranzas y siniestros
							</p>
						</div>
					</div>
					{canExportar && (
						<Link href="/gerencia/reportes">
							<Button variant="outline" className="gap-2">
								<FileSpreadsheet className="h-4 w-4" />
								Reportes
							</Button>
						</Link>
					)}
				</div>

				<GerenciaDashboard
					initialProduccion={produccionRes.success ? produccionRes.data : emptyProduccion}
					initialCobranzas={cobranzasRes.success ? cobranzasRes.data : emptyCobranzas}
					initialSiniestros={siniestrosRes.success ? siniestrosRes.data : emptySiniestros}
					filtrosData={filtrosRes.success ? filtrosRes.data : { regionales: [], companias: [], equipos: [] }}
					defaultFiltros={defaultFiltros}
				/>
			</div>
		</div>
	);
}
