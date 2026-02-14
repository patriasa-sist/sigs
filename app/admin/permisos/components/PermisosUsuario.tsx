"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { asignarPermisoUsuario, revocarPermisoUsuario } from "../actions";
import type { PermissionRow, UserWithPermissions } from "../actions";
import type { Permission } from "@/utils/auth/helpers";
import { getRoleLabel, getPermissionLabel, PERMISSION_MODULES } from "@/utils/auth/roles";

interface Props {
	users: UserWithPermissions[];
	permissions: PermissionRow[];
}

export default function PermisosUsuario({ users, permissions }: Props) {
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [selectedPermission, setSelectedPermission] = useState<string>("");
	const [userPerms, setUserPerms] = useState<Record<string, string[]>>(() => {
		const map: Record<string, string[]> = {};
		users.forEach(u => {
			map[u.id] = u.extraPermissions.map(ep => ep.permission_id);
		});
		return map;
	});
	const [isPending, startTransition] = useTransition();

	// Filter out admins (they don't need extra permissions)
	const eligibleUsers = users.filter(u => u.role !== "admin" && u.role !== "invitado" && u.role !== "desactivado");

	const selectedUser = eligibleUsers.find(u => u.id === selectedUserId);
	const currentExtraPerms = selectedUserId ? (userPerms[selectedUserId] || []) : [];

	// Group permissions by module for the select
	const permissionsByModule = permissions.reduce<Record<string, PermissionRow[]>>((acc, p) => {
		if (!acc[p.module]) acc[p.module] = [];
		acc[p.module].push(p);
		return acc;
	}, {});

	const handleAssign = () => {
		if (!selectedUserId || !selectedPermission) return;

		// Optimistic
		setUserPerms(prev => ({
			...prev,
			[selectedUserId]: [...(prev[selectedUserId] || []), selectedPermission],
		}));

		startTransition(async () => {
			const result = await asignarPermisoUsuario(selectedUserId, selectedPermission as Permission);
			if (!result.success) {
				toast.error(result.error);
				// Revert
				setUserPerms(prev => ({
					...prev,
					[selectedUserId]: (prev[selectedUserId] || []).filter(p => p !== selectedPermission),
				}));
			} else {
				toast.success("Permiso asignado");
				setSelectedPermission("");
			}
		});
	};

	const handleRevoke = (userId: string, permissionId: string) => {
		// Optimistic
		setUserPerms(prev => ({
			...prev,
			[userId]: (prev[userId] || []).filter(p => p !== permissionId),
		}));

		startTransition(async () => {
			const result = await revocarPermisoUsuario(userId, permissionId as Permission);
			if (!result.success) {
				toast.error(result.error);
				// Revert
				setUserPerms(prev => ({
					...prev,
					[userId]: [...(prev[userId] || []), permissionId],
				}));
			} else {
				toast.success("Permiso revocado");
			}
		});
	};

	return (
		<div className="space-y-6">
			<p className="text-sm text-gray-500">
				Asigna permisos adicionales a usuarios individuales, mas alla de los que hereda su rol. Util para sub-administradores o casos especiales.
			</p>

			{/* User selector */}
			<div className="flex items-end gap-4">
				<div className="flex-1 max-w-xs">
					<label className="text-sm font-medium text-gray-700 mb-1 block">Seleccionar usuario</label>
					<Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
						<SelectTrigger>
							<SelectValue placeholder="Elegir usuario..." />
						</SelectTrigger>
						<SelectContent>
							{eligibleUsers.map(user => (
								<SelectItem key={user.id} value={user.id}>
									<span>{user.full_name || user.email}</span>
									<span className="ml-2 text-xs text-gray-400">({getRoleLabel(user.role as Parameters<typeof getRoleLabel>[0])})</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{selectedUserId && (
					<>
						<div className="flex-1 max-w-xs">
							<label className="text-sm font-medium text-gray-700 mb-1 block">Permiso a asignar</label>
							<Select value={selectedPermission} onValueChange={setSelectedPermission}>
								<SelectTrigger>
									<SelectValue placeholder="Elegir permiso..." />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(permissionsByModule).map(([module, perms]) => (
										<div key={module}>
											<div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
												{PERMISSION_MODULES[module] || module}
											</div>
											{perms
												.filter(p => !currentExtraPerms.includes(p.id))
												.map(p => (
													<SelectItem key={p.id} value={p.id}>
														{getPermissionLabel(p.id as Permission)}
													</SelectItem>
												))}
										</div>
									))}
								</SelectContent>
							</Select>
						</div>

						<Button
							onClick={handleAssign}
							disabled={!selectedPermission || isPending}
							size="sm"
						>
							<Plus className="h-4 w-4 mr-1" />
							Asignar
						</Button>
					</>
				)}
			</div>

			{/* Current extra permissions for selected user */}
			{selectedUser && (
				<div className="border rounded-lg p-4">
					<h4 className="font-medium mb-3">
						Permisos extra de {selectedUser.full_name || selectedUser.email}
						<Badge variant="outline" className="ml-2 text-xs">
							{getRoleLabel(selectedUser.role as Parameters<typeof getRoleLabel>[0])}
						</Badge>
					</h4>

					{currentExtraPerms.length === 0 ? (
						<p className="text-sm text-gray-400">Sin permisos extra asignados</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{currentExtraPerms.map(permId => (
								<Badge key={permId} variant="secondary" className="flex items-center gap-1">
									{getPermissionLabel(permId as Permission)}
									<button
										onClick={() => handleRevoke(selectedUser.id, permId)}
										disabled={isPending}
										className="ml-1 hover:text-red-600"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
					)}
				</div>
			)}

			{/* Summary: all users with extra permissions */}
			<div>
				<h4 className="font-medium mb-3 text-gray-700">Usuarios con permisos extra</h4>
				{eligibleUsers.filter(u => (userPerms[u.id] || []).length > 0).length === 0 ? (
					<p className="text-sm text-gray-400">Ningun usuario tiene permisos extra asignados</p>
				) : (
					<div className="space-y-2">
						{eligibleUsers
							.filter(u => (userPerms[u.id] || []).length > 0)
							.map(user => (
								<div key={user.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
									<span className="text-sm font-medium min-w-[200px]">
										{user.full_name || user.email}
									</span>
									<Badge variant="outline" className="text-xs">
										{getRoleLabel(user.role as Parameters<typeof getRoleLabel>[0])}
									</Badge>
									<div className="flex flex-wrap gap-1">
										{(userPerms[user.id] || []).map(permId => (
											<Badge key={permId} variant="secondary" className="text-xs">
												{getPermissionLabel(permId as Permission)}
											</Badge>
										))}
									</div>
								</div>
							))}
					</div>
				)}
			</div>
		</div>
	);
}
