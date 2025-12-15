"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import * as ExcelJS from "exceljs";
import type { SiniestroVista } from "@/types/siniestro";

interface ExportarSiniestrosProps {
	siniestros: SiniestroVista[];
	filtrosActivos?: {
		searchTerm?: string;
		estadoFiltro?: string;
		ramoFiltro?: string;
		departamentoFiltro?: string;
	};
}

export default function ExportarSiniestros({ siniestros, filtrosActivos }: ExportarSiniestrosProps) {
	const [loading, setLoading] = useState(false);

	const handleExport = async () => {
		if (siniestros.length === 0) {
			alert("No hay siniestros para exportar");
			return;
		}

		setLoading(true);

		try {
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Siniestros");

			// Metadata
			workbook.creator = "Sistema de Gestión - Patrimonial SA";
			workbook.created = new Date();
			workbook.modified = new Date();

			// Encabezados
			const headers = [
				"Fecha Siniestro",
				"Fecha Reporte",
				"Número Póliza",
				"Ramo",
				"Cliente",
				"Documento",
				"Estado",
				"Departamento",
				"Lugar del Hecho",
				"Monto Reserva",
				"Moneda",
				"Compañía",
				"Responsable",
				"Documentos",
				"Observaciones",
				"Creado por",
				"Fecha Creación",
			];

			// Agregar encabezados con estilo
			const headerRow = worksheet.addRow(headers);
			headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
			headerRow.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF0066CC" },
			};
			headerRow.alignment = { vertical: "middle", horizontal: "center" };

			// Datos
			siniestros.forEach((siniestro) => {
				worksheet.addRow([
					new Date(siniestro.fecha_siniestro),
					new Date(siniestro.fecha_reporte),
					siniestro.numero_poliza,
					siniestro.ramo,
					siniestro.cliente_nombre,
					siniestro.cliente_documento,
					getEstadoLabel(siniestro.estado),
					siniestro.departamento_nombre,
					siniestro.lugar_hecho,
					siniestro.monto_reserva,
					siniestro.moneda,
					siniestro.compania_nombre,
					siniestro.responsable_nombre || "N/A",
					siniestro.total_documentos,
					siniestro.total_observaciones,
					siniestro.creado_por_nombre || "N/A",
					new Date(siniestro.fecha_creacion),
				]);
			});

			// Formatear columnas de fechas
			const dateColumns = [1, 2, 17]; // Fecha Siniestro, Fecha Reporte, Fecha Creación
			dateColumns.forEach((colNum) => {
				const column = worksheet.getColumn(colNum);
				column.numFmt = "dd/mm/yyyy";
				column.width = 12;
			});

			// Formatear columna de montos
			const montoColumn = worksheet.getColumn(10); // Monto Reserva
			montoColumn.numFmt = "#,##0.00";
			montoColumn.width = 14;

			// Ajustar anchos de columnas
			worksheet.getColumn(3).width = 18; // Número Póliza
			worksheet.getColumn(4).width = 18; // Ramo
			worksheet.getColumn(5).width = 30; // Cliente
			worksheet.getColumn(6).width = 15; // Documento
			worksheet.getColumn(7).width = 12; // Estado
			worksheet.getColumn(8).width = 15; // Departamento
			worksheet.getColumn(9).width = 35; // Lugar del Hecho
			worksheet.getColumn(11).width = 8; // Moneda
			worksheet.getColumn(12).width = 25; // Compañía
			worksheet.getColumn(13).width = 25; // Responsable
			worksheet.getColumn(14).width = 10; // Documentos
			worksheet.getColumn(15).width = 12; // Observaciones
			worksheet.getColumn(16).width = 25; // Creado por

			// Aplicar bordes a todas las celdas con datos
			worksheet.eachRow((row, rowNumber) => {
				row.eachCell((cell) => {
					cell.border = {
						top: { style: "thin" },
						left: { style: "thin" },
						bottom: { style: "thin" },
						right: { style: "thin" },
					};
				});

				// Color alternado para filas (excepto header)
				if (rowNumber > 1 && rowNumber % 2 === 0) {
					row.eachCell((cell) => {
						cell.fill = {
							type: "pattern",
							pattern: "solid",
							fgColor: { argb: "FFF5F5F5" },
						};
					});
				}
			});

			// Congelar primera fila
			worksheet.views = [{ state: "frozen", ySplit: 1 }];

			// Agregar hoja de resumen si hay filtros activos
			if (filtrosActivos) {
				const summarySheet = workbook.addWorksheet("Resumen");

				summarySheet.addRow(["REPORTE DE SINIESTROS"]);
				summarySheet.getCell("A1").font = { bold: true, size: 16 };
				summarySheet.addRow([]);

				summarySheet.addRow(["Fecha de generación:", new Date().toLocaleString("es-BO")]);
				summarySheet.addRow(["Total de siniestros:", siniestros.length]);
				summarySheet.addRow([]);

				if (filtrosActivos.searchTerm) {
					summarySheet.addRow(["Filtro de búsqueda:", filtrosActivos.searchTerm]);
				}
				if (filtrosActivos.estadoFiltro && filtrosActivos.estadoFiltro !== "todos") {
					summarySheet.addRow(["Estado filtrado:", getEstadoLabel(filtrosActivos.estadoFiltro)]);
				}
				if (filtrosActivos.ramoFiltro && filtrosActivos.ramoFiltro !== "todos") {
					summarySheet.addRow(["Ramo filtrado:", filtrosActivos.ramoFiltro]);
				}
				if (filtrosActivos.departamentoFiltro && filtrosActivos.departamentoFiltro !== "todos") {
					summarySheet.addRow(["Departamento filtrado:", filtrosActivos.departamentoFiltro]);
				}

				summarySheet.getColumn(1).width = 25;
				summarySheet.getColumn(2).width = 40;
			}

			// Generar archivo
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});

			// Descargar
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `siniestros_${new Date().toISOString().split("T")[0]}.xlsx`;
			link.click();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error exportando siniestros:", error);
			alert("Error al exportar siniestros. Intente nuevamente.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button onClick={handleExport} disabled={loading || siniestros.length === 0} variant="outline" size="sm">
			{loading ? (
				<>
					<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					Exportando...
				</>
			) : (
				<>
					<Download className="h-4 w-4 mr-2" />
					Exportar a Excel ({siniestros.length})
				</>
			)}
		</Button>
	);
}

function getEstadoLabel(estado: string): string {
	const labels: Record<string, string> = {
		abierto: "Abierto",
		rechazado: "Rechazado",
		declinado: "Declinado",
		concluido: "Concluido",
	};
	return labels[estado] || estado;
}
