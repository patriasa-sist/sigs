"use client";

import React, { useState } from "react";
import { AlertTriangle, Clock, Mail, Phone, User, Building2, ChevronLeft, Calendar, FileText, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcessedInsuranceRecord } from "@/types/insurance";
import { formatCurrency, formatDate, getCriticalRecords } from "@/utils/excel";

interface CriticalAlertsProps {
	data: ProcessedInsuranceRecord[];
	onBack: () => void;
}

export default function CriticalAlerts({ data, onBack }: CriticalAlertsProps) {
	const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

	// Obtener registros críticos y organizarlos
	const criticalRecords = getCriticalRecords(data);
	const expiredRecords = data.filter((r) => r.status === "expired");

	// Agrupar por días restantes
	const groupedByDays = criticalRecords.reduce((acc, record) => {
		const days = record.daysUntilExpiry;
		if (!acc[days]) acc[days] = [];
		acc[days].push(record);
		return acc;
	}, {} as Record<number, ProcessedInsuranceRecord[]>);

	// Estadísticas de urgencia
	const urgencyStats = {
		today: criticalRecords.filter((r) => r.daysUntilExpiry === 0).length,
		tomorrow: criticalRecords.filter((r) => r.daysUntilExpiry === 1).length,
		thisWeek: criticalRecords.filter((r) => r.daysUntilExpiry <= 5).length,
		expired: expiredRecords.length,
	};

	const handleSelectRecord = (recordId: string) => {
		const newSelected = new Set(selectedRecords);
		if (newSelected.has(recordId)) {
			newSelected.delete(recordId);
		} else {
			newSelected.add(recordId);
		}
		setSelectedRecords(newSelected);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<Button variant="ghost" onClick={onBack}>
						<ChevronLeft className="h-4 w-4 mr-2" />
						Volver
					</Button>
					<div>
						<h1 className="text-2xl font-bold text-red-600 flex items-center">
							<AlertTriangle className="h-6 w-6 mr-2" />
							Alertas Críticas
						</h1>
						<p className="text-gray-600">
							{criticalRecords.length} seguros críticos • {expiredRecords.length} vencidos
						</p>
					</div>
				</div>

				<div className="flex space-x-2">
					<Button
						variant="outline"
						className="text-red-600 border-red-300"
						disabled={selectedRecords.size === 0}
					>
						<Zap className="h-4 w-4 mr-2" />
						Envío Urgente ({selectedRecords.size})
					</Button>
					<Button variant="outline">
						<Phone className="h-4 w-4 mr-2" />
						Contactar por WhatsApp
					</Button>
				</div>
			</div>

			{/* Tarjetas de estadísticas de urgencia */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="border-red-200 bg-red-50">
					<CardContent className="p-4 text-center">
						<div className="text-3xl font-bold text-red-600">{urgencyStats.today}</div>
						<div className="text-sm font-medium text-red-700">Vencen HOY</div>
					</CardContent>
				</Card>

				<Card className="border-orange-200 bg-orange-50">
					<CardContent className="p-4 text-center">
						<div className="text-3xl font-bold text-orange-600">{urgencyStats.tomorrow}</div>
						<div className="text-sm font-medium text-orange-700">Vencen MAÑANA</div>
					</CardContent>
				</Card>

				<Card className="border-yellow-200 bg-yellow-50">
					<CardContent className="p-4 text-center">
						<div className="text-3xl font-bold text-yellow-600">{urgencyStats.thisWeek}</div>
						<div className="text-sm font-medium text-yellow-700">Esta Semana</div>
					</CardContent>
				</Card>

				<Card className="border-gray-400 bg-gray-100">
					<CardContent className="p-4 text-center">
						<div className="text-3xl font-bold text-gray-700">{urgencyStats.expired}</div>
						<div className="text-sm font-medium text-gray-700">Ya Vencidos</div>
					</CardContent>
				</Card>
			</div>

			{/* Lista de registros críticos */}
			<div className="space-y-4">
				{/* Registros que vencen hoy */}
				{urgencyStats.today > 0 && (
					<Card className="border-red-300 bg-red-50">
						<CardHeader className="bg-red-100 border-b border-red-200">
							<CardTitle className="text-red-800 flex items-center">
								<AlertTriangle className="h-5 w-5 mr-2" />
								Vencen HOY - Acción Inmediata Requerida
							</CardTitle>
							<CardDescription className="text-red-700">
								Estos seguros vencen hoy. Contactar inmediatamente.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{groupedByDays[0]?.map((record) => (
								<CriticalRecordCard
									key={record.id}
									record={record}
									isSelected={selectedRecords.has(record.id!)}
									onSelect={() => handleSelectRecord(record.id!)}
									urgencyLevel="critical"
								/>
							))}
						</CardContent>
					</Card>
				)}

				{/* Registros que vencen mañana */}
				{urgencyStats.tomorrow > 0 && (
					<Card className="border-orange-300 bg-orange-50">
						<CardHeader className="bg-orange-100 border-b border-orange-200">
							<CardTitle className="text-orange-800 flex items-center">
								<Clock className="h-5 w-5 mr-2" />
								Vencen MAÑANA - Alta Prioridad
							</CardTitle>
							<CardDescription className="text-orange-700">
								Última oportunidad para contactar antes del vencimiento.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{groupedByDays[1]?.map((record) => (
								<CriticalRecordCard
									key={record.id}
									record={record}
									isSelected={selectedRecords.has(record.id!)}
									onSelect={() => handleSelectRecord(record.id!)}
									urgencyLevel="high"
								/>
							))}
						</CardContent>
					</Card>
				)}

				{/* Registros que vencen en 2-5 días */}
				{Object.keys(groupedByDays)
					.map(Number)
					.filter((days) => days >= 2 && days <= 5)
					.sort((a, b) => a - b)
					.map((days) => (
						<Card key={days} className="border-yellow-300 bg-yellow-50">
							<CardHeader className="bg-yellow-100 border-b border-yellow-200">
								<CardTitle className="text-yellow-800 flex items-center">
									<Calendar className="h-5 w-5 mr-2" />
									Vencen en {days} día{days > 1 ? "s" : ""} - Prioridad Media
								</CardTitle>
								<CardDescription className="text-yellow-700">
									{groupedByDays[days].length} seguros requieren atención pronto.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-0">
								{groupedByDays[days].map((record) => (
									<CriticalRecordCard
										key={record.id}
										record={record}
										isSelected={selectedRecords.has(record.id!)}
										onSelect={() => handleSelectRecord(record.id!)}
										urgencyLevel="medium"
									/>
								))}
							</CardContent>
						</Card>
					))}

				{/* Registros ya vencidos */}
				{expiredRecords.length > 0 && (
					<Card className="border-gray-400 bg-gray-100">
						<CardHeader className="bg-gray-200 border-b border-gray-300">
							<CardTitle className="text-gray-800 flex items-center">
								<FileText className="h-5 w-5 mr-2" />
								Ya Vencidos - Renovación Urgente
							</CardTitle>
							<CardDescription className="text-gray-700">
								Seguros que ya han vencido y necesitan renovación inmediata.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{expiredRecords.slice(0, 10).map((record) => (
								<CriticalRecordCard
									key={record.id}
									record={record}
									isSelected={selectedRecords.has(record.id!)}
									onSelect={() => handleSelectRecord(record.id!)}
									urgencyLevel="expired"
								/>
							))}
							{expiredRecords.length > 10 && (
								<div className="p-4 text-center text-gray-600 border-t border-gray-300">
									Y {expiredRecords.length - 10} registros vencidos más...
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

// Componente para cada registro crítico
interface CriticalRecordCardProps {
	record: ProcessedInsuranceRecord;
	isSelected: boolean;
	onSelect: () => void;
	urgencyLevel: "critical" | "high" | "medium" | "expired";
}

function CriticalRecordCard({ record, isSelected, onSelect, urgencyLevel }: CriticalRecordCardProps) {
	const urgencyColors = {
		critical: "border-l-red-500 bg-red-25",
		high: "border-l-orange-500 bg-orange-25",
		medium: "border-l-yellow-500 bg-yellow-25",
		expired: "border-l-gray-500 bg-gray-25",
	};

	// Función para obtener el color del badge basado en los días restantes
	const getUrgencyColor = (days: number) => {
		if (days <= 0) return "text-red-700 bg-red-100 border-red-200";
		if (days === 1) return "text-orange-700 bg-orange-100 border-orange-200";
		if (days <= 3) return "text-yellow-700 bg-yellow-100 border-yellow-200";
		return "text-blue-700 bg-blue-100 border-blue-200";
	};

	// Función para obtener la etiqueta del badge basada en los días restantes
	const getUrgencyLabel = (days: number) => {
		if (days <= 0) return "VENCE HOY";
		if (days === 1) return "VENCE MAÑANA";
		if (days <= 3) return `${days} DÍAS`;
		return `${days} DÍAS`;
	};

	return (
		<div
			className={`
        border-b border-gray-200 last:border-b-0 p-4 hover:bg-white/50 cursor-pointer transition-colors
        border-l-4 ${urgencyColors[urgencyLevel]}
        ${isSelected ? "bg-blue-50 border-l-blue-500" : ""}
      `}
			onClick={onSelect}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1 space-y-2">
					{/* Header con nombre y urgencia */}
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-gray-900 flex items-center">
							{isSelected && <span className="text-blue-600 mr-2">✓</span>}
							{record.asegurado}
						</h3>
						<Badge className={getUrgencyColor(record.daysUntilExpiry)}>
							{getUrgencyLabel(record.daysUntilExpiry)}
						</Badge>
					</div>

					{/* Información principal */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
						<div className="space-y-1">
							<div className="flex items-center text-gray-600">
								<Building2 className="h-4 w-4 mr-1" />
								<span className="font-medium">{record.compania}</span>
							</div>
							<div className="text-gray-500">
								Póliza: <code className="bg-gray-100 px-1 rounded">{record.noPoliza}</code>
							</div>
						</div>

						<div className="space-y-1">
							<div className="flex items-center text-gray-600">
								<Calendar className="h-4 w-4 mr-1" />
								<span>Vence: {formatDate(new Date(record.finDeVigencia))}</span>
							</div>
							<div className="text-gray-500">Valor: {formatCurrency(record.valorAsegurado || 0)}</div>
						</div>

						<div className="space-y-1">
							<div className="flex items-center text-gray-600">
								<User className="h-4 w-4 mr-1" />
								<span>{record.ejecutivo}</span>
							</div>
							{record.telefono && <div className="text-gray-500">Tel: {record.telefono}</div>}
						</div>
					</div>

					{/* Tipo de seguro */}
					{record.ramo && (
						<div className="text-sm">
							<Badge variant="outline" className="text-xs">
								{record.ramo}
							</Badge>
						</div>
					)}
				</div>

				{/* Acciones rápidas */}
				<div className="flex flex-col space-y-2 ml-4">
					<Button size="sm" variant="outline" className="text-xs">
						<Mail className="h-3 w-3 mr-1" />
						Email
					</Button>
					<Button size="sm" variant="outline" className="text-xs">
						<Phone className="h-3 w-3 mr-1" />
						WhatsApp
					</Button>
				</div>
			</div>
		</div>
	);
}
