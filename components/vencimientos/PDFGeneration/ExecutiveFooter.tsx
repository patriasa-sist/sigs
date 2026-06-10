// components/PDFGeneration/ExecutiveFooter.tsx
import React from "react";
import { View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import type { Firmante } from "@/utils/executiveHelper";

const footerStyles = StyleSheet.create({
	signatureBlock: {
		marginTop: 1,
		alignItems: "center",
	},
	executiveName: {
		fontSize: 11,
		fontWeight: "bold",
		marginBottom: 2,
		textAlign: "center",
		color: "#1f2937",
	},
	executiveCharge: {
		fontSize: 10,
		marginBottom: 8,
		textAlign: "center",
		color: "#374151",
	},
	companyName: {
		fontSize: 11,
		fontWeight: "bold",
		textAlign: "center",
		color: "#172554",
	},
	companySubtitle: {
		fontSize: 10,
		textAlign: "center",
		color: "#374151",
		marginTop: 2,
	},
	dividerLine: {
		borderTopWidth: 1,
		borderTopColor: "#d1d5db",
		width: 200,
		marginBottom: 10,
		marginTop: 10,
	},
	signatureImage: {
		width: 100,
		height: 50,
		objectFit: "contain",
		marginBottom: -15, // Overlap slightly with the line
	},
});

interface ExecutiveFooterProps {
	firmante: Firmante | null;
}

export const ExecutiveFooter: React.FC<ExecutiveFooterProps> = ({ firmante }) => {
	// Sin firmante resuelto, no renderizamos nada (evita estampar una firma equivocada)
	if (!firmante) return null;

	return (
		<View style={footerStyles.signatureBlock}>
			{/* Signature image positioned above the line (solo si hay imagen de firma) */}
			{firmante.firma_url && (
				/* eslint-disable-next-line jsx-a11y/alt-text */
				<Image style={footerStyles.signatureImage} src={firmante.firma_url} />
			)}

			{/* Executive information */}
			<Text style={footerStyles.executiveName}>{firmante.full_name}</Text>
			{firmante.cargo && <Text style={footerStyles.executiveCharge}>{firmante.cargo}</Text>}

			{/* Company information */}
			<Text style={footerStyles.companyName}>PATRIA S.A.</Text>
			<Text style={footerStyles.companySubtitle}>Corredores y Asesores de Seguros</Text>
		</View>
	);
};
