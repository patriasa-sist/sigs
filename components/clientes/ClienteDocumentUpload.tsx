"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
	type ClienteDocumentoFormState,
	type TipoDocumentoCliente,
	getDocumentTypesForClientType,
	isDocumentRequired,
	validateFile,
	formatFileSize,
	validateClientDocuments,
} from "@/types/clienteDocumento";

type Props = {
	clientType: "natural" | "unipersonal" | "juridica";
	documentos: ClienteDocumentoFormState[];
	onDocumentosChange: (documentos: ClienteDocumentoFormState[]) => void;
};

export function ClienteDocumentUpload({ clientType, documentos, onDocumentosChange }: Props) {
	const [selectedDocType, setSelectedDocType] = useState<TipoDocumentoCliente | "">("");
	const [descripcion, setDescripcion] = useState("");
	const [error, setError] = useState<string | null>(null);

	const documentTypes = getDocumentTypesForClientType(clientType);
	const validation = validateClientDocuments(documentos, clientType);

	// Handle file drop
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			setError(null);

			if (!selectedDocType) {
				setError("Por favor seleccione el tipo de documento antes de subir archivos");
				return;
			}

			if (acceptedFiles.length === 0) {
				setError("No se seleccionaron archivos válidos");
				return;
			}

			// Process each file
			const newDocuments: ClienteDocumentoFormState[] = [];

			for (const file of acceptedFiles) {
				// Validate file
				const validationError = validateFile(file);
				if (validationError) {
					setError(validationError.message);
					continue;
				}

				// Check if document type already exists
				const existingDoc = documentos.find((d) => d.tipo_documento === selectedDocType);
				if (existingDoc) {
					const docLabel = (documentTypes as Record<string, string>)[selectedDocType] || selectedDocType;
					setError(
						`Ya existe un documento del tipo "${docLabel}". Elimine el anterior primero.`
					);
					continue;
				}

				// Add to new documents
				newDocuments.push({
					tipo_documento: selectedDocType,
					nombre_archivo: file.name,
					tipo_archivo: file.type,
					tamano_bytes: file.size,
					file: file,
					descripcion: descripcion.trim() || undefined,
				});
			}

			if (newDocuments.length > 0) {
				onDocumentosChange([...documentos, ...newDocuments]);
				setSelectedDocType("");
				setDescripcion("");
			}
		},
		[selectedDocType, descripcion, documentos, documentTypes, onDocumentosChange]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/pdf": [".pdf"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/png": [".png"],
			"application/msword": [".doc"],
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
		},
		maxSize: 10 * 1024 * 1024, // 10MB
		multiple: true,
	});

	const handleRemoveDocument = (index: number) => {
		const newDocuments = documentos.filter((_, i) => i !== index);
		onDocumentosChange(newDocuments);
	};

	// Get available document types (exclude already uploaded)
	const availableDocTypes = Object.entries(documentTypes).filter(
		([key]) => !documentos.some((d) => d.tipo_documento === key)
	);

	return (
		<div className="space-y-6">
			{/* Header with validation status */}
			<div className="flex items-start justify-between">
				<div>
					<h3 className="text-lg font-semibold text-gray-900">Documentos del Cliente</h3>
					<p className="text-sm text-gray-600 mt-1">
						Suba los documentos requeridos y opcionales del cliente
					</p>
				</div>

				{validation.hasAllRequired ? (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Documentos completos</span>
					</div>
				) : (
					<div className="flex items-center gap-2 text-amber-600">
						<AlertCircle className="h-5 w-5" />
						<span className="text-sm font-medium">
							{validation.missingDocuments.length} documento(s) obligatorio(s) faltante(s)
						</span>
					</div>
				)}
			</div>

			{/* Missing required documents warning */}
			{!validation.hasAllRequired && (
				<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
					<div className="flex gap-3">
						<AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-amber-900">
								Documentos obligatorios faltantes:
							</p>
							<ul className="mt-2 space-y-1">
								{validation.missingDocuments.map((docType) => {
									const docLabel = (documentTypes as Record<string, string>)[docType] || docType;
									return (
										<li key={docType} className="text-sm text-amber-800">
											• {docLabel}
										</li>
									);
								})}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Upload Section */}
			<div className="border border-gray-200 rounded-lg p-6 space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Document type selector */}
					<div className="space-y-2">
						<Label htmlFor="tipo_documento">
							Tipo de Documento <span className="text-red-500">*</span>
						</Label>
						<Select
							value={selectedDocType}
							onValueChange={(value) => setSelectedDocType(value as TipoDocumentoCliente)}
						>
							<SelectTrigger id="tipo_documento">
								<SelectValue placeholder="Seleccione el tipo..." />
							</SelectTrigger>
							<SelectContent>
								{availableDocTypes.length === 0 ? (
									<div className="p-2 text-sm text-gray-500">
										Todos los tipos de documento ya fueron cargados
									</div>
								) : (
									availableDocTypes.map(([key, label]) => (
										<SelectItem key={key} value={key}>
											{label}
											{isDocumentRequired(key as TipoDocumentoCliente, clientType) && (
												<span className="ml-2 text-red-500">*</span>
											)}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="descripcion">Descripción (Opcional)</Label>
						<Input
							id="descripcion"
							placeholder="Ej: Cédula de identidad vigente"
							value={descripcion}
							onChange={(e) => setDescripcion(e.target.value)}
							disabled={!selectedDocType}
						/>
					</div>
				</div>

				{/* Dropzone */}
				<div
					{...getRootProps()}
					className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"}
            ${!selectedDocType ? "opacity-50 cursor-not-allowed" : ""}
          `}
				>
					<input {...getInputProps()} disabled={!selectedDocType} />
					<Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />

					{isDragActive ? (
						<p className="text-sm text-gray-600">Suelte los archivos aquí...</p>
					) : (
						<>
							<p className="text-sm text-gray-600 mb-1">
								Arrastre archivos aquí o haga clic para seleccionar
							</p>
							<p className="text-xs text-gray-500">PDF, JPG, PNG, DOC, DOCX (máx. 10MB)</p>
						</>
					)}
				</div>

				{error && (
					<div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
						<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-red-800">{error}</p>
					</div>
				)}
			</div>

			{/* Uploaded Documents List */}
			{documentos.length > 0 && (
				<div className="border border-gray-200 rounded-lg">
					<div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
						<h4 className="text-sm font-medium text-gray-900">
							Documentos Cargados ({documentos.length})
						</h4>
					</div>

					<div className="divide-y divide-gray-200">
						{documentos.map((doc, index) => {
							const isRequired = isDocumentRequired(doc.tipo_documento, clientType);

							const docLabel = (documentTypes as Record<string, string>)[doc.tipo_documento] || doc.tipo_documento;

							return (
								<div key={index} className="p-4 hover:bg-gray-50 transition-colors">
									<div className="flex items-start gap-3">
										<FileText className="h-10 w-10 text-primary flex-shrink-0" />

										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between gap-2">
												<div className="flex-1">
													<p className="font-medium text-gray-900 flex items-center gap-2">
														{docLabel}
														{isRequired && (
															<span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
																Obligatorio
															</span>
														)}
													</p>
													<p className="text-sm text-gray-600 truncate">{doc.nombre_archivo}</p>
													<p className="text-xs text-gray-500 mt-1">
														{formatFileSize(doc.tamano_bytes)}
														{doc.descripcion && ` • ${doc.descripcion}`}
													</p>
												</div>

												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveDocument(index)}
													className="flex-shrink-0"
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Empty state */}
			{documentos.length === 0 && (
				<div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
					<FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<p className="text-sm">No se han cargado documentos todavía</p>
					<p className="text-xs mt-1">Seleccione el tipo de documento y suba archivos</p>
				</div>
			)}
		</div>
	);
}
