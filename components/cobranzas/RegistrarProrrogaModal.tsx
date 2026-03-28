"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CalendarClock } from "lucide-react";
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

	// Minimum date: tomorrow
	const manana = new Date();
	manana.setDate(manana.getDate() + 1);
	manana.setHours(0, 0, 0, 0);

	const calcularDiasExtension = (): number | null => {
		if (!nuevaFecha) return null;
		const [y, m, d] = cuota.fecha_vencimiento.split("T")[0].split("-").map(Number);
		const fechaActual = new Date(y, m - 1, d);
		const diferencia = nuevaFecha.getTime() - fechaActual.getTime();
		return Math.floor(diferencia / (1000 * 60 * 60 * 24));
	};

	const diasExtension = calcularDiasExtension();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!nuevaFecha) {
			setError("Debe seleccionar una nueva fecha de vencimiento");
			return;
		}

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
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CalendarClock className="h-5 w-5 text-primary" />
						Registrar Prórroga de Cuota
					</DialogTitle>
				</DialogHeader>

				{/* Context info */}
				<div className="rounded-md border border-border bg-secondary px-4 py-3 text-sm">
					<div className="grid grid-cols-2 gap-x-6 gap-y-2">
						<div>
							<p className="text-xs text-muted-foreground">Cuota</p>
							<p className="font-medium mt-0.5">N° {cuota.numero_cuota}</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Monto</p>
							<p className="font-semibold tabular-nums mt-0.5">
								{poliza.moneda}{" "}
								{cuota.monto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
							</p>
						</div>
						<div className="col-span-2">
							<p className="text-xs text-muted-foreground">Vencimiento actual</p>
							<p className="font-medium mt-0.5">
								{formatearFecha(cuota.fecha_vencimiento, "largo")}
							</p>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* New due date */}
					<div className="space-y-1.5">
						<Label>Nueva Fecha de Vencimiento *</Label>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className={cn(
										"w-full justify-start text-left font-normal h-10",
										!nuevaFecha && "text-muted-foreground"
									)}
								>
									<CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
									{nuevaFecha ? (
										formatearFecha(nuevaFecha.toISOString(), "largo")
									) : (
										<span>Seleccione una fecha</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={nuevaFecha}
									onSelect={setNuevaFecha}
									disabled={(date) => date < manana}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
						<p className="text-xs text-muted-foreground">
							Debe ser una fecha futura (después de hoy)
						</p>
					</div>

					{/* Extension days feedback */}
					{diasExtension !== null && (
						<div className="flex items-center justify-between rounded-md border border-border bg-secondary px-4 py-2.5">
							<span className="text-sm text-muted-foreground">Días de extensión</span>
							<span className="text-sm font-semibold text-primary tabular-nums">
								{diasExtension} días
							</span>
						</div>
					)}

					{/* Reason */}
					<div className="space-y-1.5">
						<Label htmlFor="motivo">
							Motivo{" "}
							<span className="text-muted-foreground font-normal">(opcional)</span>
						</Label>
						<Textarea
							id="motivo"
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							placeholder="Ej: Solicitud del cliente, situación económica, etc."
							rows={3}
							maxLength={500}
							className="resize-none"
						/>
						<p className="text-xs text-muted-foreground text-right">
							{motivo.length}/500
						</p>
					</div>

					{/* Error */}
					{error && (
						<div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
							{error}
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-2 pt-1">
						<Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
							Cancelar
						</Button>
						<Button type="submit" disabled={loading || !nuevaFecha}>
							{loading ? "Registrando…" : "Confirmar Prórroga"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
