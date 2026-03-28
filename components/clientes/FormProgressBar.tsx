"use client";

import { ClientType } from "@/types/clientForm";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
	number: number;
	label: string;
	completed: boolean;
	active: boolean;
}

interface FormProgressBarProps {
	currentStep: number; // 1-4
	clientType: ClientType | null;
	completedSections: {
		tier1?: boolean;
		tier2?: boolean;
		tier3?: boolean;
		company?: boolean;
		representatives?: boolean;
	};
}

export function FormProgressBar({ currentStep, clientType, completedSections }: FormProgressBarProps) {
	const getSteps = (): Step[] => {
		if (!clientType) {
			return [
				{ number: 1, label: "Tipo", completed: false, active: true },
				{ number: 2, label: "Datos", completed: false, active: false },
				{ number: 3, label: "Adicional", completed: false, active: false },
				{ number: 4, label: "Guardar", completed: false, active: false },
			];
		}

		if (clientType === "natural") {
			return [
				{ number: 1, label: "Tipo", completed: true, active: currentStep === 1 },
				{
					number: 2,
					label: "Datos Básicos",
					completed: completedSections.tier1 || false,
					active: currentStep === 2,
				},
				{
					number: 3,
					label: "Datos Adicionales",
					completed: (completedSections.tier2 && completedSections.tier3) || false,
					active: currentStep === 3,
				},
				{ number: 4, label: "Guardar", completed: false, active: currentStep === 4 },
			];
		} else {
			return [
				{ number: 1, label: "Tipo", completed: true, active: currentStep === 1 },
				{
					number: 2,
					label: "Datos Empresa",
					completed: completedSections.company || false,
					active: currentStep === 2,
				},
				{
					number: 3,
					label: "Representantes",
					completed: completedSections.representatives || false,
					active: currentStep === 3,
				},
				{ number: 4, label: "Guardar", completed: false, active: currentStep === 4 },
			];
		}
	};

	const steps = getSteps();

	return (
		<div className="w-full py-6">
			<div className="relative flex items-start justify-between max-w-xl mx-auto px-6">
				{/* Background track — 2px, slate-300 para visibilidad */}
				<div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-300" aria-hidden="true" />

				{/* Progress fill — petrol teal, animado */}
				{(() => {
					const completedCount = steps.filter(
						(s, i) => i < steps.length - 1 && (s.completed || s.active),
					).length;
					const totalSegments = steps.length - 1;
					const fillPercent = totalSegments > 0 ? (completedCount / totalSegments) * 100 : 0;
					return (
						<div
							className="absolute top-5 left-6 h-0.5 bg-[#004F69] transition-all duration-500"
							style={{ width: `calc(${fillPercent}% * (100% - 3rem) / 100%)` }}
							aria-hidden="true"
						/>
					);
				})()}

				{steps.map((step) => (
					<div key={step.number} className="relative flex flex-col items-center z-10 gap-2">
						{/* Step bubble — 40px, contraste alto */}
						<div
							className={cn(
								"w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 text-sm font-bold select-none",
								step.completed
									? "bg-[#0D9488] text-white shadow-sm"
									: step.active
										? "bg-[#004F69] text-white shadow-md ring-4 ring-[#004F69]/20"
										: "bg-white text-slate-400 border-2 border-slate-300",
							)}
						>
							{step.completed ? <Check className="w-4 h-4" strokeWidth={3} /> : step.number}
						</div>

						{/* Label — 12px, peso medium, contraste legible */}
						<span
							className={cn(
								"text-xs font-medium text-center leading-tight max-w-[80px]",
								step.completed
									? "text-[#0D9488]"
									: step.active
										? "text-[#004F69] font-semibold"
										: "text-slate-400",
							)}
						>
							{step.label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
