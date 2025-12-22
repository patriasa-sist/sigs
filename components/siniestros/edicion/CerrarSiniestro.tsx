"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Upload, X, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { cerrarSiniestro, generarWhatsAppCierreSiniestro } from "@/app/siniestros/actions";
import { toast } from "sonner";
import {
	validarCierreRechazo,
	validarCierreDeclinacion,
	validarCierreIndemnizacion,
} from "@/utils/siniestroValidation";
import type {
	DatosCierreRechazo,
	DatosCierreDeclinacion,
	DatosCierreIndemnizacion,
	MotivoRechazo,
	MotivoDeclinacion,
	Moneda,
	DocumentoSiniestro,
} from "@/types/siniestro";

interface CerrarSiniestroProps {
	siniestroId: string;
	numeroPoliza: string;
}

type TipoCierre = "rechazo" | "declinacion" | "indemnizacion";

const MOTIVOS_RECHAZO: MotivoRechazo[] = ["Mora", "Incumplimiento", "Sin cobertura", "No aplicable"];
const MOTIVOS_DECLINACION: MotivoDeclinacion[] = ["Solicitud cliente", "Pagó otra póliza"];
const MONEDAS: Moneda[] = ["Bs", "USD", "USDT", "UFV"];

export default function CerrarSiniestro({ siniestroId, numeroPoliza }: CerrarSiniestroProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TipoCierre>("rechazo");
	const [loading, setLoading] = useState(false);
	const [errores, setErrores] = useState<string[]>([]);
	const [advertencias, setAdvertencias] = useState<string[]>([]);

	// Estados para Rechazo
	const [motivoRechazo, setMotivoRechazo] = useState<MotivoRechazo | "">("");
	const [cartaRechazo, setCartaRechazo] = useState<DocumentoSiniestro | null>(null);

	// Estados para Declinación
	const [motivoDeclinacion, setMotivoDeclinacion] = useState<MotivoDeclinacion | "">("");
	const [cartaRespaldo, setCartaRespaldo] = useState<DocumentoSiniestro | null>(null);

	// Estados para Indemnización
	const [archivoUIF, setArchivoUIF] = useState<DocumentoSiniestro | null>(null);
	const [archivoPEP, setArchivoPEP] = useState<DocumentoSiniestro | null>(null);
	const [montoReclamado, setMontoReclamado] = useState<number>(0);
	const [monedaReclamado, setMonedaReclamado] = useState<Moneda>("Bs");
	const [deducible, setDeducible] = useState<number>(0);
	const [monedaDeducible, setMonedaDeducible] = useState<Moneda>("Bs");
	const [montoPagado, setMontoPagado] = useState<number>(0);
	const [monedaPagado, setMonedaPagado] = useState<Moneda>("Bs");
	// const [esPagoComercial, setEsPagoComercial] = useState(false); // REMOVIDO: Ya no se usa

	// Handler de archivo
	const handleFileUpload = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>, tipo: "carta_rechazo" | "carta_respaldo" | "archivo_uif" | "archivo_pep") => {
			const file = e.target.files?.[0];
			if (!file) return;

			// Validar tamaño (20MB)
			if (file.size > 20 * 1024 * 1024) {
				setErrores(["El archivo excede el tamaño máximo de 20MB"]);
				return;
			}

			// Validar tipo
			const tiposPermitidos = [
				"application/pdf",
				"image/jpeg",
				"image/png",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			];
			if (!tiposPermitidos.includes(file.type)) {
				setErrores(["Tipo de archivo no permitido. Use PDF, JPG, PNG, DOC o DOCX"]);
				return;
			}

			const documento: DocumentoSiniestro = {
				tipo_documento: tipo,
				nombre_archivo: file.name,
				file,
				tamano_bytes: file.size,
			};

			// Asignar según tipo
			switch (tipo) {
				case "carta_rechazo":
					setCartaRechazo(documento);
					break;
				case "carta_respaldo":
					setCartaRespaldo(documento);
					break;
				case "archivo_uif":
					setArchivoUIF(documento);
					break;
				case "archivo_pep":
					setArchivoPEP(documento);
					break;
			}

			setErrores([]);
		},
		[]
	);

	// Limpiar archivo
	const clearFile = useCallback((tipo: "carta_rechazo" | "carta_respaldo" | "archivo_uif" | "archivo_pep") => {
		switch (tipo) {
			case "carta_rechazo":
				setCartaRechazo(null);
				break;
			case "carta_respaldo":
				setCartaRespaldo(null);
				break;
			case "archivo_uif":
				setArchivoUIF(null);
				break;
			case "archivo_pep":
				setArchivoPEP(null);
				break;
		}
	}, []);

	// Validar según tipo
	const validarFormulario = useCallback((): boolean => {
		setErrores([]);
		setAdvertencias([]);

		if (activeTab === "rechazo") {
			if (!motivoRechazo || !cartaRechazo) {
				setErrores(["Debe seleccionar un motivo y adjuntar la carta de rechazo"]);
				return false;
			}

			const datos: DatosCierreRechazo = {
				tipo: "rechazo",
				motivo_rechazo: motivoRechazo,
				carta_rechazo: cartaRechazo,
			};

			const validacion = validarCierreRechazo(datos);
			if (!validacion.valido) {
				setErrores(validacion.errores);
				return false;
			}
			setAdvertencias(validacion.advertencias);
			return true;
		} else if (activeTab === "declinacion") {
			if (!motivoDeclinacion || !cartaRespaldo) {
				setErrores(["Debe seleccionar un motivo y adjuntar la carta de respaldo"]);
				return false;
			}

			const datos: DatosCierreDeclinacion = {
				tipo: "declinacion",
				motivo_declinacion: motivoDeclinacion,
				carta_respaldo: cartaRespaldo,
			};

			const validacion = validarCierreDeclinacion(datos);
			if (!validacion.valido) {
				setErrores(validacion.errores);
				return false;
			}
			setAdvertencias(validacion.advertencias);
			return true;
		} else if (activeTab === "indemnizacion") {
			if (!archivoUIF || !archivoPEP) {
				setErrores(["Debe adjuntar los archivos UIF y PEP"]);
				return false;
			}

			if (!montoReclamado || !deducible === undefined || !montoPagado) {
				setErrores(["Debe ingresar todos los montos"]);
				return false;
			}

			const datos: DatosCierreIndemnizacion = {
				tipo: "indemnizacion",
				archivo_uif: archivoUIF,
				archivo_pep: archivoPEP,
				monto_reclamado: montoReclamado,
				moneda_reclamado: monedaReclamado,
				deducible,
				moneda_deducible: monedaDeducible,
				monto_pagado: montoPagado,
				moneda_pagado: monedaPagado,
				es_pago_comercial: false, // Siempre false por defecto
			};

			const validacion = validarCierreIndemnizacion(datos);
			if (!validacion.valido) {
				setErrores(validacion.errores);
				return false;
			}
			setAdvertencias(validacion.advertencias);
			return true;
		}

		return false;
	}, [
		activeTab,
		motivoRechazo,
		cartaRechazo,
		motivoDeclinacion,
		cartaRespaldo,
		archivoUIF,
		archivoPEP,
		montoReclamado,
		monedaReclamado,
		deducible,
		monedaDeducible,
		montoPagado,
		monedaPagado,
		// esPagoComercial, // REMOVIDO
	]);

	// Cerrar siniestro
	const handleCerrar = async () => {
		if (!validarFormulario()) return;

		setLoading(true);
		setErrores([]);

		try {
			let datosCierre:
				| DatosCierreRechazo
				| DatosCierreDeclinacion
				| DatosCierreIndemnizacion;

			if (activeTab === "rechazo") {
				datosCierre = {
					tipo: "rechazo",
					motivo_rechazo: motivoRechazo as MotivoRechazo,
					carta_rechazo: cartaRechazo!,
				};
			} else if (activeTab === "declinacion") {
				datosCierre = {
					tipo: "declinacion",
					motivo_declinacion: motivoDeclinacion as MotivoDeclinacion,
					carta_respaldo: cartaRespaldo!,
				};
			} else {
				datosCierre = {
					tipo: "indemnizacion",
					archivo_uif: archivoUIF!,
					archivo_pep: archivoPEP!,
					monto_reclamado: montoReclamado,
					moneda_reclamado: monedaReclamado,
					deducible,
					moneda_deducible: monedaDeducible,
					monto_pagado: montoPagado,
					moneda_pagado: monedaPagado,
					es_pago_comercial: false, // Siempre false por defecto
				};
			}

			const result = await cerrarSiniestro(siniestroId, datosCierre);

			if (!result.success) {
				setErrores([result.error]);
				return;
			}

			// Éxito: enviar mensaje por WhatsApp
			// Mapear tipo de cierre para WhatsApp
			const tipoWhatsApp =
				activeTab === "rechazo" ? "rechazado" : activeTab === "declinacion" ? "declinado" : "concluido";

			const whatsappResponse = await generarWhatsAppCierreSiniestro(siniestroId, tipoWhatsApp);

			if (whatsappResponse.success && whatsappResponse.data?.url) {
				window.open(whatsappResponse.data.url, "_blank");
				toast.success("WhatsApp Web se abrirá en una nueva pestaña con el mensaje preparado");
			} else {
				// No bloquear el flujo si falla WhatsApp
				toast.warning("Siniestro cerrado exitosamente, pero no se pudo preparar el mensaje de WhatsApp");
			}

			// Cerrar modal y redirigir
			setOpen(false);
			router.push("/siniestros");
			router.refresh();
		} catch (error) {
			setErrores([
				error instanceof Error ? error.message : "Error desconocido al cerrar el siniestro",
			]);
		} finally {
			setLoading(false);
		}
	};

	// Componente de archivo subido
	const FilePreview = ({ file, onRemove }: { file: DocumentoSiniestro; onRemove: () => void }) => (
		<div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-between">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium truncate">{file.nombre_archivo}</p>
					<p className="text-xs text-muted-foreground">
						{file.tamano_bytes ? (file.tamano_bytes / 1024).toFixed(1) : 0} KB
					</p>
				</div>
			</div>
			<Button variant="ghost" size="sm" onClick={onRemove} type="button">
				<X className="h-4 w-4" />
			</Button>
		</div>
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="destructive" size="sm">
					<Lock className="h-4 w-4 mr-2" />
					Cerrar Siniestro
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Cerrar Siniestro - Póliza {numeroPoliza}</DialogTitle>
					<DialogDescription>
						Seleccione el tipo de cierre y complete la información requerida. Esta acción es
						irreversible.
					</DialogDescription>
				</DialogHeader>

				{/* Alertas */}
				{errores.length > 0 && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							<ul className="list-disc list-inside space-y-1">
								{errores.map((error, idx) => (
									<li key={idx}>{error}</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				)}

				{advertencias.length > 0 && (
					<Alert>
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							<ul className="list-disc list-inside space-y-1">
								{advertencias.map((adv, idx) => (
									<li key={idx}>{adv}</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				)}

				{/* Tabs de tipos de cierre */}
				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TipoCierre)}>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="rechazo">Rechazado</TabsTrigger>
						<TabsTrigger value="declinacion">Declinado</TabsTrigger>
						<TabsTrigger value="indemnizacion">Concluido</TabsTrigger>
					</TabsList>

					{/* Tab Rechazo */}
					<TabsContent value="rechazo" className="space-y-4 mt-4">
						<div className="space-y-2">
							<Label htmlFor="motivo-rechazo">
								Motivo de Rechazo <span className="text-red-500">*</span>
							</Label>
							<Select value={motivoRechazo} onValueChange={(v) => setMotivoRechazo(v as MotivoRechazo)}>
								<SelectTrigger id="motivo-rechazo">
									<SelectValue placeholder="Seleccione un motivo" />
								</SelectTrigger>
								<SelectContent>
									{MOTIVOS_RECHAZO.map((motivo) => (
										<SelectItem key={motivo} value={motivo}>
											{motivo}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="carta-rechazo">
								Carta de Rechazo <span className="text-red-500">*</span>
							</Label>
							<div className="border-2 border-dashed rounded-lg p-6 text-center">
								{!cartaRechazo ? (
									<div>
										<Upload className="mx-auto h-12 w-12 text-muted-foreground" />
										<p className="mt-2 text-sm text-muted-foreground">
											Adjuntar carta de rechazo (PDF, JPG, PNG, DOC)
										</p>
										<Input
											id="carta-rechazo"
											type="file"
											accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
											className="mt-2"
											onChange={(e) => handleFileUpload(e, "carta_rechazo")}
										/>
									</div>
								) : (
									<FilePreview file={cartaRechazo} onRemove={() => clearFile("carta_rechazo")} />
								)}
							</div>
						</div>
					</TabsContent>

					{/* Tab Declinación */}
					<TabsContent value="declinacion" className="space-y-4 mt-4">
						<div className="space-y-2">
							<Label htmlFor="motivo-declinacion">
								Motivo de Declinación <span className="text-red-500">*</span>
							</Label>
							<Select value={motivoDeclinacion} onValueChange={(v) => setMotivoDeclinacion(v as MotivoDeclinacion)}>
								<SelectTrigger id="motivo-declinacion">
									<SelectValue placeholder="Seleccione un motivo" />
								</SelectTrigger>
								<SelectContent>
									{MOTIVOS_DECLINACION.map((motivo) => (
										<SelectItem key={motivo} value={motivo}>
											{motivo}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="carta-respaldo">
								Carta de Respaldo <span className="text-red-500">*</span>
							</Label>
							<div className="border-2 border-dashed rounded-lg p-6 text-center">
								{!cartaRespaldo ? (
									<div>
										<Upload className="mx-auto h-12 w-12 text-muted-foreground" />
										<p className="mt-2 text-sm text-muted-foreground">
											Adjuntar carta de respaldo (PDF, JPG, PNG, DOC)
										</p>
										<Input
											id="carta-respaldo"
											type="file"
											accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
											className="mt-2"
											onChange={(e) => handleFileUpload(e, "carta_respaldo")}
										/>
									</div>
								) : (
									<FilePreview file={cartaRespaldo} onRemove={() => clearFile("carta_respaldo")} />
								)}
							</div>
						</div>
					</TabsContent>

					{/* Tab Indemnización */}
					<TabsContent value="indemnizacion" className="space-y-4 mt-4">
						{/* Archivos obligatorios */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="archivo-uif">
									Archivo UIF <span className="text-red-500">*</span>
								</Label>
								<div className="border-2 border-dashed rounded-lg p-4 text-center">
									{!archivoUIF ? (
										<div>
											<Upload className="mx-auto h-8 w-8 text-muted-foreground" />
											<p className="mt-1 text-xs text-muted-foreground">UIF (PDF)</p>
											<Input
												id="archivo-uif"
												type="file"
												accept=".pdf"
												className="mt-2 text-xs"
												onChange={(e) => handleFileUpload(e, "archivo_uif")}
											/>
										</div>
									) : (
										<FilePreview file={archivoUIF} onRemove={() => clearFile("archivo_uif")} />
									)}
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="archivo-pep">
									Archivo PEP <span className="text-red-500">*</span>
								</Label>
								<div className="border-2 border-dashed rounded-lg p-4 text-center">
									{!archivoPEP ? (
										<div>
											<Upload className="mx-auto h-8 w-8 text-muted-foreground" />
											<p className="mt-1 text-xs text-muted-foreground">PEP (PDF)</p>
											<Input
												id="archivo-pep"
												type="file"
												accept=".pdf"
												className="mt-2 text-xs"
												onChange={(e) => handleFileUpload(e, "archivo_pep")}
											/>
										</div>
									) : (
										<FilePreview file={archivoPEP} onRemove={() => clearFile("archivo_pep")} />
									)}
								</div>
							</div>
						</div>

						{/* Monto Reclamado */}
						<div className="space-y-2">
							<Label>
								Monto Reclamado <span className="text-red-500">*</span>
							</Label>
							<div className="grid grid-cols-3 gap-2">
								<Select value={monedaReclamado} onValueChange={(v) => setMonedaReclamado(v as Moneda)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MONEDAS.map((m) => (
											<SelectItem key={m} value={m}>
												{m}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									type="number"
									step="0.01"
									min="0"
									value={montoReclamado}
									onChange={(e) => setMontoReclamado(parseFloat(e.target.value) || 0)}
									className="col-span-2"
									placeholder="0.00"
								/>
							</div>
						</div>

						{/* Deducible */}
						<div className="space-y-2">
							<Label>
								Deducible <span className="text-red-500">*</span>
							</Label>
							<div className="grid grid-cols-3 gap-2">
								<Select value={monedaDeducible} onValueChange={(v) => setMonedaDeducible(v as Moneda)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MONEDAS.map((m) => (
											<SelectItem key={m} value={m}>
												{m}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									type="number"
									step="0.01"
									min="0"
									value={deducible}
									onChange={(e) => setDeducible(parseFloat(e.target.value) || 0)}
									className="col-span-2"
									placeholder="0.00"
								/>
							</div>
						</div>

						{/* Monto Pagado */}
						<div className="space-y-2">
							<Label>
								Monto Pagado <span className="text-red-500">*</span>
							</Label>
							<div className="grid grid-cols-3 gap-2">
								<Select value={monedaPagado} onValueChange={(v) => setMonedaPagado(v as Moneda)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MONEDAS.map((m) => (
											<SelectItem key={m} value={m}>
												{m}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									type="number"
									step="0.01"
									min="0"
									value={montoPagado}
									onChange={(e) => setMontoPagado(parseFloat(e.target.value) || 0)}
									className="col-span-2"
									placeholder="0.00"
								/>
							</div>
						</div>

						{/* Pago Comercial - REMOVIDO */}
						{/* <div className="flex items-center space-x-2">
							<Checkbox
								id="pago-comercial"
								checked={esPagoComercial}
								onCheckedChange={(checked) => setEsPagoComercial(checked === true)}
							/>
							<Label htmlFor="pago-comercial" className="text-sm font-normal cursor-pointer">
								Es pago comercial (no cubre la aseguradora)
							</Label>
						</div> */}
					</TabsContent>
				</Tabs>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
						Cancelar
					</Button>
					<Button onClick={handleCerrar} disabled={loading} variant="destructive">
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Confirmar Cierre
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
