"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Shield, UserPlus, Trash2, Calendar, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getPolicyPermissions,
	grantPolicyEditPermission,
	revokePolicyEditPermission,
	getComercialUsers,
} from "@/app/polizas/permisos/actions";
import type {
	PolicyEditPermissionViewModel,
	ComercialUser,
} from "@/types/policyPermission";

interface PolicyPermissionsModalProps {
	polizaId: string;
	numeroPoliza: string;
	isOpen: boolean;
	onClose: () => void;
}

export function PolicyPermissionsModal({
	polizaId,
	numeroPoliza,
	isOpen,
	onClose,
}: PolicyPermissionsModalProps) {
	// State
	const [permissions, setPermissions] = useState<PolicyEditPermissionViewModel[]>([]);
	const [comercialUsers, setComercialUsers] = useState<ComercialUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Form state for granting
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [expiresAt, setExpiresAt] = useState<string>("");
	const [notes, setNotes] = useState<string>("");
	const [isGranting, setIsGranting] = useState(false);
	const [grantError, setGrantError] = useState<string | null>(null);

	// Revoke state
	const [revokingId, setRevokingId] = useState<string | null>(null);

	// Load data
	const loadData = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const [permResult, usersResult] = await Promise.all([
				getPolicyPermissions(polizaId),
				getComercialUsers(),
			]);

			if (!permResult.success) {
				setError(permResult.error);
				return;
			}

			if (!usersResult.success) {
				setError(usersResult.error);
				return;
			}

			setPermissions(permResult.data);
			setComercialUsers(usersResult.data);
		} catch {
			setError("Error al cargar datos");
		} finally {
			setIsLoading(false);
		}
	}, [polizaId]);

	useEffect(() => {
		if (isOpen) {
			loadData();
		}
	}, [isOpen, loadData]);

	const handleGrant = async () => {
		if (!selectedUserId) {
			setGrantError("Selecciona un usuario");
			return;
		}

		setIsGranting(true);
		setGrantError(null);

		const result = await grantPolicyEditPermission({
			poliza_id: polizaId,
			user_id: selectedUserId,
			expires_at: expiresAt || undefined,
			notes: notes || undefined,
		});

		if (!result.success) {
			setGrantError(result.error);
			setIsGranting(false);
			return;
		}

		// Reset form and reload
		setSelectedUserId("");
		setExpiresAt("");
		setNotes("");
		setIsGranting(false);
		loadData();
	};

	const handleRevoke = async (permissionId: string) => {
		if (!confirm("¿Estás seguro de revocar este permiso?")) {
			return;
		}

		setRevokingId(permissionId);

		const result = await revokePolicyEditPermission(permissionId);

		if (!result.success) {
			alert(`Error: ${result.error}`);
		} else {
			loadData();
		}

		setRevokingId(null);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Filter out users who already have permission
	const availableUsers = comercialUsers.filter(
		(user) => !permissions.some((p) => p.user_id === user.id && p.is_active)
	);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b">
					<div className="flex items-center gap-3">
						<Shield className="h-6 w-6 text-primary" />
						<div>
							<h2 className="text-lg font-semibold text-gray-900">
								Permisos de Edición
							</h2>
							<p className="text-sm text-gray-600">Póliza {numeroPoliza}</p>
						</div>
					</div>
					<Button variant="ghost" size="icon" onClick={onClose}>
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					) : error ? (
						<div className="text-center py-8">
							<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
							<p className="text-gray-600">{error}</p>
						</div>
					) : (
						<>
							{/* Current Permissions */}
							<div className="mb-8">
								<h3 className="text-sm font-semibold text-gray-700 mb-3">
									Permisos Activos
								</h3>

								{permissions.length === 0 ? (
									<div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
										<p className="text-sm text-gray-500">
											No hay permisos activos para esta póliza
										</p>
									</div>
								) : (
									<div className="space-y-3">
										{permissions.map((perm) => (
											<div
												key={perm.id}
												className={`flex items-center justify-between p-4 rounded-lg border ${
													perm.is_active
														? "bg-green-50 border-green-200"
														: "bg-gray-50 border-gray-200"
												}`}
											>
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<p className="font-medium text-gray-900">
															{perm.user_name}
														</p>
														{!perm.is_active && (
															<span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
																Expirado
															</span>
														)}
													</div>
														<div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
														<span>
															Otorgado: {formatDate(perm.granted_at)}
														</span>
														{perm.expires_at && (
															<span className="flex items-center gap-1">
																<Calendar className="h-3 w-3" />
																Expira: {formatDate(perm.expires_at)}
															</span>
														)}
													</div>
													{perm.notes && (
														<p className="text-xs text-gray-500 mt-1 italic">
															{perm.notes}
														</p>
													)}
												</div>

												{perm.is_active && (
													<Button
														variant="ghost"
														size="sm"
														className="text-red-600 hover:text-red-700 hover:bg-red-50"
														onClick={() => handleRevoke(perm.id)}
														disabled={revokingId === perm.id}
													>
														{revokingId === perm.id ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Trash2 className="h-4 w-4" />
														)}
													</Button>
												)}
											</div>
										))}
									</div>
								)}
							</div>

							{/* Grant Permission Form */}
							<div className="border-t pt-6">
								<h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
									<UserPlus className="h-4 w-4" />
									Otorgar Nuevo Permiso
								</h3>

								{availableUsers.length === 0 ? (
									<div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed">
										<p className="text-sm text-gray-500">
											No hay usuarios comerciales disponibles
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{/* User Select */}
										<div className="space-y-2">
											<Label>Usuario</Label>
											<Select
												value={selectedUserId}
												onValueChange={setSelectedUserId}
											>
												<SelectTrigger>
													<SelectValue placeholder="Seleccionar usuario..." />
												</SelectTrigger>
												<SelectContent>
													{availableUsers.map((user) => (
														<SelectItem key={user.id} value={user.id}>
															{user.full_name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{/* Expiration Date */}
										<div className="space-y-2">
											<Label>
												Fecha de Expiración{" "}
												<span className="text-gray-400 font-normal">
													(opcional)
												</span>
											</Label>
											<Input
												type="datetime-local"
												value={expiresAt}
												onChange={(e) => setExpiresAt(e.target.value)}
											/>
											<p className="text-xs text-gray-500">
												Dejar vacío para permiso sin expiración
											</p>
										</div>

										{/* Notes */}
										<div className="space-y-2">
											<Label>
												Notas{" "}
												<span className="text-gray-400 font-normal">
													(opcional)
												</span>
											</Label>
											<Input
												placeholder="Motivo del permiso..."
												value={notes}
												onChange={(e) => setNotes(e.target.value)}
												maxLength={500}
											/>
										</div>

										{/* Error */}
										{grantError && (
											<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
												<p className="text-sm text-red-600">{grantError}</p>
											</div>
										)}

										{/* Submit */}
										<Button
											onClick={handleGrant}
											disabled={isGranting || !selectedUserId}
											className="w-full"
										>
											{isGranting ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
													Otorgando...
												</>
											) : (
												<>
													<UserPlus className="h-4 w-4 mr-2" />
													Otorgar Permiso
												</>
											)}
										</Button>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
