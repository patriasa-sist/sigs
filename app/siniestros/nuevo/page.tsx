import { requirePermission } from "@/utils/auth/helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RegistrarSiniestroForm from "@/components/siniestros/registro/RegistrarSiniestroForm";

export const metadata = {
	title: "Registrar Siniestro - SIGS",
	description: "Formulario de registro de nuevo siniestro",
};

export default async function NuevoSiniestroPage() {
	await requirePermission("siniestros.crear");

	return (
		<div className="container mx-auto py-8 px-4">
			{/* Header */}
			<div className="mb-8">
				<Button variant="ghost" asChild className="mb-4">
					<Link href="/siniestros">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a Siniestros
					</Link>
				</Button>

				<div>
					<h1 className="text-3xl font-bold mb-2">Registrar Nuevo Siniestro</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Completa los 4 pasos del formulario para registrar un siniestro en una póliza activa
					</p>
				</div>
			</div>

			{/* Formulario */}
			<RegistrarSiniestroForm />
		</div>
	);
}
