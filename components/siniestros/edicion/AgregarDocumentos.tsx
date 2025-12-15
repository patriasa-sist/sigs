"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText, ExternalLink, Trash2, RotateCcw, Loader2, Upload } from "lucide-react";
import DocumentUploader from "@/components/siniestros/shared/DocumentUploader";
import { agregarDocumentosSiniestro } from "@/app/siniestros/actions";
import {
	descartarDocumentoSiniestro,
	restaurarDocumentoSiniestro,
	eliminarDocumentoSiniestroPermanente,
} from "@/app/siniestros/documentos/actions";
import type { DocumentoSiniestro } from "@/types/siniestro";
import { toast } from "sonner";

interface AgregarDocumentosProps {
	siniestroId: string;
	documentosIniciales: DocumentoSiniestro[];
	estadoSiniestro: string;
	esAdmin: boolean;
}

export default function AgregarDocumentos({
	siniestroId,
	documentosIniciales,
	estadoSiniestro,
	esAdmin,
}: AgregarDocumentosProps) {
	const [documentos, setDocumentos] = useState<DocumentoSiniestro[]>([]);
	const [documentosActivos, setDocumentosActivos] = useState<DocumentoSiniestro[]>(documentosIniciales);
	const [uploading, setUploading] = useState(false);
	const [operationLoading, setOperationLoading] = useState<string | null>(null);

	const handleDocumentosChange = useCallback((docs: DocumentoSiniestro[]) => {
		setDocumentos(docs);
	}, []);

	const handleUpload = useCallback(async () => {
		if (documentos.length === 0) {
			toast.error("Agrega al menos un documento");
			return;
		}

		setUploading(true);

		try {
			const result = await agregarDocumentosSiniestro(siniestroId, documentos);

			if (result.success) {
				toast.success(`${documentos.length} documento(s) agregado(s) correctamente`);
				setDocumentos([]);
				// Recargar página para mostrar documentos actualizados
				window.location.reload();
			} else {
				toast.error(result.error || "Error al subir documentos");
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Error al subir documentos");
		} finally {
			setUploading(false);
		}
	}, [documentos, siniestroId]);

	const handleDescartar = useCallback(
		async (documentoId: string) => {
			setOperationLoading(documentoId);

			try {
				const result = await descartarDocumentoSiniestro(documentoId, siniestroId);

				if (result.success) {
					toast.success("Documento descartado");
					// Actualizar lista local
					setDocumentosActivos((prev) => prev.filter((doc) => doc.id !== documentoId));
				} else {
					toast.error(result.error || "Error al descartar documento");
				}
			} catch (error) {
				console.error("Error:", error);
				toast.error("Error al descartar documento");
			} finally {
				setOperationLoading(null);
			}
		},
		[siniestroId]
	);

	const handleRestaurar = useCallback(
		async (documentoId: string) => {
			setOperationLoading(documentoId);

			try {
				const result = await restaurarDocumentoSiniestro(documentoId, siniestroId);

				if (result.success) {
					toast.success("Documento restaurado");
					window.location.reload();
				} else {
					toast.error(result.error || "Error al restaurar documento");
				}
			} catch (error) {
				console.error("Error:", error);
				toast.error("Error al restaurar documento");
			} finally {
				setOperationLoading(null);
			}
		},
		[siniestroId]
	);

	const handleEliminarPermanente = useCallback(
		async (documentoId: string, archivoUrl: string) => {
			if (!confirm("¿Estás seguro de eliminar este documento permanentemente? Esta acción NO se puede deshacer.")) {
				return;
			}

			setOperationLoading(documentoId);

			try {
				const result = await eliminarDocumentoSiniestroPermanente(documentoId, archivoUrl, siniestroId);

				if (result.success) {
					toast.success("Documento eliminado permanentemente");
					window.location.reload();
				} else {
					toast.error(result.error || "Error al eliminar documento");
				}
			} catch (error) {
				console.error("Error:", error);
				toast.error("Error al eliminar documento");
			} finally {
				setOperationLoading(null);
			}
		},
		[siniestroId]
	);

	const getFileIcon = (filename: string) => {
		const ext = filename.split(".").pop()?.toLowerCase();
		if (["jpg", "jpeg", "png"].includes(ext || "")) {
			return "🖼️";
		}
		if (ext === "pdf") {
			return "📄";
		}
		return "📎";
	};

	const formatFileSize = (bytes: number | undefined): string => {
		if (!bytes) return "Tamaño desconocido";
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const getFileUrl = (doc: DocumentoSiniestro): string => {
		if (!doc.archivo_url) return "";

		// Si archivo_url ya es una URL completa, usarla directamente
		if (doc.archivo_url.startsWith("http")) {
			return doc.archivo_url;
		}

		// Si es una ruta relativa, construir la URL completa
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		return `${supabaseUrl}/storage/v1/object/public/siniestros-documentos/${doc.archivo_url}`;
	};

	const handleOpenInNewTab = (doc: DocumentoSiniestro) => {
		const fileUrl = getFileUrl(doc);
		if (fileUrl) {
			window.open(fileUrl, "_blank");
		}
	};

	return (
		<div className="space-y-4">
			{/* Agregar nuevos documentos */}
			{estadoSiniestro === "abierto" && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<Upload className="h-5 w-5 text-primary" />
							Agregar Nuevos Documentos
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<DocumentUploader documentos={documentos} onDocumentosChange={handleDocumentosChange} />

						{documentos.length > 0 && (
							<div className="flex justify-end gap-2 pt-2 border-t">
								<Button variant="outline" onClick={() => setDocumentos([])} disabled={uploading}>
									Cancelar
								</Button>
								<Button onClick={handleUpload} disabled={uploading}>
									{uploading ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Subiendo...
										</>
									) : (
										<>
											<Upload className="h-4 w-4 mr-2" />
											Subir {documentos.length} Documento(s)
										</>
									)}
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{estadoSiniestro !== "abierto" && (
				<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
					<AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
					<div className="text-amber-900 dark:text-amber-100">
						<p className="font-medium">Siniestro cerrado</p>
						<p className="text-sm">No se pueden agregar documentos a siniestros cerrados</p>
					</div>
				</div>
			)}

			{/* Lista de documentos existentes */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Documentos del Siniestro ({documentosActivos.length})</CardTitle>
				</CardHeader>
				<CardContent>
					{documentosActivos.length === 0 ? (
						<div className="text-center py-8">
							<FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
							<p className="text-sm text-muted-foreground">No hay documentos registrados</p>
						</div>
					) : (
						<div className="space-y-2">
							{documentosActivos.map((doc) => (
								<Card key={doc.id} className="overflow-hidden">
									<CardContent className="p-4">
										<div className="flex items-start gap-4">
											{/* Icono del archivo */}
											<div className="flex-shrink-0 text-3xl">{getFileIcon(doc.nombre_archivo)}</div>

											{/* Información del documento */}
											<div className="flex-1 min-w-0">
												<p className="font-medium text-sm truncate">{doc.nombre_archivo}</p>
												<div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
													<span className="bg-secondary px-2 py-0.5 rounded">
														{doc.tipo_documento}
													</span>
													<span>{formatFileSize(doc.tamano_bytes)}</span>
													{doc.uploaded_at && (
														<span>
															{new Date(doc.uploaded_at).toLocaleDateString("es-BO")}
														</span>
													)}
												</div>
												{doc.usuario_nombre && (
													<p className="text-xs text-muted-foreground mt-1">
														Subido por: {doc.usuario_nombre}
													</p>
												)}
											</div>

											{/* Acciones */}
											<div className="flex gap-2 flex-shrink-0">
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleOpenInNewTab(doc)}
													title="Ver documento"
												>
													<ExternalLink className="h-4 w-4" />
												</Button>

												{estadoSiniestro === "abierto" && (
													<Button
														variant="destructive"
														size="sm"
														onClick={() => handleDescartar(doc.id!)}
														disabled={operationLoading === doc.id}
														title="Descartar documento"
													>
														{operationLoading === doc.id ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Trash2 className="h-4 w-4" />
														)}
													</Button>
												)}

												{esAdmin && doc.estado === "descartado" && (
													<>
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleRestaurar(doc.id!)}
															disabled={operationLoading === doc.id}
															title="Restaurar documento"
														>
															{operationLoading === doc.id ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<RotateCcw className="h-4 w-4" />
															)}
														</Button>
														<Button
															variant="destructive"
															size="sm"
															onClick={() => handleEliminarPermanente(doc.id!, doc.archivo_url!)}
															disabled={operationLoading === doc.id}
															title="Eliminar permanentemente"
														>
															{operationLoading === doc.id ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<Trash2 className="h-4 w-4" />
															)}
														</Button>
													</>
												)}
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
