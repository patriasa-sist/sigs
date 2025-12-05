"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { VehiculoAutomotor, TipoVehiculo, MarcaVehiculo } from "@/types/poliza";
import { validarVehiculoAutomotor } from "@/utils/polizaValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";

type Props = {
	vehiculo: VehiculoAutomotor | null;
	onGuardar: (vehiculo: VehiculoAutomotor) => void;
	onCancelar: () => void;
};

export function VehiculoModal({ vehiculo, onGuardar, onCancelar }: Props) {
	const [formData, setFormData] = useState<Partial<VehiculoAutomotor>>(
		vehiculo || {
			placa: "",
			valor_asegurado: 0,
			franquicia: 0,
			nro_chasis: "",
			uso: "particular",
			tipo_vehiculo_id: undefined,
			marca_id: undefined,
			modelo: "",
			ano: "",
			color: "",
			ejes: undefined,
			nro_motor: "",
			nro_asientos: undefined,
			plaza_circulacion: "",
		}
	);

	const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
	const [marcas, setMarcas] = useState<MarcaVehiculo[]>([]);
	const [cargando, setCargando] = useState(true);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// Cargar catálogos
	useEffect(() => {
		cargarCatalogos();
	}, []);

	const cargarCatalogos = async () => {
		try {
			const supabase = createClient();

			const [{ data: tiposData, error: errorTipos }, { data: marcasData, error: errorMarcas }] = await Promise.all([
				supabase.from("tipos_vehiculo").select("*").eq("activo", true).order("nombre"),
				supabase.from("marcas_vehiculo").select("*").eq("activo", true).order("nombre"),
			]);

			if (errorTipos) {
				console.error("Error cargando tipos de vehículo:", errorTipos);
			}

			if (errorMarcas) {
				console.error("Error cargando marcas:", errorMarcas);
			}

			setTiposVehiculo(tiposData || []);
			setMarcas(marcasData || []);
		} catch (error) {
			console.error("Error cargando catálogos:", error);
		} finally {
			setCargando(false);
		}
	};

	const handleChange = (campo: keyof VehiculoAutomotor, valor: string | number) => {
		setFormData((prev) => ({
			...prev,
			[campo]: valor,
		}));

		// Limpiar error del campo
		if (errores[campo]) {
			const nuevosErrores = { ...errores };
			delete nuevosErrores[campo];
			setErrores(nuevosErrores);
		}
	};

	const handleGuardar = () => {
		const validacion = validarVehiculoAutomotor(formData);

		if (!validacion.valido) {
			const nuevosErrores: Record<string, string> = {};
			validacion.errores.forEach((error) => {
				nuevosErrores[error.campo] = error.mensaje;
			});
			setErrores(nuevosErrores);
			return;
		}

		onGuardar(formData as VehiculoAutomotor);
	};

	if (cargando) {
		return (
			<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg p-6">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
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
					<h2 className="text-xl font-semibold">{vehiculo ? "Editar Vehículo" : "Agregar Vehículo"}</h2>
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
								value={formData.placa}
								onChange={(e) => handleChange("placa", e.target.value.toUpperCase())}
								placeholder="Ej: ABC-123"
								className={errores.placa ? "border-red-500" : ""}
							/>
							{errores.placa && <p className="text-sm text-red-600">{errores.placa}</p>}
						</div>

						{/* Valor Asegurado */}
						<div className="space-y-2">
							<Label htmlFor="valor_asegurado">
								Valor Asegurado (Bs) <span className="text-red-500">*</span>
							</Label>
							<Input
								id="valor_asegurado"
								type="number"
								min="0"
								step="0.01"
								value={formData.valor_asegurado}
								onChange={(e) => handleChange("valor_asegurado", parseFloat(e.target.value) || 0)}
								placeholder="50000"
								className={errores.valor_asegurado ? "border-red-500" : ""}
							/>
							{errores.valor_asegurado && (
								<p className="text-sm text-red-600">{errores.valor_asegurado}</p>
							)}
						</div>

						{/* Franquicia */}
						<div className="space-y-2">
							<Label htmlFor="franquicia">
								Franquicia (Bs) <span className="text-red-500">*</span>
							</Label>
							<Input
								id="franquicia"
								type="number"
								min="0"
								step="0.01"
								value={formData.franquicia}
								onChange={(e) => handleChange("franquicia", parseFloat(e.target.value) || 0)}
								placeholder="5000"
								className={errores.franquicia ? "border-red-500" : ""}
							/>
							{errores.franquicia && <p className="text-sm text-red-600">{errores.franquicia}</p>}
						</div>

						{/* Número de Chasis */}
						<div className="space-y-2">
							<Label htmlFor="nro_chasis">
								Nº de Chasis <span className="text-red-500">*</span>
							</Label>
							<Input
								id="nro_chasis"
								value={formData.nro_chasis}
								onChange={(e) => handleChange("nro_chasis", e.target.value.toUpperCase())}
								placeholder="CH123456789"
								className={errores.nro_chasis ? "border-red-500" : ""}
							/>
							{errores.nro_chasis && <p className="text-sm text-red-600">{errores.nro_chasis}</p>}
						</div>

						{/* Uso */}
						<div className="space-y-2">
							<Label htmlFor="uso">
								Uso <span className="text-red-500">*</span>
							</Label>
							<Select value={formData.uso} onValueChange={(value) => handleChange("uso", value)}>
								<SelectTrigger className={errores.uso ? "border-red-500" : ""}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="particular">Particular</SelectItem>
									<SelectItem value="publico">Público</SelectItem>
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
							<Label htmlFor="tipo_vehiculo">Tipo de Vehículo</Label>
							<Select
								value={formData.tipo_vehiculo_id || undefined}
								onValueChange={(value) => handleChange("tipo_vehiculo_id", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione un tipo" />
								</SelectTrigger>
								<SelectContent>
									{tiposVehiculo.map((tipo) => (
										<SelectItem key={tipo.id} value={tipo.id}>
											{tipo.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Marca */}
						<div className="space-y-2">
							<Label htmlFor="marca">Marca</Label>
							<Select
								value={formData.marca_id || undefined}
								onValueChange={(value) => handleChange("marca_id", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione una marca" />
								</SelectTrigger>
								<SelectContent>
									{marcas.map((marca) => (
										<SelectItem key={marca.id} value={marca.id}>
											{marca.nombre}
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
								value={formData.modelo}
								onChange={(e) => handleChange("modelo", e.target.value)}
								placeholder="Ej: Land Cruiser"
							/>
						</div>

						{/* Año */}
						<div className="space-y-2">
							<Label htmlFor="ano">Año</Label>
							<Input
								id="ano"
								value={formData.ano}
								onChange={(e) => handleChange("ano", e.target.value)}
								placeholder="2020"
								maxLength={4}
							/>
						</div>

						{/* Color */}
						<div className="space-y-2">
							<Label htmlFor="color">Color</Label>
							<Input
								id="color"
								value={formData.color}
								onChange={(e) => handleChange("color", e.target.value)}
								placeholder="Blanco"
							/>
						</div>

						{/* Plaza de Circulación */}
						<div className="space-y-2">
							<Label htmlFor="plaza">Plaza de Circulación</Label>
							<Input
								id="plaza"
								value={formData.plaza_circulacion}
								onChange={(e) => handleChange("plaza_circulacion", e.target.value)}
								placeholder="La Paz"
							/>
						</div>

						{/* Número de Ejes */}
						<div className="space-y-2">
							<Label htmlFor="ejes">Nº de Ejes</Label>
							<Input
								id="ejes"
								type="number"
								min="2"
								value={formData.ejes || ""}
								onChange={(e) => handleChange("ejes", parseInt(e.target.value) || undefined)}
								placeholder="2"
								className={errores.ejes ? "border-red-500" : ""}
							/>
							{errores.ejes && <p className="text-sm text-red-600">{errores.ejes}</p>}
						</div>

						{/* Número de Asientos */}
						<div className="space-y-2">
							<Label htmlFor="asientos">Nº de Asientos</Label>
							<Input
								id="asientos"
								type="number"
								min="1"
								value={formData.nro_asientos || ""}
								onChange={(e) => handleChange("nro_asientos", parseInt(e.target.value) || undefined)}
								placeholder="5"
								className={errores.nro_asientos ? "border-red-500" : ""}
							/>
							{errores.nro_asientos && <p className="text-sm text-red-600">{errores.nro_asientos}</p>}
						</div>

						{/* Número de Motor */}
						<div className="space-y-2">
							<Label htmlFor="motor">Nº de Motor</Label>
							<Input
								id="motor"
								value={formData.nro_motor}
								onChange={(e) => handleChange("nro_motor", e.target.value.toUpperCase())}
								placeholder="MOT987654"
							/>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
					<Button variant="outline" onClick={onCancelar}>
						Cancelar
					</Button>
					<Button onClick={handleGuardar}>{vehiculo ? "Guardar Cambios" : "Agregar Vehículo"}</Button>
				</div>
			</div>
		</div>
	);
}
