"use client";

import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FiltrosData, GerenciaFiltros } from "@/types/gerencia";

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

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

interface DashboardFiltersProps {
	filtros: GerenciaFiltros;
	filtrosData: FiltrosData;
	onFiltrosChange: (filtros: GerenciaFiltros) => void;
}

export default function DashboardFilters({ filtros, filtrosData, onFiltrosChange }: DashboardFiltersProps) {
	const update = (partial: Partial<GerenciaFiltros>) => {
		onFiltrosChange({ ...filtros, ...partial });
	};

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
			<div className="space-y-1.5">
				<Label className="text-xs">Año</Label>
				<Select
					value={filtros.anio.toString()}
					onValueChange={(v) => update({ anio: Number(v) })}
				>
					<SelectTrigger className="h-9">
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
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">Mes</Label>
				<Select
					value={filtros.mes?.toString() ?? "all"}
					onValueChange={(v) => update({ mes: v === "all" ? undefined : Number(v) })}
				>
					<SelectTrigger className="h-9">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos</SelectItem>
						{MESES.map((m) => (
							<SelectItem key={m.value} value={m.value.toString()}>
								{m.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">Regional</Label>
				<Select
					value={filtros.regional_id || "all"}
					onValueChange={(v) => update({ regional_id: v === "all" ? undefined : v })}
				>
					<SelectTrigger className="h-9">
						<SelectValue placeholder="Todas" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todas</SelectItem>
						{filtrosData.regionales.map((r) => (
							<SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">Compañía</Label>
				<Select
					value={filtros.compania_id || "all"}
					onValueChange={(v) => update({ compania_id: v === "all" ? undefined : v })}
				>
					<SelectTrigger className="h-9">
						<SelectValue placeholder="Todas" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todas</SelectItem>
						{filtrosData.companias.map((c) => (
							<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs">Equipo</Label>
				<Select
					value={filtros.equipo_id || "all"}
					onValueChange={(v) => update({ equipo_id: v === "all" ? undefined : v })}
				>
					<SelectTrigger className="h-9">
						<SelectValue placeholder="Todos" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos</SelectItem>
						{filtrosData.equipos.map((e) => (
							<SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
