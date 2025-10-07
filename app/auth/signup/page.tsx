"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

const passwordSchema = z
	.string()
	.min(8, { message: "Minimo 8 caracteres requeridos." })
	.max(50, { message: "Maximo 50 caracteres." })
	.regex(/(?=.*[A-Z])/, { message: "Al menos una letra mayuscula." })
	.regex(/(?=.*[a-z])/, { message: "Al menos una letra minuscula." })
	.regex(/(?=.*\d)/, { message: "Al menos un numero." })
	.regex(/[$&+,:;=?@#|'<>.^*()%!-]/, { message: "Al menos un caracter especial." });

const formSchema = z
	.object({
		email: z.email("Formato de correo invalido."),
		fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(100, "El nombre es demasiado largo."),
		password: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.refine(({ password, confirmPassword }) => password === confirmPassword, {
		path: ["confirmPassword"],
		message: "Contraseñas no coinciden.",
	});

function SignUpContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	// Extract query parameters from the URL. The invitation email template
	// includes `confirmation_url` and `email`. If either is missing we
	// immediately redirect back to the login page.
	const confirmationUrl = searchParams.get("confirmation_url");
	const emailParam = searchParams.get("email");

	const [inviteEmail, setInviteEmail] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isValidInvite, setIsValidInvite] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		mode: "onChange",
		defaultValues: {
			email: inviteEmail,
			fullName: "",
			password: "",
			confirmPassword: "",
		},
	});

	// Validate invitation token on component mount
	useEffect(() => {
		// Immediately validate the confirmation URL and token when the component
		// mounts. If the token is valid a session will be created and we show
		// the password form. Otherwise we redirect to the login page.
		const verifyInvitation = async () => {
			if (!confirmationUrl || !emailParam) {
				toast.error("Enlace de invitación inválido");
				router.push("/auth/login");
				return;
			}

			try {
				const supabase = createClient();
				// Parse the token_hash (or token) and type from the confirmation URL.
				const url = new URL(confirmationUrl);
				const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
				const type = url.searchParams.get("type") || "invite";

				if (!tokenHash) {
					throw new Error("Token faltante");
				}

				// Call verifyOtp to exchange the invite token for a session. According
				// to Supabase docs the type for email invitations is `invite`.
				const { data, error } = await supabase.auth.verifyOtp({
					type: (type as "invite") || "invite",
					token_hash: tokenHash,
				});
				// If the invitation is invalid throw
				if (error || !data?.user) {
					throw error || new Error("Token de invitación inválido o expirado");
				}
				// sets the email on the form
				setInviteEmail(emailParam);
				form.setValue("email", emailParam);

				/* old verification code against invitation tables
				const { data: invitation, error } = await supabase
					.from("invitations")
					.select("email, expires_at, used_at")
					.eq("token", token)
					.single();

				if (error || !invitation) {
					toast.error("Invalid or expired invitation");
					router.push("/auth/login");
					return;
				}

				if (invitation.used_at) {
					toast.error("This invitation has already been used");
					router.push("/auth/login");
					return;
				}

				if (new Date(invitation.expires_at) < new Date()) {
					toast.error("This invitation has expired");
					router.push("/auth/login");
					return;
				}

				// Check if user already exists
				const { data: existingUser } = await supabase.auth.admin.listUsers();
				const userExists = existingUser?.users?.some((u) => u.email === invitation.email);

				if (userExists) {
					toast.error("An account with this email already exists");
					router.push("/auth/login");
					return;
				}

				// Use email from URL parameter if available, otherwise use invitation email
				const emailToUse = emailFromUrl || invitation.email;
				form.setValue("email", emailToUse);*/
				//confirm the invitation is valid flag
				setIsValidInvite(true);
			} catch (err) {
				console.error("Error verifying invitation", err);
				toast.error("This invitation link is invalid or has expired.");
				router.push("/auth/login");
			} finally {
				setIsLoading(false);
			}
		};

		verifyInvitation();
	}, [confirmationUrl, emailParam, router, form]); //aded form just to get rid of linter warning

	// Handle password submission.
	/* 
	After verifying the invitation token the user has a session and we only need to set the new password. 
	If successful redirect back to the login page.
    */
	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsSubmitting(true);
		try {
			const supabase = createClient();

			// Update the user's password and metadata
			const { error, data } = await supabase.auth.updateUser({
				password: values.password,
			});
			// Throw if there is an error updating the password
			if (error) {
				throw error;
			}

			// Update the profile with full_name
			if (data?.user) {
				const { error: profileError } = await supabase
					.from("profiles")
					.update({ full_name: values.fullName })
					.eq("id", data.user.id);

				if (profileError) {
					console.error("Failed to update profile with full name:", profileError);
					// Don't throw as password is already set
				}
			}

			// Mark invitation as used in the custom invitations table
			const { error: updateError } = await supabase
				.from("invitations")
				.update({ used_at: new Date().toISOString() })
				.eq("email", emailParam);

			if (updateError) {
				console.error("Failed to mark invitation as used:", updateError);
				// Don't throw here as the user password is already set
			}

			toast.success("Contraseña actualizada exitosamente. Ahora puedes iniciar sesión.");
			router.push("/auth/login");
		} catch (err: unknown) {
			console.error("Failed to set password", err);
			const errorMessage = err instanceof Error ? err.message : "Error al establecer la contraseña. Inténtalo de nuevo.";
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Loading state while verifying the invite token
	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="flex items-center space-x-2">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>Validando invitación...</span>
				</div>
			</div>
		);
	}

	// If invite is invalid show an error card
	if (!isValidInvite) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
							<AlertTriangle className="h-6 w-6 text-red-600" />
						</div>
						<CardTitle>Invitación Inválida</CardTitle>
						<CardDescription>
							Este enlace de invitación es inválido, ha expirado o ya ha sido utilizado.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => router.push("/auth/login")} className="w-full">
							Ir al Inicio de Sesión
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Once the token is verified render the password form.
	return (
		<div className="flex justify-center items-center min-h-screen p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl text-center">Completa tu Registro</CardTitle>
					<CardDescription className="text-center">
						Has sido invitado a unirte al sistema. Por favor configura tu contraseña para completar
						el registro.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Correo Electrónico</FormLabel>
										<FormControl>
											<Input type="email" disabled={true} {...field} className="bg-muted" />
										</FormControl>
										<FormDescription>Este correo fue proporcionado en tu invitación</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="fullName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nombre Completo</FormLabel>
										<FormControl>
											<Input type="text" placeholder="Juan Pérez García" {...field} />
										</FormControl>
										<FormDescription>Ingresa tu nombre completo</FormDescription>
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
											<PasswordInput autoComplete="new-password" {...field} />
										</FormControl>
										<FormDescription>
											Crea una contraseña segura con al menos 8 caracteres
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
										<FormLabel>Confirmar Contraseña</FormLabel>
										<FormControl>
											<PasswordInput autoComplete="new-password" {...field} />
										</FormControl>
										<FormDescription>Vuelve a ingresar tu contraseña para confirmar</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type="submit" className="w-full" disabled={isSubmitting}>
								{isSubmitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Configurando Contraseña...
									</>
								) : (
									"Completar Registro"
								)}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}

export default function SignUp() {
	return (
		<Suspense
			fallback={
				<div className="flex justify-center items-center min-h-screen">
					<div className="flex items-center space-x-2">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Cargando...</span>
					</div>
				</div>
			}
		>
			<SignUpContent />
		</Suspense>
	);
}
