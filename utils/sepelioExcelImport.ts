// utils/sepelioExcelImport.ts - Importación de asegurados Sepelio desde Excel

import * as ExcelJS from "exceljs";
import type { AseguradoConNivel, SepelioExcelRow, SepelioExcelImportResult, NivelCobertura } from "@/types/poliza";
import { createClient } from "@/utils/supabase/client";

/**
 * Nombres de columnas esperados en el Excel (case-insensitive)
 */
const COLUMNAS_ESPERADAS = {
	ci: ["ci", "c.i.", "carnet", "carnet identidad", "cédula", "cedula", "documento"],
	nivel_nombre: ["nivel", "nivel nombre", "nivel_nombre", "cobertura", "plan"],
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
 * Convierte un valor de celda a string limpio
 */
function convertirAString(valor: unknown): string {
	if (valor === null || valor === undefined) {
		return "";
	}

	return String(valor).trim();
}

/**
 * Parsea un archivo Excel y extrae filas de asegurados
 */
async function parsearExcelAsegurados(archivoBuffer: ArrayBuffer): Promise<SepelioExcelRow[]> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(archivoBuffer);

	const worksheet = workbook.worksheets[0];
	if (!worksheet) {
		throw new Error("El archivo Excel no contiene hojas");
	}

	// Leer encabezados (primera fila)
	const primeraFila = worksheet.getRow(1);
	const headers: string[] = [];
	primeraFila.eachCell({ includeEmpty: true }, (cell) => {
		headers.push(convertirAString(cell.value));
	});

	// Mapear columnas
	const mapaColumnas = mapearColumnas(headers);

	// Verificar columnas requeridas
	if (mapaColumnas.ci === undefined) {
		throw new Error('Columna requerida "CI" no encontrada en el archivo Excel');
	}
	if (mapaColumnas.nivel_nombre === undefined) {
		throw new Error('Columna requerida "Nivel" no encontrada en el archivo Excel');
	}

	// Leer datos (desde fila 2 en adelante)
	const filas: SepelioExcelRow[] = [];
	worksheet.eachRow((row, rowNumber) => {
		// Saltar encabezado
		if (rowNumber === 1) return;

		const valores = row.values as unknown[];

		// Extraer valores
		const ci = convertirAString(valores[mapaColumnas.ci + 1]); // +1 porque row.values es 1-indexed
		const nivel_nombre = convertirAString(valores[mapaColumnas.nivel_nombre + 1]);

		// Solo agregar si tiene datos
		if (ci || nivel_nombre) {
			filas.push({
				ci,
				nivel_nombre,
			});
		}
	});

	return filas;
}

/**
 * Valida y procesa filas de asegurados contra la base de datos
 */
async function validarAsegurados(
	filas: SepelioExcelRow[],
	nivelesConfigurados: NivelCobertura[]
): Promise<SepelioExcelImportResult> {
	const supabase = createClient();
	const asegurados_validos: AseguradoConNivel[] = [];
	const errores: Array<{ fila: number; errores: string[] }> = [];

	// Procesar cada fila
	for (let i = 0; i < filas.length; i++) {
		const fila = filas[i];
		const numeroFila = i + 2; // +2 porque Excel empieza en 1 y saltamos header
		const erroresFila: string[] = [];

		// Validar CI
		if (!fila.ci || fila.ci.trim() === "") {
			erroresFila.push("CI es obligatorio");
		}

		// Validar Nivel
		if (!fila.nivel_nombre || fila.nivel_nombre.trim() === "") {
			erroresFila.push("Nivel es obligatorio");
		}

		// Si hay errores básicos, registrar y continuar
		if (erroresFila.length > 0) {
			errores.push({ fila: numeroFila, errores: erroresFila });
			continue;
		}

		// Buscar cliente por CI en la base de datos
		const { data: clientes, error: errorClientes } = await supabase
			.from("clients")
			.select("id, client_type, natural_persons(primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento), juridic_persons(razon_social, nit)")
			.or(`natural_persons.numero_documento.eq.${fila.ci},juridic_persons.nit.eq.${fila.ci}`)
			.limit(1);

		if (errorClientes) {
			erroresFila.push(`Error al buscar cliente: ${errorClientes.message}`);
			errores.push({ fila: numeroFila, errores: erroresFila });
			continue;
		}

		if (!clientes || clientes.length === 0) {
			erroresFila.push(`Cliente con CI "${fila.ci}" no encontrado en la base de datos`);
			errores.push({ fila: numeroFila, errores: erroresFila });
			continue;
		}

		const cliente = clientes[0];

		// Construir nombre del cliente
		let nombre_completo = "";
		let ci_encontrado = "";

		if (cliente.client_type === "natural" && cliente.natural_persons && cliente.natural_persons.length > 0) {
			const np = cliente.natural_persons[0];
			nombre_completo = `${np.primer_nombre} ${np.segundo_nombre || ""} ${np.primer_apellido} ${np.segundo_apellido || ""}`.trim();
			ci_encontrado = np.numero_documento;
		} else if (cliente.client_type === "juridica" && cliente.juridic_persons && cliente.juridic_persons.length > 0) {
			const jp = cliente.juridic_persons[0];
			nombre_completo = jp.razon_social;
			ci_encontrado = jp.nit;
		}

		// Buscar nivel por nombre (case-insensitive)
		const nivelEncontrado = nivelesConfigurados.find(
			(n) => n.nombre.toLowerCase() === fila.nivel_nombre.toLowerCase()
		);

		if (!nivelEncontrado) {
			erroresFila.push(
				`Nivel "${fila.nivel_nombre}" no encontrado. Niveles disponibles: ${nivelesConfigurados.map((n) => n.nombre).join(", ")}`
			);
			errores.push({ fila: numeroFila, errores: erroresFila });
			continue;
		}

		// Agregar asegurado válido
		asegurados_validos.push({
			client_id: cliente.id,
			client_name: nombre_completo,
			client_ci: ci_encontrado,
			nivel_id: nivelEncontrado.id,
		});
	}

	return {
		exito: errores.length === 0,
		asegurados_validos,
		errores,
	};
}

/**
 * Importa asegurados desde un archivo Excel
 */
export async function importarAseguradosDesdeExcel(
	archivo: File,
	nivelesConfigurados: NivelCobertura[]
): Promise<SepelioExcelImportResult> {
	try {
		// Validar que hay niveles configurados
		if (nivelesConfigurados.length === 0) {
			return {
				exito: false,
				asegurados_validos: [],
				errores: [{ fila: 0, errores: ["Debe configurar al menos un nivel antes de importar asegurados"] }],
			};
		}

		// Leer archivo
		const archivoBuffer = await archivo.arrayBuffer();

		// Parsear Excel
		const filas = await parsearExcelAsegurados(archivoBuffer);

		if (filas.length === 0) {
			return {
				exito: false,
				asegurados_validos: [],
				errores: [{ fila: 0, errores: ["El archivo Excel no contiene datos"] }],
			};
		}

		// Validar asegurados
		const resultado = await validarAsegurados(filas, nivelesConfigurados);

		return resultado;
	} catch (error) {
		return {
			exito: false,
			asegurados_validos: [],
			errores: [
				{
					fila: 0,
					errores: [error instanceof Error ? error.message : "Error desconocido al procesar el archivo"],
				},
			],
		};
	}
}

/**
 * Genera un archivo Excel de plantilla para importar asegurados
 */
export async function generarPlantillaExcel(): Promise<Blob> {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Asegurados Sepelio");

	// Configurar encabezados
	worksheet.columns = [
		{ header: "CI", key: "ci", width: 15 },
		{ header: "Nivel", key: "nivel_nombre", width: 20 },
	];

	// Estilo para encabezados
	worksheet.getRow(1).font = { bold: true };
	worksheet.getRow(1).fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFD3D3D3" },
	};

	// Agregar filas de ejemplo
	worksheet.addRow({
		ci: "1234567",
		nivel_nombre: "Nivel 1",
	});
	worksheet.addRow({
		ci: "7654321",
		nivel_nombre: "Nivel 2",
	});

	// Generar archivo
	const buffer = await workbook.xlsx.writeBuffer();
	return new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
}
