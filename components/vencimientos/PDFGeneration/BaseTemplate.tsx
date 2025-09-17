// components/PDFGeneration/BaseTemplate.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font, Link } from "@react-pdf/renderer";
import { LetterData } from "@/types/pdf";
import { PDF_ASSETS } from "@/utils/pdfAssets";
import { ExecutiveFooter } from "./ExecutiveFooter";
import { findExecutiveByName, getDefaultExecutive } from "@/utils/executiveHelper";
import { cleanPhoneNumber } from "@/utils/whatsapp";
import { exec } from "child_process";

// Registrar fuentes - Cambria
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

// Fallback to Helvetica if Cambria fails to load
Font.register({
	family: "Helvetica",
	fonts: [
		{ src: "https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf" },
		{ src: "https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf", fontWeight: "bold" },
		{
			src: "https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Oblique.ttf",
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
	clientName: {
		fontSize: 10,
		fontWeight: "bold",
	},
	clientDetails: {
		fontSize: 10,
	},
	present: {
		marginBottom: 5,
	},
	subject: {
		fontSize: 10,
		fontWeight: "bold",
		marginBottom: 10,
		textAlign: "left",
		textDecoration: "underline",
	},
	greeting: {
		marginBottom: 5,
		fontSize: 10,
	},
	content: {
		marginBottom: 1,
	},
	paragraph: {
		marginBottom: 5,
		textAlign: "justify",
	},
	signature: {
		textAlign: "left",
	},
	additionalConditions: {
		marginBottom: 10,
		fontSize: 10,
		textAlign: "justify",
	},
	executiveFooter: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "flex-start",
	},
	conditionsContainer: {
		borderStyle: "solid",
		borderWidth: 1,
		borderRadius: 5,
		borderColor: "#facfcf",
		backgroundColor: "#ffe8e8",
		padding: 3,
	},
});

// Componente para parsear y renderizar texto con formato
const FormattedText: React.FC<{ text: string; isItalic?: boolean }> = ({ text, isItalic = false }) => {
	const parts = text.split(/(\*.*?\*)/g).filter(Boolean);

	return (
		<Text style={{ fontStyle: isItalic ? "italic" : "normal" }}>
			{parts.map((part, index) => {
				if (part.startsWith("*") && part.endsWith("*")) {
					return (
						<Text key={index} style={{ fontWeight: "bold" }}>
							{part.slice(1, -1)}
						</Text>
					);
				}
				return <Text key={index}>{part}</Text>;
			})}
		</Text>
	);
};

interface BaseTemplateProps {
	letterData: LetterData;
	children: React.ReactNode;
}

export const BaseTemplate: React.FC<BaseTemplateProps> = ({ letterData, children }) => {
	// Find executive data using the same logic as ExecutiveFooter
	const executiveData = findExecutiveByName(letterData.executive) || getDefaultExecutive();

	return (
		<Document>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.header}>
					{/* eslint-disable-next-line jsx-a11y/alt-text */}
					<Image style={styles.logo} src={PDF_ASSETS.PATRIA_LOGO} />
					<Text style={styles.headerText}>Santa Cruz, {letterData.date}</Text>
					<Text style={styles.referenceNumber}>{letterData.referenceNumber}</Text>
				</View>

				<View style={styles.clientInfo}>
					<Text style={styles.clientName}>
						{letterData.client.name.includes("SRL") || letterData.client.name.includes("S.A.")
							? "Señores"
							: letterData.client.name.includes("BETTY")
							? "Señor/a"
							: "Señor/a"}
					</Text>
					<Text style={styles.clientName}>{letterData.client.name.toUpperCase()}</Text>
					{letterData.client.phone && (
						<Text style={styles.clientDetails}>
							{letterData.client.name.includes("SRL") ? "Teléfono" : "Telf"}: {letterData.client.phone}
						</Text>
					)}
					{letterData.client.email && (
						<Text style={styles.clientDetails}>Correo: {letterData.client.email}</Text>
					)}
					<Text style={styles.present}>Presente.</Text>
				</View>

				<View>
					<Text style={styles.subject}>
						Ref.: AVISO DE VENCIMIENTO{" "}
						{letterData.templateType === "salud" ? "POLIZA DE SEGURO" : "POLIZA DE SEGURO"}
					</Text>
				</View>

				<View>
					<Text style={styles.greeting}>De nuestra consideración:</Text>
				</View>

				<View style={styles.content}>
					<Text style={styles.paragraph}>
						Por medio de la presente, nos permitimos recordarle que se aproxima el vencimiento de la
						{letterData.policies.length > 1 ? "s" : ""} Póliza{letterData.policies.length > 1 ? "s" : ""} de
						Seguro cuyos detalles se especifican a continuación:
					</Text>

					{children}

					<View style={styles.conditionsContainer}>
						<Text style={styles.paragraph}>Nota:</Text>

						{/* revision of data pending */}
						{letterData.templateType != "salud" && (
							<Text style={styles.paragraph}>
								Recomendamos revisar los datos y el valor asegurado, esto para proceder si corresponde,
								con la actualización o modificación de esto(s). Tenga a bien hacernos a conocer
								cualquier cambio que se haya producido o en su defecto su consentimiento para la
								renovación.
							</Text>
						)}
						{/* adititional manual conditions */}
						{letterData.additionalConditions && (
							<View style={styles.additionalConditions}>
								<FormattedText
									text={
										letterData.additionalConditions.charAt(0).toUpperCase() +
										letterData.additionalConditions.slice(1)
									}
									// isItalic={letterData.templateType === "salud"}
								/>
							</View>
						)}

						{/* special health insurance clausule */}
						{letterData.templateType === "salud" && (
							<Text style={styles.paragraph}>
								Nos permitimos recordarle que los seguros de Salud o Enfermedad se pagan por adelantado,
								al inicio de la vigencia, sea mensual o anual.
							</Text>
						)}

						{/* No renovation section */}
						<Text style={styles.paragraph}>
							Es importante informarle que en caso de tener primas pendientes no se podrá renovar hasta su
							regularización, la NO RENOVACION, suspende toda cobertura de la póliza de seguro.
						</Text>
					</View>

					{/* contact info section */}
					<Text style={styles.paragraph}>
						Comuníquese con nosotros para recibir una atención personalizada:
					</Text>
					<Text style={styles.paragraph}>
						<FormattedText text={`*${executiveData.name}* - Tel: `} />
						<Link src={`https://wa.me/${cleanPhoneNumber(executiveData.telf)}`}>
							<Text style={{ fontWeight: "bold", color: "#255fd3" }}>{executiveData.telf}</Text>
						</Link>
						<Text> - Email: </Text>
						<Text style={{ fontWeight: "bold", color: "#255fd3" }}>{executiveData.mail}</Text>
					</Text>

					{/* greetings section */}
					<Text style={styles.paragraph}>
						De esta manera quedamos a la espera de su respuesta y nos despedimos con la cordialidad de
						siempre.
					</Text>
				</View>

				<View style={styles.signature}>
					<Text>Atentamente,</Text>
				</View>

				{/* Executive Footer with personalized signature */}
				<View style={styles.executiveFooter} wrap={false}>
					<ExecutiveFooter executiveName={letterData.executive} />
					<ExecutiveFooter executiveName={"Ercilia"} />
				</View>
			</Page>
		</Document>
	);
};
