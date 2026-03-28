"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { login } from "./actions";

const formSchema = z.object({
	email: z.email().min(1, { message: "El correo no puede estar vacío." }),
	password: z
		.string()
		.min(1, { message: "La contraseña no puede estar vacía." })
		.regex(/^.{8,20}$/, { message: "Mínimo 8 y máximo 20 caracteres." })
		.regex(/(?=.*[A-Z])/, { message: "Al menos una mayúscula." })
		.regex(/(?=.*[a-z])/, { message: "Al menos una minúscula." })
		.regex(/(?=.*\d)/, { message: "Al menos un número." })
		.regex(/[$&+,:;=?@#|'<>.^*()%!-]/, { message: "Al menos un carácter especial." }),
	otp: z.string().length(6, { message: "Ingresa el código de 6 dígitos." }),
});

export default function LoginPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "", password: "", otp: "" },
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		setServerError(null);
		try {
			const formData = new FormData();
			formData.append("email", values.email);
			formData.append("password", values.password);
			formData.append("otp", values.otp);
			const result = await login(formData);
			if (result?.error) {
				setServerError(result.error);
			}
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex h-screen overflow-hidden">

			{/* ── Brand panel (desktop only) ──────────────────────────── */}
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
						Sistema Integral<br />de Gestión<br />de Seguros
					</h2>
					<p className="text-white/50 text-sm leading-relaxed max-w-xs">
						Plataforma unificada para la gestión de pólizas, clientes, cobranzas y reportes gerenciales.
					</p>
				</div>

				{/* Bottom: version */}
				<p className="text-white/30 text-xs">
					Patria S.A. · Acceso restringido
				</p>
			</div>

			{/* ── Form panel ──────────────────────────────────────────── */}
			<div className="flex-1 flex items-center justify-center bg-background px-6 py-10">
				<div className="w-full max-w-sm space-y-6">

					{/* Mobile-only logo */}
					<div className="lg:hidden flex justify-center">
						<Image
							src="/patria-horizontal.png"
							alt="Patria S.A."
							width={180}
							height={46}
							style={{ height: "2.75rem", width: "auto" }}
						/>
					</div>

					{/* Heading */}
					<div className="space-y-1">
						<h1 className="text-xl font-semibold text-foreground">Iniciar sesión</h1>
						<p className="text-sm text-muted-foreground">
							Ingresa tus credenciales para acceder al sistema.
						</p>
					</div>

					{/* Form card */}
					<Card>
						<CardContent className="p-6">
							<Form {...form}>
								<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

									{/* Email */}
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Correo electrónico</FormLabel>
												<FormControl>
													<Input
														placeholder="ejecutivo@correo.com"
														type="email"
														autoComplete="email"
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
													<PasswordInput autoComplete="current-password" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* OTP */}
									<FormField
										control={form.control}
										name="otp"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Código de verificación</FormLabel>
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
												<p className="text-xs text-muted-foreground mt-1.5">
													Abre tu aplicación de autenticación y copia el código de 6 dígitos.
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Server error */}
									{serverError && (
										<div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
											<AlertCircle className="h-4 w-4 shrink-0" />
											<span>{serverError}</span>
										</div>
									)}

									{/* Submit */}
									<Button
										type="submit"
										disabled={isLoading}
										className="w-full mt-1"
									>
										{isLoading ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" />
												Verificando…
											</>
										) : (
											"Iniciar sesión"
										)}
									</Button>

								</form>
							</Form>
						</CardContent>
					</Card>

				</div>
			</div>

		</div>
	);
}
