"use client";

import { useState, useEffect, useCallback } from "react";
import {
	ChevronLeft,
	Save,
	AlertTriangle,
	CheckCircle,
	Edit,
	User,
	FileText,
	Car,
	CreditCard,
	File,
	Info,
} from "lucide-react";
import type {
	PolizaFormState,
	AdvertenciaPoliza,
	PasoFormulario,
	DatosIncendio,
	DatosRiesgosVarios,
	DatosResponsabilidadCivil,
	DatosRamosTecnicos,
	DatosTransporte,
	DatosAeronavegacion,
} from "@/types/poliza";
import { LABEL_TIPO_CLIENTE } from "@/types/poliza";
import { validarDatosBasicos, validarModalidadPago, ramoRequiereDatosEspecificos } from "@/utils/polizaValidation";
import { DOCUMENTOS_OBLIGATORIOS } from "@/utils/validationConstants";
import { hoyLaPaz } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/utils/supabase/client";

const LABELS_TIPO_TRANSPORTE: Record<string, string> = {
	terrestre: "Terrestre",
	maritimo: "Marítimo",
	aereo: "Aéreo",
	ferreo: "Férreo",
	multimodal: "Multimodal",
};

const LABELS_MODALIDAD_TRANSPORTE: Record<string, string> = {
	flotante: "Flotante",
	flat: "Flat",
	un_solo_embarque: "Un solo embarque",
	flat_prima_minima_deposito: "Flat con prima mínima depósito",
};

type Props = {
	formState: PolizaFormState;
	onAnterior: () => void;
	onEditarPaso: (paso: PasoFormulario) => void;
	onGuardar: () => Promise<void>;
	guardando?: boolean; // Estado de carga desde el padre
	mode?: "create" | "edit" | "renovacion"; // En edición no se bloquean cuotas con fecha pasada
};

export function Resumen({ formState, onAnterior, onEditarPaso, onGuardar, guardando = false, mode = "create" }: Props) {
	const [advertencias, setAdvertencias] = useState<AdvertenciaPoliza[]>([]);
	const [productoNombre, setProductoNombre] = useState<string | null>(null);

	const generarAdvertencias = useCallback(() => {
		const nuevasAdvertencias: AdvertenciaPoliza[] = [];

		// Asegurado seleccionado (compuerta final antes de llegar al server action)
		if (!formState.asegurado) {
			nuevasAdvertencias.push({
				tipo: "error",
				campo: "asegurado",
				mensaje: "Debe seleccionar un asegurado antes de guardar",
			});
		}

		// Datos básicos completos y válidos
		if (!formState.datos_basicos) {
			nuevasAdvertencias.push({
				tipo: "error",
				campo: "datos_basicos",
				mensaje: "Debe completar los datos básicos antes de guardar",
			});
		} else {
			const validacionBasicos = validarDatosBasicos(formState.datos_basicos);
			if (!validacionBasicos.valido) {
				validacionBasicos.errores.forEach((error) => {
					nuevasAdvertencias.push({
						tipo: "error",
						campo: error.campo,
						mensaje: `Datos básicos: ${error.mensaje}`,
					});
				});
			}
		}

		// Modalidad de pago completa y válida
		if (!formState.modalidad_pago) {
			nuevasAdvertencias.push({
				tipo: "error",
				campo: "modalidad_pago",
				mensaje: "Debe definir la modalidad de pago antes de guardar",
			});
		} else {
			const validacionPago = validarModalidadPago(
				formState.modalidad_pago,
				formState.datos_basicos?.tipo_prima ?? "directa",
				formState.datos_basicos?.es_retroactiva ?? false,
				{ bloquearCuotasVencidas: mode !== "edit", hoy: hoyLaPaz() },
			);
			if (!validacionPago.valido) {
				validacionPago.errores.forEach((error) => {
					nuevasAdvertencias.push({
						tipo: "error",
						campo: error.campo,
						mensaje: `Modalidad de pago: ${error.mensaje}`,
					});
				});
			}
		}

		// Advertencias sobre documentos obligatorios faltantes
		const docsSubidos = formState.documentos.filter((d) => d.upload_status === "uploaded" || d.id);
		const docsFaltantes = DOCUMENTOS_OBLIGATORIOS.filter(
			(tipo) => !docsSubidos.some((d) => d.tipo_documento === tipo),
		);
		if (docsFaltantes.length > 0) {
			nuevasAdvertencias.push({
				tipo: "error",
				campo: "documentos",
				mensaje: `Documentos obligatorios faltantes: ${docsFaltantes.join(", ")}`,
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

		// Validar que datos_especificos exista para ramos que lo requieren
		if (
			formState.datos_basicos?.ramo &&
			ramoRequiereDatosEspecificos(formState.datos_basicos.ramo) &&
			!formState.datos_especificos
		) {
			nuevasAdvertencias.push({
				tipo: "error",
				campo: "datos_especificos",
				mensaje: `Debe completar los datos específicos del ramo "${formState.datos_basicos.ramo}" antes de guardar`,
			});
		}

		// Estructura mínima de los datos específicos según el ramo
		if (formState.datos_especificos) {
			const de = formState.datos_especificos;
			const errorEspecifico = (mensaje: string) => {
				nuevasAdvertencias.push({ tipo: "error", campo: "datos_especificos", mensaje });
			};

			switch (de.tipo_ramo) {
				case "Automotores":
					if (de.datos.vehiculos.length === 0) {
						errorEspecifico("Debe agregar al menos un vehículo en los datos específicos");
					}
					break;
				case "Salud":
					if (!de.datos.contratante) {
						errorEspecifico("Debe seleccionar el contratante en los datos específicos de Salud");
					}
					break;
				case "Vida":
				case "Accidentes Personales":
					if (!de.datos.contratante) {
						errorEspecifico(`Debe seleccionar el contratante en los datos específicos de ${de.tipo_ramo}`);
					}
					break;
				case "Sepelio":
					if (de.datos.asegurados.length === 0) {
						errorEspecifico("Debe agregar al menos un asegurado en los datos específicos de Sepelio");
					}
					break;
				case "Incendio y Aliados":
				case "Riesgos Varios Misceláneos":
					if (de.datos.bienes.length === 0) {
						errorEspecifico(`Debe agregar al menos un bien asegurado en los datos de ${de.tipo_ramo}`);
					}
					break;
				case "Aeronavegación":
				case "Naves o embarcaciones":
					if (de.datos.naves.length === 0) {
						errorEspecifico("Debe agregar al menos una nave/aeronave en los datos específicos");
					}
					break;
				case "Responsabilidad Civil":
					if (!de.datos.valor_asegurado || de.datos.valor_asegurado <= 0) {
						errorEspecifico("El valor asegurado de Responsabilidad Civil debe ser mayor a 0");
					}
					break;
				case "Ramos técnicos":
					if (!de.datos.valor_asegurado || de.datos.valor_asegurado <= 0) {
						errorEspecifico("El valor asegurado de Ramos técnicos debe ser mayor a 0");
					}
					break;
				case "Transportes":
					if (!de.datos.materia_asegurada) {
						errorEspecifico("Debe indicar la materia asegurada en los datos de Transportes");
					}
					break;
			}
		}

		setAdvertencias(nuevasAdvertencias);
	}, [formState, mode]);

	// Generar advertencias al cargar
	useEffect(() => {
		generarAdvertencias();
	}, [generarAdvertencias]);

	// Cargar nombre del producto
	useEffect(() => {
		const cargarProducto = async () => {
			if (!formState.datos_basicos?.producto_id) {
				setProductoNombre(null);
				return;
			}

			const supabase = createClient();
			const { data, error } = await supabase
				.from("productos_aseguradoras")
				.select("nombre_producto, codigo_producto")
				.eq("id", formState.datos_basicos.producto_id)
				.single();

			if (error || !data) {
				console.error("Error cargando producto:", error);
				setProductoNombre(null);
				return;
			}

			setProductoNombre(`${data.nombre_producto} (${data.codigo_producto})`);
		};

		cargarProducto();
	}, [formState.datos_basicos?.producto_id]);

	// Diálogo de confirmación cuando hay advertencias (warnings no bloqueantes)
	const [mostrarConfirmarWarnings, setMostrarConfirmarWarnings] = useState(false);

	const handleGuardar = async () => {
		if (guardando) return;

		// Confirmar si hay warnings
		const tieneWarnings = advertencias.some((a) => a.tipo === "warning");
		if (tieneWarnings) {
			setMostrarConfirmarWarnings(true);
			return;
		}

		await onGuardar();
	};

	const { asegurado, datos_basicos, datos_especificos, modalidad_pago, documentos } = formState;

	// Contadores
	const errores = advertencias.filter((a) => a.tipo === "error");
	const warnings = advertencias.filter((a) => a.tipo === "warning");
	const infos = advertencias.filter((a) => a.tipo === "info");

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Resumen y Confirmación</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Revise toda la información antes de guardar la póliza
					</p>
				</div>
			</div>

			{/* Advertencias */}
			{advertencias.length > 0 && (
				<div className="mb-6 space-y-3">
					{errores.length > 0 && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
							<div className="flex gap-2">
								<AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-destructive mb-2">
										Errores que deben corregirse:
									</h4>
									<ul className="text-sm text-destructive space-y-1">
										{errores.map((adv, i) => (
											<li key={i}>• {adv.mensaje}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

					{warnings.length > 0 && (
						<div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
							<div className="flex gap-2">
								<AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-warning-foreground mb-2">
										Advertencias:
									</h4>
									<ul className="text-sm text-warning-foreground space-y-1">
										{warnings.map((adv, i) => (
											<li key={i}>• {adv.mensaje}</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					)}

					{infos.length > 0 && (
						<div className="p-4 bg-secondary border border-border rounded-lg">
							<div className="flex gap-2">
								<Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
								<div className="flex-1">
									<h4 className="text-sm font-semibold text-foreground mb-2">Información:</h4>
									<ul className="text-sm text-muted-foreground space-y-1">
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
				<div className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-secondary rounded-md">
								<User className="h-5 w-5 text-primary" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-foreground">Asegurado</h3>
									<CheckCircle className="h-4 w-4 text-success" />
								</div>
								{asegurado && (
									<div className="text-sm text-muted-foreground space-y-1">
										<p className="font-medium text-foreground">{asegurado.nombre_completo}</p>
										<p>Documento: {asegurado.documento}</p>
										<p>Tipo: {LABEL_TIPO_CLIENTE[asegurado.client_type]}</p>
									</div>
								)}
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={() => onEditarPaso(1)}>
							<Edit className="h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Paso 2: Datos Básicos */}
				<div className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-secondary rounded-md">
								<FileText className="h-5 w-5 text-success" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-foreground">Datos Básicos</h3>
									<CheckCircle className="h-4 w-4 text-success" />
								</div>
								{datos_basicos && (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
										{datos_basicos.es_renovacion && (
											<div className="col-span-2 mb-1">
												<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
													Renovación de póliza Nº {datos_basicos.nro_poliza_anterior}
												</span>
											</div>
										)}
										<div>
											<span className="font-medium text-foreground">Nº Póliza:</span>{" "}
											{datos_basicos.numero_poliza}
										</div>
										<div>
											<span className="font-medium text-foreground">Ramo:</span>{" "}
											{datos_basicos.ramo}
										</div>
										{productoNombre && (
											<div className="col-span-2">
												<span className="font-medium text-foreground">Producto:</span>{" "}
												<span className="text-primary">{productoNombre}</span>
											</div>
										)}
										<div>
											<span className="font-medium text-foreground">Vigencia:</span>{" "}
											{new Date(datos_basicos.inicio_vigencia + "T00:00:00").toLocaleDateString(
												"es-BO",
											)}{" "}
											-{" "}
											{new Date(datos_basicos.fin_vigencia + "T00:00:00").toLocaleDateString(
												"es-BO",
											)}
										</div>
										<div>
											<span className="font-medium text-foreground">Emisión:</span>{" "}
											{new Date(
												datos_basicos.fecha_emision_compania + "T00:00:00",
											).toLocaleDateString("es-BO")}
										</div>
									</div>
								)}
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={() => onEditarPaso(2)}>
							<Edit className="h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Paso 3: Datos Específicos */}
				<div className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-secondary rounded-md">
								<Car className="h-5 w-5 text-primary" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-foreground">
										Datos Específicos - {datos_especificos?.tipo_ramo}
									</h3>
									<CheckCircle className="h-4 w-4 text-success" />
								</div>

								{/* Automotores */}
								{datos_especificos?.tipo_ramo === "Automotores" && (
									<div className="text-sm text-muted-foreground">
										<p className="font-medium">
											{datos_especificos.datos.vehiculos.length} vehículo(s) asegurado(s)
										</p>
										<ul className="mt-2 space-y-1">
											{datos_especificos.datos.vehiculos.slice(0, 3).map((v, i) => (
												<li key={i}>
													• {v.placa} - Valor: {v.valor_asegurado.toLocaleString("es-BO")}{" "}
													{modalidad_pago?.moneda || "Bs"}
												</li>
											))}
											{datos_especificos.datos.vehiculos.length > 3 && (
												<li className="text-muted-foreground italic">
													...y {datos_especificos.datos.vehiculos.length - 3} más
												</li>
											)}
										</ul>
									</div>
								)}

								{/* Accidentes Personales */}
								{datos_especificos?.tipo_ramo === "Accidentes Personales" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Tipo:</span>{" "}
											{datos_especificos.datos.tipo_poliza === "individual"
												? "Individual"
												: "Corporativo"}
										</div>
										<div>
											<p className="font-medium text-foreground">
												Niveles de cobertura: {datos_especificos.datos.niveles.length}
											</p>
											<ul className="mt-1 space-y-1">
												{datos_especificos.datos.niveles.map((nivel, i) => (
													<li key={i} className="ml-2">
														• {nivel.nombre}
														{nivel.prima_nivel &&
															` - Prima: ${nivel.prima_nivel.toLocaleString("es-BO")} ${modalidad_pago?.moneda || "Bs"}`}
													</li>
												))}
											</ul>
										</div>
										{datos_especificos.datos.contratante && (
											<div>
												<span className="font-medium text-foreground">Contratante:</span>{" "}
												{datos_especificos.datos.contratante.client_name} —{" "}
												{datos_especificos.datos.contratante.rol === "contratante-asegurado"
													? "Contratante-Asegurado"
													: "Contratante"}
											</div>
										)}
										<div>
											<span className="font-medium text-foreground">Asegurados:</span>{" "}
											{datos_especificos.datos.asegurados.length}
										</div>
									</div>
								)}

								{/* Vida */}
								{datos_especificos?.tipo_ramo === "Vida" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Niveles:</span>{" "}
											{datos_especificos.datos.niveles.length}
										</div>
										{datos_especificos.datos.contratante && (
											<div>
												<span className="font-medium text-foreground">Contratante:</span>{" "}
												{datos_especificos.datos.contratante.client_name} —{" "}
												{datos_especificos.datos.contratante.rol === "contratante-asegurado"
													? "Contratante-Asegurado"
													: "Contratante"}
											</div>
										)}
										<div>
											<span className="font-medium text-foreground">Asegurados:</span>{" "}
											{datos_especificos.datos.asegurados.length}
										</div>
										<div className="text-primary italic text-xs mt-2">
											ℹ️ Pólizas de Vida solo permiten pago en contado
										</div>
									</div>
								)}

								{/* Salud */}
								{datos_especificos?.tipo_ramo === "Salud" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Tipo:</span>{" "}
											{datos_especificos.datos.tipo_poliza === "individual"
												? "Individual"
												: "Colectivo"}
										</div>
										{datos_especificos.datos.tiene_maternidad && (
											<div className="text-success">✓ Incluye cobertura de maternidad</div>
										)}
										<div>
											<p className="font-medium text-foreground">
												Niveles: {datos_especificos.datos.niveles.length}
											</p>
											<ul className="mt-1 space-y-1">
												{datos_especificos.datos.niveles.map((nivel, i) => (
													<li key={i} className="ml-2">
														• {nivel.nombre} - {nivel.monto.toLocaleString("es-BO")}{" "}
														{modalidad_pago?.moneda || "Bs"}
													</li>
												))}
											</ul>
										</div>
										{datos_especificos.datos.contratante && (
											<div>
												<span className="font-medium text-foreground">Contratante:</span>{" "}
												{datos_especificos.datos.contratante.client_name} —{" "}
												{datos_especificos.datos.contratante.rol === "contratante-titular"
													? "Contratante-Titular"
													: "Contratante"}
											</div>
										)}
										<div>
											<span className="font-medium text-foreground">Titulares:</span>{" "}
											{datos_especificos.datos.titulares.length}
										</div>
									</div>
								)}

								{/* Sepelio */}
								{datos_especificos?.tipo_ramo === "Sepelio" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Tipo:</span>{" "}
											{datos_especificos.datos.tipo_poliza === "individual"
												? "Individual"
												: "Colectivo"}
										</div>
										<div>
											<p className="font-medium text-foreground">
												Niveles de cobertura: {datos_especificos.datos.niveles.length}
											</p>
											<ul className="mt-1 space-y-1">
												{datos_especificos.datos.niveles.map((nivel, i) => (
													<li key={i} className="ml-2">
														• {nivel.nombre}
														{nivel.prima_nivel
															? ` - ${nivel.prima_nivel.toLocaleString("es-BO")} ${modalidad_pago?.moneda || "Bs"}`
															: ""}
													</li>
												))}
											</ul>
										</div>
										<div>
											<p className="font-medium text-foreground">
												Asegurados: {datos_especificos.datos.asegurados.length}
											</p>
										</div>
									</div>
								)}

								{/* Incendio */}
								{datos_especificos?.tipo_ramo === "Incendio y Aliados" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<p className="font-medium text-foreground">
												Bienes asegurados:{" "}
												{(datos_especificos.datos as DatosIncendio).bienes.length}
											</p>
											<ul className="mt-2 space-y-2">
												{(datos_especificos.datos as DatosIncendio).bienes
													.slice(0, 2)
													.map((bien, i) => (
														<li key={i} className="ml-2 border-l-2 border-primary/30 pl-3">
															<div className="font-medium text-foreground">
																{bien.direccion}
															</div>
															<div className="text-xs text-muted-foreground mt-1">
																Items asegurados: {bien.items.length}
															</div>
															<ul className="mt-1 space-y-0.5">
																{bien.items.map((item, j) => (
																	<li key={j} className="text-xs">
																		• {item.nombre}:{" "}
																		{item.monto.toLocaleString("es-BO")}{" "}
																		{modalidad_pago?.moneda || "Bs"}
																	</li>
																))}
															</ul>
															<div className="mt-1 text-sm font-medium text-primary">
																Valor total:{" "}
																{bien.valor_total_declarado.toLocaleString("es-BO")}{" "}
																{modalidad_pago?.moneda || "Bs"}
															</div>
														</li>
													))}
												{(datos_especificos.datos as DatosIncendio).bienes.length > 2 && (
													<li className="text-muted-foreground italic ml-2">
														...y{" "}
														{(datos_especificos.datos as DatosIncendio).bienes.length - 2}{" "}
														bien(es) más
													</li>
												)}
											</ul>
										</div>
										<div className="pt-2 border-t border-border">
											<span className="font-medium text-foreground">Valor Total Asegurado:</span>{" "}
											{(datos_especificos.datos as DatosIncendio).valor_asegurado.toLocaleString(
												"es-BO",
											)}{" "}
											{modalidad_pago?.moneda || "Bs"}
										</div>
									</div>
								)}

								{/* Riesgos Varios */}
								{datos_especificos?.tipo_ramo === "Riesgos Varios Misceláneos" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Valor Total Asegurado:</span>{" "}
											{(
												datos_especificos.datos as DatosRiesgosVarios
											).valor_total_asegurado.toLocaleString("es-BO")}{" "}
											{modalidad_pago?.moneda || "Bs"}
										</div>
										<div>
											<span className="font-medium text-foreground">Bienes Asegurados:</span>{" "}
											{(datos_especificos.datos as DatosRiesgosVarios).bienes?.length || 0}{" "}
											bien(es)
										</div>
										<div>
											<span className="font-medium text-foreground">Asegurados:</span>{" "}
											{(datos_especificos.datos as DatosRiesgosVarios).asegurados.length}{" "}
											asegurado(s)
										</div>
									</div>
								)}

								{/* RC (Responsabilidad Civil) */}
								{datos_especificos?.tipo_ramo === "Responsabilidad Civil" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Tipo de Póliza:</span>{" "}
											{(datos_especificos.datos as DatosResponsabilidadCivil).tipo_poliza ===
											"individual"
												? "Individual"
												: "Corporativo"}
										</div>
										<div>
											<span className="font-medium text-foreground">Valor Asegurado:</span>{" "}
											{(
												datos_especificos.datos as DatosResponsabilidadCivil
											).valor_asegurado.toLocaleString("es-BO")}{" "}
											{modalidad_pago?.moneda || "Bs"}
										</div>
									</div>
								)}

								{/* Transportes */}
								{datos_especificos?.tipo_ramo === "Transportes" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Materia asegurada:</span>{" "}
											{(datos_especificos.datos as DatosTransporte).materia_asegurada}
										</div>
										<div>
											<span className="font-medium text-foreground">Tipo de transporte:</span>{" "}
											{LABELS_TIPO_TRANSPORTE[
												(datos_especificos.datos as DatosTransporte).tipo_transporte
											] ?? (datos_especificos.datos as DatosTransporte).tipo_transporte}
										</div>
										<div>
											<span className="font-medium text-foreground">Ruta:</span>{" "}
											{(datos_especificos.datos as DatosTransporte).ciudad_origen} →{" "}
											{(datos_especificos.datos as DatosTransporte).ciudad_destino}
										</div>
										<div>
											<span className="font-medium text-foreground">Valor Asegurado:</span>{" "}
											{(
												datos_especificos.datos as DatosTransporte
											).valor_asegurado.toLocaleString("es-BO")}{" "}
											{modalidad_pago?.moneda || "Bs"}
										</div>
										<div>
											<span className="font-medium text-foreground">Modalidad:</span>{" "}
											{LABELS_MODALIDAD_TRANSPORTE[
												(datos_especificos.datos as DatosTransporte).modalidad
											] ?? (datos_especificos.datos as DatosTransporte).modalidad}
										</div>
										<div>
											<span className="font-medium text-foreground">Coberturas:</span>{" "}
											{[
												(datos_especificos.datos as DatosTransporte).cobertura_a &&
													"A (Todo Riesgo)",
												(datos_especificos.datos as DatosTransporte).cobertura_c &&
													"C (Riesgos Nombrados)",
											]
												.filter(Boolean)
												.join(", ") || "—"}
										</div>
									</div>
								)}

								{/* Aeronavegación / Naves o embarcaciones */}
								{(datos_especificos?.tipo_ramo === "Aeronavegación" ||
									datos_especificos?.tipo_ramo === "Naves o embarcaciones") && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Tipo:</span>{" "}
											{(datos_especificos.datos as DatosAeronavegacion).tipo_nave === "aeronave"
												? "Aeronave"
												: "Embarcación"}
											{" · "}
											{(datos_especificos.datos as DatosAeronavegacion).tipo_poliza ===
											"individual"
												? "Individual"
												: "Corporativo"}
										</div>
										<div>
											<span className="font-medium text-foreground">
												{(datos_especificos.datos as DatosAeronavegacion).tipo_nave ===
												"aeronave"
													? "Aeronaves"
													: "Naves/Embarcaciones"}
												:
											</span>{" "}
											{(datos_especificos.datos as DatosAeronavegacion).naves.length}
										</div>
										<div>
											<span className="font-medium text-foreground">Niveles AP:</span>{" "}
											{(datos_especificos.datos as DatosAeronavegacion).niveles_ap.length}
										</div>
										<div>
											<span className="font-medium text-foreground">Asegurados adicionales:</span>{" "}
											{
												(datos_especificos.datos as DatosAeronavegacion).asegurados_adicionales
													.length
											}
										</div>
									</div>
								)}

								{datos_especificos?.tipo_ramo === "Ramos técnicos" && (
									<div className="text-sm text-muted-foreground space-y-2">
										<div>
											<span className="font-medium text-foreground">Valor Asegurado:</span>{" "}
											{(
												datos_especificos.datos as DatosRamosTecnicos
											).valor_asegurado.toLocaleString("es-BO")}{" "}
											{modalidad_pago?.moneda || "Bs"}
										</div>
										<div>
											<span className="font-medium text-foreground">Tipo de Póliza:</span>{" "}
											{(datos_especificos.datos as DatosRamosTecnicos).tipo_poliza ===
											"individual"
												? "Individual"
												: "Corporativo"}
										</div>
										{((datos_especificos.datos as DatosRamosTecnicos).equipos?.length ?? 0) > 0 && (
											<div>
												<span className="font-medium text-foreground">Equipos:</span>{" "}
												{(datos_especificos.datos as DatosRamosTecnicos).equipos!.length}{" "}
												equipo(s) registrado(s)
											</div>
										)}
									</div>
								)}
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={() => onEditarPaso(3)}>
							<Edit className="h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Paso 4: Modalidad de Pago */}
				<div className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-secondary rounded-md">
								<CreditCard className="h-5 w-5 text-warning" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-foreground">Modalidad de Pago</h3>
									<CheckCircle className="h-4 w-4 text-success" />
								</div>
								{modalidad_pago && (
									<div className="text-sm text-muted-foreground space-y-1">
										<p>
											<span className="font-medium text-foreground">Tipo:</span>{" "}
											{modalidad_pago.tipo === "contado" ? "Contado" : "Crédito"}
										</p>
										<p>
											<span className="font-medium text-foreground">Prima Total:</span>{" "}
											{modalidad_pago.prima_total.toLocaleString("es-BO")} {modalidad_pago.moneda}
										</p>
										{modalidad_pago.tipo === "credito" && (
											<>
												<p>
													<span className="font-medium text-foreground">Cuota Inicial:</span>{" "}
													{modalidad_pago.cuota_inicial.toLocaleString("es-BO")}{" "}
													{modalidad_pago.moneda}
												</p>
												<p>
													<span className="font-medium text-foreground">Cuotas:</span>{" "}
													{modalidad_pago.cantidad_cuotas} cuotas
												</p>
											</>
										)}
										{modalidad_pago.prima_neta && (
											<p className="text-primary">
												<span className="font-medium">Prima Neta:</span>{" "}
												{modalidad_pago.prima_neta.toLocaleString("es-BO")}{" "}
												{modalidad_pago.moneda}
											</p>
										)}
										{/* Mostrar comisión empresa si está disponible */}
										{(() => {
											const pago = modalidad_pago as {
												comision_empresa?: number;
												moneda: string;
											};
											if (!pago.comision_empresa) return null;
											return (
												<div className="mt-2 pt-2 border-t border-border">
													<p className="text-success">
														<span className="font-medium">Comisión Empresa:</span>{" "}
														{pago.comision_empresa.toLocaleString("es-BO")} {pago.moneda}
													</p>
												</div>
											);
										})()}
									</div>
								)}
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={() => onEditarPaso(4)}>
							<Edit className="h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Paso 5: Documentos */}
				<div className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
					<div className="flex items-start justify-between">
						<div className="flex gap-3 flex-1">
							<div className="p-2 bg-secondary rounded-md">
								<File className="h-5 w-5 text-primary" />
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-sm font-semibold text-foreground">Documentos</h3>
									{documentos.length > 0 ? (
										<CheckCircle className="h-4 w-4 text-success" />
									) : (
										<Info className="h-4 w-4 text-muted-foreground" />
									)}
								</div>
								<div className="text-sm text-muted-foreground">
									{documentos.length > 0 ? (
										<>
											<p className="font-medium mb-2">
												{documentos.length} documento(s) cargado(s)
											</p>
											<ul className="space-y-1">
												{documentos.slice(0, 3).map((doc, i) => (
													<li key={i}>• {doc.nombre_archivo}</li>
												))}
												{documentos.length > 3 && (
													<li className="text-muted-foreground italic">
														...y {documentos.length - 3} más
													</li>
												)}
											</ul>
										</>
									) : (
										<p className="text-muted-foreground italic">No se cargaron documentos</p>
									)}
								</div>
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={() => onEditarPaso(5)}>
							<Edit className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 mt-6 border-t border-border">
				<Button variant="outline" onClick={onAnterior} disabled={guardando}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<Button onClick={handleGuardar} disabled={guardando || errores.length > 0} className="">
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

			{/* Diálogo: confirmar guardado con advertencias */}
			<AlertDialog open={mostrarConfirmarWarnings} onOpenChange={setMostrarConfirmarWarnings}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Guardar con advertencias</AlertDialogTitle>
						<AlertDialogDescription>
							Hay advertencias sobre la póliza. ¿Está seguro de continuar con el guardado?
						</AlertDialogDescription>
					</AlertDialogHeader>
					{warnings.length > 0 && (
						<ul className="text-sm text-warning-foreground bg-warning/10 border border-warning/30 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
							{warnings.map((adv, i) => (
								<li key={i}>• {adv.mensaje}</li>
							))}
						</ul>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel>Revisar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								setMostrarConfirmarWarnings(false);
								onGuardar();
							}}
						>
							Guardar de todas formas
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
