"use client";

import { useState, useMemo, useRef } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	type TipoDocumentoCliente,
	ALL_DOCUMENT_TYPES,
	NON_EXCEPTABLE_DOCUMENTS,
} from "@/types/clienteDocumento";
import { otorgarExcepcion } from "@/app/auditoria/excepciones/actions";
import { toast } from "sonner";

type Props = {
	usuarios: { id: string; email: string; role: string; full_name: string | null }[];
	onSuccess: () => void;
	onCancel: () => void;
};

export function OtorgarExcepcionForm({ usuarios, onSuccess, onCancel }: Props) {
	const [selectedUserId, setSelectedUserId] = useState("");
	const [selectedDocs, setSelectedDocs] = useState<Set<TipoDocumentoCliente>>(new Set());
	const [motivo, setMotivo] = useState("");
	const [userSearch, setUserSearch] = useState("");
	const [isUserListOpen, setIsUserListOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const userInputRef = useRef<HTMLInputElement>(null);

	// Exceptable document types (exclude non-exceptable)
	const exceptableDocTypes = useMemo(() => {
		return Object.entries(ALL_DOCUMENT_TYPES).filter(
			([key]) => !NON_EXCEPTABLE_DOCUMENTS.includes(key as TipoDocumentoCliente)
		) as [TipoDocumentoCliente, string][];
	}, []);

	// Filtered users based on search (by name or email)
	const filteredUsers = useMemo(() => {
		if (!userSearch.trim()) return usuarios;
		const search = userSearch.toLowerCase();
		return usuarios.filter(
			(u) =>
				(u.full_name && u.full_name.toLowerCase().includes(search)) ||
				u.email.toLowerCase().includes(search)
		);
	}, [usuarios, userSearch]);

	const toggleDoc = (docKey: TipoDocumentoCliente) => {
		setSelectedDocs((prev) => {
			const next = new Set(prev);
			if (next.has(docKey)) {
				next.delete(docKey);
			} else {
				next.add(docKey);
			}
			return next;
		});
	};

	const handleSubmit = async () => {
		if (!selectedUserId || selectedDocs.size === 0 || !motivo.trim()) {
			toast.error("Complete todos los campos.");
			return;
		}

		if (motivo.trim().length < 10) {
			toast.error("El motivo debe tener al menos 10 caracteres.");
			return;
		}

		setIsSaving(true);
		try {
			const result = await otorgarExcepcion({
				userId: selectedUserId,
				tipoDocumento: Array.from(selectedDocs),
				motivo: motivo.trim(),
			});

			if (result.success) {
				const count = result.count || selectedDocs.size;
				toast.success(
					count === 1
						? "Excepción otorgada exitosamente"
						: `${count} excepciones otorgadas exitosamente`
				);
				onSuccess();
			} else {
				toast.error(result.error || "Error al otorgar excepción");
			}
		} finally {
			setIsSaving(false);
		}
	};

	const selectUser = (userId: string) => {
		setSelectedUserId(userId);
		const user = usuarios.find((u) => u.id === userId);
		if (user) setUserSearch(user.full_name || user.email);
		setIsUserListOpen(false);
	};

	const clearUser = () => {
		setSelectedUserId("");
		setUserSearch("");
		setIsUserListOpen(true);
		userInputRef.current?.focus();
	};

	return (
		<div className="border border-blue-200 bg-blue-50/50 rounded-lg p-6 space-y-5">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900">Otorgar Excepción de Documento</h3>
				<Button variant="ghost" size="sm" onClick={onCancel}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<p className="text-sm text-gray-600">
				Esta excepción es de <strong>uso único</strong>. Se consumirá automáticamente cuando el
				usuario cree su siguiente cliente. Puede ser revocada antes de ser usada.
			</p>

			{/* User selector - searchable input with list */}
			<div className="space-y-2">
				<Label>Usuario</Label>
				<div className="relative">
					<Input
						ref={userInputRef}
						placeholder="Escriba para buscar por nombre o email..."
						value={userSearch}
						onChange={(e) => {
							setUserSearch(e.target.value);
							if (selectedUserId) setSelectedUserId("");
							setIsUserListOpen(true);
						}}
						onFocus={() => setIsUserListOpen(true)}
						className={selectedUserId ? "pr-8" : ""}
					/>
					{selectedUserId && (
						<button
							type="button"
							onClick={clearUser}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>
				{isUserListOpen && !selectedUserId && (
					<div className="border border-gray-200 rounded-lg bg-white max-h-48 overflow-y-auto shadow-sm">
						{filteredUsers.length === 0 ? (
							<div className="p-3 text-sm text-gray-500 text-center">
								No se encontraron usuarios
							</div>
						) : (
							filteredUsers.map((user) => (
								<button
									key={user.id}
									type="button"
									onClick={() => selectUser(user.id)}
									className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-gray-100 last:border-0"
								>
									<span className="text-gray-900">{user.full_name || user.email}</span>
									<span className="text-xs text-gray-500 ml-2">{user.full_name ? user.email : user.role}</span>
								</button>
							))
						)}
					</div>
				)}
			</div>

			{/* Document type chips (multi-select) */}
			<div className="space-y-3">
				<Label>
					Documentos a Exceptuar
					{selectedDocs.size > 0 && (
						<span className="ml-2 text-xs font-normal text-purple-600">
							({selectedDocs.size} seleccionado{selectedDocs.size > 1 ? "s" : ""})
						</span>
					)}
				</Label>
				<div className="flex flex-wrap gap-2">
					{exceptableDocTypes.map(([key, label]) => {
						const isSelected = selectedDocs.has(key);
						return (
							<button
								key={key}
								type="button"
								onClick={() => toggleDoc(key)}
								className={`
									inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
									border transition-all duration-150 cursor-pointer
									${isSelected
										? "bg-purple-100 border-purple-400 text-purple-800 shadow-sm"
										: "bg-white border-gray-300 text-gray-600 hover:border-purple-300 hover:bg-purple-50"
									}
								`}
							>
								{isSelected && <Check className="h-3.5 w-3.5" />}
								{label}
							</button>
						);
					})}
				</div>
				<p className="text-xs text-gray-500">
					Todos los documentos pueden ser exceptuados por UIF.
				</p>
			</div>

			{/* Motivo */}
			<div className="space-y-2">
				<Label>Motivo de la Excepción</Label>
				<Textarea
					placeholder="Explique la razón por la cual se otorga esta excepción (mín. 10 caracteres)..."
					value={motivo}
					onChange={(e) => setMotivo(e.target.value)}
					rows={3}
				/>
				<p className="text-xs text-gray-500">
					{motivo.trim().length}/10 caracteres mínimo. Este motivo queda registrado para auditoría.
				</p>
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-3 pt-2">
				<Button variant="outline" onClick={onCancel} disabled={isSaving}>
					Cancelar
				</Button>
				<Button
					onClick={handleSubmit}
					disabled={isSaving || !selectedUserId || selectedDocs.size === 0 || motivo.trim().length < 10}
				>
					{isSaving
						? "Otorgando..."
						: selectedDocs.size > 1
							? `Otorgar ${selectedDocs.size} Excepciones`
							: "Otorgar Excepción"
					}
				</Button>
			</div>
		</div>
	);
}
