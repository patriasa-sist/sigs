"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle } from "lucide-react";
import { exportarReporte } from "@/app/cobranzas/actions";
import * as ExcelJS from "exceljs";
import type { ExportPeriod, EstadoPago } from "@/types/cobranza";

export default function ExportarReporte() {
	const [periodo, setPeriodo] = useState<ExportPeriod>("month");
	const [fechaDesde, setFechaDesde] = useState("");
	const [fechaHasta, setFechaHasta] = useState("");
	const [estadoCuota, setEstadoCuota] = useState<EstadoPago | "all">("all");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleExport = async () => {
		setLoading(true);
		setError(null);

		try {
			const result = await exportarReporte({
				periodo,
				fecha_desde: periodo === "custom" ? fechaDesde : undefined,
				fecha_hasta: periodo === "custom" ? fechaHasta : undefined,
				estado_cuota: estadoCuota,
			});

			if (!result.success || !result.data) {
				setError(result.error || "Error al obtener datos para exportar");
				return;
			}

			// Generate Excel file with ExcelJS
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Reporte de Cobranzas");

			// Define columns
			worksheet.columns = [
				{ header: "N° Póliza", key: "numero_poliza", width: 15 },
				{ header: "Cliente", key: "cliente", width: 30 },
				{ header: "CI/NIT", key: "ci_nit", width: 15 },
				{ header: "Compañía", key: "compania", width: 25 },
				{ header: "Ramo", key: "ramo", width: 20 },
				{ header: "N° Cuota", key: "numero_cuota", width: 10 },
				{ header: "Monto Cuota", key: "monto_cuota", width: 12 },
				{ header: "Moneda", key: "moneda", width: 8 },
				{ header: "F. Vencimiento", key: "fecha_vencimiento", width: 15 },
				{ header: "F. Pago", key: "fecha_pago", width: 15 },
				{ header: "Estado", key: "estado", width: 12 },
				{ header: "Días Vencido", key: "dias_vencido", width: 12 },
				{ header: "Monto Pagado", key: "monto_pagado", width: 12 },
				{ header: "Observaciones", key: "observaciones", width: 40 },
			];

			// Style header row
			const headerRow = worksheet.getRow(1);
			headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
			headerRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF4472C4" },
			};
			headerRow.alignment = { vertical: "middle", horizontal: "center" };
			headerRow.height = 20;

			// Add data rows
			result.data.forEach((row) => {
				const excelRow = worksheet.addRow({
					numero_poliza: row.numero_poliza,
					cliente: row.cliente,
					ci_nit: row.ci_nit,
					compania: row.compania,
					ramo: row.ramo,
					numero_cuota: row.numero_cuota,
					monto_cuota: row.monto_cuota,
					moneda: row.moneda,
					fecha_vencimiento: row.fecha_vencimiento
						? new Date(row.fecha_vencimiento).toLocaleDateString("es-BO")
						: "",
					fecha_pago: row.fecha_pago ? new Date(row.fecha_pago).toLocaleDateString("es-BO") : "-",
					estado: row.estado,
					dias_vencido: row.dias_vencido,
					monto_pagado: row.monto_pagado,
					observaciones: row.observaciones,
				});

				// Color code by status
				if (row.estado === "vencido") {
					excelRow.getCell("estado").fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFFFE0E0" },
					};
				} else if (row.estado === "pagado") {
					excelRow.getCell("estado").fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFE0FFE0" },
					};
				} else if (row.estado === "parcial") {
					excelRow.getCell("estado").fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFFFF0E0" },
					};
				}
			});

			// Auto-fit columns (basic implementation)
			worksheet.columns.forEach((column) => {
				if (column && column.width) {
					// Already set, keep it
				}
			});

			// Add borders to all cells
			worksheet.eachRow((row, rowNumber) => {
				row.eachCell((cell) => {
					cell.border = {
						top: { style: "thin" },
						left: { style: "thin" },
						bottom: { style: "thin" },
						right: { style: "thin" },
					};
				});
			});

			// Generate file
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			// Create download link
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;

			// Generate filename
			const fecha = new Date().toISOString().split("T")[0];
			const periodoNombre = periodo === "today" ? "hoy" : periodo === "week" ? "semana" : periodo === "month" ? "mes" : "personalizado";
			link.download = `cobranzas_${periodoNombre}_${fecha}.xlsx`;

			// Trigger download
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Error exporting:", err);
			setError(err instanceof Error ? err.message : "Error al generar el archivo Excel");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="rounded-lg border p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Exportar Reporte a Excel</h3>
				<Download className="h-5 w-5 text-muted-foreground" />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Período */}
				<div className="space-y-2">
					<Label>Período</Label>
					<Select value={periodo} onValueChange={(value) => setPeriodo(value as ExportPeriod)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="today">Hoy</SelectItem>
							<SelectItem value="week">Última Semana</SelectItem>
							<SelectItem value="month">Último Mes</SelectItem>
							<SelectItem value="custom">Personalizado</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Estado */}
				<div className="space-y-2">
					<Label>Estado</Label>
					<Select value={estadoCuota} onValueChange={(value) => setEstadoCuota(value as EstadoPago | "all")}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos</SelectItem>
							<SelectItem value="pendiente">Pendiente</SelectItem>
							<SelectItem value="vencido">Vencido</SelectItem>
							<SelectItem value="parcial">Parcial</SelectItem>
							<SelectItem value="pagado">Pagado</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Fecha Desde (solo si es personalizado) */}
				{periodo === "custom" && (
					<div className="space-y-2">
						<Label>Desde</Label>
						<Input
							type="date"
							value={fechaDesde}
							onChange={(e) => setFechaDesde(e.target.value)}
						/>
					</div>
				)}

				{/* Fecha Hasta (solo si es personalizado) */}
				{periodo === "custom" && (
					<div className="space-y-2">
						<Label>Hasta</Label>
						<Input
							type="date"
							value={fechaHasta}
							onChange={(e) => setFechaHasta(e.target.value)}
						/>
					</div>
				)}
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end">
				<Button onClick={handleExport} disabled={loading}>
					<Download className="h-4 w-4 mr-2" />
					{loading ? "Exportando..." : "Exportar a Excel"}
				</Button>
			</div>
		</div>
	);
}
