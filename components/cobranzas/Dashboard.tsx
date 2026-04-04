"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	X,
	FilterX,
	Loader2,
	Download,
	ChevronDown,
	AlertCircle,
} from "lucide-react";
import { obtenerPolizasConPendientes } from "@/app/cobranzas/actions";
import StatsCards from "./StatsCards";
import CuotasModal from "./CuotasModal";
import RegistrarPagoModal from "./RegistrarPagoModal";
import RedistribucionModal from "./RedistribucionModal";
import ExportarReporte from "./ExportarReporte";
import type {
	PolizaConPagos,
	CobranzaStats,
	CuotaPago,
	ExcessPaymentDistribution,
	SortFieldEnhanced,
} from "@/types/cobranza";

interface DashboardProps {
	polizasIniciales: PolizaConPagos[];
	statsIniciales: CobranzaStats;
}

const ALL = "__all__";

/** Inline sort icon component — avoids repeating the arrow logic per column */
function SortIcon({
	field,
	currentField,
	direction,
}: {
	field: SortFieldEnhanced;
	currentField: SortFieldEnhanced | null;
	direction: "asc" | "desc";
}) {
	if (currentField !== field)
		return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
	return direction === "asc" ? (
		<ArrowUp className="h-3.5 w-3.5 text-primary" />
	) : (
		<ArrowDown className="h-3.5 w-3.5 text-primary" />
	);
}

export default function Dashboard({ polizasIniciales, statsIniciales }: DashboardProps) {
	// ── Data ──────────────────────────────────────────────────────────
	const [polizas, setPolizas] = useState<PolizaConPagos[]>(polizasIniciales);
	const [stats] = useState<CobranzaStats>(statsIniciales);

	// Lazy-load all policies (including fully paid) on first toggle
	const [mostrarPagadas, setMostrarPagadas] = useState(false);
	const [allPolizas, setAllPolizas] = useState<PolizaConPagos[] | null>(null);
	const [isPending, startTransition] = useTransition();

	// ── UI state ──────────────────────────────────────────────────────
	const [showExport, setShowExport] = useState(false);

	// ── Filters ───────────────────────────────────────────────────────
	const [searchTerm, setSearchTerm] = useState("");
	const [filters, setFilters] = useState({
		ramo: ALL,
		compania: ALL,
		ejecutivo: ALL,
		regional: ALL,
	});
	const [soloVencidas, setSoloVencidas] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);

	// ── Pagination ────────────────────────────────────────────────────
	const [pageSize] = useState(20);

	// ── Sorting — default: cuotas_vencidas DESC (most urgent first) ───
	const [sortField, setSortField] = useState<SortFieldEnhanced | null>("cuotas_vencidas");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

	// ── Modal state ───────────────────────────────────────────────────
	const [selectedPoliza, setSelectedPoliza] = useState<PolizaConPagos | null>(null);
	const [selectedCuota, setSelectedCuota] = useState<CuotaPago | null>(null);
	const [excessData, setExcessData] = useState<ExcessPaymentDistribution | null>(null);
	const [cuotasModalOpen, setCuotasModalOpen] = useState(false);
	const [pagoModalOpen, setPagoModalOpen] = useState(false);
	const [redistribucionModalOpen, setRedistribucionModalOpen] = useState(false);

	// ── Helpers ───────────────────────────────────────────────────────
	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);

	const handleTogglePagadas = useCallback(
		(checked: boolean) => {
			setMostrarPagadas(checked);
			setCurrentPage(1);
			if (checked) {
				if (allPolizas === null) {
					startTransition(async () => {
						const result = await obtenerPolizasConPendientes(true);
						if (result.success && result.data) {
							setAllPolizas(result.data.polizas);
							setPolizas(result.data.polizas);
						}
					});
				} else {
					setPolizas(allPolizas);
				}
			} else {
				setPolizas(polizasIniciales);
			}
		},
		[allPolizas, polizasIniciales]
	);

	const handleSort = (field: SortFieldEnhanced) => {
		if (sortField === field) {
			setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
		setCurrentPage(1);
	};

	// ── Derived filter options from loaded data ───────────────────────
	const filterOptions = useMemo(
		() => ({
			ramos: [...new Set(polizas.map((p) => p.ramo))].filter(Boolean).sort(),
			companias: [...new Set(polizas.map((p) => p.compania.nombre))]
				.filter((v) => v !== "N/A")
				.sort(),
			ejecutivos: [...new Set(polizas.map((p) => p.responsable.full_name))]
				.filter((v) => v !== "N/A")
				.sort(),
			regionales: [...new Set(polizas.map((p) => p.regional.nombre))]
				.filter((v) => v !== "N/A")
				.sort(),
		}),
		[polizas]
	);

	const hasActiveFilters =
		searchTerm.trim() !== "" ||
		Object.values(filters).some((v) => v !== ALL) ||
		soloVencidas;

	const activeFilterLabels: { key: string; label: string; value: string }[] = [];
	if (filters.ramo !== ALL)
		activeFilterLabels.push({ key: "ramo", label: "Ramo", value: filters.ramo });
	if (filters.compania !== ALL)
		activeFilterLabels.push({ key: "compania", label: "Compañía", value: filters.compania });
	if (filters.ejecutivo !== ALL)
		activeFilterLabels.push({ key: "ejecutivo", label: "Ejecutivo", value: filters.ejecutivo });
	if (filters.regional !== ALL)
		activeFilterLabels.push({ key: "regional", label: "Regional", value: filters.regional });

	const clearFilter = (key: string) => {
		setFilters((prev) => ({ ...prev, [key]: ALL }));
	};

	const clearAllFilters = () => {
		setSearchTerm("");
		setFilters({ ramo: ALL, compania: ALL, ejecutivo: ALL, regional: ALL });
		setSoloVencidas(false);
		setCurrentPage(1);
	};

	// ── Filter + sort ─────────────────────────────────────────────────
	const filteredData = useMemo(() => {
		let filtered = polizas.filter((poliza) => {
			// Quick filter: solo vencidas
			if (soloVencidas && poliza.cuotas_vencidas === 0) return false;

			// Search
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				poliza.numero_poliza.toLowerCase().includes(searchLower) ||
				poliza.client.nombre_completo.toLowerCase().includes(searchLower) ||
				poliza.client.documento.toLowerCase().includes(searchLower) ||
				poliza.compania.nombre.toLowerCase().includes(searchLower);
			if (!matchesSearch) return false;

			// Dropdown filters
			if (filters.ramo !== ALL && poliza.ramo !== filters.ramo) return false;
			if (filters.compania !== ALL && poliza.compania.nombre !== filters.compania) return false;
			if (filters.ejecutivo !== ALL && poliza.responsable.full_name !== filters.ejecutivo)
				return false;
			if (filters.regional !== ALL && poliza.regional.nombre !== filters.regional) return false;

			return true;
		});

		if (sortField) {
			filtered = [...filtered].sort((a, b) => {
				let valueA: string | number;
				let valueB: string | number;

				switch (sortField) {
					case "numero_poliza":
						valueA = a.numero_poliza.toLowerCase();
						valueB = b.numero_poliza.toLowerCase();
						break;
					case "cliente":
						valueA = a.client.nombre_completo.toLowerCase();
						valueB = b.client.nombre_completo.toLowerCase();
						break;
					case "compania":
						valueA = a.compania.nombre.toLowerCase();
						valueB = b.compania.nombre.toLowerCase();
						break;
					case "fecha_vencimiento": {
						valueA = a.proxima_fecha_vencimiento
							? new Date(a.proxima_fecha_vencimiento).getTime()
							: Infinity;
						valueB = b.proxima_fecha_vencimiento
							? new Date(b.proxima_fecha_vencimiento).getTime()
							: Infinity;
						break;
					}
					case "monto_pendiente":
						valueA = a.total_pendiente;
						valueB = b.total_pendiente;
						break;
					case "cuotas_vencidas":
						valueA = a.cuotas_vencidas;
						valueB = b.cuotas_vencidas;
						break;
					case "cuotas_pendientes":
						valueA = a.cuotas_pendientes;
						valueB = b.cuotas_pendientes;
						break;
					case "prima_total":
						valueA = a.prima_total;
						valueB = b.prima_total;
						break;
					case "inicio_vigencia":
						valueA = new Date(a.inicio_vigencia).getTime();
						valueB = new Date(b.inicio_vigencia).getTime();
						break;
					default:
						return 0;
				}

				if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
				if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
				return 0;
			});
		}

		return filtered;
	}, [polizas, searchTerm, filters, sortField, sortDirection, soloVencidas]);

	const paginatedData = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredData.slice(start, start + pageSize);
	}, [filteredData, currentPage, pageSize]);

	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
	}, []);

	const handleFilterChange = useCallback((key: string, value: string) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setCurrentPage(1);
	}, []);

	// ── Modal handlers ────────────────────────────────────────────────
	const handleVerCuotas = (poliza: PolizaConPagos) => {
		setSelectedPoliza(poliza);
		setCuotasModalOpen(true);
	};

	const handleSelectCuota = (cuota: CuotaPago) => {
		setSelectedCuota(cuota);
		setPagoModalOpen(true);
	};

	const handlePagoSuccess = (excessDataResult?: ExcessPaymentDistribution) => {
		setPagoModalOpen(false);
		if (excessDataResult) {
			setExcessData(excessDataResult);
			setRedistribucionModalOpen(true);
		} else {
			window.location.reload();
		}
	};

	const handleRedistribucionSuccess = () => {
		setRedistribucionModalOpen(false);
		window.location.reload();
	};

	// ── Render ────────────────────────────────────────────────────────
	return (
		<div className="space-y-6">
			{/* KPI stats */}
			<StatsCards stats={stats} />

			{/* Export toggle */}
			<div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setShowExport((v) => !v)}
					className="gap-2"
				>
					<Download className="h-4 w-4" />
					Exportar Reporte
					<ChevronDown
						className={`h-4 w-4 transition-transform duration-200 ${
							showExport ? "rotate-180" : ""
						}`}
					/>
				</Button>
			</div>

			{showExport && (
				<Card>
					<CardContent className="pt-5">
						<ExportarReporte />
					</CardContent>
				</Card>
			)}

			{/* ── Filter bar ───────────────────────────────────────────── */}
			<Card>
				<CardContent className="py-4 space-y-3">
					{/* Row 1: Search + selects + quick filter + clear */}
					<div className="flex flex-wrap items-center gap-3">
						{/* Search */}
						<div className="relative flex-1 min-w-[200px]">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
							<Input
								placeholder="Buscar por póliza, cliente, CI/NIT o compañía…"
								value={searchTerm}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-9 h-9"
							/>
							{searchTerm && (
								<button
									onClick={() => handleSearchChange("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</div>

						<Select value={filters.ramo} onValueChange={(v) => handleFilterChange("ramo", v)}>
							<SelectTrigger size="sm" className="w-[130px]">
								<SelectValue placeholder="Ramo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ramos</SelectItem>
								{filterOptions.ramos.map((r) => (
									<SelectItem key={r} value={r}>
										{r}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.compania}
							onValueChange={(v) => handleFilterChange("compania", v)}
						>
							<SelectTrigger size="sm" className="w-[155px]">
								<SelectValue placeholder="Compañía" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas las compañías</SelectItem>
								{filterOptions.companias.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.ejecutivo}
							onValueChange={(v) => handleFilterChange("ejecutivo", v)}
						>
							<SelectTrigger size="sm" className="w-[155px]">
								<SelectValue placeholder="Ejecutivo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ejecutivos</SelectItem>
								{filterOptions.ejecutivos.map((ej) => (
									<SelectItem key={ej} value={ej}>
										{ej}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.regional}
							onValueChange={(v) => handleFilterChange("regional", v)}
						>
							<SelectTrigger size="sm" className="w-[140px]">
								<SelectValue placeholder="Regional" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas las regionales</SelectItem>
								{filterOptions.regionales.map((r) => (
									<SelectItem key={r} value={r}>
										{r}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Quick filter: Solo Vencidas */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setSoloVencidas((v) => !v);
								setCurrentPage(1);
							}}
							className={`gap-1.5 transition-colors ${
								soloVencidas
									? "bg-destructive hover:bg-destructive/90 text-white border-destructive"
									: "text-destructive border-destructive/40 hover:bg-destructive/5 hover:border-destructive/70"
							}`}
						>
							<AlertCircle className="h-3.5 w-3.5" />
							Solo Vencidas
						</Button>

						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearAllFilters}
								className="text-muted-foreground hover:text-foreground gap-1"
							>
								<FilterX className="h-4 w-4" />
								Limpiar
							</Button>
						)}
					</div>

					{/* Row 2: Active filter chips (left) + Incluir pagadas toggle (right) */}
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex flex-wrap items-center gap-2">
							{activeFilterLabels.map((f) => (
								<Badge key={f.key} variant="secondary" className="gap-1 pr-1 rounded-md">
									{f.label}: {f.value}
									<button
										onClick={() => clearFilter(f.key)}
										className="ml-1 hover:bg-muted rounded p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
						<div className="flex items-center gap-2 ml-auto">
							{isPending && (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							)}
							<Switch
								id="mostrar-pagadas"
								checked={mostrarPagadas}
								onCheckedChange={handleTogglePagadas}
								disabled={isPending}
							/>
							<Label
								htmlFor="mostrar-pagadas"
								className="text-sm cursor-pointer text-muted-foreground"
							>
								Incluir pagadas
							</Label>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Results table ─────────────────────────────────────────── */}
			<Card>
				<CardHeader className="pb-0">
					<CardTitle className="text-base font-medium text-foreground">
						{mostrarPagadas ? "Todas las Pólizas" : "Pólizas con Cuotas Pendientes"}
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							({filteredData.length})
						</span>
					</CardTitle>
				</CardHeader>

				<CardContent className="p-0 mt-3">
					{paginatedData.length > 0 ? (
						<>
							<div className="overflow-x-auto border-t border-border">
								<table className="w-full">
									<thead className="bg-secondary text-secondary-foreground">
										<tr>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("cliente")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Cliente
													<SortIcon
														field="cliente"
														currentField={sortField}
														direction={sortDirection}
													/>
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("numero_poliza")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Póliza
													<SortIcon
														field="numero_poliza"
														currentField={sortField}
														direction={sortDirection}
													/>
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("compania")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Compañía
													<SortIcon
														field="compania"
														currentField={sortField}
														direction={sortDirection}
													/>
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("cuotas_vencidas")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Cuotas
													<SortIcon
														field="cuotas_vencidas"
														currentField={sortField}
														direction={sortDirection}
													/>
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("monto_pendiente")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Pendiente
													<SortIcon
														field="monto_pendiente"
														currentField={sortField}
														direction={sortDirection}
													/>
												</button>
											</th>
											<th className="px-4 py-3 text-right text-sm font-medium">
												Acciones
											</th>
										</tr>
									</thead>
									<tbody>
										{paginatedData.map((poliza) => (
											<tr
												key={poliza.id}
												className={`border-b border-border hover:bg-secondary/50 transition-colors duration-150 border-l-2 ${
													poliza.cuotas_vencidas > 0
														? "border-l-destructive"
														: "border-l-transparent"
												}`}
											>
												{/* Cliente: nombre + documento */}
												<td className="px-4 py-3">
													<div className="font-medium text-sm text-foreground truncate max-w-[200px]">
														{poliza.client.nombre_completo}
													</div>
													<div className="text-xs text-muted-foreground mt-0.5">
														{poliza.client.documento}
													</div>
												</td>

												{/* Póliza: número + ramo badge */}
												<td className="px-4 py-3">
													<div className="font-medium text-sm text-foreground">
														{poliza.numero_poliza}
													</div>
													<div className="mt-0.5">
														<span className="inline-block text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md">
															{poliza.ramo}
														</span>
													</div>
												</td>

												{/* Compañía */}
												<td className="px-4 py-3 text-sm text-foreground max-w-[150px] truncate">
													{poliza.compania.nombre}
												</td>

												{/* Cuotas: vencidas + pendientes badges */}
												<td className="px-4 py-3">
													<div className="flex items-center gap-1.5 flex-wrap">
														{poliza.cuotas_vencidas > 0 && (
															<span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
																<AlertCircle className="h-3 w-3" />
																{poliza.cuotas_vencidas} venc.
															</span>
														)}
														{poliza.cuotas_pendientes > 0 && (
															<span className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
																{poliza.cuotas_pendientes} pend.
															</span>
														)}
														{poliza.cuotas_vencidas === 0 &&
															poliza.cuotas_pendientes === 0 && (
																<span className="text-xs text-muted-foreground">Al día</span>
															)}
													</div>
												</td>

												{/* Monto pendiente */}
												<td className="px-4 py-3 text-sm font-medium text-foreground tabular-nums whitespace-nowrap">
													{poliza.moneda} {formatCurrency(poliza.total_pendiente)}
												</td>

												{/* Acciones */}
												<td className="px-4 py-3 text-right">
													<Button
														size="sm"
														variant="default"
														onClick={() => handleVerCuotas(poliza)}
													>
														Ver Cuotas
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Pagination */}
							{(() => {
								const totalPages = Math.ceil(filteredData.length / pageSize);
								if (totalPages <= 1) return null;
								const startIndex = (currentPage - 1) * pageSize;
								return (
									<div className="flex items-center justify-between px-4 py-3 border-t border-border">
										<p className="text-xs text-muted-foreground">
											{startIndex + 1}–{Math.min(startIndex + pageSize, filteredData.length)} de {filteredData.length}
										</p>
										<div className="flex items-center gap-1">
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage((p) => p - 1)}
												disabled={currentPage === 1}
												className="h-7 px-2.5 text-xs"
											>
												Anterior
											</Button>
											{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
												let pageNum: number;
												if (totalPages <= 5) pageNum = i + 1;
												else if (currentPage <= 3) pageNum = i + 1;
												else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
												else pageNum = currentPage - 2 + i;
												return (
													<Button
														key={pageNum}
														variant={currentPage === pageNum ? "default" : "ghost"}
														size="sm"
														onClick={() => setCurrentPage(pageNum)}
														className="h-7 w-7 p-0 text-xs"
													>
														{pageNum}
													</Button>
												);
											})}
											<Button
												variant="outline"
												size="sm"
												onClick={() => setCurrentPage((p) => p + 1)}
												disabled={currentPage === Math.ceil(filteredData.length / pageSize)}
												className="h-7 px-2.5 text-xs"
											>
												Siguiente
											</Button>
										</div>
									</div>
								);
							})()}
						</>
					) : (
						<div className="text-center py-16 border-t border-border">
							<p className="text-muted-foreground">
								{hasActiveFilters
									? "No hay pólizas que coincidan con los filtros aplicados"
									: "No hay pólizas con cuotas pendientes"}
							</p>
							{hasActiveFilters && (
								<Button
									variant="ghost"
									size="sm"
									onClick={clearAllFilters}
									className="mt-3 gap-1"
								>
									<FilterX className="h-4 w-4" />
									Limpiar filtros
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* ── Modals ────────────────────────────────────────────────── */}
			<CuotasModal
				poliza={selectedPoliza}
				open={cuotasModalOpen}
				onClose={() => setCuotasModalOpen(false)}
				onSelectQuota={handleSelectCuota}
			/>
			<RegistrarPagoModal
				cuota={selectedCuota}
				poliza={selectedPoliza}
				open={pagoModalOpen}
				onClose={() => setPagoModalOpen(false)}
				onSuccess={handlePagoSuccess}
			/>
			<RedistribucionModal
				excessData={excessData}
				open={redistribucionModalOpen}
				onClose={() => setRedistribucionModalOpen(false)}
				onSuccess={handleRedistribucionSuccess}
			/>
		</div>
	);
}
