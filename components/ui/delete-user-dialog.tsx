"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { deleteUser } from "@/app/admin/users/actions";

interface DeleteUserDialogProps {
	user: {
		id: string;
		email: string;
		role: string;
	};
}

export function DeleteUserDialog({ user }: DeleteUserDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await deleteUser(user.id);
			
			if (result.success) {
				toast.success(result.message || "User deleted successfully");
			} else {
				toast.error(result.error || "Failed to delete user");
			}
		} catch {
			toast.error("An unexpected error occurred");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<DropdownMenuItem
					className="text-destructive"
					onSelect={(e) => e.preventDefault()}
				>
					Remove User
				</DropdownMenuItem>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						Delete User Account
					</AlertDialogTitle>
					<AlertDialogDescription className="space-y-2">
						<p>
							Are you sure you want to delete <strong>{user.email}</strong>?
						</p>
						<p className="text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
							<strong>Warning:</strong> This action cannot be undone. The user will lose access 
							to their account and all associated data will be permanently removed.
						</p>
						{user.role === "admin" && (
							<p className="text-sm bg-amber-50 p-3 rounded-md border border-amber-200">
								<strong>Note:</strong> You are about to delete an admin user. 
								Make sure there are other admin users to manage the system.
							</p>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeleting ? (
							<>
								<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
								Deleting...
							</>
						) : (
							<>
								<Trash2 className="h-4 w-4 mr-2" />
								Delete User
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}