"use client";

import { useState, useMemo, useEffect } from "react";
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
import type { SiniestroVistaConEstado, SiniestrosStats, EstadoSiniestro } from "@/types/siniestro";
import StatsCards from "./StatsCards";
import SiniestrosTable from "./SiniestrosTable";
import ExportarSiniestros from "./ExportarSiniestros";

interface DashboardProps {
	siniestrosIniciales: SiniestroVistaConEstado[];
	statsIniciales: SiniestrosStats;
}

const ITEMS_PER_PAGE = 25;

export default function Dashboard({ siniestrosIniciales, statsIniciales }: DashboardProps) {
	const [siniestros] = useState<SiniestroVistaConEstado[]>(siniestrosIniciales);
	const [stats] = useState<SiniestrosStats>(statsIniciales);

	// Filtros
	const [searchInput, setSearchInput] = useState(""); // Input inmediato
	const [searchTerm, setSearchTerm] = useState(""); // Término con debounce
	const [estadoFiltro, setEstadoFiltro] = useState<EstadoSiniestro | "todos">("todos");
	const [etapaInternaFiltro, setEtapaInternaFiltro] = useState<string>("todos");
	const [ramoFiltro, setRamoFiltro] = useState<string>("todos");
	const [departamentoFiltro, setDepartamentoFiltro] = useState<string>("todos");
	const [responsableFiltro, setResponsableFiltro] = useState<string>("todos");
	const [companiaFiltro, setCompaniaFiltro] = useState<string>("todos");
	const [currentPage, setCurrentPage] = useState(1);

	// Debounce para búsqueda
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchTerm(searchInput);
			setCurrentPage(1);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchInput]);

	// Obtener opciones únicas para filtros
	const ramosUnicos = useMemo(() => {
		const ramos = Array.from(new Set(siniestros.map((s) => s.ramo))).sort();
		return ramos;
	}, [siniestros]);

	const departamentosUnicos = useMemo(() => {
		const departamentos = Array.from(new Set(siniestros.map((s) => s.departamento_nombre))).sort();
		return departamentos;
	}, [siniestros]);

	const responsablesUnicos = useMemo(() => {
		const responsables = Array.from(
			new Set(
				siniestros
					.map((s) => s.responsable_nombre)
					.filter((r): r is string => r !== undefined && r !== null)
			)
		).sort();
		return responsables;
	}, [siniestros]);

	const companiasUnicas = useMemo(() => {
		const companias = Array.from(new Set(siniestros.map((s) => s.compania_nombre))).sort();
		return companias;
	}, [siniestros]);

	const etapasInternasUnicas = useMemo(() => {
		const etapas = Array.from(
			new Set(
				siniestros
					.map((s) => s.estado_actual_nombre)
					.filter((e): e is string => e !== undefined && e !== null)
			)
		).sort();
		return etapas;
	}, [siniestros]);

	// Filtrado con useMemo
	const filteredData = useMemo(() => {
		return siniestros.filter((siniestro) => {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				(siniestro.numero_poliza && siniestro.numero_poliza.toLowerCase().includes(searchLower)) ||
				(siniestro.cliente_nombre && siniestro.cliente_nombre.toLowerCase().includes(searchLower)) ||
				(siniestro.cliente_documento && siniestro.cliente_documento.toLowerCase().includes(searchLower)) ||
				(siniestro.lugar_hecho && siniestro.lugar_hecho.toLowerCase().includes(searchLower)) ||
				(siniestro.departamento_nombre && siniestro.departamento_nombre.toLowerCase().includes(searchLower)) ||
				(siniestro.codigo_siniestro && siniestro.codigo_siniestro.toLowerCase().includes(searchLower)) ||
				(siniestro.responsable_nombre && siniestro.responsable_nombre.toLowerCase().includes(searchLower)) ||
				(siniestro.compania_nombre && siniestro.compania_nombre.toLowerCase().includes(searchLower));

			const matchesEstado = estadoFiltro === "todos" || siniestro.estado === estadoFiltro;
			const matchesEtapaInterna = etapaInternaFiltro === "todos" || siniestro.estado_actual_nombre === etapaInternaFiltro;
			const matchesRamo = ramoFiltro === "todos" || siniestro.ramo === ramoFiltro;
			const matchesDepartamento = departamentoFiltro === "todos" || siniestro.departamento_nombre === departamentoFiltro;
			const matchesResponsable = responsableFiltro === "todos" || siniestro.responsable_nombre === responsableFiltro;
			const matchesCompania = companiaFiltro === "todos" || siniestro.compania_nombre === companiaFiltro;

			return matchesSearch && matchesEstado && matchesEtapaInterna && matchesRamo && matchesDepartamento && matchesResponsable && matchesCompania;
		});
	}, [siniestros, searchTerm, estadoFiltro, etapaInternaFiltro, ramoFiltro, departamentoFiltro, responsableFiltro, companiaFiltro]);

	const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

	const paginatedData = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	}, [filteredData, currentPage]);

	return (
		<div className="space-y-6">
			{/* Estadísticas */}
			<StatsCards stats={stats} />

			{/* Filtros */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Filtros de Búsqueda</CardTitle>
						<ExportarSiniestros
							siniestros={filteredData}
							filtrosActivos={{
								searchTerm,
								estadoFiltro,
								ramoFiltro,
								departamentoFiltro,
							}}
						/>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Búsqueda General */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-2 block">
							Búsqueda General
						</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Buscar por código, póliza, cliente, documento o lugar del hecho..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					{/* Filtros por Estado y Tipo */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-2 block">
							Estado y Tipo de Póliza
						</label>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="text-xs text-muted-foreground mb-1.5 block">
									Estado Global
								</label>
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

							<div>
								<label className="text-xs text-muted-foreground mb-1.5 block">
									Etapa de Seguimiento Interna
								</label>
								<Select
									value={etapaInternaFiltro}
									onValueChange={(val) => {
										setEtapaInternaFiltro(val);
										setCurrentPage(1);
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todas las etapas</SelectItem>
										{etapasInternasUnicas.map((etapa) => (
											<SelectItem key={etapa} value={etapa}>
												{etapa}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<label className="text-xs text-muted-foreground mb-1.5 block">
									Ramo de Seguro
								</label>
								<Select
									value={ramoFiltro}
									onValueChange={(val) => {
										setRamoFiltro(val);
										setCurrentPage(1);
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos los ramos</SelectItem>
										{ramosUnicos.map((ramo) => (
											<SelectItem key={ramo} value={ramo}>
												{ramo}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Filtros por Ubicación y Responsabilidad */}
					<div>
						<label className="text-sm font-medium text-muted-foreground mb-2 block">
							Ubicación y Responsabilidad
						</label>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="text-xs text-muted-foreground mb-1.5 block">
									Departamento
								</label>
								<Select
									value={departamentoFiltro}
									onValueChange={(val) => {
										setDepartamentoFiltro(val);
										setCurrentPage(1);
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos los departamentos</SelectItem>
										{departamentosUnicos.map((dpto) => (
											<SelectItem key={dpto} value={dpto}>
												{dpto}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<label className="text-xs text-muted-foreground mb-1.5 block">
									Responsable
								</label>
								<Select
									value={responsableFiltro}
									onValueChange={(val) => {
										setResponsableFiltro(val);
										setCurrentPage(1);
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos los responsables</SelectItem>
										{responsablesUnicos.map((resp) => (
											<SelectItem key={resp} value={resp}>
												{resp}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<label className="text-xs text-muted-foreground mb-1.5 block">
									Compañía Aseguradora
								</label>
								<Select
									value={companiaFiltro}
									onValueChange={(val) => {
										setCompaniaFiltro(val);
										setCurrentPage(1);
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todas las compañías</SelectItem>
										{companiasUnicas.map((comp) => (
											<SelectItem key={comp} value={comp}>
												{comp}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
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
							{siniestros.length !== filteredData.length && (
								<span className="text-xs ml-2">
									(de {siniestros.length} totales)
								</span>
							)}
						</>
					)}
				</p>
			</div>

			{/* Tabla */}
			<SiniestrosTable siniestros={paginatedData} />

			{/* Paginación */}
			{filteredData.length > 0 && (
				<Card>
					<CardContent className="py-4">
						<div className="flex flex-col md:flex-row items-center justify-between gap-4">
							<div className="text-sm text-muted-foreground">
								Mostrando{" "}
								<span className="font-semibold text-foreground">
									{(currentPage - 1) * ITEMS_PER_PAGE + 1}
								</span>
								{" - "}
								<span className="font-semibold text-foreground">
									{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}
								</span>
								{" de "}
								<span className="font-semibold text-foreground">
									{filteredData.length}
								</span>
								{" "}
								{filteredData.length === 1 ? "siniestro" : "siniestros"}
							</div>
							{totalPages > 1 && (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
									>
										<ChevronLeft className="h-4 w-4 mr-1" />
										Anterior
									</Button>
									<div className="text-sm text-muted-foreground">
										Página <span className="font-semibold text-foreground">{currentPage}</span> de{" "}
										<span className="font-semibold text-foreground">{totalPages}</span>
									</div>
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
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
