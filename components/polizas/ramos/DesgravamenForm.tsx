"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import type { DatosDesgravamen } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLiveSync } from "@/hooks/useLiveSync";

type Props = {
	datos: DatosDesgravamen | null;
	moneda?: string;
	onChange: (datos: DatosDesgravamen) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Formulario mínimo de desgravamen: solo valor asegurado, que puede ser 0.
export function DesgravamenForm({ datos, moneda = "Bs", onChange, onSiguiente, onAnterior }: Props) {
	const [valorAsegurado, setValorAsegurado] = useState<number>(datos?.valor_asegurado ?? 0);

	// El valor asegurado puede ser 0, así que se sincroniza siempre (no se
	// condiciona a > 0 como en otros ramos).
	useLiveSync(() => ({ valor_asegurado: valorAsegurado }), onChange, [valorAsegurado]);

	const handleContinuar = () => {
		onChange({ valor_asegurado: valorAsegurado });
		onSiguiente();
	};

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-foreground">Paso 3: Datos Específicos - Desgravamen</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Registre el valor asegurado del desgravamen (puede ser 0).
					</p>
				</div>
				<div className="flex items-center gap-2 text-success">
					<CheckCircle2 className="h-5 w-5" />
					<span className="text-sm font-medium">Listo</span>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-secondary rounded-lg border border-border">
				<div className="space-y-2">
					<Label htmlFor="valor_asegurado">Valor Asegurado ({moneda})</Label>
					<Input
						id="valor_asegurado"
						type="number"
						min="0"
						step="0.01"
						value={valorAsegurado || ""}
						onChange={(e) => setValorAsegurado(Math.max(0, parseFloat(e.target.value) || 0))}
						placeholder="0.00"
						className="bg-background"
					/>
					<p className="text-xs text-muted-foreground">
						Puede dejarse en 0. La moneda se toma de los datos básicos de la póliza (Paso 2).
					</p>
				</div>
			</div>

			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>
				<Button onClick={handleContinuar}>
					Continuar
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
