"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Save, Loader2, AlertCircle, Pencil, CheckCircle2, XCircle, FileText, User2, MapPin, Briefcase, DollarSign } from "lucide-react";
import type { EmpleadoFormState } from "@/types/rrhh";
import {
  LABEL_GENERO, LABEL_ESTADO_CIVIL, LABEL_AREA,
  TIPOS_DOCUMENTO_EMPLEADO, calcularCompletitudChecklist,
  calcularTotalesPatrimonio,
} from "@/types/rrhh";

interface Props {
  formState: EmpleadoFormState;
  onBack: () => void;
  onGoToStep: (step: number) => void;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
}

function SectionHeader({ icon, title, onEdit }: { icon: React.ReactNode; title: string; step?: number; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1 h-7 text-xs">
        <Pencil className="h-3 w-3" />
        Editar
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-xs text-muted-foreground w-40 shrink-0">{label}</dt>
      <dd className="text-xs text-foreground">{value ?? <span className="text-muted-foreground/60 italic">—</span>}</dd>
    </div>
  );
}

export default function StepResumen({ formState, onBack, onGoToStep, onSave, saving, saveError }: Props) {
  const { identificacion, direccion, laboral, patrimonio, checklist, documentos } = formState;

  const checklistCompletitud = checklist ? calcularCompletitudChecklist(checklist) : 0;
  const itemsSI = checklist ? Object.values(checklist).filter((i) => i.estado === "si").length : 0;
  const itemsNO = checklist ? Object.values(checklist).filter((i) => i.estado === "no").length : 0;

  const totales = patrimonio ? calcularTotalesPatrimonio(patrimonio) : null;

  const warnings: string[] = [];
  if (!identificacion)        warnings.push("Faltan datos de identificación (obligatorio)");
  if (!laboral)               warnings.push("Faltan datos laborales (obligatorio)");
  if (documentos.length === 0) warnings.push("No se han adjuntado documentos");
  if (checklistCompletitud < 100) warnings.push(`Checklist incompleto: ${checklistCompletitud}%`);

  const hasBlockers = !identificacion || !laboral;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Paso 7 — Resumen y Confirmación</h2>
        <p className="text-sm text-muted-foreground">Revise todos los datos antes de guardar</p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div key={w} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              hasBlockers && (w.includes("identificación") || w.includes("laborales"))
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Identificación */}
      {identificacion && (
        <div className="rounded-lg border p-4">
          <SectionHeader
            icon={<User2 className="h-4 w-4" />}
            title="Identificación Personal"
            step={1}
            onEdit={() => onGoToStep(1)}
          />
          <dl className="space-y-1.5">
            <Row label="Nombre completo" value={`${identificacion.nombres} ${identificacion.apellidos}`} />
            <Row label="Documento" value={`${identificacion.nro_documento}${identificacion.extension ? ` — ${identificacion.extension}` : ""}`} />
            <Row label="NUA/CUA" value={identificacion.nro_nua_cua} />
            <Row label="Nacimiento" value={identificacion.fecha_nacimiento ? new Date(identificacion.fecha_nacimiento).toLocaleDateString("es-BO") : null} />
            <Row label="Género" value={LABEL_GENERO[identificacion.genero]} />
            <Row label="Nacionalidad" value={identificacion.otra_nacionalidad || identificacion.nacionalidad} />
            <Row label="Estado civil" value={identificacion.estado_civil ? LABEL_ESTADO_CIVIL[identificacion.estado_civil] : null} />
            {identificacion.nombre_conyuge && <Row label="Cónyuge" value={identificacion.nombre_conyuge} />}
          </dl>
        </div>
      )}

      {/* Dirección */}
      {direccion && (
        <div className="rounded-lg border p-4">
          <SectionHeader
            icon={<MapPin className="h-4 w-4" />}
            title="Dirección y Contacto"
            step={2}
            onEdit={() => onGoToStep(2)}
          />
          <dl className="space-y-1.5">
            <Row label="Dirección" value={[direccion.av_calle_pasaje, direccion.zona_barrio, direccion.departamento].filter(Boolean).join(", ")} />
            <Row label="Referencia" value={direccion.referencia_direccion} />
            <Row label="Teléfono" value={direccion.telefono} />
            <Row label="Email" value={direccion.email} />
            {direccion.lat && <Row label="Ubicación GPS" value={`${direccion.lat.toFixed(5)}, ${direccion.lng?.toFixed(5)}`} />}
            {direccion.referencias[0]?.nombres_apellidos && (
              <Row label="Ref. Familiar 1" value={`${direccion.referencias[0].nombres_apellidos} — ${direccion.referencias[0].parentesco || "s/d"}`} />
            )}
            {direccion.referencias[1]?.nombres_apellidos && (
              <Row label="Ref. Familiar 2" value={`${direccion.referencias[1].nombres_apellidos} — ${direccion.referencias[1].parentesco || "s/d"}`} />
            )}
          </dl>
        </div>
      )}

      {/* Laboral */}
      {laboral && (
        <div className="rounded-lg border p-4">
          <SectionHeader
            icon={<Briefcase className="h-4 w-4" />}
            title="Datos Laborales"
            step={3}
            onEdit={() => onGoToStep(3)}
          />
          <dl className="space-y-1.5">
            <Row label="Cargo" value={laboral.cargo} />
            <Row label="Fecha de ingreso" value={laboral.fecha_ingreso ? new Date(laboral.fecha_ingreso).toLocaleDateString("es-BO") : null} />
            <Row label="Haber básico" value={laboral.haber_basico ? `Bs. ${laboral.haber_basico.toLocaleString("es-BO")}` : null} />
            <Row label="Área solicitante" value={laboral.area_solicitante ? LABEL_AREA[laboral.area_solicitante] : null} />
            <Row label="Entrevistado por" value={laboral.entrevistado_por_nombre} />
            <Row label="Aprobado por" value={laboral.aprobado_por_nombre} />
          </dl>
        </div>
      )}

      {/* Patrimonio */}
      {patrimonio && totales && (
        <div className="rounded-lg border p-4">
          <SectionHeader
            icon={<DollarSign className="h-4 w-4" />}
            title="Estado Patrimonial"
            step={4}
            onEdit={() => onGoToStep(4)}
          />
          <dl className="space-y-1.5">
            <Row label="Disponible" value={`Bs. ${(patrimonio.disponible ?? 0).toLocaleString("es-BO")}`} />
            <Row label="Inmuebles" value={`${patrimonio.inmuebles.length} registro(s)`} />
            <Row label="Vehículos" value={`${patrimonio.vehiculos.length} registro(s)`} />
            <Row label="Otros bienes" value={`${patrimonio.otros_bienes.length} registro(s)`} />
            <Row label="Deudas" value={`${patrimonio.deudas.length} registro(s)`} />
            <Row label="Activo total" value={`Bs. ${totales.activo_total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`} />
            <Row label="Patrimonio neto" value={`Bs. ${totales.patrimonio_neto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`} />
          </dl>
        </div>
      )}

      {/* Checklist */}
      <div className="rounded-lg border p-4">
        <SectionHeader
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Checklist de Documentos"
          step={5}
          onEdit={() => onGoToStep(5)}
        />
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>{itemsSI} ítems SI</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600">
            <XCircle className="h-4 w-4" />
            <span>{itemsNO} ítems NO</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {checklistCompletitud}% respondido
          </Badge>
        </div>
      </div>

      {/* Documentos */}
      <div className="rounded-lg border p-4">
        <SectionHeader
          icon={<FileText className="h-4 w-4" />}
          title="Documentos Adjuntos"
          step={6}
          onEdit={() => onGoToStep(6)}
        />
        {documentos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin documentos adjuntos</p>
        ) : (
          <ul className="space-y-1">
            {documentos.map((d) => (
              <li key={d.id} className="text-xs flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                {d.nombre_archivo}
                <span className="text-muted-foreground">— {TIPOS_DOCUMENTO_EMPLEADO[d.tipo_documento]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Save error */}
      {saveError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveError}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || hasBlockers}
          className="gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando..." : "Guardar Empleado"}
        </Button>
      </div>
    </div>
  );
}
