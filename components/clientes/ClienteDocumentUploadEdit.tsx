"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
	Upload,
	FileText,
	X,
	AlertCircle,
	CheckCircle2,
	RefreshCw,
	Download,
	History,
	Loader2,
	Trash2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	type ClienteDocumento,
	type TipoDocumentoCliente,
	getDocumentTypesForClientType,
	isDocumentRequired,
	validateFile,
	formatFileSize,
	validateClientDocuments,
	type ClienteDocumentoFormState,
} from "@/types/clienteDocumento";
import {
	uploadClientDocument,
	replaceClientDocument,
	getDocumentHistory,
	getActiveDocuments,
	discardClientDocument,
	type DocumentHistoryItem,
} from "@/app/clientes/documentos/actions";

type Props = {
	clientId: string;
	clientType: "natural" | "unipersonal" | "juridica";
	isAdmin?: boolean;
	onDocumentChange?: () => void;
};

export function ClienteDocumentUploadEdit({ clientId, clientType, isAdmin = false, onDocumentChange }: Props) {
	const [documents, setDocuments] = useState<ClienteDocumento[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);

	// Upload form state
	const [selectedDocType, setSelectedDocType] = useState<TipoDocumentoCliente | "">("");
	const [descripcion, setDescripcion] = useState("");
	const [isUploading, setIsUploading] = useState(false);

	// Replace state
	const [replaceDocId, setReplaceDocId] = useState<string | null>(null);
	const [replaceFile, setReplaceFile] = useState<File | null>(null);
	const [isReplacing, setIsReplacing] = useState(false);

	// History modal state
	const [historyDocType, setHistoryDocType] = useState<TipoDocumentoCliente | null>(null);
	const [historyData, setHistoryData] = useState<DocumentHistoryItem[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

	// Discard confirmation
	const [discardDocId, setDiscardDocId] = useState<string | null>(null);
	const [isDiscarding, setIsDiscarding] = useState(false);

	const documentTypes = getDocumentTypesForClientType(clientType);

	// Convert existing documents to form state format for validation
	const documentosFormState: ClienteDocumentoFormState[] = documents.map((doc) => ({
		tipo_documento: doc.tipo_documento as TipoDocumentoCliente,
		nombre_archivo: doc.nombre_archivo,
		tipo_archivo: doc.tipo_archivo,
		tamano_bytes: doc.tamano_bytes,
		file: new File([], doc.nombre_archivo), // Placeholder, not used for validation
		descripcion: doc.descripcion || undefined,
	}));
	const validation = validateClientDocuments(documentosFormState, clientType);

	// Load documents
	const loadDocuments = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const result = await getActiveDocuments(clientId);
		if (result.success) {
			setDocuments(result.data);
		} else {
			setError(result.error);
		}

		setIsLoading(false);
	}, [clientId]);

	useEffect(() => {
		loadDocuments();
	}, [loadDocuments]);

	// Handle file upload for new document
	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			setUploadError(null);

			if (!selectedDocType) {
				setUploadError("Por favor seleccione el tipo de documento antes de subir archivos");
				return;
			}

			if (acceptedFiles.length === 0) {
				setUploadError("No se seleccionaron archivos válidos");
				return;
			}

			const file = acceptedFiles[0];

			// Validate file
			const validationError = validateFile(file);
			if (validationError) {
				setUploadError(validationError.message);
				return;
			}

			setIsUploading(true);

			// Convert file to base64
			const reader = new FileReader();
			reader.onload = async () => {
				const base64 = (reader.result as string).split(",")[1];

				const result = await uploadClientDocument({
					client_id: clientId,
					tipo_documento: selectedDocType,
					file_base64: base64,
					file_name: file.name,
					file_type: file.type,
					file_size: file.size,
					descripcion: descripcion.trim() || undefined,
				});

				if (result.success) {
					setSelectedDocType("");
					setDescripcion("");
					await loadDocuments();
					onDocumentChange?.();
				} else {
					setUploadError(result.error);
				}

				setIsUploading(false);
			};
			reader.onerror = () => {
				setUploadError("Error al leer el archivo");
				setIsUploading(false);
			};
			reader.readAsDataURL(file);
		},
		[clientId, selectedDocType, descripcion, loadDocuments, onDocumentChange]
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
		multiple: false,
		disabled: isUploading,
	});

	// Handle replace document
	const handleReplace = async () => {
		if (!replaceDocId || !replaceFile) return;

		setIsReplacing(true);

		// Convert file to base64
		const reader = new FileReader();
		reader.onload = async () => {
			const base64 = (reader.result as string).split(",")[1];

			const result = await replaceClientDocument({
				document_id: replaceDocId,
				file_base64: base64,
				file_name: replaceFile.name,
				file_type: replaceFile.type,
				file_size: replaceFile.size,
			});

			if (result.success) {
				setReplaceDocId(null);
				setReplaceFile(null);
				await loadDocuments();
				onDocumentChange?.();
			} else {
				setUploadError(result.error);
			}

			setIsReplacing(false);
		};
		reader.onerror = () => {
			setUploadError("Error al leer el archivo");
			setIsReplacing(false);
		};
		reader.readAsDataURL(replaceFile);
	};

	// Handle view history
	const handleViewHistory = async (tipoDocumento: TipoDocumentoCliente) => {
		setHistoryDocType(tipoDocumento);
		setIsLoadingHistory(true);

		const result = await getDocumentHistory(clientId, tipoDocumento);
		if (result.success) {
			setHistoryData(result.data);
		}

		setIsLoadingHistory(false);
	};

	// Handle discard document
	const handleDiscard = async () => {
		if (!discardDocId) return;

		setIsDiscarding(true);

		const result = await discardClientDocument(discardDocId);
		if (result.success) {
			setDiscardDocId(null);
			await loadDocuments();
			onDocumentChange?.();
		} else {
			setUploadError(result.error);
		}

		setIsDiscarding(false);
	};

	// Handle download document
	const handleDownload = async (storagePath: string) => {
		try {
			const { createClient } = await import("@/utils/supabase/client");
			const supabase = createClient();

			const { data } = supabase.storage.from("clientes-documentos").getPublicUrl(storagePath);

			if (data?.publicUrl) {
				window.open(data.publicUrl, "_blank");
			}
		} catch (err) {
			console.error("Error downloading document:", err);
		}
	};

	// Get available document types (exclude already uploaded)
	const availableDocTypes = Object.entries(documentTypes).filter(
		([key]) => !documents.some((d) => d.tipo_documento === key)
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<span className="ml-2 text-gray-600">Cargando documentos...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
				<p className="text-red-600">{error}</p>
				<Button variant="outline" onClick={loadDocuments} className="mt-2">
					Reintentar
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with validation status */}
			<div className="flex items-start justify-between">
				<div>
					<h3 className="text-lg font-semibold text-gray-900">Documentos del Cliente</h3>
					<p className="text-sm text-gray-600 mt-1">
						Suba nuevos documentos o actualice los existentes
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

			{/* Upload Section */}
			{availableDocTypes.length > 0 && (
				<div className="border border-gray-200 rounded-lg p-6 space-y-4">
					<h4 className="font-medium text-gray-900">Subir Nuevo Documento</h4>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Document type selector */}
						<div className="space-y-2">
							<Label htmlFor="tipo_documento">
								Tipo de Documento <span className="text-red-500">*</span>
							</Label>
							<Select
								value={selectedDocType}
								onValueChange={(value) => setSelectedDocType(value as TipoDocumentoCliente)}
								disabled={isUploading}
							>
								<SelectTrigger id="tipo_documento">
									<SelectValue placeholder="Seleccione el tipo..." />
								</SelectTrigger>
								<SelectContent>
									{availableDocTypes.map(([key, label]) => (
										<SelectItem key={key} value={key}>
											{label}
											{isDocumentRequired(key as TipoDocumentoCliente, clientType) && (
												<span className="ml-2 text-red-500">*</span>
											)}
										</SelectItem>
									))}
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
								disabled={!selectedDocType || isUploading}
							/>
						</div>
					</div>

					{/* Dropzone */}
					<div
						{...getRootProps()}
						className={`
							border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
							${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"}
							${!selectedDocType || isUploading ? "opacity-50 cursor-not-allowed" : ""}
						`}
					>
						<input {...getInputProps()} disabled={!selectedDocType || isUploading} />
						{isUploading ? (
							<>
								<Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
								<p className="text-sm text-gray-600">Subiendo documento...</p>
							</>
						) : (
							<>
								<Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
								{isDragActive ? (
									<p className="text-sm text-gray-600">Suelte el archivo aquí...</p>
								) : (
									<>
										<p className="text-sm text-gray-600 mb-1">
											Arrastre un archivo aquí o haga clic para seleccionar
										</p>
										<p className="text-xs text-gray-500">PDF, JPG, PNG, DOC, DOCX (máx. 10MB)</p>
									</>
								)}
							</>
						)}
					</div>
				</div>
			)}

			{/* Upload Error */}
			{uploadError && (
				<div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
					<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
					<p className="text-sm text-red-800">{uploadError}</p>
					<Button variant="ghost" size="sm" onClick={() => setUploadError(null)} className="ml-auto -my-1">
						<X className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Existing Documents List */}
			{documents.length > 0 && (
				<div className="border border-gray-200 rounded-lg">
					<div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
						<h4 className="text-sm font-medium text-gray-900">
							Documentos Cargados ({documents.length})
						</h4>
					</div>

					<div className="divide-y divide-gray-200">
						{documents.map((doc) => {
							const isRequired = isDocumentRequired(doc.tipo_documento as TipoDocumentoCliente, clientType);
							const docLabel = (documentTypes as Record<string, string>)[doc.tipo_documento] || doc.tipo_documento;

							return (
								<div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
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
														{doc.version > 1 && (
															<Badge variant="outline" className="text-xs">
																v{doc.version}
															</Badge>
														)}
													</p>
													<p className="text-sm text-gray-600 truncate">{doc.nombre_archivo}</p>
													<p className="text-xs text-gray-500 mt-1">
														{formatFileSize(doc.tamano_bytes)}
														{doc.descripcion && ` • ${doc.descripcion}`}
													</p>
													<p className="text-xs text-gray-400 mt-1">
														Subido: {new Date(doc.fecha_subida).toLocaleDateString()}
													</p>
												</div>

												<div className="flex items-center gap-2 flex-shrink-0">
													{/* Download */}
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDownload(doc.storage_path)}
														title="Descargar"
													>
														<Download className="h-4 w-4" />
													</Button>

													{/* Replace */}
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setReplaceDocId(doc.id)}
														title="Reemplazar"
													>
														<RefreshCw className="h-4 w-4" />
													</Button>

													{/* History (Admin only) */}
													{isAdmin && doc.version > 1 && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleViewHistory(doc.tipo_documento as TipoDocumentoCliente)}
															title="Ver historial"
														>
															<History className="h-4 w-4" />
														</Button>
													)}

													{/* Discard */}
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setDiscardDocId(doc.id)}
														title="Descartar"
														className="text-red-600 hover:text-red-700 hover:bg-red-50"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
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
			{documents.length === 0 && availableDocTypes.length === 0 && (
				<div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
					<FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<p className="text-sm">No hay documentos disponibles para este tipo de cliente</p>
				</div>
			)}

			{documents.length === 0 && availableDocTypes.length > 0 && (
				<div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
					<FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<p className="text-sm">No se han cargado documentos todavía</p>
					<p className="text-xs mt-1">Seleccione el tipo de documento y suba archivos</p>
				</div>
			)}

			{/* Replace Document Dialog */}
			<Dialog open={!!replaceDocId} onOpenChange={(open) => !open && setReplaceDocId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reemplazar Documento</DialogTitle>
						<DialogDescription>
							Seleccione un nuevo archivo para reemplazar el documento actual.
							El documento anterior se guardará en el historial.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="border-2 border-dashed rounded-lg p-6 text-center">
							<input
								type="file"
								accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
								className="hidden"
								id="replace-file-input"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										const validationError = validateFile(file);
										if (validationError) {
											setUploadError(validationError.message);
											return;
										}
										setReplaceFile(file);
									}
								}}
							/>
							<label htmlFor="replace-file-input" className="cursor-pointer">
								{replaceFile ? (
									<div className="flex items-center justify-center gap-2">
										<FileText className="h-8 w-8 text-primary" />
										<div className="text-left">
											<p className="font-medium">{replaceFile.name}</p>
											<p className="text-sm text-gray-500">{formatFileSize(replaceFile.size)}</p>
										</div>
									</div>
								) : (
									<>
										<Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
										<p className="text-sm text-gray-600">
											Haga clic para seleccionar un archivo
										</p>
									</>
								)}
							</label>
						</div>

						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setReplaceDocId(null);
									setReplaceFile(null);
								}}
							>
								Cancelar
							</Button>
							<Button onClick={handleReplace} disabled={!replaceFile || isReplacing}>
								{isReplacing ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Reemplazando...
									</>
								) : (
									<>
										<RefreshCw className="h-4 w-4 mr-2" />
										Reemplazar
									</>
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* History Dialog (Admin only) */}
			{isAdmin && (
				<Dialog open={!!historyDocType} onOpenChange={(open) => !open && setHistoryDocType(null)}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Historial de Versiones</DialogTitle>
							<DialogDescription>
								{historyDocType && (documentTypes as Record<string, string>)[historyDocType]}
							</DialogDescription>
						</DialogHeader>

						{isLoadingHistory ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-primary" />
							</div>
						) : (
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{historyData.map((item, index) => (
									<div
										key={item.id}
										className={`p-3 rounded-lg border ${
											item.estado === "activo"
												? "border-green-200 bg-green-50"
												: "border-gray-200 bg-gray-50"
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Badge variant={item.estado === "activo" ? "default" : "secondary"}>
													v{item.version}
												</Badge>
												{item.estado === "activo" && (
													<Badge variant="outline" className="text-green-600 border-green-600">
														Actual
													</Badge>
												)}
												{item.estado === "reemplazado" && (
													<Badge variant="outline" className="text-gray-600">
														Reemplazado
													</Badge>
												)}
											</div>
											<span className="text-xs text-gray-500">
												{new Date(item.fecha_subida).toLocaleString()}
											</span>
										</div>
										<p className="text-sm mt-2">{item.nombre_archivo}</p>
										<p className="text-xs text-gray-500 mt-1">
											{formatFileSize(item.tamano_bytes)}
											{item.subido_por_nombre && ` • Subido por: ${item.subido_por_nombre}`}
										</p>
										{item.replaced_at && (
											<p className="text-xs text-gray-400 mt-1">
												Reemplazado: {new Date(item.replaced_at).toLocaleString()}
											</p>
										)}
									</div>
								))}
							</div>
						)}
					</DialogContent>
				</Dialog>
			)}

			{/* Discard Confirmation Dialog */}
			<AlertDialog open={!!discardDocId} onOpenChange={(open) => !open && setDiscardDocId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Descartar Documento</AlertDialogTitle>
						<AlertDialogDescription>
							¿Está seguro de que desea descartar este documento? El documento no se eliminará
							permanentemente y podrá ser restaurado por un administrador si es necesario.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDiscarding}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDiscard}
							disabled={isDiscarding}
							className="bg-red-600 hover:bg-red-700"
						>
							{isDiscarding ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Descartando...
								</>
							) : (
								"Descartar"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
