"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Calendar, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getComercialUsers,
	grantEditPermission,
} from "@/app/clientes/permisos/actions";
import type { ComercialUser, GrantPermissionInput } from "@/types/clientPermission";

interface Props {
	clientId: string;
	clientName: string;
	onClose: () => void;
	onSuccess: () => void;
}

export function GrantPermissionModal({
	clientId,
	clientName,
	onClose,
	onSuccess,
}: Props) {
	const [comercialUsers, setComercialUsers] = useState<ComercialUser[]>([]);
	const [isLoadingUsers, setIsLoadingUsers] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Form state
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [expiresAt, setExpiresAt] = useState<string>("");
	const [notes, setNotes] = useState<string>("");

	// Load comercial users on mount
	useEffect(() => {
		async function loadUsers() {
			setIsLoadingUsers(true);
			const result = await getComercialUsers();

			if (result.success) {
				setComercialUsers(result.data);
			} else {
				setError(result.error);
			}

			setIsLoadingUsers(false);
		}

		loadUsers();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!selectedUserId) {
			setError("Debe seleccionar un usuario");
			return;
		}

		setIsSubmitting(true);

		const input: GrantPermissionInput = {
			client_id: clientId,
			user_id: selectedUserId,
			expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
			notes: notes || undefined,
		};

		const result = await grantEditPermission(input);

		if (result.success) {
			onSuccess();
			onClose();
		} else {
			setError(result.error);
		}

		setIsSubmitting(false);
	};

	// Get minimum date for expiration (tomorrow)
	const minDate = new Date();
	minDate.setDate(minDate.getDate() + 1);
	const minDateStr = minDate.toISOString().split("T")[0];

	return (
		<div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
			<div className="bg-white rounded-lg w-full max-w-md shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b">
					<div className="flex items-center gap-2">
						<UserPlus className="h-5 w-5 text-primary" />
						<h3 className="text-lg font-semibold">Otorgar Permiso de Edición</h3>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="rounded-full"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Content */}
				<form onSubmit={handleSubmit} className="p-6 space-y-4">
					{/* Client info */}
					<div className="p-3 bg-gray-50 rounded-lg">
						<p className="text-sm text-gray-600">Cliente:</p>
						<p className="font-medium">{clientName}</p>
					</div>

					{/* User selection */}
					<div className="space-y-2">
						<Label htmlFor="user">Usuario Comercial *</Label>
						{isLoadingUsers ? (
							<div className="flex items-center gap-2 text-gray-500">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span className="text-sm">Cargando usuarios...</span>
							</div>
						) : comercialUsers.length === 0 ? (
							<p className="text-sm text-amber-600">
								No hay usuarios con rol comercial disponibles
							</p>
						) : (
							<Select
								value={selectedUserId}
								onValueChange={setSelectedUserId}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar usuario..." />
								</SelectTrigger>
								<SelectContent>
									{comercialUsers.map((user) => (
										<SelectItem key={user.id} value={user.id}>
											<div className="flex flex-col">
												<span>{user.full_name}</span>
												<span className="text-xs text-gray-500">
													{user.email}
												</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					{/* Expiration date (optional) */}
					<div className="space-y-2">
						<Label htmlFor="expires_at" className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							Fecha de Expiración (opcional)
						</Label>
						<Input
							id="expires_at"
							type="date"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
							min={minDateStr}
						/>
						<p className="text-xs text-gray-500">
							Si no se especifica, el permiso no expira automáticamente
						</p>
					</div>

					{/* Notes (optional) */}
					<div className="space-y-2">
						<Label htmlFor="notes" className="flex items-center gap-2">
							<FileText className="h-4 w-4" />
							Notas (opcional)
						</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Razón para otorgar el permiso..."
							rows={2}
							maxLength={500}
						/>
					</div>

					{/* Error message */}
					{error && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-sm text-red-600">{error}</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting || isLoadingUsers || !selectedUserId}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Otorgando...
								</>
							) : (
								<>
									<UserPlus className="h-4 w-4 mr-2" />
									Otorgar Permiso
								</>
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
