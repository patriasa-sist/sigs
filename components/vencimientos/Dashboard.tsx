// components/Dashboard.tsx - Updated with natural sorting for sent items

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
	Search,
	Filter,
	Download,
	FileText,
	SortAsc,
	SortDesc,
	ChevronLeft,
	ChevronRight,
	Package,
	Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProcessedInsuranceRecord, SortOptions, DashboardStats, InsuranceStatus } from "@/types/insurance";
import { formatDate, getUniqueValues } from "@/utils/excel";
import LetterGenerator from "@/components/vencimientos/PDFGeneration/LetterGenerator";
import { PDFGenerationResult } from "@/types/pdf";

interface DashboardProps {
	data: ProcessedInsuranceRecord[];
	onBack: () => void;
	onUpdateData: (newData: ProcessedInsuranceRecord[]) => void;
}

const ITEMS_PER_PAGE = 75;

export default function Dashboard({ data, onBack, onUpdateData }: DashboardProps) {
	const [filteredData, setFilteredData] = useState<ProcessedInsuranceRecord[]>(data);
	const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
	const [currentPage, setCurrentPage] = useState(1);
	const [sortOptions, setSortOptions] = useState<SortOptions>({
		field: "daysUntilExpiry",
		direction: "asc",
	});

	const [searchTerm, setSearchTerm] = useState("");
	const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>("all-ejecutivos");
	const [selectedCompania, setSelectedCompania] = useState<string>("all-companias");
	const [selectedRamo, setSelectedRamo] = useState<string>("all-ramos");
	const [selectedStatus, setSelectedStatus] = useState<InsuranceStatus[]>([]);
	const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

	const [showLetterGenerator, setShowLetterGenerator] = useState(false);
	const [pdfGenerationResult, setPdfGenerationResult] = useState<PDFGenerationResult | null>(null);

	const uniqueValues = useMemo(() => {
		const filterValidValues = (values: string[]) =>
			values.filter((v) => v && typeof v === "string" && v.trim().length > 0);

		return {
			ejecutivos: filterValidValues(getUniqueValues(data, "ejecutivo")),
			companias: filterValidValues(getUniqueValues(data, "compania")),
			ramos: filterValidValues(getUniqueValues(data, "ramo")),
		};
	}, [data]);

	const stats: DashboardStats = useMemo(() => {
		const total = filteredData.length;
		const critical = filteredData.filter((r) => r.status === "critical").length;
		const dueSoon = filteredData.filter((r) => r.status === "due_soon").length;
		const pending = filteredData.filter((r) => r.status === "pending").length;
		const expired = filteredData.filter((r) => r.status === "expired").length;
		const sent = filteredData.filter((r) => r.status === "sent").length;
		const totalValue = filteredData.reduce((sum, r) => sum + (r.valorAsegurado || 0), 0);
		return {
			total,
			critical,
			dueSoon,
			pending,
			expired,
			sent,
			totalValue,
		};
	}, [filteredData]);

	const getSelectedRecords = (): ProcessedInsuranceRecord[] => {
		return data.filter((record) => selectedRecords.has(record.id!));
	};

	const applyFilters = useCallback(() => {
		let filtered = [...data];

		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(record) =>
					record.asegurado.toLowerCase().includes(term) ||
					record.noPoliza.toLowerCase().includes(term) ||
					record.compania.toLowerCase().includes(term)
			);
		}

		if (selectedEjecutivo && selectedEjecutivo !== "all-ejecutivos") {
			filtered = filtered.filter((record) => {
				const recordValue = record.ejecutivo?.trim() || "";
				return (
					recordValue === selectedEjecutivo ||
					(selectedEjecutivo.startsWith("empty-ejecutivo-") && !recordValue)
				);
			});
		}

		if (selectedCompania && selectedCompania !== "all-companias") {
			filtered = filtered.filter((record) => {
				const recordValue = record.compania?.trim() || "";
				return (
					recordValue === selectedCompania || (selectedCompania.startsWith("empty-compania-") && !recordValue)
				);
			});
		}

		if (selectedRamo && selectedRamo !== "all-ramos") {
			filtered = filtered.filter((record) => {
				const recordValue = record.ramo?.trim() || "";
				return recordValue === selectedRamo || (selectedRamo.startsWith("empty-ramo-") && !recordValue);
			});
		}

		if (selectedStatus.length > 0) {
			filtered = filtered.filter((record) => selectedStatus.includes(record.status));
		}

		if (dateRange.from || dateRange.to) {
			filtered = filtered.filter((record) => {
				const recordDate = new Date(record.finDeVigencia);
				if (dateRange.from && recordDate < dateRange.from) return false;
				if (dateRange.to && recordDate > dateRange.to) return false;
				return true;
			});
		}

		// Apply sorting based on user selection
		filtered.sort((a, b) => {
			const aValue = a[sortOptions.field];
			const bValue = b[sortOptions.field];

			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortOptions.direction === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
			}
			if (typeof aValue === "number" && typeof bValue === "number") {
				return sortOptions.direction === "asc" ? aValue - bValue : bValue - aValue;
			}
			if (aValue instanceof Date && bValue instanceof Date) {
				return sortOptions.direction === "asc"
					? aValue.getTime() - bValue.getTime()
					: bValue.getTime() - aValue.getTime();
			}
			return 0;
		});

		setFilteredData(filtered);
		setCurrentPage(1);
	}, [data, searchTerm, selectedEjecutivo, selectedCompania, selectedRamo, selectedStatus, dateRange, sortOptions]);

	React.useEffect(() => {
		applyFilters();
	}, [applyFilters]);

	const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;
	const currentPageData = filteredData.slice(startIndex, endIndex);

	const handleSelectRecord = (recordId: string) => {
		const newSelected = new Set(selectedRecords);
		if (newSelected.has(recordId)) {
			newSelected.delete(recordId);
		} else {
			newSelected.add(recordId);
		}
		setSelectedRecords(newSelected);
	};

	const handleSelectAll = () => {
		const allRecordIds = new Set(filteredData.map((r) => r.id!));
		if (selectedRecords.size === filteredData.length) {
			setSelectedRecords(new Set());
		} else {
			setSelectedRecords(allRecordIds);
		}
	};

	const handleSelectPage = () => {
		const currentPageIds = currentPageData.map((r) => r.id!);
		const allPageSelected = currentPageIds.every((id) => selectedRecords.has(id));

		const newSelected = new Set(selectedRecords);
		if (allPageSelected) {
			currentPageIds.forEach((id) => newSelected.delete(id));
		} else {
			currentPageIds.forEach((id) => newSelected.add(id));
		}
		setSelectedRecords(newSelected);
	};

	const isAllSelected = selectedRecords.size === filteredData.length && filteredData.length > 0;
	const isPageSelected = currentPageData.length > 0 && currentPageData.every((r) => selectedRecords.has(r.id!));

	const handleSelectCritical = () => {
		const criticalRecords = filteredData.filter((r) => r.status === "critical" || r.status === "due_soon");
		setSelectedRecords(new Set(criticalRecords.map((r) => r.id!)));
	};

	const handleSort = (field: keyof ProcessedInsuranceRecord) => {
		setSortOptions((prev) => ({
			field,
			direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
		}));
	};

	const clearFilters = () => {
		setSearchTerm("");
		setSelectedEjecutivo("all-ejecutivos");
		setSelectedCompania("all-companias");
		setSelectedRamo("all-ramos");
		setSelectedStatus([]);
		setDateRange({});
	};

	const handleOpenLetterGenerator = () => {
		if (selectedRecords.size === 0) {
			alert("Por favor selecciona al menos un registro para generar cartas.");
			return;
		}
		setShowLetterGenerator(true);
	};

	const handlePDFGenerated = (result: PDFGenerationResult) => {
		setPdfGenerationResult(result);
		if (result.success) {
			const updatedData = data.map((record) => {
				// Find if this record was part of any generated letter
				const generatedLetter = result.letters.find((l) => l.sourceRecordIds.includes(record.id!));

				if (generatedLetter) {
					// If it was, update it with the new status and potentially new client info
					return {
						...record,
						status: "sent" as InsuranceStatus,
						telefono: generatedLetter.clientPhone || record.telefono,
						correoODireccion: generatedLetter.clientEmail || record.correoODireccion,
					};
				}

				// Otherwise, return the original record
				return record;
			});

			onUpdateData(updatedData);
		}
		setSelectedRecords(new Set());
	};

	const getStatusBadge = (status: InsuranceStatus) => {
		const variants = {
			critical: "destructive",
			due_soon: "secondary",
			pending: "outline",
			expired: "secondary",
			sent: "default",
		} as const;

		const labels = {
			critical: "Crítico",
			due_soon: "Próximo",
			pending: "Pendiente",
			expired: "Vencido",
			sent: "Enviado",
		};

		return (
			<Badge variant={variants[status]} className={`text-xs ${status === "sent" ? "bg-green-600" : ""}`}>
				{labels[status]}
			</Badge>
		);
	};

	if (showLetterGenerator) {
		return (
			<LetterGenerator
				selectedRecords={getSelectedRecords()}
				onClose={() => setShowLetterGenerator(false)}
				onGenerated={handlePDFGenerated}
			/>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header con estadísticas */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<Button variant="ghost" onClick={onBack}>
						<ChevronLeft className="h-4 w-4 mr-2" />
						Volver
					</Button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Dashboard de Seguros</h1>
						<p className="text-gray-600">
							{stats.total} registros • {selectedRecords.size} seleccionados
						</p>
					</div>
				</div>

				<div className="flex space-x-2">
					<Button variant="outline" onClick={handleSelectCritical} className="text-red-600 border-red-300">
						<Zap className="h-4 w-4 mr-2" />
						Seleccionar Críticos ({stats.critical + stats.dueSoon})
					</Button>

					<Button
						onClick={handleOpenLetterGenerator}
						disabled={selectedRecords.size === 0}
						className="patria-btn-primary"
					>
						<FileText className="h-4 w-4 mr-2" />
						Generar Cartas ({selectedRecords.size})
					</Button>

					<Button variant="outline">
						<Download className="h-4 w-4 mr-2" />
						Exportar
					</Button>
				</div>
			</div>

			{pdfGenerationResult && (
				<Alert
					className={
						pdfGenerationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
					}
				>
					<Package className="h-4 w-4" />
					<AlertDescription>
						{pdfGenerationResult.success ? (
							<div className="text-green-800">
								<div className="font-medium">
									✅ {pdfGenerationResult.totalGenerated} cartas generadas exitosamente. Los registros
									han sido marcados como &ldquo;Enviado&rdquo;.
								</div>
							</div>
						) : (
							<div className="text-red-800">
								<div className="font-medium">❌ Error en la generación de cartas</div>
								<div className="text-sm mt-1">{pdfGenerationResult.errors.join(", ")}</div>
							</div>
						)}
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
				<Card>
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-gray-900">{stats.total}</div>
						<div className="text-sm text-gray-600">Total</div>
					</CardContent>
				</Card>
				<Card className="border-red-200">
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-red-600">{stats.critical}</div>
						<div className="text-sm text-gray-600">Críticos</div>
					</CardContent>
				</Card>
				<Card className="border-yellow-200">
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</div>
						<div className="text-sm text-gray-600">Próximos</div>
					</CardContent>
				</Card>
				<Card className="border-blue-200">
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
						<div className="text-sm text-gray-600">Pendientes</div>
					</CardContent>
				</Card>
				<Card className="border-gray-200">
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
						<div className="text-sm text-gray-600">Vencidos</div>
					</CardContent>
				</Card>
				<Card className="border-green-200">
					<CardContent className="p-4 text-center">
						<div className="text-2xl font-bold text-green-600">{stats.sent}</div>
						<div className="text-sm text-gray-600">Enviados</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center">
							<Filter className="h-5 w-5 mr-2" />
							Filtros
						</CardTitle>
						<Button variant="ghost" onClick={clearFilters} className="px-10 py-4 shadow-sm">
							Limpiar filtros
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
						<div className="space-y-2 lg:col-span-1">
							<label className="text-sm font-medium">Buscar</label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
								<Input
									placeholder="Asegurado, póliza, compañía..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
						<div className="space-y-2 lg:col-span-1">
							<label className="text-sm font-medium">Ejecutivo</label>
							<Select value={selectedEjecutivo} onValueChange={setSelectedEjecutivo}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Ejecutivos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all-ejecutivos">Todos los ejecutivos</SelectItem>
									{uniqueValues.ejecutivos.map((ejecutivo, index) => {
										const value = ejecutivo.trim() || `empty-ejecutivo-${index}`;
										const display = ejecutivo.trim() || "Sin asignar";
										return (
											<SelectItem key={`ejecutivo-${index}-${value}`} value={value}>
												{display}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 lg:col-span-2">
							<label className="text-sm font-medium">Compañía</label>
							<Select value={selectedCompania} onValueChange={setSelectedCompania}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Todas las compañías" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all-companias">Todas las compañías</SelectItem>
									{uniqueValues.companias.map((compania, index) => {
										const value = compania.trim() || `empty-compania-${index}`;
										const display = compania.trim() || "Sin compañía";
										return (
											<SelectItem key={`compania-${index}-${value}`} value={value}>
												{display}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 lg:col-span-1">
							<label className="text-sm font-medium">Ramo</label>
							<Select value={selectedRamo} onValueChange={setSelectedRamo}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Todos los ramos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all-ramos">Todos los ramos</SelectItem>
									{uniqueValues.ramos.map((ramo, index) => {
										const value = ramo.trim() || `empty-ramo-${index}`;
										const display = ramo.trim() || "Sin especificar";
										return (
											<SelectItem key={`ramo-${index}-${value}`} value={value}>
												{display}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 lg:col-span-1">
							<label className="text-sm font-medium">Estado</label>
							<Select
								value={selectedStatus.length === 1 ? selectedStatus[0] : ""}
								onValueChange={(value) => {
									if (value === "all-status") {
										setSelectedStatus([]);
									} else {
										setSelectedStatus([value as InsuranceStatus]);
									}
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Todos los estados" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all-status">Todos los estados</SelectItem>
									<SelectItem value="critical">Críticos (≤5 días)</SelectItem>
									<SelectItem value="due_soon">Próximos (6-30 días)</SelectItem>
									<SelectItem value="pending">Pendientes (+30 días)</SelectItem>
									<SelectItem value="expired">Vencidos</SelectItem>
									<SelectItem value="sent">Enviados</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Registros de Seguros</CardTitle>
							<CardDescription>
								Mostrando {startIndex + 1}-{Math.min(endIndex, filteredData.length)} de{" "}
								{filteredData.length} registros
							</CardDescription>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} className="w-5 h-5" />
							<span className="text-sm text-gray-600">Seleccionar Todo</span>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-200">
									<th className="text-left p-3 font-medium text-gray-900">
										<div className="flex items-center space-x-2">
											<Checkbox
												checked={isPageSelected}
												onCheckedChange={handleSelectPage}
												className="w-5 h-5"
											/>
										</div>
									</th>
									<th className="text-left p-3 font-medium text-gray-900">
										<button
											onClick={() => handleSort("asegurado")}
											className="flex items-center space-x-1 hover:text-patria-blue"
										>
											<span>Asegurado</span>
											{sortOptions.field === "asegurado" &&
												(sortOptions.direction === "asc" ? (
													<SortAsc className="h-4 w-4" />
												) : (
													<SortDesc className="h-4 w-4" />
												))}
										</button>
									</th>
									<th className="text-left p-3 font-medium text-gray-900">
										<button
											onClick={() => handleSort("compania")}
											className="flex items-center space-x-1 hover:text-patria-blue"
										>
											<span>Compañía</span>
											{sortOptions.field === "compania" &&
												(sortOptions.direction === "asc" ? (
													<SortAsc className="h-4 w-4" />
												) : (
													<SortDesc className="h-4 w-4" />
												))}
										</button>
									</th>
									<th className="text-left p-3 font-medium text-gray-900">
										<button
											onClick={() => handleSort("ramo")}
											className="flex items-center space-x-1 hover:text-patria-blue"
										>
											<span>Ramo</span>
											{sortOptions.field === "ramo" &&
												(sortOptions.direction === "asc" ? (
													<SortAsc className="h-4 w-4" />
												) : (
													<SortDesc className="h-4 w-4" />
												))}
										</button>
									</th>
									<th className="text-left p-3 font-medium text-gray-900">No. Póliza</th>
									<th className="text-left p-3 font-medium text-gray-900">
										<button
											onClick={() => handleSort("finDeVigencia")}
											className="flex items-center space-x-1 hover:text-patria-blue"
										>
											<span>Vencimiento</span>
											{sortOptions.field === "finDeVigencia" &&
												(sortOptions.direction === "asc" ? (
													<SortAsc className="h-4 w-4" />
												) : (
													<SortDesc className="h-4 w-4" />
												))}
										</button>
									</th>
									<th className="text-left p-3 font-medium text-gray-900">
										<button
											onClick={() => handleSort("daysUntilExpiry")}
											className="flex items-center space-x-1 hover:text-patria-blue"
										>
											<span>Días Restantes</span>
											{sortOptions.field === "daysUntilExpiry" &&
												(sortOptions.direction === "asc" ? (
													<SortAsc className="h-4 w-4" />
												) : (
													<SortDesc className="h-4 w-4" />
												))}
										</button>
									</th>
									<th className="text-left p-3 font-medium text-gray-900">Estado</th>
									<th className="text-left p-3 font-medium text-gray-900">Ejecutivo</th>
								</tr>
							</thead>
							<tbody>
								{currentPageData.map((record) => (
									<tr
										key={record.id}
										className={`border-b border-gray-100 transition-colors ${
											record.status === "sent"
												? "bg-green-100 hover:bg-green-200"
												: "hover:bg-gray-50"
										}`}
									>
										<td className="p-3">
											<Checkbox
												checked={selectedRecords.has(record.id!)}
												onCheckedChange={() => handleSelectRecord(record.id!)}
												disabled={record.status === "sent"}
												className="w-5 h-5"
											/>
										</td>
										<td className="p-3">
											<div className="font-medium text-gray-900 max-w-64 truncate">
												{record.asegurado}
											</div>
											{record.correoODireccion && (
												<div className="text-sm text-gray-500 max-w-64 truncate">
													{record.correoODireccion}
												</div>
											)}
										</td>
										<td className="p-3">
											<div className="font-medium text-gray-900">{record.compania}</div>
										</td>
										<td className="p-3">
											<div className="font-medium text-gray-900 max-w-48 truncate">
												{record.ramo}
											</div>
										</td>
										<td className="p-3">
											<code className="text-sm bg-gray-100 px-2 py-1 rounded max-w-40 truncate block">
												{record.noPoliza}
											</code>
										</td>
										<td className="p-3">
											<div className="text-gray-900">
												{formatDate(new Date(record.finDeVigencia))}
											</div>
										</td>
										<td className="p-3">
											<div
												className={`font-medium ${
													record.daysUntilExpiry <= 5
														? "text-red-600"
														: record.daysUntilExpiry <= 30
														? "text-yellow-600"
														: "text-gray-600"
												}`}
											>
												{record.daysUntilExpiry >= 0
													? `${record.daysUntilExpiry} días`
													: "Vencido"}
											</div>
										</td>
										<td className="p-3">{getStatusBadge(record.status)}</td>
										<td className="p-3">
											<div className="text-gray-900">{record.ejecutivo}</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between mt-6">
							<div className="text-sm text-gray-600">
								Página {currentPage} de {totalPages}
							</div>
							<div className="flex space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
								>
									<ChevronLeft className="h-4 w-4" /> Anterior
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
									disabled={currentPage === totalPages}
								>
									Siguiente <ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
