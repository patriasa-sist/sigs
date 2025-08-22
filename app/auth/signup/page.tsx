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
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

const passwordSchema = z
	.string()
	.min(8, { message: "Minimum 8 characters required." })
	.max(50, { message: "Maximum 50 characters allowed." })
	.regex(/(?=.*[A-Z])/, { message: "At least one uppercase character required." })
	.regex(/(?=.*[a-z])/, { message: "At least one lowercase character required." })
	.regex(/(?=.*\d)/, { message: "At least one digit required." })
	.regex(/[$&+,:;=?@#|'<>.^*()%!-]/, { message: "At least one special character required." });

const formSchema = z
	.object({
		email: z.email("Invalid email format"),
		password: passwordSchema,
		confirmPassword: passwordSchema,
	})
	.refine(({ password, confirmPassword }) => password === confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match.",
	});

export default function SignUp() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [isLoading, setIsLoading] = useState(true);
	const [isValidInvite, setIsValidInvite] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	// Validate invitation token on component mount
	useEffect(() => {
		const validateInvitation = async () => {
			if (!token) {
				toast.error("Invalid invitation link");
				router.push("/auth/login");
				return;
			}

			const supabase = createClient();

			try {
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

				setInviteEmail(invitation.email);
				form.setValue("email", invitation.email);
				setIsValidInvite(true);
			} catch (error) {
				console.error("Error validating invitation:", error);
				toast.error("Failed to validate invitation");
				router.push("/auth/login");
			} finally {
				setIsLoading(false);
			}
		};

		validateInvitation();
	}, [token, router, form]);

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		if (!token || !isValidInvite) {
			toast.error("Invalid invitation");
			return;
		}

		setIsSubmitting(true);

		try {
			const supabase = createClient();

			// Sign up the user
			const { data: authData, error: signUpError } = await supabase.auth.signUp({
				email: values.email,
				password: values.password,
				options: {
					data: {
						invitation_token: token,
					},
				},
			});

			if (signUpError) {
				throw signUpError;
			}

			if (!authData.user) {
				throw new Error("Failed to create user account");
			}

			// Mark invitation as used
			const { error: updateError } = await supabase
				.from("invitations")
				.update({ used_at: new Date().toISOString() })
				.eq("token", token);

			if (updateError) {
				console.error("Failed to mark invitation as used:", updateError);
				// Don't throw here as the user is already created
			}

			toast.success("Account created successfully! Please check your email to confirm your account.");
			router.push("/auth/login?message=Please confirm your email to complete registration");
		} catch (error: any) {
			console.error("Signup error:", error);
			toast.error(error.message || "Failed to create account. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<div className="flex items-center space-x-2">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>Validating invitation...</span>
				</div>
			</div>
		);
	}

	if (!isValidInvite) {
		return (
			<div className="flex justify-center items-center min-h-screen">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
							<AlertTriangle className="h-6 w-6 text-red-600" />
						</div>
						<CardTitle>Invalid Invitation</CardTitle>
						<CardDescription>
							This invitation link is invalid, expired, or has already been used.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => router.push("/auth/login")} className="w-full">
							Go to Login
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex justify-center items-center min-h-screen p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl text-center">Complete Your Registration</CardTitle>
					<CardDescription className="text-center">
						You've been invited to join the system. Please set up your password to complete registration.
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
										<FormLabel>Email Address</FormLabel>
										<FormControl>
											<Input type="email" disabled={true} {...field} className="bg-muted" />
										</FormControl>
										<FormDescription>This email was provided in your invitation</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<PasswordInput autoComplete="new-password" {...field} />
										</FormControl>
										<FormDescription>
											Create a strong password with at least 8 characters
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
										<FormLabel>Confirm Password</FormLabel>
										<FormControl>
											<PasswordInput autoComplete="new-password" {...field} />
										</FormControl>
										<FormDescription>Re-enter your password to confirm</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type="submit" className="w-full" disabled={isSubmitting}>
								{isSubmitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating Account...
									</>
								) : (
									"Complete Registration"
								)}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
