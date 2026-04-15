"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft } from "lucide-react";
import type { DatosLaborales, AreaSolicitante, MedioComunicacion } from "@/types/rrhh";
import { LABEL_AREA, LABEL_MEDIO } from "@/types/rrhh";

interface Props {
  data: DatosLaborales | null;
  onSave: (data: DatosLaborales) => void;
  onBack: () => void;
}

const EMPTY: DatosLaborales = {
  fecha_ingreso: "", cargo: "", haber_basico: null,
  area_solicitante: "", medio_comunicacion: "", medio_comunicacion_desc: "",
  entrevistado_por_nombre: "", entrevistado_por_cargo: "", entrevistado_fecha: "",
  aprobado_por_nombre: "", aprobado_por_cargo: "", aprobado_fecha: "",
};

export default function StepLaboral({ data, onSave, onBack }: Props) {
  const [form, setForm] = useState<DatosLaborales>(data ?? EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof DatosLaborales, string>>>({});

  const set = <K extends keyof DatosLaborales>(k: K, v: DatosLaborales[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.fecha_ingreso) e.fecha_ingreso = "Requerido";
    if (!form.cargo.trim())  e.cargo = "Requerido";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) onSave(form);
  };

  const err = (k: keyof DatosLaborales) =>
    errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Paso 3 — Datos Laborales</h2>
        <p className="text-sm text-muted-foreground">Cargo, ingreso y proceso de contratación</p>
      </div>

      {/* Datos de ingreso */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Datos de Ingreso</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Fecha de Ingreso <span className="text-destructive">*</span></Label>
            <Input type="date" value={form.fecha_ingreso} onChange={(e) => set("fecha_ingreso", e.target.value)} className="mt-1" />
            {err("fecha_ingreso")}
          </div>
          <div>
            <Label>Cargo <span className="text-destructive">*</span></Label>
            <Input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} className="mt-1" />
            {err("cargo")}
          </div>
          <div>
            <Label>Haber Básico (Bs.)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.haber_basico ?? ""}
              onChange={(e) => set("haber_basico", e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Solicitud y selección */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Solicitud y Selección</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Área Solicitante</Label>
            <Select value={form.area_solicitante} onValueChange={(v) => set("area_solicitante", v as AreaSolicitante | "")}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(LABEL_AREA).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Medio de Comunicación Laboral</Label>
            <Select value={form.medio_comunicacion} onValueChange={(v) => set("medio_comunicacion", v as MedioComunicacion | "")}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(LABEL_MEDIO).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.medio_comunicacion === "otro" && (
            <div className="sm:col-span-2">
              <Label>Descripción del medio</Label>
              <Input
                value={form.medio_comunicacion_desc}
                onChange={(e) => set("medio_comunicacion_desc", e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Entrevistador */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Entrevistado Por</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.entrevistado_por_nombre} onChange={(e) => set("entrevistado_por_nombre", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Cargo</Label>
            <Input value={form.entrevistado_por_cargo} onChange={(e) => set("entrevistado_por_cargo", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.entrevistado_fecha} onChange={(e) => set("entrevistado_fecha", e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Aprobador */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Aprobado Por</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.aprobado_por_nombre} onChange={(e) => set("aprobado_por_nombre", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Cargo</Label>
            <Input value={form.aprobado_por_cargo} onChange={(e) => set("aprobado_por_cargo", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.aprobado_fecha} onChange={(e) => set("aprobado_fecha", e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button onClick={handleSubmit} className="gap-2">
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
