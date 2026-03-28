"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	ChevronLeft,
	ChevronRight,
	Save,
	Loader2,
	AlertCircle,
	CheckCircle2,
	X,
	Check,
	FileWarning,
} from "lucide-react";
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

// ── Step metadata ──────────────────────────────────────────────
const STEP_CONFIG = [
	{ label: "Póliza",      description: "Buscar y seleccionar póliza activa" },
	{ label: "Detalles",    description: "Fecha, lugar, monto y contactos" },
	{ label: "Coberturas",  description: "Coberturas afectadas" },
	{ label: "Documentos",  description: "Adjuntar documentos iniciales" },
];

function getStepSummary(paso: number, state: RegistroSiniestroFormState): string | null {
	switch (paso) {
		case 1:
			if (!state.poliza_seleccionada) return null;
			return `${state.poliza_seleccionada.numero_poliza} · ${state.poliza_seleccionada.cliente.nombre_completo}`;
		case 2: {
			if (!state.detalles?.fecha_siniestro || !state.detalles?.lugar_hecho) return null;
			const lugar = state.detalles.lugar_hecho.slice(0, 24);
			return `${new Date(state.detalles.fecha_siniestro).toLocaleDateString("es-BO")} · ${lugar}`;
		}
		case 3: {
			const count = state.coberturas?.coberturas_seleccionadas.length ?? 0;
			return count > 0 ? `${count} cobertura${count !== 1 ? "s" : ""}` : null;
		}
		case 4: {
			const count = state.documentos_iniciales.length;
			return count > 0 ? `${count} documento${count !== 1 ? "s" : ""}` : null;
		}
		default:
			return null;
	}
}

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
	const [registroExitoso, setRegistroExitoso] = useState(false);
	const [nuevoSiniestroId, setNuevoSiniestroId] = useState<string | null>(null);

	// Triggers de validación inline por paso (incrementar activa la validación en el step)
	const [validationTriggerStep2, setValidationTriggerStep2] = useState(0);
	const [showCoberturasError, setShowCoberturasError] = useState(false);
	const [guardadoError, setGuardadoError] = useState<string | null>(null);

	const irAPaso = (paso: 1 | 2 | 3 | 4) => {
		setFormState((prev) => ({ ...prev, paso_actual: paso }));
		setShowCoberturasError(false);
		setGuardadoError(null);
	};

	const puedeAvanzar = (): boolean => {
		const { paso_actual, poliza_seleccionada, detalles, coberturas } = formState;

		switch (paso_actual) {
			case 1:
				return poliza_seleccionada !== null;
			case 2: {
				const v = validarDetalles(detalles);
				if (!v.valido) {
					setValidationTriggerStep2((t) => t + 1); // activa errores inline en el step
					return false;
				}
				return true;
			}
			case 3: {
				const v = validarCoberturas(coberturas);
				if (!v.valido) {
					setShowCoberturasError(true);
					return false;
				}
				return true;
			}
			case 4:
				return true;
			default:
				return false;
		}
	};

	const handleSiguiente = () => {
		if (!puedeAvanzar()) return;
		if (formState.paso_actual < 4) {
			irAPaso((formState.paso_actual + 1) as 1 | 2 | 3 | 4);
		}
	};

	const handleAnterior = () => {
		if (formState.paso_actual > 1) {
			irAPaso((formState.paso_actual - 1) as 1 | 2 | 3 | 4);
		}
	};

	const handleCancelar = () => {
		if (confirm("¿Está seguro de cancelar? Se perderán todos los datos ingresados.")) {
			router.push("/siniestros");
		}
	};

	const handleGuardar = async () => {
		if (guardandoRef.current) return;
		guardandoRef.current = true;
		setGuardadoError(null);

		const validacion = validarFormularioCompleto(formState);
		if (!validacion.valido) {
			setGuardadoError(validacion.errores.join(" · "));
			guardandoRef.current = false;
			return;
		}

		setFormState((prev) => ({ ...prev, advertencias: validacion.advertencias }));
		setGuardando(true);

		try {
			const result = await guardarSiniestro(formState);
			if (result.success && result.data) {
				setRegistroExitoso(true);
				setNuevoSiniestroId(result.data.siniestro_id);
			} else if (!result.success) {
				setGuardadoError(result.error);
			}
		} catch {
			setGuardadoError("Error inesperado al guardar el siniestro");
		} finally {
			setGuardando(false);
			guardandoRef.current = false;
		}
	};

	// ── Estado de éxito ──────────────────────────────────────────
	if (registroExitoso && nuevoSiniestroId) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
				<Card className="max-w-lg mx-auto shadow-sm">
					<CardContent className="p-8 flex flex-col items-center text-center space-y-4">
						<div className="p-3 rounded-full bg-teal-50">
							<CheckCircle2 className="h-10 w-10 text-teal-700" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-foreground">
								Siniestro registrado
							</h2>
							<p className="text-sm text-muted-foreground mt-1">
								El siniestro fue registrado correctamente en el sistema.
							</p>
						</div>
						<div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
							<BotonWhatsAppRegistro siniestroId={nuevoSiniestroId} />
							<Button
								onClick={() => router.push(`/siniestros/editar/${nuevoSiniestroId}`)}
								className="flex-1"
							>
								Ver siniestro
							</Button>
							<Button
								variant="outline"
								onClick={() => router.push("/siniestros")}
								className="flex-1"
							>
								Volver al dashboard
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// ── Layout principal ─────────────────────────────────────────
	return (
		<div className="max-w-7xl mx-auto">
			{/* Sticky header */}
			<div className="sticky top-0 z-20 bg-[#F1F4F9] border-b border-[#E2E8F0] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-4 mb-6">
				<div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
					<div className="flex items-center gap-3 min-w-0">
						<button
							onClick={() => router.push("/siniestros")}
							className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
						>
							<ChevronLeft className="h-4 w-4" />
							Siniestros
						</button>
						<span className="text-[#CBD5E1]">/</span>
						<FileWarning className="h-5 w-5 text-primary shrink-0" />
						<div className="min-w-0">
							<h1 className="text-xl font-semibold text-foreground leading-tight">
								Registrar Siniestro
							</h1>
							<p className="text-sm text-muted-foreground leading-tight">
								{STEP_CONFIG[formState.paso_actual - 1]?.label} — Paso {formState.paso_actual} de 4
							</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCancelar}
						className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/8"
					>
						<X className="h-4 w-4 mr-1.5" />
						Cancelar
					</Button>
				</div>
			</div>

			{/* Mobile progress segments */}
			<div className="lg:hidden mb-5 px-4 sm:px-6">
				<div className="flex gap-1 mb-2">
					{[1, 2, 3, 4].map((paso) => (
						<div
							key={paso}
							className={`h-1.5 flex-1 rounded-md transition-colors ${
								paso <= formState.paso_actual ? "bg-primary" : "bg-border"
							}`}
						/>
					))}
				</div>
				<p className="text-xs text-muted-foreground">
					Paso {formState.paso_actual} de 4 · {STEP_CONFIG[formState.paso_actual - 1]?.label}
				</p>
			</div>

			{/* Two-column layout */}
			<div className="flex gap-8 items-start px-4 sm:px-6 lg:px-8">
				{/* Sidebar */}
				<aside className="hidden lg:block w-52 shrink-0 sticky top-[81px] self-start">
					<div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
						<div className="px-4 py-3 border-b border-border">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Progreso del formulario
							</p>
						</div>
						<div className="p-3 space-y-0.5">
							{STEP_CONFIG.map((step, i) => {
								const stepNum = i + 1;
								const isCompleted = formState.paso_actual > stepNum;
								const isActive = formState.paso_actual === stepNum;
								const summary = getStepSummary(stepNum, formState);

								return (
									<div key={i} className="relative">
										{/* Connector line */}
										{i < 3 && (
											<div
												className={`absolute left-[15px] top-8 w-px h-3 ${
													isCompleted ? "bg-primary/30" : "bg-border"
												}`}
											/>
										)}
										<div
											className={`flex items-start gap-2.5 px-2 py-2 rounded-md transition-colors ${
												isActive ? "bg-primary/8" : ""
											}`}
										>
											{/* Step circle */}
											<div
												className={`w-[22px] h-[22px] shrink-0 rounded-md flex items-center justify-center text-xs font-semibold mt-0.5 transition-colors ${
													isCompleted
														? "bg-primary text-primary-foreground"
														: isActive
															? "bg-primary text-primary-foreground"
															: "border-2 border-border text-muted-foreground"
												}`}
											>
												{isCompleted ? <Check className="h-3 w-3" /> : stepNum}
											</div>
											{/* Step info */}
											<div className="flex-1 min-w-0">
												<p
													className={`text-sm font-medium leading-tight ${
														isActive
															? "text-primary"
															: isCompleted
																? "text-foreground"
																: "text-muted-foreground"
													}`}
												>
													{step.label}
												</p>
												{summary && isCompleted && (
													<p className="text-[0.8125rem] text-muted-foreground truncate mt-0.5 leading-tight">
														{summary}
													</p>
												)}
												{isActive && (
													<p className="text-[0.8125rem] text-primary/70 mt-0.5">
														En progreso
													</p>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</aside>

				{/* Form content */}
				<div className="flex-1 min-w-0 space-y-5 pb-8">
					{/* Error de guardado (solo para el paso final) */}
					{guardadoError && (
						<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
							<div className="flex items-start gap-2">
								<AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
								<p className="text-sm text-foreground">{guardadoError}</p>
							</div>
						</div>
					)}

					{/* Advertencias */}
					{formState.advertencias.length > 0 && (
						<div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
							<div className="flex items-start gap-2">
								<AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<p className="text-sm font-medium text-amber-900 mb-1">Advertencias:</p>
									<ul className="list-disc list-inside space-y-0.5 text-sm text-amber-800">
										{formState.advertencias.map((adv, idx) => (
											<li key={idx}>{adv}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

					{/* Paso 1: Póliza */}
					{formState.paso_actual >= 1 && (
						<SeleccionarPoliza
							polizaSeleccionada={formState.poliza_seleccionada}
							onPolizaSelect={(poliza: PolizaParaSiniestro) =>
								setFormState((prev) => ({ ...prev, poliza_seleccionada: poliza }))
							}
							onPolizaDeselect={() =>
								setFormState((prev) => ({ ...prev, poliza_seleccionada: null }))
							}
						/>
					)}

					{/* Paso 2: Detalles */}
					{formState.paso_actual >= 2 && formState.poliza_seleccionada && (
						<DetallesSiniestroStep
							detalles={formState.detalles}
							onDetallesChange={(detalles: DetallesSiniestro) =>
								setFormState((prev) => ({ ...prev, detalles }))
							}
							validationTrigger={validationTriggerStep2}
						/>
					)}

					{/* Paso 3: Coberturas */}
					{formState.paso_actual >= 3 && formState.poliza_seleccionada && (
						<CoberturasStepComponent
							ramo={formState.poliza_seleccionada.ramo}
							coberturas={formState.coberturas}
							onCoberturasChange={(coberturas: CoberturasStep) => {
								setShowCoberturasError(false);
								setFormState((prev) => ({ ...prev, coberturas }));
							}}
							showMinError={showCoberturasError}
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

					{/* Navegación */}
					<div className="flex items-center justify-between pt-2 border-t border-border">
						<Button
							variant="outline"
							onClick={handleAnterior}
							disabled={formState.paso_actual === 1 || guardando}
						>
							<ChevronLeft className="h-4 w-4 mr-2" />
							Anterior
						</Button>

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
		</div>
	);
}
