"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { generarWhatsAppRegistroSiniestro } from "@/app/siniestros/actions";
import { toast } from "sonner";

interface BotonWhatsAppRegistroProps {
	siniestroId: string;
}

export default function BotonWhatsAppRegistro({ siniestroId }: BotonWhatsAppRegistroProps) {
	const [loading, setLoading] = useState(false);

	const handleEnviarWhatsApp = async () => {
		setLoading(true);

		try {
			const response = await generarWhatsAppRegistroSiniestro(siniestroId);

			if (response.success && response.data?.url) {
				window.open(response.data.url, "_blank");
				toast.success("WhatsApp Web se abrirá en una nueva pestaña", {
					description: "El mensaje de confirmación está listo para enviar",
				});
			} else {
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
		<Button onClick={handleEnviarWhatsApp} disabled={loading} className="bg-green-600 hover:bg-green-700">
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Preparando...
				</>
			) : (
				<>
					<MessageCircle className="mr-2 h-4 w-4" />
					Enviar confirmación por WhatsApp
				</>
			)}
		</Button>
	);
}
