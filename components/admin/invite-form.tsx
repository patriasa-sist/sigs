"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

const formSchema = z.object({
	"correo-invitacion": z.string().email("Correo electrónico inválido"),
});

export function InviteForm() {
	const router = useRouter();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			"correo-invitacion": "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			const response = await fetch("/api/invite", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email: values["correo-invitacion"] }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Ocurrió un error en el servidor.");
			}

			toast.success("¡Invitación enviada exitosamente!");
			form.reset();
			router.refresh(); // Refresh the page to show the new invitation in the table
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error("Error al enviar el formulario:", error.message);
				toast.error(error.message || "No se pudo enviar la invitación. Inténtalo de nuevo.");
			} else {
				console.error("Ocurrió un error desconocido:", error);
				toast.error("Ocurrió un error desconocido. Por favor inténtalo de nuevo.");
			}
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Mail className="h-5 w-5" />
					Enviar Nueva Invitación
				</CardTitle>
				<CardDescription>Enviar una invitación por correo a un nuevo usuario</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="correo-invitacion"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Correo destinatario</FormLabel>
									<FormControl>
										<Input placeholder="usuario@ejemplo.com" type="email" {...field} />
									</FormControl>
									<FormDescription>El usuario recibirá un correo con un enlace de invitación</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{form.formState.isSubmitting ? "Enviando..." : "Enviar invitación"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
