"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { generarWhatsAppCierreSiniestro } from "@/app/siniestros/actions";
import { toast } from "sonner";

interface BotonWhatsAppCierreProps {
	siniestroId: string;
	tipoCierre: "rechazado" | "declinado" | "concluido";
	onComplete?: () => void;
}

export default function BotonWhatsAppCierre({ siniestroId, tipoCierre, onComplete }: BotonWhatsAppCierreProps) {
	const [loading, setLoading] = useState(false);

	const handleEnviarWhatsApp = async () => {
		setLoading(true);

		try {
			const response = await generarWhatsAppCierreSiniestro(siniestroId, tipoCierre);

			if (response.success && response.data?.url) {
				window.open(response.data.url, "_blank");
				toast.success("WhatsApp Web se abrirá en una nueva pestaña", {
					description: "El mensaje de notificación está listo para enviar",
				});
				onComplete?.();
			} else if (!response.success) {
				toast.error(response.error || "Error al preparar mensaje de WhatsApp", {
					description: "Verifica que el cliente tenga un número de contacto registrado",
				});
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Error al preparar mensaje de WhatsApp");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			onClick={handleEnviarWhatsApp}
			disabled={loading}
			variant="outline"
			className="bg-green-50 hover:bg-green-100 border-green-200"
		>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Preparando...
				</>
			) : (
				<>
					<MessageCircle className="mr-2 h-4 w-4 text-green-600" />
					Enviar notificación por WhatsApp
				</>
			)}
		</Button>
	);
}
