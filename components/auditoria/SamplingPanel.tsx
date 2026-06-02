"use client";

import { useState, useCallback } from "react";
import {
	RefreshCw,
	User,
	Building2,
	Briefcase,
	FileText,
	ExternalLink,
	Loader2,
	CheckCircle2,
	XCircle,
	ChevronDown,
	ChevronUp,
	Flag,
	AlertTriangle,
	Send,
	Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_DOCUMENT_TYPES, type TipoDocumentoCliente, type ClienteDocumento } from "@/types/clienteDocumento";
import {
	obtenerMuestraAleatoria,
	obtenerDetalleSampling,
	type ClienteSampling,
	type ClienteSamplingDetalle,
} from "@/app/auditoria/sampling/actions";
import {
	obtenerDestinatarioNotificacion,
	obtenerUltimasRevisiones,
	obtenerResumenRevisiones,
	guardarRevision,
	reintentarNotificacion,
} from "@/app/auditoria/revisiones/actions";
import type {
	DestinatarioNotificacion,
	RevisionDocumentoProblema,
	UltimaRevisionCliente,
} from "@/types/auditoria";
import { createClient } from "@/utils/supabase/client";

const CLIENT_TYPE_LABELS: Record<string, { label: string; icon: typeof User }> = {
	natural: { label: "Persona Natural", icon: User },
	juridica: { label: "Persona Jurídica", icon: Building2 },
	unipersonal: { label: "Empresa Unipersonal", icon: Briefcase },
	ong: { label: "ONG", icon: Building2 },
	club: { label: "Club Deportivo", icon: Building2 },
	asociacion_civil: { label: "Asociación Civil", icon: Building2 },
};

function getDocLabel(tipo: TipoDocumentoCliente): string {
	return ALL_DOCUMENT_TYPES[tipo] || tipo;
}

function formatRelative(fechaIso: string): string {
	const fecha = new Date(fechaIso);
	const dias = Math.floor((Date.now() - fecha.getTime()) / 86400000);
	if (dias <= 0) return "hoy";
	if (dias === 1) return "ayer";
	if (dias < 7) return `hace ${dias} días`;
	if (dias < 30) return `hace ${Math.floor(dias / 7)} sem.`;
	if (dias < 365) return `hace ${Math.floor(dias / 30)} mes(es)`;
	return `hace ${Math.floor(dias / 365)} año(s)`;
}

function DocumentChip({
	tipo,
	uploaded,
	documento,
	flagged,
	onToggleFlag,
	locked,
}: {
	tipo: TipoDocumentoCliente;
	uploaded: boolean;
	documento?: ClienteDocumento;
	flagged?: boolean;
	onToggleFlag?: () => void;
	locked?: boolean;
}) {
	const [opening, setOpening] = useState(false);

	const handleClick = async () => {
		if (!uploaded || !documento?.storage_path) return;
		setOpening(true);
		try {
			const supabase = createClient();
			const { data } = await supabase.storage
				.from("clientes-documentos")
				.createSignedUrl(documento.storage_path, 3600);

			if (data?.signedUrl) {
				window.open(data.signedUrl, "_blank");
			}
		} finally {
			setOpening(false);
		}
	};

	const chipClass = !uploaded
		? "bg-red-100 text-red-800 border-red-300 cursor-default"
		: flagged
			? "bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200 cursor-pointer"
			: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 cursor-pointer";

	return (
		<span className="inline-flex items-center">
			<button
				onClick={handleClick}
				disabled={!uploaded || opening}
				className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border ${chipClass} ${
					uploaded && onToggleFlag ? "rounded-l-full border-r-0" : "rounded-full"
				}`}
				title={
					uploaded ? `${getDocLabel(tipo)} - Click para ver documento` : `${getDocLabel(tipo)} - No cargado`
				}
			>
				{opening ? (
					<Loader2 className="h-3 w-3 animate-spin" />
				) : !uploaded ? (
					<XCircle className="h-3 w-3" />
				) : flagged ? (
					<Flag className="h-3 w-3" />
				) : (
					<CheckCircle2 className="h-3 w-3" />
				)}
				<span>{getDocLabel(tipo)}</span>
				{uploaded && <ExternalLink className="h-3 w-3" />}
			</button>
			{uploaded && onToggleFlag && (
				<button
					onClick={onToggleFlag}
					disabled={locked}
					className={`inline-flex items-center px-2 py-1.5 text-xs rounded-r-full border transition-all ${
						flagged
							? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
							: "bg-white text-gray-400 border-gray-300 hover:text-amber-600 hover:border-amber-400"
					} ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
					title={flagged ? "Quitar marca de incorrecto" : "Marcar documento como incorrecto"}
				>
					<Flag className="h-3 w-3" />
				</button>
			)}
		</span>
	);
}

type FlaggedDoc = { documento_id: string | null; nota: string };
type SavedState = { resultado: "correcto" | "incorrecto"; notificado: boolean; revisionId: string } | null;

function ClientSamplingCard({
	cliente,
	ultimaRevision,
	onSaved,
}: {
	cliente: ClienteSampling;
	ultimaRevision?: UltimaRevisionCliente;
	onSaved: () => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [detalle, setDetalle] = useState<ClienteSamplingDetalle | null>(null);
	const [destinatario, setDestinatario] = useState<DestinatarioNotificacion | null>(null);

	// Estado de auditoría
	const [flagged, setFlagged] = useState<Record<string, FlaggedDoc>>({});
	const [notas, setNotas] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState<SavedState>(null);

	const typeInfo = CLIENT_TYPE_LABELS[cliente.client_type] || CLIENT_TYPE_LABELS.natural;
	const TypeIcon = typeInfo.icon;

	const handleToggle = useCallback(async () => {
		if (expanded) {
			setExpanded(false);
			return;
		}
		if (!detalle) {
			setLoading(true);
			try {
				const [data, dest] = await Promise.all([
					obtenerDetalleSampling(cliente.id),
					obtenerDestinatarioNotificacion(cliente.id),
				]);
				setDetalle(data);
				setDestinatario(dest);
			} finally {
				setLoading(false);
			}
		}
		setExpanded(true);
	}, [expanded, detalle, cliente.id]);

	const locked = saved !== null;
	const allUploaded = detalle ? detalle.documentos_faltantes.length === 0 : false;
	const hayFlagged = Object.keys(flagged).length > 0;
	const hayFaltantes = detalle ? detalle.documentos_faltantes.length > 0 : false;
	const puedeNotificar = destinatario?.ok === true;

	const toggleFlag = (tipo: string, documentoId: string | null) => {
		setFlagged((prev) => {
			const next = { ...prev };
			if (next[tipo]) {
				delete next[tipo];
			} else {
				next[tipo] = { documento_id: documentoId, nota: "" };
			}
			return next;
		});
	};

	const buildDocumentosProblema = (incluirFaltantes: boolean): RevisionDocumentoProblema[] => {
		const incorrectos: RevisionDocumentoProblema[] = Object.entries(flagged).map(([tipo, v]) => ({
			documento_id: v.documento_id,
			tipo_documento: tipo,
			problema: "incorrecto",
			nota: v.nota || null,
		}));
		const faltantes: RevisionDocumentoProblema[] =
			incluirFaltantes && detalle
				? detalle.documentos_faltantes.map((t) => ({
						documento_id: null,
						tipo_documento: t,
						problema: "faltante",
						nota: null,
					}))
				: [];
		return [...incorrectos, ...faltantes];
	};

	const handleSave = async (resultado: "correcto" | "incorrecto") => {
		if (!detalle) return;
		setSaving(true);
		setError(null);
		try {
			const documentos = resultado === "incorrecto" ? buildDocumentosProblema(true) : [];
			const result = await guardarRevision({
				client_id: cliente.id,
				client_type: cliente.client_type,
				nombre_cliente: cliente.nombre_display,
				resultado,
				notas: notas.trim() || undefined,
				documentos_problema: documentos,
			});

			if (!result.success) {
				setError(result.error);
				return;
			}
			setSaved({ resultado, notificado: result.notificado, revisionId: result.revisionId });
			if (result.notificadoError) {
				setError(`Revisión guardada, pero falló el envío del correo: ${result.notificadoError}`);
			}
			onSaved();
		} finally {
			setSaving(false);
		}
	};

	const handleRetry = async () => {
		if (!saved) return;
		setSaving(true);
		setError(null);
		try {
			const result = await reintentarNotificacion(saved.revisionId);
			if (result.success && result.notificado) {
				setSaved({ ...saved, notificado: true });
			} else if (result.success) {
				setError(`No se pudo enviar el correo: ${result.notificadoError ?? "intente nuevamente"}`);
			} else {
				setError(result.error);
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card className="overflow-hidden">
			<button onClick={handleToggle} className="w-full text-left">
				<CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
								<TypeIcon className="h-5 w-5 text-gray-600" />
							</div>
							<div>
								<CardTitle className="text-base">{cliente.nombre_display}</CardTitle>
								<p className="text-xs text-gray-500 mt-0.5">
									{typeInfo.label} &middot; Creado:{" "}
									{new Date(cliente.created_at).toLocaleDateString("es-BO")}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{saved && (
								<span
									className={`text-xs font-medium px-2 py-1 rounded-full ${
										saved.resultado === "correcto"
											? "bg-green-100 text-green-700"
											: "bg-red-100 text-red-700"
									}`}
								>
									{saved.resultado === "correcto" ? "Revisado ✓" : "Incorrecto"}
								</span>
							)}
							{!saved && ultimaRevision && (
								<span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">
									Revisado {formatRelative(ultimaRevision.fecha_revision)}
								</span>
							)}
							{detalle && !saved && (
								<span
									className={`text-xs font-medium px-2 py-1 rounded-full ${
										allUploaded ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
									}`}
								>
									{allUploaded
										? "Completo"
										: `${detalle.documentos_faltantes.length} faltante${
												detalle.documentos_faltantes.length > 1 ? "s" : ""
											}`}
								</span>
							)}
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
							) : expanded ? (
								<ChevronUp className="h-4 w-4 text-gray-400" />
							) : (
								<ChevronDown className="h-4 w-4 text-gray-400" />
							)}
						</div>
					</div>
				</CardHeader>
			</button>

			{expanded && detalle && (
				<CardContent className="border-t pt-4">
					{/* Summary bar */}
					<div className="flex items-center gap-4 mb-4 text-sm">
						<span className="flex items-center gap-1 text-green-700">
							<CheckCircle2 className="h-4 w-4" />
							{detalle.documentos_subidos.length} cargado
							{detalle.documentos_subidos.length !== 1 ? "s" : ""}
						</span>
						<span className="flex items-center gap-1 text-red-700">
							<XCircle className="h-4 w-4" />
							{detalle.documentos_faltantes.length} faltante
							{detalle.documentos_faltantes.length !== 1 ? "s" : ""}
						</span>
						<span className="text-gray-500">de {detalle.documentos_requeridos.length} requeridos</span>
					</div>

					{/* Document chips */}
					<div className="flex flex-wrap gap-2">
						{detalle.documentos_requeridos.map((tipo) => {
							const uploaded = detalle.documentos_subidos.includes(tipo);
							const documento = detalle.documentos.find((d) => d.tipo_documento === tipo);
							return (
								<DocumentChip
									key={tipo}
									tipo={tipo}
									uploaded={uploaded}
									documento={documento}
									flagged={!!flagged[tipo]}
									onToggleFlag={
										uploaded ? () => toggleFlag(tipo, documento?.id ?? null) : undefined
									}
									locked={locked}
								/>
							);
						})}
					</div>

					{/* Extra uploaded documents not in required list */}
					{detalle.documentos.filter((d) => !detalle.documentos_requeridos.includes(d.tipo_documento))
						.length > 0 && (
						<div className="mt-3 pt-3 border-t">
							<p className="text-xs text-gray-500 mb-2">Documentos adicionales:</p>
							<div className="flex flex-wrap gap-2">
								{detalle.documentos
									.filter((d) => !detalle.documentos_requeridos.includes(d.tipo_documento))
									.map((d) => (
										<DocumentChip
											key={d.id}
											tipo={d.tipo_documento}
											uploaded={true}
											documento={d}
											flagged={!!flagged[d.tipo_documento]}
											onToggleFlag={() => toggleFlag(d.tipo_documento, d.id)}
											locked={locked}
										/>
									))}
							</div>
						</div>
					)}

					{/* Notas por documento marcado */}
					{!locked && hayFlagged && (
						<div className="mt-4 pt-3 border-t space-y-2">
							<p className="text-xs font-medium text-amber-700 flex items-center gap-1">
								<Flag className="h-3.5 w-3.5" />
								Documentos marcados como incorrectos
							</p>
							{Object.keys(flagged).map((tipo) => (
								<div key={tipo} className="flex items-center gap-2">
									<span className="text-xs text-gray-600 w-48 shrink-0 truncate">
										{getDocLabel(tipo as TipoDocumentoCliente)}
									</span>
									<input
										type="text"
										value={flagged[tipo].nota}
										onChange={(e) =>
											setFlagged((prev) => ({
												...prev,
												[tipo]: { ...prev[tipo], nota: e.target.value },
											}))
										}
										placeholder="Motivo / observación (opcional)"
										className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
									/>
								</div>
							))}
						</div>
					)}

					{/* Notas generales */}
					{!locked && (
						<div className="mt-4">
							<label className="text-xs font-medium text-gray-600 mb-1 block">
								Notas del auditor
							</label>
							<textarea
								value={notas}
								onChange={(e) => setNotas(e.target.value)}
								placeholder="Observaciones generales de la revisión (opcional)"
								rows={2}
								className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
							/>
						</div>
					)}

					{/* Aviso de destinatario */}
					{!locked && (hayFlagged || hayFaltantes) && !puedeNotificar && destinatario && (
						<div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
							<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
							<span>
								No se puede notificar: {destinatario.ok ? "" : destinatario.motivo} No es posible
								marcar como incorrecto sin un destinatario válido.
							</span>
						</div>
					)}

					{/* Error */}
					{error && (
						<div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-800">
							<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					{/* Acciones */}
					<div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-end gap-2">
						{locked ? (
							<div className="flex items-center gap-2 text-sm">
								{saved!.resultado === "incorrecto" &&
									(saved!.notificado ? (
										<span className="flex items-center gap-1 text-green-700">
											<Check className="h-4 w-4" /> Creador notificado
											{destinatario?.ok ? ` (${destinatario.email})` : ""}
										</span>
									) : (
										<Button size="sm" variant="destructive" onClick={handleRetry} disabled={saving}>
											{saving ? (
												<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
											) : (
												<Send className="h-4 w-4 mr-1.5" />
											)}
											Reintentar notificación
										</Button>
									))}
								{saved!.resultado === "correcto" && (
									<span className="flex items-center gap-1 text-green-700">
										<Check className="h-4 w-4" /> Revisión registrada
									</span>
								)}
							</div>
						) : hayFlagged ? (
							<Button
								size="sm"
								variant="destructive"
								onClick={() => handleSave("incorrecto")}
								disabled={saving || !puedeNotificar}
							>
								{saving ? (
									<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
								) : (
									<Send className="h-4 w-4 mr-1.5" />
								)}
								Notificar y guardar (incorrecto)
							</Button>
						) : (
							<>
								{hayFaltantes && (
									<Button
										size="sm"
										variant="destructive"
										onClick={() => handleSave("incorrecto")}
										disabled={saving || !puedeNotificar}
									>
										{saving ? (
											<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
										) : (
											<Send className="h-4 w-4 mr-1.5" />
										)}
										Reportar faltantes y notificar
									</Button>
								)}
								<Button
									size="sm"
									onClick={() => handleSave("correcto")}
									disabled={saving}
								>
									{saving ? (
										<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
									) : (
										<CheckCircle2 className="h-4 w-4 mr-1.5" />
									)}
									Marcar como revisado
								</Button>
							</>
						)}
					</div>
				</CardContent>
			)}
		</Card>
	);
}

export function SamplingPanel() {
	const [muestra, setMuestra] = useState<ClienteSampling[]>([]);
	const [ultimas, setUltimas] = useState<Record<string, UltimaRevisionCliente>>({});
	const [revisadosHoy, setRevisadosHoy] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);

	const refrescarHoy = useCallback(async () => {
		const resumen = await obtenerResumenRevisiones();
		setRevisadosHoy(resumen.hoy);
	}, []);

	const generarMuestra = async () => {
		setLoading(true);
		try {
			const data = await obtenerMuestraAleatoria();
			setMuestra(data);
			setHasLoaded(true);
			const [revs, resumen] = await Promise.all([
				obtenerUltimasRevisiones(data.map((c) => c.id)),
				obtenerResumenRevisiones(),
			]);
			setUltimas(Object.fromEntries(revs.map((r) => [r.client_id, r])));
			setRevisadosHoy(resumen.hoy);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-gray-600">
						Seleccione 3 clientes al azar para verificar que sus documentos fueron cargados
						correctamente.
					</p>
					{revisadosHoy !== null && (
						<p className="text-xs text-gray-500 mt-1">
							Revisados hoy: <span className="font-semibold text-gray-700">{revisadosHoy}</span>
						</p>
					)}
				</div>
				<Button onClick={generarMuestra} disabled={loading}>
					{loading ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4 mr-2" />
					)}
					{hasLoaded ? "Nueva muestra" : "Generar muestra"}
				</Button>
			</div>

			{!hasLoaded && (
				<div className="text-center py-12 text-gray-400">
					<FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
					<p className="text-sm">
						Presione &quot;Generar muestra&quot; para seleccionar 3 clientes al azar
					</p>
				</div>
			)}

			{hasLoaded && muestra.length === 0 && (
				<div className="text-center py-12 text-gray-400">
					<p className="text-sm">No se encontraron clientes activos</p>
				</div>
			)}

			{muestra.length > 0 && (
				<div className="space-y-3">
					{muestra.map((cliente) => (
						<ClientSamplingCard
							key={cliente.id}
							cliente={cliente}
							ultimaRevision={ultimas[cliente.id]}
							onSaved={refrescarHoy}
						/>
					))}
				</div>
			)}
		</div>
	);
}
