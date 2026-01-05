"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, AlertCircle } from "lucide-react";
import { TIPOS_DOCUMENTO_SINIESTRO, type TipoDocumentoSiniestro, type DocumentoSiniestro } from "@/types/siniestro";
import { toast } from "sonner";
import DocumentUploader from "@/components/siniestros/shared/DocumentUploader";

interface DocumentosInicialesProps {
	documentos: DocumentoSiniestro[];
	onAgregarDocumento: (documento: DocumentoSiniestro) => void;
	onEliminarDocumento: (index: number) => void;
}

export default function DocumentosInicialesStep({
	documentos,
	onAgregarDocumento,
	onEliminarDocumento,
}: DocumentosInicialesProps) {
	const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumentoSiniestro>(TIPOS_DOCUMENTO_SINIESTRO[0]);

	// Agrupar documentos por tipo
	const documentosPorTipo = useMemo(() => {
		const grupos: Record<TipoDocumentoSiniestro, DocumentoSiniestro[]> = {} as Record<TipoDocumentoSiniestro, DocumentoSiniestro[]>;

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

	// Documentos temporales para el uploader (solo del tipo seleccionado)
	const documentosTemporales: DocumentoSiniestro[] = [];

	// Handler para agregar documento con el tipo seleccionado
	const handleAgregarDocumento = useCallback((doc: DocumentoSiniestro) => {
		// Asegurar que el documento tenga el tipo seleccionado
		const documentoConTipo: DocumentoSiniestro = {
			...doc,
			tipo_documento: tipoSeleccionado,
		};
		onAgregarDocumento(documentoConTipo);
	}, [tipoSeleccionado, onAgregarDocumento]);

	// Handler para eliminar documento (ajustado para encontrar el índice correcto)
	const handleEliminarDocumento = useCallback((localIndex: number) => {
		// Calcular documentos filtrados localmente para evitar dependencia
		const docsDelTipo = documentosPorTipo[tipoSeleccionado] || [];
		const docToRemove = docsDelTipo[localIndex];
		if (!docToRemove) return;

		// Encontrar el índice global
		const globalIndex = documentos.findIndex(
			doc => doc.nombre_archivo === docToRemove.nombre_archivo &&
			       doc.tipo_documento === docToRemove.tipo_documento
		);

		if (globalIndex !== -1) {
			onEliminarDocumento(globalIndex);
			toast.success("Documento eliminado");
		}
	}, [documentosPorTipo, tipoSeleccionado, documentos, onEliminarDocumento]);


	return (
		<Card>
			<CardHeader>
				<CardTitle>Paso 4: Documentos Iniciales (Opcional)</CardTitle>
				<CardDescription>
					Adjunta los documentos relacionados al siniestro organizados por tipo
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Información */}
				<div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
					<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
					<div className="text-blue-900 dark:text-blue-100">
						<p className="font-medium mb-1">Organiza tus documentos por tipo con Drag & Drop</p>
						<p className="text-xs">
							Selecciona un tipo de documento en el menú lateral. Luego arrastra y suelta archivos en el área
							de carga, o haz click para seleccionar múltiples archivos. Los documentos se organizarán
							automáticamente por categoría.
						</p>
					</div>
				</div>

				{/* Layout con pestañas laterales */}
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
					{/* Sidebar con pestañas */}
					<Card className="lg:col-span-1 overflow-y-auto max-h-[600px]">
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

					{/* Área principal con DocumentUploader */}
					<Card className="lg:col-span-3">
						<CardContent className="p-6 space-y-4">
							<div>
								<h3 className="text-lg font-semibold mb-1">{tipoSeleccionado}</h3>
								<p className="text-sm text-muted-foreground">
									{documentosFiltrados.length > 0
										? `${documentosFiltrados.length} documento(s) agregado(s)`
										: "Aún no hay documentos de este tipo"}
								</p>
							</div>

							{/* DocumentUploader con drag & drop */}
							<DocumentUploader
								documentos={documentosTemporales}
								onAgregarDocumento={handleAgregarDocumento}
								onEliminarDocumento={handleEliminarDocumento}
								tipoPreseleccionado={tipoSeleccionado}
								mostrarSelectorTipo={false}
								maxFiles={50}
								maxSizeMB={20}
							/>

							{/* Mostrar documentos ya agregados de este tipo */}
							{documentosFiltrados.length > 0 && (
								<div className="pt-4 border-t">
									<p className="text-sm font-medium mb-3">
										Documentos de {tipoSeleccionado} ({documentosFiltrados.length})
									</p>
									<div className="space-y-2">
										{documentosFiltrados.map((doc, index) => (
											<Card key={`${doc.nombre_archivo}-${index}`}>
												<CardContent className="p-3">
													<div className="flex items-center gap-3">
														<FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
															<p className="text-xs text-muted-foreground">
																{doc.tamano_bytes ? `${(doc.tamano_bytes / 1024).toFixed(1)} KB` : ""}
															</p>
														</div>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleEliminarDocumento(index)}
															className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Advertencia si no hay documentos */}
				{documentos.length === 0 && (
					<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
						<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
						<p className="text-amber-900 dark:text-amber-100">
							No has agregado ningún documento inicial. Aunque es opcional, se recomienda adjuntar al
							menos las fotografías del siniestro y el formulario de denuncia para agilizar el proceso.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
