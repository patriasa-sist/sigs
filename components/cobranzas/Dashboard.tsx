"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import StatsCards from "./StatsCards";
import CuotasModal from "./CuotasModal";
import RegistrarPagoModal from "./RegistrarPagoModal";
import RedistribucionModal from "./RedistribucionModal";
import ExportarReporte from "./ExportarReporte";
import type { PolizaConPagos, CobranzaStats, CuotaPago, ExcessPaymentDistribution, SortFieldEnhanced } from "@/types/cobranza";

interface DashboardProps {
	polizasIniciales: PolizaConPagos[];
	statsIniciales: CobranzaStats;
}

const ITEMS_PER_PAGE = 25;

export default function Dashboard({ polizasIniciales, statsIniciales }: DashboardProps) {
	// State for data
	const [polizas] = useState<PolizaConPagos[]>(polizasIniciales);
	const [stats] = useState<CobranzaStats>(statsIniciales);

	// State for filters
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	// MEJORA #5 & #6: Sorting state
	const [sortField, setSortField] = useState<SortFieldEnhanced | null>(null);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

	// State for modals
	const [selectedPoliza, setSelectedPoliza] = useState<PolizaConPagos | null>(null);
	const [selectedCuota, setSelectedCuota] = useState<CuotaPago | null>(null);
	const [excessData, setExcessData] = useState<ExcessPaymentDistribution | null>(null);

	// Modal visibility
	const [cuotasModalOpen, setCuotasModalOpen] = useState(false);
	const [pagoModalOpen, setPagoModalOpen] = useState(false);
	const [redistribucionModalOpen, setRedistribucionModalOpen] = useState(false);

	// Format helpers
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	// MEJORA #5 & #6: Handle column sorting
	const handleSort = (field: SortFieldEnhanced) => {
		if (sortField === field) {
			// Toggle direction
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			// New field
			setSortField(field);
			setSortDirection("asc");
		}
		setCurrentPage(1); // Reset to first page
	};

	// Filter and sort logic
	const filteredData = useMemo(() => {
		let filtered = polizas.filter((poliza) => {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				poliza.numero_poliza.toLowerCase().includes(searchLower) ||
				poliza.client.nombre_completo.toLowerCase().includes(searchLower) ||
				poliza.client.documento.toLowerCase().includes(searchLower) ||
				poliza.compania.nombre.toLowerCase().includes(searchLower);

			return matchesSearch;
		});

		// Apply sorting if active
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
					case "fecha_vencimiento":
						// Find earliest unpaid quota
						const cuotasNoPagadasA = a.cuotas.filter(c => c.estado !== "pagado");
						const cuotasNoPagadasB = b.cuotas.filter(c => c.estado !== "pagado");
						valueA = cuotasNoPagadasA.length > 0
							? Math.min(...cuotasNoPagadasA.map(c => new Date(c.fecha_vencimiento).getTime()))
							: Infinity;
						valueB = cuotasNoPagadasB.length > 0
							? Math.min(...cuotasNoPagadasB.map(c => new Date(c.fecha_vencimiento).getTime()))
							: Infinity;
						break;
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

				// Compare values
				if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
				if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
				return 0;
			});
		}

		return filtered;
	}, [polizas, searchTerm, sortField, sortDirection]);

	const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

	const paginatedData = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;
		return filteredData.slice(startIndex, endIndex);
	}, [filteredData, currentPage]);

	// Reset to page 1 when search changes
	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
	}, []);

	// Handlers for modals
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
			// Open redistribution modal
			setExcessData(excessDataResult);
			setRedistribucionModalOpen(true);
		} else {
			// Refresh page to get updated data
			window.location.reload();
		}
	};

	const handleRedistribucionSuccess = () => {
		setRedistribucionModalOpen(false);
		// Refresh page to get updated data
		window.location.reload();
	};

	return (
		<div className="space-y-6">
			{/* Statistics Cards */}
			<StatsCards stats={stats} />

			{/* Export Section */}
			<ExportarReporte />

			{/* Filters Section */}
			<Card>
				<CardHeader>
					<CardTitle>Filtros</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center space-x-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por póliza, cliente, CI/NIT o compañía..."
								value={searchTerm}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Results Table */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>
							Pólizas con Cuotas Pendientes ({filteredData.length})
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent>
					{paginatedData.length > 0 ? (
						<div className="space-y-4">
							{/* Table */}
							<div className="rounded-md border overflow-x-auto">
								<table className="w-full">
									<thead className="bg-muted/50">
										<tr>
											{/* Sortable: N° Póliza */}
											<th className="p-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("numero_poliza")}
													className="flex items-center gap-1 hover:text-primary transition-colors"
												>
													N° Póliza
													{sortField === "numero_poliza" ? (
														sortDirection === "asc" ? (
															<ArrowUp className="h-4 w-4" />
														) : (
															<ArrowDown className="h-4 w-4" />
														)
													) : (
														<ArrowUpDown className="h-4 w-4 opacity-50" />
													)}
												</button>
											</th>

											{/* Sortable: Cliente */}
											<th className="p-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("cliente")}
													className="flex items-center gap-1 hover:text-primary transition-colors"
												>
													Cliente
													{sortField === "cliente" ? (
														sortDirection === "asc" ? (
															<ArrowUp className="h-4 w-4" />
														) : (
															<ArrowDown className="h-4 w-4" />
														)
													) : (
														<ArrowUpDown className="h-4 w-4 opacity-50" />
													)}
												</button>
											</th>

											{/* Non-sortable: CI/NIT */}
											<th className="p-3 text-left text-sm font-medium">CI/NIT</th>

											{/* Sortable: Compañía */}
											<th className="p-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("compania")}
													className="flex items-center gap-1 hover:text-primary transition-colors"
												>
													Compañía
													{sortField === "compania" ? (
														sortDirection === "asc" ? (
															<ArrowUp className="h-4 w-4" />
														) : (
															<ArrowDown className="h-4 w-4" />
														)
													) : (
														<ArrowUpDown className="h-4 w-4 opacity-50" />
													)}
												</button>
											</th>

											{/* Sortable: Cuotas Pendientes */}
											<th className="p-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("cuotas_pendientes")}
													className="flex items-center gap-1 hover:text-primary transition-colors"
												>
													C. Pendientes
													{sortField === "cuotas_pendientes" ? (
														sortDirection === "asc" ? (
															<ArrowUp className="h-4 w-4" />
														) : (
															<ArrowDown className="h-4 w-4" />
														)
													) : (
														<ArrowUpDown className="h-4 w-4 opacity-50" />
													)}
												</button>
											</th>

											{/* Sortable: Cuotas Vencidas */}
											<th className="p-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("cuotas_vencidas")}
													className="flex items-center gap-1 hover:text-primary transition-colors"
												>
													C. Vencidas
													{sortField === "cuotas_vencidas" ? (
														sortDirection === "asc" ? (
															<ArrowUp className="h-4 w-4" />
														) : (
															<ArrowDown className="h-4 w-4" />
														)
													) : (
														<ArrowUpDown className="h-4 w-4 opacity-50" />
													)}
												</button>
											</th>

											{/* Sortable: Total Pendiente */}
											<th className="p-3 text-left text-sm font-medium">
												<button
													onClick={() => handleSort("monto_pendiente")}
													className="flex items-center gap-1 hover:text-primary transition-colors"
												>
													Total Pendiente
													{sortField === "monto_pendiente" ? (
														sortDirection === "asc" ? (
															<ArrowUp className="h-4 w-4" />
														) : (
															<ArrowDown className="h-4 w-4" />
														)
													) : (
														<ArrowUpDown className="h-4 w-4 opacity-50" />
													)}
												</button>
											</th>

											{/* Non-sortable: Acciones */}
											<th className="p-3 text-left text-sm font-medium">Acciones</th>
										</tr>
									</thead>
									<tbody>
										{paginatedData.map((poliza, index) => (
											<tr
												key={poliza.id}
												className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
											>
												<td className="p-3 text-sm font-medium">{poliza.numero_poliza}</td>
												<td className="p-3 text-sm max-w-[200px] truncate">
													{poliza.client.nombre_completo}
												</td>
												<td className="p-3 text-sm">{poliza.client.documento}</td>
												<td className="p-3 text-sm max-w-[150px] truncate">
													{poliza.compania.nombre}
												</td>
												<td className="p-3 text-sm text-center">
													<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 font-semibold">
														{poliza.cuotas_pendientes}
													</span>
												</td>
												<td className="p-3 text-sm text-center">
													{poliza.cuotas_vencidas > 0 ? (
														<span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 font-semibold">
															{poliza.cuotas_vencidas}
														</span>
													) : (
														<span className="text-muted-foreground">-</span>
													)}
												</td>
												<td className="p-3 text-sm font-medium">
													{poliza.moneda} {formatCurrency(poliza.total_pendiente)}
												</td>
												<td className="p-3 text-sm">
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
								<div className="flex items-center justify-between">
									<p className="text-sm text-muted-foreground">
										Página {currentPage} de {totalPages} ({filteredData.length} resultados)
									</p>
									<div className="flex items-center space-x-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1}
										>
											<ChevronLeft className="h-4 w-4" />
											Anterior
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
											disabled={currentPage === totalPages}
										>
											Siguiente
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="text-center py-12">
							<p className="text-muted-foreground text-lg">
								{searchTerm
									? "No se encontraron pólizas que coincidan con la búsqueda"
									: "No hay pólizas con cuotas pendientes"}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Modals */}
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
