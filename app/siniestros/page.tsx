import { requirePermission } from "@/utils/auth/helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Dashboard from "@/components/siniestros/Dashboard";
import { obtenerSiniestrosConAtencion } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const metadata = {
	title: "Siniestros - Gestión de Reportes",
	description: "Módulo de siniestros para gestionar reportes de pólizas activas",
};

export default async function SiniestrosPage() {
	await requirePermission("siniestros.ver");

	const result = await obtenerSiniestrosConAtencion();

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Siniestros</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Registro y seguimiento de siniestros reportados en pólizas activas
					</p>
				</div>
				<Button asChild>
					<Link href="/siniestros/nuevo">
						<Plus className="mr-2 h-4 w-4" />
						Registrar Siniestro
					</Link>
				</Button>
			</div>

			{result.success ? (
				<Dashboard
					siniestrosIniciales={result.data.siniestros}
					statsIniciales={result.data.stats}
				/>
			) : (
				<Card>
					<CardContent className="flex items-start gap-3 p-5">
						<AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-sm font-medium text-foreground">Error al cargar datos</p>
							<p className="text-sm text-muted-foreground mt-1">{result.error}</p>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
