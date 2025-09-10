// components/PDFGeneration/BaseTemplate.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { LetterData } from "@/types/pdf";
import { PDF_ASSETS } from "@/utils/pdfAssets";
import { ExecutiveFooter } from "./ExecutiveFooter";

// Registrar fuentes - Cambria
Font.register({
	family: "Cambria",
	fonts: [
		{ 
			src: "https://db.onlinewebfonts.com/t/758d40d7ca52e3a9bff2655c7ab5703c.ttf",
			fontWeight: "normal",
		},
		{ 
			src: "https://db.onlinewebfonts.com/t/758d40d7ca52e3a9bff2655c7ab5703c.ttf",
			fontWeight: "bold",
		},
		{
			src: "https://db.onlinewebfonts.com/t/758d40d7ca52e3a9bff2655c7ab5703c.ttf",
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
		lineHeight: 1.4,
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
		fontSize: 11,
		fontWeight: "bold",
		marginBottom: 10,
		textAlign: "left",
		textDecoration: "underline",
	},
	greeting: {
		marginBottom: 10,
		fontSize: 10,
	},
	content: {
		marginBottom: 1,
	},
	paragraph: {
		marginBottom: 10,
		textAlign: "justify",
	},
	signature: {
		textAlign: "left",
	},
	additionalConditions: {
		marginBottom: 10,
		fontSize: 9,
		textAlign: "justify",
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
	return (
		<Document>
			<Page size="LETTER" style={styles.page}>
				<View style={styles.header}>
					<Image style={styles.logo} src={PDF_ASSETS.PATRIA_LOGO} />
					<Text style={styles.headerText}>Santa Cruz, {letterData.date}</Text>
					<Text style={styles.referenceNumber}>{letterData.referenceNumber}</Text>
				</View>

				<View style={styles.clientInfo}>
					<Text style={styles.clientName}>
						{letterData.client.name.includes("SRL") || letterData.client.name.includes("S.A.")
							? "Señores"
							: letterData.client.name.includes("BETTY")
							? "Señora"
							: "Señor"}
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
						{letterData.templateType === "salud" ? "POLIZA DE SEGURO SALUD" : "POLIZA DE SEGURO"}
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

					<Text style={styles.paragraph}>
						Tenga a bien hacernos conocer cualquier cambio que desea realizar o en su defecto su
						consentimiento para la renovación.
					</Text>

					{letterData.additionalConditions && (
						<View style={styles.additionalConditions}>
							<FormattedText
								text={letterData.additionalConditions}
								isItalic={letterData.templateType === "salud"}
							/>
						</View>
					)}

					{letterData.templateType === "salud" && (
						<Text style={styles.paragraph}>
							Nos permitimos recordarle que los seguros de Salud o Enfermedad se pagan por adelantado, al
							inicio de la vigencia, sea mensual o anual. En caso de tener primas pendientes no se podrá
							renovar.
						</Text>
					)}

					<Text style={styles.paragraph}>
						Es importante informarle que{" "}
						{letterData.templateType !== "salud"
							? ", en caso de tener primas pendientes no se podrá renovar hasta su regularización de estas, la"
							: "la"}{" "}
						NO RENOVACION, suspende toda cobertura de la póliza de seguro.
					</Text>

					<Text style={styles.paragraph}>
						De esta manera quedamos a la espera de su respuesta, nos despedimos con la cordialidad de
						siempre.
					</Text>
				</View>

				<View style={styles.signature}>
					<Text>Atentamente,</Text>
				</View>

				{/* Executive Footer with personalized signature */}
				<ExecutiveFooter executiveName={letterData.executive} />
			</Page>
		</Document>
	);
};
