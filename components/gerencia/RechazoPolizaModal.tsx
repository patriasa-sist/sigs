"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, XCircle } from "lucide-react";

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

export function RechazoPolizaModal({
	isOpen,
	onClose,
	onConfirm,
	poliza,
	isLoading,
}: RechazoPolizaModalProps) {
	const [motivo, setMotivo] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleConfirm = async () => {
		if (motivo.trim().length < 10) {
			setError("El motivo debe tener al menos 10 caracteres");
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

	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount) + " " + currency;
	};

	if (!poliza) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<XCircle className="h-5 w-5 text-red-500" />
						Rechazar Poliza
					</DialogTitle>
					<DialogDescription>
						Poliza: <strong>{poliza.numero_poliza}</strong>
						<span className="ml-2 text-muted-foreground">
							({formatCurrency(poliza.prima_total, poliza.moneda)})
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="motivo">
							Motivo del rechazo <span className="text-red-500">*</span>
						</Label>
						<Textarea
							id="motivo"
							placeholder="Describa el motivo del rechazo (minimo 10 caracteres)..."
							value={motivo}
							onChange={(e) => {
								setMotivo(e.target.value);
								if (error) setError(null);
							}}
							rows={4}
							className={error ? "border-red-500" : ""}
							disabled={isLoading}
						/>
						<div className="flex justify-between text-sm">
							{error ? (
								<p className="text-red-500">{error}</p>
							) : (
								<span className="text-muted-foreground">
									{motivo.length}/10 caracteres minimo
								</span>
							)}
						</div>
					</div>

					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
						<div className="flex items-start gap-2">
							<AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-yellow-800">
								<p className="font-medium">El creador tendra 24 horas para editar</p>
								<p className="mt-1">
									La poliza sera marcada como &quot;Rechazada&quot; y el usuario
									que la creo podra editarla durante 1 dia para corregirla.
								</p>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isLoading}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleConfirm}
						disabled={isLoading || motivo.trim().length < 10}
					>
						{isLoading ? (
							<>
								<span className="animate-spin mr-2">...</span>
								Rechazando...
							</>
						) : (
							<>
								<XCircle className="h-4 w-4 mr-2" />
								Confirmar Rechazo
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
