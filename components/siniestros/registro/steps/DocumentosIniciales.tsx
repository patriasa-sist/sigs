"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import DocumentUploader from "@/components/siniestros/shared/DocumentUploader";
import type { DocumentoSiniestro } from "@/types/siniestro";

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
	return (
		<Card>
			<CardHeader>
				<CardTitle>Paso 4: Documentos Iniciales (Opcional)</CardTitle>
				<CardDescription>
					Adjunta los documentos relacionados al siniestro que ya tengas disponibles
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Información sobre documentos */}
				<div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
					<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
					<div className="text-blue-900 dark:text-blue-100">
						<p className="font-medium mb-2">Documentos comunes para siniestros:</p>
						<ul className="list-disc list-inside space-y-1 text-sm">
							<li>Fotografías de daños (vehículo asegurado o responsabilidad civil)</li>
							<li>Formulario de denuncia policial</li>
							<li>Licencia de conducir del conductor involucrado</li>
							<li>Informes de tránsito o SOAT</li>
							<li>Test de alcoholemia (si aplica)</li>
							<li>Proformas de reparación</li>
						</ul>
						<p className="text-sm mt-2 font-medium">
							Puedes agregar más documentos después de registrar el siniestro.
						</p>
					</div>
				</div>

				{/* Uploader de documentos */}
				<DocumentUploader
					documentos={documentos}
					onAgregarDocumento={onAgregarDocumento}
					onEliminarDocumento={onEliminarDocumento}
					maxFiles={20}
					maxSizeMB={20}
				/>

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
