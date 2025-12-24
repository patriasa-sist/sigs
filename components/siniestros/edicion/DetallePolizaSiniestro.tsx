"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	User,
	Phone,
	Mail,
	MessageCircle,
	MapPin,
	Car,
	Loader2,
	FileText,
	Building2,
	MapPinned,
	UserCircle,
	Calendar,
	DollarSign,
	Shield,
	CreditCard
} from "lucide-react";
import { obtenerDetalleCompletoPoliza } from "@/app/siniestros/actions";
import { generarURLWhatsApp } from "@/utils/whatsapp";
import type { ContactoClienteSiniestro } from "@/types/siniestro";
import type { DatosEspecificosRamo } from "@/types/cobranza";

interface DetallePolizaSiniestroProps {
	polizaId: string;
}

interface PolizaDetalle {
	numero_poliza?: string;
	ramo?: string;
	compania?: { nombre?: string };
	regional?: { nombre?: string };
	responsable?: { full_name?: string };
	inicio_vigencia?: string;
	fin_vigencia?: string;
	fecha_emision_compania?: string;
	moneda?: string;
	prima_total?: number;
	estado?: string;
	[key: string]: unknown;
}

export default function DetallePolizaSiniestro({ polizaId }: DetallePolizaSiniestroProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [poliza, setPoliza] = useState<PolizaDetalle | null>(null);
	const [contacto, setContacto] = useState<ContactoClienteSiniestro | null>(null);
	const [datosRamo, setDatosRamo] = useState<DatosEspecificosRamo | null>(null);

	useEffect(() => {
		loadDetallePoliza();
	// eslint-disable-next-line react-hooks/exhaustive-deps
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

	const formatEstado = (estado?: string) => {
		const estadoMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
			activa: { label: "Activa", variant: "default" },
			pendiente: { label: "Pendiente", variant: "secondary" },
			vencida: { label: "Vencida", variant: "destructive" },
			cancelada: { label: "Cancelada", variant: "outline" },
			renovada: { label: "Renovada", variant: "secondary" },
		};
		return estadoMap[estado || "activa"] || { label: estado || "Activa", variant: "default" as const };
	};

	return (
		<div className="space-y-4">
			{/* Información de la Póliza */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<FileText className="h-5 w-5 text-primary" />
						Información de la Póliza
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{/* Número de Póliza */}
						<div className="flex items-center gap-2">
							<Shield className="h-4 w-4 text-muted-foreground" />
							<div className="text-sm">
								<span className="text-muted-foreground">N° Póliza:</span>
								<p className="font-medium">{poliza.numero_poliza || "N/A"}</p>
							</div>
						</div>

						{/* Ramo */}
						<div className="flex items-center gap-2">
							<Car className="h-4 w-4 text-muted-foreground" />
							<div className="text-sm">
								<span className="text-muted-foreground">Ramo:</span>
								<p className="font-medium">{poliza.ramo || "N/A"}</p>
							</div>
						</div>

						{/* Estado */}
						<div className="flex items-center gap-2">
							<div className="text-sm flex items-center gap-2">
								<span className="text-muted-foreground">Estado:</span>
								<Badge variant={formatEstado(poliza.estado).variant}>
									{formatEstado(poliza.estado).label}
								</Badge>
							</div>
						</div>

						{/* Compañía */}
						<div className="flex items-center gap-2">
							<Building2 className="h-4 w-4 text-muted-foreground" />
							<div className="text-sm">
								<span className="text-muted-foreground">Compañía:</span>
								<p className="font-medium">{poliza.compania?.nombre || "N/A"}</p>
							</div>
						</div>

						{/* Regional */}
						<div className="flex items-center gap-2">
							<MapPinned className="h-4 w-4 text-muted-foreground" />
							<div className="text-sm">
								<span className="text-muted-foreground">Regional:</span>
								<p className="font-medium">{poliza.regional?.nombre || "N/A"}</p>
							</div>
						</div>

						{/* Responsable */}
						<div className="flex items-center gap-2">
							<UserCircle className="h-4 w-4 text-muted-foreground" />
							<div className="text-sm">
								<span className="text-muted-foreground">Responsable:</span>
								<p className="font-medium">{poliza.responsable?.full_name || "N/A"}</p>
							</div>
						</div>

						{/* Prima Total */}
						{poliza.prima_total !== undefined && (
							<div className="flex items-center gap-2">
								<DollarSign className="h-4 w-4 text-muted-foreground" />
								<div className="text-sm">
									<span className="text-muted-foreground">Prima Total:</span>
									<p className="font-medium">
										{poliza.moneda || "Bs"} {poliza.prima_total.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
									</p>
								</div>
							</div>
						)}

						{/* Fecha Emisión */}
						{poliza.fecha_emision_compania && (
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<div className="text-sm">
									<span className="text-muted-foreground">F. Emisión:</span>
									<p className="font-medium">
										{new Date(poliza.fecha_emision_compania).toLocaleDateString("es-BO")}
									</p>
								</div>
							</div>
						)}

						{/* Inicio Vigencia */}
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-green-600" />
							<div className="text-sm">
								<span className="text-muted-foreground">Inicio vigencia:</span>
								<p className="font-medium">
									{poliza.inicio_vigencia && typeof poliza.inicio_vigencia === 'string'
										? new Date(poliza.inicio_vigencia).toLocaleDateString("es-BO")
										: "N/A"}
								</p>
							</div>
						</div>

						{/* Fin Vigencia */}
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-red-600" />
							<div className="text-sm">
								<span className="text-muted-foreground">Fin vigencia:</span>
								<p className="font-medium">
									{poliza.fin_vigencia && typeof poliza.fin_vigencia === 'string'
										? new Date(poliza.fin_vigencia).toLocaleDateString("es-BO")
										: "N/A"}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Información de Contacto del Cliente */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<User className="h-5 w-5 text-primary" />
						Información de Contacto del Cliente
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Nombre Completo */}
						<div className="flex items-center gap-2 col-span-full">
							<User className="h-4 w-4 text-muted-foreground" />
							<div className="text-sm">
								<span className="font-medium">Cliente:</span> {contacto.nombre_completo}
							</div>
						</div>

						{/* Documento (CI/NIT) */}
						{contacto.documento && (
							<div className="flex items-center gap-2">
								<CreditCard className="h-4 w-4 text-muted-foreground" />
								<div className="text-sm">
									<span className="font-medium">CI/NIT:</span> {contacto.documento}
								</div>
							</div>
						)}

						{/* Teléfono */}
						{contacto.telefono && (
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-muted-foreground" />
								<div className="text-sm">
									<span className="font-medium">Teléfono:</span> {contacto.telefono}
								</div>
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
									className="text-sm text-blue-600 hover:underline flex items-center gap-1"
								>
									<span className="font-medium">Celular (WhatsApp):</span> {contacto.celular}
								</a>
							</div>
						)}

						{/* Email */}
						{contacto.correo && (
							<div className="flex items-center gap-2 col-span-full">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<a href={`mailto:${contacto.correo}`} className="text-sm text-blue-600 hover:underline">
									<span className="font-medium">Correo:</span> {contacto.correo}
								</a>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Bienes Asegurados */}
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
											Valor: {poliza?.moneda ?? "Bs"} {vehiculo.valor_asegurado.toLocaleString("es-BO")}
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
