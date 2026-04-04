import { Suspense } from "react";
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

function GerenciaSkeleton() {
	return (
		<div className="space-y-6">
			{/* Filters bar */}
			<div className="border border-border rounded-lg p-4 flex gap-3 flex-wrap">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="h-8 w-32 bg-muted rounded animate-pulse" />
				))}
			</div>
			{/* Tabs */}
			<div className="flex gap-2 border-b border-border pb-0">
				{["Producción", "Cobranzas", "Siniestros"].map((t) => (
					<div key={t} className="h-9 w-28 bg-muted rounded-t animate-pulse" />
				))}
			</div>
			{/* KPI cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="border border-border rounded-lg p-4 space-y-3">
						<div className="h-3 w-28 bg-muted rounded animate-pulse" />
						<div className="h-7 w-36 bg-muted rounded animate-pulse" />
						<div className="h-3 w-20 bg-muted rounded animate-pulse" />
					</div>
				))}
			</div>
			{/* Chart blocks */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="border border-border rounded-lg p-4">
						<div className="h-4 w-40 bg-muted rounded animate-pulse mb-4" />
						<div className="h-48 bg-muted/50 rounded animate-pulse" />
					</div>
				))}
			</div>
		</div>
	);
}

async function GerenciaData({ canExportar }: { canExportar: boolean }) {
	const currentYear = new Date().getFullYear();
	const defaultFiltros: GerenciaFiltros = { anio: currentYear };

	const [produccionRes, cobranzasRes, siniestrosRes, filtrosRes] = await Promise.all([
		obtenerEstadisticasProduccion(defaultFiltros),
		obtenerEstadisticasCobranzas(defaultFiltros),
		obtenerEstadisticasSiniestros(defaultFiltros),
		obtenerFiltrosGerencia(),
	]);

	const emptyProduccion = {
		kpis: { prima_total_mes: 0, prima_acumulada_anio: 0, comisiones_mes: 0, cantidad_polizas_mes: 0 },
		primaPorMes: [],
		comisionesPorRamo: [],
		colocacion: { nuevas: 0, renovadas: 0, anuladas: 0 },
		topResponsables: [],
		topDirectoresCartera: [],
		vencimientosProximos: [],
		resumenVencimientos: { en_30_dias: 0, en_60_dias: 0, en_90_dias: 0 },
		distribucionMoneda: [],
		funnelProduccion: { total: 0, activas: 0, pendientes: 0, canceladas: 0, tasa_aprobacion: 0 },
		trends: { prima_total_mes: null, prima_acumulada_anio: null, comisiones_mes: null, cantidad_polizas_mes: null },
	};

	const emptyCobranzas = {
		kpis: {
			cuotas_pendientes: 0,
			monto_pendiente: 0,
			cuotas_vencidas: 0,
			monto_vencido: 0,
			monto_cobrado_mes: 0,
			tasa_cobranza: 0,
		},
		cobradoVsPendiente: [],
		distribucionEstados: [],
		proximasCuotas: [],
		agingMorosidad: [],
	};

	const emptySiniestros = {
		kpis: { siniestros_abiertos: 0, cerrados_mes: 0, monto_reservado: 0, promedio_dias_resolucion: null },
		siniestrosPorMes: [],
		siniestrosPorRamo: [],
		siniestrosAbiertos: [],
	};

	return (
		<GerenciaDashboard
			initialProduccion={produccionRes.success ? produccionRes.data : emptyProduccion}
			initialCobranzas={cobranzasRes.success ? cobranzasRes.data : emptyCobranzas}
			initialSiniestros={siniestrosRes.success ? siniestrosRes.data : emptySiniestros}
			filtrosData={filtrosRes.success ? filtrosRes.data : { regionales: [], companias: [], equipos: [] }}
			defaultFiltros={defaultFiltros}
		/>
	);
}

export default async function GerenciaPage() {
	await requirePermission("gerencia.ver");
	const { allowed: canExportar } = await checkPermission("gerencia.exportar");

	return (
		<div className="flex-1 w-full">
			<div className="max-w-7xl mx-auto pt-6 pb-8 px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-md">
							<BarChart3 className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold text-foreground">Dashboard Gerencial</h1>
							<p className="text-sm text-muted-foreground">Producción, cobranzas y siniestros</p>
						</div>
					</div>
					{canExportar && (
						<Link href="/gerencia/reportes">
							<Button size="sm" className="gap-2">
								<FileSpreadsheet className="h-4 w-4" />
								Reportes
							</Button>
						</Link>
					)}
				</div>
				<Suspense fallback={<GerenciaSkeleton />}>
					<GerenciaData canExportar={canExportar} />
				</Suspense>
			</div>
		</div>
	);
}
