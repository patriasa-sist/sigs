"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
	onSearch: (query: string) => void;
	placeholder?: string;
}

export function SearchBar({ onSearch, placeholder }: SearchBarProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => onSearch(searchQuery), 350);
		return () => { if (timer.current) clearTimeout(timer.current); };
	// onSearch no se incluye en deps para evitar re-renders si el padre no memoiza la función
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchQuery]);

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
