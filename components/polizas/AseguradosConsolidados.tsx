"use client";

/**
 * Lista global consolidada de asegurados (pólizas de personas: Salud, AP,
 * Vida, Sepelio). Solo lectura: madre + inclusiones − exclusiones de anexos
 * ACTIVOS, con historial de altas/bajas por persona. Carga perezosa: consulta
 * al servidor recién al expandir la sección.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { obtenerAseguradosConsolidados, type AseguradoConsolidado } from "@/app/polizas/asegurados/actions";
import { formatDate } from "@/utils/formatters";
import { captureError } from "@/utils/sentry";

type Props = {
	polizaId: string;
	ramo: string;
};

const ESTADO_BADGE = {
	activo: { label: "Activo", className: "bg-success/15 text-success border-success/30" },
	excluido: { label: "Excluido", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function Historial({ eventos }: { eventos: AseguradoConsolidado["eventos"] }) {
	return (
		<div className="space-y-0.5">
			{eventos.map((e, idx) => (
				<div key={idx} className="text-xs leading-tight">
					<span className={e.tipo === "alta" ? "text-success font-medium" : "text-destructive font-medium"}>
						{e.tipo === "alta" ? "Alta" : "Baja"}
					</span>{" "}
					<span className="text-muted-foreground">
						{formatDate(e.fecha)} · {e.origen}
					</span>
				</div>
			))}
		</div>
	);
}

export default function AseguradosConsolidados({ polizaId, ramo }: Props) {
	const soportado = useMemo(() => {
		const r = ramo
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "");
		return (
			r.includes("salud") ||
			r.includes("enfermedad") ||
			r.includes("accidente") ||
			r.includes("vida") ||
			r.includes("sepelio") ||
			r.includes("defuncion")
		);
	}, [ramo]);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [asegurados, setAsegurados] = useState<AseguradoConsolidado[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	if (!soportado) return null;

	const toggle = async () => {
		const next = !open;
		setOpen(next);
		if (next && asegurados === null && !loading) {
			setLoading(true);
			setError(null);
			try {
				const result = await obtenerAseguradosConsolidados(polizaId);
				if (!result.success) {
					setError(result.error);
				} else if (result.ramoSoportado) {
					setAsegurados(result.asegurados);
				} else {
					setAsegurados([]);
				}
			} catch (err) {
				captureError(err, "AseguradosConsolidados.toggle", { polizaId });
				setError("Error al cargar los asegurados");
			}
			setLoading(false);
		}
	};

	const activos = (asegurados || []).filter((a) => a.estado === "activo").length;
	const excluidos = (asegurados || []).length - activos;

	return (
		<div className="rounded-lg border bg-card">
			<button
				onClick={toggle}
				className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors rounded-lg"
			>
				<span className="flex items-center gap-2 text-sm font-medium text-foreground">
					<Users className="h-4 w-4 text-muted-foreground" />
					Lista global de asegurados
					{asegurados !== null && (
						<span className="text-muted-foreground font-normal">
							· {activos} {activos === 1 ? "activo" : "activos"}
							{excluidos > 0 && `, ${excluidos} ${excluidos === 1 ? "excluido" : "excluidos"}`}
						</span>
					)}
				</span>
				{open ? (
					<ChevronUp className="h-4 w-4 text-muted-foreground" />
				) : (
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				)}
			</button>

			{open && (
				<div className="border-t px-4 py-3">
					{loading && (
						<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Cargando asegurados...
						</div>
					)}

					{error && <p className="py-3 text-sm text-destructive">{error}</p>}

					{!loading && !error && asegurados !== null && asegurados.length === 0 && (
						<p className="py-3 text-sm text-muted-foreground">
							Esta póliza no tiene asegurados registrados.
						</p>
					)}

					{!loading && !error && asegurados !== null && asegurados.length > 0 && (
						<>
							{/* Tabla (md+) */}
							<div className="hidden md:block rounded-lg border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="h-8 text-xs">Asegurado</TableHead>
											<TableHead className="h-8 text-xs">Documento</TableHead>
											<TableHead className="h-8 text-xs">Rol / Cargo</TableHead>
											<TableHead className="h-8 text-xs">Nivel</TableHead>
											<TableHead className="h-8 text-xs">Estado</TableHead>
											<TableHead className="h-8 text-xs">Historial</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{asegurados.map((a, idx) => {
											const badge = ESTADO_BADGE[a.estado];
											return (
												<TableRow key={idx}>
													<TableCell className="py-1.5 font-medium">{a.nombre}</TableCell>
													<TableCell className="py-1.5">{a.documento}</TableCell>
													<TableCell className="py-1.5">
														{[a.rol, a.cargo].filter(Boolean).join(" · ") || "-"}
													</TableCell>
													<TableCell className="py-1.5">{a.nivel || "-"}</TableCell>
													<TableCell className="py-1.5">
														<Badge variant="outline" className={badge.className}>
															{badge.label}
														</Badge>
													</TableCell>
													<TableCell className="py-1.5">
														<Historial eventos={a.eventos} />
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							{/* Tarjetas (< md) */}
							<div className="md:hidden space-y-3">
								{asegurados.map((a, idx) => {
									const badge = ESTADO_BADGE[a.estado];
									return (
										<div key={idx} className="rounded-lg border bg-card p-3">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<div className="font-medium text-sm text-foreground">
														{a.nombre}
													</div>
													<div className="text-xs text-muted-foreground mt-0.5">
														{a.documento}
														{a.nivel && ` · ${a.nivel}`}
														{[a.rol, a.cargo].filter(Boolean).length > 0 &&
															` · ${[a.rol, a.cargo].filter(Boolean).join(" · ")}`}
													</div>
												</div>
												<Badge variant="outline" className={`${badge.className} shrink-0`}>
													{badge.label}
												</Badge>
											</div>
											<div className="mt-2">
												<Historial eventos={a.eventos} />
											</div>
										</div>
									);
								})}
							</div>

							<p className="mt-2 text-xs text-muted-foreground">
								Consolida los asegurados de la póliza y sus anexos validados (inclusiones y
								exclusiones). Los anexos pendientes de validación no se reflejan.
							</p>
						</>
					)}
				</div>
			)}
		</div>
	);
}
