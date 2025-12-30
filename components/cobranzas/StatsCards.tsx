import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	FileText,
	AlertCircle,
	Clock,
	DollarSign,
	CheckCircle,
	Calendar,
	TrendingUp,
} from "lucide-react";
import type { CobranzaStats } from "@/types/cobranza";

interface StatsCardsProps {
	stats: CobranzaStats;
}

/**
 * Component to display collection statistics in card format
 * Shows 7 key metrics for the collections dashboard
 */
export default function StatsCards({ stats }: StatsCardsProps) {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{/* Total Pólizas */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Total Pólizas</CardTitle>
					<FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.total_polizas}</div>
					<p className="text-xs text-muted-foreground">Con cuotas pendientes</p>
				</CardContent>
			</Card>

			{/* Cuotas Pendientes */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Cuotas Pendientes</CardTitle>
					<Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.total_cuotas_pendientes}</div>
					<p className="text-xs text-muted-foreground">Total de cuotas por cobrar</p>
				</CardContent>
			</Card>

			{/* Cuotas Vencidas */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Cuotas Vencidas</CardTitle>
					<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-red-600 dark:text-red-400">
						{stats.total_cuotas_vencidas}
					</div>
					<p className="text-xs text-muted-foreground">Requieren atención urgente</p>
				</CardContent>
			</Card>

			{/* Por Vencer (7 días) */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Por Vencer (10 días)</CardTitle>
					<Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
						{stats.cuotas_por_vencer_7dias}
					</div>
					<p className="text-xs text-muted-foreground">Próximas a vencer</p>
				</CardContent>
			</Card>

			{/* Total Pendiente Bs */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
					<DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">Bs {formatCurrency(stats.monto_total_pendiente)}</div>
					<p className="text-xs text-muted-foreground">Monto por cobrar</p>
				</CardContent>
			</Card>

			{/* Cobrado Hoy */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Cobrado Hoy</CardTitle>
					<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-green-600 dark:text-green-400">
						Bs {formatCurrency(stats.monto_total_cobrado_hoy)}
					</div>
					<p className="text-xs text-muted-foreground">Recaudado el día de hoy</p>
				</CardContent>
			</Card>

			{/* Cobrado Mes */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Cobrado Este Mes</CardTitle>
					<TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-green-600 dark:text-green-400">
						Bs {formatCurrency(stats.monto_total_cobrado_mes)}
					</div>
					<p className="text-xs text-muted-foreground">Recaudado en el mes</p>
				</CardContent>
			</Card>
		</div>
	);
}
