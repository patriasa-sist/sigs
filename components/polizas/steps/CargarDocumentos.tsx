"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Upload, FileText, Trash2, AlertCircle } from "lucide-react";
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

// Tipos de documentos sugeridos
const TIPOS_DOCUMENTO = [
	"Póliza firmada",
	"Comprobante de envio de poliza (correo)",
	"Plan de pago BROKER",
	"plan de pago CLIENTE",
	"Anexos",
	"Condicionado general",
	"Otro",
];

export function CargarDocumentos({ documentos, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoSeleccionado, setTipoSeleccionado] = useState<string>(TIPOS_DOCUMENTO[0]);
	const [tipoPersonalizado, setTipoPersonalizado] = useState<string>("");
	const [errores, setErrores] = useState<string[]>([]);

	const handleAgregarArchivo = (event: React.ChangeEvent<HTMLInputElement>) => {
		const archivos = event.target.files;
		if (!archivos || archivos.length === 0) return;

		const nuevosDocumentos: DocumentoPoliza[] = [];
		const nuevosErrores: string[] = [];

		// Validar y procesar cada archivo
		Array.from(archivos).forEach((file) => {
			// Validar tamaño (máximo 10MB)
			const MAX_SIZE = 10 * 1024 * 1024; // 10MB
			if (file.size > MAX_SIZE) {
				nuevosErrores.push(`${file.name}: El archivo excede el tamaño máximo de 10MB`);
				return;
			}

			// Validar tipo de archivo
			const tiposPermitidos = [
				"application/pdf",
				"image/jpeg",
				"image/jpg",
				"image/png",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			];
			if (!tiposPermitidos.includes(file.type)) {
				nuevosErrores.push(
					`${file.name}: Tipo de archivo no permitido. Solo se permiten PDF, JPG, PNG, DOC, DOCX`
				);
				return;
			}

			// Determinar el tipo de documento
			const tipoDoc = tipoSeleccionado === "Otro" ? tipoPersonalizado : tipoSeleccionado;

			if (!tipoDoc || tipoDoc.trim() === "") {
				nuevosErrores.push(`${file.name}: Debe especificar un tipo de documento`);
				return;
			}

			// Crear documento
			nuevosDocumentos.push({
				tipo_documento: tipoDoc,
				nombre_archivo: file.name,
				tamano_bytes: file.size,
				file: file,
			});
		});

		// Actualizar estado
		if (nuevosDocumentos.length > 0) {
			onChange([...documentos, ...nuevosDocumentos]);
		}

		if (nuevosErrores.length > 0) {
			setErrores(nuevosErrores);
		} else {
			setErrores([]);
		}

		// Resetear input
		event.target.value = "";
	};

	const handleEliminarDocumento = (index: number) => {
		if (confirm("¿Está seguro de eliminar este documento?")) {
			const nuevosDocumentos = documentos.filter((_, i) => i !== index);
			onChange(nuevosDocumentos);
		}
	};

	const formatearTamano = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const obtenerIconoPorExtension = (nombreArchivo: string) => {
		const ext = nombreArchivo.split(".").pop()?.toLowerCase();
		if (ext === "pdf") return "📄";
		if (["jpg", "jpeg", "png"].includes(ext || "")) return "🖼️";
		if (["doc", "docx"].includes(ext || "")) return "📝";
		return "📎";
	};

	const handleContinuar = () => {
		// Los documentos son opcionales, pero si se agrega uno debe ser válido
		// La validación ya se hizo al agregar

		onSiguiente();
	};

	const tieneDocumentos = documentos.length > 0;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
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

			{/* Selector de tipo de documento */}
			<div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
				<Label htmlFor="tipo_documento" className="mb-2 block">
					Tipo de Documento a Cargar
				</Label>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Select value={tipoSeleccionado} onValueChange={setTipoSeleccionado}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{TIPOS_DOCUMENTO.map((tipo) => (
								<SelectItem key={tipo} value={tipo}>
									{tipo}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{tipoSeleccionado === "Otro" && (
						<Input
							placeholder="Especifique el tipo de documento"
							value={tipoPersonalizado}
							onChange={(e) => setTipoPersonalizado(e.target.value)}
						/>
					)}
				</div>
			</div>

			{/* Zona de carga */}
			<div className="mb-6">
				<label
					htmlFor="file-upload"
					className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
				>
					<div className="flex flex-col items-center justify-center pt-5 pb-6">
						<Upload className="h-10 w-10 text-gray-400 mb-3" />
						<p className="mb-2 text-sm text-gray-600">
							<span className="font-semibold">Click para cargar</span> o arrastra archivos aquí
						</p>
						<p className="text-xs text-gray-500">PDF, JPG, PNG, DOC, DOCX (máx. 10MB por archivo)</p>
					</div>
					<input
						id="file-upload"
						type="file"
						className="hidden"
						onChange={handleAgregarArchivo}
						multiple
						accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
					/>
				</label>
			</div>

			{/* Errores de carga */}
			{errores.length > 0 && (
				<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<div className="flex gap-2">
						<AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
						<div>
							<h4 className="text-sm font-semibold text-yellow-800 mb-2">
								Algunos archivos no pudieron ser agregados:
							</h4>
							<ul className="text-sm text-yellow-700 space-y-1">
								{errores.map((error, i) => (
									<li key={i}>• {error}</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Lista de documentos cargados */}
			{documentos.length === 0 ? (
				<div className="text-center py-12 border-2 border-dashed rounded-lg">
					<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-600 mb-2">No hay documentos cargados</p>
					<p className="text-sm text-gray-500">Los documentos son opcionales pero recomendados</p>
				</div>
			) : (
				<div className="space-y-3 mb-6">
					<h4 className="text-sm font-semibold text-gray-900">Documentos Cargados ({documentos.length})</h4>
					<div className="space-y-2">
						{documentos.map((doc, index) => (
							<div
								key={index}
								className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
							>
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<span className="text-2xl flex-shrink-0">
										{obtenerIconoPorExtension(doc.nombre_archivo)}
									</span>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 truncate">
											{doc.nombre_archivo}
										</p>
										<div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
											<span className="font-medium text-blue-600">{doc.tipo_documento}</span>
											{doc.tamano_bytes && (
												<>
													<span>•</span>
													<span>{formatearTamano(doc.tamano_bytes)}</span>
												</>
											)}
										</div>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleEliminarDocumento(index)}
									className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Información adicional */}
			<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<h4 className="text-sm font-semibold text-blue-900 mb-2">Información sobre Documentos</h4>
				<ul className="text-sm text-blue-800 space-y-1">
					<li>• Los documentos se cargarán al servidor cuando guarde la póliza</li>
					<li>• Puede agregar múltiples archivos del mismo tipo</li>
					<li>• Los documentos son opcionales pero ayudan a tener un registro completo</li>
					<li>• Tamaño máximo por archivo: 10MB</li>
				</ul>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<Button onClick={handleContinuar}>
					Continuar al Resumen
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
