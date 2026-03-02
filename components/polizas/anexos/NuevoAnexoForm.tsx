"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import type { AnexoFormState, DatosPolizaParaAnexo } from "@/types/anexo";
import { guardarAnexo, obtenerDatosParaAnexo } from "@/app/polizas/anexos/actions";
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
	cuotas_ajuste: [],
	vigencia_corrida: null,
	documentos: [],
	advertencias: [],
};

export function NuevoAnexoForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [formState, setFormState] = useState<AnexoFormState>(INITIAL_STATE);
	const [datosPoliza, setDatosPoliza] = useState<DatosPolizaParaAnexo | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);

	// Obtener userId al montar
	useEffect(() => {
		const loadUser = async () => {
			const supabase = createClient();
			const { data: { user } } = await supabase.auth.getUser();
			if (user) setUserId(user.id);
		};
		loadUser();
	}, []);

	// Si viene con polizaId en query params, preseleccionar
	useEffect(() => {
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
			const result = await guardarAnexo(formState);
			if (result.success) {
				toast.success("Anexo creado exitosamente", {
					description: "El anexo ha sido registrado y está pendiente de validación gerencial.",
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
	const handleChangeCuotas = useCallback(
		(cuotas: AnexoFormState["cuotas_ajuste"]) => setFormState((prev) => ({ ...prev, cuotas_ajuste: cuotas })),
		[]
	);
	const handleChangeVigenciaCorrida = useCallback(
		(vc: AnexoFormState["vigencia_corrida"]) => setFormState((prev) => ({ ...prev, vigencia_corrida: vc })),
		[]
	);

	const handleCancelar = () => {
		if (formState.paso_actual > 1) {
			const confirmCancel = window.confirm("¿Está seguro de cancelar? Se perderán los datos ingresados.");
			if (!confirmCancel) return;
		}
		router.push("/polizas");
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<FileText className="h-8 w-8 text-blue-600" />
					<div>
						<h1 className="text-2xl font-bold">Nuevo Anexo</h1>
						<p className="text-gray-500">
							{formState.poliza_resumen
								? `Póliza ${formState.poliza_resumen.numero_poliza} — ${formState.poliza_resumen.ramo}`
								: "Seleccione una póliza para crear un anexo"}
						</p>
					</div>
				</div>
				<button
					onClick={handleCancelar}
					className="text-gray-500 hover:text-gray-700 text-sm underline"
				>
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
				deshabilitado={formState.paso_actual > 1}
			/>

			{/* Paso 2: Configuración del Anexo */}
			{formState.paso_actual >= 2 && datosPoliza && (
				<ConfigAnexo
					config={formState.config}
					tieneAnulacionPendiente={datosPoliza.poliza.tiene_anulacion_pendiente}
					onChange={(config) => setFormState((prev) => ({ ...prev, config }))}
					onSiguiente={() => {
						// Si es anulación, saltar paso 3 (datos específicos)
						const siguientePaso = formState.config?.tipo_anexo === "anulacion" ? 4 : 3;
						setFormState((prev) => ({ ...prev, paso_actual: siguientePaso as 3 | 4 }));
					}}
					onAnterior={() => setFormState((prev) => ({ ...prev, paso_actual: 1 }))}
				/>
			)}

			{/* Paso 3: Datos Específicos (solo inclusión/exclusión) */}
			{formState.paso_actual >= 3 && formState.config?.tipo_anexo !== "anulacion" && datosPoliza && (
				<DatosAnexo
					tipoAnexo={formState.config!.tipo_anexo}
					ramo={formState.poliza_resumen!.ramo}
					itemsActuales={datosPoliza.items_actuales}
					itemsCambio={formState.items_cambio}
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
					cuotasAjuste={formState.cuotas_ajuste}
					vigenciaCorrida={formState.vigencia_corrida}
					documentos={formState.documentos}
					moneda={formState.poliza_resumen!.moneda}
					userId={userId}
					onChangeCuotas={handleChangeCuotas}
					onChangeVigenciaCorrida={handleChangeVigenciaCorrida}
					onChangeDocumentos={(docs) => setFormState((prev) => ({ ...prev, documentos: docs }))}
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
					onGuardar={handleGuardar}
					isSaving={isSaving}
					onEditarPaso={(paso) => setFormState((prev) => ({ ...prev, paso_actual: paso }))}
					onAnterior={() => setFormState((prev) => ({ ...prev, paso_actual: 4 }))}
				/>
			)}
		</div>
	);
}
