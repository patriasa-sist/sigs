"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { TIPOS_DOCUMENTO_SINIESTRO, type TipoDocumentoSiniestro, type DocumentoSiniestroConUsuario, type DocumentoSiniestro } from "@/types/siniestro";
import { agregarDocumentosSiniestro } from "@/app/siniestros/actions";
import {
	descartarDocumentoSiniestro,
	restaurarDocumentoSiniestro,
	eliminarDocumentoSiniestroPermanente,
} from "@/app/siniestros/documentos/actions";
import { toast } from "sonner";
import DocumentUploader from "@/components/siniestros/shared/DocumentUploader";

interface DocumentosPorTipoProps {
	siniestroId: string;
	documentos: DocumentoSiniestroConUsuario[];
	onDocumentosChange: () => void;
	estadoSiniestro: string;
	esAdmin: boolean;
}

export default function DocumentosPorTipo({
	siniestroId,
	documentos,
	onDocumentosChange,
	estadoSiniestro,
	esAdmin,
}: DocumentosPorTipoProps) {
	const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumentoSiniestro>(TIPOS_DOCUMENTO_SINIESTRO[0]);
	const [operationLoading, setOperationLoading] = useState<string | null>(null);

	// Documentos temporales (para el uploader)
	const [documentosTemporales, setDocumentosTemporales] = useState<DocumentoSiniestro[]>([]);
	const [uploading, setUploading] = useState(false);

	// Agrupar documentos por tipo
	const documentosPorTipo = useMemo(() => {
		const grupos: Record<TipoDocumentoSiniestro, DocumentoSiniestroConUsuario[]> = {} as Record<TipoDocumentoSiniestro, DocumentoSiniestroConUsuario[]>;

		TIPOS_DOCUMENTO_SINIESTRO.forEach((tipo) => {
			grupos[tipo] = documentos.filter((doc) => doc.tipo_documento === tipo);
		});

		return grupos;
	}, [documentos]);

	// Documentos del tipo seleccionado (memoizado)
	const documentosFiltrados = useMemo(
		() => documentosPorTipo[tipoSeleccionado] || [],
		[documentosPorTipo, tipoSeleccionado]
	);

	// Handler para agregar documento temporal
	const handleAgregarDocumento = useCallback((doc: DocumentoSiniestro) => {
		// Asegurar que el documento tenga el tipo seleccionado
		const documentoConTipo: DocumentoSiniestro = {
			...doc,
			tipo_documento: tipoSeleccionado,
		};
		setDocumentosTemporales(prev => [...prev, documentoConTipo]);
	}, [tipoSeleccionado]);

	// Handler para eliminar documento temporal
	const handleEliminarDocumentoTemporal = useCallback((index: number) => {
		setDocumentosTemporales(prev => prev.filter((_, i) => i !== index));
	}, []);

	// Handler para subir documentos temporales
	const handleSubirDocumentos = useCallback(async () => {
		if (documentosTemporales.length === 0) {
			toast.error("Agrega al menos un documento");
			return;
		}

		setUploading(true);

		try {
			const result = await agregarDocumentosSiniestro(siniestroId, documentosTemporales);

			if (result.success) {
				toast.success(`${documentosTemporales.length} documento(s) agregado(s) correctamente`);
				setDocumentosTemporales([]);
				onDocumentosChange();
			} else {
				toast.error(result.error || "Error al subir documentos");
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Error al subir documentos");
		} finally {
			setUploading(false);
		}
	}, [documentosTemporales, siniestroId, onDocumentosChange]);

	// Handler para descartar
	const handleDescartar = useCallback(
		async (documentoId: string) => {
			setOperationLoading(documentoId);

			try {
				const result = await descartarDocumentoSiniestro(documentoId, siniestroId);

				if (result.success) {
					toast.success("Documento descartado");
					onDocumentosChange();
				} else {
					toast.error(result.error || "Error al descartar");
				}
			} catch (error) {
				console.error("Error:", error);
				toast.error("Error al descartar documento");
			} finally {
				setOperationLoading(null);
			}
		},
		[siniestroId, onDocumentosChange]
	);

	// Handler para restaurar (solo admin)
	const handleRestaurar = useCallback(
		async (documentoId: string) => {
			setOperationLoading(documentoId);

			try {
				const result = await restaurarDocumentoSiniestro(documentoId, siniestroId);

				if (result.success) {
					toast.success("Documento restaurado");
					onDocumentosChange();
				} else {
					toast.error(result.error || "Error al restaurar");
				}
			} catch (error) {
				console.error("Error:", error);
				toast.error("Error al restaurar documento");
			} finally {
				setOperationLoading(null);
			}
		},
		[siniestroId, onDocumentosChange]
	);

	// Handler para eliminar permanentemente (solo admin)
	const handleEliminarPermanente = useCallback(
		async (documentoId: string, archivoUrl: string) => {
			if (!confirm("¿Estás seguro? Esta acción no se puede deshacer.")) return;

			setOperationLoading(documentoId);

			try {
				const result = await eliminarDocumentoSiniestroPermanente(documentoId, archivoUrl, siniestroId);

				if (result.success) {
					toast.success("Documento eliminado permanentemente");
					onDocumentosChange();
				} else {
					toast.error(result.error || "Error al eliminar");
				}
			} catch (error) {
				console.error("Error:", error);
				toast.error("Error al eliminar documento");
			} finally {
				setOperationLoading(null);
			}
		},
		[siniestroId, onDocumentosChange]
	);

	// Verificar si es imagen
	const esImagen = (nombreArchivo: string) => {
		const ext = nombreArchivo.split(".").pop()?.toLowerCase();
		return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
	};

	// Construir URL completa del archivo desde Supabase Storage
	const obtenerUrlArchivo = (archivoUrl: string | undefined) => {
		if (!archivoUrl) return "";

		// Si archivo_url ya es una URL completa, usarla directamente
		if (archivoUrl.startsWith("http")) {
			return archivoUrl;
		}

		// Si es una ruta relativa, construir la URL completa
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		return `${supabaseUrl}/storage/v1/object/public/siniestros-documentos/${archivoUrl}`;
	};

	const puedeAgregarDocumentos = estadoSiniestro === "abierto";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
			{/* Sidebar con pestañas */}
			<Card className="lg:col-span-1 overflow-y-auto">
				<CardContent className="p-2 space-y-1">
					{TIPOS_DOCUMENTO_SINIESTRO.map((tipo) => {
						const count = documentosPorTipo[tipo]?.length || 0;
						const isActive = tipoSeleccionado === tipo;

						return (
							<button
								key={tipo}
								onClick={() => setTipoSeleccionado(tipo)}
								className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
									isActive
										? "bg-primary text-primary-foreground font-medium"
										: "hover:bg-secondary text-muted-foreground"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="truncate">{tipo}</span>
									{count > 0 && (
										<span
											className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
												isActive ? "bg-primary-foreground/20" : "bg-secondary"
											}`}
										>
											{count}
										</span>
									)}
								</div>
							</button>
						);
					})}
				</CardContent>
			</Card>

			{/* Área principal con documentos */}
			<Card className="lg:col-span-3">
				<CardContent className="p-6 h-full flex flex-col overflow-y-auto">
					<div className="mb-4">
						<h3 className="text-lg font-semibold mb-1">{tipoSeleccionado}</h3>
						<p className="text-sm text-muted-foreground">
							{documentosFiltrados.length > 0
								? `${documentosFiltrados.length} documento(s) en sistema`
								: "No hay documentos de este tipo"}
						</p>
					</div>

					{/* DocumentUploader con drag & drop (solo si puede agregar) */}
					{puedeAgregarDocumentos && (
						<div className="mb-4">
							<DocumentUploader
								documentos={documentosTemporales}
								onAgregarDocumento={handleAgregarDocumento}
								onEliminarDocumento={handleEliminarDocumentoTemporal}
								tipoPreseleccionado={tipoSeleccionado}
								mostrarSelectorTipo={false}
								maxFiles={50}
								maxSizeMB={20}
							/>

							{/* Botón para subir los documentos temporales */}
							{documentosTemporales.length > 0 && (
								<div className="flex justify-end gap-2 mt-4 pt-4 border-t">
									<Button variant="outline" onClick={() => setDocumentosTemporales([])} disabled={uploading}>
										Cancelar
									</Button>
									<Button onClick={handleSubirDocumentos} disabled={uploading}>
										{uploading ? (
											<>
												<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												Subiendo...
											</>
										) : (
											`Subir ${documentosTemporales.length} Documento(s)`
										)}
									</Button>
								</div>
							)}
						</div>
					)}

					{/* Documentos ya subidos */}
					{documentosFiltrados.length > 0 && (
						<div className="space-y-3">
							<p className="text-sm font-medium">
								Documentos de {tipoSeleccionado} ({documentosFiltrados.length})
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
								{documentosFiltrados.map((doc) => (
									<div key={doc.id} className="border rounded-lg p-3 space-y-2">
										{/* Miniatura o icono */}
										<div className="aspect-video bg-secondary rounded-md flex items-center justify-center overflow-hidden">
											{esImagen(doc.nombre_archivo) ? (
												// eslint-disable-next-line @next/next/no-img-element
											<img src={obtenerUrlArchivo(doc.archivo_url)} alt={doc.nombre_archivo} className="w-full h-full object-cover" />
											) : (
												<FileText className="h-12 w-12 text-muted-foreground" />
											)}
										</div>

										{/* Información */}
										<div>
											<p className="text-sm font-medium truncate" title={doc.nombre_archivo}>
												{doc.nombre_archivo}
											</p>
											<p className="text-xs text-muted-foreground">
												{doc.tamano_bytes ? `${(doc.tamano_bytes / 1024).toFixed(1)} KB` : ""}
											</p>
											<p className="text-xs text-muted-foreground">
												{doc.usuario_nombre || "Desconocido"} •{" "}
												{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("es-BO") : ""}
											</p>
										</div>

										{/* Acciones */}
										<div className="flex gap-2">
											<Button variant="outline" size="sm" asChild className="flex-1">
												<a href={obtenerUrlArchivo(doc.archivo_url)} target="_blank" rel="noopener noreferrer">
													<ExternalLink className="mr-1 h-3 w-3" />
													Ver
												</a>
											</Button>

											{doc.estado === "activo" && puedeAgregarDocumentos && (
												<Button
													variant="destructive"
													size="sm"
													onClick={() => doc.id && handleDescartar(doc.id)}
													disabled={operationLoading === doc.id}
												>
													{operationLoading === doc.id ? (
														<Loader2 className="h-3 w-3 animate-spin" />
													) : (
														<Trash2 className="h-3 w-3" />
													)}
												</Button>
											)}

											{doc.estado === "descartado" && esAdmin && (
												<>
													<Button
														variant="outline"
														size="sm"
														onClick={() => doc.id && handleRestaurar(doc.id)}
														disabled={operationLoading === doc.id}
													>
														{operationLoading === doc.id ? (
															<Loader2 className="h-3 w-3 animate-spin" />
														) : (
															<RotateCcw className="h-3 w-3" />
														)}
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => doc.id && doc.archivo_url && handleEliminarPermanente(doc.id, doc.archivo_url)}
														disabled={operationLoading === doc.id}
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												</>
											)}
										</div>

										{doc.estado === "descartado" && (
											<p className="text-xs text-red-600 italic">Documento descartado</p>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
