"use client";

import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
	PieChart, Pie, Cell,
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

const COLOCACION_COLORS = {
	nuevas: "#2563eb",
	renovadas: "#16a34a",
	anuladas: "#dc2626",
};

function formatCurrency(value: number): string {
	return value.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Custom label para el pie chart que evita superposición:
 * Solo muestra labels de slices > 5%, posicionados fuera del pie
 */
function renderCustomLabel(props: {
	cx?: number;
	cy?: number;
	midAngle?: number;
	outerRadius?: number;
	percent?: number;
	name?: string;
}) {
	const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name = "" } = props;
	if (percent < 0.05) return null;
	const RADIAN = Math.PI / 180;
	const radius = outerRadius + 30;
	const x = cx + radius * Math.cos(-midAngle * RADIAN);
	const y = cy + radius * Math.sin(-midAngle * RADIAN);

	return (
		<text
			x={x}
			y={y}
			fill="#374151"
			textAnchor={x > cx ? "start" : "end"}
			dominantBaseline="central"
			fontSize={12}
		>
			{name} ({(percent * 100).toFixed(0)}%)
		</text>
	);
}

export default function ProduccionCharts({ data, periodoLabel }: { data: EstadisticasProduccion; periodoLabel: string }) {
	const { kpis, primaPorMes, comisionesPorRamo, colocacion, topResponsables, topDirectoresCartera } = data;

	const colocacionData = [
		{ name: "Nuevas", value: colocacion.nuevas, fill: COLOCACION_COLORS.nuevas },
		{ name: "Renovadas", value: colocacion.renovadas, fill: COLOCACION_COLORS.renovadas },
		{ name: "Anuladas", value: colocacion.anuladas, fill: COLOCACION_COLORS.anuladas },
	];

	const totalColocacion = colocacion.nuevas + colocacion.renovadas + colocacion.anuladas;

	return (
		<div className="space-y-6">
			{/* KPIs */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard title={`Prima Total — ${periodoLabel}`} value={kpis.prima_total_mes} icon={DollarSign} format="currency" />
				<KPICard title="Prima Acumulada del Año" value={kpis.prima_acumulada_anio} icon={TrendingUp} format="currency" />
				<KPICard title={`Comisiones — ${periodoLabel}`} value={kpis.comisiones_mes} icon={Percent} format="currency" />
				<KPICard title={`Pólizas — ${periodoLabel}`} value={kpis.cantidad_polizas_mes} icon={FileText} />
			</div>

			{/* Charts Row 1 */}
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

				{/* Colocación de Pólizas */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Colocación de Pólizas — {periodoLabel}</CardTitle>
					</CardHeader>
					<CardContent>
						{totalColocacion === 0 ? (
							<p className="text-center text-muted-foreground py-12">Sin datos</p>
						) : (
							<div className="space-y-4">
								<ResponsiveContainer width="100%" height={220}>
									<BarChart data={colocacionData} layout="vertical" barSize={32}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis type="number" fontSize={12} />
										<YAxis type="category" dataKey="name" fontSize={12} width={90} />
										<Tooltip />
										<Bar dataKey="value" name="Pólizas" radius={[0, 4, 4, 0]}>
											{colocacionData.map((entry, index) => (
												<Cell key={index} fill={entry.fill} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
								<div className="grid grid-cols-3 gap-3 text-center text-sm">
									<div className="rounded-lg border p-3">
										<p className="text-muted-foreground">Nuevas</p>
										<p className="text-xl font-bold text-blue-600">{colocacion.nuevas}</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-muted-foreground">Renovadas</p>
										<p className="text-xl font-bold text-green-600">{colocacion.renovadas}</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-muted-foreground">Anuladas</p>
										<p className="text-xl font-bold text-red-600">{colocacion.anuladas}</p>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Comisiones por Ramo — full width */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Comisiones por Ramo — {periodoLabel}</CardTitle>
				</CardHeader>
				<CardContent>
					{comisionesPorRamo.length === 0 ? (
						<p className="text-center text-muted-foreground py-12">Sin datos para el período</p>
					) : (
						<div className="flex flex-col lg:flex-row items-center gap-6">
							<div className="w-full lg:w-1/2">
								<ResponsiveContainer width="100%" height={400}>
									<PieChart>
										<Pie
											data={comisionesPorRamo}
											cx="50%"
											cy="50%"
											outerRadius={140}
											dataKey="comision"
											nameKey="ramo"
											label={renderCustomLabel}
											labelLine={false}
										>
											{comisionesPorRamo.map((_, index) => (
												<Cell key={index} fill={COLORS[index % COLORS.length]} />
											))}
										</Pie>
										<Tooltip formatter={(value) => `${formatCurrency(Number(value))} Bs`} />
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div className="w-full lg:w-1/2">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Ramo</TableHead>
											<TableHead className="text-right">Comisión</TableHead>
											<TableHead className="text-right">%</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{comisionesPorRamo.map((r, i) => (
											<TableRow key={i}>
												<TableCell className="font-medium">
													<div className="flex items-center gap-2">
														<div
															className="h-3 w-3 rounded-full shrink-0"
															style={{ backgroundColor: COLORS[i % COLORS.length] }}
														/>
														{r.ramo}
													</div>
												</TableCell>
												<TableCell className="text-right">{formatCurrency(r.comision)} Bs</TableCell>
												<TableCell className="text-right">{r.porcentaje.toFixed(1)}%</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Charts Row 3: Top Responsables + Top Directores */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Top Responsables */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Top Responsables — {periodoLabel}</CardTitle>
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

				{/* Top Directores de Cartera */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Directores de Cartera — {periodoLabel}</CardTitle>
					</CardHeader>
					<CardContent>
						{topDirectoresCartera.length === 0 ? (
							<p className="text-center text-muted-foreground py-12">Sin datos</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Director</TableHead>
										<TableHead className="text-right">Pólizas</TableHead>
										<TableHead className="text-right">Prima Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{topDirectoresCartera.map((d, i) => (
										<TableRow key={i}>
											<TableCell className="font-medium">{d.nombre}</TableCell>
											<TableCell className="text-right">{d.cantidad_polizas}</TableCell>
											<TableCell className="text-right">{formatCurrency(d.prima_total)}</TableCell>
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
