"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { EquipoIndustrial, TipoEquipo, MarcaEquipo } from "@/types/poliza";
import { EQUIPO_RULES } from "@/utils/validationConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";

type Props = {
	equipo: EquipoIndustrial | null;
	onGuardar: (equipo: EquipoIndustrial) => void;
	onCancelar: () => void;
};

// Validación de equipo industrial
function validarEquipoIndustrial(equipo: Partial<EquipoIndustrial>): { valido: boolean; errores: Array<{ campo: string; mensaje: string }> } {
	const errores: Array<{ campo: string; mensaje: string }> = [];

	// Campos obligatorios
	if (!equipo.nro_serie?.trim()) {
		errores.push({ campo: "nro_serie", mensaje: "El número de serie es requerido" });
	}

	if (!equipo.nro_chasis?.trim()) {
		errores.push({ campo: "nro_chasis", mensaje: "El número de chasis es requerido" });
	}

	if (equipo.valor_asegurado === undefined || equipo.valor_asegurado <= 0) {
		errores.push({ campo: "valor_asegurado", mensaje: "El valor asegurado debe ser mayor a 0" });
	}

	if (equipo.franquicia === undefined || equipo.franquicia < 0) {
		errores.push({ campo: "franquicia", mensaje: "La franquicia debe ser 0 o mayor" });
	}

	if (!equipo.uso) {
		errores.push({ campo: "uso", mensaje: "El uso es requerido" });
	}

	if (equipo.coaseguro === undefined || equipo.coaseguro < EQUIPO_RULES.COASEGURO_MIN || equipo.coaseguro > EQUIPO_RULES.COASEGURO_MAX) {
		errores.push({ campo: "coaseguro", mensaje: `El coaseguro debe estar entre ${EQUIPO_RULES.COASEGURO_MIN} y ${EQUIPO_RULES.COASEGURO_MAX}%` });
	}

	// Validaciones opcionales
	if (equipo.ano !== undefined && equipo.ano !== null) {
		if (equipo.ano < EQUIPO_RULES.ANO_MIN || equipo.ano > EQUIPO_RULES.ANO_MAX) {
			errores.push({ campo: "ano", mensaje: `El año debe estar entre ${EQUIPO_RULES.ANO_MIN} y ${EQUIPO_RULES.ANO_MAX}` });
		}
	}

	return {
		valido: errores.length === 0,
		errores,
	};
}

export function EquipoModal({ equipo, onGuardar, onCancelar }: Props) {
	const [formData, setFormData] = useState<Partial<EquipoIndustrial>>(
		equipo || {
			nro_serie: "",
			valor_asegurado: 0,
			franquicia: 0,
			nro_chasis: "",
			uso: "particular",
			coaseguro: EQUIPO_RULES.COASEGURO_MIN,
			placa: "",
			tipo_equipo_id: undefined,
			marca_equipo_id: undefined,
			modelo: "",
			ano: undefined,
			color: "",
			nro_motor: "",
			plaza_circulacion: "",
		}
	);

	const [tiposEquipo, setTiposEquipo] = useState<TipoEquipo[]>([]);
	const [marcas, setMarcas] = useState<MarcaEquipo[]>([]);
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
				supabase.from("tipos_equipo").select("*").eq("activo", true).order("nombre"),
				supabase.from("marcas_equipo").select("*").eq("activo", true).order("nombre"),
			]);

			if (errorTipos) {
				console.error("Error cargando tipos de equipo:", errorTipos);
			}

			if (errorMarcas) {
				console.error("Error cargando marcas de equipo:", errorMarcas);
			}

			setTiposEquipo(tiposData || []);
			setMarcas(marcasData || []);
		} catch (error) {
			console.error("Error cargando catálogos:", error);
		} finally {
			setCargando(false);
		}
	};

	const handleChange = (campo: keyof EquipoIndustrial, valor: string | number | undefined) => {
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
		const validacion = validarEquipoIndustrial(formData);

		if (!validacion.valido) {
			const nuevosErrores: Record<string, string> = {};
			validacion.errores.forEach((error) => {
				nuevosErrores[error.campo] = error.mensaje;
			});
			setErrores(nuevosErrores);
			return;
		}

		onGuardar(formData as EquipoIndustrial);
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
					<h2 className="text-xl font-semibold">{equipo ? "Editar Equipo" : "Agregar Equipo"}</h2>
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

						{/* Número de Serie - CAMPO PRINCIPAL */}
						<div className="space-y-2">
							<Label htmlFor="nro_serie">
								Nº de Serie <span className="text-red-500">*</span>
							</Label>
							<Input
								id="nro_serie"
								value={formData.nro_serie}
								onChange={(e) => handleChange("nro_serie", e.target.value.toUpperCase())}
								placeholder="SN123456789"
								className={errores.nro_serie ? "border-red-500" : ""}
							/>
							{errores.nro_serie && <p className="text-sm text-red-600">{errores.nro_serie}</p>}
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
								value={formData.franquicia ?? ""}
								onChange={(e) => handleChange("franquicia", parseFloat(e.target.value) || 0)}
								placeholder="Ej: 700, 1000, 1400"
								className={errores.franquicia ? "border-red-500" : ""}
							/>
							{errores.franquicia && <p className="text-sm text-red-600">{errores.franquicia}</p>}
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

						{/* Coaseguro */}
						<div className="space-y-2">
							<Label htmlFor="coaseguro">
								Coaseguro (%) <span className="text-red-500">*</span>
							</Label>
							<Input
								id="coaseguro"
								type="number"
								min={EQUIPO_RULES.COASEGURO_MIN}
								max={EQUIPO_RULES.COASEGURO_MAX}
								step="0.01"
								value={formData.coaseguro ?? ""}
								onChange={(e) => handleChange("coaseguro", parseFloat(e.target.value) || 0)}
								placeholder="0"
								className={errores.coaseguro ? "border-red-500" : ""}
							/>
							{errores.coaseguro && <p className="text-sm text-red-600">{errores.coaseguro}</p>}
						</div>

						{/* CAMPOS OPCIONALES */}
						<div className="md:col-span-2 mt-4">
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Campos Opcionales</h3>
						</div>

						{/* Placa (opcional para equipos) */}
						<div className="space-y-2">
							<Label htmlFor="placa">Placa (opcional)</Label>
							<Input
								id="placa"
								value={formData.placa || ""}
								onChange={(e) => handleChange("placa", e.target.value.toUpperCase())}
								placeholder="Ej: ABC-123"
							/>
							<p className="text-xs text-gray-500">Algunos equipos industriales no tienen placa</p>
						</div>

						{/* Tipo de Equipo */}
						<div className="space-y-2">
							<Label htmlFor="tipo_equipo">Tipo de Equipo</Label>
							<Select
								value={formData.tipo_equipo_id || undefined}
								onValueChange={(value) => handleChange("tipo_equipo_id", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione un tipo" />
								</SelectTrigger>
								<SelectContent>
									{tiposEquipo.map((tipo) => (
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
								value={formData.marca_equipo_id || undefined}
								onValueChange={(value) => handleChange("marca_equipo_id", value)}
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
								value={formData.modelo || ""}
								onChange={(e) => handleChange("modelo", e.target.value)}
								placeholder="Ej: 320D, D6T"
							/>
						</div>

						{/* Año */}
						<div className="space-y-2">
							<Label htmlFor="ano">Año</Label>
							<Input
								id="ano"
								type="number"
								min={EQUIPO_RULES.ANO_MIN}
								max={EQUIPO_RULES.ANO_MAX}
								value={formData.ano ?? ""}
								onChange={(e) => {
									const valor = e.target.value ? parseInt(e.target.value) : undefined;
									handleChange("ano", valor);
								}}
								placeholder="2020"
								className={errores.ano ? "border-red-500" : ""}
							/>
							{errores.ano && <p className="text-sm text-red-600">{errores.ano}</p>}
						</div>

						{/* Color */}
						<div className="space-y-2">
							<Label htmlFor="color">Color</Label>
							<Input
								id="color"
								value={formData.color || ""}
								onChange={(e) => handleChange("color", e.target.value)}
								placeholder="Amarillo"
							/>
						</div>

						{/* Plaza de Circulación */}
						<div className="space-y-2">
							<Label htmlFor="plaza">Plaza de Circulación</Label>
							<Select
								value={formData.plaza_circulacion || ""}
								onValueChange={(value) => handleChange("plaza_circulacion", value || undefined)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione departamento" />
								</SelectTrigger>
								<SelectContent>
									{EQUIPO_RULES.DEPARTAMENTOS_BOLIVIA.map((depto) => (
										<SelectItem key={depto} value={depto}>
											{depto}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Número de Motor */}
						<div className="space-y-2">
							<Label htmlFor="motor">Nº de Motor</Label>
							<Input
								id="motor"
								value={formData.nro_motor || ""}
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
					<Button onClick={handleGuardar}>{equipo ? "Guardar Cambios" : "Agregar Equipo"}</Button>
				</div>
			</div>
		</div>
	);
}
