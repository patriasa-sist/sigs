"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Search,
	ChevronLeft,
	ChevronRight,
	AlertTriangle,
	X,
	SlidersHorizontal,
	ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
	SiniestroVistaConEstado,
	SiniestrosStats,
	EstadoSiniestro,
} from "@/types/siniestro";
import StatsCards from "./StatsCards";
import SiniestrosTable from "./SiniestrosTable";
import ExportarSiniestros from "./ExportarSiniestros";

type SortField =
	| "fecha_siniestro"
	| "fecha_reporte"
	| "numero_poliza"
	| "cliente_nombre"
	| "monto_reserva"
	| "codigo_siniestro";
type SortDirection = "asc" | "desc";

interface DashboardProps {
	siniestrosIniciales: SiniestroVistaConEstado[];
	statsIniciales: SiniestrosStats;
}

const ITEMS_PER_PAGE = 25;

const ESTADO_LABELS: Record<string, string> = {
	todos: "Todos los estados",
	abierto: "Abierto",
	rechazado: "Rechazado",
	declinado: "Declinado",
	concluido: "Concluido",
};

export default function Dashboard({ siniestrosIniciales, statsIniciales }: DashboardProps) {
	const [siniestros] = useState<SiniestroVistaConEstado[]>(siniestrosIniciales);
	const [stats] = useState<SiniestrosStats>(statsIniciales);

	// Filtros básicos (siempre visibles)
	const [searchInput, setSearchInput] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [estadoFiltro, setEstadoFiltro] = useState<EstadoSiniestro | "todos">("todos");

	// Filtros avanzados (colapsables)
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	const [etapaInternaFiltro, setEtapaInternaFiltro] = useState<string>("todos");
	const [ramoFiltro, setRamoFiltro] = useState<string>("todos");
	const [departamentoFiltro, setDepartamentoFiltro] = useState<string>("todos");
	const [responsableFiltro, setResponsableFiltro] = useState<string>("todos");
	const [companiaFiltro, setCompaniaFiltro] = useState<string>("todos");

	// Banner de atención
	const [bannerVisible, setBannerVisible] = useState(true);

	const [currentPage, setCurrentPage] = useState(1);
	const [sortField, setSortField] = useState<SortField>("fecha_siniestro");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	// Siniestros que requieren atención (sobre el total, no filtrado)
	const siniestrosConAtencion = useMemo(
		() => siniestros.filter((s) => s.requiere_atencion),
		[siniestros]
	);

	// Conteo de filtros avanzados activos
	const activeAdvancedCount = [
		etapaInternaFiltro,
		ramoFiltro,
		departamentoFiltro,
		responsableFiltro,
		companiaFiltro,
	].filter((f) => f !== "todos").length;

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
		setCurrentPage(1);
	};

	const resetAdvancedFilters = () => {
		setEtapaInternaFiltro("todos");
		setRamoFiltro("todos");
		setDepartamentoFiltro("todos");
		setResponsableFiltro("todos");
		setCompaniaFiltro("todos");
		setCurrentPage(1);
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchTerm(searchInput);
			setCurrentPage(1);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	const ramosUnicos = useMemo(
		() => Array.from(new Set(siniestros.map((s) => s.ramo))).sort(),
		[siniestros]
	);
	const departamentosUnicos = useMemo(
		() => Array.from(new Set(siniestros.map((s) => s.departamento_nombre))).sort(),
		[siniestros]
	);
	const responsablesUnicos = useMemo(
		() =>
			Array.from(
				new Set(
					siniestros
						.map((s) => s.responsable_nombre)
						.filter((r): r is string => r !== undefined && r !== null)
				)
			).sort(),
		[siniestros]
	);
	const companiasUnicas = useMemo(
		() => Array.from(new Set(siniestros.map((s) => s.compania_nombre))).sort(),
		[siniestros]
	);
	const etapasInternasUnicas = useMemo(
		() =>
			Array.from(
				new Set(
					siniestros
						.map((s) => s.estado_actual_nombre)
						.filter((e): e is string => e !== undefined && e !== null)
				)
			).sort(),
		[siniestros]
	);

	const filteredData = useMemo(() => {
		return siniestros.filter((s) => {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				!searchTerm ||
				(s.numero_poliza && s.numero_poliza.toLowerCase().includes(searchLower)) ||
				(s.cliente_nombre && s.cliente_nombre.toLowerCase().includes(searchLower)) ||
				(s.cliente_documento && s.cliente_documento.toLowerCase().includes(searchLower)) ||
				(s.lugar_hecho && s.lugar_hecho.toLowerCase().includes(searchLower)) ||
				(s.departamento_nombre && s.departamento_nombre.toLowerCase().includes(searchLower)) ||
				(s.codigo_siniestro && s.codigo_siniestro.toLowerCase().includes(searchLower)) ||
				(s.responsable_nombre && s.responsable_nombre.toLowerCase().includes(searchLower)) ||
				(s.compania_nombre && s.compania_nombre.toLowerCase().includes(searchLower));

			const matchesEstado = estadoFiltro === "todos" || s.estado === estadoFiltro;
			const matchesEtapa =
				etapaInternaFiltro === "todos" || s.estado_actual_nombre === etapaInternaFiltro;
			const matchesRamo = ramoFiltro === "todos" || s.ramo === ramoFiltro;
			const matchesDpto =
				departamentoFiltro === "todos" || s.departamento_nombre === departamentoFiltro;
			const matchesResp =
				responsableFiltro === "todos" || s.responsable_nombre === responsableFiltro;
			const matchesComp = companiaFiltro === "todos" || s.compania_nombre === companiaFiltro;

			return (
				matchesSearch &&
				matchesEstado &&
				matchesEtapa &&
				matchesRamo &&
				matchesDpto &&
				matchesResp &&
				matchesComp
			);
		});
	}, [
		siniestros,
		searchTerm,
		estadoFiltro,
		etapaInternaFiltro,
		ramoFiltro,
		departamentoFiltro,
		responsableFiltro,
		companiaFiltro,
	]);

	const sortedData = useMemo(() => {
		const sorted = [...filteredData].sort((a, b) => {
			let aVal: string | number;
			let bVal: string | number;

			switch (sortField) {
				case "fecha_siniestro":
					aVal = new Date(a.fecha_siniestro).getTime();
					bVal = new Date(b.fecha_siniestro).getTime();
					break;
				case "fecha_reporte":
					aVal = new Date(a.fecha_reporte).getTime();
					bVal = new Date(b.fecha_reporte).getTime();
					break;
				case "numero_poliza":
					aVal = a.numero_poliza;
					bVal = b.numero_poliza;
					break;
				case "cliente_nombre":
					aVal = a.cliente_nombre.toLowerCase();
					bVal = b.cliente_nombre.toLowerCase();
					break;
				case "monto_reserva":
					aVal = a.monto_reserva;
					bVal = b.monto_reserva;
					break;
				case "codigo_siniestro":
					aVal = a.codigo_siniestro || "";
					bVal = b.codigo_siniestro || "";
					break;
				default:
					return 0;
			}

			if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
			if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
			return 0;
		});
		return sorted;
	}, [filteredData, sortField, sortDirection]);

	const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

	const paginatedData = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return sortedData.slice(start, start + ITEMS_PER_PAGE);
	}, [sortedData, currentPage]);

	return (
		<div className="space-y-6">
			{/* Banner de atención urgente */}
			{siniestrosConAtencion.length > 0 && bannerVisible && (
				<div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-start gap-3 flex-1 min-w-0">
							<AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
							<div className="min-w-0">
								<p className="text-sm font-medium text-amber-900">
									{siniestrosConAtencion.length} siniestro
									{siniestrosConAtencion.length !== 1 ? "s" : ""} sin actualizar en más de 10
									días
								</p>
								<div className="mt-2 space-y-1">
									{siniestrosConAtencion.slice(0, 3).map((s) => {
										const dias = Math.floor(
											(Date.now() - new Date(s.updated_at).getTime()) / 86400000
										);
										return (
											<Link
												key={s.id}
												href={`/siniestros/editar/${s.id}`}
												className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900 hover:underline"
											>
												<span className="font-mono text-xs">
													{s.codigo_siniestro || s.id.slice(0, 8)}
												</span>
												<span className="text-amber-600">·</span>
												<span>{s.cliente_nombre}</span>
												<span className="text-amber-500 text-xs ml-auto">{dias}d</span>
											</Link>
										);
									})}
									{siniestrosConAtencion.length > 3 && (
										<button
											onClick={() => {
												setEstadoFiltro("abierto");
												setCurrentPage(1);
											}}
											className="text-xs text-amber-700 hover:underline mt-1"
										>
											Ver los {siniestrosConAtencion.length - 3} restantes →
										</button>
									)}
								</div>
							</div>
						</div>
						<button
							onClick={() => setBannerVisible(false)}
							className="text-amber-500 hover:text-amber-700 flex-shrink-0"
							aria-label="Cerrar banner"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}

			{/* Stats */}
			<StatsCards stats={stats} requierenAtencionCount={siniestrosConAtencion.length} />

			{/* Filtros */}
			<Card className="shadow-sm">
				<CardContent className="p-5 space-y-4">
					{/* Fila superior: búsqueda + estado + exportar */}
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
							<Input
								placeholder="Buscar por código, póliza, cliente, lugar..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								className="pl-9"
							/>
						</div>

						<Select
							value={estadoFiltro}
							onValueChange={(v) => {
								setEstadoFiltro(v as EstadoSiniestro | "todos");
								setCurrentPage(1);
							}}
						>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue>
									{ESTADO_LABELS[estadoFiltro] ?? "Todos los estados"}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{Object.entries(ESTADO_LABELS).map(([val, label]) => (
									<SelectItem key={val} value={val}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<ExportarSiniestros
							siniestros={filteredData}
							filtrosActivos={{
								searchTerm,
								estadoFiltro,
								ramoFiltro,
								departamentoFiltro,
							}}
						/>
					</div>

					{/* Toggle filtros avanzados */}
					<div>
						<button
							onClick={() => setShowAdvancedFilters((v) => !v)}
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<SlidersHorizontal className="h-3.5 w-3.5" />
							Filtros avanzados
							{activeAdvancedCount > 0 && (
								<span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs font-medium">
									{activeAdvancedCount}
								</span>
							)}
							<ChevronDown
								className={`h-3.5 w-3.5 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
							/>
						</button>
					</div>

					{/* Panel de filtros avanzados */}
					{showAdvancedFilters && (
						<div className="pt-3 border-t border-border space-y-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
								<div>
									<label className="text-xs text-muted-foreground mb-1.5 block">
										Etapa interna
									</label>
									<Select
										value={etapaInternaFiltro}
										onValueChange={(v) => {
											setEtapaInternaFiltro(v);
											setCurrentPage(1);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Todas" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="todos">Todas las etapas</SelectItem>
											{etapasInternasUnicas.map((e) => (
												<SelectItem key={e} value={e}>
													{e}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label className="text-xs text-muted-foreground mb-1.5 block">
										Ramo
									</label>
									<Select
										value={ramoFiltro}
										onValueChange={(v) => {
											setRamoFiltro(v);
											setCurrentPage(1);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Todos" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="todos">Todos los ramos</SelectItem>
											{ramosUnicos.map((r) => (
												<SelectItem key={r} value={r}>
													{r}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label className="text-xs text-muted-foreground mb-1.5 block">
										Departamento
									</label>
									<Select
										value={departamentoFiltro}
										onValueChange={(v) => {
											setDepartamentoFiltro(v);
											setCurrentPage(1);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Todos" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="todos">Todos los departamentos</SelectItem>
											{departamentosUnicos.map((d) => (
												<SelectItem key={d} value={d}>
													{d}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label className="text-xs text-muted-foreground mb-1.5 block">
										Responsable
									</label>
									<Select
										value={responsableFiltro}
										onValueChange={(v) => {
											setResponsableFiltro(v);
											setCurrentPage(1);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Todos" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="todos">Todos los responsables</SelectItem>
											{responsablesUnicos.map((r) => (
												<SelectItem key={r} value={r}>
													{r}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label className="text-xs text-muted-foreground mb-1.5 block">
										Compañía
									</label>
									<Select
										value={companiaFiltro}
										onValueChange={(v) => {
											setCompaniaFiltro(v);
											setCurrentPage(1);
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Todas" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="todos">Todas las compañías</SelectItem>
											{companiasUnicas.map((c) => (
												<SelectItem key={c} value={c}>
													{c}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{activeAdvancedCount > 0 && (
								<div className="flex justify-end">
									<button
										onClick={resetAdvancedFilters}
										className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
									>
										Limpiar filtros avanzados
									</button>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Contador de resultados */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{sortedData.length === 0 ? (
						"No se encontraron siniestros"
					) : (
						<>
							<span className="font-medium text-foreground">{sortedData.length}</span>{" "}
							{sortedData.length === 1 ? "siniestro" : "siniestros"}
							{siniestros.length !== sortedData.length && (
								<span className="text-xs ml-1">(de {siniestros.length} totales)</span>
							)}
						</>
					)}
				</p>
			</div>

			{/* Tabla */}
			<SiniestrosTable
				siniestros={paginatedData}
				sortField={sortField}
				sortDirection={sortDirection}
				onSort={handleSort}
			/>

			{/* Paginación */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						{(currentPage - 1) * ITEMS_PER_PAGE + 1}–
						{Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de{" "}
						{sortedData.length}
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
						>
							<ChevronLeft className="h-4 w-4 mr-1" />
							Anterior
						</Button>
						<span className="text-sm text-muted-foreground">
							Página <span className="font-medium text-foreground">{currentPage}</span> de{" "}
							<span className="font-medium text-foreground">{totalPages}</span>
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
						>
							Siguiente
							<ChevronRight className="h-4 w-4 ml-1" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
