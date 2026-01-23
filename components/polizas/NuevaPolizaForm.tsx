"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";
import type { PolizaFormState, PasoFormulario, ProductoAseguradora } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { guardarPoliza } from "@/app/polizas/nueva/actions";
import { actualizarPoliza } from "@/app/polizas/[id]/editar/actions";
import { createClient } from "@/utils/supabase/client";

// Steps
import { BuscarAsegurado } from "./steps/BuscarAsegurado";
import { DatosBasicos } from "./steps/DatosBasicos";
import { DatosEspecificos } from "./steps/DatosEspecificos";
import { ModalidadPago } from "./steps/ModalidadPago";
import { CargarDocumentos } from "./steps/CargarDocumentos";
import { Resumen } from "./steps/Resumen";

interface NuevaPolizaFormProps {
	mode?: "create" | "edit";
	polizaId?: string;
	initialData?: PolizaFormState;
}

export function NuevaPolizaForm({ mode = "create", polizaId, initialData }: NuevaPolizaFormProps) {
	const router = useRouter();

	// Estado global del formulario - usa initialData si está disponible
	const [formState, setFormState] = useState<PolizaFormState>(() => {
		if (initialData) {
			return initialData;
		}
		return {
			paso_actual: 1,
			asegurado: null,
			datos_basicos: null,
			datos_especificos: null,
			modalidad_pago: null,
			documentos: [],
			advertencias: [],
			en_edicion: false,
		};
	});

	// Catálogos
	const [regionales, setRegionales] = useState<Array<{ id: string; nombre: string }>>([]);

	// Estado para producto y comisión de usuario
	const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoAseguradora | null>(null);
	const [porcentajeComisionUsuario, setPorcentajeComisionUsuario] = useState<number>(0.5);

	// Cargar regionales al montar el componente
	useEffect(() => {
		const cargarRegionales = async () => {
			const supabase = createClient();
			const { data } = await supabase
				.from("regionales")
				.select("id, nombre")
				.eq("activo", true)
				.order("nombre");

			if (data) {
				setRegionales(data);
			}
		};

		cargarRegionales();
	}, []);

	// Cargar producto cuando cambia producto_id en datos_basicos
	useEffect(() => {
		const cargarProducto = async () => {
			if (!formState.datos_basicos?.producto_id) {
				setProductoSeleccionado(null);
				return;
			}

			const supabase = createClient();
			const { data, error } = await supabase
				.from("productos_aseguradoras")
				.select("*")
				.eq("id", formState.datos_basicos.producto_id)
				.single();

			if (error) {
				console.error("Error cargando producto:", error);
				setProductoSeleccionado(null);
				return;
			}

			setProductoSeleccionado(data);
		};

		cargarProducto();
	}, [formState.datos_basicos?.producto_id]);

	// Cargar porcentaje de comisión del responsable
	useEffect(() => {
		const cargarPorcentajeUsuario = async () => {
			if (!formState.datos_basicos?.responsable_id) {
				setPorcentajeComisionUsuario(0.5); // Default
				return;
			}

			const supabase = createClient();
			const { data, error } = await supabase
				.from("profiles")
				.select("porcentaje_comision")
				.eq("id", formState.datos_basicos.responsable_id)
				.single();

			if (error || !data) {
				console.error("Error cargando porcentaje de comisión:", error);
				setPorcentajeComisionUsuario(0.5); // Default
				return;
			}

			setPorcentajeComisionUsuario(data.porcentaje_comision || 0.5);
		};

		cargarPorcentajeUsuario();
	}, [formState.datos_basicos?.responsable_id]);

	// Navegación
	const handleCancelar = () => {
		const mensaje = mode === "edit"
			? "¿Está seguro de cancelar? Se perderán los cambios no guardados."
			: "¿Está seguro de cancelar? Se perderán todos los datos ingresados.";

		if (confirm(mensaje)) {
			if (mode === "edit" && polizaId) {
				router.push(`/polizas/${polizaId}`);
			} else {
				router.push("/polizas");
			}
		}
	};

	const handleSiguientePaso = () => {
		const siguientePaso = (formState.paso_actual + 1) as PasoFormulario;
		if (siguientePaso <= 6) {
			setFormState((prev) => ({
				...prev,
				paso_actual: siguientePaso,
			}));
		}
	};

	const handlePasoAnterior = () => {
		const pasoAnterior = (formState.paso_actual - 1) as PasoFormulario;
		if (pasoAnterior >= 1) {
			setFormState((prev) => ({
				...prev,
				paso_actual: pasoAnterior,
			}));
		}
	};

	const handleActualizarPaso = (paso: PasoFormulario) => {
		setFormState((prev) => ({
			...prev,
			paso_actual: paso,
		}));
	};

	const handleGuardar = async () => {
		try {
			let resultado;

			if (mode === "edit" && polizaId) {
				// Modo edición - usar actualizarPoliza
				resultado = await actualizarPoliza(polizaId, formState);
				if (resultado.success) {
					alert("Póliza actualizada exitosamente!");
					router.push(`/polizas/${polizaId}`);
				} else {
					alert(`Error al actualizar la póliza: ${resultado.error}`);
				}
			} else {
				// Modo creación - usar guardarPoliza
				resultado = await guardarPoliza(formState);
				if (resultado.success) {
					alert("Póliza guardada exitosamente!");
					router.push("/polizas");
				} else {
					alert(`Error al guardar la póliza: ${resultado.error}`);
				}
			}
		} catch (error) {
			console.error("Error guardando póliza:", error);
			alert("Error al guardar la póliza. Por favor intente nuevamente.");
		}
	};

	// Renderizar pasos de forma acumulativa
	const renderPasosAcumulativos = () => {
		return (
			<div className="space-y-6">
				{/* Paso 1: Buscar Asegurado - Siempre visible */}
				{formState.paso_actual >= 1 && (
					<BuscarAsegurado
						asegurado={formState.asegurado}
						onAseguradoSeleccionado={(asegurado) => {
							setFormState((prev) => ({
								...prev,
								asegurado,
							}));
						}}
						onSiguiente={handleSiguientePaso}
					/>
				)}

				{/* Paso 2: Datos Básicos - Visible desde paso 2 */}
				{formState.paso_actual >= 2 && (
					<DatosBasicos
						datos={formState.datos_basicos}
						onChange={(datos) => {
							setFormState((prev) => ({
								...prev,
								datos_basicos: datos,
							}));
						}}
						onSiguiente={handleSiguientePaso}
						onAnterior={handlePasoAnterior}
					/>
				)}

				{/* Paso 3: Datos Específicos - Visible desde paso 3 */}
				{formState.paso_actual >= 3 && formState.datos_basicos && (
					<DatosEspecificos
						ramo={formState.datos_basicos.ramo}
						datos={formState.datos_especificos}
					regionales={regionales}
						onChange={(datos) => {
							setFormState((prev) => ({
								...prev,
								datos_especificos: datos,
							}));
						}}
						onSiguiente={handleSiguientePaso}
						onAnterior={handlePasoAnterior}
					/>
				)}

				{/* Paso 4: Modalidad de Pago - Visible desde paso 4 */}
			{formState.paso_actual >= 4 && (
				<ModalidadPago
					datos={formState.modalidad_pago}
					inicioVigencia={formState.datos_basicos?.inicio_vigencia}
					finVigencia={formState.datos_basicos?.fin_vigencia}
					producto={productoSeleccionado}
					porcentajeComisionUsuario={porcentajeComisionUsuario}
					onChange={(datos) => {
						setFormState((prev) => ({
							...prev,
							modalidad_pago: datos,
						}));
					}}
					onSiguiente={handleSiguientePaso}
					onAnterior={handlePasoAnterior}
				/>
			)}

			{/* Paso 5: Cargar Documentos - Visible desde paso 5 */}
			{formState.paso_actual >= 5 && (
				<CargarDocumentos
					documentos={formState.documentos}
					onChange={(documentos) => {
						setFormState((prev) => ({
							...prev,
							documentos,
						}));
					}}
					onSiguiente={handleSiguientePaso}
					onAnterior={handlePasoAnterior}
				/>
			)}

			{/* Paso 6: Resumen - Visible en paso 6 */}
			{formState.paso_actual === 6 && (
				<Resumen
					formState={formState}
					onAnterior={handlePasoAnterior}
					onEditarPaso={handleActualizarPaso}
					onGuardar={handleGuardar}
				/>
			)}
			</div>
		);
	};

	return (
		<div className="max-w-6xl mx-auto">
			{/* Header */}
			<div className="mb-8 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<FileText className="h-8 w-8 text-primary" />
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							{formState.en_edicion ? "Editar Póliza" : "Nueva Póliza"}
						</h1>
						<p className="text-sm text-gray-600 mt-1">
							Paso {formState.paso_actual} de 6
						</p>
					</div>
				</div>

				<Button variant="ghost" onClick={handleCancelar}>
					<X className="h-4 w-4 mr-2" />
					Cancelar
				</Button>
			</div>

			{/* Progress Bar */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-2">
					{[1, 2, 3, 4, 5, 6].map((paso) => (
						<div
							key={paso}
							className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
								paso <= formState.paso_actual
									? "bg-primary"
									: "bg-gray-200"
							}`}
						/>
					))}
				</div>
				<div className="flex items-center justify-between text-xs text-gray-600">
					<span
						className={formState.paso_actual === 1 ? "font-semibold" : ""}
					>
						Asegurado
					</span>
					<span
						className={formState.paso_actual === 2 ? "font-semibold" : ""}
					>
						Datos
					</span>
					<span
						className={formState.paso_actual === 3 ? "font-semibold" : ""}
					>
						Específicos
					</span>
					<span
						className={formState.paso_actual === 4 ? "font-semibold" : ""}
					>
						Pago
					</span>
					<span
						className={formState.paso_actual === 5 ? "font-semibold" : ""}
					>
						Documentos
					</span>
					<span
						className={formState.paso_actual === 6 ? "font-semibold" : ""}
					>
						Resumen
					</span>
				</div>
			</div>

			{/* Formulario con pasos verticales acumulativos */}
			{renderPasosAcumulativos()}
		</div>
	);
}
