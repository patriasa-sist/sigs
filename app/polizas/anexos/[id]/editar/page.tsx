"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NuevoAnexoForm } from "@/components/polizas/anexos/NuevoAnexoForm";
import { obtenerAnexoParaEdicion } from "@/app/polizas/anexos/actions";
import type { AnexoFormState, DatosPolizaParaAnexo, MotivoErrorEdicionAnexo } from "@/types/anexo";

export default function EditarAnexoPage() {
	const router = useRouter();
	const params = useParams();
	const anexoId = params.id as string;

	const [formState, setFormState] = useState<AnexoFormState | null>(null);
	const [datosPoliza, setDatosPoliza] = useState<DatosPolizaParaAnexo | null>(null);
	const [estadoAnexo, setEstadoAnexo] = useState<"pendiente" | "rechazado" | "activo" | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [errorKind, setErrorKind] = useState<MotivoErrorEdicionAnexo | undefined>(undefined);

	useEffect(() => {
		const cargarDatos = async () => {
			setIsLoading(true);
			setError(null);
			setErrorKind(undefined);

			const result = await obtenerAnexoParaEdicion(anexoId);

			if (!result.success || !result.formState || !result.datosPoliza) {
				setError(result.error || "No se pudo cargar el anexo");
				setErrorKind(result.errorKind);
				setIsLoading(false);
				return;
			}

			setFormState(result.formState);
			setDatosPoliza(result.datosPoliza);
			setEstadoAnexo(result.estadoAnexo);
			setIsLoading(false);
		};

		cargarDatos();
	}, [anexoId]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mx-auto" />
					<p className="text-muted-foreground">Cargando datos del anexo...</p>
				</div>
			</div>
		);
	}

	if (error || !formState || !datosPoliza) {
		const titulo =
			errorKind === "estado"
				? "Este anexo no se puede editar"
				: errorKind === "no_encontrado"
					? "Anexo no encontrado"
					: "No se puede editar el anexo";
		const mensaje =
			error ||
			(errorKind === "permiso" ? "No tienes permiso para editar este anexo." : "No se pudo cargar el anexo.");
		// La ayuda de "contacta a un administrador/líder" solo aplica cuando el
		// bloqueo es por permisos; en los demás casos sería engañosa.
		const ayuda =
			errorKind === "permiso"
				? "Si necesitas acceso, contacta a un administrador o al líder de tu equipo."
				: errorKind === "estado"
					? "Revisa el estado de la póliza y del anexo. Solo se editan anexos de pólizas activas."
					: null;
		return (
			<div className="container mx-auto px-4 py-8 max-w-2xl">
				<div className="text-center py-16 bg-card rounded-lg shadow-sm border border-border">
					<ShieldAlert className="h-16 w-16 text-warning mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-foreground mb-2">{titulo}</h2>
					<p className="text-muted-foreground mb-6">{mensaje}</p>
					{ayuda && <p className="text-sm text-muted-foreground mb-6">{ayuda}</p>}
					<Button onClick={() => router.back()}>Volver</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8 max-w-7xl">
			<Suspense
				fallback={
					<div className="flex items-center justify-center min-h-[400px]">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
					</div>
				}
			>
				<NuevoAnexoForm
					mode="edit"
					anexoId={anexoId}
					anexoEstado={estadoAnexo}
					initialFormState={formState}
					initialDatosPoliza={datosPoliza}
				/>
			</Suspense>
		</div>
	);
}
