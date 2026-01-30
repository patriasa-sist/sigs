// utils/equipoExcelImport.ts - Importación de equipos industriales desde Excel

import * as ExcelJS from "exceljs";
import type { EquipoIndustrial, EquipoExcelImportResult } from "@/types/poliza";
import { EQUIPO_RULES } from "./validationConstants";

/**
 * Nombres de columnas esperados en el Excel (case-insensitive)
 */
const COLUMNAS_ESPERADAS = {
	nro_serie: ["nro serie", "nro_serie", "numero serie", "serial", "serie", "número serie"],
	valor_asegurado: ["valor asegurado", "valor_asegurado", "valor", "insured value"],
	franquicia: ["franquicia", "deductible", "deducible"],
	nro_chasis: ["nro chasis", "nro_chasis", "numero chasis", "chasis", "chassis"],
	uso: ["uso", "use", "tipo uso"],
	coaseguro: ["coaseguro", "co-seguro", "coinsurance", "porcentaje coaseguro"],
	placa: ["placa", "plate", "número placa", "numero placa"], // Opcional
	tipo_equipo: ["tipo equipo", "tipo_equipo", "tipo", "equipment type"],
	marca_equipo: ["marca", "marca equipo", "marca_equipo", "brand"],
	modelo: ["modelo", "model"],
	ano: ["año", "ano", "year"],
	color: ["color", "colour"],
	nro_motor: ["nro motor", "nro_motor", "numero motor", "motor"],
	plaza_circulacion: ["plaza circulacion", "plaza_circulacion", "plaza"],
};

/**
 * Normaliza el nombre de una columna para matching
 */
function normalizarNombreColumna(nombre: string): string {
	return nombre
		.toLowerCase()
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos
}

/**
 * Mapea columnas del Excel a nuestros campos
 */
function mapearColumnas(headers: string[]): Record<string, number> {
	const mapa: Record<string, number> = {};

	headers.forEach((header, index) => {
		const headerNormalizado = normalizarNombreColumna(header);

		// Buscar match en columnas esperadas
		Object.entries(COLUMNAS_ESPERADAS).forEach(([campo, variantes]) => {
			if (variantes.some((variante) => normalizarNombreColumna(variante) === headerNormalizado)) {
				mapa[campo] = index;
			}
		});
	});

	return mapa;
}

/**
 * Convierte un valor de celda a número
 */
function convertirANumero(valor: unknown): number | undefined {
	if (valor === null || valor === undefined || valor === "") {
		return undefined;
	}

	if (typeof valor === "number") {
		return valor;
	}

	if (typeof valor === "string") {
		// Limpiar formato de moneda/número
		const limpio = valor.replace(/[^0-9.-]/g, "");
		const numero = parseFloat(limpio);
		return isNaN(numero) ? undefined : numero;
	}

	return undefined;
}

/**
 * Convierte un valor de celda a string
 */
function convertirAString(valor: unknown): string | undefined {
	if (valor === null || valor === undefined) {
		return undefined;
	}

	return String(valor).trim() || undefined;
}

/**
 * Parsea una fila del Excel a EquipoIndustrial
 */
function parsearFilaEquipo(fila: unknown[], mapa: Record<string, number>): Partial<EquipoIndustrial> {
	const equipo: Partial<EquipoIndustrial> = {};

	// Campos obligatorios
	if (mapa.nro_serie !== undefined) {
		equipo.nro_serie = convertirAString(fila[mapa.nro_serie]) || "";
	}

	if (mapa.valor_asegurado !== undefined) {
		equipo.valor_asegurado = convertirANumero(fila[mapa.valor_asegurado]) || 0;
	}

	if (mapa.franquicia !== undefined) {
		equipo.franquicia = convertirANumero(fila[mapa.franquicia]) || 0;
	}

	if (mapa.nro_chasis !== undefined) {
		equipo.nro_chasis = convertirAString(fila[mapa.nro_chasis]) || "";
	}

	if (mapa.uso !== undefined) {
		const usoStr = convertirAString(fila[mapa.uso])?.toLowerCase();
		if (usoStr === "publico" || usoStr === "público" || usoStr === "public") {
			equipo.uso = "publico";
		} else if (usoStr === "particular" || usoStr === "private") {
			equipo.uso = "particular";
		}
	}

	if (mapa.coaseguro !== undefined) {
		equipo.coaseguro = convertirANumero(fila[mapa.coaseguro]) || 0;
	}

	// Campos opcionales
	if (mapa.placa !== undefined) {
		equipo.placa = convertirAString(fila[mapa.placa]);
	}

	if (mapa.tipo_equipo !== undefined) {
		equipo.tipo_equipo_id = convertirAString(fila[mapa.tipo_equipo]);
	}

	if (mapa.marca_equipo !== undefined) {
		equipo.marca_equipo_id = convertirAString(fila[mapa.marca_equipo]);
	}

	if (mapa.modelo !== undefined) {
		equipo.modelo = convertirAString(fila[mapa.modelo]);
	}

	if (mapa.ano !== undefined) {
		const anoNum = convertirANumero(fila[mapa.ano]);
		equipo.ano = anoNum !== undefined ? Math.floor(anoNum) : undefined;
	}

	if (mapa.color !== undefined) {
		equipo.color = convertirAString(fila[mapa.color]);
	}

	if (mapa.nro_motor !== undefined) {
		equipo.nro_motor = convertirAString(fila[mapa.nro_motor]);
	}

	if (mapa.plaza_circulacion !== undefined) {
		equipo.plaza_circulacion = convertirAString(fila[mapa.plaza_circulacion]);
	}

	return equipo;
}

/**
 * Valida un equipo industrial
 */
function validarEquipoIndustrial(equipo: Partial<EquipoIndustrial>): { valido: boolean; errores: Array<{ campo: string; mensaje: string }> } {
	const errores: Array<{ campo: string; mensaje: string }> = [];

	// Campos obligatorios
	if (!equipo.nro_serie?.trim()) {
		errores.push({ campo: "nro_serie", mensaje: "El número de serie es requerido" });
	}

	if (!equipo.nro_chasis?.trim()) {
		errores.push({ campo: "nro_chasis", mensaje: "El número de chasis es requerido" });
	}

	if (equipo.valor_asegurado === undefined || equipo.valor_asegurado <= 0) {
		errores.push({ campo: "valor_asegurado", mensaje: "El valor asegurado debe ser mayor a 0" });
	}

	if (equipo.franquicia === undefined || equipo.franquicia < 0) {
		errores.push({ campo: "franquicia", mensaje: "La franquicia debe ser 0 o mayor" });
	}

	if (!equipo.uso) {
		errores.push({ campo: "uso", mensaje: "El uso es requerido" });
	}

	if (equipo.coaseguro === undefined || equipo.coaseguro < EQUIPO_RULES.COASEGURO_MIN || equipo.coaseguro > EQUIPO_RULES.COASEGURO_MAX) {
		errores.push({ campo: "coaseguro", mensaje: `El coaseguro debe estar entre ${EQUIPO_RULES.COASEGURO_MIN} y ${EQUIPO_RULES.COASEGURO_MAX}%` });
	}

	// Validaciones opcionales
	if (equipo.ano !== undefined && equipo.ano !== null) {
		if (equipo.ano < EQUIPO_RULES.ANO_MIN || equipo.ano > EQUIPO_RULES.ANO_MAX) {
			errores.push({ campo: "ano", mensaje: `El año debe estar entre ${EQUIPO_RULES.ANO_MIN} y ${EQUIPO_RULES.ANO_MAX}` });
		}
	}

	return {
		valido: errores.length === 0,
		errores,
	};
}

/**
 * Importa equipos industriales desde un archivo Excel usando ExcelJS
 */
export async function importarEquiposDesdeExcel(archivo: File): Promise<EquipoExcelImportResult> {
	try {
		// Convertir File a ArrayBuffer
		const arrayBuffer = await archivo.arrayBuffer();

		// Crear workbook con ExcelJS
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(arrayBuffer);

		// Obtener la primera hoja
		const worksheet = workbook.worksheets[0];

		if (!worksheet) {
			return {
				exito: false,
				equipos_validos: [],
				errores: [{ fila: 0, errores: ["El archivo no contiene hojas de datos"] }],
			};
		}

		// Verificar que hay al menos 2 filas (headers + data)
		if (worksheet.rowCount < 2) {
			return {
				exito: false,
				equipos_validos: [],
				errores: [{ fila: 0, errores: ["El archivo debe tener al menos una fila de encabezados y una de datos"] }],
			};
		}

		// Obtener headers de la primera fila
		const headerRow = worksheet.getRow(1);
		const headers: string[] = [];

		// ExcelJS: las celdas empiezan en índice 1, no 0
		headerRow.eachCell({ includeEmpty: false }, (cell) => {
			headers.push(String(cell.value || ""));
		});

		// Mapear columnas
		const mapa = mapearColumnas(headers);

		// Validar que se mapearon las columnas obligatorias
		const columnasObligatorias = ["nro_serie", "valor_asegurado", "franquicia", "nro_chasis", "uso", "coaseguro"];
		const columnasFaltantes = columnasObligatorias.filter((col) => mapa[col] === undefined);

		if (columnasFaltantes.length > 0) {
			return {
				exito: false,
				equipos_validos: [],
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

		const equipos_validos: EquipoIndustrial[] = [];
		const errores: Array<{ fila: number; errores: string[] }> = [];

		// Procesar filas de datos (desde la segunda fila)
		worksheet.eachRow((row, rowNumber) => {
			// Saltar la fila de headers
			if (rowNumber === 1) return;

			// Convertir row a array de valores
			const valores: unknown[] = [];
			row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
				// Guardar el valor en el índice correcto (colNumber - 1 porque array empieza en 0)
				valores[colNumber - 1] = cell.value;
			});

			// Ignorar filas completamente vacías
			const filaVacia = valores.every((celda) => celda === null || celda === undefined || celda === "");
			if (filaVacia) {
				return;
			}

			const equipoParcial = parsearFilaEquipo(valores, mapa);

			// Validar equipo
			const validacion = validarEquipoIndustrial(equipoParcial);

			if (validacion.valido) {
				equipos_validos.push(equipoParcial as EquipoIndustrial);
			} else {
				errores.push({
					fila: rowNumber,
					errores: validacion.errores.map((e) => `${e.campo}: ${e.mensaje}`),
				});
			}
		});

		return {
			exito: equipos_validos.length > 0,
			equipos_validos,
			errores,
		};
	} catch (error) {
		console.error("Error procesando Excel:", error);
		return {
			exito: false,
			equipos_validos: [],
			errores: [
				{
					fila: 0,
					errores: [`Error procesando archivo: ${error instanceof Error ? error.message : "Error desconocido"}`],
				},
			],
		};
	}
}

/**
 * Genera un template de Excel con las columnas esperadas usando ExcelJS
 */
export async function generarTemplateEquiposExcel(): Promise<void> {
	const headers = [
		"Nro Serie",
		"Valor Asegurado",
		"Franquicia",
		"Nro Chasis",
		"Uso",
		"Coaseguro",
		"Placa",
		"Tipo Equipo",
		"Marca",
		"Modelo",
		"Año",
		"Color",
		"Nro Motor",
		"Plaza Circulacion",
	];

	const ejemploFila = [
		"SN123456789",
		150000,
		1500,
		"CH987654321",
		EQUIPO_RULES.TIPOS_USO[1], // "particular"
		EQUIPO_RULES.COASEGURO_MIN, // 0%
		"", // Placa opcional
		"Excavadora",
		"Caterpillar",
		"320D",
		2020,
		"Amarillo",
		"MOT123456",
		EQUIPO_RULES.DEPARTAMENTOS_BOLIVIA[0], // "La Paz"
	];

	// Crear workbook con ExcelJS
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Equipos Industriales");

	// Agregar headers
	worksheet.addRow(headers);

	// Agregar fila de ejemplo
	worksheet.addRow(ejemploFila);

	// Aplicar estilos a los headers
	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD3D3D3" },
	};

	// Auto-ajustar ancho de columnas
	worksheet.columns.forEach((column) => {
		if (column) {
			column.width = 18;
		}
	});

	// Generar buffer y descargar
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "template_equipos_ramos_tecnicos.xlsx";
	link.click();
	window.URL.revokeObjectURL(url);
}
