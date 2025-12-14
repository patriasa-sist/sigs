"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PolizaConPagos, CuotaPago } from "@/types/cobranza";

interface CuotasModalProps {
	poliza: PolizaConPagos | null;
	open: boolean;
	onClose: () => void;
	onSelectQuota: (cuota: CuotaPago) => void;
}

/**
 * Modal que muestra todas las cuotas de una póliza
 * Permite seleccionar una cuota para registrar pago
 */
export default function CuotasModal({ poliza, open, onClose, onSelectQuota }: CuotasModalProps) {
	if (!poliza) return null;

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString("es-BO", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-BO", {
			style: "decimal",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	const getEstadoBadge = (estado: string) => {
		switch (estado) {
			case "pendiente":
				return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
			case "vencido":
				return <Badge variant="destructive">Vencido</Badge>;
			case "parcial":
				return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Parcial</Badge>;
			case "pagado":
				return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pagado</Badge>;
			default:
				return <Badge variant="outline">{estado}</Badge>;
		}
	};

	const puedeRegistrarPago = (estado: string) => {
		return estado === "pendiente" || estado === "vencido" || estado === "parcial";
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl">
						Cuotas de Póliza {poliza.numero_poliza}
					</DialogTitle>
					<DialogDescription>
						<div className="space-y-1">
							<p><strong>Cliente:</strong> {poliza.client.nombre_completo}</p>
							<p><strong>Compañía:</strong> {poliza.compania.nombre}</p>
							<p><strong>Ramo:</strong> {poliza.ramo}</p>
							<p><strong>Prima Total:</strong> {poliza.moneda} {formatCurrency(poliza.prima_total)}</p>
						</div>
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4">
					<div className="rounded-md border">
						<table className="w-full">
							<thead className="bg-muted/50">
								<tr>
									<th className="p-3 text-left text-sm font-medium">N° Cuota</th>
									<th className="p-3 text-left text-sm font-medium">Monto</th>
									<th className="p-3 text-left text-sm font-medium">F. Vencimiento</th>
									<th className="p-3 text-left text-sm font-medium">F. Pago</th>
									<th className="p-3 text-left text-sm font-medium">Estado</th>
									<th className="p-3 text-left text-sm font-medium">Acciones</th>
								</tr>
							</thead>
							<tbody>
								{poliza.cuotas.map((cuota, index) => (
									<tr
										key={cuota.id}
										className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
									>
										<td className="p-3 text-sm">{cuota.numero_cuota}</td>
										<td className="p-3 text-sm font-medium">
											{poliza.moneda} {formatCurrency(cuota.monto)}
										</td>
										<td className="p-3 text-sm">{formatDate(cuota.fecha_vencimiento)}</td>
										<td className="p-3 text-sm">{formatDate(cuota.fecha_pago)}</td>
										<td className="p-3 text-sm">{getEstadoBadge(cuota.estado)}</td>
										<td className="p-3 text-sm">
											{puedeRegistrarPago(cuota.estado) ? (
												<Button
													size="sm"
													variant="default"
													onClick={() => {
														onSelectQuota(cuota);
														onClose();
													}}
												>
													Registrar Pago
												</Button>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{poliza.cuotas.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							No hay cuotas registradas para esta póliza
						</div>
					)}
				</div>

				<div className="mt-4 flex justify-end">
					<Button variant="outline" onClick={onClose}>
						Cerrar
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
