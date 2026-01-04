"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, XCircle, Ban, CheckCircle, DollarSign, TrendingUp } from "lucide-react";
import type { SiniestrosStats } from "@/types/siniestro";

interface StatsCardsProps {
	stats: SiniestrosStats;
}

function StatsCards({ stats }: StatsCardsProps) {
	const cards = [
		{
			title: "Siniestros Abiertos",
			value: stats.total_abiertos,
			icon: AlertTriangle,
			color: "text-yellow-600 dark:text-yellow-400",
			bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
		},
		{
			title: "Cerrados este Mes",
			value: stats.total_cerrados_mes,
			icon: TrendingUp,
			color: "text-blue-600 dark:text-blue-400",
			bgColor: "bg-blue-50 dark:bg-blue-900/20",
		},
		{
			title: "Rechazados",
			value: stats.siniestros_por_estado.rechazado,
			icon: XCircle,
			color: "text-red-600 dark:text-red-400",
			bgColor: "bg-red-50 dark:bg-red-900/20",
		},
		{
			title: "Declinados",
			value: stats.siniestros_por_estado.declinado,
			icon: Ban,
			color: "text-gray-600 dark:text-gray-400",
			bgColor: "bg-gray-50 dark:bg-gray-900/20",
		},
		{
			title: "Concluidos",
			value: stats.siniestros_por_estado.concluido,
			icon: CheckCircle,
			color: "text-green-600 dark:text-green-400",
			bgColor: "bg-green-50 dark:bg-green-900/20",
		},
		{
			title: "Monto Total Reservado",
			value: `Bs ${stats.monto_total_reservado.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
			icon: DollarSign,
			color: "text-purple-600 dark:text-purple-400",
			bgColor: "bg-purple-50 dark:bg-purple-900/20",
			isAmount: true,
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{cards.map((card, index) => (
				<Card key={index} className={card.bgColor}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{card.title}</CardTitle>
						<card.icon className={`h-4 w-4 ${card.color}`} />
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold ${card.color}`}>
							{card.isAmount ? card.value : card.value.toLocaleString()}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export default memo(StatsCards);
