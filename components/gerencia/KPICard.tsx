"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
	title: string;
	value: number | string | null;
	icon: LucideIcon;
	format?: "currency" | "number" | "percent";
	moneda?: string;
	/** Porcentaje de variación YoY. null = sin datos previos, no muestra badge. */
	trend?: number | null;
}

function formatValue(
	value: number | string | null,
	format: "currency" | "number" | "percent" = "number",
	moneda = "Bs",
): string {
	if (value === null || value === undefined) return "—";
	const num = typeof value === "string" ? parseFloat(value) : value;
	if (isNaN(num)) return String(value);

	if (format === "currency") {
		return `${num.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
	}
	if (format === "percent") {
		return `${num.toFixed(1)}%`;
	}
	return num.toLocaleString("es-BO");
}

function TrendBadge({ pct }: { pct: number }) {
	const abs = Math.abs(pct);
	const label = `${abs < 0.1 ? "0.0" : abs.toFixed(1)}%`;

	if (Math.abs(pct) < 0.1) {
		return (
			<span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
				<Minus className="h-3 w-3" />
				{label}
			</span>
		);
	}

	if (pct > 0) {
		return (
			<span className="inline-flex items-center gap-0.5 text-xs font-medium text-teal-700">
				<TrendingUp className="h-3 w-3" />+{label}
			</span>
		);
	}

	return (
		<span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600">
			<TrendingDown className="h-3 w-3" />
			{label}
		</span>
	);
}

export default function KPICard({ title, value, icon: Icon, format = "number", moneda, trend }: KPICardProps) {
	return (
		<Card className="shadow-sm">
			<CardContent className="p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1 min-w-0">
						<p className="text-sm text-muted-foreground leading-tight">{title}</p>
						<p className="text-2xl font-semibold text-foreground tracking-tight truncate">
							{formatValue(value, format, moneda)}
						</p>
						{trend !== undefined && trend !== null && (
							<div className="flex items-center gap-1">
								<TrendBadge pct={trend} />
								<span className="text-xs text-muted-foreground">vs año anterior</span>
							</div>
						)}
					</div>
					<div className="p-2 bg-primary/8 rounded-md shrink-0">
						<Icon className="h-4 w-4 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
