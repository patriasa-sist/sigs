"use client";

import { version } from "@/package.json";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Home,
	LogOut,
	User as UserIcon,
	FileText,
	CheckSquare,
	DollarSign,
	FileWarning,
	Shield,
	Users,
	BarChart3,
	FileSpreadsheet,
	Eye,
	Briefcase,
	Menu,
	type LucideIcon,
} from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetClose,
	SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/login/actions";
import type { Permission } from "@/utils/auth/helpers";

interface Profile {
	id: string;
	email: string;
	role: string;
	full_name?: string;
	cargo?: string;
}

/**
 * Extrae los permisos del JWT del usuario actual.
 * Admin siempre retorna true para cualquier permiso (bypass).
 */
function usePermissions() {
	const [permissions, setPermissions] = useState<string[]>([]);
	const [role, setRole] = useState<string | null>(null);
	const [isTeamLeader, setIsTeamLeader] = useState(false);

	useEffect(() => {
		async function loadPermissions() {
			const supabase = createClient();
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.access_token) return;

			try {
				const payload = session.access_token.split(".")[1];
				const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
				const perms: string[] = decoded.user_permissions || [];
				setPermissions(perms);
				setRole(decoded.user_role || null);

				// Si no tiene polizas.validar, verificar si es líder de equipo
				if (!perms.includes("polizas.validar") && decoded.user_role !== "admin") {
					const { data: { user } } = await supabase.auth.getUser();
					if (user) {
						const { count } = await supabase
							.from("equipo_miembros")
							.select("*", { count: "exact", head: true })
							.eq("user_id", user.id)
							.eq("rol_equipo", "lider");
						setIsTeamLeader((count ?? 0) > 0);
					}
				}
			} catch {
				// JWT decode failed
			}
		}
		loadPermissions();
	}, []);

	const can = (permission: Permission): boolean => {
		if (role === "admin") return true;
		return permissions.includes(permission);
	};

	return { can, role, permissions, isTeamLeader };
}

export function Navbar() {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const supabase = createClient();
	const { can, role, isTeamLeader } = usePermissions();

	useEffect(() => {
		async function getUser() {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				setUser(user);

				if (user) {
					const { data: profileData } = await supabase
						.from("profiles")
						.select("*")
						.eq("id", user.id)
						.single();

					setProfile(profileData);
				}
			} catch (error) {
				console.error("Error fetching user:", error);
			} finally {
				setLoading(false);
			}
		}

		getUser();
	}, [supabase]);

	const handleSignOut = async () => {
		await signOut();
	};

	const getUserInitials = () => {
		if (profile?.full_name) {
			return profile.full_name
				.split(" ")
				.map((name) => name[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		}
		if (user?.email) {
			return user.email.slice(0, 2).toUpperCase();
		}
		return "U";
	};

	const getUserDisplayName = () => {
		return profile?.full_name || user?.email || "Usuario";
	};

	if (loading) {
		return (
			<nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
				<div className="flex items-center h-14 gap-6">
					<div className="h-8 w-32 bg-muted animate-pulse rounded shrink-0"></div>
					<div className="flex-1"></div>
					<div className="h-8 w-8 bg-muted animate-pulse rounded-full"></div>
				</div>
			</nav>
		);
	}

	if (!user) {
		return null;
	}

	// Config única de enlaces — reutilizada en desktop y en el menú móvil
	const navItems: { href: string; label: string; icon: LucideIcon; show: boolean }[] = [
		{ href: "/", label: "Inicio", icon: Home, show: true },
		{ href: "/clientes", label: "Clientes", icon: Users, show: can("clientes.ver") },
		{ href: "/polizas", label: "Pólizas", icon: FileText, show: can("polizas.ver") },
		{ href: "/cobranzas", label: "Cobranza", icon: DollarSign, show: can("cobranzas.ver") },
		{ href: "/siniestros", label: "Siniestros", icon: FileWarning, show: can("siniestros.ver") },
		{
			href: "/gerencia/validacion",
			label: "Validación",
			icon: CheckSquare,
			show: can("polizas.validar") || isTeamLeader,
		},
		{ href: "/auditoria", label: "Auditoría", icon: Eye, show: can("auditoria.ver") },
		{ href: "/rrhh", label: "RRHH", icon: Briefcase, show: can("rrhh.ver") },
		{ href: "/gerencia", label: "Gerencia", icon: BarChart3, show: can("gerencia.ver") },
		{
			href: "/reportes",
			label: "Reportes",
			icon: FileSpreadsheet,
			show: can("gerencia.exportar") || can("gerencia.amlc"),
		},
	];
	const visibleNavItems = navItems.filter((item) => item.show);

	return (
		<nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
			<div className="flex items-center h-14 gap-3 sm:gap-4 lg:gap-6">
				{/* Menú móvil (hamburguesa) — visible por debajo de lg */}
				<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
					<SheetTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden h-9 w-9 shrink-0"
							aria-label="Abrir menú de navegación"
						>
							<Menu className="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-72 p-0 gap-0">
						<SheetHeader className="border-b border-border">
							<SheetTitle className="text-left">Menú</SheetTitle>
						</SheetHeader>
						<nav className="flex flex-col gap-0.5 p-2 overflow-y-auto">
							{visibleNavItems.map((item) => {
								const Icon = item.icon;
								return (
									<SheetClose asChild key={item.href}>
										<Link
											href={item.href}
											className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
										>
											<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
											<span>{item.label}</span>
										</Link>
									</SheetClose>
								);
							})}
						</nav>
					</SheetContent>
				</Sheet>

				{/* Logo */}
				<Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
					<Image
						src="/patria-horizontal.png"
						alt="Patria S.A."
						width={0}
						height={0}
						sizes="120px"
						className="h-8 w-auto"
						priority
					/>
					<span className="text-[10px] text-muted-foreground font-mono leading-none">v{version}</span>
				</Link>

				{/* Nav links — desktop (lg+) */}
				<div className="hidden lg:flex items-center gap-1 flex-1">
					{visibleNavItems.map((item) => {
						const Icon = item.icon;
						return (
							<Link key={item.href} href={item.href}>
								<Button variant="ghost" size="sm" className="gap-2">
									<Icon className="h-4 w-4" />
									<span>{item.label}</span>
								</Button>
							</Link>
						);
					})}
				</div>

				{/* Spacer para empujar el avatar a la derecha en móvil */}
				<div className="flex-1 lg:hidden" />

				{/* User menu */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
							<Avatar className="h-8 w-8">
								<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold tracking-wide">
									{getUserInitials()}
								</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-72" align="end" forceMount>
						{/* Rich header */}
						<div className="px-3 py-3 flex items-center gap-3">
							<Avatar className="h-10 w-10 shrink-0">
								<AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold tracking-wide">
									{getUserInitials()}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-foreground truncate leading-tight">
									{getUserDisplayName()}
								</p>
								<p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
									{user.email}
								</p>
								<div className="flex flex-wrap items-center gap-1.5 mt-1.5">
									{profile?.role && (
										<span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary capitalize leading-none">
											{profile.role}
										</span>
									)}
									{profile?.cargo && (
										<span className="text-[10px] text-muted-foreground truncate">
											{profile.cargo}
										</span>
									)}
								</div>
							</div>
						</div>
						<DropdownMenuSeparator />
						<Link href="/profile">
							<DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
								<UserIcon className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm leading-none">Mi Perfil</p>
									<p className="text-xs text-muted-foreground mt-0.5">Datos personales y comerciales</p>
								</div>
							</DropdownMenuItem>
						</Link>
						{role === "admin" && (
							<Link href="/admin">
								<DropdownMenuItem className="cursor-pointer gap-2.5 py-2">
									<Shield className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm leading-none">Administración</p>
										<p className="text-xs text-muted-foreground mt-0.5">Usuarios, roles y catálogos</p>
									</div>
								</DropdownMenuItem>
							</Link>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="cursor-pointer gap-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/8"
							onClick={handleSignOut}
						>
							<LogOut className="h-4 w-4" />
							<span className="text-sm">Cerrar sesión</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</nav>
	);
}
