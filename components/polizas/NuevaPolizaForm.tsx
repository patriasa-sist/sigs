"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, X, Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
	savePolizaDraft,
	loadPolizaDraft,
	clearPolizaDraft,
	hasPolizaDraft,
	getPolizaDraftTimestamp,
	formatDraftAge,
} from "@/utils/polizaFormStorage";
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

// ── Step metadata ──────────────────────────────────────────────
const STEP_CONFIG = [
	{ label: "Asegurado", description: "Buscar y seleccionar asegurado" },
	{ label: "Datos Básicos", description: "Número, compañía, fechas" },
	{ label: "Datos Específicos", description: "Datos según tipo de ramo" },
	{ label: "Modalidad de Pago", description: "Contado o crédito" },
	{ label: "Documentos", description: "Adjuntar documentos" },
	{ label: "Resumen", description: "Revisar y confirmar" },
];

function getStepSummary(paso: number, state: PolizaFormState): string | null {
	switch (paso) {
		case 1:
			return state.asegurado?.nombre_completo ?? null;
		case 2:
			if (!state.datos_basicos) return null;
			return `${state.datos_basicos.ramo} · ${state.datos_basicos.numero_poliza}`;
		case 3:
			if (!state.datos_especificos) return null;
			return state.datos_especificos.tipo_ramo;
		case 4: {
			if (!state.modalidad_pago) return null;
			const tipo = state.modalidad_pago.tipo === "contado" ? "Contado" : "Crédito";
			return `${tipo} · ${state.modalidad_pago.moneda ?? ""} ${state.modalidad_pago.prima_total?.toLocaleString("es-BO") ?? ""}`;
		}
		case 5: {
			const docs = state.documentos.filter((d) => d.upload_status === "uploaded" || d.id);
			return docs.length > 0 ? `${docs.length} doc${docs.length !== 1 ? "s" : ""}` : null;
		}
		default:
			return null;
	}
}

/**
 * Parsea el mensaje de error devuelto por el server action y retorna título
 * y descripción adecuados para el toast, similar al patrón usado en clientes.
 */
function parsePolizaError(
	error: string | undefined,
	action: "guardar" | "editar",
): { title: string; description?: string } {
	const actionLabel = action === "editar" ? "actualizar" : "guardar";
	if (!error) {
		return { title: `Error al ${actionLabel} la póliza`, description: "Por favor intente nuevamente." };
	}

	// Número de póliza duplicado
	if (error.includes("número de póliza") || error.includes("numero_poliza")) {
		return {
			title: "Número de póliza duplicado",
			description: "Ya existe una póliza registrada con ese número. Verifique el número ingresado.",
		};
	}

	// Referencia inválida (FK)
	if (error.includes("referencia inválida")) {
		return {
			title: "Referencia inválida",
			description: error,
		};
	}

	// Sin permisos
	if (
		error.includes("sin permisos") ||
		error.includes("Sin permisos") ||
		error.includes("No tiene permisos") ||
		error.includes("No autenticado")
	) {
		return {
			title: "Sin permisos",
			description: error,
		};
	}

	// Error en vehículos
	if (error.includes("vehículos")) {
		return { title: "Error al guardar vehículos", description: error };
	}

	// Error en cuotas / pagos
	if (error.includes("cuota") || error.includes("pago")) {
		return { title: "Error al guardar pagos", description: error };
	}

	// Error en beneficiarios
	if (error.includes("beneficiario")) {
		return { title: "Error al guardar beneficiarios", description: error };
	}

	// Error genérico con detalle
	return {
		title: `Error al ${actionLabel} la póliza`,
		description: error,
	};
}

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

	// Paso máximo alcanzado — controla visibilidad de pasos sin borrarlos al editar
	const [pasoMaximo, setPasoMaximo] = useState<number>(() => initialData?.paso_actual ?? 1);

	// Catálogos
	const [regionales, setRegionales] = useState<Array<{ id: string; nombre: string }>>([]);

	// Estado para producto y comisión de usuario
	const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoAseguradora | null>(null);
	const [porcentajeComisionUsuario, setPorcentajeComisionUsuario] = useState<number>(0.5);

	// userId para uploads client-side
	const [userId, setUserId] = useState<string | null>(null);

	// Cargar regionales y userId al montar el componente
	useEffect(() => {
		const cargarDatosIniciales = async () => {
			const supabase = createClient();

			// Cargar userId para uploads client-side
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) setUserId(user.id);

			// Cargar regionales
			const { data } = await supabase.from("regionales").select("id, nombre").eq("activo", true).order("nombre");

			if (data) {
				setRegionales(data);
			}
		};

		cargarDatosIniciales();
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

	// --- Draft backup/restore (solo en modo creación) ---
	const draftInitialized = useRef(false);

	// Restaurar borrador al montar
	useEffect(() => {
		if (mode !== "create" || draftInitialized.current) return;
		draftInitialized.current = true;

		if (!hasPolizaDraft()) return;

		const draft = loadPolizaDraft();
		const timestamp = getPolizaDraftTimestamp();

		if (!draft || !timestamp) return;

		const age = formatDraftAge(timestamp);
		const shouldRestore = confirm(
			`Se encontró un borrador de póliza guardado ${age}.\n\n¿Desea continuar con el borrador?`,
		);

		if (shouldRestore) {
			// Filtrar documentos: conservar los que tienen storage_path (ya subidos a Storage)
			const docsRestaurables = draft.documentos.filter((d) => d.storage_path && d.upload_status === "uploaded");
			setFormState({ ...draft, documentos: docsRestaurables });

			if (draft.documentos.length > 0 && docsRestaurables.length === 0) {
				toast.success("Borrador restaurado", {
					description: "Los documentos adjuntos deben volver a cargarse.",
				});
			} else if (docsRestaurables.length > 0) {
				toast.success("Borrador restaurado", {
					description: `${docsRestaurables.length} documento(s) recuperado(s).`,
				});
			} else {
				toast.success("Borrador restaurado");
			}
		} else {
			clearPolizaDraft();
		}
	}, [mode]);

	// Auto-save con debounce
	const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const debouncedSave = useCallback((state: PolizaFormState) => {
		if (saveTimeout.current) {
			clearTimeout(saveTimeout.current);
		}
		saveTimeout.current = setTimeout(() => {
			savePolizaDraft(state);
		}, 1000);
	}, []);

	useEffect(() => {
		if (mode !== "create") return;
		if (!draftInitialized.current) return;

		debouncedSave(formState);

		return () => {
			if (saveTimeout.current) {
				clearTimeout(saveTimeout.current);
			}
		};
	}, [formState, mode, debouncedSave]);

	// Navegación
	const handleCancelar = async () => {
		const mensaje =
			mode === "edit"
				? "¿Está seguro de cancelar? Se perderán los cambios no guardados."
				: "¿Está seguro de cancelar? Se perderán todos los datos ingresados.";

		if (confirm(mensaje)) {
			// Limpiar archivos temporales subidos a Storage (best-effort)
			const tempPaths = formState.documentos
				.filter((d) => d.storage_path?.startsWith("temp/") && !d.id)
				.map((d) => d.storage_path!);

			if (tempPaths.length > 0) {
				try {
					const supabase = createClient();
					await supabase.storage.from("polizas-documentos").remove(tempPaths);
				} catch {
					// Best-effort: archivos huérfanos se limpian en purga semestral
				}
			}

			if (mode === "create") {
				clearPolizaDraft();
			}
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
			setPasoMaximo((prev) => Math.max(prev, siguientePaso));
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

	// Estado de carga para el guardado
	const [guardando, setGuardando] = useState(false);

	const handleGuardar = async () => {
		setGuardando(true);
		try {
			let resultado;

			if (mode === "edit" && polizaId) {
				// Modo edición - usar actualizarPoliza
				resultado = await actualizarPoliza(polizaId, formState);
				if (resultado.success) {
					clearPolizaDraft();
					toast.success("Póliza actualizada exitosamente", {
						description: "Los cambios han sido guardados correctamente.",
					});
					router.push(`/polizas/${polizaId}`);
				} else {
					const { title, description } = parsePolizaError(resultado.error, "editar");
					toast.error(title, { description });
				}
			} else {
				// Modo creación - usar guardarPoliza
				resultado = await guardarPoliza(formState);
				if (resultado.success) {
					clearPolizaDraft();
					toast.success("Póliza guardada exitosamente", {
						description: "La póliza ha sido registrada correctamente.",
					});
					router.push("/polizas");
				} else {
					const { title, description } = parsePolizaError(resultado.error, "guardar");
					toast.error(title, { description });
				}
			}
		} catch (error) {
			console.error("Error guardando póliza:", error);
			let errorDescription = "Por favor intente nuevamente.";
			if (error instanceof Error) {
				errorDescription = error.message;
			}
			toast.error("Error inesperado al guardar la póliza", {
				description: errorDescription,
			});
		} finally {
			setGuardando(false);
		}
	};

	// Renderizar pasos de forma acumulativa
	const renderPasosAcumulativos = () => {
		return (
			<div className="space-y-5">
				{/* Paso 1: Buscar Asegurado - Siempre visible */}
				{pasoMaximo >= 1 && (
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
				{pasoMaximo >= 2 && (
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
				{pasoMaximo >= 3 && formState.datos_basicos && (
					<DatosEspecificos
						ramo={formState.datos_basicos.ramo}
						datos={formState.datos_especificos}
						moneda={formState.datos_basicos.moneda}
						regionales={regionales}
						asegurado={formState.asegurado}
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
				{pasoMaximo >= 4 && (
					<ModalidadPago
						datos={formState.modalidad_pago}
						inicioVigencia={formState.datos_basicos?.inicio_vigencia}
						finVigencia={formState.datos_basicos?.fin_vigencia}
						producto={productoSeleccionado}
						porcentajeComisionUsuario={porcentajeComisionUsuario}
						mode={mode}
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
				{pasoMaximo >= 5 && (
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
						userId={userId}
					/>
				)}

				{/* Paso 6: Resumen - Visible en paso 6 */}
				{pasoMaximo >= 6 && (
					<Resumen
						formState={formState}
						onAnterior={handlePasoAnterior}
						onEditarPaso={handleActualizarPaso}
						onGuardar={handleGuardar}
						guardando={guardando}
					/>
				)}
			</div>
		);
	};

	return (
		<div className="max-w-7xl mx-auto">
			{/* Page Header — sticky so cancel button is always visible */}
			<div className="sticky top-0 z-20 bg-[#F1F4F9] border-b border-[#E2E8F0] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-4 mb-6">
				<div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
					<div className="flex items-center gap-3 min-w-0">
						<button
							onClick={() => router.push("/polizas")}
							className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
						>
							<ChevronLeft className="h-4 w-4" />
							Pólizas
						</button>
						<span className="text-[#CBD5E1]">/</span>
						<FileText className="h-6 w-6 text-primary shrink-0" />
						<div className="min-w-0">
							<h1 className="text-xl font-semibold text-foreground leading-tight">
								{mode === "edit" ? "Editar Póliza" : "Nueva Póliza"}
							</h1>
							<p className="text-sm text-muted-foreground leading-tight">
								{STEP_CONFIG[formState.paso_actual - 1]?.label} — Paso {formState.paso_actual} de 6
							</p>
						</div>
					</div>
					<Button variant="ghost" size="sm" onClick={handleCancelar} className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/8">
						<X className="h-4 w-4 mr-1.5" />
						Cancelar
					</Button>
				</div>
			</div>

			{/* Mobile step progress bar */}
			<div className="lg:hidden mb-5">
				<div className="flex gap-1 mb-2">
					{[1, 2, 3, 4, 5, 6].map((paso) => (
						<div
							key={paso}
							className={`h-1.5 flex-1 rounded-md transition-colors ${
								paso <= formState.paso_actual ? "bg-primary" : "bg-border"
							}`}
						/>
					))}
				</div>
				<p className="text-xs text-muted-foreground">
					Paso {formState.paso_actual} de 6 · {STEP_CONFIG[formState.paso_actual - 1]?.label}
				</p>
			</div>

			{/* Two-column layout */}
			<div className="flex gap-8 items-start">
				{/* Sidebar — sticky below the sticky header (~80px) */}
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
										{/* Connector line between steps */}
										{i < 5 && (
											<div
												className={`absolute left-[15px] top-8 w-px h-3 ${
													isCompleted ? "bg-success/40" : "bg-border"
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
														? "bg-success text-primary-foreground"
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
													<p className="text-[0.8125rem] text-primary/70 mt-0.5">En progreso</p>
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
				<div className="flex-1 min-w-0">{renderPasosAcumulativos()}</div>
			</div>
		</div>
	);
}
