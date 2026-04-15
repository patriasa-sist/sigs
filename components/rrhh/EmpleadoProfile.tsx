"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, User2, MapPin, Briefcase, DollarSign,
  CheckCircle2, FileText, Download, Trash2, Upload,
  CheckCircle, XCircle, Printer,
} from "lucide-react";
import type { EmployeeDetail, ChecklistItem, TipoDocumentoEmpleado } from "@/types/rrhh";
import {
  LABEL_GENERO, LABEL_ESTADO_CIVIL, LABEL_AREA, LABEL_MEDIO,
  TIPOS_DOCUMENTO_EMPLEADO, CHECKLIST_DEFINICION,
  calcularCompletitudChecklist, calcularTotalesPatrimonio,
} from "@/types/rrhh";
import { actualizarChecklist, subirDocumentoEmpleado, descartarDocumentoEmpleado, obtenerUrlDocumentoEmpleado } from "@/app/rrhh/actions";
import dynamic from "next/dynamic";

const FichaIdentificacionPDF = dynamic(() => import("./pdf/FichaIdentificacionPDF"), { ssr: false });
const FichaDocumentosPDF     = dynamic(() => import("./pdf/FichaDocumentosPDF"),     { ssr: false });
const EstadoPatrimonialPDF   = dynamic(() => import("./pdf/EstadoPatrimonialPDF"),   { ssr: false });

type Tab = "identificacion" | "patrimonio" | "checklist" | "documentos";

interface Props {
  empleado: EmployeeDetail;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 border-b border-border/40 last:border-0">
      <dt className="text-xs text-muted-foreground w-44 shrink-0">{label}</dt>
      <dd className="text-sm text-foreground break-words flex-1">{value}</dd>
    </div>
  );
}

export default function EmpleadoProfile({ empleado }: Props) {
  const [tab, setTab] = useState<Tab>("identificacion");
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>(
    empleado.employee_checklist?.items ?? {}
  );
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [showPDF, setShowPDF] = useState<"identificacion" | "documentos" | "patrimonio" | null>(null);

  const completitud = calcularCompletitudChecklist(checklist);

  const patrimony = empleado.employee_patrimony;
  const totales = patrimony
    ? calcularTotalesPatrimonio({
        disponible:  patrimony.disponible ?? 0,
        inmuebles:   (patrimony.employee_patrimony_items ?? []).filter((i) => i.categoria === "inmueble").map((i) => ({ id: i.id, descripcion: i.descripcion ?? "", ubicacion: i.ubicacion ?? "", modelo_marca: "", placa: "", entidad: "", tipo_deuda: "", fecha_vencimiento: "", valor: i.valor ?? null })),
        vehiculos:   (patrimony.employee_patrimony_items ?? []).filter((i) => i.categoria === "vehiculo").map((i) => ({ id: i.id, descripcion: "", ubicacion: "", modelo_marca: i.modelo_marca ?? "", placa: i.placa ?? "", entidad: "", tipo_deuda: "", fecha_vencimiento: "", valor: i.valor ?? null })),
        otros_bienes:(patrimony.employee_patrimony_items ?? []).filter((i) => i.categoria === "otro_bien").map((i) => ({ id: i.id, descripcion: i.descripcion ?? "", ubicacion: "", modelo_marca: "", placa: "", entidad: "", tipo_deuda: "", fecha_vencimiento: "", valor: i.valor ?? null })),
        deudas:      (patrimony.employee_patrimony_items ?? []).filter((i) => i.categoria === "deuda").map((i) => ({ id: i.id, descripcion: i.descripcion ?? "", ubicacion: "", modelo_marca: "", placa: "", entidad: i.entidad ?? "", tipo_deuda: i.tipo_deuda ?? "", fecha_vencimiento: i.fecha_vencimiento ?? "", valor: i.valor ?? null })),
        lugar_fecha:       patrimony.lugar_fecha ?? "",
        fecha_declaracion: patrimony.fecha_declaracion ?? "",
      })
    : null;

  const handleChecklistSave = async () => {
    setSavingChecklist(true);
    await actualizarChecklist(empleado.id, checklist);
    setSavingChecklist(false);
  };

  const updateItem = (id: string, estado: "si" | "no" | null) =>
    setChecklist((p) => ({ ...p, [id]: { ...p[id], estado } }));

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: TipoDocumentoEmpleado) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo_documento", tipo);
    await subirDocumentoEmpleado(empleado.id, fd);
    e.target.value = "";
    window.location.reload();
  };

  const handleDocDiscard = async (docId: string) => {
    if (!confirm("¿Descartar este documento?")) return;
    await descartarDocumentoEmpleado(docId, empleado.id);
    window.location.reload();
  };

  const handleDocDownload = async (path: string, nombre: string) => {
    const { url } = await obtenerUrlDocumentoEmpleado(path);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
    }
  };

  const activeDocs = (empleado.employee_documents ?? []).filter((d) => d.estado === "activo");

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "identificacion", label: "Identificación",  icon: <User2 className="h-4 w-4" /> },
    { id: "patrimonio",     label: "Patrimonio",       icon: <DollarSign className="h-4 w-4" /> },
    { id: "checklist",      label: `Checklist ${completitud}%`, icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "documentos",     label: `Documentos (${activeDocs.length})`, icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/rrhh">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            RRHH
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {empleado.apellidos}, {empleado.nombres}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {empleado.cargo} · CI {empleado.nro_documento}
                {empleado.extension && ` — ${empleado.extension}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {empleado.activo ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Activo</Badge>
              ) : (
                <Badge variant="secondary">Inactivo</Badge>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Ingresó {new Date(empleado.fecha_ingreso).toLocaleDateString("es-BO")}
            </div>
            {empleado.haber_basico && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Bs. {Number(empleado.haber_basico).toLocaleString("es-BO")}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Checklist: {completitud}%
            </div>
          </div>
        </div>
      </div>

      {/* PDF buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPDF("identificacion")}>
          <Printer className="h-4 w-4" />
          Ficha Identificación
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPDF("documentos")}>
          <Printer className="h-4 w-4" />
          Ficha Documentos
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPDF("patrimonio")}>
          <Printer className="h-4 w-4" />
          Estado Patrimonial
        </Button>
      </div>

      {/* PDF viewers */}
      {showPDF === "identificacion" && (
        <div className="border rounded-lg overflow-hidden">
          <div className="flex justify-end p-2 bg-muted">
            <Button variant="ghost" size="sm" onClick={() => setShowPDF(null)}>Cerrar</Button>
          </div>
          <FichaIdentificacionPDF empleado={empleado} />
        </div>
      )}
      {showPDF === "documentos" && (
        <div className="border rounded-lg overflow-hidden">
          <div className="flex justify-end p-2 bg-muted">
            <Button variant="ghost" size="sm" onClick={() => setShowPDF(null)}>Cerrar</Button>
          </div>
          <FichaDocumentosPDF empleado={empleado} checklist={checklist} />
        </div>
      )}
      {showPDF === "patrimonio" && patrimony && (
        <div className="border rounded-lg overflow-hidden">
          <div className="flex justify-end p-2 bg-muted">
            <Button variant="ghost" size="sm" onClick={() => setShowPDF(null)}>Cerrar</Button>
          </div>
          <EstadoPatrimonialPDF empleado={empleado} patrimony={patrimony} />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Identificación */}
      {tab === "identificacion" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <User2 className="h-4 w-4 text-primary" /> Datos Personales
            </h3>
            <dl className="space-y-0.5">
              <Row label="Nombres"         value={empleado.nombres} />
              <Row label="Apellidos"       value={empleado.apellidos} />
              <Row label="C.I."            value={`${empleado.nro_documento}${empleado.complemento ? ` ${empleado.complemento}` : ""}${empleado.extension ? ` — ${empleado.extension}` : ""}`} />
              <Row label="NUA/CUA"         value={empleado.nro_nua_cua} />
              <Row label="NIT"             value={empleado.nit} />
              <Row label="Nacimiento"      value={empleado.fecha_nacimiento ? new Date(empleado.fecha_nacimiento).toLocaleDateString("es-BO") : null} />
              <Row label="Género"          value={empleado.genero ? LABEL_GENERO[empleado.genero] : null} />
              <Row label="Nacionalidad"    value={empleado.nacionalidad} />
              <Row label="Estado civil"    value={empleado.estado_civil ? LABEL_ESTADO_CIVIL[empleado.estado_civil] : null} />
              <Row label="Cónyuge"         value={empleado.nombre_conyuge} />
            </dl>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Dirección y Contacto
            </h3>
            <dl className="space-y-0.5">
              <Row label="Av./Calle"            value={empleado.av_calle_pasaje} />
              <Row label="Zona/Barrio"          value={empleado.zona_barrio} />
              <Row label="Urb./Condominio"      value={empleado.urbanizacion_condominio} />
              <Row label="Edif./Bloque/Piso"    value={empleado.edif_bloque_piso} />
              <Row label="Referencia"           value={empleado.referencia_direccion} />
              <Row label="Departamento"         value={empleado.departamento} />
              <Row label="País"                 value={empleado.pais} />
              <Row label="Teléfono"             value={empleado.telefono} />
              <Row label="Email"                value={empleado.email} />
              {empleado.lat && <Row label="Coordenadas GPS" value={`${Number(empleado.lat).toFixed(6)}, ${Number(empleado.lng).toFixed(6)}`} />}
            </dl>

            {/* Croquis */}
            {empleado.croquis_url && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Croquis</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={empleado.croquis_url} alt="Croquis domicilio" className="w-full rounded-md border object-contain max-h-40" />
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Datos Laborales
            </h3>
            <dl className="space-y-0.5">
              <Row label="Cargo"              value={empleado.cargo} />
              <Row label="Fecha ingreso"      value={new Date(empleado.fecha_ingreso).toLocaleDateString("es-BO")} />
              <Row label="Haber básico"       value={empleado.haber_basico ? `Bs. ${Number(empleado.haber_basico).toLocaleString("es-BO")}` : null} />
              <Row label="Área solicitante"   value={empleado.area_solicitante ? LABEL_AREA[empleado.area_solicitante as keyof typeof LABEL_AREA] : null} />
              <Row label="Medio comunicación" value={empleado.medio_comunicacion ? LABEL_MEDIO[empleado.medio_comunicacion as keyof typeof LABEL_MEDIO] : null} />
              <Row label="Entrevistado por"   value={empleado.entrevistado_por_nombre} />
              <Row label="Aprobado por"       value={empleado.aprobado_por_nombre} />
            </dl>
          </div>

          {/* Referencias familiares */}
          {(empleado.employee_family_refs ?? []).length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-sm mb-3">Referencias Familiares</h3>
              {empleado.employee_family_refs.map((ref) => (
                <div key={ref.id} className="mb-3 last:mb-0">
                  <p className="text-xs text-muted-foreground mb-1">Referencia {ref.orden}</p>
                  <dl className="space-y-0.5">
                    <Row label="Nombre"     value={ref.nombres_apellidos} />
                    <Row label="Teléfono"   value={ref.telefono} />
                    <Row label="Parentesco" value={ref.parentesco} />
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Patrimonio */}
      {tab === "patrimonio" && (
        <div className="space-y-4">
          {!patrimony ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin declaración patrimonial registrada</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {totales && [
                  { label: "Disponible",     v: patrimony.disponible },
                  { label: "Activo Total",   v: totales.activo_total },
                  { label: "Pasivo Total",   v: totales.pasivo_total },
                  { label: "Patrimonio",     v: totales.patrimonio_neto },
                ].map((t) => (
                  <div key={t.label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="text-lg font-semibold mt-1">
                      Bs. {Number(t.v ?? 0).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>

              {[
                { cat: "inmueble",   title: "Inmuebles",    cols: ["Descripción", "Ubicación", "Valor (Bs.)"] },
                { cat: "vehiculo",   title: "Vehículos",    cols: ["Modelo/Marca", "Placa", "Valor (Bs.)"] },
                { cat: "otro_bien",  title: "Otros Bienes", cols: ["Descripción", "Valor (Bs.)"] },
                { cat: "deuda",      title: "Préstamos y Deudas", cols: ["Entidad", "Tipo", "Vencimiento", "Saldo (Bs.)"] },
              ].map(({ cat, title }) => {
                const items = (patrimony.employee_patrimony_items ?? []).filter((i) => i.categoria === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="rounded-lg border overflow-hidden">
                    <div className="px-4 py-2 bg-muted/40 border-b text-sm font-medium">{title}</div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {items.map((item) => (
                          <tr key={item.id} className="px-4">
                            <td className="px-4 py-2 text-muted-foreground">
                              {item.descripcion || item.modelo_marca || item.entidad || "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono">
                              Bs. {Number(item.valor ?? 0).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {patrimony.lugar_fecha && (
                <p className="text-xs text-muted-foreground">
                  Declarado en: {patrimony.lugar_fecha}
                  {patrimony.fecha_declaracion && ` — ${new Date(patrimony.fecha_declaracion).toLocaleDateString("es-BO")}`}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Checklist */}
      {tab === "checklist" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Progress value={completitud} className="w-40 h-2" />
              <span className="text-sm font-medium">{completitud}%</span>
            </div>
            <Button size="sm" onClick={handleChecklistSave} disabled={savingChecklist}>
              {savingChecklist ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>

          {["recepcionada", "adjunto", "otros"].map((seccion) => {
            const LABELS = {
              recepcionada: "Documentación Recepcionada",
              adjunto:      "Documentos Adjunto al File",
              otros:        "Otros Documentos",
            };
            const items = CHECKLIST_DEFINICION.filter((d) => d.seccion === seccion);
            return (
              <div key={seccion}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 border-b pb-1">
                  {LABELS[seccion as keyof typeof LABELS]}
                </h3>
                <div className="space-y-1.5">
                  {items.map((def) => {
                    const item = checklist[def.id];
                    return (
                      <div key={def.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                        item?.estado === "si" ? "bg-emerald-50 border-emerald-100" :
                        item?.estado === "no" ? "bg-red-50 border-red-100" : "bg-card"
                      }`}>
                        <span className="flex-1">
                          <span className="text-xs text-muted-foreground mr-2 font-mono">{def.numero}.</span>
                          {def.label}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => updateItem(def.id, item?.estado === "si" ? null : "si")}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              item?.estado === "si"
                                ? "bg-emerald-500 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            <CheckCircle className="h-3 w-3" />SI
                          </button>
                          <button
                            onClick={() => updateItem(def.id, item?.estado === "no" ? null : "no")}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              item?.estado === "no"
                                ? "bg-red-500 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            <XCircle className="h-3 w-3" />NO
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Documentos */}
      {tab === "documentos" && (
        <div className="space-y-4">
          {/* Upload */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Upload className="h-4 w-4" />
                Subir documento
              </div>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => handleDocUpload(e, "otro")}
              />
            </label>
          </div>

          {activeDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin documentos adjuntos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border rounded-lg bg-card">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {TIPOS_DOCUMENTO_EMPLEADO[doc.tipo_documento]} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString("es-BO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDocDownload(doc.archivo_url, doc.nombre_archivo)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDocDiscard(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
