"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";

export type ExecutiveUser = {
	id: string;
	full_name: string;
	email: string;
	role: string;
};

type ExecutiveDropdownProps = {
	value: string | undefined;
	onValueChange: (value: string) => void;
	error?: string;
	label?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	className?: string;
	showRole?: boolean;
};

export function ExecutiveDropdown({
	value,
	onValueChange,
	error,
	label = "Ejecutivo comercial",
	placeholder = "Seleccione un ejecutivo",
	required = true,
	disabled = false,
	className,
	showRole = true,
}: ExecutiveDropdownProps) {
	const [users, setUsers] = useState<ExecutiveUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		async function loadExecutives() {
			try {
				setIsLoading(true);
				setLoadError(null);

				const supabase = createClient();

				// Intentar usar la función RPC primero, si no existe, usar query directo
				const result = await supabase.rpc("get_usuarios_comerciales").then(
					(result) => result,
					// Fallback a query directo si la función no existe
					() =>
						supabase
							.from("profiles")
							.select("id, full_name, email, role")
							.in("role", ["comercial", "admin", "usuario"])
							.order("full_name")
				);

				const { data: usersData, error: usersError } = result;

				if (usersError) {
					console.error("Error cargando ejecutivos:", usersError);
					setLoadError("Error al cargar ejecutivos");
					return;
				}

				setUsers(usersData || []);
			} catch (error) {
				console.error("Error inesperado cargando ejecutivos:", error);
				setLoadError("Error inesperado al cargar ejecutivos");
			} finally {
				setIsLoading(false);
			}
		}

		loadExecutives();
	}, []);

	return (
		<div className={`space-y-2 ${className || ""}`}>
			{label && (
				<Label htmlFor="executive">
					{label} {required && <span className="text-red-500">*</span>}
				</Label>
			)}
			<Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
				<SelectTrigger className={error ? "border-red-500" : ""}>
					<SelectValue
						placeholder={
							isLoading ? "Cargando ejecutivos..." : loadError ? "Error al cargar" : placeholder
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{users.length === 0 && !isLoading && !loadError && (
						<SelectItem value="no-users" disabled>
							No hay ejecutivos disponibles
						</SelectItem>
					)}
					{users.map((user) => (
						<SelectItem key={user.id} value={user.id}>
							{user.full_name}
							{showRole && ` (${user.role})`}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && <p className="text-sm text-red-600">{error}</p>}
			{loadError && !error && <p className="text-sm text-yellow-600">{loadError}</p>}
		</div>
	);
}
