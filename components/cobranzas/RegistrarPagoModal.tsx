"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, DollarSign } from "lucide-react";
import { registrarPago, obtenerCuotasPendientesPorPoliza } from "@/app/cobranzas/actions";
import type { CuotaPago, PolizaConPagos, ExcessPaymentDistribution } from "@/types/cobranza";

interface RegistrarPagoModalProps {
	cuota: CuotaPago | null;
	poliza: PolizaConPagos | null;
	open: boolean;
	onClose: () => void;
	onSuccess: (excessData?: ExcessPaymentDistribution) => void;
}

export default function RegistrarPagoModal({ cuota, poliza, open, onClose, onSuccess }: RegistrarPagoModalProps) {
	const [montoPagado, setMontoPagado] = useState<string>("");
	const [fechaPago, setFechaPago] = useState<string>("");
	const [observaciones, setObservaciones] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Validation states
	const [puedePayar, setPuedePayar] = useState(true);
	const [mensajeValidacion, setMensajeValidacion] = useState<string>("");
	const [tipoValidacion, setTipoValidacion] = useState<"error" | "warning" | "info">("info");

	useEffect(() => {
		// Reset form when modal opens
		if (open && cuota) {
			setMontoPagado(cuota.monto.toString());
			setFechaPago(new Date().toISOString().split("T")[0]);
			setObservaciones("");
			setError(null);

			// Validate if overdue quota can be paid
			validarCuotaVencida();
		}
	}, [open, cuota]);

	const validarCuotaVencida = () => {
		if (!cuota) return;

		if (cuota.estado === "vencido") {
			const fechaVenc = new Date(cuota.fecha_vencimiento);
			const hoy = new Date();

			const mesVenc = fechaVenc.getMonth();
			const anioVenc = fechaVenc.getFullYear();

			const mesActual = hoy.getMonth();
			const anioActual = hoy.getFullYear();

			const mismoMes = mesVenc === mesActual && anioVenc === anioActual;

			if (mismoMes) {
				setPuedePayar(true);
				setMensajeValidacion("Esta cuota está vencida pero puede pagarse hasta fin de mes");
				setTipoValidacion("warning");
			} else {
				setPuedePayar(false);
				const mesNombre = fechaVenc.toLocaleDateString("es-BO", { month: "long", year: "numeric" });
				setMensajeValidacion(`No se puede pagar. Esta cuota venció en ${mesNombre}`);
				setTipoValidacion("error");
			}
		} else {
			setPuedePayar(true);
			setMensajeValidacion("");
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!cuota || !poliza) return;
		if (!puedePayar) return;

		const monto = parseFloat(montoPagado);
		if (isNaN(monto) || monto <= 0) {
			setError("El monto debe ser mayor a 0");
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
				// Si hay exceso, preparar datos para redistribución
				if (result.data.tipo_pago === "exceso" && result.data.exceso_generado) {
					// Obtener cuotas pendientes de la misma póliza
					const cuotasPendientesResult = await obtenerCuotasPendientesPorPoliza(poliza.id);

					if (cuotasPendientesResult.success && cuotasPendientesResult.data) {
						// Preparar estructura de redistribución
						const excessData: ExcessPaymentDistribution = {
							poliza_id: poliza.id,
							cuota_origen_id: cuota.id,
							monto_exceso: result.data.exceso_generado,
							distribuciones: cuotasPendientesResult.data.map(c => ({
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
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Registrar Pago - Cuota #{cuota.numero_cuota}</DialogTitle>
					<DialogDescription asChild>
						<div className="space-y-1 text-sm text-muted-foreground">
							<div><span className="font-semibold">Póliza:</span> {poliza.numero_poliza}</div>
							<div><span className="font-semibold">Cliente:</span> {poliza.client.nombre_completo}</div>
							<div><span className="font-semibold">Monto de la cuota:</span> {poliza.moneda} {formatCurrency(cuota.monto)}</div>
							<div><span className="font-semibold">Fecha vencimiento:</span> {new Date(cuota.fecha_vencimiento).toLocaleDateString("es-BO")}</div>
						</div>
					</DialogDescription>
				</DialogHeader>

				{/* Validación de cuota vencida */}
				{mensajeValidacion && (
					<Alert variant={tipoValidacion === "error" ? "destructive" : "default"}>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							{tipoValidacion === "error" && "❌ "}
							{tipoValidacion === "warning" && "⚠️ "}
							{mensajeValidacion}
						</AlertDescription>
					</Alert>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Monto Pagado */}
					<div className="space-y-2">
						<Label htmlFor="monto">Monto Pagado *</Label>
						<Input
							id="monto"
							type="number"
							step="0.01"
							min="0"
							value={montoPagado}
							onChange={(e) => setMontoPagado(e.target.value)}
							required
							disabled={!puedePayar}
						/>
					</div>

					{/* Fecha de Pago */}
					<div className="space-y-2">
						<Label htmlFor="fecha">Fecha de Pago *</Label>
						<Input
							id="fecha"
							type="date"
							value={fechaPago}
							onChange={(e) => setFechaPago(e.target.value)}
							required
							disabled={!puedePayar}
						/>
					</div>

					{/* Observaciones */}
					<div className="space-y-2">
						<Label htmlFor="observaciones">Observaciones</Label>
						<Textarea
							id="observaciones"
							value={observaciones}
							onChange={(e) => setObservaciones(e.target.value)}
							rows={3}
							placeholder="Notas adicionales sobre el pago..."
							disabled={!puedePayar}
						/>
					</div>

					{/* Indicador de tipo de pago */}
					{tipoPago && montoPagado && (
						<div className="rounded-lg border p-4 space-y-2">
							{tipoPago === "parcial" && (
								<>
									<Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
										Pago Parcial
									</Badge>
									<p className="text-sm text-muted-foreground">
										Saldo pendiente: {poliza.moneda} {formatCurrency(saldoPendiente)}
									</p>
								</>
							)}

							{tipoPago === "exacto" && (
								<>
									<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
										<CheckCircle className="h-3 w-3 mr-1" />
										Pago Completo
									</Badge>
									<p className="text-sm text-muted-foreground">
										La cuota quedará marcada como pagada
									</p>
								</>
							)}

							{tipoPago === "exceso" && (
								<>
									<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
										<DollarSign className="h-3 w-3 mr-1" />
										Pago con Exceso
									</Badge>
									<p className="text-sm text-muted-foreground">
										Exceso: {poliza.moneda} {formatCurrency(exceso)}
									</p>
									<p className="text-xs text-muted-foreground">
										Podrás redistribuir el exceso entre otras cuotas pendientes
									</p>
								</>
							)}
						</div>
					)}

					{/* Error message */}
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Buttons */}
					<div className="flex justify-end space-x-2">
						<Button type="button" variant="outline" onClick={onClose} disabled={loading}>
							Cancelar
						</Button>
						<Button type="submit" disabled={loading || !puedePayar}>
							{loading ? "Registrando..." : "Confirmar Pago"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
