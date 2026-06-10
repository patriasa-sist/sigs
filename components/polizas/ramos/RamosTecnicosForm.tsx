"use client";

import { useState, useEffect } from "react";
import {
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Plus,
	FileSpreadsheet,
	Cog,
	Edit,
	Trash2,
	Download,
} from "lucide-react";
import type { DatosRamosTecnicos, EquipoIndustrial, TipoEquipo, MarcaEquipo } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { EquipoModal } from "./EquipoModal";
import { createClient } from "@/utils/supabase/client";
import { importarEquiposDesdeExcel, generarTemplateEquiposExcel } from "@/utils/equipoExcelImport";

type Props = {
	datos: DatosRamosTecnicos | null;
	onChange: (datos: DatosRamosTecnicos) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function RamosTecnicosForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	const [valorAsegurado, setValorAsegurado] = useState<string>(
		datos?.valor_asegurado ? String(datos.valor_asegurado) : "",
	);
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(datos?.tipo_poliza || "individual");
	const [equipos, setEquipos] = useState<EquipoIndustrial[]>(datos?.equipos || []);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [equipoEditando, setEquipoEditando] = useState<EquipoIndustrial | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);
	const [errores, setErrores] = useState<string[]>([]);
	const [importando, setImportando] = useState(false);
	const [equipoAEliminar, setEquipoAEliminar] = useState<number | null>(null);

	// Catálogos para mostrar nombres en lugar de IDs
	const [tiposEquipo, setTiposEquipo] = useState<TipoEquipo[]>([]);
	const [marcas, setMarcas] = useState<MarcaEquipo[]>([]);

	// Cargar catálogos al montar el componente
	useEffect(() => {
		cargarCatalogos();
	}, []);

	const cargarCatalogos = async () => {
		try {
			const supabase = createClient();

			const [{ data: tiposData, error: errorTipos }, { data: marcasData, error: errorMarcas }] =
				await Promise.all([
					supabase.from("tipos_equipo").select("*").eq("activo", true).order("nombre"),
					supabase.from("marcas_equipo").select("*").eq("activo", true).order("nombre"),
				]);

			if (errorTipos) {
				console.error("Error cargando tipos de equipo:", errorTipos);
			}

			if (errorMarcas) {
				console.error("Error cargando marcas de equipo:", errorMarcas);
			}

			setTiposEquipo(tiposData || []);
			setMarcas(marcasData || []);
		} catch (error) {
			console.error("Error cargando catálogos:", error);
		}
	};

	// Función para obtener el nombre del tipo de equipo por ID
	const obtenerNombreTipo = (id?: string): string => {
		if (!id) return "-";
		const tipo = tiposEquipo.find((t) => t.id === id);
		return tipo ? tipo.nombre : id;
	};

	// Función para obtener el nombre de la marca por ID
	const obtenerNombreMarca = (id?: string): string => {
		if (!id) return "-";
		const marca = marcas.find((m) => m.id === id);
		return marca ? marca.nombre : id;
	};

	// Validar números de serie únicos
	const validarNrosSerieUnicos = (equiposLista: EquipoIndustrial[]): { valido: boolean; errores: string[] } => {
		const nrosSerie = equiposLista.map((e) => e.nro_serie.toUpperCase());
		const duplicados = nrosSerie.filter((nro, index) => nrosSerie.indexOf(nro) !== index);

		if (duplicados.length > 0) {
			return {
				valido: false,
				errores: [`Números de serie duplicados: ${[...new Set(duplicados)].join(", ")}`],
			};
		}

		return { valido: true, errores: [] };
	};

	// Agregar o editar equipo
	const handleGuardarEquipo = (equipo: EquipoIndustrial) => {
		let nuevosEquipos: EquipoIndustrial[];

		if (indexEditando !== null) {
			// Editar equipo existente
			nuevosEquipos = [...equipos];
			nuevosEquipos[indexEditando] = equipo;
		} else {
			// Agregar nuevo equipo
			nuevosEquipos = [...equipos, equipo];
		}

		// Validar números de serie únicos
		const validacion = validarNrosSerieUnicos(nuevosEquipos);
		if (!validacion.valido) {
			setErrores(validacion.errores);
			return;
		}

		setEquipos(nuevosEquipos);
		onChange({ valor_asegurado: parseFloat(valorAsegurado) || 0, tipo_poliza: tipoPoliza, equipos: nuevosEquipos });
		setModalAbierto(false);
		setEquipoEditando(null);
		setIndexEditando(null);
		setErrores([]);
	};

	// Abrir modal para agregar
	const handleAgregarNuevo = () => {
		setEquipoEditando(null);
		setIndexEditando(null);
		setModalAbierto(true);
	};

	// Abrir modal para editar
	const handleEditar = (equipo: EquipoIndustrial, index: number) => {
		setEquipoEditando(equipo);
		setIndexEditando(index);
		setModalAbierto(true);
	};

	// Eliminar equipo (pide confirmación vía AlertDialog)
	const handleEliminar = (index: number) => {
		setEquipoAEliminar(index);
	};

	const confirmarEliminar = () => {
		if (equipoAEliminar === null) return;
		const nuevosEquipos = equipos.filter((_, i) => i !== equipoAEliminar);
		setEquipos(nuevosEquipos);
		onChange({
			valor_asegurado: parseFloat(valorAsegurado) || 0,
			tipo_poliza: tipoPoliza,
			equipos: nuevosEquipos,
		});
		setEquipoAEliminar(null);
	};

	// Importar desde Excel
	const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setImportando(true);
		setErrores([]);

		try {
			const resultado = await importarEquiposDesdeExcel(file);

			if (resultado.exito && resultado.equipos_validos.length > 0) {
				// Combinar con equipos existentes
				const nuevosEquipos = [...equipos, ...resultado.equipos_validos];

				// Validar nros de serie únicos
				const validacion = validarNrosSerieUnicos(nuevosEquipos);
				if (!validacion.valido) {
					setErrores(validacion.errores);
					setImportando(false);
					return;
				}

				setEquipos(nuevosEquipos);
				onChange({
					valor_asegurado: parseFloat(valorAsegurado) || 0,
					tipo_poliza: tipoPoliza,
					equipos: nuevosEquipos,
				});

				// Mostrar errores si los hay (filas con problemas)
				if (resultado.errores.length > 0) {
					const mensajesError = resultado.errores.map((e) => `Fila ${e.fila}: ${e.errores.join(", ")}`);
					setErrores([`Se importaron ${resultado.equipos_validos.length} equipos.`, ...mensajesError]);
				} else {
					toast.success(`Se importaron ${resultado.equipos_validos.length} equipos exitosamente.`);
				}
			} else {
				setErrores(
					resultado.errores.length > 0
						? resultado.errores.map((e) => `Fila ${e.fila}: ${e.errores.join(", ")}`)
						: ["No se pudieron importar equipos del archivo."],
				);
			}
		} catch (error) {
			console.error("Error importando Excel:", error);
			setErrores(["Error al procesar el archivo Excel."]);
		} finally {
			setImportando(false);
			// Limpiar input para permitir re-upload del mismo archivo
			event.target.value = "";
		}
	};

	// Descargar template
	const handleDescargarTemplate = async () => {
		try {
			await generarTemplateEquiposExcel();
		} catch (error) {
			console.error("Error generando template:", error);
			toast.error("Error al generar el template");
		}
	};

	const handleContinuar = () => {
		const valor = parseFloat(valorAsegurado);
		if (!valorAsegurado || isNaN(valor) || valor <= 0) {
			setErrores(["El valor asegurado es requerido y debe ser mayor a 0."]);
			return;
		}

		onChange({ valor_asegurado: valor, tipo_poliza: tipoPoliza, equipos });
		onSiguiente();
	};

	// Handler para cambio de valor asegurado
	const handleValorAseguradoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setValorAsegurado(e.target.value);
		const valor = parseFloat(e.target.value);
		onChange({ valor_asegurado: isNaN(valor) ? 0 : valor, tipo_poliza: tipoPoliza, equipos });
	};

	// Handler para cambio de tipo de póliza
	const handleTipoPolizaChange = (value: "individual" | "corporativo") => {
		setTipoPoliza(value);
		onChange({ valor_asegurado: parseFloat(valorAsegurado) || 0, tipo_poliza: value, equipos });
	};

	const tieneEquipos = equipos.length > 0;

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-foreground">Paso 3: Datos del Ramo Técnico</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Complete los datos del ramo técnico. Los equipos son opcionales según el producto.
					</p>
				</div>

				{tieneEquipos && (
					<div className="flex items-center gap-2 text-success">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">{equipos.length} equipo(s)</span>
					</div>
				)}
			</div>

			{/* Valor Asegurado + Tipo de Póliza en la misma fila */}
			<div className="mb-6 p-4 bg-secondary rounded-lg border border-border flex flex-wrap gap-6">
				<div>
					<Label htmlFor="valor-asegurado" className="block text-sm font-medium text-foreground mb-2">
						Valor Asegurado <span className="text-destructive">*</span>
					</Label>
					<Input
						id="valor-asegurado"
						type="number"
						min="0"
						step="0.01"
						placeholder="0.00"
						value={valorAsegurado}
						onChange={handleValorAseguradoChange}
						className="w-48 bg-background"
					/>
					<p className="text-xs text-muted-foreground mt-1">Valor total asegurado</p>
				</div>

				<div>
					<Label htmlFor="tipo-poliza" className="block text-sm font-medium text-foreground mb-2">
						Tipo de Póliza
					</Label>
					<Select value={tipoPoliza} onValueChange={handleTipoPolizaChange}>
						<SelectTrigger id="tipo-poliza" className="w-48 bg-background">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="individual">Individual</SelectItem>
							<SelectItem value="corporativo">Corporativo</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground mt-1">Individual o corporativo</p>
				</div>
			</div>

			{/* Equipos (opcional) */}
			<div className="mb-2">
				<p className="text-sm font-medium text-foreground">
					Equipos Asegurados <span className="text-muted-foreground font-normal">(opcional)</span>
				</p>
				<p className="text-xs text-muted-foreground mt-0.5">
					Solo aplica para productos con equipos identificables (p.ej. Equipo Pesado Móvil, Rotura de
					Maquinaria)
				</p>
			</div>

			{/* Botones de acciones */}
			<div className="flex flex-wrap gap-3 mb-6">
				<Button onClick={handleAgregarNuevo}>
					<Plus className="mr-2 h-4 w-4" />
					Agregar Equipo
				</Button>

				<Button variant="outline" onClick={handleDescargarTemplate}>
					<Download className="mr-2 h-4 w-4" />
					Descargar Template Excel
				</Button>

				<label htmlFor="excel-upload-equipos">
					<Button variant="outline" asChild disabled={importando}>
						<span>
							<FileSpreadsheet className="mr-2 h-4 w-4" />
							{importando ? "Importando..." : "Importar Excel"}
						</span>
					</Button>
					<input
						id="excel-upload-equipos"
						type="file"
						accept=".xlsx,.xls"
						onChange={handleImportExcel}
						className="hidden"
						disabled={importando}
					/>
				</label>
			</div>

			{/* Errores */}
			{errores.length > 0 && (
				<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
					<h4 className="text-sm font-semibold text-destructive mb-2">Errores:</h4>
					<ul className="text-sm text-destructive space-y-1">
						{errores.map((error, i) => (
							<li key={i}>• {error}</li>
						))}
					</ul>
				</div>
			)}

			{/* Tabla de equipos */}
			{equipos.length === 0 ? (
				<div className="text-center py-12 border-2 border-dashed rounded-lg">
					<Cog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground mb-2">No hay equipos agregados</p>
					<p className="text-sm text-muted-foreground">Agregue equipos manualmente o importe desde Excel</p>
				</div>
			) : (
				<div className="overflow-x-auto border rounded-lg mb-6">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Nº Serie
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Tipo
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Marca/Modelo
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
									Año
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
									Valor Asegurado
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
									Franquicia
								</th>
								<th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
									Uso
								</th>
								<th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
									Coaseguro (%)
								</th>
								<th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{equipos.map((equipo, index) => (
								<tr key={index} className="hover:bg-muted/50">
									<td className="px-4 py-3 font-medium text-foreground">{equipo.nro_serie}</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{obtenerNombreTipo(equipo.tipo_equipo_id)}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{obtenerNombreMarca(equipo.marca_equipo_id)}
										{equipo.modelo ? ` ${equipo.modelo}` : ""}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">{equipo.ano || "-"}</td>
									<td className="px-4 py-3 text-sm text-foreground text-right">
										{equipo.valor_asegurado.toLocaleString("es-BO", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</td>
									<td className="px-4 py-3 text-sm text-foreground text-right">
										{equipo.franquicia.toLocaleString("es-BO", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</td>
									<td className="px-4 py-3 text-center">
										<span
											className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
												equipo.uso === "publico"
													? "bg-info/15 text-info"
													: "bg-success/15 text-success"
											}`}
										>
											{equipo.uso === "publico" ? "Público" : "Particular"}
										</span>
									</td>
									<td className="px-4 py-3 text-center text-sm text-foreground">
										{equipo.coaseguro?.toLocaleString("es-BO", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
										%
									</td>
									<td className="px-4 py-3 text-center">
										<div className="flex items-center justify-center gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEditar(equipo, index)}
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEliminar(index)}
												className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<Button onClick={handleContinuar}>
					Continuar con Modalidad de Pago
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>

			{/* Modal para agregar/editar equipo */}
			{modalAbierto && (
				<EquipoModal
					equipo={equipoEditando}
					onGuardar={handleGuardarEquipo}
					onCancelar={() => {
						setModalAbierto(false);
						setEquipoEditando(null);
						setIndexEditando(null);
					}}
				/>
			)}

			{/* Diálogo: confirmar eliminación de equipo */}
			<AlertDialog
				open={equipoAEliminar !== null}
				onOpenChange={(open) => {
					if (!open) setEquipoAEliminar(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Está seguro de eliminar este equipo?</AlertDialogTitle>
						<AlertDialogDescription>Se quitará de la lista de la póliza.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmarEliminar}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
