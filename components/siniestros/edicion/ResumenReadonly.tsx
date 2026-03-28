"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Shield } from "lucide-react";
import type { SiniestroVista, CoberturaCatalogo } from "@/types/siniestro";

interface ResumenReadonlyProps {
	siniestro: SiniestroVista;
	coberturas: CoberturaCatalogo[];
}

export default function ResumenReadonly({ siniestro, coberturas }: ResumenReadonlyProps) {
	return (
		<div className="space-y-4">
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
					</div>

					<div className="pt-2 border-t">
						<p className="text-sm text-muted-foreground mb-1">Descripción</p>
						<p className="text-sm whitespace-pre-wrap bg-secondary/30 rounded-lg p-3">
							{siniestro.descripcion}
						</p>
					</div>

					{siniestro.contactos && siniestro.contactos.length > 0 && (
						<div className="pt-2 border-t">
							<p className="text-sm text-muted-foreground mb-2">Contactos</p>
							<div className="space-y-1.5">
								{siniestro.contactos.filter(c => c).map((contacto, idx) => {
									// Normalizar: puede venir como string JSON o como objeto
									let c: { nombre?: string; telefono?: string; correo?: string } = {};
									if (typeof contacto === "string") {
										try { c = JSON.parse(contacto); } catch { c = { nombre: contacto }; }
									} else {
										c = contacto as { nombre?: string; telefono?: string; correo?: string };
									}
									return (
										<div key={`contacto-${idx}`} className="text-sm bg-secondary/30 rounded px-3 py-2">
											{c.nombre && <span className="font-medium">{c.nombre}</span>}
											{c.telefono && <span className="text-muted-foreground"> · {c.telefono}</span>}
											{c.correo && <span className="text-muted-foreground"> · {c.correo}</span>}
											{!c.nombre && !c.telefono && !c.correo && (
												<span className="text-muted-foreground italic">Contacto sin datos</span>
											)}
										</div>
									);
								})}
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
							{coberturas.map((cobertura, idx) => (
								<div
									key={cobertura.id || `cobertura-${idx}`}
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

		</div>
	);
}
