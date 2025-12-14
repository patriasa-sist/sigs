"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import StatsCards from "./StatsCards";
import CuotasModal from "./CuotasModal";
import RegistrarPagoModal from "./RegistrarPagoModal";
import RedistribucionModal from "./RedistribucionModal";
import ExportarReporte from "./ExportarReporte";
import type { PolizaConPagos, CobranzaStats, CuotaPago, ExcessPaymentDistribution } from "@/types/cobranza";

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

	// Filter and pagination logic
	const filteredData = useMemo(() => {
		return polizas.filter((poliza) => {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				poliza.numero_poliza.toLowerCase().includes(searchLower) ||
				poliza.client.nombre_completo.toLowerCase().includes(searchLower) ||
				poliza.client.documento.toLowerCase().includes(searchLower) ||
				poliza.compania.nombre.toLowerCase().includes(searchLower);

			return matchesSearch;
		});
	}, [polizas, searchTerm]);

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
											<th className="p-3 text-left text-sm font-medium">N° Póliza</th>
											<th className="p-3 text-left text-sm font-medium">Cliente</th>
											<th className="p-3 text-left text-sm font-medium">CI/NIT</th>
											<th className="p-3 text-left text-sm font-medium">Compañía</th>
											<th className="p-3 text-left text-sm font-medium">Cuotas Pendientes</th>
											<th className="p-3 text-left text-sm font-medium">Cuotas Vencidas</th>
											<th className="p-3 text-left text-sm font-medium">Total Pendiente</th>
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
