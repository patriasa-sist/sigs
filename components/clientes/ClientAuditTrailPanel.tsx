"use client";

import { useState, useEffect, useCallback } from "react";
import {
	User,
	UserPlus,
	UserMinus,
	FileText,
	RefreshCw,
	Trash2,
	Clock,
	Loader2,
	Calendar,
	Shield,
	PenLine,
	AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	getClientAuditTrail,
	type ClientAuditTrail,
	type AuditEvent,
	type AuditEventType,
} from "@/app/clientes/trazabilidad/actions";

type Props = {
	clientId: string;
};

// Event type configuration
const EVENT_CONFIG: Record<
	AuditEventType,
	{
		icon: typeof User;
		color: string;
		bgColor: string;
		label: string;
	}
> = {
	client_created: {
		icon: UserPlus,
		color: "text-green-600",
		bgColor: "bg-green-100",
		label: "Creado",
	},
	client_modified: {
		icon: PenLine,
		color: "text-blue-600",
		bgColor: "bg-blue-100",
		label: "Modificado",
	},
	field_changed: {
		icon: PenLine,
		color: "text-orange-600",
		bgColor: "bg-orange-100",
		label: "Campo editado",
	},
	permission_granted: {
		icon: Shield,
		color: "text-purple-600",
		bgColor: "bg-purple-100",
		label: "Permiso otorgado",
	},
	permission_revoked: {
		icon: UserMinus,
		color: "text-red-600",
		bgColor: "bg-red-100",
		label: "Permiso revocado",
	},
	permission_expired: {
		icon: Clock,
		color: "text-amber-600",
		bgColor: "bg-amber-100",
		label: "Permiso expirado",
	},
	document_uploaded: {
		icon: FileText,
		color: "text-cyan-600",
		bgColor: "bg-cyan-100",
		label: "Documento subido",
	},
	document_replaced: {
		icon: RefreshCw,
		color: "text-indigo-600",
		bgColor: "bg-indigo-100",
		label: "Documento reemplazado",
	},
	document_discarded: {
		icon: Trash2,
		color: "text-gray-600",
		bgColor: "bg-gray-100",
		label: "Documento descartado",
	},
};

export function ClientAuditTrailPanel({ clientId }: Props) {
	const [auditTrail, setAuditTrail] = useState<ClientAuditTrail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadAuditTrail = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const result = await getClientAuditTrail(clientId);
		if (result.success) {
			setAuditTrail(result.data);
		} else {
			setError(result.error);
		}

		setIsLoading(false);
	}, [clientId]);

	useEffect(() => {
		loadAuditTrail();
	}, [loadAuditTrail]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<span className="ml-2 text-gray-600">Cargando trazabilidad...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
				<div className="flex items-center gap-2 text-red-600">
					<AlertCircle className="h-5 w-5" />
					<p>{error}</p>
				</div>
				<Button variant="outline" onClick={loadAuditTrail} className="mt-2">
					Reintentar
				</Button>
			</div>
		);
	}

	if (!auditTrail) {
		return (
			<div className="text-center py-12 text-gray-500">
				<p>No hay datos de trazabilidad disponibles</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<SummaryCard
					icon={<UserPlus className="h-5 w-5 text-green-600" />}
					title="Creado"
					value={formatDate(auditTrail.summary.created_at)}
					subtitle={auditTrail.summary.created_by_name || "Usuario desconocido"}
				/>
				<SummaryCard
					icon={<PenLine className="h-5 w-5 text-blue-600" />}
					title="Última modificación"
					value={
						auditTrail.summary.last_modified_at
							? formatDate(auditTrail.summary.last_modified_at)
							: "Sin modificaciones"
					}
					subtitle={auditTrail.summary.last_modified_by_name || "-"}
				/>
				<SummaryCard
					icon={<PenLine className="h-5 w-5 text-orange-600" />}
					title="Campos editados"
					value={auditTrail.summary.total_field_changes.toString()}
					subtitle="Total histórico"
				/>
				<SummaryCard
					icon={<Shield className="h-5 w-5 text-purple-600" />}
					title="Permisos otorgados"
					value={auditTrail.summary.total_permissions_granted.toString()}
					subtitle="Total histórico"
				/>
				<SummaryCard
					icon={<FileText className="h-5 w-5 text-cyan-600" />}
					title="Documentos subidos"
					value={auditTrail.summary.total_documents_uploaded.toString()}
					subtitle="Total histórico"
				/>
			</div>

			{/* Timeline */}
			<div className="border border-gray-200 rounded-lg">
				<div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
					<h4 className="font-semibold text-gray-900">Historial de Eventos</h4>
					<Badge variant="outline">{auditTrail.events.length} eventos</Badge>
				</div>

				<div className="p-4">
					{auditTrail.events.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p>No hay eventos registrados</p>
						</div>
					) : (
						<div className="relative">
							{/* Timeline line */}
							<div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

							{/* Events */}
							<div className="space-y-4">
								{auditTrail.events.map((event, index) => (
									<TimelineEvent key={event.id} event={event} isFirst={index === 0} />
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Helper Components

function SummaryCard({
	icon,
	title,
	value,
	subtitle,
}: {
	icon: React.ReactNode;
	title: string;
	value: string;
	subtitle: string;
}) {
	return (
		<div className="p-4 border border-gray-200 rounded-lg">
			<div className="flex items-center gap-2 mb-2">
				{icon}
				<span className="text-sm text-gray-600">{title}</span>
			</div>
			<p className="font-semibold text-gray-900">{value}</p>
			<p className="text-xs text-gray-500 mt-1">{subtitle}</p>
		</div>
	);
}

function TimelineEvent({ event, isFirst }: { event: AuditEvent; isFirst: boolean }) {
	const config = EVENT_CONFIG[event.type];
	const IconComponent = config.icon;

	return (
		<div className="relative flex gap-4 pl-2">
			{/* Icon */}
			<div
				className={`
					relative z-10 flex items-center justify-center
					w-8 h-8 rounded-full ${config.bgColor} ${config.color}
					${isFirst ? "ring-2 ring-primary ring-offset-2" : ""}
				`}
			>
				<IconComponent className="h-4 w-4" />
			</div>

			{/* Content */}
			<div className="flex-1 pb-4">
				<div className="flex items-start justify-between gap-2">
					<div>
						<Badge variant="outline" className={`${config.color} border-current mb-1`}>
							{config.label}
						</Badge>
						<p className="font-medium text-gray-900">{event.description}</p>
						{event.user_name && (
							<p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
								<User className="h-3 w-3" />
								{event.user_name}
								{event.user_email && (
									<span className="text-gray-400">({event.user_email})</span>
								)}
							</p>
						)}
					</div>
					<div className="text-right flex-shrink-0">
						<p className="text-xs text-gray-500 flex items-center gap-1">
							<Calendar className="h-3 w-3" />
							{formatDate(event.timestamp)}
						</p>
						<p className="text-xs text-gray-400 mt-0.5">{formatTime(event.timestamp)}</p>
					</div>
				</div>

				{/* Details */}
				{event.details && Object.keys(event.details).length > 0 && (
					<div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
						{event.details.target_user ? (
							<p>
								<span className="font-medium">Usuario afectado:</span> {String(event.details.target_user)}
							</p>
						) : null}
						{event.details.expires_at ? (
							<p>
								<span className="font-medium">Expira:</span>{" "}
								{formatDate(String(event.details.expires_at))}
							</p>
						) : null}
						{event.details.tipo_documento ? (
							<p>
								<span className="font-medium">Tipo:</span> {String(event.details.tipo_documento)}
							</p>
						) : null}
						{event.details.version && Number(event.details.version) > 1 ? (
							<p>
								<span className="font-medium">Versión:</span> {String(event.details.version)}
							</p>
						) : null}
						{event.details.notes ? (
							<p>
								<span className="font-medium">Notas:</span> {String(event.details.notes)}
							</p>
						) : null}
						{/* Field change details */}
						{event.type === "field_changed" && (
							<div className="mt-1 space-y-1">
								{event.details.valor_anterior !== undefined && (
									<p className="flex items-center gap-1">
										<span className="font-medium text-red-600">Antes:</span>
										<span className="bg-red-100 px-1.5 py-0.5 rounded text-red-800">
											{String(event.details.valor_anterior) || "(vacío)"}
										</span>
									</p>
								)}
								{event.details.valor_nuevo !== undefined && (
									<p className="flex items-center gap-1">
										<span className="font-medium text-green-600">Después:</span>
										<span className="bg-green-100 px-1.5 py-0.5 rounded text-green-800">
											{String(event.details.valor_nuevo) || "(vacío)"}
										</span>
									</p>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// Utility functions

function formatDate(dateString: string): string {
	try {
		const date = new Date(dateString);
		return date.toLocaleDateString("es-BO", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return dateString;
	}
}

function formatTime(dateString: string): string {
	try {
		const date = new Date(dateString);
		return date.toLocaleTimeString("es-BO", {
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
}
