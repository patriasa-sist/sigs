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
import { Button } from "@/components/ui/button";
import { deleteInvitationAndUser } from "@/app/admin/invitations/actions";

interface DeleteInvitationDialogProps {
	invitation: {
		id: string;
		email: string;
		status: string;
	};
}

export function DeleteInvitationDialog({ invitation }: DeleteInvitationDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await deleteInvitationAndUser(invitation.id, invitation.email);

			if (result.success) {
				toast.success(result.message || "Invitation deleted successfully");
			} else {
				toast.error(result.error || "Failed to delete invitation");
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
				<Button variant="ghost" size="sm">
					<Trash2 className="h-4 w-4 text-destructive" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						Eliminar Invitación
					</AlertDialogTitle>
					<AlertDialogDescription>
						¿Estás seguro de eliminar la invitación de <strong>{invitation.email}</strong>?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
					<p className="text-sm font-medium text-destructive mb-2">Advertencia:</p>
					<ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
						<li>Esto eliminará permanentemente el registro de invitación</li>
						<li>Si el usuario tiene perfil pero no completó el registro, su cuenta será eliminada</li>
						<li>Esta acción no se puede deshacer</li>
					</ul>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeleting ? (
							<>
								<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
								Eliminando...
							</>
						) : (
							<>
								<Trash2 className="h-4 w-4 mr-2" />
								Eliminar
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
