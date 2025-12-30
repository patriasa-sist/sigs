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
			// Buscar clientes base
			const { data: clientesBase, error: errorBase } = await supabase
				.from("clients")
				.select("*")
				.eq("status", "active")
				.limit(20);

			if (errorBase) throw errorBase;

			if (!clientesBase || clientesBase.length === 0) {
				setResultados([]);
				return;
			}

			// Obtener detalles de clientes naturales y jurídicos
			const clientesNaturalesIds = clientesBase.filter((c) => c.client_type === "natural").map((c) => c.id);

			const clientesJuridicosIds = clientesBase.filter((c) => c.client_type === "juridica").map((c) => c.id);

			const [naturalesResult, juridicosResult] = await Promise.all([
				clientesNaturalesIds.length > 0
					? supabase.from("natural_clients").select("*").in("client_id", clientesNaturalesIds)
					: { data: [], error: null },
				clientesJuridicosIds.length > 0
					? supabase.from("juridic_clients").select("*").in("client_id", clientesJuridicosIds)
					: { data: [], error: null },
			]);

			if (naturalesResult.error) throw naturalesResult.error;
			if (juridicosResult.error) throw juridicosResult.error;

			// Combinar datos
			const asegurados: AseguradoSeleccionado[] = clientesBase.map((cliente) => {
				let detalles: ClienteNatural | ClienteJuridico;
				let nombre_completo: string;
				let documento: string;

				if (cliente.client_type === "natural") {
					const natural = naturalesResult.data?.find((n) => n.client_id === cliente.id);

					if (!natural) {
						// Fallback si no se encuentra el detalle
						detalles = {
							client_id: cliente.id,
							primer_nombre: "N/A",
							primer_apellido: "N/A",
							tipo_documento: "CI",
							numero_documento: "N/A",
							fecha_nacimiento: "",
							direccion: "",
						} as ClienteNatural;
						nombre_completo = "Cliente Natural";
						documento = "N/A";
					} else {
						detalles = natural as ClienteNatural;
						// Construir nombre completo filtrando valores vacíos y normalizando espacios
						nombre_completo = [
							natural.primer_nombre,
							natural.segundo_nombre,
							natural.primer_apellido,
							natural.segundo_apellido,
						]
							.filter((parte) => parte && parte.trim())
							.join(" ");
						documento = `${natural.numero_documento}${
							natural.extension_ci ? ` ${natural.extension_ci}` : ""
						}`;
					}
				} else {
					const juridico = juridicosResult.data?.find((j) => j.client_id === cliente.id);

					if (!juridico) {
						detalles = {
							client_id: cliente.id,
							razon_social: "N/A",
							nit: "N/A",
							direccion_legal: "",
							actividad_economica: "",
							tipo_documento: "NIT",
						} as ClienteJuridico;
						nombre_completo = "Cliente Jurídico";
						documento = "N/A";
					} else {
						detalles = juridico as ClienteJuridico;
						nombre_completo = juridico.razon_social;
						documento = juridico.nit;
					}
				}

				return {
					id: cliente.id,
					client_type: cliente.client_type as "natural" | "juridica",
					status: cliente.status as "active" | "inactive" | "suspended",
					created_at: cliente.created_at,
					detalles,
					nombre_completo,
					documento,
				};
			});

			// Filtrar por búsqueda - normalizar espacios múltiples a uno solo
			const queryNormalizada = query.toLowerCase().trim().replace(/\s+/g, " ");
			const filtrados = asegurados.filter((a) => {
				const nombreNormalizado = a.nombre_completo.toLowerCase().replace(/\s+/g, " ");
				const documentoNormalizado = a.documento.toLowerCase().replace(/\s+/g, " ");

				return (
					nombreNormalizado.includes(queryNormalizada) ||
					documentoNormalizado.includes(queryNormalizada) ||
					a.id.toLowerCase().includes(queryNormalizada)
				);
			});

			setResultados(filtrados);
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
