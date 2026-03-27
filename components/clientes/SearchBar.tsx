"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
	onSearch: (query: string) => void;
	placeholder?: string;
}

export function SearchBar({ onSearch, placeholder }: SearchBarProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			onSearch(searchQuery);
		}
	};

	const handleClear = () => {
		setSearchQuery("");
		onSearch("");
	};

	return (
		<div className="relative">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
			<Input
				type="text"
				placeholder={placeholder || "Buscar por carnet, NIT, póliza, nombre o beneficiario…"}
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				onKeyDown={handleKeyDown}
				className="pl-9 pr-9"
			/>
			{searchQuery && (
				<button
					onClick={handleClear}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Limpiar búsqueda"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}
