"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, ClientSearchResult } from "@/types/client";
import { getAllClients, searchClients as searchClientsAction, obtenerFiltrosClientes, FiltrosClientesOptions } from "./actions";
import { SearchBar } from "@/components/clientes/SearchBar";
import { ClientList } from "@/components/clientes/ClientList";
import { ClientTable } from "@/components/clientes/ClientTable";
import { ClientDetailModal } from "@/components/clientes/ClientDetailModal";
import { ViewToggle, ViewMode } from "@/components/clientes/ViewToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, AlertCircle, Plus, X } from "lucide-react";

const ALL = "__all__";

export default function ClientesPage() {
	return (
		<Suspense fallback={<LoadingState />}>
			<ClientesContent />
		</Suspense>
	);
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center min-h-[60vh]">
			<div className="text-center space-y-3">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
				<p className="text-sm text-muted-foreground">Cargando clientes…</p>
			</div>
		</div>
	);
}

function ClientesContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [displayedClients, setDisplayedClients] = useState<Client[] | ClientSearchResult[]>([]);
	const [isSearchMode, setIsSearchMode] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [viewMode, setViewMode] = useState<ViewMode>("table");
	const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

	// Filters
	const [ejecutivoId, setEjecutivoId] = useState<string>(ALL);
	const [filtrosOptions, setFiltrosOptions] = useState<FiltrosClientesOptions>({ ejecutivos: [] });

	useEffect(() => {
		obtenerFiltrosClientes().then((result) => {
			if (result.success) setFiltrosOptions(result.data);
		});
	}, []);

	useEffect(() => {
		const detalleId = searchParams.get("detalle");
		if (detalleId) {
			setSelectedClientId(detalleId);
			router.replace("/clientes", { scroll: false });
		}
	}, [searchParams, router]);

	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize] = useState(20);
	const [totalRecords, setTotalRecords] = useState(0);

	const activeEjecutivoId = ejecutivoId !== ALL ? ejecutivoId : undefined;

	useEffect(() => {
		async function loadClients() {
			if (isSearchMode) return;
			setIsLoading(true);
			setError(null);
			try {
				const result = await getAllClients({ page: currentPage, pageSize, commercial_owner_id: activeEjecutivoId });
				if (result.success) {
					setDisplayedClients(result.data);
					setTotalRecords(result.pagination.totalRecords);
				} else {
					setError(result.error);
					console.error("Error loading clients:", result.error, result.details);
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Error desconocido";
				setError(msg);
				console.error("Unexpected error loading clients:", err);
			} finally {
				setIsLoading(false);
			}
		}
		loadClients();
	}, [currentPage, pageSize, isSearchMode, activeEjecutivoId]);

	const [activeSearchQuery, setActiveSearchQuery] = useState("");

	const handleSearch = async (query: string) => {
		setActiveSearchQuery(query);
		if (!query.trim()) {
			setIsSearchMode(false);
			setCurrentPage(1);
			return;
		}
		setIsLoading(true);
		try {
			const result = await searchClientsAction(query, { commercial_owner_id: activeEjecutivoId });
			if (result.success) {
				setDisplayedClients(result.data);
				setIsSearchMode(true);
				setTotalRecords(result.data.length);
			} else {
				console.error("Search error:", result.error);
				setError("Error al buscar clientes");
			}
		} catch (err) {
			console.error("Unexpected search error:", err);
			setError("Error inesperado al buscar");
		} finally {
			setIsLoading(false);
			setCurrentPage(1);
		}
	};

	// Re-run search when filter changes while in search mode
	useEffect(() => {
		if (isSearchMode && activeSearchQuery) {
			handleSearch(activeSearchQuery);
		} else if (!isSearchMode) {
			setCurrentPage(1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ejecutivoId]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const totalPages = Math.ceil(totalRecords / pageSize);
	const startIndex = (currentPage - 1) * pageSize;

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center max-w-md space-y-3">
					<AlertCircle className="h-10 w-10 text-destructive mx-auto" />
					<p className="text-sm font-medium">Error al cargar clientes</p>
					<p className="text-xs text-muted-foreground">{error}</p>
					<Button size="sm" onClick={() => window.location.reload()}>
						Reintentar
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 space-y-5">
			{/* ── Page Header ─────────────────────────────────────────── */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground tracking-tight">Clientes</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						{isLoading ? "Cargando…" : totalRecords > 0 ? `${totalRecords} clientes registrados` : "Gestión de clientes"}
					</p>
				</div>
				<Button size="sm" onClick={() => router.push("/clientes/nuevo")} className="shrink-0 cursor-pointer">
					<Plus className="h-4 w-4" />
					Nuevo Cliente
				</Button>
			</div>

			{/* ── Search + Filters + View Toggle ───────────────────────── */}
			<Card>
				<CardContent className="p-4 space-y-3">
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex-1 min-w-[200px]">
							<SearchBar onSearch={handleSearch} />
						</div>

						{/* Ejecutivo filter */}
						{filtrosOptions.ejecutivos.length > 0 && (
							<Select
								value={ejecutivoId}
								onValueChange={(v) => {
									setEjecutivoId(v);
									setCurrentPage(1);
								}}
							>
								<SelectTrigger size="sm" className="w-[180px]">
									<SelectValue placeholder="Ejecutivo" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ALL}>Todos los ejecutivos</SelectItem>
									{filtrosOptions.ejecutivos.map((e) => (
										<SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						<div className="flex items-center gap-3 shrink-0 ml-auto">
							{isSearchMode && (
								<p className="text-xs text-muted-foreground">
									<span className="font-medium text-foreground">{displayedClients.length}</span>{" "}
									resultado{displayedClients.length !== 1 ? "s" : ""}
								</p>
							)}
							<ViewToggle currentView={viewMode} onViewChange={setViewMode} />
						</div>
					</div>

					{/* Active filter chips */}
					{ejecutivoId !== ALL && (
						<div className="flex flex-wrap gap-2">
							<span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
								Ejecutivo: {filtrosOptions.ejecutivos.find((e) => e.id === ejecutivoId)?.full_name ?? ejecutivoId}
								<button
									onClick={() => setEjecutivoId(ALL)}
									className="hover:text-primary/70"
									aria-label="Quitar filtro ejecutivo"
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* ── Table / Cards ────────────────────────────────────────── */}
			<Card>
				{isLoading ? (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									{["Nombre", "CI / NIT", "Tipo", "Teléfono", ""].map((h) => (
										<th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{Array.from({ length: 8 }).map((_, i) => (
									<tr key={i}>
										{[140, 80, 56, 72, 16].map((w, j) => (
											<td key={j} className="px-4 py-3">
												<div className="h-4 bg-muted rounded animate-pulse" style={{ width: w }} />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : displayedClients.length === 0 ? (
					<CardContent className="flex flex-col items-center justify-center py-20">
						<UserPlus className="h-10 w-10 text-muted-foreground/25 mb-3" />
						<p className="text-sm font-medium text-foreground">
							{isSearchMode ? "Sin resultados" : "Sin clientes registrados"}
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							{isSearchMode
								? "Ningún cliente coincide con tu búsqueda."
								: "Registra el primer cliente para comenzar."}
						</p>
					</CardContent>
				) : viewMode === "table" ? (
					<ClientTable
						clients={displayedClients}
						searchMode={isSearchMode}
						onClientClick={(c) => setSelectedClientId(c.id)}
					/>
				) : (
					<CardContent className="p-4">
						<ClientList
							clients={displayedClients}
							searchMode={isSearchMode}
							onClientClick={(c) => setSelectedClientId(c.id)}
						/>
					</CardContent>
				)}

				{/* Pagination inside card */}
				{!isSearchMode && totalPages > 1 && (
					<div className="flex items-center justify-between px-4 py-3 border-t border-border">
						<p className="text-xs text-muted-foreground">
							{startIndex + 1}–{Math.min(startIndex + pageSize, totalRecords)} de {totalRecords}
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

			{selectedClientId && (
				<ClientDetailModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
			)}
		</div>
	);
}
