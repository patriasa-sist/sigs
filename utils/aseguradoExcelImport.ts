import * as ExcelJS from "exceljs";
import type { AseguradoAPVida, NivelCobertura } from "@/types/poliza";

export interface AseguradoImportResult {
	exito: boolean;
	asegurados_validos: AseguradoAPVida[];
	errores: Array<{ fila: number; errores: string[] }>;
}

const COLUMNAS_ESPERADAS = {
	nombre_completo: ["nombre completo", "nombre", "name", "nombre_completo", "nombres y apellidos", "nombres"],
	carnet: ["carnet", "ci", "carnet de identidad", "cedula", "cedula de identidad", "documento", "id"],
	fecha_nacimiento: [
		"fecha nacimiento",
		"fecha de nacimiento",
		"fecha_nacimiento",
		"nacimiento",
		"birth date",
		"birthdate",
	],
	genero: ["genero", "genero", "gender", "sexo"],
	nivel: ["nivel", "nivel de cobertura", "cobertura", "nivel_cobertura", "level"],
};

function normalizarNombreColumna(nombre: string): string {
	return nombre.toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function mapearColumnas(headers: string[]): Record<string, number> {
	const mapa: Record<string, number> = {};
	headers.forEach((header, index) => {
		const headerNormalizado = normalizarNombreColumna(header);
		Object.entries(COLUMNAS_ESPERADAS).forEach(([campo, variantes]) => {
			if (variantes.some((v) => normalizarNombreColumna(v) === headerNormalizado)) {
				mapa[campo] = index;
			}
		});
	});
	return mapa;
}

function convertirAString(valor: unknown): string | undefined {
	if (valor === null || valor === undefined) return undefined;
	return String(valor).trim() || undefined;
}

function parsearFecha(valor: unknown): string | undefined {
	if (valor === null || valor === undefined || valor === "") return undefined;
	if (valor instanceof Date) {
		if (isNaN(valor.getTime())) return undefined;
		return valor.toISOString().split("T")[0];
	}
	const str = String(valor).trim();
	// dd/mm/yyyy o dd-mm-yyyy
	const ddmmyyyy = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
	if (ddmmyyyy) {
		const [, d, m, y] = ddmmyyyy;
		const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
		return isNaN(date.getTime()) ? undefined : date.toISOString().split("T")[0];
	}
	// yyyy-mm-dd
	const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (yyyymmdd) {
		const date = new Date(str);
		return isNaN(date.getTime()) ? undefined : str;
	}
	return undefined;
}

function parsearGenero(valor: unknown): "M" | "F" | "Otro" | undefined {
	if (valor === null || valor === undefined || valor === "") return undefined;
	const str = String(valor).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
	if (["m", "masculino", "male", "hombre"].includes(str)) return "M";
	if (["f", "femenino", "female", "mujer"].includes(str)) return "F";
	if (str) return "Otro";
	return undefined;
}

function resolverNivelId(valorNivel: unknown, niveles: NivelCobertura[]): string {
	if (!niveles.length) return "";
	if (valorNivel === null || valorNivel === undefined || String(valorNivel).trim() === "") {
		return niveles[0].id;
	}
	const str = String(valorNivel).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
	const encontrado = niveles.find((n) => n.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === str);
	return encontrado ? encontrado.id : niveles[0].id;
}

function validarAsegurado(datos: Partial<AseguradoAPVida>): { valido: boolean; errores: string[] } {
	const errores: string[] = [];
	if (!datos.nombre_completo?.trim()) errores.push("Nombre completo es requerido");
	if (!datos.carnet?.trim()) errores.push("Carnet de identidad es requerido");
	return { valido: errores.length === 0, errores };
}

export async function importarAseguradosDesdeExcel(
	archivo: File,
	niveles: NivelCobertura[],
): Promise<AseguradoImportResult> {
	try {
		const arrayBuffer = await archivo.arrayBuffer();
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(arrayBuffer);

		const worksheet = workbook.worksheets[0];
		if (!worksheet) {
			return {
				exito: false,
				asegurados_validos: [],
				errores: [{ fila: 0, errores: ["El archivo no contiene hojas de datos"] }],
			};
		}

		if (worksheet.rowCount < 2) {
			return {
				exito: false,
				asegurados_validos: [],
				errores: [{ fila: 0, errores: ["El archivo debe tener encabezados y al menos una fila de datos"] }],
			};
		}

		const headerRow = worksheet.getRow(1);
		const headers: string[] = [];
		headerRow.eachCell({ includeEmpty: false }, (cell) => {
			headers.push(String(cell.value || ""));
		});

		const mapa = mapearColumnas(headers);

		const columnasFaltantes = ["nombre_completo", "carnet"].filter((col) => mapa[col] === undefined);
		if (columnasFaltantes.length > 0) {
			return {
				exito: false,
				asegurados_validos: [],
				errores: [
					{
						fila: 0,
						errores: [
							`Columnas obligatorias faltantes: ${columnasFaltantes.join(", ")}. Verifique los nombres de las columnas.`,
						],
					},
				],
			};
		}

		const asegurados_validos: AseguradoAPVida[] = [];
		const errores: Array<{ fila: number; errores: string[] }> = [];

		worksheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return;

			const valores: unknown[] = [];
			row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
				valores[colNumber - 1] = cell.value;
			});

			const filaVacia = valores.every((v) => v === null || v === undefined || v === "");
			if (filaVacia) return;

			const parcial: Partial<AseguradoAPVida> = {
				id: crypto.randomUUID(),
				nombre_completo:
					mapa.nombre_completo !== undefined ? convertirAString(valores[mapa.nombre_completo]) || "" : "",
				carnet: mapa.carnet !== undefined ? convertirAString(valores[mapa.carnet]) || "" : "",
				fecha_nacimiento:
					mapa.fecha_nacimiento !== undefined ? parsearFecha(valores[mapa.fecha_nacimiento]) : undefined,
				genero: mapa.genero !== undefined ? parsearGenero(valores[mapa.genero]) : undefined,
				nivel_id: resolverNivelId(mapa.nivel !== undefined ? valores[mapa.nivel] : undefined, niveles),
			};

			const validacion = validarAsegurado(parcial);
			if (validacion.valido) {
				asegurados_validos.push(parcial as AseguradoAPVida);
			} else {
				errores.push({ fila: rowNumber, errores: validacion.errores });
			}
		});

		return { exito: asegurados_validos.length > 0, asegurados_validos, errores };
	} catch (error) {
		console.error("Error procesando Excel:", error);
		return {
			exito: false,
			asegurados_validos: [],
			errores: [
				{
					fila: 0,
					errores: [
						`Error procesando archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
					],
				},
			],
		};
	}
}

export async function generarTemplateAseguradosExcel(niveles: NivelCobertura[]): Promise<void> {
	const nivelesLabel = niveles.length > 0 ? `Nivel (${niveles.map((n) => n.nombre).join(" | ")})` : "Nivel";

	const headers = ["Nombre Completo", "Carnet de Identidad", "Fecha de Nacimiento", "Género", nivelesLabel];

	const ejemploFila = ["Juan Carlos Pérez López", "1234567 LP", "01/01/1990", "M", niveles[0]?.nombre || "Nivel 1"];

	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Asegurados");

	worksheet.addRow(headers);
	worksheet.addRow(ejemploFila);

	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD3D3D3" },
	};

	worksheet.columns.forEach((column) => {
		if (column) column.width = 25;
	});

	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "template_asegurados_accidentes_personales.xlsx";
	link.click();
	window.URL.revokeObjectURL(url);
}
