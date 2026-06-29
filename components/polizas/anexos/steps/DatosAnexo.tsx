"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Trash2, CheckSquare, AlertCircle, Edit, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
	AnexoItemsCambio,
	AnexoItemChange,
	ItemsActualesRamo,
	TipoAnexo,
	NivelesPolizaAnexo,
} from "@/types/anexo";
import type {
	VehiculoAutomotor,
	EquipoIndustrial,
	NaveEmbarcacion,
	ContratanteSalud,
	TitularSalud,
	AseguradoConNivel,
	BienAseguradoIncendio,
	BienAseguradoRiesgosVarios,
	NivelSalud,
	NivelCobertura,
	NivelAPNave,
	Moneda,
} from "@/types/poliza";

// Modals reutilizados de la creación de pólizas
import { VehiculoModal } from "../../ramos/VehiculoModal";
import { EquipoModal } from "../../ramos/EquipoModal";
import { NaveModal } from "../../ramos/NaveModal";
import { BeneficiarioModal, type DatosPersonaMinima } from "../../ramos/BeneficiarioModal";
import { BienModal, ITEMS_INCENDIO, ITEMS_RIESGOS_VARIOS, type BienGenerico } from "../../ramos/BienModal";
import { BuscadorClientes } from "../../BuscadorClientes";

// Modo de captura derivado del tipo de anexo. "reemplazo" combina exclusión
// (item que sale) e inclusión (item que entra) en un mismo formulario.
type ModoAnexo = "inclusion" | "exclusion" | "reemplazo";

type Props = {
	tipoAnexo: TipoAnexo;
	ramo: string;
	itemsActuales: ItemsActualesRamo | null;
	itemsCambio: AnexoItemsCambio | null;
	niveles: NivelesPolizaAnexo;
	moneda: Moneda;
	onChange: (items: AnexoItemsCambio | null) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Cuenta inclusiones/exclusiones de cualquier estructura de items (para validar
// el reemplazo: exactamente 1 item que sale y 1 que entra).
function contarItems(items: AnexoItemsCambio | null): { incl: number; excl: number } {
	if (!items) return { incl: 0, excl: 0 };
	const lista = items.tipo_ramo === "Salud" ? [...items.items_asegurados, ...items.items_beneficiarios] : items.items;
	return {
		incl: lista.filter((i) => i.accion === "inclusion").length,
		excl: lista.filter((i) => i.accion === "exclusion").length,
	};
}

export function DatosAnexo({
	tipoAnexo,
	ramo,
	itemsActuales,
	itemsCambio,
	niveles,
	moneda,
	onChange,
	onSiguiente,
	onAnterior,
}: Props) {
	const [errorReemplazo, setErrorReemplazo] = useState<string | null>(null);
	const modo: ModoAnexo =
		tipoAnexo === "reemplazo" ? "reemplazo" : tipoAnexo === "inclusion" ? "inclusion" : "exclusion";

	const ramoLower = ramo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

	// Ramos que no soportan inclusión/exclusión de items
	const ramoSoportaItems = !(ramoLower.includes("transporte") || ramoLower.includes("responsabilidad civil"));

	const handleSiguiente = () => {
		// El reemplazo exige exactamente 1 item que sale y 1 que entra.
		if (modo === "reemplazo") {
			const { incl, excl } = contarItems(itemsCambio);
			if (excl !== 1 || incl !== 1) {
				setErrorReemplazo(
					"El reemplazo requiere exactamente un item que sale (exclusión) y uno que entra (inclusión).",
				);
				return;
			}
		}
		setErrorReemplazo(null);
		onSiguiente();
	};

	if (!ramoSoportaItems) {
		return (
			<div className="bg-white border rounded-lg p-6 shadow-sm">
				<div className="flex items-center gap-2 mb-4">
					<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
						3
					</div>
					<h2 className="text-lg font-semibold">Datos Específicos</h2>
				</div>

				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
					<div className="flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-yellow-800">
							El ramo <strong>{ramo}</strong> no soporta inclusión/exclusión de items. Solo se permite la
							anulación para este tipo de seguro.
						</p>
					</div>
				</div>

				<div className="flex justify-between">
					<Button variant="outline" onClick={onAnterior}>
						<ChevronLeft className="h-4 w-4 mr-1" />
						Anterior
					</Button>
					<Button onClick={onSiguiente}>
						Continuar sin cambios
						<ChevronRight className="h-4 w-4 ml-1" />
					</Button>
				</div>
			</div>
		);
	}

	const titulo =
		modo === "reemplazo" ? "Reemplazo de Item" : modo === "inclusion" ? "Datos a Incluir" : "Datos a Excluir";

	return (
		<div className="bg-white border rounded-lg p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-4">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
					3
				</div>
				<h2 className="text-lg font-semibold">{titulo}</h2>
				<Badge
					variant={modo === "inclusion" ? "default" : modo === "exclusion" ? "destructive" : "outline"}
					className={modo === "reemplazo" ? "bg-blue-100 text-blue-700 border-blue-200" : ""}
				>
					{modo === "reemplazo" ? "Reemplazo" : modo === "inclusion" ? "Inclusión" : "Exclusión"}
				</Badge>
			</div>

			{modo === "reemplazo" && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm text-blue-800">
					<ArrowLeftRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
					<span>
						Seleccione el item que <strong>sale</strong> de la póliza y registre el item que{" "}
						<strong>entra</strong>. El reemplazo no genera prima ni modifica cuotas; se respalda con su
						documentación.
					</span>
				</div>
			)}

			{/* Router por ramo */}
			{ramoLower.includes("automotor") && (
				<AnexoAutomotor
					modo={modo}
					itemsActuales={itemsActuales?.tipo_ramo === "Automotores" ? itemsActuales.vehiculos : []}
					itemsCambio={itemsCambio?.tipo_ramo === "Automotores" ? itemsCambio.items : []}
					onChange={(items) => onChange(items.length > 0 ? { tipo_ramo: "Automotores", items } : null)}
				/>
			)}

			{ramoLower.includes("ramo") && ramoLower.includes("tecnico") && (
				<AnexoRamosTecnicos
					modo={modo}
					itemsActuales={itemsActuales?.tipo_ramo === "Ramos técnicos" ? itemsActuales.equipos : []}
					itemsCambio={itemsCambio?.tipo_ramo === "Ramos técnicos" ? itemsCambio.items : []}
					onChange={(items) => onChange(items.length > 0 ? { tipo_ramo: "Ramos técnicos", items } : null)}
				/>
			)}

			{ramoLower.includes("aeronavegacion") && (
				<AnexoAeronavegacion
					modo={modo}
					tipoNave="aeronave"
					nivelesAP={niveles.naves_ap}
					itemsActuales={itemsActuales?.tipo_ramo === "Aeronavegación" ? itemsActuales.naves : []}
					itemsCambio={
						itemsCambio?.tipo_ramo === "Aeronavegación" ||
						itemsCambio?.tipo_ramo === "Naves o embarcaciones"
							? itemsCambio.items
							: []
					}
					onChange={(items) => onChange(items.length > 0 ? { tipo_ramo: "Aeronavegación", items } : null)}
				/>
			)}

			{(ramoLower.includes("nave") || ramoLower.includes("embarcacion")) &&
				!ramoLower.includes("aeronavegacion") && (
					<AnexoAeronavegacion
						modo={modo}
						tipoNave="embarcacion"
						nivelesAP={niveles.naves_ap}
						itemsActuales={itemsActuales?.tipo_ramo === "Naves o embarcaciones" ? itemsActuales.naves : []}
						itemsCambio={itemsCambio?.tipo_ramo === "Naves o embarcaciones" ? itemsCambio.items : []}
						onChange={(items) =>
							onChange(items.length > 0 ? { tipo_ramo: "Naves o embarcaciones", items } : null)
						}
					/>
				)}

			{(ramoLower.includes("salud") || ramoLower.includes("enfermedad")) && (
				<AnexoSalud
					modo={modo}
					niveles={niveles.salud}
					moneda={moneda}
					itemsActuales={itemsActuales?.tipo_ramo === "Salud" ? itemsActuales : null}
					itemsCambio={itemsCambio?.tipo_ramo === "Salud" ? itemsCambio : null}
					onChange={(cambio) => onChange(cambio)}
				/>
			)}

			{ramoLower.includes("incendio") && (
				<AnexoBienes<BienAseguradoIncendio>
					modo={modo}
					itemsDisponibles={ITEMS_INCENDIO}
					moneda={moneda}
					itemsActuales={itemsActuales?.tipo_ramo === "Incendio y Aliados" ? itemsActuales.bienes : []}
					itemsCambio={itemsCambio?.tipo_ramo === "Incendio y Aliados" ? itemsCambio.items : []}
					onChange={(items) => onChange(items.length > 0 ? { tipo_ramo: "Incendio y Aliados", items } : null)}
				/>
			)}

			{ramoLower.includes("riesgo") && ramoLower.includes("vario") && (
				<AnexoBienes<BienAseguradoRiesgosVarios>
					modo={modo}
					itemsDisponibles={ITEMS_RIESGOS_VARIOS}
					moneda={moneda}
					itemsActuales={
						itemsActuales?.tipo_ramo === "Riesgos Varios Misceláneos" ? itemsActuales.bienes : []
					}
					itemsCambio={itemsCambio?.tipo_ramo === "Riesgos Varios Misceláneos" ? itemsCambio.items : []}
					onChange={(items) =>
						onChange(items.length > 0 ? { tipo_ramo: "Riesgos Varios Misceláneos", items } : null)
					}
				/>
			)}

			{(ramoLower.includes("vida") ||
				ramoLower.includes("sepelio") ||
				ramoLower.includes("defuncion") ||
				(ramoLower.includes("accidente") && ramoLower.includes("personal"))) && (
				<AnexoAseguradosNivel
					modo={modo}
					niveles={niveles.cobertura}
					itemsActuales={
						itemsActuales?.tipo_ramo === "Vida" ||
						itemsActuales?.tipo_ramo === "Sepelio" ||
						itemsActuales?.tipo_ramo === "Accidentes Personales"
							? itemsActuales.asegurados
							: []
					}
					itemsCambio={
						itemsCambio?.tipo_ramo === "Vida" ||
						itemsCambio?.tipo_ramo === "Sepelio" ||
						itemsCambio?.tipo_ramo === "Accidentes Personales"
							? itemsCambio.items
							: []
					}
					onChange={(items) => {
						const tipo = ramoLower.includes("vida")
							? "Vida"
							: ramoLower.includes("sepelio") || ramoLower.includes("defuncion")
								? "Sepelio"
								: "Accidentes Personales";
						onChange(items.length > 0 ? { tipo_ramo: tipo, items } : null);
					}}
				/>
			)}

			{errorReemplazo && (
				<div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
					<AlertCircle className="h-4 w-4 flex-shrink-0" />
					{errorReemplazo}
				</div>
			)}

			{/* Navegación */}
			<div className="flex justify-between mt-6">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="h-4 w-4 mr-1" />
					Anterior
				</Button>
				<Button onClick={handleSiguiente}>
					Siguiente
					<ChevronRight className="h-4 w-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}

// ============================================
// COMPONENTE GENÉRICO DE EXCLUSIÓN CON CHECKBOXES
// En modo reemplazo, la selección es única (un solo item que sale).
// ============================================

function ExclusionSelector<T>({
	items,
	selectedIds,
	onToggle,
	renderItem,
}: {
	items: (T & { id: string })[];
	selectedIds: Set<string>;
	onToggle: (id: string) => void;
	renderItem: (item: T & { id: string }) => React.ReactNode;
	getLabel?: (item: T & { id: string }) => string;
}) {
	if (items.length === 0) {
		return <p className="text-gray-400 text-sm text-center py-4">No hay items registrados</p>;
	}

	return (
		<div className="space-y-2">
			{items.map((item) => {
				const isSelected = selectedIds.has(item.id);
				return (
					<div
						key={item.id}
						className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${
							isSelected ? "border-red-300 bg-red-50" : "border-gray-200 hover:bg-gray-50"
						}`}
						onClick={() => onToggle(item.id)}
					>
						<CheckSquare
							className={`h-5 w-5 flex-shrink-0 ${isSelected ? "text-red-500" : "text-gray-300"}`}
						/>
						<div className="flex-1 grid grid-cols-4 gap-2 text-sm">{renderItem(item)}</div>
						{isSelected && <Trash2 className="h-4 w-4 text-red-400" />}
					</div>
				);
			})}

			{selectedIds.size > 0 && (
				<p className="text-sm text-red-600 mt-3">{selectedIds.size} item(s) marcado(s) para exclusión</p>
			)}
		</div>
	);
}

// Encabezado de sección para el modo reemplazo (separa "sale" / "entra").
function SeccionReemplazo({ tipo, children }: { tipo: "sale" | "entra"; children: React.ReactNode }) {
	const esSale = tipo === "sale";
	return (
		<div className={`rounded-lg border p-4 mb-4 ${esSale ? "border-orange-200" : "border-green-200"}`}>
			<div className="flex items-center gap-2 mb-3">
				<Badge
					variant="outline"
					className={
						esSale
							? "bg-orange-100 text-orange-700 border-orange-200"
							: "bg-green-100 text-green-700 border-green-200"
					}
				>
					{esSale ? "Item que sale" : "Item que entra"}
				</Badge>
			</div>
			{children}
		</div>
	);
}

// ============================================
// AUTOMOTOR (VehiculoModal)
// ============================================

function AnexoAutomotor({
	modo,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	modo: ModoAnexo;
	itemsActuales: (VehiculoAutomotor & { id: string })[];
	itemsCambio: AnexoItemChange<VehiculoAutomotor>[];
	onChange: (items: AnexoItemChange<VehiculoAutomotor>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!)),
	);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoAutomotor | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);

	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");
	const mostrarExclusion = modo === "exclusion" || modo === "reemplazo";

	const emit = (ids: Set<string>, incs: AnexoItemChange<VehiculoAutomotor>[]) => {
		const exclusiones: AnexoItemChange<VehiculoAutomotor>[] = Array.from(ids).map((itemId) => ({
			accion: "exclusion",
			original_item_id: itemId,
			data: itemsActuales.find((x) => x.id === itemId)!,
		}));
		onChange([...exclusiones, ...incs]);
	};

	const handleToggle = (id: string) => {
		// Reemplazo: selección única (un solo item que sale).
		const newSet = modo === "reemplazo" ? new Set<string>() : new Set(selectedIds);
		if (selectedIds.has(id)) newSet.delete(id);
		else newSet.add(id);
		setSelectedIds(newSet);
		emit(newSet, inclusiones);
	};

	const seccionExclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Seleccione el/los vehículo(s) que salen de la póliza:</p>
			<ExclusionSelector
				items={itemsActuales}
				selectedIds={selectedIds}
				onToggle={handleToggle}
				renderItem={(v) => (
					<>
						<span className="font-medium">{v.placa}</span>
						<span>{v.nro_chasis}</span>
						<span>{v.uso}</span>
						<span className="text-right">{v.valor_asegurado.toLocaleString()}</span>
					</>
				)}
			/>
		</>
	);

	const puedeAgregar = modo !== "reemplazo" || inclusiones.length === 0;
	const seccionInclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Agregue el/los vehículo(s) que entran en la póliza:</p>

			{inclusiones.length > 0 && (
				<div className="mb-4 space-y-2">
					{inclusiones.map((item, idx) => (
						<div
							key={idx}
							className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center"
						>
							<span className="text-sm">
								{item.data.placa} — {item.data.nro_chasis} —{" "}
								{item.data.valor_asegurado.toLocaleString()}
							</span>
							<div className="flex gap-1">
								<button
									onClick={() => {
										setVehiculoEditando(item.data);
										setIndexEditando(idx);
										setModalAbierto(true);
									}}
									className="text-blue-500 hover:text-blue-700"
								>
									<Edit className="h-4 w-4" />
								</button>
								<button
									onClick={() =>
										emit(
											selectedIds,
											inclusiones.filter((_, i) => i !== idx),
										)
									}
									className="text-red-500 hover:text-red-700"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{puedeAgregar && (
				<Button
					variant="outline"
					onClick={() => {
						setVehiculoEditando(null);
						setIndexEditando(null);
						setModalAbierto(true);
					}}
				>
					<Plus className="h-4 w-4 mr-1" />
					Agregar Vehículo
				</Button>
			)}
		</>
	);

	return (
		<div>
			{modo === "reemplazo" ? (
				<>
					<SeccionReemplazo tipo="sale">{seccionExclusion}</SeccionReemplazo>
					<SeccionReemplazo tipo="entra">{seccionInclusion}</SeccionReemplazo>
				</>
			) : mostrarExclusion ? (
				seccionExclusion
			) : (
				<>
					{itemsActuales.length > 0 && (
						<div className="mb-4">
							<p className="text-xs text-gray-500 mb-2 font-medium">Vehículos actuales (solo lectura):</p>
							<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
								{itemsActuales.map((v) => (
									<div key={v.id} className="text-sm text-gray-600 flex justify-between">
										<span>
											{v.placa} — {v.nro_chasis}
										</span>
										<span>{v.valor_asegurado.toLocaleString()}</span>
									</div>
								))}
							</div>
						</div>
					)}
					{seccionInclusion}
				</>
			)}

			{modalAbierto && (
				<VehiculoModal
					vehiculo={vehiculoEditando}
					permitirCeroAsegurado
					onGuardar={(vehiculo) => {
						let newInclusiones: AnexoItemChange<VehiculoAutomotor>[];
						if (indexEditando !== null) {
							newInclusiones = [...inclusiones];
							newInclusiones[indexEditando] = { accion: "inclusion", data: vehiculo };
						} else {
							newInclusiones = [...inclusiones, { accion: "inclusion", data: vehiculo }];
						}
						emit(selectedIds, newInclusiones);
						setModalAbierto(false);
					}}
					onCancelar={() => setModalAbierto(false)}
				/>
			)}
		</div>
	);
}

// ============================================
// RAMOS TÉCNICOS (EquipoModal)
// ============================================

function AnexoRamosTecnicos({
	modo,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	modo: ModoAnexo;
	itemsActuales: (EquipoIndustrial & { id: string })[];
	itemsCambio: AnexoItemChange<EquipoIndustrial>[];
	onChange: (items: AnexoItemChange<EquipoIndustrial>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!)),
	);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [equipoEditando, setEquipoEditando] = useState<EquipoIndustrial | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);

	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");
	const mostrarExclusion = modo === "exclusion" || modo === "reemplazo";

	const emit = (ids: Set<string>, incs: AnexoItemChange<EquipoIndustrial>[]) => {
		const exclusiones: AnexoItemChange<EquipoIndustrial>[] = Array.from(ids).map((itemId) => ({
			accion: "exclusion",
			original_item_id: itemId,
			data: itemsActuales.find((x) => x.id === itemId)!,
		}));
		onChange([...exclusiones, ...incs]);
	};

	const handleToggle = (id: string) => {
		const newSet = modo === "reemplazo" ? new Set<string>() : new Set(selectedIds);
		if (selectedIds.has(id)) newSet.delete(id);
		else newSet.add(id);
		setSelectedIds(newSet);
		emit(newSet, inclusiones);
	};

	const seccionExclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Seleccione el/los equipo(s) que salen de la póliza:</p>
			<ExclusionSelector
				items={itemsActuales}
				selectedIds={selectedIds}
				onToggle={handleToggle}
				renderItem={(e) => (
					<>
						<span className="font-medium">{e.nro_serie}</span>
						<span>{e.nro_chasis}</span>
						<span>{e.uso}</span>
						<span className="text-right">{e.valor_asegurado.toLocaleString()}</span>
					</>
				)}
			/>
		</>
	);

	const puedeAgregar = modo !== "reemplazo" || inclusiones.length === 0;
	const seccionInclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Agregue el/los equipo(s) que entran en la póliza:</p>

			{inclusiones.length > 0 && (
				<div className="mb-4 space-y-2">
					{inclusiones.map((item, idx) => (
						<div
							key={idx}
							className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center"
						>
							<span className="text-sm">
								{item.data.nro_serie} — {item.data.nro_chasis} —{" "}
								{item.data.valor_asegurado.toLocaleString()}
							</span>
							<div className="flex gap-1">
								<button
									onClick={() => {
										setEquipoEditando(item.data);
										setIndexEditando(idx);
										setModalAbierto(true);
									}}
									className="text-blue-500 hover:text-blue-700"
								>
									<Edit className="h-4 w-4" />
								</button>
								<button
									onClick={() =>
										emit(
											selectedIds,
											inclusiones.filter((_, i) => i !== idx),
										)
									}
									className="text-red-500 hover:text-red-700"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{puedeAgregar && (
				<Button
					variant="outline"
					onClick={() => {
						setEquipoEditando(null);
						setIndexEditando(null);
						setModalAbierto(true);
					}}
				>
					<Plus className="h-4 w-4 mr-1" />
					Agregar Equipo
				</Button>
			)}
		</>
	);

	return (
		<div>
			{modo === "reemplazo" ? (
				<>
					<SeccionReemplazo tipo="sale">{seccionExclusion}</SeccionReemplazo>
					<SeccionReemplazo tipo="entra">{seccionInclusion}</SeccionReemplazo>
				</>
			) : mostrarExclusion ? (
				seccionExclusion
			) : (
				<>
					{itemsActuales.length > 0 && (
						<div className="mb-4">
							<p className="text-xs text-gray-500 mb-2 font-medium">Equipos actuales (solo lectura):</p>
							<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
								{itemsActuales.map((e) => (
									<div key={e.id} className="text-sm text-gray-600 flex justify-between">
										<span>
											{e.nro_serie} — {e.nro_chasis}
										</span>
										<span>{e.valor_asegurado.toLocaleString()}</span>
									</div>
								))}
							</div>
						</div>
					)}
					{seccionInclusion}
				</>
			)}

			{modalAbierto && (
				<EquipoModal
					equipo={equipoEditando}
					permitirCeroAsegurado
					onGuardar={(equipo) => {
						let newInclusiones: AnexoItemChange<EquipoIndustrial>[];
						if (indexEditando !== null) {
							newInclusiones = [...inclusiones];
							newInclusiones[indexEditando] = { accion: "inclusion", data: equipo };
						} else {
							newInclusiones = [...inclusiones, { accion: "inclusion", data: equipo }];
						}
						emit(selectedIds, newInclusiones);
						setModalAbierto(false);
					}}
					onCancelar={() => setModalAbierto(false)}
				/>
			)}
		</div>
	);
}

// ============================================
// AERONAVEGACIÓN / NAVES (NaveModal)
// ============================================

function AnexoAeronavegacion({
	modo,
	tipoNave,
	nivelesAP,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	modo: ModoAnexo;
	tipoNave: "aeronave" | "embarcacion";
	nivelesAP: NivelAPNave[];
	itemsActuales: (NaveEmbarcacion & { id: string })[];
	itemsCambio: AnexoItemChange<NaveEmbarcacion>[];
	onChange: (items: AnexoItemChange<NaveEmbarcacion>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!)),
	);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [naveEditando, setNaveEditando] = useState<NaveEmbarcacion | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);

	const label = tipoNave === "aeronave" ? "aeronave" : "embarcación";
	const labelPlural = tipoNave === "aeronave" ? "aeronaves" : "embarcaciones";
	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");
	const mostrarExclusion = modo === "exclusion" || modo === "reemplazo";

	const emit = (ids: Set<string>, incs: AnexoItemChange<NaveEmbarcacion>[]) => {
		const exclusiones: AnexoItemChange<NaveEmbarcacion>[] = Array.from(ids).map((itemId) => ({
			accion: "exclusion",
			original_item_id: itemId,
			data: itemsActuales.find((x) => x.id === itemId)!,
		}));
		onChange([...exclusiones, ...incs]);
	};

	const handleToggle = (id: string) => {
		const newSet = modo === "reemplazo" ? new Set<string>() : new Set(selectedIds);
		if (selectedIds.has(id)) newSet.delete(id);
		else newSet.add(id);
		setSelectedIds(newSet);
		emit(newSet, inclusiones);
	};

	const seccionExclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Seleccione la(s) {labelPlural} que salen de la póliza:</p>
			<ExclusionSelector
				items={itemsActuales}
				selectedIds={selectedIds}
				onToggle={handleToggle}
				renderItem={(n) => (
					<>
						<span className="font-medium">{n.matricula}</span>
						<span>
							{n.marca} {n.modelo}
						</span>
						<span>{n.uso}</span>
						<span className="text-right">{n.valor_casco.toLocaleString()}</span>
					</>
				)}
			/>
		</>
	);

	const puedeAgregar = modo !== "reemplazo" || inclusiones.length === 0;
	const seccionInclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Agregue la(s) {labelPlural} que entran en la póliza:</p>

			{inclusiones.length > 0 && (
				<div className="mb-4 space-y-2">
					{inclusiones.map((item, idx) => (
						<div
							key={idx}
							className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center"
						>
							<span className="text-sm">
								{item.data.matricula} — {item.data.marca} {item.data.modelo} —{" "}
								{item.data.valor_casco.toLocaleString()}
							</span>
							<div className="flex gap-1">
								<button
									onClick={() => {
										setNaveEditando(item.data);
										setIndexEditando(idx);
										setModalAbierto(true);
									}}
									className="text-blue-500 hover:text-blue-700"
								>
									<Edit className="h-4 w-4" />
								</button>
								<button
									onClick={() =>
										emit(
											selectedIds,
											inclusiones.filter((_, i) => i !== idx),
										)
									}
									className="text-red-500 hover:text-red-700"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{puedeAgregar && (
				<Button
					variant="outline"
					onClick={() => {
						setNaveEditando(null);
						setIndexEditando(null);
						setModalAbierto(true);
					}}
				>
					<Plus className="h-4 w-4 mr-1" />
					Agregar {label}
				</Button>
			)}
		</>
	);

	return (
		<div>
			{modo === "reemplazo" ? (
				<>
					<SeccionReemplazo tipo="sale">{seccionExclusion}</SeccionReemplazo>
					<SeccionReemplazo tipo="entra">{seccionInclusion}</SeccionReemplazo>
				</>
			) : mostrarExclusion ? (
				seccionExclusion
			) : (
				<>
					{itemsActuales.length > 0 && (
						<div className="mb-4">
							<p className="text-xs text-gray-500 mb-2 font-medium">
								{tipoNave === "aeronave" ? "Aeronaves" : "Embarcaciones"} actuales (solo lectura):
							</p>
							<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
								{itemsActuales.map((n) => (
									<div key={n.id} className="text-sm text-gray-600 flex justify-between">
										<span>
											{n.matricula} — {n.marca} {n.modelo}
										</span>
										<span>{n.valor_casco.toLocaleString()}</span>
									</div>
								))}
							</div>
						</div>
					)}
					{seccionInclusion}
				</>
			)}

			{modalAbierto && (
				<NaveModal
					nave={naveEditando}
					nivelesAP={nivelesAP}
					tipoNave={tipoNave}
					permitirCeroAsegurado
					onGuardar={(nave) => {
						let newInclusiones: AnexoItemChange<NaveEmbarcacion>[];
						if (indexEditando !== null) {
							newInclusiones = [...inclusiones];
							newInclusiones[indexEditando] = { accion: "inclusion", data: nave };
						} else {
							newInclusiones = [...inclusiones, { accion: "inclusion", data: nave }];
						}
						emit(selectedIds, newInclusiones);
						setModalAbierto(false);
					}}
					onCancelar={() => setModalAbierto(false)}
				/>
			)}
		</div>
	);
}

// ============================================
// SALUD (Asegurados + Beneficiarios)
// ============================================

function AnexoSalud({
	modo,
	niveles,
	moneda,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	modo: ModoAnexo;
	niveles: NivelSalud[];
	moneda: Moneda;
	itemsActuales: {
		tipo_ramo: "Salud";
		asegurados: (ContratanteSalud & { id: string })[];
		beneficiarios: (TitularSalud & { id: string })[];
	} | null;
	itemsCambio: {
		tipo_ramo: "Salud";
		items_asegurados: AnexoItemChange<ContratanteSalud>[];
		items_beneficiarios: AnexoItemChange<TitularSalud>[];
	} | null;
	onChange: (cambio: AnexoItemsCambio | null) => void;
}) {
	const asegurados = itemsActuales?.asegurados || [];
	const beneficiarios = itemsActuales?.beneficiarios || [];

	const aseguradosCambio = itemsCambio?.items_asegurados || [];
	const beneficiariosCambio = itemsCambio?.items_beneficiarios || [];

	const [selectedAseguradoIds, setSelectedAseguradoIds] = useState<Set<string>>(
		new Set(aseguradosCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!)),
	);
	const [selectedBeneficiarioIds, setSelectedBeneficiarioIds] = useState<Set<string>>(
		new Set(beneficiariosCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!)),
	);
	const [modalBenef, setModalBenef] = useState(false);
	const [buscadorAbierto, setBuscadorAbierto] = useState(false);
	const [clientePendiente, setClientePendiente] = useState<{ id: string; nombre: string; ci: string } | null>(null);
	const [nivelCliente, setNivelCliente] = useState<string>(niveles[0]?.id || "");

	const aseguradosIncluidos = aseguradosCambio.filter((i) => i.accion === "inclusion");
	const beneficiariosIncluidos = beneficiariosCambio.filter((i) => i.accion === "inclusion");

	const mostrarExclusion = modo === "exclusion" || modo === "reemplazo";
	const totalInclusiones = aseguradosIncluidos.length + beneficiariosIncluidos.length;
	const puedeAgregar = modo !== "reemplazo" || totalInclusiones === 0;

	const emit = (
		asegExclIds: Set<string>,
		benefExclIds: Set<string>,
		asegInc: AnexoItemChange<ContratanteSalud>[],
		benefInc: AnexoItemChange<TitularSalud>[],
	) => {
		const asegItems: AnexoItemChange<ContratanteSalud>[] = [
			...Array.from(asegExclIds).map((id) => ({
				accion: "exclusion" as const,
				original_item_id: id,
				data: asegurados.find((a) => a.id === id)!,
			})),
			...asegInc,
		];
		const benefItems: AnexoItemChange<TitularSalud>[] = [
			...Array.from(benefExclIds).map((id) => ({
				accion: "exclusion" as const,
				original_item_id: id,
				data: beneficiarios.find((b) => b.id === id)!,
			})),
			...benefInc,
		];

		if (asegItems.length === 0 && benefItems.length === 0) {
			onChange(null);
		} else {
			onChange({ tipo_ramo: "Salud", items_asegurados: asegItems, items_beneficiarios: benefItems });
		}
	};

	const toggleAseg = (id: string) => {
		const next = modo === "reemplazo" ? new Set<string>() : new Set(selectedAseguradoIds);
		const otroVacio = modo === "reemplazo" ? new Set<string>() : selectedBeneficiarioIds;
		if (selectedAseguradoIds.has(id)) next.delete(id);
		else next.add(id);
		setSelectedAseguradoIds(next);
		if (modo === "reemplazo") setSelectedBeneficiarioIds(new Set());
		emit(next, otroVacio, aseguradosIncluidos, beneficiariosIncluidos);
	};

	const toggleBenef = (id: string) => {
		const next = modo === "reemplazo" ? new Set<string>() : new Set(selectedBeneficiarioIds);
		const otroVacio = modo === "reemplazo" ? new Set<string>() : selectedAseguradoIds;
		if (selectedBeneficiarioIds.has(id)) next.delete(id);
		else next.add(id);
		setSelectedBeneficiarioIds(next);
		if (modo === "reemplazo") setSelectedAseguradoIds(new Set());
		emit(otroVacio, next, aseguradosIncluidos, beneficiariosIncluidos);
	};

	const agregarBeneficiario = (datos: DatosPersonaMinima) => {
		const nuevo: AnexoItemChange<TitularSalud> = {
			accion: "inclusion",
			data: {
				id: datos.id,
				nombre_completo: datos.nombre_completo,
				carnet: datos.carnet,
				fecha_nacimiento: datos.fecha_nacimiento,
				genero: datos.genero,
				nivel_id: datos.nivel_id,
				descendientes: [],
			},
		};
		emit(selectedAseguradoIds, selectedBeneficiarioIds, aseguradosIncluidos, [...beneficiariosIncluidos, nuevo]);
		setModalBenef(false);
	};

	const agregarAseguradoCliente = () => {
		if (!clientePendiente || !nivelCliente) return;
		const nuevo: AnexoItemChange<ContratanteSalud> = {
			accion: "inclusion",
			data: {
				client_id: clientePendiente.id,
				client_name: clientePendiente.nombre,
				client_ci: clientePendiente.ci,
				nivel_id: nivelCliente,
				rol: "contratante-titular",
			},
		};
		emit(selectedAseguradoIds, selectedBeneficiarioIds, [...aseguradosIncluidos, nuevo], beneficiariosIncluidos);
		setClientePendiente(null);
	};

	const seccionExclusion = (
		<div>
			<p className="text-sm text-gray-600 mb-4">Seleccione las personas que salen de la póliza:</p>
			{asegurados.length > 0 && (
				<div className="mb-4">
					<p className="text-xs text-gray-500 mb-2 font-medium">Asegurados:</p>
					<ExclusionSelector
						items={asegurados}
						selectedIds={selectedAseguradoIds}
						onToggle={toggleAseg}
						renderItem={(a) => (
							<>
								<span className="font-medium col-span-2">{a.client_name}</span>
								<span>{a.client_ci}</span>
								<span>{a.rol}</span>
							</>
						)}
					/>
				</div>
			)}
			{beneficiarios.length > 0 && (
				<div className="mb-4">
					<p className="text-xs text-gray-500 mb-2 font-medium">Beneficiarios:</p>
					<ExclusionSelector
						items={beneficiarios}
						selectedIds={selectedBeneficiarioIds}
						onToggle={toggleBenef}
						renderItem={(b) => (
							<>
								<span className="font-medium col-span-2">{b.nombre_completo}</span>
								<span>{b.carnet}</span>
								<span>titular</span>
							</>
						)}
					/>
				</div>
			)}
			{asegurados.length === 0 && beneficiarios.length === 0 && (
				<p className="text-gray-400 text-sm text-center py-4">No hay asegurados ni beneficiarios registrados</p>
			)}
		</div>
	);

	const seccionInclusion = (
		<div>
			<p className="text-sm text-gray-600 mb-3">Agregue la persona que entra a la póliza:</p>

			{niveles.length === 0 && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-3">
					<AlertCircle className="h-4 w-4 inline mr-1" />
					Esta póliza no tiene niveles de cobertura configurados; no se puede asignar un nivel al nuevo
					asegurado.
				</div>
			)}

			{(aseguradosIncluidos.length > 0 || beneficiariosIncluidos.length > 0) && (
				<div className="mb-3 space-y-2">
					{aseguradosIncluidos.map((item, idx) => (
						<div
							key={`a-${idx}`}
							className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center text-sm"
						>
							<span>
								{item.data.client_name} ({item.data.client_ci}) —{" "}
								{niveles.find((n) => n.id === item.data.nivel_id)?.nombre || "nivel"}
								<Badge variant="outline" className="ml-2 text-xs">
									Asegurado
								</Badge>
							</span>
							<button
								onClick={() =>
									emit(
										selectedAseguradoIds,
										selectedBeneficiarioIds,
										aseguradosIncluidos.filter((_, i) => i !== idx),
										beneficiariosIncluidos,
									)
								}
								className="text-red-500 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))}
					{beneficiariosIncluidos.map((item, idx) => (
						<div
							key={`b-${idx}`}
							className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center text-sm"
						>
							<span>
								{item.data.nombre_completo} ({item.data.carnet}) —{" "}
								{niveles.find((n) => n.id === item.data.nivel_id)?.nombre || "nivel"}
								<Badge variant="outline" className="ml-2 text-xs">
									Beneficiario
								</Badge>
							</span>
							<button
								onClick={() =>
									emit(
										selectedAseguradoIds,
										selectedBeneficiarioIds,
										aseguradosIncluidos,
										beneficiariosIncluidos.filter((_, i) => i !== idx),
									)
								}
								className="text-red-500 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Panel para asignar nivel al cliente recién buscado */}
			{clientePendiente && (
				<div className="border rounded-lg p-3 mb-3 bg-gray-50 space-y-2">
					<p className="text-sm font-medium">
						{clientePendiente.nombre} ({clientePendiente.ci})
					</p>
					<div>
						<Label className="text-xs">Nivel de cobertura</Label>
						<Select value={nivelCliente} onValueChange={setNivelCliente}>
							<SelectTrigger>
								<SelectValue placeholder="Seleccione un nivel" />
							</SelectTrigger>
							<SelectContent>
								{niveles.map((n) => (
									<SelectItem key={n.id} value={n.id}>
										{n.nombre} — {moneda} {n.monto.toLocaleString()}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex gap-2 justify-end">
						<Button variant="outline" size="sm" onClick={() => setClientePendiente(null)}>
							Cancelar
						</Button>
						<Button size="sm" onClick={agregarAseguradoCliente} disabled={!nivelCliente}>
							Agregar asegurado
						</Button>
					</div>
				</div>
			)}

			{puedeAgregar && !clientePendiente && niveles.length > 0 && (
				<div className="flex gap-2 flex-wrap">
					<Button variant="outline" onClick={() => setBuscadorAbierto(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Asegurado (cliente)
					</Button>
					<Button variant="outline" onClick={() => setModalBenef(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Beneficiario / titular
					</Button>
				</div>
			)}
		</div>
	);

	return (
		<div>
			{modo === "reemplazo" ? (
				<>
					<SeccionReemplazo tipo="sale">{seccionExclusion}</SeccionReemplazo>
					<SeccionReemplazo tipo="entra">{seccionInclusion}</SeccionReemplazo>
				</>
			) : mostrarExclusion ? (
				seccionExclusion
			) : (
				<>
					{(asegurados.length > 0 || beneficiarios.length > 0) && (
						<div className="mb-4">
							<p className="text-xs text-gray-500 mb-2 font-medium">Personas actuales en la póliza:</p>
							<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
								{asegurados.map((a) => (
									<div key={a.id} className="text-sm text-gray-600 flex justify-between">
										<span>
											{a.client_name} ({a.rol})
										</span>
										<Badge variant="outline" className="text-xs">
											Asegurado
										</Badge>
									</div>
								))}
								{beneficiarios.map((b) => (
									<div key={b.id} className="text-sm text-gray-600 flex justify-between">
										<span>{b.nombre_completo} (titular)</span>
										<Badge variant="outline" className="text-xs">
											Beneficiario
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}
					{seccionInclusion}
				</>
			)}

			{modalBenef && (
				<BeneficiarioModal
					beneficiario={null}
					niveles={niveles}
					moneda={moneda}
					hideRol
					titulo="Agregar Beneficiario / Titular"
					onGuardar={agregarBeneficiario}
					onCancelar={() => setModalBenef(false)}
				/>
			)}

			{buscadorAbierto && (
				<BuscadorClientes
					onSeleccionar={(cliente) => {
						setClientePendiente(cliente);
						setNivelCliente(niveles[0]?.id || "");
						setBuscadorAbierto(false);
					}}
					onCancelar={() => setBuscadorAbierto(false)}
					clientesExcluidos={aseguradosIncluidos.map((a) => a.data.client_id)}
				/>
			)}
		</div>
	);
}

// ============================================
// BIENES (Incendio / Riesgos Varios)
// ============================================

function AnexoBienes<T extends BienAseguradoIncendio | BienAseguradoRiesgosVarios>({
	modo,
	itemsDisponibles,
	moneda,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	modo: ModoAnexo;
	itemsDisponibles: readonly string[];
	moneda: Moneda;
	itemsActuales: (T & { id: string })[];
	itemsCambio: AnexoItemChange<T>[];
	onChange: (items: AnexoItemChange<T>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!)),
	);
	const [modalAbierto, setModalAbierto] = useState(false);

	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");
	const mostrarExclusion = modo === "exclusion" || modo === "reemplazo";

	const emit = (ids: Set<string>, incs: AnexoItemChange<T>[]) => {
		const exclusiones: AnexoItemChange<T>[] = Array.from(ids).map((itemId) => ({
			accion: "exclusion",
			original_item_id: itemId,
			data: itemsActuales.find((x) => x.id === itemId)!,
		}));
		onChange([...exclusiones, ...incs]);
	};

	const handleToggle = (id: string) => {
		const newSet = modo === "reemplazo" ? new Set<string>() : new Set(selectedIds);
		if (selectedIds.has(id)) newSet.delete(id);
		else newSet.add(id);
		setSelectedIds(newSet);
		emit(newSet, inclusiones);
	};

	const puedeAgregar = modo !== "reemplazo" || inclusiones.length === 0;

	const seccionExclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Seleccione el/los bien(es) que salen de la póliza:</p>
			<ExclusionSelector
				items={itemsActuales}
				selectedIds={selectedIds}
				onToggle={handleToggle}
				renderItem={(b) => (
					<>
						<span className="font-medium col-span-3">{b.direccion}</span>
						<span className="text-right">{b.valor_total_declarado.toLocaleString()}</span>
					</>
				)}
			/>
		</>
	);

	const seccionInclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Agregue el/los bien(es) que entran en la póliza:</p>
			{inclusiones.length > 0 && (
				<div className="mb-4 space-y-2">
					{inclusiones.map((item, idx) => (
						<div
							key={idx}
							className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center text-sm"
						>
							<span>
								{item.data.direccion} — {moneda} {item.data.valor_total_declarado.toLocaleString()}
							</span>
							<button
								onClick={() =>
									emit(
										selectedIds,
										inclusiones.filter((_, i) => i !== idx),
									)
								}
								className="text-red-500 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			)}
			{puedeAgregar && (
				<Button variant="outline" onClick={() => setModalAbierto(true)}>
					<Plus className="h-4 w-4 mr-1" />
					Agregar Bien
				</Button>
			)}
		</>
	);

	return (
		<div>
			{modo === "reemplazo" ? (
				<>
					<SeccionReemplazo tipo="sale">{seccionExclusion}</SeccionReemplazo>
					<SeccionReemplazo tipo="entra">{seccionInclusion}</SeccionReemplazo>
				</>
			) : mostrarExclusion ? (
				seccionExclusion
			) : (
				<>
					{itemsActuales.length > 0 && (
						<div className="mb-4">
							<p className="text-xs text-gray-500 mb-2 font-medium">Bienes actuales (solo lectura):</p>
							<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
								{itemsActuales.map((b) => (
									<div key={b.id} className="text-sm text-gray-600 flex justify-between">
										<span>{b.direccion}</span>
										<span>{b.valor_total_declarado.toLocaleString()}</span>
									</div>
								))}
							</div>
						</div>
					)}
					{seccionInclusion}
				</>
			)}

			{modalAbierto && (
				<BienModal
					bien={null}
					itemsDisponibles={itemsDisponibles}
					moneda={moneda}
					permitirCeroAsegurado
					onGuardar={(bien: BienGenerico) => {
						const nuevo = { accion: "inclusion", data: bien as unknown as T } as AnexoItemChange<T>;
						emit(selectedIds, [...inclusiones, nuevo]);
						setModalAbierto(false);
					}}
					onCancelar={() => setModalAbierto(false)}
				/>
			)}
		</div>
	);
}

// ============================================
// ASEGURADOS CON NIVEL (Vida / Sepelio / AP)
// ============================================

function AnexoAseguradosNivel({
	modo,
	niveles,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	modo: ModoAnexo;
	niveles: NivelCobertura[];
	itemsActuales: (AseguradoConNivel & { id: string })[];
	itemsCambio: AnexoItemChange<AseguradoConNivel>[];
	onChange: (items: AnexoItemChange<AseguradoConNivel>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!)),
	);
	const [buscadorAbierto, setBuscadorAbierto] = useState(false);
	const [clientePendiente, setClientePendiente] = useState<{ id: string; nombre: string; ci: string } | null>(null);
	const [nivelSel, setNivelSel] = useState<string>(niveles[0]?.id || "");
	const [cargo, setCargo] = useState<string>("");

	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");
	const mostrarExclusion = modo === "exclusion" || modo === "reemplazo";
	const puedeAgregar = modo !== "reemplazo" || inclusiones.length === 0;

	const emit = (ids: Set<string>, incs: AnexoItemChange<AseguradoConNivel>[]) => {
		const exclusiones: AnexoItemChange<AseguradoConNivel>[] = Array.from(ids).map((itemId) => ({
			accion: "exclusion",
			original_item_id: itemId,
			data: itemsActuales.find((x) => x.id === itemId)!,
		}));
		onChange([...exclusiones, ...incs]);
	};

	const handleToggle = (id: string) => {
		const newSet = modo === "reemplazo" ? new Set<string>() : new Set(selectedIds);
		if (selectedIds.has(id)) newSet.delete(id);
		else newSet.add(id);
		setSelectedIds(newSet);
		emit(newSet, inclusiones);
	};

	const agregarAsegurado = () => {
		if (!clientePendiente || !nivelSel) return;
		const nuevo: AnexoItemChange<AseguradoConNivel> = {
			accion: "inclusion",
			data: {
				client_id: clientePendiente.id,
				client_name: clientePendiente.nombre,
				client_ci: clientePendiente.ci,
				nivel_id: nivelSel,
				cargo: cargo.trim() || undefined,
			},
		};
		emit(selectedIds, [...inclusiones, nuevo]);
		setClientePendiente(null);
		setCargo("");
	};

	const seccionExclusion = (
		<>
			<p className="text-sm text-gray-600 mb-4">Seleccione el/los asegurado(s) que salen de la póliza:</p>
			<ExclusionSelector
				items={itemsActuales}
				selectedIds={selectedIds}
				onToggle={handleToggle}
				renderItem={(a) => (
					<>
						<span className="font-medium col-span-2">{a.client_name}</span>
						<span>{a.client_ci}</span>
						<span>{a.cargo || "-"}</span>
					</>
				)}
			/>
		</>
	);

	const seccionInclusion = (
		<>
			<p className="text-sm text-gray-600 mb-3">Agregue el asegurado que entra a la póliza:</p>

			{niveles.length === 0 && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 mb-3">
					<AlertCircle className="h-4 w-4 inline mr-1" />
					Esta póliza no tiene niveles de cobertura configurados; no se puede asignar un nivel al nuevo
					asegurado.
				</div>
			)}

			{inclusiones.length > 0 && (
				<div className="mb-3 space-y-2">
					{inclusiones.map((item, idx) => (
						<div
							key={idx}
							className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center text-sm"
						>
							<span>
								{item.data.client_name} ({item.data.client_ci}) —{" "}
								{niveles.find((n) => n.id === item.data.nivel_id)?.nombre || "nivel"}
								{item.data.cargo ? ` · ${item.data.cargo}` : ""}
							</span>
							<button
								onClick={() =>
									emit(
										selectedIds,
										inclusiones.filter((_, i) => i !== idx),
									)
								}
								className="text-red-500 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			)}

			{clientePendiente && (
				<div className="border rounded-lg p-3 mb-3 bg-gray-50 space-y-2">
					<p className="text-sm font-medium">
						{clientePendiente.nombre} ({clientePendiente.ci})
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						<div>
							<Label className="text-xs">Nivel de cobertura</Label>
							<Select value={nivelSel} onValueChange={setNivelSel}>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione un nivel" />
								</SelectTrigger>
								<SelectContent>
									{niveles.map((n) => (
										<SelectItem key={n.id} value={n.id}>
											{n.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-xs">Cargo (opcional)</Label>
							<Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej: Gerente" />
						</div>
					</div>
					<div className="flex gap-2 justify-end">
						<Button variant="outline" size="sm" onClick={() => setClientePendiente(null)}>
							Cancelar
						</Button>
						<Button size="sm" onClick={agregarAsegurado} disabled={!nivelSel}>
							Agregar asegurado
						</Button>
					</div>
				</div>
			)}

			{puedeAgregar && !clientePendiente && niveles.length > 0 && (
				<Button variant="outline" onClick={() => setBuscadorAbierto(true)}>
					<Plus className="h-4 w-4 mr-1" />
					Agregar asegurado
				</Button>
			)}
		</>
	);

	return (
		<div>
			{modo === "reemplazo" ? (
				<>
					<SeccionReemplazo tipo="sale">{seccionExclusion}</SeccionReemplazo>
					<SeccionReemplazo tipo="entra">{seccionInclusion}</SeccionReemplazo>
				</>
			) : mostrarExclusion ? (
				seccionExclusion
			) : (
				<>
					{itemsActuales.length > 0 && (
						<div className="mb-4">
							<p className="text-xs text-gray-500 mb-2 font-medium">
								Asegurados actuales (solo lectura):
							</p>
							<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
								{itemsActuales.map((a) => (
									<div key={a.id} className="text-sm text-gray-600 flex justify-between">
										<span>
											{a.client_name} — {a.client_ci}
										</span>
										<span>{a.cargo || "-"}</span>
									</div>
								))}
							</div>
						</div>
					)}
					{seccionInclusion}
				</>
			)}

			{buscadorAbierto && (
				<BuscadorClientes
					onSeleccionar={(cliente) => {
						setClientePendiente(cliente);
						setNivelSel(niveles[0]?.id || "");
						setBuscadorAbierto(false);
					}}
					onCancelar={() => setBuscadorAbierto(false)}
					clientesExcluidos={inclusiones.map((i) => i.data.client_id)}
				/>
			)}
		</div>
	);
}
