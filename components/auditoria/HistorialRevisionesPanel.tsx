"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import * as ExcelJS from "exceljs";
import { ALL_DOCUMENT_TYPES, type TipoDocumentoCliente } from "@/types/clienteDocumento";
import { obtenerHistorialRevisiones, obtenerResumenRevisiones } from "@/app/auditoria/revisiones/actions";
import type { AuditorUif, HistorialRevisionRow, ResumenRevisiones } from "@/types/auditoria";

type Props = {
	isAdmin: boolean;
	auditores: AuditorUif[];
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
	natural: "Persona Natural",
	juridica: "Persona Jurídica",
	unipersonal: "Empresa Unipersonal",
	ong: "ONG",
	club: "Club Deportivo",
	asociacion_civil: "Asociación Civil",
};

function docLabel(tipo: string): string {
	return ALL_DOCUMENT_TYPES[tipo as TipoDocumentoCliente] || tipo;
}

function fmtFecha(iso: string): string {
	return new Date(iso).toLocaleString("es-BO", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function KPICard({ label, value }: { label: string; value: number }) {
	return (
		<Card>
			<CardContent className="p-4">
				<p className="text-xs text-gray-500">{label}</p>
				<p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
			</CardContent>
		</Card>
	);
}

export function HistorialRevisionesPanel({ isAdmin, auditores }: Props) {
	const [auditorId, setAuditorId] = useState<string>("");
	const [desde, setDesde] = useState<string>("");
	const [hasta, setHasta] = useState<string>("");
	const [rows, setRows] = useState<HistorialRevisionRow[]>([]);
	const [resumen, setResumen] = useState<ResumenRevisiones>({ hoy: 0, ayer: 0, semana: 0, mes: 0 });
	const [loading, setLoading] = useState(false);

	const cargar = useCallback(async () => {
		setLoading(true);
		try {
			const [historial, res] = await Promise.all([
				obtenerHistorialRevisiones({
					auditorId: isAdmin && auditorId ? auditorId : undefined,
					desde: desde || undefined,
					hasta: hasta || undefined,
				}),
				obtenerResumenRevisiones(isAdmin && auditorId ? auditorId : undefined),
			]);
			setRows(historial);
			setResumen(res);
		} finally {
			setLoading(false);
		}
	}, [isAdmin, auditorId, desde, hasta]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const handleExport = async () => {
		const workbook = new ExcelJS.Workbook();

		// ---- Hoja Resumen ----
		const resumenWs = workbook.addWorksheet("Resumen");
		const auditorNombre =
			isAdmin && auditorId
				? auditores.find((a) => a.id === auditorId)?.full_name ||
					auditores.find((a) => a.id === auditorId)?.email ||
					"—"
				: "Mis revisiones";
		const headerStyle: Partial<ExcelJS.Style> = { font: { bold: true } };
		const metaRows: [string, string | number][] = [
			["Reporte de auditoría", ""],
			["Generado:", new Date().toLocaleString("es-BO")],
			["Auditor:", auditorNombre],
			["Rango:", `${desde || "inicio"} a ${hasta || "hoy"}`],
			["", ""],
			["Revisados hoy:", resumen.hoy],
			["Revisados ayer:", resumen.ayer],
			["Esta semana:", resumen.semana],
			["Este mes:", resumen.mes],
			["Total en el reporte:", rows.length],
			["Correctos:", rows.filter((r) => r.resultado === "correcto").length],
			["Incorrectos:", rows.filter((r) => r.resultado === "incorrecto").length],
		];
		for (const [label, value] of metaRows) {
			const row = resumenWs.addRow([label, value]);
			row.getCell(1).style = headerStyle;
		}
		resumenWs.getColumn(1).width = 24;
		resumenWs.getColumn(2).width = 40;

		// ---- Hoja Detalle ----
		const ws = workbook.addWorksheet("Detalle");
		const columns: { header: string; width: number }[] = [
			{ header: "Fecha", width: 20 },
			{ header: "Cliente", width: 32 },
			{ header: "Tipo", width: 18 },
			...(isAdmin ? [{ header: "Auditor", width: 28 }] : []),
			{ header: "Resultado", width: 12 },
			{ header: "Docs incorrectos", width: 40 },
			{ header: "Docs faltantes", width: 40 },
			{ header: "Notas", width: 40 },
			{ header: "Notificado", width: 12 },
		];
		const headerRow = ws.addRow(columns.map((c) => c.header));
		headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
		headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004F69" } };
		columns.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));

		for (const r of rows) {
			const incorrectos = r.documentos_problema
				.filter((d) => d.problema === "incorrecto")
				.map((d) => `${docLabel(d.tipo_documento)}${d.nota ? ` (${d.nota})` : ""}`)
				.join("; ");
			const faltantes = r.documentos_problema
				.filter((d) => d.problema === "faltante")
				.map((d) => docLabel(d.tipo_documento))
				.join("; ");
			ws.addRow([
				fmtFecha(r.fecha_revision),
				r.nombre_cliente || "—",
				CLIENT_TYPE_LABELS[r.client_type || ""] || r.client_type || "—",
				...(isAdmin ? [r.auditor_nombre || r.auditor_email || "—"] : []),
				r.resultado === "correcto" ? "Correcto" : "Incorrecto",
				incorrectos,
				faltantes,
				r.notas || "",
				r.resultado === "incorrecto" ? (r.notificado ? "Sí" : "No") : "—",
			]);
		}

		const buffer = await workbook.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `auditoria_revisiones_${new Date().toISOString().split("T")[0]}.xlsx`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-4">
			{/* KPIs */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<KPICard label="Hoy" value={resumen.hoy} />
				<KPICard label="Ayer" value={resumen.ayer} />
				<KPICard label="Esta semana" value={resumen.semana} />
				<KPICard label="Este mes" value={resumen.mes} />
			</div>

			{/* Filtros */}
			<div className="flex flex-wrap items-end gap-3">
				{isAdmin && (
					<div className="space-y-1.5">
						<Label className="text-sm">Auditor</Label>
						<Select value={auditorId || "all"} onValueChange={(v) => setAuditorId(v === "all" ? "" : v)}>
							<SelectTrigger className="w-56">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todos</SelectItem>
								{auditores.map((a) => (
									<SelectItem key={a.id} value={a.id}>
										{a.full_name || a.email}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
				<div className="space-y-1.5">
					<Label className="text-sm">Desde</Label>
					<Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
				</div>
				<div className="space-y-1.5">
					<Label className="text-sm">Hasta</Label>
					<Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
				</div>
				<Button variant="outline" onClick={cargar} disabled={loading}>
					{loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
					Actualizar
				</Button>
				<Button onClick={handleExport} disabled={loading || rows.length === 0} className="ml-auto">
					<Download className="h-4 w-4 mr-2" />
					Exportar Excel
				</Button>
			</div>

			{/* Resultados */}
			{loading ? (
				<div className="text-center py-12 text-gray-400">
					<Loader2 className="h-6 w-6 mx-auto animate-spin" />
				</div>
			) : rows.length === 0 ? (
				<div className="text-center py-12 text-gray-400">
					<p className="text-sm">No hay revisiones registradas en este rango.</p>
				</div>
			) : (
				<div className="border border-gray-200 rounded-lg overflow-hidden">
					{/* Desktop */}
					<div className="overflow-x-auto hidden md:block">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-gray-50 border-b border-gray-200 text-left">
									<th className="px-4 py-3 font-medium text-gray-700">Fecha</th>
									<th className="px-4 py-3 font-medium text-gray-700">Cliente</th>
									<th className="px-4 py-3 font-medium text-gray-700">Tipo</th>
									{isAdmin && <th className="px-4 py-3 font-medium text-gray-700">Auditor</th>}
									<th className="px-4 py-3 font-medium text-gray-700">Resultado</th>
									<th className="px-4 py-3 font-medium text-gray-700">Observados</th>
									<th className="px-4 py-3 font-medium text-gray-700">Notificado</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{rows.map((r) => (
									<tr key={r.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap text-gray-600">
											{fmtFecha(r.fecha_revision)}
										</td>
										<td className="px-4 py-3 font-medium text-gray-900">
											{r.nombre_cliente || "—"}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{CLIENT_TYPE_LABELS[r.client_type || ""] || r.client_type || "—"}
										</td>
										{isAdmin && (
											<td className="px-4 py-3 text-gray-600">
												{r.auditor_nombre || r.auditor_email || "—"}
											</td>
										)}
										<td className="px-4 py-3">
											{r.resultado === "correcto" ? (
												<span className="inline-flex items-center gap-1 text-green-700">
													<CheckCircle2 className="h-4 w-4" /> Correcto
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-red-700">
													<XCircle className="h-4 w-4" /> Incorrecto
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{r.documentos_problema.length || "—"}
										</td>
										<td className="px-4 py-3">
											{r.resultado === "incorrecto" ? (
												<span
													className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
														r.notificado
															? "bg-green-100 text-green-700"
															: "bg-amber-100 text-amber-700"
													}`}
												>
													{r.notificado ? "Sí" : "Pendiente"}
												</span>
											) : (
												"—"
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Mobile */}
					<div className="md:hidden divide-y divide-gray-200">
						{rows.map((r) => (
							<div key={r.id} className="p-3">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="font-medium text-gray-900 truncate">{r.nombre_cliente || "—"}</p>
										<p className="text-xs text-gray-500">
											{CLIENT_TYPE_LABELS[r.client_type || ""] || r.client_type} ·{" "}
											{fmtFecha(r.fecha_revision)}
										</p>
									</div>
									{r.resultado === "correcto" ? (
										<span className="inline-flex items-center gap-1 text-green-700 text-xs shrink-0">
											<CheckCircle2 className="h-3.5 w-3.5" /> Correcto
										</span>
									) : (
										<span className="inline-flex items-center gap-1 text-red-700 text-xs shrink-0">
											<XCircle className="h-3.5 w-3.5" /> Incorrecto
										</span>
									)}
								</div>
								{isAdmin && (
									<p className="mt-1 text-xs text-gray-500">
										Auditor: {r.auditor_nombre || r.auditor_email || "—"}
									</p>
								)}
								{r.resultado === "incorrecto" && (
									<p className="mt-1 text-xs text-gray-600">
										{r.documentos_problema.length} observado(s) ·{" "}
										{r.notificado ? "Notificado" : "Notificación pendiente"}
									</p>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
