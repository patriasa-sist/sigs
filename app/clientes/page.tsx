"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Client, ClientSearchResult } from "@/types/client";
import { getAllClients, searchClients as searchClientsAction } from "./actions";
import { SearchBar } from "@/components/clientes/SearchBar";
import { ClientList } from "@/components/clientes/ClientList";
import { ClientTable } from "@/components/clientes/ClientTable";
import { ClientDetailModal } from "@/components/clientes/ClientDetailModal";
import { ViewToggle, ViewMode } from "@/components/clientes/ViewToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, AlertCircle, Plus } from "lucide-react";

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

	useEffect(() => {
		async function loadClients() {
			if (isSearchMode) return;
			setIsLoading(true);
			setError(null);
			try {
				const result = await getAllClients({ page: currentPage, pageSize });
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
	}, [currentPage, pageSize, isSearchMode]);

	const handleSearch = async (query: string) => {
		if (!query.trim()) {
			setIsSearchMode(false);
			setCurrentPage(1);
			return;
		}
		setIsLoading(true);
		try {
			const result = await searchClientsAction(query);
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

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const totalPages = Math.ceil(totalRecords / pageSize);
	const startIndex = (currentPage - 1) * pageSize;

	if (isLoading) return <LoadingState />;

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
						{totalRecords > 0 ? `${totalRecords} clientes registrados` : "Gestión de clientes"}
					</p>
				</div>
				<Button size="sm" onClick={() => router.push("/clientes/nuevo")} className="shrink-0 cursor-pointer">
					<Plus className="h-4 w-4" />
					Nuevo Cliente
				</Button>
			</div>

			{/* ── Search + View Toggle ─────────────────────────────────── */}
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-3">
						<div className="flex-1">
							<SearchBar onSearch={handleSearch} />
						</div>
						<div className="flex items-center gap-3 shrink-0">
							{isSearchMode && (
								<p className="text-xs text-muted-foreground">
									<span className="font-medium text-foreground">{displayedClients.length}</span>{" "}
									resultado{displayedClients.length !== 1 ? "s" : ""}
								</p>
							)}
							<ViewToggle currentView={viewMode} onViewChange={setViewMode} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Table / Cards ────────────────────────────────────────── */}
			<Card>
				{displayedClients.length === 0 ? (
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
