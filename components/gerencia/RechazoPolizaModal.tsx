"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";

interface PolizaParaRechazo {
	id: string;
	numero_poliza: string;
	prima_total: number;
	moneda: string;
}

interface RechazoPolizaModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (motivo: string) => Promise<void>;
	poliza: PolizaParaRechazo | null;
	isLoading: boolean;
}

const MIN_CHARS = 10;
const MAX_CHARS = 500;

export function RechazoPolizaModal({
	isOpen,
	onClose,
	onConfirm,
	poliza,
	isLoading,
}: RechazoPolizaModalProps) {
	const [motivo, setMotivo] = useState("");
	const [error, setError] = useState<string | null>(null);

	const charCount = motivo.trim().length;
	const progress = Math.min((charCount / MIN_CHARS) * 100, 100);
	const isReady = charCount >= MIN_CHARS;

	const handleConfirm = async () => {
		if (!isReady) {
			setError(`El motivo debe tener al menos ${MIN_CHARS} caracteres`);
			return;
		}
		setError(null);
		await onConfirm(motivo.trim());
		setMotivo("");
	};

	const handleClose = () => {
		if (!isLoading) {
			setMotivo("");
			setError(null);
			onClose();
		}
	};

	const formatCurrency = (amount: number, currency: string) =>
		new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount) +
		" " +
		currency;

	if (!poliza) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
				{/* Destructive top bar */}
				<div className="h-1 w-full bg-destructive" />

				<div className="px-6 pt-5 pb-2">
					<DialogHeader className="mb-5">
						<div className="flex items-center gap-3">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
								<XCircle className="h-5 w-5 text-destructive" />
							</span>
							<div>
								<DialogTitle className="text-base font-semibold text-foreground leading-tight">
									Rechazar póliza
								</DialogTitle>
								<p className="text-xs text-muted-foreground mt-0.5 font-mono">
									{poliza.numero_poliza}
									<span className="ml-2 not-italic font-sans text-muted-foreground/70">
										{formatCurrency(poliza.prima_total, poliza.moneda)}
									</span>
								</p>
							</div>
						</div>
					</DialogHeader>

					<div className="space-y-4 pb-4">
						{/* Textarea */}
						<div className="space-y-2">
							<label className="text-xs font-medium text-foreground">
								Motivo del rechazo <span className="text-destructive">*</span>
							</label>
							<Textarea
								placeholder="Describe el motivo del rechazo…"
								value={motivo}
								onChange={(e) => {
									if (e.target.value.length <= MAX_CHARS) {
										setMotivo(e.target.value);
										if (error) setError(null);
									}
								}}
								rows={4}
								disabled={isLoading}
								className={`resize-none text-sm transition-colors ${
									error ? "border-destructive focus-visible:ring-destructive/30" : ""
								}`}
							/>

							{/* Progress bar + counter row */}
							<div className="space-y-1.5">
								<div className="h-1 w-full rounded-full bg-muted overflow-hidden">
									<div
										className={`h-full rounded-full transition-all duration-300 ${
											isReady ? "bg-primary" : "bg-destructive/50"
										}`}
										style={{ width: `${progress}%` }}
									/>
								</div>
								<div className="flex justify-between text-xs">
									{error ? (
										<span className="text-destructive">{error}</span>
									) : (
										<span className={`transition-colors ${isReady ? "text-primary font-medium" : "text-muted-foreground"}`}>
											{isReady
												? "Listo para enviar"
												: `${MIN_CHARS - charCount} caracteres restantes`}
										</span>
									)}
									<span className="text-muted-foreground tabular-nums">
										{charCount}/{MAX_CHARS}
									</span>
								</div>
							</div>
						</div>

						{/* Warning notice */}
						<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
							<AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
							<div className="text-xs text-amber-800 leading-relaxed">
								<span className="font-semibold">El creador tendrá 24 horas para editar.</span>{" "}
								La póliza quedará marcada como rechazada y podrá ser corregida y
								reenviada a validación.
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="px-6 pb-5 gap-2 flex-row justify-end border-t border-border pt-4">
					<Button
						variant="outline"
						size="sm"
						onClick={handleClose}
						disabled={isLoading}
						className="min-w-[80px]"
					>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={handleConfirm}
						disabled={isLoading || !isReady}
						className="min-w-[140px]"
					>
						{isLoading ? (
							<>
								<Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
								Rechazando…
							</>
						) : (
							<>
								<XCircle className="h-3.5 w-3.5 mr-2" />
								Confirmar rechazo
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
