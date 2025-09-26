// components/PDFGeneration/AccidentesTemplate.tsx
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { BaseTemplate } from "./BaseTemplate";
import { LetterData } from "@/types/pdf";
import { formatRamoProductoForPDF } from "@/utils/pdfutils";

const accidentesStyles = StyleSheet.create({
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
		fontSize: 8,
		textAlign: "center",
	},
	aseguradosSection: {
		marginTop: 5,
		paddingLeft: 10,
		paddingRight: 10,
		paddingTop: 5,
		paddingBottom: 5,
		backgroundColor: "#f8f9fa",
		borderRadius: 4,
		borderWidth: 1,
		borderColor: "#dee2e6",
	},
	aseguradosTitle: {
		fontSize: 10,
		fontWeight: "bold",
		marginBottom: 5,
		color: "#172554",
	},
	aseguradoName: {
		fontSize: 9,
		marginBottom: 2,
	},
});

interface AccidentesTemplateProps {
	letterData: LetterData;
}

export const AccidentesTemplate: React.FC<AccidentesTemplateProps> = ({ letterData }) => {
	// Helper function to format currency based on value and type
	const formatMonetaryValue = (value: number | undefined, currency: "Bs." | "$us." | undefined) => {
		if (value === undefined || value === null || isNaN(value)) {
			return "A confirmar";
		}
		const numberFormatter = new Intl.NumberFormat("es-BO", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		const formattedValue = numberFormatter.format(value);
		if (currency === "Bs.") return `Bs. ${formattedValue}`;
		if (currency === "$us.") return `$us. ${formattedValue}`;
		return value.toString(); // Fallback
	};


	return (
		<BaseTemplate letterData={letterData}>
			{letterData.policies.map((policy, policyIndex) => {
				// Prioritize insuredMembersWithType over legacy insuredMembers
				const membersWithType = policy.manualFields?.insuredMembersWithType || [];
				const legacyMembers = policy.manualFields?.insuredMembers || policy.insuredMembers || [];
				const hasTypedMembers = membersWithType.length > 0;

				return (
					<View key={policyIndex} style={{ marginBottom: 15 }}>
						{/* Policy Table */}
						<View style={accidentesStyles.policyTable}>
							{/* Table Header */}
							<View style={accidentesStyles.tableRow}>
								<View style={[accidentesStyles.tableCol, { width: "20%" }]}>
									<Text style={accidentesStyles.headerText}>VIGENCIA</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "25%" }]}>
									<Text style={accidentesStyles.headerText}>N° DE PÓLIZA</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "20%" }]}>
									<Text style={accidentesStyles.headerText}>COMPAÑÍA</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "15%" }]}>
									<Text style={accidentesStyles.headerText}>RAMO</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "20%" }]}>
									<Text style={accidentesStyles.headerText}>VALOR ASEGURADO</Text>
								</View>
							</View>

							{/* Policy Row */}
							<View style={accidentesStyles.tableRow}>
								<View style={[accidentesStyles.tableCol, { width: "20%" }]}>
									<Text style={accidentesStyles.cellText}>{policy.expiryDate}</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "25%" }]}>
									<Text style={accidentesStyles.policyNumberCellText}>{policy.policyNumber}</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "20%" }]}>
									<Text style={accidentesStyles.cellText}>{policy.company}</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "15%" }]}>
									<Text style={accidentesStyles.cellText}>{formatRamoProductoForPDF(policy)}</Text>
								</View>
								<View style={[accidentesStyles.tableCol, { width: "20%" }]}>
									<Text style={accidentesStyles.cellText}>
										{formatMonetaryValue(
											policy.manualFields?.insuredValue,
											policy.manualFields?.insuredValueCurrency
										)}
									</Text>
								</View>
							</View>
						</View>

						{/* Insured Members List - Simplified for Accidentes */}
						{(hasTypedMembers || legacyMembers.length > 0) && (
							<View style={accidentesStyles.aseguradosSection}>
								<Text style={accidentesStyles.aseguradosTitle}>Asegurados:</Text>
								{hasTypedMembers
									? membersWithType.map((member, memberIndex) => (
											<Text key={memberIndex} style={accidentesStyles.aseguradoName}>
												• {member.name.toUpperCase()}
											</Text>
									  ))
									: legacyMembers.map((member, memberIndex) => (
											<Text key={memberIndex} style={accidentesStyles.aseguradoName}>
												• {member.toUpperCase()}
											</Text>
									  ))}
							</View>
						)}
					</View>
				);
			})}
		</BaseTemplate>
	);
};