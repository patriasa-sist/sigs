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
import { CheckCircle, XCircle, Eye } from "lucide-react";
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
	client?: {
		client_type: string;
		natural_clients?: Array<{
			primer_nombre?: string;
			segundo_nombre?: string;
			primer_apellido?: string;
			segundo_apellido?: string;
			numero_documento?: string;
		}> | null;
		juridic_clients?: Array<{
			razon_social?: string;
			nit?: string;
		}> | null;
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

	// Formatear nombre del cliente
	const formatClientName = (poliza: PolizaPendiente) => {
		if (!poliza.client) return "N/A";

		if (poliza.client.client_type === "natural") {
			const natural = poliza.client.natural_clients?.[0];
			if (!natural) return "N/A";
			return `${natural.primer_nombre} ${natural.segundo_nombre || ""} ${natural.primer_apellido} ${natural.segundo_apellido || ""}`.trim();
		} else {
			const juridic = poliza.client.juridic_clients?.[0];
			return juridic?.razon_social || "N/A";
		}
	};

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
			<div className="bg-white rounded-lg border shadow-sm">
				<div className="p-4 border-b">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">
							Pólizas Pendientes ({polizas.length})
						</h2>
						<Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
							Pendiente de validación
						</Badge>
					</div>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nro. Póliza</TableHead>
							<TableHead>Asegurado</TableHead>
							<TableHead>Compañía</TableHead>
							<TableHead>Ramo</TableHead>
							<TableHead>Prima Total</TableHead>
							<TableHead>Vigencia</TableHead>
							<TableHead>Responsable</TableHead>
							<TableHead>Creado por</TableHead>
							<TableHead className="text-right">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{polizas.map((poliza) => (
							<TableRow key={poliza.id}>
								<TableCell className="font-medium">{poliza.numero_poliza}</TableCell>
								<TableCell>{formatClientName(poliza)}</TableCell>
								<TableCell>{poliza.compania?.nombre || "N/A"}</TableCell>
								<TableCell>
									<Badge variant="secondary">{poliza.ramo}</Badge>
								</TableCell>
								<TableCell>{formatCurrency(poliza.prima_total, poliza.moneda)}</TableCell>
								<TableCell>
									<div className="text-sm">
										<div>{formatDate(poliza.inicio_vigencia)}</div>
										<div className="text-gray-500">{formatDate(poliza.fin_vigencia)}</div>
									</div>
								</TableCell>
								<TableCell>{poliza.responsable?.full_name || "N/A"}</TableCell>
								<TableCell>
									<div className="text-sm">
										<div>{poliza.created_by_user?.full_name || "N/A"}</div>
										<div className="text-gray-500 text-xs">
											{formatDate(poliza.created_at)}
										</div>
									</div>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex gap-2 justify-end">
										<Button
											variant="outline"
											size="sm"
											onClick={() => verDetallePoliza(poliza.id)}
										>
											<Eye className="h-4 w-4 mr-1" />
											Ver
										</Button>
										<Button
											variant="default"
											size="sm"
											onClick={() => openDialog(poliza, "validar")}
											disabled={loading === poliza.id}
										>
											<CheckCircle className="h-4 w-4 mr-1" />
											{loading === poliza.id ? "Validando..." : "Validar"}
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => openRechazoModal(poliza)}
											disabled={loading === poliza.id}
										>
											<XCircle className="h-4 w-4 mr-1" />
											Rechazar
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
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
						<div className="py-4 space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-gray-500">Asegurado:</span>
								<span className="font-medium">{formatClientName(selectedPoliza)}</span>
							</div>
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
