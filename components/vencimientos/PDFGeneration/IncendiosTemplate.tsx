// components/PDFGeneration/IncendiosTemplate.tsx
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { BaseTemplate } from "./BaseTemplate";
import { LetterData } from "@/types/pdf";
import { formatRamoProductoForPDF } from "@/utils/pdfutils";

const incendiosStyles = StyleSheet.create({
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
		marginBottom: 10,
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
	fieldText: {
		fontSize: 9,
		fontWeight: "bold",
		marginBottom: 5,
	},
	placesSection: {
		marginTop: 5,
		paddingLeft: 10,
		paddingRight: 10,
		paddingTop: 5,
		paddingBottom: 5,
		backgroundColor: "#fff3cd",
		borderRadius: 4,
		borderWidth: 1,
		borderColor: "#ffeaa7",
	},
	placesTitle: {
		fontSize: 10,
		fontWeight: "bold",
		marginBottom: 5,
	},
	placeItem: {
		fontSize: 9,
		marginBottom: 3,
		paddingLeft: 5,
	},
});

interface IncendiosTemplateProps {
	letterData: LetterData;
}

export const IncendiosTemplate: React.FC<IncendiosTemplateProps> = ({ letterData }) => {
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
					<View style={incendiosStyles.policyTable}>
						{/* Fila de Cabecera */}
						<View style={incendiosStyles.tableRow}>
							<View style={[incendiosStyles.tableCol, { width: "20%" }]}>
								<Text style={incendiosStyles.headerText}>VIGENCIA</Text>
							</View>
							<View style={[incendiosStyles.tableCol, { width: "25%" }]}>
								<Text style={incendiosStyles.headerText}>N° DE PÓLIZA</Text>
							</View>
							<View style={[incendiosStyles.tableCol, { width: "25%" }]}>
								<Text style={incendiosStyles.headerText}>COMPAÑÍA</Text>
							</View>
							<View style={[incendiosStyles.tableCol, { width: "30%" }]}>
								<Text style={incendiosStyles.headerText}>RAMO</Text>
							</View>
						</View>
						{/* Fila de Datos */}
						<View style={incendiosStyles.tableRow}>
							<View style={[incendiosStyles.tableCol, { width: "20%" }]}>
								<Text style={incendiosStyles.cellText}>{policy.expiryDate}</Text>
							</View>
							<View style={[incendiosStyles.tableCol, { width: "25%" }]}>
								<Text style={incendiosStyles.policyNumberCellText}>{policy.policyNumber}</Text>
							</View>
							<View style={[incendiosStyles.tableCol, { width: "25%" }]}>
								<Text style={incendiosStyles.cellText}>{policy.company}</Text>
							</View>
							<View style={[incendiosStyles.tableCol, { width: "30%" }]}>
								<Text style={incendiosStyles.cellText}>{formatRamoProductoForPDF(policy)}</Text>
							</View>
						</View>
					</View>

					{/* Caja de Detalles */}
					<View style={incendiosStyles.detailsBox}>
						<Text style={incendiosStyles.detailsTitle}>DETALLE DE LA PÓLIZA</Text>

						{policy.manualFields?.insuredMatter && (
							<Text style={incendiosStyles.fieldText}>
								• Materia Asegurada: {policy.manualFields.insuredMatter}
							</Text>
						)}

						{policy.manualFields?.riskLocation && (
							<Text style={incendiosStyles.fieldText}>
								• Ubicación de Riesgo: {policy.manualFields.riskLocation}
							</Text>
						)}

						{policy.manualFields?.activity && (
							<Text style={incendiosStyles.fieldText}>• Actividad: {policy.manualFields.activity}</Text>
						)}

						{policy.manualFields?.insuredPlaces && policy.manualFields.insuredPlaces.length > 0 && (
							<View>
								<Text style={incendiosStyles.placesTitle}>Items Asegurados:</Text>
								{policy.manualFields.insuredPlaces.map((place, placeIndex) => (
									<Text key={placeIndex} style={incendiosStyles.placeItem}>
										• {place.description} -{" "}
										{formatMonetaryValue(place.insuredValue, place.currency)}
									</Text>
								))}
							</View>
						)}

						<Text style={incendiosStyles.detailText}>
							• Valor Asegurado:{" "}
							{formatMonetaryValue(
								policy.manualFields?.insuredValue,
								policy.manualFields?.insuredValueCurrency
							)}
						</Text>

						{policy.manualFields?.specificConditions && (
							<Text style={incendiosStyles.detailText}>
								• Condiciones Específicas: {policy.manualFields.specificConditions}
							</Text>
						)}
					</View>
				</View>
			))}
		</BaseTemplate>
	);
};
