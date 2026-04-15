"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, MapPin, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import type { DatosDireccion, ReferenciaFamiliar } from "@/types/rrhh";
import { DEPARTAMENTOS_BOLIVIA } from "@/types/rrhh";

const MapPicker = dynamic(() => import("@/components/rrhh/MapPicker"), { ssr: false });

interface Props {
  data: DatosDireccion | null;
  onSave: (data: DatosDireccion) => void;
  onBack: () => void;
}

const EMPTY_REF: ReferenciaFamiliar = { nombres_apellidos: "", telefono: "", parentesco: "" };

const EMPTY: DatosDireccion = {
  av_calle_pasaje: "", zona_barrio: "", urbanizacion_condominio: "",
  edif_bloque_piso: "", casilla: "", referencia_direccion: "",
  departamento: "", pais: "Bolivia",
  lat: null, lng: null, croquis_file: null, croquis_preview: null,
  telefono: "", email: "",
  referencias: [{ ...EMPTY_REF }, { ...EMPTY_REF }],
};

export default function StepDireccion({ data, onSave, onBack }: Props) {
  const [form, setForm] = useState<DatosDireccion>(data ?? EMPTY);
  const [showMap, setShowMap] = useState(false);

  const set = <K extends keyof DatosDireccion>(k: K, v: DatosDireccion[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setRef = (idx: 0 | 1, k: keyof ReferenciaFamiliar, v: string) =>
    setForm((p) => {
      const refs: [ReferenciaFamiliar, ReferenciaFamiliar] = [...p.referencias] as [ReferenciaFamiliar, ReferenciaFamiliar];
      refs[idx] = { ...refs[idx], [k]: v };
      return { ...p, referencias: refs };
    });

  const handleCroquisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      set("croquis_file", file);
      set("croquis_preview", ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMapSelect = (lat: number, lng: number) => {
    set("lat", lat);
    set("lng", lng);
    setShowMap(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Paso 2 — Dirección y Contacto</h2>
        <p className="text-sm text-muted-foreground">Domicilio, teléfono y referencias familiares</p>
      </div>

      {/* Dirección */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Dirección Domicilio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Av. / Calle / Pasaje</Label>
            <Input value={form.av_calle_pasaje} onChange={(e) => set("av_calle_pasaje", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Zona / Barrio</Label>
            <Input value={form.zona_barrio} onChange={(e) => set("zona_barrio", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Urbanización / Condominio</Label>
            <Input value={form.urbanizacion_condominio} onChange={(e) => set("urbanizacion_condominio", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Edif. / Bloque / Piso</Label>
            <Input value={form.edif_bloque_piso} onChange={(e) => set("edif_bloque_piso", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Casilla</Label>
            <Input value={form.casilla} onChange={(e) => set("casilla", e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Referencia de Dirección</Label>
            <Input value={form.referencia_direccion} onChange={(e) => set("referencia_direccion", e.target.value)} className="mt-1" placeholder="Ej: A 2 cuadras de la plaza" />
          </div>
          <div>
            <Label>Departamento</Label>
            <Select value={form.departamento} onValueChange={(v) => set("departamento", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione" /></SelectTrigger>
              <SelectContent>
                {DEPARTAMENTOS_BOLIVIA.map((dep) => (
                  <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>País</Label>
            <Input value={form.pais} onChange={(e) => set("pais", e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Ubicación en mapa */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Croquis / Ubicación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Seleccionar en Mapa
            </Label>
            <Button
              type="button"
              variant="outline"
              className="mt-1 w-full gap-2"
              onClick={() => setShowMap(true)}
            >
              <MapPin className="h-4 w-4" />
              {form.lat && form.lng
                ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`
                : "Abrir mapa"}
            </Button>
            {form.lat && form.lng && (
              <p className="text-xs text-muted-foreground mt-1">
                Lat: {form.lat.toFixed(6)} | Lng: {form.lng.toFixed(6)}
              </p>
            )}
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Croquis (imagen)
            </Label>
            {form.croquis_preview ? (
              <div className="relative mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.croquis_preview} alt="Croquis" className="h-28 w-full object-cover rounded-md border" />
                <button
                  type="button"
                  onClick={() => { set("croquis_file", null); set("croquis_preview", null); }}
                  className="absolute top-1 right-1 bg-background rounded-full p-0.5 shadow-sm border"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-md h-16 cursor-pointer hover:bg-muted/30 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                Subir foto/imagen del croquis
                <input type="file" accept="image/*" className="sr-only" onChange={handleCroquisUpload} />
              </label>
            )}
          </div>
        </div>

        {showMap && (
          <div className="mt-4 rounded-lg overflow-hidden border" style={{ height: 400 }}>
            <MapPicker
              initialLat={form.lat ?? -17.7833}
              initialLng={form.lng ?? -63.1821}
              onSelect={handleMapSelect}
              onClose={() => setShowMap(false)}
            />
          </div>
        )}
      </div>

      {/* Contacto */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Contacto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Teléfono / Celular</Label>
            <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className="mt-1" placeholder="+591 7xxxxxxx" />
          </div>
          <div>
            <Label>Correo Electrónico</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Referencias familiares */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Referencias Familiares</h3>
        {([0, 1] as const).map((idx) => (
          <div key={idx} className="mb-4 p-4 border rounded-lg bg-muted/20">
            <p className="text-sm font-medium mb-3">Referencia {idx + 1}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <Label>Nombres y Apellidos</Label>
                <Input
                  value={form.referencias[idx].nombres_apellidos}
                  onChange={(e) => setRef(idx, "nombres_apellidos", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Teléfono / Celular</Label>
                <Input
                  value={form.referencias[idx].telefono}
                  onChange={(e) => setRef(idx, "telefono", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Parentesco</Label>
                <Input
                  value={form.referencias[idx].parentesco}
                  onChange={(e) => setRef(idx, "parentesco", e.target.value)}
                  className="mt-1"
                  placeholder="Ej: Padre, Hermano"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button onClick={() => onSave(form)} className="gap-2">
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
