"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Upload, File, X, FileText, Image, AlertCircle } from "lucide-react";
import { TIPOS_DOCUMENTO_SINIESTRO, type DocumentoSiniestro, type TipoDocumentoSiniestro } from "@/types/siniestro";

interface DocumentUploaderProps {
	documentos: DocumentoSiniestro[];
	onAgregarDocumento: (documento: DocumentoSiniestro) => void;
	onEliminarDocumento: (index: number) => void;
	maxFiles?: number;
	maxSizeMB?: number;
	tipoPreseleccionado?: TipoDocumentoSiniestro;
	mostrarSelectorTipo?: boolean;
}

const ACCEPTED_FILE_TYPES = {
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
	"application/pdf": [".pdf"],
	"application/msword": [".doc"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export default function DocumentUploader({
	documentos,
	onAgregarDocumento,
	onEliminarDocumento,
	maxFiles = 20,
	maxSizeMB = 20,
	tipoPreseleccionado,
	mostrarSelectorTipo = true,
}: DocumentUploaderProps) {
	const [selectedTipo, setSelectedTipo] = useState<TipoDocumentoSiniestro>("fotografía VA");
	const [error, setError] = useState<string | null>(null);

	// Usar tipo preseleccionado si se proporciona, sino usar el estado interno
	const tipoActual = tipoPreseleccionado || selectedTipo;

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			setError(null);

			// Validar cantidad de archivos
			if (documentos.length + acceptedFiles.length > maxFiles) {
				setError(`Solo se pueden subir máximo ${maxFiles} documentos`);
				return;
			}

			// Validar y agregar cada archivo
			acceptedFiles.forEach((file) => {
				// Validar tamaño
				if (file.size > maxSizeMB * 1024 * 1024) {
					setError(`El archivo "${file.name}" excede el tamaño máximo de ${maxSizeMB}MB`);
					return;
				}

				const documento: DocumentoSiniestro = {
					tipo_documento: tipoActual,
					nombre_archivo: file.name,
					file: file,
					tamano_bytes: file.size,
				};

				onAgregarDocumento(documento);
			});
		},
		[documentos.length, maxFiles, maxSizeMB, tipoActual, onAgregarDocumento]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_FILE_TYPES,
		multiple: true,
	});

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const getFileIcon = (filename: string) => {
		const ext = filename.split(".").pop()?.toLowerCase();
		if (["jpg", "jpeg", "png"].includes(ext || "")) {
			// eslint-disable-next-line jsx-a11y/alt-text
			return <Image className="h-5 w-5 text-blue-500" />;
		}
		if (ext === "pdf") {
			return <FileText className="h-5 w-5 text-red-500" />;
		}
		return <File className="h-5 w-5 text-gray-500" />;
	};

	return (
		<div className="space-y-4">
			{/* Selector de tipo de documento (opcional) */}
			{mostrarSelectorTipo && (
				<div className="space-y-2">
					<Label htmlFor="tipo-documento">Tipo de Documento</Label>
					<Select
						value={selectedTipo}
						onValueChange={(value) => setSelectedTipo(value as TipoDocumentoSiniestro)}
					>
						<SelectTrigger id="tipo-documento">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{TIPOS_DOCUMENTO_SINIESTRO.map((tipo) => (
								<SelectItem key={tipo} value={tipo}>
									{tipo}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{/* Zona de drag & drop */}
			<Card
				{...getRootProps()}
				className={`border-2 border-dashed cursor-pointer transition-colors ${
					isDragActive
						? "border-primary bg-primary/5"
						: "border-muted-foreground/25 hover:border-primary/50"
				}`}
			>
				<CardContent className="flex flex-col items-center justify-center py-8">
					<input {...getInputProps()} />
					<Upload
						className={`h-12 w-12 mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`}
					/>
					<p className="text-center text-sm font-medium mb-1">
						{isDragActive ? "Suelta los archivos aquí" : "Arrastra archivos o haz click para seleccionar"}
					</p>
					<p className="text-center text-xs text-muted-foreground">
						PDF, JPG, PNG, DOC, DOCX (máx. {maxSizeMB}MB por archivo)
					</p>
				</CardContent>
			</Card>

			{/* Mensaje de error */}
			{error && (
				<div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
					<AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
					<p>{error}</p>
				</div>
			)}

			{/* Lista de documentos agregados */}
			{documentos.length > 0 && (
				<div className="space-y-2">
					<p className="text-sm font-medium">
						Documentos agregados ({documentos.length}/{maxFiles})
					</p>
					<div className="space-y-2">
						{documentos.map((doc, index) => (
							<Card key={index}>
								<CardContent className="p-3">
									<div className="flex items-center gap-3">
										{getFileIcon(doc.nombre_archivo)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<span className="bg-secondary px-2 py-0.5 rounded">{doc.tipo_documento}</span>
												{doc.tamano_bytes && <span>{formatFileSize(doc.tamano_bytes)}</span>}
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onEliminarDocumento(index)}
											className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
