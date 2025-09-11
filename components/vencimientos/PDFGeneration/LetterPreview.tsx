// components/PDFGeneration/LetterPreview.tsx
import React, { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import { LetterData } from "@/types/pdf";
import { HealthTemplate } from "./HealthTemplate";
import { GeneralTemplate } from "./GeneralTemplate";
import { Loader2 } from "lucide-react";

interface LetterPreviewProps {
	letterData: LetterData;
	width?: string | number;
	height?: string | number;
}

const LetterPreview: React.FC<LetterPreviewProps> = ({ letterData, width = "100%", height = "600px" }) => {
	const [loading, setLoading] = useState(true);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		// Function to generate PDF blob and create object URL
		const generatePreview = async () => {
			try {
				setLoading(true);

				// Determine which template to use based on letterData
				const Template = letterData.templateType === "salud" ? HealthTemplate : GeneralTemplate;

				// Generate PDF blob
				const pdfBlob = await pdf(<Template letterData={letterData} />).toBlob();

				// Create object URL from blob
				const url = URL.createObjectURL(pdfBlob);
				setPreviewUrl(url);
			} catch (error) {
				console.error("Error generating PDF preview:", error);
			} finally {
				setLoading(false);
			}
		};

		generatePreview();

		// Cleanup function to revoke object URL when component unmounts
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [letterData, previewUrl]);

	return (
		<div className="letter-preview-container" style={{ width, height, position: "relative" }}>
			{loading ? (
				<div
					className="preview-loading"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: "100%",
						height: "100%",
						backgroundColor: "#f9fafb",
						borderRadius: "0.375rem",
						border: "1px solid #e5e7eb",
					}}
				>
					<div className="flex flex-col items-center">
						<Loader2 className="h-10 w-10 animate-spin text-patria-blue" />
						<p className="mt-2 text-gray-600">Generando vista previa...</p>
					</div>
				</div>
			) : previewUrl ? (
				<iframe
					src={previewUrl}
					title="PDF Preview"
					width="100%"
					height="100%"
					style={{ border: "1px solid #e5e7eb", borderRadius: "0.375rem" }}
				/>
			) : (
				<div
					className="preview-error"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: "100%",
						height: "100%",
						backgroundColor: "#fee2e2",
						borderRadius: "0.375rem",
						border: "1px solid #fca5a5",
					}}
				>
					<p className="text-red-700">Error al generar la vista previa</p>
				</div>
			)}
		</div>
	);
};

export default LetterPreview;
