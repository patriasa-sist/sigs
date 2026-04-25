"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import {
	ChevronRight, ChevronLeft, Upload, FileText, X, AlertCircle, Loader2, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { generateTempStoragePath } from "@/utils/fileUpload";
import type {
	CuotaAjuste,
	CuotaOriginalInfo,
	CuotaPropia,
	PlanPagoInclusion,
	VigenciaCorrida,
	TipoAnexo,
} from "@/types/anexo";
import type { DocumentoPoliza, Moneda } from "@/types/poliza";
import { formatCurrency, formatDate } from "@/utils/formatters";

const BUCKET = "polizas-documentos";

type Props = {
	tipoAnexo: TipoAnexo;
	cuotasOriginales: CuotaOriginalInfo[];
	planPagoInclusion: PlanPagoInclusion | null;
	cuotasAjuste: CuotaAjuste[];
	vigenciaCorrida: VigenciaCorrida | null;
	documentos: DocumentoPoliza[];
	moneda: Moneda;
	userId: string | null;
	onChangePlanPagoInclusion: (plan: PlanPagoInclusion | null) => void;
	onChangeCuotas: (cuotas: CuotaAjuste[]) => void;
	onChangeVigenciaCorrida: (vc: VigenciaCorrida | null) => void;
	onChangeDocumentos: (docs: DocumentoPoliza[] | ((prev: DocumentoPoliza[]) => DocumentoPoliza[])) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fechaDefault(offsetMeses: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() + offsetMeses);
	return d.toISOString().split("T")[0];
}

function computarCuotas(
	modalidad: "contado" | "credito",
	primaTotal: number,
	cuotaInicial: number,
	cantidadCuotas: number
): CuotaPropia[] {
	if (modalidad === "contado") {
		return [{ numero_cuota: 1, monto: primaTotal, fecha_vencimiento: fechaDefault(0) }];
	}

	if (cantidadCuotas <= 0) return [];

	const hasInitial = cuotaInicial > 0;
	const regularCount = hasInitial ? cantidadCuotas - 1 : cantidadCuotas;
	const remaining = Math.max(0, primaTotal - (hasInitial ? cuotaInicial : 0));
	const montoRegular = regularCount > 0 ? Math.round((remaining / regularCount) * 100) / 100 : 0;

	const cuotas: CuotaPropia[] = [];
	for (let i = 0; i < cantidadCuotas; i++) {
		const esInicial = hasInitial && i === 0;
		let monto = esInicial ? cuotaInicial : montoRegular;

		// Última cuota regular absorbe el redondeo
		if (!esInicial && i === cantidadCuotas - 1 && regularCount > 0) {
			const sumaPrev = cuotas.reduce((s, c) => s + c.monto, 0);
			monto = Math.round((primaTotal - sumaPrev) * 100) / 100;
		}

		cuotas.push({
			numero_cuota: i + 1,
			monto,
			fecha_vencimiento: fechaDefault(i),
		});
	}

	return cuotas;
}

// ── Sección inclusión ─────────────────────────────────────────────────────────

function SeccionPlanInclusion({
	plan,
	moneda,
	onChange,
}: {
	plan: PlanPagoInclusion;
	moneda: Moneda;
	onChange: (p: PlanPagoInclusion) => void;
}) {
	const recalcular = (
		modalidad: "contado" | "credito",
		primaTotal: number,
		cuotaInicial: number,
		cantidadCuotas: number
	) => {
		const cuotas = computarCuotas(modalidad, primaTotal, cuotaInicial, cantidadCuotas);
		onChange({ modalidad, prima_total: primaTotal, cuota_inicial: cuotaInicial, cantidad_cuotas: cantidadCuotas, cuotas });
	};

	const handleModalidad = (m: "contado" | "credito") => {
		const cant = m === "contado" ? 1 : plan.cantidad_cuotas > 1 ? plan.cantidad_cuotas : 3;
		recalcular(m, plan.prima_total, m === "contado" ? 0 : plan.cuota_inicial, cant);
	};

	const handlePrimaTotal = (v: string) => {
		recalcular(plan.modalidad, parseFloat(v) || 0, plan.cuota_inicial, plan.cantidad_cuotas);
	};

	const handleCuotaInicial = (v: string) => {
		recalcular(plan.modalidad, plan.prima_total, parseFloat(v) || 0, plan.cantidad_cuotas);
	};

	const handleCantidadCuotas = (v: string) => {
		const n = Math.max(1, parseInt(v) || 1);
		recalcular(plan.modalidad, plan.prima_total, plan.cuota_inicial, n);
	};

	const handleCuotaMonto = (idx: number, v: string) => {
		const updated = plan.cuotas.map((c, i) =>
			i === idx ? { ...c, monto: parseFloat(v) || 0 } : c
		);
		onChange({ ...plan, cuotas: updated });
	};

	const handleCuotaFecha = (idx: number, v: string) => {
		const updated = plan.cuotas.map((c, i) =>
			i === idx ? { ...c, fecha_vencimiento: v } : c
		);
		onChange({ ...plan, cuotas: updated });
	};

	const totalCuotas = plan.cuotas.reduce((s, c) => s + c.monto, 0);
	const diferencia = Math.abs(totalCuotas - plan.prima_total);

	return (
		<div className="space-y-5">
			{/* Modalidad */}
			<div>
				<Label className="mb-2 block">Modalidad de Pago</Label>
				<div className="flex gap-2">
					{(["contado", "credito"] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => handleModalidad(m)}
							className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
								plan.modalidad === m
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
							}`}
						>
							{m === "contado" ? "Contado" : "Crédito"}
						</button>
					))}
				</div>
			</div>

			{/* Prima total */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<Label htmlFor="inc_prima">Prima Total del Anexo ({moneda})</Label>
					<Input
						id="inc_prima"
						type="number"
						step="0.01"
						min="0"
						value={plan.prima_total || ""}
						onChange={(e) => handlePrimaTotal(e.target.value)}
						placeholder="0.00"
					/>
				</div>

				{plan.modalidad === "credito" && (
					<>
						<div>
							<Label htmlFor="inc_inicial">Cuota Inicial ({moneda})</Label>
							<Input
								id="inc_inicial"
								type="number"
								step="0.01"
								min="0"
								value={plan.cuota_inicial || ""}
								onChange={(e) => handleCuotaInicial(e.target.value)}
								placeholder="0.00 (opcional)"
							/>
						</div>
						<div>
							<Label htmlFor="inc_cant">Cantidad de Cuotas</Label>
							<Input
								id="inc_cant"
								type="number"
								min="1"
								value={plan.cantidad_cuotas}
								onChange={(e) => handleCantidadCuotas(e.target.value)}
							/>
						</div>
					</>
				)}
			</div>

			{/* Tabla de cuotas */}
			{plan.cuotas.length > 0 && (
				<div>
					<p className="text-xs text-gray-500 mb-2">
						Edite montos y fechas individualmente si es necesario.
					</p>
					<div className="border rounded-lg overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="text-left px-4 py-2">#</th>
									<th className="text-left px-4 py-2">Fecha de Vencimiento</th>
									<th className="text-right px-4 py-2">Monto ({moneda})</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{plan.cuotas.map((cuota, idx) => (
									<tr key={idx}>
										<td className="px-4 py-2 text-gray-500">{cuota.numero_cuota}</td>
										<td className="px-4 py-2">
											<Input
												type="date"
												value={cuota.fecha_vencimiento}
												onChange={(e) => handleCuotaFecha(idx, e.target.value)}
												className="w-40"
											/>
										</td>
										<td className="px-4 py-2 text-right">
											<Input
												type="number"
												step="0.01"
												min="0"
												value={cuota.monto || ""}
												onChange={(e) => handleCuotaMonto(idx, e.target.value)}
												className="w-32 text-right ml-auto"
												placeholder="0.00"
											/>
										</td>
									</tr>
								))}
							</tbody>
							<tfoot className="bg-gray-50 border-t">
								<tr>
									<td colSpan={2} className="px-4 py-2 text-sm font-medium text-right text-gray-600">
										Total cuotas:
									</td>
									<td className={`px-4 py-2 text-right font-bold ${diferencia > 0.01 ? "text-red-600" : "text-green-600"}`}>
										{formatCurrency(totalCuotas, moneda)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
					{diferencia > 0.01 && (
						<p className="text-xs text-red-600 mt-1 flex items-center gap-1">
							<AlertCircle className="h-3 w-3" />
							La suma de cuotas ({formatCurrency(totalCuotas, moneda)}) difiere de la prima total (
							{formatCurrency(plan.prima_total, moneda)}).
						</p>
					)}
				</div>
			)}
		</div>
	);
}

// ── Sección exclusión ─────────────────────────────────────────────────────────

function SeccionAjusteExclusion({
	cuotasAjuste,
	moneda,
	onChangeDelta,
	onChangeFecha,
}: {
	cuotasAjuste: CuotaAjuste[];
	moneda: Moneda;
	onChangeDelta: (idx: number, v: string) => void;
	onChangeFecha: (idx: number, v: string) => void;
}) {
	const totalDelta = cuotasAjuste.reduce((s, c) => s + c.monto_delta, 0);

	return (
		<div className="space-y-3">
			<p className="text-xs text-gray-500">
				Ingrese el descuento <strong>negativo</strong> que corresponde a cada cuota afectada por la
				exclusión. Puede aplicarse a cualquier cuota, incluso las ya pagadas.
			</p>

			<div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2 text-xs text-amber-700">
				<Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
				Las cuotas ya pagadas se muestran con badge verde — el descuento se registra igualmente
				para mantener los reportes de producción correctos.
			</div>

			<div className="border rounded-lg overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="text-left px-4 py-2">#</th>
							<th className="text-left px-4 py-2">Vencimiento</th>
							<th className="text-right px-4 py-2">Monto Original</th>
							<th className="text-right px-4 py-2">Descuento (negativo)</th>
							<th className="text-right px-4 py-2">Monto Ajustado</th>
							<th className="text-center px-4 py-2">Estado</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{cuotasAjuste.map((cuota, idx) => (
							<tr key={cuota.cuota_original_id}>
								<td className="px-4 py-2">{cuota.numero_cuota}</td>
								<td className="px-4 py-2">
									<Input
										type="date"
										value={cuota.fecha_vencimiento}
										onChange={(e) => onChangeFecha(idx, e.target.value)}
										className="w-36"
									/>
								</td>
								<td className="px-4 py-2 text-right">
									{formatCurrency(cuota.monto_original, moneda)}
								</td>
								<td className="px-4 py-2 text-right">
									<Input
										type="number"
										step="0.01"
										value={cuota.monto_delta || ""}
										onChange={(e) => onChangeDelta(idx, e.target.value)}
										className="w-32 text-right ml-auto"
										placeholder="0.00"
									/>
								</td>
								<td className="px-4 py-2 text-right font-medium">
									{formatCurrency(cuota.monto_original + cuota.monto_delta, moneda)}
								</td>
								<td className="px-4 py-2 text-center">
									<Badge
										variant="outline"
										className={
											cuota.estado_original === "pagado"
												? "bg-green-100 text-green-700"
												: "bg-yellow-100 text-yellow-700"
										}
									>
										{cuota.estado_original}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{cuotasAjuste.some((c) => c.monto_delta !== 0) && (
				<div className="text-right">
					<span className="text-sm font-medium">
						Descuento total:{" "}
						<span className={totalDelta <= 0 ? "text-red-600" : "text-green-600"}>
							{totalDelta >= 0 ? "+" : ""}
							{formatCurrency(totalDelta, moneda)}
						</span>
					</span>
				</div>
			)}
		</div>
	);
}

// ── Componente principal ──────────────────────────────────────────────────────

export function PagosYDocumentos({
	tipoAnexo,
	cuotasOriginales,
	planPagoInclusion,
	cuotasAjuste,
	vigenciaCorrida,
	documentos,
	moneda,
	userId,
	onChangePlanPagoInclusion,
	onChangeCuotas,
	onChangeVigenciaCorrida,
	onChangeDocumentos,
	onSiguiente,
	onAnterior,
}: Props) {
	const [errores, setErrores] = useState<string[]>([]);
	const sessionIdRef = useRef(crypto.randomUUID());
	const supabase = useMemo(() => createClient(), []);

	// Inicializar plan de inclusión
	useEffect(() => {
		if (tipoAnexo === "inclusion" && !planPagoInclusion) {
			onChangePlanPagoInclusion({
				modalidad: "contado",
				prima_total: 0,
				cuota_inicial: 0,
				cantidad_cuotas: 1,
				cuotas: [{ numero_cuota: 1, monto: 0, fecha_vencimiento: fechaDefault(0) }],
			});
		}
	}, [tipoAnexo, planPagoInclusion, onChangePlanPagoInclusion]);

	// Inicializar cuotas ajuste para exclusión
	useEffect(() => {
		if (tipoAnexo === "exclusion" && cuotasAjuste.length === 0 && cuotasOriginales.length > 0) {
			const iniciales: CuotaAjuste[] = cuotasOriginales.map((c) => ({
				cuota_original_id: c.id,
				numero_cuota: c.numero_cuota,
				monto_original: c.monto,
				monto_delta: 0,
				fecha_vencimiento: c.fecha_vencimiento,
				estado_original: c.estado,
			}));
			onChangeCuotas(iniciales);
		}
	}, [tipoAnexo, cuotasAjuste.length, cuotasOriginales, onChangeCuotas]);

	// Inicializar vigencia corrida para anulación
	useEffect(() => {
		if (tipoAnexo === "anulacion" && !vigenciaCorrida) {
			onChangeVigenciaCorrida({
				monto: 0,
				fecha_vencimiento: new Date().toISOString().split("T")[0],
				observaciones: "",
			});
		}
	}, [tipoAnexo, vigenciaCorrida, onChangeVigenciaCorrida]);

	const handleDeltaChange = (idx: number, value: string) => {
		const delta = parseFloat(value) || 0;
		const updated = [...cuotasAjuste];
		updated[idx] = { ...updated[idx], monto_delta: delta };
		onChangeCuotas(updated);
	};

	const handleFechaAjusteChange = (idx: number, value: string) => {
		const updated = [...cuotasAjuste];
		updated[idx] = { ...updated[idx], fecha_vencimiento: value };
		onChangeCuotas(updated);
	};

	// File upload
	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (!userId) return;

			for (const file of acceptedFiles) {
				if (file.size > 20 * 1024 * 1024) continue;

				const tempKey = `${file.name}-${Date.now()}`;

				const newDoc: DocumentoPoliza = {
					tipo_documento: "Documento de Anexo",
					nombre_archivo: file.name,
					tamano_bytes: file.size,
					upload_status: "uploading",
					_tempKey: tempKey,
				} as DocumentoPoliza & { _tempKey: string };

				onChangeDocumentos((prev) => [...prev, newDoc]);

				try {
					const storagePath = generateTempStoragePath(userId, sessionIdRef.current, file.name);

					const { error: uploadError } = await supabase.storage
						.from(BUCKET)
						.upload(storagePath, file);

					if (uploadError) {
						onChangeDocumentos((prev) =>
							prev.map((d) =>
								(d as DocumentoPoliza & { _tempKey?: string })._tempKey === tempKey
									? { ...d, upload_status: "error" as const, upload_error: uploadError.message }
									: d
							)
						);
					} else {
						onChangeDocumentos((prev) =>
							prev.map((d) =>
								(d as DocumentoPoliza & { _tempKey?: string })._tempKey === tempKey
									? { ...d, storage_path: storagePath, upload_status: "uploaded" as const }
									: d
							)
						);
					}
				} catch {
					onChangeDocumentos((prev) =>
						prev.map((d) =>
							(d as DocumentoPoliza & { _tempKey?: string })._tempKey === tempKey
								? { ...d, upload_status: "error" as const, upload_error: "Error de conexión" }
								: d
						)
					);
				}
			}
		},
		[userId, onChangeDocumentos, supabase.storage]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/pdf": [".pdf"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/png": [".png"],
		},
		maxSize: 20 * 1024 * 1024,
	});

	const docsSubidos = documentos.filter((d) => d.upload_status === "uploaded");

	const handleContinuar = () => {
		const newErrors: string[] = [];

		if (docsSubidos.length === 0) {
			newErrors.push("Debe adjuntar al menos un documento de anexo");
		}

		if (tipoAnexo === "inclusion") {
			if (!planPagoInclusion || planPagoInclusion.prima_total <= 0) {
				newErrors.push("Debe ingresar la prima total del anexo (mayor a 0)");
			} else if (planPagoInclusion.cuotas.length === 0) {
				newErrors.push("El plan de pago no tiene cuotas definidas");
			} else if (planPagoInclusion.cuotas.some((c) => c.monto <= 0)) {
				newErrors.push("Todas las cuotas deben tener un monto mayor a 0");
			} else if (planPagoInclusion.cuotas.some((c) => !c.fecha_vencimiento)) {
				newErrors.push("Todas las cuotas deben tener fecha de vencimiento");
			}
		}

		if (tipoAnexo === "anulacion" && vigenciaCorrida && vigenciaCorrida.monto < 0) {
			newErrors.push("El monto de vigencia corrida no puede ser negativo");
		}

		if (newErrors.length > 0) {
			setErrores(newErrors);
			return;
		}

		setErrores([]);
		onSiguiente();
	};

	const tituloSeccionPagos =
		tipoAnexo === "inclusion"
			? "Plan de Pago del Anexo"
			: tipoAnexo === "exclusion"
			? "Descuento por Exclusión"
			: "Vigencia Corrida y Documentos";

	return (
		<div className="bg-white border rounded-lg p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-6">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
					4
				</div>
				<h2 className="text-lg font-semibold">{tituloSeccionPagos}</h2>
			</div>

			{/* ===== INCLUSIÓN: plan de pago propio ===== */}
			{tipoAnexo === "inclusion" && planPagoInclusion && (
				<div className="mb-8">
					<SeccionPlanInclusion
						plan={planPagoInclusion}
						moneda={moneda}
						onChange={onChangePlanPagoInclusion}
					/>
				</div>
			)}

			{/* ===== EXCLUSIÓN: descuento sobre cuotas originales ===== */}
			{tipoAnexo === "exclusion" && (
				<div className="mb-8">
					<SeccionAjusteExclusion
						cuotasAjuste={cuotasAjuste}
						moneda={moneda}
						onChangeDelta={handleDeltaChange}
						onChangeFecha={handleFechaAjusteChange}
					/>
				</div>
			)}

			{/* ===== ANULACIÓN: vigencia corrida ===== */}
			{tipoAnexo === "anulacion" && (
				<div className="mb-8">
					<h3 className="text-sm font-medium mb-3">Cobro de Vigencia Corrida</h3>
					<p className="text-xs text-gray-500 mb-4">
						Ingrese el monto correspondiente a los días de vigencia corrida desde el último pago
						hasta la fecha de anulación.
					</p>

					<div className="mb-4">
						<p className="text-xs font-medium text-gray-500 mb-2">Cuotas pendientes (se congelarán):</p>
						<div className="bg-gray-50 border rounded-lg p-3 space-y-1">
							{cuotasOriginales
								.filter((c) => c.estado !== "pagado")
								.map((c) => (
									<div key={c.id} className="flex justify-between text-sm text-gray-500">
										<span>Cuota {c.numero_cuota} — {formatDate(c.fecha_vencimiento)}</span>
										<span className="line-through">{formatCurrency(c.monto, moneda)}</span>
									</div>
								))}
							{cuotasOriginales.filter((c) => c.estado !== "pagado").length === 0 && (
								<p className="text-sm text-gray-400">Todas las cuotas están pagadas</p>
							)}
						</div>
					</div>

					{vigenciaCorrida && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="vc_monto">Monto de Vigencia Corrida ({moneda})</Label>
								<Input
									id="vc_monto"
									type="number"
									step="0.01"
									min="0"
									value={vigenciaCorrida.monto || ""}
									onChange={(e) =>
										onChangeVigenciaCorrida({
											...vigenciaCorrida,
											monto: parseFloat(e.target.value) || 0,
										})
									}
									placeholder="0.00"
								/>
							</div>
							<div>
								<Label htmlFor="vc_fecha">Fecha de Vencimiento</Label>
								<Input
									id="vc_fecha"
									type="date"
									value={vigenciaCorrida.fecha_vencimiento}
									onChange={(e) =>
										onChangeVigenciaCorrida({
											...vigenciaCorrida,
											fecha_vencimiento: e.target.value,
										})
									}
								/>
							</div>
							<div className="md:col-span-2">
								<Label htmlFor="vc_obs">Observaciones</Label>
								<Input
									id="vc_obs"
									value={vigenciaCorrida.observaciones}
									onChange={(e) =>
										onChangeVigenciaCorrida({
											...vigenciaCorrida,
											observaciones: e.target.value,
										})
									}
									placeholder="Detalle del cálculo de vigencia corrida..."
								/>
							</div>
						</div>
					)}
				</div>
			)}

			{/* ===== DOCUMENTOS ===== */}
			<div className="mb-6">
				<h3 className="text-sm font-medium mb-3">
					Documento de Anexo
					<span className="text-red-500 ml-1">*</span>
				</h3>

				<div
					{...getRootProps()}
					className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
						isDragActive
							? "border-blue-400 bg-blue-50"
							: "border-gray-300 hover:border-gray-400"
					}`}
				>
					<input {...getInputProps()} />
					<Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
					<p className="text-sm text-gray-600">
						Arrastre archivos aquí o haga clic para seleccionar
					</p>
					<p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — Máximo 20MB</p>
				</div>

				{documentos.length > 0 && (
					<div className="mt-3 space-y-2">
						{documentos.map((doc, idx) => (
							<div key={idx} className="flex items-center justify-between border rounded-lg p-3">
								<div className="flex items-center gap-2">
									<FileText className="h-4 w-4 text-gray-400" />
									<span className="text-sm">{doc.nombre_archivo}</span>
									{doc.upload_status === "uploading" && (
										<Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
									)}
									{doc.upload_status === "uploaded" && (
										<Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
											Subido
										</Badge>
									)}
									{doc.upload_status === "error" && (
										<Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
											Error
										</Badge>
									)}
								</div>
								<button
									onClick={() => onChangeDocumentos(documentos.filter((_, i) => i !== idx))}
									className="text-gray-400 hover:text-red-500"
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Errores */}
			{errores.length > 0 && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
					{errores.map((err, i) => (
						<p key={i} className="text-sm text-red-700 flex items-center gap-1">
							<AlertCircle className="h-4 w-4" />
							{err}
						</p>
					))}
				</div>
			)}

			{/* Navegación */}
			<div className="flex justify-between">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="h-4 w-4 mr-1" />
					Anterior
				</Button>
				<Button onClick={handleContinuar}>
					Siguiente
					<ChevronRight className="h-4 w-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}
