"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, BarChart3 } from "lucide-react";
import { exportarProduccionNuevo } from "@/app/reportes/actions";
import * as ExcelJS from "exceljs";
import type { ExportProduccionFilters, FilterData } from "@/types/reporte";

function getDefaultDateRange() {
	const now = new Date();
	const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return {
		desde: firstDay.toISOString().split("T")[0],
		hasta: lastDay.toISOString().split("T")[0],
	};
}

export default function ExportarProduccion({ regionales, companias, equipos }: FilterData) {
	const defaults = getDefaultDateRange();

	const [fechaDesde, setFechaDesde] = useState<string>(defaults.desde);
	const [fechaHasta, setFechaHasta] = useState<string>(defaults.hasta);
	const [estadoPoliza, setEstadoPoliza] = useState<"activa" | "pendiente" | "rechazada" | "all">("all");
	const [regionalId, setRegionalId] = useState<string>("");
	const [companiaId, setCompaniaId] = useState<string>("");
	const [equipoId, setEquipoId] = useState<string>("");
	const [excluirRetroactivas, setExcluirRetroactivas] = useState<boolean>(false);
	const [tipoCambio, setTipoCambio] = useState<string>("6.96");
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
			const filtros: ExportProduccionFilters = {
				mes: 1,
				anio: new Date().getFullYear(),
				fecha_desde: fechaDesde,
				fecha_hasta: fechaHasta,
				estado_poliza: estadoPoliza,
				regional_id: regionalId || undefined,
				compania_id: companiaId || undefined,
				equipo_id: equipoId || undefined,
				excluir_retroactivas: excluirRetroactivas || undefined,
			};

			const result = await exportarProduccionNuevo(filtros);

			if (!result.success) {
				setError(result.error);
				return;
			}

			const { data: rows, meta } = result.data;

			if (rows.length === 0) {
				setError("No se encontraron datos para el período seleccionado");
				return;
			}

			// Construir lista de filtros aplicados
			const filtrosAplicados: string[] = [];
			if (estadoPoliza !== "all") filtrosAplicados.push(`Estado: ${estadoPoliza}`);
			const regionalNombre = regionales.find((r) => r.id === regionalId)?.nombre;
			if (regionalNombre) filtrosAplicados.push(`Regional: ${regionalNombre}`);
			const companiaNombre = companias.find((c) => c.id === companiaId)?.nombre;
			if (companiaNombre) filtrosAplicados.push(`Compañía: ${companiaNombre}`);
			const equipoNombre = equipos.find((e) => e.id === equipoId)?.nombre;
			if (equipoNombre) filtrosAplicados.push(`Equipo: ${equipoNombre}`);

			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Producción");

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
				["Rango de fechas:", `${fechaDesdeFormatted} - ${fechaHastaFormatted}`],
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

			// ---- Definir columnas de datos ----
			// Fila 7: banda de grupo (Bolivianos / Dólares). Fila 8: encabezados de columna.
			const GROUP_HEADER_ROW = 7;
			const DATA_HEADER_ROW = 8;
			const columns = [
				{ header: "N°", key: "__nro", width: 6 },
				{ header: "N° Póliza", key: "numero_poliza", width: 15 },
				{ header: "N° Anexo", key: "numero_anexo", width: 12 },
				{ header: "Tipo", key: "tipo_poliza", width: 14 },
				{ header: "Validación", key: "validacion", width: 13 },
				{ header: "Cliente", key: "cliente", width: 30 },
				{ header: "CI/NIT", key: "ci_nit", width: 15 },
				{ header: "Director de Cartera", key: "director_cartera", width: 22 },
				// Nombres agrupados, seguidos de sus códigos (entre Director de Cartera y Responsable)
				{ header: "Compañía", key: "compania", width: 25 },
				{ header: "Ramo", key: "ramo", width: 20 },
				{ header: "Producto", key: "producto", width: 25 },
				{ header: "Cod Cia APS", key: "cod_aps", width: 12 },
				{ header: "Cod Ramo APS", key: "cod_ramo_aps", width: 13 },
				{ header: "Cod Producto", key: "cod_producto", width: 13 },
				{ header: "Responsable", key: "responsable", width: 25 },
				{ header: "Regional", key: "regional", width: 15 },
				{ header: "Moneda", key: "moneda", width: 10 },
				{ header: "Prima Total (Bs)", key: "__prima_total_bs", width: 15 },
				{ header: "Prima Neta (Bs)", key: "__prima_neta_bs", width: 15 },
				{ header: "Comisión Empresa (Bs)", key: "__comision_empresa_bs", width: 18 },
				{ header: "Prima Total (USD)", key: "__prima_total_usd", width: 15 },
				{ header: "Prima Neta (USD)", key: "__prima_neta_usd", width: 15 },
				{ header: "Comisión Empresa (USD)", key: "__comision_empresa_usd", width: 18 },
				{ header: "Factor Prima Neta", key: "factor_prima_neta", width: 15 },
				{ header: "% Comisión", key: "porcentaje_comision", width: 12 },
				{ header: "Valor Asegurado", key: "valor_asegurado", width: 16 },
				{ header: "Cuotas", key: "cantidad_cuotas", width: 10 },
				{ header: "Cuota Inicial", key: "cuota_inicial", width: 14 },
				{ header: "Inicio Vigencia", key: "inicio_vigencia", width: 15 },
				{ header: "Fin Vigencia", key: "fin_vigencia", width: 15 },
				{ header: "Fecha Emisión Compañía", key: "fecha_emision_compania", width: 20 },
				{ header: "Fecha Producción Sistema", key: "fecha_produccion_sistema", width: 22 },
				{ header: "Persona Registro", key: "persona_registro", width: 25 },
				{ header: "Categoría", key: "categoria", width: 20 },
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

			// Bloques de moneda: cada importe aparece en Bs y en USD; se resalta el nativo.
			const BS_KEYS = ["__prima_total_bs", "__prima_neta_bs", "__comision_empresa_bs"];
			const USD_KEYS = ["__prima_total_usd", "__prima_neta_usd", "__comision_empresa_usd"];
			const colIdxDe = (key: string) => columns.findIndex((c) => c.key === key) + 1;
			const bsBlockIndices = BS_KEYS.map(colIdxDe);
			const usdBlockIndices = USD_KEYS.map(colIdxDe);
			const GREEN = "FF2E7D32"; // banda/encabezado Bs
			const PURPLE = "FF7E57C2"; // banda/encabezado USD
			const GREEN_SOFT = "FFE2EFDA"; // celda Bs cuando es la moneda original
			const PURPLE_SOFT = "FFEDE7F6"; // celda USD cuando es la moneda original

			// Encabezados del bloque USD en morado (los de Bs quedan en el verde por defecto)
			usdBlockIndices.forEach((colIdx) => {
				dataHeaderRow.getCell(colIdx).fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: PURPLE },
				};
			});

			// Banda superior que agrupa cada bloque (BOLIVIANOS / DÓLARES)
			const groupHeaderRow = worksheet.getRow(GROUP_HEADER_ROW);
			groupHeaderRow.height = 18;
			const pintarBanda = (indices: number[], texto: string, color: string) => {
				const desde = Math.min(...indices);
				const hasta = Math.max(...indices);
				worksheet.mergeCells(GROUP_HEADER_ROW, desde, GROUP_HEADER_ROW, hasta);
				const celda = groupHeaderRow.getCell(desde);
				celda.value = texto;
				celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
				celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
				celda.alignment = { vertical: "middle", horizontal: "center" };
			};
			pintarBanda(bsBlockIndices, "BOLIVIANOS (Bs)", GREEN);
			pintarBanda(usdBlockIndices, "DÓLARES (USD)", PURPLE);

			// Tipo de cambio. USD/USDT ya están en dólares; Bs/UFV se tratan como Bs.
			const tc = Number(tipoCambio) > 0 ? Number(tipoCambio) : 6.96;
			const esUsd = (moneda: string) => moneda === "USD" || moneda === "USDT";
			const aUsd = (monto: number | null, moneda: string): number => {
				const v = monto != null ? Number(monto) : 0;
				if (!Number.isFinite(v)) return 0;
				return esUsd(moneda) ? v : v / tc;
			};
			const aBs = (monto: number | null, moneda: string): number => {
				const v = monto != null ? Number(monto) : 0;
				if (!Number.isFinite(v)) return 0;
				return esUsd(moneda) ? v * tc : v;
			};

			// Escribir filas de datos
			rows.forEach((row, rowIndex) => {
				const values = columns.map((col) => {
					// Correlativo secuencial según el orden (por fecha de registro) que viene del server
					if (col.key === "__nro") return rowIndex + 1;
					// Bloque Bolivianos (USD→Bs ×TC; Bs/UFV sin cambio)
					if (col.key === "__prima_total_bs") return aBs(row.prima_total, row.moneda);
					if (col.key === "__prima_neta_bs") return aBs(row.prima_neta, row.moneda);
					if (col.key === "__comision_empresa_bs") return aBs(row.comision_empresa, row.moneda);
					// Bloque Dólares (Bs→USD ÷TC; USD/USDT sin cambio)
					if (col.key === "__prima_total_usd") return aUsd(row.prima_total, row.moneda);
					if (col.key === "__prima_neta_usd") return aUsd(row.prima_neta, row.moneda);
					if (col.key === "__comision_empresa_usd") return aUsd(row.comision_empresa, row.moneda);
					const val = row[col.key as keyof typeof row];
					// Formatear fechas
					if (
						[
							"inicio_vigencia",
							"fin_vigencia",
							"fecha_emision_compania",
							"fecha_produccion_sistema",
						].includes(col.key)
					) {
						return val
							? new Date(
									(val as string) + (col.key === "fecha_produccion_sistema" ? "" : "T00:00:00"),
								).toLocaleDateString("es-BO")
							: "";
					}
					return val ?? "";
				});

				const excelRow = worksheet.addRow(values);

				// Resaltar el bloque de la moneda original; el otro queda en blanco (es el convertido)
				const indicesNativos = esUsd(row.moneda) ? usdBlockIndices : bsBlockIndices;
				const colorNativo = esUsd(row.moneda) ? PURPLE_SOFT : GREEN_SOFT;
				indicesNativos.forEach((colIdx) => {
					excelRow.getCell(colIdx).fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: colorNativo },
					};
				});
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
			const numericKeys = [
				"__prima_total_bs",
				"__prima_neta_bs",
				"__comision_empresa_bs",
				"__prima_total_usd",
				"__prima_neta_usd",
				"__comision_empresa_usd",
				"valor_asegurado",
				"cuota_inicial",
			];
			numericKeys.forEach((key) => {
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
			link.download = `produccion_${fechaDesde}_${fechaHasta}.xlsx`;

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
						<BarChart3 className="h-4 w-4 text-primary" />
					</div>
					<div>
						<CardTitle className="text-lg">Reporte de Producción</CardTitle>
						<CardDescription>
							Una fila por póliza/anexo con director de cartera, valor asegurado, códigos APS (compañía,
							ramo, producto) y fechas de emisión
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
								onValueChange={(value) =>
									setEstadoPoliza(value as "activa" | "pendiente" | "rechazada" | "all")
								}
							>
								<SelectTrigger className="w-full truncate">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todas</SelectItem>
									<SelectItem value="activa">Solo Activas</SelectItem>
									<SelectItem value="pendiente">Solo Pendientes</SelectItem>
									<SelectItem value="rechazada">Solo Rechazadas</SelectItem>
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

						<div className="space-y-1.5">
							<Label className="text-sm">TC (Bs/USD)</Label>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={tipoCambio}
								onChange={(e) => setTipoCambio(e.target.value)}
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
