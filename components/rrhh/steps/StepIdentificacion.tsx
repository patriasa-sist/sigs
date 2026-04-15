"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import type { DatosIdentificacion, TipoDocumento, Genero, EstadoCivil } from "@/types/rrhh";
import { EXTENSIONES_BOLIVIA } from "@/types/rrhh";

interface Props {
  data: DatosIdentificacion | null;
  onSave: (data: DatosIdentificacion) => void;
}

const EMPTY: DatosIdentificacion = {
  nombres: "", apellidos: "", tipo_documento: "cedula", extension: "",
  nro_documento: "", complemento: "", nro_nua_cua: "", nit: "",
  fecha_nacimiento: "", genero: "M", nacionalidad: "boliviana",
  otra_nacionalidad: "", estado_civil: "", nombre_conyuge: "",
};

export default function StepIdentificacion({ data, onSave }: Props) {
  const [form, setForm] = useState<DatosIdentificacion>(data ?? EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof DatosIdentificacion, string>>>({});

  const set = <K extends keyof DatosIdentificacion>(k: K, v: DatosIdentificacion[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.nombres.trim())        e.nombres = "Requerido";
    if (!form.apellidos.trim())      e.apellidos = "Requerido";
    if (!form.nro_documento.trim())  e.nro_documento = "Requerido";
    if (!form.fecha_nacimiento)      e.fecha_nacimiento = "Requerido";
    if (!form.genero)                e.genero = "Requerido";
    if (form.nacionalidad === "otra" && !form.otra_nacionalidad.trim())
      e.otra_nacionalidad = "Especifique la nacionalidad";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) onSave(form);
  };

  const err = (k: keyof DatosIdentificacion) =>
    errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Paso 1 — Identificación Personal</h2>
        <p className="text-sm text-muted-foreground">Datos básicos del empleado</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombres */}
        <div>
          <Label>Nombres <span className="text-destructive">*</span></Label>
          <Input value={form.nombres} onChange={(e) => set("nombres", e.target.value)} className="mt-1" />
          {err("nombres")}
        </div>
        <div>
          <Label>Apellidos <span className="text-destructive">*</span></Label>
          <Input value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} className="mt-1" />
          {err("apellidos")}
        </div>

        {/* Documento */}
        <div>
          <Label>Tipo de Documento</Label>
          <Select value={form.tipo_documento} onValueChange={(v) => set("tipo_documento", v as TipoDocumento)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cedula">Cédula de Identidad</SelectItem>
              <SelectItem value="pasaporte">Pasaporte</SelectItem>
              <SelectItem value="rnu">Registro Único Nacional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Extensión</Label>
          <Select value={form.extension} onValueChange={(v) => set("extension", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {EXTENSIONES_BOLIVIA.map((ext) => (
                <SelectItem key={ext} value={ext}>{ext}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Nro. Documento <span className="text-destructive">*</span></Label>
          <Input value={form.nro_documento} onChange={(e) => set("nro_documento", e.target.value)} className="mt-1" />
          {err("nro_documento")}
        </div>
        <div>
          <Label>Complemento</Label>
          <Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} className="mt-1" placeholder="Ej: 1A" />
        </div>

        <div>
          <Label>Nro. NUA/CUA</Label>
          <Input value={form.nro_nua_cua} onChange={(e) => set("nro_nua_cua", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>NIT</Label>
          <Input value={form.nit} onChange={(e) => set("nit", e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label>Fecha de Nacimiento <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.fecha_nacimiento} onChange={(e) => set("fecha_nacimiento", e.target.value)} className="mt-1" />
          {err("fecha_nacimiento")}
        </div>
        <div>
          <Label>Género <span className="text-destructive">*</span></Label>
          <Select value={form.genero} onValueChange={(v) => set("genero", v as Genero)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Femenino</SelectItem>
            </SelectContent>
          </Select>
          {err("genero")}
        </div>

        <div>
          <Label>Nacionalidad</Label>
          <Select value={form.nacionalidad} onValueChange={(v) => set("nacionalidad", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="boliviana">Boliviana</SelectItem>
              <SelectItem value="otra">Otra</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.nacionalidad === "otra" && (
          <div>
            <Label>Especificar Nacionalidad <span className="text-destructive">*</span></Label>
            <Input value={form.otra_nacionalidad} onChange={(e) => set("otra_nacionalidad", e.target.value)} className="mt-1" />
            {err("otra_nacionalidad")}
          </div>
        )}

        <div>
          <Label>Estado Civil</Label>
          <Select value={form.estado_civil} onValueChange={(v) => set("estado_civil", v as EstadoCivil | "")}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="soltero">Soltero/a</SelectItem>
              <SelectItem value="casado">Casado/a</SelectItem>
              <SelectItem value="union_libre">Unión Libre</SelectItem>
              <SelectItem value="divorciado">Divorciado/a</SelectItem>
              <SelectItem value="viudo">Viudo/a</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(form.estado_civil === "casado" || form.estado_civil === "union_libre") && (
          <div>
            <Label>Nombres y Apellidos del Cónyuge</Label>
            <Input value={form.nombre_conyuge} onChange={(e) => set("nombre_conyuge", e.target.value)} className="mt-1" />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} className="gap-2">
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
