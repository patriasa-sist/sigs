import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import VentanasExcepcionPanel from "@/components/admin/excepciones/VentanasExcepcionPanel";

export const metadata = {
	title: "Ventanas de Excepción - Administración",
	description: "Gestionar ventanas temporales de excepción de documentos para carga retroactiva de clientes.",
};

export default async function AdminExcepcionesPage() {
	// Operación crítica: solo administradores.
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
				<CalendarClock className="h-8 w-8 text-primary" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Ventanas de Excepción de Documentos</h1>
					<p className="text-gray-500">
						Permití cargar clientes sin sus documentos obligatorios durante una ventana de tiempo acotada,
						por rol o por usuario, sin tocar la base de datos.
					</p>
				</div>
			</div>

			<Card className="border-border bg-secondary/40">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm text-foreground">Cómo funciona</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground space-y-1">
					<p>
						• Una ventana exime de los documentos obligatorios a los roles o usuarios cubiertos, hasta su
						fecha de vencimiento.
					</p>
					<p>
						• No es consumible: sirve para cargar lotes. Los clientes creados bajo una ventana se marcan
						como
						<strong> carga retroactiva</strong>, para que auditoría no los cuente como incidencias.
					</p>
					<p>
						• Se auto-expira por fecha. Podés cerrarla antes, reabrirla/extenderla o eliminarla (si nadie se
						cargó bajo ella).
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Gestionar ventanas</CardTitle>
				</CardHeader>
				<CardContent>
					<VentanasExcepcionPanel />
				</CardContent>
			</Card>
		</div>
	);
}
