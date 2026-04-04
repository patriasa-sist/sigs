"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { obtenerCobranzasPaginadas } from "@/app/cobranzas/actions";
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
	CobranzaSortField,
	FiltrosCobranzaOptions,
} from "@/types/cobranza";

// Sort fields that are resolved server-side in the view
const SERVER_SORT_FIELDS = new Set<string>([
	"numero_poliza",
	"cuotas_vencidas",
	"cuotas_pendientes",
	"monto_pendiente",
	"fecha_vencimiento",
	"prima_total",
	"inicio_vigencia",
]);

type AnySort = CobranzaSortField | "cliente" | "compania";

interface DashboardProps {
	polizasIniciales: PolizaConPagos[];
	statsIniciales: CobranzaStats;
	totalInicial: number;
	filtrosOptions: FiltrosCobranzaOptions;
}

const ALL = "__all__";

/** Inline sort icon component */
function SortIcon({
	field,
	currentField,
	direction,
}: {
	field: AnySort;
	currentField: AnySort | null;
	direction: "asc" | "desc";
}) {
	if (currentField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
	return direction === "asc" ? (
		<ArrowUp className="h-3.5 w-3.5 text-primary" />
	) : (
		<ArrowDown className="h-3.5 w-3.5 text-primary" />
	);
}

export default function Dashboard({ polizasIniciales, statsIniciales, totalInicial, filtrosOptions }: DashboardProps) {
	// ── Data ──────────────────────────────────────────────────────────
	const [polizas, setPolizas] = useState<PolizaConPagos[]>(polizasIniciales);
	const [total, setTotal] = useState(totalInicial);
	const [isRefetching, setIsRefetching] = useState(false);

	// ── UI state ──────────────────────────────────────────────────────
	const [showExport, setShowExport] = useState(false);

	// ── Filters ───────────────────────────────────────────────────────
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [filters, setFilters] = useState({
		ramo: ALL,
		compania_id: ALL,
		responsable_id: ALL,
		regional_id: ALL,
	});
	const [soloVencidas, setSoloVencidas] = useState(false);
	const [incluirPagadas, setIncluirPagadas] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 20;

	// ── Sort ─────────────────────────────────────────────────────────
	// Default: cuotas_vencidas DESC (más urgentes primero)
	const [sortField, setSortField] = useState<AnySort>("cuotas_vencidas");
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

	// ── Debounce search ───────────────────────────────────────────────
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	// ── Fetch server-side ─────────────────────────────────────────────
	const fetchPolizas = useCallback(async (page: number, resetPage = false) => {
		const targetPage = resetPage ? 1 : page;
		if (resetPage) setCurrentPage(1);

		const serverSort = SERVER_SORT_FIELDS.has(sortField)
			? (sortField as CobranzaSortField)
			: "cuotas_vencidas";
		const serverDir = SERVER_SORT_FIELDS.has(sortField) ? sortDirection : "desc";

		setIsRefetching(true);
		const result = await obtenerCobranzasPaginadas({
			page: targetPage,
			pageSize,
			search: debouncedSearch || undefined,
			ramo: filters.ramo !== ALL ? filters.ramo : undefined,
			compania_id: filters.compania_id !== ALL ? filters.compania_id : undefined,
			responsable_id: filters.responsable_id !== ALL ? filters.responsable_id : undefined,
			regional_id: filters.regional_id !== ALL ? filters.regional_id : undefined,
			soloVencidas,
			incluirPagadas,
			sortField: serverSort,
			sortDirection: serverDir,
		});
		setIsRefetching(false);

		if (result.success && result.data) {
			setPolizas(result.data.polizas);
			setTotal(result.data.total);
		}
	}, [debouncedSearch, filters, soloVencidas, incluirPagadas, sortField, sortDirection, pageSize]);

	// Re-fetch when filter/sort/page changes (debouncedSearch already debounced)
	useEffect(() => {
		fetchPolizas(currentPage);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedSearch, filters, soloVencidas, incluirPagadas, sortField, sortDirection]);

	// Page navigation
	const goToPage = useCallback((page: number) => {
		setCurrentPage(page);
		fetchPolizas(page);
	}, [fetchPolizas]);

	// ── Sort handler ──────────────────────────────────────────────────
	const handleSort = (field: AnySort) => {
		if (sortField === field) {
			setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
		setCurrentPage(1);
	};

	// ── Client-side sort for cliente/compania (current page only) ─────
	const displayPolizas = useMemo(() => {
		if (sortField !== "cliente" && sortField !== "compania") return polizas;
		return [...polizas].sort((a, b) => {
			const valA = sortField === "cliente"
				? a.client.nombre_completo.toLowerCase()
				: a.compania.nombre.toLowerCase();
			const valB = sortField === "cliente"
				? b.client.nombre_completo.toLowerCase()
				: b.compania.nombre.toLowerCase();
			return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
		});
	}, [polizas, sortField, sortDirection]);

	// ── Filter helpers ────────────────────────────────────────────────
	const hasActiveFilters =
		searchTerm.trim() !== "" ||
		Object.values(filters).some((v) => v !== ALL) ||
		soloVencidas;

	// Active filter chips (for display — resolve names from options)
	const activeFilterLabels: { key: string; label: string; value: string }[] = [];
	if (filters.ramo !== ALL)
		activeFilterLabels.push({ key: "ramo", label: "Ramo", value: filters.ramo });
	if (filters.compania_id !== ALL) {
		const comp = filtrosOptions.companias.find((c) => c.id === filters.compania_id);
		activeFilterLabels.push({ key: "compania_id", label: "Compañía", value: comp?.nombre ?? filters.compania_id });
	}
	if (filters.responsable_id !== ALL) {
		const resp = filtrosOptions.responsables.find((r) => r.id === filters.responsable_id);
		activeFilterLabels.push({ key: "responsable_id", label: "Ejecutivo", value: resp?.full_name ?? filters.responsable_id });
	}
	if (filters.regional_id !== ALL) {
		const reg = filtrosOptions.regionales.find((r) => r.id === filters.regional_id);
		activeFilterLabels.push({ key: "regional_id", label: "Regional", value: reg?.nombre ?? filters.regional_id });
	}

	const clearFilter = (key: string) => {
		setFilters((prev) => ({ ...prev, [key]: ALL }));
		setCurrentPage(1);
	};

	const clearAllFilters = useCallback(() => {
		setSearchTerm("");
		setFilters({ ramo: ALL, compania_id: ALL, responsable_id: ALL, regional_id: ALL });
		setSoloVencidas(false);
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
			fetchPolizas(currentPage);
		}
	};

	const handleRedistribucionSuccess = () => {
		setRedistribucionModalOpen(false);
		fetchPolizas(currentPage);
	};

	// ── Pagination ────────────────────────────────────────────────────
	const totalPages = Math.ceil(total / pageSize);
	const startIndex = (currentPage - 1) * pageSize;

	// ── Render ────────────────────────────────────────────────────────
	return (
		<div className="space-y-6">
			{/* KPI stats */}
			<StatsCards stats={statsIniciales} />

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
								placeholder="Buscar por póliza, cliente, CI/NIT…"
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setCurrentPage(1);
								}}
								className="pl-9 h-9"
							/>
							{searchTerm && (
								<button
									onClick={() => {
										setSearchTerm("");
										setCurrentPage(1);
									}}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</div>

						<Select
							value={filters.ramo}
							onValueChange={(v) => {
								setFilters((prev) => ({ ...prev, ramo: v }));
								setCurrentPage(1);
							}}
						>
							<SelectTrigger size="sm" className="w-[130px]">
								<SelectValue placeholder="Ramo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ramos</SelectItem>
								{filtrosOptions.ramos.map((r) => (
									<SelectItem key={r} value={r}>{r}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.compania_id}
							onValueChange={(v) => {
								setFilters((prev) => ({ ...prev, compania_id: v }));
								setCurrentPage(1);
							}}
						>
							<SelectTrigger size="sm" className="w-[155px]">
								<SelectValue placeholder="Compañía" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas las compañías</SelectItem>
								{filtrosOptions.companias.map((c) => (
									<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.responsable_id}
							onValueChange={(v) => {
								setFilters((prev) => ({ ...prev, responsable_id: v }));
								setCurrentPage(1);
							}}
						>
							<SelectTrigger size="sm" className="w-[155px]">
								<SelectValue placeholder="Ejecutivo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ejecutivos</SelectItem>
								{filtrosOptions.responsables.map((r) => (
									<SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.regional_id}
							onValueChange={(v) => {
								setFilters((prev) => ({ ...prev, regional_id: v }));
								setCurrentPage(1);
							}}
						>
							<SelectTrigger size="sm" className="w-[140px]">
								<SelectValue placeholder="Regional" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas las regionales</SelectItem>
								{filtrosOptions.regionales.map((r) => (
									<SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
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
							{isRefetching && (
								<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
							)}
							<Switch
								id="mostrar-pagadas"
								checked={incluirPagadas}
								onCheckedChange={(v) => {
									setIncluirPagadas(v);
									setCurrentPage(1);
								}}
								disabled={isRefetching}
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
						{incluirPagadas ? "Todas las Pólizas" : "Pólizas con Cuotas Pendientes"}
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							({total})
						</span>
					</CardTitle>
				</CardHeader>

				<CardContent className="p-0 mt-3">
					{displayPolizas.length > 0 ? (
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
													<SortIcon field="cliente" currentField={sortField} direction={sortDirection} />
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("numero_poliza")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Póliza
													<SortIcon field="numero_poliza" currentField={sortField} direction={sortDirection} />
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("compania")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Compañía
													<SortIcon field="compania" currentField={sortField} direction={sortDirection} />
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("cuotas_vencidas")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Cuotas
													<SortIcon field="cuotas_vencidas" currentField={sortField} direction={sortDirection} />
												</button>
											</th>
											<th className="px-4 py-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("monto_pendiente")}
													className="flex items-center gap-1.5 hover:text-primary transition-colors"
												>
													Pendiente
													<SortIcon field="monto_pendiente" currentField={sortField} direction={sortDirection} />
												</button>
											</th>
											<th className="px-4 py-3 text-right text-sm font-medium">
												Acciones
											</th>
										</tr>
									</thead>
									<tbody>
										{displayPolizas.map((poliza) => (
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
														{poliza.cuotas_vencidas === 0 && poliza.cuotas_pendientes === 0 && (
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
							{totalPages > 1 && (
								<div className="flex items-center justify-between px-4 py-3 border-t border-border">
									<p className="text-xs text-muted-foreground">
										{startIndex + 1}–{Math.min(startIndex + pageSize, total)} de {total}
									</p>
									<div className="flex items-center gap-1">
										<Button
											variant="outline"
											size="sm"
											onClick={() => goToPage(currentPage - 1)}
											disabled={currentPage === 1 || isRefetching}
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
													onClick={() => goToPage(pageNum)}
													disabled={isRefetching}
													className="h-7 w-7 p-0 text-xs"
												>
													{pageNum}
												</Button>
											);
										})}
										<Button
											variant="outline"
											size="sm"
											onClick={() => goToPage(currentPage + 1)}
											disabled={currentPage === totalPages || isRefetching}
											className="h-7 px-2.5 text-xs"
										>
											Siguiente
										</Button>
									</div>
								</div>
							)}
						</>
					) : (
						<div className="text-center py-16 border-t border-border">
							{isRefetching ? (
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
							) : (
								<>
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
								</>
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
