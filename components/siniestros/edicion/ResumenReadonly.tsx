"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Building, Calendar, DollarSign, MapPin, Shield } from "lucide-react";
import type { SiniestroVista, CoberturaCatalogo } from "@/types/siniestro";

interface ResumenReadonlyProps {
	siniestro: SiniestroVista;
	coberturas: CoberturaCatalogo[];
}

export default function ResumenReadonly({ siniestro, coberturas }: ResumenReadonlyProps) {
	return (
		<div className="space-y-4">
			{/* Datos de la Póliza */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<FileText className="h-5 w-5 text-primary" />
						Póliza Asociada
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-muted-foreground">Número de Póliza</p>
							<p className="font-medium text-lg">{siniestro.numero_poliza}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Ramo</p>
							<span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
								{siniestro.ramo}
							</span>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
						<div className="flex gap-2">
							<User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Cliente</p>
								<p className="font-medium">{siniestro.cliente_nombre}</p>
								<p className="text-sm text-muted-foreground">
									{siniestro.cliente_tipo === "natural" ? "CI" : "NIT"}: {siniestro.cliente_documento}
								</p>
							</div>
						</div>

						<div className="flex gap-2">
							<Building className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Compañía Aseguradora</p>
								<p className="font-medium">{siniestro.compania_nombre}</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Detalles del Siniestro */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<MapPin className="h-5 w-5 text-primary" />
						Detalles del Siniestro
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex gap-2">
							<Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Fecha del Siniestro</p>
								<p className="font-medium">
									{new Date(siniestro.fecha_siniestro).toLocaleDateString("es-BO")}
								</p>
							</div>
						</div>

						<div className="flex gap-2">
							<Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Fecha de Reporte</p>
								<p className="font-medium">
									{new Date(siniestro.fecha_reporte).toLocaleDateString("es-BO")}
								</p>
							</div>
						</div>

						<div>
							<p className="text-sm text-muted-foreground">Lugar del Hecho</p>
							<p className="font-medium">{siniestro.lugar_hecho}</p>
						</div>

						<div>
							<p className="text-sm text-muted-foreground">Departamento</p>
							<p className="font-medium">{siniestro.departamento_nombre}</p>
						</div>

						<div className="flex gap-2">
							<DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
							<div>
								<p className="text-sm text-muted-foreground">Monto de Reserva</p>
								<p className="font-medium text-lg">
									{siniestro.moneda} {siniestro.monto_reserva.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
								</p>
							</div>
						</div>
					</div>

					<div className="pt-2 border-t">
						<p className="text-sm text-muted-foreground mb-1">Descripción</p>
						<p className="text-sm whitespace-pre-wrap bg-secondary/30 rounded-lg p-3">
							{siniestro.descripcion}
						</p>
					</div>

					{siniestro.contactos && siniestro.contactos.length > 0 && (
						<div className="pt-2 border-t">
							<p className="text-sm text-muted-foreground mb-1">Contactos</p>
							<div className="flex flex-wrap gap-2">
								{siniestro.contactos.map((contacto, idx) => (
									<span
										key={idx}
										className="text-xs bg-secondary px-2 py-1 rounded"
									>
										{contacto}
									</span>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Coberturas */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<Shield className="h-5 w-5 text-primary" />
						Coberturas Aplicadas
					</CardTitle>
				</CardHeader>
				<CardContent>
					{coberturas.length === 0 ? (
						<p className="text-sm text-muted-foreground">No se registraron coberturas</p>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{coberturas.map((cobertura) => (
								<div
									key={cobertura.id}
									className="bg-secondary/30 rounded-lg p-3"
								>
									<p className="font-medium text-sm">{cobertura.nombre}</p>
									{cobertura.descripcion && (
										<p className="text-xs text-muted-foreground mt-1">
											{cobertura.descripcion}
										</p>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Responsable del Siniestro */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<User className="h-5 w-5 text-primary" />
						Información de Registro
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-muted-foreground">Responsable de Póliza</p>
							<p className="font-medium">{siniestro.responsable_nombre}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Registrado por</p>
							<p className="font-medium">{siniestro.creado_por_nombre || "N/A"}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Fecha de Registro</p>
							<p className="font-medium">
								{new Date(siniestro.created_at).toLocaleDateString("es-BO")} -{" "}
								{new Date(siniestro.created_at).toLocaleTimeString("es-BO")}
							</p>
						</div>
						{siniestro.updated_at && siniestro.updated_at !== siniestro.created_at && (
							<div>
								<p className="text-sm text-muted-foreground">Última Actualización</p>
								<p className="font-medium">
									{new Date(siniestro.updated_at).toLocaleDateString("es-BO")} -{" "}
									{new Date(siniestro.updated_at).toLocaleTimeString("es-BO")}
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
