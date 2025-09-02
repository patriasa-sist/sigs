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
		defaultValues: {
			email: inviteEmail,
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
				toast.error("Invalid invitation link");
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
					throw new Error("Missing token");
				}

				// Call verifyOtp to exchange the invite token for a session. According
				// to Supabase docs the type for email invitations is `invite`.
				const { data, error } = await supabase.auth.verifyOtp({
					type: (type as "invite") || "invite",
					token_hash: tokenHash,
				});
				// If the invitation is invalid throw
				if (error || !data?.user) {
					throw error || new Error("Invalid or expired invitation token");
				}
				// sets the email on the form
				setInviteEmail(emailParam);

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
	}, [confirmationUrl, emailParam, router]);

	// Handle password submission.
	/* 
	After verifying the invitation token the user has a session and we only need to set the new password. 
	If successful redirect back to the login page.
    */
	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		setIsSubmitting(true);
		try {
			const supabase = createClient();
			// Update the user's password
			const { error } = await supabase.auth.updateUser({
				password: values.password,
			});
			// Throw if there is an error updating the password
			if (error) {
				throw error;
			}

			// 	if (!authData.user) {
			// 		throw new Error("Failed to create user account");
			// 	}

			// 	// Mark invitation as used
			// 	const { error: updateError } = await supabase
			// 		.from("invitations")
			// 		.update({ used_at: new Date().toISOString() })
			// 		.eq("token", token);

			// 	if (updateError) {
			// 		console.error("Failed to mark invitation as used:", updateError);
			// 		// Don't throw here as the user is already created
			// 	}

			// 	toast.success("Account created successfully! Please check your email to confirm your account.");
			// 	router.push("/auth/login?message=Please confirm your email to complete registration");
			// } catch (error: unknown) {
			// 	console.error("Signup error:", error);
			// 	const errorMessage = error instanceof Error ? error.message : "Failed to create account. Please try again.";
			// 	toast.error(errorMessage);
			// } finally {
			// 	setIsSubmitting(false);
			// }

			toast.success("Password updated successfully. You can now log in.");
			router.push("/auth/login");
		} catch (err: any) {
			console.error("Failed to set password", err);
			toast.error(err?.message || "Failed to set password. Please try again.");
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
					<span>Validating invitation...</span>
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

	// Once the token is verified render the password form.
	return (
		<div className="flex justify-center items-center min-h-screen p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl text-center">Complete Your Registration</CardTitle>
					<CardDescription className="text-center">
						You&apos;ve been invited to join the system. Please set up your password to complete
						registration.
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
										Setting Password...
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
