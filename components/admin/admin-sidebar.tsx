"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Mail, Shield, FileText, BarChart3, FileSpreadsheet, Building2, Layers, Package, Tag, LayoutDashboard } from "lucide-react";
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
			{
				title: "Panel General",
				href: "/admin/seguros",
				icon: LayoutDashboard,
			},
			{
				title: "Aseguradoras",
				href: "/admin/seguros/aseguradoras",
				icon: Building2,
			},
			{
				title: "Ramos de Seguros",
				href: "/admin/seguros/ramos",
				icon: Layers,
			},
			{
				title: "Productos",
				href: "/admin/seguros/productos",
				icon: Package,
			},
			{
				title: "Categorías",
				href: "/admin/seguros/categorias",
				icon: Tag,
			},
		],
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
					>
						<AccordionTrigger
							className="hover:no-underline py-2 px-2"
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

		</aside>
	);
}
