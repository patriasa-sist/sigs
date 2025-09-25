"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { updatePassword } from "./actions";

const formSchema = z.object({
	password: z
		.string()
		.min(1, { message: "Password can not be empty." })
		.regex(/^.{8,20}$/, {
			message: "Minimum 8 and maximum 20 characters.",
		})
		.regex(/(?=.*[A-Z])/, {
			message: "At least one uppercase character.",
		})
		.regex(/(?=.*[a-z])/, {
			message: "At least one lowercase character.",
		})
		.regex(/(?=.*\d)/, {
			message: "At least one digit.",
		})
		.regex(/[$&+,:;=?@#|'<>.^*()%!-]/, {
			message: "At least one special character.",
		}),
	confirmPassword: z
		.string()
		.min(1, { message: "Please confirm your password." }),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ["confirmPassword"],
});

function ResetPasswordForm() {
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const searchParams = useSearchParams();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	useEffect(() => {
		const errorParam = searchParams.get("error");
		const messageParam = searchParams.get("message");

		if (errorParam) {
			setError(decodeURIComponent(errorParam));
		}
		if (messageParam) {
			setMessage(decodeURIComponent(messageParam));
		}
	}, [searchParams]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		setError("");
		setMessage("");

		try {
			const formData = new FormData();
			formData.append("password", values.password);

			await updatePassword(formData);
		} catch {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex justify-center items-center h-screen">
			<div className="max-w-md w-full mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold">Restablecer Contraseña</h1>
					<p className="text-gray-600 mt-2">Ingresa tu nueva contraseña</p>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
						{error}
					</div>
				)}

				{message && (
					<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
						{message}
					</div>
				)}

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nueva Contraseña</FormLabel>
									<FormControl>
										<PasswordInput
											placeholder="Ingresa tu nueva contraseña"
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										La contraseña debe tener entre 8-20 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos especiales.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirmar Nueva Contraseña</FormLabel>
									<FormControl>
										<PasswordInput
											placeholder="Confirma tu nueva contraseña"
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Repite la contraseña anterior para confirmar
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" disabled={isLoading} className="w-full">
							{isLoading && (
								<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							)}
							{isLoading ? "Actualizando contraseña..." : "Actualizar Contraseña"}
						</Button>
					</form>
				</Form>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={<div className="flex justify-center items-center h-screen">Cargando...</div>}>
			<ResetPasswordForm />
		</Suspense>
	);
}