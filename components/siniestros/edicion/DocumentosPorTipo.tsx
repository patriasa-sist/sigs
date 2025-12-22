"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Image as ImageIcon, Upload, Trash2, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { TIPOS_DOCUMENTO_SINIESTRO, type TipoDocumentoSiniestro, type DocumentoSiniestroConUsuario } from "@/types/siniestro";
import { agregarDocumentosSiniestro } from "@/app/siniestros/actions";
import {
	descartarDocumentoSiniestro,
	restaurarDocumentoSiniestro,
	eliminarDocumentoSiniestroPermanente,
} from "@/app/siniestros/documentos/actions";
import { toast } from "sonner";

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
	const [uploading, setUploading] = useState(false);
	const [operationLoading, setOperationLoading] = useState<string | null>(null);

	// Agrupar documentos por tipo
	const documentosPorTipo = useMemo(() => {
		const grupos: Record<TipoDocumentoSiniestro, DocumentoSiniestroConUsuario[]> = {} as any;

		TIPOS_DOCUMENTO_SINIESTRO.forEach((tipo) => {
			grupos[tipo] = documentos.filter((doc) => doc.tipo_documento === tipo);
		});

		return grupos;
	}, [documentos]);

	// Documentos del tipo seleccionado
	const documentosFiltrados = documentosPorTipo[tipoSeleccionado] || [];

	// Handler para subir archivo
	const handleFileUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			// Validar tamaño (20MB)
			if (file.size > 20 * 1024 * 1024) {
				toast.error("El archivo excede el tamaño máximo de 20MB");
				return;
			}

			setUploading(true);

			try {
				// Crear documento con el tipo seleccionado
				const documento = {
					tipo_documento: tipoSeleccionado,
					nombre_archivo: file.name,
					file,
					tamano_bytes: file.size,
				};

				const result = await agregarDocumentosSiniestro(siniestroId, [documento]);

				if (result.success) {
					toast.success("Documento agregado correctamente");
					onDocumentosChange();
				} else {
					toast.error(result.error || "Error al subir documento");
				}
			} catch (error) {
				console.error("Error:", error);
				toast.error("Error al subir documento");
			} finally {
				setUploading(false);
				// Reset input
				e.target.value = "";
			}
		},
		[tipoSeleccionado, siniestroId, onDocumentosChange]
	);

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
				<CardContent className="p-6 h-full flex flex-col">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold">{tipoSeleccionado}</h3>
						{puedeAgregarDocumentos && (
							<div>
								<Input
									id={`file-upload-${tipoSeleccionado}`}
									type="file"
									className="hidden"
									onChange={handleFileUpload}
									disabled={uploading}
									accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
								/>
								<Label htmlFor={`file-upload-${tipoSeleccionado}`}>
									<Button variant="outline" size="sm" disabled={uploading} asChild>
										<span>
											{uploading ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Subiendo...
												</>
											) : (
												<>
													<Upload className="mr-2 h-4 w-4" />
													Subir Archivo
												</>
											)}
										</span>
									</Button>
								</Label>
							</div>
						)}
					</div>

					{/* Lista de documentos */}
					<div className="flex-1 overflow-y-auto">
						{documentosFiltrados.length === 0 ? (
							<div className="h-full flex items-center justify-center">
								<div className="text-center text-muted-foreground">
									<FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
									<p className="text-sm">No hay documentos de este tipo</p>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
								{documentosFiltrados.map((doc) => (
									<div key={doc.id} className="border rounded-lg p-3 space-y-2">
										{/* Miniatura o icono */}
										<div className="aspect-video bg-secondary rounded-md flex items-center justify-center overflow-hidden">
											{esImagen(doc.nombre_archivo) ? (
												<img src={doc.archivo_url} alt={doc.nombre_archivo} className="w-full h-full object-cover" />
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
												<a href={doc.archivo_url} target="_blank" rel="noopener noreferrer">
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
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
