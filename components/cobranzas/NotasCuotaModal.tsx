"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, StickyNote, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { CuotaNota } from "@/types/cobranza";
import { agregarNotaCuota } from "@/app/cobranzas/actions";
import { formatFechaHoraLaPaz } from "@/utils/formatters";

/** Cuota objetivo de las notas: una de póliza (pagoId) o de anexo (anexoPagoId). */
export interface NotasTarget {
	pagoId?: string;
	anexoPagoId?: string;
	label?: string;
}

interface NotasCuotaModalProps {
	target: NotasTarget | null;
	notasIniciales: CuotaNota[];
	open: boolean;
	onClose: () => void;
	/** Se llama tras agregar una nota, para que el padre refresque contadores. */
	onAdded: () => void;
}

export default function NotasCuotaModal({
	target,
	notasIniciales,
	open,
	onClose,
	onAdded,
}: NotasCuotaModalProps) {
	const [notas, setNotas] = useState<CuotaNota[]>(notasIniciales);
	const [texto, setTexto] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setNotas(notasIniciales);
			setTexto("");
			setError(null);
		}
	}, [open, notasIniciales]);

	const handleSubmit = async () => {
		if (!target) return;
		const t = texto.trim();
		if (!t) {
			setError("Escribe una nota");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await agregarNotaCuota({
				pagoId: target.pagoId,
				anexoPagoId: target.anexoPagoId,
				nota: t,
			});
			if (res.success && res.data) {
				setNotas((prev) => [...prev, res.data!]);
				setTexto("");
				onAdded();
				toast.success("Nota agregada");
			} else {
				setError(res.error ?? "Error al guardar la nota");
			}
		} catch {
			setError("Error inesperado al guardar la nota");
		} finally {
			setLoading(false);
		}
	};

	if (!target) return null;

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<StickyNote className="h-5 w-5 text-primary" />
						Notas
						{target.label && (
							<span className="text-muted-foreground font-normal text-base">— {target.label}</span>
						)}
					</DialogTitle>
				</DialogHeader>

				{/* Timeline de notas */}
				<div className="max-h-64 overflow-y-auto space-y-2">
					{notas.length === 0 ? (
						<p className="text-sm text-muted-foreground py-2">Sin notas todavía.</p>
					) : (
						notas.map((n) => (
							<div key={n.id} className="rounded-md border border-border bg-secondary px-3 py-2">
								<p className="text-sm whitespace-pre-wrap">{n.nota}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{n.autor ?? "—"} · {formatFechaHoraLaPaz(n.created_at)}
								</p>
							</div>
						))
					)}
				</div>

				{/* Agregar nota */}
				<div className="space-y-2">
					<Textarea
						value={texto}
						onChange={(e) => setTexto(e.target.value)}
						rows={3}
						placeholder="Ej: el cliente indica que pagará el 15; viajó fuera de la ciudad…"
						className="resize-none"
					/>
					{error && (
						<div className="flex items-start gap-2 text-sm text-destructive">
							<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
							{error}
						</div>
					)}
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={onClose} disabled={loading}>
							Cerrar
						</Button>
						<Button onClick={handleSubmit} disabled={loading || !texto.trim()}>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-1.5" />
									Guardando…
								</>
							) : (
								"Agregar nota"
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
