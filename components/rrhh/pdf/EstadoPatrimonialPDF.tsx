"use client";

import React from "react";
import { PDFViewer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { EmployeeDetail, PatrimonyDB } from "@/types/rrhh";

const S = StyleSheet.create({
  page:        { padding: 28, fontSize: 8, fontFamily: "Helvetica", color: "#111" },
  title:       { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center", color: "#003366", marginBottom: 6, textTransform: "uppercase" },
  subtitle:    { fontSize: 7, textAlign: "center", color: "#444", marginBottom: 10, lineHeight: 1.4 },
  logo:        { width: 70, height: "auto" },
  headerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#fff", backgroundColor: "#003366", padding: "3 6", marginBottom: 3 },
  row:         { flexDirection: "row", borderBottom: "0.5 solid #ddd", paddingVertical: 2, paddingHorizontal: 4 },
  label:       { width: 130, color: "#555", fontSize: 7 },
  value:       { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 7 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f4f8", paddingVertical: 3, paddingHorizontal: 4, borderBottom: "0.5 solid #ccc" },
  tableCell:   { flex: 1, fontSize: 7, color: "#555" },
  tableRow:    { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 4, borderBottom: "0.5 solid #eee" },
  totRow:      { flexDirection: "row", backgroundColor: "#f0f4f8", paddingVertical: 2, paddingHorizontal: 4 },
  totLabel:    { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 7 },
  totValue:    { width: 80, fontFamily: "Helvetica-Bold", fontSize: 7, textAlign: "right" },
  amount:      { width: 80, fontSize: 7, textAlign: "right" },
  emptyRow:    { paddingVertical: 8, paddingHorizontal: 4, fontSize: 7, color: "#aaa" },
});

const fmt = (v: number) =>
  v.toLocaleString("es-BO", { minimumFractionDigits: 2 });

interface Props {
  empleado: EmployeeDetail;
  patrimony: PatrimonyDB;
}

function EstadoPatrimonialDoc({ empleado, patrimony }: Props) {
  const items = patrimony.employee_patrimony_items ?? [];
  const inmuebles  = items.filter((i) => i.categoria === "inmueble");
  const vehiculos  = items.filter((i) => i.categoria === "vehiculo");
  const otroBienes = items.filter((i) => i.categoria === "otro_bien");
  const deudas     = items.filter((i) => i.categoria === "deuda");

  const totalInmuebles  = inmuebles.reduce((s, i)    => s + Number(i.valor ?? 0), 0);
  const totalVehiculos  = vehiculos.reduce((s, i)    => s + Number(i.valor ?? 0), 0);
  const totalOtros      = otroBienes.reduce((s, i)   => s + Number(i.valor ?? 0), 0);
  const totalDeudas     = deudas.reduce((s, i)       => s + Number(i.valor ?? 0), 0);
  const disponible      = Number(patrimony.disponible ?? 0);
  const activoTotal     = disponible + totalInmuebles + totalVehiculos + totalOtros;
  const pasivoTotal     = totalDeudas;
  const patrimonioNeto  = activoTotal - pasivoTotal;

  return (
    <Document title={`Estado Patrimonial — ${empleado.apellidos} ${empleado.nombres}`}>
      <Page size="LETTER" style={S.page}>
        {/* Header */}
        <View style={S.headerRow}>
          <Image style={S.logo} src="/patria-horizontal.png" />
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={S.title}>Estado Patrimonial del Empleado</Text>
            <Text style={S.subtitle}>
              Con el propósito de dar cumplimiento al Artículo 12, de la RA 001/2013 Manual de Procedimientos{"\n"}
              Operativos de la UIF (Obligación de Conocer al Cliente Interno), proporciono mi Estado Patrimonial.
            </Text>
          </View>
        </View>

        {/* Personal data */}
        <View style={{ marginBottom: 10 }}>
          <View style={S.row}>
            <Text style={S.label}>Nombres y Apellidos</Text>
            <Text style={S.value}>{empleado.nombres} {empleado.apellidos}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <View style={S.row}>
                <Text style={S.label}>Fecha de Nacimiento</Text>
                <Text style={S.value}>{empleado.fecha_nacimiento ? new Date(empleado.fecha_nacimiento).toLocaleDateString("es-BO") : ""}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={S.row}>
                <Text style={S.label}>Documento de Identidad</Text>
                <Text style={S.value}>{empleado.nro_documento}{empleado.extension ? ` — ${empleado.extension}` : ""}</Text>
              </View>
            </View>
          </View>
          <View style={S.row}>
            <Text style={S.label}>Dirección Domicilio</Text>
            <Text style={S.value}>{[empleado.av_calle_pasaje, empleado.zona_barrio].filter(Boolean).join(" — ")}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <View style={S.row}>
                <Text style={S.label}>Celular</Text>
                <Text style={S.value}>{empleado.telefono ?? ""}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={S.row}>
                <Text style={S.label}>Estado Civil</Text>
                <Text style={S.value}>{empleado.estado_civil ?? ""}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Datos laborales */}
        <Text style={S.sectionTitle}>2. Datos Laborales</Text>
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <View style={S.row}>
                <Text style={S.label}>Fecha de Ingreso</Text>
                <Text style={S.value}>{empleado.fecha_ingreso ? new Date(empleado.fecha_ingreso).toLocaleDateString("es-BO") : ""}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={S.row}>
                <Text style={S.label}>Cargo</Text>
                <Text style={S.value}>{empleado.cargo}</Text>
              </View>
            </View>
          </View>
          <View style={S.row}>
            <Text style={S.label}>Correo electrónico</Text>
            <Text style={S.value}>{empleado.email ?? ""}</Text>
          </View>
        </View>

        {/* Activos / Pasivos summary */}
        <Text style={S.sectionTitle}>3. Activos — Pasivo — Patrimonio</Text>
        <View style={{ flexDirection: "row", marginBottom: 8, gap: 8 }}>
          {/* Activos */}
          <View style={{ flex: 1, border: "0.5 solid #ccc" }}>
            <View style={[S.tableHeader]}>
              <Text style={[S.tableCell, { fontFamily: "Helvetica-Bold" }]}>Activo</Text>
              <Text style={[S.amount, { fontFamily: "Helvetica-Bold" }]}>Importe (Bs.)</Text>
            </View>
            {[
              { l: "Disponible", v: disponible },
              { l: "Inmuebles", v: totalInmuebles },
              { l: "Vehículos", v: totalVehiculos },
              { l: "Otros bienes", v: totalOtros },
            ].map(({ l, v }) => (
              <View key={l} style={S.tableRow}>
                <Text style={S.tableCell}>{l}</Text>
                <Text style={S.amount}>{fmt(v)}</Text>
              </View>
            ))}
            <View style={S.totRow}>
              <Text style={S.totLabel}>Activo Total</Text>
              <Text style={S.totValue}>{fmt(activoTotal)}</Text>
            </View>
          </View>
          {/* Pasivos */}
          <View style={{ flex: 1, border: "0.5 solid #ccc" }}>
            <View style={S.tableHeader}>
              <Text style={[S.tableCell, { fontFamily: "Helvetica-Bold" }]}>Pasivo — Patrimonio</Text>
              <Text style={[S.amount, { fontFamily: "Helvetica-Bold" }]}>Importe (Bs.)</Text>
            </View>
            <View style={S.tableRow}>
              <Text style={S.tableCell}>Préstamos</Text>
              <Text style={S.amount}>{fmt(totalDeudas)}</Text>
            </View>
            <View style={S.tableRow}>
              <Text style={S.tableCell}>Otras deudas</Text>
              <Text style={S.amount}>—</Text>
            </View>
            <View style={S.totRow}>
              <Text style={S.totLabel}>Pasivo Total</Text>
              <Text style={S.totValue}>{fmt(pasivoTotal)}</Text>
            </View>
            <View style={[S.totRow, { marginTop: 8 }]}>
              <Text style={S.totLabel}>Patrimonio</Text>
              <Text style={S.totValue}>{fmt(patrimonioNeto)}</Text>
            </View>
          </View>
        </View>

        {/* Inmuebles */}
        <Text style={S.sectionTitle}>4. Detalle de Inmuebles</Text>
        <View style={{ border: "0.5 solid #ccc", marginBottom: 8 }}>
          <View style={S.tableHeader}>
            <Text style={[S.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Descripción</Text>
            <Text style={[S.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Ubicación</Text>
            <Text style={[S.amount, { fontFamily: "Helvetica-Bold" }]}>Valor (Bs.)</Text>
          </View>
          {inmuebles.length === 0 ? (
            <Text style={S.emptyRow}>—</Text>
          ) : (
            inmuebles.map((i) => (
              <View key={i.id} style={S.tableRow}>
                <Text style={[S.tableCell, { flex: 2 }]}>{i.descripcion ?? ""}</Text>
                <Text style={[S.tableCell, { flex: 2 }]}>{i.ubicacion ?? ""}</Text>
                <Text style={S.amount}>{fmt(Number(i.valor ?? 0))}</Text>
              </View>
            ))
          )}
          <View style={S.totRow}>
            <Text style={[S.totLabel, { flex: 4 }]}>Total</Text>
            <Text style={S.totValue}>{fmt(totalInmuebles)}</Text>
          </View>
        </View>

        {/* Vehículos */}
        <Text style={S.sectionTitle}>5. Detalle de Vehículos</Text>
        <View style={{ border: "0.5 solid #ccc", marginBottom: 8 }}>
          <View style={S.tableHeader}>
            <Text style={[S.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Tipo</Text>
            <Text style={[S.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Modelo / Marca</Text>
            <Text style={[S.tableCell, { fontFamily: "Helvetica-Bold" }]}>Placa</Text>
            <Text style={[S.amount, { fontFamily: "Helvetica-Bold" }]}>Valor (Bs.)</Text>
          </View>
          {vehiculos.length === 0 ? (
            <Text style={S.emptyRow}>—</Text>
          ) : (
            vehiculos.map((i) => (
              <View key={i.id} style={S.tableRow}>
                <Text style={[S.tableCell, { flex: 2 }]}>{i.descripcion ?? ""}</Text>
                <Text style={[S.tableCell, { flex: 2 }]}>{i.modelo_marca ?? ""}</Text>
                <Text style={S.tableCell}>{i.placa ?? ""}</Text>
                <Text style={S.amount}>{fmt(Number(i.valor ?? 0))}</Text>
              </View>
            ))
          )}
          <View style={S.totRow}>
            <Text style={[S.totLabel, { flex: 4 }]}>Total</Text>
            <Text style={S.totValue}>{fmt(totalVehiculos)}</Text>
          </View>
        </View>

        {/* Otros bienes */}
        <Text style={S.sectionTitle}>6. Otros Bienes (Maquinaria, Computadora, Muebles, Electrodomésticos, etc.)</Text>
        <View style={{ border: "0.5 solid #ccc", marginBottom: 8 }}>
          <View style={S.tableHeader}>
            <Text style={[S.tableCell, { flex: 3, fontFamily: "Helvetica-Bold" }]}>Descripción de los Bienes</Text>
            <Text style={[S.amount, { fontFamily: "Helvetica-Bold" }]}>Valor (Bs.)</Text>
          </View>
          {otroBienes.length === 0 ? (
            <Text style={S.emptyRow}>—</Text>
          ) : (
            otroBienes.map((i) => (
              <View key={i.id} style={S.tableRow}>
                <Text style={[S.tableCell, { flex: 3 }]}>{i.descripcion ?? ""}</Text>
                <Text style={S.amount}>{fmt(Number(i.valor ?? 0))}</Text>
              </View>
            ))
          )}
          <View style={S.totRow}>
            <Text style={[S.totLabel, { flex: 3 }]}>Total</Text>
            <Text style={S.totValue}>{fmt(totalOtros)}</Text>
          </View>
        </View>

        {/* Préstamos */}
        <Text style={S.sectionTitle}>7. Préstamos (Hipotecario, Prendario u Otros)</Text>
        <View style={{ border: "0.5 solid #ccc", marginBottom: 10 }}>
          <View style={S.tableHeader}>
            <Text style={[S.tableCell, { fontFamily: "Helvetica-Bold" }]}>Entidad</Text>
            <Text style={[S.tableCell, { fontFamily: "Helvetica-Bold" }]}>Tipo de deuda</Text>
            <Text style={[S.tableCell, { fontFamily: "Helvetica-Bold" }]}>Vencimiento</Text>
            <Text style={[S.amount, { fontFamily: "Helvetica-Bold" }]}>Saldo (Bs.)</Text>
          </View>
          {deudas.length === 0 ? (
            <Text style={S.emptyRow}>—</Text>
          ) : (
            deudas.map((i) => (
              <View key={i.id} style={S.tableRow}>
                <Text style={S.tableCell}>{i.entidad ?? ""}</Text>
                <Text style={S.tableCell}>{i.tipo_deuda ?? ""}</Text>
                <Text style={S.tableCell}>{i.fecha_vencimiento ? new Date(i.fecha_vencimiento).toLocaleDateString("es-BO") : ""}</Text>
                <Text style={S.amount}>{fmt(Number(i.valor ?? 0))}</Text>
              </View>
            ))
          )}
          <View style={S.totRow}>
            <Text style={[S.totLabel, { flex: 3 }]}>Total</Text>
            <Text style={S.totValue}>{fmt(totalDeudas)}</Text>
          </View>
        </View>

        {/* Declaration */}
        <View style={{ border: "0.5 solid #003366", padding: 6, backgroundColor: "#f0f4f8", marginBottom: 8 }}>
          <Text style={{ fontSize: 7, textAlign: "center", fontFamily: "Helvetica-Bold" }}>
            Declaro que los datos son verdaderos y autorizo para que sean verificados cuando así lo requiera la Entidad
          </Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 7, color: "#555" }}>Lugar y fecha</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7 }}>{patrimony.lugar_fecha ?? ""}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 140, borderTop: "0.5 solid #333", paddingTop: 3 }}>
              <Text style={{ fontSize: 7, color: "#555", textAlign: "center" }}>Firma</Text>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 7, color: "#555" }}>Observaciones</Text>
            <View style={{ width: 140, borderBottom: "0.5 solid #ccc", height: 20 }} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function EstadoPatrimonialPDF({ empleado, patrimony }: Props) {
  return (
    <PDFViewer width="100%" height={700} style={{ border: "none" }}>
      <EstadoPatrimonialDoc empleado={empleado} patrimony={patrimony} />
    </PDFViewer>
  );
}
