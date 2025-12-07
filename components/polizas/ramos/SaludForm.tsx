"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus, Trash2, Users, AlertTriangle } from "lucide-react";
import type { DatosSalud, AseguradoSalud, RolAseguradoSalud } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuscadorClientes } from "../BuscadorClientes";

type Props = {
	datos: DatosSalud | null;
	regionales: Array<{ id: string; nombre: string }>;
	onChange: (datos: DatosSalud) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function SaludForm({ datos, regionales, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza || "individual"
	);
	const [sumaAsegurada, setSumaAsegurada] = useState<number>(datos?.suma_asegurada || 0);
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [asegurados, setAsegurados] = useState<AseguradoSalud[]>(datos?.asegurados || []);
	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});

	const agregarAsegurado = (cliente: { id: string; nombre: string; ci: string }) => {
		// Verificar que no esté duplicado
		if (asegurados.some((a) => a.client_id === cliente.id)) {
			return;
		}

		// Por defecto agregar como dependiente
		setAsegurados([
			...asegurados,
			{
				client_id: cliente.id,
				client_name: cliente.nombre,
				client_ci: cliente.ci,
				rol: "dependiente",
			},
		]);
		setMostrarBuscador(false);
	};

	const cambiarRol = (clientId: string, nuevoRol: RolAseguradoSalud) => {
		setAsegurados(
			asegurados.map((a) => (a.client_id === clientId ? { ...a, rol: nuevoRol } : a))
		);
	};

	const eliminarAsegurado = (clientId: string) => {
		setAsegurados(asegurados.filter((a) => a.client_id !== clientId));
	};

	const validarRoles = (): string[] => {
		const advertencias: string[] = [];
		const contratantes = asegurados.filter((a) => a.rol === "contratante");
		const titulares = asegurados.filter((a) => a.rol === "titular");
		const conyuges = asegurados.filter((a) => a.rol === "conyugue");

		if (contratantes.length === 0) {
			advertencias.push("Debe haber al menos 1 contratante");
		} else if (contratantes.length > 1) {
			advertencias.push("Solo puede haber 1 contratante");
		}

		if (titulares.length === 0) {
			advertencias.push("Debe haber al menos 1 titular");
		} else if (titulares.length > 1) {
			advertencias.push("Solo puede haber 1 titular");
		}

		if (conyuges.length > 1) {
			advertencias.push("Solo puede haber 1 cónyuge");
		}

		return advertencias;
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (sumaAsegurada <= 0) {
			nuevosErrores.suma_asegurada = "La suma asegurada debe ser mayor a 0";
		}

		if (!regionalId) {
			nuevosErrores.regional = "Debe seleccionar una regional";
		}

		if (asegurados.length === 0) {
			nuevosErrores.asegurados = "Debe agregar al menos un asegurado";
		}

		const advertenciasRoles = validarRoles();
		if (advertenciasRoles.length > 0) {
			nuevosErrores.roles = advertenciasRoles.join(", ");
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		onChange({
			tipo_poliza: tipoPoliza,
			suma_asegurada: sumaAsegurada,
			regional_asegurado_id: regionalId,
			asegurados,
		});

		onSiguiente();
	};

	const tieneDatos = sumaAsegurada > 0 && regionalId && asegurados.length > 0;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: Datos Específicos - Salud
					</h2>
					<p className="text-sm text-gray-600 mt-1">Configure los detalles de la póliza de salud</p>
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

				{/* Suma Asegurada */}
				<div className="space-y-2">
					<Label htmlFor="suma_asegurada">
						Suma Asegurada <span className="text-red-500">*</span>
					</Label>
					<Input
						id="suma_asegurada"
						type="number"
						min="0"
						step="0.01"
						value={sumaAsegurada || ""}
						onChange={(e) => {
							setSumaAsegurada(parseFloat(e.target.value) || 0);
							if (errores.suma_asegurada) {
								const { suma_asegurada, ...rest } = errores;
								setErrores(rest);
							}
						}}
						placeholder="50000.00"
						className={errores.suma_asegurada ? "border-red-500" : ""}
					/>
					{errores.suma_asegurada && <p className="text-sm text-red-600">{errores.suma_asegurada}</p>}
				</div>

				{/* Regional */}
				<div className="space-y-2">
					<Label htmlFor="regional">
						Regional Asegurado <span className="text-red-500">*</span>
					</Label>
					<Select
						value={regionalId}
						onValueChange={(value) => {
							setRegionalId(value);
							if (errores.regional) {
								const { regional, ...rest } = errores;
								setErrores(rest);
							}
						}}
					>
						<SelectTrigger className={errores.regional ? "border-red-500" : ""}>
							<SelectValue placeholder="Seleccione una regional" />
						</SelectTrigger>
						<SelectContent>
							{regionales.map((regional) => (
								<SelectItem key={regional.id} value={regional.id}>
									{regional.nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.regional && <p className="text-sm text-red-600">{errores.regional}</p>}
				</div>

				{/* Validación de Roles */}
				{validarRoles().length > 0 && asegurados.length > 0 && (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
						<AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-yellow-800">
							<p className="font-medium mb-1">Advertencias sobre roles:</p>
							<ul className="list-disc list-inside space-y-1">
								{validarRoles().map((adv, i) => (
									<li key={i}>{adv}</li>
								))}
							</ul>
						</div>
					</div>
				)}

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
					{errores.roles && <p className="text-sm text-red-600">{errores.roles}</p>}

					{asegurados.length === 0 ? (
						<div className="border-2 border-dashed rounded-lg p-8 text-center">
							<Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-600">No hay asegurados agregados</p>
							<p className="text-xs text-gray-500 mt-1">
								Debe agregar al menos: 1 contratante y 1 titular
							</p>
						</div>
					) : (
						<div className="border rounded-lg divide-y">
							{asegurados.map((asegurado) => (
								<div key={asegurado.client_id} className="p-4 flex items-center gap-4">
									<div className="flex-1">
										<p className="text-sm font-medium text-gray-900">{asegurado.client_name}</p>
										<p className="text-xs text-gray-600">CI/NIT: {asegurado.client_ci}</p>
									</div>
									<div className="w-48">
										<Select
											value={asegurado.rol}
											onValueChange={(value: RolAseguradoSalud) =>
												cambiarRol(asegurado.client_id, value)
											}
										>
											<SelectTrigger size="sm">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="contratante">Contratante</SelectItem>
												<SelectItem value="titular">Titular</SelectItem>
												<SelectItem value="conyugue">Cónyuge</SelectItem>
												<SelectItem value="dependiente">Dependiente</SelectItem>
											</SelectContent>
										</Select>
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

				{/* Información de Roles */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p className="text-sm text-blue-900 font-medium mb-2">Información sobre roles:</p>
					<ul className="text-xs text-blue-800 space-y-1">
						<li>• <strong>Contratante:</strong> Persona o empresa que contrata el seguro (solo 1)</li>
						<li>• <strong>Titular:</strong> Persona principal asegurada (solo 1)</li>
						<li>• <strong>Cónyuge:</strong> Pareja del titular (máximo 1)</li>
						<li>• <strong>Dependiente:</strong> Personas a cargo (pueden ser varios)</li>
					</ul>
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
