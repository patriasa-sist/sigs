"use client";

import { useState, useCallback } from "react";
import { Search, FileText, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buscarPolizasParaAnexo } from "@/app/polizas/anexos/actions";
import { formatCurrency, formatDate } from "@/utils/formatters";
import type { PolizaResumenAnexo } from "@/types/anexo";

type Props = {
	polizaSeleccionada: PolizaResumenAnexo | null;
	onSeleccionar: (poliza: PolizaResumenAnexo) => void;
	visible: boolean;
	deshabilitado: boolean;
};

export function BuscarPolizaAnexo({ polizaSeleccionada, onSeleccionar, visible, deshabilitado }: Props) {
	const [query, setQuery] = useState("");
	const [resultados, setResultados] = useState<PolizaResumenAnexo[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [searched, setSearched] = useState(false);

	const buscar = useCallback(async (searchQuery: string) => {
		if (searchQuery.trim().length < 2) {
			setResultados([]);
			setSearched(false);
			return;
		}

		setIsSearching(true);
		const result = await buscarPolizasParaAnexo(searchQuery);
		if (result.success && result.polizas) {
			setResultados(result.polizas);
		}
		setSearched(true);
		setIsSearching(false);
	}, []);

	// Debounce search
	const handleSearchChange = useCallback(
		(value: string) => {
			setQuery(value);
			const timer = setTimeout(() => buscar(value), 400);
			return () => clearTimeout(timer);
		},
		[buscar]
	);

	if (!visible) return null;

	return (
		<div className="bg-white border rounded-lg p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-4">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
					1
				</div>
				<h2 className="text-lg font-semibold">Buscar Póliza</h2>
				{polizaSeleccionada && (
					<CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
				)}
			</div>

			{/* Póliza ya seleccionada */}
			{polizaSeleccionada && deshabilitado ? (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center gap-2 mb-2">
						<FileText className="h-4 w-4 text-blue-600" />
						<span className="font-medium">Póliza {polizaSeleccionada.numero_poliza}</span>
						<Badge variant="outline">{polizaSeleccionada.ramo}</Badge>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
						<span>Asegurado: {polizaSeleccionada.client_name}</span>
						<span>Compañía: {polizaSeleccionada.compania_nombre}</span>
						<span>Prima: {formatCurrency(polizaSeleccionada.prima_total, polizaSeleccionada.moneda)}</span>
						<span>Vigencia: {formatDate(polizaSeleccionada.inicio_vigencia)} - {formatDate(polizaSeleccionada.fin_vigencia)}</span>
					</div>
				</div>
			) : (
				<>
					{/* Buscador */}
					<div className="relative mb-4">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Buscar por número de póliza..."
							value={query}
							onChange={(e) => handleSearchChange(e.target.value)}
							className="pl-10"
							autoFocus
						/>
					</div>

					{/* Resultados */}
					{isSearching && (
						<p className="text-gray-500 text-sm text-center py-4">Buscando...</p>
					)}

					{!isSearching && searched && resultados.length === 0 && (
						<p className="text-gray-500 text-sm text-center py-4">
							No se encontraron pólizas activas con ese número
						</p>
					)}

					{resultados.length > 0 && (
						<div className="border rounded-lg overflow-hidden">
							<table className="w-full text-sm">
								<thead className="bg-gray-50">
									<tr>
										<th className="text-left px-4 py-2 font-medium">Nro. Póliza</th>
										<th className="text-left px-4 py-2 font-medium">Asegurado</th>
										<th className="text-left px-4 py-2 font-medium">Ramo</th>
										<th className="text-left px-4 py-2 font-medium">Compañía</th>
										<th className="text-right px-4 py-2 font-medium">Prima</th>
										<th className="text-center px-4 py-2 font-medium">Vigencia</th>
									</tr>
								</thead>
								<tbody>
									{resultados.map((poliza) => (
										<tr
											key={poliza.id}
											className="border-t hover:bg-blue-50 cursor-pointer transition-colors"
											onClick={() => {
												if (poliza.tiene_anulacion_pendiente) return;
												onSeleccionar(poliza);
											}}
										>
											<td className="px-4 py-3 font-medium">{poliza.numero_poliza}</td>
											<td className="px-4 py-3">{poliza.client_name}</td>
											<td className="px-4 py-3">
												<Badge variant="outline">{poliza.ramo}</Badge>
											</td>
											<td className="px-4 py-3">{poliza.compania_nombre}</td>
											<td className="px-4 py-3 text-right">
												{formatCurrency(poliza.prima_total, poliza.moneda)}
											</td>
											<td className="px-4 py-3 text-center text-xs">
												{formatDate(poliza.inicio_vigencia)} - {formatDate(poliza.fin_vigencia)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</>
			)}
		</div>
	);
}
