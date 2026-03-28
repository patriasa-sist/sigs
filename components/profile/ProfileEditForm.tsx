"use client";

import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Loader2, Save } from "lucide-react";
import { updateCommercialProfile, type UpdateProfileResult } from "@/app/profile/actions";

interface ProfileEditFormProps {
	initialData: {
		acronimo: string;
		cargo: string;
		telefono: string;
	};
}

const initialState: UpdateProfileResult = {};

export function ProfileEditForm({ initialData }: ProfileEditFormProps) {
	const [state, formAction, isPending] = useActionState(updateCommercialProfile, initialState);
	const formRef = useRef<HTMLFormElement>(null);

	// Reset success message after 3s
	useEffect(() => {
		if (state?.success) {
			const t = setTimeout(() => {
				// state is immutable — just let it fade naturally
			}, 3000);
			return () => clearTimeout(t);
		}
	}, [state]);

	return (
		<form ref={formRef} action={formAction} className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{/* Acrónimo */}
				<div className="space-y-1.5">
					<Label htmlFor="acronimo" className="text-sm font-medium text-foreground">
						Acrónimo
					</Label>
					<Input
						id="acronimo"
						name="acronimo"
						defaultValue={initialData.acronimo}
						placeholder="Ej: TTD"
						maxLength={5}
						className="uppercase h-10 bg-card font-mono tracking-widest"
						style={{ textTransform: "uppercase" }}
					/>
					<p className="text-xs text-muted-foreground">
						Máx. 5 letras · se usa en firmas PDF
					</p>
				</div>

				{/* Cargo */}
				<div className="space-y-1.5">
					<Label htmlFor="cargo" className="text-sm font-medium text-foreground">
						Cargo
					</Label>
					<Input
						id="cargo"
						name="cargo"
						defaultValue={initialData.cargo}
						placeholder="Ej: Ejecutiva de Cuentas"
						className="h-10 bg-card"
					/>
					<p className="text-xs text-muted-foreground">Título que aparece en cartas</p>
				</div>

				{/* Teléfono */}
				<div className="space-y-1.5">
					<Label htmlFor="telefono" className="text-sm font-medium text-foreground">
						Teléfono
					</Label>
					<Input
						id="telefono"
						name="telefono"
						defaultValue={initialData.telefono}
						placeholder="Ej: 77342938"
						type="tel"
						className="h-10 bg-card"
					/>
					<p className="text-xs text-muted-foreground">Contacto en PDF y WhatsApp</p>
				</div>
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between pt-1">
				<div className="flex items-center gap-2 min-h-[20px]">
					{state?.success && (
						<span className="flex items-center gap-1.5 text-sm text-accent">
							<CheckCircle className="h-4 w-4" />
							Cambios guardados
						</span>
					)}
					{state?.error && (
						<span className="flex items-center gap-1.5 text-sm text-destructive">
							<AlertCircle className="h-4 w-4" />
							{state.error}
						</span>
					)}
				</div>
				<Button type="submit" disabled={isPending} size="sm" className="gap-2">
					{isPending ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Guardando…
						</>
					) : (
						<>
							<Save className="h-4 w-4" />
							Guardar cambios
						</>
					)}
				</Button>
			</div>
		</form>
	);
}
