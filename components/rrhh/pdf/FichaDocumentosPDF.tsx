"use client";

import React from "react";
import { PDFViewer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { EmployeeDetail, ChecklistItem } from "@/types/rrhh";
import { CHECKLIST_DEFINICION } from "@/types/rrhh";

const S = StyleSheet.create({
  page:        { padding: 30, fontSize: 8, fontFamily: "Helvetica", color: "#111" },
  title:       { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 10, textTransform: "uppercase" },
  logo:        { width: 90, height: "auto" },
  headerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  section:     { marginBottom: 10 },
  sectionTitle:{ fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#003366", color: "#fff", padding: "3 6", textAlign: "center", textTransform: "uppercase", marginBottom: 2 },
  headerInfo:  { flexDirection: "row", borderBottom: "0.5 solid #ddd", paddingVertical: 2 },
  headerLabel: { width: 130, fontSize: 7, color: "#555" },
  headerValue: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 7 },
  itemRow:     { flexDirection: "row", borderBottom: "0.5 solid #eee", paddingVertical: 2, paddingHorizontal: 3, alignItems: "center" },
  itemNum:     { width: 18, fontSize: 7, color: "#777" },
  itemLabel:   { flex: 1, fontSize: 7 },
  checkBox:    { width: 28, flexDirection: "row", gap: 2, justifyContent: "center" },
  box:         { width: 9, height: 9, border: "0.5 solid #333", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  tick:        { fontSize: 8, color: "#003366" },
  siNoLabel:   { fontSize: 6, color: "#555" },
});

function CheckBoxes({ estado }: { estado: "si" | "no" | null | undefined }) {
  return (
    <View style={S.checkBox}>
      <View style={{ flexDirection: "column", alignItems: "center" }}>
        <View style={S.box}>{estado === "si" && <Text style={S.tick}>✓</Text>}</View>
        <Text style={S.siNoLabel}>SI</Text>
      </View>
      <View style={{ flexDirection: "column", alignItems: "center" }}>
        <View style={S.box}>{estado === "no" && <Text style={S.tick}>✓</Text>}</View>
        <Text style={S.siNoLabel}>NO</Text>
      </View>
    </View>
  );
}

interface Props {
  empleado: EmployeeDetail;
  checklist: Record<string, ChecklistItem>;
}

function FichaDocumentosDoc({ empleado, checklist }: Props) {
  const secs = [
    { id: "recepcionada", label: "Documentación Recepcionada" },
    { id: "adjunto",      label: "Documentos Adjunto al File" },
    { id: "otros",        label: "Otros Documentos Adjuntos al File" },
  ] as const;

  return (
    <Document title={`Ficha Documentos — ${empleado.apellidos} ${empleado.nombres}`}>
      <Page size="LETTER" style={S.page}>
        {/* Header */}
        <View style={S.headerRow}>
          <Image style={S.logo} src="/patria-horizontal.png" />
          <Text style={S.title}>Ficha de Documentos del Personal</Text>
        </View>

        {/* Employee header data */}
        <View style={{ marginBottom: 10 }}>
          {[
            { n: "1", l: "Nombre y Apellidos", v: `${empleado.nombres} ${empleado.apellidos}` },
            { n: "2", l: "Cédula de Identidad",  v: `${empleado.nro_documento}${empleado.extension ? ` — ${empleado.extension}` : ""}` },
            { n: "3", l: "Número de NUA/CUA",    v: empleado.nro_nua_cua ?? "" },
            { n: "4", l: "Fecha de Ingreso",     v: empleado.fecha_ingreso ? new Date(empleado.fecha_ingreso).toLocaleDateString("es-BO") : "" },
            { n: "5", l: "Cargo",                v: empleado.cargo },
          ].map(({ n, l, v }) => (
            <View key={n} style={S.headerInfo}>
              <Text style={[S.headerLabel]}>{n}  {l}</Text>
              <Text style={S.headerValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Checklist sections */}
        {secs.map((sec) => {
          const items = CHECKLIST_DEFINICION.filter((d) => d.seccion === sec.id);
          return (
            <View key={sec.id} style={S.section}>
              <Text style={S.sectionTitle}>{sec.label}</Text>
              {items.map((def) => {
                const item = checklist[def.id];
                return (
                  <View key={def.id} style={S.itemRow}>
                    <Text style={S.itemNum}>{def.numero}</Text>
                    <Text style={S.itemLabel}>{def.label.toUpperCase()}</Text>
                    <CheckBoxes estado={item?.estado} />
                    {/* Vigente for item 7 */}
                    {def.id === "item_7" && (
                      <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                        <Text style={{ fontSize: 6, color: "#555" }}>VIGENTE</Text>
                        <CheckBoxes estado={item?.vigente} />
                      </View>
                    )}
                    {/* Subsidios for item 33 */}
                    {def.id === "item_33" && (
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {(["prenatal","natalidad","lactancia","sepelio"] as const).map((sub) => (
                          <View key={sub} style={{ flexDirection: "column", alignItems: "center" }}>
                            <View style={S.box}>
                              {item?.subsidios?.[sub] && <Text style={S.tick}>✓</Text>}
                            </View>
                            <Text style={{ fontSize: 6, color: "#555", textTransform: "capitalize" }}>{sub}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Footer */}
        <View style={{ marginTop: 16, alignItems: "flex-end" }}>
          <View style={{ borderTop: "0.5 solid #333", width: 160, paddingTop: 4 }}>
            <Text style={{ fontSize: 7, color: "#555", textAlign: "center" }}>Recursos Humanos (Sello y Firma)</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 4, alignItems: "center" }}>
            <Text style={{ fontSize: 7 }}>AL</Text>
            {["Día", "Mes", "Año"].map((l) => (
              <View key={l} style={{ border: "0.5 solid #333", padding: "2 6", minWidth: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 7 }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function FichaDocumentosPDF({ empleado, checklist }: Props) {
  return (
    <PDFViewer width="100%" height={700} style={{ border: "none" }}>
      <FichaDocumentosDoc empleado={empleado} checklist={checklist} />
    </PDFViewer>
  );
}
