"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { registrarProrroga } from "@/app/cobranzas/actions";
import type { CuotaPago, PolizaConPagos } from "@/types/cobranza";
import { formatearFecha } from "@/utils/cobranza";
import { cn } from "@/lib/utils";

interface RegistrarProrrogaModalProps {
	cuota: CuotaPago | null;
	poliza: PolizaConPagos | null;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

/**
 * MEJORA #8: Modal para registrar prórroga de cuota
 * Permite extender la fecha de vencimiento con historial completo
 */
export default function RegistrarProrrogaModal({
	cuota,
	poliza,
	open,
	onClose,
	onSuccess,
}: RegistrarProrrogaModalProps) {
	const [nuevaFecha, setNuevaFecha] = useState<Date | undefined>(undefined);
	const [motivo, setMotivo] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!cuota || !poliza) return null;

	// Calculate minimum date (tomorrow)
	const manana = new Date();
	manana.setDate(manana.getDate() + 1);
	manana.setHours(0, 0, 0, 0);

	// Calculate extension days
	const calcularDiasExtension = (): number | null => {
		if (!nuevaFecha) return null;

		const fechaActual = new Date(cuota.fecha_vencimiento);
		const diferencia = nuevaFecha.getTime() - fechaActual.getTime();
		const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

		return dias;
	};

	const diasExtension = calcularDiasExtension();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!nuevaFecha) {
			setError("Debe seleccionar una nueva fecha de vencimiento");
			return;
		}

		// Validate that nueva fecha is in the future
		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);

		if (nuevaFecha <= hoy) {
			setError("La nueva fecha debe ser futura (después de hoy)");
			return;
		}

		setLoading(true);

		try {
			const response = await registrarProrroga({
				cuota_id: cuota.id,
				nueva_fecha: nuevaFecha.toISOString().split("T")[0],
				motivo: motivo.trim() || undefined,
			});

			if (response.success) {
				onSuccess();
				onClose();
				// Reset form
				setNuevaFecha(undefined);
				setMotivo("");
			} else {
				setError(response.error || "Error al registrar prórroga");
			}
		} catch (err) {
			console.error("Error submitting prórroga:", err);
			setError("Error al registrar prórroga");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setNuevaFecha(undefined);
			setMotivo("");
			setError(null);
			onClose();
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Registrar Prórroga de Cuota</DialogTitle>
					<DialogDescription>
						Extienda la fecha de vencimiento de la cuota N° {cuota.numero_cuota} de la póliza{" "}
						{poliza.numero_poliza}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Current info */}
					<div className="rounded-md border p-3 bg-muted/30">
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>
								<span className="font-medium">Cuota:</span> N° {cuota.numero_cuota}
							</div>
							<div>
								<span className="font-medium">Monto:</span> {poliza.moneda}{" "}
								{cuota.monto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
							</div>
							<div className="col-span-2">
								<span className="font-medium">Vencimiento actual:</span>{" "}
								{formatearFecha(cuota.fecha_vencimiento, "largo")}
							</div>
						</div>
					</div>

					{/* Date picker */}
					<div className="space-y-2">
						<Label htmlFor="nueva-fecha">Nueva Fecha de Vencimiento *</Label>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className={cn(
										"w-full justify-start text-left font-normal",
										!nuevaFecha && "text-muted-foreground"
									)}
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{nuevaFecha ? (
										formatearFecha(nuevaFecha.toISOString(), "largo")
									) : (
										<span>Seleccione una fecha</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0">
								<Calendar
									mode="single"
									selected={nuevaFecha}
									onSelect={setNuevaFecha}
									disabled={(date) => date < manana}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
						<p className="text-xs text-muted-foreground">Debe ser una fecha futura (después de hoy)</p>
					</div>

					{/* Extension days display */}
					{diasExtension !== null && (
						<div className="rounded-md border p-3 bg-blue-50 border-blue-200">
							<p className="text-sm font-medium text-blue-900">
								Días de extensión: <span className="text-lg">{diasExtension}</span> días
							</p>
						</div>
					)}

					{/* Motivo */}
					<div className="space-y-2">
						<Label htmlFor="motivo">Motivo (opcional)</Label>
						<Textarea
							id="motivo"
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							placeholder="Ej: Solicitud del cliente, situación económica, etc."
							rows={3}
							maxLength={500}
						/>
						<p className="text-xs text-muted-foreground">{motivo.length}/500 caracteres</p>
					</div>

					{/* Error message */}
					{error && (
						<div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
							{error}
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
							Cancelar
						</Button>
						<Button type="submit" disabled={loading || !nuevaFecha}>
							{loading ? "Registrando..." : "Confirmar Prórroga"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
