"use client";

import { useState, useRef } from "react";
import {
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Plus,
	Trash2,
	Users,
	AlertTriangle,
	Settings,
	Upload,
	Download,
	FileSpreadsheet,
	X,
} from "lucide-react";
import type { DatosSepelio, AseguradoConNivel, NivelCobertura, CoberturaSepelio, SepelioExcelImportResult } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BuscadorClientes } from "../BuscadorClientes";
import { importarAseguradosDesdeExcel, generarPlantillaExcel } from "@/utils/sepelioExcelImport";

type Props = {
	datos: DatosSepelio | null;
	regionales: Array<{ id: string; nombre: string }>;
	onChange: (datos: DatosSepelio) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Sub-paso interno: 2.1 o 3
type SubPaso = "niveles" | "principal";

export function SepelioForm({ datos, regionales, onChange, onSiguiente, onAnterior }: Props) {
	// Estado del sub-paso actual
	const [subPaso, setSubPaso] = useState<SubPaso>(
		datos?.niveles && datos.niveles.length > 0 ? "principal" : "niveles"
	);

	// ===== PASO 2.1: NIVELES DE COBERTURA =====
	const [niveles, setNiveles] = useState<NivelCobertura[]>(datos?.niveles || []);
	const [nivelEditando, setNivelEditando] = useState<NivelCobertura | null>(null);
	const [coberturaSepelio, setCoberturaSepelio] = useState<{ habilitado: boolean; valor: number }>({
		habilitado: true,
		valor: 0,
	});

	// ===== PASO 3: FORMULARIO PRINCIPAL =====
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza || "individual"
	);
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [producto, setProducto] = useState<string>(datos?.producto || "");
	const [asegurados, setAsegurados] = useState<AseguradoConNivel[]>(datos?.asegurados || []);
	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// ===== EXCEL IMPORT =====
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importandoExcel, setImportandoExcel] = useState(false);
	const [resultadoImport, setResultadoImport] = useState<SepelioExcelImportResult | null>(null);
	const [mostrarResultadoImport, setMostrarResultadoImport] = useState(false);

	// ===== FUNCIONES PASO 2.1: NIVELES =====
	const crearNuevoNivel = () => {
		const numeroNivel = niveles.length + 1;
		setNivelEditando({
			id: crypto.randomUUID(),
			nombre: `Nivel ${numeroNivel}`,
			coberturas: {
				sepelio: { habilitado: true, valor: 0 },
			} as CoberturaSepelio,
		});
		setCoberturaSepelio({ habilitado: true, valor: 0 });
	};

	const guardarNivel = () => {
		if (!nivelEditando) return;

		const nuevosErrores: Record<string, string> = {};

		// Validar que al menos una cobertura esté habilitada con valor > 0
		if (coberturaSepelio.habilitado && coberturaSepelio.valor <= 0) {
			nuevosErrores.sepelio = "El valor de sepelio debe ser mayor a 0";
		}

		if (!coberturaSepelio.habilitado) {
			nuevosErrores.general = "Debe habilitar al menos una cobertura";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		// Actualizar coberturas del nivel
		const nivelActualizado: NivelCobertura = {
			...nivelEditando,
			coberturas: {
				sepelio: coberturaSepelio,
			} as CoberturaSepelio,
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
		setCoberturaSepelio({ habilitado: true, valor: 0 });
		setErrores({});
	};

	const editarNivel = (nivel: NivelCobertura) => {
		setNivelEditando(nivel);
		const coberturas = nivel.coberturas as CoberturaSepelio;
		setCoberturaSepelio(coberturas.sepelio);
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

	// ===== FUNCIONES EXCEL IMPORT =====
	const handleDescargarPlantilla = async () => {
		try {
			const blob = await generarPlantillaExcel();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "plantilla_asegurados_sepelio.xlsx";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error al generar plantilla:", error);
			alert("Error al generar la plantilla");
		}
	};

	const handleImportarExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setImportandoExcel(true);
		try {
			const resultado = await importarAseguradosDesdeExcel(file, niveles);
			setResultadoImport(resultado);
			setMostrarResultadoImport(true);

			// Si hay asegurados válidos, agregarlos
			if (resultado.asegurados_validos.length > 0) {
				// Filtrar duplicados (por client_id)
				const idsExistentes = new Set(asegurados.map((a) => a.client_id));
				const nuevosAsegurados = resultado.asegurados_validos.filter(
					(a) => !idsExistentes.has(a.client_id)
				);

				if (nuevosAsegurados.length > 0) {
					setAsegurados([...asegurados, ...nuevosAsegurados]);
				}
			}
		} catch (error) {
			console.error("Error al importar Excel:", error);
			alert("Error al importar el archivo Excel");
		} finally {
			setImportandoExcel(false);
			// Limpiar input para permitir reimportar el mismo archivo
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const cerrarModalResultado = () => {
		setMostrarResultadoImport(false);
		setResultadoImport(null);
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (!regionalId) {
			nuevosErrores.regional = "Debe seleccionar una regional";
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
		const datosSepelio: DatosSepelio = {
			niveles,
			tipo_poliza: tipoPoliza,
			regional_asegurado_id: regionalId,
			asegurados,
			producto: producto || undefined,
		};

		onChange(datosSepelio);
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
							Paso 2.1: Configurar Niveles de Cobertura (Sepelio)
						</h2>
						<p className="text-sm text-gray-600 mt-1">
							Defina los niveles de cobertura para las pólizas de sepelio
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
								const coberturas = nivel.coberturas as CoberturaSepelio;
								return (
									<div key={nivel.id} className="flex items-center justify-between p-4 border rounded-lg">
										<div className="flex-1">
											<p className="font-medium text-gray-900">{nivel.nombre}</p>
											<p className="text-sm text-gray-600">
												Sepelio: {coberturas.sepelio.habilitado ? `Bs ${coberturas.sepelio.valor.toLocaleString()}` : "No incluido"}
											</p>
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
												variant="outline"
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

								{/* SEPELIO */}
								<div className="flex items-start gap-4">
									<div className="flex items-center space-x-2 pt-2">
										<Checkbox
											id="cob_sepelio"
											checked={coberturaSepelio.habilitado}
											onCheckedChange={(checked) =>
												setCoberturaSepelio({
													...coberturaSepelio,
													habilitado: checked === true,
												})
											}
										/>
										<Label htmlFor="cob_sepelio" className="cursor-pointer">
											SEPELIO
										</Label>
									</div>
									{coberturaSepelio.habilitado && (
										<div className="flex-1">
											<Input
												type="number"
												placeholder="Valor asegurado (Bs)"
												value={coberturaSepelio.valor || ""}
												onChange={(e) =>
													setCoberturaSepelio({
														...coberturaSepelio,
														valor: parseFloat(e.target.value) || 0,
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

	// SUB-PASO 3: FORMULARIO PRINCIPAL
	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Paso 3: Datos Específicos - Sepelio</h2>
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

				{/* Producto (Opcional) */}
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="producto">Producto (Opcional)</Label>
					<Input
						id="producto"
						value={producto}
						onChange={(e) => setProducto(e.target.value)}
						placeholder="Ej: Sepelio Premium, Sepelio Familiar, etc."
					/>
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
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handleDescargarPlantilla}>
							<Download className="mr-2 h-4 w-4" />
							Plantilla Excel
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
							disabled={importandoExcel}
						>
							<Upload className="mr-2 h-4 w-4" />
							{importandoExcel ? "Importando..." : "Importar Excel"}
						</Button>
						<Button onClick={() => setMostrarBuscador(true)} disabled={mostrarBuscador}>
							<Plus className="mr-2 h-4 w-4" />
							Agregar Individual
						</Button>
					</div>
				</div>

				{/* Input oculto para Excel */}
				<input
					ref={fileInputRef}
					type="file"
					accept=".xlsx,.xls"
					onChange={handleImportarExcel}
					className="hidden"
				/>

				{/* Info sobre importación Excel */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex gap-3">
						<FileSpreadsheet className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-900">
							<p className="font-medium mb-1">Importación masiva desde Excel</p>
							<ul className="space-y-1 text-xs">
								<li>• Descargue la plantilla Excel con las columnas correctas</li>
								<li>• Complete el CI del asegurado y el Nivel de cobertura</li>
								<li>• El sistema validará que los CIs existan en la base de datos</li>
								<li>• Los niveles deben coincidir exactamente con los configurados</li>
								<li>• Los duplicados serán ignorados automáticamente</li>
							</ul>
						</div>
					</div>
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

			{/* Modal de resultado de importación */}
			{mostrarResultadoImport && resultadoImport && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">
								Resultado de Importación
							</h3>
							<Button variant="ghost" size="sm" onClick={cerrarModalResultado}>
								<X className="h-4 w-4" />
							</Button>
						</div>

						{/* Resumen */}
						<div className="grid grid-cols-2 gap-4 mb-4">
							<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
								<p className="text-sm text-green-700 font-medium">Asegurados Importados</p>
								<p className="text-2xl font-bold text-green-900">{resultadoImport.asegurados_validos.length}</p>
							</div>
							<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
								<p className="text-sm text-red-700 font-medium">Errores</p>
								<p className="text-2xl font-bold text-red-900">{resultadoImport.errores.length}</p>
							</div>
						</div>

						{/* Lista de errores */}
						{resultadoImport.errores.length > 0 && (
							<div className="mb-4">
								<h4 className="font-medium text-gray-900 mb-2">Errores encontrados:</h4>
								<div className="space-y-2 max-h-64 overflow-y-auto">
									{resultadoImport.errores.map((error, index) => (
										<div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm">
											<p className="font-medium text-red-900">
												Fila {error.fila}:
											</p>
											<ul className="list-disc list-inside text-red-700 mt-1">
												{error.errores.map((err, i) => (
													<li key={i}>{err}</li>
												))}
											</ul>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Lista de asegurados importados */}
						{resultadoImport.asegurados_validos.length > 0 && (
							<div className="mb-4">
								<h4 className="font-medium text-gray-900 mb-2">Asegurados importados exitosamente:</h4>
								<div className="space-y-2 max-h-48 overflow-y-auto">
									{resultadoImport.asegurados_validos.map((asegurado, index) => (
										<div key={index} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
											<p className="font-medium text-green-900">{asegurado.client_name}</p>
											<p className="text-green-700 text-xs">
												CI: {asegurado.client_ci} • Nivel: {niveles.find(n => n.id === asegurado.nivel_id)?.nombre}
											</p>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="flex justify-end">
							<Button onClick={cerrarModalResultado}>Cerrar</Button>
						</div>
					</div>
				</div>
			)}

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
