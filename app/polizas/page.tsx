"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
	obtenerPolizas,
	obtenerFiltrosPolizas,
	type PolizaListItem,
	type FiltrosPolizasData,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	FileText,
	Plus,
	X,
	Calendar,
	DollarSign,
	Building2,
	User,
	Search,
	SlidersHorizontal,
	ChevronRight,
	RotateCcw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/formatters";

const ALL = "__all__";
const PAGE_SIZE = 20;

type Filters = {
	ramo: string;
	compania_id: string;
	estado: string;
	responsable_id: string;
};

const DEFAULT_FILTERS: Filters = {
	ramo: ALL,
	compania_id: ALL,
	estado: ALL,
	responsable_id: ALL,
};

function SkeletonTable() {
	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b border-border">
						{["Nº Póliza", "Ramo", "Cliente", "Compañía", "Vigencia", "Prima", "Estado", ""].map((h) => (
							<th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{Array.from({ length: 8 }).map((_, i) => (
						<tr key={i}>
							{[72, 48, 120, 96, 80, 64, 56, 16].map((w, j) => (
								<td key={j} className="px-4 py-3">
									<div className="h-4 bg-muted rounded animate-pulse" style={{ width: w }} />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default function PolizasPage() {
	const router = useRouter();

	const [polizas, setPolizas] = useState<PolizaListItem[]>([]);
	const [filtrosData, setFiltrosData] = useState<FiltrosPolizasData>({
		ramos: [],
		ejecutivos: [],
		companias: [],
		estados: [],
	});
	const [selectedPoliza, setSelectedPoliza] = useState<PolizaListItem | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalRecords, setTotalRecords] = useState(0);
	const [isLoading, setIsLoading] = useState(true);

	const [searchQuery, setSearchQuery] = useState("");
	const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

	// Debounce del campo de búsqueda
	const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		if (searchTimer.current) clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 350);
		return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
	}, [searchQuery]);

	// Cargar opciones de filtros una sola vez
	useEffect(() => {
		obtenerFiltrosPolizas().then((result) => {
			if (result.success && result.data) setFiltrosData(result.data);
		});
	}, []);

	// Cargar pólizas cuando cambian filtros o búsqueda — resetea a página 1
	useEffect(() => {
		let cancelled = false;
		setCurrentPage(1);
		setIsLoading(true);

		obtenerPolizas({
			page: 1,
			pageSize: PAGE_SIZE,
			search: debouncedSearch || undefined,
			ramo: filters.ramo !== ALL ? filters.ramo : undefined,
			compania_id: filters.compania_id !== ALL ? filters.compania_id : undefined,
			estado: filters.estado !== ALL ? filters.estado : undefined,
			responsable_id: filters.responsable_id !== ALL ? filters.responsable_id : undefined,
		}).then((result) => {
			if (cancelled) return;
			if (result.success) {
				setPolizas(result.polizas);
				setTotalRecords(result.total);
			}
			setIsLoading(false);
		});

		return () => { cancelled = true; };
	}, [debouncedSearch, filters.ramo, filters.compania_id, filters.estado, filters.responsable_id]);

	const handlePageChange = async (page: number) => {
		setCurrentPage(page);
		setIsLoading(true);
		window.scrollTo({ top: 0, behavior: "smooth" });

		const result = await obtenerPolizas({
			page,
			pageSize: PAGE_SIZE,
			search: debouncedSearch || undefined,
			ramo: filters.ramo !== ALL ? filters.ramo : undefined,
			compania_id: filters.compania_id !== ALL ? filters.compania_id : undefined,
			estado: filters.estado !== ALL ? filters.estado : undefined,
			responsable_id: filters.responsable_id !== ALL ? filters.responsable_id : undefined,
		});

		if (result.success) {
			setPolizas(result.polizas);
			setTotalRecords(result.total);
		}
		setIsLoading(false);
	};

	const clearAllFilters = () => {
		setSearchQuery("");
		setFilters(DEFAULT_FILTERS);
	};

	const hasActiveFilters =
		searchQuery.trim() !== "" || Object.values(filters).some((v) => v !== ALL);
	const activeFilterCount =
		Object.values(filters).filter((v) => v !== ALL).length + (searchQuery.trim() ? 1 : 0);

	const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
	const startIndex = (currentPage - 1) * PAGE_SIZE;

	// Labels para chips
	const companiaLabel = filtrosData.companias.find((c) => c.id === filters.compania_id)?.nombre ?? "";
	const ejecutivoLabel = filtrosData.ejecutivos.find((e) => e.id === filters.responsable_id)?.nombre ?? "";

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 space-y-5">

			{/* ── Page Header ─────────────────────────────────────────── */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground tracking-tight">Pólizas</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						{isLoading
							? "Cargando…"
							: totalRecords > 0
							? `${totalRecords} pólizas encontradas`
							: "Gestión de pólizas de seguros"}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						onClick={() => router.push("/polizas/anexos/nuevo")}
						variant="outline"
						size="sm"
						className="cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						Nuevo Anexo
					</Button>
					<Button
						onClick={() => router.push("/polizas/nueva")}
						size="sm"
						className="cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						Nueva Póliza
					</Button>
				</div>
			</div>

			{/* ── Search + Filters ─────────────────────────────────────── */}
			<Card>
				<CardContent className="p-4 space-y-3">
					{/* Search row */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
						<Input
							type="text"
							placeholder="Buscar por Nº póliza, nombre del cliente, CI/NIT…"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 pr-9"
						/>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>

					{/* Filters row */}
					<div className="flex flex-wrap items-center gap-2">
						<SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

						<Select
							value={filters.ramo}
							onValueChange={(v) => setFilters((prev) => ({ ...prev, ramo: v }))}
						>
							<SelectTrigger size="sm" className="w-auto min-w-32">
								<SelectValue placeholder="Ramo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ramos</SelectItem>
								{filtrosData.ramos.map((r) => (
									<SelectItem key={r} value={r}>{r}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.compania_id}
							onValueChange={(v) => setFilters((prev) => ({ ...prev, compania_id: v }))}
						>
							<SelectTrigger size="sm" className="w-auto min-w-36">
								<SelectValue placeholder="Compañía" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas las compañías</SelectItem>
								{filtrosData.companias.map((c) => (
									<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.estado}
							onValueChange={(v) => setFilters((prev) => ({ ...prev, estado: v }))}
						>
							<SelectTrigger size="sm" className="w-auto min-w-32">
								<SelectValue placeholder="Estado" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los estados</SelectItem>
								{filtrosData.estados.map((e) => (
									<SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.responsable_id}
							onValueChange={(v) => setFilters((prev) => ({ ...prev, responsable_id: v }))}
						>
							<SelectTrigger size="sm" className="w-auto min-w-36">
								<SelectValue placeholder="Ejecutivo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ejecutivos</SelectItem>
								{filtrosData.ejecutivos.map((e) => (
									<SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Contador de resultados */}
						<div className="ml-auto text-xs text-muted-foreground">
							{!isLoading && (
								<>
									<span className="font-medium text-foreground">{totalRecords}</span>
									{" "}pólizas
								</>
							)}
						</div>
					</div>

					{/* Active filter chips */}
					{hasActiveFilters && (
						<div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
							{filters.ramo !== ALL && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
									{filters.ramo.length > 28 ? filters.ramo.slice(0, 28) + "…" : filters.ramo}
									<button
										onClick={() => setFilters((prev) => ({ ...prev, ramo: ALL }))}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{filters.compania_id !== ALL && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
									{companiaLabel.length > 24 ? companiaLabel.slice(0, 24) + "…" : companiaLabel}
									<button
										onClick={() => setFilters((prev) => ({ ...prev, compania_id: ALL }))}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{filters.estado !== ALL && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20 capitalize">
									{filters.estado}
									<button
										onClick={() => setFilters((prev) => ({ ...prev, estado: ALL }))}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{filters.responsable_id !== ALL && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
									{ejecutivoLabel.length > 22 ? ejecutivoLabel.slice(0, 22) + "…" : ejecutivoLabel}
									<button
										onClick={() => setFilters((prev) => ({ ...prev, responsable_id: ALL }))}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{searchQuery.trim() && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
									<Search className="h-3 w-3 shrink-0" />
									&ldquo;{searchQuery.length > 20 ? searchQuery.slice(0, 20) + "…" : searchQuery}&rdquo;
									<button
										onClick={() => setSearchQuery("")}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{activeFilterCount > 1 && (
								<button
									onClick={clearAllFilters}
									className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-0.5 rounded-md text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/8 border border-border hover:border-destructive/25 transition-colors ml-0.5"
								>
									<RotateCcw className="h-3 w-3" />
									Limpiar todo
								</button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* ── Table ───────────────────────────────────────────────── */}
			<Card>
				{isLoading ? (
					<SkeletonTable />
				) : polizas.length === 0 ? (
					<CardContent className="flex flex-col items-center justify-center py-20">
						<FileText className="h-10 w-10 text-muted-foreground/25 mb-3" />
						<p className="text-sm font-medium text-foreground">
							{hasActiveFilters ? "Sin resultados" : "Sin pólizas registradas"}
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							{hasActiveFilters
								? "Ninguna póliza coincide con los filtros activos."
								: "Crea la primera póliza para comenzar."}
						</p>
					</CardContent>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nº Póliza</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Ramo</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Compañía</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Vigencia</th>
									<th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Prima</th>
									<th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
									<th className="w-8" />
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{polizas.map((poliza) => (
									<tr
										key={poliza.id}
										onClick={() => setSelectedPoliza(poliza)}
										className="group hover:bg-muted/40 cursor-pointer transition-colors duration-100"
									>
										<td className="px-4 py-3">
											<span className="text-sm font-medium text-foreground font-mono">
												{poliza.numero_poliza}
											</span>
										</td>
										<td className="px-4 py-3">
											<span className="text-sm text-muted-foreground">{poliza.ramo}</span>
										</td>
										<td className="px-4 py-3">
											<div className="text-sm font-medium text-foreground leading-tight">{poliza.client_name}</div>
											<div className="text-xs text-muted-foreground mt-0.5">{poliza.client_ci}</div>
										</td>
										<td className="px-4 py-3">
											<span className="text-sm text-muted-foreground truncate max-w-36 block">
												{poliza.compania_nombre}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="text-sm text-foreground tabular-nums">{formatDate(poliza.inicio_vigencia)}</div>
											<div className="text-xs text-muted-foreground mt-0.5 tabular-nums">{formatDate(poliza.fin_vigencia)}</div>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="text-sm font-medium text-foreground tabular-nums">
												{formatCurrency(poliza.prima_total, poliza.moneda)}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5 capitalize">{poliza.modalidad_pago}</div>
										</td>
										<td className="px-4 py-3">
											<div className="flex justify-center">
												<StatusBadge status={poliza.estado} />
											</div>
										</td>
										<td className="pr-3 py-3">
											<ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				{!isLoading && totalPages > 1 && (
					<div className="flex items-center justify-between px-4 py-3 border-t border-border">
						<p className="text-xs text-muted-foreground">
							{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalRecords)} de {totalRecords}
						</p>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handlePageChange(currentPage - 1)}
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
										onClick={() => handlePageChange(pageNum)}
										className="h-7 w-7 p-0 text-xs"
									>
										{pageNum}
									</Button>
								);
							})}
							<Button
								variant="outline"
								size="sm"
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage === totalPages}
								className="h-7 px-2.5 text-xs"
							>
								Siguiente
							</Button>
						</div>
					</div>
				)}
			</Card>

			{/* ── Detail Modal ─────────────────────────────────────────── */}
			{selectedPoliza && (
				<div
					className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
					onClick={(e) => e.target === e.currentTarget && setSelectedPoliza(null)}
				>
					<div className="bg-card w-full sm:max-w-2xl sm:rounded-lg max-h-[92vh] overflow-y-auto shadow-md">
						<div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Póliza</p>
								<h2 className="text-base font-semibold text-foreground font-mono">
									{selectedPoliza.numero_poliza}
								</h2>
							</div>
							<div className="flex items-center gap-3">
								<StatusBadge status={selectedPoliza.estado} />
								<Button variant="ghost" size="icon" onClick={() => setSelectedPoliza(null)} className="h-8 w-8">
									<X className="h-4 w-4" />
								</Button>
							</div>
						</div>
						<div className="p-5 space-y-5">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
										<User className="h-3 w-3" /> Cliente
									</p>
									<p className="text-sm font-medium text-foreground">{selectedPoliza.client_name}</p>
									<p className="text-xs text-muted-foreground">CI/NIT: {selectedPoliza.client_ci}</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
										<Building2 className="h-3 w-3" /> Compañía
									</p>
									<p className="text-sm text-foreground">{selectedPoliza.compania_nombre}</p>
								</div>
							</div>
							<div className="border-t border-border" />
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground">Ramo</p>
									<p className="text-sm text-foreground">{selectedPoliza.ramo}</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground">Regional</p>
									<p className="text-sm text-foreground">{selectedPoliza.regional_nombre}</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground">Director de cartera</p>
									<p className="text-sm text-foreground">{selectedPoliza.director_cartera_nombre || "—"}</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground">Ejecutivo comercial</p>
									<p className="text-sm text-foreground">{selectedPoliza.responsable_nombre}</p>
								</div>
							</div>
							<div className="border-t border-border" />
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
										<Calendar className="h-3 w-3" /> Vigencia
									</p>
									<p className="text-sm text-foreground tabular-nums">
										desde {formatDate(selectedPoliza.inicio_vigencia)}
									</p>
									<p className="text-sm text-foreground tabular-nums">
										hasta {formatDate(selectedPoliza.fin_vigencia)}
									</p>
								</div>
								<div className="space-y-0.5">
									<p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
										<DollarSign className="h-3 w-3" /> Prima Total
									</p>
									<p className="text-lg font-semibold text-foreground tabular-nums">
										{formatCurrency(selectedPoliza.prima_total, selectedPoliza.moneda)}
									</p>
									<p className="text-xs text-muted-foreground capitalize">{selectedPoliza.modalidad_pago}</p>
								</div>
							</div>
							<div className="pt-1">
								<Button
									onClick={() => router.push(`/polizas/${selectedPoliza.id}`)}
									className="w-full"
								>
									Ver detalles completos
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
