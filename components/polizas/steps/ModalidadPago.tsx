"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, DollarSign, CreditCard, Calendar, AlertCircle, Sparkles } from "lucide-react";
import type { ModalidadPago as ModalidadPagoType, Moneda, CuotaCredito, PeriodoPago } from "@/types/poliza";
import { validarModalidadPago, calcularPrimaNetaYComision, validarFechasDentroVigencia } from "@/utils/polizaValidation";
import { POLIZA_RULES } from "@/utils/validationConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

type Props = {
	datos: ModalidadPagoType | null;
	inicioVigencia?: string;
	finVigencia?: string;
	onChange: (datos: ModalidadPagoType) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function ModalidadPago({ datos, inicioVigencia, finVigencia, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPago, setTipoPago] = useState<"contado" | "credito">(datos?.tipo || "contado");

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

	// Calcular prima neta y comisión
	const montoPago = tipoPago === "contado" ? cuotaUnica : primaTotal;
	const { prima_neta, comision } = calcularPrimaNetaYComision(montoPago);

	// Sincronizar prima_total con cuota_unica en modo contado
	useEffect(() => {
		if (tipoPago === "contado") {
			setPrimaTotal(cuotaUnica);
		}
	}, [cuotaUnica, tipoPago]);

	const handleChangeTipoPago = (tipo: string) => {
		setTipoPago(tipo as "contado" | "credito");
		setErrores({});
		setAdvertencias({});
		setCuotasGeneradas(false);
	};

	const calcularFechasCuotas = (): string[] => {
		if (!fechaInicioCuotas) return [];

		const fechas: string[] = [];
		const fechaBase = new Date(fechaInicioCuotas);

		// Calcular el incremento en meses según el periodo
		const incrementoMeses = periodoPago === "mensual" ? 1 : periodoPago === "trimestral" ? 3 : 6;

		for (let i = 0; i < cantidadCuotas; i++) {
			const fecha = new Date(fechaBase);
			fecha.setMonth(fecha.getMonth() + (i * incrementoMeses));
			fechas.push(fecha.toISOString().split('T')[0]);
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

		// Calcular monto de cada cuota
		const restoAPagar = primaTotal - cuotaInicial;
		const montoPorCuota = restoAPagar / cantidadCuotas;

		// Calcular fechas
		const fechasCuotas = calcularFechasCuotas();

		// Generar cuotas con numeración secuencial por defecto
		const nuevasCuotas: CuotaCredito[] = fechasCuotas.map((fecha, index) => ({
			numero: index + 1,
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
		let datosPago: ModalidadPagoType;

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
			datosPago = {
				tipo: "credito",
				prima_total: primaTotal,
				moneda,
				cantidad_cuotas: cantidadCuotas,
				cuota_inicial: cuotaInicial,
				fecha_inicio_cuotas: fechaInicioCuotas,
				periodo_pago: periodoPago,
				cuotas,
				prima_neta,
				comision,
			};
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
		onSiguiente();
	};

	const tieneDatos = tipoPago === "contado"
		? cuotaUnica > 0 && fechaPagoUnico
		: primaTotal > 0 && cuotasGeneradas && cuotas.length > 0;

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
							{tipoPago === "contado" ? "Pago al contado" : `${cantidadCuotas} cuotas`}
						</span>
					</div>
				)}
			</div>

			<Tabs value={tipoPago} onValueChange={handleChangeTipoPago} className="mb-6">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="contado" className="flex items-center gap-2">
						<DollarSign className="h-4 w-4" />
						Contado
					</TabsTrigger>
					<TabsTrigger value="credito" className="flex items-center gap-2">
						<CreditCard className="h-4 w-4" />
						Crédito
					</TabsTrigger>
				</TabsList>

				{/* PAGO AL CONTADO */}
				<TabsContent value="contado" className="space-y-6 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Cuota Única */}
						<div className="space-y-2">
							<Label htmlFor="cuota_unica">
								Cuota Única <span className="text-red-500">*</span>
							</Label>
							<Input
								id="cuota_unica"
								type="number"
								min="0"
								step="0.01"
								value={cuotaUnica || ""}
								onChange={(e) => {
									const valor = parseFloat(e.target.value) || 0;
									setCuotaUnica(valor);
									const { cuota_unica, ...rest } = errores;
									setErrores(rest);
								}}
								placeholder="5000.00"
								className={errores.cuota_unica ? "border-red-500" : ""}
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
									setFechaPagoUnico(e.target.value);
									const { fecha_pago_unico, ...restErrores } = errores;
									const { fecha_pago_unico: _adv, ...restAdv } = advertencias;
									setErrores(restErrores);
									setAdvertencias(restAdv);
								}}
								className={errores.fecha_pago_unico || advertencias.fecha_pago_unico ? "border-red-500" : ""}
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
							<h4 className="text-sm font-semibold text-blue-900 mb-3">Cálculos Automáticos</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
								<div>
									<p className="text-blue-700 font-medium">Prima Total</p>
									<p className="text-blue-900 text-lg font-bold">
										{cuotaUnica.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">Prima Neta (87%)</p>
									<p className="text-blue-900 text-lg font-bold">
										{prima_neta.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">Comisión (2%)</p>
									<p className="text-blue-900 text-lg font-bold">
										{comision.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
							</div>
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
									const { prima_total, ...rest } = errores;
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
									const { cuota_inicial, ...rest } = errores;
									setErrores(rest);
									setCuotasGeneradas(false);
								}}
								placeholder="0.00 (opcional)"
								className={errores.cuota_inicial ? "border-red-500" : ""}
							/>
							{errores.cuota_inicial && (
								<p className="text-sm text-red-600">{errores.cuota_inicial}</p>
							)}
							<p className="text-xs text-gray-500">Si no hay cuota inicial, ingrese 0 o deje vacío</p>
						</div>

						{/* Fecha Inicio Cuotas */}
						<div className="space-y-2">
							<Label htmlFor="fecha_inicio_cuotas">
								Fecha Inicio Cuotas <span className="text-red-500">*</span>
							</Label>
							<Input
								id="fecha_inicio_cuotas"
								type="date"
								value={fechaInicioCuotas}
								onChange={(e) => {
									setFechaInicioCuotas(e.target.value);
									const { fecha_inicio_cuotas, ...rest } = errores;
									setErrores(rest);
									setCuotasGeneradas(false);
								}}
								className={errores.fecha_inicio_cuotas ? "border-red-500" : ""}
							/>
							{errores.fecha_inicio_cuotas && (
								<p className="text-sm text-red-600">{errores.fecha_inicio_cuotas}</p>
							)}
						</div>

						{/* Periodo de Pago */}
						<div className="space-y-2">
							<Label htmlFor="periodo_pago">
								Periodo de Pago <span className="text-red-500">*</span>
							</Label>
							<Select
								value={periodoPago}
								onValueChange={(value) => {
									setPeriodoPago(value as PeriodoPago);
									setCuotasGeneradas(false);
								}}
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
							</Label>
							<div className="pt-2">
								<Slider
									id="cantidad_cuotas"
									min={POLIZA_RULES.CUOTAS_MIN}
									max={POLIZA_RULES.CUOTAS_MAX}
									step={1}
									value={[cantidadCuotas]}
									onValueChange={(value) => {
										setCantidadCuotas(value[0]);
										setCuotasGeneradas(false);
									}}
									className="w-full"
								/>
								<div className="flex justify-between text-xs text-gray-500 mt-1">
									<span>1 cuota</span>
									<span>12 cuotas</span>
								</div>
							</div>
							{errores.cantidad_cuotas && (
								<p className="text-sm text-red-600">{errores.cantidad_cuotas}</p>
							)}
						</div>
					</div>

					{/* Botón Generar Cuotas */}
					<div className="flex justify-center">
						<Button
							onClick={handleGenerarCuotas}
							disabled={!primaTotal || primaTotal <= 0 || !fechaInicioCuotas}
							className="w-full md:w-auto"
							size="lg"
						>
							<Sparkles className="mr-2 h-5 w-5" />
							Generar Cuotas
						</Button>
					</div>

					{/* Cálculos */}
					{primaTotal > 0 && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<h4 className="text-sm font-semibold text-blue-900 mb-3">Cálculos Automáticos</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
								<div>
									<p className="text-blue-700 font-medium">Prima Neta (87%)</p>
									<p className="text-blue-900 text-lg font-bold">
										{prima_neta.toLocaleString("es-BO", { minimumFractionDigits: 2 })} {moneda}
									</p>
								</div>
								<div>
									<p className="text-blue-700 font-medium">Comisión (2%)</p>
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
									{cuotas.length} cuota{cuotas.length !== 1 ? "s" : ""}
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
													# Cuota <span className="text-green-500">(editable)</span>
												</th>
												<th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
													Monto <span className="text-blue-500">(editable)</span>
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
													Fecha Vencimiento <span className="text-red-500">*</span>
												</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{cuotas.map((cuota, index) => (
												<tr key={index} className={index === 0 && cuotaInicial > 0 ? "bg-blue-50" : "hover:bg-gray-50"}>
													<td className="px-4 py-3">
														<Input
															type="number"
															min="1"
															value={cuota.numero}
															onChange={(e) => handleChangeNumeroCuota(index, parseInt(e.target.value) || 1)}
															className="max-w-[80px]"
														/>
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center justify-end gap-2">
															<Input
																type="number"
																min="0"
																step="0.01"
																value={cuota.monto || ""}
																onChange={(e) => handleChangeMontoCuota(index, parseFloat(e.target.value) || 0)}
																className="max-w-[140px] text-right"
															/>
															<span className="text-sm text-gray-600 font-medium">{moneda}</span>
														</div>
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center gap-2">
															<Calendar className="h-4 w-4 text-gray-400" />
															<Input
																type="date"
																value={cuota.fecha_vencimiento}
																onChange={(e) => handleChangeFechaCuota(index, e.target.value)}
																className={`max-w-[180px] ${
																	errores[`cuota_${index}_fecha`] || advertencias[`cuota_${index}_fecha`] ? "border-red-500" : ""
																}`}
															/>
														</div>
														{errores[`cuota_${index}_fecha`] && (
															<p className="text-xs text-red-600 mt-1">{errores[`cuota_${index}_fecha`]}</p>
														)}
														{advertencias[`cuota_${index}_fecha`] && (
															<p className="text-xs text-red-600 mt-1">{advertencias[`cuota_${index}_fecha`]}</p>
														)}
													</td>
												</tr>
											))}
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

				<Button onClick={handleContinuar} disabled={!tieneDatos}>
					Continuar con Documentos
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
