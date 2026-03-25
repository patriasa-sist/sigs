"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validarPoliza, rechazarPoliza } from "@/app/gerencia/validacion/actions";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { RechazoPolizaModal } from "./RechazoPolizaModal";

type PolizaPendiente = {
	id: string;
	numero_poliza: string;
	ramo: string;
	prima_total: number;
	prima_neta: number;
	moneda: string;
	modalidad_pago: string;
	inicio_vigencia: string;
	fin_vigencia: string;
	created_at: string;
	compania?: {
		nombre?: string;
	} | null;
	responsable?: {
		full_name?: string;
	} | null;
	created_by_user?: {
		full_name?: string;
	} | null;
	regional?: {
		nombre?: string;
	} | null;
};

interface Props {
	polizas: PolizaPendiente[];
}

export default function PolizasPendientesTable({ polizas: initialPolizas }: Props) {
	const router = useRouter();
	const [polizas, setPolizas] = useState(initialPolizas);
	const [loading, setLoading] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedPoliza, setSelectedPoliza] = useState<PolizaPendiente | null>(null);
	const [dialogType, setDialogType] = useState<"validar" | "rechazar">("validar");
	// Estado para el modal de rechazo
	const [rechazoModalOpen, setRechazoModalOpen] = useState(false);
	const [polizaArechazar, setPolizaArechazar] = useState<PolizaPendiente | null>(null);

	// Formatear fecha
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	// Formatear moneda
	const formatCurrency = (amount: number, currency: string) => {
		return `${currency} ${amount.toLocaleString("es-BO", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	};

	// Manejar validación
	const handleValidar = async (polizaId: string) => {
		setLoading(polizaId);
		const result = await validarPoliza(polizaId);

		if (result.success) {
			// Remover de la lista
			setPolizas((prev) => prev.filter((p) => p.id !== polizaId));
			setDialogOpen(false);
		} else {
			alert(`Error: ${result.error}`);
		}

		setLoading(null);
	};

	// Manejar rechazo con motivo
	const handleRechazar = async (motivo: string) => {
		if (!polizaArechazar) return;

		setLoading(polizaArechazar.id);
		const result = await rechazarPoliza(polizaArechazar.id, motivo);

		if (result.success) {
			// Remover de la lista
			setPolizas((prev) => prev.filter((p) => p.id !== polizaArechazar.id));
			setRechazoModalOpen(false);
			setPolizaArechazar(null);
		} else {
			alert(`Error: ${result.error}`);
		}

		setLoading(null);
	};

	// Abrir modal de rechazo
	const openRechazoModal = (poliza: PolizaPendiente) => {
		setPolizaArechazar(poliza);
		setRechazoModalOpen(true);
	};

	// Abrir diálogo de confirmación
	const openDialog = (poliza: PolizaPendiente, type: "validar" | "rechazar") => {
		setSelectedPoliza(poliza);
		setDialogType(type);
		setDialogOpen(true);
	};

	// Navegar al detalle de la póliza
	const verDetallePoliza = (polizaId: string) => {
		router.push(`/polizas/${polizaId}`);
	};

	if (polizas.length === 0) {
		return (
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
				<p className="text-blue-800 text-lg font-medium">
					No hay pólizas pendientes de validación
				</p>
				<p className="text-blue-600 text-sm mt-2">
					Todas las pólizas han sido validadas
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="h-8 text-xs">Nro. Póliza</TableHead>
							<TableHead className="h-8 text-xs">Compañía</TableHead>
							<TableHead className="h-8 text-xs">Ramo</TableHead>
							<TableHead className="h-8 text-xs text-right">Prima Total</TableHead>
							<TableHead className="h-8 text-xs">Vigencia</TableHead>
							<TableHead className="h-8 text-xs">Responsable</TableHead>
							<TableHead className="h-8 text-xs">Creado</TableHead>
							<TableHead className="h-8 text-xs text-center">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{polizas.map((poliza) => {
							const isLoading = loading === poliza.id;
							return (
								<TableRow key={poliza.id}>
									<TableCell className="py-1.5 font-medium">{poliza.numero_poliza}</TableCell>
									<TableCell className="py-1.5 max-w-[180px] truncate" title={poliza.compania?.nombre || "N/A"}>{poliza.compania?.nombre || "N/A"}</TableCell>
									<TableCell className="py-1.5">
										<Badge variant="secondary" className="text-xs">{poliza.ramo}</Badge>
									</TableCell>
									<TableCell className="py-1.5 text-right">{formatCurrency(poliza.prima_total, poliza.moneda)}</TableCell>
									<TableCell className="py-1.5">
										<div className="text-xs leading-tight">
											<div>{formatDate(poliza.inicio_vigencia)}</div>
											<div className="text-muted-foreground">{formatDate(poliza.fin_vigencia)}</div>
										</div>
									</TableCell>
									<TableCell className="py-1.5 max-w-[120px] truncate" title={poliza.responsable?.full_name || "N/A"}>{poliza.responsable?.full_name || "N/A"}</TableCell>
									<TableCell className="py-1.5">
										<div className="text-xs leading-tight">
											<div className="truncate max-w-[100px]" title={poliza.created_by_user?.full_name || "N/A"}>{poliza.created_by_user?.full_name || "N/A"}</div>
											<div className="text-muted-foreground">{formatDate(poliza.created_at)}</div>
										</div>
									</TableCell>
									<TableCell className="py-1.5">
										<div className="flex justify-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												onClick={() => verDetallePoliza(poliza.id)}
												title="Ver detalle"
											>
												<Eye className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
												onClick={() => openDialog(poliza, "validar")}
												disabled={isLoading}
												title="Validar"
											>
												{isLoading ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<CheckCircle className="h-4 w-4" />
												)}
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
												onClick={() => openRechazoModal(poliza)}
												disabled={isLoading}
												title="Rechazar"
											>
												<XCircle className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{/* Diálogo de confirmación */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{dialogType === "validar" ? "Validar Póliza" : "Rechazar Póliza"}
						</DialogTitle>
						<DialogDescription>
							{selectedPoliza && (
								<>
									¿Está seguro que desea {dialogType === "validar" ? "validar" : "rechazar"} la póliza{" "}
									<strong>{selectedPoliza.numero_poliza}</strong>?
								</>
							)}
						</DialogDescription>
					</DialogHeader>

					{selectedPoliza && (
						<div className="py-4">
							<div className="flex justify-between text-sm">
								<span className="text-gray-500">Prima Total:</span>
								<span className="font-medium">
									{formatCurrency(selectedPoliza.prima_total, selectedPoliza.moneda)}
								</span>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancelar
						</Button>
						{dialogType === "validar" && selectedPoliza && (
							<Button
								onClick={() => handleValidar(selectedPoliza.id)}
								disabled={loading === selectedPoliza.id}
							>
								<CheckCircle className="h-4 w-4 mr-2" />
								Confirmar Validación
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Modal de rechazo con motivo obligatorio */}
			<RechazoPolizaModal
				isOpen={rechazoModalOpen}
				onClose={() => {
					setRechazoModalOpen(false);
					setPolizaArechazar(null);
				}}
				onConfirm={handleRechazar}
				poliza={polizaArechazar}
				isLoading={loading === polizaArechazar?.id}
			/>
		</>
	);
}
