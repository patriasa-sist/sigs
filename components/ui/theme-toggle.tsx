"use client";

import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPCIONES = [
	{ value: "light", label: "Claro", icon: Sun },
	{ value: "dark", label: "Oscuro", icon: Moon },
	{ value: "system", label: "Sistema", icon: Monitor },
] as const;

export function ThemeToggle() {
	// El ícono del trigger se resuelve por CSS (dark:) y el contenido del
	// dropdown solo se monta al abrirlo (post-hidratación), así que no hace
	// falta guard de "mounted" para evitar mismatch SSR.
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Cambiar tema">
					<Sun className="h-[18px] w-[18px] dark:hidden" />
					<Moon className="hidden h-[18px] w-[18px] dark:block" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36">
				{OPCIONES.map(({ value, label, icon: Icon }) => (
					<DropdownMenuItem key={value} className="cursor-pointer gap-2" onClick={() => setTheme(value)}>
						<Icon className="h-4 w-4 text-muted-foreground" />
						<span className="flex-1">{label}</span>
						{theme === value && <Check className="h-4 w-4 text-muted-foreground" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
