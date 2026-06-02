"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Shuffle, ClipboardList } from "lucide-react";
import type { ExcepcionDocumentoVista } from "@/types/clienteDocumento";
import type { AuditorUif } from "@/types/auditoria";
import { ExcepcionesPanel } from "./ExcepcionesPanel";
import { SamplingPanel } from "./SamplingPanel";
import { HistorialRevisionesPanel } from "./HistorialRevisionesPanel";

type Props = {
	excepcionesIniciales: ExcepcionDocumentoVista[];
	usuarios: { id: string; email: string; role: string; full_name: string | null }[];
	isAdmin: boolean;
	auditores: AuditorUif[];
};

export function AuditoriaContent({ excepcionesIniciales, usuarios, isAdmin, auditores }: Props) {
	return (
		<Tabs defaultValue="excepciones">
			<TabsList>
				<TabsTrigger value="excepciones">
					<ShieldCheck className="h-4 w-4 mr-1.5" />
					Excepciones
				</TabsTrigger>
				<TabsTrigger value="sampling">
					<Shuffle className="h-4 w-4 mr-1.5" />
					Sampling
				</TabsTrigger>
				<TabsTrigger value="historial">
					<ClipboardList className="h-4 w-4 mr-1.5" />
					Historial
				</TabsTrigger>
			</TabsList>

			<TabsContent value="excepciones">
				<ExcepcionesPanel
					excepcionesIniciales={excepcionesIniciales}
					usuarios={usuarios}
				/>
			</TabsContent>

			<TabsContent value="sampling">
				<SamplingPanel />
			</TabsContent>

			<TabsContent value="historial">
				<HistorialRevisionesPanel isAdmin={isAdmin} auditores={auditores} />
			</TabsContent>
		</Tabs>
	);
}
