"use client";

import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
	PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import KPICard from "@/components/gerencia/KPICard";
import { AlertCircle, CheckCircle, DollarSign, Clock } from "lucide-react";
import type { EstadisticasSiniestros } from "@/types/gerencia";

const COLORS = [
	"#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626",
	"#0891b2", "#ca8a04", "#4f46e5",
];

function formatCurrency(value: number): string {
	return value.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SiniestrosCharts({ data, periodoLabel }: { data: EstadisticasSiniestros; periodoLabel: string }) {
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
					title={`Promedio Días Resolución — ${periodoLabel}`}
					value={kpis.promedio_dias_resolucion !== null ? `${kpis.promedio_dias_resolucion} días` : "—"}
					icon={Clock}
				/>
			</div>

			{isEmpty ? (
				<Card>
					<CardContent className="py-16">
						<div className="text-center text-muted-foreground">
							<AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
							<p className="text-lg font-medium">No hay datos de siniestros</p>
							<p className="text-sm mt-1">
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
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Siniestros por Mes</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<BarChart data={siniestrosPorMes}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="label" fontSize={12} />
										<YAxis fontSize={12} />
										<Tooltip />
										<Legend />
										<Bar dataKey="abiertos" name="Abiertos" fill="#dc2626" radius={[4, 4, 0, 0]} />
										<Bar dataKey="cerrados" name="Cerrados" fill="#16a34a" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						{/* Por Ramo */}
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Distribución por Ramo — {periodoLabel}</CardTitle>
							</CardHeader>
							<CardContent>
								{siniestrosPorRamo.length === 0 ? (
									<p className="text-center text-muted-foreground py-12">Sin datos</p>
								) : (
									<ResponsiveContainer width="100%" height={300}>
										<PieChart>
											<Pie
												data={siniestrosPorRamo}
												cx="50%"
												cy="50%"
												outerRadius={100}
												dataKey="cantidad"
												nameKey="ramo"
												label={({ name, value }) => `${name}: ${value}`}
											>
												{siniestrosPorRamo.map((_, index) => (
													<Cell key={index} fill={COLORS[index % COLORS.length]} />
												))}
											</Pie>
											<Tooltip />
											<Legend />
										</PieChart>
									</ResponsiveContainer>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Siniestros Abiertos */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Siniestros Abiertos Más Antiguos</CardTitle>
						</CardHeader>
						<CardContent>
							{siniestrosAbiertos.length === 0 ? (
								<p className="text-center text-muted-foreground py-8">No hay siniestros abiertos</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Código</TableHead>
											<TableHead>Cliente</TableHead>
											<TableHead>Ramo</TableHead>
											<TableHead>Fecha Siniestro</TableHead>
											<TableHead className="text-right">Días Abierto</TableHead>
											<TableHead className="text-right">Reserva</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{siniestrosAbiertos.map((s, i) => (
											<TableRow key={i}>
												<TableCell className="font-medium">{s.codigo_siniestro}</TableCell>
												<TableCell>{s.cliente}</TableCell>
												<TableCell>{s.ramo}</TableCell>
												<TableCell>{new Date(s.fecha_siniestro).toLocaleDateString("es-BO")}</TableCell>
												<TableCell className="text-right">{s.dias_abierto}</TableCell>
												<TableCell className="text-right">
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
