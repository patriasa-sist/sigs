"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { redistribuirExceso } from "@/app/cobranzas/actions";
import type { ExcessPaymentDistribution, DistribucionExceso } from "@/types/cobranza";

interface RedistribucionModalProps {
	excessData: ExcessPaymentDistribution | null;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export default function RedistribucionModal({ excessData, open, onClose, onSuccess }: RedistribucionModalProps) {
	const [distribuciones, setDistribuciones] = useState<DistribucionExceso[]>([]);
	const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open && excessData) {
			setDistribuciones(excessData.distribuciones);
			setSeleccionadas(new Set());
			setError(null);
		}
	}, [open, excessData]);

	if (!excessData) return null;

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	const getTotalDistribuido = () => {
		return distribuciones.reduce((sum, d) => sum + d.monto_a_aplicar, 0);
	};

	const getSaldoRestante = () => {
		return excessData.monto_exceso - getTotalDistribuido();
	};

	const isValidDistribution = () => {
		const totalDist = getTotalDistribuido();
		const diff = Math.abs(totalDist - excessData.monto_exceso);
		return diff < 0.01; // Tolerance for floating point
	};

	const handleToggleSeleccion = (cuotaId: string) => {
		const newSeleccionadas = new Set(seleccionadas);
		if (newSeleccionadas.has(cuotaId)) {
			newSeleccionadas.delete(cuotaId);
		} else {
			newSeleccionadas.add(cuotaId);
		}
		setSeleccionadas(newSeleccionadas);
	};

	const handleMontoChange = (cuotaId: string, value: string) => {
		const monto = parseFloat(value) || 0;
		setDistribuciones(prev =>
			prev.map(d => {
				if (d.cuota_id === cuotaId) {
					const montoAplicar = Math.min(monto, d.monto_original);
					return {
						...d,
						monto_a_aplicar: montoAplicar,
						nuevo_saldo: d.monto_original - montoAplicar,
					};
				}
				return d;
			})
		);
	};

	const handleAutoDistribuir = () => {
		if (seleccionadas.size === 0) {
			setError("Selecciona al menos una cuota para redistribuir");
			return;
		}

		const cuotasSeleccionadas = distribuciones.filter(d => seleccionadas.has(d.cuota_id));
		const totalSeleccionadas = cuotasSeleccionadas.length;
		const montoPorCuota = excessData.monto_exceso / totalSeleccionadas;

		setDistribuciones(prev =>
			prev.map(d => {
				if (seleccionadas.has(d.cuota_id)) {
					// Distribuir equitativamente, pero no exceder monto original
					const montoAplicar = Math.min(montoPorCuota, d.monto_original);
					return {
						...d,
						monto_a_aplicar: montoAplicar,
						nuevo_saldo: d.monto_original - montoAplicar,
					};
				}
				return d;
			})
		);

		setError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!isValidDistribution()) {
			setError("El total distribuido debe ser igual al exceso");
			return;
		}

		// Filter only distributions with monto_a_aplicar > 0
		const distribucionesValidas = distribuciones.filter(d => d.monto_a_aplicar > 0);

		if (distribucionesValidas.length === 0) {
			setError("Debes aplicar el exceso a al menos una cuota");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const result = await redistribuirExceso({
				...excessData,
				distribuciones: distribucionesValidas,
				total_distribuido: getTotalDistribuido(),
				saldo_restante: getSaldoRestante(),
			});

			if (result.success) {
				onSuccess();
			} else {
				setError(result.error || "Error al redistribuir el exceso");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setLoading(false);
		}
	};

	const totalDistribuido = getTotalDistribuido();
	const saldoRestante = getSaldoRestante();
	const isValid = isValidDistribution();

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl">
						Redistribuir Exceso de Bs {formatCurrency(excessData.monto_exceso)}
					</DialogTitle>
					<DialogDescription>
						Distribuye el exceso entre las cuotas pendientes de la póliza. El total distribuido debe ser igual al exceso.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Auto-distribuir button */}
					<div className="flex justify-between items-center">
						<p className="text-sm text-muted-foreground">
							Selecciona las cuotas y usa &quot;Auto-distribuir&quot; o ingresa manualmente los montos
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={handleAutoDistribuir}
							disabled={seleccionadas.size === 0}
						>
							Auto-distribuir
						</Button>
					</div>

					{/* Tabla de distribución */}
					<div className="rounded-md border overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50">
								<tr>
									<th className="p-3 text-left text-sm font-medium w-12"></th>
									<th className="p-3 text-left text-sm font-medium">N° Cuota</th>
									<th className="p-3 text-left text-sm font-medium">Monto Original</th>
									<th className="p-3 text-left text-sm font-medium">Monto a Aplicar</th>
									<th className="p-3 text-left text-sm font-medium">Nuevo Saldo</th>
								</tr>
							</thead>
							<tbody>
								{distribuciones.map((dist, index) => (
									<tr
										key={dist.cuota_id}
										className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
									>
										<td className="p-3">
											<Checkbox
												checked={seleccionadas.has(dist.cuota_id)}
												onCheckedChange={() => handleToggleSeleccion(dist.cuota_id)}
											/>
										</td>
										<td className="p-3 text-sm font-medium">{dist.numero_cuota}</td>
										<td className="p-3 text-sm">Bs {formatCurrency(dist.monto_original)}</td>
										<td className="p-3">
											<Input
												type="number"
												step="0.01"
												min="0"
												max={dist.monto_original}
												value={dist.monto_a_aplicar || ""}
												onChange={(e) => handleMontoChange(dist.cuota_id, e.target.value)}
												className="w-32"
												placeholder="0.00"
											/>
										</td>
										<td className="p-3 text-sm">
											<span className={dist.nuevo_saldo === 0 ? "text-green-600 font-medium" : ""}>
												Bs {formatCurrency(dist.nuevo_saldo)}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{distribuciones.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							No hay cuotas pendientes disponibles para redistribución
						</div>
					)}

					{/* Totales */}
					<div className="rounded-lg border p-4 bg-muted/50">
						<div className="grid grid-cols-3 gap-4">
							<div>
								<p className="text-sm text-muted-foreground">Exceso Total</p>
								<p className="text-lg font-bold">Bs {formatCurrency(excessData.monto_exceso)}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Total Distribuido</p>
								<p className="text-lg font-bold text-blue-600">
									Bs {formatCurrency(totalDistribuido)}
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Saldo Restante</p>
								<p className={`text-lg font-bold ${Math.abs(saldoRestante) < 0.01 ? "text-green-600" : "text-red-600"}`}>
									Bs {formatCurrency(saldoRestante)}
								</p>
							</div>
						</div>
					</div>

					{/* Validation alerts */}
					{!isValid && totalDistribuido > 0 && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								El total distribuido (Bs {formatCurrency(totalDistribuido)}) debe ser igual al exceso (Bs {formatCurrency(excessData.monto_exceso)})
							</AlertDescription>
						</Alert>
					)}

					{isValid && totalDistribuido > 0 && (
						<Alert>
							<CheckCircle className="h-4 w-4" />
							<AlertDescription>
								La distribución es correcta. Puedes confirmar la redistribución.
							</AlertDescription>
						</Alert>
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
						<Button type="submit" disabled={loading || !isValid || totalDistribuido === 0}>
							{loading ? "Redistribuyendo..." : "Confirmar Redistribución"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
