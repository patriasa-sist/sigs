// components/PDFGeneration/GeneralTemplate.tsx
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { BaseTemplate } from "./BaseTemplate";
import { LetterData } from "@/types/pdf";

const generalStyles = StyleSheet.create({
	policyTable: {
		width: "100%",
		borderStyle: "solid",
		borderWidth: 1,
		borderColor: "#e5e7eb",
		marginBottom: 10,
	},
	tableRow: {
		flexDirection: "row",
	},
	tableCol: {
		borderStyle: "solid",
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		borderColor: "#e5e7eb",
		padding: 5,
		textAlign: "center",
		justifyContent: "center",
		alignItems: "center",
	},
	headerText: {
		fontWeight: "bold",
		fontSize: 8,
		textAlign: "center",
		color: "#1f2937",
	},
	cellText: {
		fontSize: 8,
		textAlign: "center",
	},
	policyNumberCellText: {
		fontSize: 7,
		textAlign: "center",
	},
	detailsBox: {
		backgroundColor: "#f8f9fa",
		padding: 8,
		borderWidth: 1,
		borderColor: "#dee2e6",
		borderRadius: 4,
	},
	detailsTitle: {
		fontSize: 10,
		fontWeight: "bold",
		marginBottom: 8,
		color: "#172554",
	},
	detailText: {
		fontSize: 9,
		marginBottom: 5,
		lineHeight: 1.3,
	},
	insuredMatterText: {
		fontSize: 9,
		fontWeight: "bold",
		marginBottom: 5,
	},
});

interface GeneralTemplateProps {
	letterData: LetterData;
}

export const GeneralTemplate: React.FC<GeneralTemplateProps> = ({ letterData }) => {
	const formatMonetaryValue = (value: number | undefined, currency: "Bs." | "$us." | undefined) => {
		if (value === undefined || value === null || isNaN(value)) {
			return "No especificado";
		}
		const numberFormatter = new Intl.NumberFormat("es-BO", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		const formattedValue = numberFormatter.format(value);
		if (currency === "Bs.") return `Bs. ${formattedValue}`;
		if (currency === "$us.") return `$us. ${formattedValue}`;
		return value.toString();
	};

	return (
		<BaseTemplate letterData={letterData}>
			{letterData.policies.map((policy, policyIndex) => (
				<View key={policyIndex} style={{ marginBottom: 15 }}>
					{/* Tabla de Póliza */}
					<View style={generalStyles.policyTable}>
						{/* Fila de Cabecera */}
						<View style={generalStyles.tableRow}>
							<View style={[generalStyles.tableCol, { width: "20%" }]}>
								<Text style={generalStyles.headerText}>VIGENCIA</Text>
							</View>
							<View style={[generalStyles.tableCol, { width: "25%" }]}>
								<Text style={generalStyles.headerText}>N° DE PÓLIZA</Text>
							</View>
							<View style={[generalStyles.tableCol, { width: "25%" }]}>
								<Text style={generalStyles.headerText}>COMPAÑÍA</Text>
							</View>
							<View style={[generalStyles.tableCol, { width: "30%" }]}>
								<Text style={generalStyles.headerText}>RAMO</Text>
							</View>
						</View>
						{/* Fila de Datos */}
						<View style={generalStyles.tableRow}>
							<View style={[generalStyles.tableCol, { width: "20%" }]}>
								<Text style={generalStyles.cellText}>{policy.expiryDate}</Text>
							</View>
							<View style={[generalStyles.tableCol, { width: "25%" }]}>
								<Text style={generalStyles.policyNumberCellText}>{policy.policyNumber}</Text>
							</View>
							<View style={[generalStyles.tableCol, { width: "25%" }]}>
								<Text style={generalStyles.cellText}>{policy.company}</Text>
							</View>
							<View style={[generalStyles.tableCol, { width: "30%" }]}>
								<Text style={generalStyles.cellText}>{policy.branch}</Text>
							</View>
						</View>
					</View>

					{/* Caja de Detalles */}
					<View style={generalStyles.detailsBox}>
						<Text style={generalStyles.detailsTitle}>DETALLE DE LA PÓLIZA</Text>
						{policy.manualFields?.insuredMatter && (
							<Text style={generalStyles.insuredMatterText}>
								• Materia Asegurada: {policy.manualFields.insuredMatter}
							</Text>
						)}
						<Text style={generalStyles.detailText}>
							• Valor Asegurado:{" "}
							{formatMonetaryValue(
								policy.manualFields?.insuredValue,
								policy.manualFields?.insuredValueCurrency
							)}
						</Text>
						{policy.manualFields?.specificConditions && (
							<Text style={generalStyles.detailText}>
								• Condiciones Específicas: {policy.manualFields.specificConditions}
							</Text>
						)}
					</View>
				</View>
			))}
		</BaseTemplate>
	);
};
