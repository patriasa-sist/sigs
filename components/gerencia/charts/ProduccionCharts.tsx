"use client";

import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import KPICard from "@/components/gerencia/KPICard";
import { DollarSign, TrendingUp, Percent, FileText } from "lucide-react";
import type { EstadisticasProduccion } from "@/types/gerencia";

const MONEDA_COLORS: Record<string, string> = {
	Bs: "oklch(0.37 0.065 225)",
	USD: "oklch(0.575 0.098 175)",
	USDT: "oklch(0.70 0.11 80)",
	UFV: "oklch(0.55 0.08 280)",
};
const MONEDA_FALLBACK = "oklch(0.62 0.12 25)";

const CHART_COLORS = [
	"oklch(0.37 0.065 225)",
	"oklch(0.575 0.098 175)",
	"oklch(0.70 0.11 80)",
	"oklch(0.62 0.12 25)",
	"oklch(0.55 0.08 280)",
];

const COLOCACION_COLORS = {
	nuevas: "oklch(0.37 0.065 225)",
	renovadas: "oklch(0.575 0.098 175)",
	anuladas: "oklch(0.62 0.12 25)",
};

const GRID_STROKE = "oklch(0.925 0.008 260)";
const AXIS_COLOR = "oklch(0.555 0.025 260)";
const TOOLTIP_BG = "oklch(0.988 0.003 260)";
const TOOLTIP_BORDER = "oklch(0.925 0.008 260)";

function formatCurrency(value: number): string {
	return value.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

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
	const radius = outerRadius + 28;
	const x = cx + radius * Math.cos(-midAngle * RADIAN);
	const y = cy + radius * Math.sin(-midAngle * RADIAN);

	return (
		<text
			x={x}
			y={y}
			fill="oklch(0.555 0.025 260)"
			textAnchor={x > cx ? "start" : "end"}
			dominantBaseline="central"
			fontSize={12}
			fontWeight={500}
		>
			{name} ({(percent * 100).toFixed(0)}%)
		</text>
	);
}

export default function ProduccionCharts({
	data,
	periodoLabel,
}: {
	data: EstadisticasProduccion;
	periodoLabel: string;
}) {
	const {
		kpis,
		primaPorMes,
		comisionesPorRamo,
		colocacion,
		topResponsables,
		topDirectoresCartera,
		vencimientosProximos,
		resumenVencimientos,
		distribucionMoneda,
		funnelProduccion,
		trends,
	} = data;

	const colocacionData = [
		{ name: "Nuevas", value: colocacion.nuevas, fill: COLOCACION_COLORS.nuevas },
		{ name: "Renovadas", value: colocacion.renovadas, fill: COLOCACION_COLORS.renovadas },
		{ name: "Anuladas", value: colocacion.anuladas, fill: COLOCACION_COLORS.anuladas },
	];

	const totalColocacion = colocacion.nuevas + colocacion.renovadas + colocacion.anuladas;

	return (
		<div className="space-y-6">
			{/* 1 — KPIs: Prima Acumulada primero */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard
					title="Prima Acumulada del Año"
					value={kpis.prima_acumulada_anio}
					icon={TrendingUp}
					format="currency"
					trend={trends.prima_acumulada_anio}
				/>
				<KPICard
					title={`Prima Total — ${periodoLabel}`}
					value={kpis.prima_total_mes}
					icon={DollarSign}
					format="currency"
					trend={trends.prima_total_mes}
				/>
				<KPICard
					title={`Comisiones — ${periodoLabel}`}
					value={kpis.comisiones_mes}
					icon={Percent}
					format="currency"
					trend={trends.comisiones_mes}
				/>
				<KPICard
					title={`Pólizas — ${periodoLabel}`}
					value={kpis.cantidad_polizas_mes}
					icon={FileText}
					trend={trends.cantidad_polizas_mes}
				/>
			</div>

			{/* 2 — Prima por Mes + Colocación */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Prima Total por Mes</CardTitle>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={280}>
							<BarChart data={primaPorMes} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
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
									formatter={(value) => [formatCurrency(Number(value)) + " Bs", "Prima Total"]}
									contentStyle={{
										backgroundColor: TOOLTIP_BG,
										border: `1px solid ${TOOLTIP_BORDER}`,
										borderRadius: "8px",
										fontSize: 13,
									}}
								/>
								<Bar dataKey="prima_total" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Colocación de Pólizas</CardTitle>
						<CardDescription className="text-xs">{periodoLabel}</CardDescription>
					</CardHeader>
					<CardContent>
						{totalColocacion === 0 ? (
							<p className="text-center text-muted-foreground py-12 text-sm">Sin datos</p>
						) : (
							<div className="space-y-4">
								<ResponsiveContainer width="100%" height={200}>
									<BarChart
										data={colocacionData}
										layout="vertical"
										barSize={28}
										margin={{ top: 0, right: 4, bottom: 0, left: 4 }}
									>
										<CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
										<XAxis
											type="number"
											fontSize={11}
											tickLine={false}
											axisLine={false}
											tick={{ fill: AXIS_COLOR }}
										/>
										<YAxis
											type="category"
											dataKey="name"
											fontSize={12}
											tickLine={false}
											axisLine={false}
											width={85}
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
										<Bar dataKey="value" name="Pólizas" radius={[0, 4, 4, 0]}>
											{colocacionData.map((entry, index) => (
												<Cell key={index} fill={entry.fill} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
								<div className="grid grid-cols-3 gap-3 text-center">
									<div className="rounded-md border border-border p-3">
										<p className="text-xs text-muted-foreground">Nuevas</p>
										<p className="text-xl font-semibold text-foreground">{colocacion.nuevas}</p>
									</div>
									<div className="rounded-md border border-border p-3">
										<p className="text-xs text-muted-foreground">Renovadas</p>
										<p className="text-xl font-semibold text-foreground">{colocacion.renovadas}</p>
									</div>
									<div className="rounded-md border border-border p-3">
										<p className="text-xs text-muted-foreground">Anuladas</p>
										<p className="text-xl font-semibold text-foreground">{colocacion.anuladas}</p>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* 3 — Comisiones por Ramo */}
			<Card className="shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-base font-medium">Comisiones por Ramo</CardTitle>
					<CardDescription className="text-xs">{periodoLabel}</CardDescription>
				</CardHeader>
				<CardContent>
					{comisionesPorRamo.length === 0 ? (
						<p className="text-center text-muted-foreground py-12 text-sm">Sin datos para el período</p>
					) : (
						<div className="flex flex-col lg:flex-row items-center gap-6">
							<div className="w-full lg:w-1/2">
								<ResponsiveContainer width="100%" height={360}>
									<PieChart>
										<Pie
											data={comisionesPorRamo}
											cx="50%"
											cy="50%"
											outerRadius={130}
											innerRadius={50}
											dataKey="comision"
											nameKey="ramo"
											label={renderCustomLabel}
											labelLine={false}
											strokeWidth={2}
											stroke={TOOLTIP_BG}
										>
											{comisionesPorRamo.map((_, index) => (
												<Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
											))}
										</Pie>
										<Tooltip
											formatter={(value) => `${formatCurrency(Number(value))} Bs`}
											contentStyle={{
												backgroundColor: TOOLTIP_BG,
												border: `1px solid ${TOOLTIP_BORDER}`,
												borderRadius: "8px",
												fontSize: 13,
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div className="w-full lg:w-1/2">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="text-xs">Ramo</TableHead>
											<TableHead className="text-right text-xs">Comisión</TableHead>
											<TableHead className="text-right text-xs">%</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{comisionesPorRamo.map((r, i) => (
											<TableRow key={i}>
												<TableCell className="font-medium text-sm">
													<div className="flex items-center gap-2">
														<span
															className="h-2.5 w-2.5 rounded-sm shrink-0 inline-block"
															style={{
																backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
															}}
														/>
														{r.ramo}
													</div>
												</TableCell>
												<TableCell className="text-right text-sm tabular-nums">
													{formatCurrency(r.comision)} Bs
												</TableCell>
												<TableCell className="text-right text-sm text-muted-foreground tabular-nums">
													{r.porcentaje.toFixed(1)}%
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

			{/* 4 — Distribución por Moneda + Pólizas por Vencer */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Distribución por Moneda</CardTitle>
						<CardDescription className="text-xs">{periodoLabel}</CardDescription>
					</CardHeader>
					<CardContent>
						{distribucionMoneda.length === 0 ? (
							<p className="text-center text-muted-foreground py-12 text-sm">Sin datos</p>
						) : (
							<div className="flex flex-col items-center gap-4">
								<ResponsiveContainer width="100%" height={200}>
									<PieChart>
										<Pie
											data={distribucionMoneda}
											cx="50%"
											cy="50%"
											outerRadius={80}
											innerRadius={35}
											dataKey="prima_total"
											nameKey="moneda"
											strokeWidth={2}
											stroke={TOOLTIP_BG}
											label={({ name, percent }: { name?: string; percent?: number }) =>
												(percent ?? 0) > 0.05
													? `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
													: ""
											}
										>
											{distribucionMoneda.map((entry, index) => (
												<Cell
													key={index}
													fill={MONEDA_COLORS[entry.moneda] || MONEDA_FALLBACK}
												/>
											))}
										</Pie>
										<Tooltip
											formatter={(value) => `${formatCurrency(Number(value))} (prima)`}
											contentStyle={{
												backgroundColor: TOOLTIP_BG,
												border: `1px solid ${TOOLTIP_BORDER}`,
												borderRadius: "8px",
												fontSize: 13,
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
								<div className="w-full space-y-1.5">
									{distribucionMoneda.map((m, i) => (
										<div key={i} className="flex items-center justify-between text-sm">
											<div className="flex items-center gap-2">
												<span
													className="h-2.5 w-2.5 rounded-sm shrink-0 inline-block"
													style={{
														backgroundColor: MONEDA_COLORS[m.moneda] || MONEDA_FALLBACK,
													}}
												/>
												<span className="font-medium">{m.moneda}</span>
											</div>
											<div className="flex gap-4 text-muted-foreground tabular-nums">
												<span>{m.cantidad_polizas} pólizas</span>
												<span>{formatCurrency(m.prima_total)}</span>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Pólizas por Vencer</CardTitle>
						<CardDescription className="text-xs">Próximos 90 días — pólizas activas</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-3 gap-3 mb-4">
							<div
								className={`rounded-md border p-3 text-center ${resumenVencimientos.en_30_dias > 0 ? "border-amber-300 bg-amber-50" : "border-border"}`}
							>
								<p
									className={`text-xs mb-1 font-medium ${resumenVencimientos.en_30_dias > 0 ? "text-amber-700" : "text-muted-foreground"}`}
								>
									30 días
								</p>
								<p
									className={`text-2xl font-semibold ${resumenVencimientos.en_30_dias > 0 ? "text-amber-700" : "text-foreground"}`}
								>
									{resumenVencimientos.en_30_dias}
								</p>
							</div>
							<div className="rounded-md border border-border p-3 text-center">
								<p className="text-xs text-muted-foreground mb-1">60 días</p>
								<p className="text-2xl font-semibold text-foreground">
									{resumenVencimientos.en_60_dias}
								</p>
							</div>
							<div className="rounded-md border border-border p-3 text-center">
								<p className="text-xs text-muted-foreground mb-1">90 días</p>
								<p className="text-2xl font-semibold text-foreground">
									{resumenVencimientos.en_90_dias}
								</p>
							</div>
						</div>
						{vencimientosProximos.length === 0 ? (
							<p className="text-center text-muted-foreground py-4 text-sm">
								Sin pólizas próximas a vencer
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-xs">Póliza</TableHead>
										<TableHead className="text-xs">Cliente</TableHead>
										<TableHead className="text-xs">Ramo</TableHead>
										<TableHead className="text-right text-xs">Días</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{vencimientosProximos.slice(0, 8).map((v, i) => (
										<TableRow key={i}>
											<TableCell className="font-medium text-sm">{v.numero_poliza}</TableCell>
											<TableCell className="text-sm max-w-[120px] truncate">
												{v.cliente}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">{v.ramo}</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												<span
													className={
														v.dias_restantes <= 30
															? "text-amber-700 font-medium"
															: v.dias_restantes <= 60
																? "text-amber-600 font-medium"
																: "text-muted-foreground"
													}
												>
													{v.dias_restantes}d
												</span>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			{/* 5 — Pipeline de Validación */}
			{funnelProduccion.total > 0 && (
				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Pipeline de Validación</CardTitle>
						<CardDescription className="text-xs">
							{periodoLabel} — flujo de pólizas creadas hasta activación
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col lg:flex-row items-stretch gap-3">
							{[
								{
									label: "Creadas",
									value: funnelProduccion.total,
									pct: 100,
									barColor: "oklch(0.37 0.065 225)",
									textColor: "text-primary",
									bg: "bg-primary/10",
									border: "border-primary/25",
								},
								{
									label: "Activas",
									value: funnelProduccion.activas,
									pct:
										funnelProduccion.total > 0
											? (funnelProduccion.activas / funnelProduccion.total) * 100
											: 0,
									barColor: "oklch(0.575 0.098 175)",
									textColor: "text-teal-700",
									bg: "bg-teal-500/10",
									border: "border-teal-400/30",
								},
								{
									label: "Pendientes",
									value: funnelProduccion.pendientes,
									pct:
										funnelProduccion.total > 0
											? (funnelProduccion.pendientes / funnelProduccion.total) * 100
											: 0,
									barColor: "oklch(0.70 0.11 80)",
									textColor: "text-amber-700",
									bg: "bg-amber-400/10",
									border: "border-amber-400/30",
								},
								{
									label: "Canceladas",
									value: funnelProduccion.canceladas,
									pct:
										funnelProduccion.total > 0
											? (funnelProduccion.canceladas / funnelProduccion.total) * 100
											: 0,
									barColor: "oklch(0.62 0.12 25)",
									textColor: "text-red-700",
									bg: "bg-red-500/8",
									border: "border-red-400/25",
								},
								{
									label: "Tasa aprobación",
									value: null,
									pct: funnelProduccion.tasa_aprobacion,
									barColor: "oklch(0.37 0.065 225)",
									textColor: "text-foreground",
									bg: "bg-muted/40",
									border: "border-border",
									isRate: true,
								},
							].map((stage, i) => (
								<div
									key={i}
									className={`flex-1 rounded-lg border ${stage.border} ${stage.bg} p-4 flex flex-col gap-1`}
								>
									<p className="text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight">
										{stage.label}
									</p>
									<p className={`text-3xl font-bold tabular-nums ${stage.textColor}`}>
										{"isRate" in stage && stage.isRate ? `${stage.pct.toFixed(0)}%` : stage.value}
									</p>
									<div className="mt-1.5">
										<div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
											<div
												className="h-full rounded-full"
												style={{
													width: `${Math.min(stage.pct, 100).toFixed(0)}%`,
													backgroundColor: stage.barColor,
												}}
											/>
										</div>
										{"isRate" in stage && stage.isRate ? (
											<p className="text-xs text-muted-foreground mt-1">de pólizas decididas</p>
										) : (
											<p className="text-xs text-muted-foreground mt-1">
												{stage.pct.toFixed(0)}% del total
											</p>
										)}
									</div>
								</div>
							))}
						</div>
						{funnelProduccion.pendientes > 0 && (
							<p className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
								{funnelProduccion.pendientes}{" "}
								{funnelProduccion.pendientes === 1 ? "póliza espera" : "pólizas esperan"} validación
								gerencial.
							</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* 6 — Top Responsables + Top Directores de Cartera */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Top Responsables</CardTitle>
						<CardDescription className="text-xs">{periodoLabel}</CardDescription>
					</CardHeader>
					<CardContent>
						{topResponsables.length === 0 ? (
							<p className="text-center text-muted-foreground py-12 text-sm">Sin datos</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-xs">Responsable</TableHead>
										<TableHead className="text-right text-xs">Prima Total</TableHead>
										<TableHead className="text-right text-xs">Pólizas</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{topResponsables.map((r, i) => (
										<TableRow key={i}>
											<TableCell className="font-medium text-sm">{r.responsable}</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{formatCurrency(r.prima_total)}
											</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{r.cantidad_polizas}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				<Card className="shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base font-medium">Directores de Cartera</CardTitle>
						<CardDescription className="text-xs">{periodoLabel}</CardDescription>
					</CardHeader>
					<CardContent>
						{topDirectoresCartera.length === 0 ? (
							<p className="text-center text-muted-foreground py-12 text-sm">Sin datos</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-xs">Director</TableHead>
										<TableHead className="text-right text-xs">Pólizas</TableHead>
										<TableHead className="text-right text-xs">Prima Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{topDirectoresCartera.map((d, i) => (
										<TableRow key={i}>
											<TableCell className="font-medium text-sm">{d.nombre}</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{d.cantidad_polizas}
											</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{formatCurrency(d.prima_total)}
											</TableCell>
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
