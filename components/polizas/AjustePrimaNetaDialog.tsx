"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Loader2, PencilRuler, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ajustarPrimaNeta, restablecerPrimaNeta } from "@/app/polizas/[id]/ajuste-prima/actions";
import { captureError } from "@/utils/sentry";
import { formatCurrency } from "@/utils/formatters";

interface PolizaParaAjuste {
	id: string;
	numero_poliza: string;
	moneda: string;
	prima_total: number;
	prima_neta: number | null;
	comision_empresa: number | null;
	comision: number | null;
	comision_encargado: number | null;
	prima_neta_manual: boolean;
	prima_neta_ajuste_motivo: string | null;
	pagos: Array<{ monto: number; estado: string }>;
}

interface AjustePrimaNetaDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	poliza: PolizaParaAjuste;
}

/**
 * Ajuste manual de prima neta (solo admin). Para casos excepcionales donde
 * el factor del producto no aplica (descuento interno, pago en otra divisa).
 * Al escribir la nueva prima neta se sugieren comisiones proporcionales
 * (editables). La prima total NO se toca desde aquí: cambiarla afecta las
 * cuotas de cobranza, así que solo se modifica editando la póliza.
 */
export function AjustePrimaNetaDialog({ isOpen, onClose, onSuccess, poliza }: AjustePrimaNetaDialogProps) {
	const [primaNeta, setPrimaNeta] = useState("");
	const [comisionEmpresa, setComisionEmpresa] = useState("");
	const [comisionEncargado, setComisionEncargado] = useState("");
	const [comisionesTocadas, setComisionesTocadas] = useState(false);
	const [motivo, setMotivo] = useState("");
	const [loading, setLoading] = useState<"guardar" | "restablecer" | null>(null);

	const comisionEmpresaActual = poliza.comision_empresa ?? poliza.comision;
	const cuotasPendientes = poliza.pagos.filter((p) => p.estado !== "pagado");

	useEffect(() => {
		if (isOpen) {
			setPrimaNeta(poliza.prima_neta != null ? String(poliza.prima_neta) : "");
			setComisionEmpresa(comisionEmpresaActual != null ? String(comisionEmpresaActual) : "");
			setComisionEncargado(poliza.comision_encargado != null ? String(poliza.comision_encargado) : "");
			setComisionesTocadas(false);
			setMotivo(poliza.prima_neta_manual ? poliza.prima_neta_ajuste_motivo || "" : "");
			setLoading(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const redondear = (n: number) => Math.round(n * 100) / 100;

	// Al cambiar la prima neta, sugerir comisiones manteniendo las proporciones
	// actuales de la póliza (hasta que el admin las edite a mano). La prima
	// total NO se toca: se edita de forma independiente.
	const handlePrimaNetaChange = (valor: string) => {
		setPrimaNeta(valor);

		const nueva = parseFloat(valor);
		if (!Number.isFinite(nueva) || nueva <= 0) return;
		if (poliza.prima_neta == null || poliza.prima_neta <= 0) return;

		const k = nueva / poliza.prima_neta;

		if (!comisionesTocadas && comisionEmpresaActual != null) {
			const empresaSugerida = redondear(comisionEmpresaActual * k);
			setComisionEmpresa(String(empresaSugerida));
			if (poliza.comision_encargado != null && comisionEmpresaActual > 0) {
				const ratioEncargado = poliza.comision_encargado / comisionEmpresaActual;
				setComisionEncargado(String(redondear(empresaSugerida * ratioEncargado)));
			}
		}
	};

	const primaNetaNum = parseFloat(primaNeta);
	const superaPrimaTotal = Number.isFinite(primaNetaNum) && primaNetaNum > poliza.prima_total;

	const handleGuardar = async () => {
		const prima_neta = parseFloat(primaNeta);
		const comision_empresa = parseFloat(comisionEmpresa);
		const comision_encargado = parseFloat(comisionEncargado);

		if (!Number.isFinite(prima_neta) || prima_neta <= 0) {
			toast.error("Ingresa una prima neta válida mayor a 0");
			return;
		}
		if (!Number.isFinite(comision_empresa) || comision_empresa < 0) {
			toast.error("Ingresa una comisión empresa válida (0 o mayor)");
			return;
		}
		if (!Number.isFinite(comision_encargado) || comision_encargado < 0) {
			toast.error("Ingresa una comisión encargado válida (0 o mayor)");
			return;
		}
		if (motivo.trim().length < 5) {
			toast.error("Describe el motivo del ajuste (mínimo 5 caracteres)");
			return;
		}

		setLoading("guardar");
		try {
			const result = await ajustarPrimaNeta(poliza.id, {
				prima_neta,
				comision_empresa,
				comision_encargado,
				motivo: motivo.trim(),
			});
			if (result.success) {
				toast.success("Montos de la póliza ajustados manualmente");
				onSuccess();
				onClose();
			} else {
				toast.error(result.error);
			}
		} catch (error) {
			captureError(error, "AjustePrimaNetaDialog.guardar", { polizaId: poliza.id });
			toast.error("Error al guardar el ajuste");
		}
		setLoading(null);
	};

	const handleRestablecer = async () => {
		setLoading("restablecer");
		try {
			const result = await restablecerPrimaNeta(poliza.id);
			if (result.success) {
				toast.success("Prima neta restablecida al cálculo automático");
				onSuccess();
				onClose();
			} else {
				toast.error(result.error);
			}
		} catch (error) {
			captureError(error, "AjustePrimaNetaDialog.restablecer", { polizaId: poliza.id });
			toast.error("Error al restablecer la prima neta");
		}
		setLoading(null);
	};

	return (
		<Dialog open={isOpen} onOpenChange={loading ? undefined : onClose}>
			<DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
				<div className="h-1 w-full bg-warning" />

				<div className="px-6 pt-5 pb-2 max-h-[80vh] overflow-y-auto">
					<DialogHeader className="mb-4">
						<div className="flex items-center gap-3">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15">
								<PencilRuler className="h-5 w-5 text-warning" />
							</span>
							<div>
								<DialogTitle className="text-base font-semibold text-foreground leading-tight">
									Ajustar montos manualmente
								</DialogTitle>
								<p className="text-xs text-muted-foreground mt-0.5">
									Póliza{" "}
									<span className="font-mono font-medium text-foreground">
										{poliza.numero_poliza}
									</span>{" "}
									· solo administradores
								</p>
							</div>
						</div>
					</DialogHeader>

					<div className="rounded-lg border border-border bg-muted/40 divide-y divide-border text-sm mb-4">
						<div className="flex justify-between px-4 py-2">
							<span className="text-muted-foreground">Prima total actual</span>
							<span className="font-semibold text-foreground tabular-nums">
								{formatCurrency(poliza.prima_total, poliza.moneda)}
							</span>
						</div>
						<div className="flex justify-between px-4 py-2">
							<span className="text-muted-foreground">
								Prima neta actual{poliza.prima_neta_manual ? " (ya ajustada)" : ""}
							</span>
							<span className="font-semibold text-foreground tabular-nums">
								{poliza.prima_neta != null ? formatCurrency(poliza.prima_neta, poliza.moneda) : "—"}
							</span>
						</div>
						<div className="flex justify-between px-4 py-2">
							<span className="text-muted-foreground">Cuotas</span>
							<span className="font-medium text-foreground tabular-nums">
								{cuotasPendientes.length} pendiente{cuotasPendientes.length === 1 ? "" : "s"} ·{" "}
								{poliza.pagos.length - cuotasPendientes.length} pagada
								{poliza.pagos.length - cuotasPendientes.length === 1 ? "" : "s"}
							</span>
						</div>
					</div>

					<div className="space-y-3">
						<div>
							<Label htmlFor="ajuste-prima-neta" className="text-xs">
								Nueva prima neta ({poliza.moneda})
							</Label>
							<Input
								id="ajuste-prima-neta"
								type="number"
								min="0"
								step="0.01"
								value={primaNeta}
								onChange={(e) => handlePrimaNetaChange(e.target.value)}
								disabled={loading !== null}
								className="mt-1 tabular-nums"
							/>
							{superaPrimaTotal && (
								<p className="text-xs text-warning-foreground bg-warning/10 border border-warning/30 rounded-md px-2 py-1 mt-1.5">
									La prima neta supera la prima total de la póliza. Verifica el monto antes de
									guardar.
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label htmlFor="ajuste-comision-empresa" className="text-xs">
									Comisión empresa ({poliza.moneda})
								</Label>
								<Input
									id="ajuste-comision-empresa"
									type="number"
									min="0"
									step="0.01"
									value={comisionEmpresa}
									onChange={(e) => {
										setComisionesTocadas(true);
										setComisionEmpresa(e.target.value);
									}}
									disabled={loading !== null}
									className="mt-1 tabular-nums"
								/>
							</div>
							<div>
								<Label htmlFor="ajuste-comision-encargado" className="text-xs">
									Comisión encargado ({poliza.moneda})
								</Label>
								<Input
									id="ajuste-comision-encargado"
									type="number"
									min="0"
									step="0.01"
									value={comisionEncargado}
									onChange={(e) => {
										setComisionesTocadas(true);
										setComisionEncargado(e.target.value);
									}}
									disabled={loading !== null}
									className="mt-1 tabular-nums"
								/>
							</div>
						</div>
						<p className="text-xs text-muted-foreground -mt-1">
							Las comisiones se sugieren en proporción al cambio de prima neta; puedes corregirlas a
							mano. La prima total no se modifica desde aquí.
						</p>

						<div>
							<Label htmlFor="ajuste-motivo" className="text-xs">
								Motivo del ajuste (obligatorio)
							</Label>
							<Textarea
								id="ajuste-motivo"
								value={motivo}
								onChange={(e) => setMotivo(e.target.value)}
								placeholder="Ej: descuento interno autorizado por gerencia / prima pagada en USD al tipo de cambio del día"
								disabled={loading !== null}
								rows={2}
								className="mt-1"
							/>
						</div>
					</div>

					<p className="text-xs text-muted-foreground leading-relaxed mt-3">
						El ajuste queda registrado en el historial de la póliza con tu usuario, fecha y motivo. No
						cambia el estado de la póliza ni toca la prima total ni las cuotas. Restablecer recalcula
						prima neta y comisiones desde la prima total vigente.
					</p>
				</div>

				<DialogFooter className="px-6 py-4 gap-2 flex-row justify-between sm:justify-between">
					{poliza.prima_neta_manual ? (
						<Button
							variant="outline"
							size="sm"
							onClick={handleRestablecer}
							disabled={loading !== null}
							className="text-muted-foreground"
						>
							{loading === "restablecer" ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
							) : (
								<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
							)}
							Restablecer cálculo
						</Button>
					) : (
						<span />
					)}
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={onClose} disabled={loading !== null}>
							Cancelar
						</Button>
						<Button size="sm" onClick={handleGuardar} disabled={loading !== null} className="min-w-[130px]">
							{loading === "guardar" ? (
								<>
									<Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
									Guardando…
								</>
							) : (
								<>
									<Calculator className="h-3.5 w-3.5 mr-1.5" />
									Guardar ajuste
								</>
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
