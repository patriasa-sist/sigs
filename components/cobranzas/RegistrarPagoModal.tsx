"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	AlertCircle,
	CheckCircle,
	DollarSign,
	Upload,
	FileText,
	X,
	CreditCard,
} from "lucide-react";
import { registrarPago, obtenerCuotasPendientesPorPoliza, subirComprobantePago } from "@/app/cobranzas/actions";
import type { CuotaPago, PolizaConPagos, ExcessPaymentDistribution, TipoComprobante } from "@/types/cobranza";
import { validarTamanoArchivo, validarTipoArchivo, formatearTamanoArchivo, formatearFecha } from "@/utils/cobranza";

interface RegistrarPagoModalProps {
	cuota: CuotaPago | null;
	poliza: PolizaConPagos | null;
	open: boolean;
	onClose: () => void;
	onSuccess: (excessData?: ExcessPaymentDistribution) => void;
}

export default function RegistrarPagoModal({
	cuota,
	poliza,
	open,
	onClose,
	onSuccess,
}: RegistrarPagoModalProps) {
	const [montoPagado, setMontoPagado] = useState<string>("");
	const [fechaPago, setFechaPago] = useState<string>("");
	const [observaciones, setObservaciones] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>("factura");
	const [fileError, setFileError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const dropZoneRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open && cuota) {
			setMontoPagado(cuota.monto.toString());
			setFechaPago(new Date().toISOString().split("T")[0]);
			setObservaciones("");
			setError(null);
			setSelectedFile(null);
			setTipoComprobante("factura");
			setFileError(null);
		}
	}, [open, cuota]);

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);

	const getTipoPago = () => {
		if (!cuota || !montoPagado) return null;
		const monto = parseFloat(montoPagado);
		if (isNaN(monto)) return null;
		if (monto < cuota.monto) return "parcial";
		if (monto === cuota.monto) return "exacto";
		return "exceso";
	};

	const getExceso = () => {
		if (!cuota || !montoPagado) return 0;
		const monto = parseFloat(montoPagado);
		if (isNaN(monto)) return 0;
		return Math.max(0, monto - cuota.monto);
	};

	const getSaldoPendiente = () => {
		if (!cuota || !montoPagado) return 0;
		const monto = parseFloat(montoPagado);
		if (isNaN(monto)) return 0;
		return Math.max(0, cuota.monto - monto);
	};

	const processFile = useCallback((file: File) => {
		setFileError(null);
		const sizeValidation = validarTamanoArchivo(file);
		if (!sizeValidation.valid) {
			setFileError(sizeValidation.error || "Error de validación");
			setSelectedFile(null);
			return;
		}
		const typeValidation = validarTipoArchivo(file);
		if (!typeValidation.valid) {
			setFileError(typeValidation.error || "Error de validación");
			setSelectedFile(null);
			return;
		}
		setSelectedFile(file);
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) { setSelectedFile(null); setFileError(null); return; }
		processFile(file);
	};

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
		setSelectedFile(null);
		setFileError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!cuota || !poliza) return;

		const monto = parseFloat(montoPagado);
		if (isNaN(monto) || monto <= 0) {
			setError("El monto debe ser mayor a 0");
			return;
		}

		if (!selectedFile) {
			setError("Debe adjuntar un comprobante de pago (obligatorio)");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const result = await registrarPago({
				cuota_id: cuota.id,
				monto_pagado: monto,
				fecha_pago: fechaPago,
				observaciones: observaciones.trim() || undefined,
			});

			if (result.success && result.data) {
				const formData = new FormData();
				formData.append("file", selectedFile);
				formData.append("tipo_archivo", tipoComprobante);
				const uploadResult = await subirComprobantePago(cuota.id, formData);
				if (!uploadResult.success) {
					console.error("Warning: Failed to upload comprobante:", uploadResult.error);
				}

				if (result.data.tipo_pago === "exceso" && result.data.exceso_generado) {
					const cuotasPendientesResult = await obtenerCuotasPendientesPorPoliza(poliza.id);
					if (cuotasPendientesResult.success && cuotasPendientesResult.data) {
						const excessData: ExcessPaymentDistribution = {
							poliza_id: poliza.id,
							cuota_origen_id: cuota.id,
							monto_exceso: result.data.exceso_generado,
							distribuciones: cuotasPendientesResult.data.map((c) => ({
								cuota_id: c.id,
								numero_cuota: c.numero_cuota,
								monto_original: c.monto,
								monto_a_aplicar: 0,
								nuevo_saldo: c.monto,
							})),
							total_distribuido: 0,
							saldo_restante: result.data.exceso_generado,
						};
						onSuccess(excessData);
					} else {
						onSuccess();
					}
				} else {
					onSuccess();
				}
			} else {
				setError(result.error || "Error al registrar el pago");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	};

	if (!cuota || !poliza) return null;

	const tipoPago = getTipoPago();
	const exceso = getExceso();
	const saldoPendiente = getSaldoPendiente();

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5 text-primary" />
						Registrar Pago — Cuota #{cuota.numero_cuota}
					</DialogTitle>
				</DialogHeader>

				{/* Context strip */}
				<div className="rounded-md border border-border bg-secondary px-4 py-3 text-sm">
					<div className="grid grid-cols-2 gap-x-6 gap-y-2">
						<div>
							<p className="text-xs text-muted-foreground">Póliza</p>
							<p className="font-medium mt-0.5">{poliza.numero_poliza}</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Cliente</p>
							<p className="font-medium mt-0.5 truncate">{poliza.client.nombre_completo}</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Monto de cuota</p>
							<p className="font-semibold tabular-nums mt-0.5">
								{poliza.moneda} {formatCurrency(cuota.monto)}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Vencimiento</p>
							<p className="font-medium mt-0.5">{formatearFecha(cuota.fecha_vencimiento)}</p>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Monto pagado + inline payment type indicator */}
					<div className="space-y-1.5">
						<Label htmlFor="monto">Monto Pagado *</Label>
						<Input
							id="monto"
							type="number"
							step="0.01"
							min="0"
							value={montoPagado}
							onChange={(e) => setMontoPagado(e.target.value)}
							className="h-10 tabular-nums"
							required
						/>
						{/* Inline payment type feedback */}
						{tipoPago && montoPagado && (
							<div
								className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
									tipoPago === "exacto"
										? "border-teal-200 bg-teal-50 text-teal-800"
										: tipoPago === "parcial"
										? "border-amber-200 bg-amber-50 text-amber-800"
										: "border-sky-200 bg-sky-50 text-sky-800"
								}`}
							>
								<div className="flex items-center gap-1.5 font-medium">
									{tipoPago === "exacto" && <CheckCircle className="h-3.5 w-3.5" />}
									{tipoPago === "parcial" && <AlertCircle className="h-3.5 w-3.5" />}
									{tipoPago === "exceso" && <DollarSign className="h-3.5 w-3.5" />}
									{tipoPago === "exacto"
										? "Pago Completo"
										: tipoPago === "parcial"
										? "Pago Parcial"
										: "Pago con Exceso"}
								</div>
								<span className="text-xs tabular-nums">
									{tipoPago === "parcial" &&
										`Saldo: ${poliza.moneda} ${formatCurrency(saldoPendiente)}`}
									{tipoPago === "exceso" &&
										`Exceso: ${poliza.moneda} ${formatCurrency(exceso)}`}
									{tipoPago === "exacto" && "La cuota quedará pagada"}
								</span>
							</div>
						)}
					</div>

					{/* Fecha de pago */}
					<div className="space-y-1.5">
						<Label htmlFor="fecha">Fecha de Pago Compañía *</Label>
						<Input
							id="fecha"
							type="date"
							value={fechaPago}
							onChange={(e) => setFechaPago(e.target.value)}
							className="h-10"
							required
						/>
					</div>

					{/* Comprobante */}
					<div className="space-y-2">
						<Label>
							Comprobante de Pago *
						</Label>

						{/* Tipo de comprobante */}
						<Select
							value={tipoComprobante}
							onValueChange={(value) => setTipoComprobante(value as TipoComprobante)}
						>
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

						{/* File upload */}
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
									className={`h-7 w-7 ${
										isDragging ? "text-primary" : "text-muted-foreground"
									}`}
								/>
								<p className="text-sm text-muted-foreground text-center">
									Arrastra un archivo, pega con Ctrl+V o haz clic aquí
								</p>
								<p className="text-xs text-muted-foreground">
									JPG, PNG, WebP o PDF (máx. 10 MB)
								</p>
								<input
									ref={fileInputRef}
									type="file"
									className="hidden"
									accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
									onChange={handleFileChange}
								/>
							</div>
						) : (
							<div className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2.5">
								<div className="flex items-center gap-2.5">
									<FileText className="h-5 w-5 text-primary shrink-0" />
									<div>
										<p className="text-sm font-medium truncate max-w-[250px]">
											{selectedFile.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{formatearTamanoArchivo(selectedFile.size)}
										</p>
									</div>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-7 w-7 shrink-0"
									onClick={handleRemoveFile}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						)}

						{fileError && (
							<p className="text-xs text-destructive">{fileError}</p>
						)}
					</div>

					{/* Observaciones (optional) */}
					<div className="space-y-1.5">
						<Label htmlFor="observaciones">
							Observaciones{" "}
							<span className="text-muted-foreground font-normal">(opcional)</span>
						</Label>
						<Textarea
							id="observaciones"
							value={observaciones}
							onChange={(e) => setObservaciones(e.target.value)}
							rows={2}
							placeholder="Notas adicionales sobre el pago…"
							className="resize-none"
						/>
					</div>

					{/* Error */}
					{error && (
						<div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
							<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					{/* Actions */}
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
