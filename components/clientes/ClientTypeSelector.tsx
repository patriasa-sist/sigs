"use client";

import { ClientType } from "@/types/clientForm";
import { User, Building2, Briefcase, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientTypeSelectorProps {
	selectedType: ClientType | null;
	onSelect: (type: ClientType) => void;
}

const CLIENT_OPTIONS: {
	type: ClientType;
	label: string;
	description: string;
	icon: React.ElementType;
	detail: string;
}[] = [
	{
		type: "natural",
		label: "Persona Natural",
		description: "Individuos y personas físicas",
		icon: User,
		detail: "CI · Pasaporte · CEX",
	},
	{
		type: "unipersonal",
		label: "Unipersonal",
		description: "Emprendimiento individual",
		icon: Briefcase,
		detail: "NIT · Matrícula de comercio",
	},
	{
		type: "juridica",
		label: "Persona Jurídica",
		description: "Empresas y organizaciones",
		icon: Building2,
		detail: "SRL · SA · SCO y más",
	},
];

export function ClientTypeSelector({ selectedType, onSelect }: ClientTypeSelectorProps) {
	return (
		<div className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] overflow-hidden shadow-sm">
			{/* Header */}
			<div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-3">
				<div className="w-[3px] h-5 rounded-full bg-[#004F69]" />
				<h2 className="text-base font-semibold text-[#1E293B]">Tipo de Cliente</h2>
				<span className="ml-auto text-sm text-slate-400">Seleccione una categoría</span>
			</div>

			{/* Options grid */}
			<div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
				{CLIENT_OPTIONS.map(({ type, label, description, icon: Icon, detail }) => {
					const isSelected = selectedType === type;
					return (
						<button
							key={type}
							type="button"
							onClick={() => onSelect(type)}
							className={cn(
								"group relative flex flex-col items-start text-left p-5 rounded-lg border-2 transition-all duration-200 outline-none",
								"focus-visible:ring-2 focus-visible:ring-[#004F69]/30 focus-visible:ring-offset-1",
								isSelected
									? "border-[#004F69] bg-[#004F69]/[0.04] shadow-sm"
									: "border-slate-200 bg-white hover:border-[#004F69]/50 hover:bg-slate-50",
							)}
						>
							{/* Radio indicator */}
							<div
								className={cn(
									"absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
									isSelected
										? "border-[#004F69] bg-[#004F69]"
										: "border-slate-300 bg-white group-hover:border-[#004F69]/60",
								)}
							>
								{isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
							</div>

							{/* Icon container — 48px */}
							<div
								className={cn(
									"w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-200",
									isSelected
										? "bg-[#004F69] text-white"
										: "bg-slate-100 text-slate-500 group-hover:bg-[#004F69]/10 group-hover:text-[#004F69]",
								)}
							>
								<Icon className="w-6 h-6" strokeWidth={1.75} />
							</div>

							{/* Label */}
							<span
								className={cn(
									"text-[0.9375rem] font-semibold leading-snug transition-colors duration-200",
									isSelected ? "text-[#004F69]" : "text-[#1E293B]",
								)}
							>
								{label}
							</span>

							{/* Description */}
							<span className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</span>

							{/* Detail pill */}
							<span
								className={cn(
									"mt-4 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors duration-200",
									isSelected
										? "bg-[#004F69]/8 text-[#004F69] border-[#004F69]/25"
										: "bg-slate-100 text-slate-500 border-slate-200",
								)}
							>
								{detail}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
