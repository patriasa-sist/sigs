"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus, Car, Edit, Trash2 } from "lucide-react";
import type { DatosResponsabilidadCivil, VehiculoRC } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehiculoRCModal } from "./VehiculoRCModal";
import { createClient } from "@/utils/supabase/client";

type TipoVehiculo = { id: string; nombre: string };
type MarcaVehiculo = { id: string; nombre: string };

type Props = {
	datos: DatosResponsabilidadCivil | null;
	onChange: (datos: DatosResponsabilidadCivil) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function ResponsabilidadCivilForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza ?? "individual"
	);
	const [valorAsegurado, setValorAsegurado] = useState<number>(datos?.valor_asegurado ?? 0);
	const [vehiculos, setVehiculos] = useState<VehiculoRC[]>(datos?.vehiculos ?? []);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoRC | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);
	const [errores, setErrores] = useState<Record<string, string>>({});

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
		if (!confirm("¿Eliminar este vehículo?")) return;
		const lista = vehiculos.filter((_, i) => i !== idx);
		setVehiculos(lista);
		emitir(lista);
	};

	const handleTipoPolizaChange = (value: "individual" | "corporativo") => {
		setTipoPoliza(value);
		onChange({ tipo_poliza: value, valor_asegurado: valorAsegurado, vehiculos });
	};

	const handleValorChange = (value: number) => {
		setValorAsegurado(value);
		if (errores.valor_asegurado) {
			const { valor_asegurado: _removed, ...rest } = errores;
			setErrores(rest);
		}
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (valorAsegurado <= 0) {
			nuevosErrores.valor_asegurado = "El valor asegurado debe ser mayor a 0";
		}
		if (vehiculos.length === 0) {
			nuevosErrores.vehiculos = "Debe agregar al menos un vehículo";
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
		if (uso === "publico") return "bg-blue-100 text-blue-800";
		if (uso === "privado") return "bg-purple-100 text-purple-800";
		return "bg-green-100 text-green-800";
	};

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: Datos Específicos - Responsabilidad Civil
					</h2>
					<p className="text-sm text-gray-600 mt-1">
						Configure el límite de cobertura y los vehículos asegurados
					</p>
				</div>
				{vehiculos.length > 0 && valorAsegurado > 0 && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">{vehiculos.length} vehículo(s)</span>
					</div>
				)}
			</div>

			{/* Datos generales de la póliza */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
				{/* Tipo de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">Tipo de Póliza</Label>
					<Select value={tipoPoliza} onValueChange={handleTipoPolizaChange}>
						<SelectTrigger className="bg-white">
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
						Límite de Cobertura <span className="text-red-500">*</span>
					</Label>
					<Input
						id="valor_asegurado"
						type="number"
						min="0"
						step="0.01"
						value={valorAsegurado || ""}
						onChange={(e) => handleValorChange(parseFloat(e.target.value) || 0)}
						placeholder="100000.00"
						className={`bg-white ${errores.valor_asegurado ? "border-red-500" : ""}`}
					/>
					{errores.valor_asegurado && (
						<p className="text-sm text-red-600">{errores.valor_asegurado}</p>
					)}
					<p className="text-xs text-gray-500">
						La moneda se toma de los datos básicos de la póliza (Paso 2)
					</p>
				</div>
			</div>

			{/* Sección de vehículos */}
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-base font-semibold text-gray-900">
					Vehículos Asegurados <span className="text-red-500">*</span>
				</h3>
				<Button onClick={() => { setVehiculoEditando(null); setIndexEditando(null); setModalAbierto(true); }}>
					<Plus className="mr-2 h-4 w-4" />
					Agregar Vehículo
				</Button>
			</div>

			{errores.vehiculos && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-sm text-red-700">{errores.vehiculos}</p>
				</div>
			)}

			{vehiculos.length === 0 ? (
				<div className="text-center py-12 border-2 border-dashed rounded-lg mb-6">
					<Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-600 mb-1">No hay vehículos agregados</p>
					<p className="text-sm text-gray-500">
						Agregue los vehículos que pueden causar accidentes a terceros
					</p>
				</div>
			) : (
				<div className="overflow-x-auto border rounded-lg mb-6">
					<table className="w-full">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Placa</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Chasis</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Marca / Modelo</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Año</th>
								<th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Uso</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Servicio</th>
								<th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{vehiculos.map((v, idx) => (
								<tr key={idx} className="hover:bg-gray-50">
									<td className="px-4 py-3 font-medium text-gray-900">{v.placa}</td>
									<td className="px-4 py-3 text-sm text-gray-600 max-w-[140px] truncate" title={v.nro_chasis}>
										{v.nro_chasis}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">{nombreTipo(v.tipo_vehiculo_id)}</td>
									<td className="px-4 py-3 text-sm text-gray-600">
										{nombreMarca(v.marca_vehiculo_id)}
										{v.modelo ? ` ${v.modelo}` : ""}
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">{v.ano ?? "-"}</td>
									<td className="px-4 py-3 text-center">
										<span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${usoColor(v.uso)}`}>
											{usoLabel(v.uso)}
										</span>
									</td>
									<td className="px-4 py-3 text-sm text-gray-600">{v.servicio ?? "-"}</td>
									<td className="px-4 py-3 text-center">
										<div className="flex items-center justify-center gap-2">
											<Button variant="ghost" size="sm" onClick={() => handleEditar(v, idx)}>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEliminar(idx)}
												className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
		</div>
	);
}
