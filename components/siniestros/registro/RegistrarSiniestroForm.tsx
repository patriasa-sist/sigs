"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import BotonWhatsAppRegistro from "../shared/BotonWhatsAppRegistro";
import { guardarSiniestro } from "@/app/siniestros/actions";
import { validarDetalles, validarCoberturas, validarFormularioCompleto } from "@/utils/siniestroValidation";
import SeleccionarPoliza from "./steps/SeleccionarPoliza";
import DetallesSiniestroStep from "./steps/DetallesSiniestro";
import CoberturasStepComponent from "./steps/Coberturas";
import DocumentosInicialesStep from "./steps/DocumentosIniciales";
import type {
	RegistroSiniestroFormState,
	PolizaParaSiniestro,
	DetallesSiniestro,
	CoberturasStep,
	DocumentoSiniestro,
} from "@/types/siniestro";

export default function RegistrarSiniestroForm() {
	const router = useRouter();
	const [formState, setFormState] = useState<RegistroSiniestroFormState>({
		paso_actual: 1,
		poliza_seleccionada: null,
		detalles: null,
		coberturas: null,
		documentos_iniciales: [],
		advertencias: [],
	});

	const [guardando, setGuardando] = useState(false);
	const guardandoRef = useRef(false);
	const [errores, setErrores] = useState<string[]>([]);
	const [registroExitoso, setRegistroExitoso] = useState(false);
	const [nuevoSiniestroId, setNuevoSiniestroId] = useState<string | null>(null);

	// Navegación entre pasos
	const irAPaso = (paso: 1 | 2 | 3 | 4) => {
		setFormState((prev) => ({ ...prev, paso_actual: paso }));
		setErrores([]);
	};

	const puedeAvanzar = (): boolean => {
		const { paso_actual, poliza_seleccionada, detalles, coberturas } = formState;

		switch (paso_actual) {
			case 1:
				return poliza_seleccionada !== null;
			case 2:
				const validacionDetalles = validarDetalles(detalles);
				if (!validacionDetalles.valido) {
					setErrores(validacionDetalles.errores);
					return false;
				}
				return true;
			case 3:
				const validacionCoberturas = validarCoberturas(coberturas);
				if (!validacionCoberturas.valido) {
					setErrores(validacionCoberturas.errores);
					return false;
				}
				return true;
			case 4:
				return true;
			default:
				return false;
		}
	};

	const handleSiguiente = () => {
		setErrores([]);

		if (!puedeAvanzar()) {
			return;
		}

		if (formState.paso_actual < 4) {
			irAPaso((formState.paso_actual + 1) as 1 | 2 | 3 | 4);
		}
	};

	const handleAnterior = () => {
		setErrores([]);
		if (formState.paso_actual > 1) {
			irAPaso((formState.paso_actual - 1) as 1 | 2 | 3 | 4);
		}
	};

	const handleGuardar = async () => {
		// Bloqueo inmediato con ref para evitar doble-click
		if (guardandoRef.current) return;
		guardandoRef.current = true;

		setErrores([]);

		// Validar formulario completo
		const validacion = validarFormularioCompleto(formState);

		if (!validacion.valido) {
			setErrores(validacion.errores);
			guardandoRef.current = false;
			return;
		}

		// Mostrar advertencias al usuario
		setFormState((prev) => ({
			...prev,
			advertencias: validacion.advertencias,
		}));

		setGuardando(true);

		try {
			const result = await guardarSiniestro(formState);

			if (result.success && result.data) {
				// Mostrar éxito y botón de WhatsApp
				setRegistroExitoso(true);
				setNuevoSiniestroId(result.data.siniestro_id);
			} else if (!result.success) {
				setErrores([result.error]);
			}
		} catch {
			setErrores(["Error inesperado al guardar el siniestro"]);
		} finally {
			setGuardando(false);
			guardandoRef.current = false;
		}
	};

	// Calcular progreso
	const progreso = (formState.paso_actual / 4) * 100;

	// Mostrar mensaje de éxito si el registro fue exitoso
	if (registroExitoso && nuevoSiniestroId) {
		return (
			<div className="max-w-3xl mx-auto">
				<div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-8">
					<div className="flex flex-col items-center text-center space-y-4">
						<CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
						<h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
							¡Siniestro registrado exitosamente!
						</h2>
						<p className="text-green-800 dark:text-green-200">
							El siniestro ha sido registrado correctamente en el sistema.
						</p>

						<div className="flex flex-col sm:flex-row gap-3 mt-6 w-full sm:w-auto">
							<BotonWhatsAppRegistro siniestroId={nuevoSiniestroId} />
							<Button
								onClick={() => router.push(`/siniestros/editar/${nuevoSiniestroId}`)}
								className="w-full sm:w-auto"
							>
								Ver Siniestro
							</Button>
							<Button
								variant="outline"
								onClick={() => router.push("/siniestros")}
								className="w-full sm:w-auto"
							>
								Volver al Dashboard
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto space-y-6">
			{/* Progress bar */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="font-medium">Paso {formState.paso_actual} de 4</span>
					<span className="text-muted-foreground">{Math.round(progreso)}% completado</span>
				</div>
				<Progress value={progreso} className="h-2" />
			</div>

			{/* Steps indicator */}
			<div className="grid grid-cols-4 gap-2">
				{[
					{ num: 1, label: "Póliza" },
					{ num: 2, label: "Detalles" },
					{ num: 3, label: "Coberturas" },
					{ num: 4, label: "Documentos" },
				].map((step) => (
					<button
						key={step.num}
						onClick={() => {
							if (step.num < formState.paso_actual) {
								irAPaso(step.num as 1 | 2 | 3 | 4);
							}
						}}
						className={`p-2 rounded-lg text-sm font-medium transition-colors ${
							step.num === formState.paso_actual
								? "bg-primary text-primary-foreground"
								: step.num < formState.paso_actual
									? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
									: "bg-muted text-muted-foreground"
						}`}
					>
						{step.num}. {step.label}
					</button>
				))}
			</div>

			{/* Errores globales */}
			{errores.length > 0 && (
				<div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<div className="flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<p className="font-semibold text-red-900 dark:text-red-100 mb-2">
								Se encontraron los siguientes errores:
							</p>
							<ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-200">
								{errores.map((error, idx) => (
									<li key={idx}>{error}</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Advertencias */}
			{formState.advertencias.length > 0 && (
				<div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
					<div className="flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Advertencias:</p>
							<ul className="list-disc list-inside space-y-1 text-sm text-amber-800 dark:text-amber-200">
								{formState.advertencias.map((adv, idx) => (
									<li key={idx}>{adv}</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Paso 1: Seleccionar Póliza */}
			{formState.paso_actual >= 1 && (
				<SeleccionarPoliza
					polizaSeleccionada={formState.poliza_seleccionada}
					onPolizaSelect={(poliza: PolizaParaSiniestro) =>
						setFormState((prev) => ({ ...prev, poliza_seleccionada: poliza }))
					}
					onPolizaDeselect={() => setFormState((prev) => ({ ...prev, poliza_seleccionada: null }))}
				/>
			)}

			{/* Paso 2: Detalles */}
			{formState.paso_actual >= 2 && formState.poliza_seleccionada && (
				<DetallesSiniestroStep
					detalles={formState.detalles}
					onDetallesChange={(detalles: DetallesSiniestro) =>
						setFormState((prev) => ({ ...prev, detalles }))
					}
				/>
			)}

			{/* Paso 3: Coberturas */}
			{formState.paso_actual >= 3 && formState.poliza_seleccionada && (
				<CoberturasStepComponent
					ramo={formState.poliza_seleccionada.ramo}
					coberturas={formState.coberturas}
					onCoberturasChange={(coberturas: CoberturasStep) =>
						setFormState((prev) => ({ ...prev, coberturas }))
					}
				/>
			)}

			{/* Paso 4: Documentos */}
			{formState.paso_actual >= 4 && (
				<DocumentosInicialesStep
					documentos={formState.documentos_iniciales}
					onAgregarDocumento={(doc: DocumentoSiniestro) =>
						setFormState((prev) => ({
							...prev,
							documentos_iniciales: [...prev.documentos_iniciales, doc],
						}))
					}
					onEliminarDocumento={(index: number) =>
						setFormState((prev) => ({
							...prev,
							documentos_iniciales: prev.documentos_iniciales.filter((_, i) => i !== index),
						}))
					}
				/>
			)}

			{/* Botones de navegación */}
			<div className="flex items-center justify-between border-t pt-6">
				<Button
					variant="outline"
					onClick={handleAnterior}
					disabled={formState.paso_actual === 1 || guardando}
				>
					<ChevronLeft className="h-4 w-4 mr-2" />
					Anterior
				</Button>

				<div className="flex gap-2">
					{formState.paso_actual < 4 ? (
						<Button onClick={handleSiguiente} disabled={guardando}>
							Siguiente
							<ChevronRight className="h-4 w-4 ml-2" />
						</Button>
					) : (
						<Button onClick={handleGuardar} disabled={guardando}>
							{guardando ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Guardar Siniestro
								</>
							)}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
