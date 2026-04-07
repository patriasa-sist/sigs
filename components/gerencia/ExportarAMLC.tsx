"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, ShieldCheck } from "lucide-react";
import { exportarAMLC } from "@/app/gerencia/reportes/actions-amlc";
import type { AMLCCliente, AMLCDetalle, AMLCCuenta } from "@/app/gerencia/reportes/actions-amlc";
import * as ExcelJS from "exceljs";
import JSZip from "jszip";

// Pipe-delimited text generator
function toPipeDelimited(data: Record<string, unknown>[], headers: string[]): string {
	const dataRows = data.map((row) =>
		headers.map((h) => {
			const v = row[h];
			if (v === null || v === undefined || v === "") return "";
			return String(v);
		}).join("|")
	);
	return [headers.join("|"), ...dataRows].join("\n");
}

const CLIENTES_HEADERS: (keyof AMLCCliente)[] = [
	"suc_codigo", "tcli_codigo", "tpep_codigo", "tlis_codigo",
	"aeco_codigo", "aeco_codigo2", "aeco_codigo3",
	"nac_codigo", "pres_codigo", "rtie_codigo", "ring_codigo",
	"reco_codigo", "ftra_codigo", "tdoc_codigo", "tgru_codigo", "est_codigo",
	"codigo_cliente", "nro_documento", "extension",
	"fecha_nacimiento", "edad", "monto_ingreso", "monto_ingreso2", "monto_ingreso3",
	"fecha_registro",
];

const DETALLES_HEADERS: (keyof AMLCDetalle)[] = [
	"codigo_cliente", "gen_codigo", "eciv_codigo", "nedu_codigo", "tviv_codigo",
	"nombre_razon", "apaterno", "amaterno", "direccion", "zona",
	"telefono", "celular", "fax", "email", "apcasado",
	"pais_residencia", "profesion", "lugar_trabajo", "cargo", "fecha_ingreso_trabajo",
	"nit", "registro_comercio", "año_ingreso_trabajo", "direccion_comercial",
	"lugar_nacimiento", "representante_nrodocumento", "representante_nombre_apellido",
	"dempresa_nrodocumento", "dempresa_nombre_apellido", "codigo_tsociedad",
];

const CUENTAS_HEADERS: (keyof AMLCCuenta)[] = [
	"codigo_cliente", "suc_codigo", "pro_codigo", "mon_codigo",
	"ofon_codigo", "pcue_codigo", "ring_codigo", "est_codigo",
	"nrocuenta", "fecha_apertura", "monto_prima",
	"monto_saldoprima", "fecha_saldoprima", "monto_asegurado",
	"nro_debito", "monto_valorcomercial", "nro_credito",
	"fecha_vencimiento", "can_codigo", "monto_asegurado_anterior",
	"tipo_certificiado_codigo",
];

async function buildExcelBuffer(
	data: Record<string, unknown>[],
	headers: string[],
	sheetName: string
): Promise<ArrayBuffer> {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet(sheetName);
	ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 2) }));

	// Header styling
	const headerRow = ws.getRow(1);
	headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
	headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004F69" } };
	headerRow.alignment = { vertical: "middle", horizontal: "center" };
	headerRow.height = 18;

	data.forEach((row) => ws.addRow(row));

	// Borders
	ws.eachRow((r) => {
		r.eachCell((c) => {
			c.border = {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			};
		});
	});

	return await wb.xlsx.writeBuffer();
}

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: 4 }, (_, i) => 2024 + i);

export default function ExportarAMLC() {
	const [anio, setAnio] = useState<number>(currentYear);
	const [fechaDesde, setFechaDesde] = useState<string>(`${currentYear}-01-01`);
	const [fechaHasta, setFechaHasta] = useState<string>(`${currentYear}-12-31`);
	const [estadoPoliza, setEstadoPoliza] = useState<"activa" | "all">("activa");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastMeta, setLastMeta] = useState<{ total_clientes: number; total_polizas: number } | null>(null);

	// When year changes, update date range
	const handleAnioChange = (value: string) => {
		const y = Number(value);
		setAnio(y);
		setFechaDesde(`${y}-01-01`);
		setFechaHasta(`${y}-12-31`);
	};

	const handleExport = async () => {
		setLoading(true);
		setError(null);
		setLastMeta(null);

		try {
			const result = await exportarAMLC({
				fecha_desde: fechaDesde,
				fecha_hasta: fechaHasta,
				estado_poliza: estadoPoliza,
			});

			if (!result.success) {
				setError(result.error);
				return;
			}

			const { clientes, clientes_detalles, cuentas, meta } = result.data;
			setLastMeta({ total_clientes: meta.total_clientes, total_polizas: meta.total_polizas });

			// Generate all 6 files in parallel
			const [clientesXlsx, detallesXlsx, cuentasXlsx] = await Promise.all([
				buildExcelBuffer(clientes as unknown as Record<string, unknown>[], CLIENTES_HEADERS as string[], "ConsolidadoClientes"),
				buildExcelBuffer(clientes_detalles as unknown as Record<string, unknown>[], DETALLES_HEADERS as string[], "DetallesCliente"),
				buildExcelBuffer(cuentas as unknown as Record<string, unknown>[], CUENTAS_HEADERS as string[], "Polizas"),
			]);

			const clientesTxt = toPipeDelimited(clientes as unknown as Record<string, unknown>[], CLIENTES_HEADERS as string[]);
			const detallesTxt = toPipeDelimited(clientes_detalles as unknown as Record<string, unknown>[], DETALLES_HEADERS as string[]);
			const cuentasTxt = toPipeDelimited(cuentas as unknown as Record<string, unknown>[], CUENTAS_HEADERS as string[]);

			// Bundle into ZIP
			const zip = new JSZip();
			zip.file("clientes.xlsx", clientesXlsx);
			zip.file("clientes_detalles.xlsx", detallesXlsx);
			zip.file("cuentas.xlsx", cuentasXlsx);
			zip.file("clientes.txt", clientesTxt);
			zip.file("clientes_detalles.txt", detallesTxt);
			zip.file("cuentas.txt", cuentasTxt);

			const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
			const blob = new Blob([zipBuffer], { type: "application/zip" });

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `AMLC_${fechaDesde}_${fechaHasta}.zip`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("AMLC export error:", err);
			setError(err instanceof Error ? err.message : "Error al generar el reporte AMLC");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
						<ShieldCheck className="h-4 w-4 text-primary" />
					</div>
					<div>
						<CardTitle className="text-lg">Reporte AMLC</CardTitle>
						<CardDescription>
							Genera los archivos de reporte AMLC: clientes, detalles de clientes y pólizas en formato
							pipe-delimitado (.txt) y Excel (.xlsx)
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-5">
				<div>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Filtros</p>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="space-y-1.5">
							<Label className="text-sm">Año</Label>
							<Select value={anio.toString()} onValueChange={handleAnioChange}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ANIOS.map((a) => (
										<SelectItem key={a} value={a.toString()}>
											{a}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

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
							<Label className="text-sm">Estado Póliza</Label>
							<Select
								value={estadoPoliza}
								onValueChange={(v) => setEstadoPoliza(v as "activa" | "all")}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="activa">Solo Activas</SelectItem>
									<SelectItem value="all">Todas</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<div className="rounded-md border bg-muted/30 px-4 py-3">
					<p className="text-xs font-medium text-muted-foreground mb-2">Archivos generados</p>
					<div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
						<span>📄 clientes.txt — ConsolidadoClientes (pipe)</span>
						<span>📊 clientes.xlsx — ConsolidadoClientes (Excel)</span>
						<span>📄 clientes_detalles.txt — DetallesCliente (pipe)</span>
						<span>📊 clientes_detalles.xlsx — DetallesCliente (Excel)</span>
						<span>📄 cuentas.txt — Pólizas/Cuentas (pipe)</span>
						<span>📊 cuentas.xlsx — Pólizas/Cuentas (Excel)</span>
					</div>
				</div>

				{lastMeta && (
					<Alert>
						<ShieldCheck className="h-4 w-4" />
						<AlertDescription>
							Último reporte: <strong>{lastMeta.total_clientes}</strong> clientes únicos,{" "}
							<strong>{lastMeta.total_polizas}</strong> pólizas
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
