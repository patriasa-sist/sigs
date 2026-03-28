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
import { Clock, AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import type { EstadisticasCobranzas } from "@/types/gerencia";

/* ── Design-system chart colors ── */
const ESTADO_CHART_COLORS: Record<string, string> = {
	pendiente: "oklch(0.70 0.11 80)", // warm amber
	pagado: "oklch(0.575 0.098 175)", // teal accent
	vencido: "oklch(0.62 0.12 25)", // soft coral
	parcial: "oklch(0.55 0.08 280)", // muted indigo
};
const ESTADO_CHART_FALLBACK = "oklch(0.37 0.065 225)";

const GRID_STROKE = "oklch(0.925 0.008 260)";
const AXIS_COLOR = "oklch(0.555 0.025 260)";
const TOOLTIP_BG = "oklch(0.988 0.003 260)";
const TOOLTIP_BORDER = "oklch(0.925 0.008 260)";

const ESTADO_LABELS: Record<string, string> = {
	pendiente: "Pendiente",
	pagado: "Pagado",
	vencido: "Vencido",
	parcial: "Parcial",
};

function formatCurrency(value: number): string {
	return value.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const AGING_COLORS = [
	"oklch(0.575 0.098 175)", // 1-30 teal accent (low urgency)
	"oklch(0.70 0.11 80)", // 31-60 amber
	"oklch(0.62 0.12 25)", // 61-90 coral
	"oklch(0.45 0.14 20)", // 90+ deep red
];

export default function CobranzasCharts({ data, periodoLabel }: { data: EstadisticasCobranzas; periodoLabel: string }) {
	const { kpis, cobradoVsPendiente, distribucionEstados, proximasCuotas, agingMorosidad } = data;

	return (
		<div className="space-y-6">
			{/* KPIs */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard title={`Cuotas Pendientes — ${periodoLabel}`} value={kpis.cuotas_pendientes} icon={Clock} />
				<KPICard
					title={`Cuotas Vencidas — ${periodoLabel}`}
					value={kpis.cuotas_vencidas}
					icon={AlertTriangle}
				/>
				<KPICard
					title={`Cobrado — ${periodoLabel}`}
					value={kpis.monto_cobrado_mes}
					icon={DollarSign}
					format="currency"
				/>
				<KPICard
					title={`Tasa de Cobranza — ${periodoLabel}`}
					value={kpis.tasa_cobranza}
					icon={TrendingUp}
					format="percent"
				/>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Cobrado vs Pendiente */}
				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Cobrado vs Pendiente</CardTitle>
						<CardDescription className="text-xs">Por mes</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={280}>
							<BarChart data={cobradoVsPendiente} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
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
									tickFormatter={formatCurrency}
									tick={{ fill: AXIS_COLOR }}
									width={70}
								/>
								<Tooltip
									formatter={(value) => formatCurrency(Number(value)) + " Bs"}
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
									dataKey="cobrado"
									name="Cobrado"
									fill="oklch(0.575 0.098 175)"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="pendiente"
									name="Pendiente"
									fill="oklch(0.70 0.11 80)"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				{/* Distribución Estados */}
				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Distribución de Estados</CardTitle>
						<CardDescription className="text-xs">{periodoLabel}</CardDescription>
					</CardHeader>
					<CardContent>
						{distribucionEstados.length === 0 ? (
							<p className="text-center text-muted-foreground py-12 text-sm">Sin datos para el período</p>
						) : (
							<ResponsiveContainer width="100%" height={280}>
								<PieChart>
									<Pie
										data={distribucionEstados}
										cx="50%"
										cy="50%"
										outerRadius={95}
										innerRadius={40}
										dataKey="cantidad"
										nameKey="estado"
										strokeWidth={2}
										stroke={TOOLTIP_BG}
										label={({ name, value }) =>
											`${ESTADO_LABELS[name as string] || name}: ${value}`
										}
									>
										{distribucionEstados.map((entry, index) => (
											<Cell
												key={index}
												fill={ESTADO_CHART_COLORS[entry.estado] || ESTADO_CHART_FALLBACK}
											/>
										))}
									</Pie>
									<Tooltip
										formatter={(value, name) => [value, ESTADO_LABELS[name as string] || name]}
										contentStyle={{
											backgroundColor: TOOLTIP_BG,
											border: `1px solid ${TOOLTIP_BORDER}`,
											borderRadius: "8px",
											fontSize: 13,
										}}
									/>
									<Legend
										formatter={(value: string) => ESTADO_LABELS[value] || value}
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

			{/* Aging de Morosidad */}
			<Card className="shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-base font-medium">Aging de Morosidad</CardTitle>
					<CardDescription className="text-xs">
						Cuotas vencidas por antigüedad — {periodoLabel}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{agingMorosidad.every((t) => t.cantidad === 0) ? (
						<p className="text-center text-muted-foreground py-8 text-sm">Sin cuotas vencidas</p>
					) : (
						<div className="flex flex-col lg:flex-row items-center gap-6">
							<div className="w-full lg:w-1/2">
								<ResponsiveContainer width="100%" height={220}>
									<BarChart data={agingMorosidad} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
										<XAxis
											dataKey="tranche"
											fontSize={12}
											tickLine={false}
											axisLine={false}
											tick={{ fill: AXIS_COLOR }}
										/>
										<YAxis
											fontSize={11}
											tickLine={false}
											axisLine={false}
											tickFormatter={formatCurrency}
											tick={{ fill: AXIS_COLOR }}
											width={70}
										/>
										<Tooltip
											formatter={(value) => formatCurrency(Number(value)) + " Bs"}
											contentStyle={{
												backgroundColor: TOOLTIP_BG,
												border: `1px solid ${TOOLTIP_BORDER}`,
												borderRadius: "8px",
												fontSize: 13,
											}}
										/>
										<Bar dataKey="monto" name="Monto Vencido" radius={[4, 4, 0, 0]}>
											{agingMorosidad.map((_, index) => (
												<Cell key={index} fill={AGING_COLORS[index]} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
							<div className="w-full lg:w-1/2">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-xs">Tramo</TableHead>
											<TableHead className="text-right text-xs">Cuotas</TableHead>
											<TableHead className="text-right text-xs">Monto</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{agingMorosidad.map((t, i) => (
											<TableRow key={i}>
												<TableCell className="text-sm">
													<div className="flex items-center gap-2">
														<span
															className="h-2.5 w-2.5 rounded-sm shrink-0 inline-block"
															style={{ backgroundColor: AGING_COLORS[i] }}
														/>
														{t.tranche}
													</div>
												</TableCell>
												<TableCell className="text-right text-sm tabular-nums">
													{t.cantidad}
												</TableCell>
												<TableCell className="text-right text-sm tabular-nums">
													{formatCurrency(t.monto)} Bs
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Próximas Cuotas */}
			<Card className="shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-base font-medium">Próximas Cuotas por Vencer</CardTitle>
					<CardDescription className="text-xs">Próximos 30 días</CardDescription>
				</CardHeader>
				<CardContent>
					{proximasCuotas.length === 0 ? (
						<p className="text-center text-muted-foreground py-8 text-sm">
							No hay cuotas próximas a vencer
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-xs">Póliza</TableHead>
									<TableHead className="text-xs">Cliente</TableHead>
									<TableHead className="text-right text-xs">Monto</TableHead>
									<TableHead className="text-xs">Moneda</TableHead>
									<TableHead className="text-xs">Vencimiento</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{proximasCuotas.map((c, i) => (
									<TableRow key={i}>
										<TableCell className="font-medium text-sm">{c.numero_poliza}</TableCell>
										<TableCell className="text-sm">{c.cliente}</TableCell>
										<TableCell className="text-right text-sm tabular-nums">
											{formatCurrency(c.monto)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">{c.moneda}</TableCell>
										<TableCell className="text-sm tabular-nums">
											{new Date(c.fecha_vencimiento).toLocaleDateString("es-BO")}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
