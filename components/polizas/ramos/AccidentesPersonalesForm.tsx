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
	UserCheck,
} from "lucide-react";
import type {
	DatosAccidentesPersonales,
	ContratanteAPVida,
	AseguradoAPVida,
	NivelCobertura,
	CoberturasAccidentesPersonales,
	AseguradoSeleccionado,
} from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BuscadorClientes } from "../BuscadorClientes";
import { BeneficiarioModal, type DatosPersonaMinima } from "./BeneficiarioModal";

type Props = {
	datos: DatosAccidentesPersonales | null;
	moneda?: string;
	regionales: Array<{ id: string; nombre: string }>;
	aseguradoPrincipal?: AseguradoSeleccionado | null;
	onChange: (datos: DatosAccidentesPersonales) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

type SubPaso = "niveles" | "principal";

export function AccidentesPersonalesForm({
	datos,
	moneda = "Bs",
	regionales,
	aseguradoPrincipal,
	onChange,
	onSiguiente,
	onAnterior,
}: Props) {
	const [subPaso, setSubPaso] = useState<SubPaso>(
		datos?.niveles && datos.niveles.length > 0 ? "principal" : "niveles",
	);

	// ===== PASO 2.1: NIVELES =====
	const [niveles, setNiveles] = useState<NivelCobertura[]>(datos?.niveles || []);
	const [nivelEditando, setNivelEditando] = useState<NivelCobertura | null>(null);
	const [coberturas, setCoberturas] = useState<CoberturasAccidentesPersonales>({
		muerte_accidental: { habilitado: false, valor: 0 },
		invalidez_total_parcial: { habilitado: false, valor: 0 },
		gastos_medicos: { habilitado: false, valor: 0 },
		sepelio: { habilitado: false, valor: 0 },
	});

	// ===== PASO 3: PRINCIPAL =====
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(datos?.tipo_poliza || "individual");
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [contratante, setContratante] = useState<ContratanteAPVida | null>(datos?.contratante ?? null);
	const [asegurados, setAsegurados] = useState<AseguradoAPVida[]>(datos?.asegurados || []);
	const [mostrarBuscadorContratante, setMostrarBuscadorContratante] = useState(false);
	const [mostrarModalAsegurado, setMostrarModalAsegurado] = useState(false);
	const [aseguradoEditando, setAseguradoEditando] = useState<AseguradoAPVida | null>(null);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// ===== FUNCIONES NIVELES =====
	const crearNuevoNivel = () => {
		const numeroNivel = niveles.length + 1;
		setNivelEditando({
			id: crypto.randomUUID(),
			nombre: `Nivel ${numeroNivel}`,
			coberturas: {
				muerte_accidental: { habilitado: false, valor: 0 },
				invalidez_total_parcial: { habilitado: false, valor: 0 },
				gastos_medicos: { habilitado: false, valor: 0 },
				sepelio: { habilitado: false, valor: 0 },
			} as CoberturasAccidentesPersonales,
		});
		setCoberturas({
			muerte_accidental: { habilitado: false, valor: 0 },
			invalidez_total_parcial: { habilitado: false, valor: 0 },
			gastos_medicos: { habilitado: false, valor: 0 },
			sepelio: { habilitado: false, valor: 0 },
		});
	};

	const guardarNivel = () => {
		if (!nivelEditando) return;
		const nuevosErrores: Record<string, string> = {};
		const algunaHabilitada = Object.values(coberturas).some((c) => c.habilitado);
		if (!algunaHabilitada) nuevosErrores.general = "Debe habilitar al menos una cobertura";
		Object.entries(coberturas).forEach(([key, cobertura]) => {
			if (cobertura.habilitado && cobertura.valor <= 0) nuevosErrores[key] = "El valor debe ser mayor a 0";
		});
		if (Object.keys(nuevosErrores).length > 0) { setErrores(nuevosErrores); return; }

		const nivelActualizado: NivelCobertura = { ...nivelEditando, coberturas: coberturas as CoberturasAccidentesPersonales };
		const index = niveles.findIndex((n) => n.id === nivelEditando.id);
		if (index >= 0) {
			const n = [...niveles]; n[index] = nivelActualizado; setNiveles(n);
		} else {
			setNiveles([...niveles, nivelActualizado]);
		}
		setNivelEditando(null);
		setCoberturas({ muerte_accidental: { habilitado: false, valor: 0 }, invalidez_total_parcial: { habilitado: false, valor: 0 }, gastos_medicos: { habilitado: false, valor: 0 }, sepelio: { habilitado: false, valor: 0 } });
		setErrores({});
	};

	const editarNivel = (nivel: NivelCobertura) => {
		setNivelEditando(nivel);
		setCoberturas(nivel.coberturas as CoberturasAccidentesPersonales);
	};

	const eliminarNivel = (id: string) => {
		if (confirm("¿Está seguro de eliminar este nivel?")) setNiveles(niveles.filter((n) => n.id !== id));
	};

	const continuarAPrincipal = () => {
		if (niveles.length === 0) { setErrores({ general: "Debe crear al menos un nivel de cobertura" }); return; }
		setErrores({});
		setSubPaso("principal");
	};

	// ===== FUNCIONES CONTRATANTE =====
	const seleccionarContratante = (cliente: { id: string; nombre: string; ci: string }) => {
		setContratante({
			client_id: cliente.id,
			client_name: cliente.nombre,
			client_ci: cliente.ci,
			nivel_id: niveles[0]?.id || "",
			rol: "contratante-asegurado",
		});
		setMostrarBuscadorContratante(false);
	};

	const eliminarContratante = () => setContratante(null);

	// ===== FUNCIONES ASEGURADOS =====
	const abrirModalAsegurado = () => { setAseguradoEditando(null); setMostrarModalAsegurado(true); };
	const editarAsegurado = (a: AseguradoAPVida) => { setAseguradoEditando(a); setMostrarModalAsegurado(true); };

	const guardarAsegurado = (datos: DatosPersonaMinima) => {
		const nuevo: AseguradoAPVida = {
			id: datos.id,
			nombre_completo: datos.nombre_completo,
			carnet: datos.carnet,
			fecha_nacimiento: datos.fecha_nacimiento,
			genero: datos.genero,
			nivel_id: datos.nivel_id,
		};
		if (aseguradoEditando) {
			setAsegurados(asegurados.map((a) => (a.id === aseguradoEditando.id ? nuevo : a)));
		} else {
			setAsegurados([...asegurados, nuevo]);
		}
		setMostrarModalAsegurado(false);
		setAseguradoEditando(null);
	};

	const eliminarAsegurado = (id: string) => {
		if (confirm("¿Eliminar este asegurado?")) setAsegurados(asegurados.filter((a) => a.id !== id));
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};
		if (!regionalId) nuevosErrores.regional = "Debe seleccionar una regional";
		if (!contratante) {
			nuevosErrores.contratante = "Debe seleccionar un contratante";
		} else {
			if (!contratante.nivel_id) nuevosErrores.contratante = "El contratante debe tener un nivel asignado";
			if (contratante.rol === "contratante" && asegurados.length === 0)
				nuevosErrores.asegurados = "Si el contratante no es asegurado, debe agregar al menos un asegurado";
		}
		const sinNivel = asegurados.filter((a) => !a.nivel_id);
		if (sinNivel.length > 0) nuevosErrores.asegurados = "Todos los asegurados deben tener un nivel asignado";
		if (Object.keys(nuevosErrores).length > 0) { setErrores(nuevosErrores); return; }

		onChange({ niveles, tipo_poliza: tipoPoliza, regional_asegurado_id: regionalId, contratante: contratante!, asegurados });
		onSiguiente();
	};

	const volverANiveles = () => setSubPaso("niveles");
	const esCompleto = datos !== null;

	// ===================== SUB-PASO 2.1: NIVELES =====================
	if (subPaso === "niveles") {
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-xl font-semibold text-gray-900">
							Paso 2.1: Configurar Niveles de Cobertura (Accidentes Personales)
						</h2>
						<p className="text-sm text-gray-600 mt-1">
							Defina los niveles de cobertura para las pólizas de accidentes personales
						</p>
					</div>
					{niveles.length > 0 && (
						<div className="flex items-center gap-2 text-green-600">
							<CheckCircle2 className="h-5 w-5" />
							<span className="text-sm font-medium">{niveles.length} nivel(es) creado(s)</span>
						</div>
					)}
				</div>

				{niveles.length > 0 && (
					<div className="mb-6">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Niveles creados:</h3>
						<div className="space-y-2">
							{niveles.map((nivel) => {
								const cob = nivel.coberturas as CoberturasAccidentesPersonales;
								return (
									<div key={nivel.id} className="flex items-center justify-between p-4 border rounded-lg">
										<div className="flex-1">
											<div className="flex items-center gap-3">
												<p className="font-medium text-gray-900">{nivel.nombre}</p>
												{nivel.prima_nivel && (
													<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
														Prima: {moneda} {nivel.prima_nivel.toLocaleString()}
													</span>
												)}
											</div>
											<div className="text-sm text-gray-600 space-y-1 mt-2">
												{cob.muerte_accidental.habilitado && (
													<p>• Muerte Accidental: Bs {cob.muerte_accidental.valor.toLocaleString()}</p>
												)}
												{cob.invalidez_total_parcial.habilitado && (
													<p>• Invalidez Total/Parcial: Bs {cob.invalidez_total_parcial.valor.toLocaleString()}</p>
												)}
												{cob.gastos_medicos.habilitado && (
													<p>• Gastos Médicos: Bs {cob.gastos_medicos.valor.toLocaleString()}</p>
												)}
												{cob.sepelio.habilitado && (
													<p>• Sepelio: Bs {cob.sepelio.valor.toLocaleString()}</p>
												)}
											</div>
										</div>
										<div className="flex gap-2">
											<Button variant="outline" size="sm" onClick={() => editarNivel(nivel)}>Editar</Button>
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

				{nivelEditando && (
					<div className="mb-6 p-6 border-2 border-primary rounded-lg bg-blue-50">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							{niveles.some((n) => n.id === nivelEditando.id) ? "Editar" : "Crear"} Nivel
						</h3>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="nombre_nivel">Nombre del nivel</Label>
									<Input
										id="nombre_nivel"
										value={nivelEditando.nombre}
										onChange={(e) => setNivelEditando({ ...nivelEditando, nombre: e.target.value })}
										placeholder="Ej: Nivel 1, Nivel Premium, etc."
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="prima_nivel">Prima del Nivel (Opcional)</Label>
									<Input
										id="prima_nivel"
										type="number"
										min="0"
										step="0.01"
										value={nivelEditando.prima_nivel || ""}
										onChange={(e) =>
											setNivelEditando({ ...nivelEditando, prima_nivel: parseFloat(e.target.value) || undefined })
										}
										placeholder="0.00"
									/>
									<p className="text-xs text-gray-500">Prima específica para este nivel</p>
								</div>
							</div>
							<div className="space-y-4 pt-4 border-t">
								<h4 className="font-medium text-gray-900">Coberturas:</h4>
								{/* MUERTE ACCIDENTAL */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_muerte_accidental"
											checked={coberturas.muerte_accidental.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({ ...coberturas, muerte_accidental: { ...coberturas.muerte_accidental, habilitado: checked === true } })
											}
										/>
										<Label htmlFor="cob_muerte_accidental" className="cursor-pointer">MUERTE ACCIDENTAL</Label>
									</div>
									{coberturas.muerte_accidental.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder={`Valor asegurado (${moneda})`}
												value={coberturas.muerte_accidental.valor || ""}
												onChange={(e) => setCoberturas({ ...coberturas, muerte_accidental: { ...coberturas.muerte_accidental, valor: parseFloat(e.target.value) || 0 } })}
												className={errores.muerte_accidental ? "border-red-500" : ""}
											/>
											{errores.muerte_accidental && <p className="text-sm text-red-600 mt-1">{errores.muerte_accidental}</p>}
										</div>
									)}
								</div>
								{/* INVALIDEZ TOTAL/PARCIAL */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_invalidez"
											checked={coberturas.invalidez_total_parcial.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({ ...coberturas, invalidez_total_parcial: { ...coberturas.invalidez_total_parcial, habilitado: checked === true } })
											}
										/>
										<Label htmlFor="cob_invalidez" className="cursor-pointer">INVALIDEZ TOTAL/PARCIAL</Label>
									</div>
									{coberturas.invalidez_total_parcial.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder={`Valor asegurado (${moneda})`}
												value={coberturas.invalidez_total_parcial.valor || ""}
												onChange={(e) => setCoberturas({ ...coberturas, invalidez_total_parcial: { ...coberturas.invalidez_total_parcial, valor: parseFloat(e.target.value) || 0 } })}
												className={errores.invalidez_total_parcial ? "border-red-500" : ""}
											/>
											{errores.invalidez_total_parcial && <p className="text-sm text-red-600 mt-1">{errores.invalidez_total_parcial}</p>}
										</div>
									)}
								</div>
								{/* GASTOS MÉDICOS */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2 min-w-[200px]">
										<Checkbox
											id="cob_gastos_medicos"
											checked={coberturas.gastos_medicos.habilitado}
											onCheckedChange={(checked) =>
												setCoberturas({ ...coberturas, gastos_medicos: { ...coberturas.gastos_medicos, habilitado: checked === true } })
											}
										/>
										<Label htmlFor="cob_gastos_medicos" className="cursor-pointer">GASTOS MÉDICOS</Label>
									</div>
									{coberturas.gastos_medicos.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder={`Valor asegurado (${moneda})`}
												value={coberturas.gastos_medicos.valor || ""}
												onChange={(e) => setCoberturas({ ...coberturas, gastos_medicos: { ...coberturas.gastos_medicos, valor: parseFloat(e.target.value) || 0 } })}
												className={errores.gastos_medicos ? "border-red-500" : ""}
											/>
											{errores.gastos_medicos && <p className="text-sm text-red-600 mt-1">{errores.gastos_medicos}</p>}
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
												setCoberturas({ ...coberturas, sepelio: { ...coberturas.sepelio, habilitado: checked === true } })
											}
										/>
										<Label htmlFor="cob_sepelio" className="cursor-pointer">SEPELIO</Label>
									</div>
									{coberturas.sepelio.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder={`Valor asegurado (${moneda})`}
												value={coberturas.sepelio.valor || ""}
												onChange={(e) => setCoberturas({ ...coberturas, sepelio: { ...coberturas.sepelio, valor: parseFloat(e.target.value) || 0 } })}
												className={errores.sepelio ? "border-red-500" : ""}
											/>
											{errores.sepelio && <p className="text-sm text-red-600 mt-1">{errores.sepelio}</p>}
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
								<Button variant="outline" onClick={() => setNivelEditando(null)}>Cancelar</Button>
								<Button onClick={guardarNivel}>Guardar Nivel</Button>
							</div>
						</div>
					</div>
				)}

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

	// ===================== SUB-PASO 3: FORMULARIO PRINCIPAL =====================
	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Paso 3: Datos Específicos — Accidentes Personales</h2>
					<p className="text-sm text-gray-600 mt-1">Complete la información de contratante y asegurados</p>
				</div>
				{esCompleto && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Completado</span>
					</div>
				)}
			</div>

			{/* Niveles configurados */}
			<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Settings className="h-5 w-5 text-blue-600" />
						<div>
							<p className="text-sm font-medium text-gray-900">{niveles.length} nivel(es) configurado(s)</p>
							<p className="text-xs text-gray-600">{niveles.map((n) => n.nombre).join(", ")}</p>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={volverANiveles}>Editar Niveles</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">Tipo de Póliza <span className="text-red-500">*</span></Label>
					<Select value={tipoPoliza} onValueChange={(value: "individual" | "corporativo") => setTipoPoliza(value)}>
						<SelectTrigger><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="individual">Individual</SelectItem>
							<SelectItem value="corporativo">Corporativo</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="regional">Regional Asegurado <span className="text-red-500">*</span></Label>
					<Select value={regionalId} onValueChange={setRegionalId}>
						<SelectTrigger className={errores.regional ? "border-red-500" : ""}>
							<SelectValue placeholder="Seleccione una regional" />
						</SelectTrigger>
						<SelectContent>
							{regionales.map((r) => (
								<SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.regional && <p className="text-sm text-red-600">{errores.regional}</p>}
				</div>
			</div>

			{/* ── CONTRATANTE ── */}
			<div className="space-y-4 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base">Contratante <span className="text-red-500">*</span></Label>
						<p className="text-sm text-gray-600 mt-1">Cliente registrado que contrata la póliza (requiere datos completos)</p>
					</div>
					{!contratante && (
						<Button onClick={() => setMostrarBuscadorContratante(true)} disabled={mostrarBuscadorContratante}>
							<Plus className="mr-2 h-4 w-4" />
							Seleccionar Contratante
						</Button>
					)}
				</div>

				{errores.contratante && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
						<AlertTriangle className="h-4 w-4 text-red-600" />
						<p className="text-sm text-red-600">{errores.contratante}</p>
					</div>
				)}

				{aseguradoPrincipal && !contratante && (
					<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
						<div className="flex items-center gap-2">
							<UserCheck className="h-4 w-4 text-blue-600" />
							<span className="text-sm text-blue-900">
								<strong>{aseguradoPrincipal.nombre_completo}</strong> ({aseguradoPrincipal.documento}) — Asegurado de la póliza
							</span>
						</div>
						<Button size="sm" variant="outline"
							onClick={() => seleccionarContratante({ id: aseguradoPrincipal.id, nombre: aseguradoPrincipal.nombre_completo, ci: aseguradoPrincipal.documento })}
						>
							<Plus className="mr-1 h-3 w-3" />
							Usar como Contratante
						</Button>
					</div>
				)}

				{mostrarBuscadorContratante && (
					<div className="p-4 border-2 border-primary rounded-lg bg-blue-50">
						<h3 className="font-semibold text-gray-900 mb-4">Buscar Contratante</h3>
						<BuscadorClientes
							onSeleccionar={seleccionarContratante}
							onCancelar={() => setMostrarBuscadorContratante(false)}
						/>
					</div>
				)}

				{contratante && (
					<div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
						<div className="flex items-start gap-4">
							<UserCheck className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
							<div className="flex-1 space-y-3">
								<div>
									<p className="font-medium text-gray-900">{contratante.client_name}</p>
									<p className="text-sm text-gray-600">CI: {contratante.client_ci}</p>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div className="space-y-1">
										<Label className="text-xs text-gray-600">Nivel de Cobertura</Label>
										<Select
											value={contratante.nivel_id}
											onValueChange={(v) => setContratante({ ...contratante, nivel_id: v })}
										>
											<SelectTrigger className="w-full"><SelectValue placeholder="Nivel" /></SelectTrigger>
											<SelectContent>
												{niveles.map((nivel) => (
													<SelectItem key={nivel.id} value={nivel.id}>{nivel.nombre}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1">
										<Label className="text-xs text-gray-600">Rol <span className="text-red-500">*</span></Label>
										<Select
											value={contratante.rol}
											onValueChange={(v) => setContratante({ ...contratante, rol: v as ContratanteAPVida["rol"] })}
										>
											<SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="contratante-asegurado">Contratante-Asegurado</SelectItem>
												<SelectItem value="contratante">Contratante</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-gray-500">
											{contratante.rol === "contratante-asegurado"
												? "Es contratante y también está asegurado"
												: "Solo contrata, no está asegurado — debe agregar asegurados"}
										</p>
									</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="ghost" size="sm" onClick={() => setMostrarBuscadorContratante(true)} title="Cambiar contratante">
									<Edit className="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm" onClick={eliminarContratante}>
									<Trash2 className="h-4 w-4 text-red-600" />
								</Button>
							</div>
						</div>
					</div>
				)}

				{!contratante && !mostrarBuscadorContratante && (
					<div className="text-center py-8 border-2 border-dashed rounded-lg">
						<Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-600">No hay contratante seleccionado</p>
						<p className="text-sm text-gray-500">Haga clic en &ldquo;Seleccionar Contratante&rdquo; para comenzar</p>
					</div>
				)}
			</div>

			{/* ── ASEGURADOS (datos mínimos) ── */}
			<div className="space-y-4 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base">
							Asegurados
							{contratante?.rol === "contratante" && <span className="text-red-500 ml-1">*</span>}
						</Label>
						<p className="text-sm text-gray-600 mt-1">
							Personas aseguradas con datos mínimos (sin registro completo en el sistema)
							{contratante?.rol === "contratante-asegurado" && (
								<span className="text-gray-400"> — el contratante ya está asegurado</span>
							)}
						</p>
					</div>
					<Button onClick={abrirModalAsegurado} disabled={mostrarModalAsegurado}>
						<UserPlus className="mr-2 h-4 w-4" />
						Agregar Asegurado
					</Button>
				</div>

				{errores.asegurados && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
						<AlertTriangle className="h-4 w-4 text-red-600" />
						<p className="text-sm text-red-600">{errores.asegurados}</p>
					</div>
				)}

				{asegurados.length > 0 ? (
					<div className="space-y-3">
						{asegurados.map((asegurado) => (
							<div key={asegurado.id} className="p-4 border rounded-lg bg-gray-50">
								<div className="flex items-start gap-4">
									<UserPlus className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
									<div className="flex-1 space-y-3">
										<div className="flex items-start justify-between">
											<div>
												<div className="flex items-center gap-2">
													<p className="font-medium text-gray-900">{asegurado.nombre_completo}</p>
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Asegurado</span>
												</div>
												<div className="text-sm text-gray-600 space-y-0.5 mt-1">
													<p>CI: {asegurado.carnet}</p>
													{asegurado.fecha_nacimiento && (
														<p>Fecha Nac: {new Date(asegurado.fecha_nacimiento).toLocaleDateString("es-BO")}</p>
													)}
													{asegurado.genero && (
														<p>Género: {asegurado.genero === "M" ? "Masculino" : asegurado.genero === "F" ? "Femenino" : "Otro"}</p>
													)}
												</div>
											</div>
											<div className="flex gap-2">
												<Button variant="ghost" size="sm" onClick={() => editarAsegurado(asegurado)}>
													<Edit className="h-4 w-4" />
												</Button>
												<Button variant="ghost" size="sm" onClick={() => eliminarAsegurado(asegurado.id)}>
													<Trash2 className="h-4 w-4 text-red-600" />
												</Button>
											</div>
										</div>
										<div className="space-y-1">
											<Label className="text-xs text-gray-600">Nivel de Cobertura</Label>
											<Select
												value={asegurado.nivel_id}
												onValueChange={(v) =>
													setAsegurados(asegurados.map((a) => (a.id === asegurado.id ? { ...a, nivel_id: v } : a)))
												}
											>
												<SelectTrigger className="w-full"><SelectValue placeholder="Nivel" /></SelectTrigger>
												<SelectContent>
													{niveles.map((nivel) => (
														<SelectItem key={nivel.id} value={nivel.id}>{nivel.nombre}</SelectItem>
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
					<div className="text-center py-6 border-2 border-dashed rounded-lg">
						<UserPlus className="h-10 w-10 text-gray-400 mx-auto mb-2" />
						<p className="text-gray-500 text-sm">
							{contratante?.rol === "contratante-asegurado"
								? "Opcional: el contratante ya está asegurado"
								: "Agregue al menos un asegurado"}
						</p>
					</div>
				)}
			</div>

			{/* Info de roles */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
				<p className="text-sm text-blue-900 font-medium mb-2">Roles en pólizas de Accidentes Personales:</p>
				<ul className="text-xs text-blue-800 space-y-1 ml-2">
					<li>• <strong>Contratante-Asegurado:</strong> Contrata y también está asegurado en la póliza</li>
					<li>• <strong>Contratante:</strong> Solo contrata (no asegurado) — debe haber al menos 1 asegurado</li>
					<li>• <strong>Asegurado:</strong> Persona cubierta con datos mínimos</li>
				</ul>
			</div>

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

			{mostrarModalAsegurado && (
				<BeneficiarioModal
					beneficiario={aseguradoEditando}
					moneda={moneda}
					niveles={niveles}
					hideRol={true}
					titulo={aseguradoEditando ? "Editar Asegurado" : "Agregar Asegurado"}
					onGuardar={guardarAsegurado}
					onCancelar={() => { setMostrarModalAsegurado(false); setAseguradoEditando(null); }}
				/>
			)}
		</div>
	);
}
