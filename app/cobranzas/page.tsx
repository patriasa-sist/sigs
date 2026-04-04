import { Suspense } from "react";
import { requirePermission } from "@/utils/auth/helpers";
import Dashboard from "@/components/cobranzas/Dashboard";
import { obtenerPolizasConPendientes } from "./actions";

export const metadata = {
	title: "Cobranzas — Gestión de Pagos",
	description: "Módulo de cobranzas para gestionar pagos de pólizas activas",
};

function CobranzasSkeleton() {
	return (
		<div className="space-y-6">
			{/* KPI cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="border border-border rounded-lg p-4 space-y-3">
						<div className="h-3 w-24 bg-muted rounded animate-pulse" />
						<div className="h-7 w-32 bg-muted rounded animate-pulse" />
						<div className="h-3 w-16 bg-muted rounded animate-pulse" />
					</div>
				))}
			</div>
			{/* Table */}
			<div className="border border-border rounded-lg overflow-hidden">
				<div className="border-b border-border px-4 py-3 flex gap-3">
					<div className="h-8 w-56 bg-muted rounded animate-pulse" />
					<div className="h-8 w-32 bg-muted rounded animate-pulse" />
					<div className="h-8 w-32 bg-muted rounded animate-pulse ml-auto" />
				</div>
				<table className="w-full">
					<thead>
						<tr className="border-b border-border">
							{["Póliza / Cliente", "Compañía", "Cuotas pendientes", "Monto pendiente", "Próximo venc.", ""].map((h) => (
								<th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{Array.from({ length: 8 }).map((_, i) => (
							<tr key={i}>
								{[160, 100, 80, 88, 80, 32].map((w, j) => (
									<td key={j} className="px-4 py-3">
										<div className="h-4 bg-muted rounded animate-pulse" style={{ width: w }} />
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

async function CobranzasData() {
	const result = await obtenerPolizasConPendientes();

	if (result.success && result.data) {
		return <Dashboard polizasIniciales={result.data.polizas} statsIniciales={result.data.stats} />;
	}

	return (
		<div className="border border-destructive/30 rounded-md p-4 text-destructive bg-destructive/5">
			<p className="font-medium text-sm">Error al cargar datos de cobranzas</p>
			<p className="text-xs text-muted-foreground mt-1">{result.error}</p>
		</div>
	);
}

export default async function CobranzasPage() {
	await requirePermission("cobranzas.ver");

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-foreground">Cobranzas</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Gestión de pagos y cuotas de pólizas activas
				</p>
			</div>
			<Suspense fallback={<CobranzasSkeleton />}>
				<CobranzasData />
			</Suspense>
		</div>
	);
}
