"use client";

import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

interface PolizaParaValidar {
	id: string;
	numero_poliza: string;
	prima_total: number;
	moneda: string;
	asegurado?: string;
}

interface ValidarPolizaModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	poliza: PolizaParaValidar | null;
	isLoading: boolean;
}

export function ValidarPolizaModal({
	isOpen,
	onClose,
	onConfirm,
	poliza,
	isLoading,
}: ValidarPolizaModalProps) {
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
		<Dialog open={isOpen} onOpenChange={isLoading ? undefined : onClose}>
			<DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
				{/* Coloured top bar */}
				<div className="h-1 w-full bg-primary" />

				<div className="px-6 pt-5 pb-6">
					<DialogHeader className="mb-5">
						<div className="flex items-center gap-3">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
								<ShieldCheck className="h-5 w-5 text-primary" />
							</span>
							<div>
								<DialogTitle className="text-base font-semibold text-foreground leading-tight">
									Confirmar validación
								</DialogTitle>
								<p className="text-xs text-muted-foreground mt-0.5">
									La póliza pasará a estado <span className="font-medium text-foreground">Activa</span>
								</p>
							</div>
						</div>
					</DialogHeader>

					{/* Policy summary card */}
					<div className="rounded-lg border border-border bg-muted/40 divide-y divide-border text-sm mb-5">
						<div className="flex justify-between px-4 py-2.5">
							<span className="text-muted-foreground">Póliza</span>
							<span className="font-semibold text-foreground font-mono tracking-wide">
								{poliza.numero_poliza}
							</span>
						</div>
						{poliza.asegurado && (
							<div className="flex justify-between px-4 py-2.5">
								<span className="text-muted-foreground">Asegurado</span>
								<span className="font-medium text-foreground text-right max-w-[180px] truncate">
									{poliza.asegurado}
								</span>
							</div>
						)}
						<div className="flex justify-between px-4 py-2.5">
							<span className="text-muted-foreground">Prima total</span>
							<span className="font-semibold text-foreground tabular-nums">
								{formatCurrency(poliza.prima_total, poliza.moneda)}
							</span>
						</div>
					</div>

					<p className="text-xs text-muted-foreground leading-relaxed">
						Esta acción quedará registrada con tu usuario y la fecha actual. No podrás
						revertirla directamente.
					</p>
				</div>

				<DialogFooter className="px-6 pb-5 gap-2 flex-row justify-end">
					<Button
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isLoading}
						className="min-w-[80px]"
					>
						Cancelar
					</Button>
					<Button
						size="sm"
						onClick={onConfirm}
						disabled={isLoading}
						className="min-w-[120px] bg-primary hover:bg-primary/90"
					>
						{isLoading ? (
							<>
								<Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
								Validando…
							</>
						) : (
							<>
								<CheckCircle2 className="h-3.5 w-3.5 mr-2" />
								Validar póliza
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
