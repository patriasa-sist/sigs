"use client";

import { useCallback, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardFilters from "@/components/gerencia/DashboardFilters";
import ProduccionCharts from "@/components/gerencia/charts/ProduccionCharts";
import CobranzasCharts from "@/components/gerencia/charts/CobranzasCharts";
import SiniestrosCharts from "@/components/gerencia/charts/SiniestrosCharts";
import {
	obtenerEstadisticasProduccion,
	obtenerEstadisticasCobranzas,
	obtenerEstadisticasSiniestros,
} from "@/app/gerencia/actions";
import type {
	GerenciaFiltros,
	FiltrosData,
	EstadisticasProduccion,
	EstadisticasCobranzas,
	EstadisticasSiniestros,
} from "@/types/gerencia";
import { Loader2, TrendingUp, Banknote, ShieldAlert } from "lucide-react";

const MESES_COMPLETOS = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
];

function getPeriodoLabel(filtros: GerenciaFiltros): string {
	if (filtros.mes) {
		return `${MESES_COMPLETOS[filtros.mes - 1]} ${filtros.anio}`;
	}
	return `Anual ${filtros.anio}`;
}

function filtrosEqual(a: GerenciaFiltros, b: GerenciaFiltros): boolean {
	return (
		a.anio === b.anio &&
		a.mes === b.mes &&
		a.regional_id === b.regional_id &&
		a.compania_id === b.compania_id &&
		a.equipo_id === b.equipo_id
	);
}

interface GerenciaDashboardProps {
	initialProduccion: EstadisticasProduccion;
	initialCobranzas: EstadisticasCobranzas;
	initialSiniestros: EstadisticasSiniestros;
	filtrosData: FiltrosData;
	defaultFiltros: GerenciaFiltros;
}

export default function GerenciaDashboard({
	initialProduccion,
	initialCobranzas,
	initialSiniestros,
	filtrosData,
	defaultFiltros,
}: GerenciaDashboardProps) {
	// Draft = what the user is editing. Applied = what the charts show.
	const [draftFiltros, setDraftFiltros] = useState<GerenciaFiltros>(defaultFiltros);
	const [appliedFiltros, setAppliedFiltros] = useState<GerenciaFiltros>(defaultFiltros);
	const [produccion, setProduccion] = useState(initialProduccion);
	const [cobranzas, setCobranzas] = useState(initialCobranzas);
	const [siniestros, setSiniestros] = useState(initialSiniestros);
	const [isPending, startTransition] = useTransition();

	const dirty = !filtrosEqual(draftFiltros, appliedFiltros);

	const handleApply = useCallback(() => {
		const filtrosToApply = draftFiltros;
		setAppliedFiltros(filtrosToApply);
		startTransition(async () => {
			const [prodRes, cobRes, sinRes] = await Promise.all([
				obtenerEstadisticasProduccion(filtrosToApply),
				obtenerEstadisticasCobranzas(filtrosToApply),
				obtenerEstadisticasSiniestros(filtrosToApply),
			]);
			if (prodRes.success) setProduccion(prodRes.data);
			if (cobRes.success) setCobranzas(cobRes.data);
			if (sinRes.success) setSiniestros(sinRes.data);
		});
	}, [draftFiltros]);

	const periodoLabel = getPeriodoLabel(appliedFiltros);

	return (
		<div className="space-y-6">
			{/* Filtros */}
			<Card className="shadow-sm">
				<CardContent className="p-5">
					<DashboardFilters
						filtros={draftFiltros}
						onFiltrosChange={setDraftFiltros}
						onApply={handleApply}
						filtrosData={filtrosData}
						isPending={isPending}
						dirty={dirty}
					/>
				</CardContent>
			</Card>

			{/* Tabs */}
			<Tabs defaultValue="produccion" className="w-full">
				<div className="flex items-center justify-between">
					<TabsList className="bg-primary/10">
						<TabsTrigger
							value="produccion"
							className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
						>
							<TrendingUp className="h-4 w-4" />
							Producción
						</TabsTrigger>
						<TabsTrigger
							value="cobranzas"
							className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
						>
							<Banknote className="h-4 w-4" />
							Cobranzas
						</TabsTrigger>
						<TabsTrigger
							value="siniestros"
							className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
						>
							<ShieldAlert className="h-4 w-4" />
							Siniestros
						</TabsTrigger>
					</TabsList>
					{isPending && (
						<div className="flex items-center gap-2 text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-xs">Actualizando…</span>
						</div>
					)}
				</div>
				<TabsContent value="produccion" className="mt-6">
					<ProduccionCharts data={produccion} periodoLabel={periodoLabel} />
				</TabsContent>
				<TabsContent value="cobranzas" className="mt-6">
					<CobranzasCharts data={cobranzas} periodoLabel={periodoLabel} />
				</TabsContent>
				<TabsContent value="siniestros" className="mt-6">
					<SiniestrosCharts data={siniestros} periodoLabel={periodoLabel} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
