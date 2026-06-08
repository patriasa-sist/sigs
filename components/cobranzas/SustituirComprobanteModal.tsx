"use client";

import { useState, useRef } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Upload, X, FileText, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { TipoComprobante } from "@/types/cobranza";
import { sustituirComprobantePago } from "@/app/cobranzas/actions";
import {
	validarTamanoArchivo,
	validarTipoArchivo,
	formatearTamanoArchivo,
} from "@/utils/cobranza";

interface SustituirComprobanteModalProps {
	abonoId: string | null;
	cuotaNumero?: number;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export default function SustituirComprobanteModal({
	abonoId,
	cuotaNumero,
	open,
	onClose,
	onSuccess,
}: SustituirComprobanteModalProps) {
	const [file, setFile] = useState<File | null>(null);
	const [tipoArchivo, setTipoArchivo] = useState<TipoComprobante>("comprobante_deposito");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = (f: File) => {
		const sizeResult = validarTamanoArchivo(f);
		if (!sizeResult.valid) { setError(sizeResult.error ?? "Archivo inválido"); return; }
		const typeResult = validarTipoArchivo(f);
		if (!typeResult.valid) { setError(typeResult.error ?? "Tipo no permitido"); return; }
		setFile(f);
		setError(null);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		const dropped = e.dataTransfer.files[0];
		if (dropped) handleFile(dropped);
	};

	const handleSubmit = async () => {
		if (!abonoId || !file) return;
		setLoading(true);
		setError(null);
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("tipo_archivo", tipoArchivo);
			const result = await sustituirComprobantePago(abonoId, formData);
			if (result.success) {
				toast.success("Comprobante sustituido", {
					description: "El nuevo comprobante fue guardado correctamente",
				});
				handleClose();
				onSuccess();
			} else {
				setError(result.error ?? "Error al sustituir el comprobante");
			}
		} catch {
			setError("Error inesperado al procesar la solicitud");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setFile(null);
		setError(null);
		setTipoArchivo("comprobante_deposito");
		onClose();
	};

	if (!abonoId) return null;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						Sustituir Comprobante
						{cuotaNumero !== undefined && (
							<span className="text-muted-foreground font-normal text-base ml-1.5">
								— Cuota {cuotaNumero}
							</span>
						)}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Warning */}
					<div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
						<AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
						<span>El comprobante anterior será reemplazado permanentemente por el nuevo archivo.</span>
					</div>

					{/* Drop zone */}
					<div>
						<Label className="text-sm font-medium mb-1.5 block">Nuevo comprobante</Label>
						<div
							className={`rounded-md border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
								isDragOver
									? "border-primary bg-primary/5"
									: file
									? "border-teal-300 bg-teal-50"
									: "border-border hover:border-primary/50 hover:bg-secondary/50"
							}`}
							onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
							onDragLeave={() => setIsDragOver(false)}
							onDrop={handleDrop}
							onClick={() => inputRef.current?.click()}
						>
							{file ? (
								<div className="flex items-center justify-center gap-2">
									<FileText className="h-5 w-5 text-teal-600 shrink-0" />
									<div className="text-left">
										<p className="text-sm font-medium text-teal-800 truncate max-w-[220px]">
											{file.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{formatearTamanoArchivo(file.size)}
										</p>
									</div>
									<button
										type="button"
										className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
										onClick={(e) => { e.stopPropagation(); setFile(null); }}
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							) : (
								<>
									<Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
									<p className="text-sm text-muted-foreground">
										Arrastra el archivo aquí o{" "}
										<span className="text-primary font-medium">haz clic para seleccionar</span>
									</p>
									<p className="text-xs text-muted-foreground mt-1">
										PDF, JPG, PNG, WebP — máx. 10 MB
									</p>
								</>
							)}
						</div>
						<input
							ref={inputRef}
							type="file"
							className="hidden"
							accept=".pdf,.jpg,.jpeg,.png,.webp"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) handleFile(f);
								e.target.value = "";
							}}
						/>
					</div>

					{/* Tipo de comprobante */}
					<div>
						<Label className="text-sm font-medium mb-1.5 block">Tipo de comprobante</Label>
						<Select
							value={tipoArchivo}
							onValueChange={(v) => setTipoArchivo(v as TipoComprobante)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="factura">Factura</SelectItem>
								<SelectItem value="recibo">Recibo</SelectItem>
								<SelectItem value="comprobante_deposito">Comprobante de depósito</SelectItem>
								<SelectItem value="otro">Otro</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Error */}
					{error && (
						<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
							<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
							{error}
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" onClick={handleClose} disabled={loading}>
							Cancelar
						</Button>
						<Button onClick={handleSubmit} disabled={!file || loading}>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-1.5" />
									Guardando…
								</>
							) : (
								"Sustituir Comprobante"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
