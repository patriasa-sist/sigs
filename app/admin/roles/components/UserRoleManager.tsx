// app/admin/roles/components/UserRoleManager.tsx
"use client";

import { updateUserRole } from "@/app/admin/actions";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/utils/auth/helpers";
import { ASSIGNABLE_ROLES, getRoleConfig, getRoleLabel } from "@/utils/auth/roles";

interface UserRoleManagerProps {
	userId: string;
	currentRole: UserRole;
	userEmail: string;
	isCurrentUser: boolean;
}

export function UserRoleManager({ userId, currentRole, userEmail, isCurrentUser }: UserRoleManagerProps) {
	const [isUpdating, setIsUpdating] = useState(false);
	const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

	const handleSelect = (value: string) => {
		const newRole = value as UserRole;
		if (newRole === currentRole) return;

		if (isCurrentUser && currentRole === "admin" && newRole !== "admin") {
			toast.error("No puedes remover tus propios privilegios de administrador");
			return;
		}

		setPendingRole(newRole);
	};

	const handleConfirm = async () => {
		if (!pendingRole) return;

		setIsUpdating(true);
		setPendingRole(null);

		try {
			const formData = new FormData();
			formData.append("userId", userId);
			formData.append("newRole", pendingRole);

			const result = await updateUserRole(formData);

			if (result.success) {
				toast.success(`Rol de ${userEmail} actualizado a ${getRoleLabel(pendingRole)}`);
			} else {
				toast.error(result.error || "Error al actualizar el rol");
			}
		} catch {
			toast.error("Ocurrió un error inesperado");
		} finally {
			setIsUpdating(false);
		}
	};

	const isDisabled = isUpdating || (isCurrentUser && currentRole === "admin");

	return (
		<>
			<div className="flex items-center gap-2">
				{isUpdating ? (
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				) : (
					<Select
						value={pendingRole ?? currentRole}
						onValueChange={handleSelect}
						disabled={isDisabled}
					>
						<SelectTrigger className="w-36 h-8 text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ASSIGNABLE_ROLES.map((role) => {
								const config = getRoleConfig(role);
								const Icon = config.icon;
								return (
									<SelectItem key={role} value={role}>
										<div className="flex items-center gap-2">
											<Icon className="h-3.5 w-3.5 text-muted-foreground" />
											{getRoleLabel(role)}
										</div>
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
				)}
			</div>

			<AlertDialog open={pendingRole !== null} onOpenChange={(open) => !open && setPendingRole(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							¿Cambiar rol a {pendingRole ? getRoleLabel(pendingRole) : ""}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Esto cambiará el rol de <strong>{userEmail}</strong> de{" "}
							<strong>{getRoleLabel(currentRole)}</strong> a{" "}
							<strong>{pendingRole ? getRoleLabel(pendingRole) : ""}</strong>. El cambio
							se aplica inmediatamente y queda registrado en la auditoría.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirm}>
							Confirmar cambio
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
