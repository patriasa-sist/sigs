"use client";

import { useState, useEffect } from "react";
import {
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	DollarSign,
	CreditCard,
	Calendar,
	AlertCircle,
	Sparkles,
	Lock,
	Check,
	Save,
} from "lucide-react";
import type {
	ModalidadPago as ModalidadPagoType,
	Moneda,
	CuotaCredito,
	PeriodoPago,
	ProductoAseguradora,
	CalculoComisionResult,
} from "@/types/poliza";
import {
	validarModalidadPago,
	calcularPrimaNetaYComision,
	calcularComisionesConProducto,
	validarFechasDentroVigencia,
} from "@/utils/polizaValidation";
import { POLIZA_RULES } from "@/utils/validationConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

type Props = {
	datos: ModalidadPagoType | null;
	inicioVigencia?: string;
	finVigencia?: string;
	producto?: ProductoAseguradora | null; // Producto seleccionado para cálculos dinámicos
	porcentajeComisionUsuario?: number; // Porcentaje de comisión del usuario encargado
	mode?: "create" | "edit"; // Modo del formulario
	onChange: (datos: ModalidadPagoType) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// Helper to check if any cuota is paid
const tieneCuotasPagadas = (datos: ModalidadPagoType | null): boolean => {
	if (!datos) return false;
	if (datos.tipo === "contado") {
		return datos.cuota_pagada === true;
	}
	// For credito, check cuota_inicial_pagada and any cuota with estado "pagado"
	return (
		datos.cuota_inicial_pagada === true ||
		datos.tiene_pagos === true ||
		datos.cuotas.some((c) => c.estado === "pagado")
	);
};

export function ModalidadPago({
	datos,
	inicioVigencia,
	finVigencia,
	producto,
	porcentajeComisionUsuario = 0.5,
	mode = "create",
	onChange,
	onSiguiente,
	onAnterior,
}: Props) {
	const [tipoPago, setTipoPago] = useState<"contado" | "credito">(datos?.tipo || "contado");

	// Check if modality change should be blocked (paid cuotas exist)
	const bloquearCambioModalidad = mode === "edit" && tieneCuotasPagadas(datos);
	const cuotaUnicaPagada = datos?.tipo === "contado" && datos.cuota_pagada === true;
	const cuotaInicialPagada = datos?.tipo === "credito" && datos.cuota_inicial_pagada === true;

	// Estados para pago contado
	const [cuotaUnica, setCuotaUnica] = useState<number>(datos?.tipo === "contado" ? datos.cuota_unica : 0);
	const [fechaPagoUnico, setFechaPagoUnico] = useState<string>(
		datos?.tipo === "contado" ? datos.fecha_pago_unico : "",
	);

	// Estados para pago crédito
	const [primaTotal, setPrimaTotal] = useState<number>(datos ? datos.prima_total : 0);
	const [cantidadCuotas, setCantidadCuotas] = useState<number>(datos?.tipo === "credito" ? datos.cantidad_cuotas : 1);
	const [cuotaInicial, setCuotaInicial] = useState<number>(datos?.tipo === "credito" ? datos.cuota_inicial : 0);
	const [fechaInicioCuotas, setFechaInicioCuotas] = useState<string>(
		datos?.tipo === "credito" ? datos.fecha_inicio_cuotas : inicioVigencia || "",
	);
	const [periodoPago, setPeriodoPago] = useState<PeriodoPago>(
		datos?.tipo === "credito" ? datos.periodo_pago : "mensual",
	);
	const [cuotas, setCuotas] = useState<CuotaCredito[]>(datos?.tipo === "credito" ? datos.cuotas : []);
	const [cuotasGeneradas, setCuotasGeneradas] = useState<boolean>(false);

	// Estado especial: usar factores de contado en crédito
	const [usarFactoresContado, setUsarFactoresContado] = useState<boolean>(
		datos?.tipo === "credito" ? (datos.usar_factores_contado ?? false) : false,
	);

	// Estado común
	const [moneda, setMoneda] = useState<Moneda>(datos?.moneda || "Bs");
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [advertencias, setAdvertencias] = useState<Record<string, string>>({});

	// Estado para feedback visual en modo edición
	const [datosActualizados, setDatosActualizados] = useState<boolean>(false);

	// Calcular prima neta y comisiones
	const montoPago = tipoPago === "contado" ? cuotaUnica : primaTotal;

	// Usar cálculos basados en producto si está disponible, de lo contrario usar legacy
	// Si en crédito con usarFactoresContado, pasar "contado" para usar factor_contado
	const modalidadParaCalculo = tipoPago === "credito" && usarFactoresContado ? "contado" : tipoPago;
	const calculos: CalculoComisionResult | null =
		producto && montoPago > 0
			? calcularComisionesConProducto({
					prima_total: montoPago,
					modalidad_pago: modalidadParaCalculo,
					producto,
					porcentaje_comision_usuario: porcentajeComisionUsuario,
				})
			: null;

	// Valores legacy para compatibilidad
	const { prima_neta: prima_neta_legacy, comision: comision_legacy } = calcularPrimaNetaYComision(montoPago);

	// Usar valores del producto si está disponible, de lo contrario usar legacy
	const prima_neta = calculos?.prima_neta ?? prima_neta_legacy;
	const comision = calculos?.comision_empresa ?? comision_legacy;

	// Sincronizar prima_total con cuota_unica en modo contado
	useEffect(() => {
		if (tipoPago === "contado") {
			setPrimaTotal(cuotaUnica);
		}
	}, [cuotaUnica, tipoPago]);

	// En crédito siempre mínimo 2 cuotas
	useEffect(() => {
		if (tipoPago === "credito" && cantidadCuotas < 2) {
			setCantidadCuotas(2);
			setCuotasGeneradas(false);
		}
	}, [tipoPago, cantidadCuotas]);

	const handleChangeTipoPago = (tipo: string) => {
		// Block modality change if there are paid cuotas
		if (bloquearCambioModalidad) {
			return;
		}
		setTipoPago(tipo as "contado" | "credito");
		setErrores({});
		setAdvertencias({});
		setCuotasGeneradas(false);
	};

	const calcularFechasCuotas = (numCuotas: number, iniciarDesdeMesSiguiente: boolean): string[] => {
		if (!fechaInicioCuotas) return [];

		const fechas: string[] = [];

		// Parsear la fecha correctamente para evitar problemas de timezone
		const [year, month, day] = fechaInicioCuotas.split("-").map(Number);

		// Calcular el incremento en meses según el periodo
		const incrementoMeses = periodoPago === "mensual" ? 1 : periodoPago === "trimestral" ? 3 : 6;

		// Si hay cuota inicial, las cuotas regulares empiezan desde el mes siguiente
		const offsetInicial = iniciarDesdeMesSiguiente ? incrementoMeses : 0;

		for (let i = 0; i < numCuotas; i++) {
			// Crear fecha en zona horaria local
			const fecha = new Date(year, month - 1, day);
			fecha.setMonth(fecha.getMonth() + offsetInicial + i * incrementoMeses);

			// Formatear como YYYY-MM-DD sin usar toISOString para evitar problemas de timezone
			const y = fecha.getFullYear();
			const m = String(fecha.getMonth() + 1).padStart(2, "0");
			const d = String(fecha.getDate()).padStart(2, "0");
			fechas.push(`${y}-${m}-${d}`);
		}

		return fechas;
	};

	const handleGenerarCuotas = () => {
		if (!primaTotal || primaTotal <= 0) {
			setErrores({ prima_total: "Debe ingresar la prima total primero" });
			return;
		}

		if (!fechaInicioCuotas) {
			setErrores({ fecha_inicio_cuotas: "Debe ingresar la fecha de inicio de cuotas" });
			return;
		}

		// Limpiar errores previos
		setErrores({});
		setAdvertencias({});

		// Si hay cuota inicial, las cuotas regulares son cantidadCuotas - 1
		// para que el total (inicial + regulares) sea igual a cantidadCuotas
		const tieneCuotaInicial = cuotaInicial > 0;
		const numCuotasRegulares = tieneCuotaInicial ? cantidadCuotas - 1 : cantidadCuotas;

		// Validar que haya al menos 1 cuota regular si hay cuota inicial
		if (tieneCuotaInicial && numCuotasRegulares < 1) {
			setErrores({ cantidad_cuotas: "Debe seleccionar al menos 2 cuotas si hay cuota inicial" });
			return;
		}

		// Calcular monto de cada cuota regular
		const restoAPagar = primaTotal - cuotaInicial;
		const montoPorCuota = numCuotasRegulares > 0 ? restoAPagar / numCuotasRegulares : 0;

		// Calcular fechas para las cuotas regulares
		// Si hay cuota inicial, las regulares empiezan desde el mes siguiente
		const fechasCuotas = calcularFechasCuotas(numCuotasRegulares, tieneCuotaInicial);

		// Generar cuotas regulares (la cuota inicial es la #1, estas empiezan desde #2)
		const inicioNumeracion = tieneCuotaInicial ? 2 : 1;
		const nuevasCuotas: CuotaCredito[] = fechasCuotas.map((fecha, index) => ({
			numero: inicioNumeracion + index,
			monto: Math.round(montoPorCuota * 100) / 100,
			fecha_vencimiento: fecha,
		}));

		setCuotas(nuevasCuotas);
		setCuotasGeneradas(true);
	};

	const handleChangeFechaCuota = (index: number, fecha: string) => {
		const nuevasCuotas = [...cuotas];
		nuevasCuotas[index].fecha_vencimiento = fecha;
		setCuotas(nuevasCuotas);

		// Limpiar error y advertencia específicos
		const nuevosErrores = { ...errores };
		const nuevasAdvertencias = { ...advertencias };
		delete nuevosErrores[`cuota_${index}_fecha`];
		delete nuevasAdvertencias[`cuota_${index}_fecha`];
		setErrores(nuevosErrores);
		setAdvertencias(nuevasAdvertencias);
	};

	const handleChangeMontoCuota = (index: number, monto: number) => {
		const nuevasCuotas = [...cuotas];
		nuevasCuotas[index].monto = monto;
		setCuotas(nuevasCuotas);

		// Limpiar advertencias de suma
		const nuevasAdvertencias = { ...advertencias };
		delete nuevasAdvertencias.cuotas;
		setAdvertencias(nuevasAdvertencias);
	};

	const handleChangeNumeroCuota = (index: number, numero: number) => {
		const nuevasCuotas = [...cuotas];
		nuevasCuotas[index].numero = numero;
		setCuotas(nuevasCuotas);
	};

	const handleContinuar = () => {
		let datosPago: ModalidadPagoType & { comision_empresa?: number; comision_encargado?: number };

		if (tipoPago === "contado") {
			datosPago = {
				tipo: "contado",
				cuota_unica: cuotaUnica,
				fecha_pago_unico: fechaPagoUnico,
				prima_total: cuotaUnica,
				moneda,
				prima_neta,
				comision,
			};
		} else {
			// cantidad_cuotas representa el total de cuotas (inicial + regulares)
			const totalCuotas = cuotaInicial > 0 ? cuotas.length + 1 : cuotas.length;
			datosPago = {
				tipo: "credito",
				prima_total: primaTotal,
				moneda,
				cantidad_cuotas: totalCuotas,
				cuota_inicial: cuotaInicial,
				fecha_inicio_cuotas: fechaInicioCuotas,
				periodo_pago: periodoPago,
				cuotas,
				prima_neta,
				comision,
				usar_factores_contado: usarFactoresContado || undefined,
			};
		}

		// Agregar campos de comisión del producto si está disponible
		if (calculos) {
			datosPago.comision_empresa = calculos.comision_empresa;
			datosPago.comision_encargado = calculos.comision_encargado;
		}

		// Validar campos requeridos
		const validacion = validarModalidadPago(datosPago);
		if (!validacion.valido) {
			const nuevosErrores: Record<string, string> = {};
			validacion.errores.forEach((error) => {
				nuevosErrores[error.campo] = error.mensaje;
			});
			setErrores(nuevosErrores);
			return;
		}

		// Validar fechas contra vigencia (advertencia que bloquea)
		if (inicioVigencia && finVigencia) {
			const validacionVigencia = validarFechasDentroVigencia(datosPago, inicioVigencia, finVigencia);
			if (!validacionVigencia.valido) {
				const nuevasAdvertencias: Record<string, string> = {};
				validacionVigencia.errores.forEach((error) => {
					nuevasAdvertencias[error.campo] = error.mensaje;
				});
				setAdvertencias(nuevasAdvertencias);
				return; // Bloquear si excede vigencia
			}
		}

		// Limpiar errores y advertencias
		setErrores({});
		setAdvertencias({});

		onChange(datosPago);

		// En modo edición, mostrar feedback visual antes de continuar
		if (mode === "edit") {
			setDatosActualizados(true);
			// Reset después de 2 segundos
			setTimeout(() => setDatosActualizados(false), 2000);
		}

		onSiguiente();
	};

	// En modo edición, si ya hay cuotas cargadas de la BD (tienen id), no requerir cuotasGeneradas
	const cuotasExistentes = cuotas.some((c) => c.id);
	const tieneDatos =
		tipoPago === "contado"
			? cuotaUnica > 0 && fechaPagoUnico
			: primaTotal > 0 && cuotas.length > 0 && (cuotasGeneradas || cuotasExistentes);

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Modalidad de Pago</h2>
					<p className="text-sm text-muted-foreground mt-1">Defina cómo se realizará el pago de la póliza</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-success">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{tipoPago === "contado"
								? "Pago al contado"
								: `${cuotaInicial > 0 ? cuotas.length + 1 : cuotas.length} cuotas`}
						</span>
					</div>
				)}
			</div>

			{/* Warning about blocked modality change */}
			{bloquearCambioModalidad && (
				<div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-2">
					<Lock className="h-5 w-5 text-warning flex-shrink-0" />
					<p className="text-sm text-warning-foreground">
						No se puede cambiar la modalidad de pago porque hay cuotas ya pagados. Solo puede editar las
						cuotas pendientes.
					</p>
				</div>
			)}

			<Tabs value={tipoPago} onValueChange={handleChangeTipoPago} className="mb-6">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger
						value="contado"
						className="flex items-center gap-2"
						disabled={bloquearCambioModalidad && tipoPago !== "contado"}
					>
						<DollarSign className="h-4 w-4" />
						Contado
						{bloquearCambioModalidad && tipoPago !== "contado" && <Lock className="h-3 w-3 ml-1" />}
					</TabsTrigger>
					<TabsTrigger
						value="credito"
						className="flex items-center gap-2"
						disabled={bloquearCambioModalidad && tipoPago !== "credito"}
					>
						<CreditCard className="h-4 w-4" />
						Crédito
						{bloquearCambioModalidad && tipoPago !== "credito" && <Lock className="h-3 w-3 ml-1" />}
					</TabsTrigger>
				</TabsList>

				{/* PAGO AL CONTADO */}
				<TabsContent value="contado" className="space-y-6 mt-6">
					{/* Show paid indicator */}
					{cuotaUnicaPagada && (
						<div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
							<p className="text-sm text-success">
								Esta cuota ya está <strong>pagado</strong>. Los datos no pueden ser modificados.
							</p>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Cuota Única */}
						<div className="space-y-2">
							<Label htmlFor="cuota_unica">
								Cuota Única <span className="text-destructive">*</span>
								{cuotaUnicaPagada && (
									<Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
										Pagada
									</Badge>
								)}
							</Label>
							<Input
								id="cuota_unica"
								type="number"
								min="0"
								step="0.01"
								value={cuotaUnica || ""}
								onChange={(e) => {
									if (cuotaUnicaPagada) return;
									const valor = parseFloat(e.target.value) || 0;
									setCuotaUnica(valor);
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { cuota_unica: _removed, ...rest } = errores;
									setErrores(rest);
								}}
								placeholder="5000.00"
								className={errores.cuota_unica ? "border-destructive" : ""}
								disabled={cuotaUnicaPagada}
							/>
							{errores.cuota_unica && <p className="text-sm text-destructive">{errores.cuota_unica}</p>}
						</div>

						{/* Fecha de Pago */}
						<div className="space-y-2">
							<Label htmlFor="fecha_pago_unico">
								Fecha de Pago <span className="text-destructive">*</span>
							</Label>
							<Input
								id="fecha_pago_unico"
								type="date"
								lang="es"
								value={fechaPagoUnico}
								onChange={(e) => {
									if (cuotaUnicaPagada) return;
									setFechaPagoUnico(e.target.value);
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { fecha_pago_unico: _removedErr, ...restErrores } = errores;
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { fecha_pago_unico: _removedAdv, ...restAdv } = advertencias;
									setErrores(restErrores);
									setAdvertencias(restAdv);
								}}
								className={
									errores.fecha_pago_unico || advertencias.fecha_pago_unico
										? "border-destructive"
										: ""
								}
								disabled={cuotaUnicaPagada}
							/>
							{errores.fecha_pago_unico && (
								<p className="text-sm text-destructive">{errores.fecha_pago_unico}</p>
							)}
							{advertencias.fecha_pago_unico && (
								<p className="text-sm text-warning">{advertencias.fecha_pago_unico}</p>
							)}
						</div>

						{/* Moneda */}
						<div className="space-y-2">
							<Label htmlFor="moneda">
								Moneda <span className="text-destructive">*</span>
							</Label>
							<Select value={moneda} onValueChange={(value) => setMoneda(value as Moneda)}>
								<SelectTrigger className={errores.moneda ? "border-destructive" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Bs">Bolivianos (Bs)</SelectItem>
									<SelectItem value="USD">Dólares (USD)</SelectItem>
									<SelectItem value="USDT">Tether (USDT)</SelectItem>
									<SelectItem value="UFV">UFV</SelectItem>
								</SelectContent>
							</Select>
							{errores.moneda && <p className="text-sm text-destructive">{errores.moneda}</p>}
						</div>
					</div>

					{/* Cálculos */}
					{cuotaUnica > 0 && (
						<div className="bg-secondary border border-border rounded-lg p-4">
							<h4 className="text-sm font-semibold text-foreground mb-3">
								Cálculos Automáticos
								{producto && (
									<span className="text-xs font-normal text-muted-foreground ml-2">
										(Producto: {producto.nombre_producto})
									</span>
								)}
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
								<div>
									<p className="text-muted-foreground font-medium">Prima Total</p>
									<p className="text-foreground text-lg font-bold">
										{cuotaUnica.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground font-medium">
										Prima Neta
										{calculos && (
											<span className="text-xs font-normal text-muted-foreground ml-1">
												(Factor: {calculos.factor_usado}%)
											</span>
										)}
									</p>
									<p className="text-foreground text-lg font-bold">
										{prima_neta.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground font-medium">
										Comisión Empresa
										{calculos && (
											<span className="text-xs font-normal text-muted-foreground ml-1">
												({(calculos.porcentaje_comision * 100).toFixed(1)}%)
											</span>
										)}
									</p>
									<p className="text-foreground text-lg font-bold">
										{comision.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
							</div>
							{!producto && (
								<p className="text-xs text-warning mt-2">
									⚠️ Cálculos usando fórmula legacy (87% / 2%). Seleccione un producto para cálculos
									dinámicos.
								</p>
							)}
						</div>
					)}
				</TabsContent>

				{/* PAGO A CRÉDITO */}
				<TabsContent value="credito" className="space-y-6 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Prima Total */}
						<div className="space-y-2">
							<Label htmlFor="prima_total">
								Prima Total <span className="text-destructive">*</span>
							</Label>
							<Input
								id="prima_total"
								type="number"
								min="0"
								step="0.01"
								value={primaTotal || ""}
								onChange={(e) => {
									const valor = parseFloat(e.target.value) || 0;
									setPrimaTotal(valor);
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { prima_total: _removed, ...rest } = errores;
									setErrores(rest);
									setCuotasGeneradas(false); // Reset cuotas al cambiar prima
								}}
								placeholder="10000.00"
								className={errores.prima_total ? "border-destructive" : ""}
							/>
							{errores.prima_total && <p className="text-sm text-destructive">{errores.prima_total}</p>}
						</div>

						{/* Moneda */}
						<div className="space-y-2">
							<Label htmlFor="moneda_credito">
								Moneda <span className="text-destructive">*</span>
							</Label>
							<Select value={moneda} onValueChange={(value) => setMoneda(value as Moneda)}>
								<SelectTrigger className={errores.moneda ? "border-destructive" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Bs">Bolivianos (Bs)</SelectItem>
									<SelectItem value="USD">Dólares (USD)</SelectItem>
									<SelectItem value="USDT">Tether (USDT)</SelectItem>
									<SelectItem value="UFV">UFV</SelectItem>
								</SelectContent>
							</Select>
							{errores.moneda && <p className="text-sm text-destructive">{errores.moneda}</p>}
						</div>

						{/* Checkbox: Usar factores de contado */}
						{producto && (
							<div className="md:col-span-2">
								<label
									htmlFor="usar_factores_contado"
									className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
										usarFactoresContado
											? "border-destructive bg-red-50"
											: "border-dashed border-border hover:border-muted-foreground/40"
									}`}
								>
									<input
										id="usar_factores_contado"
										type="checkbox"
										checked={usarFactoresContado}
										onChange={(e) => setUsarFactoresContado(e.target.checked)}
										className="h-4 w-4 rounded border-destructive text-destructive focus:ring-red-500 accent-red-600"
									/>
									<div>
										<span
											className={`text-sm font-medium ${usarFactoresContado ? "text-destructive" : "text-foreground"}`}
										>
											Usar factores de comisión al contado
										</span>
										<p
											className={`text-xs mt-0.5 ${usarFactoresContado ? "text-destructive" : "text-muted-foreground"}`}
										>
											{usarFactoresContado
												? `Caso especial activo — usando factor contado (${producto.factor_contado}%) en vez de crédito (${producto.factor_credito}%)`
												: `Solo para casos especiales. Usará factor ${producto.factor_contado}% (contado) en vez de ${producto.factor_credito}% (crédito)`}
										</p>
									</div>
								</label>
							</div>
						)}

						{/* Cuota Inicial */}
						<div className="space-y-2">
							<Label htmlFor="cuota_inicial">
								Cuota Inicial
								{bloquearCambioModalidad && (
									<Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />
								)}
							</Label>
							<Input
								id="cuota_inicial"
								type="number"
								min="0"
								step="0.01"
								value={cuotaInicial || ""}
								onChange={(e) => {
									const valor = parseFloat(e.target.value) || 0;
									setCuotaInicial(Math.max(0, Math.min(primaTotal, valor)));
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { cuota_inicial: _removed, ...rest } = errores;
									setErrores(rest);
									setCuotasGeneradas(false);
								}}
								placeholder="0.00 (opcional)"
								className={errores.cuota_inicial ? "border-destructive" : ""}
								disabled={bloquearCambioModalidad}
							/>
							{errores.cuota_inicial && (
								<p className="text-sm text-destructive">{errores.cuota_inicial}</p>
							)}
							<p className="text-xs text-muted-foreground">
								{bloquearCambioModalidad
									? "No se puede modificar porque hay cuotas pagadas"
									: cuotaInicial > 0
										? `La cuota inicial será la cuota #1, las restantes serán cuotas #2 a #${cantidadCuotas}`
										: "Si no hay cuota inicial, ingrese 0 o deje vacío"}
							</p>
						</div>

						{/* Fecha Inicio Cuotas */}
						<div className="space-y-2">
							<Label htmlFor="fecha_inicio_cuotas">
								Fecha Inicio Cuotas <span className="text-destructive">*</span>
								{bloquearCambioModalidad && (
									<Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />
								)}
							</Label>
							<Input
								id="fecha_inicio_cuotas"
								type="date"
								lang="es"
								value={fechaInicioCuotas}
								onChange={(e) => {
									setFechaInicioCuotas(e.target.value);
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { fecha_inicio_cuotas: _removed, ...rest } = errores;
									setErrores(rest);
									setCuotasGeneradas(false);
								}}
								className={errores.fecha_inicio_cuotas ? "border-destructive" : ""}
								disabled={bloquearCambioModalidad}
							/>
							{errores.fecha_inicio_cuotas && (
								<p className="text-sm text-destructive">{errores.fecha_inicio_cuotas}</p>
							)}
						</div>

						{/* Periodo de Pago */}
						<div className="space-y-2">
							<Label htmlFor="periodo_pago">
								Periodo de Pago <span className="text-destructive">*</span>
								{bloquearCambioModalidad && (
									<Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />
								)}
							</Label>
							<Select
								value={periodoPago}
								onValueChange={(value) => {
									setPeriodoPago(value as PeriodoPago);
									setCuotasGeneradas(false);
								}}
								disabled={bloquearCambioModalidad}
							>
								<SelectTrigger className={errores.periodo_pago ? "border-destructive" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="mensual">Mensual</SelectItem>
									<SelectItem value="trimestral">Trimestral</SelectItem>
									<SelectItem value="semestral">Semestral</SelectItem>
								</SelectContent>
							</Select>
							{errores.periodo_pago && <p className="text-sm text-destructive">{errores.periodo_pago}</p>}
						</div>

						{/* Cantidad de Cuotas con Slider */}
						<div className="space-y-2">
							<Label htmlFor="cantidad_cuotas">
								Cantidad de Cuotas: <span className="font-bold text-primary">{cantidadCuotas}</span>
								{cuotaInicial > 0 && (
									<span className="text-xs text-muted-foreground ml-2">
										(#1 inicial + #{2}-{cantidadCuotas} regulares)
									</span>
								)}
								{bloquearCambioModalidad && (
									<Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />
								)}
							</Label>
							<div className="pt-2">
								<Slider
									id="cantidad_cuotas"
									min={2}
									max={POLIZA_RULES.CUOTAS_MAX}
									step={1}
									value={[cantidadCuotas]}
									onValueChange={(value) => {
										setCantidadCuotas(value[0]);
										setCuotasGeneradas(false);
									}}
									className="w-full"
									disabled={bloquearCambioModalidad}
								/>
								<div className="flex justify-between text-xs text-muted-foreground mt-1">
									<span>2 cuotas</span>
									<span>12 cuotas</span>
								</div>
							</div>
							{errores.cantidad_cuotas && (
								<p className="text-sm text-destructive">{errores.cantidad_cuotas}</p>
							)}
						</div>
					</div>

					{/* Botón Generar Cuotas */}
					<div className="flex flex-col items-center gap-2">
						<Button
							onClick={handleGenerarCuotas}
							disabled={bloquearCambioModalidad || !primaTotal || primaTotal <= 0 || !fechaInicioCuotas}
							className="w-full md:w-auto"
							size="lg"
						>
							<Sparkles className="mr-2 h-5 w-5" />
							Generar Cuotas
						</Button>
						{bloquearCambioModalidad && (
							<p className="text-xs text-warning flex items-center gap-1">
								<Lock className="h-3 w-3" />
								No se pueden regenerar las cuotas porque hay pagos registrados
							</p>
						)}
					</div>

					{/* Cálculos */}
					{primaTotal > 0 && (
						<div className="bg-secondary border border-border rounded-lg p-4">
							<h4 className="text-sm font-semibold text-foreground mb-3">
								Cálculos Automáticos
								{producto && (
									<span className="text-xs font-normal text-muted-foreground ml-2">
										(Producto: {producto.nombre_producto})
									</span>
								)}
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
								<div>
									<p className="text-muted-foreground font-medium">Prima Total</p>
									<p className="text-foreground text-lg font-bold">
										{primaTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground font-medium">
										Prima Neta
										{calculos && (
											<span className="text-xs font-normal text-muted-foreground ml-1">
												(Factor: {calculos.factor_usado}%)
											</span>
										)}
									</p>
									<p className="text-foreground text-lg font-bold">
										{prima_neta.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground font-medium">
										Comisión Empresa
										{calculos && (
											<span className="text-xs font-normal text-muted-foreground ml-1">
												({(calculos.porcentaje_comision * 100).toFixed(1)}%)
											</span>
										)}
									</p>
									<p className="text-foreground text-lg font-bold">
										{comision.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground font-medium">Resto a Pagar</p>
									<p className="text-foreground text-lg font-bold">
										{(primaTotal - cuotaInicial).toLocaleString("es-BO", {
											minimumFractionDigits: 2,
										})}{" "}
										{moneda}
									</p>
								</div>
							</div>
							{!producto && (
								<p className="text-xs text-warning mt-2">
									⚠️ Cálculos usando fórmula legacy (87% / 2%). Seleccione un producto para cálculos
									dinámicos.
								</p>
							)}
						</div>
					)}

					{/* Tabla de Cuotas */}
					{cuotas.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-semibold text-foreground">Plan de Cuotas</h4>
								<span className="text-xs text-muted-foreground">
									{cuotaInicial > 0
										? `Cuota #1 (inicial) + Cuotas #2-${cuotas.length + 1} = ${cuotas.length + 1} total`
										: `${cuotas.length} cuota${cuotas.length !== 1 ? "s" : ""}`}
								</span>
							</div>

							{/* Mostrar advertencia si hay errores */}
							{(Object.keys(errores).some((key) => key.startsWith("cuota_")) ||
								Object.keys(advertencias).some((key) => key.startsWith("cuota_"))) && (
								<div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
									<AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
									<div className="text-sm text-destructive">
										<p className="font-medium mb-1">Corrija los errores en las cuotas</p>
										<p>Revise las fechas y montos marcados en rojo.</p>
									</div>
								</div>
							)}

							<div className="border rounded-lg overflow-hidden">
								<div className="overflow-x-auto max-h-96 overflow-y-auto">
									<table className="w-full">
										<thead className="bg-secondary sticky top-0">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase">
													# Cuota
													{mode === "edit" && (
														<span className="text-muted-foreground ml-1">
															(solo pendientes)
														</span>
													)}
												</th>
												<th className="px-4 py-3 text-right text-xs font-medium text-foreground uppercase">
													Monto
													{mode === "edit" && (
														<span className="text-muted-foreground ml-1">
															(solo pendientes)
														</span>
													)}
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase">
													Fecha Vencimiento <span className="text-destructive">*</span>
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase">
													Estado
												</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{/* Mostrar cuota inicial si existe */}
											{cuotaInicial > 0 && (
												<tr className={cuotaInicialPagada ? "bg-success/10" : "bg-primary/5"}>
													<td className="px-4 py-3">
														<span
															className={`font-medium ${cuotaInicialPagada ? "text-success" : "text-primary"}`}
														>
															1 (Inicial)
														</span>
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center justify-end gap-2">
															<span
																className={`font-semibold ${cuotaInicialPagada ? "text-success" : "text-foreground"}`}
															>
																{cuotaInicial.toLocaleString("es-BO", {
																	minimumFractionDigits: 2,
																})}
															</span>
															<span className="text-sm text-muted-foreground font-medium">
																{moneda}
															</span>
														</div>
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center gap-2">
															<Calendar
																className={`h-4 w-4 ${cuotaInicialPagada ? "text-success/70" : "text-primary/50"}`}
															/>
															<span
																className={`text-sm ${cuotaInicialPagada ? "text-success" : "text-primary"}`}
															>
																{fechaInicioCuotas
																	? new Date(
																			fechaInicioCuotas + "T00:00:00",
																		).toLocaleDateString("es-BO")
																	: "-"}
															</span>
														</div>
													</td>
													<td className="px-4 py-3">
														{cuotaInicialPagada ? (
															<Badge className="bg-success/15 text-success border-success/30">
																<Lock className="h-3 w-3 mr-1" />
																Pagada
															</Badge>
														) : (
															<Badge
																variant="outline"
																className="bg-warning/10 text-warning-foreground border-warning/30"
															>
																Pendiente
															</Badge>
														)}
													</td>
												</tr>
											)}
											{cuotas.map((cuota, index) => {
												const estaPagada = cuota.estado === "pagado";
												return (
													<tr
														key={index}
														className={
															estaPagada ? "bg-success/10" : "hover:bg-secondary/50"
														}
													>
														<td className="px-4 py-3">
															{estaPagada ? (
																<span className="font-medium text-success">
																	{cuota.numero}
																</span>
															) : (
																<Input
																	type="number"
																	min="1"
																	value={cuota.numero}
																	onChange={(e) =>
																		handleChangeNumeroCuota(
																			index,
																			parseInt(e.target.value) || 1,
																		)
																	}
																	className="max-w-[80px]"
																/>
															)}
														</td>
														<td className="px-4 py-3">
															<div className="flex items-center justify-end gap-2">
																{estaPagada ? (
																	<span className="font-semibold text-success">
																		{cuota.monto.toLocaleString("es-BO", {
																			minimumFractionDigits: 2,
																		})}
																	</span>
																) : (
																	<Input
																		type="number"
																		min="0"
																		step="0.01"
																		value={cuota.monto || ""}
																		onChange={(e) =>
																			handleChangeMontoCuota(
																				index,
																				parseFloat(e.target.value) || 0,
																			)
																		}
																		className="max-w-[140px] text-right"
																	/>
																)}
																<span className="text-sm text-muted-foreground font-medium">
																	{moneda}
																</span>
															</div>
														</td>
														<td className="px-4 py-3">
															<div className="flex items-center gap-2">
																<Calendar
																	className={`h-4 w-4 ${estaPagada ? "text-success/70" : "text-muted-foreground"}`}
																/>
																{estaPagada ? (
																	<span className="text-sm text-success">
																		{cuota.fecha_vencimiento
																			? new Date(
																					cuota.fecha_vencimiento +
																						"T00:00:00",
																				).toLocaleDateString("es-BO")
																			: "-"}
																	</span>
																) : (
																	<Input
																		type="date"
																		lang="es"
																		value={cuota.fecha_vencimiento}
																		onChange={(e) =>
																			handleChangeFechaCuota(
																				index,
																				e.target.value,
																			)
																		}
																		className={`max-w-[180px] ${
																			errores[`cuota_${index}_fecha`] ||
																			advertencias[`cuota_${index}_fecha`]
																				? "border-destructive"
																				: ""
																		}`}
																	/>
																)}
															</div>
															{!estaPagada && errores[`cuota_${index}_fecha`] && (
																<p className="text-xs text-destructive mt-1">
																	{errores[`cuota_${index}_fecha`]}
																</p>
															)}
															{!estaPagada && advertencias[`cuota_${index}_fecha`] && (
																<p className="text-xs text-destructive mt-1">
																	{advertencias[`cuota_${index}_fecha`]}
																</p>
															)}
														</td>
														<td className="px-4 py-3">
															{estaPagada ? (
																<Badge className="bg-success/15 text-success border-success/30">
																	<Lock className="h-3 w-3 mr-1" />
																	Pagada
																</Badge>
															) : (
																<Badge
																	variant="outline"
																	className="bg-warning/10 text-warning-foreground border-warning/30"
																>
																	Pendiente
																</Badge>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>

							{/* Advertencia suma de cuotas */}
							{advertencias.cuotas && (
								<div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex gap-2">
									<AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
									<p className="text-sm text-warning-foreground">{advertencias.cuotas}</p>
								</div>
							)}
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Errores generales */}
			{Object.keys(errores).filter((key) => !key.startsWith("cuota_")).length > 0 && (
				<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
					<h4 className="text-sm font-semibold text-destructive mb-2">Errores:</h4>
					<ul className="text-sm text-destructive space-y-1">
						{Object.entries(errores)
							.filter(([key]) => !key.startsWith("cuota_"))
							.map(([campo, mensaje]) => (
								<li key={campo}>• {mensaje}</li>
							))}
					</ul>
				</div>
			)}

			{/* Advertencias generales */}
			{Object.keys(advertencias).filter((key) => !key.startsWith("cuota_")).length > 0 && (
				<div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
					<h4 className="text-sm font-semibold text-warning-foreground mb-2">Advertencias:</h4>
					<ul className="text-sm text-warning-foreground space-y-1">
						{Object.entries(advertencias)
							.filter(([key]) => !key.startsWith("cuota_"))
							.map(([campo, mensaje]) => (
								<li key={campo}>• {mensaje}</li>
							))}
					</ul>
				</div>
			)}

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t border-border">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<div className="flex items-center gap-3">
					{/* Feedback visual de actualización exitosa */}
					{datosActualizados && (
						<span className="flex items-center gap-1 text-success text-sm font-medium animate-in fade-in duration-300">
							<Check className="h-4 w-4" />
							Datos actualizados
						</span>
					)}

					<Button onClick={handleContinuar} disabled={!tieneDatos} className="">
						{mode === "edit" ? (
							<>
								<Save className="mr-2 h-4 w-4" />
								Guardar y Continuar
							</>
						) : (
							<>
								Continuar con Documentos
								<ChevronRight className="ml-2 h-5 w-5" />
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
