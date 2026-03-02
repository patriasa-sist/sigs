import { NuevoAnexoForm } from "@/components/polizas/anexos/NuevoAnexoForm";

export const metadata = {
	title: "Nuevo Anexo - Pólizas",
	description: "Crear un nuevo anexo para una póliza existente",
};

export default function NuevoAnexoPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-7xl">
			<NuevoAnexoForm />
		</div>
	);
}
