"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Save, AlertTriangle, CheckCircle, Edit, User, FileText, Car, CreditCard, File, Info } from "lucide-react";
import type { PolizaFormState, AdvertenciaPoliza } from "@/types/poliza";
import { validarFechasPago } from "@/utils/polizaValidation";
import { Button } from "@/components/ui/button";

type Props = {
	formState: PolizaFormState;
	onAnterior: () => void;
	onEditarPaso: (paso: number) => void;
	onGuardar: () => Promise<void>;
};

export function Resumen({ formState, onAnterior, onEditarPaso, onGuardar }: Props) {
	const [advertencias, setAdvertencias] = useState<AdvertenciaPoliza[]>([]);
	const [guardando, setGuardando] = useState(false);

	// Generar advertencias al cargar
	useEffect(() => {
		generarAdvertencias();
	}, [formState]);

	const generarAdvertencias = () => {
		const nuevasAdvertencias: AdvertenciaPoliza[] = [];

		// Validar fechas de pago
		if (formState.modalidad_pago) {
			const validacion = validarFechasPago(formState.modalidad_pago);
			if (!validacion.valido) {
				validacion.errores.forEach((error) => {
					nuevasAdvertencias.push({
						tipo: "warning",
						campo: error.campo,
						mensaje: error.mensaje,
					});
				});
			}
		}

		// Advertencias sobre documentos faltantes
		if (formState.documentos.length === 0) {
			nuevasAdvertencias.push({
				tipo: "info",
				campo: "documentos",
				mensaje: "No se han cargado documentos. Se recomienda adjuntar al menos la póliza firmada.",
			});
		}

		// Advertencias sobre vehículos (si es automotor)
		if (formState.datos_especificos?.tipo_ramo === "Automotores") {
			const vehiculos = formState.datos_especificos.datos.vehiculos;
			vehiculos.forEach((vehiculo, index) => {
				if (!vehiculo.tipo_vehiculo_id) {
					nuevasAdvertencias.push({
						tipo: "info",
						campo: `vehiculo_${index}_tipo`,
						mensaje: `Vehículo ${vehiculo.placa}: No se especificó tipo de vehículo`,
					});
				}
				if (!vehiculo.marca_id) {
					nuevasAdvertencias.push({
						tipo: "info",
						campo: `vehiculo_${index}_marca`,
						mensaje: `Vehículo ${vehiculo.placa}: No se especificó marca`,
					});
				}
			});
		}

		setAdvertencias(nuevasAdvertencias);
	};

	const handleGuardar = async () => {
		if (guardando) return;

		// Confirmar si hay warnings
		const tieneWarnings = advertencias.some((a) => a.tipo === "warning");
		if (tieneWarnings) {
			const confirmar = confirm(
				"Hay advertencias sobre la póliza. ¿Está seguro de continuar con el guardado?"
			);
			if (!confirmar) return;
		}

		setGuardando(true);
		try {
			await onGuardar();
		} finally {
			setGuardando(false);
		}
	};

	const { asegurado, datos_basicos, datos_especificos, modalidad_pago, documentos } = formState;

	// Contadores
	const errores = advertencias.filter((a) => a.tipo === "error");
	const warnings = advertencias.filter((a) => a.tipo === "warning");
	const infos = advertencias.filter((a) => a.tipo === "info");

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 6: Resumen y Confirmación
					</h2>
					<p className="text-sm text-gray-600 mt-1">
						Revise toda la información antes de guardar la póliza
					</p>
				</div>
			</div>

			{/* Advertencias */}
			{advertencias.length > 0 && (
				<div className="mb-6 space-y-3">
					{errores.length > 0 && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<div className="flex gap-2">
								<AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-red-800 mb-2">
										Errores que deben corregirse:
									</h4>
									<ul className="text-sm text-red-700 space-y-1">
										{errores.map((adv, i) => (
											<li key={i}>• {adv.mensaje}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

					{warnings.length > 0 && (
						<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
							<div className="flex gap-2">
								<AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-yellow-800 mb-2">
										Advertencias:
									</h4>
									<ul className="text-sm text-yellow-700 space-y-1">
										{warnings.map((adv, i) => (
											<li key={i}>• {adv.mensaje}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

					{infos.length > 0 && (
						<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<div className="flex gap-2">
								<Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-blue-800 mb-2">
										Información:
									</h4>
									<ul className="text-sm text-blue-700 space-y-1">
										{infos.map((adv, i) => (
											<li key={i}>• {adv.mensaje}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			<div className="space-y-4">
				{/* Paso 1: Asegurado */}
				<div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-blue-100 rounded-lg">
								<User className="h-5 w-5 text-blue-600" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-gray-900">Asegurado</h3>
									<CheckCircle className="h-4 w-4 text-green-600" />
								</div>
								{asegurado && (
									<div className="text-sm text-gray-600 space-y-1">
										<p className="font-medium text-gray-900">{asegurado.nombre_completo}</p>
										<p>Documento: {asegurado.documento}</p>
										<p>Tipo: {asegurado.client_type === "natural" ? "Persona Natural" : "Persona Jurídica"}</p>
									</div>
								)}
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditarPaso(1)}
						>
							<Edit className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Paso 2: Datos Básicos */}
				<div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-green-100 rounded-lg">
								<FileText className="h-5 w-5 text-green-600" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-gray-900">Datos Básicos</h3>
									<CheckCircle className="h-4 w-4 text-green-600" />
								</div>
								{datos_basicos && (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
										<div>
											<span className="font-medium text-gray-700">Nº Póliza:</span> {datos_basicos.numero_poliza}
										</div>
										<div>
											<span className="font-medium text-gray-700">Ramo:</span> {datos_basicos.ramo}
										</div>
										<div>
											<span className="font-medium text-gray-700">Vigencia:</span>{" "}
											{new Date(datos_basicos.inicio_vigencia).toLocaleDateString("es-BO")} -{" "}
											{new Date(datos_basicos.fin_vigencia).toLocaleDateString("es-BO")}
										</div>
										<div>
											<span className="font-medium text-gray-700">Emisión:</span>{" "}
											{new Date(datos_basicos.fecha_emision_compania).toLocaleDateString("es-BO")}
										</div>
									</div>
								)}
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditarPaso(2)}
						>
							<Edit className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Paso 3: Datos Específicos */}
				<div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-purple-100 rounded-lg">
								<Car className="h-5 w-5 text-purple-600" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-gray-900">
										Datos Específicos - {datos_especificos?.tipo_ramo}
									</h3>
									<CheckCircle className="h-4 w-4 text-green-600" />
								</div>
								{datos_especificos?.tipo_ramo === "Automotores" && (
									<div className="text-sm text-gray-600">
										<p className="font-medium">
											{datos_especificos.datos.vehiculos.length} vehículo(s) asegurado(s)
										</p>
										<ul className="mt-2 space-y-1">
											{datos_especificos.datos.vehiculos.slice(0, 3).map((v, i) => (
												<li key={i}>
													• {v.placa} - Valor: {v.valor_asegurado.toLocaleString("es-BO")} Bs
												</li>
											))}
											{datos_especificos.datos.vehiculos.length > 3 && (
												<li className="text-gray-500 italic">
													...y {datos_especificos.datos.vehiculos.length - 3} más
												</li>
											)}
										</ul>
									</div>
								)}
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditarPaso(3)}
						>
							<Edit className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Paso 4: Modalidad de Pago */}
				<div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-yellow-100 rounded-lg">
								<CreditCard className="h-5 w-5 text-yellow-600" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-gray-900">Modalidad de Pago</h3>
									<CheckCircle className="h-4 w-4 text-green-600" />
								</div>
								{modalidad_pago && (
									<div className="text-sm text-gray-600 space-y-1">
										<p>
											<span className="font-medium text-gray-700">Tipo:</span>{" "}
											{modalidad_pago.tipo === "contado" ? "Contado" : "Crédito"}
										</p>
										<p>
											<span className="font-medium text-gray-700">Prima Total:</span>{" "}
											{modalidad_pago.prima_total.toLocaleString("es-BO")} {modalidad_pago.moneda}
										</p>
										{modalidad_pago.tipo === "credito" && (
											<>
												<p>
													<span className="font-medium text-gray-700">Cuota Inicial:</span>{" "}
													{modalidad_pago.cuota_inicial.toLocaleString("es-BO")} {modalidad_pago.moneda}
												</p>
												<p>
													<span className="font-medium text-gray-700">Cuotas:</span>{" "}
													{modalidad_pago.cantidad_cuotas} cuotas
												</p>
											</>
										)}
										{modalidad_pago.prima_neta && (
											<p className="text-blue-600">
												<span className="font-medium">Prima Neta:</span>{" "}
												{modalidad_pago.prima_neta.toLocaleString("es-BO")} {modalidad_pago.moneda}
											</p>
										)}
									</div>
								)}
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditarPaso(4)}
						>
							<Edit className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Paso 5: Documentos */}
				<div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-indigo-100 rounded-lg">
								<File className="h-5 w-5 text-indigo-600" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-gray-900">Documentos</h3>
									{documentos.length > 0 ? (
										<CheckCircle className="h-4 w-4 text-green-600" />
									) : (
										<Info className="h-4 w-4 text-gray-400" />
									)}
								</div>
								<div className="text-sm text-gray-600">
									{documentos.length > 0 ? (
										<>
											<p className="font-medium mb-2">{documentos.length} documento(s) cargado(s)</p>
											<ul className="space-y-1">
												{documentos.slice(0, 3).map((doc, i) => (
													<li key={i}>• {doc.nombre_archivo}</li>
												))}
												{documentos.length > 3 && (
													<li className="text-gray-500 italic">
														...y {documentos.length - 3} más
													</li>
												)}
											</ul>
										</>
									) : (
										<p className="text-gray-500 italic">No se cargaron documentos</p>
									)}
								</div>
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onEditarPaso(5)}
						>
							<Edit className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 mt-6 border-t">
				<Button variant="outline" onClick={onAnterior} disabled={guardando}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<Button
					onClick={handleGuardar}
					disabled={guardando || errores.length > 0}
					className="bg-green-600 hover:bg-green-700"
				>
					{guardando ? (
						<>
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
							Guardando...
						</>
					) : (
						<>
							<Save className="mr-2 h-5 w-5" />
							Guardar Póliza
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
