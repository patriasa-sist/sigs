"use client";

import { useState, useEffect } from "react";
import {
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Plus,
	Trash2,
	Users,
	AlertTriangle,
	Settings,
} from "lucide-react";
import type { DatosVida, AseguradoConNivel, NivelCobertura, CoberturasVida, ProductoVida } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BuscadorClientes } from "../BuscadorClientes";
import { createClient } from "@/utils/supabase/client";

type Props = {
	datos: DatosVida | null;
	regionales: Array<{ id: string; nombre: string }>;
	onChange: (datos: DatosVida) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Sub-paso interno: 2.1 o 3
type SubPaso = "niveles" | "principal";

export function VidaForm({ datos, regionales, onChange, onSiguiente, onAnterior }: Props) {
	// Estado del sub-paso actual
	const [subPaso, setSubPaso] = useState<SubPaso>(
		datos?.niveles && datos.niveles.length > 0 ? "principal" : "niveles"
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
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza || "individual"
	);
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [productoId, setProductoId] = useState<string>(datos?.producto_id || "");
	const [producto, setProducto] = useState<string>(datos?.producto || "");
	const [asegurados, setAsegurados] = useState<AseguradoConNivel[]>(datos?.asegurados || []);
	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [productos, setProductos] = useState<ProductoVida[]>([]);
	const [cargandoProductos, setCargandoProductos] = useState(true);

	// Fetch productos_vida from Supabase
	useEffect(() => {
		const fetchProductos = async () => {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("productos_vida")
				.select("*")
				.eq("activo", true)
				.order("nombre", { ascending: true });

			if (error) {
				console.error("Error fetching productos vida:", error);
			} else if (data) {
				setProductos(data);
			}
			setCargandoProductos(false);
		};

		fetchProductos();
	}, []);

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

		// Agregar con el primer nivel disponible por defecto
		setAsegurados([
			...asegurados,
			{
				client_id: cliente.id,
				client_name: cliente.nombre,
				client_ci: cliente.ci,
				nivel_id: niveles[0]?.id || "",
			},
		]);
		setMostrarBuscador(false);
	};

	const cambiarNivel = (clientId: string, nivelId: string) => {
		setAsegurados(asegurados.map((a) => (a.client_id === clientId ? { ...a, nivel_id: nivelId } : a)));
	};

	const eliminarAsegurado = (clientId: string) => {
		setAsegurados(asegurados.filter((a) => a.client_id !== clientId));
	};

	const handleProductoChange = (selectedProductoId: string) => {
		setProductoId(selectedProductoId);
		const productoSeleccionado = productos.find((p) => p.id === selectedProductoId);
		if (productoSeleccionado) {
			setProducto(productoSeleccionado.nombre);
		}
		// Clear error if exists
		if (errores.producto) {
			const { producto, ...rest } = errores;
			setErrores(rest);
		}
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (!regionalId) {
			nuevosErrores.regional = "Debe seleccionar una regional";
		}

		if (!productoId || !producto) {
			nuevosErrores.producto = "Debe seleccionar un producto";
		}

		if (asegurados.length === 0) {
			nuevosErrores.asegurados = "Debe agregar al menos un asegurado";
		}

		// Validar que todos los asegurados tengan un nivel asignado
		const aseguradosSinNivel = asegurados.filter((a) => !a.nivel_id);
		if (aseguradosSinNivel.length > 0) {
			nuevosErrores.asegurados = "Todos los asegurados deben tener un nivel asignado";
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
			producto,
			producto_id: productoId,
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
									<div key={nivel.id} className="flex items-center justify-between p-4 border rounded-lg">
										<div className="flex-1">
											<p className="font-medium text-gray-900">{nivel.nombre}</p>
											<div className="text-sm text-gray-600 space-y-1">
												{cob.muerte.habilitado && <p>• Muerte: Bs {cob.muerte.valor.toLocaleString()}</p>}
												{cob.dima.habilitado && <p>• DIMA: Bs {cob.dima.valor.toLocaleString()}</p>}
												{cob.sepelio.habilitado && <p>• Sepelio: Bs {cob.sepelio.valor.toLocaleString()}</p>}
												{cob.gastos_medicos.habilitado && <p>• Gastos Médicos: Bs {cob.gastos_medicos.valor.toLocaleString()}</p>}
												{cob.indm_enfermedades_graves.habilitado && <p>• INDM Enf. Graves: Bs {cob.indm_enfermedades_graves.valor.toLocaleString()}</p>}
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => editarNivel(nivel)}
											>
												Editar
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => eliminarNivel(nivel.id)}
											>
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
									onChange={(e) =>
										setNivelEditando({ ...nivelEditando, nombre: e.target.value })
									}
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
														muerte: { ...coberturas.muerte, valor: parseFloat(e.target.value) || 0 },
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
														dima: { ...coberturas.dima, valor: parseFloat(e.target.value) || 0 },
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
														sepelio: { ...coberturas.sepelio, valor: parseFloat(e.target.value) || 0 },
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
													gastos_medicos: { ...coberturas.gastos_medicos, habilitado: checked === true },
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
														gastos_medicos: { ...coberturas.gastos_medicos, valor: parseFloat(e.target.value) || 0 },
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
													indm_enfermedades_graves: { ...coberturas.indm_enfermedades_graves, habilitado: checked === true },
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
														indm_enfermedades_graves: { ...coberturas.indm_enfermedades_graves, valor: parseFloat(e.target.value) || 0 },
													})
												}
												className={errores.indm_enfermedades_graves ? "border-red-500" : ""}
											/>
											{errores.indm_enfermedades_graves && (
												<p className="text-sm text-red-600 mt-1">{errores.indm_enfermedades_graves}</p>
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
							<p className="text-xs text-gray-600">
								{niveles.map((n) => n.nombre).join(", ")}
							</p>
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

				{/* Producto (Obligatorio) */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="producto">
						Producto <span className="text-red-500">*</span>
					</Label>
					<Select value={productoId} onValueChange={handleProductoChange} disabled={cargandoProductos}>
						<SelectTrigger className={errores.producto ? "border-red-500" : ""}>
							<SelectValue placeholder={cargandoProductos ? "Cargando productos..." : "Seleccione un producto"} />
						</SelectTrigger>
						<SelectContent>
							{productos.map((prod) => (
								<SelectItem key={prod.id} value={prod.id}>
									{prod.nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.producto && <p className="text-sm text-red-600">{errores.producto}</p>}
					<p className="text-xs text-gray-500">
						Pólizas de Vida solo permiten pago en contado (pago único)
					</p>
				</div>
			</div>

			{/* Asegurados */}
			<div className="space-y-4 mb-6">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base">
							Asegurados <span className="text-red-500">*</span>
						</Label>
						<p className="text-sm text-gray-600 mt-1">
							Agregue los asegurados y asigne su nivel de cobertura
						</p>
					</div>
					<Button onClick={() => setMostrarBuscador(true)} disabled={mostrarBuscador}>
						<Plus className="mr-2 h-4 w-4" />
						Agregar Asegurado
					</Button>
				</div>

				{errores.asegurados && (
					<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
						<AlertTriangle className="h-4 w-4 text-red-600" />
						<p className="text-sm text-red-600">{errores.asegurados}</p>
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
						{asegurados.map((asegurado) => {
							const nivel = niveles.find((n) => n.id === asegurado.nivel_id);
							return (
								<div key={asegurado.client_id} className="flex items-center gap-4 p-4 border rounded-lg">
									<Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
									<div className="flex-1">
										<p className="font-medium text-gray-900">{asegurado.client_name}</p>
										<p className="text-sm text-gray-600">CI: {asegurado.client_ci}</p>
									</div>
									<div className="flex items-center gap-2">
										<Select
											value={asegurado.nivel_id}
											onValueChange={(value) => cambiarNivel(asegurado.client_id, value)}
										>
											<SelectTrigger className="w-[180px]">
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
										<Button
											variant="ghost"
											size="sm"
											onClick={() => eliminarAsegurado(asegurado.client_id)}
										>
											<Trash2 className="h-4 w-4 text-red-600" />
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="text-center py-8 border-2 border-dashed rounded-lg">
						<Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-600">No hay asegurados agregados</p>
						<p className="text-sm text-gray-500">Haga clic en &ldquo;Agregar Asegurado&rdquo; para comenzar</p>
					</div>
				)}
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
		</div>
	);
}
