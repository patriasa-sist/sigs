import { requirePermission } from "@/utils/auth/helpers";
import RegistrarSiniestroForm from "@/components/siniestros/registro/RegistrarSiniestroForm";

export const metadata = {
	title: "Registrar Siniestro - SIGS",
	description: "Formulario de registro de nuevo siniestro",
};

export default async function NuevoSiniestroPage() {
	await requirePermission("siniestros.crear");

	return <RegistrarSiniestroForm />;
}
