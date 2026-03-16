import { requirePermission } from "@/utils/auth/helpers";
import { obtenerExcepcionesCompletas, obtenerUsuariosOperativos } from "./excepciones/actions";
import { AuditoriaContent } from "@/components/auditoria/AuditoriaContent";

export default async function AuditoriaPage() {
	await requirePermission("auditoria.ver");

	const [excepciones, usuarios] = await Promise.all([
		obtenerExcepcionesCompletas(),
		obtenerUsuariosOperativos(),
	]);

	return (
		<div className="container mx-auto py-8 px-4 max-w-7xl">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
				<p className="text-gray-600 mt-1">
					Gestión de excepciones de documentos y control de cumplimiento
				</p>
			</div>

			<AuditoriaContent
				excepcionesIniciales={excepciones}
				usuarios={usuarios}
			/>
		</div>
	);
}
