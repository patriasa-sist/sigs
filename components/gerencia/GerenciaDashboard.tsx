"use client";

import { useState, useTransition } from "react";
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
import { Loader2 } from "lucide-react";

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
	const [filtros, setFiltros] = useState<GerenciaFiltros>(defaultFiltros);
	const [produccion, setProduccion] = useState(initialProduccion);
	const [cobranzas, setCobranzas] = useState(initialCobranzas);
	const [siniestros, setSiniestros] = useState(initialSiniestros);
	const [isPending, startTransition] = useTransition();

	const handleFiltrosChange = (newFiltros: GerenciaFiltros) => {
		setFiltros(newFiltros);
		startTransition(async () => {
			const [prodRes, cobRes, sinRes] = await Promise.all([
				obtenerEstadisticasProduccion(newFiltros),
				obtenerEstadisticasCobranzas(newFiltros),
				obtenerEstadisticasSiniestros(newFiltros),
			]);
			if (prodRes.success) setProduccion(prodRes.data);
			if (cobRes.success) setCobranzas(cobRes.data);
			if (sinRes.success) setSiniestros(sinRes.data);
		});
	};

	return (
		<div className="space-y-6">
			{/* Filtros */}
			<div className="rounded-lg border p-4 bg-white">
				<DashboardFilters
					filtros={filtros}
					filtrosData={filtrosData}
					onFiltrosChange={handleFiltrosChange}
				/>
			</div>

			{/* Loading indicator */}
			{isPending && (
				<div className="flex items-center justify-center py-4 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin mr-2" />
					<span className="text-sm">Actualizando datos...</span>
				</div>
			)}

			{/* Tabs */}
			<Tabs defaultValue="produccion" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="produccion">Producción</TabsTrigger>
					<TabsTrigger value="cobranzas">Cobranzas</TabsTrigger>
					<TabsTrigger value="siniestros">Siniestros</TabsTrigger>
				</TabsList>
				<TabsContent value="produccion" className="mt-6">
					<ProduccionCharts data={produccion} />
				</TabsContent>
				<TabsContent value="cobranzas" className="mt-6">
					<CobranzasCharts data={cobranzas} />
				</TabsContent>
				<TabsContent value="siniestros" className="mt-6">
					<SiniestrosCharts data={siniestros} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
