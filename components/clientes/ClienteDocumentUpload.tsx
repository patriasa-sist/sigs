"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	type ClienteDocumentoFormState,
	type TipoDocumentoCliente,
	getDocumentTypesForClientType,
	isDocumentRequired,
	validateFile,
	formatFileSize,
	validateClientDocuments,
	NON_EXCEPTABLE_DOCUMENTS,
} from "@/types/clienteDocumento";

type Props = {
	clientType: "natural" | "unipersonal" | "juridica";
	documentos: ClienteDocumentoFormState[];
	onDocumentosChange: (documentos: ClienteDocumentoFormState[]) => void;
	exceptions?: TipoDocumentoCliente[];
};

export function ClienteDocumentUpload({ clientType, documentos, onDocumentosChange, exceptions = [] }: Props) {
	const [selectedDocType, setSelectedDocType] = useState<TipoDocumentoCliente | "">("");
	const [error, setError] = useState<string | null>(null);

	const documentTypes = getDocumentTypesForClientType(clientType);
	const validation = validateClientDocuments(documentos, clientType, exceptions);

	const isEffectivelyRequired = (docType: TipoDocumentoCliente): boolean => {
		if (!isDocumentRequired(docType, clientType)) return false;
		if (NON_EXCEPTABLE_DOCUMENTS.includes(docType)) return true;
		return !exceptions.includes(docType);
	};

	const isExcepted = (docType: TipoDocumentoCliente): boolean => {
		return (
			isDocumentRequired(docType, clientType) &&
			exceptions.includes(docType) &&
			!NON_EXCEPTABLE_DOCUMENTS.includes(docType)
		);
	};

	// All required doc types for the checklist (includes excepted ones)
	const allRequiredDocTypes = (Object.keys(documentTypes) as TipoDocumentoCliente[]).filter((key) =>
		isDocumentRequired(key, clientType)
	);

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

			const newDocuments: ClienteDocumentoFormState[] = [];

			for (const file of acceptedFiles) {
				const validationError = validateFile(file);
				if (validationError) {
					setError(validationError.message);
					continue;
				}

				const existingDoc = documentos.find((d) => d.tipo_documento === selectedDocType);
				if (existingDoc) {
					const docLabel = (documentTypes as Record<string, string>)[selectedDocType] || selectedDocType;
					setError(`Ya existe un documento del tipo "${docLabel}". Elimine el anterior primero.`);
					continue;
				}

				newDocuments.push({
					tipo_documento: selectedDocType,
					nombre_archivo: file.name,
					tipo_archivo: file.type,
					tamano_bytes: file.size,
					file: file,
				});
			}

			if (newDocuments.length > 0) {
				onDocumentosChange([...documentos, ...newDocuments]);
				setSelectedDocType("");
			}
		},
		[selectedDocType, documentos, documentTypes, onDocumentosChange]
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
		maxSize: 10 * 1024 * 1024,
		multiple: true,
	});

	const handleRemoveDocument = (index: number) => {
		const newDocuments = documentos.filter((_, i) => i !== index);
		onDocumentosChange(newDocuments);
	};

	const availableDocTypes = Object.entries(documentTypes).filter(
		([key]) => !documentos.some((d) => d.tipo_documento === key)
	);

	const pendingCount = validation.missingDocuments.length;

	return (
		<div className="space-y-4">
			{/* Required documents checklist — always visible, no layout shift */}
			{allRequiredDocTypes.length > 0 && (
				<div className="rounded-lg border bg-secondary/40 p-4">
					<div className="flex items-center justify-between mb-3">
						<p className="text-sm font-medium text-foreground">Documentos requeridos</p>
						{validation.hasAllRequired ? (
							<span className="flex items-center gap-1.5 text-xs font-medium text-accent">
								<CheckCircle2 className="h-3.5 w-3.5" />
								Completos
							</span>
						) : (
							<span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
								<AlertCircle className="h-3.5 w-3.5" />
								{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
							</span>
						)}
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
						{allRequiredDocTypes.map((docType) => {
							const uploaded = documentos.some((d) => d.tipo_documento === docType);
							const excepted = isExcepted(docType);
							const label = (documentTypes as Record<string, string>)[docType] || docType;
							const done = uploaded || excepted;

							return (
								<div
									key={docType}
									className={cn(
										"flex items-center gap-2 text-sm",
										done ? "text-accent" : "text-muted-foreground"
									)}
								>
									{done ? (
										<CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
									) : (
										<Circle className="h-3.5 w-3.5 flex-shrink-0" />
									)}
									<span className={cn(uploaded && "line-through decoration-accent/60")}>{label}</span>
									{excepted && (
										<span className="text-xs text-primary/70">(exceptuado)</span>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Exceptions info */}
			{exceptions.length > 0 && (
				<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
					<div className="flex gap-3">
						<AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-primary">
								Excepciones UIF activas (uso único)
							</p>
							<ul className="mt-1.5 space-y-0.5">
								{exceptions.map((docType) => {
									const docLabel = (documentTypes as Record<string, string>)[docType] || docType;
									return (
										<li key={docType} className="text-sm text-primary/80">
											• {docLabel}
										</li>
									);
								})}
							</ul>
							<p className="text-xs text-muted-foreground mt-2">
								Estos documentos son opcionales para este registro. La excepción se consumirá al guardar.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Upload Section */}
			<div className="rounded-lg border p-5 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="tipo_documento">
						Tipo de Documento <span className="text-destructive">*</span>
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
								<div className="p-2 text-sm text-muted-foreground">
									Todos los tipos de documento ya fueron cargados
								</div>
							) : (
								availableDocTypes.map(([key, label]) => (
									<SelectItem key={key} value={key}>
										{label}
										{isEffectivelyRequired(key as TipoDocumentoCliente) && (
											<span className="ml-2 text-destructive">*</span>
										)}
										{isExcepted(key as TipoDocumentoCliente) && (
											<span className="ml-2 text-primary/70">(exceptuado)</span>
										)}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</div>

				{/* Dropzone */}
				<div
					{...getRootProps()}
					className={cn(
						"border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
						isDragActive
							? "border-primary bg-primary/5"
							: "border-input hover:border-primary/50",
						!selectedDocType && "opacity-50 cursor-not-allowed"
					)}
				>
					<input {...getInputProps()} disabled={!selectedDocType} />
					<Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
					{isDragActive ? (
						<p className="text-sm text-muted-foreground">Suelte los archivos aquí...</p>
					) : (
						<>
							<p className="text-sm text-muted-foreground mb-1">
								Arrastre archivos aquí o haga clic para seleccionar
							</p>
							<p className="text-xs text-muted-foreground/70">PDF, JPG, PNG, DOC, DOCX (máx. 10MB)</p>
						</>
					)}
				</div>

				{error && (
					<div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
						<AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}
			</div>

			{/* Uploaded Documents List — always rendered to avoid layout shift */}
			<div className="rounded-lg border">
				<div className="px-4 py-3 bg-secondary/40 border-b">
					<h4 className="text-sm font-medium text-foreground">
						Documentos Cargados ({documentos.length})
					</h4>
				</div>

				{documentos.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
						<p className="text-sm">No se han cargado documentos todavía</p>
						<p className="text-xs mt-1 text-muted-foreground/70">Seleccione el tipo de documento y suba archivos</p>
					</div>
				) : (
					<div className="divide-y">
						{documentos.map((doc, index) => {
							const effectivelyRequired = isEffectivelyRequired(doc.tipo_documento);
							const excepted = isExcepted(doc.tipo_documento);
							const docLabel = (documentTypes as Record<string, string>)[doc.tipo_documento] || doc.tipo_documento;

							return (
								<div key={index} className="p-4 hover:bg-secondary/30 transition-colors">
									<div className="flex items-start gap-3">
										<FileText className="h-9 w-9 text-primary flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between gap-2">
												<div className="flex-1">
													<p className="font-medium text-foreground flex items-center gap-2 flex-wrap">
														{docLabel}
														{effectivelyRequired && (
															<span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-md">
																Obligatorio
															</span>
														)}
														{excepted && (
															<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
																Exceptuado (UIF)
															</span>
														)}
													</p>
													<p className="text-sm text-muted-foreground truncate mt-0.5">{doc.nombre_archivo}</p>
													<p className="text-xs text-muted-foreground/70 mt-0.5">
														{formatFileSize(doc.tamano_bytes)}
													</p>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveDocument(index)}
													className="flex-shrink-0 text-muted-foreground hover:text-destructive"
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
				)}
			</div>
		</div>
	);
}
