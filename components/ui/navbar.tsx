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
	ChevronDown,
	FileSpreadsheet,
	Eye,
} from "lucide-react";
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
				setPermissions(decoded.user_permissions || []);
				setRole(decoded.user_role || null);
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

	return { can, role, permissions };
}

export function Navbar() {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const supabase = createClient();
	const { can, role } = usePermissions();

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

	return (
		<nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
			<div className="flex items-center h-14 gap-6">
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

				{/* Nav links */}
				<div className="flex items-center gap-1 flex-1">
					<Link href="/">
						<Button variant="ghost" size="sm" className="gap-2">
							<Home className="h-4 w-4" />
							<span>Inicio</span>
						</Button>
					</Link>

					{can("clientes.ver") && (
						<Link href="/clientes">
							<Button variant="ghost" size="sm" className="gap-2">
								<Users className="h-4 w-4" />
								<span>Clientes</span>
							</Button>
						</Link>
					)}

					{can("polizas.ver") && (
						<Link href="/polizas">
							<Button variant="ghost" size="sm" className="gap-2">
								<FileText className="h-4 w-4" />
								<span>Pólizas</span>
							</Button>
						</Link>
					)}

					{can("cobranzas.ver") && (
						<Link href="/cobranzas">
							<Button variant="ghost" size="sm" className="gap-2">
								<DollarSign className="h-4 w-4" />
								<span>Cobranza</span>
							</Button>
						</Link>
					)}

					{can("siniestros.ver") && (
						<Link href="/siniestros">
							<Button variant="ghost" size="sm" className="gap-2">
								<FileWarning className="h-4 w-4" />
								<span>Siniestros</span>
							</Button>
						</Link>
					)}

					{can("polizas.validar") && (
						<Link href="/gerencia/validacion">
							<Button variant="ghost" size="sm" className="gap-2">
								<CheckSquare className="h-4 w-4" />
								<span>Validación</span>
							</Button>
						</Link>
					)}

					{can("auditoria.ver") && (
						<Link href="/auditoria">
							<Button variant="ghost" size="sm" className="gap-2">
								<Eye className="h-4 w-4" />
								<span>Auditoría</span>
							</Button>
						</Link>
					)}

					{(can("gerencia.ver") || can("gerencia.exportar")) && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="gap-2">
									<BarChart3 className="h-4 w-4" />
									<span>Gerencia</span>
									<ChevronDown className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{can("gerencia.ver") && (
									<Link href="/gerencia">
										<DropdownMenuItem className="cursor-pointer">
											<BarChart3 className="mr-2 h-4 w-4" />
											<span>Dashboard</span>
										</DropdownMenuItem>
									</Link>
								)}
								{can("gerencia.exportar") && (
									<Link href="/gerencia/reportes">
										<DropdownMenuItem className="cursor-pointer">
											<FileSpreadsheet className="mr-2 h-4 w-4" />
											<span>Reportes</span>
										</DropdownMenuItem>
									</Link>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>

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
