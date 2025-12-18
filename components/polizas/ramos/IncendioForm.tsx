"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus, Trash2, Users, Home, Edit2, AlertCircle } from "lucide-react";
import type { DatosIncendio, BienAseguradoIncendio, AseguradoIncendio, ItemIncendio } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BuscadorClientes } from "../BuscadorClientes";

type Props = {
	datos: DatosIncendio | null;
	regionales: Array<{ id: string; nombre: string }>;
	onChange: (datos: DatosIncendio) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Tipos de items predefinidos
const ITEMS_DISPONIBLES: ItemIncendio["nombre"][] = [
	"Edificaciones, instalaciones en general",
	"Activos fijos en general",
	"Equipos electronicos",
	"Maquinaria fija o equipos",
	"Existencias (mercaderia)",
	"Dinero y valores dentro del predio",
	"Vidrios y cristales",
];

export function IncendioForm({ datos, regionales, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(datos?.tipo_poliza || "individual");
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [bienes, setBienes] = useState<BienAseguradoIncendio[]>(datos?.bienes || []);
	const [asegurados, setAsegurados] = useState<AseguradoIncendio[]>(datos?.asegurados || []);

	// Estados para modal de bien
	const [mostrarModalBien, setMostrarModalBien] = useState(false);
	const [bienEditando, setBienEditando] = useState<number | null>(null);
	const [direccionBien, setDireccionBien] = useState("");
	const [itemsBien, setItemsBien] = useState<ItemIncendio[]>([]);
	const [valorTotalDeclarado, setValorTotalDeclarado] = useState<number>(0);
	const [esPrimerRiesgo, setEsPrimerRiesgo] = useState(false);

	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// Calcular valor total cuando cambian los items
	useEffect(() => {
		const total = itemsBien.reduce((sum, item) => sum + item.monto, 0);
		setValorTotalDeclarado(total);
	}, [itemsBien]);

	// Calcular valor asegurado total (suma de todos los bienes)
	const valorAseguradoTotal = bienes.reduce((sum, bien) => sum + bien.valor_total_declarado, 0);

	const abrirModalBien = (index?: number) => {
		if (index !== undefined) {
			const bien = bienes[index];
			setBienEditando(index);
			setDireccionBien(bien.direccion);
			setItemsBien(bien.items);
			setValorTotalDeclarado(bien.valor_total_declarado);
			setEsPrimerRiesgo(bien.es_primer_riesgo);
		} else {
			setBienEditando(null);
			setDireccionBien("");
			setItemsBien([]);
			setValorTotalDeclarado(0);
			setEsPrimerRiesgo(false);
		}
		setMostrarModalBien(true);
	};

	const agregarItem = (nombreItem: ItemIncendio["nombre"]) => {
		// Verificar si ya existe
		const yaExiste = itemsBien.some((item) => item.nombre === nombreItem);
		if (yaExiste) {
			return;
		}

		setItemsBien([...itemsBien, { nombre: nombreItem, monto: 0 }]);
	};

	const actualizarMontoItem = (nombreItem: ItemIncendio["nombre"], nuevoMonto: number) => {
		setItemsBien(
			itemsBien.map((item) =>
				item.nombre === nombreItem ? { ...item, monto: nuevoMonto } : item
			)
		);
	};

	const eliminarItem = (nombreItem: ItemIncendio["nombre"]) => {
		setItemsBien(itemsBien.filter((item) => item.nombre !== nombreItem));
	};

	const guardarBien = () => {
		if (!direccionBien.trim()) {
			alert("Debe ingresar una dirección");
			return;
		}
		if (itemsBien.length === 0) {
			alert("Debe agregar al menos un item asegurado");
			return;
		}
		if (valorTotalDeclarado <= 0) {
			alert("El valor total declarado debe ser mayor a 0");
			return;
		}

		const nuevoBien: BienAseguradoIncendio = {
			direccion: direccionBien,
			items: itemsBien,
			valor_total_declarado: valorTotalDeclarado,
			es_primer_riesgo: esPrimerRiesgo,
		};

		if (bienEditando !== null) {
			// Editar bien existente
			const nuevosBienes = [...bienes];
			nuevosBienes[bienEditando] = nuevoBien;
			setBienes(nuevosBienes);
		} else {
			// Si marca como primer riesgo, desmarcar los demás
			if (esPrimerRiesgo) {
				setBienes([...bienes.map((b) => ({ ...b, es_primer_riesgo: false })), nuevoBien]);
			} else {
				setBienes([...bienes, nuevoBien]);
			}
		}

		setMostrarModalBien(false);
	};

	const eliminarBien = (index: number) => {
		if (confirm("¿Está seguro de eliminar este bien?")) {
			setBienes(bienes.filter((_, i) => i !== index));
		}
	};

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

		if (!regionalId) {
			nuevosErrores.regional = "Debe seleccionar una regional";
		}

		if (bienes.length === 0) {
			nuevosErrores.bienes = "Debe agregar al menos un bien asegurado";
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
			regional_asegurado_id: regionalId,
			valor_asegurado: valorAseguradoTotal,
			bienes,
			asegurados,
		});

		onSiguiente();
	};

	const tieneDatos = valorAseguradoTotal > 0 && regionalId && bienes.length > 0 && asegurados.length > 0;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: Datos Específicos - Incendio y Aliados
					</h2>
					<p className="text-sm text-gray-600 mt-1">Configure los bienes y asegurados</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{bienes.length} bien(es), {asegurados.length} asegurado(s)
						</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
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

				{/* Valor Total Asegurado (Calculado) */}
				<div className="bg-gray-50 border rounded-lg p-4">
					<Label className="text-base font-semibold">Valor Total Asegurado (Calculado)</Label>
					<p className="text-2xl font-bold text-gray-900 mt-2">
						Bs {valorAseguradoTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
					</p>
					<p className="text-xs text-gray-500 mt-1">Suma de todos los bienes declarados</p>
				</div>

				{/* Info sobre items */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex gap-3">
						<AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-900">
							<p className="font-medium mb-2">Sistema de Items por Ubicación:</p>
							<ul className="space-y-1 text-xs">
								<li>• Cada bien asegurado puede tener múltiples items con montos individuales</li>
								<li>• Items disponibles: edificaciones, activos fijos, equipos, maquinaria, existencias, dinero y valores, vidrios</li>
								<li>• El valor total se calcula automáticamente sumando todos los items</li>
								<li>• Puede marcar un bien como &quot;primer riesgo&quot; si corresponde</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Lista de Bienes */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label className="text-base">
							Bienes Asegurados <span className="text-red-500">*</span>
						</Label>
						<Button onClick={() => abrirModalBien()} size="sm">
							<Plus className="mr-2 h-4 w-4" />
							Agregar Bien
						</Button>
					</div>

					{errores.bienes && <p className="text-sm text-red-600">{errores.bienes}</p>}

					{bienes.length === 0 ? (
						<div className="border-2 border-dashed rounded-lg p-8 text-center">
							<Home className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-600">No hay bienes asegurados</p>
							<p className="text-xs text-gray-500 mt-1">Haga clic en &quot;Agregar Bien&quot; para comenzar</p>
						</div>
					) : (
						<div className="border rounded-lg divide-y">
							{bienes.map((bien, index) => (
								<div key={index} className="p-4">
									<div className="flex items-start justify-between mb-2">
										<div className="flex-1">
											<p className="font-medium text-gray-900">{bien.direccion}</p>
											<p className="text-sm text-gray-600">
												Valor Total: Bs {bien.valor_total_declarado.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
											</p>
											{bien.es_primer_riesgo && (
												<span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
													Primer Riesgo
												</span>
											)}
										</div>
										<div className="flex gap-2">
											<Button variant="outline" size="sm" onClick={() => abrirModalBien(index)}>
												<Edit2 className="h-4 w-4" />
											</Button>
											<Button variant="ghost" size="sm" onClick={() => eliminarBien(index)}>
												<Trash2 className="h-4 w-4 text-red-600" />
											</Button>
										</div>
									</div>
									<div className="mt-3 space-y-1 text-xs text-gray-600">
										<p className="font-medium">Items:</p>
										{bien.items.map((item, i) => (
											<div key={i} className="flex justify-between pl-4">
												<span>• {item.nombre}</span>
												<span>Bs {item.monto.toLocaleString()}</span>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					)}
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
							<p className="text-xs text-gray-500 mt-1">Haga clic en &quot;Agregar Asegurado&quot; para comenzar</p>
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

			{/* Modal de Bien */}
			{mostrarModalBien && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">
							{bienEditando !== null ? "Editar" : "Agregar"} Bien Asegurado
						</h3>

						<div className="space-y-4">
							{/* Dirección */}
							<div className="space-y-2">
								<Label htmlFor="direccion_bien">
									Dirección/Ubicación <span className="text-red-500">*</span>
								</Label>
								<Input
									id="direccion_bien"
									value={direccionBien}
									onChange={(e) => setDireccionBien(e.target.value)}
									placeholder="Ej: Av. Ejemplo #123, La Paz"
								/>
							</div>

							{/* Items Asegurables */}
							<div className="space-y-3">
								<Label className="text-base">Items Asegurables</Label>

								{/* Selector de items */}
								<div className="flex gap-2 flex-wrap">
									{ITEMS_DISPONIBLES.filter(nombre => !itemsBien.some(item => item.nombre === nombre)).map((nombreItem) => (
										<Button
											key={nombreItem}
											type="button"
											variant="outline"
											size="sm"
											onClick={() => agregarItem(nombreItem)}
										>
											<Plus className="mr-1 h-3 w-3" />
											{nombreItem}
										</Button>
									))}
								</div>

								{/* Items agregados */}
								{itemsBien.length > 0 && (
									<div className="space-y-2 mt-3">
										{itemsBien.map((item) => (
											<div key={item.nombre} className="flex items-center gap-2 p-3 border rounded-lg">
												<div className="flex-1">
													<Label className="text-sm font-medium">{item.nombre}</Label>
													<Input
														type="number"
														min="0"
														step="0.01"
														value={item.monto || ""}
														onChange={(e) =>
															actualizarMontoItem(item.nombre, parseFloat(e.target.value) || 0)
														}
														placeholder="0.00"
														className="mt-1"
													/>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => eliminarItem(item.nombre)}
												>
													<Trash2 className="h-4 w-4 text-red-600" />
												</Button>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Valor Total Declarado (Calculado) */}
							<div className="bg-gray-50 border rounded-lg p-3">
								<Label className="text-sm font-medium">Valor Total Declarado (Calculado)</Label>
								<p className="text-xl font-bold text-gray-900 mt-1">
									Bs {valorTotalDeclarado.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
								</p>
							</div>

							{/* Primer Riesgo */}
							<div className="flex items-center space-x-2">
								<Checkbox
									id="es_primer_riesgo"
									checked={esPrimerRiesgo}
									onCheckedChange={(checked) => setEsPrimerRiesgo(!!checked)}
								/>
								<Label htmlFor="es_primer_riesgo" className="cursor-pointer">
									¿Es Primer Riesgo?
								</Label>
							</div>
						</div>

						<div className="flex justify-end gap-2 mt-6">
							<Button variant="outline" onClick={() => setMostrarModalBien(false)}>
								Cancelar
							</Button>
							<Button onClick={guardarBien}>Guardar</Button>
						</div>
					</div>
				</div>
			)}

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
