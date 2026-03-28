import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	FileText,
	AlertCircle,
	Calendar,
	CircleDollarSign,
	CheckCircle2,
	TrendingUp,
} from "lucide-react";
import type { CobranzaStats, MontoPorMoneda } from "@/types/cobranza";

interface StatsCardsProps {
	stats: CobranzaStats;
}

/**
 * Cobranzas KPI strip.
 *
 * Row 1 — 4 action-oriented KPIs computed from already-loaded data (zero extra DB cost):
 *   Cuotas Vencidas | Por Vencer 10d | Pólizas con Pendientes | Monto Total Pendiente
 *
 * Row 2 — Financial summary (sourced from a secondary DB query run at page load):
 *   Cobrado Hoy | Cobrado Este Mes
 */
export default function StatsCards({ stats }: StatsCardsProps) {
	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);

	/** Multi-currency amounts stacked vertically — for primary cards */
	const renderMontos = (montos: MontoPorMoneda[]) => {
		if (montos.length === 0)
			return <span className="text-2xl font-semibold text-muted-foreground">—</span>;
		return (
			<div className="space-y-0.5">
				{montos.map((m) => (
					<div key={m.moneda} className="flex items-baseline gap-1.5">
						<span className="text-xs font-medium text-muted-foreground">{m.moneda}</span>
						<span className="text-xl font-semibold tabular-nums text-foreground">
							{formatCurrency(m.monto)}
						</span>
					</div>
				))}
			</div>
		);
	};

	/** Multi-currency amounts inline — for compact secondary cards */
	const renderMontosCompact = (montos: MontoPorMoneda[], valueClass: string) => {
		if (montos.length === 0)
			return (
				<span className="text-sm text-muted-foreground italic">Sin registros</span>
			);
		return (
			<div className="flex flex-wrap gap-x-4 gap-y-0.5">
				{montos.map((m) => (
					<div key={m.moneda} className="flex items-baseline gap-1">
						<span className="text-xs font-medium text-muted-foreground">{m.moneda}</span>
						<span className={`text-base font-semibold tabular-nums ${valueClass}`}>
							{formatCurrency(m.monto)}
						</span>
					</div>
				))}
			</div>
		);
	};

	return (
		<div className="space-y-3">
			{/* ── Row 1: Primary KPIs ─────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{/* Cuotas Vencidas — urgent */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Cuotas Vencidas
						</CardTitle>
						<AlertCircle
							className={`h-4 w-4 ${
								stats.total_cuotas_vencidas > 0 ? "text-destructive" : "text-muted-foreground"
							}`}
						/>
					</CardHeader>
					<CardContent>
						<div
							className={`text-3xl font-semibold ${
								stats.total_cuotas_vencidas > 0 ? "text-destructive" : "text-foreground"
							}`}
						>
							{stats.total_cuotas_vencidas}
						</div>
						<p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
					</CardContent>
				</Card>

				{/* Por Vencer en 10 días — warning */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Por Vencer
						</CardTitle>
						<Calendar
							className={`h-4 w-4 ${
								stats.cuotas_por_vencer_10dias > 0 ? "text-warning" : "text-muted-foreground"
							}`}
						/>
					</CardHeader>
					<CardContent>
						<div
							className={`text-3xl font-semibold ${
								stats.cuotas_por_vencer_10dias > 0 ? "text-warning" : "text-foreground"
							}`}
						>
							{stats.cuotas_por_vencer_10dias}
						</div>
						<p className="text-xs text-muted-foreground mt-1">En los próximos 10 días</p>
					</CardContent>
				</Card>

				{/* Pólizas con Pendientes — neutral */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Pólizas con Pendientes
						</CardTitle>
						<FileText className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold text-foreground">
							{stats.total_polizas}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{stats.total_cuotas_pendientes} cuotas por cobrar
						</p>
					</CardContent>
				</Card>

				{/* Monto Total Pendiente — neutral financial */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Monto Pendiente
						</CardTitle>
						<CircleDollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{renderMontos(stats.montos_pendientes)}
						<p className="text-xs text-muted-foreground mt-1">Total por cobrar</p>
					</CardContent>
				</Card>
			</div>

			{/* ── Row 2: Financial Summary ────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Cobrado Hoy
						</CardTitle>
						<CheckCircle2 className="h-4 w-4 text-success" />
					</CardHeader>
					<CardContent className="pb-4">
						{renderMontosCompact(stats.montos_cobrados_hoy, "text-success")}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Cobrado Este Mes
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-success" />
					</CardHeader>
					<CardContent className="pb-4">
						{renderMontosCompact(stats.montos_cobrados_mes, "text-success")}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
