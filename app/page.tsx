import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Users,
	FileText,
	Calendar,
	BarChart3,
	Wrench,
	Settings,
	Mail,
	UserCheck,
	Building2,
	Shield,
	BookOpen,
	Globe,
	CreditCard,
	ClipboardList,
	DollarSign,
	Eye,
} from "lucide-react";
import Link from "next/link";

const Dashboard = () => {
	const modules = [
		{
			id: "clientes",
			title: "Módulo Clientes",
			description: "Gestión completa de clientes individuales y corporativos",
			icon: Users,
			link: "/clientes",
			sections: [
				{ name: "Gestor de clientes", icon: UserCheck },
				{ name: "Gestor de Documentos", icon: FileText },
			],
		},
		{
			id: "polizas",
			title: "Módulo Pólizas",
			description: "Administración de pólizas individuales y corporativas",
			icon: Shield,
			link: "/polizas",
			sections: [
				{ name: "Gestor de pólizas", icon: Building2 },
				{ name: "Anexos de pólizas", icon: FileText },
			],
		},
		{
			id: "vencimientos",
			title: "Módulo Vencimientos",
			description: "Control y seguimiento de vencimientos de pólizas",
			icon: Calendar,
			link: "/vencimientos",
			sections: [{ name: "Cartas de Vencimiento", icon: Mail }],
		},
		{
			id: "gerencia",
			title: "Módulo Gerencia",
			description: "Herramientas de análisis y gestión gerencial",
			icon: BarChart3,
			link: "/gerencia",
			sections: [
				{ name: "Dashboard Estadístico", icon: BarChart3 },
				{ name: "Reportes", icon: FileText },
			],
		},
		{
			id: "siniestros",
			title: "Módulo Siniestros",
			description: "Gestión y registro de siniestros",
			icon: Wrench,
			link: "/siniestros",
			sections: [
				{ name: "Registro de Siniestros", icon: ClipboardList },
				{ name: "Seguimiento de Siniestros", icon: UserCheck },
			],
		},
		{
			id: "administracion",
			title: "Módulo Administración",
			description: "Configuración y administración del sistema",
			icon: Settings,
			link: "/admin",
			sections: [
				{ name: "Usuarios", icon: Users },
				{ name: "Ramos", icon: BookOpen },
				{ name: "Aseguradoras", icon: Building2 },
				{ name: "Equipos", icon: CreditCard },
			],
		},
		{
			id: "cobranzas",
			title: "Módulo Cobranzas",
			description: "Gestión de cobranzas y pagos",
			icon: DollarSign,
			link: "/cobranzas",
			sections: [
				{ name: "Seguimiento de cobros", icon: Building2 },
				{ name: "Prorrogas", icon: FileText },
			],
		},
		{
			id: "auditoria",
			title: "Módulo Auditoría",
			description: "Control de cumplimiento y excepciones documentales",
			icon: Eye,
			link: "/auditoria",
			sections: [{ name: "Excepciones de Documentos", icon: FileText }],
		},
	];

	return (
		<div className="min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
				{/* Welcome Section */}
				<div className="mb-8">
					<h2 className="text-2xl font-semibold text-foreground mb-1">Bienvenido al Sistema de Gestión</h2>
					<p className="text-muted-foreground">
						Selecciona un módulo para acceder a las funcionalidades del sistema
					</p>
				</div>

				{/* Main Modules */}
				<div className="mb-8">
					<h3 className="text-lg font-medium text-foreground mb-4">Módulos del Sistema</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
						{modules.map((module) => (
							<Card
								key={module.id}
								className="bg-card transition-all duration-150 hover:shadow-md hover:border-primary/20 flex flex-col"
							>
								<CardHeader className="pb-3">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-primary/8 rounded-md shrink-0">
											<module.icon className="h-5 w-5 text-primary" />
										</div>
										<div>
											<CardTitle className="text-base text-foreground">{module.title}</CardTitle>
											<CardDescription className="text-sm">{module.description}</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col flex-1">
									<div className="space-y-0.5 border-t border-border pt-3 mb-4 flex-1">
										{module.sections.map((section, sectionIndex) => (
											<div
												key={sectionIndex}
												className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground"
											>
												<section.icon className="h-3.5 w-3.5 shrink-0" />
												<span>{section.name}</span>
											</div>
										))}
									</div>
									<Link href={module.link}>
										<Button className="w-full cursor-pointer" variant="default">
											Acceder
										</Button>
									</Link>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Footer Info */}
				<Card className="bg-card">
					<CardContent className="py-3 px-5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Globe className="h-4 w-4 text-muted-foreground shrink-0" />
								<p className="text-sm text-muted-foreground">
									Sistema en línea · Acceso 24/7 desde cualquier dispositivo
								</p>
							</div>
							<Badge variant="outline" className="text-xs text-success border-success/30 gap-1.5">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
								En línea
							</Badge>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default Dashboard;
