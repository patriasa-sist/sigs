"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Ship, Plane, Truck, Train, Package } from "lucide-react";
import type { DatosTransporte, TipoTransporte, ModalidadTransporte, Pais } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/utils/supabase/client";
import { useLiveSync } from "@/hooks/useLiveSync";

type Props = {
	datos: DatosTransporte | null;
	onChange: (datos: DatosTransporte) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

const TIPOS_TRANSPORTE: { value: TipoTransporte; label: string; icon: React.ReactNode }[] = [
	{ value: "terrestre", label: "Terrestre", icon: <Truck className="h-4 w-4" /> },
	{ value: "maritimo", label: "Marítimo", icon: <Ship className="h-4 w-4" /> },
	{ value: "aereo", label: "Aéreo", icon: <Plane className="h-4 w-4" /> },
	{ value: "ferreo", label: "Férreo", icon: <Train className="h-4 w-4" /> },
	{ value: "multimodal", label: "Multimodal", icon: <Package className="h-4 w-4" /> },
];

const MODALIDADES: { value: ModalidadTransporte; label: string; descripcion: string }[] = [
	{ value: "flotante", label: "Flotante", descripcion: "Múltiples embarques durante la vigencia" },
	{ value: "flat", label: "Flat", descripcion: "Prima fija para el período" },
	{ value: "un_solo_embarque", label: "Un solo embarque", descripcion: "Cobertura para un único envío" },
	{
		value: "flat_prima_minima_deposito",
		label: "Flat con prima mínima depósito",
		descripcion: "Prima mínima con ajuste posterior",
	},
];

export function TransporteForm({ datos, onChange, onSiguiente, onAnterior }: Props) {
	// Estados del formulario
	const [materiaAsegurada, setMateriaAsegurada] = useState(datos?.materia_asegurada || "");
	const [tipoEmbalaje, setTipoEmbalaje] = useState(datos?.tipo_embalaje || "");
	const [fechaEmbarque, setFechaEmbarque] = useState(datos?.fecha_embarque || "");
	const [tipoTransporte, setTipoTransporte] = useState<TipoTransporte>(datos?.tipo_transporte || "terrestre");
	const [ciudadOrigen, setCiudadOrigen] = useState(datos?.ciudad_origen || "");
	const [paisOrigenId, setPaisOrigenId] = useState(datos?.pais_origen_id || "");
	const [ciudadDestino, setCiudadDestino] = useState(datos?.ciudad_destino || "");
	const [paisDestinoId, setPaisDestinoId] = useState(datos?.pais_destino_id || "");
	const [valorAsegurado, setValorAsegurado] = useState(datos?.valor_asegurado || 0);
	const [factura, setFactura] = useState(datos?.factura || "");
	const [fechaFactura, setFechaFactura] = useState(datos?.fecha_factura || "");
	const [coberturaA, setCoberturaA] = useState(datos?.cobertura_a || false);
	const [coberturaC, setCoberturaC] = useState(datos?.cobertura_c || false);
	const [modalidad, setModalidad] = useState<ModalidadTransporte>(datos?.modalidad || "un_solo_embarque");

	// Estado para catálogos
	const [paises, setPaises] = useState<Pais[]>([]);
	const [cargandoPaises, setCargandoPaises] = useState(true);
	const [errores, setErrores] = useState<Record<string, string>>({});

	// Cargar países al montar
	useEffect(() => {
		const cargarPaises = async () => {
			setCargandoPaises(true);
			const supabase = createClient();
			const { data, error } = await supabase
				.from("paises")
				.select("id, codigo_iso, nombre, activo")
				.eq("activo", true)
				.order("nombre");

			if (error) {
				console.error("Error cargando países:", error);
			} else {
				setPaises(data || []);
				// Si no hay país origen seleccionado, establecer Bolivia por defecto
				if (!paisOrigenId && data) {
					const bolivia = data.find((p) => p.codigo_iso === "BOL");
					if (bolivia) setPaisOrigenId(bolivia.id);
				}
			}
			setCargandoPaises(false);
		};

		cargarPaises();
	}, [paisOrigenId]);

	const validarFormulario = (): boolean => {
		const nuevosErrores: Record<string, string> = {};

		if (!materiaAsegurada.trim()) {
			nuevosErrores.materia = "La materia asegurada es requerida";
		}

		if (!tipoEmbalaje.trim()) {
			nuevosErrores.tipo_embalaje = "El tipo de embalaje es requerido";
		}

		if (!fechaEmbarque) {
			nuevosErrores.fecha_embarque = "La fecha de embarque es requerida";
		}

		if (!ciudadOrigen.trim()) {
			nuevosErrores.ciudad_origen = "La ciudad de origen es requerida";
		}

		if (!paisOrigenId) {
			nuevosErrores.pais_origen = "El país de origen es requerido";
		}

		if (!ciudadDestino.trim()) {
			nuevosErrores.ciudad_destino = "La ciudad de destino es requerida";
		}

		if (!paisDestinoId) {
			nuevosErrores.pais_destino = "El país de destino es requerido";
		}

		if (!valorAsegurado || valorAsegurado <= 0) {
			nuevosErrores.valor = "El valor asegurado debe ser mayor a 0";
		}

		if (!factura.trim()) {
			nuevosErrores.factura = "El número de factura es requerido";
		}

		if (!fechaFactura) {
			nuevosErrores.fecha_factura = "La fecha de factura es requerida";
		}

		if (!coberturaA && !coberturaC) {
			nuevosErrores.coberturas = "Debe seleccionar al menos una cobertura (A o C)";
		}

		setErrores(nuevosErrores);
		return Object.keys(nuevosErrores).length === 0;
	};

	// Sincroniza ediciones con el padre en vivo (sin requerir "Continuar"),
	// para que el borrador de recovery y el resumen reflejen lo escrito.
	useLiveSync(
		() =>
			materiaAsegurada &&
			tipoEmbalaje &&
			fechaEmbarque &&
			ciudadOrigen &&
			paisOrigenId &&
			ciudadDestino &&
			paisDestinoId &&
			valorAsegurado > 0 &&
			factura &&
			fechaFactura &&
			(coberturaA || coberturaC)
				? {
						materia_asegurada: materiaAsegurada,
						tipo_embalaje: tipoEmbalaje,
						fecha_embarque: fechaEmbarque,
						tipo_transporte: tipoTransporte,
						ciudad_origen: ciudadOrigen,
						pais_origen_id: paisOrigenId,
						ciudad_destino: ciudadDestino,
						pais_destino_id: paisDestinoId,
						valor_asegurado: valorAsegurado,
						factura: factura,
						fecha_factura: fechaFactura,
						cobertura_a: coberturaA,
						cobertura_c: coberturaC,
						modalidad,
					}
				: null,
		onChange,
		[
			materiaAsegurada,
			tipoEmbalaje,
			fechaEmbarque,
			tipoTransporte,
			ciudadOrigen,
			paisOrigenId,
			ciudadDestino,
			paisDestinoId,
			valorAsegurado,
			factura,
			fechaFactura,
			coberturaA,
			coberturaC,
			modalidad,
		],
	);

	const handleContinuar = () => {
		if (!validarFormulario()) return;

		onChange({
			materia_asegurada: materiaAsegurada,
			tipo_embalaje: tipoEmbalaje,
			fecha_embarque: fechaEmbarque,
			tipo_transporte: tipoTransporte,
			ciudad_origen: ciudadOrigen,
			pais_origen_id: paisOrigenId,
			ciudad_destino: ciudadDestino,
			pais_destino_id: paisDestinoId,
			valor_asegurado: valorAsegurado,
			factura: factura,
			fecha_factura: fechaFactura,
			cobertura_a: coberturaA,
			cobertura_c: coberturaC,
			modalidad,
		});

		onSiguiente();
	};

	const tieneDatos =
		materiaAsegurada &&
		tipoEmbalaje &&
		fechaEmbarque &&
		ciudadOrigen &&
		paisOrigenId &&
		ciudadDestino &&
		paisDestinoId &&
		valorAsegurado > 0 &&
		factura &&
		fechaFactura &&
		(coberturaA || coberturaC);

	// Obtener nombre de país seleccionado para preview
	const paisOrigenNombre = paises.find((p) => p.id === paisOrigenId)?.nombre || "";
	const paisDestinoNombre = paises.find((p) => p.id === paisDestinoId)?.nombre || "";

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Paso 3: Datos Específicos - Transporte</h2>
					<p className="text-sm text-gray-600 mt-1">Configure los datos del embarque y la mercancía</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">Datos completos</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
				{/* Sección: Mercancía */}
				<div className="border rounded-lg p-4 space-y-4">
					<h3 className="font-medium text-gray-900 flex items-center gap-2">
						<Package className="h-5 w-5 text-gray-600" />
						Datos de la Mercancía
					</h3>

					<div className="space-y-2">
						<Label htmlFor="materia_asegurada">
							Materia Asegurada <span className="text-red-500">*</span>
						</Label>
						<Textarea
							id="materia_asegurada"
							value={materiaAsegurada}
							onChange={(e) => setMateriaAsegurada(e.target.value)}
							placeholder="Descripción detallada de la mercancía a transportar..."
							rows={3}
							className={errores.materia ? "border-red-500" : ""}
						/>
						{errores.materia && <p className="text-sm text-red-600">{errores.materia}</p>}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="tipo_embalaje">
								Tipo de Embalaje <span className="text-red-500">*</span>
							</Label>
							<Input
								id="tipo_embalaje"
								value={tipoEmbalaje}
								onChange={(e) => setTipoEmbalaje(e.target.value)}
								placeholder="Ej: Cajas de cartón, Pallets, Contenedor..."
								className={errores.tipo_embalaje ? "border-red-500" : ""}
							/>
							{errores.tipo_embalaje && <p className="text-sm text-red-600">{errores.tipo_embalaje}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="valor_asegurado">
								Valor Asegurado <span className="text-red-500">*</span>
							</Label>
							<Input
								id="valor_asegurado"
								type="number"
								min="0"
								step="0.01"
								value={valorAsegurado || ""}
								onChange={(e) => setValorAsegurado(parseFloat(e.target.value) || 0)}
								placeholder="0.00"
								className={errores.valor ? "border-red-500" : ""}
							/>
							{errores.valor && <p className="text-sm text-red-600">{errores.valor}</p>}
						</div>
					</div>
				</div>

				{/* Sección: Embarque */}
				<div className="border rounded-lg p-4 space-y-4">
					<h3 className="font-medium text-gray-900">Datos del Embarque</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="fecha_embarque">
								Fecha de Embarque <span className="text-red-500">*</span>
							</Label>
							<Input
								id="fecha_embarque"
								type="date"
								lang="es"
								value={fechaEmbarque}
								onChange={(e) => setFechaEmbarque(e.target.value)}
								className={errores.fecha_embarque ? "border-red-500" : ""}
							/>
							{errores.fecha_embarque && <p className="text-sm text-red-600">{errores.fecha_embarque}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="tipo_transporte">
								Tipo de Transporte <span className="text-red-500">*</span>
							</Label>
							<Select value={tipoTransporte} onValueChange={(v: TipoTransporte) => setTipoTransporte(v)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TIPOS_TRANSPORTE.map((tipo) => (
										<SelectItem key={tipo.value} value={tipo.value}>
											<div className="flex items-center gap-2">
												{tipo.icon}
												{tipo.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Sección: Origen y Destino */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Origen */}
					<div className="border rounded-lg p-4 space-y-4">
						<h3 className="font-medium text-gray-900 text-green-700">📍 Origen</h3>

						<div className="space-y-2">
							<Label htmlFor="pais_origen">
								País de Origen <span className="text-red-500">*</span>
							</Label>
							<Select value={paisOrigenId} onValueChange={setPaisOrigenId} disabled={cargandoPaises}>
								<SelectTrigger className={errores.pais_origen ? "border-red-500" : ""}>
									<SelectValue placeholder={cargandoPaises ? "Cargando..." : "Seleccione país"} />
								</SelectTrigger>
								<SelectContent>
									{paises.map((pais) => (
										<SelectItem key={pais.id} value={pais.id}>
											{pais.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errores.pais_origen && <p className="text-sm text-red-600">{errores.pais_origen}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="ciudad_origen">
								Ciudad de Origen <span className="text-red-500">*</span>
							</Label>
							<Input
								id="ciudad_origen"
								value={ciudadOrigen}
								onChange={(e) => setCiudadOrigen(e.target.value)}
								placeholder="Ej: La Paz, Santa Cruz..."
								className={errores.ciudad_origen ? "border-red-500" : ""}
							/>
							{errores.ciudad_origen && <p className="text-sm text-red-600">{errores.ciudad_origen}</p>}
						</div>
					</div>

					{/* Destino */}
					<div className="border rounded-lg p-4 space-y-4">
						<h3 className="font-medium text-gray-900 text-blue-700">📍 Destino</h3>

						<div className="space-y-2">
							<Label htmlFor="pais_destino">
								País de Destino <span className="text-red-500">*</span>
							</Label>
							<Select value={paisDestinoId} onValueChange={setPaisDestinoId} disabled={cargandoPaises}>
								<SelectTrigger className={errores.pais_destino ? "border-red-500" : ""}>
									<SelectValue placeholder={cargandoPaises ? "Cargando..." : "Seleccione país"} />
								</SelectTrigger>
								<SelectContent>
									{paises.map((pais) => (
										<SelectItem key={pais.id} value={pais.id}>
											{pais.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errores.pais_destino && <p className="text-sm text-red-600">{errores.pais_destino}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="ciudad_destino">
								Ciudad de Destino <span className="text-red-500">*</span>
							</Label>
							<Input
								id="ciudad_destino"
								value={ciudadDestino}
								onChange={(e) => setCiudadDestino(e.target.value)}
								placeholder="Ej: Buenos Aires, Lima..."
								className={errores.ciudad_destino ? "border-red-500" : ""}
							/>
							{errores.ciudad_destino && <p className="text-sm text-red-600">{errores.ciudad_destino}</p>}
						</div>
					</div>
				</div>

				{/* Preview de ruta */}
				{paisOrigenNombre && paisDestinoNombre && ciudadOrigen && ciudadDestino && (
					<div className="bg-gray-50 rounded-lg p-4 text-center">
						<p className="text-sm text-gray-600">Ruta del transporte:</p>
						<p className="font-medium text-gray-900">
							{ciudadOrigen}, {paisOrigenNombre} → {ciudadDestino}, {paisDestinoNombre}
						</p>
					</div>
				)}

				{/* Sección: Factura */}
				<div className="border rounded-lg p-4 space-y-4">
					<h3 className="font-medium text-gray-900">Datos de Facturación</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="factura">
								Número de Factura <span className="text-red-500">*</span>
							</Label>
							<Input
								id="factura"
								value={factura}
								onChange={(e) => setFactura(e.target.value)}
								placeholder="Ej: FAC-001-2026"
								className={errores.factura ? "border-red-500" : ""}
							/>
							{errores.factura && <p className="text-sm text-red-600">{errores.factura}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="fecha_factura">
								Fecha de Factura <span className="text-red-500">*</span>
							</Label>
							<Input
								id="fecha_factura"
								type="date"
								lang="es"
								value={fechaFactura}
								onChange={(e) => setFechaFactura(e.target.value)}
								className={errores.fecha_factura ? "border-red-500" : ""}
							/>
							{errores.fecha_factura && <p className="text-sm text-red-600">{errores.fecha_factura}</p>}
						</div>
					</div>
				</div>

				{/* Sección: Coberturas */}
				<div className="border rounded-lg p-4 space-y-4">
					<h3 className="font-medium text-gray-900">
						Coberturas <span className="text-red-500">*</span>
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div
							className={`p-4 border rounded-lg cursor-pointer transition-colors ${
								coberturaA ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
							}`}
							onClick={() => setCoberturaA(!coberturaA)}
						>
							<div className="flex items-start gap-3">
								<Checkbox
									checked={coberturaA}
									onCheckedChange={(checked) => setCoberturaA(!!checked)}
								/>
								<div>
									<Label className="font-medium cursor-pointer">Cobertura A - Todo Riesgo</Label>
									<p className="text-sm text-gray-600 mt-1">
										Cubre todos los riesgos de pérdida o daño físico de la mercancía, excepto
										exclusiones específicas.
									</p>
								</div>
							</div>
						</div>

						<div
							className={`p-4 border rounded-lg cursor-pointer transition-colors ${
								coberturaC ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
							}`}
							onClick={() => setCoberturaC(!coberturaC)}
						>
							<div className="flex items-start gap-3">
								<Checkbox
									checked={coberturaC}
									onCheckedChange={(checked) => setCoberturaC(!!checked)}
								/>
								<div>
									<Label className="font-medium cursor-pointer">
										Cobertura C - Riesgos Nombrados
									</Label>
									<p className="text-sm text-gray-600 mt-1">
										Cubre únicamente los riesgos expresamente mencionados en la póliza (incendio,
										naufragio, colisión, etc.).
									</p>
								</div>
							</div>
						</div>
					</div>
					{errores.coberturas && <p className="text-sm text-red-600">{errores.coberturas}</p>}
				</div>

				{/* Sección: Modalidad */}
				<div className="border rounded-lg p-4 space-y-4">
					<h3 className="font-medium text-gray-900">
						Modalidad de Póliza <span className="text-red-500">*</span>
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{MODALIDADES.map((mod) => (
							<div
								key={mod.value}
								className={`p-4 border rounded-lg cursor-pointer transition-colors ${
									modalidad === mod.value ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
								}`}
								onClick={() => setModalidad(mod.value)}
							>
								<div className="flex items-start gap-3">
									<div
										className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
											modalidad === mod.value ? "border-blue-500" : "border-gray-300"
										}`}
									>
										{modalidad === mod.value && (
											<div className="w-2 h-2 rounded-full bg-blue-500" />
										)}
									</div>
									<div>
										<Label className="font-medium cursor-pointer">{mod.label}</Label>
										<p className="text-sm text-gray-600 mt-1">{mod.descripcion}</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 mt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>
				<Button onClick={handleContinuar}>
					Continuar
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
