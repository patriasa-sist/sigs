"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { obtenerDetallePoliza, type PolizaDetalle } from "../actions";
import { validarPoliza, rechazarPoliza } from "@/app/gerencia/validacion/actions";
import { checkPolicyEditPermission } from "@/app/polizas/permisos/actions";
import { RechazoPolizaModal } from "@/components/gerencia/RechazoPolizaModal";
import { ValidarPolizaModal } from "@/components/gerencia/ValidarPolizaModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PolicyPermissionsModal } from "@/components/polizas/PolicyPermissionsModal";
import AnexoDetalleSection from "@/components/polizas/anexos/AnexoDetalleSection";
import {
	FileText,
	ArrowLeft,
	Calendar,
	ExternalLink,
	Building2,
	User,
	MapPin,
	Car,
	FileDown,
	CreditCard,
	XCircle,
	CheckCircle,
	Pencil,
	Shield,
	Heart,
	Truck,
	Ship,
	Wrench,
	Plus,
	Flame,
	ShieldAlert,
	Users,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import Link from "next/link";

export default function PolizaDetallePage() {
	const router = useRouter();
	const params = useParams();
	const polizaId = params.id as string;

	const [poliza, setPoliza] = useState<PolizaDetalle | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [userRole, setUserRole] = useState<string | null>(null);
	const [validationLoading, setValidationLoading] = useState<"validar" | "rechazar" | null>(null);

	// Edit permission state
	const [canEdit, setCanEdit] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isTeamLeader, setIsTeamLeader] = useState(false);
	const [showPermissionsModal, setShowPermissionsModal] = useState(false);
	const [showValidarModal, setShowValidarModal] = useState(false);
	const [showRechazoModal, setShowRechazoModal] = useState(false);

	const cargarDetalle = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		// Load policy details and edit permissions in parallel
		const [resultado, permResult] = await Promise.all([
			obtenerDetallePoliza(polizaId),
			checkPolicyEditPermission(polizaId),
		]);

		if (resultado.success && resultado.poliza) {
			setPoliza(resultado.poliza);
			setUserRole(resultado.userRole || null);
			setIsAdmin(resultado.userRole === "admin");

			if (permResult.success) {
				setCanEdit(permResult.data.canEdit);
				setIsAdmin(permResult.data.isAdmin);
				setIsTeamLeader(permResult.data.isTeamLeader ?? false);
			}
		} else {
			setError(resultado.error || "Error al cargar la póliza");
		}
		setIsLoading(false);
	}, [polizaId]);

	useEffect(() => {
		cargarDetalle();
	}, [cargarDetalle]);

	const getEstadoStyle = (estado: string) => {
		const styles = {
			pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
			activa: "bg-green-100 text-green-800 border-green-200",
			vencida: "bg-red-100 text-red-800 border-red-200",
			cancelada: "bg-gray-100 text-gray-800 border-gray-200",
			renovada: "bg-blue-100 text-blue-800 border-blue-200",
			rechazada: "bg-orange-100 text-orange-800 border-orange-200",
			anulada: "bg-red-200 text-red-900 border-red-300",
		};
		return styles[estado as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
	};

	const getEstadoLabel = (estado: string) => {
		const labels = {
			pendiente: "Pendiente",
			activa: "Activa",
			vencida: "Vencida",
			cancelada: "Cancelada",
			renovada: "Renovada",
			rechazada: "Rechazada",
			anulada: "Anulada",
		};
		return labels[estado as keyof typeof labels] || estado;
	};

	// Verificar si el usuario puede validar (admin, usuario o líder de equipo con póliza pendiente)
	const puedeValidar =
		(userRole === "admin" || userRole === "usuario" || isTeamLeader) && poliza?.estado === "pendiente";

	// Abrir modal de confirmación de validación
	const handleValidar = () => {
		setShowValidarModal(true);
	};

	// Ejecutar validación después de confirmar en modal
	const handleValidarConfirm = async () => {
		if (!poliza) return;
		setValidationLoading("validar");
		const result = await validarPoliza(poliza.id);
		if (result.success) {
			setShowValidarModal(false);
			// Recargar los datos de la póliza
			await cargarDetalle();
		} else {
			alert(`Error: ${result.error}`);
		}
		setValidationLoading(null);
	};

	// Manejar rechazo con motivo desde modal
	const handleRechazar = async (motivo: string) => {
		if (!poliza) return;
		setValidationLoading("rechazar");
		const result = await rechazarPoliza(poliza.id, motivo);
		if (result.success) {
			setShowRechazoModal(false);
			// Recargar los datos de la póliza
			await cargarDetalle();
		} else {
			alert(`Error: ${result.error}`);
		}
		setValidationLoading(null);
	};

	const getEstadoPagoStyle = (estado: string) => {
		const styles = {
			pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
			pagado: "bg-green-100 text-green-800 border-green-200",
			vencido: "bg-red-100 text-red-800 border-red-200",
			parcial: "bg-blue-100 text-blue-800 border-blue-200",
		};
		return styles[estado as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200";
	};

	const getEstadoPagoLabel = (estado: string) => {
		const labels = {
			pendiente: "Pendiente",
			pagado: "Pagado",
			vencido: "Vencido",
			parcial: "Parcial",
		};
		return labels[estado as keyof typeof labels] || estado;
	};

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				{/* Back button skeleton */}
				<div className="mb-6">
					<div className="h-8 w-20 bg-muted rounded animate-pulse mb-4" />
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-2">
							<div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
							<div className="h-7 w-48 bg-muted rounded animate-pulse" />
							<div className="h-4 w-40 bg-muted rounded animate-pulse" />
						</div>
						<div className="flex gap-2">
							<div className="h-8 w-20 bg-muted rounded animate-pulse" />
							<div className="h-8 w-20 bg-muted rounded animate-pulse" />
						</div>
					</div>
				</div>
				{/* Content grid skeleton */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="border border-border rounded-lg p-5 space-y-3">
								<div className="h-4 w-32 bg-muted rounded animate-pulse" />
								<div className="grid grid-cols-2 gap-3">
									{[1, 2, 3, 4].map((j) => (
										<div key={j} className="space-y-1.5">
											<div className="h-3 w-20 bg-muted rounded animate-pulse" />
											<div className="h-4 w-28 bg-muted rounded animate-pulse" />
										</div>
									))}
								</div>
							</div>
						))}
					</div>
					<div className="space-y-4">
						{[1, 2].map((i) => (
							<div key={i} className="border border-border rounded-lg p-5 space-y-3">
								<div className="h-4 w-24 bg-muted rounded animate-pulse" />
								{[1, 2, 3].map((j) => (
									<div key={j} className="flex justify-between">
										<div className="h-4 w-24 bg-muted rounded animate-pulse" />
										<div className="h-4 w-16 bg-muted rounded animate-pulse" />
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error || !poliza) {
		return (
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
				<div className="text-center py-16">
					<XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
					<h2 className="text-2xl font-semibold text-foreground mb-2">Error al cargar la póliza</h2>
					<p className="text-sm text-muted-foreground mb-6">{error}</p>
					<Button onClick={() => router.push("/polizas")}>Volver a Pólizas</Button>
				</div>
			</div>
		);
	}

	// Precompute history for sidebar
	const edicionesRelevantes = (poliza.historial || []).filter((item) => {
		if (item.accion === "creacion") return false;
		if (
			item.accion === "edicion" &&
			item.campos_modificados?.length === 1 &&
			item.campos_modificados[0] === "estado"
		)
			return false;
		return true;
	});
	const formatCampos = (campos: string[] | null) => {
		if (!campos || campos.length === 0) return null;
		const labels: Record<string, string> = {
			prima_total: "prima",
			inicio_vigencia: "inicio vigencia",
			fin_vigencia: "fin vigencia",
			fecha_emision_compania: "fecha emisión",
			modalidad_pago: "modalidad pago",
			compania_aseguradora: "compañía",
			numero_poliza: "número póliza",
			responsable: "ejecutivo",
			regional: "regional",
			categoria: "categoría",
			estado: "estado",
			moneda: "moneda",
			ramo: "ramo",
		};
		const cf = campos.filter((c) => c !== "estado" || campos.length === 1);
		return cf.map((c) => labels[c] || c).join(", ");
	};

	// Calcular estadísticas de pagos
	const totalPagos = poliza.pagos.length;
	const pagosPagados = poliza.pagos.filter((p) => p.estado === "pagado").length;
	const pagosPendientes = poliza.pagos.filter((p) => p.estado === "pendiente").length;
	const montoPagado = poliza.pagos.filter((p) => p.estado === "pagado").reduce((sum, p) => sum + p.monto, 0);
	const montoPendiente = poliza.pagos.filter((p) => p.estado !== "pagado").reduce((sum, p) => sum + p.monto, 0);

	return (
		<div className="container mx-auto px-4 py-8 max-w-7xl">
			{/* ── Header ───────────────────────────────────────────── */}
			<div className="mb-6">
				<Button variant="ghost" size="sm" onClick={() => router.push("/polizas")} className="mb-4 -ml-1">
					<ArrowLeft className="h-4 w-4" />
					Pólizas
				</Button>
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 mb-1.5 flex-wrap">
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoStyle(poliza.estado)}`}
							>
								{getEstadoLabel(poliza.estado)}
							</span>
							{poliza.es_renovacion && (
								<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
									Renovación de Nº {poliza.nro_poliza_anterior}
								</span>
							)}
						</div>
						<h1 className="text-2xl font-semibold text-foreground font-mono tracking-tight">
							{poliza.numero_poliza}
						</h1>
						<p className="text-sm text-muted-foreground mt-0.5">
							{poliza.ramo} · {poliza.compania_nombre}
						</p>
					</div>
					<div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
						{(isAdmin || isTeamLeader) && (
							<Button variant="ghost" size="sm" onClick={() => setShowPermissionsModal(true)}>
								<Shield className="h-4 w-4" />
								Permisos
							</Button>
						)}
						{canEdit && (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => router.push(`/polizas/${polizaId}/editar`)}
							>
								<Pencil className="h-4 w-4" />
								Editar
							</Button>
						)}
						{poliza.estado === "activa" && (
							<Button size="sm" onClick={() => router.push(`/polizas/anexos/nuevo?polizaId=${polizaId}`)}>
								<Plus className="h-4 w-4" />
								Nuevo Anexo
							</Button>
						)}
						{puedeValidar && (
							<>
								<Button
									variant="default"
									size="sm"
									onClick={handleValidar}
									disabled={validationLoading !== null}
								>
									<CheckCircle className="h-4 w-4" />
									{validationLoading === "validar" ? "Validando…" : "Validar"}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setShowRechazoModal(true)}
									disabled={validationLoading !== null}
								>
									<XCircle className="h-4 w-4" />
									Rechazar
								</Button>
							</>
						)}
					</div>
				</div>
			</div>

			{/* ── Main Grid ──────────────────────────────────────── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				{/* Left Column - Policy data */}
				<div className="lg:col-span-2 space-y-5">
					{/* Información General */}
					<div className="bg-card rounded-lg border border-border p-5">
						<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
							Información General
						</h2>
						<div className="grid grid-cols-2 gap-6">
							<div>
								<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
									<User className="h-4 w-4" />
									Cliente
								</label>
								<Link
									href={`/clientes?detalle=${poliza.client_id}`}
									className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline mt-1 group"
								>
									{poliza.client_name}
									<ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
								</Link>
								<p className="text-sm text-gray-600">CI/NIT: {poliza.client_ci}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
									<Building2 className="h-4 w-4" />
									Compañía Aseguradora
								</label>
								<p className="text-sm text-foreground mt-1">{poliza.compania_nombre}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Ramo</label>
								<p className="text-sm text-foreground mt-1">{poliza.ramo}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Director de cartera</label>
								<p className="text-sm text-foreground mt-1">{poliza.director_cartera_nombre || "—"}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
									<MapPin className="h-4 w-4" />
									Regional
								</label>
								<p className="text-sm text-foreground mt-1">{poliza.regional_nombre}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Ejecutivo comercial</label>
								<p className="text-sm text-foreground mt-1">{poliza.responsable_nombre}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Categoría</label>
								<p className="text-sm text-foreground mt-1">{poliza.categoria_nombre || "—"}</p>
							</div>
						</div>
					</div>

					{/* Vigencia */}
					<div className="bg-card rounded-lg border border-border p-5">
						<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
							Vigencia
						</h2>
						<div className="grid grid-cols-3 gap-6">
							<div>
								<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
									<Calendar className="h-4 w-4" />
									Fecha de Emisión
								</label>
								<p className="text-sm text-foreground mt-1">
									{formatDate(poliza.fecha_emision_compania)}
								</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Inicio de Vigencia</label>
								<p className="text-sm text-foreground mt-1">{formatDate(poliza.inicio_vigencia)}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Fin de Vigencia</label>
								<p className="text-sm text-foreground mt-1">{formatDate(poliza.fin_vigencia)}</p>
							</div>
						</div>
					</div>

					{/* Vehículos Asegurados (Automotor) */}
					{poliza.vehiculos && poliza.vehiculos.length > 0 && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Car className="h-5 w-5" />
								Vehículos Asegurados ({poliza.vehiculos.filter((v) => !v._excluido_por).length})
								{poliza.vehiculos.some((v) => v._excluido_por) && (
									<span className="text-sm font-normal text-gray-500">
										({poliza.vehiculos.filter((v) => v._excluido_por).length} excluido
										{poliza.vehiculos.filter((v) => v._excluido_por).length > 1 ? "s" : ""})
									</span>
								)}
							</h2>
							<div className="space-y-4">
								{poliza.vehiculos.map((vehiculo) => (
									<div
										key={vehiculo.id}
										className={`border rounded-lg p-4 ${
											vehiculo._excluido_por
												? "opacity-50 border-red-200 bg-red-50/30"
												: vehiculo._origen_anexo
													? "border-green-200 bg-green-50/30"
													: ""
										}`}
									>
										{/* Anexo badge */}
										{(vehiculo._origen_anexo || vehiculo._excluido_por) && (
											<div className="mb-3">
												{vehiculo._origen_anexo && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
														Incluido por {vehiculo._origen_anexo}
													</span>
												)}
												{vehiculo._excluido_por && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
														Excluido por {vehiculo._excluido_por}
													</span>
												)}
											</div>
										)}
										<div className="grid grid-cols-3 gap-4">
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Placa
												</label>
												<p
													className={`text-base font-semibold text-gray-900 ${vehiculo._excluido_por ? "line-through" : ""}`}
												>
													{vehiculo.placa}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Tipo
												</label>
												<p className="text-sm text-foreground">
													{vehiculo.tipo_vehiculo || "-"}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Marca/Modelo
												</label>
												<p className="text-sm text-foreground">
													{vehiculo.marca || "-"} {vehiculo.modelo || ""}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">Año</label>
												<p className="text-sm text-foreground">{vehiculo.ano || "-"}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Color
												</label>
												<p className="text-sm text-foreground">{vehiculo.color || "-"}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">Uso</label>
												<p className="text-sm text-foreground capitalize">
													{vehiculo.uso || "-"}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Valor Asegurado
												</label>
												<p className="text-sm font-semibold text-foreground">
													{formatCurrency(vehiculo.valor_asegurado, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Franquicia
												</label>
												<p className="text-sm text-foreground">
													{formatCurrency(vehiculo.franquicia, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Coaseguro
												</label>
												<p className="text-sm text-foreground">
													{vehiculo.coaseguro != null ? `${vehiculo.coaseguro}%` : "-"}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Nro. Chasis
												</label>
												<p className="text-sm text-foreground">{vehiculo.nro_chasis || "-"}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Nro. Motor
												</label>
												<p className="text-sm text-foreground">{vehiculo.nro_motor || "-"}</p>
											</div>
											{vehiculo.ejes != null && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Ejes
													</label>
													<p className="text-sm text-foreground">{vehiculo.ejes}</p>
												</div>
											)}
											{vehiculo.nro_asientos != null && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Asientos
													</label>
													<p className="text-sm text-foreground">{vehiculo.nro_asientos}</p>
												</div>
											)}
											{vehiculo.plaza_circulacion && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Plaza de Circulación
													</label>
													<p className="text-sm text-foreground">
														{vehiculo.plaza_circulacion}
													</p>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Salud: Asegurados + Niveles + Beneficiarios */}
					{(poliza.asegurados_salud || poliza.niveles_salud || poliza.beneficiarios_salud) && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Heart className="h-5 w-5" />
								Datos de Salud
							</h2>

							{/* Regional del asegurado y maternidad */}
							<div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Regional del Asegurado
									</p>
									<p className="text-sm font-medium text-foreground">
										{poliza.regional_asegurado_nombre || (
											<span className="text-gray-400 italic">Sin dato</span>
										)}
									</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Cobertura de Maternidad
									</p>
									<p className="text-sm font-medium text-foreground">
										{poliza.tiene_maternidad ? "Sí" : "No"}
									</p>
								</div>
							</div>

							{/* Niveles de cobertura */}
							{poliza.niveles_salud && poliza.niveles_salud.length > 0 && (
								<div className="mb-4 p-4 bg-muted/50 rounded-lg">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Niveles de Cobertura
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
										{poliza.niveles_salud.map((nivel) => (
											<div key={nivel.id} className="bg-white border rounded p-3 text-sm">
												<p className="font-medium text-gray-900">{nivel.nombre}</p>
												<p className="text-gray-600">
													{formatCurrency(nivel.monto, poliza.moneda)}
												</p>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Asegurados (contratante/titular) */}
							{poliza.asegurados_salud && poliza.asegurados_salud.length > 0 && (
								<div className="mb-4">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Asegurados
									</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="border-b border-border">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Nombre
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														CI/NIT
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Rol
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Nivel
													</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.asegurados_salud.map((a) => (
													<tr key={a.id} className="hover:bg-muted/40 transition-colors">
														<td className="px-4 py-2 text-sm font-medium text-foreground">
															{a.client_name}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{a.client_ci}
														</td>
														<td className="px-4 py-2 text-sm text-foreground capitalize">
															{a.rol}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{a.nivel_nombre || "-"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}

							{/* Beneficiarios (dependientes/conyugues) */}
							{poliza.beneficiarios_salud && poliza.beneficiarios_salud.length > 0 && (
								<div>
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Beneficiarios (
										{poliza.beneficiarios_salud.filter((b) => !b._excluido_por).length})
									</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="border-b border-border">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Nombre
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Carnet
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Fecha Nac.
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Género
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Rol
													</th>
													{poliza.tiene_anexos_activos && (
														<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
															Estado
														</th>
													)}
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.beneficiarios_salud.map((b) => (
													<tr
														key={b.id}
														className={`hover:bg-muted/40 transition-colors ${
															b._excluido_por
																? "opacity-50 bg-red-50/30"
																: b._origen_anexo
																	? "bg-green-50/30"
																	: ""
														}`}
													>
														<td
															className={`px-4 py-2 text-sm font-medium text-gray-900 ${b._excluido_por ? "line-through" : ""}`}
														>
															{b.nombre_completo}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{b.carnet}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{formatDate(b.fecha_nacimiento)}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{b.genero}
														</td>
														<td className="px-4 py-2 text-sm text-foreground capitalize">
															{b.rol}
														</td>
														{poliza.tiene_anexos_activos && (
															<td className="px-4 py-2">
																{b._origen_anexo && (
																	<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
																		+{b._origen_anexo}
																	</span>
																)}
																{b._excluido_por && (
																	<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
																		-{b._excluido_por}
																	</span>
																)}
															</td>
														)}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Incendio: Bienes + Items + Asegurados */}
					{(poliza.incendio_bienes || poliza.incendio_asegurados) && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Flame className="h-5 w-5" />
								Incendio y Aliados
							</h2>

							{poliza.incendio_asegurados && poliza.incendio_asegurados.length > 0 && (
								<div className="mb-4 p-4 bg-muted/50 rounded-lg">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Asegurados Adicionales
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{poliza.incendio_asegurados.map((a) => (
											<div
												key={a.id}
												className="bg-white border rounded p-2 text-sm flex items-center gap-2"
											>
												<User className="h-4 w-4 text-gray-400" />
												<span className="font-medium">{a.client_name}</span>
												<span className="text-gray-500">CI/NIT: {a.client_ci}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{poliza.incendio_bienes && poliza.incendio_bienes.length > 0 && (
								<div className="space-y-4">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Bienes Asegurados (
										{poliza.incendio_bienes.filter((b) => !b._excluido_por).length})
									</h3>
									{poliza.incendio_bienes.map((bien) => (
										<div
											key={bien.id}
											className={`border rounded-lg p-4 ${
												bien._excluido_por
													? "opacity-50 border-red-200 bg-red-50/30"
													: bien._origen_anexo
														? "border-green-200 bg-green-50/30"
														: ""
											}`}
										>
											{(bien._origen_anexo || bien._excluido_por) && (
												<div className="mb-2">
													{bien._origen_anexo && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
															Incluido por {bien._origen_anexo}
														</span>
													)}
													{bien._excluido_por && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
															Excluido por {bien._excluido_por}
														</span>
													)}
												</div>
											)}
											<div className="flex items-center justify-between mb-3">
												<div>
													<label className="text-sm font-medium text-gray-600 flex items-center gap-1">
														<MapPin className="h-3 w-3" /> Dirección
													</label>
													<p
														className={`text-base text-gray-900 ${bien._excluido_por ? "line-through" : ""}`}
													>
														{bien.direccion}
													</p>
												</div>
												<div className="text-right">
													<label className="text-xs font-medium text-muted-foreground">
														Valor Total
													</label>
													<p className="text-sm font-semibold text-foreground">
														{formatCurrency(bien.valor_total_declarado, poliza.moneda)}
													</p>
													{bien.es_primer_riesgo && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
															Primer Riesgo
														</span>
													)}
												</div>
											</div>
											{bien.items.length > 0 && (
												<div className="border-t pt-2">
													<table className="w-full text-sm">
														<tbody>
															{bien.items.map((item, idx) => (
																<tr key={idx} className="border-b last:border-0">
																	<td className="py-1 text-gray-700">
																		{item.nombre}
																	</td>
																	<td className="py-1 text-right font-medium text-gray-900">
																		{formatCurrency(item.monto, poliza.moneda)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* Riesgos Varios: Bienes + Items + Asegurados */}
					{(poliza.riesgos_varios_bienes || poliza.riesgos_varios_asegurados) && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<ShieldAlert className="h-5 w-5" />
								Riesgos Varios Misceláneos
							</h2>

							{poliza.riesgos_varios_asegurados && poliza.riesgos_varios_asegurados.length > 0 && (
								<div className="mb-4 p-4 bg-muted/50 rounded-lg">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Asegurados
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{poliza.riesgos_varios_asegurados.map((a) => (
											<div
												key={a.id}
												className="bg-white border rounded p-2 text-sm flex items-center gap-2"
											>
												<User className="h-4 w-4 text-gray-400" />
												<span className="font-medium">{a.client_name}</span>
												<span className="text-gray-500">CI/NIT: {a.client_ci}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{poliza.riesgos_varios_bienes && poliza.riesgos_varios_bienes.length > 0 && (
								<div className="space-y-4">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Bienes Asegurados (
										{poliza.riesgos_varios_bienes.filter((b) => !b._excluido_por).length})
									</h3>
									{poliza.riesgos_varios_bienes.map((bien) => (
										<div
											key={bien.id}
											className={`border rounded-lg p-4 ${
												bien._excluido_por
													? "opacity-50 border-red-200 bg-red-50/30"
													: bien._origen_anexo
														? "border-green-200 bg-green-50/30"
														: ""
											}`}
										>
											{(bien._origen_anexo || bien._excluido_por) && (
												<div className="mb-2">
													{bien._origen_anexo && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
															Incluido por {bien._origen_anexo}
														</span>
													)}
													{bien._excluido_por && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
															Excluido por {bien._excluido_por}
														</span>
													)}
												</div>
											)}
											<div className="flex items-center justify-between mb-3">
												<div>
													<label className="text-sm font-medium text-gray-600 flex items-center gap-1">
														<MapPin className="h-3 w-3" /> Dirección
													</label>
													<p
														className={`text-base text-gray-900 ${bien._excluido_por ? "line-through" : ""}`}
													>
														{bien.direccion}
													</p>
												</div>
												<div className="text-right">
													<label className="text-xs font-medium text-muted-foreground">
														Valor Total
													</label>
													<p className="text-sm font-semibold text-foreground">
														{formatCurrency(bien.valor_total_declarado, poliza.moneda)}
													</p>
													{bien.es_primer_riesgo && (
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
															Primer Riesgo
														</span>
													)}
												</div>
											</div>
											{bien.items.length > 0 && (
												<div className="border-t pt-2">
													<table className="w-full text-sm">
														<tbody>
															{bien.items.map((item, idx) => (
																<tr key={idx} className="border-b last:border-0">
																	<td className="py-1 text-gray-700">
																		{item.nombre}
																	</td>
																	<td className="py-1 text-right font-medium text-gray-900">
																		{formatCurrency(item.monto, poliza.moneda)}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* Responsabilidad Civil */}
					{poliza.responsabilidad_civil && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Shield className="h-5 w-5" />
								Responsabilidad Civil
							</h2>

							{/* Datos generales */}
							<div className="grid grid-cols-2 gap-6 mb-6">
								<div>
									<label className="text-xs font-medium text-muted-foreground">Tipo de Póliza</label>
									<p className="text-sm text-foreground mt-1 capitalize">
										{poliza.responsabilidad_civil.tipo_poliza}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Límite de Cobertura</label>
									<p className="text-sm font-semibold text-foreground mt-1">
										{formatCurrency(poliza.responsabilidad_civil.valor_asegurado, poliza.moneda)}
									</p>
								</div>
							</div>

							{/* Vehículos */}
							{poliza.responsabilidad_civil.vehiculos.length > 0 && (
								<>
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
										<Car className="h-4 w-4" />
										Vehículos Asegurados ({poliza.responsabilidad_civil.vehiculos.length})
									</h3>
									<div className="space-y-3">
										{poliza.responsabilidad_civil.vehiculos.map((v, idx) => (
											<div key={idx} className="border border-border rounded-lg p-4 bg-muted/30">
												{/* Fila principal: identidad del vehículo */}
												<div className="flex items-center gap-3 mb-3">
													<span className="font-semibold text-foreground text-sm">{v.placa}</span>
													{v.tipo_vehiculo_nombre && (
														<span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
															{v.tipo_vehiculo_nombre}
														</span>
													)}
													<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
														v.uso === "publico"
															? "bg-blue-100 text-blue-800"
															: v.uso === "privado"
															? "bg-purple-100 text-purple-800"
															: "bg-green-100 text-green-800"
													}`}>
														{v.uso === "publico" ? "Público" : v.uso === "privado" ? "Privado" : "Particular"}
													</span>
												</div>

												{/* Grid de datos */}
												<div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
													<div>
														<label className="text-xs text-muted-foreground">Chasis</label>
														<p className="text-xs font-medium text-foreground">{v.nro_chasis}</p>
													</div>
													{(v.marca_vehiculo_nombre || v.modelo) && (
														<div>
															<label className="text-xs text-muted-foreground">Marca / Modelo</label>
															<p className="text-xs font-medium text-foreground">
																{[v.marca_vehiculo_nombre, v.modelo].filter(Boolean).join(" ")}
															</p>
														</div>
													)}
													{v.ano && (
														<div>
															<label className="text-xs text-muted-foreground">Año</label>
															<p className="text-xs font-medium text-foreground">{v.ano}</p>
														</div>
													)}
													{v.color && (
														<div>
															<label className="text-xs text-muted-foreground">Color</label>
															<p className="text-xs font-medium text-foreground">{v.color}</p>
														</div>
													)}
													{v.nro_motor && (
														<div>
															<label className="text-xs text-muted-foreground">Nº Motor</label>
															<p className="text-xs font-medium text-foreground">{v.nro_motor}</p>
														</div>
													)}
													{v.servicio && (
														<div>
															<label className="text-xs text-muted-foreground">Servicio</label>
															<p className="text-xs font-medium text-foreground">{v.servicio}</p>
														</div>
													)}
													{v.capacidad && (
														<div>
															<label className="text-xs text-muted-foreground">Capacidad</label>
															<p className="text-xs font-medium text-foreground">{v.capacidad}</p>
														</div>
													)}
													{v.region_uso && (
														<div>
															<label className="text-xs text-muted-foreground">Región de Uso</label>
															<p className="text-xs font-medium text-foreground">{v.region_uso}</p>
														</div>
													)}
													{v.tipo_carroceria && (
														<div>
															<label className="text-xs text-muted-foreground">Carrocería</label>
															<p className="text-xs font-medium text-foreground">{v.tipo_carroceria}</p>
														</div>
													)}
													{v.propiedad && (
														<div>
															<label className="text-xs text-muted-foreground">Propiedad</label>
															<p className="text-xs font-medium text-foreground capitalize">{v.propiedad}</p>
														</div>
													)}
													{v.ejes !== undefined && (
														<div>
															<label className="text-xs text-muted-foreground">Ejes</label>
															<p className="text-xs font-medium text-foreground">{v.ejes}</p>
														</div>
													)}
													{v.asientos !== undefined && (
														<div>
															<label className="text-xs text-muted-foreground">Asientos</label>
															<p className="text-xs font-medium text-foreground">{v.asientos}</p>
														</div>
													)}
													{v.cilindrada !== undefined && (
														<div>
															<label className="text-xs text-muted-foreground">Cilindrada</label>
															<p className="text-xs font-medium text-foreground">{v.cilindrada}</p>
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								</>
							)}
						</div>
					)}

					{/* Vida / Accidentes Personales / Sepelio */}
					{(poliza.niveles_cobertura || poliza.asegurados_nivel) && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Users className="h-5 w-5" />
								{poliza.ramo}
							</h2>

							{/* Regional del asegurado */}
							<div className="mb-4">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
									Regional del Asegurado
								</p>
								<p className="text-sm font-medium text-foreground">
									{poliza.regional_asegurado_nombre || (
										<span className="text-gray-400 italic">Sin dato</span>
									)}
								</p>
							</div>

							{/* Niveles de cobertura */}
							{poliza.niveles_cobertura && poliza.niveles_cobertura.length > 0 && (
								<div className="mb-4">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Niveles de Cobertura
									</h3>
									<div className="space-y-3">
										{poliza.niveles_cobertura.map((nivel) => (
											<div key={nivel.id} className="border rounded-lg p-3">
												<div className="flex items-center justify-between mb-2">
													<span className="font-medium text-gray-900">{nivel.nombre}</span>
													{nivel.prima_nivel != null && (
														<span className="text-sm text-gray-600">
															Prima: {formatCurrency(nivel.prima_nivel, poliza.moneda)}
														</span>
													)}
												</div>
												<div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
													{Object.entries(nivel.coberturas).map(([key, cob]) => (
														<div
															key={key}
															className={`p-2 rounded ${cob.habilitado ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200 opacity-50"}`}
														>
															<span className="block text-xs text-gray-600 capitalize">
																{key.replace(/_/g, " ")}
															</span>
															<span className="font-medium text-gray-900">
																{cob.habilitado
																	? formatCurrency(cob.valor, poliza.moneda)
																	: "No incluido"}
															</span>
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Asegurados con nivel */}
							{poliza.asegurados_nivel && poliza.asegurados_nivel.length > 0 && (
								<div className="mb-4">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Asegurados ({poliza.asegurados_nivel.filter((a) => !a._excluido_por).length})
									</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="border-b border-border">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Nombre
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														CI/NIT
													</th>
													{poliza.asegurados_nivel.some((a) => a.rol) && (
														<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
															Rol
														</th>
													)}
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Nivel
													</th>
													{poliza.asegurados_nivel.some((a) => a.cargo) && (
														<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
															Cargo
														</th>
													)}
													{poliza.tiene_anexos_activos && (
														<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
															Estado
														</th>
													)}
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.asegurados_nivel.map((a) => (
													<tr
														key={a.id}
														className={`hover:bg-muted/40 transition-colors ${
															a._excluido_por
																? "opacity-50 bg-red-50/30"
																: a._origen_anexo
																	? "bg-green-50/30"
																	: ""
														}`}
													>
														<td
															className={`px-4 py-2 text-sm font-medium text-gray-900 ${a._excluido_por ? "line-through" : ""}`}
														>
															{a.client_name}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{a.client_ci}
														</td>
														{poliza.asegurados_nivel!.some((x) => x.rol) && (
															<td className="px-4 py-2 text-sm text-foreground capitalize">
																{a.rol || "-"}
															</td>
														)}
														<td className="px-4 py-2 text-sm text-foreground">
															{a.nivel_nombre || "-"}
														</td>
														{poliza.asegurados_nivel!.some((x) => x.cargo) && (
															<td className="px-4 py-2 text-sm text-foreground">
																{a.cargo || "-"}
															</td>
														)}
														{poliza.tiene_anexos_activos && (
															<td className="px-4 py-2">
																{a._origen_anexo && (
																	<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
																		+{a._origen_anexo}
																	</span>
																)}
																{a._excluido_por && (
																	<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
																		-{a._excluido_por}
																	</span>
																)}
															</td>
														)}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}

							{/* Beneficiarios (Vida / Accidentes Personales) */}
							{poliza.beneficiarios_nivel && poliza.beneficiarios_nivel.length > 0 && (
								<div>
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Beneficiarios (
										{poliza.beneficiarios_nivel.filter((b) => !b._excluido_por).length})
									</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="border-b border-border">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Nombre
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Carnet
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Fecha Nac.
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Género
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Rol
													</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
														Nivel
													</th>
													{poliza.tiene_anexos_activos && (
														<th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
															Estado
														</th>
													)}
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.beneficiarios_nivel.map((b) => (
													<tr
														key={b.id}
														className={`hover:bg-muted/40 transition-colors ${
															b._excluido_por
																? "opacity-50 bg-red-50/30"
																: b._origen_anexo
																	? "bg-green-50/30"
																	: ""
														}`}
													>
														<td
															className={`px-4 py-2 text-sm font-medium text-gray-900 ${b._excluido_por ? "line-through" : ""}`}
														>
															{b.nombre_completo}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{b.carnet}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{formatDate(b.fecha_nacimiento)}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{b.genero}
														</td>
														<td className="px-4 py-2 text-sm text-foreground capitalize">
															{b.rol}
														</td>
														<td className="px-4 py-2 text-sm text-foreground">
															{b.nivel_nombre || "-"}
														</td>
														{poliza.tiene_anexos_activos && (
															<td className="px-4 py-2">
																{b._origen_anexo && (
																	<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
																		+{b._origen_anexo}
																	</span>
																)}
																{b._excluido_por && (
																	<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
																		-{b._excluido_por}
																	</span>
																)}
															</td>
														)}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Datos de Transporte */}
					{poliza.transporte && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Truck className="h-5 w-5" />
								Datos de Transporte
							</h2>
							<div className="grid grid-cols-2 gap-6">
								<div className="col-span-2">
									<label className="text-xs font-medium text-muted-foreground">
										Materia Asegurada
									</label>
									<p className="text-sm text-foreground mt-1">
										{poliza.transporte.materia_asegurada}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Tipo de Transporte
									</label>
									<p className="text-sm text-foreground mt-1 capitalize">
										{poliza.transporte.tipo_transporte}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Tipo de Embalaje
									</label>
									<p className="text-sm text-foreground mt-1">{poliza.transporte.tipo_embalaje}</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Origen</label>
									<p className="text-sm text-foreground mt-1">
										{poliza.transporte.ciudad_origen}, {poliza.transporte.pais_origen}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Destino</label>
									<p className="text-sm text-foreground mt-1">
										{poliza.transporte.ciudad_destino}, {poliza.transporte.pais_destino}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Fecha de Embarque
									</label>
									<p className="text-sm text-foreground mt-1">
										{formatDate(poliza.transporte.fecha_embarque)}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Valor Asegurado</label>
									<p className="text-sm font-semibold text-foreground mt-1">
										{formatCurrency(poliza.transporte.valor_asegurado, poliza.moneda)}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Factura</label>
									<p className="text-sm text-foreground mt-1">{poliza.transporte.factura}</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Fecha Factura</label>
									<p className="text-sm text-foreground mt-1">
										{formatDate(poliza.transporte.fecha_factura)}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Modalidad</label>
									<p className="text-sm text-foreground mt-1 capitalize">
										{poliza.transporte.modalidad.replace(/_/g, " ")}
									</p>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">Coberturas</label>
									<div className="flex gap-2 mt-1">
										{poliza.transporte.cobertura_a && (
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
												Cobertura A (Todo Riesgo)
											</span>
										)}
										{poliza.transporte.cobertura_c && (
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
												Cobertura C (Riesgos Nombrados)
											</span>
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Naves / Aeronaves */}
					{poliza.naves && poliza.naves.length > 0 && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Ship className="h-5 w-5" />
								Naves / Aeronaves ({poliza.naves.filter((n) => !n._excluido_por).length})
							</h2>

							{/* Niveles AP si existen */}
							{poliza.niveles_ap_naves && poliza.niveles_ap_naves.length > 0 && (
								<div className="mb-4 p-4 bg-muted/50 rounded-lg">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
										Niveles de Accidentes Personales
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{poliza.niveles_ap_naves.map((nivel) => (
											<div key={nivel.id} className="bg-white border rounded p-3 text-sm">
												<p className="font-medium text-gray-900 mb-1">{nivel.nombre}</p>
												<div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
													<div>
														<span className="block">Muerte Acc.</span>
														<span className="font-medium text-gray-900">
															{formatCurrency(
																nivel.monto_muerte_accidental,
																poliza.moneda,
															)}
														</span>
													</div>
													<div>
														<span className="block">Invalidez</span>
														<span className="font-medium text-gray-900">
															{formatCurrency(nivel.monto_invalidez, poliza.moneda)}
														</span>
													</div>
													<div>
														<span className="block">Gastos Méd.</span>
														<span className="font-medium text-gray-900">
															{formatCurrency(nivel.monto_gastos_medicos, poliza.moneda)}
														</span>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							<div className="space-y-4">
								{poliza.naves.map((nave) => (
									<div
										key={nave.id}
										className={`border rounded-lg p-4 ${
											nave._excluido_por
												? "opacity-50 border-red-200 bg-red-50/30"
												: nave._origen_anexo
													? "border-green-200 bg-green-50/30"
													: ""
										}`}
									>
										{(nave._origen_anexo || nave._excluido_por) && (
											<div className="mb-3">
												{nave._origen_anexo && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
														Incluido por {nave._origen_anexo}
													</span>
												)}
												{nave._excluido_por && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
														Excluido por {nave._excluido_por}
													</span>
												)}
											</div>
										)}
										<div className="grid grid-cols-3 gap-4">
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Matrícula
												</label>
												<p
													className={`text-base font-semibold text-gray-900 ${nave._excluido_por ? "line-through" : ""}`}
												>
													{nave.matricula}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Marca/Modelo
												</label>
												<p className="text-sm text-foreground">
													{nave.marca} {nave.modelo}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">Año</label>
												<p className="text-sm text-foreground">{nave.ano}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Serie
												</label>
												<p className="text-sm text-foreground">{nave.serie}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">Uso</label>
												<p className="text-sm text-foreground capitalize">{nave.uso}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Pasajeros / Tripulantes
												</label>
												<p className="text-sm text-foreground">
													{nave.nro_pasajeros} / {nave.nro_tripulantes}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Valor Casco
												</label>
												<p className="text-sm font-semibold text-foreground">
													{formatCurrency(nave.valor_casco, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Resp. Civil
												</label>
												<p className="text-sm font-semibold text-foreground">
													{formatCurrency(nave.valor_responsabilidad_civil, poliza.moneda)}
												</p>
											</div>
											{nave.nivel_ap_nombre && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Nivel AP
													</label>
													<p className="text-sm text-foreground">{nave.nivel_ap_nombre}</p>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Equipos Industriales (Ramos Técnicos) */}
					{poliza.equipos && poliza.equipos.length > 0 && (
						<div className="bg-card rounded-lg border border-border p-5">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
								<Wrench className="h-5 w-5" />
								Equipos Industriales ({poliza.equipos.filter((e) => !e._excluido_por).length})
							</h2>
							<div className="space-y-4">
								{poliza.equipos.map((equipo) => (
									<div
										key={equipo.id}
										className={`border rounded-lg p-4 ${
											equipo._excluido_por
												? "opacity-50 border-red-200 bg-red-50/30"
												: equipo._origen_anexo
													? "border-green-200 bg-green-50/30"
													: ""
										}`}
									>
										{(equipo._origen_anexo || equipo._excluido_por) && (
											<div className="mb-3">
												{equipo._origen_anexo && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
														Incluido por {equipo._origen_anexo}
													</span>
												)}
												{equipo._excluido_por && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
														Excluido por {equipo._excluido_por}
													</span>
												)}
											</div>
										)}
										<div className="grid grid-cols-3 gap-4">
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Nro. Serie
												</label>
												<p
													className={`text-base font-semibold text-gray-900 ${equipo._excluido_por ? "line-through" : ""}`}
												>
													{equipo.nro_serie}
												</p>
											</div>
											{equipo.placa && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Placa
													</label>
													<p className="text-sm text-foreground">{equipo.placa}</p>
												</div>
											)}
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Tipo
												</label>
												<p className="text-sm text-foreground">{equipo.tipo_equipo || "-"}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Marca/Modelo
												</label>
												<p className="text-sm text-foreground">
													{equipo.marca_equipo || "-"} {equipo.modelo || ""}
												</p>
											</div>
											{equipo.ano != null && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Año
													</label>
													<p className="text-sm text-foreground">{equipo.ano}</p>
												</div>
											)}
											{equipo.color && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Color
													</label>
													<p className="text-sm text-foreground">{equipo.color}</p>
												</div>
											)}
											<div>
												<label className="text-xs font-medium text-muted-foreground">Uso</label>
												<p className="text-sm text-foreground capitalize">{equipo.uso}</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Valor Asegurado
												</label>
												<p className="text-sm font-semibold text-foreground">
													{formatCurrency(equipo.valor_asegurado, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Franquicia
												</label>
												<p className="text-sm text-foreground">
													{formatCurrency(equipo.franquicia, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Coaseguro
												</label>
												<p className="text-sm text-foreground">{equipo.coaseguro}%</p>
											</div>
											<div>
												<label className="text-xs font-medium text-muted-foreground">
													Nro. Chasis
												</label>
												<p className="text-sm text-foreground">{equipo.nro_chasis}</p>
											</div>
											{equipo.nro_motor && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Nro. Motor
													</label>
													<p className="text-sm text-foreground">{equipo.nro_motor}</p>
												</div>
											)}
											{equipo.plaza_circulacion && (
												<div>
													<label className="text-xs font-medium text-muted-foreground">
														Plaza de Circulación
													</label>
													<p className="text-sm text-foreground">
														{equipo.plaza_circulacion}
													</p>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Plan de Pagos */}
					<div className="bg-card rounded-lg border border-border p-5">
						<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
							<CreditCard className="h-5 w-5" />
							Plan de Pagos
							{poliza.tiene_anexos_activos && (
								<span className="text-sm font-normal text-blue-600">(consolidado)</span>
							)}
						</h2>

						{/* Resumen de Pagos */}
						<div className="grid grid-cols-3 gap-4 mb-5 p-4 bg-muted/50 rounded-lg">
							<div>
								<label className="text-xs font-medium text-muted-foreground">Total Pagos</label>
								<p className="text-lg font-semibold text-gray-900">{totalPagos}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Pagados</label>
								<p className="text-lg font-semibold text-green-600">{pagosPagados}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-muted-foreground">Pendientes</label>
								<p className="text-lg font-semibold text-yellow-600">{pagosPendientes}</p>
							</div>
						</div>

						{/* Tabla de Cuotas */}
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="border-b border-border">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
											Cuota
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
											Vencimiento
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
											{poliza.cuotas_consolidadas ? "Original" : "Monto"}
										</th>
										{poliza.cuotas_consolidadas && (
											<>
												<th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
													Ajuste
												</th>
												<th className="px-4 py-3 text-right text-xs font-semibold text-blue-700 uppercase bg-blue-50">
													Consolidado
												</th>
											</>
										)}
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
											Fecha Pago
										</th>
										<th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
											Estado
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{poliza.cuotas_consolidadas ? (
										<>
											{poliza.cuotas_consolidadas.map((cuota) => {
												const esCuotaInicial = cuota.numero_cuota === 0;
												const etiquetaCuota = esCuotaInicial
													? "Inicial"
													: `${cuota.numero_cuota}`;
												return (
													<tr
														key={cuota.cuota_original_id}
														className={`hover:bg-muted/40 transition-colors ${esCuotaInicial ? "bg-blue-50" : ""}`}
													>
														<td className="px-4 py-3 text-sm font-medium text-gray-900">
															Cuota {etiquetaCuota}
														</td>
														<td className="px-4 py-3 text-sm text-gray-900">
															{formatDate(cuota.fecha_vencimiento)}
														</td>
														<td className="px-4 py-3 text-sm text-gray-500 text-right">
															{formatCurrency(cuota.monto_original, poliza.moneda)}
														</td>
														<td className="px-4 py-3 text-sm text-right">
															{cuota.monto_ajustes !== 0 ? (
																<span
																	className={
																		cuota.monto_ajustes >= 0
																			? "text-green-600 font-medium"
																			: "text-red-600 font-medium"
																	}
																>
																	{cuota.monto_ajustes >= 0 ? "+" : ""}
																	{formatCurrency(cuota.monto_ajustes, poliza.moneda)}
																</span>
															) : (
																<span className="text-gray-400">-</span>
															)}
														</td>
														<td className="px-4 py-3 text-sm font-semibold text-blue-900 text-right bg-blue-50/50">
															{formatCurrency(cuota.monto_consolidado, poliza.moneda)}
														</td>
														<td className="px-4 py-3 text-sm text-gray-600">
															{cuota.fecha_pago ? formatDate(cuota.fecha_pago) : "-"}
														</td>
														<td className="px-4 py-3">
															<div className="flex justify-center">
																<span
																	className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoPagoStyle(
																		cuota.estado,
																	)}`}
																>
																	{getEstadoPagoLabel(cuota.estado)}
																</span>
															</div>
														</td>
													</tr>
												);
											})}
											{/* Vigencia Corrida rows */}
											{poliza.vigencia_corrida?.map((vc) => (
												<tr
													key={`vc-${vc.anexo_id}`}
													className="bg-purple-50/50 hover:bg-purple-50"
												>
													<td
														className="px-4 py-3 text-sm font-medium text-purple-800"
														colSpan={2}
													>
														<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 mr-2">
															Vigencia Corrida
														</span>
														{vc.numero_anexo}
													</td>
													<td className="px-4 py-3" />
													<td className="px-4 py-3" />
													<td className="px-4 py-3 text-sm font-semibold text-purple-900 text-right">
														{formatCurrency(vc.monto, poliza.moneda)}
													</td>
													<td className="px-4 py-3 text-sm text-gray-600">
														{vc.fecha_vencimiento ? formatDate(vc.fecha_vencimiento) : "-"}
													</td>
													<td className="px-4 py-3">
														<div className="flex justify-center">
															<span
																className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoPagoStyle(vc.estado)}`}
															>
																{getEstadoPagoLabel(vc.estado)}
															</span>
														</div>
													</td>
												</tr>
											))}
										</>
									) : (
										poliza.pagos.map((pago) => {
											const esCuotaInicial =
												pago.observaciones?.includes("inicial") ||
												pago.observaciones?.includes("Inicial");
											const etiquetaCuota = esCuotaInicial ? "Inicial" : `${pago.numero_cuota}`;

											return (
												<tr
													key={pago.id}
													className={`hover:bg-muted/40 transition-colors ${esCuotaInicial ? "bg-blue-50" : ""}`}
												>
													<td className="px-4 py-3 text-sm font-medium text-gray-900">
														Cuota {etiquetaCuota}
													</td>
													<td className="px-4 py-3 text-sm text-gray-900">
														{formatDate(pago.fecha_vencimiento)}
													</td>
													<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
														{formatCurrency(pago.monto, poliza.moneda)}
													</td>
													<td className="px-4 py-3 text-sm text-gray-600">
														{pago.fecha_pago ? formatDate(pago.fecha_pago) : "-"}
													</td>
													<td className="px-4 py-3">
														<div className="flex justify-center">
															<span
																className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoPagoStyle(
																	pago.estado,
																)}`}
															>
																{getEstadoPagoLabel(pago.estado)}
															</span>
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Documentos */}
					<div className="bg-card rounded-lg border border-border p-5">
						<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
							<FileDown className="h-5 w-5" />
							Documentos
						</h2>
						{poliza.documentos.length === 0 ? (
							<p className="text-sm text-gray-600">No hay documentos cargados</p>
						) : (
							<div className="space-y-2">
								{poliza.documentos.map((doc) => (
									<div
										key={doc.id}
										className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
									>
										<div className="flex items-center gap-3">
											<FileText className="h-5 w-5 text-gray-400" />
											<div>
												<p className="text-sm font-medium text-foreground">
													{doc.nombre_archivo}
												</p>
												<p className="text-xs text-muted-foreground">
													{doc.tipo_documento} - Subido el {formatDate(doc.uploaded_at)}
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={async () => {
												const { createClient } = await import("@/utils/supabase/client");
												const supabase = createClient();
												const { extractStoragePath } = await import("@/utils/storage");
												const path = extractStoragePath(doc.archivo_url, "polizas-documentos");
												const { data } = await supabase.storage
													.from("polizas-documentos")
													.createSignedUrl(path, 3600);
												if (data?.signedUrl) window.open(data.signedUrl, "_blank");
											}}
										>
											<FileDown className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* ── Right Sidebar ─────────────────────────────────── */}
				<div className="lg:col-span-1 lg:sticky lg:top-20 lg:self-start">
					<Card>
						<CardContent className="p-5 divide-y divide-border">
							{/* Prima Total */}
							<div className="pb-4">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
									Prima Total
								</p>
								<p className="text-3xl font-bold text-foreground tabular-nums">
									{formatCurrency(poliza.prima_total, poliza.moneda)}
								</p>
								<p className="text-xs text-muted-foreground capitalize mt-1">{poliza.modalidad_pago}</p>
							</div>

							{/* Ajustes por anexos */}
							{poliza.monto_ajustes_total != null && poliza.monto_ajustes_total !== 0 && (
								<div className="py-4">
									<p className="text-xs text-muted-foreground mb-1">Ajuste por Anexos</p>
									<p
										className={`text-base font-semibold ${poliza.monto_ajustes_total >= 0 ? "text-emerald-600" : "text-red-600"}`}
									>
										{poliza.monto_ajustes_total >= 0 ? "+" : ""}
										{formatCurrency(poliza.monto_ajustes_total, poliza.moneda)}
									</p>
									<p className="text-xs text-muted-foreground mt-3 mb-1">Prima Consolidada</p>
									<p className="text-xl font-bold text-primary">
										{formatCurrency(poliza.prima_total + poliza.monto_ajustes_total, poliza.moneda)}
									</p>
								</div>
							)}

							{/* Prima Neta + Comisión */}
							<div className="py-4 grid grid-cols-2 gap-3">
								<div>
									<p className="text-xs text-muted-foreground mb-0.5">Prima Neta</p>
									<p className="text-sm font-semibold text-foreground">
										{formatCurrency(poliza.prima_neta, poliza.moneda)}
									</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground mb-0.5">Comisión</p>
									<p className="text-sm font-semibold text-foreground">
										{formatCurrency(poliza.comision, poliza.moneda)}
									</p>
								</div>
							</div>

							{/* Estado de cobro */}
							<div className="py-4">
								<div className="flex items-center justify-between mb-2">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
										Cobro
									</p>
									<span className="text-xs font-semibold text-foreground">
										{pagosPagados}/{totalPagos} cuotas
									</span>
								</div>
								<div className="w-full bg-muted rounded-full h-1.5 mb-3">
									<div
										className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
										style={{ width: `${totalPagos > 0 ? (pagosPagados / totalPagos) * 100 : 0}%` }}
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<p className="text-xs text-muted-foreground">Pagado</p>
										<p className="text-sm font-semibold text-emerald-600">
											{formatCurrency(montoPagado, poliza.moneda)}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">Pendiente</p>
										<p className="text-sm font-semibold text-yellow-600">
											{formatCurrency(montoPendiente, poliza.moneda)}
										</p>
									</div>
								</div>
							</div>

							{/* Vigencia */}
							<div className="py-4">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
									Vigencia
								</p>
								{(() => {
									const start = new Date(poliza.inicio_vigencia).getTime();
									const end = new Date(poliza.fin_vigencia).getTime();
									const now = Date.now();
									const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
									const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
									const isExpired = daysLeft <= 0;
									const isCritical = daysLeft > 0 && daysLeft <= 30;
									const barColor = isExpired
										? "bg-red-500"
										: isCritical
											? "bg-yellow-500"
											: "bg-primary";
									const textColor = isExpired
										? "text-red-600"
										: isCritical
											? "text-yellow-600"
											: "text-muted-foreground";
									return (
										<>
											<div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
												<span className="font-medium text-foreground">
													{formatDate(poliza.inicio_vigencia)}
												</span>
												<span className="font-medium text-foreground">
													{formatDate(poliza.fin_vigencia)}
												</span>
											</div>
											<div className="w-full bg-muted rounded-full h-1.5">
												<div
													className={`h-1.5 rounded-full ${barColor}`}
													style={{ width: `${progress}%` }}
												/>
											</div>
											<p className={`text-xs mt-1.5 ${textColor}`}>
												{isExpired ? "Vencida" : `${daysLeft} días restantes`}
											</p>
										</>
									);
								})()}
							</div>

							{/* Auditoría + historial */}
							<div className="pt-4 space-y-1.5 text-xs text-muted-foreground">
								<p>
									<span className="font-medium text-foreground">Creado</span>{" "}
									{formatDate(poliza.created_at)}
									{poliza.creador_nombre && ` por ${poliza.creador_nombre}`}
								</p>
								{poliza.fecha_validacion && (
									<p>
										<span className="font-medium text-foreground">Validado</span>{" "}
										{formatDate(poliza.fecha_validacion)}
										{poliza.validador_nombre && ` por ${poliza.validador_nombre}`}
									</p>
								)}

								{/* Rechazo */}
								{poliza.estado === "rechazada" && poliza.fecha_rechazo && (
									<div className="mt-3 p-3 rounded-md bg-orange-50 border border-orange-200">
										<p className="font-medium text-orange-800 mb-1">Rechazada</p>
										<p className="text-orange-700">
											{formatDate(poliza.fecha_rechazo)}
											{poliza.rechazador_nombre && ` por ${poliza.rechazador_nombre}`}
										</p>
										{poliza.motivo_rechazo && (
											<p className="text-orange-900 mt-1.5">
												<span className="font-medium">Motivo:</span> {poliza.motivo_rechazo}
											</p>
										)}
										{poliza.puede_editar_hasta && (
											<p
												className={`mt-1 ${new Date(poliza.puede_editar_hasta) > new Date() ? "text-green-700" : "text-red-600"}`}
											>
												{new Date(poliza.puede_editar_hasta) > new Date()
													? `Puede editar hasta: ${formatDate(poliza.puede_editar_hasta)}`
													: "Ventana de edición expirada"}
											</p>
										)}
									</div>
								)}

								{/* Historial */}
								{edicionesRelevantes.length > 0 && (
									<div className="mt-3 pt-3 border-t border-border">
										<p className="font-medium text-foreground mb-2">Historial</p>
										<div className="space-y-1.5 max-h-36 overflow-y-auto">
											{edicionesRelevantes.map((item) => {
												const isAnexo = item.accion.startsWith("anexo_");
												if (isAnexo) {
													const color =
														item.accion === "anexo_validacion"
															? "text-emerald-700"
															: item.accion === "anexo_rechazo"
																? "text-red-700"
																: "text-primary";
													return (
														<p key={item.id} className={color}>
															{formatDate(item.timestamp)} · {item.descripcion}
															{item.usuario_nombre && (
																<span className="text-muted-foreground">
																	{" "}
																	por {item.usuario_nombre}
																</span>
															)}
														</p>
													);
												}
												const camposTexto = formatCampos(item.campos_modificados);
												return (
													<p key={item.id}>
														{formatDate(item.timestamp)} ·{" "}
														{item.usuario_nombre || "Usuario"} modificó
														{camposTexto && `: ${camposTexto}`}
													</p>
												);
											})}
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* ── Anexos (full width) ──────────────────────────── */}
				<div className="lg:col-span-3">
					<AnexoDetalleSection
						polizaId={polizaId}
						moneda={poliza.moneda}
						puedeValidar={userRole === "admin" || userRole === "usuario" || isTeamLeader}
						onAnexoValidado={cargarDetalle}
					/>
				</div>
			</div>

			{/* Validation Confirmation Modal */}
			<ValidarPolizaModal
				isOpen={showValidarModal}
				onClose={() => setShowValidarModal(false)}
				onConfirm={handleValidarConfirm}
				poliza={
					poliza
						? {
								id: poliza.id,
								numero_poliza: poliza.numero_poliza,
								prima_total: poliza.prima_total,
								moneda: poliza.moneda,
								asegurado: poliza.client_name,
							}
						: null
				}
				isLoading={validationLoading === "validar"}
			/>

			{/* Permissions Modal */}
			<PolicyPermissionsModal
				polizaId={polizaId}
				numeroPoliza={poliza.numero_poliza}
				isOpen={showPermissionsModal}
				onClose={() => setShowPermissionsModal(false)}
			/>

			{/* Rejection Modal */}
			<RechazoPolizaModal
				isOpen={showRechazoModal}
				onClose={() => setShowRechazoModal(false)}
				onConfirm={handleRechazar}
				poliza={{
					id: poliza.id,
					numero_poliza: poliza.numero_poliza,
					prima_total: poliza.prima_total,
					moneda: poliza.moneda,
				}}
				isLoading={validationLoading === "rechazar"}
			/>
		</div>
	);
}
