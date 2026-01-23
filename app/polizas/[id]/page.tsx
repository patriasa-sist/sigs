"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { obtenerDetallePoliza, type PolizaDetalle } from "../actions";
import { validarPoliza, rechazarPoliza } from "@/app/gerencia/validacion/actions";
import { checkPolicyEditPermission } from "@/app/polizas/permisos/actions";
import { Button } from "@/components/ui/button";
import { PolicyPermissionsModal } from "@/components/polizas/PolicyPermissionsModal";
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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/formatters";

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
	const [showPermissionsModal, setShowPermissionsModal] = useState(false);

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
		};
		return labels[estado as keyof typeof labels] || estado;
	};

	// Verificar si el usuario puede validar (admin o usuario con póliza pendiente)
	const puedeValidar = (userRole === "admin" || userRole === "usuario") && poliza?.estado === "pendiente";

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

	// Manejar rechazo
	const handleRechazar = async () => {
		if (!poliza) return;
		setValidationLoading("rechazar");
		const result = await rechazarPoliza(poliza.id, "Rechazada por gerencia");
		if (result.success) {
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
						<p className="text-gray-600 ml-11">Detalles completos de la póliza</p>
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

						{/* Permissions button - admin only */}
						{isAdmin && (
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
									onClick={handleRechazar}
									disabled={validationLoading !== null}
								>
									<XCircle className="h-4 w-4 mr-1" />
									{validationLoading === "rechazar" ? "Rechazando..." : "Rechazar"}
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
								<p className="text-base text-gray-900 mt-1">{poliza.client_name}</p>
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

					{/* Vehículos (si aplica) */}
					{poliza.vehiculos && poliza.vehiculos.length > 0 && (
						<div className="bg-white rounded-lg shadow-sm border p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Car className="h-5 w-5" />
								Vehículos Asegurados
							</h2>
							<div className="space-y-4">
								{poliza.vehiculos.map((vehiculo) => (
									<div key={vehiculo.id} className="border rounded-lg p-4">
										<div className="grid grid-cols-3 gap-4">
											<div>
												<label className="text-sm font-medium text-gray-600">Placa</label>
												<p className="text-base font-semibold text-gray-900">
													{vehiculo.placa}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Tipo</label>
												<p className="text-base text-gray-900">
													{vehiculo.tipo_vehiculo || "-"}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">
													Marca/Modelo
												</label>
												<p className="text-base text-gray-900">
													{vehiculo.marca || "-"} {vehiculo.modelo || ""}
												</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">Año</label>
												<p className="text-base text-gray-900">{vehiculo.ano || "-"}</p>
											</div>
											<div>
												<label className="text-sm font-medium text-gray-600">
													Valor Asegurado
												</label>
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
											Monto
										</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
											Fecha Pago
										</th>
										<th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
											Estado
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{poliza.pagos.map((pago) => {
										// Detectar si es cuota inicial por observaciones o si es la primera y tiene monto diferente
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
									})}
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
											onClick={() => window.open(doc.archivo_url, "_blank")}
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
			</div>

			{/* Permissions Modal */}
			<PolicyPermissionsModal
				polizaId={polizaId}
				numeroPoliza={poliza.numero_poliza}
				isOpen={showPermissionsModal}
				onClose={() => setShowPermissionsModal(false)}
			/>
		</div>
	);
}
