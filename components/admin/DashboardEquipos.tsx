"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, AlertTriangle, DollarSign } from "lucide-react";
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

export default function DashboardEquipos({ metricas }: Props) {
	if (metricas.length === 0) {
		return (
			<Card>
				<CardContent className="pt-6 text-center text-gray-500">
					No hay equipos creados. Crea equipos desde la sección de{" "}
					<a href="/admin/equipos" className="text-primary hover:underline">
						Gestión de Equipos
					</a>
					.
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
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<FileText className="h-4 w-4" />
							Total Pólizas
						</div>
						<p className="text-2xl font-bold mt-1">{totales.polizas}</p>
						<p className="text-xs text-gray-400">{totales.polizasActivas} activas</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<Users className="h-4 w-4" />
							Total Clientes
						</div>
						<p className="text-2xl font-bold mt-1">{totales.clientes}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<AlertTriangle className="h-4 w-4" />
							Siniestros Abiertos
						</div>
						<p className="text-2xl font-bold mt-1">{totales.siniestros}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4 pb-4">
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<DollarSign className="h-4 w-4" />
							Prima Total (Activas)
						</div>
						<p className="text-2xl font-bold mt-1">Bs {formatCurrency(totales.prima)}</p>
					</CardContent>
				</Card>
			</div>

			{/* Cards por equipo */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{metricas.map((equipo) => (
					<Card key={equipo.equipo_id}>
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center justify-between">
								{equipo.equipo_nombre}
								<Badge variant="outline">{equipo.miembros.length} miembros</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Métricas */}
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-blue-50 rounded-lg p-3">
									<p className="text-xs text-blue-600 font-medium">Pólizas</p>
									<p className="text-xl font-bold text-blue-700">{equipo.total_polizas}</p>
									<p className="text-xs text-blue-500">{equipo.total_polizas_activas} activas</p>
								</div>
								<div className="bg-green-50 rounded-lg p-3">
									<p className="text-xs text-green-600 font-medium">Clientes</p>
									<p className="text-xl font-bold text-green-700">{equipo.total_clientes}</p>
								</div>
								<div className="bg-orange-50 rounded-lg p-3">
									<p className="text-xs text-orange-600 font-medium">Siniestros</p>
									<p className="text-xl font-bold text-orange-700">{equipo.total_siniestros_abiertos}</p>
									<p className="text-xs text-orange-500">abiertos</p>
								</div>
								<div className="bg-purple-50 rounded-lg p-3">
									<p className="text-xs text-purple-600 font-medium">Prima Total</p>
									<p className="text-lg font-bold text-purple-700">
										{formatCurrency(equipo.prima_total)}
									</p>
									<p className="text-xs text-purple-500">Bs</p>
								</div>
							</div>

							{/* Miembros */}
							<div>
								<p className="text-xs text-gray-500 font-medium mb-2">Miembros</p>
								<div className="flex flex-wrap gap-1">
									{equipo.miembros.map((m) => (
										<Badge key={m.id} variant="secondary" className="text-xs">
											{m.full_name} ({m.role})
										</Badge>
									))}
									{equipo.miembros.length === 0 && (
										<span className="text-xs text-gray-400">Sin miembros</span>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
