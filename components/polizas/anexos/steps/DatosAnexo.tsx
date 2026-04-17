"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Trash2, CheckSquare, AlertCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnexoItemsCambio, AnexoItemChange, ItemsActualesRamo, TipoAnexo } from "@/types/anexo";
import type {
	VehiculoAutomotor,
	EquipoIndustrial,
	NaveEmbarcacion,
	ContratanteSalud,
	TitularSalud,
	AseguradoConNivel,
} from "@/types/poliza";

// Modals reutilizados de la creación de pólizas
import { VehiculoModal } from "../../ramos/VehiculoModal";
import { EquipoModal } from "../../ramos/EquipoModal";
import { NaveModal } from "../../ramos/NaveModal";

type Props = {
	tipoAnexo: TipoAnexo;
	ramo: string;
	itemsActuales: ItemsActualesRamo | null;
	itemsCambio: AnexoItemsCambio | null;
	onChange: (items: AnexoItemsCambio | null) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function DatosAnexo({ tipoAnexo, ramo, itemsActuales, itemsCambio, onChange, onSiguiente, onAnterior }: Props) {
	const ramoLower = ramo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	// Ramos que no soportan inclusión/exclusión de items
	const ramoSoportaItems = !(
		ramoLower.includes("transporte") ||
		ramoLower.includes("responsabilidad civil")
	);

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
							El ramo <strong>{ramo}</strong> no soporta inclusión/exclusión de items.
							Solo se permite la anulación para este tipo de seguro.
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

	return (
		<div className="bg-white border rounded-lg p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-4">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
					3
				</div>
				<h2 className="text-lg font-semibold">
					{tipoAnexo === "inclusion" ? "Datos a Incluir" : "Datos a Excluir"}
				</h2>
				<Badge variant={tipoAnexo === "inclusion" ? "default" : "destructive"}>
					{tipoAnexo === "inclusion" ? "Inclusión" : "Exclusión"}
				</Badge>
			</div>

			{/* Router por ramo */}
			{ramoLower.includes("automotor") && (
				<AnexoAutomotor
					tipoAnexo={tipoAnexo}
					itemsActuales={itemsActuales?.tipo_ramo === "Automotores" ? itemsActuales.vehiculos : []}
					itemsCambio={itemsCambio?.tipo_ramo === "Automotores" ? itemsCambio.items : []}
					onChange={(items) =>
						onChange(items.length > 0 ? { tipo_ramo: "Automotores", items } : null)
					}
				/>
			)}

			{(ramoLower.includes("ramo") && ramoLower.includes("tecnico")) && (
				<AnexoRamosTecnicos
					tipoAnexo={tipoAnexo}
					itemsActuales={itemsActuales?.tipo_ramo === "Ramos técnicos" ? itemsActuales.equipos : []}
					itemsCambio={itemsCambio?.tipo_ramo === "Ramos técnicos" ? itemsCambio.items : []}
					onChange={(items) =>
						onChange(items.length > 0 ? { tipo_ramo: "Ramos técnicos", items } : null)
					}
				/>
			)}

			{ramoLower.includes("aeronavegacion") && (
				<AnexoAeronavegacion
					tipoAnexo={tipoAnexo}
					tipoNave="aeronave"
					itemsActuales={itemsActuales?.tipo_ramo === "Aeronavegación" ? itemsActuales.naves : []}
					itemsCambio={
						itemsCambio?.tipo_ramo === "Aeronavegación" || itemsCambio?.tipo_ramo === "Naves o embarcaciones"
							? itemsCambio.items : []
					}
					onChange={(items) =>
						onChange(items.length > 0 ? { tipo_ramo: "Aeronavegación", items } : null)
					}
				/>
			)}

			{(ramoLower.includes("nave") || ramoLower.includes("embarcacion")) && !ramoLower.includes("aeronavegacion") && (
				<AnexoAeronavegacion
					tipoAnexo={tipoAnexo}
					tipoNave="embarcacion"
					itemsActuales={itemsActuales?.tipo_ramo === "Naves o embarcaciones" ? itemsActuales.naves : []}
					itemsCambio={
						itemsCambio?.tipo_ramo === "Naves o embarcaciones"
							? itemsCambio.items : []
					}
					onChange={(items) =>
						onChange(items.length > 0 ? { tipo_ramo: "Naves o embarcaciones", items } : null)
					}
				/>
			)}

			{(ramoLower.includes("salud") || ramoLower.includes("enfermedad")) && (
				<AnexoSalud
					tipoAnexo={tipoAnexo}
					ramo={ramo}
					itemsActuales={itemsActuales?.tipo_ramo === "Salud" ? itemsActuales : null}
					itemsCambio={itemsCambio?.tipo_ramo === "Salud" ? itemsCambio : null}
					onChange={(cambio) => onChange(cambio)}
				/>
			)}

			{ramoLower.includes("incendio") && (
				<AnexoBienes
					tipoAnexo={tipoAnexo}
					ramo={ramo}
					itemsActuales={itemsActuales?.tipo_ramo === "Incendio y Aliados" ? itemsActuales.bienes : []}
					itemsCambio={itemsCambio?.tipo_ramo === "Incendio y Aliados" ? itemsCambio.items : []}
					onChange={(items) =>
						onChange(items.length > 0 ? { tipo_ramo: "Incendio y Aliados", items } : null)
					}
				/>
			)}

			{(ramoLower.includes("riesgo") && ramoLower.includes("vario")) && (
				<AnexoBienes
					tipoAnexo={tipoAnexo}
					ramo={ramo}
					itemsActuales={itemsActuales?.tipo_ramo === "Riesgos Varios Misceláneos" ? itemsActuales.bienes : []}
					itemsCambio={itemsCambio?.tipo_ramo === "Riesgos Varios Misceláneos" ? itemsCambio.items : []}
					onChange={(items) =>
						onChange(items.length > 0 ? { tipo_ramo: "Riesgos Varios Misceláneos", items } : null)
					}
				/>
			)}

			{(ramoLower.includes("vida") || ramoLower.includes("sepelio") || ramoLower.includes("defuncion") ||
				(ramoLower.includes("accidente") && ramoLower.includes("personal"))) && (
				<AnexoAseguradosNivel
					tipoAnexo={tipoAnexo}
					ramo={ramo}
					itemsActuales={
						itemsActuales?.tipo_ramo === "Vida" || itemsActuales?.tipo_ramo === "Sepelio" || itemsActuales?.tipo_ramo === "Accidentes Personales"
							? itemsActuales.asegurados : []
					}
					itemsCambio={
						itemsCambio?.tipo_ramo === "Vida" || itemsCambio?.tipo_ramo === "Sepelio" || itemsCambio?.tipo_ramo === "Accidentes Personales"
							? itemsCambio.items : []
					}
					onChange={(items) => {
						const tipo = ramoLower.includes("vida") ? "Vida"
							: ramoLower.includes("sepelio") || ramoLower.includes("defuncion") ? "Sepelio"
								: "Accidentes Personales";
						onChange(items.length > 0 ? { tipo_ramo: tipo, items } : null);
					}}
				/>
			)}

			{/* Navegación */}
			<div className="flex justify-between mt-6">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="h-4 w-4 mr-1" />
					Anterior
				</Button>
				<Button onClick={onSiguiente}>
					Siguiente
					<ChevronRight className="h-4 w-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}

// ============================================
// COMPONENTE GENÉRICO DE EXCLUSIÓN CON CHECKBOXES
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
						<div className="flex-1 grid grid-cols-4 gap-2 text-sm">
							{renderItem(item)}
						</div>
						{isSelected && <Trash2 className="h-4 w-4 text-red-400" />}
					</div>
				);
			})}

			{selectedIds.size > 0 && (
				<p className="text-sm text-red-600 mt-3">
					{selectedIds.size} item(s) marcado(s) para exclusión
				</p>
			)}
		</div>
	);
}

// ============================================
// AUTOMOTOR (VehiculoModal)
// ============================================

function AnexoAutomotor({
	tipoAnexo,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	tipoAnexo: TipoAnexo;
	itemsActuales: (VehiculoAutomotor & { id: string })[];
	itemsCambio: AnexoItemChange<VehiculoAutomotor>[];
	onChange: (items: AnexoItemChange<VehiculoAutomotor>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!))
	);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoAutomotor | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);

	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");

	if (tipoAnexo === "exclusion") {
		const handleToggle = (id: string) => {
			const newSet = new Set(selectedIds);
			if (newSet.has(id)) newSet.delete(id);
			else newSet.add(id);
			setSelectedIds(newSet);
			onChange(
				Array.from(newSet).map((itemId) => ({
					accion: "exclusion",
					original_item_id: itemId,
					data: itemsActuales.find((x) => x.id === itemId)!,
				}))
			);
		};

		return (
			<div>
				<p className="text-sm text-gray-600 mb-4">
					Seleccione los vehículos que desea excluir de la póliza:
				</p>
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
			</div>
		);
	}

	// Inclusión
	return (
		<div>
			<p className="text-sm text-gray-600 mb-4">
				Agregue los nuevos vehículos que desea incluir en la póliza:
			</p>

			{itemsActuales.length > 0 && (
				<div className="mb-4">
					<p className="text-xs text-gray-500 mb-2 font-medium">Vehículos actuales (solo lectura):</p>
					<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
						{itemsActuales.map((v) => (
							<div key={v.id} className="text-sm text-gray-600 flex justify-between">
								<span>{v.placa} — {v.nro_chasis}</span>
								<span>{v.valor_asegurado.toLocaleString()}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{inclusiones.length > 0 && (
				<div className="mb-4 space-y-2">
					<p className="text-xs text-gray-500 mb-1 font-medium">Vehículos a incluir:</p>
					{inclusiones.map((item, idx) => (
						<div key={idx} className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center">
							<span className="text-sm">
								{item.data.placa} — {item.data.nro_chasis} — {item.data.valor_asegurado.toLocaleString()}
							</span>
							<div className="flex gap-1">
								<button
									onClick={() => { setVehiculoEditando(item.data); setIndexEditando(idx); setModalAbierto(true); }}
									className="text-blue-500 hover:text-blue-700"
								>
									<Edit className="h-4 w-4" />
								</button>
								<button
									onClick={() => {
										const newItems = inclusiones.filter((_, i) => i !== idx);
										onChange(newItems.map((it) => ({ accion: "inclusion" as const, data: it.data })));
									}}
									className="text-red-500 hover:text-red-700"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<Button variant="outline" onClick={() => { setVehiculoEditando(null); setIndexEditando(null); setModalAbierto(true); }}>
				<Plus className="h-4 w-4 mr-1" />
				Agregar Vehículo
			</Button>

			{modalAbierto && (
				<VehiculoModal
					vehiculo={vehiculoEditando}
					onGuardar={(vehiculo) => {
						let newInclusiones: AnexoItemChange<VehiculoAutomotor>[];
						if (indexEditando !== null) {
							newInclusiones = [...inclusiones];
							newInclusiones[indexEditando] = { accion: "inclusion", data: vehiculo };
						} else {
							newInclusiones = [...inclusiones, { accion: "inclusion", data: vehiculo }];
						}
						onChange(newInclusiones);
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
	tipoAnexo,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	tipoAnexo: TipoAnexo;
	itemsActuales: (EquipoIndustrial & { id: string })[];
	itemsCambio: AnexoItemChange<EquipoIndustrial>[];
	onChange: (items: AnexoItemChange<EquipoIndustrial>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!))
	);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [equipoEditando, setEquipoEditando] = useState<EquipoIndustrial | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);

	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");

	if (tipoAnexo === "exclusion") {
		const handleToggle = (id: string) => {
			const newSet = new Set(selectedIds);
			if (newSet.has(id)) newSet.delete(id);
			else newSet.add(id);
			setSelectedIds(newSet);
			onChange(
				Array.from(newSet).map((itemId) => ({
					accion: "exclusion",
					original_item_id: itemId,
					data: itemsActuales.find((x) => x.id === itemId)!,
				}))
			);
		};

		return (
			<div>
				<p className="text-sm text-gray-600 mb-4">
					Seleccione los equipos que desea excluir de la póliza:
				</p>
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
			</div>
		);
	}

	return (
		<div>
			<p className="text-sm text-gray-600 mb-4">
				Agregue los nuevos equipos que desea incluir en la póliza:
			</p>

			{itemsActuales.length > 0 && (
				<div className="mb-4">
					<p className="text-xs text-gray-500 mb-2 font-medium">Equipos actuales (solo lectura):</p>
					<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
						{itemsActuales.map((e) => (
							<div key={e.id} className="text-sm text-gray-600 flex justify-between">
								<span>{e.nro_serie} — {e.nro_chasis}</span>
								<span>{e.valor_asegurado.toLocaleString()}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{inclusiones.length > 0 && (
				<div className="mb-4 space-y-2">
					<p className="text-xs text-gray-500 mb-1 font-medium">Equipos a incluir:</p>
					{inclusiones.map((item, idx) => (
						<div key={idx} className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center">
							<span className="text-sm">
								{item.data.nro_serie} — {item.data.nro_chasis} — {item.data.valor_asegurado.toLocaleString()}
							</span>
							<div className="flex gap-1">
								<button
									onClick={() => { setEquipoEditando(item.data); setIndexEditando(idx); setModalAbierto(true); }}
									className="text-blue-500 hover:text-blue-700"
								>
									<Edit className="h-4 w-4" />
								</button>
								<button
									onClick={() => {
										const newItems = inclusiones.filter((_, i) => i !== idx);
										onChange(newItems.map((it) => ({ accion: "inclusion" as const, data: it.data })));
									}}
									className="text-red-500 hover:text-red-700"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<Button variant="outline" onClick={() => { setEquipoEditando(null); setIndexEditando(null); setModalAbierto(true); }}>
				<Plus className="h-4 w-4 mr-1" />
				Agregar Equipo
			</Button>

			{modalAbierto && (
				<EquipoModal
					equipo={equipoEditando}
					onGuardar={(equipo) => {
						let newInclusiones: AnexoItemChange<EquipoIndustrial>[];
						if (indexEditando !== null) {
							newInclusiones = [...inclusiones];
							newInclusiones[indexEditando] = { accion: "inclusion", data: equipo };
						} else {
							newInclusiones = [...inclusiones, { accion: "inclusion", data: equipo }];
						}
						onChange(newInclusiones);
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
	tipoAnexo,
	tipoNave,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	tipoAnexo: TipoAnexo;
	tipoNave: "aeronave" | "embarcacion";
	itemsActuales: (NaveEmbarcacion & { id: string })[];
	itemsCambio: AnexoItemChange<NaveEmbarcacion>[];
	onChange: (items: AnexoItemChange<NaveEmbarcacion>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!))
	);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [naveEditando, setNaveEditando] = useState<NaveEmbarcacion | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);

	const label = tipoNave === "aeronave" ? "aeronave" : "embarcación";
	const labelPlural = tipoNave === "aeronave" ? "aeronaves" : "embarcaciones";
	const inclusiones = itemsCambio.filter((i) => i.accion === "inclusion");

	if (tipoAnexo === "exclusion") {
		const handleToggle = (id: string) => {
			const newSet = new Set(selectedIds);
			if (newSet.has(id)) newSet.delete(id);
			else newSet.add(id);
			setSelectedIds(newSet);
			onChange(
				Array.from(newSet).map((itemId) => ({
					accion: "exclusion",
					original_item_id: itemId,
					data: itemsActuales.find((x) => x.id === itemId)!,
				}))
			);
		};

		return (
			<div>
				<p className="text-sm text-gray-600 mb-4">
					Seleccione las {labelPlural} que desea excluir:
				</p>
				<ExclusionSelector
					items={itemsActuales}
					selectedIds={selectedIds}
					onToggle={handleToggle}
					renderItem={(n) => (
						<>
							<span className="font-medium">{n.matricula}</span>
							<span>{n.marca} {n.modelo}</span>
							<span>{n.uso}</span>
							<span className="text-right">{n.valor_casco.toLocaleString()}</span>
						</>
					)}
				/>
			</div>
		);
	}

	return (
		<div>
			<p className="text-sm text-gray-600 mb-4">
				Agregue las nuevas {labelPlural} que desea incluir:
			</p>

			{itemsActuales.length > 0 && (
				<div className="mb-4">
					<p className="text-xs text-gray-500 mb-2 font-medium">{tipoNave === "aeronave" ? "Aeronaves" : "Embarcaciones"} actuales (solo lectura):</p>
					<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
						{itemsActuales.map((n) => (
							<div key={n.id} className="text-sm text-gray-600 flex justify-between">
								<span>{n.matricula} — {n.marca} {n.modelo}</span>
								<span>{n.valor_casco.toLocaleString()}</span>
							</div>
						))}
					</div>
				</div>
			)}

			{inclusiones.length > 0 && (
				<div className="mb-4 space-y-2">
					<p className="text-xs text-gray-500 mb-1 font-medium">{tipoNave === "aeronave" ? "Aeronaves" : "Embarcaciones"} a incluir:</p>
					{inclusiones.map((item, idx) => (
						<div key={idx} className="border border-green-200 bg-green-50 rounded-lg p-3 flex justify-between items-center">
							<span className="text-sm">
								{item.data.matricula} — {item.data.marca} {item.data.modelo} — {item.data.valor_casco.toLocaleString()}
							</span>
							<div className="flex gap-1">
								<button
									onClick={() => { setNaveEditando(item.data); setIndexEditando(idx); setModalAbierto(true); }}
									className="text-blue-500 hover:text-blue-700"
								>
									<Edit className="h-4 w-4" />
								</button>
								<button
									onClick={() => {
										const newItems = inclusiones.filter((_, i) => i !== idx);
										onChange(newItems.map((it) => ({ accion: "inclusion" as const, data: it.data })));
									}}
									className="text-red-500 hover:text-red-700"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<Button variant="outline" onClick={() => { setNaveEditando(null); setIndexEditando(null); setModalAbierto(true); }}>
				<Plus className="h-4 w-4 mr-1" />
				Agregar {label}
			</Button>

			{modalAbierto && (
				<NaveModal
					nave={naveEditando}
					nivelesAP={[]}
					tipoNave={tipoNave}
					onGuardar={(nave) => {
						let newInclusiones: AnexoItemChange<NaveEmbarcacion>[];
						if (indexEditando !== null) {
							newInclusiones = [...inclusiones];
							newInclusiones[indexEditando] = { accion: "inclusion", data: nave };
						} else {
							newInclusiones = [...inclusiones, { accion: "inclusion", data: nave }];
						}
						onChange(newInclusiones);
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
	tipoAnexo,
	ramo,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	tipoAnexo: TipoAnexo;
	ramo: string;
	itemsActuales: { tipo_ramo: "Salud"; asegurados: (ContratanteSalud & { id: string })[]; beneficiarios: (TitularSalud & { id: string })[] } | null;
	itemsCambio: { tipo_ramo: "Salud"; items_asegurados: AnexoItemChange<ContratanteSalud>[]; items_beneficiarios: AnexoItemChange<TitularSalud>[] } | null;
	onChange: (cambio: AnexoItemsCambio | null) => void;
}) {
	const asegurados = itemsActuales?.asegurados || [];
	const beneficiarios = itemsActuales?.beneficiarios || [];
	const [selectedAseguradoIds, setSelectedAseguradoIds] = useState<Set<string>>(
		new Set(itemsCambio?.items_asegurados.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!) || [])
	);
	const [selectedBeneficiarioIds, setSelectedBeneficiarioIds] = useState<Set<string>>(
		new Set(itemsCambio?.items_beneficiarios.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!) || [])
	);

	const emitChange = (asegIds: Set<string>, benefIds: Set<string>) => {
		const asegItems: AnexoItemChange<ContratanteSalud>[] = Array.from(asegIds).map((id) => ({
			accion: "exclusion",
			original_item_id: id,
			data: asegurados.find((a) => a.id === id)!,
		}));
		const benefItems: AnexoItemChange<TitularSalud>[] = Array.from(benefIds).map((id) => ({
			accion: "exclusion",
			original_item_id: id,
			data: beneficiarios.find((b) => b.id === id)!,
		}));

		if (asegItems.length === 0 && benefItems.length === 0) {
			onChange(null);
		} else {
			onChange({
				tipo_ramo: "Salud",
				items_asegurados: asegItems,
				items_beneficiarios: benefItems,
			});
		}
	};

	if (tipoAnexo === "exclusion") {
		return (
			<div>
				<p className="text-sm text-gray-600 mb-4">
					Seleccione los asegurados y beneficiarios que desea excluir:
				</p>

				{asegurados.length > 0 && (
					<div className="mb-4">
						<p className="text-xs text-gray-500 mb-2 font-medium">Asegurados:</p>
						<ExclusionSelector
							items={asegurados}
							selectedIds={selectedAseguradoIds}
							onToggle={(id) => {
								const newSet = new Set(selectedAseguradoIds);
								if (newSet.has(id)) newSet.delete(id);
								else newSet.add(id);
								setSelectedAseguradoIds(newSet);
								emitChange(newSet, selectedBeneficiarioIds);
							}}
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
							onToggle={(id) => {
								const newSet = new Set(selectedBeneficiarioIds);
								if (newSet.has(id)) newSet.delete(id);
								else newSet.add(id);
								setSelectedBeneficiarioIds(newSet);
								emitChange(selectedAseguradoIds, newSet);
							}}
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
	}

	// Inclusión — requiere niveles de cobertura
	return (
		<div>
			{(asegurados.length > 0 || beneficiarios.length > 0) && (
				<div className="mb-4">
					<p className="text-xs text-gray-500 mb-2 font-medium">Personas actuales en la póliza:</p>
					<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
						{asegurados.map((a) => (
							<div key={a.id} className="text-sm text-gray-600 flex justify-between">
								<span>{a.client_name} ({a.rol})</span>
								<Badge variant="outline" className="text-xs">Asegurado</Badge>
							</div>
						))}
						{beneficiarios.map((b) => (
							<div key={b.id} className="text-sm text-gray-600 flex justify-between">
								<span>{b.nombre_completo} (titular)</span>
								<Badge variant="outline" className="text-xs">Beneficiario</Badge>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
				<AlertCircle className="h-4 w-4 inline mr-1" />
				La inclusión de asegurados en pólizas de {ramo} requiere la configuración de niveles de cobertura.
				Esta funcionalidad estará disponible próximamente. Puede continuar y registrar el ajuste de pagos y documentos.
			</div>
		</div>
	);
}

// ============================================
// BIENES (Incendio / Riesgos Varios)
// ============================================

function AnexoBienes<T extends { direccion: string; valor_total_declarado: number }>({
	tipoAnexo,
	ramo,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	tipoAnexo: TipoAnexo;
	ramo: string;
	itemsActuales: (T & { id: string })[];
	itemsCambio: AnexoItemChange<T>[];
	onChange: (items: AnexoItemChange<T>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!))
	);

	if (tipoAnexo === "exclusion") {
		const handleToggle = (id: string) => {
			const newSet = new Set(selectedIds);
			if (newSet.has(id)) newSet.delete(id);
			else newSet.add(id);
			setSelectedIds(newSet);
			onChange(
				Array.from(newSet).map((itemId) => ({
					accion: "exclusion",
					original_item_id: itemId,
					data: itemsActuales.find((x) => x.id === itemId)!,
				}))
			);
		};

		return (
			<div>
				<p className="text-sm text-gray-600 mb-4">
					Seleccione los bienes que desea excluir de la póliza:
				</p>
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
			</div>
		);
	}

	// Inclusión — bienes tienen estructura compleja (items internos)
	return (
		<div>
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

			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
				<AlertCircle className="h-4 w-4 inline mr-1" />
				La inclusión de bienes en pólizas de {ramo} requiere la configuración de items asegurados por ubicación.
				Esta funcionalidad estará disponible próximamente. Puede continuar y registrar el ajuste de pagos y documentos.
			</div>
		</div>
	);
}

// ============================================
// ASEGURADOS CON NIVEL (Vida / Sepelio / AP)
// ============================================

function AnexoAseguradosNivel({
	tipoAnexo,
	ramo,
	itemsActuales,
	itemsCambio,
	onChange,
}: {
	tipoAnexo: TipoAnexo;
	ramo: string;
	tipoRamo?: "Accidentes Personales" | "Vida" | "Sepelio";
	itemsActuales: (AseguradoConNivel & { id: string })[];
	itemsCambio: AnexoItemChange<AseguradoConNivel>[];
	onChange: (items: AnexoItemChange<AseguradoConNivel>[]) => void;
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(itemsCambio.filter((i) => i.accion === "exclusion").map((i) => i.original_item_id!))
	);

	if (tipoAnexo === "exclusion") {
		const handleToggle = (id: string) => {
			const newSet = new Set(selectedIds);
			if (newSet.has(id)) newSet.delete(id);
			else newSet.add(id);
			setSelectedIds(newSet);
			onChange(
				Array.from(newSet).map((itemId) => ({
					accion: "exclusion",
					original_item_id: itemId,
					data: itemsActuales.find((x) => x.id === itemId)!,
				}))
			);
		};

		return (
			<div>
				<p className="text-sm text-gray-600 mb-4">
					Seleccione los asegurados que desea excluir de la póliza:
				</p>
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
			</div>
		);
	}

	// Inclusión — requiere niveles de cobertura
	return (
		<div>
			{itemsActuales.length > 0 && (
				<div className="mb-4">
					<p className="text-xs text-gray-500 mb-2 font-medium">Asegurados actuales (solo lectura):</p>
					<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
						{itemsActuales.map((a) => (
							<div key={a.id} className="text-sm text-gray-600 flex justify-between">
								<span>{a.client_name} — {a.client_ci}</span>
								<span>{a.cargo || "-"}</span>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
				<AlertCircle className="h-4 w-4 inline mr-1" />
				La inclusión de asegurados en pólizas de {ramo} requiere la configuración de niveles de cobertura.
				Esta funcionalidad estará disponible próximamente. Puede continuar y registrar el ajuste de pagos y documentos.
			</div>
		</div>
	);
}
