"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Mail, MessageCircle, MapPin, Car, Users as UsersIcon, Loader2 } from "lucide-react";
import { obtenerDetalleCompletoPoliza } from "@/app/siniestros/actions";
import { generarURLWhatsApp } from "@/utils/whatsapp";
import type { ContactoCliente, DatosEspecificosRamo } from "@/types/cobranza";

interface DetallePolizaSiniestroProps {
	polizaId: string;
}

export default function DetallePolizaSiniestro({ polizaId }: DetallePolizaSiniestroProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [poliza, setPoliza] = useState<any>(null);
	const [contacto, setContacto] = useState<ContactoCliente | null>(null);
	const [datosRamo, setDatosRamo] = useState<DatosEspecificosRamo | null>(null);

	useEffect(() => {
		loadDetallePoliza();
	}, [polizaId]);

	const loadDetallePoliza = async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await obtenerDetalleCompletoPoliza(polizaId);

			if (response.success && response.data) {
				setPoliza(response.data.poliza);
				setContacto(response.data.contacto);
				setDatosRamo(response.data.datos_ramo);
			} else {
				setError(response.error || "Error al cargar detalle de póliza");
			}
		} catch (err) {
			console.error("Error:", err);
			setError("Error al cargar información de la póliza");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="py-8">
					<div className="flex items-center justify-center gap-2 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin" />
						<span>Cargando detalle de póliza...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error || !poliza || !contacto || !datosRamo) {
		return (
			<Card>
				<CardContent className="py-8">
					<p className="text-center text-muted-foreground">{error || "No se pudo cargar la información"}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Información de Contacto */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<User className="h-5 w-5 text-primary" />
						Información de Contacto
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Teléfono */}
						{contacto.telefono && (
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm">
									<span className="font-medium">Teléfono:</span> {contacto.telefono}
								</span>
							</div>
						)}

						{/* Celular con WhatsApp */}
						{contacto.celular && (
							<div className="flex items-center gap-2">
								<MessageCircle className="h-4 w-4 text-green-600" />
								<a
									href={generarURLWhatsApp(contacto.celular, "")}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-600 hover:underline"
								>
									<span className="font-medium">Celular:</span> {contacto.celular}
								</a>
							</div>
						)}

						{/* Email */}
						{contacto.correo && (
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<a href={`mailto:${contacto.correo}`} className="text-sm text-blue-600 hover:underline">
									{contacto.correo}
								</a>
							</div>
						)}

						{/* Vigencia */}
						<div className="col-span-full grid grid-cols-2 gap-4 pt-2 border-t">
							<div className="text-sm">
								<span className="text-muted-foreground">Inicio vigencia:</span>
								<p className="font-medium">
									{poliza.fecha_inicio_vigencia
										? new Date(poliza.fecha_inicio_vigencia).toLocaleDateString("es-BO")
										: "N/A"}
								</p>
							</div>
							<div className="text-sm">
								<span className="text-muted-foreground">Fin vigencia:</span>
								<p className="font-medium">
									{poliza.fecha_fin_vigencia
										? new Date(poliza.fecha_fin_vigencia).toLocaleDateString("es-BO")
										: "N/A"}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Datos Específicos por Ramo */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<Car className="h-5 w-5 text-primary" />
						Bienes Asegurados
					</CardTitle>
				</CardHeader>
				<CardContent>
					{/* Automotor */}
					{datosRamo.tipo === "automotor" && (
						<>
							<p className="text-sm text-muted-foreground mb-3">
								Vehículos Asegurados ({datosRamo.vehiculos.length})
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{datosRamo.vehiculos.map((vehiculo) => (
									<div key={vehiculo.id} className="bg-secondary/30 rounded-lg p-3 border">
										<p className="font-bold text-blue-600">{vehiculo.placa}</p>
										<p className="text-sm text-muted-foreground">
											{vehiculo.marca} {vehiculo.modelo} {vehiculo.ano ? `(${vehiculo.ano})` : ""}
										</p>
										{vehiculo.color && <p className="text-xs text-muted-foreground">Color: {vehiculo.color}</p>}
										<p className="text-sm font-medium mt-1">
											Valor: {poliza.moneda || "Bs"} {vehiculo.valor_asegurado.toLocaleString("es-BO")}
										</p>
									</div>
								))}
							</div>
						</>
					)}

					{/* Salud/Vida/AP/Sepelio */}
					{(datosRamo.tipo === "salud" || datosRamo.tipo === "vida" || datosRamo.tipo === "ap" || datosRamo.tipo === "sepelio") && (
						<>
							<p className="text-sm text-muted-foreground mb-3">
								Asegurados ({datosRamo.asegurados.length})
							</p>
							{datosRamo.asegurados.length > 0 ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{datosRamo.asegurados.map((asegurado, idx) => (
										<div key={idx} className="bg-secondary/30 rounded-lg p-3 border">
											<p className="font-medium">{asegurado.client_name}</p>
											<p className="text-sm text-muted-foreground">CI: {asegurado.client_ci}</p>
											{asegurado.nivel_nombre && (
												<p className="text-xs text-muted-foreground">Nivel: {asegurado.nivel_nombre}</p>
											)}
											{asegurado.cargo && <p className="text-xs text-muted-foreground">Cargo: {asegurado.cargo}</p>}
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground italic">
									No hay asegurados registrados (datos en proceso de migración)
								</p>
							)}
						</>
					)}

					{/* Incendio */}
					{datosRamo.tipo === "incendio" && (
						<>
							<p className="text-sm text-muted-foreground mb-3">Ubicaciones Aseguradas</p>
							{datosRamo.ubicaciones.length > 0 ? (
								<div className="space-y-2">
									{datosRamo.ubicaciones.map((ubicacion, idx) => (
										<div key={idx} className="flex items-center gap-2 text-sm">
											<MapPin className="h-4 w-4 text-muted-foreground" />
											<span>{ubicacion}</span>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground italic">
									No hay ubicaciones registradas (datos en proceso de migración)
								</p>
							)}
						</>
					)}

					{/* Otros */}
					{datosRamo.tipo === "otros" && (
						<p className="text-sm text-muted-foreground">
							Ramo: <span className="font-medium">{datosRamo.descripcion}</span>
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
