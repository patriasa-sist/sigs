"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { guardarEmpleado } from "@/app/rrhh/actions";
import type { EmpleadoFormState, DatosIdentificacion, DatosDireccion, DatosLaborales, DatosPatrimonio, ChecklistItem } from "@/types/rrhh";
import { crearChecklistVacio } from "@/types/rrhh";

import StepIdentificacion from "./steps/StepIdentificacion";
import StepDireccion from "./steps/StepDireccion";
import StepLaboral from "./steps/StepLaboral";
import StepPatrimonio from "./steps/StepPatrimonio";
import StepChecklist from "./steps/StepChecklist";
import StepDocumentos from "./steps/StepDocumentos";
import StepResumen from "./steps/StepResumen";

const STEPS = [
  { id: 1, label: "Identificación" },
  { id: 2, label: "Dirección" },
  { id: 3, label: "Laboral" },
  { id: 4, label: "Patrimonio" },
  { id: 5, label: "Checklist" },
  { id: 6, label: "Documentos" },
  { id: 7, label: "Resumen" },
];

export default function NuevoEmpleadoForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [formState, setFormState] = useState<EmpleadoFormState>({
    identificacion: null,
    direccion: null,
    laboral: null,
    patrimonio: null,
    checklist: crearChecklistVacio(),
    documentos: [],
  });

  const updateIdentificacion = useCallback((data: DatosIdentificacion) => {
    setFormState((prev) => ({ ...prev, identificacion: data }));
  }, []);

  const updateDireccion = useCallback((data: DatosDireccion) => {
    setFormState((prev) => ({ ...prev, direccion: data }));
  }, []);

  const updateLaboral = useCallback((data: DatosLaborales) => {
    setFormState((prev) => ({ ...prev, laboral: data }));
  }, []);

  const updatePatrimonio = useCallback((data: DatosPatrimonio) => {
    setFormState((prev) => ({ ...prev, patrimonio: data }));
  }, []);

  const updateChecklist = useCallback((data: Record<string, ChecklistItem>) => {
    setFormState((prev) => ({ ...prev, checklist: data }));
  }, []);

  const updateDocumentos = useCallback((docs: EmpleadoFormState["documentos"]) => {
    setFormState((prev) => ({ ...prev, documentos: docs }));
  }, []);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await guardarEmpleado(formState);
      if (result.success && result.employee_id) {
        router.push(`/rrhh/${result.employee_id}`);
      } else {
        setSaveError(result.error ?? "Error desconocido al guardar");
      }
    } catch {
      setSaveError("Error inesperado al guardar");
    } finally {
      setSaving(false);
    }
  };

  const isStepComplete = (stepId: number) => {
    switch (stepId) {
      case 1: return !!formState.identificacion;
      case 2: return !!formState.direccion;
      case 3: return !!formState.laboral;
      case 4: return true; // opcional
      case 5: return true; // opcional
      case 6: return true; // opcional
      default: return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/rrhh" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Volver a RRHH
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : isStepComplete(step.id)
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {isStepComplete(step.id) && currentStep !== step.id ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {step.label}
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border bg-card p-6">
        {currentStep === 1 && (
          <StepIdentificacion
            data={formState.identificacion}
            onSave={(data) => { updateIdentificacion(data); goNext(); }}
          />
        )}
        {currentStep === 2 && (
          <StepDireccion
            data={formState.direccion}
            onSave={(data) => { updateDireccion(data); goNext(); }}
            onBack={goPrev}
          />
        )}
        {currentStep === 3 && (
          <StepLaboral
            data={formState.laboral}
            onSave={(data) => { updateLaboral(data); goNext(); }}
            onBack={goPrev}
          />
        )}
        {currentStep === 4 && (
          <StepPatrimonio
            data={formState.patrimonio}
            onSave={(data) => { updatePatrimonio(data); goNext(); }}
            onBack={goPrev}
          />
        )}
        {currentStep === 5 && (
          <StepChecklist
            data={formState.checklist}
            onSave={(data) => { updateChecklist(data); goNext(); }}
            onBack={goPrev}
          />
        )}
        {currentStep === 6 && (
          <StepDocumentos
            documentos={formState.documentos}
            onSave={(docs) => { updateDocumentos(docs); goNext(); }}
            onBack={goPrev}
          />
        )}
        {currentStep === 7 && (
          <StepResumen
            formState={formState}
            onBack={goPrev}
            onGoToStep={setCurrentStep}
            onSave={handleSave}
            saving={saving}
            saveError={saveError}
          />
        )}
      </div>
    </div>
  );
}
