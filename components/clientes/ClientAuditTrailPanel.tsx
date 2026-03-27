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

// § DS 2.2 — event labels use the muted status palette; icons use a single muted style
const EVENT_CONFIG: Record<
	AuditEventType,
	{
		icon: typeof User;
		badgeClass: string;
		label: string;
	}
> = {
	client_created: {
		icon: UserPlus,
		badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
		label: "Creado",
	},
	client_modified: {
		icon: PenLine,
		badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
		label: "Modificado",
	},
	field_changed: {
		icon: PenLine,
		badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
		label: "Campo editado",
	},
	permission_granted: {
		icon: Shield,
		badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
		label: "Permiso otorgado",
	},
	permission_revoked: {
		icon: UserMinus,
		badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
		label: "Permiso revocado",
	},
	permission_expired: {
		icon: Clock,
		badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
		label: "Permiso expirado",
	},
	document_uploaded: {
		icon: FileText,
		badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
		label: "Documento subido",
	},
	document_replaced: {
		icon: RefreshCw,
		badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
		label: "Documento reemplazado",
	},
	document_discarded: {
		icon: Trash2,
		badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
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
			<div className="flex items-center justify-center py-12 gap-2">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				<span className="text-sm text-muted-foreground">Cargando trazabilidad…</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-destructive/5 border border-destructive/20 rounded-md space-y-2">
				<div className="flex items-center gap-2 text-destructive text-sm">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<p>{error}</p>
				</div>
				<Button variant="outline" size="sm" onClick={loadAuditTrail}>
					Reintentar
				</Button>
			</div>
		);
	}

	if (!auditTrail) {
		return (
			<div className="text-center py-12 text-sm text-muted-foreground">
				No hay datos de trazabilidad disponibles
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{/* Summary Cards */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
				<SummaryCard
					icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
					title="Creado"
					value={formatDate(auditTrail.summary.created_at)}
					subtitle={auditTrail.summary.created_by_name || "Usuario desconocido"}
				/>
				<SummaryCard
					icon={<PenLine className="h-4 w-4 text-muted-foreground" />}
					title="Última modificación"
					value={
						auditTrail.summary.last_modified_at
							? formatDate(auditTrail.summary.last_modified_at)
							: "Sin modificaciones"
					}
					subtitle={auditTrail.summary.last_modified_by_name || "—"}
				/>
				<SummaryCard
					icon={<PenLine className="h-4 w-4 text-muted-foreground" />}
					title="Campos editados"
					value={auditTrail.summary.total_field_changes.toString()}
					subtitle="Total histórico"
				/>
				<SummaryCard
					icon={<Shield className="h-4 w-4 text-muted-foreground" />}
					title="Permisos otorgados"
					value={auditTrail.summary.total_permissions_granted.toString()}
					subtitle="Total histórico"
				/>
				<SummaryCard
					icon={<FileText className="h-4 w-4 text-muted-foreground" />}
					title="Documentos subidos"
					value={auditTrail.summary.total_documents_uploaded.toString()}
					subtitle="Total histórico"
				/>
			</div>

			{/* Timeline */}
			<div className="border border-border rounded-lg">
				<div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
					<h4 className="text-sm font-semibold text-foreground">Historial de Eventos</h4>
					<span className="text-xs text-muted-foreground tabular-nums">
						{auditTrail.events.length} eventos
					</span>
				</div>

				<div className="p-4">
					{auditTrail.events.length === 0 ? (
						<div className="text-center py-8">
							<Clock className="h-10 w-10 text-muted-foreground/25 mx-auto mb-3" />
							<p className="text-sm text-muted-foreground">No hay eventos registrados</p>
						</div>
					) : (
						<div className="relative">
							{/* Timeline line */}
							<div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

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
		<div className="p-4 border border-border rounded-lg">
			<div className="flex items-center gap-1.5 mb-2">
				{icon}
				<span className="text-xs text-muted-foreground">{title}</span>
			</div>
			<p className="text-sm font-semibold text-foreground">{value}</p>
			<p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
		</div>
	);
}

function TimelineEvent({ event, isFirst }: { event: AuditEvent; isFirst: boolean }) {
	const config = EVENT_CONFIG[event.type];
	const IconComponent = config.icon;

	return (
		<div className="relative flex gap-4 pl-2">
			{/* Icon — uniform muted style, ring on first */}
			<div
				className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground shrink-0${
					isFirst ? " ring-2 ring-primary ring-offset-2" : ""
				}`}
			>
				<IconComponent className="h-3.5 w-3.5" />
			</div>

			{/* Content */}
			<div className="flex-1 pb-4 min-w-0">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						{/* Event type label — DS muted status palette */}
						<span
							className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border mb-1 ${config.badgeClass}`}
						>
							{config.label}
						</span>
						<p className="text-sm font-medium text-foreground">{event.description}</p>
						{event.user_name && (
							<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
								<User className="h-3 w-3 shrink-0" />
								{event.user_name}
								{event.user_email && (
									<span className="text-muted-foreground/60">({event.user_email})</span>
								)}
							</p>
						)}
					</div>
					<div className="text-right shrink-0">
						<p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
							<Calendar className="h-3 w-3" />
							{formatDate(event.timestamp)}
						</p>
						<p className="text-xs text-muted-foreground/70 mt-0.5 tabular-nums">
							{formatTime(event.timestamp)}
						</p>
					</div>
				</div>

				{/* Details */}
				{event.details && Object.keys(event.details).length > 0 && (
					<div className="mt-2 p-2.5 bg-muted/50 rounded-md text-xs text-muted-foreground space-y-1">
						{event.details.target_user ? (
							<p>
								<span className="font-medium text-foreground">Usuario afectado:</span>{" "}
								{String(event.details.target_user)}
							</p>
						) : null}
						{event.details.expires_at ? (
							<p>
								<span className="font-medium text-foreground">Expira:</span>{" "}
								{formatDate(String(event.details.expires_at))}
							</p>
						) : null}
						{event.details.tipo_documento ? (
							<p>
								<span className="font-medium text-foreground">Tipo:</span>{" "}
								{String(event.details.tipo_documento)}
							</p>
						) : null}
						{event.details.version && Number(event.details.version) > 1 ? (
							<p>
								<span className="font-medium text-foreground">Versión:</span>{" "}
								{String(event.details.version)}
							</p>
						) : null}
						{event.details.notes ? (
							<p>
								<span className="font-medium text-foreground">Notas:</span>{" "}
								{String(event.details.notes)}
							</p>
						) : null}
						{/* Field change diff */}
						{event.type === "field_changed" && (
							<div className="mt-1.5 space-y-1">
								{event.details.valor_anterior !== undefined && (
									<p className="flex items-center gap-1.5">
										<span className="font-medium text-rose-700">Antes:</span>
										<span className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded">
											{String(event.details.valor_anterior) || "(vacío)"}
										</span>
									</p>
								)}
								{event.details.valor_nuevo !== undefined && (
									<p className="flex items-center gap-1.5">
										<span className="font-medium text-teal-700">Después:</span>
										<span className="bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded">
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
