"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	eliminarPolizaNuclear,
	previsualizarEliminacion,
} from "@/app/polizas/nuclear/actions";

type PreviewData = {
	puede_eliminar?: boolean;
	razon?: string;
	detalles?: Record<string, unknown>;
	error?: string;
};

type DeleteResult = {
	eliminado: boolean;
	mensaje: string;
	archivos_eliminados: number;
	registros_bd: Record<string, unknown>;
	archivos_storage_resultado: {
		exitosos: number;
		fallidos: number;
		errores: string[];
	};
};

const LABEL_MAP: Record<string, string> = {
	siniestros: "Siniestros",
	siniestros_documentos: "Documentos de siniestros",
	siniestros_estados_historial: "Estados historial siniestros",
	anexos: "Anexos",
	anexos_documentos: "Documentos de anexos",
	pagos: "Cuotas de pago",
	comprobantes: "Comprobantes de pago",
	documentos: "Documentos de póliza",
	historial: "Historial de ediciones",
	vehiculos: "Vehículos (Automotor)",
	salud_asegurados: "Asegurados (Salud)",
	salud_beneficiarios: "Beneficiarios (Salud)",
	salud_niveles: "Niveles (Salud)",
	incendio_bienes: "Bienes (Incendio)",
	riesgos_varios_bienes: "Bienes (Riesgos Varios)",
	responsabilidad_civil: "Responsabilidad Civil",
	niveles: "Niveles genéricos",
	transporte: "Transporte",
	ramos_tecnicos_equipos: "Equipos (Ramos Técnicos)",
	aeronavegacion_naves: "Naves (Aeronavegación)",
	aeronavegacion_asegurados: "Asegurados (Aeronavegación)",
	permisos_edicion: "Permisos de edición",
};

export default function EliminacionNuclear() {
	const [polizaId, setPolizaId] = useState("");
	const [preview, setPreview] = useState<PreviewData | null>(null);
	const [result, setResult] = useState<DeleteResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");

	const handlePreview = async () => {
		if (!polizaId.trim()) return;
		setLoading(true);
		setPreview(null);
		setResult(null);
		const data = await previsualizarEliminacion(polizaId.trim());
		setPreview(data as PreviewData);
		setLoading(false);
	};

	const handleDelete = async () => {
		setConfirmOpen(false);
		setConfirmText("");
		setLoading(true);
		const data = await eliminarPolizaNuclear(polizaId.trim());
		setResult(data);
		setPreview(null);
		setLoading(false);
	};

	const detalles = preview?.detalles ?? {};
	const numeroPoliza = (detalles.numero_poliza as string) ?? "";
	const totalRegistros = Object.entries(detalles)
		.filter(
			([k]) =>
				k !== "numero_poliza" &&
				k !== "ramo" &&
				k !== "estado" &&
				k !== "advertencia"
		)
		.reduce((sum, [, v]) => sum + (typeof v === "number" ? v : 0), 0);

	return (
		<div className="space-y-6">
			{/* Búsqueda */}
			<Card>
				<CardHeader>
					<CardTitle>Buscar Póliza</CardTitle>
					<CardDescription>
						Ingresa el UUID de la póliza para ver el impacto antes de eliminar
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-3">
						<Input
							placeholder="UUID de la póliza (ej: 550e8400-e29b-41d4-a716-446655440000)"
							value={polizaId}
							onChange={(e) => setPolizaId(e.target.value)}
							className="font-mono text-sm"
						/>
						<Button onClick={handlePreview} disabled={loading || !polizaId.trim()}>
							{loading && !preview && !result ? "Buscando..." : "Vista Previa"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Error */}
			{preview?.error && (
				<Card className="border-destructive">
					<CardContent className="pt-6">
						<p className="text-destructive font-medium">{preview.error}</p>
					</CardContent>
				</Card>
			)}

			{/* Vista previa */}
			{preview?.detalles && !preview.error && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-3">
									Póliza: {numeroPoliza}
									<Badge variant="outline">
										{detalles.ramo as string}
									</Badge>
									<Badge
										variant={
											detalles.estado === "activa"
												? "default"
												: "secondary"
										}
									>
										{detalles.estado as string}
									</Badge>
								</CardTitle>
								<CardDescription className="mt-1">
									Se eliminarán {totalRegistros} registros en total
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
							{Object.entries(LABEL_MAP).map(([key, label]) => {
								const count = detalles[key];
								if (typeof count !== "number") return null;
								return (
									<div
										key={key}
										className={`flex items-center justify-between rounded-lg border p-3 ${
											count > 0
												? "border-destructive/30 bg-destructive/5"
												: "opacity-50"
										}`}
									>
										<span className="text-sm">{label}</span>
										<Badge
											variant={count > 0 ? "destructive" : "secondary"}
										>
											{count}
										</Badge>
									</div>
								);
							})}
						</div>

						<div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
							<p className="text-sm font-medium text-destructive">
								{detalles.advertencia as string}
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								También se eliminarán los archivos físicos de Storage
								(documentos, comprobantes).
							</p>
						</div>

						<div className="mt-6 flex justify-end">
							<Button
								variant="destructive"
								size="lg"
								onClick={() => setConfirmOpen(true)}
								disabled={loading}
							>
								Eliminar Póliza Completamente
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Resultado */}
			{result && (
				<Card
					className={
						result.eliminado ? "border-green-500" : "border-destructive"
					}
				>
					<CardHeader>
						<CardTitle
							className={
								result.eliminado ? "text-green-600" : "text-destructive"
							}
						>
							{result.eliminado
								? "Póliza eliminada exitosamente"
								: "Error al eliminar"}
						</CardTitle>
						<CardDescription>{result.mensaje}</CardDescription>
					</CardHeader>
					{result.eliminado && (
						<CardContent className="space-y-3">
							<div className="flex gap-4 text-sm">
								<span>
									Archivos de storage eliminados:{" "}
									<strong>
										{result.archivos_storage_resultado.exitosos}
									</strong>
								</span>
								{result.archivos_storage_resultado.fallidos > 0 && (
									<span className="text-destructive">
										Fallidos:{" "}
										{result.archivos_storage_resultado.fallidos}
									</span>
								)}
							</div>
							{result.archivos_storage_resultado.errores.length > 0 && (
								<div className="text-sm text-destructive">
									{result.archivos_storage_resultado.errores.map(
										(err, i) => (
											<p key={i}>{err}</p>
										)
									)}
								</div>
							)}
							<details className="mt-4">
								<summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
									Ver detalles completos (JSON)
								</summary>
								<pre className="mt-2 p-3 rounded bg-muted text-xs overflow-auto max-h-80 font-mono">
									{JSON.stringify(result.registros_bd, null, 2)}
								</pre>
							</details>
						</CardContent>
					)}
				</Card>
			)}

			{/* Diálogo de confirmación */}
			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-destructive">
							Confirmar Eliminación Nuclear
						</DialogTitle>
						<DialogDescription>
							Estás a punto de eliminar permanentemente la póliza{" "}
							<strong>{numeroPoliza}</strong> y{" "}
							<strong>{totalRegistros} registros</strong> asociados. Esta
							acción NO se puede deshacer.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<p className="text-sm mb-2">
							Escribe <strong>ELIMINAR</strong> para confirmar:
						</p>
						<Input
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							placeholder="ELIMINAR"
							className="font-mono"
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setConfirmOpen(false);
								setConfirmText("");
							}}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={confirmText !== "ELIMINAR" || loading}
						>
							{loading ? "Eliminando..." : "Confirmar Eliminación"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
