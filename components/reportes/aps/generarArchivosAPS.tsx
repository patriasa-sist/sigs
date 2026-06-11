import { pdf } from "@react-pdf/renderer";
import JSZip from "jszip";
import type { APSDatos, APSRegistro } from "@/app/reportes/actions-aps";
import { type ModoAPS, calcularGeneral } from "./apsShared";
import { ProduccionAPSPdf } from "./ProduccionAPSPdf";
import { buildMatrizAPSExcel, type CampoMatriz } from "./apsExcel";

const MODO_ARCHIVO: Record<ModoAPS, string> = {
	ingreso: "Ingreso",
	egreso: "Egreso",
	general: "General",
};

/**
 * Genera los 9 reportes APS (3 PDF de producción + 3 Excel de comisión +
 * 3 Excel de prima neta, en variantes Ingreso/Egreso/General) y los
 * empaqueta en un ZIP. Módulo pensado para importarse dinámicamente:
 * concentra las dependencias pesadas (react-pdf, exceljs, jszip).
 */
export async function generarArchivosAPS(opts: {
	datos: APSDatos;
	fechaDesde: string;
	fechaHasta: string;
}): Promise<Blob> {
	const { datos, fechaDesde, fechaHasta } = opts;

	const generadoEl = new Date().toLocaleString("es-BO", {
		timeZone: "America/La_Paz",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const porModo: Record<ModoAPS, APSRegistro[]> = {
		ingreso: datos.ingreso,
		egreso: datos.egreso,
		general: calcularGeneral(datos.ingreso, datos.egreso),
	};
	const modos: ModoAPS[] = ["ingreso", "egreso", "general"];
	const campos: CampoMatriz[] = ["comision", "prima_neta"];

	const zip = new JSZip();

	for (const modo of modos) {
		const registros = porModo[modo];

		const pdfBlob = await pdf(
			<ProduccionAPSPdf
				modo={modo}
				fechaDesde={fechaDesde}
				fechaHasta={fechaHasta}
				generadoEl={generadoEl}
				registros={registros}
			/>,
		).toBlob();
		zip.file(`Produccion_${MODO_ARCHIVO[modo]}.pdf`, pdfBlob);

		for (const campo of campos) {
			const buffer = await buildMatrizAPSExcel({
				campo,
				modo,
				registros,
				fechaDesde,
				fechaHasta,
				generadoEl,
			});
			const nombreCampo = campo === "comision" ? "Comision" : "PrimaNeta";
			zip.file(`${nombreCampo}_${MODO_ARCHIVO[modo]}.xlsx`, buffer);
		}
	}

	return await zip.generateAsync({ type: "blob" });
}
