"use client";

import { useState, useCallback } from "react";
import { RefreshCw, User, Building2, Briefcase, FileText, ExternalLink, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_DOCUMENT_TYPES, type TipoDocumentoCliente, type ClienteDocumento } from "@/types/clienteDocumento";
import {
	obtenerMuestraAleatoria,
	obtenerDetalleSampling,
	type ClienteSampling,
	type ClienteSamplingDetalle,
} from "@/app/auditoria/sampling/actions";
import { createClient } from "@/utils/supabase/client";

const CLIENT_TYPE_LABELS: Record<string, { label: string; icon: typeof User }> = {
	natural: { label: "Persona Natural", icon: User },
	juridica: { label: "Persona Jurídica", icon: Building2 },
	unipersonal: { label: "Empresa Unipersonal", icon: Briefcase },
};

function getDocLabel(tipo: TipoDocumentoCliente): string {
	return ALL_DOCUMENT_TYPES[tipo] || tipo;
}

function DocumentChip({
	tipo,
	uploaded,
	documento,
}: {
	tipo: TipoDocumentoCliente;
	uploaded: boolean;
	documento?: ClienteDocumento;
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

	return (
		<button
			onClick={handleClick}
			disabled={!uploaded || opening}
			className={`
				inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
				${
					uploaded
						? "bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 cursor-pointer"
						: "bg-red-100 text-red-800 border border-red-300 cursor-default"
				}
			`}
			title={
				uploaded
					? `${getDocLabel(tipo)} - Click para ver documento`
					: `${getDocLabel(tipo)} - No cargado`
			}
		>
			{opening ? (
				<Loader2 className="h-3 w-3 animate-spin" />
			) : uploaded ? (
				<CheckCircle2 className="h-3 w-3" />
			) : (
				<XCircle className="h-3 w-3" />
			)}
			<span>{getDocLabel(tipo)}</span>
			{uploaded && <ExternalLink className="h-3 w-3" />}
		</button>
	);
}

function ClientSamplingCard({ cliente }: { cliente: ClienteSampling }) {
	const [expanded, setExpanded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [detalle, setDetalle] = useState<ClienteSamplingDetalle | null>(null);

	const typeInfo = CLIENT_TYPE_LABELS[cliente.client_type] || CLIENT_TYPE_LABELS.natural;
	const TypeIcon = typeInfo.icon;

	const handleToggle = useCallback(async () => {
		if (expanded) {
			setExpanded(false);
			return;
		}

		// Fetch details on first expand
		if (!detalle) {
			setLoading(true);
			try {
				const data = await obtenerDetalleSampling(cliente.id);
				setDetalle(data);
			} finally {
				setLoading(false);
			}
		}
		setExpanded(true);
	}, [expanded, detalle, cliente.id]);

	const allUploaded = detalle ? detalle.documentos_faltantes.length === 0 : false;

	return (
		<Card className="overflow-hidden">
			<button
				onClick={handleToggle}
				className="w-full text-left"
			>
				<CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
								<TypeIcon className="h-5 w-5 text-gray-600" />
							</div>
							<div>
								<CardTitle className="text-base">{cliente.nombre_display}</CardTitle>
								<p className="text-xs text-gray-500 mt-0.5">
									{typeInfo.label} &middot; Creado: {new Date(cliente.created_at).toLocaleDateString("es-BO")}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{detalle && (
								<span
									className={`text-xs font-medium px-2 py-1 rounded-full ${
										allUploaded
											? "bg-green-100 text-green-700"
											: "bg-red-100 text-red-700"
									}`}
								>
									{allUploaded
										? "Completo"
										: `${detalle.documentos_faltantes.length} faltante${detalle.documentos_faltantes.length > 1 ? "s" : ""}`}
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
							{detalle.documentos_subidos.length} cargado{detalle.documentos_subidos.length !== 1 ? "s" : ""}
						</span>
						<span className="flex items-center gap-1 text-red-700">
							<XCircle className="h-4 w-4" />
							{detalle.documentos_faltantes.length} faltante{detalle.documentos_faltantes.length !== 1 ? "s" : ""}
						</span>
						<span className="text-gray-500">
							de {detalle.documentos_requeridos.length} requeridos
						</span>
					</div>

					{/* Document chips */}
					<div className="flex flex-wrap gap-2">
						{detalle.documentos_requeridos.map((tipo) => {
							const uploaded = detalle.documentos_subidos.includes(tipo);
							const documento = detalle.documentos.find(
								(d) => d.tipo_documento === tipo
							);
							return (
								<DocumentChip
									key={tipo}
									tipo={tipo}
									uploaded={uploaded}
									documento={documento}
								/>
							);
						})}
					</div>

					{/* Extra uploaded documents not in required list */}
					{detalle.documentos.filter(
						(d) => !detalle.documentos_requeridos.includes(d.tipo_documento)
					).length > 0 && (
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
										/>
									))}
							</div>
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
}

export function SamplingPanel() {
	const [muestra, setMuestra] = useState<ClienteSampling[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);

	const generarMuestra = async () => {
		setLoading(true);
		try {
			const data = await obtenerMuestraAleatoria();
			setMuestra(data);
			setHasLoaded(true);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-gray-600">
						Seleccione 3 clientes al azar para verificar que sus documentos fueron cargados correctamente.
					</p>
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
						<ClientSamplingCard key={cliente.id} cliente={cliente} />
					))}
				</div>
			)}
		</div>
	);
}
