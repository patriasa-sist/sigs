"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { login } from "./actions";
import { createClient } from "@/utils/supabase/client";

const formSchema = z.object({
	email: z.email().min(1, { message: "Email can not be empty." }),
	// .endsWith("@patria-sa.com", {message: "Correo no autorizado",}),
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
	otp: z.string().length(6, { message: "OTP can not be empty." }),
});

export default function MyForm() {
	const [isLoading, setIsLoading] = useState(false);
	const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			otp: "",
		},
	});

	// Handle password recovery tokens from URL hash
	useEffect(() => {
		const handleRecovery = async () => {
			if (isProcessingRecovery) return;

			const hashParams = new URLSearchParams(window.location.hash.substring(1));
			const type = hashParams.get('type');
			const accessToken = hashParams.get('access_token');
			const refreshToken = hashParams.get('refresh_token');

			if (type === 'recovery' && accessToken && refreshToken) {
				setIsProcessingRecovery(true);

				try {
					const supabase = createClient();

					// Set the session with the recovery tokens
					const { error } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken,
					});

					if (error) {
						console.error('Recovery session error:', error);
						router.push('/auth/error?error=' + encodeURIComponent(error.message));
					} else {
						// Clear the hash from URL and redirect to reset password page
						window.history.replaceState(null, '', window.location.pathname);
						router.push('/auth/reset-password');
					}
				} catch (error) {
					console.error('Recovery processing error:', error);
					router.push('/auth/error?error=Recovery%20processing%20failed');
				}
			}
		};

		handleRecovery();
	}, [router, isProcessingRecovery]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		try {
			// crear el objeto FormData y agregar los campos
			const formData = new FormData();
			formData.append("email", values.email);
			formData.append("password", values.password);
			formData.append("otp", values.otp);

			// The login server action will handle the redirect
			// No try-catch needed as redirect() in server actions throws by design
			await login(formData);
		} finally {
			setIsLoading(false);
		}
	}

	if (isProcessingRecovery) {
		return (
			<div className="flex justify-center items-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p>Procesando recuperación de contraseña...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex justify-center items-center h-screen">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto py-10">
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Usuario</FormLabel>
								<FormControl>
									<Input
										placeholder="ejecutivo@correo.com"
										type="email"
										autoComplete="email"
										{...field}
									/>
								</FormControl>
								<FormDescription>Correo asociado al sistema</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Contraseña</FormLabel>
								<FormControl>
									<PasswordInput autoComplete="current-password" {...field} />
								</FormControl>
								<FormDescription>Ingresa tu contraseña</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="otp"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Código de seguridad</FormLabel>
								<FormControl>
									<InputOTP maxLength={6} {...field}>
										<InputOTPGroup>
											<InputOTPSlot index={0} />
											<InputOTPSlot index={1} />
											<InputOTPSlot index={2} />
										</InputOTPGroup>
										<InputOTPSeparator />
										<InputOTPGroup>
											<InputOTPSlot index={3} />
											<InputOTPSlot index={4} />
											<InputOTPSlot index={5} />
										</InputOTPGroup>
									</InputOTP>
								</FormControl>
								<FormDescription>Copia el código de seguridad generado</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit" disabled={isLoading}>
						{isLoading && (
							<svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						)}
						{isLoading ? "Verificando..." : "Iniciar sesión"}
					</Button>
				</form>
			</Form>
		</div>
	);
}
