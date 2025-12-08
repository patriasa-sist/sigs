"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, LogOut, User as UserIcon, FileText, CheckSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/login/actions";

interface Profile {
	id: string;
	email: string;
	role: string;
	full_name?: string;
}

export function Navbar() {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const supabase = createClient();

	useEffect(() => {
		async function getUser() {
			try {
				const { data: { user } } = await supabase.auth.getUser();
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
				.map(name => name[0])
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
			<nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center space-x-4">
						<div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
					</div>
					<div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
				</div>
			</nav>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
			<div className="flex justify-between items-center h-16">
				<div className="flex items-center space-x-4">
					<Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
						<Image
							src="/patria-horizontal.png"
							alt="Patria S.A."
							width={120}
							height={32}
							className="h-8 w-auto"
						/>
					</Link>
				</div>

				<div className="flex items-center space-x-4">
					<Link href="/">
						<Button variant="ghost" size="sm" className="flex items-center space-x-2">
							<Home className="h-4 w-4" />
							<span>Dashboard</span>
						</Button>
					</Link>

					<Link href="/polizas">
						<Button variant="ghost" size="sm" className="flex items-center space-x-2">
							<FileText className="h-4 w-4" />
							<span>Pólizas</span>
						</Button>
					</Link>

					{/* Mostrar Validación solo para admin y usuario */}
					{(profile?.role === "admin" || profile?.role === "usuario") && (
						<Link href="/gerencia/validacion">
							<Button variant="ghost" size="sm" className="flex items-center space-x-2">
								<CheckSquare className="h-4 w-4" />
								<span>Validación</span>
							</Button>
						</Link>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="relative h-8 w-8 rounded-full">
								<Avatar className="h-8 w-8">
									<AvatarFallback className="bg-blue-100 text-blue-600">
										{getUserInitials()}
									</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-56" align="end" forceMount>
							<DropdownMenuLabel className="font-normal">
								<div className="flex flex-col space-y-1">
									<p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
									<p className="text-xs leading-none text-muted-foreground">
										{user.email}
									</p>
									{profile?.role && (
										<p className="text-xs leading-none text-muted-foreground capitalize">
											Rol: {profile.role}
										</p>
									)}
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<Link href="/profile">
								<DropdownMenuItem className="cursor-pointer">
									<UserIcon className="mr-2 h-4 w-4" />
									<span>Perfil</span>
								</DropdownMenuItem>
							</Link>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="cursor-pointer text-red-600 focus:text-red-600"
								onClick={handleSignOut}
							>
								<LogOut className="mr-2 h-4 w-4" />
								<span>Cerrar sesión</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</nav>
	);
}
