"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { obtenerDetallePoliza, type PolizaDetalle } from "../actions";
import { validarPoliza, rechazarPoliza } from "@/app/gerencia/validacion/actions";
import { checkPolicyEditPermission } from "@/app/polizas/permisos/actions";
import { RechazoPolizaModal } from "@/components/gerencia/RechazoPolizaModal";
import { Button } from "@/components/ui/button";
import { PolicyPermissionsModal } from "@/components/polizas/PolicyPermissionsModal";
import AnexoDetalleSection from "@/components/polizas/anexos/AnexoDetalleSection";
import {
	FileText,
	ArrowLeft,
	Calendar,
	DollarSign,
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
	// Rejection modal state
	const [showRechazoModal, setShowRechazoModal] = useState(false);

	const cargarDetalle = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		// Load policy details
		const resultado = await obtenerDetallePoliza(polizaId);
		if (resultado.success && resultado.poliza) {
			setPoliza(resultado.poliza);
			setUserRole(resultado.userRole || null);
			setIsAdmin(resultado.userRole === "admin");

			// Check edit permission
			const permResult = await checkPolicyEditPermission(polizaId);
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
	const puedeValidar = (userRole === "admin" || userRole === "usuario" || isTeamLeader) && poliza?.estado === "pendiente";

	// Manejar validación
	const handleValidar = async () => {
		if (!poliza) return;
		setValidationLoading("validar");
		const result = await validarPoliza(poliza.id);
		if (result.success) {
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
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
					<p className="text-gray-600">Cargando detalles de la póliza...</p>
				</div>
			</div>
		);
	}

	if (error || !poliza) {
		return (
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				<div className="text-center py-16">
					<XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar la póliza</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					<Button onClick={() => router.push("/polizas")}>Volver a Pólizas</Button>
				</div>
			</div>
		);
	}

	// Calcular estadísticas de pagos
	const totalPagos = poliza.pagos.length;
	const pagosPagados = poliza.pagos.filter((p) => p.estado === "pagado").length;
	const pagosPendientes = poliza.pagos.filter((p) => p.estado === "pendiente").length;
	const montoPagado = poliza.pagos.filter((p) => p.estado === "pagado").reduce((sum, p) => sum + p.monto, 0);
	const montoPendiente = poliza.pagos.filter((p) => p.estado !== "pagado").reduce((sum, p) => sum + p.monto, 0);

	return (
		<div className="container mx-auto px-4 py-8 max-w-7xl">
			{/* Header */}
			<div className="mb-6">
				<Button variant="ghost" onClick={() => router.push("/polizas")} className="mb-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					Volver a Pólizas
				</Button>

				<div className="flex items-center justify-between">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<FileText className="h-8 w-8 text-primary" />
							<h1 className="text-3xl font-bold text-gray-900">{poliza.numero_poliza}</h1>
						</div>
						<p className="text-gray-600 ml-11">
							Detalles completos de la póliza
							{poliza.es_renovacion && (
								<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
									Renovación de Nº {poliza.nro_poliza_anterior}
								</span>
							)}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<span
							className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getEstadoStyle(
								poliza.estado
							)}`}
						>
							{getEstadoLabel(poliza.estado)}
						</span>

						{/* Edit button - visible if user has permission */}
						{canEdit && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(`/polizas/${polizaId}/editar`)}
							>
								<Pencil className="h-4 w-4 mr-1" />
								Editar
							</Button>
						)}

						{/* Nuevo Anexo button - only for active policies */}
						{poliza.estado === "activa" && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(`/polizas/anexos/nuevo?polizaId=${polizaId}`)}
							>
								<Plus className="h-4 w-4 mr-1" />
								Nuevo Anexo
							</Button>
						)}

						{/* Permissions button - admin or team leader */}
						{(isAdmin || isTeamLeader) && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowPermissionsModal(true)}
							>
								<Shield className="h-4 w-4 mr-1" />
								Permisos
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
									<CheckCircle className="h-4 w-4 mr-1" />
									{validationLoading === "validar" ? "Validando..." : "Validar"}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setShowRechazoModal(true)}
									disabled={validationLoading !== null}
								>
									<XCircle className="h-4 w-4 mr-1" />
									Rechazar
								</Button>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left Column - Main Info */}
				<div className="lg:col-span-2 space-y-6">
					{/* Información General */}
					<div className="bg-white rounded-lg shadow-sm border p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Información General</h2>
						<div className="grid grid-cols-2 gap-6">
							<div>
								<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
									<User className="h-4 w-4" />
									Cliente
								</label>
								<Link
									href={`/clientes?detalle=${poliza.client_id}`}
									className="text-base text-blue-700 hover:text-blue-900 hover:underline mt-1 block"
								>
									{poliza.client_name}
								</Link>
								<p className="text-sm text-gray-600">CI/NIT: {poliza.client_ci}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
									<Building2 className="h-4 w-4" />
									Compañía Aseguradora
								</label>
								<p className="text-base text-gray-900 mt-1">{poliza.compania_nombre}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600">Ramo</label>
								<p className="text-base text-gray-900 mt-1">{poliza.ramo}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600">Categoría</label>
								<p className="text-base text-gray-900 mt-1">{poliza.categoria_nombre}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
									<MapPin className="h-4 w-4" />
									Regional
								</label>
								<p className="text-base text-gray-900 mt-1">{poliza.regional_nombre}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600">Ejecutivo comercial</label>
								<p className="text-base text-gray-900 mt-1">{poliza.responsable_nombre}</p>
							</div>
						</div>
					</div>

					{/* Vigencia */}
					<div className="bg-white rounded-lg shadow-sm border p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Vigencia</h2>
						<div className="grid grid-cols-3 gap-6">
							<div>
								<label className="text-sm font-medium text-gray-600 flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									Fecha de Emisión
								</label>
								<p className="text-base text-gray-900 mt-1">
									{formatDate(poliza.fecha_emision_compania)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600">Inicio de Vigencia</label>
								<p className="text-base text-gray-900 mt-1">{formatDate(poliza.inicio_vigencia)}</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600">Fin de Vigencia</label>
								<p className="text-base text-gray-900 mt-1">{formatDate(poliza.fin_vigencia)}</p>
							</div>
						</div>
					</div>

					{/* Vehículos Asegurados (Automotor) */}
					{poliza.vehiculos && poliza.vehiculos.length > 0 && (
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Car className="h-5 w-5" />
								Vehículos Asegurados ({poliza.vehiculos.filter((v) => !v._excluido_por).length})
								{poliza.vehiculos.some((v) => v._excluido_por) && (
									<span className="text-sm font-normal text-gray-500">
										({poliza.vehiculos.filter((v) => v._excluido_por).length} excluido{poliza.vehiculos.filter((v) => v._excluido_por).length > 1 ? "s" : ""})
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
												<label className="text-sm font-medium text-gray-600">Placa</label>
												<p className={`text-base font-semibold text-gray-900 ${vehiculo._excluido_por ? "line-through" : ""}`}>{vehiculo.placa}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Tipo</label>
												<p className="text-base text-gray-900">{vehiculo.tipo_vehiculo || "-"}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Marca/Modelo</label>
												<p className="text-base text-gray-900">
													{vehiculo.marca || "-"} {vehiculo.modelo || ""}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Año</label>
												<p className="text-base text-gray-900">{vehiculo.ano || "-"}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Color</label>
												<p className="text-base text-gray-900">{vehiculo.color || "-"}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Uso</label>
												<p className="text-base text-gray-900 capitalize">{vehiculo.uso || "-"}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Valor Asegurado</label>
												<p className="text-base font-semibold text-gray-900">
													{formatCurrency(vehiculo.valor_asegurado, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Franquicia</label>
												<p className="text-base text-gray-900">
													{formatCurrency(vehiculo.franquicia, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Coaseguro</label>
												<p className="text-base text-gray-900">
													{vehiculo.coaseguro != null ? `${vehiculo.coaseguro}%` : "-"}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Nro. Chasis</label>
												<p className="text-base text-gray-900">{vehiculo.nro_chasis || "-"}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Nro. Motor</label>
												<p className="text-base text-gray-900">{vehiculo.nro_motor || "-"}</p>
											</div>
											{vehiculo.ejes != null && (
												<div>
													<label className="text-sm font-medium text-gray-600">Ejes</label>
													<p className="text-base text-gray-900">{vehiculo.ejes}</p>
												</div>
											)}
											{vehiculo.nro_asientos != null && (
												<div>
													<label className="text-sm font-medium text-gray-600">Asientos</label>
													<p className="text-base text-gray-900">{vehiculo.nro_asientos}</p>
												</div>
											)}
											{vehiculo.plaza_circulacion && (
												<div>
													<label className="text-sm font-medium text-gray-600">Plaza de Circulación</label>
													<p className="text-base text-gray-900">{vehiculo.plaza_circulacion}</p>
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
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Heart className="h-5 w-5" />
								Datos de Salud
							</h2>

							{/* Niveles de cobertura */}
							{poliza.niveles_salud && poliza.niveles_salud.length > 0 && (
								<div className="mb-4 p-4 bg-gray-50 rounded-lg">
									<h3 className="text-sm font-semibold text-gray-700 mb-2">Niveles de Cobertura</h3>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
										{poliza.niveles_salud.map((nivel) => (
											<div key={nivel.id} className="bg-white border rounded p-3 text-sm">
												<p className="font-medium text-gray-900">{nivel.nombre}</p>
												<p className="text-gray-600">{formatCurrency(nivel.monto, poliza.moneda)}</p>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Asegurados (contratante/titular) */}
							{poliza.asegurados_salud && poliza.asegurados_salud.length > 0 && (
								<div className="mb-4">
									<h3 className="text-sm font-semibold text-gray-700 mb-2">Asegurados</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="bg-gray-50 border-b">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">CI/NIT</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nivel</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.asegurados_salud.map((a) => (
													<tr key={a.id} className="hover:bg-gray-50">
														<td className="px-4 py-2 text-sm font-medium text-gray-900">{a.client_name}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{a.client_ci}</td>
														<td className="px-4 py-2 text-sm text-gray-900 capitalize">{a.rol}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{a.nivel_nombre || "-"}</td>
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
									<h3 className="text-sm font-semibold text-gray-700 mb-2">
										Beneficiarios ({poliza.beneficiarios_salud.filter((b) => !b._excluido_por).length})
									</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="bg-gray-50 border-b">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Carnet</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Nac.</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Género</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
													{poliza.tiene_anexos_activos && (
														<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
													)}
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.beneficiarios_salud.map((b) => (
													<tr
														key={b.id}
														className={`hover:bg-gray-50 ${
															b._excluido_por ? "opacity-50 bg-red-50/30" : b._origen_anexo ? "bg-green-50/30" : ""
														}`}
													>
														<td className={`px-4 py-2 text-sm font-medium text-gray-900 ${b._excluido_por ? "line-through" : ""}`}>{b.nombre_completo}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{b.carnet}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{formatDate(b.fecha_nacimiento)}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{b.genero}</td>
														<td className="px-4 py-2 text-sm text-gray-900 capitalize">{b.rol}</td>
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
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Flame className="h-5 w-5" />
								Incendio y Aliados
							</h2>

							{poliza.incendio_asegurados && poliza.incendio_asegurados.length > 0 && (
								<div className="mb-4 p-4 bg-gray-50 rounded-lg">
									<h3 className="text-sm font-semibold text-gray-700 mb-2">Asegurados Adicionales</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{poliza.incendio_asegurados.map((a) => (
											<div key={a.id} className="bg-white border rounded p-2 text-sm flex items-center gap-2">
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
									<h3 className="text-sm font-semibold text-gray-700">
										Bienes Asegurados ({poliza.incendio_bienes.filter((b) => !b._excluido_por).length})
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
													<p className={`text-base text-gray-900 ${bien._excluido_por ? "line-through" : ""}`}>{bien.direccion}</p>
												</div>
												<div className="text-right">
													<label className="text-sm font-medium text-gray-600">Valor Total</label>
													<p className="text-base font-semibold text-gray-900">{formatCurrency(bien.valor_total_declarado, poliza.moneda)}</p>
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
																	<td className="py-1 text-gray-700">{item.nombre}</td>
																	<td className="py-1 text-right font-medium text-gray-900">{formatCurrency(item.monto, poliza.moneda)}</td>
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
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<ShieldAlert className="h-5 w-5" />
								Riesgos Varios Misceláneos
							</h2>

							{poliza.riesgos_varios_asegurados && poliza.riesgos_varios_asegurados.length > 0 && (
								<div className="mb-4 p-4 bg-gray-50 rounded-lg">
									<h3 className="text-sm font-semibold text-gray-700 mb-2">Asegurados</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
										{poliza.riesgos_varios_asegurados.map((a) => (
											<div key={a.id} className="bg-white border rounded p-2 text-sm flex items-center gap-2">
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
									<h3 className="text-sm font-semibold text-gray-700">
										Bienes Asegurados ({poliza.riesgos_varios_bienes.filter((b) => !b._excluido_por).length})
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
													<p className={`text-base text-gray-900 ${bien._excluido_por ? "line-through" : ""}`}>{bien.direccion}</p>
												</div>
												<div className="text-right">
													<label className="text-sm font-medium text-gray-600">Valor Total</label>
													<p className="text-base font-semibold text-gray-900">{formatCurrency(bien.valor_total_declarado, poliza.moneda)}</p>
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
																	<td className="py-1 text-gray-700">{item.nombre}</td>
																	<td className="py-1 text-right font-medium text-gray-900">{formatCurrency(item.monto, poliza.moneda)}</td>
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
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Shield className="h-5 w-5" />
								Responsabilidad Civil
							</h2>
							<div className="grid grid-cols-2 gap-6">
								<div>
									<label className="text-sm font-medium text-gray-600">Tipo de Póliza</label>
									<p className="text-base text-gray-900 mt-1 capitalize">{poliza.responsabilidad_civil.tipo_poliza}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Valor Asegurado</label>
									<p className="text-base font-semibold text-gray-900 mt-1">
										{formatCurrency(poliza.responsabilidad_civil.valor_asegurado, poliza.moneda)}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Vida / Accidentes Personales / Sepelio */}
					{(poliza.niveles_cobertura || poliza.asegurados_nivel) && (
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Users className="h-5 w-5" />
								{poliza.ramo}
							</h2>

							{/* Niveles de cobertura */}
							{poliza.niveles_cobertura && poliza.niveles_cobertura.length > 0 && (
								<div className="mb-4">
									<h3 className="text-sm font-semibold text-gray-700 mb-2">Niveles de Cobertura</h3>
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
														<div key={key} className={`p-2 rounded ${cob.habilitado ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200 opacity-50"}`}>
															<span className="block text-xs text-gray-600 capitalize">{key.replace(/_/g, " ")}</span>
															<span className="font-medium text-gray-900">
																{cob.habilitado ? formatCurrency(cob.valor, poliza.moneda) : "No incluido"}
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
									<h3 className="text-sm font-semibold text-gray-700 mb-2">
										Asegurados ({poliza.asegurados_nivel.filter((a) => !a._excluido_por).length})
									</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="bg-gray-50 border-b">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">CI/NIT</th>
													{poliza.asegurados_nivel.some(a => a.rol) && (
														<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
													)}
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nivel</th>
													{poliza.asegurados_nivel.some(a => a.cargo) && (
														<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cargo</th>
													)}
													{poliza.tiene_anexos_activos && (
														<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
													)}
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.asegurados_nivel.map((a) => (
													<tr
														key={a.id}
														className={`hover:bg-gray-50 ${
															a._excluido_por ? "opacity-50 bg-red-50/30" : a._origen_anexo ? "bg-green-50/30" : ""
														}`}
													>
														<td className={`px-4 py-2 text-sm font-medium text-gray-900 ${a._excluido_por ? "line-through" : ""}`}>{a.client_name}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{a.client_ci}</td>
														{poliza.asegurados_nivel!.some(x => x.rol) && (
															<td className="px-4 py-2 text-sm text-gray-900 capitalize">{a.rol || "-"}</td>
														)}
														<td className="px-4 py-2 text-sm text-gray-900">{a.nivel_nombre || "-"}</td>
														{poliza.asegurados_nivel!.some(x => x.cargo) && (
															<td className="px-4 py-2 text-sm text-gray-900">{a.cargo || "-"}</td>
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
									<h3 className="text-sm font-semibold text-gray-700 mb-2">
										Beneficiarios ({poliza.beneficiarios_nivel.filter((b) => !b._excluido_por).length})
									</h3>
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead className="bg-gray-50 border-b">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Carnet</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Nac.</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Género</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
													<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nivel</th>
													{poliza.tiene_anexos_activos && (
														<th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
													)}
												</tr>
											</thead>
											<tbody className="divide-y">
												{poliza.beneficiarios_nivel.map((b) => (
													<tr
														key={b.id}
														className={`hover:bg-gray-50 ${
															b._excluido_por ? "opacity-50 bg-red-50/30" : b._origen_anexo ? "bg-green-50/30" : ""
														}`}
													>
														<td className={`px-4 py-2 text-sm font-medium text-gray-900 ${b._excluido_por ? "line-through" : ""}`}>{b.nombre_completo}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{b.carnet}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{formatDate(b.fecha_nacimiento)}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{b.genero}</td>
														<td className="px-4 py-2 text-sm text-gray-900 capitalize">{b.rol}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{b.nivel_nombre || "-"}</td>
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
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Truck className="h-5 w-5" />
								Datos de Transporte
							</h2>
							<div className="grid grid-cols-2 gap-6">
								<div className="col-span-2">
									<label className="text-sm font-medium text-gray-600">Materia Asegurada</label>
									<p className="text-base text-gray-900 mt-1">{poliza.transporte.materia_asegurada}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Tipo de Transporte</label>
									<p className="text-base text-gray-900 mt-1 capitalize">{poliza.transporte.tipo_transporte}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Tipo de Embalaje</label>
									<p className="text-base text-gray-900 mt-1">{poliza.transporte.tipo_embalaje}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Origen</label>
									<p className="text-base text-gray-900 mt-1">
										{poliza.transporte.ciudad_origen}, {poliza.transporte.pais_origen}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Destino</label>
									<p className="text-base text-gray-900 mt-1">
										{poliza.transporte.ciudad_destino}, {poliza.transporte.pais_destino}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Fecha de Embarque</label>
									<p className="text-base text-gray-900 mt-1">{formatDate(poliza.transporte.fecha_embarque)}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Valor Asegurado</label>
									<p className="text-base font-semibold text-gray-900 mt-1">
										{formatCurrency(poliza.transporte.valor_asegurado, poliza.moneda)}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Factura</label>
									<p className="text-base text-gray-900 mt-1">{poliza.transporte.factura}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Fecha Factura</label>
									<p className="text-base text-gray-900 mt-1">{formatDate(poliza.transporte.fecha_factura)}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Modalidad</label>
									<p className="text-base text-gray-900 mt-1 capitalize">{poliza.transporte.modalidad.replace(/_/g, " ")}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-600">Coberturas</label>
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
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Ship className="h-5 w-5" />
								Naves / Aeronaves ({poliza.naves.filter((n) => !n._excluido_por).length})
							</h2>

							{/* Niveles AP si existen */}
							{poliza.niveles_ap_naves && poliza.niveles_ap_naves.length > 0 && (
								<div className="mb-4 p-4 bg-gray-50 rounded-lg">
									<h3 className="text-sm font-semibold text-gray-700 mb-2">Niveles de Accidentes Personales</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{poliza.niveles_ap_naves.map((nivel) => (
											<div key={nivel.id} className="bg-white border rounded p-3 text-sm">
												<p className="font-medium text-gray-900 mb-1">{nivel.nombre}</p>
												<div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
													<div>
														<span className="block">Muerte Acc.</span>
														<span className="font-medium text-gray-900">{formatCurrency(nivel.monto_muerte_accidental, poliza.moneda)}</span>
													</div>
													<div>
														<span className="block">Invalidez</span>
														<span className="font-medium text-gray-900">{formatCurrency(nivel.monto_invalidez, poliza.moneda)}</span>
													</div>
													<div>
														<span className="block">Gastos Méd.</span>
														<span className="font-medium text-gray-900">{formatCurrency(nivel.monto_gastos_medicos, poliza.moneda)}</span>
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
												<label className="text-sm font-medium text-gray-600">Matrícula</label>
												<p className={`text-base font-semibold text-gray-900 ${nave._excluido_por ? "line-through" : ""}`}>{nave.matricula}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Marca/Modelo</label>
												<p className="text-base text-gray-900">{nave.marca} {nave.modelo}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Año</label>
												<p className="text-base text-gray-900">{nave.ano}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Serie</label>
												<p className="text-base text-gray-900">{nave.serie}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Uso</label>
												<p className="text-base text-gray-900 capitalize">{nave.uso}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Pasajeros / Tripulantes</label>
												<p className="text-base text-gray-900">{nave.nro_pasajeros} / {nave.nro_tripulantes}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Valor Casco</label>
												<p className="text-base font-semibold text-gray-900">
													{formatCurrency(nave.valor_casco, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Resp. Civil</label>
												<p className="text-base font-semibold text-gray-900">
													{formatCurrency(nave.valor_responsabilidad_civil, poliza.moneda)}
												</p>
											</div>
											{nave.nivel_ap_nombre && (
												<div>
													<label className="text-sm font-medium text-gray-600">Nivel AP</label>
													<p className="text-base text-gray-900">{nave.nivel_ap_nombre}</p>
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
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
												<label className="text-sm font-medium text-gray-600">Nro. Serie</label>
												<p className={`text-base font-semibold text-gray-900 ${equipo._excluido_por ? "line-through" : ""}`}>{equipo.nro_serie}</p>
											</div>
											{equipo.placa && (
												<div>
													<label className="text-sm font-medium text-gray-600">Placa</label>
													<p className="text-base text-gray-900">{equipo.placa}</p>
												</div>
											)}
											<div>
												<label className="text-sm font-medium text-gray-600">Tipo</label>
												<p className="text-base text-gray-900">{equipo.tipo_equipo || "-"}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Marca/Modelo</label>
												<p className="text-base text-gray-900">
													{equipo.marca_equipo || "-"} {equipo.modelo || ""}
												</p>
											</div>
											{equipo.ano != null && (
												<div>
													<label className="text-sm font-medium text-gray-600">Año</label>
													<p className="text-base text-gray-900">{equipo.ano}</p>
												</div>
											)}
											{equipo.color && (
												<div>
													<label className="text-sm font-medium text-gray-600">Color</label>
													<p className="text-base text-gray-900">{equipo.color}</p>
												</div>
											)}
											<div>
												<label className="text-sm font-medium text-gray-600">Uso</label>
												<p className="text-base text-gray-900 capitalize">{equipo.uso}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Valor Asegurado</label>
												<p className="text-base font-semibold text-gray-900">
													{formatCurrency(equipo.valor_asegurado, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Franquicia</label>
												<p className="text-base text-gray-900">
													{formatCurrency(equipo.franquicia, poliza.moneda)}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Coaseguro</label>
												<p className="text-base text-gray-900">{equipo.coaseguro}%</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Nro. Chasis</label>
												<p className="text-base text-gray-900">{equipo.nro_chasis}</p>
											</div>
											{equipo.nro_motor && (
												<div>
													<label className="text-sm font-medium text-gray-600">Nro. Motor</label>
													<p className="text-base text-gray-900">{equipo.nro_motor}</p>
												</div>
											)}
											{equipo.plaza_circulacion && (
												<div>
													<label className="text-sm font-medium text-gray-600">Plaza de Circulación</label>
													<p className="text-base text-gray-900">{equipo.plaza_circulacion}</p>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Plan de Pagos */}
					<div className="bg-white rounded-lg shadow-sm border p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<CreditCard className="h-5 w-5" />
							Plan de Pagos
							{poliza.tiene_anexos_activos && (
								<span className="text-sm font-normal text-blue-600">(consolidado)</span>
							)}
						</h2>

						{/* Resumen de Pagos */}
						<div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
							<div>
								<label className="text-xs font-medium text-gray-600">Total Pagos</label>
								<p className="text-lg font-semibold text-gray-900">{totalPagos}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-gray-600">Pagados</label>
								<p className="text-lg font-semibold text-green-600">{pagosPagados}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-gray-600">Pendientes</label>
								<p className="text-lg font-semibold text-yellow-600">{pagosPendientes}</p>
							</div>
						</div>

						{/* Tabla de Cuotas */}
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 border-b">
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
												const etiquetaCuota = esCuotaInicial ? "Inicial" : `${cuota.numero_cuota}`;
												return (
													<tr
														key={cuota.cuota_original_id}
														className={`hover:bg-gray-50 ${esCuotaInicial ? "bg-blue-50" : ""}`}
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
																<span className={cuota.monto_ajustes >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
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
																		cuota.estado
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
												<tr key={`vc-${vc.anexo_id}`} className="bg-purple-50/50 hover:bg-purple-50">
													<td className="px-4 py-3 text-sm font-medium text-purple-800" colSpan={2}>
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
															<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoPagoStyle(vc.estado)}`}>
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
													className={`hover:bg-gray-50 ${esCuotaInicial ? "bg-blue-50" : ""}`}
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
																	pago.estado
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
					<div className="bg-white rounded-lg shadow-sm border p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
												<p className="text-sm font-medium text-gray-900">
													{doc.nombre_archivo}
												</p>
												<p className="text-xs text-gray-600">
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
												const { data } = await supabase.storage.from("polizas-documentos").createSignedUrl(path, 3600);
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

				{/* Right Column - Summary */}
				<div className="space-y-6">
					{/* Resumen Financiero */}
					<div className="bg-white rounded-lg shadow-sm border p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<DollarSign className="h-5 w-5" />
							Resumen Financiero
						</h2>
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium text-gray-600">Prima Total</label>
								<p className="text-2xl font-bold text-gray-900 mt-1">
									{formatCurrency(poliza.prima_total, poliza.moneda)}
								</p>
								<p className="text-xs text-gray-600 capitalize mt-1">
									Modalidad: {poliza.modalidad_pago}
								</p>
							</div>
							{poliza.monto_ajustes_total != null && poliza.monto_ajustes_total !== 0 && (
								<div className="pt-4 border-t border-blue-200 bg-blue-50 -mx-6 px-6 py-3">
									<label className="text-sm font-medium text-blue-700">Ajustes por Anexos</label>
									<p className={`text-lg font-semibold mt-1 ${poliza.monto_ajustes_total >= 0 ? "text-green-600" : "text-red-600"}`}>
										{poliza.monto_ajustes_total >= 0 ? "+" : ""}
										{formatCurrency(poliza.monto_ajustes_total, poliza.moneda)}
									</p>
									<label className="text-sm font-medium text-blue-800 mt-2 block">Prima Consolidada</label>
									<p className="text-xl font-bold text-blue-900 mt-1">
										{formatCurrency(poliza.prima_total + poliza.monto_ajustes_total, poliza.moneda)}
									</p>
								</div>
							)}
							<div className="pt-4 border-t">
								<label className="text-sm font-medium text-gray-600">Prima Neta</label>
								<p className="text-lg font-semibold text-gray-900 mt-1">
									{formatCurrency(poliza.prima_neta, poliza.moneda)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600">Comisión</label>
								<p className="text-lg font-semibold text-gray-900 mt-1">
									{formatCurrency(poliza.comision, poliza.moneda)}
								</p>
							</div>
						</div>
					</div>

					{/* Estado de Pagos */}
					<div className="bg-white rounded-lg shadow-sm border p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Pagos</h2>
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium text-gray-600">Monto Pagado</label>
								<p className="text-xl font-bold text-green-600 mt-1">
									{formatCurrency(montoPagado, poliza.moneda)}
								</p>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-600">Monto Pendiente</label>
								<p className="text-xl font-bold text-yellow-600 mt-1">
									{formatCurrency(montoPendiente, poliza.moneda)}
								</p>
							</div>
							<div className="pt-4 border-t">
								<div className="flex items-center justify-between text-sm">
									<span className="text-gray-600">Progreso</span>
									<span className="font-semibold text-gray-900">
										{totalPagos > 0 ? Math.round((pagosPagados / totalPagos) * 100) : 0}%
									</span>
								</div>
								<div className="mt-2 w-full bg-gray-200 rounded-full h-2">
									<div
										className="bg-green-600 h-2 rounded-full transition-all"
										style={{
											width: `${totalPagos > 0 ? (pagosPagados / totalPagos) * 100 : 0}%`,
										}}
									></div>
								</div>
							</div>
						</div>
					</div>

					{/* Información Adicional */}
					<div className="bg-white rounded-lg shadow-sm border p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h2>
						<div className="space-y-4 text-sm">
							{/* Fecha de creación */}
							<div>
								<label className="font-medium text-gray-600">Fecha de Creación</label>
								<p className="text-gray-900">{formatDate(poliza.created_at)}</p>
								{poliza.creador_nombre && (
									<p className="text-gray-500 text-xs">por {poliza.creador_nombre}</p>
								)}
							</div>

							{/* Fecha de validación */}
							{poliza.fecha_validacion && (
								<div>
									<label className="font-medium text-gray-600">Fecha de Validación</label>
									<p className="text-gray-900">{formatDate(poliza.fecha_validacion)}</p>
									{poliza.validador_nombre && (
										<p className="text-gray-500 text-xs">por {poliza.validador_nombre}</p>
									)}
								</div>
							)}

							{/* Información de rechazo */}
							{poliza.estado === "rechazada" && poliza.fecha_rechazo && (
								<div className="pt-3 border-t border-orange-200 bg-orange-50 -mx-6 px-6 py-3 -mb-3 rounded-b-lg">
									<label className="font-medium text-orange-800 block mb-2">
										Poliza Rechazada
									</label>
									<p className="text-orange-900 text-xs mb-1">
										{formatDate(poliza.fecha_rechazo)}
										{poliza.rechazador_nombre && (
											<span className="text-orange-700"> por {poliza.rechazador_nombre}</span>
										)}
									</p>
									{poliza.motivo_rechazo && (
										<div className="mt-2 p-2 bg-white rounded border border-orange-200">
											<p className="text-xs text-gray-700">
												<strong>Motivo:</strong> {poliza.motivo_rechazo}
											</p>
										</div>
									)}
									{poliza.puede_editar_hasta && (
										<>
											{new Date(poliza.puede_editar_hasta) > new Date() ? (
												<p className="text-xs text-green-700 mt-2">
													Puede editar hasta: {formatDate(poliza.puede_editar_hasta)}
												</p>
											) : (
												<p className="text-xs text-red-600 mt-2">
													Ventana de edicion expirada
												</p>
											)}
										</>
									)}
								</div>
							)}

							{/* Historial de cambios - solo ediciones reales, no creación ni cambios de estado por validación */}
							{(() => {
								const edicionesRelevantes = poliza.historial?.filter((item) => {
									// Excluir creación (ya se muestra arriba)
									if (item.accion === "creacion") return false;
									// Excluir ediciones que solo cambiaron estado (validación ya se muestra arriba)
									if (
										item.accion === "edicion" &&
										item.campos_modificados?.length === 1 &&
										item.campos_modificados[0] === "estado"
									) {
										return false;
									}
									return true;
								}) || [];

								if (edicionesRelevantes.length === 0) return null;

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
									// Filtrar 'estado' de los campos mostrados si hay otros campos
									const camposFiltrados = campos.filter((c) => c !== "estado" || campos.length === 1);
									return camposFiltrados.map((c) => labels[c] || c).join(", ");
								};

								return (
									<div className="pt-3 border-t">
										<label className="font-medium text-gray-600 mb-2 block">Historial</label>
										<div className="space-y-2 max-h-48 overflow-y-auto">
											{edicionesRelevantes.map((item) => {
												const isAnexo = item.accion.startsWith("anexo_");
												if (isAnexo) {
													const color = item.accion === "anexo_validacion" ? "text-green-700" : item.accion === "anexo_rechazo" ? "text-red-700" : "text-blue-700";
													return (
														<p key={item.id} className={`text-xs ${color}`}>
															{formatDate(item.timestamp)} - {item.descripcion}
															{item.usuario_nombre && <span className="text-gray-500"> por {item.usuario_nombre}</span>}
														</p>
													);
												}
												const camposTexto = formatCampos(item.campos_modificados);
												return (
													<p key={item.id} className="text-xs text-gray-600">
														{formatDate(item.timestamp)} - {item.usuario_nombre || "Usuario"}{" "}
														modificó{camposTexto && `: ${camposTexto}`}
													</p>
												);
											})}
										</div>
									</div>
								);
							})()}
						</div>
					</div>
				</div>
				{/* Anexos Section - full width */}
				<AnexoDetalleSection
					polizaId={polizaId}
					moneda={poliza.moneda}
					puedeValidar={userRole === "admin" || userRole === "usuario" || isTeamLeader}
					onAnexoValidado={cargarDetalle}
				/>
			</div>

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
