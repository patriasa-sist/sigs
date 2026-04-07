"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { VehiculoRC } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";

type TipoVehiculo = { id: string; nombre: string };
type MarcaVehiculo = { id: string; nombre: string };

type Props = {
	vehiculo: VehiculoRC | null;
	onGuardar: (vehiculo: VehiculoRC) => void;
	onCancelar: () => void;
};

const ANO_MIN = 1950;
const ANO_MAX = new Date().getFullYear() + 1;

function validar(v: Partial<VehiculoRC>): Record<string, string> {
	const errores: Record<string, string> = {};

	if (!v.placa?.trim()) {
		errores.placa = "La placa es requerida";
	}
	if (!v.nro_chasis?.trim()) {
		errores.nro_chasis = "El número de chasis es requerido";
	}
	if (!v.uso) {
		errores.uso = "El uso es requerido";
	}
	if (v.ano !== undefined && v.ano !== null) {
		if (v.ano < ANO_MIN || v.ano > ANO_MAX) {
			errores.ano = `El año debe estar entre ${ANO_MIN} y ${ANO_MAX}`;
		}
	}
	if (v.ejes !== undefined && v.ejes !== null && v.ejes < 0) {
		errores.ejes = "Los ejes deben ser 0 o más";
	}
	if (v.asientos !== undefined && v.asientos !== null && v.asientos < 0) {
		errores.asientos = "Los asientos deben ser 0 o más";
	}
	if (v.cilindrada !== undefined && v.cilindrada !== null && v.cilindrada < 0) {
		errores.cilindrada = "La cilindrada debe ser 0 o más";
	}

	return errores;
}

export function VehiculoRCModal({ vehiculo, onGuardar, onCancelar }: Props) {
	const [form, setForm] = useState<Partial<VehiculoRC>>(
		vehiculo ?? {
			placa: "",
			nro_chasis: "",
			uso: "publico",
		}
	);

	const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
	const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);
	const [cargando, setCargando] = useState(true);
	const [errores, setErrores] = useState<Record<string, string>>({});

	useEffect(() => {
		const cargar = async () => {
			try {
				const supabase = createClient();
				const [{ data: tipos }, { data: marcasData }] = await Promise.all([
					supabase.from("tipos_vehiculo").select("id, nombre").order("nombre"),
					supabase.from("marcas_vehiculo").select("id, nombre").order("nombre"),
				]);
				setTiposVehiculo(tipos ?? []);
				setMarcas(marcasData ?? []);
			} catch (e) {
				console.error("Error cargando catálogos RC:", e);
			} finally {
				setCargando(false);
			}
		};
		cargar();
	}, []);

	const set = (campo: keyof VehiculoRC, valor: string | number | undefined) => {
		setForm((prev) => ({ ...prev, [campo]: valor }));
		if (errores[campo]) {
			const copia = { ...errores };
			delete copia[campo];
			setErrores(copia);
		}
	};

	const handleGuardar = () => {
		const nuevosErrores = validar(form);
		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}
		onGuardar(form as VehiculoRC);
	};

	if (cargando) {
		return (
			<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg p-6">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
						<p className="text-sm text-gray-600">Cargando...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
					<h2 className="text-xl font-semibold">
						{vehiculo ? "Editar Vehículo" : "Agregar Vehículo"}
					</h2>
					<Button variant="ghost" size="icon" onClick={onCancelar} className="rounded-full">
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Body */}
				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* CAMPOS OBLIGATORIOS */}
						<div className="md:col-span-2">
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Campos Obligatorios</h3>
						</div>

						{/* Placa */}
						<div className="space-y-2">
							<Label htmlFor="placa">
								Placa <span className="text-red-500">*</span>
							</Label>
							<Input
								id="placa"
								value={form.placa ?? ""}
								onChange={(e) => set("placa", e.target.value.toUpperCase())}
								placeholder="Ej: 5995SLC"
								className={errores.placa ? "border-red-500" : ""}
							/>
							{errores.placa && <p className="text-sm text-red-600">{errores.placa}</p>}
						</div>

						{/* Nº de Chasis */}
						<div className="space-y-2">
							<Label htmlFor="nro_chasis">
								Nº de Chasis <span className="text-red-500">*</span>
							</Label>
							<Input
								id="nro_chasis"
								value={form.nro_chasis ?? ""}
								onChange={(e) => set("nro_chasis", e.target.value.toUpperCase())}
								placeholder="Ej: VF610A36XHD006394"
								className={errores.nro_chasis ? "border-red-500" : ""}
							/>
							{errores.nro_chasis && <p className="text-sm text-red-600">{errores.nro_chasis}</p>}
						</div>

						{/* Uso */}
						<div className="space-y-2">
							<Label htmlFor="uso">
								Uso <span className="text-red-500">*</span>
							</Label>
							<Select
								value={form.uso ?? ""}
								onValueChange={(v) => set("uso", v as VehiculoRC["uso"])}
							>
								<SelectTrigger className={errores.uso ? "border-red-500" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="publico">Público</SelectItem>
									<SelectItem value="particular">Particular</SelectItem>
									<SelectItem value="privado">Privado</SelectItem>
								</SelectContent>
							</Select>
							{errores.uso && <p className="text-sm text-red-600">{errores.uso}</p>}
						</div>

						{/* CAMPOS OPCIONALES */}
						<div className="md:col-span-2 mt-4">
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Campos Opcionales</h3>
						</div>

						{/* Tipo de Vehículo */}
						<div className="space-y-2">
							<Label>Tipo de Vehículo</Label>
							<Select
								value={form.tipo_vehiculo_id ?? ""}
								onValueChange={(v) => set("tipo_vehiculo_id", v || undefined)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione un tipo" />
								</SelectTrigger>
								<SelectContent>
									{tiposVehiculo.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											{t.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Marca */}
						<div className="space-y-2">
							<Label>Marca</Label>
							<Select
								value={form.marca_vehiculo_id ?? ""}
								onValueChange={(v) => set("marca_vehiculo_id", v || undefined)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione una marca" />
								</SelectTrigger>
								<SelectContent>
									{marcas.map((m) => (
										<SelectItem key={m.id} value={m.id}>
											{m.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Modelo */}
						<div className="space-y-2">
							<Label htmlFor="modelo">Modelo</Label>
							<Input
								id="modelo"
								value={form.modelo ?? ""}
								onChange={(e) => set("modelo", e.target.value.toUpperCase())}
								placeholder="Ej: T520, Semielíptico"
							/>
						</div>

						{/* Año */}
						<div className="space-y-2">
							<Label htmlFor="ano">Año</Label>
							<Input
								id="ano"
								type="number"
								min={ANO_MIN}
								max={ANO_MAX}
								value={form.ano ?? ""}
								onChange={(e) => set("ano", e.target.value ? parseInt(e.target.value) : undefined)}
								placeholder="2023"
								className={errores.ano ? "border-red-500" : ""}
							/>
							{errores.ano && <p className="text-sm text-red-600">{errores.ano}</p>}
						</div>

						{/* Color */}
						<div className="space-y-2">
							<Label htmlFor="color">Color</Label>
							<Input
								id="color"
								value={form.color ?? ""}
								onChange={(e) => set("color", e.target.value.toUpperCase())}
								placeholder="Ej: Blanco Combinado"
							/>
						</div>

						{/* Nº de Motor */}
						<div className="space-y-2">
							<Label htmlFor="nro_motor">Nº de Motor</Label>
							<Input
								id="nro_motor"
								value={form.nro_motor ?? ""}
								onChange={(e) => set("nro_motor", e.target.value.toUpperCase())}
								placeholder="Ej: D13-637363-K4-A"
							/>
						</div>

						{/* Servicio */}
						<div className="space-y-2">
							<Label htmlFor="servicio">Servicio</Label>
							<Input
								id="servicio"
								value={form.servicio ?? ""}
								onChange={(e) => set("servicio", e.target.value.toUpperCase())}
								placeholder="Ej: Cisterna, Trans. Carga"
							/>
						</div>

						{/* Capacidad */}
						<div className="space-y-2">
							<Label htmlFor="capacidad">Capacidad</Label>
							<Input
								id="capacidad"
								value={form.capacidad ?? ""}
								onChange={(e) => set("capacidad", e.target.value.toUpperCase())}
								placeholder="Ej: 36.000 Litros, 20 TN"
							/>
						</div>

						{/* Región de Uso */}
						<div className="space-y-2">
							<Label htmlFor="region_uso">Región de Uso</Label>
							<Input
								id="region_uso"
								value={form.region_uso ?? ""}
								onChange={(e) => set("region_uso", e.target.value.toUpperCase())}
								placeholder="Ej: Nacional, Países del Conosur"
							/>
						</div>

						{/* Tipo de Carrocería */}
						<div className="space-y-2">
							<Label htmlFor="tipo_carroceria">Tipo de Carrocería</Label>
							<Input
								id="tipo_carroceria"
								value={form.tipo_carroceria ?? ""}
								onChange={(e) => set("tipo_carroceria", e.target.value.toUpperCase())}
								placeholder="Ej: Cisterna, Plataforma"
							/>
						</div>

						{/* Propiedad */}
						<div className="space-y-2">
							<Label>Propiedad</Label>
							<Select
								value={form.propiedad ?? ""}
								onValueChange={(v) => set("propiedad", v || undefined)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="privada">Privada</SelectItem>
									<SelectItem value="publica">Pública</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Ejes */}
						<div className="space-y-2">
							<Label htmlFor="ejes">Ejes</Label>
							<Input
								id="ejes"
								type="number"
								min={0}
								value={form.ejes ?? ""}
								onChange={(e) => set("ejes", e.target.value ? parseInt(e.target.value) : undefined)}
								placeholder="Ej: 3"
								className={errores.ejes ? "border-red-500" : ""}
							/>
							{errores.ejes && <p className="text-sm text-red-600">{errores.ejes}</p>}
						</div>

						{/* Asientos */}
						<div className="space-y-2">
							<Label htmlFor="asientos">Asientos</Label>
							<Input
								id="asientos"
								type="number"
								min={0}
								value={form.asientos ?? ""}
								onChange={(e) => set("asientos", e.target.value ? parseInt(e.target.value) : undefined)}
								placeholder="Ej: 2"
								className={errores.asientos ? "border-red-500" : ""}
							/>
							{errores.asientos && <p className="text-sm text-red-600">{errores.asientos}</p>}
						</div>

						{/* Cilindrada */}
						<div className="space-y-2">
							<Label htmlFor="cilindrada">Cilindrada</Label>
							<Input
								id="cilindrada"
								type="number"
								min={0}
								value={form.cilindrada ?? ""}
								onChange={(e) => set("cilindrada", e.target.value ? parseInt(e.target.value) : undefined)}
								placeholder="Ej: 12800"
								className={errores.cilindrada ? "border-red-500" : ""}
							/>
							{errores.cilindrada && <p className="text-sm text-red-600">{errores.cilindrada}</p>}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
					<Button variant="outline" onClick={onCancelar}>
						Cancelar
					</Button>
					<Button onClick={handleGuardar}>
						{vehiculo ? "Guardar Cambios" : "Agregar Vehículo"}
					</Button>
				</div>
			</div>
		</div>
	);
}
