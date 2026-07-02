// Fuente única para reconstruir el factor de prima neta y el % de comisión
// "efectivos" a partir de los montos ya congelados en la BD (prima_total,
// prima_neta, comision_empresa), en vez de leerlos del producto en vivo.
//
// Motivo: el factor del producto puede cambiar después de emitir la póliza/anexo
// (hoy 20 %, mañana 23 %). La prima neta se congela al calcular
//   prima_neta = prima_total / (1 + factor/100)
// así que el factor realmente usado se recupera exacto:
//   factor = (prima_total / prima_neta − 1) × 100
// y el % de comisión, dado comision_empresa = prima_neta × %:
//   % = comision_empresa / prima_neta × 100
//
// Nota de precisión: prima_neta se guarda a 2 decimales, por lo que el factor
// reconstruido puede diferir mínimamente del nominal del producto (perceptible
// solo en primas muy pequeñas). Los montos no se ven afectados; solo el % mostrado.
//
// Los montos llevan signo (exclusión en negativo); el cociente lo cancela.

/** Factor de prima neta (en %) implícito en prima_total / prima_neta, o null. */
export function derivarFactorPrimaNeta(
	primaTotal: number | null | undefined,
	primaNeta: number | null | undefined,
): number | null {
	if (primaTotal == null || primaNeta == null || primaNeta === 0) return null;
	return (primaTotal / primaNeta - 1) * 100;
}

/** % de comisión implícito en comision_empresa / prima_neta, o null. */
export function derivarPorcentajeComision(
	primaNeta: number | null | undefined,
	comisionEmpresa: number | null | undefined,
): number | null {
	if (primaNeta == null || primaNeta === 0 || comisionEmpresa == null) return null;
	return (comisionEmpresa / primaNeta) * 100;
}
