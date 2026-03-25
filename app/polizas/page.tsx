"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { obtenerPolizas, type PolizaListItem } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, X, Calendar, DollarSign, Building2, User, Search, FilterX } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/formatters";

export default function PolizasPage() {
	const router = useRouter();

	// State management
	const [polizas, setPolizas] = useState<PolizaListItem[]>([]);
	const [selectedPoliza, setSelectedPoliza] = useState<PolizaListItem | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize] = useState(20);
	const [isLoading, setIsLoading] = useState(true);

	// Search & filters
	const [searchQuery, setSearchQuery] = useState("");
	const ALL = "__all__";
	const [filters, setFilters] = useState({
		ramo: ALL,
		compania: ALL,
		estado: ALL,
		ejecutivo: ALL,
	});

	// Load data on mount
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

	// Derive unique filter options from loaded data
	const filterOptions = useMemo(() => ({
		ramos: [...new Set(polizas.map((p) => p.ramo))].filter(Boolean).sort(),
		companias: [...new Set(polizas.map((p) => p.compania_nombre))].filter((v) => v !== "-").sort(),
		estados: [...new Set(polizas.map((p) => p.estado))].filter(Boolean).sort(),
		ejecutivos: [...new Set(polizas.map((p) => p.responsable_nombre))].filter((v) => v !== "-").sort(),
	}), [polizas]);

	// Client-side filtering
	const filteredPolizas = useMemo(() => {
		let result = polizas;

		// Text search across multiple fields
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(p) =>
					p.numero_poliza.toLowerCase().includes(q) ||
					p.client_name.toLowerCase().includes(q) ||
					p.client_ci.toLowerCase().includes(q)
			);
		}

		// Apply dropdown filters
		if (filters.ramo !== ALL) result = result.filter((p) => p.ramo === filters.ramo);
		if (filters.compania !== ALL) result = result.filter((p) => p.compania_nombre === filters.compania);
		if (filters.estado !== ALL) result = result.filter((p) => p.estado === filters.estado);
		if (filters.ejecutivo !== ALL) result = result.filter((p) => p.responsable_nombre === filters.ejecutivo);

		return result;
	}, [polizas, searchQuery, filters]);

	// Reset page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, filters]);

	const hasActiveFilters = searchQuery.trim() !== "" || Object.values(filters).some((v) => v !== ALL);

	const activeFilterLabels: { key: string; label: string; value: string }[] = [];
	if (filters.ramo !== ALL) activeFilterLabels.push({ key: "ramo", label: "Ramo", value: filters.ramo });
	if (filters.compania !== ALL) activeFilterLabels.push({ key: "compania", label: "Compañía", value: filters.compania });
	if (filters.estado !== ALL) activeFilterLabels.push({ key: "estado", label: "Estado", value: filters.estado });
	if (filters.ejecutivo !== ALL) activeFilterLabels.push({ key: "ejecutivo", label: "Ejecutivo", value: filters.ejecutivo });

	const clearFilter = (key: string) => {
		setFilters((prev) => ({ ...prev, [key]: ALL }));
	};

	const clearAllFilters = () => {
		setSearchQuery("");
		setFilters({ ramo: ALL, compania: ALL, estado: ALL, ejecutivo: ALL });
	};

	// Handle page change
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// Handle new policy button
	const handleNewPolicy = () => {
		router.push("/polizas/nueva");
	};

	// Handle policy click
	const handlePolicyClick = (poliza: PolizaListItem) => {
		setSelectedPoliza(poliza);
	};

	// Handle close detail modal
	const handleCloseDetail = () => {
		setSelectedPoliza(null);
	};

	// Calculate pagination
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = startIndex + pageSize;
	const paginatedPolizas = filteredPolizas.slice(startIndex, endIndex);
	const totalPages = Math.ceil(filteredPolizas.length / pageSize);

	// Status styling
	const getEstadoStyle = (estado: string) => {
		const styles = {
			pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
			activa: "bg-green-100 text-green-800 border-green-200",
			vencida: "bg-red-100 text-red-800 border-red-200",
			cancelada: "bg-gray-100 text-gray-800 border-gray-200",
			renovada: "bg-blue-100 text-blue-800 border-blue-200",
		};
		return styles[estado as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
	};

	const getEstadoLabel = (estado: string) => {
		const labels = {
			pendiente: "pendiente",
			activa: "Activa",
			vencida: "Vencida",
			cancelada: "Cancelada",
			renovada: "Renovada",
		};
		return labels[estado as keyof typeof labels] || estado;
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
					<p className="text-gray-600">Cargando pólizas...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8 max-w-7xl">
			{/* Header */}
			<div className="mb-8">
				<div className="flex items-center justify-between gap-3 mb-2">
					<div className="flex items-center gap-3">
						<FileText className="h-8 w-8 text-primary" />
						<h1 className="text-4xl font-bold text-gray-900">Pólizas</h1>
					</div>
					<div className="flex items-center gap-3">
						<Button
							onClick={() => router.push("/polizas/anexos/nuevo")}
							size="sm"
							variant="outline"
							className="font-semibold cursor-pointer"
						>
							<Plus className="mr-1.5 h-4 w-4" />
							Nuevo Anexo
						</Button>
						<Button
							onClick={handleNewPolicy}
							size="sm"
							className="font-semibold cursor-pointer"
						>
							<Plus className="mr-1.5 h-4 w-4" />
							Nueva Póliza
						</Button>
					</div>
				</div>
				<p className="text-gray-600 ml-11">Gestión de pólizas de seguros y seguimiento de pagos</p>
			</div>

			{/* Search Bar */}
			<div className="mb-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Buscar por Nº póliza, cliente, CI/NIT..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-10 text-base h-11"
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>

			{/* Filters Row */}
			<div className="flex flex-wrap items-center gap-3 mb-4">
				<Select value={filters.ramo} onValueChange={(v) => setFilters((prev) => ({ ...prev, ramo: v }))}>
					<SelectTrigger size="sm"><SelectValue placeholder="Ramo" /></SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todos los ramos</SelectItem>
						{filterOptions.ramos.map((r) => (
							<SelectItem key={r} value={r}>{r}</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={filters.compania} onValueChange={(v) => setFilters((prev) => ({ ...prev, compania: v }))}>
					<SelectTrigger size="sm"><SelectValue placeholder="Compañía" /></SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todas las compañías</SelectItem>
						{filterOptions.companias.map((c) => (
							<SelectItem key={c} value={c}>{c}</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={filters.estado} onValueChange={(v) => setFilters((prev) => ({ ...prev, estado: v }))}>
					<SelectTrigger size="sm"><SelectValue placeholder="Estado" /></SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todos los estados</SelectItem>
						{filterOptions.estados.map((e) => (
							<SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={filters.ejecutivo} onValueChange={(v) => setFilters((prev) => ({ ...prev, ejecutivo: v }))}>
					<SelectTrigger size="sm"><SelectValue placeholder="Ejecutivo" /></SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todos los ejecutivos</SelectItem>
						{filterOptions.ejecutivos.map((ej) => (
							<SelectItem key={ej} value={ej}>{ej}</SelectItem>
						))}
					</SelectContent>
				</Select>

				{hasActiveFilters && (
					<Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground gap-1">
						<FilterX className="h-4 w-4" />
						Limpiar
					</Button>
				)}
			</div>

			{/* Active Filter Chips + Results Count */}
			<div className="flex flex-wrap items-center justify-between gap-2 mb-6">
				<div className="flex flex-wrap items-center gap-2">
					{activeFilterLabels.map((f) => (
						<Badge key={f.key} variant="secondary" className="gap-1 pr-1">
							{f.label}: {f.value}
							<button
								onClick={() => clearFilter(f.key)}
								className="ml-1 rounded-full hover:bg-muted p-0.5"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
				<div className="text-sm text-gray-600">
					{hasActiveFilters ? (
						<span>
							<span className="font-semibold text-primary">{filteredPolizas.length}</span>{" "}
							{filteredPolizas.length === 1 ? "resultado" : "resultados"} de{" "}
							<span className="font-semibold">{polizas.length}</span>
						</span>
					) : (
						<span>
							<span className="font-semibold">{polizas.length}</span> pólizas totales
						</span>
					)}
				</div>
			</div>

			{/* Policy Table */}
			<div className="bg-white rounded-lg shadow-sm border mb-6">
				{paginatedPolizas.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 px-4">
						<FileText className="h-16 w-16 text-gray-300 mb-4" />
						<h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron pólizas</h3>
						<p className="text-sm text-gray-500 text-center max-w-md">
							{hasActiveFilters
								? "No hay pólizas que coincidan con tu búsqueda."
								: "Aún no hay pólizas registradas. Crea la primera póliza."}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr className="bg-gray-50 border-b">
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Nº Póliza
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Ramo
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Cliente
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										CI/NIT
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Compañía
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Vigencia
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Prima Total
									</th>
									<th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Estado
									</th>
									<th className="px-4 py-3"></th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{paginatedPolizas.map((poliza) => (
									<tr
										key={poliza.id}
										onClick={() => handlePolicyClick(poliza)}
										className="hover:bg-gray-50 cursor-pointer transition-colors"
									>
										<td className="px-4 py-4">
											<span className="text-sm font-medium text-gray-900">
												{poliza.numero_poliza}
											</span>
										</td>

										<td className="px-4 py-4">
											<span className="text-sm text-gray-900">{poliza.ramo}</span>
										</td>

										<td className="px-4 py-4">
											<span className="text-sm text-gray-900">{poliza.client_name}</span>
										</td>

										<td className="px-4 py-4">
											<span className="text-sm text-gray-600">{poliza.client_ci}</span>
										</td>

										<td className="px-4 py-4">
											<span className="text-sm text-gray-600">{poliza.compania_nombre}</span>
										</td>

										<td className="px-4 py-4">
											<div className="text-sm">
												<div className="text-gray-900">
													{formatDate(poliza.inicio_vigencia)}
												</div>
												<div className="text-gray-500 text-xs">
													hasta {formatDate(poliza.fin_vigencia)}
												</div>
											</div>
										</td>

										<td className="px-4 py-4 text-right">
											<div className="text-sm font-medium text-gray-900">
												{formatCurrency(poliza.prima_total, poliza.moneda)}
											</div>
											<div className="text-xs text-gray-500 capitalize">
												{poliza.modalidad_pago}
											</div>
										</td>

										<td className="px-4 py-4">
											<div className="flex justify-center">
												<span
													className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoStyle(
														poliza.estado
													)}`}
												>
													{getEstadoLabel(poliza.estado)}
												</span>
											</div>
										</td>

										<td className="px-4 py-4 text-right">
											<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
												<span className="sr-only">Ver detalles</span>
												<svg
													className="h-4 w-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<div className="text-sm text-gray-600">
						Mostrando {startIndex + 1} - {Math.min(endIndex, filteredPolizas.length)} de{" "}
						{filteredPolizas.length}
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => handlePageChange(currentPage - 1)}
							disabled={currentPage === 1}
						>
							Anterior
						</Button>
						<div className="flex items-center gap-1">
							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								let pageNum;
								if (totalPages <= 5) {
									pageNum = i + 1;
								} else if (currentPage <= 3) {
									pageNum = i + 1;
								} else if (currentPage >= totalPages - 2) {
									pageNum = totalPages - 4 + i;
								} else {
									pageNum = currentPage - 2 + i;
								}

								return (
									<Button
										key={pageNum}
										variant={currentPage === pageNum ? "default" : "outline"}
										size="sm"
										onClick={() => handlePageChange(pageNum)}
										className="w-10"
									>
										{pageNum}
									</Button>
								);
							})}
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => handlePageChange(currentPage + 1)}
							disabled={currentPage === totalPages}
						>
							Siguiente
						</Button>
					</div>
				</div>
			)}

			{/* Selected Policy Detail Modal */}
			{selectedPoliza && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
						<div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
							<h2 className="text-xl font-semibold">Detalles de la Póliza</h2>
							<Button variant="ghost" size="icon" onClick={handleCloseDetail} className="rounded-full">
								<X className="h-5 w-5" />
							</Button>
						</div>
						<div className="p-6 space-y-6">
							{/* Información básica */}
							<div className="grid grid-cols-2 gap-6">
								<div>
									<label className="text-sm font-medium text-gray-600">Número de Póliza</label>
									<p className="text-lg font-semibold text-gray-900 mt-1">
										{selectedPoliza.numero_poliza}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Estado</label>
									<div className="mt-1">
										<span
											className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEstadoStyle(
												selectedPoliza.estado
											)}`}
										>
											{getEstadoLabel(selectedPoliza.estado)}
										</span>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-6">
								<div>
									<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
										<User className="h-4 w-4" />
										Cliente
									</label>
									<p className="text-base text-gray-900 mt-1">{selectedPoliza.client_name}</p>
									<p className="text-sm text-gray-600">CI/NIT: {selectedPoliza.client_ci}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
										<Building2 className="h-4 w-4" />
										Compañía Aseguradora
									</label>
									<p className="text-base text-gray-900 mt-1">{selectedPoliza.compania_nombre}</p>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-6">
								<div>
									<label className="text-sm font-medium text-gray-600">Ramo</label>
									<p className="text-base text-gray-900 mt-1">{selectedPoliza.ramo}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Regional</label>
									<p className="text-base text-gray-900 mt-1">{selectedPoliza.regional_nombre}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Director de cartera</label>
									<p className="text-base text-gray-900 mt-1">{selectedPoliza.director_cartera_nombre || "No asignado"}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Ejecutivo comercial</label>
									<p className="text-base text-gray-900 mt-1">{selectedPoliza.responsable_nombre}</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-6">
								<div>
									<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										Vigencia
									</label>
									<p className="text-base text-gray-900 mt-1">
										{formatDate(selectedPoliza.inicio_vigencia)} -{" "}
										{formatDate(selectedPoliza.fin_vigencia)}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
										<DollarSign className="h-4 w-4" />
										Prima Total
									</label>
									<p className="text-lg font-semibold text-gray-900 mt-1">
										{formatCurrency(selectedPoliza.prima_total, selectedPoliza.moneda)}
									</p>
									<p className="text-sm text-gray-600 capitalize">
										Modalidad: {selectedPoliza.modalidad_pago}
									</p>
								</div>
							</div>

							<div className="pt-4 border-t">
								<Button onClick={() => router.push(`/polizas/${selectedPoliza.id}`)} className="w-full">
									Ver Detalles Completos
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

		</div>
	);
}
