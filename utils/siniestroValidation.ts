// utils/siniestroValidation.ts - Validaciones para módulo de siniestros

import type {
	DetallesSiniestro,
	CoberturasStep,
	ValidacionSiniestro,
	DatosCierreRechazo,
	DatosCierreDeclinacion,
	DatosCierreIndemnizacion,
} from "@/types/siniestro";

/**
 * Validar formato de email
 */
function esEmailValido(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validar que fecha no sea futura
 */
function noEsFechaFutura(fecha: string): boolean {
	const fechaObj = new Date(fecha);
	const hoy = new Date();
	hoy.setHours(0, 0, 0, 0);
	return fechaObj <= hoy;
}

/**
 * Validar detalles del siniestro (Paso 2)
 */
export function validarDetalles(detalles: DetallesSiniestro | null): ValidacionSiniestro {
	const errores: string[] = [];
	const advertencias: string[] = [];

	if (!detalles) {
		return {
			valido: false,
			errores: ["Debe completar los detalles del siniestro"],
			advertencias: [],
		};
	}

	// Validar fecha_siniestro
	if (!detalles.fecha_siniestro) {
		errores.push("La fecha del siniestro es obligatoria");
	} else if (!noEsFechaFutura(detalles.fecha_siniestro)) {
		errores.push("La fecha del siniestro no puede ser futura");
	}

	// Validar fecha_reporte
	if (!detalles.fecha_reporte) {
		errores.push("La fecha de reporte es obligatoria");
	} else if (!noEsFechaFutura(detalles.fecha_reporte)) {
		errores.push("La fecha de reporte no puede ser futura");
	}

	// Validar que fecha_reporte >= fecha_siniestro
	if (detalles.fecha_siniestro && detalles.fecha_reporte) {
		const fechaSiniestro = new Date(detalles.fecha_siniestro);
		const fechaReporte = new Date(detalles.fecha_reporte);

		if (fechaReporte < fechaSiniestro) {
			errores.push("La fecha de reporte no puede ser anterior a la fecha del siniestro");
		}
	}

	// Validar lugar_hecho
	if (!detalles.lugar_hecho || detalles.lugar_hecho.trim().length === 0) {
		errores.push("El lugar del hecho es obligatorio");
	} else if (detalles.lugar_hecho.trim().length < 5) {
		errores.push("El lugar del hecho debe tener al menos 5 caracteres");
	}

	// Validar departamento_id
	if (!detalles.departamento_id) {
		errores.push("Debe seleccionar un departamento");
	}

	// Validar monto_reserva
	if (detalles.monto_reserva === undefined || detalles.monto_reserva === null) {
		errores.push("El monto de reserva es obligatorio");
	} else if (detalles.monto_reserva <= 0) {
		errores.push("El monto de reserva debe ser mayor a 0");
	}

	// Validar moneda
	if (!detalles.moneda) {
		errores.push("Debe seleccionar una moneda");
	}

	// Validar descripción
	if (!detalles.descripcion || detalles.descripcion.trim().length === 0) {
		errores.push("La descripción del siniestro es obligatoria");
	} else if (detalles.descripcion.trim().length < 20) {
		advertencias.push("La descripción es muy corta. Se recomienda incluir más detalles");
	}

	// Validar contactos (emails)
	if (!detalles.contactos || detalles.contactos.length === 0) {
		advertencias.push("No se agregaron contactos. Se recomienda agregar al menos un email de contacto");
	} else {
		const emailsInvalidos = detalles.contactos.filter((email) => !esEmailValido(email));
		if (emailsInvalidos.length > 0) {
			errores.push(`Los siguientes emails son inválidos: ${emailsInvalidos.join(", ")}`);
		}
	}

	return {
		valido: errores.length === 0,
		errores,
		advertencias,
	};
}

/**
 * Validar coberturas seleccionadas (Paso 3)
 */
export function validarCoberturas(coberturas: CoberturasStep | null): ValidacionSiniestro {
	const errores: string[] = [];
	const advertencias: string[] = [];

	if (!coberturas) {
		return {
			valido: false,
			errores: ["Debe seleccionar al menos una cobertura"],
			advertencias: [],
		};
	}

	// Validar que haya al menos una cobertura seleccionada o una custom
	const tieneCoberturas = coberturas.coberturas_seleccionadas.length > 0;
	const tieneCustom = coberturas.nueva_cobertura !== undefined;

	if (!tieneCoberturas && !tieneCustom) {
		errores.push("Debe seleccionar al menos una cobertura del catálogo o agregar una personalizada");
	}

	// Validar cobertura custom si existe
	if (tieneCustom && coberturas.nueva_cobertura) {
		if (!coberturas.nueva_cobertura.nombre || coberturas.nueva_cobertura.nombre.trim().length === 0) {
			errores.push("El nombre de la cobertura personalizada es obligatorio");
		} else if (coberturas.nueva_cobertura.nombre.trim().length < 3) {
			errores.push("El nombre de la cobertura personalizada debe tener al menos 3 caracteres");
		}
	}

	// Advertencia si solo tiene cobertura custom
	if (!tieneCoberturas && tieneCustom) {
		advertencias.push(
			"Solo se agregó una cobertura personalizada. Considere si alguna del catálogo aplica también"
		);
	}

	return {
		valido: errores.length === 0,
		errores,
		advertencias,
	};
}

/**
 * Validar documentos iniciales (Paso 4)
 */
export function validarDocumentosIniciales(documentos: any[]): ValidacionSiniestro {
	const errores: string[] = [];
	const advertencias: string[] = [];

	if (!documentos || documentos.length === 0) {
		advertencias.push(
			"No se agregaron documentos iniciales. Se recomienda subir al menos fotografías o formulario de denuncia"
		);
	}

	// Validar cada documento
	documentos.forEach((doc, index) => {
		if (!doc.tipo_documento) {
			errores.push(`El documento ${index + 1} no tiene tipo especificado`);
		}

		if (!doc.file && !doc.archivo_url) {
			errores.push(`El documento ${index + 1} no tiene archivo asociado`);
		}

		if (doc.file && doc.file.size > 20 * 1024 * 1024) {
			errores.push(`El documento "${doc.nombre_archivo}" excede el tamaño máximo de 20MB`);
		}
	});

	return {
		valido: errores.length === 0,
		errores,
		advertencias,
	};
}

/**
 * Validar formulario completo antes de guardar
 */
export function validarFormularioCompleto(formState: any): ValidacionSiniestro {
	const errores: string[] = [];
	const advertencias: string[] = [];

	// Validar que se haya seleccionado una póliza
	if (!formState.poliza_seleccionada) {
		errores.push("Debe seleccionar una póliza");
	}

	// Validar detalles
	const validacionDetalles = validarDetalles(formState.detalles);
	errores.push(...validacionDetalles.errores);
	advertencias.push(...validacionDetalles.advertencias);

	// Validar coberturas
	const validacionCoberturas = validarCoberturas(formState.coberturas);
	errores.push(...validacionCoberturas.errores);
	advertencias.push(...validacionCoberturas.advertencias);

	// Validar documentos
	const validacionDocumentos = validarDocumentosIniciales(formState.documentos_iniciales || []);
	errores.push(...validacionDocumentos.errores);
	advertencias.push(...validacionDocumentos.advertencias);

	return {
		valido: errores.length === 0,
		errores,
		advertencias,
	};
}

/**
 * Validar cierre por rechazo
 */
export function validarCierreRechazo(datos: DatosCierreRechazo): ValidacionSiniestro {
	const errores: string[] = [];
	const advertencias: string[] = [];

	if (!datos.motivo_rechazo) {
		errores.push("Debe seleccionar un motivo de rechazo");
	}

	if (!datos.carta_rechazo) {
		errores.push("Debe adjuntar la carta de rechazo");
	} else if (!datos.carta_rechazo.file && !datos.carta_rechazo.archivo_url) {
		errores.push("La carta de rechazo no tiene archivo asociado");
	}

	return {
		valido: errores.length === 0,
		errores,
		advertencias,
	};
}

/**
 * Validar cierre por declinación
 */
export function validarCierreDeclinacion(datos: DatosCierreDeclinacion): ValidacionSiniestro {
	const errores: string[] = [];
	const advertencias: string[] = [];

	if (!datos.motivo_declinacion) {
		errores.push("Debe seleccionar un motivo de declinación");
	}

	if (!datos.carta_respaldo) {
		errores.push("Debe adjuntar la carta de respaldo");
	} else if (!datos.carta_respaldo.file && !datos.carta_respaldo.archivo_url) {
		errores.push("La carta de respaldo no tiene archivo asociado");
	}

	return {
		valido: errores.length === 0,
		errores,
		advertencias,
	};
}

/**
 * Validar cierre por indemnización
 */
export function validarCierreIndemnizacion(datos: DatosCierreIndemnizacion): ValidacionSiniestro {
	const errores: string[] = [];
	const advertencias: string[] = [];

	// Validar archivos obligatorios
	if (!datos.archivo_uif) {
		errores.push("Debe adjuntar el archivo UIF");
	} else if (!datos.archivo_uif.file && !datos.archivo_uif.archivo_url) {
		errores.push("El archivo UIF no tiene archivo asociado");
	}

	if (!datos.archivo_pep) {
		errores.push("Debe adjuntar el archivo PEP");
	} else if (!datos.archivo_pep.file && !datos.archivo_pep.archivo_url) {
		errores.push("El archivo PEP no tiene archivo asociado");
	}

	// Validar montos
	if (datos.monto_reclamado === undefined || datos.monto_reclamado === null) {
		errores.push("El monto reclamado es obligatorio");
	} else if (datos.monto_reclamado <= 0) {
		errores.push("El monto reclamado debe ser mayor a 0");
	}

	if (datos.deducible === undefined || datos.deducible === null) {
		errores.push("El deducible es obligatorio");
	} else if (datos.deducible < 0) {
		errores.push("El deducible no puede ser negativo");
	}

	if (datos.monto_pagado === undefined || datos.monto_pagado === null) {
		errores.push("El monto pagado es obligatorio");
	} else if (datos.monto_pagado <= 0) {
		errores.push("El monto pagado debe ser mayor a 0");
	}

	// Validar monedas
	if (!datos.moneda_reclamado) {
		errores.push("Debe especificar la moneda del monto reclamado");
	}

	if (!datos.moneda_deducible) {
		errores.push("Debe especificar la moneda del deducible");
	}

	if (!datos.moneda_pagado) {
		errores.push("Debe especificar la moneda del monto pagado");
	}

	// Advertencias
	if (
		datos.monto_pagado !== undefined &&
		datos.monto_reclamado !== undefined &&
		datos.monto_pagado > datos.monto_reclamado
	) {
		advertencias.push("El monto pagado es mayor al monto reclamado. Verifique los valores ingresados");
	}

	if (datos.deducible !== undefined && datos.monto_reclamado !== undefined) {
		const montoNeto = datos.monto_reclamado - datos.deducible;
		if (datos.monto_pagado !== undefined && Math.abs(datos.monto_pagado - montoNeto) > 0.01) {
			advertencias.push(
				`El monto pagado (${datos.monto_pagado}) no coincide con el monto neto esperado (${montoNeto.toFixed(2)} = reclamado - deducible). Verifique los cálculos`
			);
		}
	}

	return {
		valido: errores.length === 0,
		errores,
		advertencias,
	};
}
