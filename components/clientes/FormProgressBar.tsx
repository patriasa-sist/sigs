"use client";

import { ClientType } from "@/types/clientForm";
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
	// Generate steps based on client type
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
			// juridico
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
		<div className="w-full py-8">
			<div className="flex items-center justify-center">
				{steps.map((step, index) => (
					<div key={step.number} className="flex items-center">
						{/* Step Circle */}
						<div className="flex flex-col items-center">
							<div
								className={cn(
									"w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
									step.completed
										? "bg-green-500 text-white"
										: step.active
											? "bg-blue-500 text-white"
											: "bg-gray-200 text-gray-500"
								)}
							>
								{step.completed ? (
									<svg
										className="w-5 h-5"
										fill="none"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path d="M5 13l4 4L19 7"></path>
									</svg>
								) : (
									step.number
								)}
							</div>
							<span
								className={cn(
									"text-xs mt-2 text-center font-medium",
									step.active ? "text-blue-600" : "text-gray-500"
								)}
							>
								{step.label}
							</span>
						</div>

						{/* Connecting Line */}
						{index < steps.length - 1 && (
							<div
								className={cn(
									"w-16 h-1 mx-2 transition-all",
									steps[index + 1].completed || steps[index + 1].active
										? "bg-blue-500"
										: "bg-gray-200"
								)}
							/>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
