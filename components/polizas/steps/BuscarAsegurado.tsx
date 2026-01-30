"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, User, Building2, CheckCircle2, ChevronRight } from "lucide-react";
import type { AseguradoSeleccionado, ClienteNatural, ClienteJuridico } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

type Props = {
	asegurado: AseguradoSeleccionado | null;
	onAseguradoSeleccionado: (asegurado: AseguradoSeleccionado) => void;
	onSiguiente: () => void;
};

export function BuscarAsegurado({ asegurado, onAseguradoSeleccionado, onSiguiente }: Props) {
	const [busqueda, setBusqueda] = useState("");
	const [resultados, setResultados] = useState<AseguradoSeleccionado[]>([]);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Buscar clientes
	const buscarClientes = useCallback(async (query: string) => {
		if (!query.trim()) {
			setResultados([]);
			return;
		}

		setCargando(true);
		setError(null);

		try {
			const supabase = createClient();
			const queryNormalizada = query.trim();

			// Buscar en paralelo: clientes naturales y jurídicos que coincidan con la búsqueda
			const [naturalesResult, juridicosResult] = await Promise.all([
				// Buscar clientes naturales por nombre, apellido o documento
				supabase
					.from("natural_clients")
					.select("*, clients!inner(id, client_type, status, created_at)")
					.eq("clients.status", "active")
					.or(
						`primer_nombre.ilike.%${queryNormalizada}%,` +
							`segundo_nombre.ilike.%${queryNormalizada}%,` +
							`primer_apellido.ilike.%${queryNormalizada}%,` +
							`segundo_apellido.ilike.%${queryNormalizada}%,` +
							`numero_documento.ilike.%${queryNormalizada}%`
					)
					.order("created_at", { referencedTable: "clients", ascending: false })
					.limit(20),
				// Buscar clientes jurídicos por razón social o NIT
				supabase
					.from("juridic_clients")
					.select("*, clients!inner(id, client_type, status, created_at)")
					.eq("clients.status", "active")
					.or(`razon_social.ilike.%${queryNormalizada}%,nit.ilike.%${queryNormalizada}%`)
					.order("created_at", { referencedTable: "clients", ascending: false })
					.limit(20),
			]);

			if (naturalesResult.error) throw naturalesResult.error;
			if (juridicosResult.error) throw juridicosResult.error;

			// Construir lista de asegurados desde clientes naturales
			const aseguradosNaturales: AseguradoSeleccionado[] = (naturalesResult.data || []).map((natural) => {
				const cliente = natural.clients;
				const nombre_completo = [
					natural.primer_nombre,
					natural.segundo_nombre,
					natural.primer_apellido,
					natural.segundo_apellido,
				]
					.filter((parte) => parte && parte.trim())
					.join(" ");
				const documento = `${natural.numero_documento}${natural.extension_ci ? ` ${natural.extension_ci}` : ""}`;

				return {
					id: cliente.id,
					client_type: "natural" as const,
					status: cliente.status as "active" | "inactive" | "suspended",
					created_at: cliente.created_at,
					detalles: natural as ClienteNatural,
					nombre_completo,
					documento,
				};
			});

			// Construir lista de asegurados desde clientes jurídicos
			const aseguradosJuridicos: AseguradoSeleccionado[] = (juridicosResult.data || []).map((juridico) => {
				const cliente = juridico.clients;
				return {
					id: cliente.id,
					client_type: "juridica" as const,
					status: cliente.status as "active" | "inactive" | "suspended",
					created_at: cliente.created_at,
					detalles: juridico as ClienteJuridico,
					nombre_completo: juridico.razon_social,
					documento: juridico.nit,
				};
			});

			// Combinar y ordenar por fecha de creación descendente
			const asegurados = [...aseguradosNaturales, ...aseguradosJuridicos].sort(
				(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);

			setResultados(asegurados.slice(0, 20));
		} catch (err) {
			console.error("Error buscando clientes:", err);
			setError("Error al buscar clientes. Por favor intente nuevamente.");
		} finally {
			setCargando(false);
		}
	}, []);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => {
			if (busqueda.trim()) {
				buscarClientes(busqueda);
			} else {
				setResultados([]);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [busqueda, buscarClientes]);

	const handleSeleccionar = (cliente: AseguradoSeleccionado) => {
		onAseguradoSeleccionado(cliente);
	};

	const puedeAvanzar = asegurado !== null;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Paso 1: Buscar Asegurado</h2>
					<p className="text-sm text-gray-600 mt-1">Busque y seleccione el cliente asegurado</p>
				</div>

				{asegurado && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Asegurado seleccionado</span>
					</div>
				)}
			</div>

			{/* Buscador */}
			{!asegurado && (
				<div className="mb-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
						<Input
							type="text"
							placeholder="Buscar por nombre, razón social, CI, NIT..."
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
							className="pl-10"
						/>
					</div>

					{error && <p className="text-sm text-red-600 mt-2">{error}</p>}
				</div>
			)}

			{/* Asegurado Seleccionado */}
			{asegurado && (
				<div className="mb-6 p-4 border-2 border-primary rounded-lg bg-primary/5">
					<div className="flex items-start justify-between">
						<div className="flex items-start gap-3">
							{asegurado.client_type === "natural" ? (
								<User className="h-10 w-10 text-primary" />
							) : (
								<Building2 className="h-10 w-10 text-primary" />
							)}

							<div>
								<p className="font-semibold text-lg">{asegurado.nombre_completo}</p>
								<p className="text-sm text-gray-600">
									{asegurado.client_type === "natural" ? "Persona Natural" : "Persona Jurídica"}
									{" · "}
									{asegurado.client_type === "natural"
										? (asegurado.detalles as ClienteNatural).tipo_documento
										: "NIT"}
									: {asegurado.documento}
								</p>

								{asegurado.client_type === "natural" && (
									<p className="text-sm text-gray-600 mt-1">
										📍 {(asegurado.detalles as ClienteNatural).direccion}
									</p>
								)}

								{asegurado.client_type === "juridica" && (
									<p className="text-sm text-gray-600 mt-1">
										📍 {(asegurado.detalles as ClienteJuridico).direccion_legal}
									</p>
								)}
							</div>
						</div>

						<Button variant="outline" size="sm" onClick={() => onAseguradoSeleccionado(null!)}>
							Cambiar
						</Button>
					</div>
				</div>
			)}

			{/* Resultados de Búsqueda */}
			{!asegurado && busqueda && (
				<div className="mb-6">
					{cargando ? (
						<div className="text-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
							<p className="text-sm text-gray-600">Buscando...</p>
						</div>
					) : resultados.length > 0 ? (
						<div className="space-y-2">
							<p className="text-sm text-gray-600 mb-3">
								{resultados.length}{" "}
								{resultados.length === 1 ? "resultado encontrado" : "resultados encontrados"}
							</p>

							{resultados.map((cliente) => (
								<button
									key={cliente.id}
									onClick={() => handleSeleccionar(cliente)}
									className="w-full text-left p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
								>
									<div className="flex items-start gap-3">
										{cliente.client_type === "natural" ? (
											<User className="h-8 w-8 text-gray-400" />
										) : (
											<Building2 className="h-8 w-8 text-gray-400" />
										)}

										<div className="flex-1">
											<p className="font-medium">{cliente.nombre_completo}</p>
											<p className="text-sm text-gray-600">
												{cliente.client_type === "natural"
													? "Persona Natural"
													: "Persona Jurídica"}
												{" · "}
												{cliente.documento}
											</p>
										</div>

										<ChevronRight className="h-5 w-5 text-gray-400" />
									</div>
								</button>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500">
							<p>No se encontraron clientes</p>
							<p className="text-sm mt-1">El cliente debe estar registrado previamente en el sistema</p>
						</div>
					)}
				</div>
			)}

			{/* Botón Siguiente */}
			<div className="flex justify-end pt-4 border-t">
				<Button onClick={onSiguiente} disabled={!puedeAvanzar} size="lg" className="cursor-pointer">
					Continuar con Datos Básicos
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
