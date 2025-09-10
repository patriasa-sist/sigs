// components/PDFGeneration/AutomotorTemplate.tsx
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { BaseTemplate } from "./BaseTemplate";
import { LetterData } from "@/types/pdf";
import { formatUSD } from "@/utils/pdfutils";

const automotorStyles = StyleSheet.create({
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
		marginBottom: 10,
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
	// ESTILOS PARA LA SUB-TABLA DE VEHÍCULOS
	subTable: {
		width: "100%",
		borderStyle: "solid",
		borderWidth: 1,
		borderColor: "#dee2e6",
		marginTop: 5,
		marginBottom: 10,
	},
	subTableHeader: {
		flexDirection: "row",
		backgroundColor: "#e9ecef",
	},
	subTableColHeader: {
		borderStyle: "solid",
		borderBottomWidth: 1,
		borderColor: "#dee2e6",
		padding: 4,
		textAlign: "center",
	},
	subHeaderText: {
		fontWeight: "bold",
		fontSize: 7,
		color: "#1f2937",
	},
	subTableRow: {
		flexDirection: "row",
	},
	subTableCell: {
		padding: 4,
		fontSize: 7,
		borderRightWidth: 1,
		borderRightColor: "#e5e7eb",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
});

interface AutomotorTemplateProps {
	letterData: LetterData;
}

export const AutomotorTemplate: React.FC<AutomotorTemplateProps> = ({ letterData }) => {
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
			{/* Tabla principal de pólizas */}
			<View style={automotorStyles.policyTable}>
				<View style={automotorStyles.tableRow}>
					<View style={[automotorStyles.tableCol, { width: "15%" }]}>
						<Text style={automotorStyles.headerText}>VENCIMIENTO</Text>
					</View>
					<View style={[automotorStyles.tableCol, { width: "25%" }]}>
						<Text style={automotorStyles.headerText}>No. DE PÓLIZA</Text>
					</View>
					<View style={[automotorStyles.tableCol, { width: "20%" }]}>
						<Text style={automotorStyles.headerText}>COMPAÑÍA</Text>
					</View>
					<View style={[automotorStyles.tableCol, { width: "20%" }]}>
						<Text style={automotorStyles.headerText}>RAMO</Text>
					</View>
					<View style={[automotorStyles.tableCol, { width: "20%" }]}>
						<Text style={automotorStyles.headerText}>VALOR ASEGURADO</Text>
					</View>
				</View>

				{letterData.policies.map((policy, index) => (
					<View key={index} style={automotorStyles.tableRow}>
						<View style={[automotorStyles.tableCol, { width: "15%" }]}>
							<Text style={automotorStyles.cellText}>{policy.expiryDate}</Text>
						</View>
						<View style={[automotorStyles.tableCol, { width: "25%" }]}>
							<Text style={automotorStyles.policyNumberCellText}>{policy.policyNumber}</Text>
						</View>
						<View style={[automotorStyles.tableCol, { width: "20%" }]}>
							<Text style={automotorStyles.cellText}>{policy.company}</Text>
						</View>
						<View style={[automotorStyles.tableCol, { width: "20%" }]}>
							<Text style={automotorStyles.cellText}>{policy.branch}</Text>
						</View>
						<View style={[automotorStyles.tableCol, { width: "20%" }]}>
							<Text style={automotorStyles.cellText}>
								{formatMonetaryValue(
									policy.manualFields?.premium,
									policy.manualFields?.premiumCurrency
								)}
							</Text>
						</View>
					</View>
				))}
			</View>

			{/* Sección de detalles por póliza */}
			{letterData.policies.map((policy, policyIndex) => (
				<View key={policyIndex} style={automotorStyles.detailsBox}>
					<Text style={automotorStyles.detailsTitle}>DETALLE DE LA PÓLIZA: {policy.policyNumber}</Text>

					{policy.manualFields?.vehicles && policy.manualFields.vehicles.length > 0 && (
						<View style={automotorStyles.subTable}>
							<View style={automotorStyles.subTableHeader}>
								<View style={[automotorStyles.subTableColHeader, { width: "50%" }]}>
									<Text style={automotorStyles.subHeaderText}>DETALLE DE VEHÍCULO</Text>
								</View>
								<View style={[automotorStyles.subTableColHeader, { width: "25%" }]}>
									<Text style={automotorStyles.subHeaderText}>VALOR DECLARADO</Text>
								</View>
								<View
									style={[automotorStyles.subTableColHeader, { width: "25%", borderRightWidth: 0 }]}
								>
									<Text style={automotorStyles.subHeaderText}>VALOR ASEGURADO</Text>
								</View>
							</View>
							{policy.manualFields.vehicles.map((vehicle, vIndex) => (
								<View key={vIndex} style={automotorStyles.subTableRow}>
									<View style={[automotorStyles.subTableCell, { width: "50%", textAlign: "left" }]}>
										<Text>{vehicle.description}</Text>
									</View>
									<View style={[automotorStyles.subTableCell, { width: "25%" }]}>
										<Text>{formatUSD(vehicle.declaredValue)}</Text>
									</View>
									<View style={[automotorStyles.subTableCell, { width: "25%", borderRightWidth: 0 }]}>
										<Text>{formatUSD(vehicle.insuredValue)}</Text>
									</View>
								</View>
							))}
						</View>
					)}

					{policy.manualFields?.deductibles !== undefined && (
						<Text style={automotorStyles.detailText}>
							• Deducible coaseguro:{" "}
							{formatMonetaryValue(
								policy.manualFields.deductibles,
								policy.manualFields.deductiblesCurrency
							)}
						</Text>
					)}
					{policy.manualFields?.territoriality !== undefined && (
						<Text style={automotorStyles.detailText}>
							• Extraterritorialidad (opcional):{" "}
							{formatMonetaryValue(
								policy.manualFields.territoriality,
								policy.manualFields.territorialityCurrency
							)}
						</Text>
					)}
					{policy.manualFields?.specificConditions && (
						<Text style={automotorStyles.detailText}>
							• Condiciones Específicas: {policy.manualFields.specificConditions}
						</Text>
					)}
				</View>
			))}
		</BaseTemplate>
	);
};
