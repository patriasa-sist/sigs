"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface FormSectionProps {
	title: string;
	description?: string;
	required?: boolean;
	completed?: boolean;
	children: React.ReactNode;
	className?: string;
	sectionNumber?: number;
}

export function FormSection({
	title,
	description,
	required = false,
	completed = false,
	children,
	className,
	sectionNumber,
}: FormSectionProps) {
	return (
		<div
			className={cn(
				"rounded-lg border bg-white shadow-sm transition-all duration-200",
				completed ? "border-[#0D9488]/40" : "border-[#CBD5E1]",
				className,
			)}
		>
			{/* Section header */}
			<div className="px-5 pt-5 pb-4 border-b border-[#E2E8F0] flex items-start justify-between gap-4">
				<div className="flex items-start gap-3 min-w-0">
					{sectionNumber !== undefined && (
						<span
							className={cn(
								"flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 transition-colors duration-200",
								completed ? "bg-[#0D9488] text-white" : "bg-[#004F69]/10 text-[#004F69]",
							)}
						>
							{completed ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : sectionNumber}
						</span>
					)}
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-[0.9375rem] font-semibold text-[#1E293B] leading-snug">{title}</h3>
							<span
								className={cn(
									"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase border",
									required
										? "bg-rose-50 text-rose-700 border-rose-200"
										: "bg-[#EDF0F5] text-[#475569] border-[#E2E8F0]",
								)}
							>
								{required ? "Requerido" : "Opcional"}
							</span>
						</div>
						{description && (
							<p className="text-[0.8125rem] text-[#64748B] mt-0.5 leading-relaxed">{description}</p>
						)}
					</div>
				</div>

				{completed && (
					<div className="flex-shrink-0 flex items-center gap-1.5 text-[#0D9488]">
						<div className="w-5 h-5 rounded-full bg-[#0D9488]/10 flex items-center justify-center">
							<Check className="w-3 h-3" strokeWidth={2.5} />
						</div>
						<span className="text-[0.8125rem] font-medium whitespace-nowrap">Completo</span>
					</div>
				)}
			</div>

			{/* Section content */}
			<div className="px-5 pt-5 pb-5">{children}</div>
		</div>
	);
}
