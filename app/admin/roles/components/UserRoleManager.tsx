// app/admin/roles/components/UserRoleManager.tsx
"use client";

import { updateUserRole } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Crown, UserCheck, Loader2, AlertTriangle } from "lucide-react";
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

interface UserRoleManagerProps {
	userId: string;
	currentRole: "admin" | "usuario" | "agente" | "comercial" | "invitado" | "desactivado";
	userEmail: string;
	isCurrentUser: boolean;
}

export function UserRoleManager({ userId, currentRole, userEmail, isCurrentUser }: UserRoleManagerProps) {
	const [isUpdating, setIsUpdating] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState<"admin" | "usuario" | "agente" | "comercial" | "invitado" | "desactivado" | null>(null);

	const handleRoleChange = async (newRole: "admin" | "usuario" | "agente" | "comercial" | "invitado" | "desactivado") => {
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
				const roleLabels: Record<string, string> = {
					admin: "Administrator",
					usuario: "Usuario",
					agente: "Agente",
					comercial: "Comercial",
					invitado: "Invitado",
					desactivado: "Desactivado"
				};
				toast.success(`Successfully updated ${userEmail} to ${roleLabels[newRole] || newRole}`);
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

	const getConfirmationMessage = (targetRole: "admin" | "usuario" | "agente" | "comercial" | "invitado" | "desactivado") => {
		const messages: Record<string, { title: string; description: string; action: string }> = {
			admin: {
				title: "Grant Administrator Access?",
				description: `This will give ${userEmail} full administrative privileges including the ability to manage other users, send invitations, and access all admin features.`,
				action: "Grant Admin Access",
			},
			usuario: {
				title: "Change to Usuario Role?",
				description: `This will change ${userEmail}'s role to Usuario. They will have standard user access.`,
				action: "Change to Usuario",
			},
			agente: {
				title: "Change to Agente Role?",
				description: `This will change ${userEmail}'s role to Agente. They will have agent-level access.`,
				action: "Change to Agente",
			},
			comercial: {
				title: "Change to Comercial Role?",
				description: `This will change ${userEmail}'s role to Comercial. They will have commercial-level access.`,
				action: "Change to Comercial",
			},
			invitado: {
				title: "Change to Invitado Role?",
				description: `This will change ${userEmail}'s role to Invitado. They will have limited guest access.`,
				action: "Change to Invitado",
			},
			desactivado: {
				title: "Deactivate User?",
				description: `This will deactivate ${userEmail}'s account. They will lose access to the system.`,
				action: "Deactivate User",
			},
		};
		return messages[targetRole] || messages.usuario;
	};

	return (
		<div className="flex items-center gap-2">
			{/* Current Role Display */}
			<div className="text-xs text-muted-foreground mr-2">
				Current: <span className="font-medium capitalize">{currentRole}</span>
			</div>

			{/* Role Change Buttons */}
			<div className="flex gap-1">
				{/* Make Admin Button */}
				<AlertDialog
					open={showConfirmation === "admin"}
					onOpenChange={(open) => !open && setShowConfirmation(null)}
				>
					<AlertDialogTrigger asChild>
						<Button
							variant={currentRole === "admin" ? "default" : "outline"}
							size="sm"
							className="h-8 px-3"
							disabled={isUpdating || currentRole === "admin"}
							onClick={() => setShowConfirmation("admin")}
						>
							{isUpdating && currentRole !== "admin" ? (
								<Loader2 className="h-3 w-3 animate-spin mr-1" />
							) : (
								<Crown className="h-3 w-3 mr-1" />
							)}
							Admin
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="flex items-center gap-2">
								<Crown className="h-5 w-5 text-orange-500" />
								{getConfirmationMessage("admin").title}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{getConfirmationMessage("admin").description}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="space-y-4">
							<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
								<div className="flex items-start gap-2">
									<AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
									<div className="text-sm text-yellow-800">
										<div className="font-medium">Security Notice:</div>
										<div>This action will be logged for security auditing purposes.</div>
									</div>
								</div>
							</div>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => handleRoleChange("admin")}
								className="bg-orange-600 hover:bg-orange-700"
							>
								{getConfirmationMessage("admin").action}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Other Role Buttons */}
				{(["usuario", "agente", "comercial", "invitado", "desactivado"] as const).map((role) => (
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
									isUpdating || currentRole === role || (isCurrentUser && currentRole === "admin")
								}
								onClick={() => {
									if (isCurrentUser && currentRole === "admin") {
										toast.error("You cannot remove your own admin privileges");
										return;
									}
									setShowConfirmation(role);
								}}
							>
								{isUpdating && currentRole !== role ? (
									<Loader2 className="h-3 w-3 animate-spin mr-1" />
								) : (
									<UserCheck className="h-3 w-3 mr-1" />
								)}
								{role.charAt(0).toUpperCase() + role.slice(1)}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle className="flex items-center gap-2">
									<UserCheck className="h-5 w-5 text-blue-500" />
									{getConfirmationMessage(role).title}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{getConfirmationMessage(role).description}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => handleRoleChange(role)}
									className="bg-blue-600 hover:bg-blue-700"
								>
									{getConfirmationMessage(role).action}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				))}
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
