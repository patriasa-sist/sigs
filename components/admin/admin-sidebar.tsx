"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Users, Mail, Shield, Lock, UsersRound, ArrowRightLeft,
	BarChart3, Building2, Layers, Package, Tag, LayoutDashboard,
	ChevronLeft, Settings, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationGroups = [
	{
		label: "Usuarios y Acceso",
		items: [
			{ href: "/admin/users", icon: Users, label: "Usuarios" },
			{ href: "/admin/roles", icon: Shield, label: "Roles" },
			{ href: "/admin/invitations", icon: Mail, label: "Invitaciones" },
			{ href: "/admin/permisos", icon: Lock, label: "Permisos" },
		],
	},
	{
		label: "Equipos y Datos",
		items: [
			{ href: "/admin/equipos", icon: UsersRound, label: "Equipos" },
			{ href: "/admin/transferencias", icon: ArrowRightLeft, label: "Transferencias" },
			{ href: "/admin/dashboard-equipos", icon: BarChart3, label: "Dashboard Equipos" },
		],
	},
	{
		label: "Catálogos de Seguros",
		items: [
			{ href: "/admin/seguros", icon: LayoutDashboard, label: "Panel General" },
			{ href: "/admin/seguros/aseguradoras", icon: Building2, label: "Aseguradoras" },
			{ href: "/admin/seguros/ramos", icon: Layers, label: "Ramos" },
			{ href: "/admin/seguros/categorias", icon: Tag, label: "Categorías" },
			{ href: "/admin/seguros/productos", icon: Package, label: "Productos" },
		],
	},
	{
		label: "Gestión Comercial",
		items: [
			{ href: "/admin/directores-cartera", icon: UserCircle, label: "Directores de Cartera" },
		],
	},
];

export function AdminSidebar() {
	const pathname = usePathname();

	return (
		<aside className="w-60 shrink-0 flex flex-col bg-card border-r border-border overflow-y-auto">
			{/* Header */}
			<div className="px-4 py-4 border-b border-border">
				<div className="flex items-center gap-2 mb-3">
					<Settings className="h-4 w-4 text-primary" />
					<span className="text-sm font-semibold text-foreground">Administración</span>
				</div>
				<Link
					href="/"
					className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="h-3 w-3" />
					Volver al sistema
				</Link>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 space-y-5">
				{navigationGroups.map((group) => (
					<div key={group.label}>
						<p className="px-2 mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{group.label}
						</p>
						<div className="space-y-0.5">
							{group.items.map((item) => {
								const Icon = item.icon;
								const isActive = pathname === item.href;
								return (
									<Link
										key={item.href}
										href={item.href}
										prefetch={true}
										className={cn(
											"flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
											isActive
												? "bg-primary/10 text-primary font-medium"
												: "text-muted-foreground hover:text-foreground hover:bg-secondary"
										)}
									>
										<Icon className="h-4 w-4 shrink-0" />
										<span>{item.label}</span>
									</Link>
								);
							})}
						</div>
					</div>
				))}
			</nav>
		</aside>
	);
}
