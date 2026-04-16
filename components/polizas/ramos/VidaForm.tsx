"use client";

import { useState } from "react";
import {
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Plus,
	Trash2,
	Users,
	AlertTriangle,
	Settings,
	UserPlus,
	Edit,
} from "lucide-react";
import type {
	DatosVida,
	AseguradoConNivel,
	NivelCobertura,
	CoberturasVida,
	BeneficiarioSalud,
	AseguradoSeleccionado,
} from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BuscadorClientes } from "../BuscadorClientes";
import { BeneficiarioModal } from "./BeneficiarioModal";

type Props = {
	datos: DatosVida | null;
	regionales: Array<{ id: string; nombre: string }>;
	aseguradoPrincipal?: AseguradoSeleccionado | null;
	onChange: (datos: DatosVida) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Sub-paso interno: 2.1 o 3
type SubPaso = "niveles" | "principal";

export function VidaForm({ datos, regionales, aseguradoPrincipal, onChange, onSiguiente, onAnterior }: Props) {
	// Estado del sub-paso actual
	const [subPaso, setSubPaso] = useState<SubPaso>(
		datos?.niveles && datos.niveles.length > 0 ? "principal" : "niveles",
	);

	// ===== PASO 2.1: NIVELES DE COBERTURA =====
	const [niveles, setNiveles] = useState<NivelCobertura[]>(datos?.niveles || []);
	const [nivelEditando, setNivelEditando] = useState<NivelCobertura | null>(null);
	const [coberturas, setCoberturas] = useState<CoberturasVida>({
		muerte: { habilitado: false, valor: 0 },
		dima: { habilitado: false, valor: 0 },
		sepelio: { habilitado: false, valor: 0 },
		gastos_medicos: { habilitado: false, valor: 0 },
		indm_enfermedades_graves: { habilitado: false, valor: 0 },
	});

	// ===== PASO 3: FORMULARIO PRINCIPAL =====
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(datos?.tipo_poliza || "individual");
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [asegurados, setAsegurados] = useState<AseguradoConNivel[]>(datos?.asegurados || []);
	const [beneficiarios, setBeneficiarios] = useState<BeneficiarioSalud[]>(datos?.beneficiarios || []);
	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [mostrarModalBeneficiario, setMostrarModalBeneficiario] = useState(false);
	const [beneficiarioEditando, setBeneficiarioEditando] = useState<BeneficiarioSalud | null>(null);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// ===== FUNCIONES PASO 2.1: NIVELES =====
	const crearNuevoNivel = () => {
		const numeroNivel = niveles.length + 1;
		setNivelEditando({
			id: crypto.randomUUID(),
			nombre: `Nivel ${numeroNivel}`,
			coberturas: {
				muerte: { habilitado: false, valor: 0 },
				dima: { habilitado: false, valor: 0 },
				sepelio: { habilitado: false, valor: 0 },
				gastos_medicos: { habilitado: false, valor: 0 },
				indm_enfermedades_graves: { habilitado: false, valor: 0 },
			} as CoberturasVida,
		});
		setCoberturas({
			muerte: { habilitado: false, valor: 0 },
			dima: { habilitado: false, valor: 0 },
			sepelio: { habilitado: false, valor: 0 },
			gastos_medicos: { habilitado: false, valor: 0 },
			indm_enfermedades_graves: { habilitado: false, valor: 0 },
		});
	};

	const guardarNivel = () => {
		if (!nivelEditando) return;

		const nuevosErrores: Record<string, string> = {};

		// Validar que al menos una cobertura esté habilitada
		const algunaHabilitada = Object.values(coberturas).some((c) => c.habilitado);
		if (!algunaHabilitada) {
			nuevosErrores.general = "Debe habilitar al menos una cobertura";
		}

		// Validar que coberturas habilitadas tengan valor > 0
		Object.entries(coberturas).forEach(([key, cobertura]) => {
			if (cobertura.habilitado && cobertura.valor <= 0) {
				nuevosErrores[key] = "El valor debe ser mayor a 0";
			}
		});

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		// Actualizar coberturas del nivel
		const nivelActualizado: NivelCobertura = {
			...nivelEditando,
			coberturas: coberturas as CoberturasVida,
		};

		// Agregar o actualizar nivel
		const index = niveles.findIndex((n) => n.id === nivelEditando.id);
		if (index >= 0) {
			// Actualizar existente
			const nuevosNiveles = [...niveles];
			nuevosNiveles[index] = nivelActualizado;
			setNiveles(nuevosNiveles);
		} else {
			// Agregar nuevo
			setNiveles([...niveles, nivelActualizado]);
		}

		setNivelEditando(null);
		setCoberturas({
			muerte: { habilitado: false, valor: 0 },
			dima: { habilitado: false, valor: 0 },
			sepelio: { habilitado: false, valor: 0 },
			gastos_medicos: { habilitado: false, valor: 0 },
			indm_enfermedades_graves: { habilitado: false, valor: 0 },
		});
		setErrores({});
	};

	const editarNivel = (nivel: NivelCobertura) => {
		setNivelEditando(nivel);
		const coberturasNivel = nivel.coberturas as CoberturasVida;
		setCoberturas(coberturasNivel);
	};

	const eliminarNivel = (id: string) => {
		if (confirm("¿Está seguro de eliminar este nivel?")) {
			setNiveles(niveles.filter((n) => n.id !== id));
		}
	};

	const continuarAPrincipal = () => {
		if (niveles.length === 0) {
			setErrores({ general: "Debe crear al menos un nivel de cobertura" });
			return;
		}

		setErrores({});
		setSubPaso("principal");
	};

	// ===== FUNCIONES PASO 3: PRINCIPAL =====
	const agregarAsegurado = (cliente: { id: string; nombre: string; ci: string }) => {
		// Verificar que no esté duplicado
		if (asegurados.some((a) => a.client_id === cliente.id)) {
			alert("Este cliente ya fue agregado");
			return;
		}

		// Agregar con el primer nivel y rol titular por defecto
		setAsegurados([
			...asegurados,
			{
				client_id: cliente.id,
				client_name: cliente.nombre,
				client_ci: cliente.ci,
				nivel_id: niveles[0]?.id || "",
				rol: "titular",
			},
		]);
		setMostrarBuscador(false);
	};

	const cambiarNivel = (clientId: string, nivelId: string) => {
		setAsegurados(asegurados.map((a) => (a.client_id === clientId ? { ...a, nivel_id: nivelId } : a)));
	};

	const cambiarRol = (clientId: string, rol: "contratante" | "titular" | "conyugue" | "dependiente") => {
		setAsegurados(asegurados.map((a) => (a.client_id === clientId ? { ...a, rol } : a)));
	};

	const eliminarAsegurado = (clientId: string) => {
		setAsegurados(asegurados.filter((a) => a.client_id !== clientId));
	};

	// ===== FUNCIONES BENEFICIARIOS =====
	const abrirModalBeneficiario = () => {
		setBeneficiarioEditando(null);
		setMostrarModalBeneficiario(true);
	};

	const abrirModalEditarBeneficiario = (beneficiario: BeneficiarioSalud) => {
		setBeneficiarioEditando(beneficiario);
		setMostrarModalBeneficiario(true);
	};

	const guardarBeneficiario = (beneficiario: BeneficiarioSalud) => {
		if (beneficiarioEditando) {
			setBeneficiarios(beneficiarios.map((b) => (b.id === beneficiarioEditando.id ? beneficiario : b)));
		} else {
			setBeneficiarios([...beneficiarios, beneficiario]);
		}
		setMostrarModalBeneficiario(false);
		setBeneficiarioEditando(null);
	};

	const eliminarBeneficiario = (id: string) => {
		if (confirm("¿Está seguro de eliminar este beneficiario?")) {
			setBeneficiarios(beneficiarios.filter((b) => b.id !== id));
		}
	};

	const cambiarNivelBeneficiario = (beneficiarioId: string, nivelId: string) => {
		setBeneficiarios(beneficiarios.map((b) => (b.id === beneficiarioId ? { ...b, nivel_id: nivelId } : b)));
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (!regionalId) {
			nuevosErrores.regional = "Debe seleccionar una regional";
		}

		// Validar que haya al menos un asegurado
		if (asegurados.length === 0) {
			nuevosErrores.asegurados = "Debe agregar al menos un asegurado";
		}

		// Validar que todos los asegurados tengan un nivel y rol asignado
		const aseguradosSinNivel = asegurados.filter((a) => !a.nivel_id);
		if (aseguradosSinNivel.length > 0) {
			nuevosErrores.asegurados = "Todos los asegurados deben tener un nivel asignado";
		}

		const aseguradosSinRol = asegurados.filter((a) => !a.rol);
		if (aseguradosSinRol.length > 0) {
			nuevosErrores.asegurados = "Todos los asegurados deben tener un rol asignado";
		}

		// Validar que todos los asegurados datos mínimos tengan un nivel y rol asignado
		const beneficiariosSinNivel = beneficiarios.filter((b) => !b.nivel_id);
		if (beneficiariosSinNivel.length > 0) {
			nuevosErrores.beneficiarios = "Todos los asegurados datos mínimos deben tener un nivel asignado";
		}

		const beneficiariosSinRol = beneficiarios.filter((b) => !b.rol);
		if (beneficiariosSinRol.length > 0) {
			nuevosErrores.beneficiarios =
				"Todos los asegurados datos mínimos deben tener un rol asignado (Cónyuge o Dependiente)";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		// Guardar datos
		const datosVida: DatosVida = {
			niveles,
			tipo_poliza: tipoPoliza,
			regional_asegurado_id: regionalId,
			asegurados,
			beneficiarios,
		};

		onChange(datosVida);
		onSiguiente();
	};

	const volverANiveles = () => {
		setSubPaso("niveles");
	};

	// ===== RENDERIZADO =====
	const esCompleto = datos !== null;

	// SUB-PASO 2.1: CONFIGURACIÓN DE NIVELES
	if (subPaso === "niveles") {
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-xl font-semibold text-gray-900">
							Paso 2.1: Configurar Niveles de Cobertura (Vida)
						</h2>
						<p className="text-sm text-gray-600 mt-1">
							Defina los niveles de cobertura para las pólizas de vida
						</p>
					</div>

					{niveles.length > 0 && (
						<div className="flex items-center gap-2 text-green-600">
							<CheckCircle2 className="h-5 w-5" />
							<span className="text-sm font-medium">{niveles.length} nivel(es) creado(s)</span>
						</div>
					)}
				</div>

				{/* Lista de niveles creados */}
				{niveles.length > 0 && (
					<div className="mb-6">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Niveles creados:</h3>
						<div className="space-y-2">
							{niveles.map((nivel) => {
								const cob = nivel.coberturas as CoberturasVida;
								return (
									<div
										key={nivel.id}
										className="flex items-center justify-between p-4 border rounded-lg"
									>
										<div className="flex-1">
											<p className="font-medium text-gray-900">{nivel.nombre}</p>
											<div className="text-sm text-gray-600 space-y-1">
												{cob.muerte.habilitado && (
													<p>• Muerte: Bs {cob.muerte.valor.toLocaleString()}</p>
												)}
												{cob.dima.habilitado && (
													<p>• DIMA: Bs {cob.dima.valor.toLocaleString()}</p>
												)}
												{cob.sepelio.habilitado && (
													<p>• Sepelio: Bs {cob.sepelio.valor.toLocaleString()}</p>
												)}
												{cob.gastos_medicos.habilitado && (
													<p>
														• Gastos Médicos: Bs {cob.gastos_medicos.valor.toLocaleString()}
													</p>
												)}
												{cob.indm_enfermedades_graves.habilitado && (
													<p>
														• INDM Enf. Graves: Bs{" "}
														{cob.indm_enfermedades_graves.valor.toLocaleString()}
													</p>
												)}
											</div>
										</div>
										<div className="flex gap-2">
											<Button variant="outline" size="sm" onClick={() => editarNivel(nivel)}>
												Editar
											</Button>
											<Button variant="ghost" size="sm" onClick={() => eliminarNivel(nivel.id)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Formulario de nivel (crear/editar) */}
				{nivelEditando && (
					<div className="mb-6 p-6 border-2 border-primary rounded-lg bg-blue-50">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							{niveles.some((n) => n.id === nivelEditando.id) ? "Editar" : "Crear"} Nivel
						</h3>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="nombre_nivel">Nombre del nivel</Label>
								<Input
									id="nombre_nivel"
									value={nivelEditando.nombre}
									onChange={(e) => setNivelEditando({ ...nivelEditando, nombre: e.target.value })}
									placeholder="Ej: Nivel 1, Nivel Premium, etc."
								/>
							</div>

							<div className="space-y-4 pt-4 border-t">
								<h4 className="font-medium text-gray-900">Coberturas:</h4>

								{/* MUERTE */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_muerte"
											checked={coberturas.muerte.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({
													...coberturas,
													muerte: { ...coberturas.muerte, habilitado: checked === true },
												})
											}
										/>
										<Label htmlFor="cob_muerte" className="cursor-pointer">
											MUERTE (por cualquier causa)
										</Label>
									</div>
									{coberturas.muerte.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder="Valor asegurado"
												value={coberturas.muerte.valor || ""}
												onChange={(e) =>
													setCoberturas({
														...coberturas,
														muerte: {
															...coberturas.muerte,
															valor: parseFloat(e.target.value) || 0,
														},
													})
												}
												className={errores.muerte ? "border-red-500" : ""}
											/>
											{errores.muerte && (
												<p className="text-sm text-red-600 mt-1">{errores.muerte}</p>
											)}
										</div>
									)}
								</div>

								{/* DIMA */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_dima"
											checked={coberturas.dima.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({
													...coberturas,
													dima: { ...coberturas.dima, habilitado: checked === true },
												})
											}
										/>
										<Label htmlFor="cob_dima" className="cursor-pointer">
											DIMA
										</Label>
									</div>
									{coberturas.dima.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder="Valor asegurado"
												value={coberturas.dima.valor || ""}
												onChange={(e) =>
													setCoberturas({
														...coberturas,
														dima: {
															...coberturas.dima,
															valor: parseFloat(e.target.value) || 0,
														},
													})
												}
												className={errores.dima ? "border-red-500" : ""}
											/>
											{errores.dima && (
												<p className="text-sm text-red-600 mt-1">{errores.dima}</p>
											)}
										</div>
									)}
								</div>

								{/* SEPELIO */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_sepelio"
											checked={coberturas.sepelio.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({
													...coberturas,
													sepelio: { ...coberturas.sepelio, habilitado: checked === true },
												})
											}
										/>
										<Label htmlFor="cob_sepelio" className="cursor-pointer">
											SEPELIO
										</Label>
									</div>
									{coberturas.sepelio.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder="Valor asegurado"
												value={coberturas.sepelio.valor || ""}
												onChange={(e) =>
													setCoberturas({
														...coberturas,
														sepelio: {
															...coberturas.sepelio,
															valor: parseFloat(e.target.value) || 0,
														},
													})
												}
												className={errores.sepelio ? "border-red-500" : ""}
											/>
											{errores.sepelio && (
												<p className="text-sm text-red-600 mt-1">{errores.sepelio}</p>
											)}
										</div>
									)}
								</div>

								{/* GASTOS MEDICOS */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_gastos_medicos"
											checked={coberturas.gastos_medicos.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({
													...coberturas,
													gastos_medicos: {
														...coberturas.gastos_medicos,
														habilitado: checked === true,
													},
												})
											}
										/>
										<Label htmlFor="cob_gastos_medicos" className="cursor-pointer">
											GASTOS MÉDICOS
										</Label>
									</div>
									{coberturas.gastos_medicos.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder="Valor asegurado"
												value={coberturas.gastos_medicos.valor || ""}
												onChange={(e) =>
													setCoberturas({
														...coberturas,
														gastos_medicos: {
															...coberturas.gastos_medicos,
															valor: parseFloat(e.target.value) || 0,
														},
													})
												}
												className={errores.gastos_medicos ? "border-red-500" : ""}
											/>
											{errores.gastos_medicos && (
												<p className="text-sm text-red-600 mt-1">{errores.gastos_medicos}</p>
											)}
										</div>
									)}
								</div>

								{/* INDM ENFERMEDADES GRAVES */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_indm"
											checked={coberturas.indm_enfermedades_graves.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({
													...coberturas,
													indm_enfermedades_graves: {
														...coberturas.indm_enfermedades_graves,
														habilitado: checked === true,
													},
												})
											}
										/>
										<Label htmlFor="cob_indm" className="cursor-pointer">
											INDM POR ENFERMEDADES GRAVES
										</Label>
									</div>
									{coberturas.indm_enfermedades_graves.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder="Valor asegurado"
												value={coberturas.indm_enfermedades_graves.valor || ""}
												onChange={(e) =>
													setCoberturas({
														...coberturas,
														indm_enfermedades_graves: {
															...coberturas.indm_enfermedades_graves,
															valor: parseFloat(e.target.value) || 0,
														},
													})
												}
												className={errores.indm_enfermedades_graves ? "border-red-500" : ""}
											/>
											{errores.indm_enfermedades_graves && (
												<p className="text-sm text-red-600 mt-1">
													{errores.indm_enfermedades_graves}
												</p>
											)}
										</div>
									)}
								</div>
							</div>

							{errores.general && (
								<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
									<AlertTriangle className="h-4 w-4 text-red-600" />
									<p className="text-sm text-red-600">{errores.general}</p>
								</div>
							)}

							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setNivelEditando(null)}>
									Cancelar
								</Button>
								<Button onClick={guardarNivel}>Guardar Nivel</Button>
							</div>
						</div>
					</div>
				)}

				{/* Botón crear nuevo nivel */}
				{!nivelEditando && (
					<Button onClick={crearNuevoNivel} variant="outline" className="w-full mb-6">
						<Plus className="mr-2 h-4 w-4" />
						Crear Nuevo Nivel
					</Button>
				)}

				{errores.general && !nivelEditando && (
					<div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded">
						<AlertTriangle className="h-4 w-4 text-amber-600" />
						<p className="text-sm text-amber-600">{errores.general}</p>
					</div>
				)}

				{/* Botones de navegación */}
				<div className="flex justify-between pt-6 border-t">
					<Button variant="outline" onClick={onAnterior}>
						<ChevronLeft className="mr-2 h-5 w-5" />
						Anterior
					</Button>

					<Button onClick={continuarAPrincipal} disabled={niveles.length === 0}>
						Continuar al Formulario Principal
						<ChevronRight className="ml-2 h-5 w-5" />
					</Button>
				</div>
			</div>
		);
	}

	// SUB-PASO 3: FORMULARIO PRINCIPAL (igual al de Sepelio, adaptado para Vida)
	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Paso 3: Datos Específicos - Vida</h2>
					<p className="text-sm text-gray-600 mt-1">
						Complete la información de los asegurados y sus niveles de cobertura
					</p>
				</div>

				{esCompleto && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Completado</span>
					</div>
				)}
			</div>

			{/* Botón para volver a editar niveles */}
			<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Settings className="h-5 w-5 text-blue-600" />
						<div>
							<p className="text-sm font-medium text-gray-900">
								{niveles.length} nivel(es) de cobertura configurado(s)
							</p>
							<p className="text-xs text-gray-600">{niveles.map((n) => n.nombre).join(", ")}</p>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={volverANiveles}>
						Editar Niveles
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				{/* Tipo de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">
						Tipo de Póliza <span className="text-red-500">*</span>
					</Label>
					<Select
						value={tipoPoliza}
						onValueChange={(value: "individual" | "corporativo") => setTipoPoliza(value)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="individual">Individual</SelectItem>
							<SelectItem value="corporativo">Corporativo</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Regional */}
				<div className="space-y-2">
					<Label htmlFor="regional">
						Regional Asegurado <span className="text-red-500">*</span>
					</Label>
					<Select value={regionalId} onValueChange={setRegionalId}>
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

				{/* Nota sobre pago */}
				<div className="md:col-span-2">
					<p className="text-xs text-gray-500">Pólizas de Vida solo permiten pago en contado (pago único)</p>
				</div>
			</div>

			{/* Asegurados (clientes registrados) */}
			<div className="space-y-4 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base">Asegurados</Label>
						<p className="text-sm text-gray-600 mt-1">
							Clientes registrados en el sistema asegurados en esta póliza
						</p>
					</div>
					<Button onClick={() => setMostrarBuscador(true)} disabled={mostrarBuscador}>
						<Plus className="mr-2 h-4 w-4" />
						Agregar Cliente
					</Button>
				</div>

				{errores.asegurados && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
						<AlertTriangle className="h-4 w-4 text-red-600" />
						<p className="text-sm text-red-600">{errores.asegurados}</p>
					</div>
				)}

				{/* Sugerencia: agregar asegurado principal de la póliza */}
				{aseguradoPrincipal && !asegurados.some((a) => a.client_id === aseguradoPrincipal.id) && (
					<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Users className="h-4 w-4 text-blue-600" />
							<span className="text-sm text-blue-900">
								<strong>{aseguradoPrincipal.nombre_completo}</strong> ({aseguradoPrincipal.documento}) —
								Asegurado de la póliza
							</span>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={() =>
								agregarAsegurado({
									id: aseguradoPrincipal.id,
									nombre: aseguradoPrincipal.nombre_completo,
									ci: aseguradoPrincipal.documento,
								})
							}
						>
							<Plus className="mr-1 h-3 w-3" />
							Agregar
						</Button>
					</div>
				)}

				{/* Buscador de clientes */}
				{mostrarBuscador && (
					<div className="p-4 border-2 border-primary rounded-lg bg-blue-50">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-gray-900">Buscar Cliente</h3>
						</div>
						<BuscadorClientes
							onSeleccionar={agregarAsegurado}
							onCancelar={() => setMostrarBuscador(false)}
						/>
					</div>
				)}

				{/* Lista de asegurados */}
				{asegurados.length > 0 ? (
					<div className="space-y-3">
						{asegurados.map((asegurado) => (
							<div key={asegurado.client_id} className="p-4 border rounded-lg">
								<div className="flex items-start gap-4">
									<Users className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
									<div className="flex-1 space-y-3">
										<div>
											<p className="font-medium text-gray-900">{asegurado.client_name}</p>
											<p className="text-sm text-gray-600">CI: {asegurado.client_ci}</p>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div className="space-y-1">
												<Label className="text-xs text-gray-600">Nivel de Cobertura</Label>
												<Select
													value={asegurado.nivel_id}
													onValueChange={(value) => cambiarNivel(asegurado.client_id, value)}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Nivel" />
													</SelectTrigger>
													<SelectContent>
														{niveles.map((nivel) => (
															<SelectItem key={nivel.id} value={nivel.id}>
																{nivel.nombre}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-1">
												<Label className="text-xs text-gray-600">
													Rol <span className="text-red-500">*</span>
												</Label>
												<Select
													value={asegurado.rol || ""}
													onValueChange={(value) =>
														cambiarRol(
															asegurado.client_id,
															value as
																| "contratante"
																| "titular"
																| "conyugue"
																| "dependiente",
														)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Seleccione un rol" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="titular">Titular</SelectItem>
														<SelectItem value="contratante">Contratante</SelectItem>
														<SelectItem value="conyugue">Cónyuge</SelectItem>
														<SelectItem value="dependiente">Dependiente</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => eliminarAsegurado(asegurado.client_id)}
										className="mt-1"
									>
										<Trash2 className="h-4 w-4 text-red-600" />
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8 border-2 border-dashed rounded-lg">
						<Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-600">No hay clientes agregados</p>
						<p className="text-sm text-gray-500">
							Haga clic en &ldquo;Agregar Cliente&rdquo; para comenzar
						</p>
					</div>
				)}
			</div>

			{/* Asegurados Datos Mínimos (sin registro completo) */}
			<div className="space-y-4 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base">Asegurados Datos Mínimos</Label>
						<p className="text-sm text-gray-600 mt-1">
							Personas cubiertas sin registro completo en el sistema
						</p>
					</div>
					<Button onClick={abrirModalBeneficiario} disabled={mostrarModalBeneficiario}>
						<UserPlus className="mr-2 h-4 w-4" />
						Agregar Asegurado
					</Button>
				</div>

				{errores.beneficiarios && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
						<AlertTriangle className="h-4 w-4 text-red-600" />
						<p className="text-sm text-red-600">{errores.beneficiarios}</p>
					</div>
				)}

				{/* Lista de beneficiarios */}
				{beneficiarios.length > 0 ? (
					<div className="space-y-3">
						{beneficiarios.map((beneficiario) => (
							<div key={beneficiario.id} className="p-4 border rounded-lg bg-gray-50">
								<div className="flex items-start gap-4">
									<UserPlus className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
									<div className="flex-1 space-y-3">
										<div className="flex items-start justify-between">
											<div>
												<div className="flex items-center gap-2">
													<p className="font-medium text-gray-900">
														{beneficiario.nombre_completo}
													</p>
													{beneficiario.rol && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
															{beneficiario.rol === "dependiente"
																? "Dependiente"
																: beneficiario.rol === "conyugue"
																	? "Cónyuge"
																	: beneficiario.rol}
														</span>
													)}
												</div>
												<div className="text-sm text-gray-600 space-y-0.5 mt-1">
													<p>CI: {beneficiario.carnet}</p>
													{beneficiario.fecha_nacimiento && (
														<p>
															Fecha Nac:{" "}
															{new Date(beneficiario.fecha_nacimiento).toLocaleDateString(
																"es-BO",
															)}
														</p>
													)}
													{beneficiario.genero && (
														<p>
															Género:{" "}
															{beneficiario.genero === "M"
																? "Masculino"
																: beneficiario.genero === "F"
																	? "Femenino"
																	: "Otro"}
														</p>
													)}
												</div>
											</div>
											<div className="flex gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => abrirModalEditarBeneficiario(beneficiario)}
												>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => eliminarBeneficiario(beneficiario.id)}
												>
													<Trash2 className="h-4 w-4 text-red-600" />
												</Button>
											</div>
										</div>
										<div className="space-y-1">
											<Label className="text-xs text-gray-600">Nivel de Cobertura</Label>
											<Select
												value={beneficiario.nivel_id}
												onValueChange={(value) =>
													cambiarNivelBeneficiario(beneficiario.id, value)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Nivel" />
												</SelectTrigger>
												<SelectContent>
													{niveles.map((nivel) => (
														<SelectItem key={nivel.id} value={nivel.id}>
															{nivel.nombre}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8 border-2 border-dashed rounded-lg">
						<UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-600">No hay asegurados datos mínimos agregados</p>
						<p className="text-sm text-gray-500">
							Haga clic en &ldquo;Agregar Asegurado&rdquo; para agregar
						</p>
					</div>
				)}
			</div>

			{/* Información sobre roles */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
				<p className="text-sm text-blue-900 font-medium mb-2">Información sobre roles:</p>
				<div className="text-xs text-blue-800 space-y-2">
					<div>
						<p className="font-semibold mb-1">Asegurados (clientes registrados):</p>
						<ul className="space-y-1 ml-3">
							<li>
								• <strong>Titular:</strong> Asegurado principal de la póliza
							</li>
							<li>
								• <strong>Contratante:</strong> Cliente que contrata el seguro
							</li>
							<li>
								• <strong>Cónyuge:</strong> Pareja o cónyuge del titular
							</li>
							<li>
								• <strong>Dependiente:</strong> Hijo u otro dependiente del titular
							</li>
						</ul>
					</div>
					<div>
						<p className="font-semibold mb-1">Asegurados Datos Mínimos (sin registro completo):</p>
						<ul className="space-y-1 ml-3">
							<li>
								• <strong>Cónyuge:</strong> Pareja o cónyuge del asegurado
							</li>
							<li>
								• <strong>Dependiente:</strong> Hijo u otro dependiente
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={volverANiveles}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Volver a Niveles
				</Button>

				<Button onClick={handleContinuar}>
					Continuar
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>

			{/* Modal de Beneficiario */}
			{mostrarModalBeneficiario && (
				<BeneficiarioModal
					beneficiario={beneficiarioEditando}
					niveles={niveles}
					onGuardar={guardarBeneficiario}
					onCancelar={() => {
						setMostrarModalBeneficiario(false);
						setBeneficiarioEditando(null);
					}}
				/>
			)}
		</div>
	);
}
