"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image, File, ExternalLink, AlertCircle } from "lucide-react";
import type { DocumentoPoliza } from "@/types/siniestro";

interface DocumentosPolizaModalProps {
	numeroPoliza: string;
	documentos: DocumentoPoliza[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function DocumentosPolizaModal({
	numeroPoliza,
	documentos,
	open,
	onOpenChange,
}: DocumentosPolizaModalProps) {

	const getFileIcon = (filename: string) => {
		const ext = filename.split(".").pop()?.toLowerCase();
		if (["jpg", "jpeg", "png"].includes(ext || "")) {
			// eslint-disable-next-line jsx-a11y/alt-text
			return <Image className="h-6 w-6 text-blue-500" />;
		}
		if (ext === "pdf") {
			return <FileText className="h-6 w-6 text-red-500" />;
		}
		return <File className="h-6 w-6 text-gray-500" />;
	};

	const formatFileSize = (bytes: number | undefined): string => {
		if (!bytes) return "Tamaño desconocido";
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const getFileUrl = (doc: DocumentoPoliza): string => {
		// Si archivo_url ya es una URL completa, usarla directamente
		if (doc.archivo_url.startsWith("http")) {
			return doc.archivo_url;
		}

		// Si es una ruta relativa, construir la URL completa
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		return `${supabaseUrl}/storage/v1/object/public/polizas-documentos/${doc.archivo_url}`;
	};

	const handleOpenInNewTab = (doc: DocumentoPoliza) => {
		const fileUrl = getFileUrl(doc);
		window.open(fileUrl, "_blank");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Documentos de la Póliza {numeroPoliza}</DialogTitle>
					<DialogDescription>
						{documentos.length === 0
							? "Esta póliza no tiene documentos registrados"
							: `${documentos.length} ${documentos.length === 1 ? "documento encontrado" : "documentos encontrados"}`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 mt-4">
					{documentos.length === 0 ? (
						<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
							<AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
							<div className="text-amber-900 dark:text-amber-100">
								<p className="font-medium mb-1">No hay documentos disponibles</p>
								<p className="text-sm">
									Esta póliza no tiene documentos cargados en el sistema. Los documentos pueden
									agregarse desde el módulo de pólizas.
								</p>
							</div>
						</div>
					) : (
						documentos.map((doc) => (
							<Card key={doc.id}>
								<CardContent className="p-4">
									<div className="flex items-start gap-4">
										{/* Icono del archivo */}
										<div className="flex-shrink-0">{getFileIcon(doc.nombre_archivo)}</div>

										{/* Información del documento */}
										<div className="flex-1 min-w-0">
											<p className="font-medium text-sm truncate">{doc.nombre_archivo}</p>
											<div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
												<span className="bg-secondary px-2 py-0.5 rounded">{doc.tipo_documento}</span>
												<span>{formatFileSize(doc.tamano_bytes)}</span>
											</div>
										</div>

										{/* Acciones */}
										<div className="flex gap-2 flex-shrink-0">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleOpenInNewTab(doc)}
												title="Ver documento"
											>
												<ExternalLink className="h-4 w-4 mr-1" />
												Ver
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
