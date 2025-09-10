"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { processExcelFile } from "@/utils/excel";
import { ExcelUploadResult, ProcessedInsuranceRecord, SYSTEM_CONSTANTS } from "@/types/insurance";

interface FileUploadProps {
	onDataLoaded: (data: ProcessedInsuranceRecord[]) => void;
	onError: (error: string) => void;
	disabled?: boolean;
}

export default function FileUpload({ onDataLoaded, onError, disabled = false }: FileUploadProps) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadResult, setUploadResult] = useState<ExcelUploadResult | null>(null);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (disabled || acceptedFiles.length === 0) return;

			const file = acceptedFiles[0];
			setIsProcessing(true);
			setUploadProgress(0);
			setUploadResult(null);

			try {
				// Simular progreso de carga
				const progressInterval = setInterval(() => {
					setUploadProgress((prev) => {
						if (prev >= 90) {
							clearInterval(progressInterval);
							return 90;
						}
						return prev + 10;
					});
				}, 100);

				const result = await processExcelFile(file);

				clearInterval(progressInterval);
				setUploadProgress(100);
				setUploadResult(result);

				if (result.success && result.data) {
					onDataLoaded(result.data);
				} else {
					onError(result.errors?.join(", ") || "Error al procesar el archivo");
				}
			} catch (error) {
				console.error("Error en upload:", error);
				onError("Error inesperado al procesar el archivo");
			} finally {
				setIsProcessing(false);
				setTimeout(() => setUploadProgress(0), 2000);
			}
		},
		[onDataLoaded, onError, disabled]
	);

	const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
		onDrop,
		accept: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
			"application/vnd.ms-excel": [".xls"],
		},
		maxFiles: 1,
		maxSize: 40 * 1024 * 1024, // 10MB
		disabled: disabled || isProcessing,
	});

	const clearResult = () => {
		setUploadResult(null);
	};

	return (
		<div className="space-y-4">
			<Card className="patria-card">
				<CardContent className="p-6">
					<div
						{...getRootProps()}
						className={`
              upload-area cursor-pointer transition-all duration-200
              ${isDragActive ? "dragover" : ""}
              ${isDragReject ? "border-red-300 bg-red-50" : ""}
              ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `}
					>
						<input {...getInputProps()} />

						<div className="flex flex-col items-center justify-center space-y-4">
							{isProcessing ? (
								<>
									<div className="animate-spin">
										<FileSpreadsheet className="h-12 w-12 text-patria-blue" />
									</div>
									<p className="text-lg font-medium text-gray-700">Procesando archivo...</p>
									<div className="w-full max-w-xs">
										<Progress value={uploadProgress} className="h-2" />
										<p className="text-sm text-gray-500 mt-1 text-center">{uploadProgress}%</p>
									</div>
								</>
							) : (
								<>
									<Upload className="h-12 w-12 text-patria-blue" />
									<div className="text-center">
										<p className="text-lg font-medium text-gray-700">{isDragActive ? "Suelta el archivo aquí" : "Arrastra tu archivo Excel o haz clic para seleccionar"}</p>
										<p className="text-sm text-gray-500 mt-2">Archivos soportados: .xlsx, .xls (máx. ${SYSTEM_CONSTANTS.MAX_UPLOAD_SIZE / 1024 / 1024}MB)</p>
									</div>

									{!isDragActive && (
										<Button variant="outline" className="mt-4" disabled={disabled || isProcessing}>
											<FileSpreadsheet className="h-4 w-4 mr-2" />
											Seleccionar Archivo
										</Button>
									)}
								</>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Resultados del upload */}
			{uploadResult && (
				<Card className="patria-card">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								{uploadResult.success ? (
									<Alert className="border-green-200 bg-green-50">
										<CheckCircle className="h-4 w-4 text-green-600" />
										<AlertDescription className="text-green-800">
											<div className="space-y-2">
												<p className="font-medium">✅ Archivo procesado exitosamente</p>
												<div className="text-sm space-y-1">
													<p>• Total de registros: {uploadResult.totalRecords}</p>
													<p>• Registros válidos: {uploadResult.validRecords}</p>
													{uploadResult.warnings && uploadResult.warnings.length > 0 && <p>• Advertencias: {uploadResult.warnings.length}</p>}
												</div>
											</div>
										</AlertDescription>
									</Alert>
								) : (
									<Alert className="border-red-200 bg-red-50">
										<AlertCircle className="h-4 w-4 text-red-600" />
										<AlertDescription className="text-red-800">
											<div className="space-y-2">
												<p className="font-medium">❌ Error al procesar archivo</p>
												{uploadResult.errors && (
													<ul className="text-sm space-y-1 list-disc list-inside">
														{uploadResult.errors.map((error, index) => (
															<li key={index}>{error}</li>
														))}
													</ul>
												)}
											</div>
										</AlertDescription>
									</Alert>
								)}

								{/* Mostrar advertencias si las hay */}
								{uploadResult.success && uploadResult.warnings && uploadResult.warnings.length > 0 && (
									<Alert className="border-yellow-200 bg-yellow-50 mt-3">
										<AlertCircle className="h-4 w-4 text-yellow-600" />
										<AlertDescription className="text-yellow-800">
											<div className="space-y-2">
												<p className="font-medium">⚠️ Advertencias encontradas:</p>
												<ul className="text-sm space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
													{uploadResult.warnings.slice(0, 10).map((warning, index) => (
														<li key={index}>{warning}</li>
													))}
													{uploadResult.warnings.length > 10 && <li className="font-medium">... y {uploadResult.warnings.length - 10} advertencias más</li>}
												</ul>
											</div>
										</AlertDescription>
									</Alert>
								)}
							</div>

							<Button variant="ghost" size="sm" onClick={clearResult} className="ml-2 shrink-0">
								<X className="h-4 w-4" />
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
