"use client";

import { ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import type { DatosEspecificosPoliza } from "@/types/poliza";
import { Button } from "@/components/ui/button";

// Formularios específicos por ramo
import { AutomotorForm } from "../ramos/AutomotorForm";
import { SaludForm } from "../ramos/SaludForm";
import { IncendioForm } from "../ramos/IncendioForm";
import { ResponsabilidadCivilForm } from "../ramos/ResponsabilidadCivilForm";
import { RiesgosVariosForm } from "../ramos/RiesgosVariosForm";
import { RamosTecnicosForm } from "../ramos/RamosTecnicosForm";
import { TransporteForm } from "../ramos/TransporteForm";
import { SepelioForm } from "../ramos/SepelioForm";
import { VidaForm } from "../ramos/VidaForm";
import { AccidentesPersonalesForm } from "../ramos/AccidentesPersonalesForm";

type Props = {
	ramo: string;
	datos: DatosEspecificosPoliza | null;
	regionales: Array<{ id: string; nombre: string }>;
	onChange: (datos: DatosEspecificosPoliza) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function DatosEspecificos({ ramo, datos, regionales, onChange, onSiguiente, onAnterior }: Props) {
	// Normalizar nombre del ramo (case-insensitive)
	const ramoNormalizado = ramo.toLowerCase().trim();

	// Determinar qué componente renderizar según el ramo
	const renderFormularioEspecifico = () => {
		// Automotores
		if (ramoNormalizado.includes("automotor")) {
			return (
				<AutomotorForm
					datos={datos?.tipo_ramo === "Automotores" ? datos.datos : null}
					onChange={(datosAutomotor) => {
						onChange({
							tipo_ramo: "Automotores",
							datos: datosAutomotor,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Salud
		if (ramoNormalizado.includes("salud") || ramoNormalizado.includes("enfermedad")) {
			return (
				<SaludForm
					datos={datos?.tipo_ramo === "Salud" ? datos.datos : null}
					regionales={regionales}
					onChange={(datosSalud) => {
						onChange({
							tipo_ramo: "Salud",
							datos: datosSalud,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Incendio y Aliados
		if (ramoNormalizado.includes("incendio")) {
			return (
				<IncendioForm
					datos={datos?.tipo_ramo === "Incendio y Aliados" ? datos.datos : null}
					regionales={regionales}
					onChange={(datosIncendio) => {
						onChange({
							tipo_ramo: "Incendio y Aliados",
							datos: datosIncendio,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Responsabilidad Civil
		if (ramoNormalizado.includes("responsabilidad") || ramoNormalizado.includes("civil")) {
			return (
				<ResponsabilidadCivilForm
					datos={datos?.tipo_ramo === "Responsabilidad Civil" ? datos.datos : null}
					onChange={(datosRC) => {
						onChange({
							tipo_ramo: "Responsabilidad Civil",
							datos: datosRC,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Riesgos Varios Misceláneos
		if (ramoNormalizado.includes("riesgo") && ramoNormalizado.includes("vario")) {
			return (
				<RiesgosVariosForm
					datos={datos?.tipo_ramo === "Riesgos Varios Misceláneos" ? datos.datos : null}
					onChange={(datosRV) => {
						onChange({
							tipo_ramo: "Riesgos Varios Misceláneos",
							datos: datosRV,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Ramos Técnicos (Equipos Industriales)
		if (ramoNormalizado.includes("ramo") && ramoNormalizado.includes("tecnico")) {
			return (
				<RamosTecnicosForm
					datos={datos?.tipo_ramo === "Ramos técnicos" ? datos.datos : null}
					onChange={(datosRT) => {
						onChange({
							tipo_ramo: "Ramos técnicos",
							datos: datosRT,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Transportes
		if (ramoNormalizado.includes("transporte")) {
			return (
				<TransporteForm
					datos={datos?.tipo_ramo === "Transportes" ? datos.datos : null}
					onChange={(datosTransporte) => {
						onChange({
							tipo_ramo: "Transportes",
							datos: datosTransporte,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Accidentes Personales - Con paso 2.1 de niveles de cobertura
		if (ramoNormalizado.includes("accidente") && ramoNormalizado.includes("personal")) {
			return (
				<AccidentesPersonalesForm
					datos={datos?.tipo_ramo === "Accidentes Personales" ? datos.datos : null}
					regionales={regionales}
					onChange={(datosAccidentesPersonales) => {
						onChange({
							tipo_ramo: "Accidentes Personales",
							datos: datosAccidentesPersonales,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Vida - Con paso 2.1 de niveles de cobertura
		if (ramoNormalizado.includes("vida")) {
			return (
				<VidaForm
					datos={datos?.tipo_ramo === "Vida" ? datos.datos : null}
					regionales={regionales}
					onChange={(datosVida) => {
						onChange({
							tipo_ramo: "Vida",
							datos: datosVida,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Sepelio - Con paso 2.1 de niveles de cobertura
		if (ramoNormalizado.includes("sepelio") || ramoNormalizado.includes("defuncion") || ramoNormalizado.includes("defunción")) {
			return (
				<SepelioForm
					datos={datos?.tipo_ramo === "Sepelio" ? datos.datos : null}
					regionales={regionales}
					onChange={(datosSepelio) => {
						onChange({
							tipo_ramo: "Sepelio",
							datos: datosSepelio,
						});
					}}
					onSiguiente={onSiguiente}
					onAnterior={onAnterior}
				/>
			);
		}

		// Otros ramos (genérico)
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="text-center py-12">
					<AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-semibold mb-2">Ramo: {ramo}</h3>
					<p className="text-gray-600 mb-6">
						El formulario específico para este ramo está en desarrollo.
						<br />
						Por ahora puede continuar sin datos específicos.
					</p>
					<div className="flex justify-between pt-6 border-t">
						<Button variant="outline" onClick={onAnterior}>
							<ChevronLeft className="mr-2 h-5 w-5" />
							Anterior
						</Button>
						<Button onClick={onSiguiente}>
							Continuar (Skip)
							<ChevronRight className="ml-2 h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>
		);
	};

	return renderFormularioEspecifico();
}
