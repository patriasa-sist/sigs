"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, FileSpreadsheet } from "lucide-react";
import {
	exportarProduccion,
	obtenerRegionales,
	obtenerCompanias,
} from "@/app/admin/reportes/actions";
import * as ExcelJS from "exceljs";
import type { ExportProduccionFilters } from "@/types/reporte";

const MESES = [
	{ value: 1, label: "Enero" },
	{ value: 2, label: "Febrero" },
	{ value: 3, label: "Marzo" },
	{ value: 4, label: "Abril" },
	{ value: 5, label: "Mayo" },
	{ value: 6, label: "Junio" },
	{ value: 7, label: "Julio" },
	{ value: 8, label: "Agosto" },
	{ value: 9, label: "Septiembre" },
	{ value: 10, label: "Octubre" },
	{ value: 11, label: "Noviembre" },
	{ value: 12, label: "Diciembre" },
];

// Generar años desde 2020 hasta el actual + 1
const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

export default function ExportarProduccion() {
	const currentMonth = new Date().getMonth() + 1;

	const [mes, setMes] = useState<number>(currentMonth);
	const [anio, setAnio] = useState<number>(currentYear);
	const [estadoPoliza, setEstadoPoliza] = useState<"activa" | "all">("all");
	const [regionalId, setRegionalId] = useState<string>("");
	const [companiaId, setCompaniaId] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Datos para los filtros
	const [regionales, setRegionales] = useState<{ id: string; nombre: string }[]>([]);
	const [companias, setCompanias] = useState<{ id: string; nombre: string }[]>([]);

	// Cargar regionales y compañías al montar
	useEffect(() => {
		async function loadFilters() {
			const [regionalesRes, companiasRes] = await Promise.all([
				obtenerRegionales(),
				obtenerCompanias(),
			]);

			if (regionalesRes.success) {
				setRegionales(regionalesRes.data);
			}
			if (companiasRes.success) {
				setCompanias(companiasRes.data);
			}
		}
		loadFilters();
	}, []);

	const handleExport = async () => {
		setLoading(true);
		setError(null);

		try {
			const filtros: ExportProduccionFilters = {
				mes,
				anio,
				estado_poliza: estadoPoliza,
				regional_id: regionalId || undefined,
				compania_id: companiaId || undefined,
			};

			const result = await exportarProduccion(filtros);

			if (!result.success) {
				setError(result.error);
				return;
			}

			if (result.data.length === 0) {
				setError("No se encontraron datos para el período seleccionado");
				return;
			}

			// Generar archivo Excel con ExcelJS
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Producción Mensual");

			// Definir columnas
			worksheet.columns = [
				{ header: "N° Póliza", key: "numero_poliza", width: 15 },
				{ header: "Cliente", key: "cliente", width: 30 },
				{ header: "CI/NIT", key: "ci_nit", width: 15 },
				{ header: "Compañía", key: "compania", width: 25 },
				{ header: "Ramo", key: "ramo", width: 20 },
				{ header: "Responsable", key: "responsable", width: 25 },
				{ header: "Regional", key: "regional", width: 15 },
				{ header: "Prima Total", key: "prima_total", width: 14 },
				{ header: "Prima Neta", key: "prima_neta", width: 14 },
				{ header: "Comisión Empresa", key: "comision_empresa", width: 16 },
				{ header: "Factor Prima Neta", key: "factor_prima_neta", width: 15 },
				{ header: "% Comisión", key: "porcentaje_comision", width: 12 },
				{ header: "Inicio Vigencia", key: "inicio_vigencia", width: 15 },
				{ header: "Fin Vigencia", key: "fin_vigencia", width: 15 },
				{ header: "N° Cuota", key: "numero_cuota", width: 10 },
				{ header: "Monto Cuota PT", key: "monto_cuota_pt", width: 14 },
				{ header: "Monto Cuota PN", key: "monto_cuota_pn", width: 14 },
				{ header: "Monto Cuota Comisión", key: "monto_cuota_comision", width: 18 },
				{ header: "Moneda", key: "moneda", width: 10 },
			];

			// Estilo del header
			const headerRow = worksheet.getRow(1);
			headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
			headerRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF4472C4" },
			};
			headerRow.alignment = { vertical: "middle", horizontal: "center" };
			headerRow.height = 20;

			// Columnas que deben tener fondo verde (campos financieros calculados)
			const greenColumns = [
				"prima_neta",
				"comision_empresa",
				"factor_prima_neta",
				"porcentaje_comision",
				"monto_cuota_pn",
				"monto_cuota_comision",
			];

			// Agregar filas de datos
			result.data.forEach((row) => {
				const excelRow = worksheet.addRow({
					numero_poliza: row.numero_poliza,
					cliente: row.cliente,
					ci_nit: row.ci_nit,
					compania: row.compania,
					ramo: row.ramo,
					responsable: row.responsable,
					regional: row.regional,
					prima_total: row.prima_total,
					prima_neta: row.prima_neta ?? "",
					comision_empresa: row.comision_empresa ?? "",
					factor_prima_neta: row.factor_prima_neta ?? "",
					porcentaje_comision: row.porcentaje_comision ?? "",
					inicio_vigencia: row.inicio_vigencia
						? new Date(row.inicio_vigencia).toLocaleDateString("es-BO")
						: "",
					fin_vigencia: row.fin_vigencia
						? new Date(row.fin_vigencia).toLocaleDateString("es-BO")
						: "",
					numero_cuota: row.numero_cuota,
					monto_cuota_pt: row.monto_cuota_pt,
					monto_cuota_pn: row.monto_cuota_pn ?? "",
					monto_cuota_comision: row.monto_cuota_comision ?? "",
					moneda: row.moneda,
				});

				// Aplicar fondo verde claro a las columnas financieras
				greenColumns.forEach((colKey) => {
					const cell = excelRow.getCell(colKey);
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFE2EFDA" }, // Verde claro
					};
				});
			});

			// Agregar bordes a todas las celdas
			worksheet.eachRow((row) => {
				row.eachCell((cell) => {
					cell.border = {
						top: { style: "thin" },
						left: { style: "thin" },
						bottom: { style: "thin" },
						right: { style: "thin" },
					};
				});
			});

			// Formatear números con decimales
			const numericColumns = [
				"prima_total",
				"prima_neta",
				"comision_empresa",
				"monto_cuota_pt",
				"monto_cuota_pn",
				"monto_cuota_comision",
			];
			numericColumns.forEach((colKey) => {
				const col = worksheet.getColumn(colKey);
				col.numFmt = "#,##0.00";
			});

			// Generar archivo
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			// Crear enlace de descarga
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;

			// Nombre del archivo
			const mesNombre = MESES.find((m) => m.value === mes)?.label || mes;
			link.download = `produccion_${mesNombre}_${anio}.xlsx`;

			// Descargar
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Error exporting:", err);
			setError(
				err instanceof Error ? err.message : "Error al generar el archivo Excel"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="rounded-lg border p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">
						Reporte Consolidado de Producción
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Exporta el reporte mensual con prima neta, comisiones y factores de
						cálculo
					</p>
				</div>
				<FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
				{/* Mes */}
				<div className="space-y-2">
					<Label>Mes</Label>
					<Select
						value={mes.toString()}
						onValueChange={(value) => setMes(Number(value))}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{MESES.map((m) => (
								<SelectItem key={m.value} value={m.value.toString()}>
									{m.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Año */}
				<div className="space-y-2">
					<Label>Año</Label>
					<Select
						value={anio.toString()}
						onValueChange={(value) => setAnio(Number(value))}
					>
						<SelectTrigger>
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

				{/* Estado Póliza */}
				<div className="space-y-2">
					<Label>Estado Póliza</Label>
					<Select
						value={estadoPoliza}
						onValueChange={(value) => setEstadoPoliza(value as "activa" | "all")}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todas</SelectItem>
							<SelectItem value="activa">Solo Activas</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Regional */}
				<div className="space-y-2">
					<Label>Regional</Label>
					<Select
						value={regionalId || "all"}
						onValueChange={(value) => setRegionalId(value === "all" ? "" : value)}
					>
						<SelectTrigger>
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

				{/* Compañía */}
				<div className="space-y-2">
					<Label>Compañía</Label>
					<Select
						value={companiaId || "all"}
						onValueChange={(value) => setCompaniaId(value === "all" ? "" : value)}
					>
						<SelectTrigger>
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
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end">
				<Button onClick={handleExport} disabled={loading} size="lg">
					<Download className="h-4 w-4 mr-2" />
					{loading ? "Exportando..." : "Exportar a Excel"}
				</Button>
			</div>
		</div>
	);
}
