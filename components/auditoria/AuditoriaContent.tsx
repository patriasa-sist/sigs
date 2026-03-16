"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Shuffle } from "lucide-react";
import type { ExcepcionDocumentoVista } from "@/types/clienteDocumento";
import { ExcepcionesPanel } from "./ExcepcionesPanel";
import { SamplingPanel } from "./SamplingPanel";

type Props = {
	excepcionesIniciales: ExcepcionDocumentoVista[];
	usuarios: { id: string; email: string; role: string; full_name: string | null }[];
};

export function AuditoriaContent({ excepcionesIniciales, usuarios }: Props) {
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
		</Tabs>
	);
}
