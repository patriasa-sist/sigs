import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RegistrarSiniestroForm from "@/components/siniestros/registro/RegistrarSiniestroForm";

export const metadata = {
	title: "Registrar Siniestro - SIGS",
	description: "Formulario de registro de nuevo siniestro",
};

export default async function NuevoSiniestroPage() {
	const supabase = await createClient();

	// Verificar autenticación
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	// Verificar permisos (solo siniestros, comercial o admin)
	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

	if (
		!profile ||
		(profile.role !== "siniestros" && profile.role !== "comercial" && profile.role !== "admin")
	) {
		redirect("/unauthorized");
	}

	return (
		<div className="container mx-auto py-8 px-4">
			{/* Header */}
			<div className="mb-8">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/siniestros">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Siniestros
					</Link>
				</Button>

				<div>
					<h1 className="text-3xl font-bold mb-2">Registrar Nuevo Siniestro</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Completa los 4 pasos del formulario para registrar un siniestro en una póliza activa
					</p>
				</div>
			</div>

			{/* Formulario */}
			<RegistrarSiniestroForm />
		</div>
	);
}
