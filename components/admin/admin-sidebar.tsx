"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Mail, Shield, FileText, BarChart3, FileSpreadsheet } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const navigationItems = [
	{
		title: "Administración de Usuarios",
		icon: Users,
		items: [
			{
				title: "Gestionar Usuarios",
				href: "/admin/users",
				icon: Users,
			},
			{
				title: "Gestionar Roles",
				href: "/admin/roles",
				icon: Shield,
			},
			{
				title: "Gestionar Invitaciones",
				href: "/admin/invitations",
				icon: Mail,
			},
		],
	},
	{
		title: "Reportes",
		icon: BarChart3,
		items: [
			{
				title: "Producción Mensual",
				href: "/admin/reportes",
				icon: FileSpreadsheet,
			},
		],
	},
	{
		title: "Seguros",
		icon: FileText,
		items: [
			// Placeholder for future items
			// {
			// 	title: "Gestionar Ramos",
			// 	href: "/admin/seguros/ramos",
			// 	icon: FileText,
			// },
			// {
			// 	title: "Crear Backup",
			// 	href: "/admin/seguros/backup",
			// 	icon: Database,
			// },
		],
		disabled: true,
	},
];

export function AdminSidebar() {
	const pathname = usePathname();

	return (
		<aside className="w-64 border-r bg-muted/40 p-4">
			<div className="mb-6">
				<h2 className="text-lg font-semibold px-4">Panel de Administración</h2>
			</div>

			<Accordion type="single" collapsible defaultValue="item-0" className="space-y-2">
				{navigationItems.map((section, index) => (
					<AccordionItem
						key={index}
						value={`item-${index}`}
						className="border rounded-lg px-2"
						disabled={section.disabled}
					>
						<AccordionTrigger
							className={cn(
								"hover:no-underline py-2 px-2",
								section.disabled && "opacity-50 cursor-not-allowed"
							)}
						>
							<div className="flex items-center gap-2">
								<section.icon className="h-4 w-4" />
								<span className="text-sm font-medium">{section.title}</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="pb-2 pt-1">
							<div className="space-y-1">
								{section.items.map((item) => {
									const Icon = item.icon;
									const isActive = pathname === item.href;

									return (
										<Link
											key={item.href}
											href={item.href}
											prefetch={true}
											className={cn(
												"flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
												isActive
													? "bg-primary text-primary-foreground"
													: "hover:bg-accent hover:text-accent-foreground"
											)}
										>
											<Icon className="h-4 w-4" />
											<span>{item.title}</span>
										</Link>
									);
								})}
							</div>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>

			{/* Coming Soon Notice */}
			<div className="mt-6 px-4">
				<div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
					<p className="text-xs text-blue-700 dark:text-blue-300">
						<strong>Próximamente:</strong> Gestión de seguros y ramos
					</p>
				</div>
			</div>
		</aside>
	);
}
