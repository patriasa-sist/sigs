// utils/polizaValidation.ts - Funciones de validación para pólizas

import type {
	DatosBasicosPoliza,
	VehiculoAutomotor,
	ModalidadPago,
	ValidationError,
	ValidationResult,
	DocumentoPoliza,
} from "@/types/poliza";

/**
 * Valida los datos básicos de una póliza (Paso 2)
 */
export function validarDatosBasicos(datos: Partial<DatosBasicosPoliza>): ValidationResult {
	const errores: ValidationError[] = [];

	// Validar número de póliza
	if (!datos.numero_poliza || datos.numero_poliza.trim() === "") {
		errores.push({ campo: "numero_poliza", mensaje: "Número de póliza es requerido" });
	}

	// Validar compañía aseguradora
	if (!datos.compania_aseguradora_id) {
		errores.push({ campo: "compania_aseguradora_id", mensaje: "Compañía aseguradora es requerida" });
	}

	// Validar ramo
	if (!datos.ramo || datos.ramo.trim() === "") {
		errores.push({ campo: "ramo", mensaje: "Ramo es requerido" });
	}

	// Validar fechas
	if (!datos.inicio_vigencia) {
		errores.push({ campo: "inicio_vigencia", mensaje: "Fecha de inicio de vigencia es requerida" });
	}

	if (!datos.fin_vigencia) {
		errores.push({ campo: "fin_vigencia", mensaje: "Fecha de fin de vigencia es requerida" });
	}

	if (!datos.fecha_emision_compania) {
		errores.push({ campo: "fecha_emision_compania", mensaje: "Fecha de emisión es requerida" });
	}

	// Validar que fin_vigencia > inicio_vigencia
	if (datos.inicio_vigencia && datos.fin_vigencia) {
		const inicio = new Date(datos.inicio_vigencia);
		const fin = new Date(datos.fin_vigencia);

		if (fin <= inicio) {
			errores.push({
				campo: "fin_vigencia",
				mensaje: "Fecha de fin debe ser posterior a la fecha de inicio",
			});
		}
	}

	// Validar que fecha_emision <= inicio_vigencia
	if (datos.fecha_emision_compania && datos.inicio_vigencia) {
		const emision = new Date(datos.fecha_emision_compania);
		const inicio = new Date(datos.inicio_vigencia);

		if (emision > inicio) {
			errores.push({
				campo: "fecha_emision_compania",
				mensaje: "Fecha de emisión no puede ser posterior a inicio de vigencia",
			});
		}
	}

	// Validar responsable
	if (!datos.responsable_id) {
		errores.push({ campo: "responsable_id", mensaje: "Ejecutivo comercial es requerido" });
	}

	// Validar regional
	if (!datos.regional_id) {
		errores.push({ campo: "regional_id", mensaje: "Regional es requerida" });
	}

	// Validar categoría
	if (!datos.categoria_id) {
		errores.push({ campo: "categoria_id", mensaje: "Categoría es requerida" });
	}

	return {
		valido: errores.length === 0,
		errores,
	};
}

/**
 * Valida un vehículo automotor (Paso 3)
 */
export function validarVehiculoAutomotor(vehiculo: Partial<VehiculoAutomotor>): ValidationResult {
	const errores: ValidationError[] = [];

	// Campos obligatorios
	if (!vehiculo.placa || vehiculo.placa.trim() === "") {
		errores.push({ campo: "placa", mensaje: "Placa es requerida" });
	}

	if (!vehiculo.valor_asegurado || vehiculo.valor_asegurado <= 0) {
		errores.push({ campo: "valor_asegurado", mensaje: "Valor asegurado debe ser mayor a 0" });
	}

	if (vehiculo.franquicia === undefined || vehiculo.franquicia === null || vehiculo.franquicia < 0) {
		errores.push({ campo: "franquicia", mensaje: "Franquicia debe ser mayor o igual a 0" });
	}

	if (!vehiculo.nro_chasis || vehiculo.nro_chasis.trim() === "") {
		errores.push({ campo: "nro_chasis", mensaje: "Número de chasis es requerido" });
	}

	if (!vehiculo.uso || (vehiculo.uso !== "publico" && vehiculo.uso !== "particular")) {
		errores.push({ campo: "uso", mensaje: "Uso debe ser 'público' o 'particular'" });
	}

	// Validaciones opcionales
	if (vehiculo.ejes !== undefined && vehiculo.ejes !== null && vehiculo.ejes <= 0) {
		errores.push({ campo: "ejes", mensaje: "Número de ejes debe ser mayor a 0" });
	}

	if (vehiculo.nro_asientos !== undefined && vehiculo.nro_asientos !== null && vehiculo.nro_asientos <= 0) {
		errores.push({ campo: "nro_asientos", mensaje: "Número de asientos debe ser mayor a 0" });
	}

	return {
		valido: errores.length === 0,
		errores,
	};
}

/**
 * Valida que no haya placas duplicadas en una lista de vehículos
 */
export function validarPlacasUnicas(vehiculos: VehiculoAutomotor[]): ValidationResult {
	const errores: ValidationError[] = [];
	const placasVistas = new Set<string>();

	vehiculos.forEach((vehiculo, index) => {
		const placa = vehiculo.placa.toUpperCase().trim();

		if (placasVistas.has(placa)) {
			errores.push({
				campo: `vehiculo_${index}_placa`,
				mensaje: `Placa duplicada: ${placa}`,
			});
		}

		placasVistas.add(placa);
	});

	return {
		valido: errores.length === 0,
		errores,
	};
}

/**
 * Valida modalidad de pago (Paso 4)
 */
export function validarModalidadPago(pago: Partial<ModalidadPago>): ValidationResult {
	const errores: ValidationError[] = [];

	if (!pago.tipo) {
		errores.push({ campo: "tipo", mensaje: "Tipo de pago es requerido" });
		return { valido: false, errores };
	}

	// Validar prima total
	if (!pago.prima_total || pago.prima_total <= 0) {
		errores.push({ campo: "prima_total", mensaje: "Prima total debe ser mayor a 0" });
	}

	// Validar moneda
	if (!pago.moneda || !["Bs", "USD", "USDT", "UFV"].includes(pago.moneda)) {
		errores.push({ campo: "moneda", mensaje: "Moneda inválida" });
	}

	if (pago.tipo === "contado") {
		if (!pago.cuota_unica || pago.cuota_unica <= 0) {
			errores.push({ campo: "cuota_unica", mensaje: "Cuota única debe ser mayor a 0" });
		}

		if (!pago.fecha_pago_unico) {
			errores.push({ campo: "fecha_pago_unico", mensaje: "Fecha de pago es requerida" });
		}

		// Validar que cuota única coincida con prima total
		if (pago.cuota_unica && pago.prima_total && Math.abs(pago.cuota_unica - pago.prima_total) > 0.01) {
			errores.push({
				campo: "cuota_unica",
				mensaje: "Cuota única debe ser igual a prima total",
			});
		}
	} else if (pago.tipo === "credito") {
		if (!pago.cantidad_cuotas || pago.cantidad_cuotas <= 0) {
			errores.push({ campo: "cantidad_cuotas", mensaje: "Cantidad de cuotas debe ser mayor a 0" });
		}

		if (pago.cuota_inicial === undefined || pago.cuota_inicial === null || pago.cuota_inicial < 0) {
			errores.push({ campo: "cuota_inicial", mensaje: "Cuota inicial debe ser mayor o igual a 0" });
		}

		if (!pago.cuotas || pago.cuotas.length === 0) {
			errores.push({ campo: "cuotas", mensaje: "Debe tener al menos una cuota" });
		}

		// Validar que las cuotas tengan fechas
		if (pago.cuotas) {
			pago.cuotas.forEach((cuota, index) => {
				if (!cuota.fecha_vencimiento) {
					errores.push({
						campo: `cuota_${index}_fecha`,
						mensaje: `Cuota ${cuota.numero} requiere fecha de vencimiento`,
					});
				}
			});
		}

		// Validar suma de cuotas
		if (pago.cuotas && pago.cuota_inicial !== undefined && pago.prima_total) {
			const sumaCuotas = pago.cuotas.reduce((sum, cuota) => sum + cuota.monto, 0);
			const totalEsperado = pago.prima_total;
			const totalCalculado = pago.cuota_inicial + sumaCuotas;

			if (Math.abs(totalCalculado - totalEsperado) > 0.01) {
				errores.push({
					campo: "cuotas",
					mensaje: `La suma de cuotas (${totalCalculado.toFixed(
						2
					)}) no coincide con prima total (${totalEsperado.toFixed(2)})`,
				});
			}
		}
	}

	return {
		valido: errores.length === 0,
		errores,
	};
}

/**
 * Valida fechas de pago que no sean anteriores a la fecha actual
 */
export function validarFechasPago(pago: ModalidadPago): ValidationResult {
	const errores: ValidationError[] = [];
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);

	if (pago.tipo === "contado") {
		const fechaPago = new Date(pago.fecha_pago_unico);
		fechaPago.setHours(0, 0, 0, 0);

		if (fechaPago < hoy) {
			errores.push({
				campo: "fecha_pago_unico",
				mensaje: "Fecha de pago no puede ser anterior a hoy",
			});
		}
	} else if (pago.tipo === "credito") {
		pago.cuotas.forEach((cuota, index) => {
			const fechaCuota = new Date(cuota.fecha_vencimiento);
			fechaCuota.setHours(0, 0, 0, 0);

			if (fechaCuota < hoy) {
				errores.push({
					campo: `cuota_${index}_fecha`,
					mensaje: `Cuota ${cuota.numero}: fecha no puede ser anterior a hoy`,
				});
			}
		});
	}

	return {
		valido: errores.length === 0,
		errores,
	};
}

/**
 * Calcula prima neta y comisión
 */
export function calcularPrimaNetaYComision(prima_total: number): { prima_neta: number; comision: number } {
	const prima_neta = prima_total * 0.87;
	const comision = prima_neta * 0.02;

	return {
		prima_neta: Math.round(prima_neta * 100) / 100, // Redondear a 2 decimales
		comision: Math.round(comision * 100) / 100,
	};
}

/**
 * Calcula cuotas equitativas para crédito
 */
export function calcularCuotasEquitativas(prima_total: number, cuota_inicial: number, cantidad_cuotas: number): number {
	const resto = prima_total - cuota_inicial;
	const montoCuota = resto / cantidad_cuotas;

	return Math.round(montoCuota * 100) / 100; // Redondear a 2 decimales
}

/**
 * Genera advertencias para campos opcionales vacíos
 */
export function generarAdvertenciasVehiculo(vehiculo: VehiculoAutomotor): string[] {
	const advertencias: string[] = [];

	if (!vehiculo.tipo_vehiculo_id) {
		advertencias.push(`Vehículo ${vehiculo.placa}: Tipo de vehículo no especificado`);
	}

	if (!vehiculo.marca_id) {
		advertencias.push(`Vehículo ${vehiculo.placa}: Marca no especificada`);
	}

	if (!vehiculo.modelo) {
		advertencias.push(`Vehículo ${vehiculo.placa}: Modelo no especificado`);
	}

	if (!vehiculo.ano) {
		advertencias.push(`Vehículo ${vehiculo.placa}: Año no especificado`);
	}

	return advertencias;
}

/**
 * Valida documentos mínimos requeridos
 */
export function validarDocumentosMinimos(documentos: DocumentoPoliza[]): ValidationResult {
	const errores: ValidationError[] = [];

	// Opcional: agregar validación de documentos mínimos requeridos
	// Por ahora, solo validamos que al menos haya uno
	if (documentos.length === 0) {
		errores.push({
			campo: "documentos",
			mensaje: "Se recomienda cargar al menos un documento",
		});
	}

	return {
		valido: true, // No es error crítico
		errores,
	};
}
