"use client";

import { useState } from "react";
import {
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Plus,
	Trash2,
	Edit,
	Plane,
	Ship,
	Users,
	Settings,
	UserPlus,
} from "lucide-react";
import type { DatosAeronavegacion, NaveEmbarcacion, NivelAPNave, AseguradoAeronavegacion } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuscadorClientes } from "../BuscadorClientes";
import { NaveModal } from "./NaveModal";

type Props = {
	datos: DatosAeronavegacion | null;
	tipoNave: "aeronave" | "embarcacion"; // Viene del ramo seleccionado
	onChange: (datos: DatosAeronavegacion) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Sub-paso interno: configuración de niveles AP o formulario principal
type SubPaso = "niveles_ap" | "principal";

export function AeronavegacionForm({ datos, tipoNave, onChange, onSiguiente, onAnterior }: Props) {
	// Estado del sub-paso actual
	const [subPaso, setSubPaso] = useState<SubPaso>(
		datos?.niveles_ap && datos.niveles_ap.length > 0 ? "principal" : "niveles_ap"
	);

	// ===== PASO 2.1: NIVELES DE ACCIDENTES PERSONALES =====
	const [nivelesAP, setNivelesAP] = useState<NivelAPNave[]>(datos?.niveles_ap || []);
	const [nivelEditando, setNivelEditando] = useState<NivelAPNave | null>(null);
	const [nombreNivel, setNombreNivel] = useState("");
	const [montoMuerte, setMontoMuerte] = useState<number>(0);
	const [montoInvalidez, setMontoInvalidez] = useState<number>(0);
	const [montoGastosMedicos, setMontoGastosMedicos] = useState<number>(0);

	// ===== PASO 3: FORMULARIO PRINCIPAL =====
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza || "individual"
	);
	const [naves, setNaves] = useState<NaveEmbarcacion[]>(datos?.naves || []);
	const [aseguradosAdicionales, setAseguradosAdicionales] = useState<AseguradoAeronavegacion[]>(
		datos?.asegurados_adicionales || []
	);
	const [modalNaveAbierto, setModalNaveAbierto] = useState(false);
	const [naveEditando, setNaveEditando] = useState<NaveEmbarcacion | null>(null);
	const [indexNaveEditando, setIndexNaveEditando] = useState<number | null>(null);
	const [mostrarBuscadorCliente, setMostrarBuscadorCliente] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});

	const tipoLabel = tipoNave === "aeronave" ? "Aeronave" : "Nave/Embarcación";
	const tipoLabelPlural = tipoNave === "aeronave" ? "Aeronaves" : "Naves/Embarcaciones";
	const IconoNave = tipoNave === "aeronave" ? Plane : Ship;

	// ===== FUNCIONES PASO 2.1: NIVELES AP =====
	const crearNuevoNivel = () => {
		const numeroNivel = nivelesAP.length + 1;
		setNivelEditando({
			id: crypto.randomUUID(),
			nombre: `Nivel ${numeroNivel}`,
			monto_muerte_accidental: 0,
			monto_invalidez: 0,
			monto_gastos_medicos: 0,
		});
		setNombreNivel(`Nivel ${numeroNivel}`);
		setMontoMuerte(0);
		setMontoInvalidez(0);
		setMontoGastosMedicos(0);
	};

	const guardarNivel = () => {
		if (!nivelEditando) return;

		const nuevosErrores: Record<string, string> = {};

		if (!nombreNivel || nombreNivel.trim() === "") {
			nuevosErrores.nombre_nivel = "El nombre del nivel es obligatorio";
		}

		// Al menos uno de los montos debe ser mayor a 0
		if (montoMuerte <= 0 && montoInvalidez <= 0 && montoGastosMedicos <= 0) {
			nuevosErrores.montos = "Al menos un monto debe ser mayor a 0";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		const nivelActualizado: NivelAPNave = {
			...nivelEditando,
			nombre: nombreNivel,
			monto_muerte_accidental: montoMuerte,
			monto_invalidez: montoInvalidez,
			monto_gastos_medicos: montoGastosMedicos,
		};

		const index = nivelesAP.findIndex((n) => n.id === nivelEditando.id);
		if (index >= 0) {
			const nuevosNiveles = [...nivelesAP];
			nuevosNiveles[index] = nivelActualizado;
			setNivelesAP(nuevosNiveles);
		} else {
			setNivelesAP([...nivelesAP, nivelActualizado]);
		}

		setNivelEditando(null);
		setNombreNivel("");
		setMontoMuerte(0);
		setMontoInvalidez(0);
		setMontoGastosMedicos(0);
		setErrores({});
	};

	const editarNivel = (nivel: NivelAPNave) => {
		setNivelEditando(nivel);
		setNombreNivel(nivel.nombre);
		setMontoMuerte(nivel.monto_muerte_accidental);
		setMontoInvalidez(nivel.monto_invalidez);
		setMontoGastosMedicos(nivel.monto_gastos_medicos);
	};

	const eliminarNivel = (id: string) => {
		// Verificar si alguna nave usa este nivel
		const navesConNivel = naves.filter((n) => n.nivel_ap_id === id);
		if (navesConNivel.length > 0) {
			alert(`No se puede eliminar este nivel porque está asignado a ${navesConNivel.length} ${tipoLabelPlural.toLowerCase()}`);
			return;
		}

		if (confirm("¿Está seguro de eliminar este nivel?")) {
			setNivelesAP(nivelesAP.filter((n) => n.id !== id));
		}
	};

	const continuarAPrincipal = () => {
		// Los niveles AP son opcionales, pueden continuar sin ellos
		setErrores({});
		setSubPaso("principal");
	};

	const volverANiveles = () => {
		setSubPaso("niveles_ap");
	};

	// ===== FUNCIONES PASO 3: PRINCIPAL =====

	// Agregar nave
	const handleAgregarNave = () => {
		setNaveEditando(null);
		setIndexNaveEditando(null);
		setModalNaveAbierto(true);
	};

	// Editar nave
	const handleEditarNave = (nave: NaveEmbarcacion, index: number) => {
		setNaveEditando(nave);
		setIndexNaveEditando(index);
		setModalNaveAbierto(true);
	};

	// Guardar nave (nueva o editada)
	const handleGuardarNave = (nave: NaveEmbarcacion) => {
		let nuevasNaves: NaveEmbarcacion[];

		if (indexNaveEditando !== null) {
			// Editar existente
			nuevasNaves = [...naves];
			nuevasNaves[indexNaveEditando] = nave;
		} else {
			// Verificar matrícula única
			if (naves.some((n) => n.matricula === nave.matricula)) {
				alert("Ya existe una nave con esa matrícula");
				return;
			}
			nuevasNaves = [...naves, nave];
		}

		setNaves(nuevasNaves);
		actualizarDatos({ naves: nuevasNaves });
		setModalNaveAbierto(false);
		setNaveEditando(null);
		setIndexNaveEditando(null);
	};

	// Eliminar nave
	const handleEliminarNave = (index: number) => {
		if (confirm(`¿Está seguro de eliminar esta ${tipoLabel.toLowerCase()}?`)) {
			const nuevasNaves = naves.filter((_, i) => i !== index);
			setNaves(nuevasNaves);
			actualizarDatos({ naves: nuevasNaves });
		}
	};

	// Agregar asegurado adicional
	const handleAgregarAsegurado = (cliente: { id: string; nombre: string; ci: string }) => {
		if (aseguradosAdicionales.some((a) => a.client_id === cliente.id)) {
			alert("Este cliente ya fue agregado como asegurado adicional");
			return;
		}

		const nuevosAsegurados = [
			...aseguradosAdicionales,
			{
				client_id: cliente.id,
				client_name: cliente.nombre,
				client_ci: cliente.ci,
			},
		];
		setAseguradosAdicionales(nuevosAsegurados);
		actualizarDatos({ asegurados_adicionales: nuevosAsegurados });
		setMostrarBuscadorCliente(false);
	};

	// Eliminar asegurado adicional
	const handleEliminarAsegurado = (clientId: string) => {
		if (confirm("¿Está seguro de eliminar este asegurado adicional?")) {
			const nuevosAsegurados = aseguradosAdicionales.filter((a) => a.client_id !== clientId);
			setAseguradosAdicionales(nuevosAsegurados);
			actualizarDatos({ asegurados_adicionales: nuevosAsegurados });
		}
	};

	// Actualizar datos del formulario
	const actualizarDatos = (datosActualizados: Partial<DatosAeronavegacion>) => {
		const datosCompletos: DatosAeronavegacion = {
			tipo_poliza: tipoPoliza,
			tipo_nave: tipoNave,
			niveles_ap: nivelesAP,
			naves,
			asegurados_adicionales: aseguradosAdicionales,
			...datosActualizados,
		};
		onChange(datosCompletos);
	};

	// Cambio de tipo de póliza
	const handleTipoPolizaChange = (value: "individual" | "corporativo") => {
		setTipoPoliza(value);
		actualizarDatos({ tipo_poliza: value });
	};

	// Continuar al siguiente paso
	const handleContinuar = () => {
		if (naves.length === 0) {
			setErrores({ general: `Debe agregar al menos una ${tipoLabel.toLowerCase()}` });
			return;
		}

		// Guardar todos los datos
		onChange({
			tipo_poliza: tipoPoliza,
			tipo_nave: tipoNave,
			niveles_ap: nivelesAP,
			naves,
			asegurados_adicionales: aseguradosAdicionales,
		});

		onSiguiente();
	};

	// Obtener nombre del nivel AP por ID
	const obtenerNombreNivelAP = (id?: string): string => {
		if (!id) return "Sin AP";
		const nivel = nivelesAP.find((n) => n.id === id);
		return nivel ? nivel.nombre : "Sin AP";
	};

	const tieneNaves = naves.length > 0;

	// ===== RENDER PASO 2.1: NIVELES AP =====
	if (subPaso === "niveles_ap") {
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-xl font-semibold text-gray-900">
							Paso 2.1: Niveles de Accidentes Personales
						</h2>
						<p className="text-sm text-gray-600 mt-1">
							Configure los niveles de cobertura de AP para tripulantes y pasajeros (opcional)
						</p>
					</div>
					<Settings className="h-6 w-6 text-gray-400" />
				</div>

				{/* Lista de niveles */}
				{nivelesAP.length > 0 && (
					<div className="mb-6 border rounded-lg overflow-hidden">
						<table className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
										Nivel
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
										Muerte Accidental
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
										Invalidez
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
										Gastos Médicos
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
										Acciones
									</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{nivelesAP.map((nivel) => (
									<tr key={nivel.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-medium text-gray-900">{nivel.nombre}</td>
										<td className="px-4 py-3 text-right text-gray-900">
											{nivel.monto_muerte_accidental.toLocaleString("es-BO", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-3 text-right text-gray-900">
											{nivel.monto_invalidez.toLocaleString("es-BO", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-3 text-right text-gray-900">
											{nivel.monto_gastos_medicos.toLocaleString("es-BO", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-3 text-center">
											<div className="flex items-center justify-center gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => editarNivel(nivel)}
												>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => eliminarNivel(nivel.id)}
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

				{/* Formulario para crear/editar nivel */}
				{nivelEditando ? (
					<div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
						<h4 className="text-sm font-semibold text-blue-900 mb-4">
							{nivelesAP.some((n) => n.id === nivelEditando.id) ? "Editar Nivel" : "Nuevo Nivel"}
						</h4>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="space-y-2">
								<Label htmlFor="nombre_nivel">Nombre del Nivel</Label>
								<Input
									id="nombre_nivel"
									value={nombreNivel}
									onChange={(e) => setNombreNivel(e.target.value)}
									placeholder="Ej: Nivel 1"
									className={errores.nombre_nivel ? "border-red-500" : ""}
								/>
								{errores.nombre_nivel && (
									<p className="text-sm text-red-600">{errores.nombre_nivel}</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="monto_muerte">Muerte Accidental</Label>
								<Input
									id="monto_muerte"
									type="number"
									min="0"
									step="0.01"
									value={montoMuerte}
									onChange={(e) => setMontoMuerte(parseFloat(e.target.value) || 0)}
									placeholder="50000"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="monto_invalidez">Invalidez</Label>
								<Input
									id="monto_invalidez"
									type="number"
									min="0"
									step="0.01"
									value={montoInvalidez}
									onChange={(e) => setMontoInvalidez(parseFloat(e.target.value) || 0)}
									placeholder="50000"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="monto_gastos">Gastos Médicos</Label>
								<Input
									id="monto_gastos"
									type="number"
									min="0"
									step="0.01"
									value={montoGastosMedicos}
									onChange={(e) => setMontoGastosMedicos(parseFloat(e.target.value) || 0)}
									placeholder="10000"
								/>
							</div>
						</div>

						{errores.montos && (
							<p className="text-sm text-red-600 mt-2">{errores.montos}</p>
						)}

						<div className="flex justify-end gap-2 mt-4">
							<Button
								variant="outline"
								onClick={() => {
									setNivelEditando(null);
									setErrores({});
								}}
							>
								Cancelar
							</Button>
							<Button onClick={guardarNivel}>Guardar Nivel</Button>
						</div>
					</div>
				) : (
					<Button variant="outline" onClick={crearNuevoNivel} className="mb-6">
						<Plus className="mr-2 h-4 w-4" />
						Agregar Nivel de AP
					</Button>
				)}

				{nivelesAP.length === 0 && !nivelEditando && (
					<div className="text-center py-8 border-2 border-dashed rounded-lg mb-6">
						<Settings className="h-10 w-10 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-600 mb-1">No hay niveles de AP configurados</p>
						<p className="text-sm text-gray-500">
							Puede continuar sin niveles o agregar niveles para cobertura de tripulantes/pasajeros
						</p>
					</div>
				)}

				{/* Navegación */}
				<div className="flex justify-between pt-6 border-t">
					<Button variant="outline" onClick={onAnterior}>
						<ChevronLeft className="mr-2 h-5 w-5" />
						Anterior
					</Button>

					<Button onClick={continuarAPrincipal}>
						Continuar con {tipoLabelPlural}
						<ChevronRight className="ml-2 h-5 w-5" />
					</Button>
				</div>
			</div>
		);
	}

	// ===== RENDER PASO 3: PRINCIPAL =====
	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: {tipoLabelPlural} Aseguradas
					</h2>
					<p className="text-sm text-gray-600 mt-1">
						Agregue las {tipoLabelPlural.toLowerCase()} y asegurados adicionales
					</p>
				</div>

				{tieneNaves && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{naves.length} {naves.length === 1 ? tipoLabel.toLowerCase() : tipoLabelPlural.toLowerCase()}
						</span>
					</div>
				)}
			</div>

			{/* Botón para volver a niveles AP */}
			<div className="mb-4">
				<Button variant="ghost" size="sm" onClick={volverANiveles} className="text-gray-600">
					<Settings className="mr-2 h-4 w-4" />
					Configurar Niveles AP ({nivelesAP.length} configurados)
				</Button>
			</div>

			{/* Tipo de Póliza */}
			<div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
				<Label htmlFor="tipo-poliza" className="block text-sm font-medium text-gray-700 mb-2">
					Tipo de Póliza
				</Label>
				<Select value={tipoPoliza} onValueChange={handleTipoPolizaChange}>
					<SelectTrigger id="tipo-poliza" className="w-full max-w-xs bg-white">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="individual">Individual</SelectItem>
						<SelectItem value="corporativo">Corporativo</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Sección de Naves */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-medium text-gray-900">{tipoLabelPlural}</h3>
					<Button onClick={handleAgregarNave}>
						<Plus className="mr-2 h-4 w-4" />
						Agregar {tipoLabel}
					</Button>
				</div>

				{errores.general && (
					<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
						{errores.general}
					</div>
				)}

				{naves.length === 0 ? (
					<div className="text-center py-12 border-2 border-dashed rounded-lg">
						<IconoNave className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600 mb-2">No hay {tipoLabelPlural.toLowerCase()} agregadas</p>
						<p className="text-sm text-gray-500">
							Agregue al menos una {tipoLabel.toLowerCase()} para continuar
						</p>
					</div>
				) : (
					<div className="overflow-x-auto border rounded-lg">
						<table className="w-full">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
										Matrícula
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
										Marca/Modelo
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
										Año
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
										Uso
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
										Pasajeros
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
										Valor Casco
									</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
										Valor RC
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
										Nivel AP
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
										Acciones
									</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{naves.map((nave, index) => (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-medium text-gray-900">{nave.matricula}</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											{nave.marca} {nave.modelo}
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">{nave.ano}</td>
										<td className="px-4 py-3 text-center">
											<span
												className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
													nave.uso === "publico"
														? "bg-blue-100 text-blue-800"
														: nave.uso === "recreacion"
														? "bg-purple-100 text-purple-800"
														: "bg-green-100 text-green-800"
												}`}
											>
												{nave.uso === "publico"
													? "Público"
													: nave.uso === "recreacion"
													? "Recreación"
													: "Privado"}
											</span>
										</td>
										<td className="px-4 py-3 text-center text-sm text-gray-600">
											{nave.nro_pasajeros} / {nave.nro_tripulantes}
										</td>
										<td className="px-4 py-3 text-right text-sm text-gray-900">
											{nave.valor_casco.toLocaleString("es-BO", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-3 text-right text-sm text-gray-900">
											{nave.valor_responsabilidad_civil.toLocaleString("es-BO", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-3 text-center text-sm">
											<span
												className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
													nave.nivel_ap_id
														? "bg-indigo-100 text-indigo-800"
														: "bg-gray-100 text-gray-600"
												}`}
											>
												{obtenerNombreNivelAP(nave.nivel_ap_id)}
											</span>
										</td>
										<td className="px-4 py-3 text-center">
											<div className="flex items-center justify-center gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleEditarNave(nave, index)}
												>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleEliminarNave(index)}
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
			</div>

			{/* Sección de Asegurados Adicionales */}
			<div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
							<Users className="h-5 w-5" />
							Asegurados Adicionales
						</h3>
						<p className="text-sm text-gray-500">
							Opcional: agregue otros asegurados además del titular
						</p>
					</div>
					<Button variant="outline" onClick={() => setMostrarBuscadorCliente(true)}>
						<UserPlus className="mr-2 h-4 w-4" />
						Agregar Asegurado
					</Button>
				</div>

				{aseguradosAdicionales.length === 0 ? (
					<div className="text-center py-6 border-2 border-dashed rounded-lg bg-white">
						<Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
						<p className="text-sm text-gray-500">No hay asegurados adicionales</p>
					</div>
				) : (
					<div className="space-y-2">
						{aseguradosAdicionales.map((asegurado) => (
							<div
								key={asegurado.client_id}
								className="flex items-center justify-between p-3 bg-white rounded-lg border"
							>
								<div>
									<p className="font-medium text-gray-900">{asegurado.client_name}</p>
									<p className="text-sm text-gray-500">CI: {asegurado.client_ci}</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleEliminarAsegurado(asegurado.client_id)}
									className="text-red-600 hover:text-red-700 hover:bg-red-50"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Navegación */}
			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<Button onClick={handleContinuar} disabled={naves.length === 0}>
					Continuar con Modalidad de Pago
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>

			{/* Modal para agregar/editar nave */}
			{modalNaveAbierto && (
				<NaveModal
					nave={naveEditando}
					nivelesAP={nivelesAP}
					tipoNave={tipoNave}
					onGuardar={handleGuardarNave}
					onCancelar={() => {
						setModalNaveAbierto(false);
						setNaveEditando(null);
						setIndexNaveEditando(null);
					}}
				/>
			)}

			{/* Buscador de clientes para asegurados adicionales */}
			{mostrarBuscadorCliente && (
				<BuscadorClientes
					onSeleccionar={handleAgregarAsegurado}
					onCancelar={() => setMostrarBuscadorCliente(false)}
					clientesExcluidos={aseguradosAdicionales.map((a) => a.client_id)}
				/>
			)}
		</div>
	);
}
