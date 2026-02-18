import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Users,
	Mail,
	ShieldCheck,
	Lock,
	UsersRound,
	ArrowRightLeft,
	BarChart3,
	FileText,
	Building2,
	Layers,
	Tag,
	Package,
	UserCircle,
} from "lucide-react";

const adminSections = [
	{
		title: "Usuarios y Acceso",
		items: [
			{
				href: "/admin/users",
				icon: Users,
				label: "Usuarios",
				description: "Ver y gestionar usuarios del sistema",
			},
			{
				href: "/admin/roles",
				icon: ShieldCheck,
				label: "Roles",
				description: "Asignar y modificar roles de usuario",
			},
			{
				href: "/admin/invitations",
				icon: Mail,
				label: "Invitaciones",
				description: "Enviar y gestionar invitaciones",
			},
			{
				href: "/admin/permisos",
				icon: Lock,
				label: "Permisos",
				description: "Configurar permisos por rol y usuario",
			},
		],
	},
	{
		title: "Equipos y Datos",
		items: [
			{
				href: "/admin/equipos",
				icon: UsersRound,
				label: "Equipos",
				description: "Crear equipos y asignar miembros",
			},
			{
				href: "/admin/transferencias",
				icon: ArrowRightLeft,
				label: "Transferencias",
				description: "Transferir pólizas y clientes entre usuarios",
			},
			{
				href: "/admin/dashboard-equipos",
				icon: BarChart3,
				label: "Dashboard Equipos",
				description: "Métricas de producción por equipo",
			},
		],
	},
	{
		title: "Reportes",
		items: [
			{
				href: "/admin/reportes",
				icon: FileText,
				label: "Reportes",
				description: "Generar reportes consolidados de producción",
			},
		],
	},
	{
		title: "Catálogos de Seguros",
		items: [
			{
				href: "/admin/seguros/aseguradoras",
				icon: Building2,
				label: "Aseguradoras",
				description: "Gestionar compañías aseguradoras",
			},
			{
				href: "/admin/seguros/ramos",
				icon: Layers,
				label: "Ramos",
				description: "Tipos de seguro organizados por categoría",
			},
			{
				href: "/admin/seguros/categorias",
				icon: Tag,
				label: "Categorías",
				description: "Grupos empresariales para pólizas",
			},
			{
				href: "/admin/seguros/productos",
				icon: Package,
				label: "Productos",
				description: "Productos por aseguradora y ramo",
			},
		],
	},
	{
		title: "Gestión Comercial",
		items: [
			{
				href: "/admin/directores-cartera",
				icon: UserCircle,
				label: "Directores de Cartera",
				description: "Gestionar directores asignables a clientes",
			},
		],
	},
];

export default async function AdminPage() {
	return (
		<div className="flex-1 w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Panel de Administración</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Gestiona usuarios, equipos, permisos y catálogos del sistema
				</p>
			</div>

			{adminSections.map((section) => (
				<div key={section.title}>
					<h2 className="text-lg font-semibold mb-3">{section.title}</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{section.items.map((item) => (
							<Link key={item.href} href={item.href}>
								<Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
									<CardHeader className="pb-2">
										<CardTitle className="text-base flex items-center gap-2">
											<item.icon className="h-4 w-4 text-primary" />
											{item.label}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription>{item.description}</CardDescription>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
