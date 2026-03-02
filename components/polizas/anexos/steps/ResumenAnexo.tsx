"use client";

import { ChevronLeft, Edit, Save, Loader2, FileText, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnexoFormState, DatosPolizaParaAnexo, PasoAnexo } from "@/types/anexo";
import { formatCurrency, formatDate } from "@/utils/formatters";

type Props = {
	formState: AnexoFormState;
	datosPoliza: DatosPolizaParaAnexo | null;
	onGuardar: () => void;
	isSaving: boolean;
	onEditarPaso: (paso: PasoAnexo) => void;
	onAnterior: () => void;
};

const TIPO_LABELS = {
	inclusion: { label: "Inclusión", color: "bg-green-100 text-green-700" },
	exclusion: { label: "Exclusión", color: "bg-orange-100 text-orange-700" },
	anulacion: { label: "Anulación", color: "bg-red-100 text-red-700" },
};

export function ResumenAnexo({ formState, onGuardar, isSaving, onEditarPaso, onAnterior }: Props) {
	const config = formState.config!;
	const poliza = formState.poliza_resumen!;
	const tipoInfo = TIPO_LABELS[config.tipo_anexo];
	const moneda = poliza.moneda;

	// Calcular advertencias
	const advertencias: { tipo: "error" | "warning" | "info"; mensaje: string }[] = [];

	const docsSubidos = formState.documentos.filter((d) => d.upload_status === "uploaded");
	if (docsSubidos.length === 0) {
		advertencias.push({ tipo: "error", mensaje: "No hay documentos de anexo adjuntos. Es obligatorio." });
	}

	if (config.tipo_anexo === "anulacion" && formState.vigencia_corrida && formState.vigencia_corrida.monto === 0) {
		advertencias.push({ tipo: "warning", mensaje: "El monto de vigencia corrida es 0. ¿Es correcto?" });
	}

	if (config.tipo_anexo !== "anulacion") {
		const tieneDeltas = formState.cuotas_ajuste.some((c) => c.monto_delta !== 0);
		if (!tieneDeltas && !formState.items_cambio) {
			advertencias.push({ tipo: "warning", mensaje: "No se registraron cambios en items ni ajustes de pago." });
		}
	}

	const tieneErrores = advertencias.some((a) => a.tipo === "error");

	return (
		<div className="bg-white border rounded-lg p-6 shadow-sm">
			<div className="flex items-center gap-2 mb-6">
				<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
					5
				</div>
				<h2 className="text-lg font-semibold">Resumen del Anexo</h2>
			</div>

			{/* Advertencias */}
			{advertencias.length > 0 && (
				<div className="space-y-2 mb-6">
					{advertencias.map((adv, i) => (
						<div
							key={i}
							className={`rounded-lg p-3 flex items-start gap-2 text-sm ${
								adv.tipo === "error"
									? "bg-red-50 border border-red-200 text-red-700"
									: adv.tipo === "warning"
									? "bg-yellow-50 border border-yellow-200 text-yellow-700"
									: "bg-blue-50 border border-blue-200 text-blue-700"
							}`}
						>
							{adv.tipo === "error" ? (
								<AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
							) : (
								<Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
							)}
							{adv.mensaje}
						</div>
					))}
				</div>
			)}

			{/* Sección 1: Póliza */}
			<div className="border rounded-lg p-4 mb-4">
				<div className="flex items-center justify-between mb-2">
					<h3 className="font-medium text-sm text-gray-500">Póliza</h3>
					<button onClick={() => onEditarPaso(1)} className="text-blue-500 hover:text-blue-700">
						<Edit className="h-4 w-4" />
					</button>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
					<div>
						<span className="text-gray-500">Nro:</span>{" "}
						<span className="font-medium">{poliza.numero_poliza}</span>
					</div>
					<div>
						<span className="text-gray-500">Ramo:</span> {poliza.ramo}
					</div>
					<div>
						<span className="text-gray-500">Asegurado:</span> {poliza.client_name}
					</div>
					<div>
						<span className="text-gray-500">Prima:</span>{" "}
						{formatCurrency(poliza.prima_total, moneda)}
					</div>
				</div>
			</div>

			{/* Sección 2: Configuración */}
			<div className="border rounded-lg p-4 mb-4">
				<div className="flex items-center justify-between mb-2">
					<h3 className="font-medium text-sm text-gray-500">Configuración del Anexo</h3>
					<button onClick={() => onEditarPaso(2)} className="text-blue-500 hover:text-blue-700">
						<Edit className="h-4 w-4" />
					</button>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
					<div>
						<span className="text-gray-500">Tipo:</span>{" "}
						<Badge className={tipoInfo.color}>{tipoInfo.label}</Badge>
					</div>
					<div>
						<span className="text-gray-500">Nro Anexo:</span>{" "}
						<span className="font-medium">{config.numero_anexo}</span>
					</div>
					<div>
						<span className="text-gray-500">Fecha Efectiva:</span>{" "}
						{formatDate(config.fecha_efectiva)}
					</div>
					{config.observaciones && (
						<div className="col-span-2 md:col-span-4">
							<span className="text-gray-500">Observaciones:</span> {config.observaciones}
						</div>
					)}
				</div>
			</div>

			{/* Sección 3: Datos específicos (solo inclusión/exclusión) */}
			{config.tipo_anexo !== "anulacion" && formState.items_cambio && (
				<div className="border rounded-lg p-4 mb-4">
					<div className="flex items-center justify-between mb-2">
						<h3 className="font-medium text-sm text-gray-500">Cambios en Datos Específicos</h3>
						<button onClick={() => onEditarPaso(3)} className="text-blue-500 hover:text-blue-700">
							<Edit className="h-4 w-4" />
						</button>
					</div>
					<div className="text-sm">
						<p>
							Ramo: <Badge variant="outline">{formState.items_cambio.tipo_ramo}</Badge>
						</p>
						{formState.items_cambio.tipo_ramo === "Automotores" && (
							<p className="mt-1">
								Vehículos: {formState.items_cambio.items.length} {config.tipo_anexo === "inclusion" ? "a incluir" : "a excluir"}
							</p>
						)}
						{formState.items_cambio.tipo_ramo === "Salud" && (
							<p className="mt-1">
								Asegurados: {formState.items_cambio.items_asegurados.length} |
								Beneficiarios: {formState.items_cambio.items_beneficiarios.length}
							</p>
						)}
					</div>
				</div>
			)}

			{/* Sección 4: Pagos */}
			<div className="border rounded-lg p-4 mb-4">
				<div className="flex items-center justify-between mb-2">
					<h3 className="font-medium text-sm text-gray-500">
						{config.tipo_anexo === "anulacion" ? "Vigencia Corrida" : "Ajuste de Pagos"}
					</h3>
					<button onClick={() => onEditarPaso(4)} className="text-blue-500 hover:text-blue-700">
						<Edit className="h-4 w-4" />
					</button>
				</div>

				{config.tipo_anexo === "anulacion" ? (
					<div className="text-sm">
						{formState.vigencia_corrida && formState.vigencia_corrida.monto > 0 ? (
							<>
								<p>
									Monto:{" "}
									<span className="font-medium">
										{formatCurrency(formState.vigencia_corrida.monto, moneda)}
									</span>
								</p>
								<p>Vencimiento: {formatDate(formState.vigencia_corrida.fecha_vencimiento)}</p>
								{formState.vigencia_corrida.observaciones && (
									<p className="text-gray-500">{formState.vigencia_corrida.observaciones}</p>
								)}
							</>
						) : (
							<p className="text-gray-400">Sin cobro de vigencia corrida</p>
						)}
					</div>
				) : (
					<div className="text-sm">
						{formState.cuotas_ajuste.some((c) => c.monto_delta !== 0) ? (
							<>
								<p>
									Cuotas modificadas:{" "}
									{formState.cuotas_ajuste.filter((c) => c.monto_delta !== 0).length} de{" "}
									{formState.cuotas_ajuste.length}
								</p>
								<p className="font-medium">
									Diferencia total:{" "}
									<span
										className={
											formState.cuotas_ajuste.reduce((s, c) => s + c.monto_delta, 0) >= 0
												? "text-green-600"
												: "text-red-600"
										}
									>
										{formState.cuotas_ajuste.reduce((s, c) => s + c.monto_delta, 0) >= 0 ? "+" : ""}
										{formatCurrency(
											formState.cuotas_ajuste.reduce((s, c) => s + c.monto_delta, 0),
											moneda
										)}
									</span>
								</p>
							</>
						) : (
							<p className="text-gray-400">Sin ajustes de pago</p>
						)}
					</div>
				)}
			</div>

			{/* Sección 5: Documentos */}
			<div className="border rounded-lg p-4 mb-6">
				<div className="flex items-center justify-between mb-2">
					<h3 className="font-medium text-sm text-gray-500">Documentos</h3>
					<button onClick={() => onEditarPaso(4)} className="text-blue-500 hover:text-blue-700">
						<Edit className="h-4 w-4" />
					</button>
				</div>
				{docsSubidos.length > 0 ? (
					<div className="space-y-1">
						{docsSubidos.map((doc, i) => (
							<div key={i} className="flex items-center gap-2 text-sm">
								<FileText className="h-4 w-4 text-gray-400" />
								<span>{doc.nombre_archivo}</span>
							</div>
						))}
					</div>
				) : (
					<p className="text-red-500 text-sm">No hay documentos adjuntos</p>
				)}
			</div>

			{/* Nota de validación */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
				<p className="text-sm text-blue-700">
					<Info className="h-4 w-4 inline mr-1" />
					El anexo se creará en estado <strong>pendiente</strong> y requerirá validación gerencial
					para activarse.
					{config.tipo_anexo === "anulacion" && (
						<span className="text-red-600 font-medium">
							{" "}Una vez validado, la póliza quedará anulada permanentemente.
						</span>
					)}
				</p>
			</div>

			{/* Navegación */}
			<div className="flex justify-between">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="h-4 w-4 mr-1" />
					Anterior
				</Button>
				<Button
					onClick={onGuardar}
					disabled={tieneErrores || isSaving}
					className="bg-green-600 hover:bg-green-700"
				>
					{isSaving ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Guardando...
						</>
					) : (
						<>
							<Save className="h-4 w-4 mr-2" />
							Guardar Anexo
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
