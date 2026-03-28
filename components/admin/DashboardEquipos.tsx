"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, AlertTriangle, DollarSign, UsersRound } from "lucide-react";
import Link from "next/link";
import type { EquipoMetricas } from "@/app/admin/dashboard-equipos/actions";

type Props = {
	metricas: EquipoMetricas[];
};

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("es-BO", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

type StatItemProps = {
	icon: React.ElementType;
	label: string;
	value: string | number;
	sub?: string;
};

function StatItem({ icon: Icon, label, value, sub }: StatItemProps) {
	return (
		<div className="flex flex-col gap-0.5">
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Icon className="h-3.5 w-3.5 shrink-0" />
				{label}
			</div>
			<p className="text-lg font-semibold text-foreground leading-none">{value}</p>
			{sub && <p className="text-xs text-muted-foreground">{sub}</p>}
		</div>
	);
}

export default function DashboardEquipos({ metricas }: Props) {
	if (metricas.length === 0) {
		return (
			<Card>
				<CardContent className="pt-10 pb-10 text-center">
					<UsersRound className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
					<p className="text-sm text-muted-foreground">
						No hay equipos creados. Crea equipos desde la sección de{" "}
						<Link href="/admin/equipos" className="text-primary hover:underline">
							Gestión de Equipos
						</Link>
						.
					</p>
				</CardContent>
			</Card>
		);
	}

	// Totales generales
	const totales = metricas.reduce(
		(acc, m) => ({
			polizas: acc.polizas + m.total_polizas,
			polizasActivas: acc.polizasActivas + m.total_polizas_activas,
			clientes: acc.clientes + m.total_clientes,
			siniestros: acc.siniestros + m.total_siniestros_abiertos,
			prima: acc.prima + m.prima_total,
		}),
		{ polizas: 0, polizasActivas: 0, clientes: 0, siniestros: 0, prima: 0 }
	);

	return (
		<div className="space-y-6">
			{/* Resumen general */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
							<FileText className="h-3.5 w-3.5" />
							Total Pólizas
						</div>
						<p className="text-2xl font-semibold text-foreground">{totales.polizas}</p>
						<p className="text-xs text-muted-foreground mt-0.5">{totales.polizasActivas} activas</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
							<Users className="h-3.5 w-3.5" />
							Total Clientes
						</div>
						<p className="text-2xl font-semibold text-foreground">{totales.clientes}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
							<AlertTriangle className="h-3.5 w-3.5" />
							Siniestros Abiertos
						</div>
						<p className="text-2xl font-semibold text-foreground">{totales.siniestros}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-5">
						<div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
							<DollarSign className="h-3.5 w-3.5" />
							Prima Total (Activas)
						</div>
						<p className="text-xl font-semibold text-foreground">Bs {formatCurrency(totales.prima)}</p>
					</CardContent>
				</Card>
			</div>

			{/* Cards por equipo */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{metricas.map((equipo) => (
					<Card key={equipo.equipo_id} className="flex flex-col">
						<CardHeader className="pb-0 pt-5 px-5">
							<div className="flex items-center justify-between gap-2">
								<h3 className="text-sm font-semibold text-foreground truncate">
									{equipo.equipo_nombre}
								</h3>
								<Badge variant="secondary" className="shrink-0 text-xs">
									{equipo.miembros.length} {equipo.miembros.length === 1 ? "miembro" : "miembros"}
								</Badge>
							</div>
						</CardHeader>

						<CardContent className="flex flex-col flex-1 gap-4 p-5 pt-4">
							{/* Métricas — 4 stats en grid 2x2, sin fondos de color */}
							<div className="grid grid-cols-2 gap-x-6 gap-y-4 py-3 border-y border-border">
								<StatItem
									icon={FileText}
									label="Pólizas"
									value={equipo.total_polizas}
									sub={`${equipo.total_polizas_activas} activas`}
								/>
								<StatItem
									icon={Users}
									label="Clientes"
									value={equipo.total_clientes}
								/>
								<StatItem
									icon={AlertTriangle}
									label="Siniestros"
									value={equipo.total_siniestros_abiertos}
									sub="abiertos"
								/>
								<StatItem
									icon={DollarSign}
									label="Prima Total"
									value={formatCurrency(equipo.prima_total)}
									sub="Bs"
								/>
							</div>

							{/* Miembros */}
							<div>
								<p className="text-xs font-medium text-muted-foreground mb-2">Miembros</p>
								{equipo.miembros.length === 0 ? (
									<span className="text-xs text-muted-foreground">Sin miembros asignados</span>
								) : (
									<div className="flex flex-wrap gap-1.5">
										{equipo.miembros.map((m) => (
											<Badge key={m.id} variant="outline" className="text-xs font-normal">
												{m.full_name}
												<span className="ml-1 text-muted-foreground">({m.role})</span>
											</Badge>
										))}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
