"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { marcarInvitacionUsada } from "@/app/admin/invitations/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";

const passwordSchema = z
	.string()
	.min(8, { message: "Mínimo 8 caracteres requeridos." })
	.max(50, { message: "Máximo 50 caracteres." })
	.regex(/(?=.*[A-Z])/, { message: "Al menos una letra mayúscula." })
	.regex(/(?=.*[a-z])/, { message: "Al menos una letra minúscula." })
	.regex(/(?=.*\d)/, { message: "Al menos un número." })
	.regex(/[$&+,:;=?@#|'<>.^*()%!-]/, { message: "Al menos un carácter especial." });

const formSchema = z
	.object({
		email: z.email("Formato de correo inválido."),
		fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(100, "El nombre es demasiado largo."),
		password: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.refine(({ password, confirmPassword }) => password === confirmPassword, {
		path: ["confirmPassword"],
		message: "Las contraseñas no coinciden.",
	});

// ── Brand panel (shared across all states) ──────────────────────────────────
function BrandPanel() {
	return (
		<div className="hidden lg:flex lg:w-[42%] bg-primary flex-col justify-between p-10 relative overflow-hidden select-none">
			{/* Decorative geometry */}
			<div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/[0.04]" />
			<div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full bg-white/[0.04]" />
			<div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-white/[0.05]" />
			<div className="absolute bottom-32 right-8 w-24 h-24 rounded-full bg-white/[0.06]" />

			{/* Top: logo */}
			<div>
				<Image
					src="/patria-horizontal.png"
					alt="Patria S.A."
					width={280}
					height={72}
					style={{ height: "4rem", width: "auto", filter: "brightness(0) invert(1)", opacity: 0.9 }}
					priority
				/>
			</div>

			{/* Middle: brand statement */}
			<div className="space-y-4">
				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 w-fit">
					<ShieldCheck className="h-3.5 w-3.5 text-white/70" />
					<span className="text-xs text-white/70 font-medium tracking-wide">Uso exclusivo interno</span>
				</div>
				<h2 className="text-3xl font-semibold text-white leading-snug tracking-tight">
					Configura tu<br />acceso al sistema
				</h2>
				<p className="text-white/50 text-sm leading-relaxed max-w-xs">
					Sigue las instrucciones para establecer tu contraseña y completar el registro de tu cuenta.
				</p>
			</div>

			{/* Bottom: version */}
			<p className="text-white/30 text-xs">
				Patria S.A. · Acceso restringido
			</p>
		</div>
	);
}

// ── Shared page shell ────────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen overflow-hidden">
			<BrandPanel />
			<div className="flex-1 flex items-center justify-center bg-background px-6 py-10">
				{children}
			</div>
		</div>
	);
}

// ── Loading state ────────────────────────────────────────────────────────────
function LoadingState() {
	return (
		<PageShell>
			<div className="w-full max-w-sm space-y-6">
				<div className="lg:hidden flex justify-center">
					<Image src="/patria-horizontal.png" alt="Patria S.A." width={180} height={46}
						style={{ height: "2.75rem", width: "auto" }} />
				</div>
				<div className="flex flex-col items-center gap-3 text-center">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">Validando invitación…</p>
				</div>
			</div>
		</PageShell>
	);
}

// ── Invalid invite state ─────────────────────────────────────────────────────
function InvalidInviteState({ onGoToLogin }: { onGoToLogin: () => void }) {
	return (
		<PageShell>
			<div className="w-full max-w-sm space-y-6">
				<div className="lg:hidden flex justify-center">
					<Image src="/patria-horizontal.png" alt="Patria S.A." width={180} height={46}
						style={{ height: "2.75rem", width: "auto" }} />
				</div>

				<div className="space-y-1">
					<h1 className="text-xl font-semibold text-foreground">Enlace inválido</h1>
					<p className="text-sm text-muted-foreground">
						No se pudo verificar la invitación.
					</p>
				</div>

				<Card>
					<CardContent className="p-6 space-y-4">
						<div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
							<AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
							<div className="space-y-1">
								<p className="text-sm font-medium text-destructive">Invitación no válida</p>
								<p className="text-xs text-muted-foreground">
									Este enlace de invitación es inválido, ha expirado o ya fue utilizado. Contacta al administrador del sistema para obtener una nueva invitación.
								</p>
							</div>
						</div>
						<Button onClick={onGoToLogin} className="w-full">
							Volver al inicio de sesión
						</Button>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}

// ── Main signup content ──────────────────────────────────────────────────────
function SignUpContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const confirmationUrl = searchParams.get("confirmation_url");
	const emailParam = searchParams.get("email");

	const [inviteEmail, setInviteEmail] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isValidInvite, setIsValidInvite] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isSuccess, setIsSuccess] = useState<boolean>(false);

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

	useEffect(() => {
		const verifyInvitation = async () => {
			if (!confirmationUrl || !emailParam) {
				toast.error("Enlace de invitación inválido");
				router.push("/auth/login");
				return;
			}

			try {
				const supabase = createClient();
				const url = new URL(confirmationUrl);
				const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
				const type = url.searchParams.get("type") || "invite";

				if (!tokenHash) throw new Error("Token faltante");

				const { data, error } = await supabase.auth.verifyOtp({
					type: (type as "invite") || "invite",
					token_hash: tokenHash,
				});

				if (error || !data?.user) {
					throw error || new Error("Token de invitación inválido o expirado");
				}

				setInviteEmail(emailParam);
				form.setValue("email", emailParam);
				setIsValidInvite(true);
			} catch (err) {
				console.error("Error verifying invitation", err);
				setIsValidInvite(false);
			} finally {
				setIsLoading(false);
			}
		};

		verifyInvitation();
	}, [confirmationUrl, emailParam, router, form]);

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsSubmitting(true);
		try {
			const supabase = createClient();

			const { error, data } = await supabase.auth.updateUser({
				password: values.password,
			});

			if (error) throw error;

			if (data?.user) {
				const { error: profileError } = await supabase
					.from("profiles")
					.update({ full_name: values.fullName })
					.eq("id", data.user.id);

				if (profileError) {
					console.error("Failed to update profile with full name:", profileError);
				}
			}

			if (emailParam) {
				const result = await marcarInvitacionUsada(emailParam);
				if (!result.success) {
					console.error("Failed to mark invitation as used:", result.error);
				}
			}

			// Sign out to clear the invite session before redirecting to login
			await supabase.auth.signOut();

			setIsSuccess(true);
		} catch (err: unknown) {
			console.error("Failed to set password", err);
			const errorMessage = err instanceof Error ? err.message : "Error al establecer la contraseña. Inténtalo de nuevo.";
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) return <LoadingState />;
	if (!isValidInvite) return <InvalidInviteState onGoToLogin={() => router.push("/auth/login")} />;

	if (isSuccess) return (
		<PageShell>
			<div className="w-full max-w-sm space-y-6">
				<div className="lg:hidden flex justify-center">
					<Image src="/patria-horizontal.png" alt="Patria S.A." width={180} height={46}
						style={{ height: "2.75rem", width: "auto" }} />
				</div>
				<div className="space-y-1">
					<h1 className="text-xl font-semibold text-foreground">¡Cuenta activada!</h1>
					<p className="text-sm text-muted-foreground">
						Tu contraseña fue configurada exitosamente.
					</p>
				</div>
				<Card>
					<CardContent className="p-6 space-y-4">
						<div className="flex items-start gap-3 rounded-md border border-green-600/30 bg-green-50 dark:bg-green-950/30 px-4 py-3">
							<CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
							<div className="space-y-1">
								<p className="text-sm font-medium text-green-700 dark:text-green-400">Registro completo</p>
								<p className="text-xs text-muted-foreground">
									Ya puedes ingresar al sistema con tu correo y la contraseña que acabas de configurar.
								</p>
							</div>
						</div>
						<Button className="w-full" onClick={() => { window.location.href = "/auth/login"; }}>
							Ir al inicio de sesión
						</Button>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);

	return (
		<PageShell>
			<div className="w-full max-w-sm space-y-6">

				{/* Mobile-only logo */}
				<div className="lg:hidden flex justify-center">
					<Image src="/patria-horizontal.png" alt="Patria S.A." width={180} height={46}
						style={{ height: "2.75rem", width: "auto" }} />
				</div>

				{/* Heading */}
				<div className="space-y-1">
					<h1 className="text-xl font-semibold text-foreground">Completa tu registro</h1>
					<p className="text-sm text-muted-foreground">
						Establece tu nombre y contraseña para activar tu acceso.
					</p>
				</div>

				{/* Form card */}
				<Card>
					<CardContent className="p-6">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

								{/* Email (read-only) */}
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Correo electrónico</FormLabel>
											<FormControl>
												<Input
													type="email"
													disabled
													{...field}
													className="bg-muted text-muted-foreground"
												/>
											</FormControl>
											<p className="text-xs text-muted-foreground mt-1">
												Correo asignado por el administrador. No puede modificarse.
											</p>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Full name */}
								<FormField
									control={form.control}
									name="fullName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nombre completo</FormLabel>
											<FormControl>
												<Input
													type="text"
													placeholder="Juan Pérez García"
													autoComplete="name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Password */}
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Contraseña</FormLabel>
											<FormControl>
												<PasswordInput autoComplete="new-password" {...field} />
											</FormControl>
											<p className="text-xs text-muted-foreground mt-1">
												Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.
											</p>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Confirm password */}
								<FormField
									control={form.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Confirmar contraseña</FormLabel>
											<FormControl>
												<PasswordInput autoComplete="new-password" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Submit */}
								<Button type="submit" className="w-full mt-1" disabled={isSubmitting}>
									{isSubmitting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Configurando cuenta…
										</>
									) : (
										<>
											<CheckCircle2 className="h-4 w-4" />
											Activar cuenta
										</>
									)}
								</Button>

							</form>
						</Form>
					</CardContent>
				</Card>

			</div>
		</PageShell>
	);
}

export default function SignUp() {
	return (
		<Suspense fallback={<LoadingState />}>
			<SignUpContent />
		</Suspense>
	);
}
