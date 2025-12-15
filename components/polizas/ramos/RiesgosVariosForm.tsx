"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus, Trash2, Users, AlertCircle } from "lucide-react";
import type { DatosRiesgosVarios, AseguradoRiesgosVarios, ConvenioRiesgosVarios } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BuscadorClientes } from "../BuscadorClientes";

type Props = {
	datos: DatosRiesgosVarios | null;
	onChange: (datos: DatosRiesgosVarios) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function RiesgosVariosForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	// Convertir datos antiguos (number) a nueva estructura (ConvenioRiesgosVarios)
	const inicializarConvenio = (valor: any): ConvenioRiesgosVarios => {
		if (typeof valor === 'object' && valor !== null && 'habilitado' in valor) {
			return valor as ConvenioRiesgosVarios;
		}
		// Si es un número (datos antiguos), convertir a nueva estructura
		const monto = typeof valor === 'number' ? valor : 0;
		return { habilitado: monto > 0, monto };
	};

	const [convenio1, setConvenio1] = useState<ConvenioRiesgosVarios>(
		inicializarConvenio(datos?.convenio_1_infidelidad_empleados)
	);
	const [convenio2, setConvenio2] = useState<ConvenioRiesgosVarios>(
		inicializarConvenio(datos?.convenio_2_perdidas_dentro_local)
	);
	const [convenio3, setConvenio3] = useState<ConvenioRiesgosVarios>(
		inicializarConvenio(datos?.convenio_3_perdidas_fuera_local)
	);
	const [convenio4, setConvenio4] = useState<ConvenioRiesgosVarios>(
		inicializarConvenio(datos?.convenio_4_pendiente) || { habilitado: false, monto: 0 }
	);
	const [convenio5, setConvenio5] = useState<ConvenioRiesgosVarios>(
		inicializarConvenio(datos?.convenio_5_pendiente) || { habilitado: false, monto: 0 }
	);
	const [valorTotal, setValorTotal] = useState<number>(datos?.valor_total_asegurado || 0);
	const [asegurados, setAsegurados] = useState<AseguradoRiesgosVarios[]>(datos?.asegurados || []);
	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// Calcular valor total automáticamente (solo convenios habilitados)
	useEffect(() => {
		const total = [convenio1, convenio2, convenio3, convenio4, convenio5]
			.filter(c => c.habilitado)
			.reduce((sum, c) => sum + c.monto, 0);
		setValorTotal(total);
	}, [convenio1, convenio2, convenio3, convenio4, convenio5]);

	const agregarAsegurado = (cliente: { id: string; nombre: string; ci: string }) => {
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

		// Validar que convenios habilitados tengan monto > 0
		const convenios = [
			{ nombre: 'convenio1', convenio: convenio1 },
			{ nombre: 'convenio2', convenio: convenio2 },
			{ nombre: 'convenio3', convenio: convenio3 },
			{ nombre: 'convenio4', convenio: convenio4 },
			{ nombre: 'convenio5', convenio: convenio5 },
		];

		convenios.forEach(({ nombre, convenio }) => {
			if (convenio.habilitado && convenio.monto <= 0) {
				nuevosErrores[nombre] = "El convenio habilitado debe tener un monto mayor a 0";
			}
		});

		if (valorTotal <= 0) {
			nuevosErrores.valor_total = "El valor total debe ser mayor a 0. Habilite al menos un convenio.";
		}

		if (asegurados.length === 0) {
			nuevosErrores.asegurados = "Debe agregar al menos un asegurado";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		onChange({
			convenio_1_infidelidad_empleados: convenio1,
			convenio_2_perdidas_dentro_local: convenio2,
			convenio_3_perdidas_fuera_local: convenio3,
			convenio_4_pendiente: convenio4,
			convenio_5_pendiente: convenio5,
			valor_total_asegurado: valorTotal,
			asegurados,
		});

		onSiguiente();
	};

	const tieneDatos = valorTotal > 0 && asegurados.length > 0;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: Datos Específicos - Riesgos Varios Misceláneos
					</h2>
					<p className="text-sm text-gray-600 mt-1">Configure las coberturas y asegurados</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">{asegurados.length} asegurado(s)</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
				{/* Información sobre coberturas */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex gap-3">
						<AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-900">
							<p className="font-medium mb-2">Coberturas disponibles:</p>
							<ul className="space-y-1 text-xs">
								<li>• <strong>Convenio 1:</strong> Infidelidad de empleados</li>
								<li>• <strong>Convenio 2:</strong> Pérdidas dentro del local</li>
								<li>• <strong>Convenio 3:</strong> Pérdidas fuera del local</li>
								<li>• <strong>Convenio 4:</strong> Pendiente</li>
								<li>• <strong>Convenio 5:</strong> Pendiente</li>
							</ul>
							<p className="mt-2 text-xs text-blue-700">
								Habilite los convenios necesarios. El valor total se calcula sumando solo los convenios habilitados.
							</p>
							<p className="mt-1 text-xs text-gray-600">
								La moneda se toma de los datos básicos de la póliza (Paso 2).
							</p>
						</div>
					</div>
				</div>

				{/* Coberturas */}
				<div className="space-y-4">
					<h3 className="text-sm font-semibold text-gray-900 uppercase">Coberturas</h3>

					{/* Convenio 1 */}
					<div className="flex items-start gap-4 p-3 border rounded-lg bg-white">
						<div className="flex items-center pt-2">
							<Checkbox
								id="conv1_habilitado"
								checked={convenio1.habilitado}
								onCheckedChange={(checked) => setConvenio1({ ...convenio1, habilitado: !!checked })}
							/>
						</div>
						<div className="flex-1 space-y-2">
							<Label htmlFor="convenio1" className="font-medium">
								Convenio 1: Infidelidad de Empleados
							</Label>
							{convenio1.habilitado && (
								<>
									<Input
										id="convenio1"
										type="number"
										min="0"
										step="0.01"
										value={convenio1.monto || ""}
										onChange={(e) => {
											setConvenio1({ ...convenio1, monto: parseFloat(e.target.value) || 0 });
											if (errores.convenio1) {
												const { convenio1, ...rest } = errores;
												setErrores(rest);
											}
										}}
										placeholder="0.00"
										className={errores.convenio1 ? "border-red-500" : ""}
									/>
									{errores.convenio1 && <p className="text-sm text-red-600">{errores.convenio1}</p>}
								</>
							)}
						</div>
					</div>

					{/* Convenio 2 */}
					<div className="flex items-start gap-4 p-3 border rounded-lg bg-white">
						<div className="flex items-center pt-2">
							<Checkbox
								id="conv2_habilitado"
								checked={convenio2.habilitado}
								onCheckedChange={(checked) => setConvenio2({ ...convenio2, habilitado: !!checked })}
							/>
						</div>
						<div className="flex-1 space-y-2">
							<Label htmlFor="convenio2" className="font-medium">
								Convenio 2: Pérdidas Dentro del Local
							</Label>
							{convenio2.habilitado && (
								<>
									<Input
										id="convenio2"
										type="number"
										min="0"
										step="0.01"
										value={convenio2.monto || ""}
										onChange={(e) => {
											setConvenio2({ ...convenio2, monto: parseFloat(e.target.value) || 0 });
											if (errores.convenio2) {
												const { convenio2, ...rest } = errores;
												setErrores(rest);
											}
										}}
										placeholder="0.00"
										className={errores.convenio2 ? "border-red-500" : ""}
									/>
									{errores.convenio2 && <p className="text-sm text-red-600">{errores.convenio2}</p>}
								</>
							)}
						</div>
					</div>

					{/* Convenio 3 */}
					<div className="flex items-start gap-4 p-3 border rounded-lg bg-white">
						<div className="flex items-center pt-2">
							<Checkbox
								id="conv3_habilitado"
								checked={convenio3.habilitado}
								onCheckedChange={(checked) => setConvenio3({ ...convenio3, habilitado: !!checked })}
							/>
						</div>
						<div className="flex-1 space-y-2">
							<Label htmlFor="convenio3" className="font-medium">
								Convenio 3: Pérdidas Fuera del Local
							</Label>
							{convenio3.habilitado && (
								<>
									<Input
										id="convenio3"
										type="number"
										min="0"
										step="0.01"
										value={convenio3.monto || ""}
										onChange={(e) => {
											setConvenio3({ ...convenio3, monto: parseFloat(e.target.value) || 0 });
											if (errores.convenio3) {
												const { convenio3, ...rest } = errores;
												setErrores(rest);
											}
										}}
										placeholder="0.00"
										className={errores.convenio3 ? "border-red-500" : ""}
									/>
									{errores.convenio3 && <p className="text-sm text-red-600">{errores.convenio3}</p>}
								</>
							)}
						</div>
					</div>

					{/* Convenio 4 - NUEVO */}
					<div className="flex items-start gap-4 p-3 border rounded-lg bg-white">
						<div className="flex items-center pt-2">
							<Checkbox
								id="conv4_habilitado"
								checked={convenio4.habilitado}
								onCheckedChange={(checked) => setConvenio4({ ...convenio4, habilitado: !!checked })}
							/>
						</div>
						<div className="flex-1 space-y-2">
							<Label htmlFor="convenio4" className="font-medium">
								Convenio 4: Pendiente
							</Label>
							{convenio4.habilitado && (
								<>
									<Input
										id="convenio4"
										type="number"
										min="0"
										step="0.01"
										value={convenio4.monto || ""}
										onChange={(e) => {
											setConvenio4({ ...convenio4, monto: parseFloat(e.target.value) || 0 });
											if (errores.convenio4) {
												const { convenio4, ...rest } = errores;
												setErrores(rest);
											}
										}}
										placeholder="0.00"
										className={errores.convenio4 ? "border-red-500" : ""}
									/>
									{errores.convenio4 && <p className="text-sm text-red-600">{errores.convenio4}</p>}
								</>
							)}
						</div>
					</div>

					{/* Convenio 5 - NUEVO */}
					<div className="flex items-start gap-4 p-3 border rounded-lg bg-white">
						<div className="flex items-center pt-2">
							<Checkbox
								id="conv5_habilitado"
								checked={convenio5.habilitado}
								onCheckedChange={(checked) => setConvenio5({ ...convenio5, habilitado: !!checked })}
							/>
						</div>
						<div className="flex-1 space-y-2">
							<Label htmlFor="convenio5" className="font-medium">
								Convenio 5: Pendiente
							</Label>
							{convenio5.habilitado && (
								<>
									<Input
										id="convenio5"
										type="number"
										min="0"
										step="0.01"
										value={convenio5.monto || ""}
										onChange={(e) => {
											setConvenio5({ ...convenio5, monto: parseFloat(e.target.value) || 0 });
											if (errores.convenio5) {
												const { convenio5, ...rest } = errores;
												setErrores(rest);
											}
										}}
										placeholder="0.00"
										className={errores.convenio5 ? "border-red-500" : ""}
									/>
									{errores.convenio5 && <p className="text-sm text-red-600">{errores.convenio5}</p>}
								</>
							)}
						</div>
					</div>

					{/* Valor Total (calculado) */}
					<div className="bg-gray-50 border rounded-lg p-4">
						<Label htmlFor="valor_total" className="text-base font-semibold">
							Valor Total Asegurado (Calculado)
						</Label>
						<p className="text-2xl font-bold text-gray-900 mt-2">
							{valorTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
						</p>
						<p className="text-xs text-gray-500 mt-1">
							Suma de convenios habilitados
						</p>
						{errores.valor_total && <p className="text-sm text-red-600 mt-2">{errores.valor_total}</p>}
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
							{asegurados.map((asegurado) => (
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
