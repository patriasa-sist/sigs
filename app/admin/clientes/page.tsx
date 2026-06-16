import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import EliminarClientePanel from "@/components/admin/clientes/EliminarClientePanel";

export const metadata = {
	title: "Eliminar Clientes - Administración",
	description: "Eliminar permanentemente clientes sin pólizas (borrado total e irreversible).",
};

export default async function AdminClientesPage() {
	// Utilidad destructiva: solo administradores (mismo criterio que eliminación nuclear).
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/auth/login");
	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
	if (profile?.role !== "admin") redirect("/unauthorized");

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<Trash2 className="h-8 w-8 text-destructive" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Eliminar Clientes</h1>
					<p className="text-gray-500">
						Borra por completo un cliente y todo su rastro, siempre que no tenga ninguna póliza en el
						sistema.
					</p>
				</div>
			</div>

			<Card className="border-destructive/30 bg-destructive/5">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm text-destructive">Acción destructiva</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-destructive/90 space-y-1">
					<p>
						• Solo se permite si el cliente <strong>no tiene ninguna póliza</strong>: ni como titular ni
						como asegurado en pólizas de terceros. Si la tiene, el borrado queda bloqueado.
					</p>
					<p>
						• Se borra TODO el rastro: datos del cliente, documentos (incluidos los archivos en Storage),
						teléfonos, cónyuge, representantes legales, historial y revisiones de auditoría.
					</p>
					<p>• Es un borrado permanente: no hay deshacer.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Buscar cliente</CardTitle>
				</CardHeader>
				<CardContent>
					<EliminarClientePanel />
				</CardContent>
			</Card>
		</div>
	);
}
