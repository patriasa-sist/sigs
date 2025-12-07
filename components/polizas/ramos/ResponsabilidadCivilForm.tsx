"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus, Trash2, Users } from "lucide-react";
import type { DatosResponsabilidadCivil, AseguradoResponsabilidadCivil } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuscadorClientes } from "../BuscadorClientes";

type Props = {
	datos: DatosResponsabilidadCivil | null;
	onChange: (datos: DatosResponsabilidadCivil) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function ResponsabilidadCivilForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza || "individual"
	);
	const [valorAsegurado, setValorAsegurado] = useState<number>(datos?.valor_asegurado || 0);
	const [moneda, setMoneda] = useState<"Bs" | "USD">(datos?.moneda || "Bs");
	const [asegurados, setAsegurados] = useState<AseguradoResponsabilidadCivil[]>(datos?.asegurados || []);
	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});

	const agregarAsegurado = (cliente: { id: string; nombre: string; ci: string }) => {
		// Verificar que no esté duplicado
		if (asegurados.some((a) => a.client_id === cliente.id)) {
			return;
		}

		setAsegurados([
			...asegurados,
			{
				client_id: cliente.id,
				client_name: cliente.nombre,
				client_ci: cliente.ci,
			},
		]);
		setMostrarBuscador(false);
	};

	const eliminarAsegurado = (clientId: string) => {
		setAsegurados(asegurados.filter((a) => a.client_id !== clientId));
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (valorAsegurado <= 0) {
			nuevosErrores.valor_asegurado = "El valor asegurado debe ser mayor a 0";
		}

		if (asegurados.length === 0) {
			nuevosErrores.asegurados = "Debe agregar al menos un asegurado";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		onChange({
			tipo_poliza: tipoPoliza,
			valor_asegurado: valorAsegurado,
			moneda,
			asegurados,
		});

		onSiguiente();
	};

	const tieneDatos = valorAsegurado > 0 && asegurados.length > 0;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: Datos Específicos - Responsabilidad Civil
					</h2>
					<p className="text-sm text-gray-600 mt-1">Configure los detalles de la póliza</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">{asegurados.length} asegurado(s)</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
				{/* Tipo de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">
						Tipo de Póliza <span className="text-red-500">*</span>
					</Label>
					<Select value={tipoPoliza} onValueChange={(value: "individual" | "corporativo") => setTipoPoliza(value)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="individual">Individual</SelectItem>
							<SelectItem value="corporativo">Corporativo</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Valor Asegurado */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="valor_asegurado">
							Valor Asegurado <span className="text-red-500">*</span>
						</Label>
						<Input
							id="valor_asegurado"
							type="number"
							min="0"
							step="0.01"
							value={valorAsegurado || ""}
							onChange={(e) => {
								setValorAsegurado(parseFloat(e.target.value) || 0);
								if (errores.valor_asegurado) {
									const { valor_asegurado, ...rest } = errores;
									setErrores(rest);
								}
							}}
							placeholder="100000.00"
							className={errores.valor_asegurado ? "border-red-500" : ""}
						/>
						{errores.valor_asegurado && <p className="text-sm text-red-600">{errores.valor_asegurado}</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor="moneda">
							Moneda <span className="text-red-500">*</span>
						</Label>
						<Select value={moneda} onValueChange={(value: "Bs" | "USD") => setMoneda(value)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Bs">Bolivianos (Bs)</SelectItem>
								<SelectItem value="USD">Dólares (USD)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Lista de Asegurados */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label>
							Asegurados <span className="text-red-500">*</span>
						</Label>
						<Button type="button" variant="outline" size="sm" onClick={() => setMostrarBuscador(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Agregar Asegurado
						</Button>
					</div>

					{errores.asegurados && <p className="text-sm text-red-600">{errores.asegurados}</p>}

					{asegurados.length === 0 ? (
						<div className="border-2 border-dashed rounded-lg p-8 text-center">
							<Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-600">No hay asegurados agregados</p>
							<p className="text-xs text-gray-500 mt-1">Haga clic en "Agregar Asegurado" para comenzar</p>
						</div>
					) : (
						<div className="border rounded-lg divide-y">
							{asegurados.map((asegurado, index) => (
								<div key={asegurado.client_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
									<div className="flex-1">
										<p className="text-sm font-medium text-gray-900">{asegurado.client_name}</p>
										<p className="text-xs text-gray-600">CI/NIT: {asegurado.client_ci}</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => eliminarAsegurado(asegurado.client_id)}
									>
										<Trash2 className="h-4 w-4 text-red-600" />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Buscador de Clientes Modal */}
			{mostrarBuscador && (
				<BuscadorClientes
					onSeleccionar={agregarAsegurado}
					onCancelar={() => setMostrarBuscador(false)}
					clientesExcluidos={asegurados.map((a) => a.client_id)}
				/>
			)}

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 mt-6 border-t">
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
