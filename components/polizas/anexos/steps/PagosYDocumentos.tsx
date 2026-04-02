"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import {
	ChevronRight, ChevronLeft, Lock, Upload, FileText, X, AlertCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { generateTempStoragePath } from "@/utils/fileUpload";
import type { CuotaAjuste, CuotaOriginalInfo, VigenciaCorrida, TipoAnexo } from "@/types/anexo";
import type { DocumentoPoliza, Moneda } from "@/types/poliza";
import { formatCurrency, formatDate } from "@/utils/formatters";

const BUCKET = "polizas-documentos";

type Props = {
	tipoAnexo: TipoAnexo;
	cuotasOriginales: CuotaOriginalInfo[];
	cuotasAjuste: CuotaAjuste[];
	vigenciaCorrida: VigenciaCorrida | null;
	documentos: DocumentoPoliza[];
	moneda: Moneda;
	userId: string | null;
	onChangeCuotas: (cuotas: CuotaAjuste[]) => void;
	onChangeVigenciaCorrida: (vc: VigenciaCorrida | null) => void;
	onChangeDocumentos: (docs: DocumentoPoliza[] | ((prev: DocumentoPoliza[]) => DocumentoPoliza[])) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function PagosYDocumentos({
	tipoAnexo,
	cuotasOriginales,
	cuotasAjuste,
	vigenciaCorrida,
	documentos,
	moneda,
	userId,
	onChangeCuotas,
	onChangeVigenciaCorrida,
	onChangeDocumentos,
	onSiguiente,
	onAnterior,
}: Props) {
	const [errores, setErrores] = useState<string[]>([]);
	const sessionIdRef = useRef(crypto.randomUUID());
	const supabase = useMemo(() => createClient(), []);

	// Inicializar cuotas ajuste si están vacías (en useEffect para evitar setState durante render)
	useEffect(() => {
		if (cuotasAjuste.length === 0 && cuotasOriginales.length > 0 && tipoAnexo !== "anulacion") {
			const iniciales: CuotaAjuste[] = cuotasOriginales.map((c) => ({
				cuota_original_id: c.id,
				numero_cuota: c.numero_cuota,
				monto_original: c.monto,
				monto_delta: 0,
				fecha_vencimiento: c.fecha_vencimiento,
				estado_original: c.estado,
				es_modificable: c.estado !== "pagado",
			}));
			onChangeCuotas(iniciales);
		}
	}, [cuotasAjuste.length, cuotasOriginales, tipoAnexo, onChangeCuotas]);

	// Inicializar vigencia corrida si es anulación
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

	const handleFechaChange = (idx: number, value: string) => {
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

	return (
		<div className="bg-white border rounded-lg p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-6">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
					4
				</div>
				<h2 className="text-lg font-semibold">
					{tipoAnexo === "anulacion" ? "Vigencia Corrida y Documentos" : "Ajuste de Pagos y Documentos"}
				</h2>
			</div>

			{/* ===== SECCIÓN DE PAGOS ===== */}
			{tipoAnexo !== "anulacion" ? (
				<div className="mb-8">
					<h3 className="text-sm font-medium mb-3">Ajuste de Cuotas</h3>
					<p className="text-xs text-gray-500 mb-4">
						Ingrese la diferencia ({tipoAnexo === "inclusion" ? "positiva" : "negativa"}) que se aplicará
						a cada cuota pendiente. Las cuotas pagadas no pueden modificarse.
					</p>

					<div className="border rounded-lg overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="text-left px-4 py-2">#</th>
									<th className="text-left px-4 py-2">Vencimiento</th>
									<th className="text-right px-4 py-2">Monto Original</th>
									<th className="text-right px-4 py-2">Diferencia (+/-)</th>
									<th className="text-right px-4 py-2">Nuevo Monto</th>
									<th className="text-center px-4 py-2">Estado</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{cuotasAjuste.map((cuota, idx) => (
									<tr
										key={cuota.cuota_original_id}
										className={!cuota.es_modificable ? "bg-gray-50 opacity-60" : ""}
									>
										<td className="px-4 py-2">{cuota.numero_cuota}</td>
										<td className="px-4 py-2">
									{cuota.es_modificable ? (
										<Input
											type="date"
											value={cuota.fecha_vencimiento}
											onChange={(e) => handleFechaChange(idx, e.target.value)}
											className="w-36"
										/>
									) : (
										formatDate(cuota.fecha_vencimiento)
									)}
								</td>
										<td className="px-4 py-2 text-right">
											{formatCurrency(cuota.monto_original, moneda)}
										</td>
										<td className="px-4 py-2 text-right">
											{cuota.es_modificable ? (
												<Input
													type="number"
													step="0.01"
													value={cuota.monto_delta || ""}
													onChange={(e) => handleDeltaChange(idx, e.target.value)}
													className="w-32 text-right ml-auto"
													placeholder="0.00"
												/>
											) : (
												<span className="flex items-center justify-end gap-1 text-gray-400">
													<Lock className="h-3 w-3" />
													Pagada
												</span>
											)}
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

					{/* Resumen de diferencia total */}
					{cuotasAjuste.some((c) => c.monto_delta !== 0) && (
						<div className="mt-3 text-right">
							<span className="text-sm font-medium">
								Diferencia total:{" "}
								<span className={cuotasAjuste.reduce((s, c) => s + c.monto_delta, 0) >= 0 ? "text-green-600" : "text-red-600"}>
									{cuotasAjuste.reduce((s, c) => s + c.monto_delta, 0) >= 0 ? "+" : ""}
									{formatCurrency(cuotasAjuste.reduce((s, c) => s + c.monto_delta, 0), moneda)}
								</span>
							</span>
						</div>
					)}
				</div>
			) : (
				/* ANULACIÓN: Vigencia corrida */
				<div className="mb-8">
					<h3 className="text-sm font-medium mb-3">Cobro de Vigencia Corrida</h3>
					<p className="text-xs text-gray-500 mb-4">
						Ingrese el monto correspondiente a los días de vigencia corrida desde el último pago
						hasta la fecha de anulación. Este cobro será gestionado por cobranzas.
					</p>

					{/* Cuotas congeladas */}
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

			{/* ===== SECCIÓN DE DOCUMENTOS ===== */}
			<div className="mb-6">
				<h3 className="text-sm font-medium mb-3">
					Documento de Anexo
					<span className="text-red-500 ml-1">*</span>
				</h3>

				{/* Dropzone */}
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
					<p className="text-xs text-gray-400 mt-1">
						PDF, JPG, PNG — Máximo 20MB
					</p>
				</div>

				{/* Documentos subidos */}
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
									onClick={() => {
										onChangeDocumentos(documentos.filter((_, i) => i !== idx));
									}}
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
