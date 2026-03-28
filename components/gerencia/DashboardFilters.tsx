"use client";

import { SlidersHorizontal, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FiltrosData, GerenciaFiltros } from "@/types/gerencia";

const ALL = "__all__";

const MESES = [
	{ value: 1, label: "Enero" },
	{ value: 2, label: "Febrero" },
	{ value: 3, label: "Marzo" },
	{ value: 4, label: "Abril" },
	{ value: 5, label: "Mayo" },
	{ value: 6, label: "Junio" },
	{ value: 7, label: "Julio" },
	{ value: 8, label: "Agosto" },
	{ value: 9, label: "Septiembre" },
	{ value: 10, label: "Octubre" },
	{ value: 11, label: "Noviembre" },
	{ value: 12, label: "Diciembre" },
];

const ANIOS = [2025, 2026, 2027, 2028];

interface DashboardFiltersProps {
	filtros: GerenciaFiltros;
	onFiltrosChange: (filtros: GerenciaFiltros) => void;
	onApply: () => void;
	filtrosData: FiltrosData;
	isPending?: boolean;
	dirty?: boolean;
}

function truncate(text: string, max: number) {
	return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function DashboardFilters({
	filtros,
	onFiltrosChange,
	onApply,
	filtrosData,
	isPending,
	dirty,
}: DashboardFiltersProps) {
	const update = (partial: Partial<GerenciaFiltros>) => {
		onFiltrosChange({ ...filtros, ...partial });
	};

	// Build active filter chips
	const chips: { key: string; label: string; onClear: () => void }[] = [];

	if (filtros.mes) {
		const mesLabel = MESES.find((m) => m.value === filtros.mes)?.label ?? `Mes ${filtros.mes}`;
		chips.push({ key: "mes", label: mesLabel, onClear: () => update({ mes: undefined }) });
	}
	if (filtros.regional_id) {
		const nombre = filtrosData.regionales.find((r) => r.id === filtros.regional_id)?.nombre ?? filtros.regional_id;
		chips.push({ key: "regional", label: truncate(nombre, 28), onClear: () => update({ regional_id: undefined }) });
	}
	if (filtros.compania_id) {
		const nombre = filtrosData.companias.find((c) => c.id === filtros.compania_id)?.nombre ?? filtros.compania_id;
		chips.push({ key: "compania", label: truncate(nombre, 24), onClear: () => update({ compania_id: undefined }) });
	}
	if (filtros.equipo_id) {
		const nombre = filtrosData.equipos.find((e) => e.id === filtros.equipo_id)?.nombre ?? filtros.equipo_id;
		chips.push({ key: "equipo", label: truncate(nombre, 22), onClear: () => update({ equipo_id: undefined }) });
	}

	const handleReset = () => {
		onFiltrosChange({ anio: new Date().getFullYear() });
	};

	return (
		<div className="space-y-0">
			{/* Selects row */}
			<div className="flex flex-wrap items-center gap-2">
				<SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

				<Select value={filtros.anio.toString()} onValueChange={(v) => update({ anio: Number(v) })}>
					<SelectTrigger size="sm" className="w-auto min-w-20">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ANIOS.map((a) => (
							<SelectItem key={a} value={a.toString()}>
								{a}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={filtros.mes?.toString() ?? ALL}
					onValueChange={(v) => update({ mes: v === ALL ? undefined : Number(v) })}
				>
					<SelectTrigger size="sm" className="w-auto min-w-32">
						<SelectValue placeholder="Todos los meses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todos los meses</SelectItem>
						{MESES.map((m) => (
							<SelectItem key={m.value} value={m.value.toString()}>
								{m.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={filtros.regional_id || ALL}
					onValueChange={(v) => update({ regional_id: v === ALL ? undefined : v })}
				>
					<SelectTrigger size="sm" className="w-auto min-w-36">
						<SelectValue placeholder="Todas las regionales" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todas las regionales</SelectItem>
						{filtrosData.regionales.map((r) => (
							<SelectItem key={r.id} value={r.id}>
								{r.nombre}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={filtros.compania_id || ALL}
					onValueChange={(v) => update({ compania_id: v === ALL ? undefined : v })}
				>
					<SelectTrigger size="sm" className="w-auto min-w-36">
						<SelectValue placeholder="Todas las compañías" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todas las compañías</SelectItem>
						{filtrosData.companias.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.nombre}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={filtros.equipo_id || ALL}
					onValueChange={(v) => update({ equipo_id: v === ALL ? undefined : v })}
				>
					<SelectTrigger size="sm" className="w-auto min-w-36">
						<SelectValue placeholder="Todos los equipos" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todos los equipos</SelectItem>
						{filtrosData.equipos.map((e) => (
							<SelectItem key={e.id} value={e.id}>
								{e.nombre}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Aplicar button pushed right */}
				<Button size="sm" onClick={onApply} disabled={isPending || !dirty} className="gap-1.5 h-8 ml-auto">
					<Search className="h-3.5 w-3.5" />
					{isPending ? "Actualizando…" : "Aplicar"}
				</Button>
			</div>

			{/* Active filter chips */}
			{chips.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-border/60">
					{chips.map((chip) => (
						<span
							key={chip.key}
							className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20"
						>
							{chip.label}
							<button
								onClick={chip.onClear}
								className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
								aria-label={`Quitar filtro ${chip.key}`}
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					))}

					{chips.length > 1 && (
						<button
							onClick={handleReset}
							className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-0.5 rounded-md text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/8 border border-border hover:border-destructive/25 transition-colors ml-0.5"
						>
							<RotateCcw className="h-3 w-3" />
							Limpiar todo
						</button>
					)}
				</div>
			)}
		</div>
	);
}
