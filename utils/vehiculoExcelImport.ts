// utils/vehiculoExcelImport.ts - Importación de vehículos desde Excel

import * as ExcelJS from "exceljs";
import type { VehiculoAutomotor, VehiculoExcelRow, ExcelImportResult } from "@/types/poliza";
import { validarVehiculoAutomotor } from "./polizaValidation";
import { VEHICULO_RULES } from "./validationConstants";

/**
 * Nombres de columnas esperados en el Excel (case-insensitive)
 */
const COLUMNAS_ESPERADAS = {
	placa: ["placa", "plate", "número placa", "numero placa"],
	valor_asegurado: ["valor asegurado", "valor_asegurado", "valor", "insured value"],
	franquicia: ["franquicia", "deductible", "deducible"],
	nro_chasis: ["nro chasis", "nro_chasis", "numero chasis", "chasis", "chassis"],
	uso: ["uso", "use", "tipo uso"],
	coaseguro: ["coaseguro", "co-seguro", "coinsurance", "porcentaje coaseguro"],
	tipo_vehiculo: ["tipo vehiculo", "tipo_vehiculo", "tipo", "vehicle type"],
	marca: ["marca", "brand"],
	modelo: ["modelo", "model"],
	ano: ["año", "ano", "year"],
	color: ["color", "colour"],
	ejes: ["ejes", "axles", "número ejes"],
	nro_motor: ["nro motor", "nro_motor", "numero motor", "motor"],
	nro_asientos: ["nro asientos", "nro_asientos", "numero asientos", "asientos", "seats"],
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
 * Parsea una fila del Excel a VehiculoAutomotor
 */
function parsearFilaVehiculo(fila: unknown[], mapa: Record<string, number>): Partial<VehiculoAutomotor> {
	const vehiculo: Partial<VehiculoAutomotor> = {};

	// Campos obligatorios
	if (mapa.placa !== undefined) {
		vehiculo.placa = convertirAString(fila[mapa.placa]) || "";
	}

	if (mapa.valor_asegurado !== undefined) {
		vehiculo.valor_asegurado = convertirANumero(fila[mapa.valor_asegurado]) || 0;
	}

	if (mapa.franquicia !== undefined) {
		vehiculo.franquicia = convertirANumero(fila[mapa.franquicia]) || 0;
	}

	if (mapa.nro_chasis !== undefined) {
		vehiculo.nro_chasis = convertirAString(fila[mapa.nro_chasis]) || "";
	}

	if (mapa.uso !== undefined) {
		const usoStr = convertirAString(fila[mapa.uso])?.toLowerCase();
		if (usoStr === "publico" || usoStr === "público" || usoStr === "public") {
			vehiculo.uso = "publico";
		} else if (usoStr === "particular" || usoStr === "private") {
			vehiculo.uso = "particular";
		}
	}

	// NUEVO: Coaseguro (obligatorio)
	if (mapa.coaseguro !== undefined) {
		vehiculo.coaseguro = convertirANumero(fila[mapa.coaseguro]) || 0;
	}

	// Campos opcionales
	if (mapa.tipo_vehiculo !== undefined) {
		vehiculo.tipo_vehiculo_id = convertirAString(fila[mapa.tipo_vehiculo]);
	}

	if (mapa.marca !== undefined) {
		vehiculo.marca_id = convertirAString(fila[mapa.marca]);
	}

	if (mapa.modelo !== undefined) {
		vehiculo.modelo = convertirAString(fila[mapa.modelo]);
	}

	if (mapa.ano !== undefined) {
		const anoNum = convertirANumero(fila[mapa.ano]);
		vehiculo.ano = anoNum !== undefined ? Math.floor(anoNum) : undefined;
	}

	if (mapa.color !== undefined) {
		vehiculo.color = convertirAString(fila[mapa.color]);
	}

	if (mapa.ejes !== undefined) {
		vehiculo.ejes = convertirANumero(fila[mapa.ejes]);
	}

	if (mapa.nro_motor !== undefined) {
		vehiculo.nro_motor = convertirAString(fila[mapa.nro_motor]);
	}

	if (mapa.nro_asientos !== undefined) {
		vehiculo.nro_asientos = convertirANumero(fila[mapa.nro_asientos]);
	}

	if (mapa.plaza_circulacion !== undefined) {
		vehiculo.plaza_circulacion = convertirAString(fila[mapa.plaza_circulacion]);
	}

	return vehiculo;
}

/**
 * Importa vehículos desde un archivo Excel usando ExcelJS
 */
export async function importarVehiculosDesdeExcel(archivo: File): Promise<ExcelImportResult> {
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
				vehiculos_validos: [],
				errores: [{ fila: 0, errores: ["El archivo no contiene hojas de datos"] }],
			};
		}

		// Verificar que hay al menos 2 filas (headers + data)
		if (worksheet.rowCount < 2) {
			return {
				exito: false,
				vehiculos_validos: [],
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
		const columnasObligatorias = ["placa", "valor_asegurado", "franquicia", "nro_chasis", "uso", "coaseguro"];
		const columnasFaltantes = columnasObligatorias.filter((col) => mapa[col] === undefined);

		if (columnasFaltantes.length > 0) {
			return {
				exito: false,
				vehiculos_validos: [],
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

		const vehiculos_validos: VehiculoAutomotor[] = [];
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

			const vehiculoParcial = parsearFilaVehiculo(valores, mapa);

			// Validar vehículo
			const validacion = validarVehiculoAutomotor(vehiculoParcial);

			if (validacion.valido) {
				vehiculos_validos.push(vehiculoParcial as VehiculoAutomotor);
			} else {
				errores.push({
					fila: rowNumber,
					errores: validacion.errores.map((e) => `${e.campo}: ${e.mensaje}`),
				});
			}
		});

		return {
			exito: vehiculos_validos.length > 0,
			vehiculos_validos,
			errores,
		};
	} catch (error) {
		console.error("Error procesando Excel:", error);
		return {
			exito: false,
			vehiculos_validos: [],
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
export async function generarTemplateExcel(): Promise<void> {
	const headers = [
		"Placa",
		"Valor Asegurado",
		"Franquicia",
		"Nro Chasis",
		"Uso",
		"Coaseguro",
		"Tipo Vehiculo",
		"Marca",
		"Modelo",
		"Año",
		"Color",
		"Ejes",
		"Nro Motor",
		"Nro Asientos",
		"Plaza Circulacion",
	];

	const ejemploFila = [
		"ABC-123",
		50000,
		VEHICULO_RULES.FRANQUICIAS_DISPONIBLES[0], // 700 Bs
		"CH123456789",
		VEHICULO_RULES.TIPOS_USO[1], // "particular"
		VEHICULO_RULES.COASEGURO_MIN, // 0%
		"Vagoneta",
		"Toyota",
		"Land Cruiser",
		2020,
		"Blanco",
		2,
		"MOT987654",
		5,
		VEHICULO_RULES.DEPARTAMENTOS_BOLIVIA[0], // "La Paz"
	];

	// Crear workbook con ExcelJS
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Vehículos");

	// Agregar headers
	worksheet.addRow(headers);

	// Agregar fila de ejemplo
	worksheet.addRow(ejemploFila);

	// Aplicar estilos a los headers (opcional pero recomendado)
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
			column.width = 15;
		}
	});

	// Generar buffer y descargar
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "template_vehiculos_automotor.xlsx";
	link.click();
	window.URL.revokeObjectURL(url);
}
