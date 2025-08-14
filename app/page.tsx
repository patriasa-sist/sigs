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
	Upload,
	Eye,
	Mail,
	UserCheck,
	Building2,
	Shield,
	Target,
	BookOpen,
	Globe,
	CreditCard,
	ClipboardList,
} from "lucide-react";

const Dashboard = () => {
	const modules = [
		{
			id: "clientes",
			title: "Módulo Clientes",
			description: "Gestión completa de clientes individuales y corporativos",
			icon: Users,
			color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
			sections: [
				{ name: "Perfil de cliente", icon: UserCheck },
				{ name: "Gestor de Documentos", icon: FileText },
				{ name: "Individuales", icon: Users },
				{ name: "Corporativos", icon: Building2 },
			],
		},
		{
			id: "polizas",
			title: "Módulo Pólizas",
			description: "Administración de pólizas individuales y corporativas",
			icon: Shield,
			color: "bg-green-50 hover:bg-green-100 border-green-200",
			sections: [
				{ name: "Individuales", icon: Users },
				{ name: "Corporativas", icon: Building2 },
				{ name: "Anexos de pólizas", icon: FileText },
			],
		},
		{
			id: "vencimientos",
			title: "Módulo Vencimientos",
			description: "Control y seguimiento de vencimientos de pólizas",
			icon: Calendar,
			color: "bg-orange-50 hover:bg-orange-100 border-orange-200",
			sections: [{ name: "Envío recordatorios", icon: Mail }],
		},
		{
			id: "gerencia",
			title: "Módulo Gerencia",
			description: "Herramientas de análisis y gestión gerencial",
			icon: BarChart3,
			color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
			sections: [
				{ name: "Estadísticas Mensuales", icon: BarChart3 },
				{ name: "Registro de Operaciones", icon: ClipboardList },
				{ name: "Objetivos y Metas", icon: Target },
				{ name: "Switch Maestro", icon: Settings },
			],
		},
		{
			id: "siniestros",
			title: "Módulo Siniestros",
			description: "Gestión y registro de siniestros",
			icon: Wrench,
			color: "bg-red-50 hover:bg-red-100 border-red-200",
			sections: [
				{ name: "Registro Siniestros", icon: ClipboardList },
				{ name: "Perfil de cliente", icon: UserCheck },
			],
		},
		{
			id: "administracion",
			title: "Módulo Administración",
			description: "Configuración y administración del sistema",
			icon: Settings,
			color: "bg-gray-50 hover:bg-gray-100 border-gray-200",
			sections: [
				{ name: "Usuarios", icon: Users },
				{ name: "Ramos", icon: BookOpen },
				{ name: "Aseguradora", icon: Building2 },
				{ name: "Cartera", icon: CreditCard },
				{ name: "Reportes", icon: FileText },
				{ name: "Documentos Usuarios", icon: FileText },
				{ name: "Subramos", icon: BookOpen },
			],
		},
	];

	const quickActions = [
		{
			title: "Carga de Datos",
			description: "Procesa archivos Excel con validación automática",
			icon: Upload,
			action: "Cargar Excel",
		},
		{
			title: "Dashboard",
			description: "Visualiza y filtra datos de manera intuitiva",
			icon: Eye,
			action: "Ver Dashboard",
		},
		{
			title: "Envío Automático",
			description: "Genera y envía cartas por email o descarga en ZIP",
			icon: Mail,
			action: "Configurar Envío",
		},
		{
			title: "Seguimiento",
			description: "Control completo del estado de las notificaciones",
			icon: UserCheck,
			action: "Ver Seguimiento",
		},
	];

	return (
		<div className="min-h-screen">
			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div className="flex items-center space-x-4">
							<div className="bg-blue-600 text-white p-3 rounded-lg">
								<Building2 className="h-8 w-8" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">PATRIA S.A.</h1>
								<p className="text-sm text-gray-600">Sistema Integrado de Gestión de Seguros</p>
							</div>
						</div>
						<Badge variant="secondary" className="px-3 py-1">
							Dashboard Principal
						</Badge>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Welcome Section */}
				<div className="mb-8">
					<h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido al Sistema de Gestión</h2>
					<p className="text-gray-600">Selecciona un módulo para acceder a las funcionalidades del sistema</p>
				</div>

				{/* Quick Actions */}
				<div className="mb-8">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{quickActions.map((action, index) => (
							<Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
								<CardContent className="p-4">
									<div className="flex items-center space-x-3">
										<div className="bg-blue-100 p-2 rounded-lg">
											<action.icon className="h-5 w-5 text-blue-600" />
										</div>
										<div>
											<h4 className="font-medium text-sm text-gray-900">{action.title}</h4>
											<p className="text-xs text-gray-600">{action.description}</p>
										</div>
									</div>
									<Button size="sm" className="w-full mt-3" variant="outline">
										{action.action}
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Main Modules */}
				<div className="mb-8">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Módulos del Sistema</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{modules.map((module) => (
							<Card
								key={module.id}
								className={`${module.color} transition-all duration-200 cursor-pointer hover:shadow-lg`}
							>
								<CardHeader className="pb-4">
									<div className="flex items-center space-x-3">
										<div className="p-2 bg-white rounded-lg">
											<module.icon className="h-6 w-6 text-gray-700" />
										</div>
										<div>
											<CardTitle className="text-lg text-gray-900">{module.title}</CardTitle>
											<CardDescription className="text-sm text-gray-600">
												{module.description}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{module.sections.map((section, sectionIndex) => (
											<div
												key={sectionIndex}
												className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/50 transition-colors"
											>
												<section.icon className="h-4 w-4 text-gray-600" />
												<span className="text-sm text-gray-700">{section.name}</span>
											</div>
										))}
									</div>
									<Button className="w-full mt-4" variant="default">
										Acceder al Módulo
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Footer Info */}
				<div className="bg-white rounded-lg border border-gray-200 p-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<Globe className="h-5 w-5 text-gray-600" />
							<div>
								<h4 className="font-medium text-gray-900">Sistema en Línea</h4>
								<p className="text-sm text-gray-600">Acceso 24/7 desde cualquier dispositivo</p>
							</div>
						</div>
						<Badge variant="secondary">En línea</Badge>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
