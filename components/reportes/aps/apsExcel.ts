import * as ExcelJS from "exceljs";
import type { APSRegistro } from "@/app/reportes/actions-aps";
import { companiasDe, ordenarRegistros, formatFechaCorta } from "./apsShared";

export type CampoMatriz = "comision" | "prima_neta";

const CAMPO_TITULOS: Record<CampoMatriz, string> = {
	comision: "REPORTE DE PRODUCCIÓN COMISIÓN",
	prima_neta: "REPORTE DE PRODUCCIÓN PRIMA NETA",
};

const CAMPO_SHEET: Record<CampoMatriz, string> = {
	comision: "Comisión",
	prima_neta: "Prima Neta",
};

const COLOR_HEADER = "FFDCE6F1"; // celeste pálido (encabezados de compañía)
const COLOR_RIESGO = "FFEAF1F8"; // celeste muy claro (celdas de riesgo)
const COLOR_TOTAL = "FFEBF1DE"; // verde pálido (columna/fila Total)
const COLOR_SUBTOTAL = "FFD9D9D9"; // gris (filas Sub Total)

const THIN_BORDER: Partial<ExcelJS.Borders> = {
	top: { style: "thin" },
	left: { style: "thin" },
	bottom: { style: "thin" },
	right: { style: "thin" },
};

const NUM_FMT = "#,##0.00";

type FilaMatriz = {
	grupo_codigo: string;
	grupo_nombre: string;
	codigo_aps: string;
	riesgo: string;
	valores: Map<string, number>; // compania_nombre → monto
};

/** "93-47-112" → "93-47" (los códigos sin producto quedan como su propio ramo) */
function ramoDe(codigoAps: string): string {
	const partes = codigoAps.split("-");
	return partes.length > 2 ? partes.slice(0, 2).join("-") : codigoAps;
}

export async function buildMatrizAPSExcel(opts: {
	campo: CampoMatriz;
	/** Sufijo del título y nombre de hoja: "INGRESO", "EGRESO", "GENERAL", "DEVOLUCIÓN", "P. CORRIDA" */
	etiqueta: string;
	registros: APSRegistro[];
	fechaDesde: string;
	fechaHasta: string;
	generadoEl: string;
}): Promise<ArrayBuffer> {
	const { campo, etiqueta, registros, fechaDesde, fechaHasta, generadoEl } = opts;

	const companias = companiasDe(registros);
	const ordenados = ordenarRegistros(registros);

	// Pivot: una fila por (código APS, riesgo), una columna por compañía
	const filas: FilaMatriz[] = [];
	const filaPorKey = new Map<string, FilaMatriz>();
	for (const r of ordenados) {
		const key = `${r.codigo_aps}|${r.riesgo}`;
		let fila = filaPorKey.get(key);
		if (!fila) {
			fila = {
				grupo_codigo: r.grupo_codigo,
				grupo_nombre: r.grupo_nombre,
				codigo_aps: r.codigo_aps,
				riesgo: r.riesgo,
				valores: new Map(),
			};
			filaPorKey.set(key, fila);
			filas.push(fila);
		}
		fila.valores.set(r.compania_nombre, (fila.valores.get(r.compania_nombre) ?? 0) + r[campo]);
	}

	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet(`${CAMPO_SHEET[campo]} ${etiqueta}`);

	const colCompaniaInicio = 3; // A = grupo, B = riesgo
	const colTotal = colCompaniaInicio + companias.length;
	const colRamoTotal = colTotal + 1; // TOTALES: un total por ramo (93-47, 93-49, …)
	const totalCols = colRamoTotal;

	ws.getColumn(1).width = 16;
	ws.getColumn(2).width = 48;
	for (let i = 0; i < companias.length; i++) {
		ws.getColumn(colCompaniaInicio + i).width = 12;
	}
	ws.getColumn(colTotal).width = 14;
	ws.getColumn(colRamoTotal).width = 14;

	// Encabezado del reporte
	ws.mergeCells(1, 1, 1, totalCols);
	const tituloCell = ws.getCell(1, 1);
	tituloCell.value = `${CAMPO_TITULOS[campo]} ${etiqueta}`;
	tituloCell.font = { bold: true, size: 14 };
	tituloCell.alignment = { horizontal: "center", vertical: "middle" };

	ws.mergeCells(2, 1, 2, totalCols);
	const rangoCell = ws.getCell(2, 1);
	rangoCell.value = `Desde: ${formatFechaCorta(fechaDesde)}    Hasta: ${formatFechaCorta(fechaHasta)}`;
	rangoCell.alignment = { horizontal: "center" };

	ws.mergeCells(3, 1, 3, totalCols);
	const generadoCell = ws.getCell(3, 1);
	generadoCell.value = `Generado: ${generadoEl}`;
	generadoCell.font = { size: 9, color: { argb: "FF808080" } };
	generadoCell.alignment = { horizontal: "right" };

	// Fila de encabezados (compañías en vertical)
	const headerRowIdx = 5;
	const headerRow = ws.getRow(headerRowIdx);
	headerRow.height = 120;
	companias.forEach((c, i) => {
		const cell = ws.getCell(headerRowIdx, colCompaniaInicio + i);
		cell.value = c.nombre;
		cell.alignment = { textRotation: 90, horizontal: "center", vertical: "middle", wrapText: true };
		cell.font = { size: 8 };
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER } };
		cell.border = THIN_BORDER;
	});
	const totalHeaderCell = ws.getCell(headerRowIdx, colTotal);
	totalHeaderCell.value = "Total";
	totalHeaderCell.alignment = { textRotation: 90, horizontal: "center", vertical: "middle" };
	totalHeaderCell.font = { size: 8, bold: true };
	totalHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTAL } };
	totalHeaderCell.border = THIN_BORDER;
	const ramoTotalHeaderCell = ws.getCell(headerRowIdx, colRamoTotal);
	ramoTotalHeaderCell.value = "TOTALES";
	ramoTotalHeaderCell.alignment = { textRotation: 90, horizontal: "center", vertical: "middle" };
	ramoTotalHeaderCell.font = { size: 8, bold: true };
	ramoTotalHeaderCell.border = THIN_BORDER;
	ws.getCell(headerRowIdx, 1).border = THIN_BORDER;
	ws.getCell(headerRowIdx, 2).border = THIN_BORDER;

	// Cuerpo: filas por grupo con Sub Total, y Total general al final
	const totalesGenerales = new Array<number>(companias.length).fill(0);
	let rowIdx = headerRowIdx + 1;
	let g = 0;

	/** Escribe los montos por compañía + la columna Total, y devuelve el total de la fila */
	const escribirFilaMontos = (valores: number[], opciones: { bold?: boolean; fill?: string } = {}): number => {
		let totalFila = 0;
		valores.forEach((v, i) => {
			const cell = ws.getCell(rowIdx, colCompaniaInicio + i);
			cell.value = v;
			cell.numFmt = NUM_FMT;
			cell.border = THIN_BORDER;
			if (opciones.bold) cell.font = { bold: true, size: 8 };
			else cell.font = { size: 8 };
			if (opciones.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opciones.fill } };
			totalFila += v;
		});
		const totalCell = ws.getCell(rowIdx, colTotal);
		totalCell.value = totalFila;
		totalCell.numFmt = NUM_FMT;
		totalCell.border = THIN_BORDER;
		totalCell.font = { bold: true, size: 8 };
		totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opciones.fill ?? COLOR_TOTAL } };
		return totalFila;
	};

	/** Bloque combinado en la columna TOTALES con la suma de todo el ramo */
	const escribirTotalRamo = (desde: number, hasta: number, total: number): void => {
		// El estilo va en la celda maestra antes del merge: ExcelJS lo propaga al resto del bloque
		const cell = ws.getCell(desde, colRamoTotal);
		cell.value = total;
		cell.numFmt = NUM_FMT;
		cell.font = { size: 8, bold: true };
		cell.alignment = { horizontal: "right", vertical: "middle" };
		cell.border = THIN_BORDER;
		if (hasta > desde) {
			ws.mergeCells(desde, colRamoTotal, hasta, colRamoTotal);
		}
	};

	while (g < filas.length) {
		const grupo = filas[g].grupo_codigo;
		const grupoNombre = filas[g].grupo_nombre;
		const inicioGrupo = rowIdx;
		const subtotales = new Array<number>(companias.length).fill(0);

		// Dentro del grupo, las filas ya vienen ordenadas por código APS, así que
		// cada ramo (93-47, 93-49, …) ocupa un bloque contiguo de filas.
		while (g < filas.length && filas[g].grupo_codigo === grupo) {
			const ramo = ramoDe(filas[g].codigo_aps);
			const inicioRamo = rowIdx;
			let totalRamo = 0;

			while (g < filas.length && filas[g].grupo_codigo === grupo && ramoDe(filas[g].codigo_aps) === ramo) {
				const fila = filas[g];
				const riesgoCell = ws.getCell(rowIdx, 2);
				riesgoCell.value = `${fila.codigo_aps} ||  ${fila.riesgo}`;
				riesgoCell.font = { size: 8 };
				riesgoCell.alignment = { wrapText: true, vertical: "middle" };
				riesgoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RIESGO } };
				riesgoCell.border = THIN_BORDER;
				ws.getCell(rowIdx, 1).border = THIN_BORDER;

				const valores = companias.map((c, i) => {
					const v = fila.valores.get(c.nombre) ?? 0;
					subtotales[i] += v;
					return v;
				});
				totalRamo += escribirFilaMontos(valores);
				rowIdx++;
				g++;
			}

			escribirTotalRamo(inicioRamo, rowIdx - 1, totalRamo);
		}

		// Etiqueta del grupo en la columna A (merge vertical sobre sus filas)
		if (rowIdx - 1 > inicioGrupo) {
			ws.mergeCells(inicioGrupo, 1, rowIdx - 1, 1);
		}
		const grupoCell = ws.getCell(inicioGrupo, 1);
		grupoCell.value = `${grupo} ||  ${grupoNombre}`;
		grupoCell.font = { size: 8, bold: true };
		grupoCell.alignment = { vertical: "top", wrapText: true };
		grupoCell.border = THIN_BORDER;

		// Sub Total del grupo
		const subTotalCell = ws.getCell(rowIdx, 2);
		subTotalCell.value = "Sub Total";
		subTotalCell.font = { size: 8, bold: true };
		subTotalCell.alignment = { horizontal: "right" };
		subTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_SUBTOTAL } };
		subTotalCell.border = THIN_BORDER;
		ws.getCell(rowIdx, 1).border = THIN_BORDER;
		escribirFilaMontos(subtotales, { bold: true, fill: COLOR_SUBTOTAL });
		ws.getCell(rowIdx, colRamoTotal).border = THIN_BORDER;
		subtotales.forEach((v, i) => {
			totalesGenerales[i] += v;
		});
		rowIdx++;
	}

	// Total general
	const totalLabelCell = ws.getCell(rowIdx, 2);
	totalLabelCell.value = "Total";
	totalLabelCell.font = { size: 8, bold: true };
	totalLabelCell.alignment = { horizontal: "right" };
	totalLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTAL } };
	totalLabelCell.border = THIN_BORDER;
	ws.getCell(rowIdx, 1).border = THIN_BORDER;
	escribirFilaMontos(totalesGenerales, { bold: true, fill: COLOR_TOTAL });
	ws.getCell(rowIdx, colRamoTotal).border = THIN_BORDER;

	return await wb.xlsx.writeBuffer();
}
