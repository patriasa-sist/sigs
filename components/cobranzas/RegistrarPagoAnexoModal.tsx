"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload, FileText, X, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { registrarPagoAnexo, subirComprobantePago, obtenerAbonosAnexoCuota } from "@/app/cobranzas/actions";
import type { TipoComprobante } from "@/types/cobranza";
import { validarTamanoArchivo, validarTipoArchivo, formatearTamanoArchivo } from "@/utils/cobranza";

/** Cuota de anexo objetivo del pago. */
export interface CuotaAnexoTarget {
	id: string;
	numero_anexo: string;
	numero_cuota: number;
	monto: number;
}

interface RegistrarPagoAnexoModalProps {
	cuota: CuotaAnexoTarget | null;
	moneda: string;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export default function RegistrarPagoAnexoModal({
	cuota,
	moneda,
	open,
	onClose,
	onSuccess,
}: RegistrarPagoAnexoModalProps) {
	const [montoPagado, setMontoPagado] = useState("");
	const [fechaPago, setFechaPago] = useState("");
	const [observaciones, setObservaciones] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saldoInfo, setSaldoInfo] = useState<{ monto: number; abonado: number; saldo: number } | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>("factura");
	const [isDragging, setIsDragging] = useState(false);
	const dropZoneRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open || !cuota) return;
		setFechaPago(new Date().toISOString().split("T")[0]);
		setObservaciones("");
		setError(null);
		setSelectedFile(null);
		setPreviewUrl(null);
		setFileError(null);
		setTipoComprobante("factura");
		setSaldoInfo(null);
		setMontoPagado("");
		obtenerAbonosAnexoCuota(cuota.id).then((res) => {
			if (res.success && res.data) {
				setSaldoInfo({ monto: res.data.monto, abonado: res.data.abonado, saldo: res.data.saldo });
				setMontoPagado(res.data.saldo.toFixed(2));
			} else {
				setSaldoInfo({ monto: cuota.monto, abonado: 0, saldo: cuota.monto });
				setMontoPagado(cuota.monto.toString());
			}
		});
	}, [open, cuota]);

	const saldoActual = saldoInfo?.saldo ?? cuota?.monto ?? 0;

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

	const processFile = useCallback((file: File) => {
		setFileError(null);
		const sizeValidation = validarTamanoArchivo(file);
		if (!sizeValidation.valid) {
			setFileError(sizeValidation.error || "Archivo inválido");
			setSelectedFile(null);
			setPreviewUrl(null);
			return;
		}
		const typeValidation = validarTipoArchivo(file);
		if (!typeValidation.valid) {
			setFileError(typeValidation.error || "Tipo no permitido");
			setSelectedFile(null);
			setPreviewUrl(null);
			return;
		}
		setSelectedFile(file);
		if (file.type.startsWith("image/")) {
			setPreviewUrl(URL.createObjectURL(file));
		} else {
			setPreviewUrl(null);
		}
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault(); e.stopPropagation(); setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault(); e.stopPropagation(); setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault(); e.stopPropagation(); setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) processFile(file);
	}, [processFile]);

	useEffect(() => {
		if (!open || selectedFile) return;
		const handlePaste = (e: ClipboardEvent) => {
			const items = e.clipboardData?.items;
			if (!items) return;
			for (const item of items) {
				if (item.kind === "file") {
					const file = item.getAsFile();
					if (file) { e.preventDefault(); processFile(file); return; }
				}
			}
		};
		document.addEventListener("paste", handlePaste);
		return () => document.removeEventListener("paste", handlePaste);
	}, [open, selectedFile, processFile]);

	const handleRemoveFile = () => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setSelectedFile(null);
		setPreviewUrl(null);
		setFileError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!cuota) return;
		const monto = parseFloat(montoPagado);
		if (isNaN(monto) || monto <= 0) {
			setError("El monto debe ser mayor a 0");
			return;
		}
		if (monto > saldoActual + 0.01) {
			setError(`El monto supera el saldo de la cuota (${formatCurrency(saldoActual)})`);
			return;
		}
		if (!selectedFile) {
			setError("Debe adjuntar un comprobante de pago (obligatorio)");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const result = await registrarPagoAnexo({
				anexo_pago_id: cuota.id,
				monto_pagado: monto,
				fecha_pago: fechaPago,
				observaciones: observaciones.trim() || undefined,
			});

			if (result.success && result.data) {
				if (result.data.abono_id) {
					const formData = new FormData();
					formData.append("file", selectedFile);
					formData.append("tipo_archivo", tipoComprobante);
					const uploadResult = await subirComprobantePago(result.data.abono_id, formData);
					if (!uploadResult.success) {
						console.error("Warning: Failed to upload comprobante:", uploadResult.error);
					}
				}
				toast.success("Pago de anexo registrado");
				onSuccess();
			} else {
				setError(result.error || "Error al registrar el pago");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	};

	if (!cuota) return null;

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5 text-primary" />
						Pago de Cuota — Anexo {cuota.numero_anexo} · Cuota {cuota.numero_cuota}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Formulario para registrar el pago de una cuota de anexo
					</DialogDescription>
				</DialogHeader>

				{/* Saldo */}
				<div className="rounded-md border border-border bg-secondary px-4 py-3 text-sm">
					<p className="text-xs text-muted-foreground">Saldo pendiente</p>
					<p className="font-semibold tabular-nums mt-0.5">
						{moneda} {formatCurrency(saldoActual)}
					</p>
					{saldoInfo && saldoInfo.abonado > 0 && (
						<p className="text-xs text-muted-foreground mt-0.5">
							Cuota {formatCurrency(saldoInfo.monto)} · abonado {formatCurrency(saldoInfo.abonado)}
						</p>
					)}
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-1.5">
						<Label htmlFor="monto-anexo">Monto Pagado *</Label>
						<Input
							id="monto-anexo"
							type="number"
							step="0.01"
							min="0"
							value={montoPagado}
							onChange={(e) => setMontoPagado(e.target.value)}
							className="h-10 tabular-nums"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="fecha-anexo">Fecha de Pago *</Label>
						<Input
							id="fecha-anexo"
							type="date"
							value={fechaPago}
							onChange={(e) => setFechaPago(e.target.value)}
							className="h-10"
							required
						/>
					</div>

					{/* Comprobante */}
					<div className="space-y-2">
						<Label>Comprobante de Pago *</Label>
						<Select value={tipoComprobante} onValueChange={(v) => setTipoComprobante(v as TipoComprobante)}>
							<SelectTrigger className="h-9">
								<SelectValue placeholder="Tipo de comprobante" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="factura">Factura</SelectItem>
								<SelectItem value="recibo">Recibo</SelectItem>
								<SelectItem value="comprobante_deposito">Comprobante de Depósito</SelectItem>
								<SelectItem value="otro">Otro</SelectItem>
							</SelectContent>
						</Select>

						{!selectedFile ? (
							<div
								ref={dropZoneRef}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								onClick={() => fileInputRef.current?.click()}
								className={`flex flex-col items-center gap-1.5 rounded-md border-2 border-dashed cursor-pointer py-5 px-4 transition-colors ${
									isDragging
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/60 hover:bg-secondary/50"
								}`}
							>
								<Upload
									className={`h-7 w-7 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
								/>
								<p className="text-sm text-muted-foreground text-center">
									Arrastra un archivo, pega con Ctrl+V o haz clic aquí
								</p>
								<p className="text-xs text-muted-foreground">JPG, PNG, WebP o PDF (máx. 10 MB)</p>
								<input
									ref={fileInputRef}
									type="file"
									className="hidden"
									accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
									onChange={(e) => {
										const f = e.target.files?.[0];
										if (f) processFile(f);
										e.target.value = "";
									}}
								/>
							</div>
						) : (
							<div className="rounded-md border border-border bg-secondary overflow-hidden">
								{previewUrl && (
									<a href={previewUrl} target="_blank" rel="noopener noreferrer" className="block">
										<Image
											src={previewUrl}
											alt="Vista previa del comprobante"
											width={800}
											height={192}
											unoptimized
											className="w-full max-h-48 object-contain bg-black/5"
										/>
									</a>
								)}
								{!previewUrl && selectedFile.type === "application/pdf" && (
									<button
										type="button"
										className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:underline w-full"
										onClick={() => {
											const url = URL.createObjectURL(selectedFile);
											window.open(url, "_blank");
											setTimeout(() => URL.revokeObjectURL(url), 10000);
										}}
									>
										<FileText className="h-4 w-4 shrink-0" />
										Abrir PDF para verificar
									</button>
								)}
								<div className="flex items-center justify-between px-3 py-2">
									<div className="flex items-center gap-2 min-w-0">
										<FileText className="h-4 w-4 text-primary shrink-0" />
										<div className="min-w-0">
											<p className="text-sm font-medium truncate max-w-[220px]">{selectedFile.name}</p>
											<p className="text-xs text-muted-foreground">{formatearTamanoArchivo(selectedFile.size)}</p>
										</div>
									</div>
									<Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleRemoveFile}>
										<X className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
						{fileError && <p className="text-xs text-destructive">{fileError}</p>}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="obs-anexo">
							Observaciones <span className="text-muted-foreground font-normal">(opcional)</span>
						</Label>
						<Textarea
							id="obs-anexo"
							value={observaciones}
							onChange={(e) => setObservaciones(e.target.value)}
							rows={2}
							placeholder="Notas adicionales sobre el pago…"
							className="resize-none"
						/>
					</div>

					{error && (
						<div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
							<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading}>
							Cancelar
						</Button>
						<Button type="submit" disabled={loading || !selectedFile}>
							{loading ? "Registrando…" : "Confirmar Pago"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
