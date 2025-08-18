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
import { PasswordInput } from "@/components/ui/password-input";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

const formSchema = z.object({
	em: z.email().min(1, { message: "Email can not be empty." }).endsWith("@patria-sa.com", {
		message: "Correo no autorizado",
	}),
	pass: z
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
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			em: "",
			pass: "",
			otp: "",
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
		<div className="flex justify-center items-center h-screen">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto py-10">
					<FormField
						control={form.control}
						name="em"
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
						name="pass"
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
					<Button type="submit">Submit</Button>
				</form>
			</Form>
		</div>
	);
}
