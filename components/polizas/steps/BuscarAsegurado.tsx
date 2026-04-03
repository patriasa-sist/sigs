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

	const buscarClientes = useCallback(async (query: string) => {
		if (!query.trim()) {
			setResultados([]);
			return;
		}

		setCargando(true);
		setError(null);

		try {
			const supabase = createClient();
			const q = query.trim();

			const [naturalesResult, juridicosResult, unipersonalesResult] = await Promise.all([
				supabase
					.from("natural_clients")
					.select("*, clients!inner(id, client_type, status, created_at)")
					.eq("clients.status", "active")
					.or(
						`primer_nombre.ilike.%${q}%,` +
						`segundo_nombre.ilike.%${q}%,` +
						`primer_apellido.ilike.%${q}%,` +
						`segundo_apellido.ilike.%${q}%,` +
						`numero_documento.ilike.%${q}%`,
					)
					.order("created_at", { referencedTable: "clients", ascending: false })
					.limit(15),
				supabase
					.from("juridic_clients")
					.select("*, clients!inner(id, client_type, status, created_at)")
					.eq("clients.status", "active")
					.or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`)
					.order("created_at", { referencedTable: "clients", ascending: false })
					.limit(10),
				supabase
					.from("unipersonal_clients")
					.select("*, clients!inner(id, client_type, status, created_at)")
					.eq("clients.status", "active")
					.or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`)
					.order("created_at", { referencedTable: "clients", ascending: false })
					.limit(10),
			]);

			if (naturalesResult.error) throw naturalesResult.error;
			if (juridicosResult.error) throw juridicosResult.error;
			if (unipersonalesResult.error) throw unipersonalesResult.error;

			const naturales: AseguradoSeleccionado[] = (naturalesResult.data || []).map((nc) => {
				const nombre_completo = [nc.primer_nombre, nc.segundo_nombre, nc.primer_apellido, nc.segundo_apellido]
					.filter((p) => p?.trim())
					.join(" ");
				const documento = `${nc.numero_documento}${nc.extension_ci ? ` ${nc.extension_ci}` : ""}`;
				return {
					id: nc.clients.id,
					client_type: "natural" as const,
					status: nc.clients.status as "active" | "inactive" | "suspended",
					created_at: nc.clients.created_at,
					detalles: nc as ClienteNatural,
					nombre_completo,
					documento,
				};
			});

			const juridicos: AseguradoSeleccionado[] = (juridicosResult.data || []).map((jc) => ({
				id: jc.clients.id,
				client_type: "juridica" as const,
				status: jc.clients.status as "active" | "inactive" | "suspended",
				created_at: jc.clients.created_at,
				detalles: jc as ClienteJuridico,
				nombre_completo: jc.razon_social,
				documento: jc.nit,
			}));

			const unipersonales: AseguradoSeleccionado[] = (unipersonalesResult.data || []).map((uc) => ({
				id: uc.clients.id,
				client_type: "juridica" as const,
				status: uc.clients.status as "active" | "inactive" | "suspended",
				created_at: uc.clients.created_at,
				detalles: null,
				nombre_completo: uc.razon_social,
				documento: uc.nit,
			}));

			const todos = [...naturales, ...juridicos, ...unipersonales].sort(
				(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
			);

			setResultados(todos.slice(0, 20));
		} catch (err) {
			console.error("Error buscando clientes:", err);
			setError("Error al buscar clientes. Por favor intente nuevamente.");
		} finally {
			setCargando(false);
		}
	}, []);

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

	const puedeAvanzar = asegurado !== null;

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Buscar Asegurado</h2>
					<p className="text-sm text-muted-foreground mt-1">Busque y seleccione el cliente asegurado</p>
				</div>
				{asegurado && (
					<div className="flex items-center gap-2 text-success">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Asegurado seleccionado</span>
					</div>
				)}
			</div>

			{/* Buscador */}
			{!asegurado && (
				<div className="mb-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Buscar por nombre, razón social, CI, NIT..."
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
							className="pl-10"
						/>
					</div>
					{error && <p className="text-sm text-destructive mt-2">{error}</p>}
				</div>
			)}

			{/* Asegurado Seleccionado */}
			{asegurado && (
				<div className="mb-6 p-4 border border-primary/40 rounded-lg bg-primary/5">
					<div className="flex items-start justify-between">
						<div className="flex items-start gap-3">
							{asegurado.client_type === "natural" ? (
								<User className="h-9 w-9 text-primary" />
							) : (
								<Building2 className="h-9 w-9 text-primary" />
							)}
							<div>
								<p className="font-semibold text-base text-foreground">{asegurado.nombre_completo}</p>
								<p className="text-sm text-muted-foreground">
									{asegurado.client_type === "natural" ? "Persona Natural" : "Persona Jurídica"}
									{" · "}
									{asegurado.client_type === "natural"
										? (asegurado.detalles as ClienteNatural)?.tipo_documento
										: "NIT"}
									: {asegurado.documento}
								</p>
								{asegurado.detalles && "direccion" in asegurado.detalles && asegurado.detalles.direccion && (
									<p className="text-sm text-muted-foreground mt-1">
										{asegurado.detalles.direccion}
									</p>
								)}
								{asegurado.detalles && "direccion_legal" in asegurado.detalles && asegurado.detalles.direccion_legal && (
									<p className="text-sm text-muted-foreground mt-1">
										{asegurado.detalles.direccion_legal}
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
							<p className="text-sm text-muted-foreground">Buscando...</p>
						</div>
					) : resultados.length > 0 ? (
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground mb-3">
								{resultados.length}{" "}
								{resultados.length === 1 ? "resultado encontrado" : "resultados encontrados"}
							</p>
							{resultados.map((cliente) => (
								<button
									key={cliente.id}
									onClick={() => onAseguradoSeleccionado(cliente)}
									className="w-full text-left p-4 border border-border rounded-lg bg-card hover:border-primary/60 hover:bg-primary/5 transition-colors"
								>
									<div className="flex items-start gap-3">
										{cliente.client_type === "natural" ? (
											<User className="h-8 w-8 text-muted-foreground" />
										) : (
											<Building2 className="h-8 w-8 text-muted-foreground" />
										)}
										<div className="flex-1">
											<p className="font-medium">{cliente.nombre_completo}</p>
											<p className="text-sm text-muted-foreground">
												{cliente.client_type === "natural" ? "Persona Natural" : "Persona Jurídica"}
												{" · "}
												{cliente.documento}
											</p>
										</div>
										<ChevronRight className="h-5 w-5 text-muted-foreground" />
									</div>
								</button>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							<p>No se encontraron clientes</p>
							<p className="text-sm mt-1">El cliente debe estar registrado previamente en el sistema</p>
						</div>
					)}
				</div>
			)}

			{/* Botón Siguiente */}
			<div className="flex justify-end pt-4 border-t border-border">
				<Button onClick={onSiguiente} disabled={!puedeAvanzar} size="lg" className="cursor-pointer">
					Continuar con Datos Básicos
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
