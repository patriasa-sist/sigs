"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, Percent } from "lucide-react";
import { exportarComisionesDirector } from "@/app/gerencia/reportes/actions";
import * as ExcelJS from "exceljs";
import type { FilterData } from "@/types/reporte";

function getDefaultDateRange() {
	const now = new Date();
	const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return {
		desde: firstDay.toISOString().split("T")[0],
		hasta: lastDay.toISOString().split("T")[0],
	};
}

interface ExportarComisionesDirectorProps extends FilterData {
	directores: { id: string; nombre: string; apellidos: string | null }[];
}

export default function ExportarComisionesDirector({
	regionales,
	companias,
	equipos,
	directores,
}: ExportarComisionesDirectorProps) {
	const defaults = getDefaultDateRange();

	const [fechaDesde, setFechaDesde] = useState<string>(defaults.desde);
	const [fechaHasta, setFechaHasta] = useState<string>(defaults.hasta);
	const [directorId, setDirectorId] = useState<string>("");
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
			const result = await exportarComisionesDirector({
				fecha_desde: fechaDesde,
				fecha_hasta: fechaHasta,
				director_id: directorId || undefined,
				regional_id: regionalId || undefined,
				compania_id: companiaId || undefined,
				equipo_id: equipoId || undefined,
			});

			if (!result.success) {
				setError(result.error);
				return;
			}

			const { data: rows, meta } = result.data;

			if (rows.length === 0) {
				setError("No se encontraron cuotas pagadas para el período y filtros seleccionados");
				return;
			}

			// Construir lista de filtros aplicados
			const filtrosAplicados: string[] = [];
			const director = directores.find((d) => d.id === directorId);
			if (director) filtrosAplicados.push(`Director: ${director.nombre}${director.apellidos ? ` ${director.apellidos}` : ""}`);
			const regionalNombre = regionales.find((r) => r.id === regionalId)?.nombre;
			if (regionalNombre) filtrosAplicados.push(`Regional: ${regionalNombre}`);
			const companiaNombre = companias.find((c) => c.id === companiaId)?.nombre;
			if (companiaNombre) filtrosAplicados.push(`Compañía: ${companiaNombre}`);
			const equipoNombre = equipos.find((e) => e.id === equipoId)?.nombre;
			if (equipoNombre) filtrosAplicados.push(`Equipo: ${equipoNombre}`);

			// Generar Excel
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Comisiones Directores");

			// ---- Encabezado con detalles de exportación ----
			const metaHeaderStyle: Partial<ExcelJS.Style> = {
				font: { bold: true, size: 11 },
				alignment: { vertical: "middle" },
			};
			const metaValueStyle: Partial<ExcelJS.Style> = {
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
				["Rango de fechas:", `${fechaDesdeFormatted} - ${fechaHastaFormatted}`],
				["Cantidad de cuotas:", rows.length.toString()],
				["Filtros aplicados:", filtrosAplicados.length > 0 ? filtrosAplicados.join(", ") : "Ninguno"],
			];

			for (const [label, value] of metaRows) {
				const metaRow = worksheet.addRow([label, value]);
				metaRow.getCell(1).style = metaHeaderStyle;
				metaRow.getCell(2).style = metaValueStyle;
			}

			// Fila vacía separadora
			worksheet.addRow([]);

			// ---- Definir columnas de datos (fila 7 será el header) ----
			const DATA_HEADER_ROW = 7;
			const columns = [
				{ header: "Director de Cartera", key: "director_cartera", width: 28 },
				{ header: "N° Póliza", key: "numero_poliza", width: 15 },
				{ header: "Cliente", key: "cliente", width: 30 },
				{ header: "CI/NIT", key: "ci_nit", width: 15 },
				{ header: "Compañía", key: "compania", width: 25 },
				{ header: "Ramo", key: "ramo", width: 20 },
				{ header: "Regional", key: "regional", width: 15 },
				{ header: "Responsable", key: "responsable", width: 25 },
				{ header: "N° Cuota", key: "numero_cuota", width: 10 },
				{ header: "Monto Cuota PT", key: "monto_cuota_pt", width: 16 },
				{ header: "Monto Cuota PN", key: "monto_cuota_pn", width: 16 },
				{ header: "Monto Cuota Comisión", key: "monto_cuota_comision", width: 20 },
				{ header: "% Com. Director", key: "porcentaje_comision_director", width: 15 },
				{ header: "Monto Com. Director", key: "monto_comision_director", width: 18 },
				{ header: "Moneda", key: "moneda", width: 10 },
				{ header: "Fecha Pago", key: "fecha_pago", width: 14 },
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
				fgColor: { argb: "FF2D6A4F" },
			};
			dataHeaderRow.alignment = { vertical: "middle", horizontal: "center" };
			dataHeaderRow.height = 20;

			// Track current director for alternating row color
			let lastDirector = "";
			let rowColorToggle = false;

			// Green columns
			const greenColumns = ["monto_cuota_pn", "monto_cuota_comision", "monto_comision_director"];
			// Yellow column (director commission %)
			const yellowColumns = ["porcentaje_comision_director"];

			rows.forEach((row) => {
				if (row.director_cartera !== lastDirector) {
					lastDirector = row.director_cartera;
					rowColorToggle = !rowColorToggle;
				}

				const excelRow = worksheet.addRow([
					row.director_cartera,
					row.numero_poliza,
					row.cliente,
					row.ci_nit,
					row.compania,
					row.ramo,
					row.regional,
					row.responsable,
					row.numero_cuota,
					row.monto_cuota_pt,
					row.monto_cuota_pn ?? "",
					row.monto_cuota_comision ?? "",
					row.porcentaje_comision_director != null ? `${row.porcentaje_comision_director}%` : "",
					row.monto_comision_director ?? "",
					row.moneda,
					row.fecha_pago ? new Date(row.fecha_pago).toLocaleDateString("es-BO") : "",
				]);

				// Alternate row background per director
				const baseFg = rowColorToggle ? "FFF0F7EE" : "FFFFFFFF";
				excelRow.eachCell((cell, colNumber) => {
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: baseFg },
					};
					const colKey = columns[colNumber - 1]?.key;
					if (colKey && greenColumns.includes(colKey)) {
						cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
					}
					if (colKey && yellowColumns.includes(colKey)) {
						cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
					}
				});
			});

			// Bordes en filas de datos
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

			// Numeric formats
			const numericCols = ["monto_cuota_pt", "monto_cuota_pn", "monto_cuota_comision", "monto_comision_director"];
			numericCols.forEach((key) => {
				const colIdx = columns.findIndex((c) => c.key === key) + 1;
				if (colIdx > 0) {
					for (let r = DATA_HEADER_ROW + 1; r <= worksheet.rowCount; r++) {
						worksheet.getRow(r).getCell(colIdx).numFmt = "#,##0.00";
					}
				}
			});

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `comisiones_directores_${fechaDesde}_${fechaHasta}.xlsx`;
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
					<div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10">
						<Percent className="h-4 w-4 text-emerald-600" />
					</div>
					<div>
						<CardTitle className="text-lg">Reporte de Comisiones por Director</CardTitle>
						<CardDescription>
							Exporta las cuotas pagadas en el período seleccionado con la comisión de cada director de cartera
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-5">
				<div>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
						Filtros
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
						<div className="space-y-1.5">
							<Label className="text-sm">Fecha Desde</Label>
							<Input
								type="date"
								value={fechaDesde}
								onChange={(e) => setFechaDesde(e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Fecha Hasta</Label>
							<Input
								type="date"
								value={fechaHasta}
								onChange={(e) => setFechaHasta(e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Director</Label>
							<Select
								value={directorId || "all"}
								onValueChange={(v) => setDirectorId(v === "all" ? "" : v)}
							>
								<SelectTrigger className="w-full truncate">
									<SelectValue placeholder="Todos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos</SelectItem>
									{directores.map((d) => (
										<SelectItem key={d.id} value={d.id}>
											{`${d.nombre}${d.apellidos ? ` ${d.apellidos}` : ""}`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-sm">Regional</Label>
							<Select
								value={regionalId || "all"}
								onValueChange={(v) => setRegionalId(v === "all" ? "" : v)}
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
								onValueChange={(v) => setCompaniaId(v === "all" ? "" : v)}
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
								onValueChange={(v) => setEquipoId(v === "all" ? "" : v)}
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
