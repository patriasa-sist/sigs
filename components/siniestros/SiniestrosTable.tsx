"use client";

import { memo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, AlertTriangle, XCircle, Ban, CheckCircle, FileText } from "lucide-react";
import type { SiniestroVistaConEstado } from "@/types/siniestro";

interface SiniestrosTableProps {
	siniestros: SiniestroVistaConEstado[];
}

function SiniestrosTable({ siniestros }: SiniestrosTableProps) {
	const getEstadoStyle = (estado: string) => {
		switch (estado) {
			case "abierto":
				return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
			case "rechazado":
				return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
			case "declinado":
				return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800";
			case "concluido":
				return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getEstadoIcon = (estado: string) => {
		switch (estado) {
			case "abierto":
				return <AlertTriangle className="h-3 w-3" />;
			case "rechazado":
				return <XCircle className="h-3 w-3" />;
			case "declinado":
				return <Ban className="h-3 w-3" />;
			case "concluido":
				return <CheckCircle className="h-3 w-3" />;
			default:
				return null;
		}
	};

	const getEstadoLabel = (estado: string) => {
		const labels: Record<string, string> = {
			abierto: "Abierto",
			rechazado: "Rechazado",
			declinado: "Declinado",
			concluido: "Concluido",
		};
		return labels[estado] || estado;
	};

	if (siniestros.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-16 px-4">
					<FileText className="h-16 w-16 text-gray-300 mb-4" />
					<h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
						No se encontraron siniestros
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
						No hay siniestros que coincidan con los filtros aplicados.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr className="bg-gray-50 dark:bg-gray-800 border-b">
								<th className="text-left p-3 text-sm font-semibold">Código</th>
								<th className="text-left p-3 text-sm font-semibold">Fecha</th>
								<th className="text-left p-3 text-sm font-semibold">Póliza</th>
								<th className="text-left p-3 text-sm font-semibold">Cliente</th>
								<th className="text-left p-3 text-sm font-semibold">Responsable</th>
								<th className="text-right p-3 text-sm font-semibold">Reserva</th>
								<th className="text-center p-3 text-sm font-semibold">Estado</th>
								<th className="text-center p-3 text-sm font-semibold">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{siniestros.map((siniestro, index) => {
								const requiereAtencion = siniestro.requiere_atencion === true;

								return (
									<tr
										key={siniestro.id}
										className={`border-b ${
											requiereAtencion
												? "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
												: `hover:bg-gray-50 dark:hover:bg-gray-800/50 ${index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/50"}`
										}`}
										title={requiereAtencion ? "⚠️ Sin actualizaciones en más de 10 días" : ""}
									>
									<td className="p-3 text-sm">
										<div className="font-mono text-xs font-medium text-primary">
											{siniestro.codigo_siniestro || "N/A"}
										</div>
									</td>
									<td className="p-3 text-sm">
										<div>
											<div className="font-medium">
												{new Date(siniestro.fecha_siniestro).toLocaleDateString("es-BO")}
											</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">
												Rep: {new Date(siniestro.fecha_reporte).toLocaleDateString("es-BO")}
											</div>
										</div>
									</td>
									<td className="p-3 text-sm">
										<div>
											<div className="font-medium">{siniestro.numero_poliza}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">{siniestro.ramo}</div>
										</div>
									</td>
									<td className="p-3 text-sm">
										<div>
											<div className="font-medium">{siniestro.cliente_nombre}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">
												{siniestro.cliente_documento}
											</div>
										</div>
									</td>
									<td className="p-3 text-sm">
										<div className="text-xs">
											{siniestro.responsable_nombre || "Sin asignar"}
										</div>
									</td>
									<td className="p-3 text-sm text-right">
										<div>
											<div className="font-medium">
												{siniestro.monto_reserva.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">{siniestro.moneda}</div>
										</div>
									</td>
									<td className="p-3 text-center">
										<div className="flex flex-col gap-1 items-center">
											<span
												className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoStyle(siniestro.estado)}`}
											>
												{getEstadoIcon(siniestro.estado)}
												{getEstadoLabel(siniestro.estado)}
											</span>
											{requiereAtencion && (
												<span
													className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
													title="Sin actualizaciones en más de 10 días"
												>
													⚠️ Atención
												</span>
											)}
										</div>
									</td>
									<td className="p-3 text-center">
										<Button variant="ghost" size="sm" asChild>
											<Link href={`/siniestros/editar/${siniestro.id}`}>
												<Eye className="h-4 w-4 mr-1" />
												Ver
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
