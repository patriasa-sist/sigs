"use client";

import React, { useState } from "react";
import { FileSpreadsheet, BarChart3, Mail, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/vencimientos/FileUpload";
import Dashboard from "@/components/vencimientos/Dashboard";
import CriticalAlerts from "@/components/vencimientos/CriticalAlerts";
import { ProcessedInsuranceRecord } from "@/types/insurance";

type ViewState = "upload" | "dashboard" | "critical-alerts";

export default function HomePage() {
	const [insuranceData, setInsuranceData] = useState<ProcessedInsuranceRecord[]>([]);
	const [currentView, setCurrentView] = useState<ViewState>("upload");
	const [error, setError] = useState<string>("");

	const handleDataLoaded = (data: ProcessedInsuranceRecord[]) => {
		setInsuranceData(data);
		setCurrentView("dashboard");
		setError("");
	};

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
	};

	const resetToUpload = () => {
		setCurrentView("upload");
		setInsuranceData([]);
		setError("");
	};

	const goToCriticalAlerts = () => {
		setCurrentView("critical-alerts");
	};

	const goToDashboard = () => {
		setCurrentView("dashboard");
	};

	const stats = React.useMemo(() => {
		if (insuranceData.length === 0) return null;
		const total = insuranceData.length;
		const critical = insuranceData.filter((r) => r.status === "critical").length;
		const dueSoon = insuranceData.filter((r) => r.status === "due_soon").length;
		const pending = insuranceData.filter((r) => r.status === "pending").length;
		const expired = insuranceData.filter((r) => r.status === "expired").length;
		const totalValue = insuranceData.reduce((sum, r) => sum + r.valorAsegurado, 0);
		return { total, critical, dueSoon, pending, expired, totalValue };
	}, [insuranceData]);

	const renderCurrentView = () => {
		switch (currentView) {
			case "dashboard":
				return <Dashboard data={insuranceData} onBack={resetToUpload} onUpdateData={setInsuranceData} />;

			case "critical-alerts":
				return <CriticalAlerts data={insuranceData} onBack={goToDashboard} />;

			case "upload":
			default:
				return (
					<div className="space-y-8">
						<div className="text-center">
							<h2 className="text-3xl font-bold text-gray-900 mb-4">
								Bienvenido al Sistema de Cartas de Vencimiento
							</h2>
							<p className="text-lg text-gray-600 max-w-2xl mx-auto">
								Sube tu archivo Excel con los datos de seguros y automatiza la creación y envío de
								cartas de vencimiento a tus clientes.
							</p>
						</div>
						{error && (
							<Card className="border-red-200 bg-red-50">
								<CardContent className="p-4">
									<div className="flex items-center space-x-2 text-red-800">
										<AlertTriangle className="h-5 w-5" />
										<p className="font-medium">Error:</p>
									</div>
									<p className="text-red-700 mt-1">{error}</p>
								</CardContent>
							</Card>
						)}
						<FileUpload onDataLoaded={handleDataLoaded} onError={handleError} />
						<Card className="patria-card">
							<CardHeader>
								<CardTitle className="text-patria-blue">Instrucciones</CardTitle>
								<CardDescription>
									Asegúrate de que tu archivo Excel contenga las siguientes columnas:
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid md:grid-cols-2 gap-6">
									<div>
										<h4 className="font-semibold text-gray-900 mb-3">Columnas Requeridas:</h4>
										<ul className="space-y-2 text-sm text-gray-600">
											<li>
												• <span className="font-medium">FIN DE VIGENCIA</span> - Fecha de
												vencimiento
											</li>
											<li>
												• <span className="font-medium">COMPAÑÍA</span> - Aseguradora
											</li>
											<li>
												• <span className="font-medium">RAMO</span> - Tipo de seguro
											</li>
											<li>
												• <span className="font-medium">NO. PÓLIZA</span> - Número de póliza
											</li>
											<li>
												• <span className="font-medium">ASEGURADO</span> - Nombre del cliente
											</li>
											<li>
												• <span className="font-medium">EJECUTIVO</span> - Ejecutivo a cargo
											</li>
										</ul>
									</div>
									<div>
										<h4 className="font-semibold text-gray-900 mb-3">Columnas Opcionales:</h4>
										<ul className="space-y-2 text-sm text-gray-600">
											<li>
												• <span className="font-medium">TELÉFONO</span> - Contacto del cliente
											</li>
											<li>
												• <span className="font-medium">CORREO/DIRECCION</span> - Email del
												cliente
											</li>
											<li>
												• <span className="font-medium">VALOR ASEGURADO</span> - Monto asegurado
											</li>
											<li>
												• <span className="font-medium">PRIMA</span> - Prima del seguro
											</li>
											<li>
												• <span className="font-medium">MATERIA ASEGURADA</span> - Materia o
												dependiente asegurado
											</li>
										</ul>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="patria-gradient shadow-lg bg-slate-700">
				<div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{currentView !== "upload" && (
							<div className="flex items-center space-x-3">
								{stats && stats.critical > 0 && currentView !== "critical-alerts" && (
									<Button
										variant="ghost"
										onClick={goToCriticalAlerts}
										className="text-white hover:bg-white/10 border border-red-300"
									>
										<AlertTriangle className="h-4 w-4 mr-2" />
										{stats.critical} Críticos
									</Button>
								)}
								{currentView !== "dashboard" && (
									<Button
										variant="ghost"
										onClick={goToDashboard}
										className="text-white hover:bg-white/10"
									>
										<BarChart3 className="h-4 w-4 mr-2" />
										Dashboard
									</Button>
								)}
								<Button
									variant="ghost"
									onClick={resetToUpload}
									className="text-white hover:bg-white/10"
								>
									<FileSpreadsheet className="h-4 w-4 mr-2" />
									Nuevo Archivo
								</Button>
							</div>
						)}
					</div>
				</div>
			</header>
			<main className="w-full px-4 sm:px-6 lg:px-8 py-8">{renderCurrentView()}</main>
		</div>
	);
}
