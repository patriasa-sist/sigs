// app/admin/roles/page.tsx
import { requireAdmin } from "@/utils/auth/helpers";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Shield, UserCheck, Crown, Calendar } from "lucide-react";
import { UserRoleManager } from "@/app/admin/roles/components/UserRoleManager";

export default async function AdminRolesPage() {
	// Ensure user is admin
	const adminProfile = await requireAdmin();
	const supabase = await createClient();

	// Get all users with their profiles
	const { data: users, error } = await supabase
		.from("profiles")
		.select("id, email, role, created_at, updated_at")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching users:", error);
		return (
			<div className="flex-1 w-full flex flex-col gap-8">
				<div className="w-full">
					<Card>
						<CardHeader>
							<CardTitle className="text-red-600">Error Loading Users</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								Failed to load user data. Please check your database connection and permissions.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// Calculate statistics
	const totalUsers = users?.length || 0;
	const adminCount = users?.filter((user) => user.role === "admin").length || 0;
	const regularUserCount = totalUsers - adminCount;

	return (
		<div className="flex-1 w-full flex flex-col gap-8">
			{/* Header */}
			<div className="w-full">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">User Role Management</h1>
						<p className="text-gray-600 mt-1">Manage user permissions and roles</p>
					</div>
					<Badge variant="secondary" className="px-3 py-1">
						<Shield className="w-4 h-4 mr-1" />
						Admin Panel
					</Badge>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalUsers}</div>
						<p className="text-xs text-muted-foreground">Registered users</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Administrators</CardTitle>
						<Crown className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-orange-600">{adminCount}</div>
						<p className="text-xs text-muted-foreground">Admin privileges</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Regular Users</CardTitle>
						<UserCheck className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{regularUserCount}</div>
						<p className="text-xs text-muted-foreground">Standard access</p>
					</CardContent>
				</Card>
			</div>

			{/* Users Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Users</CardTitle>
					<CardDescription>View and manage user roles. Changes take effect immediately.</CardDescription>
				</CardHeader>
				<CardContent>
					{users && users.length > 0 ? (
						<div className="space-y-4">
							{users.map((user) => (
								<div
									key={user.id}
									className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
								>
									<div className="space-y-1">
										<div className="flex items-center space-x-3">
											<div className="font-medium text-sm">{user.email}</div>
											<Badge
												variant={user.role === "admin" ? "default" : "secondary"}
												className="text-xs"
											>
												{user.role === "admin" ? (
													<>
														<Crown className="w-3 h-3 mr-1" />
														Admin
													</>
												) : (
													<>
														<UserCheck className="w-3 h-3 mr-1" />
														User
													</>
												)}
											</Badge>
											{user.id === adminProfile.id && (
												<Badge variant="outline" className="text-xs">
													You
												</Badge>
											)}
										</div>
										<div className="flex items-center space-x-4 text-xs text-muted-foreground">
											<div className="flex items-center space-x-1">
												<Calendar className="w-3 h-3" />
												<span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
											</div>
											<div>
												<span>Updated: {new Date(user.updated_at).toLocaleDateString()}</span>
											</div>
										</div>
									</div>

									<div className="flex items-center space-x-2">
										<UserRoleManager
											userId={user.id}
											currentRole={user.role as "admin" | "user"}
											userEmail={user.email}
											isCurrentUser={user.id === adminProfile.id}
										/>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<Users className="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 className="mt-2 text-sm font-semibold text-muted-foreground">No users found</h3>
							<p className="mt-1 text-sm text-muted-foreground">There are no users in the system yet.</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Security Notice */}
			<Card className="border-yellow-200 bg-yellow-50">
				<CardHeader>
					<CardTitle className="text-yellow-800 text-sm flex items-center">
						<Shield className="w-4 h-4 mr-2" />
						Security Notice
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-yellow-700 space-y-2">
						<p>• You cannot remove your own admin privileges to prevent system lockout</p>
						<p>• All role changes are logged and audited automatically</p>
						<p>• Database triggers prevent unauthorized role escalation attempts</p>
						<p>• Changes take effect immediately across all user sessions</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
