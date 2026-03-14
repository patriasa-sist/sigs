import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
	title: string;
	value: number | string | null;
	icon: LucideIcon;
	format?: "currency" | "number" | "percent";
	moneda?: string;
}

function formatValue(
	value: number | string | null,
	format: "currency" | "number" | "percent" = "number",
	moneda = "Bs"
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

export default function KPICard({ title, value, icon: Icon, format = "number", moneda }: KPICardProps) {
	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">{title}</p>
						<p className="text-2xl font-bold">{formatValue(value, format, moneda)}</p>
					</div>
					<div className="p-3 bg-primary/10 rounded-full">
						<Icon className="h-5 w-5 text-primary" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
