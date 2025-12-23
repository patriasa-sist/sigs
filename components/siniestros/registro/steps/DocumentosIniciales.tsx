"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { TIPOS_DOCUMENTO_SINIESTRO, type TipoDocumentoSiniestro, type DocumentoSiniestro } from "@/types/siniestro";
import { toast } from "sonner";

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
	const [uploading, setUploading] = useState(false);

	// Agrupar documentos por tipo
	const documentosPorTipo = useMemo(() => {
		const grupos: Record<TipoDocumentoSiniestro, DocumentoSiniestro[]> = {} as Record<TipoDocumentoSiniestro, DocumentoSiniestro[]>;

		TIPOS_DOCUMENTO_SINIESTRO.forEach((tipo) => {
			grupos[tipo] = documentos.filter((doc) => doc.tipo_documento === tipo);
		});

		return grupos;
	}, [documentos]);

	// Documentos del tipo seleccionado
	const documentosFiltrados = documentosPorTipo[tipoSeleccionado] || [];

	// Handler para subir archivo
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validar tamaño (20MB)
		if (file.size > 20 * 1024 * 1024) {
			toast.error("El archivo excede el tamaño máximo de 20MB");
			return;
		}

		// Validar tipo de archivo
		const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
		if (!allowedTypes.includes(file.type)) {
			toast.error("Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG, DOC, DOCX");
			return;
		}

		setUploading(true);

		try {
			// Crear documento con el tipo seleccionado
			const documento: DocumentoSiniestro = {
				tipo_documento: tipoSeleccionado,
				nombre_archivo: file.name,
				file,
				tamano_bytes: file.size,
			};

			onAgregarDocumento(documento);
			toast.success("Documento agregado correctamente");
		} catch (error) {
			console.error("Error:", error);
			toast.error("Error al agregar documento");
		} finally {
			setUploading(false);
			// Reset input
			e.target.value = "";
		}
	};

	// Verificar si es imagen para mostrar miniatura
	const esImagen = (nombreArchivo: string) => {
		const ext = nombreArchivo.split(".").pop()?.toLowerCase();
		return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
	};

	// Crear URL de objeto para preview de imágenes
	const getPreviewUrl = (file: File) => {
		return URL.createObjectURL(file);
	};

	// Handler para eliminar documento
	const handleEliminar = () => {
		const docIndex = documentos.findIndex((doc) =>
			doc.tipo_documento === tipoSeleccionado &&
			documentosFiltrados.includes(doc)
		);

		if (docIndex !== -1) {
			onEliminarDocumento(docIndex);
			toast.success("Documento eliminado");
		}
	};

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
						<p className="font-medium mb-1">Organiza tus documentos por tipo</p>
						<p className="text-xs">
							Selecciona un tipo de documento en el menú lateral y sube los archivos correspondientes.
							Los documentos se organizarán automáticamente por categoría.
						</p>
					</div>
				</div>

				{/* Layout con pestañas laterales */}
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[500px]">
					{/* Sidebar con pestañas */}
					<Card className="lg:col-span-1 overflow-y-auto max-h-[500px]">
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
														Agregando...
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
							</div>

							{/* Lista de documentos */}
							<div className="flex-1 overflow-y-auto">
								{documentosFiltrados.length === 0 ? (
									<div className="h-full flex items-center justify-center">
										<div className="text-center text-muted-foreground">
											<FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
											<p className="text-sm">No hay documentos de este tipo</p>
											<p className="text-xs mt-1">Usa el botón &quot;Subir Archivo&quot; para agregar</p>
										</div>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
										{documentosFiltrados.map((doc, index) => (
											<div key={`${doc.nombre_archivo}-${index}`} className="border rounded-lg p-3 space-y-2">
												{/* Miniatura o icono */}
												<div className="aspect-video bg-secondary rounded-md flex items-center justify-center overflow-hidden">
													{doc.file && esImagen(doc.nombre_archivo) ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img
															src={getPreviewUrl(doc.file)}
															alt={doc.nombre_archivo}
															className="w-full h-full object-cover"
														/>
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
												</div>

												{/* Acciones */}
												<div className="flex gap-2">
													<Button
														variant="destructive"
														size="sm"
														onClick={handleEliminar}
														className="flex-1"
													>
														<Trash2 className="mr-1 h-3 w-3" />
														Eliminar
													</Button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
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
