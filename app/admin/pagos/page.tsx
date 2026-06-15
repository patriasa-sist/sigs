import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Undo2 } from "lucide-react";
import RevertirPagoPanel from "@/components/admin/pagos/RevertirPagoPanel";

export const metadata = {
	title: "Revertir Pagos - Administración",
	description: "Revertir pagos de cuotas registrados por error (borrado permanente).",
};

export default async function AdminPagosPage() {
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
				<Undo2 className="h-8 w-8 text-destructive" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Revertir Pagos</h1>
					<p className="text-gray-500">
						Borra por completo el pago de una cuota registrado por error y la devuelve a estado pendiente.
					</p>
				</div>
			</div>

			<Card className="border-destructive/30 bg-destructive/5">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm text-destructive">Acción destructiva</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-destructive/90 space-y-1">
					<p>
						• Revertir una cuota borra TODOS sus abonos, comprobantes (incluyendo los archivos en Storage) y
						notas.
					</p>
					<p>
						• La cuota vuelve al estado <strong>pendiente</strong>, como si nunca se hubiera cobrado.
					</p>
					<p>• Es un borrado permanente: no hay deshacer.</p>
					<p>• La operación queda registrada en el historial de la póliza con tu usuario y el motivo.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Buscar póliza</CardTitle>
				</CardHeader>
				<CardContent>
					<RevertirPagoPanel />
				</CardContent>
			</Card>
		</div>
	);
}
