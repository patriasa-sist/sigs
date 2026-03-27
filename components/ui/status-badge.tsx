import { cn } from "@/lib/utils";

// § 2.2 of DESIGN_SYSTEM.md — single source of truth for all status colors
export const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
	pendiente:  { className: "bg-amber-50  text-amber-800  border-amber-200",  label: "Pendiente"  },
	activa:     { className: "bg-teal-50   text-teal-800   border-teal-200",   label: "Activa"     },
	vencida:    { className: "bg-rose-50   text-rose-800   border-rose-200",   label: "Vencida"    },
	cancelada:  { className: "bg-slate-100 text-slate-600  border-slate-200",  label: "Cancelada"  },
	renovada:   { className: "bg-sky-50    text-sky-800    border-sky-200",    label: "Renovada"   },
	anulada:    { className: "bg-red-50    text-red-800    border-red-200",    label: "Anulada"    },
	rechazada:  { className: "bg-orange-50 text-orange-800 border-orange-200", label: "Rechazada"  },
};

interface StatusBadgeProps {
	status: string;
	className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
	const config = STATUS_CONFIG[status] ?? {
		className: "bg-slate-100 text-slate-600 border-slate-200",
		label: status,
	};

	return (
		<span
			className={cn(
				"inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
				config.className,
				className
			)}
		>
			{config.label}
		</span>
	);
}
