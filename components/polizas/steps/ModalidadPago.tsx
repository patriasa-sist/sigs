"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, DollarSign, CreditCard, Calendar, AlertCircle, Sparkles, Lock, Check, Save } from "lucide-react";
import type { ModalidadPago as ModalidadPagoType, Moneda, CuotaCredito, PeriodoPago, ProductoAseguradora, CalculoComisionResult } from "@/types/poliza";
import { validarModalidadPago, calcularPrimaNetaYComision, calcularComisionesConProducto, validarFechasDentroVigencia } from "@/utils/polizaValidation";
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
	return datos.cuota_inicial_pagada === true ||
		datos.tiene_pagos === true ||
		datos.cuotas.some(c => c.estado === "pagado");
};

export function ModalidadPago({ datos, inicioVigencia, finVigencia, producto, porcentajeComisionUsuario = 0.5, mode = "create", onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPago, setTipoPago] = useState<"contado" | "credito">(datos?.tipo || "contado");

	// Check if modality change should be blocked (paid cuotas exist)
	const bloquearCambioModalidad = mode === "edit" && tieneCuotasPagadas(datos);
	const cuotaUnicaPagada = datos?.tipo === "contado" && datos.cuota_pagada === true;
	const cuotaInicialPagada = datos?.tipo === "credito" && datos.cuota_inicial_pagada === true;

	// Estados para pago contado
	const [cuotaUnica, setCuotaUnica] = useState<number>(
		datos?.tipo === "contado" ? datos.cuota_unica : 0
	);
	const [fechaPagoUnico, setFechaPagoUnico] = useState<string>(
		datos?.tipo === "contado" ? datos.fecha_pago_unico : ""
	);

	// Estados para pago crédito
	const [primaTotal, setPrimaTotal] = useState<number>(
		datos ? datos.prima_total : 0
	);
	const [cantidadCuotas, setCantidadCuotas] = useState<number>(
		datos?.tipo === "credito" ? datos.cantidad_cuotas : 1
	);
	const [cuotaInicial, setCuotaInicial] = useState<number>(
		datos?.tipo === "credito" ? datos.cuota_inicial : 0
	);
	const [fechaInicioCuotas, setFechaInicioCuotas] = useState<string>(
		datos?.tipo === "credito" ? datos.fecha_inicio_cuotas : inicioVigencia || ""
	);
	const [periodoPago, setPeriodoPago] = useState<PeriodoPago>(
		datos?.tipo === "credito" ? datos.periodo_pago : "mensual"
	);
	const [cuotas, setCuotas] = useState<CuotaCredito[]>(
		datos?.tipo === "credito" ? datos.cuotas : []
	);
	const [cuotasGeneradas, setCuotasGeneradas] = useState<boolean>(false);

	// Estado común
	const [moneda, setMoneda] = useState<Moneda>(datos?.moneda || "Bs");
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [advertencias, setAdvertencias] = useState<Record<string, string>>({});

	// Estado para feedback visual en modo edición
	const [datosActualizados, setDatosActualizados] = useState<boolean>(false);

	// Calcular prima neta y comisiones
	const montoPago = tipoPago === "contado" ? cuotaUnica : primaTotal;

	// Usar cálculos basados en producto si está disponible, de lo contrario usar legacy
	const calculos: CalculoComisionResult | null = producto && montoPago > 0
		? calcularComisionesConProducto({
				prima_total: montoPago,
				modalidad_pago: tipoPago,
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
		const [year, month, day] = fechaInicioCuotas.split('-').map(Number);

		// Calcular el incremento en meses según el periodo
		const incrementoMeses = periodoPago === "mensual" ? 1 : periodoPago === "trimestral" ? 3 : 6;

		// Si hay cuota inicial, las cuotas regulares empiezan desde el mes siguiente
		const offsetInicial = iniciarDesdeMesSiguiente ? incrementoMeses : 0;

		for (let i = 0; i < numCuotas; i++) {
			// Crear fecha en zona horaria local
			const fecha = new Date(year, month - 1, day);
			fecha.setMonth(fecha.getMonth() + offsetInicial + (i * incrementoMeses));

			// Formatear como YYYY-MM-DD sin usar toISOString para evitar problemas de timezone
			const y = fecha.getFullYear();
			const m = String(fecha.getMonth() + 1).padStart(2, '0');
			const d = String(fecha.getDate()).padStart(2, '0');
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
	const cuotasExistentes = cuotas.some(c => c.id);
	const tieneDatos = tipoPago === "contado"
		? cuotaUnica > 0 && fechaPagoUnico
		: primaTotal > 0 && cuotas.length > 0 && (cuotasGeneradas || cuotasExistentes);

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 4: Modalidad de Pago
					</h2>
					<p className="text-sm text-gray-600 mt-1">
						Defina cómo se realizará el pago de la póliza
					</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{tipoPago === "contado" ? "Pago al contado" : `${cuotaInicial > 0 ? cuotas.length + 1 : cuotas.length} cuotas`}
						</span>
					</div>
				)}
			</div>

			{/* Warning about blocked modality change */}
			{bloquearCambioModalidad && (
				<div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
					<Lock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
					<p className="text-sm text-yellow-800">
						No se puede cambiar la modalidad de pago porque hay cuotas ya pagados.
						Solo puede editar las cuotas pendientes.
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
						<div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
							<p className="text-sm text-green-800">
								Esta cuota ya está <strong>pagado</strong>. Los datos no pueden ser modificados.
							</p>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Cuota Única */}
						<div className="space-y-2">
							<Label htmlFor="cuota_unica">
								Cuota Única <span className="text-red-500">*</span>
								{cuotaUnicaPagada && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Pagada</Badge>}
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
								className={errores.cuota_unica ? "border-red-500" : ""}
								disabled={cuotaUnicaPagada}
							/>
							{errores.cuota_unica && (
								<p className="text-sm text-red-600">{errores.cuota_unica}</p>
							)}
						</div>

						{/* Fecha de Pago */}
						<div className="space-y-2">
							<Label htmlFor="fecha_pago_unico">
								Fecha de Pago <span className="text-red-500">*</span>
							</Label>
							<Input
								id="fecha_pago_unico"
								type="date"
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
								className={errores.fecha_pago_unico || advertencias.fecha_pago_unico ? "border-red-500" : ""}
								disabled={cuotaUnicaPagada}
							/>
							{errores.fecha_pago_unico && (
								<p className="text-sm text-red-600">{errores.fecha_pago_unico}</p>
							)}
							{advertencias.fecha_pago_unico && (
								<p className="text-sm text-yellow-600">{advertencias.fecha_pago_unico}</p>
							)}
						</div>

						{/* Moneda */}
						<div className="space-y-2">
							<Label htmlFor="moneda">
								Moneda <span className="text-red-500">*</span>
							</Label>
							<Select value={moneda} onValueChange={(value) => setMoneda(value as Moneda)}>
								<SelectTrigger className={errores.moneda ? "border-red-500" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Bs">Bolivianos (Bs)</SelectItem>
									<SelectItem value="USD">Dólares (USD)</SelectItem>
									<SelectItem value="USDT">Tether (USDT)</SelectItem>
									<SelectItem value="UFV">UFV</SelectItem>
								</SelectContent>
							</Select>
							{errores.moneda && (
								<p className="text-sm text-red-600">{errores.moneda}</p>
							)}
						</div>
					</div>

					{/* Cálculos */}
					{cuotaUnica > 0 && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<h4 className="text-sm font-semibold text-blue-900 mb-3">
								Cálculos Automáticos
								{producto && (
									<span className="text-xs font-normal text-blue-600 ml-2">
										(Producto: {producto.nombre_producto})
									</span>
								)}
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
								<div>
									<p className="text-blue-700 font-medium">Prima Total</p>
									<p className="text-blue-900 text-lg font-bold">
										{cuotaUnica.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">
										Prima Neta
										{calculos && (
											<span className="text-xs font-normal text-blue-500 ml-1">
												(Factor: {calculos.factor_usado}%)
											</span>
										)}
									</p>
									<p className="text-blue-900 text-lg font-bold">
										{prima_neta.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">
										Comisión Empresa
										{calculos && (
											<span className="text-xs font-normal text-blue-500 ml-1">
												({(calculos.porcentaje_comision * 100).toFixed(1)}%)
											</span>
										)}
									</p>
									<p className="text-blue-900 text-lg font-bold">
										{comision.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
							</div>
							{!producto && (
								<p className="text-xs text-yellow-600 mt-2">
									⚠️ Cálculos usando fórmula legacy (87% / 2%). Seleccione un producto para cálculos dinámicos.
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
								Prima Total <span className="text-red-500">*</span>
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
								className={errores.prima_total ? "border-red-500" : ""}
							/>
							{errores.prima_total && (
								<p className="text-sm text-red-600">{errores.prima_total}</p>
							)}
						</div>

						{/* Moneda */}
						<div className="space-y-2">
							<Label htmlFor="moneda_credito">
								Moneda <span className="text-red-500">*</span>
							</Label>
							<Select value={moneda} onValueChange={(value) => setMoneda(value as Moneda)}>
								<SelectTrigger className={errores.moneda ? "border-red-500" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Bs">Bolivianos (Bs)</SelectItem>
									<SelectItem value="USD">Dólares (USD)</SelectItem>
									<SelectItem value="USDT">Tether (USDT)</SelectItem>
									<SelectItem value="UFV">UFV</SelectItem>
								</SelectContent>
							</Select>
							{errores.moneda && (
								<p className="text-sm text-red-600">{errores.moneda}</p>
							)}
						</div>

						{/* Cuota Inicial */}
						<div className="space-y-2">
							<Label htmlFor="cuota_inicial">
								Cuota Inicial
								{bloquearCambioModalidad && <Lock className="inline h-3 w-3 ml-1 text-gray-400" />}
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
								className={errores.cuota_inicial ? "border-red-500" : ""}
								disabled={bloquearCambioModalidad}
							/>
							{errores.cuota_inicial && (
								<p className="text-sm text-red-600">{errores.cuota_inicial}</p>
							)}
							<p className="text-xs text-gray-500">
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
								Fecha Inicio Cuotas <span className="text-red-500">*</span>
								{bloquearCambioModalidad && <Lock className="inline h-3 w-3 ml-1 text-gray-400" />}
							</Label>
							<Input
								id="fecha_inicio_cuotas"
								type="date"
								value={fechaInicioCuotas}
								onChange={(e) => {
									setFechaInicioCuotas(e.target.value);
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { fecha_inicio_cuotas: _removed, ...rest } = errores;
									setErrores(rest);
									setCuotasGeneradas(false);
								}}
								className={errores.fecha_inicio_cuotas ? "border-red-500" : ""}
								disabled={bloquearCambioModalidad}
							/>
							{errores.fecha_inicio_cuotas && (
								<p className="text-sm text-red-600">{errores.fecha_inicio_cuotas}</p>
							)}
						</div>

						{/* Periodo de Pago */}
						<div className="space-y-2">
							<Label htmlFor="periodo_pago">
								Periodo de Pago <span className="text-red-500">*</span>
								{bloquearCambioModalidad && <Lock className="inline h-3 w-3 ml-1 text-gray-400" />}
							</Label>
							<Select
								value={periodoPago}
								onValueChange={(value) => {
									setPeriodoPago(value as PeriodoPago);
									setCuotasGeneradas(false);
								}}
								disabled={bloquearCambioModalidad}
							>
								<SelectTrigger className={errores.periodo_pago ? "border-red-500" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="mensual">Mensual</SelectItem>
									<SelectItem value="trimestral">Trimestral</SelectItem>
									<SelectItem value="semestral">Semestral</SelectItem>
								</SelectContent>
							</Select>
							{errores.periodo_pago && (
								<p className="text-sm text-red-600">{errores.periodo_pago}</p>
							)}
						</div>

						{/* Cantidad de Cuotas con Slider */}
						<div className="space-y-2">
							<Label htmlFor="cantidad_cuotas">
								Cantidad de Cuotas: <span className="font-bold text-blue-600">{cantidadCuotas}</span>
								{cuotaInicial > 0 && (
									<span className="text-xs text-gray-500 ml-2">(#1 inicial + #{2}-{cantidadCuotas} regulares)</span>
								)}
								{bloquearCambioModalidad && <Lock className="inline h-3 w-3 ml-1 text-gray-400" />}
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
								<div className="flex justify-between text-xs text-gray-500 mt-1">
									<span>2 cuotas</span>
									<span>12 cuotas</span>
								</div>
							</div>
							{errores.cantidad_cuotas && (
								<p className="text-sm text-red-600">{errores.cantidad_cuotas}</p>
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
							<p className="text-xs text-yellow-600 flex items-center gap-1">
								<Lock className="h-3 w-3" />
								No se pueden regenerar las cuotas porque hay pagos registrados
							</p>
						)}
					</div>

					{/* Cálculos */}
					{primaTotal > 0 && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<h4 className="text-sm font-semibold text-blue-900 mb-3">
								Cálculos Automáticos
								{producto && (
									<span className="text-xs font-normal text-blue-600 ml-2">
										(Producto: {producto.nombre_producto})
									</span>
								)}
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
								<div>
									<p className="text-blue-700 font-medium">Prima Total</p>
									<p className="text-blue-900 text-lg font-bold">
										{primaTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">
										Prima Neta
										{calculos && (
											<span className="text-xs font-normal text-blue-500 ml-1">
												(Factor: {calculos.factor_usado}%)
											</span>
										)}
									</p>
									<p className="text-blue-900 text-lg font-bold">
										{prima_neta.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">
										Comisión Empresa
										{calculos && (
											<span className="text-xs font-normal text-blue-500 ml-1">
												({(calculos.porcentaje_comision * 100).toFixed(1)}%)
											</span>
										)}
									</p>
									<p className="text-blue-900 text-lg font-bold">
										{comision.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">Resto a Pagar</p>
									<p className="text-blue-900 text-lg font-bold">
										{(primaTotal - cuotaInicial).toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
							</div>
							{!producto && (
								<p className="text-xs text-yellow-600 mt-2">
									⚠️ Cálculos usando fórmula legacy (87% / 2%). Seleccione un producto para cálculos dinámicos.
								</p>
							)}
						</div>
					)}

					{/* Tabla de Cuotas */}
					{cuotas.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-semibold text-gray-900">
									Plan de Cuotas
								</h4>
								<span className="text-xs text-gray-600">
									{cuotaInicial > 0
										? `Cuota #1 (inicial) + Cuotas #2-${cuotas.length + 1} = ${cuotas.length + 1} total`
										: `${cuotas.length} cuota${cuotas.length !== 1 ? "s" : ""}`}
								</span>
							</div>

							{/* Mostrar advertencia si hay errores */}
							{(Object.keys(errores).some((key) => key.startsWith("cuota_")) ||
							  Object.keys(advertencias).some((key) => key.startsWith("cuota_"))) && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
									<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
									<div className="text-sm text-red-800">
										<p className="font-medium mb-1">Corrija los errores en las cuotas</p>
										<p>Revise las fechas y montos marcados en rojo.</p>
									</div>
								</div>
							)}

							<div className="border rounded-lg overflow-hidden">
								<div className="overflow-x-auto max-h-96 overflow-y-auto">
									<table className="w-full">
										<thead className="bg-gray-50 sticky top-0">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
													# Cuota
													{mode === "edit" && <span className="text-gray-400 ml-1">(solo pendientes)</span>}
												</th>
												<th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
													Monto
													{mode === "edit" && <span className="text-gray-400 ml-1">(solo pendientes)</span>}
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
													Fecha Vencimiento <span className="text-red-500">*</span>
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
													Estado
												</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{/* Mostrar cuota inicial si existe */}
											{cuotaInicial > 0 && (
												<tr className={cuotaInicialPagada ? "bg-green-50" : "bg-blue-50"}>
													<td className="px-4 py-3">
														<span className={`font-medium ${cuotaInicialPagada ? "text-green-700" : "text-blue-700"}`}>
															1 (Inicial)
														</span>
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center justify-end gap-2">
															<span className={`font-semibold ${cuotaInicialPagada ? "text-green-900" : "text-blue-900"}`}>
																{cuotaInicial.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
															</span>
															<span className="text-sm text-gray-600 font-medium">{moneda}</span>
														</div>
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center gap-2">
															<Calendar className={`h-4 w-4 ${cuotaInicialPagada ? "text-green-400" : "text-blue-400"}`} />
															<span className={`text-sm ${cuotaInicialPagada ? "text-green-700" : "text-blue-700"}`}>
																{fechaInicioCuotas ? new Date(fechaInicioCuotas + 'T00:00:00').toLocaleDateString("es-BO") : "-"}
															</span>
														</div>
													</td>
													<td className="px-4 py-3">
														{cuotaInicialPagada ? (
															<Badge className="bg-green-100 text-green-800 border-green-200">
																<Lock className="h-3 w-3 mr-1" />
																Pagada
															</Badge>
														) : (
															<Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
																Pendiente
															</Badge>
														)}
													</td>
												</tr>
											)}
											{cuotas.map((cuota, index) => {
												const estaPagada = cuota.estado === "pagado";
												return (
													<tr key={index} className={estaPagada ? "bg-green-50" : "hover:bg-gray-50"}>
														<td className="px-4 py-3">
															{estaPagada ? (
																<span className="font-medium text-green-700">
																	{cuota.numero}
																</span>
															) : (
																<Input
																	type="number"
																	min="1"
																	value={cuota.numero}
																	onChange={(e) => handleChangeNumeroCuota(index, parseInt(e.target.value) || 1)}
																	className="max-w-[80px]"
																/>
															)}
														</td>
														<td className="px-4 py-3">
															<div className="flex items-center justify-end gap-2">
																{estaPagada ? (
																	<span className="font-semibold text-green-900">
																		{cuota.monto.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
																	</span>
																) : (
																	<Input
																		type="number"
																		min="0"
																		step="0.01"
																		value={cuota.monto || ""}
																		onChange={(e) => handleChangeMontoCuota(index, parseFloat(e.target.value) || 0)}
																		className="max-w-[140px] text-right"
																	/>
																)}
																<span className="text-sm text-gray-600 font-medium">{moneda}</span>
															</div>
														</td>
														<td className="px-4 py-3">
															<div className="flex items-center gap-2">
																<Calendar className={`h-4 w-4 ${estaPagada ? "text-green-400" : "text-gray-400"}`} />
																{estaPagada ? (
																	<span className="text-sm text-green-700">
																		{cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento + 'T00:00:00').toLocaleDateString("es-BO") : "-"}
																	</span>
																) : (
																	<Input
																		type="date"
																		value={cuota.fecha_vencimiento}
																		onChange={(e) => handleChangeFechaCuota(index, e.target.value)}
																		className={`max-w-[180px] ${
																			errores[`cuota_${index}_fecha`] || advertencias[`cuota_${index}_fecha`] ? "border-red-500" : ""
																		}`}
																	/>
																)}
															</div>
															{!estaPagada && errores[`cuota_${index}_fecha`] && (
																<p className="text-xs text-red-600 mt-1">{errores[`cuota_${index}_fecha`]}</p>
															)}
															{!estaPagada && advertencias[`cuota_${index}_fecha`] && (
																<p className="text-xs text-red-600 mt-1">{advertencias[`cuota_${index}_fecha`]}</p>
															)}
														</td>
														<td className="px-4 py-3">
															{estaPagada ? (
																<Badge className="bg-green-100 text-green-800 border-green-200">
																	<Lock className="h-3 w-3 mr-1" />
																	Pagada
																</Badge>
															) : (
																<Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
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
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
									<AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
									<p className="text-sm text-yellow-800">{advertencias.cuotas}</p>
								</div>
							)}
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Errores generales */}
			{Object.keys(errores).filter((key) => !key.startsWith("cuota_")).length > 0 && (
				<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<h4 className="text-sm font-semibold text-red-800 mb-2">Errores:</h4>
					<ul className="text-sm text-red-700 space-y-1">
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
				<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<h4 className="text-sm font-semibold text-yellow-800 mb-2">Advertencias:</h4>
					<ul className="text-sm text-yellow-700 space-y-1">
						{Object.entries(advertencias)
							.filter(([key]) => !key.startsWith("cuota_"))
							.map(([campo, mensaje]) => (
								<li key={campo}>• {mensaje}</li>
							))}
					</ul>
				</div>
			)}

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<div className="flex items-center gap-3">
					{/* Feedback visual de actualización exitosa */}
					{datosActualizados && (
						<span className="flex items-center gap-1 text-green-600 text-sm font-medium animate-in fade-in duration-300">
							<Check className="h-4 w-4" />
							Datos actualizados
						</span>
					)}

					<Button
						onClick={handleContinuar}
						disabled={!tieneDatos}
						className={datosActualizados ? "bg-green-600 hover:bg-green-700" : ""}
					>
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
