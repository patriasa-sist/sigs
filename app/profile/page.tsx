import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	User,
	Mail,
	Shield,
	Phone,
	Briefcase,
	Calendar,
	PenLine,
	Tag,
	ImageIcon,
	Percent,
} from "lucide-react";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import Image from "next/image";

const roleLabels: Record<string, string> = {
	admin: "Administrador",
	usuario: "Usuario",
	comercial: "Comercial",
	agente: "Agente",
	cobranza: "Cobranza",
	siniestros: "Siniestros",
	uif: "UIF",
	invitado: "Invitado",
	desactivado: "Desactivado",
};

export default async function ProfilePage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/auth/login");

	const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

	// Derive initials from full name (up to 3 chars)
	const initials = profile?.full_name
		? profile.full_name
				.split(" ")
				.map((w: string) => w[0])
				.join("")
				.toUpperCase()
				.slice(0, 3)
		: (user.email?.slice(0, 2).toUpperCase() ?? "U");

	// Use stored acronimo if set, otherwise fall back to initials
	const displayAcronimo = profile?.acronimo || initials;

	const memberSince = profile?.created_at
		? new Date(profile.created_at).toLocaleDateString("es-ES", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: "—";

	return (
		<div className="max-w-4xl mx-auto space-y-6 pt-2 pb-10 px-4">
			{/* Page header */}
			<div className="flex items-center gap-3 pb-4 border-b border-border">
				<div className="p-2 rounded-md bg-primary/10">
					<User className="h-5 w-5 text-primary" />
				</div>
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Mi Perfil</h1>
					<p className="text-sm text-muted-foreground mt-0.5">Tu información en el sistema</p>
				</div>
			</div>

			{/* Identity hero card */}
			<Card className="shadow-sm">
				<CardContent className="p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
						{/* Avatar */}
						<div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shrink-0">
							<span className="text-xl font-semibold text-primary-foreground tracking-wide">
								{displayAcronimo}
							</span>
						</div>

						{/* Identity */}
						<div className="flex-1 min-w-0">
							<h2 className="text-xl font-semibold text-foreground truncate">
								{profile?.full_name || "Sin nombre"}
							</h2>
							<p className="text-sm text-muted-foreground truncate mt-0.5">{profile?.email}</p>
							<div className="flex flex-wrap items-center gap-2 mt-2">
								<Badge variant="default" className="rounded-md text-xs">
									{roleLabels[profile?.role] ?? profile?.role}
								</Badge>
								{profile?.cargo && (
									<span className="text-xs text-muted-foreground">{profile.cargo}</span>
								)}
							</div>
						</div>

						{/* Member since */}
						<div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
							<span className="text-xs text-muted-foreground flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								Miembro desde
							</span>
							<span className="text-sm text-foreground font-medium">{memberSince}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Info grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Cuenta */}
				<Card className="shadow-sm">
					<CardHeader className="pb-2 pt-5 px-5">
						<CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
							<Shield className="h-4 w-4 text-primary" />
							Información de Cuenta
						</CardTitle>
					</CardHeader>
					<CardContent className="px-5 pb-5">
						<div className="divide-y divide-border">
							<InfoRow
								icon={User}
								label="Nombre completo"
								value={profile?.full_name || <span className="text-muted-foreground italic">No especificado</span>}
							/>
							<InfoRow icon={Mail} label="Correo electrónico" value={profile?.email} />
							<InfoRow
								icon={Shield}
								label="Rol en el sistema"
								value={
									<Badge variant="secondary" className="rounded-md text-xs">
										{roleLabels[profile?.role] ?? profile?.role}
									</Badge>
								}
							/>
							<InfoRow
								icon={Tag}
								label="Acrónimo"
								value={
									<span className="font-semibold font-mono tracking-widest text-foreground">
										{displayAcronimo}
									</span>
								}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Datos Comerciales */}
				<Card className="shadow-sm">
					<CardHeader className="pb-2 pt-5 px-5">
						<CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
							<Briefcase className="h-4 w-4 text-primary" />
							Datos Comerciales
						</CardTitle>
					</CardHeader>
					<CardContent className="px-5 pb-5">
						<div className="divide-y divide-border">
							<InfoRow
								icon={Briefcase}
								label="Cargo"
								value={
									profile?.cargo || (
										<span className="text-muted-foreground italic text-xs">No configurado</span>
									)
								}
							/>
							<InfoRow
								icon={Phone}
								label="Teléfono"
								value={
									profile?.telefono || (
										<span className="text-muted-foreground italic text-xs">No configurado</span>
									)
								}
							/>
							<InfoRow
								icon={Tag}
								label="Acrónimo en PDFs"
								value={
									<span className="font-mono font-semibold tracking-widest">
										{displayAcronimo}
									</span>
								}
							/>
							<InfoRow
								icon={Percent}
								label="Comisión"
								value={
									profile?.porcentaje_comision != null ? (
										<span>{profile.porcentaje_comision}%</span>
									) : (
										<span className="text-muted-foreground italic text-xs">No definida</span>
									)
								}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Firma preview (if configured) */}
			{profile?.firma_url && (
				<Card className="shadow-sm">
					<CardHeader className="pb-2 pt-5 px-5">
						<CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
							<ImageIcon className="h-4 w-4 text-primary" />
							Firma Digital
						</CardTitle>
					</CardHeader>
					<CardContent className="px-5 pb-5">
						<div className="flex items-start gap-4">
							<div className="border border-border rounded-md p-3 bg-background inline-block">
								<Image
									src={profile.firma_url}
									alt="Firma digital"
									width={200}
									height={80}
									className="object-contain max-h-20 w-auto"
								/>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">
									Esta firma se usa automáticamente al generar cartas PDF de vencimientos.
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									Para actualizar la firma, contacta al administrador.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{!profile?.firma_url && (
				<Card className="shadow-sm border-dashed">
					<CardContent className="p-5 flex items-center gap-3">
						<ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
						<div>
							<p className="text-sm text-muted-foreground">Sin firma digital configurada</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								Contacta al administrador para agregar tu firma a los PDFs.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Edit commercial data — admin only */}
			{profile?.role === "admin" && (
				<Card className="shadow-sm">
					<CardHeader className="pb-2 pt-5 px-5">
						<CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
							<PenLine className="h-4 w-4 text-primary" />
							Editar Datos Comerciales
						</CardTitle>
					</CardHeader>
					<CardContent className="px-5 pb-5">
						<ProfileEditForm
							initialData={{
								acronimo: profile?.acronimo || "",
								cargo: profile?.cargo || "",
								telefono: profile?.telefono || "",
							}}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ── Helper component ──────────────────────────────────────────────────────────
function InfoRow({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ElementType;
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
			<Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
			<div className="flex-1 min-w-0">
				<p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
				<div className="text-sm text-foreground">{value}</div>
			</div>
		</div>
	);
}
