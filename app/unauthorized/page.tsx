import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/login/actions";

export default function UnauthorizedPage() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-md">
				<Card>
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
							<AlertTriangle className="h-6 w-6 text-red-600" />
						</div>
						<CardTitle className="text-2xl">Access Denied</CardTitle>
						<p className="text-sm text-muted-foreground mt-2">
							You don`&apos;`t have permission to access this resource. This area is restricted to
							administrators only.
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-2">
							<Button asChild className="w-full">
								<Link href="/">
									<Home className="mr-2 h-4 w-4" />
									Go to Home
								</Link>
							</Button>
							<form action={signOut} className="w-full">
								<Button type="submit" variant="outline" className="w-full">
									<LogOut className="mr-2 h-4 w-4" />
									Sign Out
								</Button>
							</form>
						</div>
						<div className="text-center">
							<p className="text-xs text-muted-foreground">
								If you believe this is an error, please contact your administrator.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
