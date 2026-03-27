"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { ChevronRight, ChevronLeft, CheckCircle2, Upload, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import type { DocumentoPoliza } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { generateTempStoragePath } from "@/utils/fileUpload";

type Props = {
	documentos: DocumentoPoliza[];
	onChange: (documentos: DocumentoPoliza[]) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
	userId: string | null;
};

// Tipos de documentos sugeridos para pólizas
const TIPOS_DOCUMENTO = [
	"Póliza",
	"Plan de pago CLIENTE",
	"Plan de pago BROKER",
	"Condicionado general",
	"Otro",
] as const;

// Tipos de documentos obligatorios para continuar al siguiente paso
const DOCUMENTOS_OBLIGATORIOS = ["Póliza"] as const;

const BUCKET = "polizas-documentos";

export function CargarDocumentos({ documentos, onChange, onSiguiente, onAnterior, userId }: Props) {
	const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("");
	const [tipoPersonalizado, setTipoPersonalizado] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const sessionIdRef = useRef(crypto.randomUUID());
	const supabase = useMemo(() => createClient(), []);

	// Validar archivo
	const validarArchivo = (file: File): string | null => {
		// Validar tamaño (máximo 20MB)
		const MAX_SIZE = 20 * 1024 * 1024; // 20MB
		if (file.size > MAX_SIZE) {
			return `El archivo excede el tamaño máximo de 20MB`;
		}

		// Validar tipo de archivo (incluye .msg y .eml)
		const tiposPermitidos = [
			"application/pdf",
			"image/jpeg",
			"image/jpg",
			"image/png",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-outlook", // .msg
			"message/rfc822", // .eml
		];

		// Para .msg y .eml, el navegador puede no detectar el tipo correcto, validar por extensión
		const extension = file.name.split(".").pop()?.toLowerCase();
		const extensionesPermitidas = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "msg", "eml"];

		if (!tiposPermitidos.includes(file.type) && !extensionesPermitidas.includes(extension || "")) {
			return "Tipo de archivo no permitido. Solo se permiten PDF, JPG, PNG, DOC, DOCX, MSG, EML";
		}

		return null;
	};

	// Subir archivo a Supabase Storage (client-side)
	const subirArchivo = async (file: File, tipoDocumento: string): Promise<DocumentoPoliza> => {
		if (!userId) {
			return {
				tipo_documento: tipoDocumento,
				nombre_archivo: file.name,
				tamano_bytes: file.size,
				upload_status: "error",
				upload_error: "No autenticado",
			};
		}

		const storagePath = generateTempStoragePath(userId, sessionIdRef.current, file.name);

		const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
			cacheControl: "3600",
			upsert: false,
		});

		if (uploadError) {
			return {
				tipo_documento: tipoDocumento,
				nombre_archivo: file.name,
				tamano_bytes: file.size,
				upload_status: "error",
				upload_error: uploadError.message,
			};
		}

		return {
			tipo_documento: tipoDocumento,
			nombre_archivo: file.name,
			tamano_bytes: file.size,
			archivo_url: storagePath,
			storage_path: storagePath,
			upload_status: "uploaded",
		};
	};

	// Handle file drop con react-dropzone
	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			setError(null);

			if (!tipoSeleccionado) {
				setError("Por favor seleccione el tipo de documento antes de subir archivos");
				return;
			}

			if (acceptedFiles.length === 0) {
				setError("No se seleccionaron archivos válidos");
				return;
			}

			if (!userId) {
				setError("Error de autenticación. Recargue la página e intente nuevamente.");
				return;
			}

			// Determinar el tipo de documento
			const tipoDoc = tipoSeleccionado === "Otro" ? tipoPersonalizado : tipoSeleccionado;

			if (!tipoDoc || tipoDoc.trim() === "") {
				setError("Debe especificar un tipo de documento personalizado");
				return;
			}

			// Validar todos los archivos primero
			const archivosValidos: File[] = [];
			for (const file of acceptedFiles) {
				const errorValidacion = validarArchivo(file);
				if (errorValidacion) {
					setError(errorValidacion);
					continue;
				}
				archivosValidos.push(file);
			}

			if (archivosValidos.length === 0) return;

			// Agregar placeholders "uploading" inmediatamente
			const placeholders: DocumentoPoliza[] = archivosValidos.map((file) => ({
				tipo_documento: tipoDoc,
				nombre_archivo: file.name,
				tamano_bytes: file.size,
				upload_status: "uploading" as const,
			}));

			const documentosConPlaceholders = [...documentos, ...placeholders];
			onChange(documentosConPlaceholders);

			// Resetear selección
			setTipoSeleccionado("");
			setTipoPersonalizado("");

			// Subir cada archivo y reemplazar placeholder con resultado
			const resultados = await Promise.all(archivosValidos.map((file) => subirArchivo(file, tipoDoc)));

			// Reemplazar placeholders con resultados reales
			// Usamos el índice para mapear: los placeholders empiezan en documentos.length
			const startIndex = documentos.length;
			const documentosActualizados = [...documentosConPlaceholders];
			for (let i = 0; i < resultados.length; i++) {
				documentosActualizados[startIndex + i] = resultados[i];
			}

			onChange(documentosActualizados);

			// Mostrar error si algún archivo falló
			const fallidos = resultados.filter((r) => r.upload_status === "error");
			if (fallidos.length > 0) {
				setError(
					`Error al subir ${fallidos.length} archivo(s): ${fallidos.map((f) => f.upload_error).join(", ")}`,
				);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tipoSeleccionado, tipoPersonalizado, documentos, onChange, userId],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/pdf": [".pdf"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/png": [".png"],
			"application/msword": [".doc"],
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
			"application/vnd.ms-outlook": [".msg"],
			"message/rfc822": [".eml"],
		},
		maxSize: 20 * 1024 * 1024, // 20MB
		multiple: true,
	});

	const handleEliminarDocumento = async (index: number) => {
		const doc = documentos[index];

		// Si el archivo está subido en temp y no está en BD, eliminarlo de Storage
		if (doc.storage_path && !doc.id) {
			try {
				const supabase = createClient();
				await supabase.storage.from(BUCKET).remove([doc.storage_path]);
			} catch {
				// Best-effort: si falla la eliminación, el archivo queda huérfano en temp/
				console.warn("[DOCS] No se pudo eliminar archivo temporal:", doc.storage_path);
			}
		}

		const nuevosDocumentos = documentos.filter((_, i) => i !== index);
		onChange(nuevosDocumentos);
	};

	const formatearTamano = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
	};

	// Get available document types (allow duplicates for policies)
	const availableDocTypes = Array.from(TIPOS_DOCUMENTO);

	const tieneDocumentos = documentos.length > 0;
	const haySubiendo = documentos.some((d) => d.upload_status === "uploading");

	// Verificar documentos obligatorios (solo cuentan los subidos exitosamente)
	const documentosSubidos = documentos.filter((d) => d.upload_status === "uploaded" || d.id);
	const documentosFaltantes = DOCUMENTOS_OBLIGATORIOS.filter(
		(tipo) => !documentosSubidos.some((d) => d.tipo_documento === tipo),
	);
	const cumpleObligatorios = documentosFaltantes.length === 0;

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Cargar Documentos</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Adjunte los documentos relacionados con la póliza
					</p>
				</div>

				{tieneDocumentos && (
					<div className="flex items-center gap-2 text-success">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{documentos.filter((d) => d.upload_status === "uploaded" || d.id).length} documento
							{documentos.filter((d) => d.upload_status === "uploaded" || d.id).length !== 1 ? "s" : ""}
						</span>
					</div>
				)}
			</div>

			{/* Upload Section */}
			<div className="border border-border rounded-lg p-6 space-y-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Document type selector */}
					<div className="space-y-2">
						<Label htmlFor="tipo_documento">Tipo de Documento</Label>
						<Select value={tipoSeleccionado} onValueChange={(value) => setTipoSeleccionado(value)}>
							<SelectTrigger id="tipo_documento">
								<SelectValue placeholder="Seleccione el tipo..." />
							</SelectTrigger>
							<SelectContent>
								{availableDocTypes.length === 0 ? (
									<div className="p-2 text-sm text-muted-foreground">No hay tipos disponibles</div>
								) : (
									availableDocTypes.map((tipo) => (
										<SelectItem key={tipo} value={tipo}>
											{tipo}
											{(DOCUMENTOS_OBLIGATORIOS as readonly string[]).includes(tipo) && (
												<span className="text-destructive ml-1">*</span>
											)}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>

					{/* Custom document type input */}
					{tipoSeleccionado === "Otro" && (
						<div className="space-y-2">
							<Label htmlFor="tipo_personalizado">Tipo Personalizado</Label>
							<Input
								id="tipo_personalizado"
								placeholder="Especifique el tipo..."
								value={tipoPersonalizado}
								onChange={(e) => setTipoPersonalizado(e.target.value)}
							/>
						</div>
					)}
				</div>

				{/* Dropzone */}
				<div
					{...getRootProps()}
					className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            ${!tipoSeleccionado || haySubiendo ? "opacity-50 cursor-not-allowed" : ""}
          `}
				>
					<input {...getInputProps()} disabled={!tipoSeleccionado || haySubiendo} />
					<Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />

					{isDragActive ? (
						<p className="text-sm text-muted-foreground">Suelte los archivos aquí...</p>
					) : (
						<>
							<p className="text-sm text-muted-foreground mb-1">
								Arrastre archivos aquí o haga clic para seleccionar
							</p>
							<p className="text-xs text-muted-foreground">
								PDF, JPG, PNG, DOC, DOCX, MSG, EML (máx. 20MB por archivo)
							</p>
						</>
					)}
				</div>

				{error && (
					<div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
						<AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}
			</div>

			{/* Uploaded Documents List */}
			{documentos.length > 0 && (
				<div className="border border-border rounded-lg mb-6">
					<div className="px-4 py-3 bg-secondary border-b border-border">
						<h4 className="text-sm font-medium text-foreground">
							Documentos Cargados ({documentos.length})
						</h4>
					</div>

					<div className="divide-y divide-border">
						{documentos.map((doc, index) => (
							<div key={index} className="p-4 hover:bg-secondary/50 transition-colors">
								<div className="flex items-start gap-3">
									{/* Icono según estado */}
									{doc.upload_status === "uploading" ? (
										<Loader2 className="h-10 w-10 text-primary flex-shrink-0 animate-spin" />
									) : doc.upload_status === "error" ? (
										<AlertCircle className="h-10 w-10 text-destructive flex-shrink-0" />
									) : (
										<FileText className="h-10 w-10 text-primary flex-shrink-0" />
									)}

									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1">
												<p className="font-medium text-foreground">{doc.tipo_documento}</p>
												<p className="text-sm text-muted-foreground truncate">
													{doc.nombre_archivo}
												</p>
												<div className="flex items-center gap-2 mt-1">
													{doc.tamano_bytes !== undefined && (
														<p className="text-xs text-muted-foreground">
															{formatearTamano(doc.tamano_bytes)}
														</p>
													)}
													{doc.upload_status === "uploading" && (
														<span className="text-xs text-primary font-medium">
															Subiendo...
														</span>
													)}
													{doc.upload_status === "error" && (
														<span className="text-xs text-destructive font-medium">
															Error: {doc.upload_error || "Error desconocido"}
														</span>
													)}
													{doc.upload_status === "uploaded" && (
														<span className="text-xs text-success font-medium">Subido</span>
													)}
												</div>
											</div>

											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEliminarDocumento(index)}
												className="flex-shrink-0"
												disabled={doc.upload_status === "uploading"}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Empty state */}
			{documentos.length === 0 && (
				<div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg mb-6">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
					<p className="text-sm">No se han cargado documentos todavía</p>
					<p className="text-xs mt-1">Debe cargar al menos: Póliza</p>
				</div>
			)}

			{/* Indicador de documentos obligatorios faltantes */}
			{!cumpleObligatorios && documentos.length > 0 && (
				<div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg mb-6">
					<AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-medium text-warning-foreground">
							Documentos obligatorios faltantes:
						</p>
						<ul className="text-sm text-warning-foreground mt-1">
							{documentosFaltantes.map((tipo) => (
								<li key={tipo}>• {tipo}</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t border-border">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<Button onClick={onSiguiente} disabled={haySubiendo || !cumpleObligatorios}>
					{haySubiendo ? (
						<>
							<Loader2 className="mr-2 h-5 w-5 animate-spin" />
							Subiendo archivos...
						</>
					) : (
						<>
							Continuar al Resumen
							<ChevronRight className="ml-2 h-5 w-5" />
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
