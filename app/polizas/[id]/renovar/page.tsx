"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NuevaPolizaForm } from "@/components/polizas/NuevaPolizaForm";
import { obtenerPolizaParaRenovacion } from "./actions";
import type { PolizaFormState } from "@/types/poliza";

export default function RenovarPolizaPage() {
	const router = useRouter();
	const params = useParams();
	const polizaId = params.id as string;

	const [formState, setFormState] = useState<PolizaFormState | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const cargarDatos = async () => {
			setIsLoading(true);
			setError(null);

			const result = await obtenerPolizaParaRenovacion(polizaId);

			if (!result.success) {
				setError(result.error);
				setIsLoading(false);
				return;
			}

			setFormState(result.data);
			setIsLoading(false);
		};

		cargarDatos();
	}, [polizaId]);

	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Loader2 className="h-12 w-12 animate-spin text-primary mb-4 mx-auto" />
					<p className="text-gray-600">Cargando datos de la póliza...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error || !formState) {
		return (
			<div className="container mx-auto px-4 py-8 max-w-2xl">
				<div className="text-center py-16 bg-white rounded-lg shadow-sm border">
					<XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-gray-900 mb-2">
						No se pudo iniciar la renovación
					</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					<Button onClick={() => router.push(`/polizas/${polizaId}`)}>
						Volver al detalle
					</Button>
				</div>
			</div>
		);
	}

	// Renewal form (reusa el flujo de creación con datos precargados)
	return (
		<div className="container mx-auto px-4 py-8">
			<NuevaPolizaForm mode="renovacion" polizaId={polizaId} initialData={formState} />
		</div>
	);
}
