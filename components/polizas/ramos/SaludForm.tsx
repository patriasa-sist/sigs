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
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import type {
	DatosSalud,
	ContratanteSalud,
	TitularSalud,
	FamiliarSalud,
	NivelSalud,
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
	datos: DatosSalud | null;
	moneda?: string;
	regionales: Array<{ id: string; nombre: string }>;
	aseguradoPrincipal?: AseguradoSeleccionado | null;
	onChange: (datos: DatosSalud) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

type SubPaso = "niveles" | "principal";

// Para el modal de familiares, indica a qué grupo pertenece (contratante o un titular)
type ContextoFamiliar =
	| { tipo: "contratante" }
	| { tipo: "titular"; titularId: string };

export function SaludForm({
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
	const [niveles, setNiveles] = useState<NivelSalud[]>(datos?.niveles || []);
	const [nivelEditando, setNivelEditando] = useState<NivelSalud | null>(null);
	const [nombreNivel, setNombreNivel] = useState("");
	const [montoNivel, setMontoNivel] = useState<number>(0);

	// ===== PASO 3: PRINCIPAL =====
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(datos?.tipo_poliza || "individual");
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [tieneMaternidad, setTieneMaternidad] = useState<boolean>(datos?.tiene_maternidad || false);
	const [contratante, setContratante] = useState<ContratanteSalud | null>(datos?.contratante ?? null);
	const [titulares, setTitulares] = useState<TitularSalud[]>(datos?.titulares || []);

	// UI state
	const [mostrarBuscadorContratante, setMostrarBuscadorContratante] = useState(false);
	const [mostrarModalTitular, setMostrarModalTitular] = useState(false);
	const [titularEditando, setTitularEditando] = useState<TitularSalud | null>(null);
	const [mostrarModalFamiliar, setMostrarModalFamiliar] = useState(false);
	const [familiarEditando, setFamiliarEditando] = useState<FamiliarSalud | null>(null);
	const [contextoFamiliar, setContextoFamiliar] = useState<ContextoFamiliar | null>(null);
	const [titularesExpandidos, setTitularesExpandidos] = useState<Set<string>>(new Set());
	const [errores, setErrores] = useState<Record<string, string>>({});

	// ===== FUNCIONES NIVELES =====
	const crearNuevoNivel = () => {
		const n = niveles.length + 1;
		setNivelEditando({ id: crypto.randomUUID(), nombre: `Nivel ${n}`, monto: 0 });
		setNombreNivel(`Nivel ${n}`);
		setMontoNivel(0);
	};

	const guardarNivel = () => {
		if (!nivelEditando) return;
		const errs: Record<string, string> = {};
		if (!nombreNivel.trim()) errs.nombre_nivel = "El nombre es obligatorio";
		if (montoNivel <= 0) errs.monto_nivel = "El monto debe ser mayor a 0";
		if (Object.keys(errs).length > 0) { setErrores(errs); return; }

		const actualizado: NivelSalud = { ...nivelEditando, nombre: nombreNivel, monto: montoNivel };
		const idx = niveles.findIndex((n) => n.id === nivelEditando.id);
		if (idx >= 0) {
			const arr = [...niveles]; arr[idx] = actualizado; setNiveles(arr);
		} else {
			setNiveles([...niveles, actualizado]);
		}
		setNivelEditando(null); setNombreNivel(""); setMontoNivel(0); setErrores({});
	};

	const editarNivel = (nivel: NivelSalud) => {
		setNivelEditando(nivel); setNombreNivel(nivel.nombre); setMontoNivel(nivel.monto);
	};

	const eliminarNivel = (id: string) => {
		if (confirm("¿Eliminar este nivel?")) setNiveles(niveles.filter((n) => n.id !== id));
	};

	const continuarAPrincipal = () => {
		if (niveles.length === 0) { setErrores({ general: "Debe crear al menos un nivel de cobertura" }); return; }
		setErrores({}); setSubPaso("principal");
	};

	// ===== FUNCIONES CONTRATANTE =====
	const seleccionarContratante = (cliente: { id: string; nombre: string; ci: string }) => {
		setContratante({
			client_id: cliente.id,
			client_name: cliente.nombre,
			client_ci: cliente.ci,
			nivel_id: niveles[0]?.id || "",
			rol: "contratante-titular",
			conyugue: undefined,
			descendientes: [],
		});
		setMostrarBuscadorContratante(false);
	};

	const eliminarContratante = () => setContratante(null);

	// ===== FUNCIONES TITULARES =====
	const abrirModalTitular = () => { setTitularEditando(null); setMostrarModalTitular(true); };
	const editarTitular = (t: TitularSalud) => { setTitularEditando(t); setMostrarModalTitular(true); };

	const guardarTitular = (datos: DatosPersonaMinima) => {
		if (titularEditando) {
			setTitulares(titulares.map((t) =>
				t.id === titularEditando.id
					? { ...t, nombre_completo: datos.nombre_completo, carnet: datos.carnet, fecha_nacimiento: datos.fecha_nacimiento, genero: datos.genero, nivel_id: datos.nivel_id }
					: t,
			));
		} else {
			const nuevo: TitularSalud = {
				id: datos.id,
				nombre_completo: datos.nombre_completo,
				carnet: datos.carnet,
				fecha_nacimiento: datos.fecha_nacimiento,
				genero: datos.genero,
				nivel_id: datos.nivel_id,
				conyugue: undefined,
				descendientes: [],
			};
			setTitulares([...titulares, nuevo]);
			setTitularesExpandidos((prev) => new Set([...prev, nuevo.id]));
		}
		setMostrarModalTitular(false); setTitularEditando(null);
	};

	const eliminarTitular = (id: string) => {
		if (confirm("¿Eliminar este titular y todos sus familiares?")) {
			setTitulares(titulares.filter((t) => t.id !== id));
		}
	};

	const toggleExpandirTitular = (id: string) => {
		setTitularesExpandidos((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	// ===== FUNCIONES FAMILIARES =====
	const abrirModalFamiliarContratante = (familiar?: FamiliarSalud) => {
		setFamiliarEditando(familiar ?? null);
		setContextoFamiliar({ tipo: "contratante" });
		setMostrarModalFamiliar(true);
	};

	const abrirModalFamiliarTitular = (titularId: string, familiar?: FamiliarSalud) => {
		setFamiliarEditando(familiar ?? null);
		setContextoFamiliar({ tipo: "titular", titularId });
		setMostrarModalFamiliar(true);
	};

	const guardarFamiliar = (datos: DatosPersonaMinima) => {
		const familiar: FamiliarSalud = {
			id: datos.id,
			nombre_completo: datos.nombre_completo,
			carnet: datos.carnet,
			fecha_nacimiento: datos.fecha_nacimiento,
			genero: datos.genero,
			nivel_id: datos.nivel_id,
			rol: (datos.rol ?? "descendiente") as "conyugue" | "descendiente",
		};

		if (!contextoFamiliar) return;

		if (contextoFamiliar.tipo === "contratante" && contratante) {
			if (familiarEditando) {
				if (familiarEditando.rol === "conyugue") {
					setContratante({ ...contratante, conyugue: familiar.rol === "conyugue" ? familiar : undefined });
				} else {
					setContratante({
						...contratante,
						descendientes: (contratante.descendientes || []).map((d) => d.id === familiarEditando.id ? familiar : d),
					});
				}
			} else if (familiar.rol === "conyugue") {
				setContratante({ ...contratante, conyugue: familiar });
			} else {
				setContratante({ ...contratante, descendientes: [...(contratante.descendientes || []), familiar] });
			}
		} else if (contextoFamiliar.tipo === "titular") {
			const titularId = contextoFamiliar.titularId;
			setTitulares(titulares.map((t) => {
				if (t.id !== titularId) return t;
				if (familiarEditando) {
					if (familiarEditando.rol === "conyugue") {
						return { ...t, conyugue: familiar.rol === "conyugue" ? familiar : undefined };
					} else {
						return { ...t, descendientes: t.descendientes.map((d) => d.id === familiarEditando.id ? familiar : d) };
					}
				} else if (familiar.rol === "conyugue") {
					return { ...t, conyugue: familiar };
				} else {
					return { ...t, descendientes: [...t.descendientes, familiar] };
				}
			}));
		}

		setMostrarModalFamiliar(false); setFamiliarEditando(null); setContextoFamiliar(null);
	};

	const eliminarFamiliarContratante = (familiar: FamiliarSalud) => {
		if (!contratante) return;
		if (familiar.rol === "conyugue") {
			setContratante({ ...contratante, conyugue: undefined });
		} else {
			setContratante({ ...contratante, descendientes: (contratante.descendientes || []).filter((d) => d.id !== familiar.id) });
		}
	};

	const eliminarFamiliarTitular = (titularId: string, familiar: FamiliarSalud) => {
		setTitulares(titulares.map((t) => {
			if (t.id !== titularId) return t;
			if (familiar.rol === "conyugue") return { ...t, conyugue: undefined };
			return { ...t, descendientes: t.descendientes.filter((d) => d.id !== familiar.id) };
		}));
	};

	const handleContinuar = () => {
		const errs: Record<string, string> = {};
		if (!regionalId) errs.regional = "Debe seleccionar una regional";
		if (!contratante) {
			errs.contratante = "Debe seleccionar un contratante";
		} else {
			if (!contratante.nivel_id) errs.contratante = "El contratante debe tener un nivel asignado";
			if (contratante.rol === "contratante" && titulares.length === 0)
				errs.titulares = "Si el contratante no es titular, debe agregar al menos un titular";
		}
		const sinNivel = titulares.filter((t) => !t.nivel_id);
		if (sinNivel.length > 0) errs.titulares = "Todos los titulares deben tener un nivel asignado";
		if (Object.keys(errs).length > 0) { setErrores(errs); return; }

		onChange({ niveles, tipo_poliza: tipoPoliza, regional_asegurado_id: regionalId, tiene_maternidad: tieneMaternidad, contratante: contratante!, titulares });
		onSiguiente();
	};

	const volverANiveles = () => setSubPaso("niveles");
	const esCompleto = datos !== null;

	// Helper: renderizar la lista de familiares de un grupo (contratante o titular)
	const renderFamiliares = (
		conyugue: FamiliarSalud | undefined,
		descendientes: FamiliarSalud[],
		onAgregarConyugue: () => void,
		onAgregarDescendiente: () => void,
		onEditarFamiliar: (f: FamiliarSalud) => void,
		onEliminarFamiliar: (f: FamiliarSalud) => void,
	) => (
		<div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
			{/* Cónyuge */}
			<div className="flex items-center justify-between">
				<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cónyuge</p>
				{!conyugue && (
					<Button variant="ghost" size="sm" onClick={onAgregarConyugue} className="h-7 text-xs">
						<Plus className="mr-1 h-3 w-3" />Agregar Cónyuge
					</Button>
				)}
			</div>
			{conyugue ? (
				<div className="flex items-center justify-between p-2 bg-pink-50 border border-pink-200 rounded">
					<div>
						<p className="text-sm font-medium text-gray-800">{conyugue.nombre_completo}</p>
						<p className="text-xs text-gray-500">CI: {conyugue.carnet} · Nivel: {niveles.find((n) => n.id === conyugue.nivel_id)?.nombre ?? "—"}</p>
					</div>
					<div className="flex gap-1">
						<Button variant="ghost" size="sm" onClick={() => onEditarFamiliar(conyugue)} className="h-7 w-7 p-0">
							<Edit className="h-3.5 w-3.5" />
						</Button>
						<Button variant="ghost" size="sm" onClick={() => onEliminarFamiliar(conyugue)} className="h-7 w-7 p-0">
							<Trash2 className="h-3.5 w-3.5 text-red-500" />
						</Button>
					</div>
				</div>
			) : (
				<p className="text-xs text-gray-400 italic">Sin cónyuge</p>
			)}

			{/* Descendientes */}
			<div className="flex items-center justify-between mt-1">
				<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
					Descendientes ({descendientes.length})
				</p>
				<Button variant="ghost" size="sm" onClick={onAgregarDescendiente} className="h-7 text-xs">
					<Plus className="mr-1 h-3 w-3" />Agregar Descendiente
				</Button>
			</div>
			{descendientes.length > 0 ? (
				<div className="space-y-1">
					{descendientes.map((d) => (
						<div key={d.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
							<div>
								<p className="text-sm font-medium text-gray-800">{d.nombre_completo}</p>
								<p className="text-xs text-gray-500">CI: {d.carnet} · Nivel: {niveles.find((n) => n.id === d.nivel_id)?.nombre ?? "—"}</p>
							</div>
							<div className="flex gap-1">
								<Button variant="ghost" size="sm" onClick={() => onEditarFamiliar(d)} className="h-7 w-7 p-0">
									<Edit className="h-3.5 w-3.5" />
								</Button>
								<Button variant="ghost" size="sm" onClick={() => onEliminarFamiliar(d)} className="h-7 w-7 p-0">
									<Trash2 className="h-3.5 w-3.5 text-red-500" />
								</Button>
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="text-xs text-gray-400 italic">Sin descendientes</p>
			)}
		</div>
	);

	// ===================== SUB-PASO 2.1: NIVELES =====================
	if (subPaso === "niveles") {
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-xl font-semibold text-gray-900">Paso 2.1: Configurar Niveles de Cobertura (Salud)</h2>
						<p className="text-sm text-gray-600 mt-1">Defina los niveles de cobertura para las pólizas de salud</p>
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
							{niveles.map((nivel) => (
								<div key={nivel.id} className="flex items-center justify-between p-4 border rounded-lg">
									<div className="flex-1">
										<p className="font-medium text-gray-900">{nivel.nombre}</p>
										<p className="text-sm text-gray-600">
											Cobertura: {moneda} {nivel.monto.toLocaleString()}
										</p>
									</div>
									<div className="flex gap-2">
										<Button variant="outline" size="sm" onClick={() => editarNivel(nivel)}>Editar</Button>
										<Button variant="ghost" size="sm" onClick={() => eliminarNivel(nivel.id)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

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
									value={nombreNivel}
									onChange={(e) => { setNombreNivel(e.target.value); if (errores.nombre_nivel) { const { nombre_nivel: _n, ...rest } = errores; setErrores(rest); } }}
									placeholder="Ej: Nivel 1, Nivel Básico, Nivel Premium, etc."
									className={errores.nombre_nivel ? "border-red-500" : ""}
								/>
								{errores.nombre_nivel && <p className="text-sm text-red-600">{errores.nombre_nivel}</p>}
							</div>
							<div className="space-y-2">
								<Label htmlFor="monto_nivel">Monto de Cobertura</Label>
								<Input
									id="monto_nivel"
									type="number"
									min="0"
									step="0.01"
									value={montoNivel || ""}
									onChange={(e) => { setMontoNivel(parseFloat(e.target.value) || 0); if (errores.monto_nivel) { const { monto_nivel: _m, ...rest } = errores; setErrores(rest); } }}
									placeholder="0.00"
									className={errores.monto_nivel ? "border-red-500" : ""}
								/>
								{errores.monto_nivel && <p className="text-sm text-red-600">{errores.monto_nivel}</p>}
								<p className="text-xs text-gray-500">Monto máximo de cobertura para este nivel</p>
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
					<h2 className="text-xl font-semibold text-gray-900">Paso 3: Datos Específicos — Salud</h2>
					<p className="text-sm text-gray-600 mt-1">
						Complete la información de contratante y titulares
					</p>
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
							<p className="text-xs text-gray-600">{niveles.map((n) => `${n.nombre} (${moneda} ${n.monto.toLocaleString()})`).join(", ")}</p>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={volverANiveles}>Editar Niveles</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">Tipo de Póliza <span className="text-red-500">*</span></Label>
					<Select value={tipoPoliza} onValueChange={(v: "individual" | "corporativo") => setTipoPoliza(v)}>
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
				<div className="space-y-2 md:col-span-2">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="tiene_maternidad"
							checked={tieneMaternidad}
							onCheckedChange={(checked) => setTieneMaternidad(!!checked)}
						/>
						<Label htmlFor="tiene_maternidad" className="cursor-pointer">
							¿Incluye cobertura de maternidad?
						</Label>
					</div>
				</div>
			</div>

			{/* ── CONTRATANTE ── */}
			<div className="space-y-4 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base">Contratante <span className="text-red-500">*</span></Label>
						<p className="text-sm text-gray-600 mt-1">
							Cliente registrado que contrata la póliza (requiere datos completos)
						</p>
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
										<Select value={contratante.nivel_id} onValueChange={(v) => setContratante({ ...contratante, nivel_id: v })}>
											<SelectTrigger className="w-full"><SelectValue placeholder="Nivel" /></SelectTrigger>
											<SelectContent>
												{niveles.map((n) => (
													<SelectItem key={n.id} value={n.id}>{n.nombre} — {moneda} {n.monto.toLocaleString()}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1">
										<Label className="text-xs text-gray-600">Rol <span className="text-red-500">*</span></Label>
										<Select value={contratante.rol} onValueChange={(v) => setContratante({ ...contratante, rol: v as ContratanteSalud["rol"] })}>
											<SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="contratante-titular">Contratante-Titular</SelectItem>
												<SelectItem value="contratante">Contratante</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-gray-500">
											{contratante.rol === "contratante-titular"
												? "Es contratante y también es titular (puede tener cónyuge y descendientes)"
												: "Solo contrata — debe haber al menos 1 titular"}
										</p>
									</div>
								</div>

								{/* Familiares del contratante-titular */}
								{contratante.rol === "contratante-titular" && renderFamiliares(
									contratante.conyugue,
									contratante.descendientes || [],
									() => abrirModalFamiliarContratante(),
									() => {
										setFamiliarEditando(null);
										setContextoFamiliar({ tipo: "contratante" });
										setMostrarModalFamiliar(true);
									},
									(f) => abrirModalFamiliarContratante(f),
									(f) => eliminarFamiliarContratante(f),
								)}
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

			{/* ── TITULARES ── */}
			<div className="space-y-4 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base">
							Titulares
							{contratante?.rol === "contratante" && <span className="text-red-500 ml-1">*</span>}
						</Label>
						<p className="text-sm text-gray-600 mt-1">
							Personas titulares aseguradas con datos mínimos
							{contratante?.rol === "contratante-titular" && (
								<span className="text-gray-400"> — el contratante ya es titular</span>
							)}
						</p>
					</div>
					<Button onClick={abrirModalTitular} disabled={mostrarModalTitular}>
						<UserPlus className="mr-2 h-4 w-4" />
						Agregar Titular
					</Button>
				</div>

				{errores.titulares && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
						<AlertTriangle className="h-4 w-4 text-red-600" />
						<p className="text-sm text-red-600">{errores.titulares}</p>
					</div>
				)}

				{titulares.length > 0 ? (
					<div className="space-y-3">
						{titulares.map((titular) => {
							const expandido = titularesExpandidos.has(titular.id);
							return (
								<div key={titular.id} className="border rounded-lg overflow-hidden">
									{/* Cabecera del titular */}
									<div className="p-4 bg-gray-50 flex items-center gap-3">
										<UserPlus className="h-5 w-5 text-primary flex-shrink-0" />
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<p className="font-medium text-gray-900">{titular.nombre_completo}</p>
												<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">Titular</span>
											</div>
											<p className="text-sm text-gray-600">CI: {titular.carnet}</p>
											<p className="text-xs text-gray-500">
												Nivel: {niveles.find((n) => n.id === titular.nivel_id)?.nombre ?? "—"} ·
												Familia: {(titular.conyugue ? 1 : 0) + titular.descendientes.length} miembro(s)
											</p>
										</div>
										<div className="flex items-center gap-1">
											<div className="space-y-1 mr-2">
												<Label className="text-xs text-gray-500">Nivel</Label>
												<Select
													value={titular.nivel_id}
													onValueChange={(v) =>
														setTitulares(titulares.map((t) => t.id === titular.id ? { ...t, nivel_id: v } : t))
													}
												>
													<SelectTrigger className="w-36 h-8 text-xs">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{niveles.map((n) => (
															<SelectItem key={n.id} value={n.id} className="text-xs">{n.nombre}</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<Button variant="ghost" size="sm" onClick={() => editarTitular(titular)} className="h-8 w-8 p-0">
												<Edit className="h-4 w-4" />
											</Button>
											<Button variant="ghost" size="sm" onClick={() => eliminarTitular(titular.id)} className="h-8 w-8 p-0">
												<Trash2 className="h-4 w-4 text-red-600" />
											</Button>
											<Button variant="ghost" size="sm" onClick={() => toggleExpandirTitular(titular.id)} className="h-8 w-8 p-0">
												{expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
											</Button>
										</div>
									</div>

									{/* Familiares del titular (expandible) */}
									{expandido && (
										<div className="p-4 bg-white border-t">
											{renderFamiliares(
												titular.conyugue,
												titular.descendientes,
												() => abrirModalFamiliarTitular(titular.id),
												() => abrirModalFamiliarTitular(titular.id),
												(f) => abrirModalFamiliarTitular(titular.id, f),
												(f) => eliminarFamiliarTitular(titular.id, f),
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div className="text-center py-6 border-2 border-dashed rounded-lg">
						<UserPlus className="h-10 w-10 text-gray-400 mx-auto mb-2" />
						<p className="text-gray-500 text-sm">
							{contratante?.rol === "contratante-titular"
								? "Opcional: el contratante ya es titular"
								: "Agregue al menos un titular"}
						</p>
					</div>
				)}
			</div>

			{/* Info de roles */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
				<p className="text-sm text-blue-900 font-medium mb-2">Roles en pólizas de Salud:</p>
				<ul className="text-xs text-blue-800 space-y-1 ml-2">
					<li>• <strong>Contratante-Titular:</strong> Contrata y es titular principal (puede tener cónyuge y descendientes)</li>
					<li>• <strong>Contratante:</strong> Solo contrata — debe haber al menos 1 titular</li>
					<li>• <strong>Titular:</strong> Cabeza de grupo familiar asegurado</li>
					<li>• <strong>Cónyuge:</strong> Pareja del titular (máx. 1 por titular)</li>
					<li>• <strong>Descendiente:</strong> Hijo u otro dependiente del titular</li>
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

			{/* Modal titular */}
			{mostrarModalTitular && (
				<BeneficiarioModal
					beneficiario={titularEditando}
					moneda={moneda}
					niveles={niveles}
					hideRol={true}
					titulo={titularEditando ? "Editar Titular" : "Agregar Titular"}
					onGuardar={guardarTitular}
					onCancelar={() => { setMostrarModalTitular(false); setTitularEditando(null); }}
				/>
			)}

			{/* Modal familiar (cónyuge / descendiente) */}
			{mostrarModalFamiliar && (
				<BeneficiarioModal
					beneficiario={familiarEditando}
					moneda={moneda}
					niveles={niveles}
					hideRol={false}
					roles={[
						{ value: "conyugue", label: "Cónyuge" },
						{ value: "descendiente", label: "Descendiente" },
					]}
					titulo={familiarEditando ? "Editar Familiar" : "Agregar Familiar"}
					onGuardar={guardarFamiliar}
					onCancelar={() => { setMostrarModalFamiliar(false); setFamiliarEditando(null); setContextoFamiliar(null); }}
				/>
			)}
		</div>
	);
}
