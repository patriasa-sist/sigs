"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";

export type DirectorCartera = {
	id: string;
	nombre: string;
	apellidos: string | null;
};

type DirectorCarteraDropdownProps = {
	value: string | null | undefined;
	onValueChange: (value: string | null) => void;
	error?: string;
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	required?: boolean;
};

export function DirectorCarteraDropdown({
	value,
	onValueChange,
	error,
	label = "Director de cartera",
	placeholder,
	disabled = false,
	className,
	required = false,
}: DirectorCarteraDropdownProps) {
	const resolvedPlaceholder = placeholder ?? (required ? "Seleccionar director" : "Sin director asignado");
	const [directores, setDirectores] = useState<DirectorCartera[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		async function loadDirectores() {
			try {
				setIsLoading(true);
				setLoadError(null);

				const supabase = createClient();
				const { data, error: fetchError } = await supabase
					.from("directores_cartera")
					.select("id, nombre, apellidos")
					.eq("activo", true)
					.order("nombre");

				if (fetchError) {
					console.error("Error cargando directores de cartera:", fetchError);
					setLoadError("Error al cargar directores");
					return;
				}

				setDirectores(data || []);
			} catch (err) {
				console.error("Error inesperado cargando directores:", err);
				setLoadError("Error inesperado al cargar directores");
			} finally {
				setIsLoading(false);
			}
		}

		loadDirectores();
	}, []);

	const selectValue = value ?? "none";

	return (
		<div className={`space-y-2 ${className || ""}`}>
			{label && (
				<Label>
					{label}
					{required && <span className="text-red-500 ml-0.5">*</span>}
				</Label>
			)}
			<Select
				value={selectValue}
				onValueChange={(v) => onValueChange(v === "none" ? null : v)}
				disabled={disabled || isLoading}
			>
				<SelectTrigger className={error ? "border-red-500" : ""}>
					<SelectValue
						placeholder={
							isLoading ? "Cargando..." : loadError ? "Error al cargar" : resolvedPlaceholder
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{!required && <SelectItem value="none">{resolvedPlaceholder}</SelectItem>}
					{directores.map((d) => (
						<SelectItem key={d.id} value={d.id}>
							{d.nombre}{d.apellidos ? ` ${d.apellidos}` : ""}
						</SelectItem>
					))}
					{directores.length === 0 && !isLoading && !loadError && (
						<SelectItem value="empty" disabled>
							No hay directores registrados
						</SelectItem>
					)}
				</SelectContent>
			</Select>
			{error && <p className="text-sm text-red-600">{error}</p>}
			{loadError && !error && <p className="text-sm text-yellow-600">{loadError}</p>}
		</div>
	);
}
