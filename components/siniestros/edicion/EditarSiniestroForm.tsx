"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, XCircle, Ban, CheckCircle, ArrowLeft } from "lucide-react";
import ResumenReadonly from "./ResumenReadonly";
import AgregarObservacion from "./AgregarObservacion";
import AgregarDocumentos from "./AgregarDocumentos";
import HistorialCronologico from "./HistorialCronologico";
import type {
	SiniestroVista,
	CoberturaCatalogo,
	DocumentoSiniestro,
	ObservacionSiniestro,
	HistorialSiniestro,
} from "@/types/siniestro";

interface EditarSiniestroFormProps {
	siniestro: SiniestroVista;
	coberturas: CoberturaCatalogo[];
	documentos: DocumentoSiniestro[];
	observaciones: ObservacionSiniestro[];
	historial: HistorialSiniestro[];
	esAdmin: boolean;
}

const ESTADO_CONFIG = {
	abierto: {
		label: "Abierto",
		icon: AlertTriangle,
		className: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
	},
	rechazado: {
		label: "Rechazado",
		icon: XCircle,
		className: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
	},
	declinado: {
		label: "Declinado",
		icon: Ban,
		className: "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300",
	},
	concluido: {
		label: "Concluido",
		icon: CheckCircle,
		className: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
	},
};

export default function EditarSiniestroForm({
	siniestro,
	coberturas,
	documentos,
	observaciones,
	historial,
	esAdmin,
}: EditarSiniestroFormProps) {
	const [activeTab, setActiveTab] = useState("resumen");

	const estadoConfig = ESTADO_CONFIG[siniestro.estado as keyof typeof ESTADO_CONFIG] || ESTADO_CONFIG.abierto;
	const EstadoIcon = estadoConfig.icon;

	return (
		<div className="space-y-6">
			{/* Botón Volver */}
			<Button variant="outline" size="sm" asChild>
				<Link href="/siniestros">
					<ArrowLeft className="h-4 w-4 mr-2" />
					Volver a Siniestros
				</Link>
			</Button>

			{/* Header */}
			<Card>
				<CardHeader className="space-y-4">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-2">
							<h1 className="text-2xl font-bold">Siniestro: Póliza {siniestro.numero_poliza}</h1>
							<div className="flex items-center gap-3 text-sm text-muted-foreground">
								<span>Cliente: {siniestro.cliente_nombre}</span>
								<span>•</span>
								<span>Ramo: {siniestro.ramo}</span>
								<span>•</span>
								<span>
									Fecha: {new Date(siniestro.fecha_siniestro).toLocaleDateString("es-BO")}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${estadoConfig.className}`}>
								<EstadoIcon className="h-4 w-4" />
								{estadoConfig.label}
							</span>
						</div>
					</div>

					{/* Información adicional */}
					<div className="pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
						<div>
							<p className="text-muted-foreground">Monto Reserva</p>
							<p className="font-medium">
								{siniestro.moneda} {siniestro.monto_reserva.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">Compañía</p>
							<p className="font-medium">{siniestro.compania_nombre}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Departamento</p>
							<p className="font-medium">{siniestro.departamento_nombre}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Documentos</p>
							<p className="font-medium">{documentos.length}</p>
						</div>
						<div>
							<p className="text-muted-foreground">Observaciones</p>
							<p className="font-medium">{observaciones.length}</p>
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Tabs de Edición */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="resumen">Resumen</TabsTrigger>
					<TabsTrigger value="documentos">
						Documentos
						{documentos.length > 0 && (
							<span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
								{documentos.length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="observaciones">
						Observaciones
						{observaciones.length > 0 && (
							<span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
								{observaciones.length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value="historial">Historial</TabsTrigger>
				</TabsList>

				<TabsContent value="resumen" className="mt-6">
					<ResumenReadonly siniestro={siniestro} coberturas={coberturas} />
				</TabsContent>

				<TabsContent value="documentos" className="mt-6">
					<AgregarDocumentos
						siniestroId={siniestro.id}
						documentosIniciales={documentos}
						estadoSiniestro={siniestro.estado}
						esAdmin={esAdmin}
					/>
				</TabsContent>

				<TabsContent value="observaciones" className="mt-6">
					<AgregarObservacion
						siniestroId={siniestro.id}
						observacionesIniciales={observaciones}
						estadoSiniestro={siniestro.estado}
					/>
				</TabsContent>

				<TabsContent value="historial" className="mt-6">
					<HistorialCronologico historial={historial} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
