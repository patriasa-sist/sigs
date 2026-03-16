"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ExcepcionDocumentoVista, EstadoExcepcion } from "@/types/clienteDocumento";
import { ExcepcionesTable } from "./ExcepcionesTable";
import { OtorgarExcepcionForm } from "./OtorgarExcepcionForm";
import { obtenerExcepcionesCompletas } from "@/app/auditoria/excepciones/actions";

type Props = {
	excepcionesIniciales: ExcepcionDocumentoVista[];
	usuarios: { id: string; email: string; role: string; full_name: string | null }[];
};

export function ExcepcionesPanel({ excepcionesIniciales, usuarios }: Props) {
	const [excepciones, setExcepciones] = useState(excepcionesIniciales);
	const [showForm, setShowForm] = useState(false);
	const [filtroEstado, setFiltroEstado] = useState<EstadoExcepcion | "todas">("todas");
	const [isRefreshing, setIsRefreshing] = useState(false);

	const refreshData = async () => {
		setIsRefreshing(true);
		try {
			const filtros = filtroEstado !== "todas" ? { estado: filtroEstado } : undefined;
			const data = await obtenerExcepcionesCompletas(filtros);
			setExcepciones(data);
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleFilterChange = async (value: string) => {
		const estado = value as EstadoExcepcion | "todas";
		setFiltroEstado(estado);
		setIsRefreshing(true);
		try {
			const filtros = estado !== "todas" ? { estado } : undefined;
			const data = await obtenerExcepcionesCompletas(filtros);
			setExcepciones(data);
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleExcepcionCreated = async () => {
		setShowForm(false);
		await refreshData();
	};

	const handleExcepcionRevoked = async () => {
		await refreshData();
	};

	// Stats
	const activas = excepciones.filter((e) => e.estado === "activa").length;
	const usadas = excepciones.filter((e) => e.estado === "usada").length;
	const revocadas = excepciones.filter((e) => e.estado === "revocada").length;

	return (
		<div className="space-y-6">
			{/* Stats cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p className="text-sm text-blue-600 font-medium">Activas</p>
					<p className="text-2xl font-bold text-blue-900">{activas}</p>
					<p className="text-xs text-blue-500 mt-1">Pendientes de uso</p>
				</div>
				<div className="bg-green-50 border border-green-200 rounded-lg p-4">
					<p className="text-sm text-green-600 font-medium">Usadas</p>
					<p className="text-2xl font-bold text-green-900">{usadas}</p>
					<p className="text-xs text-green-500 mt-1">Consumidas al crear cliente</p>
				</div>
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
					<p className="text-sm text-gray-600 font-medium">Revocadas</p>
					<p className="text-2xl font-bold text-gray-900">{revocadas}</p>
					<p className="text-xs text-gray-500 mt-1">Canceladas por UIF</p>
				</div>
			</div>

			{/* Actions bar */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Select value={filtroEstado} onValueChange={handleFilterChange}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Filtrar por estado" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todas">Todas</SelectItem>
							<SelectItem value="activa">Activas</SelectItem>
							<SelectItem value="usada">Usadas</SelectItem>
							<SelectItem value="revocada">Revocadas</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<Button onClick={() => setShowForm(true)}>
					<Plus className="h-4 w-4 mr-2" />
					Otorgar Excepción
				</Button>
			</div>

			{/* Grant form dialog */}
			{showForm && (
				<OtorgarExcepcionForm
					usuarios={usuarios}
					onSuccess={handleExcepcionCreated}
					onCancel={() => setShowForm(false)}
				/>
			)}

			{/* Table */}
			<ExcepcionesTable
				excepciones={excepciones}
				isRefreshing={isRefreshing}
				onRevoke={handleExcepcionRevoked}
			/>
		</div>
	);
}
