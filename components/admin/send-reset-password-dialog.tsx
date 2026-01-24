"use client";

import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
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
import { sendPasswordResetEmail } from "@/app/admin/users/actions";

interface SendResetPasswordDialogProps {
	user: {
		id: string;
		email: string;
	};
}

export function SendResetPasswordDialog({ user }: SendResetPasswordDialogProps) {
	const [isSending, setIsSending] = useState(false);
	const [open, setOpen] = useState(false);

	const handleSend = async () => {
		setIsSending(true);
		try {
			const result = await sendPasswordResetEmail(user.id);

			if (result.success) {
				toast.success(result.message || "Correo de recuperación enviado");
				setOpen(false);
			} else {
				toast.error(result.error || "Error al enviar el correo");
			}
		} catch {
			toast.error("Ocurrió un error inesperado");
		} finally {
			setIsSending(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
					<KeyRound className="h-4 w-4 mr-2" />
					Recuperar Contraseña
				</DropdownMenuItem>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5 text-blue-600" />
						Enviar Correo de Recuperación
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-2 text-sm text-muted-foreground">
							<span className="block">
								Se enviará un correo de recuperación de contraseña a{" "}
								<strong className="text-foreground">{user.email}</strong>
							</span>
							<span className="block text-sm bg-blue-50 p-3 rounded-md border border-blue-200 text-blue-800">
								El usuario recibirá un enlace único que le permitirá establecer una
								nueva contraseña. Este enlace solo puede usarse una vez y expira
								después de un tiempo limitado.
							</span>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleSend}
						disabled={isSending}
						className="bg-blue-600 text-white hover:bg-blue-700"
					>
						{isSending ? (
							<>
								<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
								Enviando...
							</>
						) : (
							<>
								<Mail className="h-4 w-4 mr-2" />
								Enviar Correo
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
