"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, FileBarChart } from "lucide-react";
import { obtenerDatosAPS } from "@/app/reportes/actions-aps";
import { captureError } from "@/utils/sentry";

function toISODate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Rango por defecto: el mes calendario anterior */
function rangoMesAnterior(): { desde: string; hasta: string } {
	const hoy = new Date();
	const primeroMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
	const finMesAnterior = new Date(primeroMesActual.getTime() - 24 * 60 * 60 * 1000);
	const inicioMesAnterior = new Date(finMesAnterior.getFullYear(), finMesAnterior.getMonth(), 1);
	return { desde: toISODate(inicioMesAnterior), hasta: toISODate(finMesAnterior) };
}

const ARCHIVOS_GENERADOS = [
	"📄 Produccion_Ingreso.pdf",
	"📄 Produccion_Egreso.pdf",
	"📄 Produccion_General.pdf",
	"📊 Comision_Ingreso.xlsx",
	"📊 Comision_Egreso.xlsx",
	"📊 Comision_General.xlsx",
	"📊 PrimaNeta_Ingreso.xlsx",
	"📊 PrimaNeta_Egreso.xlsx",
	"📊 PrimaNeta_General.xlsx",
];

export default function ExportarAPS() {
	const rangoInicial = rangoMesAnterior();
	const [fechaDesde, setFechaDesde] = useState<string>(rangoInicial.desde);
	const [fechaHasta, setFechaHasta] = useState<string>(rangoInicial.hasta);
	const [tipoCambio, setTipoCambio] = useState<string>("6.96");
	const [excluirRetroactivas, setExcluirRetroactivas] = useState<boolean>(true);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastMeta, setLastMeta] = useState<{ polizas_ingreso: number; polizas_egreso: number } | null>(null);

	const handleExport = async () => {
		setError(null);
		setLastMeta(null);

		const tc = Number(tipoCambio);
		if (!Number.isFinite(tc) || tc <= 0) {
			setError("El tipo de cambio debe ser un número mayor a 0");
			return;
		}
		if (!fechaDesde || !fechaHasta || fechaDesde > fechaHasta) {
			setError("El rango de fechas es inválido");
			return;
		}

		setLoading(true);
		try {
			const result = await obtenerDatosAPS({
				fecha_desde: fechaDesde,
				fecha_hasta: fechaHasta,
				tipo_cambio: tc,
				excluir_retroactivas: excluirRetroactivas,
			});
			if (!result.success) {
				setError(result.error);
				return;
			}

			// Import dinámico: react-pdf + exceljs + jszip solo se cargan al generar
			const { generarArchivosAPS } = await import("./aps/generarArchivosAPS");
			const blob = await generarArchivosAPS({ datos: result.data, fechaDesde, fechaHasta });

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `Reportes_APS_${fechaDesde}_${fechaHasta}.zip`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			setLastMeta(result.data.meta);
		} catch (err) {
			captureError(err, "exportarAPS", { fechaDesde, fechaHasta }, { feature: "reportes-aps" });
			setError(err instanceof Error ? err.message : "Error al generar los reportes APS");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
						<FileBarChart className="h-4 w-4 text-primary" />
					</div>
					<div>
						<CardTitle className="text-lg">Reportes APS</CardTitle>
						<CardDescription>
							Genera los 9 reportes APS: Producción (PDF), Comisión y Prima Neta (Excel), cada uno en
							variantes Ingreso (pólizas validadas), Egreso (anulaciones) y General (diferencia)
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-5">
				<div>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
						Parámetros
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-1.5">
							<Label className="text-sm">Desde</Label>
							<Input
								type="date"
								value={fechaDesde}
								onChange={(e) => setFechaDesde(e.target.value)}
								className="w-full"
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Hasta</Label>
							<Input
								type="date"
								value={fechaHasta}
								onChange={(e) => setFechaHasta(e.target.value)}
								className="w-full"
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Tipo de cambio (Bs por USD)</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={tipoCambio}
								onChange={(e) => setTipoCambio(e.target.value)}
								className="w-full"
							/>
						</div>
					</div>

					<label className="mt-4 flex items-center gap-2 text-sm cursor-pointer w-fit">
						<input
							type="checkbox"
							className="h-4 w-4"
							checked={excluirRetroactivas}
							onChange={(e) => setExcluirRetroactivas(e.target.checked)}
						/>
						<span className="text-muted-foreground">
							Excluir pólizas cargadas retroactivamente (históricas)
						</span>
					</label>
				</div>

				<div className="rounded-md border bg-muted/30 px-4 py-3">
					<p className="text-xs font-medium text-muted-foreground mb-2">Archivos generados (ZIP)</p>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground">
						{ARCHIVOS_GENERADOS.map((archivo) => (
							<span key={archivo}>{archivo}</span>
						))}
					</div>
					<p className="text-xs text-muted-foreground mt-2">
						No incluye pólizas pendientes de validación. Montos en Bs (USD convertido al tipo de cambio
						indicado).
					</p>
				</div>

				{lastMeta && (
					<Alert>
						<FileBarChart className="h-4 w-4" />
						<AlertDescription>
							Último reporte: <strong>{lastMeta.polizas_ingreso}</strong> pólizas en Ingreso,{" "}
							<strong>{lastMeta.polizas_egreso}</strong> anulaciones en Egreso
						</AlertDescription>
					</Alert>
				)}

				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
			</CardContent>

			<CardFooter className="justify-end border-t pt-4">
				<Button onClick={handleExport} disabled={loading}>
					<Download className="h-4 w-4 mr-2" />
					{loading ? "Generando..." : "Generar ZIP"}
				</Button>
			</CardFooter>
		</Card>
	);
}
