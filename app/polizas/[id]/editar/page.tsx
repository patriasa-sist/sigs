"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, XCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NuevaPolizaForm } from "@/components/polizas/NuevaPolizaForm";
import { obtenerPolizaParaEdicion } from "./actions";
import { checkPolicyEditPermission } from "@/app/polizas/permisos/actions";
import type { PolizaFormState } from "@/types/poliza";

export default function EditarPolizaPage() {
	const router = useRouter();
	const params = useParams();
	const polizaId = params.id as string;

	const [formState, setFormState] = useState<PolizaFormState | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [permissionDenied, setPermissionDenied] = useState(false);

	useEffect(() => {
		const cargarDatos = async () => {
			setIsLoading(true);
			setError(null);
			setPermissionDenied(false);

			// First check permission
			const permResult = await checkPolicyEditPermission(polizaId);

			if (!permResult.success) {
				setError(permResult.error);
				setIsLoading(false);
				return;
			}

			if (!permResult.data.canEdit) {
				setPermissionDenied(true);
				setError(permResult.data.reason);
				setIsLoading(false);
				return;
			}

			// Load policy data
			const result = await obtenerPolizaParaEdicion(polizaId);

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

	// Permission denied
	if (permissionDenied) {
		return (
			<div className="container mx-auto px-4 py-8 max-w-2xl">
				<div className="text-center py-16 bg-white rounded-lg shadow-sm border">
					<ShieldAlert className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-gray-900 mb-2">
						Sin permiso de edición
					</h2>
					<p className="text-gray-600 mb-6">
						{error || "No tienes permiso para editar esta póliza."}
					</p>
					<p className="text-sm text-gray-500 mb-6">
						Contacta a un administrador para solicitar acceso.
					</p>
					<Button onClick={() => router.push(`/polizas/${polizaId}`)}>
						Volver al detalle
					</Button>
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
						Error al cargar la póliza
					</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					<Button onClick={() => router.push("/polizas")}>
						Volver a Pólizas
					</Button>
				</div>
			</div>
		);
	}

	// Edit form
	return (
		<div className="container mx-auto px-4 py-8">
			<NuevaPolizaForm
				mode="edit"
				polizaId={polizaId}
				initialData={formState}
			/>
		</div>
	);
}
