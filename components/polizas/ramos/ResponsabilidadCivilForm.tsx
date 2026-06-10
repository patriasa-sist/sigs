"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus, Car, Edit, Trash2 } from "lucide-react";
import type { DatosResponsabilidadCivil, VehiculoRC } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VehiculoRCModal } from "./VehiculoRCModal";
import { createClient } from "@/utils/supabase/client";
import { useLiveSync } from "@/hooks/useLiveSync";

type TipoVehiculo = { id: string; nombre: string };
type MarcaVehiculo = { id: string; nombre: string };

type Props = {
	datos: DatosResponsabilidadCivil | null;
	onChange: (datos: DatosResponsabilidadCivil) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function ResponsabilidadCivilForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(datos?.tipo_poliza ?? "individual");
	const [valorAsegurado, setValorAsegurado] = useState<number>(datos?.valor_asegurado ?? 0);
	const [vehiculos, setVehiculos] = useState<VehiculoRC[]>(datos?.vehiculos ?? []);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoRC | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [vehiculoAEliminar, setVehiculoAEliminar] = useState<number | null>(null);

	// Catálogos para mostrar nombres en la tabla
	const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
	const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);

	useEffect(() => {
		const cargar = async () => {
			try {
				const supabase = createClient();
				const [{ data: tipos }, { data: marcasData }] = await Promise.all([
					supabase.from("tipos_vehiculo").select("id, nombre").order("nombre"),
					supabase.from("marcas_vehiculo").select("id, nombre").order("nombre"),
				]);
				setTiposVehiculo(tipos ?? []);
				setMarcas(marcasData ?? []);
			} catch (e) {
				console.error("Error cargando catálogos RC:", e);
			}
		};
		cargar();
	}, []);

	const nombreTipo = (id?: string) => tiposVehiculo.find((t) => t.id === id)?.nombre ?? "-";
	const nombreMarca = (id?: string) => marcas.find((m) => m.id === id)?.nombre ?? "-";

	const emitir = (nuevosVehiculos: VehiculoRC[]) => {
		onChange({ tipo_poliza: tipoPoliza, valor_asegurado: valorAsegurado, vehiculos: nuevosVehiculos });
	};

	const handleGuardarVehiculo = (vehiculo: VehiculoRC) => {
		let lista: VehiculoRC[];
		if (indexEditando !== null) {
			lista = [...vehiculos];
			lista[indexEditando] = vehiculo;
		} else {
			lista = [...vehiculos, vehiculo];
		}
		setVehiculos(lista);
		emitir(lista);
		setModalAbierto(false);
		setVehiculoEditando(null);
		setIndexEditando(null);
	};

	const handleEditar = (v: VehiculoRC, idx: number) => {
		setVehiculoEditando(v);
		setIndexEditando(idx);
		setModalAbierto(true);
	};

	const handleEliminar = (idx: number) => {
		setVehiculoAEliminar(idx);
	};

	const confirmarEliminar = () => {
		if (vehiculoAEliminar === null) return;
		const lista = vehiculos.filter((_, i) => i !== vehiculoAEliminar);
		setVehiculos(lista);
		emitir(lista);
		setVehiculoAEliminar(null);
	};

	const handleTipoPolizaChange = (value: "individual" | "corporativo") => {
		setTipoPoliza(value);
		onChange({ tipo_poliza: value, valor_asegurado: valorAsegurado, vehiculos });
	};

	const handleValorChange = (value: number) => {
		setValorAsegurado(value);
		if (errores.valor_asegurado) {
			const rest = { ...errores };
			delete rest.valor_asegurado;
			setErrores(rest);
		}
	};

	// Sincroniza ediciones con el padre en vivo (sin requerir "Continuar"),
	// para que el borrador de recovery y el resumen reflejen lo escrito.
	useLiveSync(
		() => (valorAsegurado > 0 ? { tipo_poliza: tipoPoliza, valor_asegurado: valorAsegurado, vehiculos } : null),
		onChange,
		[tipoPoliza, valorAsegurado, vehiculos],
	);

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (valorAsegurado <= 0) {
			nuevosErrores.valor_asegurado = "El valor asegurado debe ser mayor a 0";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		onChange({ tipo_poliza: tipoPoliza, valor_asegurado: valorAsegurado, vehiculos });
		onSiguiente();
	};

	const usoLabel = (uso: VehiculoRC["uso"]) => {
		const map = { publico: "Público", particular: "Particular", privado: "Privado" };
		return map[uso] ?? uso;
	};

	const usoColor = (uso: VehiculoRC["uso"]) => {
		if (uso === "publico") return "bg-info/15 text-info";
		if (uso === "privado") return "bg-primary/10 text-primary";
		return "bg-success/15 text-success";
	};

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-foreground">
						Paso 3: Datos Específicos - Responsabilidad Civil
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Configure el límite de cobertura y opcionalmente los vehículos asegurados
					</p>
				</div>
				{valorAsegurado > 0 && (
					<div className="flex items-center gap-2 text-success">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{vehiculos.length > 0 ? `${vehiculos.length} vehículo(s)` : "Listo"}
						</span>
					</div>
				)}
			</div>

			{/* Datos generales de la póliza */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-secondary rounded-lg border border-border">
				{/* Tipo de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">Tipo de Póliza</Label>
					<Select value={tipoPoliza} onValueChange={handleTipoPolizaChange}>
						<SelectTrigger className="bg-background">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="individual">Individual</SelectItem>
							<SelectItem value="corporativo">Corporativo</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Valor Asegurado (límite de cobertura) */}
				<div className="space-y-2">
					<Label htmlFor="valor_asegurado">
						Límite de Cobertura <span className="text-destructive">*</span>
					</Label>
					<Input
						id="valor_asegurado"
						type="number"
						min="0"
						step="0.01"
						value={valorAsegurado || ""}
						onChange={(e) => handleValorChange(parseFloat(e.target.value) || 0)}
						placeholder="100000.00"
						className={`bg-background ${errores.valor_asegurado ? "border-destructive" : ""}`}
					/>
					{errores.valor_asegurado && <p className="text-sm text-destructive">{errores.valor_asegurado}</p>}
					<p className="text-xs text-muted-foreground">
						La moneda se toma de los datos básicos de la póliza (Paso 2)
					</p>
				</div>
			</div>

			{/* Sección de vehículos */}
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-base font-semibold text-foreground">
					Vehículos Asegurados <span className="text-muted-foreground text-sm font-normal">(opcional)</span>
				</h3>
				<Button
					onClick={() => {
						setVehiculoEditando(null);
						setIndexEditando(null);
						setModalAbierto(true);
					}}
				>
					<Plus className="mr-2 h-4 w-4" />
					Agregar Vehículo
				</Button>
			</div>

			{vehiculos.length === 0 ? (
				<div className="text-center py-12 border-2 border-dashed rounded-lg mb-6">
					<Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground mb-1">No hay vehículos agregados</p>
					<p className="text-sm text-muted-foreground">
						Agregue los vehículos que pueden causar accidentes a terceros
					</p>
				</div>
			) : (
				<div className="overflow-x-auto border rounded-lg mb-6">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Placa
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Chasis
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Tipo
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Marca / Modelo
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Año
								</th>
								<th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
									Uso
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Servicio
								</th>
								<th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{vehiculos.map((v, idx) => (
								<tr key={idx} className="hover:bg-muted/50">
									<td className="px-4 py-3 font-medium text-foreground">{v.placa}</td>
									<td
										className="px-4 py-3 text-sm text-muted-foreground max-w-[140px] truncate"
										title={v.nro_chasis}
									>
										{v.nro_chasis}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{nombreTipo(v.tipo_vehiculo_id)}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{nombreMarca(v.marca_vehiculo_id)}
										{v.modelo ? ` ${v.modelo}` : ""}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">{v.ano ?? "-"}</td>
									<td className="px-4 py-3 text-center">
										<span
											className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${usoColor(v.uso)}`}
										>
											{usoLabel(v.uso)}
										</span>
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">{v.servicio ?? "-"}</td>
									<td className="px-4 py-3 text-center">
										<div className="flex items-center justify-center gap-2">
											<Button variant="ghost" size="sm" onClick={() => handleEditar(v, idx)}>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEliminar(idx)}
												className="text-destructive hover:text-destructive hover:bg-destructive/10"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Botones de navegación */}
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

			{/* Modal */}
			{modalAbierto && (
				<VehiculoRCModal
					vehiculo={vehiculoEditando}
					onGuardar={handleGuardarVehiculo}
					onCancelar={() => {
						setModalAbierto(false);
						setVehiculoEditando(null);
						setIndexEditando(null);
					}}
				/>
			)}

			{/* Diálogo: confirmar eliminación de vehículo */}
			<AlertDialog
				open={vehiculoAEliminar !== null}
				onOpenChange={(open) => {
					if (!open) setVehiculoAEliminar(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar este vehículo?</AlertDialogTitle>
						<AlertDialogDescription>
							El vehículo se quitará de la lista de la póliza.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmarEliminar}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
