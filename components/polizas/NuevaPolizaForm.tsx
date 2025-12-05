"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, X } from "lucide-react";
import type { PolizaFormState, PasoFormulario } from "@/types/poliza";
import { Button } from "@/components/ui/button";

// Steps
import { BuscarAsegurado } from "./steps/BuscarAsegurado";
import { DatosBasicos } from "./steps/DatosBasicos";
// import { DatosEspecificos } from "./steps/DatosEspecificos";
// import { ModalidadPago } from "./steps/ModalidadPago";
// import { CargarDocumentos } from "./steps/CargarDocumentos";
// import { Resumen } from "./steps/Resumen";

export function NuevaPolizaForm() {
	const router = useRouter();

	// Estado global del formulario
	const [formState, setFormState] = useState<PolizaFormState>({
		paso_actual: 1,
		asegurado: null,
		datos_basicos: null,
		datos_especificos: null,
		modalidad_pago: null,
		documentos: [],
		advertencias: [],
		en_edicion: false,
	});

	// Navegación
	const handleCancelar = () => {
		if (
			confirm("¿Está seguro de cancelar? Se perderán todos los datos ingresados.")
		) {
			router.push("/polizas");
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
				{/* {formState.paso_actual >= 3 && (
					<DatosEspecificos
						ramo={formState.datos_basicos?.ramo || ""}
						datos={formState.datos_especificos}
						onChange={(datos) => {
							setFormState((prev) => ({
								...prev,
								datos_especificos: datos,
							}));
						}}
						onSiguiente={handleSiguientePaso}
						onAnterior={handlePasoAnterior}
					/>
				)} */}

				{/* Paso 4, 5, 6... se agregarán aquí */}
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
