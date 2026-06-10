"use client";

import { Car, Users, MapPin, Plane, Ship, Truck, Wrench, ShieldCheck, Package } from "lucide-react";
import type { DatosEspecificosRamo, AseguradoPoliza, BienResumen, Moneda } from "@/types/cobranza";
import { formatearMonto } from "@/utils/cobranza";

/** Encabezado de sección con ícono. */
function Header({ icon: Icon, children }: { icon: typeof Car; children: React.ReactNode }) {
	return (
		<h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
			<Icon className="h-4 w-4 text-primary" />
			{children}
		</h3>
	);
}

/** Lista de asegurados/titulares (compartida por varios ramos). */
function Asegurados({ asegurados }: { asegurados: AseguradoPoliza[] }) {
	if (asegurados.length === 0) {
		return <p className="text-sm text-muted-foreground">No hay asegurados registrados</p>;
	}
	return (
		<div className="space-y-2">
			{asegurados.map((a, idx) => (
				<div key={a.id ?? `${a.client_id}-${idx}`} className="border-l-2 border-l-primary pl-3 py-0.5 text-sm">
					<p className="font-medium">
						{a.client_name}
						{a.relacion && (
							<span className="ml-2 text-xs font-normal text-muted-foreground">({a.relacion})</span>
						)}
					</p>
					<p className="text-xs text-muted-foreground">
						{a.client_ci && a.client_ci !== "-" ? `CI/NIT: ${a.client_ci}` : "Sin documento"}
						{a.nivel_nombre && ` · Nivel: ${a.nivel_nombre}`}
						{a.cargo && ` · ${a.cargo}`}
					</p>
				</div>
			))}
		</div>
	);
}

/** Bienes con sus ítems (compartido por Incendio y Riesgos Varios). */
function Bienes({ bienes, moneda }: { bienes: BienResumen[]; moneda: Moneda }) {
	return (
		<div className="space-y-2">
			{bienes.map((b, idx) => (
				<div key={idx} className="rounded-md border border-border bg-card p-3">
					<div className="flex items-start gap-2">
						<MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">{b.direccion}</p>
							{b.items && b.items.length > 0 && (
								<p className="text-xs text-muted-foreground mt-0.5">
									{b.items.map((it) => it.nombre).join(", ")}
								</p>
							)}
						</div>
						{b.valor_total != null && (
							<p className="text-xs font-medium tabular-nums shrink-0">
								{formatearMonto(b.valor_total, moneda)}
							</p>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

interface RamoDetalleProps {
	datos: DatosEspecificosRamo;
	moneda: Moneda;
}

/**
 * Renderiza el detalle específico del ramo de una póliza para que cobranza pueda
 * informar al cliente qué tiene cubierto (autos, asegurados, ubicaciones, naves…).
 */
export default function RamoDetalle({ datos, moneda }: RamoDetalleProps) {
	return (
		<div className="rounded-md border border-border p-4">
			{/* Automotor */}
			{datos.tipo === "automotor" && (
				<>
					<Header icon={Car}>Vehículos Asegurados ({datos.vehiculos.length})</Header>
					{datos.vehiculos.length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{datos.vehiculos.map((v) => (
								<div key={v.id} className="rounded-md border border-border bg-card p-3">
									<p className="font-semibold text-primary text-sm">{v.placa}</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{[v.marca, v.modelo, v.ano].filter(Boolean).join(" ") || v.tipo_vehiculo || "—"}
									</p>
									<p className="text-xs font-medium text-foreground mt-1.5 tabular-nums">
										{formatearMonto(v.valor_asegurado, moneda)}
									</p>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No hay vehículos registrados</p>
					)}
				</>
			)}

			{/* Salud / Vida / AP / Sepelio */}
			{(datos.tipo === "salud" || datos.tipo === "vida" || datos.tipo === "ap" || datos.tipo === "sepelio") && (
				<>
					<Header icon={Users}>Asegurados ({datos.asegurados.length})</Header>
					<Asegurados asegurados={datos.asegurados} />
					{datos.niveles && datos.niveles.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-1.5">
							{datos.niveles.map((n, idx) => (
								<span
									key={idx}
									className="inline-flex items-center text-xs border border-border bg-secondary px-2 py-0.5 rounded-md"
								>
									{n.nombre}
									{n.monto != null && (
										<span className="ml-1 text-muted-foreground tabular-nums">
											{formatearMonto(n.monto, moneda)}
										</span>
									)}
								</span>
							))}
						</div>
					)}
				</>
			)}

			{/* Incendio */}
			{datos.tipo === "incendio" && (
				<>
					<Header icon={MapPin}>Ubicaciones Aseguradas ({datos.ubicaciones.length})</Header>
					{datos.bienes && datos.bienes.length > 0 ? (
						<Bienes bienes={datos.bienes} moneda={moneda} />
					) : datos.ubicaciones.length > 0 ? (
						<div className="space-y-1.5">
							{datos.ubicaciones.map((ub, idx) => (
								<div key={idx} className="flex items-start gap-2 text-sm">
									<MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
									<span>{ub}</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No hay ubicaciones registradas</p>
					)}
					{datos.asegurados && datos.asegurados.length > 0 && (
						<div className="mt-3">
							<Asegurados asegurados={datos.asegurados} />
						</div>
					)}
				</>
			)}

			{/* Riesgos Varios */}
			{datos.tipo === "riesgos_varios" && (
				<>
					<Header icon={Package}>Bienes Asegurados ({datos.bienes.length})</Header>
					{datos.bienes.length > 0 ? (
						<Bienes bienes={datos.bienes} moneda={moneda} />
					) : (
						<p className="text-sm text-muted-foreground">No hay bienes registrados</p>
					)}
					{datos.asegurados && datos.asegurados.length > 0 && (
						<div className="mt-3">
							<Asegurados asegurados={datos.asegurados} />
						</div>
					)}
				</>
			)}

			{/* Responsabilidad Civil */}
			{datos.tipo === "responsabilidad_civil" && (
				<>
					<Header icon={ShieldCheck}>Responsabilidad Civil</Header>
					<div className="text-sm mb-2">
						<span className="text-muted-foreground">Valor asegurado:</span>{" "}
						<span className="font-medium tabular-nums">
							{formatearMonto(datos.valor_asegurado, moneda)}
						</span>
						{datos.tipo_poliza && (
							<span className="ml-2 text-xs text-muted-foreground">({datos.tipo_poliza})</span>
						)}
					</div>
					{datos.vehiculos.length > 0 && (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{datos.vehiculos.map((v, idx) => (
								<div key={idx} className="rounded-md border border-border bg-card p-3">
									<p className="font-semibold text-primary text-sm">{v.placa}</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{[v.marca, v.modelo, v.ano].filter(Boolean).join(" ") || v.tipo_vehiculo || "—"}
									</p>
								</div>
							))}
						</div>
					)}
				</>
			)}

			{/* Transporte */}
			{datos.tipo === "transporte" && (
				<>
					<Header icon={Truck}>Transporte</Header>
					<div className="space-y-1.5 text-sm">
						<p>
							<span className="text-muted-foreground">Materia asegurada:</span>{" "}
							<span className="font-medium">{datos.materia_asegurada}</span>
						</p>
						<p>
							<span className="text-muted-foreground">Ruta:</span>{" "}
							<span className="font-medium">
								{[datos.ciudad_origen, datos.pais_origen].filter(Boolean).join(", ") || "—"}
								{" → "}
								{[datos.ciudad_destino, datos.pais_destino].filter(Boolean).join(", ") || "—"}
							</span>
						</p>
						<div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
							{datos.tipo_transporte && <span>Tipo: {datos.tipo_transporte}</span>}
							{datos.modalidad && <span>Modalidad: {datos.modalidad}</span>}
							<span className="text-foreground font-medium tabular-nums">
								{formatearMonto(datos.valor_asegurado, moneda)}
							</span>
						</div>
					</div>
				</>
			)}

			{/* Aeronavegación / Naves o embarcaciones */}
			{datos.tipo === "naves" && (
				<>
					<Header icon={datos.subtipo === "aeronave" ? Plane : Ship}>
						{datos.subtipo === "aeronave" ? "Aeronaves" : "Embarcaciones"} ({datos.naves.length})
					</Header>
					{datos.naves.length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{datos.naves.map((n, idx) => (
								<div key={idx} className="rounded-md border border-border bg-card p-3">
									<p className="font-semibold text-primary text-sm">{n.matricula}</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{[n.marca, n.modelo, n.ano].filter(Boolean).join(" ") || "—"}
									</p>
									{n.valor_casco != null && (
										<p className="text-xs font-medium text-foreground mt-1.5 tabular-nums">
											{formatearMonto(n.valor_casco, moneda)}
										</p>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No hay naves registradas</p>
					)}
				</>
			)}

			{/* Ramos Técnicos */}
			{datos.tipo === "ramos_tecnicos" && (
				<>
					<Header icon={Wrench}>Equipos Asegurados ({datos.equipos.length})</Header>
					{datos.equipos.length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{datos.equipos.map((e, idx) => (
								<div key={idx} className="rounded-md border border-border bg-card p-3">
									<p className="font-semibold text-primary text-sm">{e.nro_serie}</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{[e.marca, e.modelo, e.ano].filter(Boolean).join(" ") || e.tipo_equipo || "—"}
									</p>
									<p className="text-xs font-medium text-foreground mt-1.5 tabular-nums">
										{formatearMonto(e.valor_asegurado, moneda)}
									</p>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No hay equipos registrados</p>
					)}
				</>
			)}

			{/* Otros */}
			{datos.tipo === "otros" && <p className="text-sm text-muted-foreground">{datos.descripcion}</p>}
		</div>
	);
}
