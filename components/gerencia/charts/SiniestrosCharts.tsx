"use client";

import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import KPICard from "@/components/gerencia/KPICard";
import { AlertCircle, CheckCircle, DollarSign, Clock } from "lucide-react";
import type { EstadisticasSiniestros } from "@/types/gerencia";

/* ── Design-system chart colors ── */
const CHART_COLORS = [
	"oklch(0.37 0.065 225)", // chart-1 petrol teal
	"oklch(0.575 0.098 175)", // chart-2 teal accent
	"oklch(0.70 0.11 80)", // chart-3 warm amber
	"oklch(0.62 0.12 25)", // chart-4 soft coral
	"oklch(0.55 0.08 280)", // chart-5 muted indigo
];

const GRID_STROKE = "oklch(0.925 0.008 260)";
const AXIS_COLOR = "oklch(0.555 0.025 260)";
const TOOLTIP_BG = "oklch(0.988 0.003 260)";
const TOOLTIP_BORDER = "oklch(0.925 0.008 260)";

function formatCurrency(value: number): string {
	return value.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SiniestrosCharts({
	data,
	periodoLabel,
}: {
	data: EstadisticasSiniestros;
	periodoLabel: string;
}) {
	const { kpis, siniestrosPorMes, siniestrosPorRamo, siniestrosAbiertos } = data;

	const isEmpty =
		kpis.siniestros_abiertos === 0 &&
		kpis.cerrados_mes === 0 &&
		siniestrosPorMes.every((m) => m.abiertos === 0 && m.cerrados === 0);

	return (
		<div className="space-y-6">
			{/* KPIs */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard title="Siniestros Abiertos" value={kpis.siniestros_abiertos} icon={AlertCircle} />
				<KPICard title={`Cerrados — ${periodoLabel}`} value={kpis.cerrados_mes} icon={CheckCircle} />
				<KPICard title="Monto Reservado" value={kpis.monto_reservado} icon={DollarSign} format="currency" />
				<KPICard
					title={`Prom. Días Resolución — ${periodoLabel}`}
					value={kpis.promedio_dias_resolucion !== null ? `${kpis.promedio_dias_resolucion} días` : "—"}
					icon={Clock}
				/>
			</div>

			{isEmpty ? (
				<Card className="shadow-sm">
					<CardContent className="py-16">
						<div className="text-center text-muted-foreground">
							<AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-25" />
							<p className="text-sm font-medium">No hay datos de siniestros</p>
							<p className="text-xs mt-1">
								Los gráficos se mostrarán cuando se registren siniestros en el sistema
							</p>
						</div>
					</CardContent>
				</Card>
			) : (
				<>
					{/* Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Siniestros por Mes */}
						<Card className="shadow-sm">
							<CardHeader className="pb-2">
								<CardTitle className="text-base font-medium">Siniestros por Mes</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={280}>
									<BarChart data={siniestrosPorMes} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
										<XAxis
											dataKey="label"
											fontSize={12}
											tickLine={false}
											axisLine={false}
											tick={{ fill: AXIS_COLOR }}
										/>
										<YAxis
											fontSize={11}
											tickLine={false}
											axisLine={false}
											tick={{ fill: AXIS_COLOR }}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: TOOLTIP_BG,
												border: `1px solid ${TOOLTIP_BORDER}`,
												borderRadius: "8px",
												fontSize: 13,
											}}
										/>
										<Legend
											iconType="square"
											iconSize={10}
											wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }}
										/>
										<Bar
											dataKey="abiertos"
											name="Abiertos"
											fill="oklch(0.62 0.12 25)"
											radius={[4, 4, 0, 0]}
										/>
										<Bar
											dataKey="cerrados"
											name="Cerrados"
											fill="oklch(0.575 0.098 175)"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						{/* Por Ramo */}
						<Card className="shadow-sm">
							<CardHeader className="pb-2">
								<CardTitle className="text-base font-medium">Distribución por Ramo</CardTitle>
								<CardDescription className="text-xs">{periodoLabel}</CardDescription>
							</CardHeader>
							<CardContent>
								{siniestrosPorRamo.length === 0 ? (
									<p className="text-center text-muted-foreground py-12 text-sm">Sin datos</p>
								) : (
									<ResponsiveContainer width="100%" height={280}>
										<PieChart>
											<Pie
												data={siniestrosPorRamo}
												cx="50%"
												cy="50%"
												outerRadius={95}
												innerRadius={40}
												dataKey="cantidad"
												nameKey="ramo"
												strokeWidth={2}
												stroke={TOOLTIP_BG}
												label={({ name, value }) => `${name}: ${value}`}
											>
												{siniestrosPorRamo.map((_, index) => (
													<Cell
														key={index}
														fill={CHART_COLORS[index % CHART_COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip
												contentStyle={{
													backgroundColor: TOOLTIP_BG,
													border: `1px solid ${TOOLTIP_BORDER}`,
													borderRadius: "8px",
													fontSize: 13,
												}}
											/>
											<Legend
												iconType="square"
												iconSize={10}
												wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }}
											/>
										</PieChart>
									</ResponsiveContainer>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Siniestros Abiertos */}
					<Card className="shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="text-base font-medium">Siniestros Abiertos Más Antiguos</CardTitle>
						</CardHeader>
						<CardContent>
							{siniestrosAbiertos.length === 0 ? (
								<p className="text-center text-muted-foreground py-8 text-sm">
									No hay siniestros abiertos
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-xs">Código</TableHead>
											<TableHead className="text-xs">Cliente</TableHead>
											<TableHead className="text-xs">Ramo</TableHead>
											<TableHead className="text-xs">Fecha Siniestro</TableHead>
											<TableHead className="text-right text-xs">Días Abierto</TableHead>
											<TableHead className="text-right text-xs">Reserva</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{siniestrosAbiertos.map((s, i) => (
											<TableRow key={i}>
												<TableCell className="font-medium text-sm">
													{s.codigo_siniestro}
												</TableCell>
												<TableCell className="text-sm">{s.cliente}</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{s.ramo}
												</TableCell>
												<TableCell className="text-sm tabular-nums">
													{new Date(s.fecha_siniestro).toLocaleDateString("es-BO")}
												</TableCell>
												<TableCell className="text-right text-sm tabular-nums font-medium">
													{s.dias_abierto}
												</TableCell>
												<TableCell className="text-right text-sm tabular-nums">
													{formatCurrency(s.monto_reserva)} {s.moneda}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
