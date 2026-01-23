import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import ExportarProduccion from "@/components/admin/ExportarProduccion";

export default async function ReportesPage() {
	const supabase = await createClient();

	// Verificar autenticación
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	// Verificar rol admin
	const { data: profile } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", user.id)
		.single();

	if (!profile || profile.role !== "admin") {
		redirect("/unauthorized");
	}

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<FileSpreadsheet className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
					<p className="text-gray-600 mt-1">
						Genera reportes consolidados para análisis y gestión
					</p>
				</div>
			</div>

			{/* Componente de exportación */}
			<ExportarProduccion />
		</div>
	);
}
