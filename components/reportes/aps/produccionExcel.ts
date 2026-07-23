import * as ExcelJS from "exceljs";
import type { APSRegistro } from "@/app/reportes/actions-aps";
import { type CompaniaAPS, companiasDe, ordenarRegistros, formatFechaCorta } from "./apsShared";

// Versión Excel del layout vertical del PDF de producción APS (secciones por
// compañía con Prima Total / Prima Neta / Comisión, subtotales y total
// general). La usan los reportes de Devolución y P. Corrida: a Contabilidad
// le sirve en Excel para cuadrar los montos contra el resto de reportes.

const COLOR_COMPANIA = "FFD9D9D9"; // gris (encabezado de compañía, como el PDF)
const COLOR_TABLA_HEADER = "FFEFEFEF"; // gris claro (cabecera de la tabla)

const NUM_FMT = "#,##0.00";

type Totales = { prima_total: number; prima_neta: number; comision: number };

function sumar(registros: APSRegistro[]): Totales {
	return registros.reduce(
		(acc, r) => ({
			prima_total: acc.prima_total + r.prima_total,
			prima_neta: acc.prima_neta + r.prima_neta,
			comision: acc.comision + r.comision,
		}),
		{ prima_total: 0, prima_neta: 0, comision: 0 },
	);
}

export async function buildProduccionAPSExcel(opts: {
	/** Título del reporte, ej. "Producción Devolución" */
	titulo: string;
	registros: APSRegistro[];
	fechaDesde: string;
	fechaHasta: string;
	generadoEl: string;
}): Promise<ArrayBuffer> {
	const { titulo, registros, fechaDesde, fechaHasta, generadoEl } = opts;

	const companias = companiasDe(registros);
	const ordenados = ordenarRegistros(registros);
	const totalGeneral = sumar(ordenados);

	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet(titulo.length > 31 ? titulo.slice(0, 31) : titulo);

	ws.getColumn(1).width = 56;
	for (let c = 2; c <= 4; c++) {
		ws.getColumn(c).width = 15;
	}

	// Encabezado: título centrado + fecha de generación (mismo formato que el PDF)
	ws.mergeCells(1, 1, 1, 4);
	const tituloCell = ws.getCell(1, 1);
	tituloCell.value = titulo;
	tituloCell.font = { bold: true, size: 14 };
	tituloCell.alignment = { horizontal: "center", vertical: "middle" };

	ws.mergeCells(2, 1, 2, 4);
	const rangoCell = ws.getCell(2, 1);
	rangoCell.value = `Desde: ${formatFechaCorta(fechaDesde)}    Hasta: ${formatFechaCorta(fechaHasta)}`;
	rangoCell.alignment = { horizontal: "center" };

	ws.mergeCells(3, 1, 3, 4);
	const generadoCell = ws.getCell(3, 1);
	generadoCell.value = `Fecha: ${generadoEl}`;
	generadoCell.font = { size: 9, color: { argb: "FF808080" } };
	generadoCell.alignment = { horizontal: "right" };

	let rowIdx = 5;

	const escribirMontos = (totales: Totales, opciones: { bold?: boolean } = {}): void => {
		([totales.prima_total, totales.prima_neta, totales.comision] as const).forEach((v, i) => {
			const cell = ws.getCell(rowIdx, 2 + i);
			cell.value = v;
			cell.numFmt = NUM_FMT;
			cell.font = { size: 9, bold: opciones.bold ?? false };
		});
	};

	if (companias.length === 0) {
		const vacioCell = ws.getCell(rowIdx, 1);
		vacioCell.value = "Sin movimientos en el período seleccionado";
		vacioCell.font = { size: 9, color: { argb: "FF808080" } };
	}

	for (const compania of companias as CompaniaAPS[]) {
		const filas = ordenados.filter((r) => r.compania_nombre === compania.nombre);
		const subtotal = sumar(filas);

		ws.mergeCells(rowIdx, 1, rowIdx, 4);
		const companiaCell = ws.getCell(rowIdx, 1);
		companiaCell.value = `Compañía: ${compania.codigo != null ? `${compania.codigo} ` : ""}${compania.nombre}`;
		companiaCell.font = { bold: true, size: 10 };
		companiaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_COMPANIA } };
		rowIdx++;

		["Ramo/Riesgo", "Prima Total", "Prima Neta", "Comisión"].forEach((encabezado, i) => {
			const cell = ws.getCell(rowIdx, 1 + i);
			cell.value = encabezado;
			cell.font = { bold: true, size: 9 };
			if (i > 0) cell.alignment = { horizontal: "right" };
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TABLA_HEADER } };
			cell.border = { bottom: { style: "thin" } };
		});
		rowIdx++;

		for (const r of filas) {
			const riesgoCell = ws.getCell(rowIdx, 1);
			riesgoCell.value = `${r.codigo_aps} ${r.riesgo}`;
			riesgoCell.font = { size: 9 };
			escribirMontos(r);
			rowIdx++;
		}

		for (let c = 1; c <= 4; c++) {
			ws.getCell(rowIdx, c).border = { top: { style: "thin" } };
		}
		escribirMontos(subtotal, { bold: true });
		rowIdx += 2;
	}

	if (companias.length > 0) {
		for (let c = 1; c <= 4; c++) {
			ws.getCell(rowIdx, c).border = { top: { style: "medium" }, bottom: { style: "medium" } };
		}
		const totalCell = ws.getCell(rowIdx, 1);
		totalCell.value = "Total";
		totalCell.font = { bold: true, size: 10 };
		escribirMontos(totalGeneral, { bold: true });
	}

	return await wb.xlsx.writeBuffer();
}
