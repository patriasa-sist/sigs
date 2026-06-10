import { requirePermission } from "@/utils/auth/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import EliminarAnexoPanel from "@/components/admin/anexos/EliminarAnexoPanel";

export const metadata = {
	title: "Eliminar Anexos - Administración",
	description: "Eliminar anexos de pólizas completamente (reversión de errores).",
};

export default async function AdminAnexosPage() {
	await requirePermission("anexos.eliminar");

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<Trash2 className="h-8 w-8 text-destructive" />
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Eliminar Anexos</h1>
					<p className="text-gray-500">
						Reversión de anexos creados por error. Si el anexo es una anulación validada, la póliza se
						reactiva automáticamente.
					</p>
				</div>
			</div>

			<Card className="border-destructive/30 bg-destructive/5">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm text-destructive">Acción destructiva</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-destructive/90 space-y-1">
					<p>• La eliminación borra el anexo, sus pagos, documentos y archivos físicos en Storage.</p>
					<p>
						• Si el anexo es una anulación activa, la póliza vuelve al estado <strong>activa</strong>.
					</p>
					<p>• La operación queda registrada en el historial de la póliza con tu usuario y el motivo.</p>
					<p>• No hay deshacer — verificá bien antes de confirmar.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Buscar anexo</CardTitle>
				</CardHeader>
				<CardContent>
					<EliminarAnexoPanel />
				</CardContent>
			</Card>
		</div>
	);
}
