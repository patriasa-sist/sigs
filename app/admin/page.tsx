import { createClient } from "@/utils/supabase/server";
import { getDisplayProfile } from "@/utils/auth/helpers";
import { InfoIcon, Users, Mail, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AdminPage() {
	// Route protection handled by middleware

	const supabase = await createClient();

	// Get user profile for display purposes (not authorization)
	const displayProfile = await getDisplayProfile();

	// Get admin statistics
	const [
		{ count: totalUsers },
		{ count: totalInvitations },
		{ count: activeInvitations },
		{ count: expiredInvitations },
	] = await Promise.all([
		supabase.from("profiles").select("*", { count: "exact", head: true }),
		supabase.from("invitations").select("*", { count: "exact", head: true }),
		supabase
			.from("invitations")
			.select("*", { count: "exact", head: true })
			.is("used_at", null)
			.gt("expires_at", new Date().toISOString()),
		supabase
			.from("invitations")
			.select("*", { count: "exact", head: true })
			.is("used_at", null)
			.lt("expires_at", new Date().toISOString()),
	]);

	// Get recent invitations
	const { data: recentInvitations } = await supabase
		.from("recent_invitations")
		.select()
		.order("created_at", { ascending: false })
		.limit(5);

	return (
		<div className="flex-1 w-full flex flex-col gap-8">
			{/* Header */}
			<div className="w-full">
				<div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
					<InfoIcon size="16" strokeWidth={2} />
					<span>Welcome to the admin dashboard. You have full system access.</span>
				</div>
			</div>

			{/* Admin Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalUsers || 0}</div>
						<p className="text-xs text-muted-foreground">Registered users in the system</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
						<Mail className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalInvitations || 0}</div>
						<p className="text-xs text-muted-foreground">All invitations sent</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Invitations</CardTitle>
						<Shield className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{activeInvitations || 0}</div>
						<p className="text-xs text-muted-foreground">Pending invitations</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Expired Invitations</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{expiredInvitations || 0}</div>
						<p className="text-xs text-muted-foreground">Expired invitations</p>
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
					<CardDescription>Common administrative tasks</CardDescription>
				</CardHeader>
				<CardContent className="flex gap-4">
					<Button asChild>
						<Link href="/auth/invite">Send New Invitation</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link href="/admin/users">Manage Users</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link href="/admin/roles">Manage Roles</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link href="/admin/invitations">Manage Invitations</Link>
					</Button>
				</CardContent>
			</Card>

			{/* User Details */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<h2 className="font-bold text-2xl">Your Admin Details</h2>
					<Badge variant="default">Administrator</Badge>
				</div>
				<Card>
					<CardHeader>
						<CardTitle>Profile Information</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="text-sm font-medium text-muted-foreground">Email</label>
								<p className="text-sm">{displayProfile.email}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-muted-foreground">Role</label>
								<p className="text-sm capitalize">{displayProfile.role}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-muted-foreground">Member Since</label>
								<p className="text-sm">{new Date(displayProfile.created_at).toLocaleDateString()}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-muted-foreground">Last Updated</label>
								<p className="text-sm">{new Date(displayProfile.updated_at).toLocaleDateString()}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Recent Invitations */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Invitations</CardTitle>
					<CardDescription>Latest invitation activity</CardDescription>
				</CardHeader>
				<CardContent>
					{recentInvitations && recentInvitations.length > 0 ? (
						<div className="space-y-3">
							{recentInvitations.map((invite) => (
								<div
									key={invite.id}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div className="space-y-1">
										<p className="text-sm font-medium">{invite.email}</p>
										<p className="text-xs text-muted-foreground">
											Invited by: {invite.inviter_email || "Unknown"}
										</p>
										<p className="text-xs text-muted-foreground">
											{new Date(invite.created_at).toLocaleDateString()}
										</p>
									</div>
									<div className="text-right">
										{invite.used_at ? (
											<Badge variant="secondary">Used</Badge>
										) : new Date(invite.expires_at) < new Date() ? (
											<Badge variant="destructive">Expired</Badge>
										) : (
											<Badge variant="default">Active</Badge>
										)}
										<p className="text-xs text-muted-foreground mt-1">
											Expires: {new Date(invite.expires_at).toLocaleDateString()}
										</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No invitations sent yet.</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
