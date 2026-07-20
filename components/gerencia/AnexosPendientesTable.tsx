"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AnexoPendiente } from "@/app/gerencia/validacion-anexos/actions";
import { formatDate } from "@/utils/formatters";

type Props = {
	anexos: AnexoPendiente[];
};

const TIPO_BADGE = {
	inclusion: { label: "Inclusión", className: "bg-teal-50 text-teal-800 border-teal-200" },
	exclusion: { label: "Exclusión", className: "bg-amber-50 text-amber-800 border-amber-200" },
	reemplazo: { label: "Reemplazo", className: "bg-blue-50 text-blue-800 border-blue-200" },
	anulacion: { label: "Anulación", className: "bg-rose-50 text-rose-800 border-rose-200" },
};

export default function AnexosPendientesTable({ anexos }: Props) {
	const router = useRouter();

	const irADetalle = (anexo: AnexoPendiente) => {
		router.push(`/polizas/${anexo.poliza_id}#anexo-${anexo.id}`);
	};

	if (anexos.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-bg mb-4">
					<CheckCircle className="h-6 w-6 text-accent" />
				</span>
				<p className="text-sm font-medium text-foreground">Sin anexos pendientes</p>
				<p className="text-sm text-muted-foreground mt-1">Todos los anexos han sido procesados</p>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-lg border hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="h-8 text-xs">Nro. Anexo</TableHead>
							<TableHead className="h-8 text-xs">Tipo</TableHead>
							<TableHead className="h-8 text-xs">Póliza</TableHead>
							<TableHead className="h-8 text-xs">Ramo</TableHead>
							<TableHead className="h-8 text-xs text-right">Ajuste</TableHead>
							<TableHead className="h-8 text-xs">Creado por</TableHead>
							<TableHead className="h-8 text-xs">Fecha</TableHead>
							<TableHead className="h-8 w-10">
								<span className="sr-only">Ver detalle</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{anexos.map((anexo) => {
							const tipoBadge = TIPO_BADGE[anexo.tipo_anexo];

							return (
								<TableRow
									key={anexo.id}
									className="cursor-pointer hover:bg-secondary/50"
									onClick={() => irADetalle(anexo)}
								>
									<TableCell className="py-1.5 font-medium">{anexo.numero_anexo}</TableCell>
									<TableCell className="py-1.5">
										<div className="flex items-center gap-1.5">
											<Badge variant="outline" className={tipoBadge.className}>
												{tipoBadge.label}
											</Badge>
											{anexo.sin_plan_pagos && (
												<Badge
													variant="outline"
													className="bg-warning/15 text-warning border-warning/30"
													title="Inclusión con prima propia sin plan de pagos registrado"
												>
													Sin plan de pagos
												</Badge>
											)}
										</div>
									</TableCell>
									<TableCell className="py-1.5">{anexo.numero_poliza}</TableCell>
									<TableCell className="py-1.5">{anexo.ramo}</TableCell>
									<TableCell className="py-1.5 text-right">
										{anexo.monto_ajuste_total !== 0 ? (
											<span
												className={
													anexo.monto_ajuste_total >= 0 ? "text-accent" : "text-destructive"
												}
											>
												{anexo.monto_ajuste_total >= 0 ? "+" : ""}
												{anexo.monto_ajuste_total.toLocaleString("es-BO", {
													minimumFractionDigits: 2,
												})}
											</span>
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</TableCell>
									<TableCell className="py-1.5">
										<div className="text-xs leading-tight">
											<div>{anexo.creado_por_nombre || "-"}</div>
											<div className="text-muted-foreground">{formatDate(anexo.created_at)}</div>
										</div>
									</TableCell>
									<TableCell className="py-1.5">{formatDate(anexo.fecha_anexo)}</TableCell>
									<TableCell className="py-1.5">
										<div className="flex items-center justify-end">
											<ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{/* Tarjetas movil (< md) */}
			<div className="md:hidden space-y-3">
				{anexos.map((anexo) => {
					const tipoBadge = TIPO_BADGE[anexo.tipo_anexo];
					return (
						<button
							key={anexo.id}
							onClick={() => irADetalle(anexo)}
							className="w-full text-left rounded-lg border bg-card p-3 hover:bg-secondary/50 active:bg-secondary/50 transition-colors"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="font-medium text-sm text-foreground">{anexo.numero_anexo}</div>
									<div className="text-xs text-muted-foreground mt-0.5">
										Poliza {anexo.numero_poliza} · {anexo.ramo}
									</div>
								</div>
								<div className="flex flex-col items-end gap-1 shrink-0">
									<Badge variant="outline" className={tipoBadge.className}>
										{tipoBadge.label}
									</Badge>
									{anexo.sin_plan_pagos && (
										<Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
											Sin plan de pagos
										</Badge>
									)}
								</div>
							</div>
							<div className="mt-2 flex items-center justify-between gap-3">
								<div className="text-xs text-muted-foreground">
									<div>{anexo.creado_por_nombre || "-"}</div>
									<div>{formatDate(anexo.fecha_anexo)}</div>
								</div>
								<div className="text-sm font-medium tabular-nums">
									{anexo.monto_ajuste_total !== 0 ? (
										<span
											className={
												anexo.monto_ajuste_total >= 0 ? "text-accent" : "text-destructive"
											}
										>
											{anexo.monto_ajuste_total >= 0 ? "+" : ""}
											{anexo.monto_ajuste_total.toLocaleString("es-BO", {
												minimumFractionDigits: 2,
											})}
										</span>
									) : (
										<span className="text-muted-foreground">-</span>
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</>
	);
}
