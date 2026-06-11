import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { APSRegistro } from "@/app/reportes/actions-aps";
import {
	type ModoAPS,
	type CompaniaAPS,
	companiasDe,
	ordenarRegistros,
	formatMonto,
	formatFechaCorta,
} from "./apsShared";

const MODO_TITULOS: Record<ModoAPS, string> = {
	ingreso: "Producción Ingreso",
	egreso: "Producción Egreso",
	general: "Producción General",
};

const COL_MONTO_WIDTH = 75;

const styles = StyleSheet.create({
	page: {
		flexDirection: "column",
		backgroundColor: "#ffffff",
		paddingTop: 30,
		paddingHorizontal: 30,
		paddingBottom: 40,
		fontFamily: "Helvetica",
		fontSize: 7.5,
		color: "#000000",
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	titulo: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		textAlign: "center",
		flexGrow: 1,
	},
	metaBox: {
		width: 140,
		fontSize: 7.5,
	},
	metaLinea: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 2,
	},
	rangoFechas: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 24,
		marginBottom: 10,
	},
	separador: {
		borderBottomWidth: 1.5,
		borderBottomColor: "#000000",
		marginBottom: 10,
	},
	companiaHeader: {
		backgroundColor: "#d9d9d9",
		paddingVertical: 3,
		paddingHorizontal: 6,
		marginTop: 8,
		fontFamily: "Helvetica-Bold",
		fontSize: 8.5,
	},
	tablaHeader: {
		flexDirection: "row",
		backgroundColor: "#efefef",
		paddingVertical: 3,
		paddingHorizontal: 6,
		fontFamily: "Helvetica-Bold",
		borderBottomWidth: 0.5,
		borderBottomColor: "#999999",
	},
	fila: {
		flexDirection: "row",
		paddingVertical: 2.5,
		paddingHorizontal: 6,
		borderBottomWidth: 0.5,
		borderBottomColor: "#e3e3e3",
	},
	filaSubtotal: {
		flexDirection: "row",
		paddingVertical: 3,
		paddingHorizontal: 6,
		borderTopWidth: 1,
		borderTopColor: "#000000",
		fontFamily: "Helvetica-Bold",
	},
	filaTotalGeneral: {
		flexDirection: "row",
		paddingVertical: 4,
		paddingHorizontal: 6,
		marginTop: 14,
		borderTopWidth: 1.5,
		borderBottomWidth: 1.5,
		borderColor: "#000000",
		fontFamily: "Helvetica-Bold",
		fontSize: 8.5,
	},
	colRiesgo: {
		flexGrow: 1,
		paddingRight: 6,
	},
	colMonto: {
		width: COL_MONTO_WIDTH,
		textAlign: "right",
	},
	pieDePagina: {
		position: "absolute",
		bottom: 18,
		right: 30,
		fontSize: 7,
		color: "#555555",
	},
});

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

function FilaMontos({ totales }: { totales: Totales }) {
	return (
		<>
			<Text style={styles.colMonto}>{formatMonto(totales.prima_total)}</Text>
			<Text style={styles.colMonto}>{formatMonto(totales.prima_neta)}</Text>
			<Text style={styles.colMonto}>{formatMonto(totales.comision)}</Text>
		</>
	);
}

export type ProduccionAPSPdfProps = {
	modo: ModoAPS;
	fechaDesde: string; // YYYY-MM-DD
	fechaHasta: string; // YYYY-MM-DD
	generadoEl: string; // ya formateado para mostrar
	registros: APSRegistro[];
};

export function ProduccionAPSPdf({ modo, fechaDesde, fechaHasta, generadoEl, registros }: ProduccionAPSPdfProps) {
	const companias = companiasDe(registros);
	const ordenados = ordenarRegistros(registros);
	const totalGeneral = sumar(ordenados);

	const seccionesPorCompania = companias.map((compania: CompaniaAPS) => {
		const filas = ordenados.filter((r) => r.compania_nombre === compania.nombre);
		return { compania, filas, subtotal: sumar(filas) };
	});

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.headerRow}>
					<View style={styles.metaBox} />
					<Text style={styles.titulo}>{MODO_TITULOS[modo]}</Text>
					<View style={styles.metaBox}>
						<View style={styles.metaLinea}>
							<Text>Fecha:</Text>
							<Text>{generadoEl}</Text>
						</View>
						<View style={styles.metaLinea}>
							<Text>Página:</Text>
							<Text render={({ pageNumber }) => String(pageNumber)} />
						</View>
					</View>
				</View>

				<View style={styles.rangoFechas}>
					<Text>
						Desde: <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatFechaCorta(fechaDesde)}</Text>
					</Text>
					<Text>
						Hasta: <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatFechaCorta(fechaHasta)}</Text>
					</Text>
				</View>

				<View style={styles.separador} />

				{seccionesPorCompania.length === 0 && (
					<Text style={{ marginTop: 20, textAlign: "center", color: "#555555" }}>
						Sin movimientos en el período seleccionado
					</Text>
				)}

				{seccionesPorCompania.map(({ compania, filas, subtotal }) => (
					<View key={compania.nombre}>
						<View style={styles.companiaHeader} wrap={false}>
							<Text>
								Compañía: {compania.codigo != null ? `${compania.codigo} ` : ""}
								{compania.nombre}
							</Text>
						</View>
						<View style={styles.tablaHeader} wrap={false}>
							<Text style={styles.colRiesgo}>Ramo/Riesgo</Text>
							<Text style={styles.colMonto}>Prima Total</Text>
							<Text style={styles.colMonto}>Prima Neta</Text>
							<Text style={styles.colMonto}>Comisión</Text>
						</View>
						{filas.map((r) => (
							<View key={`${r.codigo_aps}|${r.riesgo}`} style={styles.fila} wrap={false}>
								<Text style={styles.colRiesgo}>
									{r.codigo_aps} {r.riesgo}
								</Text>
								<Text style={styles.colMonto}>{formatMonto(r.prima_total)}</Text>
								<Text style={styles.colMonto}>{formatMonto(r.prima_neta)}</Text>
								<Text style={styles.colMonto}>{formatMonto(r.comision)}</Text>
							</View>
						))}
						<View style={styles.filaSubtotal} wrap={false}>
							<Text style={styles.colRiesgo} />
							<FilaMontos totales={subtotal} />
						</View>
					</View>
				))}

				{seccionesPorCompania.length > 0 && (
					<View style={styles.filaTotalGeneral} wrap={false}>
						<Text style={styles.colRiesgo}>Total</Text>
						<FilaMontos totales={totalGeneral} />
					</View>
				)}

				<Text
					style={styles.pieDePagina}
					fixed
					render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
				/>
			</Page>
		</Document>
	);
}
