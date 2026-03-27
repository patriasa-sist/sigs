"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, UserPlus, Trash2, Loader2, Clock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getClientPermissions, revokeEditPermission } from "@/app/clientes/permisos/actions";
import { GrantPermissionModal } from "./GrantPermissionModal";
import type { ClientEditPermissionViewModel } from "@/types/clientPermission";

interface Props {
	clientId: string;
	clientName: string;
}

export function ClientPermissionsPanel({ clientId, clientName }: Props) {
	const [permissions, setPermissions] = useState<ClientEditPermissionViewModel[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showGrantModal, setShowGrantModal] = useState(false);
	const [revokingId, setRevokingId] = useState<string | null>(null);

	const loadPermissions = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const result = await getClientPermissions(clientId);

		if (result.success) {
			setPermissions(result.data);
		} else {
			setError(result.error);
		}

		setIsLoading(false);
	}, [clientId]);

	useEffect(() => {
		loadPermissions();
	}, [loadPermissions]);

	const handleRevoke = async (permissionId: string) => {
		setRevokingId(permissionId);

		const result = await revokeEditPermission(permissionId);

		if (result.success) {
			await loadPermissions();
		} else {
			setError(result.error);
		}

		setRevokingId(null);
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const formatDateTime = (dateStr: string) => {
		return new Date(dateStr).toLocaleString("es-BO", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 bg-destructive/5 border border-destructive/20 rounded-md">
				<div className="flex items-center gap-2 text-destructive text-sm">
					<AlertCircle className="h-4 w-4 shrink-0" />
					<p>{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			{/* Header with grant button */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Shield className="h-4 w-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold text-foreground">Permisos de Edición</h3>
					<Badge variant="secondary" className="text-xs">
						{permissions.length}
					</Badge>
				</div>
				<Button onClick={() => setShowGrantModal(true)} size="sm" className="cursor-pointer">
					<UserPlus className="h-4 w-4" />
					Otorgar Permiso
				</Button>
			</div>

			{/* Permissions list */}
			{permissions.length === 0 ? (
				<div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
					<Shield className="h-10 w-10 text-muted-foreground/25 mx-auto mb-3" />
					<p className="text-sm font-medium text-foreground">No hay permisos de edición otorgados</p>
					<p className="text-xs text-muted-foreground mt-1">
						Solo los administradores y líderes de equipo pueden editar este cliente
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{permissions.map((permission) => (
						<div
							key={permission.id}
							className="px-4 py-3 border border-border rounded-lg hover:bg-muted/40 transition-colors duration-100"
						>
							<div className="flex items-start justify-between gap-4">
								{/* User info */}
								<div className="flex items-start gap-3 flex-1">
									<div className="p-1.5 bg-muted rounded-full shrink-0 mt-0.5">
										<User className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<p className="text-sm font-medium text-foreground">
												{permission.user_name}
											</p>
											{!permission.is_active && (
												<span className="text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded-md">
													Expirado
												</span>
											)}
										</div>
										<p className="text-xs text-muted-foreground mt-0.5">{permission.user_email}</p>
										<div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
											<p>
												Otorgado por {permission.granted_by_name} el{" "}
												{formatDateTime(permission.granted_at)}
											</p>
											{permission.expires_at && (
												<p className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													Expira: {formatDate(permission.expires_at)}
												</p>
											)}
											{permission.notes && (
												<p className="italic text-muted-foreground/70">
													&quot;{permission.notes}&quot;
												</p>
											)}
										</div>
									</div>
								</div>

								{/* Revoke button */}
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/8"
											disabled={revokingId === permission.id}
										>
											{revokingId === permission.id ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<Trash2 className="h-3.5 w-3.5" />
											)}
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Revocar Permiso</AlertDialogTitle>
											<AlertDialogDescription>
												¿Está seguro de revocar el permiso de edición de{" "}
												<strong>{permission.user_name}</strong> para este cliente?
												<br />
												<br />
												El usuario ya no podrá editar los datos del cliente.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancelar</AlertDialogCancel>
											<AlertDialogAction
												onClick={() => handleRevoke(permission.id)}
												className="bg-destructive hover:bg-destructive/90"
											>
												Revocar Permiso
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Info note */}
			<div className="p-4 bg-muted/50 border border-border rounded-md">
				<p className="text-xs text-muted-foreground leading-relaxed">
					<span className="font-medium text-foreground">Nota:</span> Los administradores y líderes de equipo
					siempre pueden editar los clientes de su equipo. Los permisos aquí listados aplican para usuarios
					con rol comercial o agente.
				</p>
			</div>

			{/* Grant permission modal */}
			{showGrantModal && (
				<GrantPermissionModal
					clientId={clientId}
					clientName={clientName}
					onClose={() => setShowGrantModal(false)}
					onSuccess={() => {
						setShowGrantModal(false);
						loadPermissions();
					}}
				/>
			)}
		</div>
	);
}
