"use client";

import { memo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	ChevronRight,
	FileText,
	AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SiniestroVistaConEstado } from "@/types/siniestro";

type SortField =
	| "fecha_siniestro"
	| "fecha_reporte"
	| "numero_poliza"
	| "cliente_nombre"
	| "monto_reserva"
	| "codigo_siniestro";
type SortDirection = "asc" | "desc";

interface SiniestrosTableProps {
	siniestros: SiniestroVistaConEstado[];
	sortField: SortField;
	sortDirection: SortDirection;
	onSort: (field: SortField) => void;
}

function SortButton({
	field,
	currentField,
	direction,
	onSort,
	children,
	align = "left",
}: {
	field: SortField;
	currentField: SortField;
	direction: SortDirection;
	onSort: (f: SortField) => void;
	children: React.ReactNode;
	align?: "left" | "right";
}) {
	const isActive = currentField === field;
	const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

	return (
		<button
			onClick={() => onSort(field)}
			className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
				align === "right" ? "ml-auto" : ""
			} ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}
		>
			{children}
			<Icon className={`h-3 w-3 ${isActive ? "opacity-100" : "opacity-40"}`} />
		</button>
	);
}

function SiniestrosTable({ siniestros, sortField, sortDirection, onSort }: SiniestrosTableProps) {
	if (siniestros.length === 0) {
		return (
			<Card className="shadow-sm">
				<CardContent className="flex flex-col items-center justify-center py-16 px-4">
					<div className="p-4 rounded-full bg-secondary mb-4">
						<FileText className="h-8 w-8 text-muted-foreground" />
					</div>
					<h3 className="text-base font-medium text-foreground mb-1">
						No se encontraron siniestros
					</h3>
					<p className="text-sm text-muted-foreground text-center max-w-sm">
						No hay siniestros que coincidan con los filtros aplicados.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="shadow-sm">
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="bg-secondary border-b border-border">
								<th className="text-left px-4 py-3 text-sm font-medium text-secondary-foreground">
									<SortButton
										field="codigo_siniestro"
										currentField={sortField}
										direction={sortDirection}
										onSort={onSort}
									>
										Siniestro
									</SortButton>
								</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-secondary-foreground">
									<SortButton
										field="numero_poliza"
										currentField={sortField}
										direction={sortDirection}
										onSort={onSort}
									>
										Póliza / Ramo
									</SortButton>
								</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-secondary-foreground">
									<SortButton
										field="cliente_nombre"
										currentField={sortField}
										direction={sortDirection}
										onSort={onSort}
									>
										Cliente
									</SortButton>
								</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-secondary-foreground">
									Responsable
								</th>
								<th className="text-right px-4 py-3 text-sm font-medium text-secondary-foreground">
									<SortButton
										field="monto_reserva"
										currentField={sortField}
										direction={sortDirection}
										onSort={onSort}
										align="right"
									>
										Reserva
									</SortButton>
								</th>
								<th className="text-left px-4 py-3 text-sm font-medium text-secondary-foreground">
									Estado
								</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody>
							{siniestros.map((siniestro) => {
								const requiereAtencion = siniestro.requiere_atencion === true;
								const diasSinActualizar = requiereAtencion
									? Math.floor(
											(Date.now() - new Date(siniestro.updated_at).getTime()) /
												86400000
									  )
									: 0;

								return (
									<tr
										key={siniestro.id}
										className={`border-b border-border last:border-0 transition-colors ${
											requiereAtencion
												? "bg-amber-50/50 hover:bg-amber-50/80"
												: "bg-card hover:bg-secondary/40"
										}`}
										style={
											requiereAtencion
												? { borderLeftWidth: "3px", borderLeftColor: "#F59E0B" }
												: undefined
										}
									>
										{/* Siniestro */}
										<td className="px-4 py-3">
											<div className="font-mono text-sm font-medium text-primary">
												{siniestro.codigo_siniestro || "—"}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												{new Date(siniestro.fecha_siniestro).toLocaleDateString("es-BO")}
											</div>
										</td>

										{/* Póliza / Ramo */}
										<td className="px-4 py-3">
											<div className="text-sm font-medium text-foreground">
												{siniestro.numero_poliza}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												{siniestro.ramo}
											</div>
										</td>

										{/* Cliente */}
										<td className="px-4 py-3">
											<div className="text-sm font-medium text-foreground">
												{siniestro.cliente_nombre}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												{siniestro.cliente_documento}
											</div>
										</td>

										{/* Responsable */}
										<td className="px-4 py-3">
											<div className="text-sm text-foreground">
												{siniestro.responsable_nombre || (
													<span className="text-muted-foreground italic">Sin asignar</span>
												)}
											</div>
										</td>

										{/* Reserva */}
										<td className="px-4 py-3 text-right">
											<div className="text-sm font-medium text-foreground tabular-nums">
												{siniestro.monto_reserva.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												{siniestro.moneda}
											</div>
										</td>

										{/* Estado */}
										<td className="px-4 py-3">
											<div className="flex flex-col gap-1">
												<StatusBadge status={siniestro.estado} />
												{siniestro.estado_actual_nombre && (
													<span className="text-xs text-muted-foreground">
														{siniestro.estado_actual_nombre}
													</span>
												)}
												{requiereAtencion && (
													<span className="inline-flex items-center gap-1 text-xs text-amber-700">
														<AlertTriangle className="h-3 w-3" />
														{diasSinActualizar}d sin actualizar
													</span>
												)}
											</div>
										</td>

										{/* Acción */}
										<td className="px-4 py-3">
											<Button variant="ghost" size="sm" asChild>
												<Link href={`/siniestros/editar/${siniestro.id}`}>
													<ChevronRight className="h-4 w-4" />
												</Link>
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}

export default memo(SiniestrosTable);
