"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import type { AnexoFormState, DatosPolizaParaAnexo, PlanPagoInclusion } from "@/types/anexo";
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
import { guardarAnexo, actualizarAnexo, obtenerDatosParaAnexo } from "@/app/polizas/anexos/actions";
import { createClient } from "@/utils/supabase/client";

// Steps
import { BuscarPolizaAnexo } from "./steps/BuscarPolizaAnexo";
import { ConfigAnexo } from "./steps/ConfigAnexo";
import { DatosAnexo } from "./steps/DatosAnexo";
import { PagosYDocumentos } from "./steps/PagosYDocumentos";
import { ResumenAnexo } from "./steps/ResumenAnexo";

const INITIAL_STATE: AnexoFormState = {
	paso_actual: 1,
	poliza_id: null,
	poliza_resumen: null,
	config: null,
	items_cambio: null,
	plan_pago_inclusion: null,
	cuotas_ajuste: [],
	vigencia_corrida: null,
	documentos: [],
	advertencias: [],
};

type Props = {
	mode?: "create" | "edit";
	anexoId?: string;
	anexoEstado?: "pendiente" | "rechazado" | "activo";
	initialFormState?: AnexoFormState;
	initialDatosPoliza?: DatosPolizaParaAnexo;
};

export function NuevoAnexoForm({ mode = "create", anexoId, anexoEstado, initialFormState, initialDatosPoliza }: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const isEdit = mode === "edit";
	const [formState, setFormState] = useState<AnexoFormState>(initialFormState ?? INITIAL_STATE);
	const [datosPoliza, setDatosPoliza] = useState<DatosPolizaParaAnexo | null>(initialDatosPoliza ?? null);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);

	// Obtener userId al montar
	useEffect(() => {
		const loadUser = async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) setUserId(user.id);
		};
		loadUser();
	}, []);

	// Si viene con polizaId en query params, preseleccionar (solo creación)
	useEffect(() => {
		if (isEdit) return;
		const polizaIdParam = searchParams.get("polizaId");
		if (polizaIdParam && !formState.poliza_id) {
			cargarDatosPoliza(polizaIdParam);
		}
	}, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

	const cargarDatosPoliza = useCallback(async (polizaId: string) => {
		setIsLoading(true);
		const result = await obtenerDatosParaAnexo(polizaId);
		if (result.success && result.datos) {
			setDatosPoliza(result.datos);
			setFormState((prev) => ({
				...prev,
				poliza_id: polizaId,
				poliza_resumen: result.datos!.poliza,
				paso_actual: prev.paso_actual === 1 ? 2 : prev.paso_actual,
			}));
		} else {
			toast.error("Error al cargar póliza", {
				description: result.error || "No se pudo obtener los datos de la póliza",
			});
		}
		setIsLoading(false);
	}, []);

	const handleGuardar = async () => {
		setIsSaving(true);
		try {
			const result =
				isEdit && anexoId ? await actualizarAnexo(anexoId, formState) : await guardarAnexo(formState);
			if (result.success) {
				const seMantuvoActivo = isEdit && "estado_final" in result && result.estado_final === "activo";
				toast.success(isEdit ? "Anexo actualizado exitosamente" : "Anexo creado exitosamente", {
					description: isEdit
						? seMantuvoActivo
							? "Los cambios fueron guardados. La validación gerencial se mantiene."
							: "Los cambios fueron guardados. El anexo quedó pendiente de validación gerencial."
						: "El anexo ha sido registrado y está pendiente de validación gerencial.",
				});
				router.push(`/polizas/${formState.poliza_id}`);
			} else {
				toast.error("Error al guardar anexo", {
					description: result.error || "Por favor intente nuevamente.",
				});
			}
		} catch {
			toast.error("Error inesperado", {
				description: "Ocurrió un error al guardar el anexo.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	// Callbacks estables para PagosYDocumentos (evitar re-renders infinitos en useEffect)
	const handleChangePlanPagoInclusion = useCallback(
		(plan: PlanPagoInclusion | null) => setFormState((prev) => ({ ...prev, plan_pago_inclusion: plan })),
		[],
	);
	const handleChangeCuotas = useCallback(
		(cuotas: AnexoFormState["cuotas_ajuste"]) => setFormState((prev) => ({ ...prev, cuotas_ajuste: cuotas })),
		[],
	);
	const handleChangeVigenciaCorrida = useCallback(
		(vc: AnexoFormState["vigencia_corrida"]) => setFormState((prev) => ({ ...prev, vigencia_corrida: vc })),
		[],
	);

	const [mostrarDialogoCancelar, setMostrarDialogoCancelar] = useState(false);

	const rutaSalida = isEdit && formState.poliza_id ? `/polizas/${formState.poliza_id}` : "/polizas";

	const handleCancelar = () => {
		if (formState.paso_actual > 1) {
			setMostrarDialogoCancelar(true);
			return;
		}
		router.push(rutaSalida);
	};

	const confirmarCancelar = () => {
		router.push(rutaSalida);
	};

	// En edición la póliza es fija: el paso 1 (búsqueda) queda bloqueado
	const irAPaso = (paso: number) => {
		const destino = isEdit ? Math.max(2, paso) : paso;
		setFormState((prev) => ({ ...prev, paso_actual: destino as AnexoFormState["paso_actual"] }));
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<FileText className="h-8 w-8 text-blue-600" />
					<div>
						<h1 className="text-2xl font-bold">
							{isEdit ? `Editar Anexo ${formState.config?.numero_anexo || ""}`.trim() : "Nuevo Anexo"}
						</h1>
						<p className="text-gray-500">
							{formState.poliza_resumen
								? `Póliza ${formState.poliza_resumen.numero_poliza} — ${formState.poliza_resumen.ramo}`
								: "Seleccione una póliza para crear un anexo"}
						</p>
					</div>
				</div>
				<button onClick={handleCancelar} className="text-gray-500 hover:text-gray-700 text-sm underline">
					Cancelar
				</button>
			</div>

			{/* Paso 1: Buscar Póliza */}
			<BuscarPolizaAnexo
				polizaSeleccionada={formState.poliza_resumen}
				onSeleccionar={(poliza) => {
					setFormState((prev) => ({
						...prev,
						poliza_id: poliza.id,
						poliza_resumen: poliza,
					}));
					cargarDatosPoliza(poliza.id);
				}}
				visible={true}
				deshabilitado={isEdit || formState.paso_actual > 1}
			/>

			{/* Paso 2: Configuración del Anexo */}
			{formState.paso_actual >= 2 && datosPoliza && (
				<ConfigAnexo
					config={formState.config}
					tieneAnulacionPendiente={datosPoliza.poliza.tiene_anulacion_pendiente}
					tipoBloqueado={isEdit}
					onChange={(config) => setFormState((prev) => ({ ...prev, config }))}
					onSiguiente={() => {
						// Si es anulación, saltar paso 3 (datos específicos)
						const siguientePaso = formState.config?.tipo_anexo === "anulacion" ? 4 : 3;
						irAPaso(siguientePaso);
					}}
					onAnterior={() => irAPaso(1)}
				/>
			)}

			{/* Paso 3: Datos Específicos (solo inclusión/exclusión) */}
			{formState.paso_actual >= 3 && formState.config?.tipo_anexo !== "anulacion" && datosPoliza && (
				<DatosAnexo
					tipoAnexo={formState.config!.tipo_anexo}
					ramo={formState.poliza_resumen!.ramo}
					itemsActuales={datosPoliza.items_actuales}
					itemsCambio={formState.items_cambio}
					niveles={datosPoliza.niveles}
					moneda={formState.poliza_resumen!.moneda}
					onChange={(items) => setFormState((prev) => ({ ...prev, items_cambio: items }))}
					onSiguiente={() => setFormState((prev) => ({ ...prev, paso_actual: 4 }))}
					onAnterior={() => setFormState((prev) => ({ ...prev, paso_actual: 2 }))}
				/>
			)}

			{/* Paso 4: Pagos y Documentos */}
			{formState.paso_actual >= 4 && datosPoliza && (
				<PagosYDocumentos
					tipoAnexo={formState.config!.tipo_anexo}
					cuotasOriginales={datosPoliza.cuotas}
					cuotasDescontables={datosPoliza.cuotas_descontables || []}
					planPagoInclusion={formState.plan_pago_inclusion}
					cuotasAjuste={formState.cuotas_ajuste}
					vigenciaCorrida={formState.vigencia_corrida}
					documentos={formState.documentos}
					moneda={formState.poliza_resumen!.moneda}
					producto={datosPoliza.poliza.producto ?? null}
					usarFactoresContado={datosPoliza.poliza.usar_factores_contado ?? false}
					modalidadMadre={datosPoliza.poliza.modalidad_pago}
					userId={userId}
					onChangePlanPagoInclusion={handleChangePlanPagoInclusion}
					onChangeCuotas={handleChangeCuotas}
					onChangeVigenciaCorrida={handleChangeVigenciaCorrida}
					onChangeDocumentos={(docs) =>
						setFormState((prev) => ({
							...prev,
							documentos: typeof docs === "function" ? docs(prev.documentos) : docs,
						}))
					}
					onSiguiente={() => setFormState((prev) => ({ ...prev, paso_actual: 5 }))}
					onAnterior={() => {
						const pasoAnterior = formState.config?.tipo_anexo === "anulacion" ? 2 : 3;
						setFormState((prev) => ({ ...prev, paso_actual: pasoAnterior as 2 | 3 }));
					}}
				/>
			)}

			{/* Paso 5: Resumen */}
			{formState.paso_actual === 5 && (
				<ResumenAnexo
					formState={formState}
					datosPoliza={datosPoliza}
					mode={mode}
					anexoEstado={anexoEstado}
					onGuardar={handleGuardar}
					isSaving={isSaving}
					onEditarPaso={(paso) => irAPaso(paso)}
					onAnterior={() => setFormState((prev) => ({ ...prev, paso_actual: 4 }))}
				/>
			)}

			{/* Diálogo: confirmar cancelación */}
			<AlertDialog open={mostrarDialogoCancelar} onOpenChange={setMostrarDialogoCancelar}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isEdit ? "¿Cancelar la edición?" : "¿Cancelar el registro?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isEdit ? "Se perderán los cambios no guardados." : "Se perderán los datos ingresados."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Seguir editando</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmarCancelar}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Sí, cancelar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
