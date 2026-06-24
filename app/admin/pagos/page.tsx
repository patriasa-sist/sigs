import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import RevertirPagoPanel from "@/components/admin/pagos/RevertirPagoPanel";

export const metadata = {
	title: "Administrar Pagos - Administración",
	description: "Corregir la fecha de pago o revertir pagos de cuotas registrados por error.",
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
				<Wallet className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Administrar Pagos</h1>
					<p className="text-gray-500">
						Corregí la fecha de pago de una cuota cargada con un error de tipeo, o revertí por completo un
						pago registrado por error.
					</p>
				</div>
			</div>

			<Card className="border-border bg-secondary/40">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm text-foreground">Corregir fecha de pago</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground space-y-1">
					<p>• Ajusta la fecha de pago de los abonos de una cuota sin borrar nada (no afecta los montos).</p>
					<p>
						• La &quot;F. Pago&quot; de la cuota se recalcula a partir de los abonos. Útil para subsanar
						errores de tipeo de cobranzas.
					</p>
					<p>• Queda registrada en el historial de la póliza con tu usuario y el motivo.</p>
				</CardContent>
			</Card>

			<Card className="border-destructive/30 bg-destructive/5">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm text-destructive">Revertir pago — acción destructiva</CardTitle>
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
