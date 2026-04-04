"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { obtenerPolizas, type PolizaListItem } from "./actions";
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

export default function PolizasPage() {
	const router = useRouter();

	const [polizas, setPolizas] = useState<PolizaListItem[]>([]);
	const [selectedPoliza, setSelectedPoliza] = useState<PolizaListItem | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize] = useState(20);
	const [isLoading, setIsLoading] = useState(true);

	const [searchQuery, setSearchQuery] = useState("");
	const ALL = "__all__";
	const [filters, setFilters] = useState({
		ramo: ALL,
		compania: ALL,
		estado: ALL,
		ejecutivo: ALL,
	});

	useEffect(() => {
		cargarPolizas();
	}, []);

	const cargarPolizas = async () => {
		setIsLoading(true);
		const resultado = await obtenerPolizas();
		if (resultado.success && resultado.polizas) {
			setPolizas(resultado.polizas);
		}
		setIsLoading(false);
	};

	const filterOptions = useMemo(() => ({
		ramos: [...new Set(polizas.map((p) => p.ramo))].filter(Boolean).sort(),
		companias: [...new Set(polizas.map((p) => p.compania_nombre))].filter((v) => v !== "-").sort(),
		estados: [...new Set(polizas.map((p) => p.estado))].filter(Boolean).sort(),
		ejecutivos: [...new Set(polizas.map((p) => p.responsable_nombre))].filter((v) => v !== "-").sort(),
	}), [polizas]);

	const filteredPolizas = useMemo(() => {
		let result = polizas;

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(p) =>
					p.numero_poliza.toLowerCase().includes(q) ||
					p.client_name.toLowerCase().includes(q) ||
					p.client_ci.toLowerCase().includes(q)
			);
		}

		if (filters.ramo !== ALL) result = result.filter((p) => p.ramo === filters.ramo);
		if (filters.compania !== ALL) result = result.filter((p) => p.compania_nombre === filters.compania);
		if (filters.estado !== ALL) result = result.filter((p) => p.estado === filters.estado);
		if (filters.ejecutivo !== ALL) result = result.filter((p) => p.responsable_nombre === filters.ejecutivo);

		return result;
	}, [polizas, searchQuery, filters]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, filters]);

	const hasActiveFilters = searchQuery.trim() !== "" || Object.values(filters).some((v) => v !== ALL);
	const activeFilterCount = Object.values(filters).filter((v) => v !== ALL).length + (searchQuery.trim() ? 1 : 0);

	const clearAllFilters = () => {
		setSearchQuery("");
		setFilters({ ramo: ALL, compania: ALL, estado: ALL, ejecutivo: ALL });
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = startIndex + pageSize;
	const paginatedPolizas = filteredPolizas.slice(startIndex, endIndex);
	const totalPages = Math.ceil(filteredPolizas.length / pageSize);

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 space-y-5">

			{/* ── Page Header ─────────────────────────────────────────── */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground tracking-tight">Pólizas</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						{isLoading
							? "Cargando…"
							: polizas.length > 0
							? `${polizas.length} pólizas registradas`
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

						<Select value={filters.ramo} onValueChange={(v) => setFilters((prev) => ({ ...prev, ramo: v }))}>
							<SelectTrigger size="sm" className="w-auto min-w-32">
								<SelectValue placeholder="Ramo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ramos</SelectItem>
								{filterOptions.ramos.map((r) => (
									<SelectItem key={r} value={r}>{r}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={filters.compania} onValueChange={(v) => setFilters((prev) => ({ ...prev, compania: v }))}>
							<SelectTrigger size="sm" className="w-auto min-w-36">
								<SelectValue placeholder="Compañía" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas las compañías</SelectItem>
								{filterOptions.companias.map((c) => (
									<SelectItem key={c} value={c}>{c}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={filters.estado} onValueChange={(v) => setFilters((prev) => ({ ...prev, estado: v }))}>
							<SelectTrigger size="sm" className="w-auto min-w-32">
								<SelectValue placeholder="Estado" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los estados</SelectItem>
								{filterOptions.estados.map((e) => (
									<SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={filters.ejecutivo} onValueChange={(v) => setFilters((prev) => ({ ...prev, ejecutivo: v }))}>
							<SelectTrigger size="sm" className="w-auto min-w-36">
								<SelectValue placeholder="Ejecutivo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos los ejecutivos</SelectItem>
								{filterOptions.ejecutivos.map((ej) => (
									<SelectItem key={ej} value={ej}>{ej}</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Results summary pushed to the right */}
						<div className="ml-auto text-xs text-muted-foreground">
							{hasActiveFilters ? (
								<>
									<span className="font-medium text-foreground">{filteredPolizas.length}</span>
									{" "}de{" "}
									<span className="font-medium text-foreground">{polizas.length}</span>
									{" "}pólizas
								</>
							) : (
								<>
									<span className="font-medium text-foreground">{polizas.length}</span>
									{" "}pólizas
								</>
							)}
						</div>
					</div>

					{/* Active filter chips — visible only when filters are active */}
					{hasActiveFilters && (
						<div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
							{filters.ramo !== ALL && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
									{filters.ramo.length > 28 ? filters.ramo.slice(0, 28) + "…" : filters.ramo}
									<button
										onClick={() => setFilters((prev) => ({ ...prev, ramo: ALL }))}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
										aria-label="Quitar filtro de ramo"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{filters.compania !== ALL && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
									{filters.compania.length > 24 ? filters.compania.slice(0, 24) + "…" : filters.compania}
									<button
										onClick={() => setFilters((prev) => ({ ...prev, compania: ALL }))}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
										aria-label="Quitar filtro de compañía"
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
										aria-label="Quitar filtro de estado"
									>
										<X className="h-3 w-3" />
									</button>
								</span>
							)}
							{filters.ejecutivo !== ALL && (
								<span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/20">
									{filters.ejecutivo.length > 22 ? filters.ejecutivo.slice(0, 22) + "…" : filters.ejecutivo}
									<button
										onClick={() => setFilters((prev) => ({ ...prev, ejecutivo: ALL }))}
										className="ml-0.5 p-0.5 rounded hover:bg-primary/15 transition-colors"
										aria-label="Quitar filtro de ejecutivo"
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
										aria-label="Quitar búsqueda"
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
												<div className={`h-4 bg-muted rounded animate-pulse`} style={{ width: w }} />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : paginatedPolizas.length === 0 ? (
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
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Nº Póliza
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Ramo
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Cliente
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Compañía
									</th>
									<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Vigencia
									</th>
									<th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Prima
									</th>
									<th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Estado
									</th>
									<th className="w-8" />
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{paginatedPolizas.map((poliza) => (
									<tr
										key={poliza.id}
										onClick={() => setSelectedPoliza(poliza)}
										className="group hover:bg-muted/40 cursor-pointer transition-colors duration-100"
									>
										{/* Nº Póliza */}
										<td className="px-4 py-3">
											<span className="text-sm font-medium text-foreground font-mono">
												{poliza.numero_poliza}
											</span>
										</td>

										{/* Ramo */}
										<td className="px-4 py-3">
											<span className="text-sm text-muted-foreground">{poliza.ramo}</span>
										</td>

										{/* Cliente + CI merged */}
										<td className="px-4 py-3">
											<div className="text-sm font-medium text-foreground leading-tight">
												{poliza.client_name}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												{poliza.client_ci}
											</div>
										</td>

										{/* Compañía */}
										<td className="px-4 py-3">
											<span className="text-sm text-muted-foreground truncate max-w-36 block">
												{poliza.compania_nombre}
											</span>
										</td>

										{/* Vigencia */}
										<td className="px-4 py-3">
											<div className="text-sm text-foreground tabular-nums">
												{formatDate(poliza.inicio_vigencia)}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
												{formatDate(poliza.fin_vigencia)}
											</div>
										</td>

										{/* Prima + modalidad */}
										<td className="px-4 py-3 text-right">
											<div className="text-sm font-medium text-foreground tabular-nums">
												{formatCurrency(poliza.prima_total, poliza.moneda)}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5 capitalize">
												{poliza.modalidad_pago}
											</div>
										</td>

										{/* Estado */}
										<td className="px-4 py-3">
											<div className="flex justify-center">
												<StatusBadge status={poliza.estado} />
											</div>
										</td>

										{/* Arrow */}
										<td className="pr-3 py-3">
											<ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination inside the card */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between px-4 py-3 border-t border-border">
						<p className="text-xs text-muted-foreground">
							{startIndex + 1}–{Math.min(endIndex, filteredPolizas.length)} de {filteredPolizas.length}
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

			{/* ── Detail Panel (modal) ─────────────────────────────────── */}
			{selectedPoliza && (
				<div
					className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
					onClick={(e) => e.target === e.currentTarget && setSelectedPoliza(null)}
				>
					<div className="bg-card w-full sm:max-w-2xl sm:rounded-lg max-h-[92vh] overflow-y-auto shadow-md">
						{/* Header */}
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

						{/* Body */}
						<div className="p-5 space-y-5">
							{/* Client + Company */}
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

							{/* Divider */}
							<div className="border-t border-border" />

							{/* Ramo / Regional / Director / Ejecutivo */}
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

							{/* Divider */}
							<div className="border-t border-border" />

							{/* Vigencia + Prima */}
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
									<p className="text-xs text-muted-foreground capitalize">
										{selectedPoliza.modalidad_pago}
									</p>
								</div>
							</div>

							{/* CTA */}
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
