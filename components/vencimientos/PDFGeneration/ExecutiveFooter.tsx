// components/PDFGeneration/ExecutiveFooter.tsx
import React from "react";
import { View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { findExecutiveByName, getDefaultExecutive } from "@/utils/executiveHelper";

const footerStyles = StyleSheet.create({
	signatureBlock: {
		marginTop: 30,
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
		fontSize: 12,
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
		marginBottom: -25, // Overlap slightly with the line
	},
});

interface ExecutiveFooterProps {
	executiveName: string;
}

export const ExecutiveFooter: React.FC<ExecutiveFooterProps> = ({ executiveName }) => {
	// Find the executive info based on the name from the letter
	const executive = findExecutiveByName(executiveName) || getDefaultExecutive();

	return (
		<View style={footerStyles.signatureBlock}>
			{/* Signature image positioned above the line */}
			<Image style={footerStyles.signatureImage} src={executive.signature} />

			{/* Signature line positioned directly under the signature */}
			<View style={footerStyles.dividerLine} />

			{/* Executive information */}
			<Text style={footerStyles.executiveName}>{executive.name}</Text>
			<Text style={footerStyles.executiveCharge}>{executive.charge}</Text>

			{/* Company information */}
			<Text style={footerStyles.companyName}>PATRIA S.A.</Text>
			<Text style={footerStyles.companySubtitle}>Corredores y Asesores de Seguros</Text>
		</View>
	);
};
// NOTE: No esta la 2da firma de ercilia
