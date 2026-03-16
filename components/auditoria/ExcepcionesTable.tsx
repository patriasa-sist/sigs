"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	type ExcepcionDocumentoVista,
	ALL_DOCUMENT_TYPES,
	type TipoDocumentoCliente,
} from "@/types/clienteDocumento";
import { revocarExcepcion } from "@/app/auditoria/excepciones/actions";
import { toast } from "sonner";

type Props = {
	excepciones: ExcepcionDocumentoVista[];
	isRefreshing: boolean;
	onRevoke: () => Promise<void>;
};

const estadoBadge: Record<string, { bg: string; text: string; label: string }> = {
	activa: { bg: "bg-blue-100", text: "text-blue-700", label: "Activa" },
	usada: { bg: "bg-green-100", text: "text-green-700", label: "Usada" },
	revocada: { bg: "bg-gray-100", text: "text-gray-700", label: "Revocada" },
};

export function ExcepcionesTable({ excepciones, isRefreshing, onRevoke }: Props) {
	const [revokingId, setRevokingId] = useState<string | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);

	const handleRevoke = async (id: string) => {
		setRevokingId(id);
		try {
			const result = await revocarExcepcion(id);
			if (result.success) {
				toast.success("Excepción revocada exitosamente");
				setConfirmId(null);
				await onRevoke();
			} else {
				toast.error(result.error || "Error al revocar");
			}
		} finally {
			setRevokingId(null);
		}
	};

	const getDocLabel = (tipo: string) => {
		return ALL_DOCUMENT_TYPES[tipo as TipoDocumentoCliente] || tipo;
	};

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (excepciones.length === 0) {
		return (
			<div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
				<AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
				<p className="text-gray-500">No hay excepciones registradas</p>
				<p className="text-xs text-gray-400 mt-1">
					Use el botón &quot;Otorgar Excepción&quot; para crear una
				</p>
			</div>
		);
	}

	return (
		<div className={`border border-gray-200 rounded-lg overflow-hidden ${isRefreshing ? "opacity-60" : ""}`}>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-gray-50 border-b border-gray-200">
							<th className="text-left px-4 py-3 font-medium text-gray-700">Usuario</th>
							<th className="text-left px-4 py-3 font-medium text-gray-700">Documento</th>
							<th className="text-left px-4 py-3 font-medium text-gray-700">Motivo</th>
							<th className="text-left px-4 py-3 font-medium text-gray-700">Estado</th>
							<th className="text-left px-4 py-3 font-medium text-gray-700">Otorgado por</th>
							<th className="text-left px-4 py-3 font-medium text-gray-700">Fecha</th>
							<th className="text-left px-4 py-3 font-medium text-gray-700">Acciones</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{excepciones.map((exc) => {
							const badge = estadoBadge[exc.estado];
							return (
								<tr key={exc.id} className="hover:bg-gray-50">
									<td className="px-4 py-3">
										<div>
											<p className="font-medium text-gray-900">{exc.user_email}</p>
											<p className="text-xs text-gray-500">{exc.user_role}</p>
										</div>
									</td>
									<td className="px-4 py-3 text-gray-900">
										{getDocLabel(exc.tipo_documento)}
									</td>
									<td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={exc.motivo}>
										{exc.motivo}
									</td>
									<td className="px-4 py-3">
										<span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
											{badge.label}
										</span>
									</td>
									<td className="px-4 py-3 text-gray-600">
										{exc.otorgado_por_email}
									</td>
									<td className="px-4 py-3 text-gray-600 text-xs">
										{formatDate(exc.fecha_otorgamiento)}
										{exc.estado === "usada" && exc.fecha_uso && (
											<div className="text-green-600 mt-1">
												Usado: {formatDate(exc.fecha_uso)}
											</div>
										)}
										{exc.estado === "revocada" && exc.fecha_revocacion && (
											<div className="text-gray-500 mt-1">
												Revocado: {formatDate(exc.fecha_revocacion)}
											</div>
										)}
									</td>
									<td className="px-4 py-3">
										{exc.estado === "activa" && (
											<>
												{confirmId === exc.id ? (
													<div className="flex items-center gap-1">
														<Button
															variant="destructive"
															size="sm"
															onClick={() => handleRevoke(exc.id)}
															disabled={revokingId === exc.id}
														>
															{revokingId === exc.id ? "..." : "Confirmar"}
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setConfirmId(null)}
														>
															<X className="h-3 w-3" />
														</Button>
													</div>
												) : (
													<Button
														variant="outline"
														size="sm"
														onClick={() => setConfirmId(exc.id)}
													>
														Revocar
													</Button>
												)}
											</>
										)}
										{exc.estado === "usada" && exc.usado_en_client_id && (
											<span className="text-xs text-green-600">
												Cliente registrado
											</span>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
