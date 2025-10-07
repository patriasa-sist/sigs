import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, Tag, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ProfilePage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	// Get user profile
	const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

	// Generate acronym from full name
	const getAcronym = (fullName: string | null) => {
		if (!fullName) return "N/A";
		return fullName
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase())
			.join("");
	};

	const getRoleBadgeVariant = (role: string) => {
		switch (role) {
			case "admin":
				return "default";
			case "usuario":
				return "secondary";
			case "agente":
				return "outline";
			case "comercial":
				return "outline";
			case "invitado":
				return "secondary";
			default:
				return "secondary";
		}
	};

	return (
		<div className="flex-1 w-full flex flex-col gap-6 max-w-4xl mx-auto py-8 px-4">
			{/* Header */}
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
					<p className="text-gray-600 mt-1">Información de tu cuenta</p>
				</div>
				<Link href="/">
					<Button variant="outline" className="flex items-center gap-2">
						<ArrowLeft className="h-4 w-4" />
						Volver al Dashboard
					</Button>
				</Link>
			</div>

			{/* Profile Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Información Personal
					</CardTitle>
					<CardDescription>Detalles de tu cuenta en el sistema</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Acronym Display */}
					<div className="flex items-center justify-center py-6">
						<div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
							<span className="text-3xl font-bold text-white">
								{getAcronym(profile?.full_name)}
							</span>
						</div>
					</div>

					{/* User Details */}
					<div className="grid gap-4">
						{/* Full Name */}
						<div className="flex items-start gap-3 p-4 rounded-lg border bg-gray-50/50">
							<User className="h-5 w-5 text-gray-600 mt-0.5" />
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600">Nombre Completo</p>
								<p className="text-base text-gray-900 mt-1">
									{profile?.full_name || "No especificado"}
								</p>
							</div>
						</div>

						{/* Email */}
						<div className="flex items-start gap-3 p-4 rounded-lg border bg-gray-50/50">
							<Mail className="h-5 w-5 text-gray-600 mt-0.5" />
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600">Correo Electrónico</p>
								<p className="text-base text-gray-900 mt-1">{profile?.email}</p>
							</div>
						</div>

						{/* Role */}
						<div className="flex items-start gap-3 p-4 rounded-lg border bg-gray-50/50">
							<Shield className="h-5 w-5 text-gray-600 mt-0.5" />
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600">Rol</p>
								<div className="mt-1">
									<Badge variant={getRoleBadgeVariant(profile?.role)} className="capitalize">
										{profile?.role}
									</Badge>
								</div>
							</div>
						</div>

						{/* Acronym */}
						<div className="flex items-start gap-3 p-4 rounded-lg border bg-gray-50/50">
							<Tag className="h-5 w-5 text-gray-600 mt-0.5" />
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600">Acrónimo</p>
								<p className="text-base text-gray-900 mt-1 font-semibold">
									{getAcronym(profile?.full_name)}
								</p>
							</div>
						</div>
					</div>

					{/* Account Info */}
					<div className="pt-4 border-t">
						<p className="text-xs text-gray-500">
							Cuenta creada el {new Date(profile?.created_at).toLocaleDateString("es-ES", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
