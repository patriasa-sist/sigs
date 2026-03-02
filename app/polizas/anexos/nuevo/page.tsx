import { Suspense } from "react";
import { NuevoAnexoForm } from "@/components/polizas/anexos/NuevoAnexoForm";

export const metadata = {
	title: "Nuevo Anexo - Pólizas",
	description: "Crear un nuevo anexo para una póliza existente",
};

export default function NuevoAnexoPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-7xl">
			<Suspense fallback={
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
				</div>
			}>
				<NuevoAnexoForm />
			</Suspense>
		</div>
	);
}
