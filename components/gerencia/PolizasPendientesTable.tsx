"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, ChevronRight, Inbox } from "lucide-react";
import { PolizaValidacionDrawer } from "./PolizaValidacionDrawer";
import { formatCurrency } from "@/utils/formatters";

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
	compania?: { nombre?: string } | null;
	responsable?: { full_name?: string } | null;
	created_by_user?: { full_name?: string } | null;
	regional?: { nombre?: string } | null;
};

interface Props {
	polizas: PolizaPendiente[];
}

/** Devuelve "Hoy", "Ayer", "Hace 3d", "Hace 2h", etc. */
function tiempoTranscurrido(dateString: string): string {
	const now = new Date();
	const created = new Date(dateString);
	const diffMs = now.getTime() - created.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

	if (diffDays === 0) {
		if (diffHours === 0) return "Recién";
		return `Hace ${diffHours}h`;
	}
	if (diffDays === 1) return "Ayer";
	return `Hace ${diffDays}d`;
}

/** Clases para la barra de antigüedad en el borde izquierdo de cada fila */
function urgencyClasses(dateString: string): string {
	const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
	if (diffDays >= 7) return "border-l-2 border-l-rose-400";
	if (diffDays >= 3) return "border-l-2 border-l-amber-400";
	return "";
}

export default function PolizasPendientesTable({ polizas: initialPolizas }: Props) {
	const [polizas, setPolizas] = useState(initialPolizas);
	const [drawerPolizaId, setDrawerPolizaId] = useState<string | null>(null);
	const [drawerNumero, setDrawerNumero] = useState("");

	const openDrawer = (p: PolizaPendiente) => {
		setDrawerNumero(p.numero_poliza);
		setDrawerPolizaId(p.id);
	};

	const handleValidated = (id: string) => {
		setPolizas((prev) => prev.filter((p) => p.id !== id));
		setDrawerPolizaId(null);
	};

	const handleRejected = (id: string) => {
		setPolizas((prev) => prev.filter((p) => p.id !== id));
		setDrawerPolizaId(null);
	};

	if (polizas.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-bg mb-4">
					<Inbox className="h-6 w-6 text-accent" />
				</span>
				<p className="text-sm font-medium text-foreground">Sin pólizas pendientes</p>
				<p className="text-sm text-muted-foreground mt-1">Todas las pólizas han sido procesadas</p>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-lg border border-border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-secondary hover:bg-secondary">
							<TableHead className="h-9 text-xs font-medium text-muted-foreground px-4">
								N° Póliza
							</TableHead>
							<TableHead className="h-9 text-xs font-medium text-muted-foreground">Compañía</TableHead>
							<TableHead className="h-9 text-xs font-medium text-muted-foreground">Ramo</TableHead>
							<TableHead className="h-9 text-xs font-medium text-muted-foreground text-right">
								Prima total
							</TableHead>
							<TableHead className="h-9 text-xs font-medium text-muted-foreground">Responsable</TableHead>
							<TableHead className="h-9 text-xs font-medium text-muted-foreground">Ingresado</TableHead>
							<TableHead className="h-9 text-xs font-medium text-muted-foreground text-right pr-4">
								Acción
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{polizas.map((poliza) => (
							<TableRow
								key={poliza.id}
								className={`cursor-pointer hover:bg-secondary/50 ${urgencyClasses(poliza.created_at)}`}
								onClick={() => openDrawer(poliza)}
							>
								<TableCell className="py-3 px-4 font-mono text-sm font-medium text-foreground">
									{poliza.numero_poliza}
								</TableCell>
								<TableCell className="py-3 max-w-[160px]">
									<span
										className="truncate block text-sm text-foreground"
										title={poliza.compania?.nombre ?? "—"}
									>
										{poliza.compania?.nombre ?? "—"}
									</span>
								</TableCell>
								<TableCell className="py-3">
									<Badge variant="secondary" className="text-xs rounded-md">
										{poliza.ramo}
									</Badge>
								</TableCell>
								<TableCell className="py-3 text-right tabular-nums text-sm font-medium text-foreground">
									{formatCurrency(poliza.prima_total, poliza.moneda)}
								</TableCell>
								<TableCell className="py-3">
									<span
										className="truncate block text-sm text-foreground max-w-[120px]"
										title={poliza.responsable?.full_name ?? "—"}
									>
										{poliza.responsable?.full_name ?? "—"}
									</span>
									<span className="text-xs text-muted-foreground">
										{poliza.created_by_user?.full_name ?? "—"}
									</span>
								</TableCell>
								<TableCell className="py-3">
									<span
										className={`text-sm font-medium ${
											Math.floor(
												(Date.now() - new Date(poliza.created_at).getTime()) /
													(1000 * 60 * 60 * 24),
											) >= 3
												? "text-amber-700"
												: "text-muted-foreground"
										}`}
									>
										{tiempoTranscurrido(poliza.created_at)}
									</span>
								</TableCell>
								<TableCell className="py-3 pr-4">
									<div className="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-accent hover:text-accent hover:bg-accent-bg"
											title="Validar directamente"
											onClick={(e) => {
												e.stopPropagation();
												openDrawer(poliza);
											}}
										>
											<CheckCircle className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/5"
											title="Rechazar"
											onClick={(e) => {
												e.stopPropagation();
												openDrawer(poliza);
											}}
										>
											<XCircle className="h-4 w-4" />
										</Button>
										<ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<PolizaValidacionDrawer
				polizaId={drawerPolizaId}
				numeroPoliza={drawerNumero}
				onClose={() => setDrawerPolizaId(null)}
				onValidated={handleValidated}
				onRejected={handleRejected}
			/>
		</>
	);
}
