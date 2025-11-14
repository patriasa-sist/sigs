"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
	title: string;
	description?: string;
	required?: boolean;
	completed?: boolean;
	children: React.ReactNode;
	className?: string;
}

export function FormSection({
	title,
	description,
	required = false,
	completed = false,
	children,
	className,
}: FormSectionProps) {
	return (
		<Card className={cn("mt-6", className)}>
			<CardHeader className="pb-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<h3 className="text-lg font-semibold">{title}</h3>
							{required && (
								<Badge variant="outline" className="text-red-500 border-red-500">
									Requerido
								</Badge>
							)}
							{!required && (
								<Badge variant="outline" className="text-blue-500 border-blue-500">
									Opcional
								</Badge>
							)}
						</div>
						{description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
					</div>
					{completed && (
						<div className="flex items-center gap-1 text-green-600">
							<CheckCircle2 className="h-5 w-5" />
							<span className="text-sm font-medium">Completo</span>
						</div>
					)}
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}
