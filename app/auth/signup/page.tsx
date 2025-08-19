"use client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

const passwordSchema = z
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
	});

const formSchema = z
	.object({
		email: z.email(),
		password: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.refine(({ password, confirmPassword }) => password === confirmPassword, {
		path: ["confirmPassword"],
		message: "Las contraseñas no coinciden.",
	});

export default function SignUp() {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			console.log(values);
			toast(
				<pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
					<code className="text-white">{JSON.stringify(values, null, 2)}</code>
				</pre>
			);
		} catch (error) {
			console.error("Form submission error", error);
			toast.error("Failed to submit the form. Please try again.");
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto py-10">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Correo destinatario</FormLabel>
							<FormControl>
								<Input placeholder="" type="email" disabled={true} {...field} />
							</FormControl>
							<FormDescription>Envie un correo al nuevo usuario</FormDescription>
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
							<FormDescription>Ingresa tu contraseña</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="confirmPassword"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Contraseña</FormLabel>
							<FormControl>
								<PasswordInput autoComplete="current-password" {...field} />
							</FormControl>
							<FormDescription>Repite tu contraseña</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button type="submit">Registrarse</Button>
			</form>
		</Form>
	);
}
