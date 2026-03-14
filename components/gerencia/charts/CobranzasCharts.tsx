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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import KPICard from "@/components/gerencia/KPICard";
import { Clock, AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import type { EstadisticasCobranzas } from "@/types/gerencia";

const COLORS = ["#dc2626", "#f59e0b", "#16a34a", "#6366f1"];

const ESTADO_LABELS: Record<string, string> = {
	pendiente: "Pendiente",
	pagado: "Pagado",
	vencido: "Vencido",
	parcial: "Parcial",
};

function formatCurrency(value: number): string {
	return value.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CobranzasCharts({ data, periodoLabel }: { data: EstadisticasCobranzas; periodoLabel: string }) {
	const { kpis, cobradoVsPendiente, distribucionEstados, proximasCuotas } = data;

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
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Cobrado vs Pendiente por Mes</CardTitle>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={cobradoVsPendiente}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="label" fontSize={12} />
								<YAxis fontSize={12} tickFormatter={formatCurrency} />
								<Tooltip formatter={(value) => formatCurrency(Number(value))} />
								<Legend />
								<Bar dataKey="cobrado" name="Cobrado" fill="#16a34a" radius={[4, 4, 0, 0]} />
								<Bar dataKey="pendiente" name="Pendiente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				{/* Distribución Estados */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Distribución de Estados — {periodoLabel}</CardTitle>
					</CardHeader>
					<CardContent>
						{distribucionEstados.length === 0 ? (
							<p className="text-center text-muted-foreground py-12">Sin datos para el período</p>
						) : (
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={distribucionEstados}
										cx="50%"
										cy="50%"
										outerRadius={100}
										dataKey="cantidad"
										nameKey="estado"
										label={({ name, value }) =>
											`${ESTADO_LABELS[name as string] || name}: ${value}`
										}
									>
										{distribucionEstados.map((_, index) => (
											<Cell key={index} fill={COLORS[index % COLORS.length]} />
										))}
									</Pie>
									<Tooltip
										formatter={(value, name) => [value, ESTADO_LABELS[name as string] || name]}
									/>
									<Legend formatter={(value: string) => ESTADO_LABELS[value] || value} />
								</PieChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Próximas Cuotas */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Próximas Cuotas por Vencer (30 días)</CardTitle>
				</CardHeader>
				<CardContent>
					{proximasCuotas.length === 0 ? (
						<p className="text-center text-muted-foreground py-8">No hay cuotas próximas a vencer</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Póliza</TableHead>
									<TableHead>Cliente</TableHead>
									<TableHead className="text-right">Monto</TableHead>
									<TableHead>Moneda</TableHead>
									<TableHead>Vencimiento</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{proximasCuotas.map((c, i) => (
									<TableRow key={i}>
										<TableCell className="font-medium">{c.numero_poliza}</TableCell>
										<TableCell>{c.cliente}</TableCell>
										<TableCell className="text-right">{formatCurrency(c.monto)}</TableCell>
										<TableCell>{c.moneda}</TableCell>
										<TableCell>
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
