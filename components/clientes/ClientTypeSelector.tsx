"use client";

import { ClientType } from "@/types/clientForm";
import { Card } from "@/components/ui/card";
import { User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientTypeSelectorProps {
	selectedType: ClientType | null;
	onSelect: (type: ClientType) => void;
}

export function ClientTypeSelector({ selectedType, onSelect }: ClientTypeSelectorProps) {
	return (
		<Card className="p-6">
			<h2 className="text-lg font-semibold mb-4 text-center">Tipo de Cliente</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Natural Client Button */}
				<button
					type="button"
					onClick={() => onSelect("natural")}
					className={cn(
						"flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all",
						"hover:shadow-md hover:scale-105",
						selectedType === "natural"
							? "border-blue-500 bg-blue-50 shadow-md"
							: "border-gray-200 bg-white hover:border-blue-300"
					)}
				>
					<User
						className={cn(
							"h-12 w-12 mb-3",
							selectedType === "natural" ? "text-blue-500" : "text-gray-400"
						)}
					/>
					<span
						className={cn(
							"text-base font-semibold",
							selectedType === "natural" ? "text-blue-700" : "text-gray-700"
						)}
					>
						Persona Natural
					</span>
					<span className="text-xs text-gray-500 mt-1 text-center">
						Individuos y personas físicas
					</span>
				</button>

				{/* Juridic Client Button */}
				<button
					type="button"
					onClick={() => onSelect("juridico")}
					className={cn(
						"flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all",
						"hover:shadow-md hover:scale-105",
						selectedType === "juridico"
							? "border-blue-500 bg-blue-50 shadow-md"
							: "border-gray-200 bg-white hover:border-blue-300"
					)}
				>
					<Building2
						className={cn(
							"h-12 w-12 mb-3",
							selectedType === "juridico" ? "text-blue-500" : "text-gray-400"
						)}
					/>
					<span
						className={cn(
							"text-base font-semibold",
							selectedType === "juridico" ? "text-blue-700" : "text-gray-700"
						)}
					>
						Persona Jurídica
					</span>
					<span className="text-xs text-gray-500 mt-1 text-center">
						Empresas y organizaciones
					</span>
				</button>
			</div>
		</Card>
	);
}
