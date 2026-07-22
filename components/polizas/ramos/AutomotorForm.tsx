"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Plus,
	FileSpreadsheet,
	Car,
	Edit,
	Trash2,
	Download,
} from "lucide-react";
import type { DatosAutomotor, VehiculoAutomotor, TipoVehiculo, MarcaVehiculo } from "@/types/poliza";
import { validarPlacasUnicas } from "@/utils/polizaValidation";
import { importarVehiculosDesdeExcel, generarTemplateExcel } from "@/utils/vehiculoExcelImport";
import { Button } from "@/components/ui/button";
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
import { VehiculoModal } from "./VehiculoModal";
import { createClient } from "@/utils/supabase/client";
import { captureError } from "@/utils/sentry";

type Props = {
	datos: DatosAutomotor | null;
	onChange: (datos: DatosAutomotor) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

const FORMATO_MONEDA = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

type VehiculoRowProps = {
	vehiculo: VehiculoAutomotor;
	index: number;
	tipoNombre: string;
	marcaNombre: string;
	onEditar: (vehiculo: VehiculoAutomotor, index: number) => void;
	onEliminar: (index: number) => void;
};

/**
 * Fila de vehículo memoizada: recibe los nombres ya resueltos como strings y
 * handlers estables, de modo que escribir en otros campos del paso (o cargar
 * cientos de vehículos) no obliga a repintar todas las filas.
 */
const VehiculoRow = memo(function VehiculoRow({
	vehiculo,
	index,
	tipoNombre,
	marcaNombre,
	onEditar,
	onEliminar,
}: VehiculoRowProps) {
	const marcaModelo = [marcaNombre, vehiculo.modelo].filter(Boolean).join(" ") || "-";

	return (
		<tr className="hover:bg-muted/50">
			<td className="px-2.5 py-1.5 font-medium text-foreground whitespace-nowrap">{vehiculo.placa}</td>
			<td className="px-2.5 py-1.5 text-muted-foreground">{tipoNombre}</td>
			<td className="px-2.5 py-1.5 text-muted-foreground">{marcaModelo}</td>
			<td className="px-2.5 py-1.5 text-muted-foreground text-right">{vehiculo.ano || "-"}</td>
			<td className="px-2.5 py-1.5 text-foreground text-right whitespace-nowrap">
				{vehiculo.valor_asegurado.toLocaleString("es-BO", FORMATO_MONEDA)}
			</td>
			<td className="px-2.5 py-1.5 text-foreground text-right whitespace-nowrap">
				{vehiculo.franquicia.toLocaleString("es-BO", FORMATO_MONEDA)}
			</td>
			<td className="px-2.5 py-1.5 text-center">
				<span
					className={`inline-flex px-1.5 py-0.5 font-medium rounded-full ${
						vehiculo.uso === "publico" ? "bg-info/15 text-info" : "bg-success/15 text-success"
					}`}
				>
					{vehiculo.uso === "publico" ? "Público" : "Particular"}
				</span>
			</td>
			<td className="px-2.5 py-1.5 text-right text-foreground whitespace-nowrap">
				{vehiculo.coaseguro?.toLocaleString("es-BO", FORMATO_MONEDA)}%
			</td>
			<td className="px-2.5 py-1.5 text-center">
				<div className="flex items-center justify-center gap-1">
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditar(vehiculo, index)}>
						<Edit className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => onEliminar(index)}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</td>
		</tr>
	);
});

export function AutomotorForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(datos?.tipo_poliza || "individual");
	const [vehiculos, setVehiculos] = useState<VehiculoAutomotor[]>(datos?.vehiculos || []);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoAutomotor | null>(null);
	const [indexEditando, setIndexEditando] = useState<number | null>(null);
	const [errores, setErrores] = useState<string[]>([]);
	const [advertencias, setAdvertencias] = useState<string[]>([]);
	const [importando, setImportando] = useState(false);
	const [vehiculoAEliminar, setVehiculoAEliminar] = useState<number | null>(null);

	// Catálogos para mostrar nombres en lugar de IDs
	const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
	const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);

	// Cargar catálogos al montar el componente
	useEffect(() => {
		const cargarCatalogos = async () => {
			try {
				const supabase = createClient();

				const [{ data: tiposData, error: errorTipos }, { data: marcasData, error: errorMarcas }] =
					await Promise.all([
						supabase.from("tipos_vehiculo").select("*").eq("activo", true).order("nombre"),
						supabase.from("marcas_vehiculo").select("*").eq("activo", true).order("nombre"),
					]);

				if (errorTipos) {
					captureError(errorTipos, "AutomotorForm.cargarCatalogos.tipos");
				}

				if (errorMarcas) {
					captureError(errorMarcas, "AutomotorForm.cargarCatalogos.marcas");
				}

				// RLS sin sesión devuelve 0 filas SIN error: reportarlo para no
				// quedar ciegos si los nombres dejan de resolverse en la tabla.
				if (!errorTipos && !errorMarcas && (tiposData?.length ?? 0) === 0 && (marcasData?.length ?? 0) === 0) {
					captureError(
						new Error("Catálogos de vehículo llegaron vacíos sin error (¿query sin sesión?)"),
						"AutomotorForm.cargarCatalogos",
					);
				}

				setTiposVehiculo(tiposData || []);
				setMarcas(marcasData || []);
			} catch (error) {
				captureError(error, "AutomotorForm.cargarCatalogos");
			}
		};
		cargarCatalogos();
	}, []);

	// Mapas id → nombre para lookup O(1) en cada fila (en vez de .find() O(n) por celda,
	// que con cientos de vehículos repintaba lentísimo en cada render).
	const tiposMap = useMemo(() => new Map(tiposVehiculo.map((t) => [t.id, t.nombre])), [tiposVehiculo]);
	const marcasMap = useMemo(() => new Map(marcas.map((m) => [m.id, m.nombre])), [marcas]);

	// Agregar o editar vehículo
	const handleGuardarVehiculo = (vehiculo: VehiculoAutomotor) => {
		let nuevosVehiculos: VehiculoAutomotor[];

		if (indexEditando !== null) {
			// Editar vehículo existente
			nuevosVehiculos = [...vehiculos];
			nuevosVehiculos[indexEditando] = vehiculo;
		} else {
			// Agregar nuevo vehículo
			nuevosVehiculos = [...vehiculos, vehiculo];
		}

		// Validar placas únicas
		const validacion = validarPlacasUnicas(nuevosVehiculos);
		if (!validacion.valido) {
			setErrores(validacion.errores.map((e) => e.mensaje));
			return;
		}

		setVehiculos(nuevosVehiculos);
		onChange({ tipo_poliza: tipoPoliza, vehiculos: nuevosVehiculos });
		setModalAbierto(false);
		setVehiculoEditando(null);
		setIndexEditando(null);
		setErrores([]);
	};

	// Abrir modal para agregar
	const handleAgregarNuevo = () => {
		setVehiculoEditando(null);
		setIndexEditando(null);
		setModalAbierto(true);
	};

	// Abrir modal para editar (estable para no romper la memoización de las filas)
	const handleEditar = useCallback((vehiculo: VehiculoAutomotor, index: number) => {
		setVehiculoEditando(vehiculo);
		setIndexEditando(index);
		setModalAbierto(true);
	}, []);

	// Eliminar vehículo (pide confirmación vía AlertDialog)
	const handleEliminar = useCallback((index: number) => {
		setVehiculoAEliminar(index);
	}, []);

	const confirmarEliminar = () => {
		if (vehiculoAEliminar === null) return;
		const nuevosVehiculos = vehiculos.filter((_, i) => i !== vehiculoAEliminar);
		setVehiculos(nuevosVehiculos);
		onChange({ tipo_poliza: tipoPoliza, vehiculos: nuevosVehiculos });
		setVehiculoAEliminar(null);
	};

	// Importar desde Excel
	const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setImportando(true);
		setErrores([]);
		setAdvertencias([]);

		try {
			const resultado = await importarVehiculosDesdeExcel(file, { marcas, tiposVehiculo });

			// Mostrar advertencias no bloqueantes (marca/tipo no reconocidos, etc.)
			if (resultado.advertencias && resultado.advertencias.length > 0) {
				setAdvertencias(resultado.advertencias.map((a) => `Fila ${a.fila}: ${a.advertencias.join(" ")}`));
			}

			if (resultado.exito && resultado.vehiculos_validos.length > 0) {
				// Combinar con vehículos existentes
				const nuevosVehiculos = [...vehiculos, ...resultado.vehiculos_validos];

				// Validar placas únicas
				const validacion = validarPlacasUnicas(nuevosVehiculos);
				if (!validacion.valido) {
					setErrores(validacion.errores.map((e) => e.mensaje));
					setImportando(false);
					return;
				}

				setVehiculos(nuevosVehiculos);
				onChange({ tipo_poliza: tipoPoliza, vehiculos: nuevosVehiculos });

				// Mostrar errores si los hay (filas con problemas)
				if (resultado.errores.length > 0) {
					const mensajesError = resultado.errores.map((e) => `Fila ${e.fila}: ${e.errores.join(", ")}`);
					setErrores([`Se importaron ${resultado.vehiculos_validos.length} vehículos.`, ...mensajesError]);
				} else {
					toast.success(`Se importaron ${resultado.vehiculos_validos.length} vehículos exitosamente.`);
				}
			} else {
				setErrores(
					resultado.errores.length > 0
						? resultado.errores.map((e) => `Fila ${e.fila}: ${e.errores.join(", ")}`)
						: ["No se pudieron importar vehículos del archivo."],
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
			await generarTemplateExcel();
		} catch (error) {
			console.error("Error generando template:", error);
			toast.error("Error al generar el template");
		}
	};

	const handleContinuar = () => {
		if (vehiculos.length === 0) {
			setErrores(["Debe agregar al menos un vehículo."]);
			return;
		}

		onChange({ tipo_poliza: tipoPoliza, vehiculos });
		onSiguiente();
	};

	// Handler para cambio de tipo de póliza
	const handleTipoPolizaChange = (value: "individual" | "corporativo") => {
		setTipoPoliza(value);
		onChange({ tipo_poliza: value, vehiculos });
	};

	const tieneVehiculos = vehiculos.length > 0;

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-foreground">Paso 3: Vehículos Asegurados</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Agregue los vehículos que serán asegurados en esta póliza
					</p>
				</div>

				{tieneVehiculos && (
					<div className="flex items-center gap-2 text-success">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">{vehiculos.length} vehículo(s)</span>
					</div>
				)}
			</div>

			{/* Tipo de Póliza */}
			<div className="mb-6 p-4 bg-secondary rounded-lg border border-border">
				<Label htmlFor="tipo-poliza" className="block text-sm font-medium text-foreground mb-2">
					Tipo de Póliza
				</Label>
				<Select value={tipoPoliza} onValueChange={handleTipoPolizaChange}>
					<SelectTrigger id="tipo-poliza" className="w-full max-w-xs bg-background">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="individual">Individual</SelectItem>
						<SelectItem value="corporativo">Corporativo</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground mt-1">
					Seleccione si la póliza es para un cliente individual o corporativo
				</p>
			</div>

			{/* Botones de acciones */}
			<div className="flex flex-wrap gap-3 mb-6">
				<Button onClick={handleAgregarNuevo}>
					<Plus className="mr-2 h-4 w-4" />
					Agregar Vehículo
				</Button>

				<Button variant="outline" onClick={handleDescargarTemplate}>
					<Download className="mr-2 h-4 w-4" />
					Descargar Template Excel
				</Button>

				<label htmlFor="excel-upload">
					<Button variant="outline" asChild disabled={importando}>
						<span>
							<FileSpreadsheet className="mr-2 h-4 w-4" />
							{importando ? "Importando..." : "Importar Excel"}
						</span>
					</Button>
					<input
						id="excel-upload"
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

			{/* Advertencias (no bloqueantes) */}
			{advertencias.length > 0 && (
				<div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
					<h4 className="text-sm font-semibold text-warning-foreground mb-2">Advertencias de importación:</h4>
					<p className="text-xs text-warning-foreground mb-2">
						Los vehículos se importaron, pero revise estos datos y complételos manualmente si corresponde.
					</p>
					<ul className="text-sm text-warning-foreground space-y-1">
						{advertencias.map((adv, i) => (
							<li key={i}>• {adv}</li>
						))}
					</ul>
				</div>
			)}

			{/* Tabla de vehículos */}
			{vehiculos.length === 0 ? (
				<div className="text-center py-12 border-2 border-dashed rounded-lg">
					<Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground mb-2">No hay vehículos agregados</p>
					<p className="text-sm text-muted-foreground">Agregue vehículos manualmente o importe desde Excel</p>
				</div>
			) : (
				<div className="overflow-x-auto border rounded-lg mb-6">
					<table className="w-full text-xs">
						<thead className="bg-muted/50">
							<tr>
								<th className="px-2.5 py-2 text-left font-medium text-muted-foreground uppercase">
									Placa
								</th>
								<th className="px-2.5 py-2 text-left font-medium text-muted-foreground uppercase">
									Tipo
								</th>
								<th className="px-2.5 py-2 text-left font-medium text-muted-foreground uppercase">
									Marca/Modelo
								</th>
								<th className="px-2.5 py-2 text-right font-medium text-muted-foreground uppercase">
									Año
								</th>
								<th className="px-2.5 py-2 text-right font-medium text-muted-foreground uppercase">
									Valor Aseg.
								</th>
								<th className="px-2.5 py-2 text-right font-medium text-muted-foreground uppercase">
									Franquicia
								</th>
								<th className="px-2.5 py-2 text-center font-medium text-muted-foreground uppercase">
									Uso
								</th>
								<th className="px-2.5 py-2 text-right font-medium text-muted-foreground uppercase">
									Coas.
								</th>
								<th className="px-2.5 py-2 text-center font-medium text-muted-foreground uppercase">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{vehiculos.map((vehiculo, index) => (
								<VehiculoRow
									key={index}
									vehiculo={vehiculo}
									index={index}
									tipoNombre={
										vehiculo.tipo_vehiculo_id
											? (tiposMap.get(vehiculo.tipo_vehiculo_id) ??
												vehiculo.tipo_vehiculo_nombre ??
												vehiculo.tipo_vehiculo_id)
											: "-"
									}
									marcaNombre={
										vehiculo.marca_id
											? (marcasMap.get(vehiculo.marca_id) ??
												vehiculo.marca_nombre ??
												vehiculo.marca_id)
											: ""
									}
									onEditar={handleEditar}
									onEliminar={handleEliminar}
								/>
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

				<Button onClick={handleContinuar} disabled={vehiculos.length === 0}>
					Continuar con Modalidad de Pago
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>

			{/* Modal para agregar/editar vehículo */}
			{modalAbierto && (
				<VehiculoModal
					vehiculo={vehiculoEditando}
					onGuardar={handleGuardarVehiculo}
					onCancelar={() => {
						setModalAbierto(false);
						setVehiculoEditando(null);
						setIndexEditando(null);
					}}
				/>
			)}

			{/* Diálogo: confirmar eliminación de vehículo */}
			<AlertDialog
				open={vehiculoAEliminar !== null}
				onOpenChange={(open) => {
					if (!open) setVehiculoAEliminar(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar este vehículo?</AlertDialogTitle>
						<AlertDialogDescription>
							El vehículo se quitará de la lista de la póliza.
						</AlertDialogDescription>
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
