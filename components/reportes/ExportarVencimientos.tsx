"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, CalendarClock } from "lucide-react";
import { exportarVencimientos } from "@/app/reportes/actions";
import * as ExcelJS from "exceljs";
import type { ExportVencimientosFilters, FilterData } from "@/types/reporte";

function getDefaultDateRange() {
	const now = new Date();
	const desde = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const hasta = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
	return {
		desde: desde.toISOString().split("T")[0],
		hasta: hasta.toISOString().split("T")[0],
	};
}

export default function ExportarVencimientos({ regionales, companias, equipos }: FilterData) {
	const defaults = getDefaultDateRange();

	const [fechaDesde, setFechaDesde] = useState<string>(defaults.desde);
	const [fechaHasta, setFechaHasta] = useState<string>(defaults.hasta);
	const [estadoPoliza, setEstadoPoliza] = useState<"activa" | "all">("activa");
	const [regionalId, setRegionalId] = useState<string>("");
	const [companiaId, setCompaniaId] = useState<string>("");
	const [equipoId, setEquipoId] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleExport = async () => {
		if (!fechaDesde || !fechaHasta) {
			setError("Debe seleccionar ambas fechas del rango");
			return;
		}
		if (fechaDesde > fechaHasta) {
			setError("La fecha de inicio no puede ser posterior a la fecha fin");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const filtros: ExportVencimientosFilters = {
				fecha_desde: fechaDesde,
				fecha_hasta: fechaHasta,
				estado_poliza: estadoPoliza,
				regional_id: regionalId || undefined,
				compania_id: companiaId || undefined,
				equipo_id: equipoId || undefined,
			};

			const result = await exportarVencimientos(filtros);

			if (!result.success) {
				setError(result.error);
				return;
			}

			const { data: rows, meta } = result.data;

			if (rows.length === 0) {
				setError("No se encontraron pólizas por vencer para el período seleccionado");
				return;
			}

			// Construir lista de filtros aplicados
			const filtrosAplicados: string[] = [];
			filtrosAplicados.push(`Estado: ${estadoPoliza === "all" ? "Todas" : "Solo Activas"}`);
			const regionalNombre = regionales.find((r) => r.id === regionalId)?.nombre;
			if (regionalNombre) filtrosAplicados.push(`Regional: ${regionalNombre}`);
			const companiaNombre = companias.find((c) => c.id === companiaId)?.nombre;
			if (companiaNombre) filtrosAplicados.push(`Compañía: ${companiaNombre}`);
			const equipoNombre = equipos.find((e) => e.id === equipoId)?.nombre;
			if (equipoNombre) filtrosAplicados.push(`Equipo: ${equipoNombre}`);

			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Vencimientos");

			// ---- Encabezado con detalles de exportación ----
			const headerStyle: Partial<ExcelJS.Style> = {
				font: { bold: true, size: 11 },
				alignment: { vertical: "middle" },
			};
			const valueStyle: Partial<ExcelJS.Style> = {
				alignment: { vertical: "middle" },
			};

			const fechaReporte = new Date().toLocaleDateString("es-BO", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
			const fechaDesdeFormatted = new Date(meta.fecha_desde + "T00:00:00").toLocaleDateString("es-BO");
			const fechaHastaFormatted = new Date(meta.fecha_hasta + "T00:00:00").toLocaleDateString("es-BO");

			const metaRows = [
				["Fecha de reporte:", fechaReporte],
				["Usuario:", meta.usuario_email],
				["Rango de vencimiento:", `${fechaDesdeFormatted} - ${fechaHastaFormatted}`],
				["Cantidad de pólizas:", rows.length.toString()],
				["Filtros aplicados:", filtrosAplicados.length > 0 ? filtrosAplicados.join(", ") : "Ninguno"],
			];

			for (const [label, value] of metaRows) {
				const row = worksheet.addRow([label, value]);
				row.getCell(1).style = headerStyle;
				row.getCell(2).style = valueStyle;
			}

			// Fila vacía separadora
			worksheet.addRow([]);

			// ---- Definir columnas de datos (fila 7 será el header) ----
			const DATA_HEADER_ROW = 7;
			const columns = [
				{ header: "N° Póliza", key: "numero_poliza", width: 15 },
				{ header: "Cliente", key: "cliente", width: 30 },
				{ header: "CI/NIT", key: "ci_nit", width: 15 },
				{ header: "Compañía", key: "compania", width: 25 },
				{ header: "Ramo", key: "ramo", width: 20 },
				{ header: "Producto", key: "producto", width: 25 },
				{ header: "Responsable", key: "responsable", width: 25 },
				{ header: "Regional", key: "regional", width: 15 },
				{ header: "Estado", key: "estado", width: 12 },
				{ header: "Moneda", key: "moneda", width: 10 },
				{ header: "Prima Total", key: "prima_total", width: 14 },
				{ header: "Inicio Vigencia", key: "inicio_vigencia", width: 15 },
				{ header: "Fin Vigencia", key: "fin_vigencia", width: 15 },
				{ header: "Días para Vencer", key: "dias_para_vencer", width: 16 },
			];

			// Aplicar anchos de columna
			columns.forEach((col, i) => {
				worksheet.getColumn(i + 1).width = col.width;
			});

			// Escribir fila de encabezado de datos
			const dataHeaderRow = worksheet.getRow(DATA_HEADER_ROW);
			columns.forEach((col, i) => {
				dataHeaderRow.getCell(i + 1).value = col.header;
			});
			dataHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
			dataHeaderRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF2E7D32" },
			};
			dataHeaderRow.alignment = { vertical: "middle", horizontal: "center" };
			dataHeaderRow.height = 20;

			// Escribir filas de datos
			rows.forEach((row) => {
				const values = columns.map((col) => {
					const val = row[col.key as keyof typeof row];
					// Formatear fechas
					if (["inicio_vigencia", "fin_vigencia"].includes(col.key)) {
						return val ? new Date((val as string) + "T00:00:00").toLocaleDateString("es-BO") : "";
					}
					return val ?? "";
				});

				worksheet.addRow(values);
			});

			// Bordes en filas de datos (desde header hasta última fila)
			for (let r = DATA_HEADER_ROW; r <= worksheet.rowCount; r++) {
				const row = worksheet.getRow(r);
				row.eachCell((cell) => {
					cell.border = {
						top: { style: "thin" },
						left: { style: "thin" },
						bottom: { style: "thin" },
						right: { style: "thin" },
					};
				});
			}

			// Formato numérico
			const primaColIdx = columns.findIndex((c) => c.key === "prima_total") + 1;
			if (primaColIdx > 0) {
				for (let r = DATA_HEADER_ROW + 1; r <= worksheet.rowCount; r++) {
					worksheet.getRow(r).getCell(primaColIdx).numFmt = "#,##0.00";
				}
			}

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `vencimientos_${fechaDesde}_${fechaHasta}.xlsx`;

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
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
						<CalendarClock className="h-4 w-4 text-primary" />
					</div>
					<div>
						<CardTitle className="text-lg">Reporte de Vencimientos</CardTitle>
						<CardDescription>
							Pólizas cuyo fin de vigencia cae dentro del rango de fechas seleccionado
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-5">
				<div>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Filtros</p>
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
						<div className="space-y-1.5">
							<Label className="text-sm">Fecha Desde</Label>
							<Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Fecha Hasta</Label>
							<Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Estado Póliza</Label>
							<Select
								value={estadoPoliza}
								onValueChange={(value) => setEstadoPoliza(value as "activa" | "all")}
							>
								<SelectTrigger className="w-full truncate">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="activa">Solo Activas</SelectItem>
									<SelectItem value="all">Todas</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Regional</Label>
							<Select
								value={regionalId || "all"}
								onValueChange={(value) => setRegionalId(value === "all" ? "" : value)}
							>
								<SelectTrigger className="w-full truncate">
									<SelectValue placeholder="Todas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todas</SelectItem>
									{regionales.map((r) => (
										<SelectItem key={r.id} value={r.id}>
											{r.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Compañía</Label>
							<Select
								value={companiaId || "all"}
								onValueChange={(value) => setCompaniaId(value === "all" ? "" : value)}
							>
								<SelectTrigger className="w-full truncate">
									<SelectValue placeholder="Todas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todas</SelectItem>
									{companias.map((c) => (
										<SelectItem key={c.id} value={c.id}>
											{c.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Equipo</Label>
							<Select
								value={equipoId || "all"}
								onValueChange={(value) => setEquipoId(value === "all" ? "" : value)}
							>
								<SelectTrigger className="w-full truncate">
									<SelectValue placeholder="Todos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos</SelectItem>
									{equipos.map((e) => (
										<SelectItem key={e.id} value={e.id}>
											{e.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

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
					{loading ? "Exportando..." : "Exportar a Excel"}
				</Button>
			</CardFooter>
		</Card>
	);
}
