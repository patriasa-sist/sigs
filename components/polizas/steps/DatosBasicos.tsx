"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import type {
	DatosBasicosPoliza,
	CompaniaAseguradora,
	Regional,
	Categoria,
	GrupoProduccion,
	Moneda,
	ProductoAseguradora,
} from "@/types/poliza";
import { validarDatosBasicos } from "@/utils/polizaValidation";
import { POLIZA_RULES } from "@/utils/validationConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { DirectorCarteraDropdown } from "@/components/shared/DirectorCarteraDropdown";

type Props = {
	datos: DatosBasicosPoliza | null;
	onChange: (datos: DatosBasicosPoliza) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

type Usuario = {
	id: string;
	full_name: string;
	email?: string;
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
			producto_id: "",
			inicio_vigencia: "",
			fin_vigencia: "",
			fecha_emision_compania: "",
			director_cartera_id: "",
			responsable_id: "",
			regional_id: "",
			categoria_id: undefined,
			grupo_produccion: "generales",
			moneda: "Bs",
			es_renovacion: false,
			nro_poliza_anterior: "",
		},
	);

	// Catálogos
	const [companias, setCompanias] = useState<CompaniaAseguradora[]>([]);
	const [regionales, setRegionales] = useState<Regional[]>([]);
	const [categorias, setCategorias] = useState<Categoria[]>([]);
	const [usuarios, setUsuarios] = useState<Usuario[]>([]);
	const [tiposSeguros, setTiposSeguros] = useState<TipoSeguro[]>([]);
	const [productos, setProductos] = useState<ProductoAseguradora[]>([]);

	// Estados
	const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
	const [cargandoProductos, setCargandoProductos] = useState(false);
	const [errorProductos, setErrorProductos] = useState<string | null>(null);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// Cargar catálogos
	const cargarCatalogos = useCallback(async () => {
		try {
			const supabase = createClient();

			// Obtener usuario actual y su perfil para determinar rol
			const {
				data: { user },
			} = await supabase.auth.getUser();
			let userRole = "";
			let userId = "";
			if (user) {
				userId = user.id;
				const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
				userRole = profileData?.role || "";
			}

			const [
				{ data: companiasData },
				{ data: regionalesData },
				{ data: categoriasData },
				usuariosResult,
				{ data: tiposData, error: tiposError },
			] = await Promise.all([
				supabase.from("companias_aseguradoras").select("*").eq("activo", true).order("nombre"),
				supabase.from("regionales").select("*").eq("activo", true).order("nombre"),
				supabase.from("categorias").select("*").eq("activo", true).order("nombre"),
				// Intentar usar la función RPC primero, fallback a query directo si falla
				supabase.rpc("get_usuarios_comerciales").then(
					(result) => {
						// Si el RPC falla (ej: permisos), usar query directo
						if (result.error) {
							return supabase
								.from("profiles")
								.select("id, full_name, role")
								.in("role", ["comercial", "admin", "agente", "usuario"])
								.order("full_name");
						}
						return result;
					},
					// Fallback si la función no existe
					() =>
						supabase
							.from("profiles")
							.select("id, full_name, role")
							.in("role", ["comercial", "admin", "agente", "usuario"])
							.order("full_name"),
				),
				supabase
					.from("tipos_seguros")
					.select("*")
					.eq("activo", true)
					.eq("es_ramo_padre", false)
					.order("nombre"),
			]);

			if (tiposError) {
				console.error("Error cargando tipos de seguros:", tiposError);
			}

			const { data: usuariosData, error: usuariosError } = usuariosResult;

			if (usuariosError) {
				console.error("Error cargando usuarios:", usuariosError);
			}

			let usuariosFiltrados: Usuario[] = usuariosData || [];

			// Para agente/comercial: filtrar a solo miembros de su equipo
			if (["agente", "comercial"].includes(userRole) && userId) {
				const { data: teamIds } = await supabase.rpc("get_team_member_ids", { p_user_id: userId });
				if (teamIds && teamIds.length > 0) {
					usuariosFiltrados = usuariosFiltrados.filter((u: Usuario) => teamIds.includes(u.id));
				} else {
					// Sin equipo: solo se puede asignar a si mismo
					usuariosFiltrados = usuariosFiltrados.filter((u: Usuario) => u.id === userId);
				}
			}

			setCompanias(companiasData || []);
			setRegionales(regionalesData || []);
			setCategorias(categoriasData || []);
			setUsuarios(usuariosFiltrados);
			// Filtro adicional del lado del cliente para asegurar que solo se muestren ramos activos
			const tiposActivos = (tiposData || []).filter((tipo) => tipo.activo === true);
			setTiposSeguros(tiposActivos);

			// Auto-asignar al usuario actual si es agente/comercial y no hay responsable seleccionado
			if (["agente", "comercial"].includes(userRole) && !datos?.responsable_id) {
				setFormData((prev) => ({ ...prev, responsable_id: userId }));
			}
		} catch (error) {
			console.error("Error cargando catálogos:", error);
		} finally {
			setCargandoCatalogos(false);
		}
	}, [datos?.responsable_id]);

	useEffect(() => {
		cargarCatalogos();
	}, [cargarCatalogos]);

	// Cargar productos cuando cambian compañía y ramo
	useEffect(() => {
		const cargarProductos = async () => {
			// Limpiar productos y errores previos
			setProductos([]);
			setErrorProductos(null);

			// Solo cargar si hay compañía y ramo seleccionados
			if (!formData.compania_aseguradora_id || !formData.ramo) {
				// Si no hay selección, limpiar producto_id
				if (formData.producto_id) {
					setFormData((prev) => ({ ...prev, producto_id: "" }));
				}
				return;
			}

			setCargandoProductos(true);

			try {
				const supabase = createClient();

				// Primero obtener el tipo_seguro_id basado en el nombre del ramo
				const { data: tipoSeguro, error: tipoError } = await supabase
					.from("tipos_seguros")
					.select("id")
					.eq("nombre", formData.ramo)
					.single();

				if (tipoError || !tipoSeguro) {
					console.error("Error obteniendo tipo de seguro:", tipoError);
					setErrorProductos("No se pudo determinar el tipo de seguro");
					return;
				}

				// Cargar productos filtrados por compañía + tipo de seguro
				const { data: productosData, error: productosError } = await supabase
					.from("productos_aseguradoras")
					.select("*")
					.eq("compania_aseguradora_id", formData.compania_aseguradora_id)
					.eq("tipo_seguro_id", tipoSeguro.id)
					.eq("activo", true)
					.order("nombre_producto");

				if (productosError) {
					console.error("Error cargando productos:", productosError);
					setErrorProductos("Error al cargar productos");
					return;
				}

				setProductos(productosData || []);

				// Si no hay productos disponibles, mostrar error
				if (!productosData || productosData.length === 0) {
					setErrorProductos(
						"No hay productos configurados para esta combinación de compañía y ramo. Contacte al administrador.",
					);
				}

				// Limpiar producto_id si el producto actual no está en la nueva lista
				if (
					formData.producto_id &&
					productosData &&
					!productosData.find((p) => p.id === formData.producto_id)
				) {
					setFormData((prev) => ({ ...prev, producto_id: "" }));
				}
			} catch (error) {
				console.error("Error en cargarProductos:", error);
				setErrorProductos("Error inesperado al cargar productos");
			} finally {
				setCargandoProductos(false);
			}
		};

		cargarProductos();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formData.compania_aseguradora_id, formData.ramo]); // Intentionally not including formData.producto_id to avoid infinite loops

	// Manejar cambios en el formulario
	const handleChange = (campo: keyof DatosBasicosPoliza, valor: string | GrupoProduccion | Moneda | undefined) => {
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

	const todosLosCamposCompletos =
		formData.numero_poliza &&
		formData.compania_aseguradora_id &&
		formData.ramo &&
		formData.producto_id &&
		formData.inicio_vigencia &&
		formData.fin_vigencia &&
		formData.fecha_emision_compania &&
		formData.director_cartera_id &&
		formData.responsable_id &&
		formData.regional_id &&
		formData.grupo_produccion &&
		formData.moneda;

	const esCompleto = datos !== null;

	if (cargandoCatalogos) {
		return (
			<div className="bg-card rounded-lg shadow-sm border border-border p-6">
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
					<p className="text-sm text-muted-foreground">Cargando catálogos...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-card rounded-lg shadow-sm border border-border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Datos Básicos de la Póliza</h2>
					<p className="text-sm text-muted-foreground mt-1">Complete la información general de la póliza</p>
				</div>

				{esCompleto && (
					<div className="flex items-center gap-2 text-success">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Completado</span>
					</div>
				)}
			</div>

			{/* Renovación de póliza */}
			<div className="mb-6 p-4 border border-border rounded-lg bg-secondary">
				<div className="flex items-center gap-3">
					<Checkbox
						id="es_renovacion"
						checked={formData.es_renovacion || false}
						onCheckedChange={(checked) => {
							const esRenovacion = checked === true;
							setFormData((prev) => ({
								...prev,
								es_renovacion: esRenovacion,
								nro_poliza_anterior: esRenovacion ? prev.nro_poliza_anterior : "",
							}));
							if (!esRenovacion && errores.nro_poliza_anterior) {
								const nuevosErrores = { ...errores };
								delete nuevosErrores.nro_poliza_anterior;
								setErrores(nuevosErrores);
							}
						}}
					/>
					<Label htmlFor="es_renovacion" className="cursor-pointer font-medium text-foreground">
						Esta póliza es una renovación
					</Label>
				</div>
				{formData.es_renovacion && (
					<div className="mt-3 ml-7">
						<Label htmlFor="nro_poliza_anterior">
							Nº de Póliza anterior <span className="text-destructive">*</span>
						</Label>
						<Input
							id="nro_poliza_anterior"
							value={formData.nro_poliza_anterior || ""}
							onChange={(e) => {
								setFormData((prev) => ({ ...prev, nro_poliza_anterior: e.target.value }));
								if (errores.nro_poliza_anterior) {
									const nuevosErrores = { ...errores };
									delete nuevosErrores.nro_poliza_anterior;
									setErrores(nuevosErrores);
								}
							}}
							placeholder="Ingrese el número de la póliza que se renueva"
							className={`mt-1 max-w-md ${errores.nro_poliza_anterior ? "border-destructive" : ""}`}
						/>
						{errores.nro_poliza_anterior && (
							<p className="text-sm text-destructive mt-1">{errores.nro_poliza_anterior}</p>
						)}
						<p className="text-xs text-muted-foreground mt-1">
							Puede ser una póliza registrada en el sistema o de terceros
						</p>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Número de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="numero_poliza">
						Número de Póliza <span className="text-destructive">*</span>
					</Label>
					<Input
						id="numero_poliza"
						value={formData.numero_poliza}
						onChange={(e) => handleChange("numero_poliza", e.target.value)}
						placeholder="Ej: POL-2024-001"
						className={errores.numero_poliza ? "border-destructive" : ""}
					/>
					{errores.numero_poliza && <p className="text-sm text-destructive">{errores.numero_poliza}</p>}
				</div>

				{/* Compañía Aseguradora */}
				<div className="space-y-2">
					<Label htmlFor="compania">
						Compañía Aseguradora <span className="text-destructive">*</span>
					</Label>
					<Select
						value={formData.compania_aseguradora_id}
						onValueChange={(value) => handleChange("compania_aseguradora_id", value)}
					>
						<SelectTrigger className={errores.compania_aseguradora_id ? "border-destructive" : ""}>
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
						<p className="text-sm text-destructive">{errores.compania_aseguradora_id}</p>
					)}
				</div>

				{/* Ramo */}
				<div className="space-y-2">
					<Label htmlFor="ramo">
						Ramo <span className="text-destructive">*</span>
					</Label>
					<Select value={formData.ramo} onValueChange={(value) => handleChange("ramo", value)}>
						<SelectTrigger className={errores.ramo ? "border-destructive" : ""}>
							<SelectValue placeholder="Seleccione un ramo" />
						</SelectTrigger>
						<SelectContent>
							{tiposSeguros.map((tipo) => (
								<SelectItem key={tipo.id} value={tipo.nombre}>
									<span className="font-mono text-xs text-muted-foreground">({tipo.codigo})</span>{" "}
									{tipo.nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.ramo && <p className="text-sm text-destructive">{errores.ramo}</p>}
				</div>

				{/* Producto de Aseguradora */}
				<div className="space-y-2">
					<Label htmlFor="producto_id">
						Producto <span className="text-destructive">*</span>
					</Label>
					<Select
						value={formData.producto_id}
						onValueChange={(value) => handleChange("producto_id", value)}
						disabled={
							!formData.compania_aseguradora_id ||
							!formData.ramo ||
							cargandoProductos ||
							productos.length === 0
						}
					>
						<SelectTrigger className={errores.producto_id || errorProductos ? "border-destructive" : ""}>
							<SelectValue
								placeholder={
									cargandoProductos
										? "Cargando productos..."
										: !formData.compania_aseguradora_id || !formData.ramo
											? "Seleccione compañía y ramo primero"
											: productos.length === 0
												? "No hay productos disponibles"
												: "Seleccione un producto"
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{productos.map((producto) => (
								<SelectItem key={producto.id} value={producto.id}>
									<span className="font-mono text-xs text-muted-foreground">
										({producto.codigo_producto})
									</span>{" "}
									{producto.nombre_producto}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.producto_id && <p className="text-sm text-destructive">{errores.producto_id}</p>}
					{errorProductos && !errores.producto_id && (
						<p className="text-sm text-destructive">{errorProductos}</p>
					)}
				</div>

				{/* Director de cartera */}
				<div className="space-y-2">
					<DirectorCarteraDropdown
						value={formData.director_cartera_id || null}
						onValueChange={(value) => handleChange("director_cartera_id", value || "")}
						error={errores.director_cartera_id}
						required
					/>
				</div>

				{/* Ejecutivo comercial */}
				<div className="space-y-2">
					<Label htmlFor="responsable">
						Ejecutivo comercial <span className="text-destructive">*</span>
					</Label>
					<Select
						value={formData.responsable_id}
						onValueChange={(value) => handleChange("responsable_id", value)}
					>
						<SelectTrigger className={errores.responsable_id ? "border-destructive" : ""}>
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
					{errores.responsable_id && <p className="text-sm text-destructive">{errores.responsable_id}</p>}
				</div>

				{/* Fecha de Emisión */}
				<div className="space-y-2">
					<Label htmlFor="fecha_emision">
						Fecha de Emisión (Compañía) <span className="text-destructive">*</span>
					</Label>
					<Input
						id="fecha_emision"
						type="date"
						lang="es"
						value={formData.fecha_emision_compania}
						onChange={(e) => handleChange("fecha_emision_compania", e.target.value)}
						className={errores.fecha_emision_compania ? "border-destructive" : ""}
					/>
					{errores.fecha_emision_compania && (
						<p className="text-sm text-destructive">{errores.fecha_emision_compania}</p>
					)}
				</div>

				{/* Inicio de Vigencia */}
				<div className="space-y-2">
					<Label htmlFor="inicio_vigencia">
						Inicio de Vigencia <span className="text-destructive">*</span>
					</Label>
					<Input
						id="inicio_vigencia"
						type="date"
						lang="es"
						value={formData.inicio_vigencia}
						onChange={(e) => handleChange("inicio_vigencia", e.target.value)}
						className={errores.inicio_vigencia ? "border-destructive" : ""}
					/>
					{errores.inicio_vigencia && <p className="text-sm text-destructive">{errores.inicio_vigencia}</p>}
				</div>

				{/* Fin de Vigencia */}
				<div className="space-y-2">
					<Label htmlFor="fin_vigencia">
						Fin de Vigencia <span className="text-destructive">*</span>
					</Label>
					<Input
						id="fin_vigencia"
						type="date"
						lang="es"
						value={formData.fin_vigencia}
						onChange={(e) => handleChange("fin_vigencia", e.target.value)}
						className={errores.fin_vigencia ? "border-destructive" : ""}
					/>
					{errores.fin_vigencia && <p className="text-sm text-destructive">{errores.fin_vigencia}</p>}
				</div>

				{/* Regional */}
				<div className="space-y-2">
					<Label htmlFor="regional">
						Regional Patria <span className="text-destructive">*</span>
					</Label>
					<Select value={formData.regional_id} onValueChange={(value) => handleChange("regional_id", value)}>
						<SelectTrigger className={errores.regional_id ? "border-destructive" : ""}>
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
					{errores.regional_id && <p className="text-sm text-destructive">{errores.regional_id}</p>}
				</div>

				{/* Grupo de negocios (antes Categoría) - AHORA OPCIONAL */}
				<div className="space-y-2">
					<Label htmlFor="categoria">Grupo de negocios</Label>
					<Select
						value={formData.categoria_id || ""}
						onValueChange={(value) => handleChange("categoria_id", value || undefined)}
					>
						<SelectTrigger className={errores.categoria_id ? "border-destructive" : ""}>
							<SelectValue placeholder="Seleccione un grupo (opcional)" />
						</SelectTrigger>
						<SelectContent>
							{categorias.map((categoria) => (
								<SelectItem key={categoria.id} value={categoria.id}>
									{categoria.nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.categoria_id && <p className="text-sm text-destructive">{errores.categoria_id}</p>}
				</div>

				{/* NUEVO: Grupo de producción (usa constantes centralizadas) */}
				<div className="space-y-2">
					<Label htmlFor="grupo_produccion">
						Grupo de producción <span className="text-destructive">*</span>
					</Label>
					<Select
						value={formData.grupo_produccion}
						onValueChange={(value) => handleChange("grupo_produccion", value as GrupoProduccion)}
					>
						<SelectTrigger className={errores.grupo_produccion ? "border-destructive" : ""}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{POLIZA_RULES.GRUPOS_PRODUCCION.map((grupo) => (
								<SelectItem key={grupo} value={grupo}>
									{grupo.charAt(0).toUpperCase() + grupo.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.grupo_produccion && <p className="text-sm text-destructive">{errores.grupo_produccion}</p>}
				</div>

				{/* NUEVO: Moneda (usa constantes centralizadas) */}
				<div className="space-y-2">
					<Label htmlFor="moneda">
						Moneda <span className="text-destructive">*</span>
					</Label>
					<Select value={formData.moneda} onValueChange={(value) => handleChange("moneda", value as Moneda)}>
						<SelectTrigger className={errores.moneda ? "border-destructive" : ""}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="Bs">Bolivianos (Bs)</SelectItem>
							<SelectItem value="USD">Dólares (USD)</SelectItem>
							<SelectItem value="USDT">Tether (USDT)</SelectItem>
							<SelectItem value="UFV">UFV</SelectItem>
						</SelectContent>
					</Select>
					{errores.moneda && <p className="text-sm text-destructive">{errores.moneda}</p>}
				</div>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 border-t border-border mt-6">
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

					<Button onClick={handleContinuar} disabled={!todosLosCamposCompletos}>
						Continuar con Datos Específicos
						<ChevronRight className="ml-2 h-5 w-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
