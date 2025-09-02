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
	currentRole: "admin" | "user";
	userEmail: string;
	isCurrentUser: boolean;
}

export function UserRoleManager({ userId, currentRole, userEmail, isCurrentUser }: UserRoleManagerProps) {
	const [isUpdating, setIsUpdating] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState<"admin" | "user" | null>(null);

	const handleRoleChange = async (newRole: "admin" | "user") => {
		if (newRole === currentRole) {
			toast.info("User already has this role");
			return;
		}

		// Prevent self-demotion
		if (isCurrentUser && currentRole === "admin" && newRole === "user") {
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
				toast.success(`Successfully updated ${userEmail} to ${newRole === "admin" ? "Administrator" : "User"}`);
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

	const getConfirmationMessage = (targetRole: "admin" | "user") => {
		if (targetRole === "admin") {
			return {
				title: "Grant Administrator Access?",
				description: `This will give ${userEmail} full administrative privileges including the ability to manage other users, send invitations, and access all admin features.`,
				action: "Grant Admin Access",
			};
		} else {
			return {
				title: "Remove Administrator Access?",
				description: `This will revoke ${userEmail}'s administrative privileges. They will lose access to admin features and user management capabilities.`,
				action: "Remove Admin Access",
			};
		}
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
							<AlertDialogDescription className="space-y-2">
								<p>{getConfirmationMessage("admin").description}</p>
								<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
									<div className="flex items-start gap-2">
										<AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
										<div className="text-sm text-yellow-800">
											<p className="font-medium">Security Notice:</p>
											<p>This action will be logged for security auditing purposes.</p>
										</div>
									</div>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
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

				{/* Make User Button */}
				<AlertDialog
					open={showConfirmation === "user"}
					onOpenChange={(open) => !open && setShowConfirmation(null)}
				>
					<AlertDialogTrigger asChild>
						<Button
							variant={currentRole === "user" ? "default" : "outline"}
							size="sm"
							className="h-8 px-3"
							disabled={
								isUpdating || currentRole === "user" || (isCurrentUser && currentRole === "admin")
							}
							onClick={() => {
								if (isCurrentUser && currentRole === "admin") {
									toast.error("You cannot remove your own admin privileges");
									return;
								}
								setShowConfirmation("user");
							}}
						>
							{isUpdating && currentRole !== "user" ? (
								<Loader2 className="h-3 w-3 animate-spin mr-1" />
							) : (
								<UserCheck className="h-3 w-3 mr-1" />
							)}
							User
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="flex items-center gap-2">
								<UserCheck className="h-5 w-5 text-blue-500" />
								{getConfirmationMessage("user").title}
							</AlertDialogTitle>
							<AlertDialogDescription className="space-y-2">
								<p>{getConfirmationMessage("user").description}</p>
								<div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
									<div className="flex items-start gap-2">
										<AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
										<div className="text-sm text-blue-800">
											<p className="font-medium">Important:</p>
											<p>This action cannot be undone without administrator intervention.</p>
										</div>
									</div>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => handleRoleChange("user")}
								className="bg-blue-600 hover:bg-blue-700"
							>
								{getConfirmationMessage("user").action}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
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
