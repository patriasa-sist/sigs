"use client";

import { Client, ClientSearchResult } from "@/types/client";
import { getActivePolicyCount } from "@/utils/clientHelpers";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

interface ClientTableProps {
	clients: Client[] | ClientSearchResult[];
	searchMode?: boolean;
	onClientClick?: (client: Client | ClientSearchResult) => void;
}

export function ClientTable({ clients, searchMode = false, onClientClick }: ClientTableProps) {
	const isFieldMatched = (client: Client | ClientSearchResult, fieldName: string) => {
		return searchMode && "matchedFields" in client && client.matchedFields.includes(fieldName);
	};

	if (clients.length === 0) return null;

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b border-border">
						<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Nombre
						</th>
						<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
							CI / NIT
						</th>
						<th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Ejecutivo
						</th>
						<th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Pólizas Activas
						</th>
						<th className="w-8" />
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{clients.map((client) => {
						const activePolicyCount = getActivePolicyCount(client);
						return (
							<tr
								key={client.id}
								onClick={() => onClientClick?.(client)}
								className="group hover:bg-muted/40 cursor-pointer transition-colors duration-100"
							>
								{/* Name */}
								<td className="px-4 py-3">
									<span
										className={`text-sm font-medium text-foreground${
											isFieldMatched(client, "fullName")
												? " bg-amber-50 text-amber-900 px-1 rounded"
												: ""
										}`}
									>
										{client.fullName}
									</span>
								</td>

								{/* CI + NIT stacked */}
								<td className="px-4 py-3">
									<div
										className={`text-sm text-foreground tabular-nums${
											isFieldMatched(client, "idNumber")
												? " bg-amber-50 text-amber-900 px-1 rounded"
												: ""
										}`}
									>
										{client.idNumber}
									</div>
									{client.nit ? (
										<div
											className={`text-xs text-muted-foreground mt-0.5 tabular-nums${
												isFieldMatched(client, "nit")
													? " bg-amber-50 text-amber-900 px-1 rounded"
													: ""
											}`}
										>
											NIT: {client.nit}
										</div>
									) : (
										<div className="text-xs text-muted-foreground/50 mt-0.5">NIT: —</div>
									)}
								</td>

								{/* Ejecutivo */}
								<td className="px-4 py-3">
									<span className="text-sm text-muted-foreground">
										{client.executiveInCharge || "—"}
									</span>
								</td>

								{/* Active policies badge */}
								<td className="px-4 py-3 text-center">
									<Badge
										variant="outline"
										className={
											activePolicyCount > 0
												? "bg-teal-50 text-teal-800 border-teal-200"
												: "bg-slate-100 text-slate-500 border-slate-200"
										}
									>
										{activePolicyCount}
									</Badge>
								</td>

								{/* Arrow */}
								<td className="pr-3 py-3">
									<ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
