// app/admin/roles/components/UserRoleManager.tsx
"use client";

import { updateUserRole } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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
	const [showConfirmation, setShowConfirmation] = useState<UserRole | null>(null);

	const handleRoleChange = async (newRole: UserRole) => {
		if (newRole === currentRole) {
			toast.info("User already has this role");
			return;
		}

		// Prevent self-demotion
		if (isCurrentUser && currentRole === "admin" && newRole !== "admin") {
			toast.error("You cannot remove your own admin privileges");
			return;
		}

		setIsUpdating(true);
		setShowConfirmation(null);

		try {
			const formData = new FormData();
			formData.append("userId", userId);
			formData.append("newRole", newRole);

			const result = await updateUserRole(formData);

			if (result.success) {
				toast.success(`Successfully updated ${userEmail} to ${getRoleLabel(newRole)}`);
			} else {
				toast.error(result.error || "Failed to update user role");
			}
		} catch (error) {
			toast.error("An unexpected error occurred");
			console.error("Role update error:", error);
		} finally {
			setIsUpdating(false);
		}
	};

	const getConfirmationMessage = (targetRole: UserRole) => {
		const config = getRoleConfig(targetRole);
		return {
			title: `Cambiar a Rol ${getRoleLabel(targetRole)}?`,
			description: `Esta acción cambiará ${userEmail} rol a ${getRoleLabel(targetRole)}. ${config.description}`,
			action: `Cambiar a ${getRoleLabel(targetRole)}`,
		};
	};

	return (
		<div className="flex items-center gap-2">
			{/* Current Role Display */}
			<div className="text-xs text-muted-foreground mr-2">
				Current: <span className="font-medium capitalize">{currentRole}</span>
			</div>

			{/* Role Change Buttons */}
			<div className="flex gap-1 flex-wrap">
				{/* Render all assignable role buttons */}
				{ASSIGNABLE_ROLES.map((role) => {
					const config = getRoleConfig(role);
					const Icon = config.icon;
					const isAdmin = role === "admin";

					return (
						<AlertDialog
							key={role}
							open={showConfirmation === role}
							onOpenChange={(open) => !open && setShowConfirmation(null)}
						>
							<AlertDialogTrigger asChild>
								<Button
									variant={currentRole === role ? "default" : "outline"}
									size="sm"
									className="h-8 px-3"
									disabled={
										isUpdating ||
										currentRole === role ||
										(isCurrentUser && currentRole === "admin" && !isAdmin)
									}
									onClick={() => {
										if (isCurrentUser && currentRole === "admin" && !isAdmin) {
											toast.error("You cannot remove your own admin privileges");
											return;
										}
										setShowConfirmation(role);
									}}
								>
									{isUpdating && currentRole !== role ? (
										<Loader2 className="h-3 w-3 animate-spin mr-1" />
									) : (
										<Icon className="h-3 w-3 mr-1" />
									)}
									{getRoleLabel(role)}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle className="flex items-center gap-2">
										<Icon className={`h-5 w-5 ${config.colorClasses.text}`} />
										{getConfirmationMessage(role).title}
									</AlertDialogTitle>
									<AlertDialogDescription>
										{getConfirmationMessage(role).description}
									</AlertDialogDescription>
								</AlertDialogHeader>
								{isAdmin && (
									<div className="space-y-4">
										<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
											<div className="flex items-start gap-2">
												<AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
												<div className="text-sm text-yellow-800">
													<div className="font-medium">Security Notice:</div>
													<div>
														This action will be logged for security auditing purposes.
													</div>
												</div>
											</div>
										</div>
									</div>
								)}
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => handleRoleChange(role)}
										className={`bg-${config.color}-600 hover:bg-${config.color}-700`}
									>
										{getConfirmationMessage(role).action}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					);
				})}
			</div>

			{/* Self-indication */}
			{isCurrentUser && (
				<Badge variant="outline" className="text-xs ml-2">
					<AlertTriangle className="h-3 w-3 mr-1" />
					You
				</Badge>
			)}
		</div>
	);
}
