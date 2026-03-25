"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PolizasPendientesTable from "./PolizasPendientesTable";
import AnexosPendientesTable from "./AnexosPendientesTable";
import type { AnexoPendiente } from "@/app/gerencia/validacion-anexos/actions";

type Props = {
	polizas: Array<Record<string, unknown>>;
	anexos: AnexoPendiente[];
};

export function ValidacionTabs({ polizas, anexos }: Props) {
	return (
		<Tabs defaultValue="polizas" className="w-full">
			<TabsList className="grid w-full max-w-md grid-cols-2">
				<TabsTrigger value="polizas" className="flex items-center gap-2">
					Pólizas
					{polizas.length > 0 && (
						<Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs">
							{polizas.length}
						</Badge>
					)}
				</TabsTrigger>
				<TabsTrigger value="anexos" className="flex items-center gap-2">
					Anexos
					{anexos.length > 0 && (
						<Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs">
							{anexos.length}
						</Badge>
					)}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="polizas" className="mt-4">
				{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
				<PolizasPendientesTable polizas={polizas as any} />
			</TabsContent>

			<TabsContent value="anexos" className="mt-4">
				<AnexosPendientesTable anexos={anexos} />
			</TabsContent>
		</Tabs>
	);
}
