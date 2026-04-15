"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, CheckCircle2, XCircle, Minus } from "lucide-react";
import type { ChecklistItem } from "@/types/rrhh";
import { CHECKLIST_DEFINICION, calcularCompletitudChecklist } from "@/types/rrhh";
import { Progress } from "@/components/ui/progress";

interface Props {
  data: Record<string, ChecklistItem> | null;
  onSave: (data: Record<string, ChecklistItem>) => void;
  onBack: () => void;
}

const SECTION_LABELS = {
  recepcionada: "Documentación Recepcionada",
  adjunto:      "Documentos Adjunto al File",
  otros:        "Otros Documentos Adjuntos al File",
};

type Estado = "si" | "no" | null;

function EstadoToggle({
  estado,
  onChange,
}: {
  estado: Estado;
  onChange: (v: Estado) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(estado === "si" ? null : "si")}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          estado === "si"
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
        }`}
      >
        <CheckCircle2 className="h-3 w-3" />
        SI
      </button>
      <button
        type="button"
        onClick={() => onChange(estado === "no" ? null : "no")}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          estado === "no"
            ? "bg-red-100 text-red-700 border border-red-200"
            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
        }`}
      >
        <XCircle className="h-3 w-3" />
        NO
      </button>
    </div>
  );
}

export default function StepChecklist({ data, onSave, onBack }: Props) {
  const [items, setItems] = useState<Record<string, ChecklistItem>>(
    data ?? Object.fromEntries(CHECKLIST_DEFINICION.map((d) => [d.id, { ...d, estado: null }]))
  );

  const updateEstado = (id: string, estado: Estado) =>
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], estado } }));

  const updateVigente = (id: string, vigente: Estado) =>
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], vigente } }));

  const updateSubsidio = (id: string, key: keyof NonNullable<ChecklistItem["subsidios"]>, value: boolean) =>
    setItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        subsidios: { ...prev[id].subsidios!, [key]: value },
      },
    }));

  const completitud = calcularCompletitudChecklist(items);

  const secciones = ["recepcionada", "adjunto", "otros"] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Paso 5 — Checklist de Documentos</h2>
        <p className="text-sm text-muted-foreground">Marque SI o NO para cada documento recibido</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={completitud} className="flex-1 h-2" />
        <span className="text-sm font-medium w-10 text-right">{completitud}%</span>
        <Badge variant={completitud === 100 ? "default" : "outline"} className="text-xs">
          {completitud === 100 ? "Completo" : "En progreso"}
        </Badge>
      </div>

      {/* Quick fill */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() =>
            setItems((prev) =>
              Object.fromEntries(
                Object.entries(prev).map(([k, v]) => [k, { ...v, estado: "si" as Estado }])
              )
            )
          }
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Marcar todos SI
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() =>
            setItems((prev) =>
              Object.fromEntries(
                Object.entries(prev).map(([k, v]) => [k, { ...v, estado: null as Estado }])
              )
            )
          }
        >
          <Minus className="h-3 w-3" />
          Limpiar todo
        </Button>
      </div>

      {secciones.map((seccion) => {
        const defsSeccion = CHECKLIST_DEFINICION.filter((d) => d.seccion === seccion);
        return (
          <div key={seccion}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 border-b pb-2">
              {SECTION_LABELS[seccion]}
            </h3>
            <div className="space-y-2">
              {defsSeccion.map((def) => {
                const item = items[def.id];
                return (
                  <div
                    key={def.id}
                    className={`flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg border transition-colors ${
                      item?.estado === "si"
                        ? "bg-emerald-50 border-emerald-100"
                        : item?.estado === "no"
                        ? "bg-red-50 border-red-100"
                        : "bg-card"
                    }`}
                  >
                    <span className="text-sm flex-1">
                      <span className="text-xs text-muted-foreground mr-2 font-mono">{def.numero}.</span>
                      {def.label}
                    </span>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <EstadoToggle
                        estado={item?.estado ?? null}
                        onChange={(v) => updateEstado(def.id, v)}
                      />

                      {/* Vigente (solo item 7) */}
                      {def.id === "item_7" && item?.estado === "si" && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>Vigente:</span>
                          <EstadoToggle
                            estado={item?.vigente ?? null}
                            onChange={(v) => updateVigente(def.id, v)}
                          />
                        </div>
                      )}

                      {/* Subsidios (solo item 33) */}
                      {def.id === "item_33" && (
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {(["prenatal", "natalidad", "lactancia", "sepelio"] as const).map((sub) => (
                            <label key={sub} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item?.subsidios?.[sub] ?? false}
                                onChange={(e) => updateSubsidio(def.id, sub, e.target.checked)}
                                className="h-3 w-3"
                              />
                              <span className="capitalize">{sub}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button onClick={() => onSave(items)} className="gap-2">
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
