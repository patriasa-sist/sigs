"use client";

import React from "react";
import { PDFViewer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { EmployeeDetail } from "@/types/rrhh";
import { LABEL_ESTADO_CIVIL, LABEL_AREA } from "@/types/rrhh";

const S = StyleSheet.create({
  page:        { padding: 30, fontSize: 8, fontFamily: "Helvetica", color: "#111" },
  title:       { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 12, textTransform: "uppercase" },
  logo:        { width: 90, height: "auto", marginBottom: 6 },
  headerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  section:     { marginBottom: 10 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", backgroundColor: "#003366", color: "#fff", padding: "3 6", marginBottom: 4, textTransform: "uppercase" },
  row:         { flexDirection: "row", borderBottom: "0.5 solid #ddd", paddingVertical: 3, paddingHorizontal: 4 },
  label:       { width: 120, color: "#555", fontSize: 7 },
  value:       { flex: 1, fontFamily: "Helvetica-Bold" },
  rowFull:     { flexDirection: "row", gap: 8 },
  col2:        { flex: 1, flexDirection: "column" },
  checkRow:    { flexDirection: "row", gap: 4, alignItems: "center", marginTop: 2 },
  checkBox:    { width: 10, height: 10, border: "1 solid #333" },
  checkLabel:  { fontSize: 7, color: "#444" },
  footer:      { marginTop: 20, flexDirection: "row", justifyContent: "space-between" },
  signLine:    { width: 120, borderTop: "0.5 solid #333", paddingTop: 3, fontSize: 7, color: "#555", textAlign: "center" },
  dateBox:     { flexDirection: "row", gap: 4, alignItems: "center", marginTop: 6 },
  dateCell:    { border: "0.5 solid #333", padding: "2 8", minWidth: 28, textAlign: "center" },
});

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={S.row}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value ?? ""}</Text>
    </View>
  );
}

function CheckField({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <View style={[S.checkRow, { marginLeft: 8 }]}>
      <View style={S.checkBox}>{checked && <Text style={{ fontSize: 8, color: "#003366", textAlign: "center" }}>✓</Text>}</View>
      <Text style={S.checkLabel}>{label}</Text>
    </View>
  );
}

interface Props {
  empleado: EmployeeDetail;
}

function FichaIdentificacionDoc({ empleado }: Props) {
  const fam = empleado.employee_family_refs ?? [];

  return (
    <Document title={`Ficha Identificación — ${empleado.apellidos} ${empleado.nombres}`}>
      <Page size="LETTER" style={S.page}>
        {/* Header */}
        <View style={S.headerRow}>
          <Image style={S.logo} src="/patria-horizontal.png" />
          <Text style={[S.title, { fontSize: 11, textAlign: "right" }]}>
            Ficha de Identificación{"\n"}de Datos del Personal
          </Text>
        </View>

        {/* Información General */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Información General</Text>
          <View style={S.rowFull}>
            <View style={S.col2}>
              <Field label="1  Nombres"      value={empleado.nombres} />
              <Field label="2  Apellidos"    value={empleado.apellidos} />
              <Field label="5  Nro. Documento" value={`${empleado.nro_documento}${empleado.complemento ? ` ${empleado.complemento}` : ""}`} />
              <Field label="6  Nro. NUA/CUA" value={empleado.nro_nua_cua ?? ""} />
              <Field label="7  NIT"          value={empleado.nit ?? ""} />
              <Field label="8  Fecha Nacimiento" value={empleado.fecha_nacimiento ? new Date(empleado.fecha_nacimiento).toLocaleDateString("es-BO") : ""} />
            </View>
            <View style={S.col2}>
              <View style={S.row}>
                <Text style={S.label}>3  Tipo de Documento</Text>
                <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
                  <CheckField label="C.I." checked={empleado.tipo_documento === "cedula"} />
                  <CheckField label="Pasaporte" checked={empleado.tipo_documento === "pasaporte"} />
                  <CheckField label="RUN" checked={empleado.tipo_documento === "rnu"} />
                </View>
              </View>
              <Field label="4  Extensión"       value={empleado.extension ?? ""} />
              <View style={S.row}>
                <Text style={S.label}>9  Género</Text>
                <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                  <CheckField label="Masculino" checked={empleado.genero === "M"} />
                  <CheckField label="Femenino"  checked={empleado.genero === "F"} />
                </View>
              </View>
              <Field label="10 Nacionalidad" value={empleado.nacionalidad} />
              <View style={S.row}>
                <Text style={S.label}>11 Estado Civil</Text>
                <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {(["soltero","casado","union_libre","divorciado","viudo"] as const).map((ec) => (
                    <CheckField key={ec} label={LABEL_ESTADO_CIVIL[ec]} checked={empleado.estado_civil === ec} />
                  ))}
                </View>
              </View>
              <Field label="12 Cónyuge" value={empleado.nombre_conyuge ?? ""} />
            </View>
          </View>
        </View>

        {/* Dirección Domicilio */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Dirección Domicilio</Text>
          <Field label="12 Av. / Calle / Pasaje"       value={empleado.av_calle_pasaje ?? ""} />
          <Field label="13 Zona / Barrio"               value={empleado.zona_barrio ?? ""} />
          <Field label="14 Urb. / Condominio"           value={empleado.urbanizacion_condominio ?? ""} />
          <Field label="15 Edif. / Bloque / Piso"       value={empleado.edif_bloque_piso ?? ""} />
          <Field label="16 Casilla"                     value={empleado.casilla ?? ""} />
          <Field label="17 Referencia Dirección"        value={empleado.referencia_direccion ?? ""} />
          <View style={S.rowFull}>
            <View style={S.col2}><Field label="18 Departamento" value={empleado.departamento ?? ""} /></View>
            <View style={S.col2}><Field label="19 País"         value={empleado.pais ?? "Bolivia"} /></View>
          </View>
          {empleado.lat && (
            <Field label="    Coordenadas GPS" value={`${Number(empleado.lat).toFixed(6)}, ${Number(empleado.lng).toFixed(6)}`} />
          )}
        </View>

        {/* Teléfonos */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Teléfonos y Medios de Contacto</Text>
          <Field label="20 Teléfono / Celular" value={empleado.telefono ?? ""} />
          <Field label="22 Correo Electrónico" value={empleado.email ?? ""} />
        </View>

        {/* Referencias familiares */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Datos de Referencia Familiar (2 familiares)</Text>
          <View style={S.rowFull}>
            {[0, 1].map((idx) => {
              const ref = fam.find((r) => r.orden === idx + 1);
              return (
                <View key={idx} style={[S.col2, { paddingLeft: idx === 1 ? 8 : 0 }]}>
                  <Text style={[S.checkLabel, { fontFamily: "Helvetica-Bold", marginBottom: 2 }]}>{idx + 1}</Text>
                  <Field label="23 Nombres y Apellidos" value={ref?.nombres_apellidos ?? ""} />
                  <Field label="24 Teléfono / Celular"  value={ref?.telefono ?? ""} />
                  <Field label="25 Tipo de Parentesco"  value={ref?.parentesco ?? ""} />
                </View>
              );
            })}
          </View>
        </View>

        {/* Solicitud y Selección */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Solicitud y Selección del Personal</Text>
          <View style={S.row}>
            <Text style={S.label}>26 Medio Comunicación</Text>
            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
              <CheckField label="Publicación"         checked={empleado.medio_comunicacion === "publicacion"} />
              <CheckField label="Invitación Personal" checked={empleado.medio_comunicacion === "invitacion_personal"} />
              <CheckField label="Otro"                checked={empleado.medio_comunicacion === "otro"} />
              {empleado.medio_comunicacion === "otro" && (
                <Text style={{ fontSize: 7 }}>{empleado.medio_comunicacion_desc}</Text>
              )}
            </View>
          </View>
          <View style={S.row}>
            <Text style={S.label}>27 Área Solicitante</Text>
            <View style={{ flex: 1, flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {(["comercial_produccion","cobranzas","reclamos","recepcion","contabilidad"] as const).map((a) => (
                <CheckField key={a} label={LABEL_AREA[a]} checked={empleado.area_solicitante === a} />
              ))}
            </View>
          </View>
          <View style={S.rowFull}>
            <View style={S.col2}>
              <Field label="28 Entrevistado por — Nombre" value={empleado.entrevistado_por_nombre ?? ""} />
              <Field label="   Cargo"                      value={empleado.entrevistado_por_cargo ?? ""} />
              <Field label="   Fecha"                      value={empleado.entrevistado_fecha ? new Date(empleado.entrevistado_fecha).toLocaleDateString("es-BO") : ""} />
            </View>
            <View style={S.col2}>
              <Field label="29 Aprobado por — Nombre" value={empleado.aprobado_por_nombre ?? ""} />
              <Field label="   Cargo"                  value={empleado.aprobado_por_cargo ?? ""} />
              <Field label="   Fecha"                  value={empleado.aprobado_fecha ? new Date(empleado.aprobado_fecha).toLocaleDateString("es-BO") : ""} />
            </View>
          </View>
        </View>

        {/* Datos de ingreso */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Datos de Ingreso en Planilla de Sueldos</Text>
          <View style={S.rowFull}>
            <View style={S.col2}>
              <Field label="30 Fecha de Ingreso" value={empleado.fecha_ingreso ? new Date(empleado.fecha_ingreso).toLocaleDateString("es-BO") : ""} />
            </View>
            <View style={S.col2}>
              <Field label="31 Haber Básico" value={empleado.haber_basico ? `Bs. ${Number(empleado.haber_basico).toLocaleString("es-BO", { minimumFractionDigits: 2 })}` : ""} />
            </View>
            <View style={S.col2}>
              <Field label="32 Cargo" value={empleado.cargo} />
            </View>
          </View>
        </View>

        {/* Footer signatures */}
        <View style={S.footer}>
          <View style={S.signLine}><Text>Firma — Nombre — CI</Text></View>
          <View style={S.signLine}><Text>Recursos Humanos (Sello y Firma)</Text></View>
          <View style={S.signLine}><Text>Aprobado por Gerencia (Sello y Firma)</Text></View>
        </View>

        <View style={[S.dateBox, { justifyContent: "flex-end", marginTop: 6 }]}>
          <Text style={{ fontSize: 7 }}>AL</Text>
          <View style={S.dateCell}><Text>Día</Text></View>
          <View style={S.dateCell}><Text>Mes</Text></View>
          <View style={S.dateCell}><Text>Año</Text></View>
        </View>
      </Page>
    </Document>
  );
}

export default function FichaIdentificacionPDF({ empleado }: Props) {
  return (
    <PDFViewer width="100%" height={700} style={{ border: "none" }}>
      <FichaIdentificacionDoc empleado={empleado} />
    </PDFViewer>
  );
}
