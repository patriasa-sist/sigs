"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiniestroVista, SiniestrosStats, EstadoSiniestro } from "@/types/siniestro";
import StatsCards from "./StatsCards";
import SiniestrosTable from "./SiniestrosTable";

interface DashboardProps {
	siniestrosIniciales: SiniestroVista[];
	statsIniciales: SiniestrosStats;
}

const ITEMS_PER_PAGE = 25;

export default function Dashboard({ siniestrosIniciales, statsIniciales }: DashboardProps) {
	const [siniestros] = useState<SiniestroVista[]>(siniestrosIniciales);
	const [stats] = useState<SiniestrosStats>(statsIniciales);

	// Filtros
	const [searchTerm, setSearchTerm] = useState("");
	const [estadoFiltro, setEstadoFiltro] = useState<EstadoSiniestro | "todos">("todos");
	const [currentPage, setCurrentPage] = useState(1);

	// Filtrado con useMemo
	const filteredData = useMemo(() => {
		return siniestros.filter((siniestro) => {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				siniestro.numero_poliza.toLowerCase().includes(searchLower) ||
				siniestro.cliente_nombre.toLowerCase().includes(searchLower) ||
				siniestro.cliente_documento.toLowerCase().includes(searchLower) ||
				siniestro.lugar_hecho.toLowerCase().includes(searchLower) ||
				siniestro.departamento_nombre.toLowerCase().includes(searchLower);

			const matchesEstado = estadoFiltro === "todos" || siniestro.estado === estadoFiltro;

			return matchesSearch && matchesEstado;
		});
	}, [siniestros, searchTerm, estadoFiltro]);

	const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

	const paginatedData = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	}, [filteredData, currentPage]);

	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value);
		setCurrentPage(1);
	}, []);

	return (
		<div className="space-y-6">
			{/* Estadísticas */}
			<StatsCards stats={stats} />

			{/* Filtros */}
			<Card>
				<CardHeader>
					<CardTitle>Filtros</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por póliza, cliente, documento o lugar..."
								value={searchTerm}
								onChange={(e) => handleSearchChange(e.target.value)}
								className="pl-10"
							/>
						</div>
						<Select
							value={estadoFiltro}
							onValueChange={(val) => {
								setEstadoFiltro(val as EstadoSiniestro | "todos");
								setCurrentPage(1);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos los estados</SelectItem>
								<SelectItem value="abierto">Abierto</SelectItem>
								<SelectItem value="rechazado">Rechazado</SelectItem>
								<SelectItem value="declinado">Declinado</SelectItem>
								<SelectItem value="concluido">Concluido</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Contador de resultados */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{filteredData.length === 0 ? (
						"No se encontraron siniestros"
					) : (
						<>
							Mostrando{" "}
							<span className="font-semibold text-primary">{filteredData.length}</span>{" "}
							{filteredData.length === 1 ? "siniestro" : "siniestros"}
						</>
					)}
				</p>
			</div>

			{/* Tabla */}
			<SiniestrosTable siniestros={paginatedData} />

			{/* Paginación */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						Página {currentPage} de {totalPages}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
						>
							<ChevronLeft className="h-4 w-4 mr-1" />
							Anterior
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
						>
							Siguiente
							<ChevronRight className="h-4 w-4 ml-1" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
