import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { FileWarning } from "lucide-react";
import Dashboard from "@/components/siniestros/Dashboard";
import { obtenerSiniestros } from "./actions";

export const metadata = {
	title: "Siniestros - Gestión de Reportes",
	description: "Módulo de siniestros para gestionar reportes de pólizas activas",
};

export default async function SiniestrosPage() {
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

	// Obtener siniestros con estadísticas
	const result = await obtenerSiniestros();

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold mb-2">Gestión de Siniestros</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Registra y administra siniestros reportados en pólizas activas
					</p>
				</div>
				<Button asChild>
					<Link href="/siniestros/nuevo">
						<FileWarning className="mr-2 h-4 w-4" />
						Registrar Siniestro
					</Link>
				</Button>
			</div>

			{result.success ? (
				<Dashboard siniestrosIniciales={result.data.siniestros} statsIniciales={result.data.stats} />
			) : (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
					<p className="font-semibold">Error al cargar datos</p>
					<p className="text-sm mt-1">{result.error}</p>
				</div>
			)}
		</div>
	);
}
