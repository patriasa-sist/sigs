// components/PDFGeneration/HealthTemplate.tsx
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { BaseTemplate } from "./BaseTemplate";
import { LetterData } from "@/types/pdf";

const healthStyles = StyleSheet.create({
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

interface HealthTemplateProps {
	letterData: LetterData;
}

export const HealthTemplate: React.FC<HealthTemplateProps> = ({ letterData }) => {
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
				const membersToRender = policy.manualFields?.insuredMembers || policy.insuredMembers || [];
				return (
					<View key={policyIndex} style={{ marginBottom: 15 }}>
						{/* Policy Table */}
						<View style={healthStyles.policyTable}>
							{/* Table Header */}
							<View style={healthStyles.tableRow}>
								<View style={[healthStyles.tableCol, { width: "20%" }]}>
									<Text style={healthStyles.headerText}>FECHA DE VENCIMIENTO</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "25%" }]}>
									<Text style={healthStyles.headerText}>No. DE PÓLIZA</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "20%" }]}>
									<Text style={healthStyles.headerText}>COMPAÑÍA</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "15%" }]}>
									<Text style={healthStyles.headerText}>RAMO</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "20%" }]}>
									<Text style={healthStyles.headerText}>PRIMA DE RENOVACIÓN MENSUAL</Text>
								</View>
							</View>

							{/* Policy Row */}
							<View style={healthStyles.tableRow}>
								<View style={[healthStyles.tableCol, { width: "20%" }]}>
									<Text style={healthStyles.cellText}>{policy.expiryDate}</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "25%" }]}>
									<Text style={healthStyles.policyNumberCellText}>{policy.policyNumber}</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "20%" }]}>
									<Text style={healthStyles.cellText}>{policy.company}</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "15%" }]}>
									<Text style={healthStyles.cellText}>{policy.branch}</Text>
								</View>
								<View style={[healthStyles.tableCol, { width: "20%" }]}>
									<Text style={healthStyles.cellText}>{formatMonetaryValue(policy.manualFields?.renewalPremium, policy.manualFields?.renewalPremiumCurrency)}</Text>
								</View>
							</View>
						</View>

						{/* Insured Members List */}
						{membersToRender.length > 0 && (
							<View style={healthStyles.aseguradosSection}>
								<Text style={healthStyles.aseguradosTitle}>Asegurados:</Text>
								{membersToRender.map((member, memberIndex) => (
									<Text key={memberIndex} style={healthStyles.aseguradoName}>
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
