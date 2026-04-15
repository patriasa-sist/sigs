"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import type { DatosPatrimonio, ItemPatrimonio } from "@/types/rrhh";
import { calcularTotalesPatrimonio } from "@/types/rrhh";

interface Props {
  data: DatosPatrimonio | null;
  onSave: (data: DatosPatrimonio) => void;
  onBack: () => void;
}

const EMPTY: DatosPatrimonio = {
  disponible: null,
  inmuebles: [],
  vehiculos: [],
  otros_bienes: [],
  deudas: [],
  lugar_fecha: "",
  fecha_declaracion: "",
};

function newItem(): ItemPatrimonio {
  return {
    id: crypto.randomUUID(),
    descripcion: "", ubicacion: "", modelo_marca: "", placa: "",
    entidad: "", tipo_deuda: "", fecha_vencimiento: "", valor: null,
  };
}

interface TableProps {
  titulo: string;
  items: ItemPatrimonio[];
  columnas: { key: keyof ItemPatrimonio; label: string; placeholder?: string }[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, k: keyof ItemPatrimonio, v: string | number | null) => void;
}

function PatrimonyTable({ titulo, items, columnas, onAdd, onRemove, onChange }: TableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">{titulo}</h4>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1 h-7 text-xs">
          <Plus className="h-3 w-3" /> Agregar
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 px-3 bg-muted/20 rounded-md">Sin registros</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2 items-start p-3 border rounded-md bg-muted/10">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
                {columnas.map((col) => (
                  <div key={col.key}>
                    <Label className="text-xs">{col.label}</Label>
                    <Input
                      className="mt-0.5 h-8 text-sm"
                      type={col.key === "valor" ? "number" : col.key === "fecha_vencimiento" ? "date" : "text"}
                      value={(item[col.key] as string | number) ?? ""}
                      placeholder={col.placeholder}
                      onChange={(e) =>
                        onChange(
                          item.id,
                          col.key,
                          col.key === "valor" ? (e.target.value ? parseFloat(e.target.value) : null) : e.target.value
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="mt-5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StepPatrimonio({ data, onSave, onBack }: Props) {
  const [form, setForm] = useState<DatosPatrimonio>(data ?? EMPTY);

  const set = <K extends keyof DatosPatrimonio>(k: K, v: DatosPatrimonio[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addItem = (cat: "inmuebles" | "vehiculos" | "otros_bienes" | "deudas") =>
    setForm((p) => ({ ...p, [cat]: [...p[cat], newItem()] }));

  const removeItem = (cat: "inmuebles" | "vehiculos" | "otros_bienes" | "deudas", id: string) =>
    setForm((p) => ({ ...p, [cat]: p[cat].filter((i) => i.id !== id) }));

  const changeItem = (
    cat: "inmuebles" | "vehiculos" | "otros_bienes" | "deudas",
    id: string,
    k: keyof ItemPatrimonio,
    v: string | number | null
  ) =>
    setForm((p) => ({
      ...p,
      [cat]: p[cat].map((i) => (i.id === id ? { ...i, [k]: v } : i)),
    }));

  const totales = calcularTotalesPatrimonio(form);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Paso 4 — Estado Patrimonial</h2>
        <p className="text-sm text-muted-foreground">Declaración de activos, pasivos y patrimonio (opcional)</p>
      </div>

      {/* Disponible */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Disponible (Bs.)</Label>
          <Input
            type="number" min={0} step={0.01}
            value={form.disponible ?? ""}
            onChange={(e) => set("disponible", e.target.value ? parseFloat(e.target.value) : null)}
            className="mt-1" placeholder="0.00"
          />
        </div>
        <div>
          <Label>Lugar y Fecha de Declaración</Label>
          <Input
            value={form.lugar_fecha}
            onChange={(e) => set("lugar_fecha", e.target.value)}
            className="mt-1" placeholder="Ej: Santa Cruz, 18 de febrero de 2025"
          />
        </div>
        <div>
          <Label>Fecha de Firma</Label>
          <Input type="date" value={form.fecha_declaracion} onChange={(e) => set("fecha_declaracion", e.target.value)} className="mt-1" />
        </div>
      </div>

      {/* Inmuebles */}
      <PatrimonyTable
        titulo="Inmuebles"
        items={form.inmuebles}
        columnas={[
          { key: "descripcion", label: "Descripción", placeholder: "Ej: Casa" },
          { key: "ubicacion",   label: "Ubicación / Dirección" },
          { key: "valor",       label: "Valor estimado (Bs.)", placeholder: "0.00" },
        ]}
        onAdd={() => addItem("inmuebles")}
        onRemove={(id) => removeItem("inmuebles", id)}
        onChange={(id, k, v) => changeItem("inmuebles", id, k, v)}
      />

      {/* Vehículos */}
      <PatrimonyTable
        titulo="Vehículos"
        items={form.vehiculos}
        columnas={[
          { key: "modelo_marca", label: "Modelo / Marca" },
          { key: "placa",        label: "Placa" },
          { key: "valor",        label: "Valor estimado (Bs.)", placeholder: "0.00" },
        ]}
        onAdd={() => addItem("vehiculos")}
        onRemove={(id) => removeItem("vehiculos", id)}
        onChange={(id, k, v) => changeItem("vehiculos", id, k, v)}
      />

      {/* Otros bienes */}
      <PatrimonyTable
        titulo="Otros Bienes (Maquinaria, Muebles, Electrodomésticos, etc.)"
        items={form.otros_bienes}
        columnas={[
          { key: "descripcion", label: "Descripción", placeholder: "Ej: Escritorio" },
          { key: "valor",       label: "Valor estimado (Bs.)", placeholder: "0.00" },
        ]}
        onAdd={() => addItem("otros_bienes")}
        onRemove={(id) => removeItem("otros_bienes", id)}
        onChange={(id, k, v) => changeItem("otros_bienes", id, k, v)}
      />

      {/* Deudas */}
      <PatrimonyTable
        titulo="Préstamos y Deudas"
        items={form.deudas}
        columnas={[
          { key: "entidad",          label: "Entidad" },
          { key: "tipo_deuda",       label: "Tipo de deuda", placeholder: "Ej: Hipotecario" },
          { key: "fecha_vencimiento", label: "Fecha vencimiento" },
          { key: "valor",            label: "Saldo deuda (Bs.)", placeholder: "0.00" },
        ]}
        onAdd={() => addItem("deudas")}
        onRemove={(id) => removeItem("deudas", id)}
        onChange={(id, k, v) => changeItem("deudas", id, k, v)}
      />

      {/* Resumen de totales */}
      <div className="rounded-lg border bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[
          { label: "Activo Total", value: totales.activo_total },
          { label: "Pasivo Total", value: totales.pasivo_total },
          { label: "Patrimonio", value: totales.patrimonio_neto },
        ].map((t) => (
          <div key={t.label}>
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="font-semibold">Bs. {t.value.toLocaleString("es-BO", { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

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
