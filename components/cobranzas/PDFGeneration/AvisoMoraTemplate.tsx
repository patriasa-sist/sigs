// components/cobranzas/PDFGeneration/AvisoMoraTemplate.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font, Link } from "@react-pdf/renderer";
import type { AvisoMoraData } from "@/types/cobranza";
import { PDF_ASSETS } from "@/utils/pdfAssets";
import { ExecutiveFooter } from "@/components/vencimientos/PDFGeneration/ExecutiveFooter";
import { cleanPhoneNumber } from "@/utils/whatsapp";

// Registrar fuentes - Cambria (igual que BaseTemplate)
Font.register({
	family: "Cambria",
	fonts: [
		{
			src: "https://db.onlinewebfonts.com/t/758d40d7ca52e3a9bff2655c7ab5703c.ttf",
			fontWeight: "normal",
		},
		{
			src: "https://db.onlinewebfonts.com/t/cf8e4c5e25487a784eed74806c642da2.ttf",
			fontWeight: "bold",
		},
		{
			src: "https://db.onlinewebfonts.com/t/60b4f056a5fc987393c8bbea75ca2c1a.ttf",
			fontStyle: "italic",
		},
	],
});

const styles = StyleSheet.create({
	page: {
		flexDirection: "column",
		backgroundColor: "#ffffff",
		padding: 30,
		fontFamily: "Cambria",
		fontSize: 10,
		lineHeight: 1.2,
	},
	header: {
		flexDirection: "column",
		marginBottom: 10,
	},
	logo: {
		width: 150,
		height: "auto",
		marginBottom: 5,
	},
	headerText: {
		fontSize: 10,
		marginBottom: 5,
		textAlign: "left",
	},
	referenceNumber: {
		fontSize: 10,
		marginBottom: 5,
		textAlign: "left",
	},
	clientInfo: {
		marginBottom: 10,
	},
	clientLabel: {
		fontSize: 10,
	},
	clientName: {
		fontSize: 10,
		fontWeight: "bold",
	},
	clientDetails: {
		fontSize: 10,
	},
	present: {
		marginBottom: 5,
		fontWeight: "bold",
		textDecoration: "underline",
	},
	subject: {
		fontSize: 10,
		fontWeight: "bold",
		marginBottom: 10,
		textAlign: "left",
	},
	greeting: {
		marginBottom: 5,
		fontSize: 10,
	},
	content: {
		marginBottom: 1,
	},
	paragraph: {
		marginBottom: 10,
		textAlign: "justify",
		lineHeight: 1.3,
	},
	// Estilos de la tabla de cuotas
	tableContainer: {
		marginTop: 10,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "#000000",
	},
	tableHeader: {
		backgroundColor: "#2C5282",
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#000000",
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#000000",
	},
	tableRowLastChild: {
		flexDirection: "row",
	},
	tableHeaderCell: {
		padding: 5,
		fontSize: 8,
		fontWeight: "bold",
		color: "#ffffff",
		textAlign: "center",
		borderRightWidth: 1,
		borderRightColor: "#000000",
	},
	tableCell: {
		padding: 5,
		fontSize: 8,
		textAlign: "center",
		borderRightWidth: 1,
		borderRightColor: "#000000",
	},
	tableCellNoBorder: {
		padding: 5,
		fontSize: 8,
		textAlign: "center",
	},
	// Estilos para información del asegurado
	aseguradoHeader: {
		backgroundColor: "#f0f0f0",
		padding: 5,
		marginTop: 5,
		marginBottom: 5,
	},
	aseguradoRow: {
		flexDirection: "row",
		marginBottom: 3,
	},
	aseguradoLabel: {
		fontSize: 9,
		fontWeight: "bold",
		width: "30%",
	},
	aseguradoValue: {
		fontSize: 9,
		width: "70%",
	},
	// Estados de cuotas
	estadoPendiente: {
		color: "#D32F2F",
		fontWeight: "bold",
	},
	estadoProximo: {
		color: "#1976D2",
		fontWeight: "bold",
	},
	// Total row
	totalRow: {
		backgroundColor: "#FFF9C4",
		flexDirection: "row",
	},
	totalCell: {
		padding: 5,
		fontSize: 8,
		fontWeight: "bold",
		textAlign: "center",
	},
	totalAmount: {
		padding: 5,
		fontSize: 8,
		fontWeight: "bold",
		textAlign: "center",
		color: "#000000",
	},
	// Artículos legales
	articleContainer: {
		marginTop: 5,
		marginBottom: 5,
	},
	articleTitle: {
		fontSize: 10,
		fontWeight: "bold",
		marginBottom: 3,
	},
	articleText: {
		fontSize: 10,
		textAlign: "justify",
		marginBottom: 3,
		lineHeight: 1.3,
	},
	// Advertencia importante
	warningBox: {
		marginTop: 5,
		marginBottom: 10,
		padding: 8,
		backgroundColor: "#FFF3E0",
		borderWidth: 1,
		borderColor: "#FF9800",
		borderRadius: 4,
	},
	warningText: {
		fontSize: 10,
		textAlign: "justify",
		lineHeight: 1.3,
	},
	// Cierre
	closingText: {
		fontSize: 10,
		marginBottom: 5,
		textAlign: "justify",
		fontWeight: "bold",
		textDecoration: "underline",
		lineHeight: 1.3,
	},
	signature: {
		marginTop: 15,
		textAlign: "left",
	},
	executiveFooter: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "flex-start",
		marginTop: 10,
	},
});

interface AvisoMoraTemplateProps {
	avisoData: AvisoMoraData;
}

export const AvisoMoraTemplate: React.FC<AvisoMoraTemplateProps> = ({ avisoData }) => {
	const { poliza, cliente, cuotas_vencidas, total_adeudado, fecha_generacion, numero_referencia, generado_por } =
		avisoData;

	// Format currency
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-BO", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	};

	// Format date for header (long format)
	const formatHeaderDate = (dateString: string) => {
		const date = new Date(dateString);
		const day = date.getDate();
		const months = [
			"enero",
			"febrero",
			"marzo",
			"abril",
			"mayo",
			"junio",
			"julio",
			"agosto",
			"septiembre",
			"octubre",
			"noviembre",
			"diciembre",
		];
		const month = months[date.getMonth()];
		const year = date.getFullYear();
		return `${day} de ${month} del ${year}`;
	};

	// Determinar si hay cuotas próximas a vencer (para mostrar en la tabla)
	const cuotasProximas = poliza.cuotas.filter((c) => {
		const estado = c.estado_real || c.estado;
		return estado === "pendiente";
	});

	// Combinar cuotas vencidas y próximas para la tabla
	const todasCuotasMostrar = [...cuotas_vencidas, ...cuotasProximas.slice(0, 2)];

	// Obtener placas de vehículos si es ramo automotor
	const obtenerPlacas = (): string => {
		if (poliza.datos_ramo && poliza.datos_ramo.tipo === "automotor") {
			const placas = poliza.datos_ramo.vehiculos.map((v) => v.placa).join(", ");
			return placas || "NO TIENE";
		}
		return "NO TIENE";
	};

	return (
		<Document>
			<Page size="LETTER" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					{/* eslint-disable-next-line jsx-a11y/alt-text */}
					<Image style={styles.logo} src={PDF_ASSETS.PATRIA_LOGO} />
					<Text style={styles.headerText}>
						Santa Cruz de La Sierra, {formatHeaderDate(fecha_generacion)}.
					</Text>
					<Text style={styles.referenceNumber}>{numero_referencia}</Text>
				</View>

				{/* Client Information */}
				<View style={styles.clientInfo}>
					<Text style={styles.clientLabel}>Señor(es):</Text>
					<Text style={styles.clientName}>{poliza.client.nombre_completo.toUpperCase()}</Text>
					{/* Dirección - placeholder, podrías agregar si está disponible */}
					{cliente.telefono && (
						<Text style={styles.clientDetails}>
							Telf.:{" "}
							<Link src={`https://wa.me/${cleanPhoneNumber(cliente.telefono)}`}>
								<Text style={{ color: "#000000" }}>{cliente.telefono}</Text>
							</Link>
						</Text>
					)}
					{cliente.celular && cliente.celular !== cliente.telefono && (
						<Text style={styles.clientDetails}>
							Cel.:{" "}
							<Link src={`https://wa.me/${cleanPhoneNumber(cliente.celular)}`}>
								<Text style={{ color: "#000000" }}>{cliente.celular}</Text>
							</Link>
						</Text>
					)}
					<Text style={styles.present}>Presente.-</Text>
				</View>

				{/* Subject */}
				<View>
					<Text style={styles.subject}>Ref.: AVISO DE MORA</Text>
				</View>

				{/* Greeting */}
				<View>
					<Text style={styles.greeting}>De nuestra consideración:</Text>
				</View>

				{/* Introduction */}
				<View style={styles.content}>
					<Text style={styles.paragraph}>
						Por medio de la presente, tenemos a bien informarle que las pólizas contratadas en{" "}
						{poliza.compania.nombre} la cual se encuentra con primas pendientes de pago de acuerdo con el
						siguiente Detalle:
					</Text>

					{/* Información del Asegurado y Compañía */}
					<View style={styles.aseguradoHeader}>
						<View style={styles.aseguradoRow}>
							<Text style={styles.aseguradoLabel}>ASEGURADO:</Text>
							<Text style={styles.aseguradoValue}>{poliza.client.nombre_completo.toUpperCase()}</Text>
						</View>
						<View style={styles.aseguradoRow}>
							<Text style={styles.aseguradoLabel}>COMPAÑÍA:</Text>
							<Text style={styles.aseguradoValue}>{poliza.compania.nombre.toUpperCase()}</Text>
						</View>
					</View>

					{/* Tabla de Cuotas */}
					<View style={styles.tableContainer}>
						{/* Header */}
						<View style={styles.tableHeader}>
							<Text style={[styles.tableHeaderCell, { width: "20%" }]}>POLIZA</Text>
							<Text style={[styles.tableHeaderCell, { width: "15%" }]}>PLACA</Text>
							<Text style={[styles.tableHeaderCell, { width: "15%" }]}>CUOTA</Text>
							<Text style={[styles.tableHeaderCell, { width: "15%" }]}>FECHA DE PAGO</Text>
							<Text style={[styles.tableHeaderCell, { width: "15%" }]}>PRIMA EN {poliza.moneda}.</Text>
							<Text style={[styles.tableCellNoBorder, { width: "20%" }]}>ESTADO</Text>
						</View>

						{/* Rows */}
						{todasCuotasMostrar.map((cuota, index) => {
							const isLastRow = index === todasCuotasMostrar.length - 1;
							const estado = cuota.estado_real || cuota.estado;
							const isPendiente = estado === "vencido";
							const isProximo = estado === "pendiente";

							return (
								<View key={cuota.id} style={isLastRow ? styles.tableRowLastChild : styles.tableRow}>
									<Text style={[styles.tableCell, { width: "20%" }]}>
										{index === 0 ? poliza.numero_poliza : ""}
									</Text>
									<Text style={[styles.tableCell, { width: "15%" }]}>
										{index === 0 ? obtenerPlacas() : ""}
									</Text>
									<Text style={[styles.tableCell, { width: "15%" }]}>
										{cuota.numero_cuota === 0 ? "INICIAL" : `CUOTA ${cuota.numero_cuota}`}
									</Text>
									<Text style={[styles.tableCell, { width: "15%" }]}>
										{formatDate(cuota.fecha_vencimiento)}
									</Text>
									<Text style={[styles.tableCell, { width: "15%" }]}>
										{formatCurrency(cuota.monto)}
									</Text>
									<Text
										style={[
											styles.tableCellNoBorder,
											{ width: "20%" },
											...(isPendiente ? [styles.estadoPendiente] : []),
											...(isProximo ? [styles.estadoProximo] : []),
										]}
									>
										{isPendiente ? "PENDIENTE" : isProximo ? "PROXIMO" : estado.toUpperCase()}
									</Text>
								</View>
							);
						})}

						{/* Total Row */}
						<View style={styles.totalRow}>
							<Text style={[styles.totalCell, { width: "65%" }]}>TOTAL PRIMA EN {poliza.moneda}</Text>
							<Text style={[styles.totalAmount, { width: "15%" }]}>{formatCurrency(total_adeudado)}</Text>
							<Text style={[styles.tableCellNoBorder, { width: "20%" }]}></Text>
						</View>
					</View>

					{/* Artículos del Código de Comercio */}
					<Text style={styles.paragraph}>
						Le recordamos lo establecido en el Código de Comercio en su Sección V:
					</Text>

					<View style={styles.articleContainer}>
						<Text style={styles.articleText}>
							<Text style={{ fontWeight: "bold" }}>Art. 1015.- (OBLIGACION DE PAGAR LA PRIMA).</Text> Es
							obligación del asegurado pagar la prima conforme a lo convenido.
						</Text>

						<Text style={styles.articleText}>
							<Text style={{ fontWeight: "bold" }}>Art. 1017.- (EXIGIBILIDAD DE LA PRIMA).</Text> La prima
							es debida desde el momento de la celebración del contrato, pero no es exigible sino con la
							entrega de la póliza o certificado provisional de cobertura. Las primas sucesivas se pagarán
							al comienzo de cada período, salvo que se estipule otra forma de pago.
						</Text>

						<Text style={styles.articleText}>
							<Text style={{ fontWeight: "bold" }}>Art. 1018- (LAS PRIMAS EN LOS SEGUROS DE DAÑOS).</Text>{" "}
							&quot;...Suspendida la vigencia de la póliza, el asegurador tiene derecho a la prima
							correspondiente al periodo corrido, calculado conforme a la tarifa para seguros a corto
							plazo...&quot;.
						</Text>

						<Text style={styles.articleText}>
							Asimismo, le recordamos donde debe hacer efectiva la Prima correspondiente:
						</Text>

						<Text style={styles.articleText}>
							<Text style={{ fontWeight: "bold" }}>Art. 1022.- (LUGAR DEL PAGO).</Text> La prima debe
							pagarse en el domicilio del asegurador o en el lugar indicado en la póliza. No incurre en
							mora el asegurado, si el lugar del pago o el domicilio han sido cambiados sin su
							conocimiento.
						</Text>

						<Text style={styles.articleText}>
							Igualmente y en cumplimiento a lo establecido en el Reglamento de Corredores de Seguros y
							sus modificaciones; le hacemos conocer lo antes mencionado.
						</Text>
					</View>

					{/* Advertencia Importante */}
					<View style={styles.warningBox}>
						<Text style={styles.warningText}>
							Es importante informarle que; el incumplimiento en el pago de la prima más los intereses (si
							hubiesen), dentro de los plazos establecidos que se detalla en el cuadro líneas arriba,
							suspende la vigencia de la presente póliza, de conformidad con el inciso d) del Artículo 58
							de la Ley de Seguros 1883, perdiendo el asegurado el derecho de recibir indemnización alguna
							por cualquier siniestro.
						</Text>
					</View>

					<Text style={styles.paragraph}>
						&quot;Caso contrario, LA COMPAÑÍA DE SEGURO DARA POR RESCINDIDO EL CONTRATO DE SEGURO,
						procediendo a la ANULACION de la póliza, y en aplicación del último acápite del Art. 1018, la
						compañía se reserva el derecho de efectuar la cobranza de tales primas por vía ejecutiva, con el
						consiguiente reporte a la Central de Riesgos, normando mediante R.A. Nro. 746 del 31/12/2001,
						emitida por la Superintendencia de Pensiones Valores y Seguros.&quot;
					</Text>

					{/* Cierre */}
					<Text style={styles.closingText}>
						Si a la fecha de recibir la presente, usted ha regularizado los mencionados pagos, le
						agradeceremos dejar sin efecto este aviso.
					</Text>

					<Text style={styles.paragraph}>
						Con este particular y a su entera disposición para cualquier consulta al respecto, hacemos
						propicia la oportunidad para saludarlos muy cordialmente.
					</Text>
				</View>

				{/* Firma */}
				<View wrap={false}>
					<View style={styles.signature}>
						<Text>Atentamente,</Text>
					</View>

					{/* Executive Footer */}
					<View style={styles.executiveFooter}>
						<ExecutiveFooter executiveName={generado_por} />
					</View>
				</View>
			</Page>
		</Document>
	);
};
