"use client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { login } from "./actions";
import { useRouter } from "next/navigation";

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
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			otp: "",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		// crear el objeto FormData y agregar los campos
		const formData = new FormData();
		formData.append("email", values.email);
		formData.append("password", values.password);
		formData.append("otp", values.otp);

		// The login server action will handle the redirect
		// No try-catch needed as redirect() in server actions throws by design
		await login(formData);
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
					<Button type="submit">Iniciar sesión</Button>
				</form>
			</Form>
		</div>
	);
}
