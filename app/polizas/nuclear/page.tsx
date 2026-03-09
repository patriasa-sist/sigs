import { requirePermission } from "@/utils/auth/helpers";
import EliminacionNuclear from "@/components/polizas/EliminacionNuclear";

export default async function EliminacionNuclearPage() {
	await requirePermission("admin.usuarios");

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2 text-destructive">
					Eliminación Nuclear de Póliza
				</h1>
				<p className="text-muted-foreground">
					Herramienta administrativa para eliminar completamente una póliza y
					todos sus datos asociados. Esta operación es irreversible.
				</p>
			</div>
			<EliminacionNuclear />
		</div>
	);
}
