"use client";

import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import KPICard from "@/components/gerencia/KPICard";
import { DollarSign, TrendingUp, Percent, FileText } from "lucide-react";
import type { EstadisticasProduccion } from "@/types/gerencia";

const COLORS = [
	"#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626",
	"#0891b2", "#ca8a04", "#4f46e5", "#be185d", "#059669",
];

function formatCurrency(value: number): string {
	return value.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ProduccionCharts({ data }: { data: EstadisticasProduccion }) {
	const { kpis, primaPorMes, distribucionPorRamo, primaPorCompania, topResponsables } = data;

	return (
		<div className="space-y-6">
			{/* KPIs */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard title="Prima Total del Mes" value={kpis.prima_total_mes} icon={DollarSign} format="currency" />
				<KPICard title="Prima Acumulada del Año" value={kpis.prima_acumulada_anio} icon={TrendingUp} format="currency" />
				<KPICard title="Comisiones del Mes" value={kpis.comisiones_mes} icon={Percent} format="currency" />
				<KPICard title="Pólizas del Mes" value={kpis.cantidad_polizas_mes} icon={FileText} />
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Prima por Mes */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Prima Total por Mes</CardTitle>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={primaPorMes}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="label" fontSize={12} />
								<YAxis fontSize={12} tickFormatter={formatCurrency} />
								<Tooltip formatter={(value) => [formatCurrency(Number(value)), "Prima Total"]} />
								<Bar dataKey="prima_total" fill="#2563eb" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				{/* Distribución por Ramo */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Distribución por Ramo</CardTitle>
					</CardHeader>
					<CardContent>
						{distribucionPorRamo.length === 0 ? (
							<p className="text-center text-muted-foreground py-12">Sin datos para el período</p>
						) : (
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={distribucionPorRamo}
										cx="50%"
										cy="50%"
										labelLine={false}
										outerRadius={100}
										dataKey="prima_total"
										nameKey="ramo"
										label={({ name, percent }) =>
											(percent ?? 0) > 0.05 ? `${name} (${((percent ?? 0) * 100).toFixed(0)}%)` : ""
										}
									>
										{distribucionPorRamo.map((_, index) => (
											<Cell key={index} fill={COLORS[index % COLORS.length]} />
										))}
									</Pie>
									<Tooltip formatter={(value) => formatCurrency(Number(value))} />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Prima por Compañía */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Prima por Compañía</CardTitle>
					</CardHeader>
					<CardContent>
						{primaPorCompania.length === 0 ? (
							<p className="text-center text-muted-foreground py-12">Sin datos</p>
						) : (
							<ResponsiveContainer width="100%" height={300}>
								<BarChart data={primaPorCompania} layout="vertical">
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis type="number" fontSize={12} tickFormatter={formatCurrency} />
									<YAxis type="category" dataKey="compania" fontSize={11} width={120} />
									<Tooltip formatter={(value) => [formatCurrency(Number(value)), "Prima"]} />
									<Bar dataKey="prima_total" fill="#16a34a" radius={[0, 4, 4, 0]} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				{/* Top Responsables */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Top Responsables</CardTitle>
					</CardHeader>
					<CardContent>
						{topResponsables.length === 0 ? (
							<p className="text-center text-muted-foreground py-12">Sin datos</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Responsable</TableHead>
										<TableHead className="text-right">Prima Total</TableHead>
										<TableHead className="text-right">Pólizas</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{topResponsables.map((r, i) => (
										<TableRow key={i}>
											<TableCell className="font-medium">{r.responsable}</TableCell>
											<TableCell className="text-right">{formatCurrency(r.prima_total)}</TableCell>
											<TableCell className="text-right">{r.cantidad_polizas}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
