// app/siniestros/editar/[id]/page.tsx - Página de Edición de Siniestros

import { redirect } from "next/navigation";
import { requirePermission } from "@/utils/auth/helpers";
import { obtenerSiniestroDetalle } from "@/app/siniestros/actions";
import EditarSiniestroForm from "@/components/siniestros/edicion/EditarSiniestroForm";

export const metadata = {
	title: "Editar Siniestro | SIGS",
	description: "Editar y gestionar siniestro",
};

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function EditarSiniestroPage({ params }: PageProps) {
	const profile = await requirePermission("siniestros.editar");

	// Obtener ID del siniestro desde params
	const { id: siniestroId } = await params;

	// Obtener detalle completo del siniestro
	const result = await obtenerSiniestroDetalle(siniestroId);

	if (!result.success || !result.data) {
		redirect("/siniestros");
	}

	const { siniestro, coberturas, documentos, observaciones, historial } = result.data;

	// Determinar si el usuario es admin
	const esAdmin = profile.role === "admin";

	return (
		<div className="container mx-auto py-6 px-4">
			<EditarSiniestroForm
				siniestro={siniestro}
				coberturas={coberturas}
				documentos={documentos}
				observaciones={observaciones}
				historial={historial}
				esAdmin={esAdmin}
			/>
		</div>
	);
}
