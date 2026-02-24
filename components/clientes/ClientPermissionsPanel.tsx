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
import {
	getClientPermissions,
	revokeEditPermission,
} from "@/app/clientes/permisos/actions";
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

	// Load permissions on mount
	useEffect(() => {
		loadPermissions();
	}, [loadPermissions]);

	const handleRevoke = async (permissionId: string) => {
		setRevokingId(permissionId);

		const result = await revokeEditPermission(permissionId);

		if (result.success) {
			// Reload permissions
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
				<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header with grant button */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Shield className="h-5 w-5 text-primary" />
					<h3 className="font-semibold">Permisos de Edición</h3>
					<Badge variant="secondary">{permissions.length}</Badge>
				</div>
				<Button onClick={() => setShowGrantModal(true)} size="sm">
					<UserPlus className="h-4 w-4 mr-2" />
					Otorgar Permiso
				</Button>
			</div>

			{/* Permissions list */}
			{permissions.length === 0 ? (
				<div className="text-center py-12 border-2 border-dashed rounded-lg">
					<Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<p className="text-gray-600 mb-2">
						No hay permisos de edición otorgados
					</p>
					<p className="text-sm text-gray-500">
						Solo los administradores y líderes de equipo pueden editar este cliente
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{permissions.map((permission) => (
						<div
							key={permission.id}
							className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-start justify-between gap-4">
								{/* User info */}
								<div className="flex items-start gap-3 flex-1">
									<div className="p-2 bg-blue-100 rounded-full">
										<User className="h-5 w-5 text-blue-600" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<p className="font-medium">{permission.user_name}</p>
											{!permission.is_active && (
												<Badge variant="destructive" className="text-xs">
													Expirado
												</Badge>
											)}
										</div>
										<p className="text-sm text-gray-500">
											{permission.user_email}
										</p>
										<div className="mt-2 text-xs text-gray-500 space-y-1">
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
												<p className="italic text-gray-400">
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
											className="text-red-600 hover:text-red-700 hover:bg-red-50"
											disabled={revokingId === permission.id}
										>
											{revokingId === permission.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Trash2 className="h-4 w-4" />
											)}
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Revocar Permiso</AlertDialogTitle>
											<AlertDialogDescription>
												¿Está seguro de revocar el permiso de edición de{" "}
												<strong>{permission.user_name}</strong> para este
												cliente?
												<br />
												<br />
												El usuario ya no podrá editar los datos del cliente.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancelar</AlertDialogCancel>
											<AlertDialogAction
												onClick={() => handleRevoke(permission.id)}
												className="bg-red-600 hover:bg-red-700"
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

			{/* Info box */}
			<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<p className="text-sm text-blue-700">
					<strong>Nota:</strong> Los administradores y líderes de equipo
					siempre pueden editar los clientes de su equipo. Los permisos aquí
					listados aplican para usuarios con rol comercial o agente.
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
