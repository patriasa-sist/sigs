import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, Mail, Calendar, MoreHorizontal, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DeleteInvitationDialog } from "@/components/admin/delete-invitation-dialog";
import Link from "next/link";

export default async function ManageInvitationsPage() {
	const supabase = await createClient();

	// Get all invitations
	const { data: invitations, error } = await supabase
		.from("invitations")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching invitations:", error);
	}

	// Get all profiles to match with invitations by email
	const { data: profiles } = await supabase.from("profiles").select("email, role");

	// Create a map of email to role for quick lookup
	const emailToRole = new Map(profiles?.map((p) => [p.email, p.role]) || []);

	// Enrich invitations with profile role
	const enrichedInvitations = invitations?.map((inv) => ({
		...inv,
		profile_role: emailToRole.get(inv.email) || null,
	}));

	// Get invitation statistics
	const now = new Date().toISOString();
	const [
		{ count: totalInvitations },
		{ count: usedInvitations },
		{ count: pendingInvitations },
		{ count: expiredInvitations },
	] = await Promise.all([
		supabase.from("invitations").select("*", { count: "exact", head: true }),
		supabase.from("invitations").select("*", { count: "exact", head: true }).not("used_at", "is", null),
		supabase
			.from("invitations")
			.select("*", { count: "exact", head: true })
			.is("used_at", null)
			.gt("expires_at", now),
		supabase
			.from("invitations")
			.select("*", { count: "exact", head: true })
			.is("used_at", null)
			.lt("expires_at", now),
	]);

	const getStatusInfo = (invitation: any) => {
		if (invitation.used_at) {
			return {
				label: "Used",
				variant: "secondary" as const,
				icon: CheckCircle,
				color: "text-green-600",
			};
		}
		if (new Date(invitation.expires_at) < new Date()) {
			return {
				label: "Expired",
				variant: "destructive" as const,
				icon: XCircle,
				color: "text-red-600",
			};
		}
		return {
			label: "Pending",
			variant: "default" as const,
			icon: Clock,
			color: "text-blue-600",
		};
	};

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/admin">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
					</Link>
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold">Manage Invitations</h1>
					<p className="text-muted-foreground">View and manage all invitation records</p>
				</div>
			</div>

			{/* Invitation Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
						<Mail className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalInvitations || 0}</div>
						<p className="text-xs text-muted-foreground">All invitation records</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Used</CardTitle>
						<CheckCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{usedInvitations || 0}</div>
						<p className="text-xs text-muted-foreground">Accepted invitations</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Pending</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{pendingInvitations || 0}</div>
						<p className="text-xs text-muted-foreground">Awaiting response</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Expired</CardTitle>
						<XCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{expiredInvitations || 0}</div>
						<p className="text-xs text-muted-foreground">Expired invitations</p>
					</CardContent>
				</Card>
			</div>

			{/* Info Alert */}
			<div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
				<div className="flex gap-3 items-start">
					<AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
					<div className="flex-1">
						<h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
							About Invitation Management
						</h3>
						<p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
							Deleting an invitation will remove both the invitation record and the associated user
							profile if the user hasn't completed their signup. This action cannot be undone.
						</p>
					</div>
				</div>
			</div>

			{/* Invitations Table */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5" />
						All Invitations
					</CardTitle>
					<CardDescription>Complete list of invitations and their status</CardDescription>
				</CardHeader>
				<CardContent>
					{enrichedInvitations && enrichedInvitations.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created</TableHead>
									<TableHead>Expires</TableHead>
									<TableHead className="w-[70px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{enrichedInvitations.map((invitation) => {
									const statusInfo = getStatusInfo(invitation);
									const StatusIcon = statusInfo.icon;

									return (
										<TableRow key={invitation.id}>
											<TableCell>
												<div className="space-y-1">
													<p className="text-sm font-medium">{invitation.email}</p>
													<p className="text-xs text-muted-foreground">
														ID: {invitation.id.slice(0, 8)}...
													</p>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="capitalize">
													{invitation.profile_role || "N/A"}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant={statusInfo.variant}
													className="flex items-center gap-1 w-fit"
												>
													<StatusIcon className="h-3 w-3" />
													{statusInfo.label}
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2 text-sm">
													<Calendar className="h-4 w-4 text-muted-foreground" />
													{new Date(invitation.created_at).toLocaleDateString()}
												</div>
											</TableCell>
											<TableCell>
												<div className="text-sm text-muted-foreground">
													{new Date(invitation.expires_at).toLocaleDateString()}
												</div>
											</TableCell>
											<TableCell>
												<DeleteInvitationDialog
													invitation={{
														id: invitation.id,
														email: invitation.email,
														status: statusInfo.label,
													}}
												/>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					) : (
						<div className="text-center py-8">
							<Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-sm text-muted-foreground">No invitations found</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
