"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus } from "lucide-react";
import type { DatosBasicosPoliza, CompaniaAseguradora, Regional, Categoria } from "@/types/poliza";
import { validarDatosBasicos } from "@/utils/polizaValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";

type Props = {
	datos: DatosBasicosPoliza | null;
	onChange: (datos: DatosBasicosPoliza) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

type Usuario = {
	id: string;
	full_name: string;
	email: string;
	role: string;
};

type TipoSeguro = {
	id: number;
	codigo: string;
	nombre: string;
	es_ramo_padre: boolean;
	activo: boolean;
};

export function DatosBasicos({ datos, onChange, onSiguiente, onAnterior }: Props) {
	const [formData, setFormData] = useState<Partial<DatosBasicosPoliza>>(
		datos || {
			numero_poliza: "",
			compania_aseguradora_id: "",
			ramo: "",
			inicio_vigencia: "",
			fin_vigencia: "",
			fecha_emision_compania: "",
			responsable_id: "",
			regional_id: "",
			categoria_id: "",
		}
	);

	// Catálogos
	const [companias, setCompanias] = useState<CompaniaAseguradora[]>([]);
	const [regionales, setRegionales] = useState<Regional[]>([]);
	const [categorias, setCategorias] = useState<Categoria[]>([]);
	const [usuarios, setUsuarios] = useState<Usuario[]>([]);
	const [tiposSeguros, setTiposSeguros] = useState<TipoSeguro[]>([]);

	// Estados
	const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
	const [nuevaCategoria, setNuevaCategoria] = useState("");

	const supabase = createClient();

	// Cargar catálogos
	useEffect(() => {
		cargarCatalogos();
	}, []);

	const cargarCatalogos = async () => {
		try {
			const [
				{ data: companiasData },
				{ data: regionalesData },
				{ data: categoriasData },
				usuariosResult,
				{ data: tiposData },
			] = await Promise.all([
				supabase
					.from("companias_aseguradoras")
					.select("*")
					.eq("activo", true)
					.order("nombre"),
				supabase
					.from("regionales")
					.select("*")
					.eq("activo", true)
					.order("nombre"),
				supabase
					.from("categorias")
					.select("*")
					.eq("activo", true)
					.order("nombre"),
				// Intentar usar la función RPC primero, si no existe, usar query directo
				supabase.rpc("get_usuarios_comerciales").then(
					(result) => result,
					// Fallback a query directo si la función no existe
					() => supabase
						.from("profiles")
						.select("id, full_name, role")
						.in("role", ["comercial", "admin"])
						.order("full_name")
				),
				supabase
					.from("tipos_seguros")
					.select("*")
					.eq("activo", true)
					.eq("es_ramo_padre", false)
					.order("nombre"),
			]);

			const { data: usuariosData, error: usuariosError } = usuariosResult;

			if (usuariosError) {
				console.error("Error cargando usuarios:", usuariosError);
			}

			console.log("Usuarios cargados:", usuariosData);
			console.log("Total usuarios:", usuariosData?.length);
			console.log("Usuarios por rol:", usuariosData?.reduce((acc, u) => {
				acc[u.role] = (acc[u.role] || 0) + 1;
				return acc;
			}, {} as Record<string, number>));

			setCompanias(companiasData || []);
			setRegionales(regionalesData || []);
			setCategorias(categoriasData || []);
			setUsuarios(usuariosData || []);
			setTiposSeguros(tiposData || []);
		} catch (error) {
			console.error("Error cargando catálogos:", error);
		} finally {
			setCargandoCatalogos(false);
		}
	};

	// Manejar cambios en el formulario
	const handleChange = (campo: keyof DatosBasicosPoliza, valor: string) => {
		const nuevosDatos = {
			...formData,
			[campo]: valor,
		};

		setFormData(nuevosDatos);

		// Limpiar error del campo
		if (errores[campo]) {
			const nuevosErrores = { ...errores };
			delete nuevosErrores[campo];
			setErrores(nuevosErrores);
		}
	};

	// Agregar nueva categoría
	const handleAgregarCategoria = async () => {
		if (!nuevaCategoria.trim()) return;

		try {
			const { data, error } = await supabase
				.from("categorias")
				.insert({
					nombre: nuevaCategoria.trim(),
					activo: true,
				})
				.select()
				.single();

			if (error) throw error;

			if (data) {
				setCategorias([...categorias, data]);
				handleChange("categoria_id", data.id);
				setNuevaCategoria("");
				setMostrarNuevaCategoria(false);
			}
		} catch (error) {
			console.error("Error agregando categoría:", error);
			alert("Error al agregar categoría");
		}
	};

	// Validar y continuar
	const handleContinuar = () => {
		const validacion = validarDatosBasicos(formData);

		if (!validacion.valido) {
			const nuevosErrores: Record<string, string> = {};
			validacion.errores.forEach((error) => {
				nuevosErrores[error.campo] = error.mensaje;
			});
			setErrores(nuevosErrores);
			return;
		}

		onChange(formData as DatosBasicosPoliza);
		onSiguiente();
	};

	// Actualizar datos
	const handleActualizar = () => {
		const validacion = validarDatosBasicos(formData);

		if (!validacion.valido) {
			const nuevosErrores: Record<string, string> = {};
			validacion.errores.forEach((error) => {
				nuevosErrores[error.campo] = error.mensaje;
			});
			setErrores(nuevosErrores);
			return;
		}

		onChange(formData as DatosBasicosPoliza);
		alert("Datos actualizados correctamente");
	};

	const todosLosCamposCompletos = formData.numero_poliza &&
		formData.compania_aseguradora_id &&
		formData.ramo &&
		formData.inicio_vigencia &&
		formData.fin_vigencia &&
		formData.fecha_emision_compania &&
		formData.responsable_id &&
		formData.regional_id &&
		formData.categoria_id;

	const esCompleto = datos !== null;

	if (cargandoCatalogos) {
		return (
			<div className="bg-white rounded-lg shadow-sm border p-6">
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
					<p className="text-sm text-gray-600">Cargando catálogos...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 2: Datos Básicos de la Póliza
					</h2>
					<p className="text-sm text-gray-600 mt-1">
						Complete la información general de la póliza
					</p>
				</div>

				{esCompleto && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Completado</span>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Número de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="numero_poliza">
						Número de Póliza <span className="text-red-500">*</span>
					</Label>
					<Input
						id="numero_poliza"
						value={formData.numero_poliza}
						onChange={(e) => handleChange("numero_poliza", e.target.value)}
						placeholder="Ej: POL-2024-001"
						className={errores.numero_poliza ? "border-red-500" : ""}
					/>
					{errores.numero_poliza && (
						<p className="text-sm text-red-600">{errores.numero_poliza}</p>
					)}
				</div>

				{/* Compañía Aseguradora */}
				<div className="space-y-2">
					<Label htmlFor="compania">
						Compañía Aseguradora <span className="text-red-500">*</span>
					</Label>
					<Select
						value={formData.compania_aseguradora_id}
						onValueChange={(value) => handleChange("compania_aseguradora_id", value)}
					>
						<SelectTrigger className={errores.compania_aseguradora_id ? "border-red-500" : ""}>
							<SelectValue placeholder="Seleccione una compañía" />
						</SelectTrigger>
						<SelectContent>
							{companias.map((compania) => (
								<SelectItem key={compania.id} value={compania.id}>
									{compania.nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.compania_aseguradora_id && (
						<p className="text-sm text-red-600">{errores.compania_aseguradora_id}</p>
					)}
				</div>

				{/* Ramo */}
				<div className="space-y-2">
					<Label htmlFor="ramo">
						Ramo <span className="text-red-500">*</span>
					</Label>
					<Select
						value={formData.ramo}
						onValueChange={(value) => handleChange("ramo", value)}
					>
						<SelectTrigger className={errores.ramo ? "border-red-500" : ""}>
							<SelectValue placeholder="Seleccione un ramo" />
						</SelectTrigger>
						<SelectContent>
							{tiposSeguros.map((tipo) => (
								<SelectItem key={tipo.id} value={tipo.nombre}>
									<span className="font-mono text-xs text-gray-500">({tipo.codigo})</span>{" "}
									{tipo.nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.ramo && (
						<p className="text-sm text-red-600">{errores.ramo}</p>
					)}
				</div>

				{/* Responsable */}
				<div className="space-y-2">
					<Label htmlFor="responsable">
						Responsable <span className="text-red-500">*</span>
					</Label>
					<Select
						value={formData.responsable_id}
						onValueChange={(value) => handleChange("responsable_id", value)}
					>
						<SelectTrigger className={errores.responsable_id ? "border-red-500" : ""}>
							<SelectValue placeholder="Seleccione un responsable" />
						</SelectTrigger>
						<SelectContent>
							{usuarios.map((usuario) => (
								<SelectItem key={usuario.id} value={usuario.id}>
									{usuario.full_name} ({usuario.role})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.responsable_id && (
						<p className="text-sm text-red-600">{errores.responsable_id}</p>
					)}
				</div>

				{/* Fecha de Emisión */}
				<div className="space-y-2">
					<Label htmlFor="fecha_emision">
						Fecha de Emisión (Compañía) <span className="text-red-500">*</span>
					</Label>
					<Input
						id="fecha_emision"
						type="date"
						value={formData.fecha_emision_compania}
						onChange={(e) => handleChange("fecha_emision_compania", e.target.value)}
						className={errores.fecha_emision_compania ? "border-red-500" : ""}
					/>
					{errores.fecha_emision_compania && (
						<p className="text-sm text-red-600">{errores.fecha_emision_compania}</p>
					)}
				</div>

				{/* Inicio de Vigencia */}
				<div className="space-y-2">
					<Label htmlFor="inicio_vigencia">
						Inicio de Vigencia <span className="text-red-500">*</span>
					</Label>
					<Input
						id="inicio_vigencia"
						type="date"
						value={formData.inicio_vigencia}
						onChange={(e) => handleChange("inicio_vigencia", e.target.value)}
						className={errores.inicio_vigencia ? "border-red-500" : ""}
					/>
					{errores.inicio_vigencia && (
						<p className="text-sm text-red-600">{errores.inicio_vigencia}</p>
					)}
				</div>

				{/* Fin de Vigencia */}
				<div className="space-y-2">
					<Label htmlFor="fin_vigencia">
						Fin de Vigencia <span className="text-red-500">*</span>
					</Label>
					<Input
						id="fin_vigencia"
						type="date"
						value={formData.fin_vigencia}
						onChange={(e) => handleChange("fin_vigencia", e.target.value)}
						className={errores.fin_vigencia ? "border-red-500" : ""}
					/>
					{errores.fin_vigencia && (
						<p className="text-sm text-red-600">{errores.fin_vigencia}</p>
					)}
				</div>

				{/* Regional */}
				<div className="space-y-2">
					<Label htmlFor="regional">
						Regional Patria <span className="text-red-500">*</span>
					</Label>
					<Select
						value={formData.regional_id}
						onValueChange={(value) => handleChange("regional_id", value)}
					>
						<SelectTrigger className={errores.regional_id ? "border-red-500" : ""}>
							<SelectValue placeholder="Seleccione una regional" />
						</SelectTrigger>
						<SelectContent>
							{regionales.map((regional) => (
								<SelectItem key={regional.id} value={regional.id}>
									{regional.nombre} ({regional.codigo})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.regional_id && (
						<p className="text-sm text-red-600">{errores.regional_id}</p>
					)}
				</div>

				{/* Categoría */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="categoria">
							Categoría <span className="text-red-500">*</span>
						</Label>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setMostrarNuevaCategoria(!mostrarNuevaCategoria)}
						>
							<Plus className="h-4 w-4 mr-1" />
							Nueva
						</Button>
					</div>

					{mostrarNuevaCategoria ? (
						<div className="flex gap-2">
							<Input
								value={nuevaCategoria}
								onChange={(e) => setNuevaCategoria(e.target.value)}
								placeholder="Nombre de la categoría"
								onKeyPress={(e) => {
									if (e.key === "Enter") {
										handleAgregarCategoria();
									}
								}}
							/>
							<Button onClick={handleAgregarCategoria} size="sm">
								Agregar
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setMostrarNuevaCategoria(false);
									setNuevaCategoria("");
								}}
							>
								Cancelar
							</Button>
						</div>
					) : (
						<>
							<Select
								value={formData.categoria_id}
								onValueChange={(value) => handleChange("categoria_id", value)}
							>
								<SelectTrigger className={errores.categoria_id ? "border-red-500" : ""}>
									<SelectValue placeholder="Seleccione una categoría" />
								</SelectTrigger>
								<SelectContent>
									{categorias.map((categoria) => (
										<SelectItem key={categoria.id} value={categoria.id}>
											{categoria.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errores.categoria_id && (
								<p className="text-sm text-red-600">{errores.categoria_id}</p>
							)}
						</>
					)}
				</div>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t mt-6">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>

				<div className="flex gap-2">
					{esCompleto && (
						<Button variant="outline" onClick={handleActualizar}>
							Actualizar Datos
						</Button>
					)}

					<Button
						onClick={handleContinuar}
						disabled={!todosLosCamposCompletos}
					>
						Continuar con Datos Específicos
						<ChevronRight className="ml-2 h-5 w-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
