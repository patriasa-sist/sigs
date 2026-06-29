"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Forma estructural compartida por BienAseguradoIncendio y
// BienAseguradoRiesgosVarios (sus `items[].nombre` son uniones distintas, pero
// la estructura es la misma). El llamador castea al tipo concreto del ramo.
export type BienGenerico = {
	direccion: string;
	items: { nombre: string; monto: number }[];
	valor_total_declarado: number;
	es_primer_riesgo: boolean;
};

type Props = {
	bien: BienGenerico | null;
	// Lista de nombres de items asegurables válidos para el ramo.
	itemsDisponibles: readonly string[];
	moneda?: string;
	onGuardar: (bien: BienGenerico) => void;
	onCancelar: () => void;
	// En anexos (inclusión/reemplazo) el valor total declarado puede ser 0.
	permitirCeroAsegurado?: boolean;
};

// Modal de captura de un bien asegurado (dirección + items con monto + primer
// riesgo). Reutilizado por la inclusión de Incendio y Riesgos Varios en anexos,
// con la misma lógica que el modal inline de creación de pólizas.
export function BienModal({
	bien,
	itemsDisponibles,
	moneda = "Bs",
	onGuardar,
	onCancelar,
	permitirCeroAsegurado = false,
}: Props) {
	const [direccion, setDireccion] = useState(bien?.direccion || "");
	const [items, setItems] = useState<{ nombre: string; monto: number }[]>(bien?.items || []);
	const [esPrimerRiesgo, setEsPrimerRiesgo] = useState(bien?.es_primer_riesgo || false);

	// El valor total declarado es la suma de los montos de los items (derivado).
	const valorTotalDeclarado = items.reduce((sum, item) => sum + item.monto, 0);

	const agregarItem = (nombre: string) => {
		if (items.some((item) => item.nombre === nombre)) return;
		setItems([...items, { nombre, monto: 0 }]);
	};

	const actualizarMontoItem = (nombre: string, monto: number) => {
		setItems(items.map((item) => (item.nombre === nombre ? { ...item, monto } : item)));
	};

	const eliminarItem = (nombre: string) => {
		setItems(items.filter((item) => item.nombre !== nombre));
	};

	const handleGuardar = () => {
		if (!direccion.trim()) {
			toast.error("Debe ingresar una dirección");
			return;
		}
		if (items.length === 0) {
			toast.error("Debe agregar al menos un item asegurado");
			return;
		}
		if (!permitirCeroAsegurado && valorTotalDeclarado <= 0) {
			toast.error("El valor total declarado debe ser mayor a 0");
			return;
		}

		onGuardar({
			direccion: direccion.trim(),
			items,
			valor_total_declarado: valorTotalDeclarado,
			es_primer_riesgo: esPrimerRiesgo,
		});
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-card rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				<h3 className="text-lg font-semibold text-foreground mb-4">
					{bien ? "Editar" : "Agregar"} Bien Asegurado
				</h3>

				<div className="space-y-4">
					{/* Dirección */}
					<div className="space-y-2">
						<Label htmlFor="bien_direccion">
							Dirección/Ubicación <span className="text-destructive">*</span>
						</Label>
						<Input
							id="bien_direccion"
							value={direccion}
							onChange={(e) => setDireccion(e.target.value)}
							placeholder="Ej: Av. Ejemplo #123, La Paz"
						/>
					</div>

					{/* Items Asegurables */}
					<div className="space-y-3">
						<Label className="text-base">Items Asegurables</Label>

						<div className="flex gap-2 flex-wrap">
							{itemsDisponibles
								.filter((nombre) => !items.some((item) => item.nombre === nombre))
								.map((nombre) => (
									<Button
										key={nombre}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => agregarItem(nombre)}
									>
										<Plus className="mr-1 h-3 w-3" />
										{nombre}
									</Button>
								))}
						</div>

						{items.length > 0 && (
							<div className="space-y-2 mt-3">
								{items.map((item) => (
									<div key={item.nombre} className="flex items-center gap-2 p-3 border rounded-lg">
										<div className="flex-1">
											<Label className="text-sm font-medium">{item.nombre}</Label>
											<Input
												type="number"
												min="0"
												step="0.01"
												value={item.monto || ""}
												onChange={(e) =>
													actualizarMontoItem(item.nombre, parseFloat(e.target.value) || 0)
												}
												placeholder="0.00"
												className="mt-1"
											/>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => eliminarItem(item.nombre)}
										>
											<Trash2 className="h-4 w-4 text-destructive" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Valor Total Declarado (calculado) */}
					<div className="bg-secondary border rounded-lg p-3">
						<Label className="text-sm font-medium">Valor Total Declarado (Calculado)</Label>
						<p className="text-xl font-bold text-foreground mt-1">
							{moneda} {valorTotalDeclarado.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
						</p>
					</div>

					{/* Primer Riesgo */}
					<div className="flex items-center space-x-2">
						<Checkbox
							id="bien_es_primer_riesgo"
							checked={esPrimerRiesgo}
							onCheckedChange={(checked) => setEsPrimerRiesgo(!!checked)}
						/>
						<Label htmlFor="bien_es_primer_riesgo" className="cursor-pointer">
							¿Es Primer Riesgo?
						</Label>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-6">
					<Button variant="outline" onClick={onCancelar}>
						Cancelar
					</Button>
					<Button onClick={handleGuardar}>Guardar</Button>
				</div>
			</div>
		</div>
	);
}

// Listas de items por ramo (espejo de las definidas en los forms de creación).
export const ITEMS_INCENDIO: readonly string[] = [
	"Edificaciones, instalaciones en general",
	"Activos fijos en general",
	"Equipos electronicos",
	"Maquinaria fija o equipos",
	"Bienes de terceros",
	"Existencias (mercaderia)",
	"Dinero y valores dentro del predio",
	"Vidrios y cristales",
	"Letreros",
	"Perdida de beneficios",
	"Obras de arte",
];

export const ITEMS_RIESGOS_VARIOS: readonly string[] = [
	"Edificaciones, instalaciones en general",
	"Activos fijos en general (muebles y enseres)",
	"Equipos electronicos",
	"Maquinaria fija",
	"Bienes de terceros",
	"Existencias de mercaderias",
	"Dinero y valores dentro del predio",
	"Vidrios y cristales",
	"Letreros",
	"Perdida de beneficios",
	"Valor asegurado (SALUD)",
	"Deshonestidad de empleados",
	"Pérdida dentro del local",
	"Pérdida fuera del local",
	"Falsificacion de giros postales",
	"Falsificación de doc. bancario",
];
