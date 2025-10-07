import { createClient } from "@/utils/supabase/server";
import { Mail, Calendar, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteInvitationDialog } from "@/components/admin/delete-invitation-dialog";
import { InviteForm } from "@/components/admin/invite-form";

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


	const getStatusInfo = (invitation: { used_at: string | null; expires_at: string }) => {
		if (invitation.used_at) {
			return {
				label: "Usada",
				variant: "secondary" as const,
				icon: CheckCircle,
				color: "text-green-600",
			};
		}
		if (new Date(invitation.expires_at) < new Date()) {
			return {
				label: "Expirada",
				variant: "destructive" as const,
				icon: XCircle,
				color: "text-red-600",
			};
		}
		return {
			label: "Pendiente",
			variant: "default" as const,
			icon: Clock,
			color: "text-blue-600",
		};
	};

	return (
		<div className="flex-1 w-full flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Gestión de Invitaciones</h1>
					<p className="text-gray-600 mt-1">Administrar registros de invitaciones</p>
				</div>
			</div>

			{/* Invite Form */}
			<InviteForm />

			{/* Info Alert */}
			<div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
				<div className="flex gap-3 items-start">
					<AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
					<div className="flex-1">
						<h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
							Acerca de la Gestión de Invitaciones
						</h3>
						<p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
							Eliminar una invitación removerá tanto el registro de invitación como el perfil de usuario
							asociado si el usuario no ha completado su registro. Esta acción no se puede deshacer.
						</p>
					</div>
				</div>
			</div>

			{/* Invitations Table */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5" />
						Todas las Invitaciones
					</CardTitle>
					<CardDescription>Lista completa de invitaciones y su estado</CardDescription>
				</CardHeader>
				<CardContent>
					{enrichedInvitations && enrichedInvitations.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Email</TableHead>
									<TableHead>Rol</TableHead>
									<TableHead>Estado</TableHead>
									<TableHead>Creado</TableHead>
									<TableHead>Expira</TableHead>
									<TableHead className="w-[70px]">Acciones</TableHead>
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
							<p className="text-sm text-muted-foreground">No se encontraron invitaciones</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
