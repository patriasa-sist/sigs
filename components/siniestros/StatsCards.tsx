"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, DollarSign, FolderOpen } from "lucide-react";
import type { SiniestrosStats } from "@/types/siniestro";

interface StatsCardsProps {
	stats: SiniestrosStats;
	requierenAtencionCount: number;
}

function StatsCards({ stats, requierenAtencionCount }: StatsCardsProps) {
	const totalCerrados =
		stats.siniestros_por_estado.rechazado +
		stats.siniestros_por_estado.declinado +
		stats.siniestros_por_estado.concluido;

	const tieneAtencion = requierenAtencionCount > 0;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{/* Abiertos */}
			<Card className="bg-card shadow-sm">
				<CardContent className="p-5">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm text-muted-foreground">Abiertos</p>
							<p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
								{stats.total_abiertos}
							</p>
						</div>
						<div className="p-2 rounded-md bg-secondary flex-shrink-0">
							<FolderOpen className="h-4 w-4 text-primary" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Requieren atención — borde izquierdo ámbar si hay casos */}
			<Card
				className={
					tieneAtencion
						? "bg-card shadow-sm border-amber-200"
						: "bg-card shadow-sm"
				}
				style={tieneAtencion ? { borderLeftWidth: "3px", borderLeftColor: "#F59E0B" } : undefined}
			>
				<CardContent className="p-5">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm text-muted-foreground">Sin actualizar +10 días</p>
							<p
								className={`text-2xl font-semibold mt-1 tabular-nums ${
									tieneAtencion ? "text-amber-700" : "text-foreground"
								}`}
							>
								{requierenAtencionCount}
							</p>
						</div>
						<div
							className={`p-2 rounded-md flex-shrink-0 ${
								tieneAtencion ? "bg-amber-50" : "bg-secondary"
							}`}
						>
							<AlertTriangle
								className={`h-4 w-4 ${tieneAtencion ? "text-amber-600" : "text-muted-foreground"}`}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Cerrados total */}
			<Card className="bg-card shadow-sm">
				<CardContent className="p-5">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm text-muted-foreground">Cerrados total</p>
							<p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
								{totalCerrados}
							</p>
							<div className="flex gap-3 mt-2">
								<span className="text-xs text-muted-foreground">
									{stats.siniestros_por_estado.concluido} concluidos
								</span>
								<span className="text-xs text-muted-foreground">
									{stats.siniestros_por_estado.rechazado} rechazados
								</span>
								<span className="text-xs text-muted-foreground">
									{stats.siniestros_por_estado.declinado} declinados
								</span>
							</div>
						</div>
						<div className="p-2 rounded-md bg-secondary flex-shrink-0">
							<CheckCircle2 className="h-4 w-4 text-primary" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Monto total reservado */}
			<Card className="bg-card shadow-sm">
				<CardContent className="p-5">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm text-muted-foreground">Monto total reservado</p>
							<p className="text-xl font-semibold text-foreground mt-1 tabular-nums">
								Bs{" "}
								{stats.monto_total_reservado.toLocaleString("es-BO", {
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								})}
							</p>
							<p className="text-xs text-muted-foreground mt-2">
								{stats.total_cerrados_mes} cerrado{stats.total_cerrados_mes !== 1 ? "s" : ""} este mes
							</p>
						</div>
						<div className="p-2 rounded-md bg-secondary flex-shrink-0">
							<DollarSign className="h-4 w-4 text-primary" />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default memo(StatsCards);
