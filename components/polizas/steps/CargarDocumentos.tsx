"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ChevronRight, ChevronLeft, CheckCircle2, Upload, FileText, X, AlertCircle } from "lucide-react";
import type { DocumentoPoliza } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
	documentos: DocumentoPoliza[];
	onChange: (documentos: DocumentoPoliza[]) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Tipos de documentos sugeridos para pólizas
const TIPOS_DOCUMENTO = [
	"Póliza firmada",
	"Comprobante de envio de poliza (correo)",
	"Plan de pago BROKER",
	"Plan de pago CLIENTE",
	"Anexos",
	"Condicionado general",
	"Certificado de cobertura",
	"Recibo de pago",
	"Otro",
] as const;

export function CargarDocumentos({ documentos, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("");
	const [tipoPersonalizado, setTipoPersonalizado] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

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

	// Handle file drop con react-dropzone
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			setError(null);

			if (!tipoSeleccionado) {
				setError("Por favor seleccione el tipo de documento antes de subir archivos");
				return;
			}

			if (acceptedFiles.length === 0) {
				setError("No se seleccionaron archivos válidos");
				return;
			}

			const nuevosDocumentos: DocumentoPoliza[] = [];

			for (const file of acceptedFiles) {
				// Validar archivo
				const errorValidacion = validarArchivo(file);
				if (errorValidacion) {
					setError(errorValidacion);
					continue;
				}

				// Determinar el tipo de documento
				const tipoDoc = tipoSeleccionado === "Otro" ? tipoPersonalizado : tipoSeleccionado;

				if (!tipoDoc || tipoDoc.trim() === "") {
					setError("Debe especificar un tipo de documento personalizado");
					continue;
				}

				// Crear documento
				nuevosDocumentos.push({
					tipo_documento: tipoDoc,
					nombre_archivo: file.name,
					tamano_bytes: file.size,
					file: file,
				});
			}

			if (nuevosDocumentos.length > 0) {
				onChange([...documentos, ...nuevosDocumentos]);
				setTipoSeleccionado("");
				setTipoPersonalizado("");
			}
		},
		[tipoSeleccionado, tipoPersonalizado, documentos, onChange]
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

	const handleEliminarDocumento = (index: number) => {
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

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Paso 5: Cargar Documentos</h2>
					<p className="text-sm text-gray-600 mt-1">
						Adjunte los documentos relacionados con la póliza (opcional)
					</p>
				</div>

				{tieneDocumentos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{documentos.length} documento{documentos.length !== 1 ? "s" : ""}
						</span>
					</div>
				)}
			</div>

			{/* Upload Section */}
			<div className="border border-gray-200 rounded-lg p-6 space-y-4 mb-6">
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
									<div className="p-2 text-sm text-gray-500">No hay tipos disponibles</div>
								) : (
									availableDocTypes.map((tipo) => (
										<SelectItem key={tipo} value={tipo}>
											{tipo}
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
            ${isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"}
            ${!tipoSeleccionado ? "opacity-50 cursor-not-allowed" : ""}
          `}
				>
					<input {...getInputProps()} disabled={!tipoSeleccionado} />
					<Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />

					{isDragActive ? (
						<p className="text-sm text-gray-600">Suelte los archivos aquí...</p>
					) : (
						<>
							<p className="text-sm text-gray-600 mb-1">
								Arrastre archivos aquí o haga clic para seleccionar
							</p>
							<p className="text-xs text-gray-500">
								PDF, JPG, PNG, DOC, DOCX, MSG, EML (máx. 20MB por archivo)
							</p>
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
				<div className="border border-gray-200 rounded-lg mb-6">
					<div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
						<h4 className="text-sm font-medium text-gray-900">
							Documentos Cargados ({documentos.length})
						</h4>
					</div>

					<div className="divide-y divide-gray-200">
						{documentos.map((doc, index) => (
							<div key={index} className="p-4 hover:bg-gray-50 transition-colors">
								<div className="flex items-start gap-3">
									<FileText className="h-10 w-10 text-primary flex-shrink-0" />

									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1">
												<p className="font-medium text-gray-900">{doc.tipo_documento}</p>
												<p className="text-sm text-gray-600 truncate">{doc.nombre_archivo}</p>
												{doc.tamano_bytes !== undefined && (
													<p className="text-xs text-gray-500 mt-1">
														{formatearTamano(doc.tamano_bytes)}
													</p>
												)}
											</div>

											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEliminarDocumento(index)}
												className="flex-shrink-0"
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
				<div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg mb-6">
					<FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<p className="text-sm">No se han cargado documentos todavía</p>
					<p className="text-xs mt-1">Los documentos son opcionales pero recomendados</p>
				</div>
			)}

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<Button onClick={onSiguiente}>
					Continuar al Resumen
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
