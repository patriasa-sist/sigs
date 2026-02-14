"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { actualizarPermisoRol } from "../actions";
import type { PermissionRow, RolePermissionRow } from "../actions";
import type { Permission, UserRole } from "@/utils/auth/helpers";
import { OPERATIONAL_ROLES, PERMISSION_MODULES, PERMISSION_ACTION_LABELS, getRoleLabel } from "@/utils/auth/roles";

interface Props {
	permissions: PermissionRow[];
	rolePermissions: RolePermissionRow[];
}

export default function MatrizPermisos({ permissions, rolePermissions: initialRolePermissions }: Props) {
	const [rolePermissions, setRolePermissions] = useState(initialRolePermissions);
	const [isPending, startTransition] = useTransition();

	// Group permissions by module
	const modules = permissions.reduce<Record<string, PermissionRow[]>>((acc, perm) => {
		if (!acc[perm.module]) acc[perm.module] = [];
		acc[perm.module].push(perm);
		return acc;
	}, {});

	// Roles to display (exclude admin, invitado, desactivado)
	const displayRoles = OPERATIONAL_ROLES.filter(r => r !== "admin");

	const hasPermission = (role: string, permissionId: string) => {
		return rolePermissions.some(rp => rp.role === role && rp.permission_id === permissionId);
	};

	const handleToggle = (role: UserRole, permissionId: Permission, currentValue: boolean) => {
		const newValue = !currentValue;

		// Optimistic update
		if (newValue) {
			setRolePermissions(prev => [...prev, { role, permission_id: permissionId }]);
		} else {
			setRolePermissions(prev => prev.filter(rp => !(rp.role === role && rp.permission_id === permissionId)));
		}

		startTransition(async () => {
			const result = await actualizarPermisoRol(role, permissionId, newValue);
			if (!result.success) {
				toast.error(result.error);
				// Revert optimistic update
				if (newValue) {
					setRolePermissions(prev => prev.filter(rp => !(rp.role === role && rp.permission_id === permissionId)));
				} else {
					setRolePermissions(prev => [...prev, { role, permission_id: permissionId }]);
				}
			}
		});
	};

	return (
		<div className="overflow-x-auto">
			<p className="text-sm text-gray-500 mb-4">
				El rol <Badge variant="outline" className="mx-1 text-orange-600 border-orange-200">Admin</Badge>
				tiene bypass permanente (siempre tiene todos los permisos). Los cambios requieren que el usuario cierre sesion y vuelva a entrar.
			</p>

			<table className="w-full text-sm border-collapse">
				<thead>
					<tr className="border-b">
						<th className="text-left py-2 px-3 font-medium text-gray-700 min-w-[200px]">Permiso</th>
						{displayRoles.map(role => (
							<th key={role} className="text-center py-2 px-2 font-medium text-gray-700">
								<span className="text-xs">{getRoleLabel(role)}</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{Object.entries(modules).map(([module, perms]) => (
						<>
							<tr key={`header-${module}`} className="bg-gray-50">
								<td colSpan={displayRoles.length + 1} className="py-2 px-3 font-semibold text-gray-800">
									{PERMISSION_MODULES[module] || module}
								</td>
							</tr>
							{perms.map(perm => (
								<tr key={perm.id} className="border-b border-gray-100 hover:bg-gray-50/50">
									<td className="py-2 px-3 pl-6">
										<div>
											<span className="text-gray-700">
												{PERMISSION_ACTION_LABELS[perm.action] || perm.action}
											</span>
											{perm.description && (
												<p className="text-xs text-gray-400">{perm.description}</p>
											)}
										</div>
									</td>
									{displayRoles.map(role => {
										const checked = hasPermission(role, perm.id);
										return (
											<td key={`${role}-${perm.id}`} className="text-center py-2 px-2">
												<Checkbox
													checked={checked}
													onCheckedChange={() => handleToggle(role, perm.id as Permission, checked)}
													disabled={isPending}
													className="mx-auto"
												/>
											</td>
										);
									})}
								</tr>
							))}
						</>
					))}
				</tbody>
			</table>
		</div>
	);
}
