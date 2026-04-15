"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Upload, FileText, X, AlertCircle } from "lucide-react";
import type { DocumentoEmpleado, TipoDocumentoEmpleado } from "@/types/rrhh";
import { TIPOS_DOCUMENTO_EMPLEADO } from "@/types/rrhh";
import { subirCroquis } from "@/app/rrhh/actions";

interface Props {
  documentos: DocumentoEmpleado[];
  onSave: (docs: DocumentoEmpleado[]) => void;
  onBack: () => void;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export default function StepDocumentos({ documentos, onSave, onBack }: Props) {
  const [docs, setDocs] = useState<DocumentoEmpleado[]>(documentos);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumentoEmpleado>("carta_confidencialidad");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setUploadError("Tipo de archivo no permitido. Use PDF, JPG, PNG o DOC.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("El archivo supera el límite de 20MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo_documento", tipoSeleccionado);

      // Temp upload to get a path (best-effort, stored in temp/)
      const result = await subirCroquis(formData); // reuse generic upload

      const newDoc: DocumentoEmpleado = {
        id: crypto.randomUUID(),
        tipo_documento: tipoSeleccionado,
        nombre_archivo: file.name,
        tamano_bytes: file.size,
        file,
        storage_path: result.path,
        upload_status: result.success ? "uploaded" : "error",
      };
      setDocs((prev) => [...prev, newDoc]);
    } catch {
      setUploadError("Error al subir el archivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, [tipoSeleccionado]);

  const removeDoc = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Paso 6 — Carga de Documentos</h2>
        <p className="text-sm text-muted-foreground">
          Suba los documentos firmados en formato digital (PDF, JPG, PNG, DOC)
        </p>
      </div>

      {/* Uploader */}
      <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Documento</Label>
            <Select value={tipoSeleccionado} onValueChange={(v) => setTipoSeleccionado(v as TipoDocumentoEmpleado)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_DOCUMENTO_EMPLEADO).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="w-full">
              <div className={`flex items-center justify-center gap-2 border rounded-md h-10 px-4 cursor-pointer text-sm font-medium transition-colors ${
                uploading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}>
                {uploading ? (
                  <>Subiendo...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Seleccionar archivo
                  </>
                )}
              </div>
              <input
                type="file"
                className="sr-only"
                disabled={uploading}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {uploadError}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Formatos: PDF, JPG, PNG, DOC, DOCX — máximo 20MB por archivo
        </p>
      </div>

      {/* Lista de documentos */}
      {docs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Documentos adjuntados ({docs.length})</h3>
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                doc.upload_status === "error"
                  ? "border-destructive/30 bg-destructive/5"
                  : "bg-card"
              }`}
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{doc.nombre_archivo}</p>
                <p className="text-xs text-muted-foreground">
                  {TIPOS_DOCUMENTO_EMPLEADO[doc.tipo_documento]} · {formatBytes(doc.tamano_bytes)}
                  {doc.upload_status === "error" && (
                    <span className="text-destructive ml-2">Error al subir</span>
                  )}
                  {doc.upload_status === "uploaded" && (
                    <span className="text-emerald-600 ml-2">✓ Subido</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeDoc(doc.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {docs.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No se han adjuntado documentos. Puede continuar y agregarlos después.
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button onClick={() => onSave(docs)} className="gap-2">
          Revisar Resumen
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
