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
import { Download, AlertCircle, BarChart3 } from "lucide-react";
import {
	exportarProduccionNuevo,
	obtenerRegionales,
	obtenerCompanias,
	obtenerEquiposParaFiltro,
} from "@/app/gerencia/reportes/actions";
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

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

export default function ExportarProduccion() {
	const currentMonth = new Date().getMonth() + 1;

	const [mes, setMes] = useState<number>(currentMonth);
	const [anio, setAnio] = useState<number>(currentYear);
	const [estadoPoliza, setEstadoPoliza] = useState<"activa" | "all">("all");
	const [regionalId, setRegionalId] = useState<string>("");
	const [companiaId, setCompaniaId] = useState<string>("");
	const [equipoId, setEquipoId] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [regionales, setRegionales] = useState<{ id: string; nombre: string }[]>([]);
	const [companias, setCompanias] = useState<{ id: string; nombre: string }[]>([]);
	const [equipos, setEquipos] = useState<{ id: string; nombre: string }[]>([]);

	useEffect(() => {
		async function loadFilters() {
			const [regionalesRes, companiasRes, equiposRes] = await Promise.all([
				obtenerRegionales(),
				obtenerCompanias(),
				obtenerEquiposParaFiltro(),
			]);

			if (regionalesRes.success) setRegionales(regionalesRes.data);
			if (companiasRes.success) setCompanias(companiasRes.data);
			if (equiposRes.success) setEquipos(equiposRes.data);
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
				equipo_id: equipoId || undefined,
			};

			const result = await exportarProduccionNuevo(filtros);

			if (!result.success) {
				setError(result.error);
				return;
			}

			if (result.data.length === 0) {
				setError("No se encontraron datos para el período seleccionado");
				return;
			}

			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Producción");

			worksheet.columns = [
				{ header: "N° Póliza", key: "numero_poliza", width: 15 },
				{ header: "N° Anexo", key: "numero_anexo", width: 12 },
				{ header: "Tipo", key: "tipo_poliza", width: 14 },
				{ header: "Cliente", key: "cliente", width: 30 },
				{ header: "CI/NIT", key: "ci_nit", width: 15 },
				{ header: "Director de Cartera", key: "director_cartera", width: 22 },
				{ header: "Compañía", key: "compania", width: 25 },
				{ header: "Cod APS", key: "cod_aps", width: 10 },
				{ header: "Ramo", key: "ramo", width: 20 },
				{ header: "Responsable", key: "responsable", width: 25 },
				{ header: "Regional", key: "regional", width: 15 },
				{ header: "Prima Total", key: "prima_total", width: 14 },
				{ header: "Prima Neta", key: "prima_neta", width: 14 },
				{ header: "Comisión Empresa", key: "comision_empresa", width: 16 },
				{ header: "Factor Prima Neta", key: "factor_prima_neta", width: 15 },
				{ header: "% Comisión", key: "porcentaje_comision", width: 12 },
				{ header: "Moneda", key: "moneda", width: 10 },
				{ header: "Valor Asegurado", key: "valor_asegurado", width: 16 },
				{ header: "Inicio Vigencia", key: "inicio_vigencia", width: 15 },
				{ header: "Fin Vigencia", key: "fin_vigencia", width: 15 },
				{ header: "Fecha Emisión Compañía", key: "fecha_emision_compania", width: 20 },
				{ header: "Fecha Producción Sistema", key: "fecha_produccion_sistema", width: 22 },
			];

			// Estilo del header
			const headerRow = worksheet.getRow(1);
			headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
			headerRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF2E7D32" },
			};
			headerRow.alignment = { vertical: "middle", horizontal: "center" };
			headerRow.height = 20;

			const greenColumns = [
				"prima_neta",
				"comision_empresa",
				"factor_prima_neta",
				"porcentaje_comision",
			];

			result.data.forEach((row) => {
				const excelRow = worksheet.addRow({
					numero_poliza: row.numero_poliza,
					numero_anexo: row.numero_anexo ?? "",
					tipo_poliza: row.tipo_poliza,
					cliente: row.cliente,
					ci_nit: row.ci_nit,
					director_cartera: row.director_cartera,
					compania: row.compania,
					cod_aps: row.cod_aps ?? "",
					ramo: row.ramo,
					responsable: row.responsable,
					regional: row.regional,
					prima_total: row.prima_total,
					prima_neta: row.prima_neta ?? "",
					comision_empresa: row.comision_empresa ?? "",
					factor_prima_neta: row.factor_prima_neta ?? "",
					porcentaje_comision: row.porcentaje_comision ?? "",
					moneda: row.moneda,
					valor_asegurado: row.valor_asegurado ?? "",
					inicio_vigencia: row.inicio_vigencia
						? new Date(row.inicio_vigencia).toLocaleDateString("es-BO")
						: "",
					fin_vigencia: row.fin_vigencia
						? new Date(row.fin_vigencia).toLocaleDateString("es-BO")
						: "",
					fecha_emision_compania: row.fecha_emision_compania
						? new Date(row.fecha_emision_compania).toLocaleDateString("es-BO")
						: "",
					fecha_produccion_sistema: row.fecha_produccion_sistema
						? new Date(row.fecha_produccion_sistema).toLocaleDateString("es-BO")
						: "",
				});

				greenColumns.forEach((colKey) => {
					const cell = excelRow.getCell(colKey);
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFE2EFDA" },
					};
				});
			});

			// Bordes
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

			// Formato numérico
			const numericColumns = [
				"prima_total",
				"prima_neta",
				"comision_empresa",
				"valor_asegurado",
			];
			numericColumns.forEach((colKey) => {
				const col = worksheet.getColumn(colKey);
				col.numFmt = "#,##0.00";
			});

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;

			const mesNombre = MESES.find((m) => m.value === mes)?.label || mes;
			link.download = `produccion_${mesNombre}_${anio}.xlsx`;

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
						Reporte de Producción
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Una fila por póliza/anexo con director de cartera, valor asegurado,
						cod APS y fechas de emisión
					</p>
				</div>
				<BarChart3 className="h-6 w-6 text-muted-foreground" />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

				<div className="space-y-2">
					<Label>Equipo</Label>
					<Select
						value={equipoId || "all"}
						onValueChange={(value) => setEquipoId(value === "all" ? "" : value)}
					>
						<SelectTrigger>
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
