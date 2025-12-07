"use client";

import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarClientes } from "@/app/clients/actions";

type Cliente = {
	id: string;
	nombre: string;
	ci: string;
};

type Props = {
	onSeleccionar: (cliente: Cliente) => void;
	onCancelar: () => void;
	clientesExcluidos?: string[];
};

export function BuscadorClientes({ onSeleccionar, onCancelar, clientesExcluidos = [] }: Props) {
	const [busqueda, setBusqueda] = useState("");
	const [resultados, setResultados] = useState<Cliente[]>([]);
	const [buscando, setBuscando] = useState(false);
	const [yaBusco, setYaBusco] = useState(false);

	const realizarBusqueda = async () => {
		if (!busqueda.trim()) return;

		setBuscando(true);
		setYaBusco(true);

		try {
			const resultado = await buscarClientes(busqueda);

			if (resultado.success && resultado.clientes) {
				// Mapear los resultados al formato esperado
				const clientesMapeados: Cliente[] = resultado.clientes.map((c) => ({
					id: c.id,
					nombre: c.nombre_completo || c.razon_social || "Sin nombre",
					ci: c.numero_documento || c.nit || "-",
				}));

				// Filtrar clientes ya seleccionados
				const clientesFiltrados = clientesMapeados.filter(
					(c) => !clientesExcluidos.includes(c.id)
				);

				setResultados(clientesFiltrados);
			} else {
				setResultados([]);
			}
		} catch (error) {
			console.error("Error buscando clientes:", error);
			setResultados([]);
		} finally {
			setBuscando(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			realizarBusqueda();
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h3 className="text-lg font-semibold text-gray-900">Buscar Cliente</h3>
					<Button variant="ghost" size="sm" onClick={onCancelar}>
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Buscador */}
				<div className="p-4 border-b">
					<div className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								value={busqueda}
								onChange={(e) => setBusqueda(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Buscar por nombre, CI o NIT..."
								className="pl-10"
							/>
						</div>
						<Button onClick={realizarBusqueda} disabled={buscando || !busqueda.trim()}>
							{buscando ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Buscando...
								</>
							) : (
								"Buscar"
							)}
						</Button>
					</div>
				</div>

				{/* Resultados */}
				<div className="flex-1 overflow-y-auto p-4">
					{!yaBusco ? (
						<div className="text-center py-12 text-gray-500">
							<Search className="h-12 w-12 mx-auto mb-3 text-gray-400" />
							<p>Ingrese un término de búsqueda para encontrar clientes</p>
						</div>
					) : resultados.length === 0 ? (
						<div className="text-center py-12 text-gray-500">
							<p>No se encontraron clientes</p>
							<p className="text-sm mt-1">Intente con otro término de búsqueda</p>
						</div>
					) : (
						<div className="space-y-2">
							{resultados.map((cliente) => (
								<button
									key={cliente.id}
									onClick={() => onSeleccionar(cliente)}
									className="w-full p-4 border rounded-lg hover:bg-gray-50 hover:border-primary text-left transition-colors"
								>
									<p className="font-medium text-gray-900">{cliente.nombre}</p>
									<p className="text-sm text-gray-600">CI/NIT: {cliente.ci}</p>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t flex justify-end">
					<Button variant="outline" onClick={onCancelar}>
						Cancelar
					</Button>
				</div>
			</div>
		</div>
	);
}
