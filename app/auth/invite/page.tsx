"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
	"correo-invitacion": z.email(),
});

export default function SignUp() {
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
				// El backend espera un objeto { email: '...' }
				body: JSON.stringify({ email: values["correo-invitacion"] }),
			});

			const result = await response.json();

			if (!response.ok) {
				// Si el servidor responde con un error (ej. status 500)
				// Muestra el mensaje de error que viene del backend
				throw new Error(result.error || "Ocurrió un error en el servidor.");
			}

			// Si todo sale bien
			toast.success("¡Invitación enviada exitosamente!");
			form.reset(); // Opcional: limpiar el formulario después del envío
		} catch (error: any) {
			console.error("Error al enviar el formulario:", error);
			// Muestra el mensaje de error en un toast
			toast.error(error.message || "No se pudo enviar la invitación. Inténtalo de nuevo.");
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto py-10">
				<FormField
					control={form.control}
					name="correo-invitacion"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Correo destinatario</FormLabel>
							<FormControl>
								<Input placeholder="" type="email" {...field} />
							</FormControl>
							<FormDescription>Envie un correo al nuevo usuario</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit">Enviar invitación</Button>
			</form>
		</Form>
	);
}
