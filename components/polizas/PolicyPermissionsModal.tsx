"use client";

import { useState, useEffect, useCallback } from "react";
import {
	X,
	Shield,
	UserPlus,
	Trash2,
	Calendar,
	Loader2,
	AlertCircle,
	AlertTriangle,
} from "lucide-react";
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
	const [permissions, setPermissions] = useState<PolicyEditPermissionViewModel[]>([]);
	const [comercialUsers, setComercialUsers] = useState<ComercialUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Grant form
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [expiresAt, setExpiresAt] = useState<string>("");
	const [notes, setNotes] = useState<string>("");
	const [isGranting, setIsGranting] = useState(false);
	const [grantError, setGrantError] = useState<string | null>(null);

	// Revoke inline confirmation
	const [revokingId, setRevokingId] = useState<string | null>(null);
	const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const [permResult, usersResult] = await Promise.all([
				getPolicyPermissions(polizaId),
				getComercialUsers(),
			]);
			if (!permResult.success) { setError(permResult.error); return; }
			if (!usersResult.success) { setError(usersResult.error); return; }
			setPermissions(permResult.data);
			setComercialUsers(usersResult.data);
		} catch {
			setError("Error al cargar datos");
		} finally {
			setIsLoading(false);
		}
	}, [polizaId]);

	useEffect(() => {
		if (isOpen) loadData();
	}, [isOpen, loadData]);

	const handleGrant = async () => {
		if (!selectedUserId) { setGrantError("Selecciona un usuario"); return; }
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
		setSelectedUserId("");
		setExpiresAt("");
		setNotes("");
		setIsGranting(false);
		loadData();
	};

	const handleRevoke = async (permissionId: string) => {
		setRevokingId(permissionId);
		setConfirmRevokeId(null);
		const result = await revokePolicyEditPermission(permissionId);
		if (!result.success) {
			setError(`Error al revocar: ${result.error}`);
		} else {
			loadData();
		}
		setRevokingId(null);
	};

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

	const availableUsers = comercialUsers.filter(
		(user) => !permissions.some((p) => p.user_id === user.id && p.is_active)
	);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

			{/* Panel */}
			<div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
				{/* Top accent bar */}
				<div className="h-1 w-full bg-primary shrink-0" />

				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
					<div className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
							<Shield className="h-4.5 w-4.5 text-primary" />
						</span>
						<div>
							<h2 className="text-sm font-semibold text-foreground leading-tight">
								Permisos de edición
							</h2>
							<p className="text-xs text-muted-foreground font-mono mt-0.5">
								Póliza {numeroPoliza}
							</p>
						</div>
					</div>
					<Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-16 gap-3">
							<Loader2 className="h-7 w-7 animate-spin text-primary/60" />
							<p className="text-xs text-muted-foreground">Cargando permisos…</p>
						</div>
					) : error ? (
						<div className="flex flex-col items-center justify-center py-12 gap-3">
							<AlertCircle className="h-10 w-10 text-destructive/70" />
							<p className="text-sm text-muted-foreground">{error}</p>
						</div>
					) : (
						<>
							{/* Active Permissions */}
							<section>
								<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
									Permisos activos
								</h3>

								{permissions.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed border-border bg-muted/30 gap-2">
										<Shield className="h-8 w-8 text-muted-foreground/40" />
										<p className="text-sm text-muted-foreground">
											No hay permisos activos para esta póliza
										</p>
									</div>
								) : (
									<div className="space-y-2">
										{permissions.map((perm) => (
											<div key={perm.id}>
												<div
													className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
														perm.is_active
															? "bg-primary/5 border-primary/20"
															: "bg-muted/30 border-border"
													}`}
												>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2">
															<p className="text-sm font-medium text-foreground truncate">
																{perm.user_name}
															</p>
															{!perm.is_active && (
																<span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-medium uppercase tracking-wide">
																	Expirado
																</span>
															)}
														</div>
														<div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
															<span>Otorgado: {formatDate(perm.granted_at)}</span>
															{perm.expires_at && (
																<span className="flex items-center gap-1">
																	<Calendar className="h-3 w-3" />
																	Expira: {formatDate(perm.expires_at)}
																</span>
															)}
														</div>
														{perm.notes && (
															<p className="text-xs text-muted-foreground/70 mt-1 italic truncate">
																{perm.notes}
															</p>
														)}
													</div>

													{perm.is_active && (
														<div className="ml-3 shrink-0">
															{confirmRevokeId === perm.id ? (
																<div className="flex items-center gap-1.5">
																	<span className="text-xs text-muted-foreground">¿Confirmar?</span>
																	<Button
																		variant="destructive"
																		size="sm"
																		className="h-7 text-xs px-2"
																		onClick={() => handleRevoke(perm.id)}
																		disabled={revokingId === perm.id}
																	>
																		{revokingId === perm.id ? (
																			<Loader2 className="h-3 w-3 animate-spin" />
																		) : (
																			"Revocar"
																		)}
																	</Button>
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-7 text-xs px-2"
																		onClick={() => setConfirmRevokeId(null)}
																	>
																		No
																	</Button>
																</div>
															) : (
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg"
																	onClick={() => setConfirmRevokeId(perm.id)}
																	disabled={revokingId === perm.id}
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</Button>
															)}
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</section>

							{/* Grant Form */}
							<section className="border-t border-border pt-5">
								<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
									<UserPlus className="h-3.5 w-3.5" />
									Otorgar nuevo permiso
								</h3>

								{availableUsers.length === 0 ? (
									<div className="text-center py-5 rounded-lg border border-dashed border-border bg-muted/30">
										<p className="text-sm text-muted-foreground">
											No hay usuarios disponibles para asignar
										</p>
									</div>
								) : (
									<div className="space-y-4">
										<div className="space-y-1.5">
											<Label className="text-xs">Usuario</Label>
											<Select value={selectedUserId} onValueChange={setSelectedUserId}>
												<SelectTrigger className="text-sm">
													<SelectValue placeholder="Seleccionar usuario…" />
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

										<div className="grid grid-cols-2 gap-3">
											<div className="space-y-1.5">
												<Label className="text-xs">
													Fecha de expiración{" "}
													<span className="text-muted-foreground font-normal">(opcional)</span>
												</Label>
												<Input
													type="datetime-local"
													value={expiresAt}
													onChange={(e) => setExpiresAt(e.target.value)}
													className="text-sm"
												/>
											</div>
											<div className="space-y-1.5">
												<Label className="text-xs">
													Notas{" "}
													<span className="text-muted-foreground font-normal">(opcional)</span>
												</Label>
												<Input
													placeholder="Motivo del permiso…"
													value={notes}
													onChange={(e) => setNotes(e.target.value)}
													maxLength={500}
													className="text-sm"
												/>
											</div>
										</div>

										{grantError && (
											<div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
												<AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
												<p className="text-xs text-destructive">{grantError}</p>
											</div>
										)}

										<Button
											onClick={handleGrant}
											disabled={isGranting || !selectedUserId}
											size="sm"
											className="w-full bg-primary hover:bg-primary/90"
										>
											{isGranting ? (
												<>
													<Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
													Otorgando…
												</>
											) : (
												<>
													<UserPlus className="h-3.5 w-3.5 mr-2" />
													Otorgar permiso
												</>
											)}
										</Button>
									</div>
								)}
							</section>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
