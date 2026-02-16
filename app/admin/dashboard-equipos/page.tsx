import { requirePermission } from "@/utils/auth/helpers";
import { obtenerMetricasPorEquipo } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import DashboardEquipos from "@/components/admin/DashboardEquipos";

export const metadata = {
	title: "Dashboard por Equipo - Administración",
	description: "Métricas agrupadas por equipo de trabajo",
};

export default async function DashboardEquiposPage() {
	await requirePermission("admin.equipos");

	const metricasResult = await obtenerMetricasPorEquipo();

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<BarChart3 className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard por Equipo</h1>
					<p className="text-gray-500">
						Métricas de producción agrupadas por equipo de trabajo
					</p>
				</div>
			</div>

			{metricasResult.success ? (
				<DashboardEquipos metricas={metricasResult.data} />
			) : (
				<Card>
					<CardContent className="pt-6">
						<p className="text-red-600">{metricasResult.error}</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
