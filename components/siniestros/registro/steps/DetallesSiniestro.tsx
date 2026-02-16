"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { obtenerUsuariosResponsables } from "@/app/siniestros/actions";
import type { DetallesSiniestro, ContactoSiniestro, Moneda } from "@/types/siniestro";

interface DetallesSiniestroProps {
	detalles: DetallesSiniestro | null;
	onDetallesChange: (detalles: DetallesSiniestro) => void;
}

type Regional = {
	id: string;
	nombre: string;
	codigo: string;
};

type UsuarioResponsable = {
	id: string;
	full_name: string;
	email: string;
	role: string;
};

const MONEDAS: Moneda[] = ["Bs", "USD", "USDT", "UFV"];

export default function DetallesSiniestroStep({ detalles, onDetallesChange }: DetallesSiniestroProps) {
	const [regionales, setRegionales] = useState<Regional[]>([]);
	const [responsables, setResponsables] = useState<UsuarioResponsable[]>([]);
	const [usuarioActualId, setUsuarioActualId] = useState<string | null>(null);
	const [nuevoContacto, setNuevoContacto] = useState<{ nombre: string; telefono: string; correo: string }>({
		nombre: "",
		telefono: "",
		correo: "",
	});
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [advertenciaFechaReporte, setAdvertenciaFechaReporte] = useState(false);

	// Cargar regionales (departamentos)
	useEffect(() => {
		async function cargarRegionales() {
			const supabase = createClient();
			const { data } = await supabase.from("regionales").select("id, nombre, codigo").order("nombre");

			if (data) {
				setRegionales(data);
			}
		}

		cargarRegionales();
	}, []);

	// Cargar usuarios responsables (scoped por equipo) y usuario actual
	useEffect(() => {
		async function cargarResponsables() {
			const supabase = createClient();

			// Obtener usuario actual
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				setUsuarioActualId(user.id);

				// Si no hay responsable asignado todavía, asignar al usuario actual
				if (!detalles?.responsable_id) {
					handleFieldChange("responsable_id", user.id);
				}
			}

			// Obtener usuarios responsables via server action (scoped por equipo)
			const result = await obtenerUsuariosResponsables();
			if (result.success) {
				setResponsables(result.data.usuarios);
			}
		}

		cargarResponsables();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleFieldChange = (field: keyof DetallesSiniestro, value: string | number | ContactoSiniestro[]) => {
		const nuevosDetalles = {
			...detalles,
			[field]: value,
		} as DetallesSiniestro;

		onDetallesChange(nuevosDetalles);

		// Limpiar error del campo
		if (errores[field]) {
			setErrores((prev) => {
				const newErrors = { ...prev };
				delete newErrors[field];
				return newErrors;
			});
		}
	};

	const validarFechaReporte = (fechaSiniestro?: string) => {
		const fechaSin = fechaSiniestro || detalles?.fecha_siniestro;

		if (!fechaSin) {
			setAdvertenciaFechaReporte(false);
			return;
		}

		const dateSiniestro = new Date(fechaSin);
		const hoy = new Date();
		const diff = hoy.getTime() - dateSiniestro.getTime();
		const diasDiferencia = Math.floor(diff / (1000 * 60 * 60 * 24));

		// Advertir si el siniestro ocurrió hace más de 10 días
		setAdvertenciaFechaReporte(diasDiferencia > 10);
	};

	const handleAgregarContacto = () => {
		if (!nuevoContacto.nombre.trim() || !nuevoContacto.telefono.trim()) {
			return;
		}

		const contactosActuales = detalles?.contactos || [];
		const nuevoContactoObj: ContactoSiniestro = {
			nombre: nuevoContacto.nombre.trim(),
			telefono: nuevoContacto.telefono.trim(),
			correo: nuevoContacto.correo.trim() || undefined,
		};

		handleFieldChange("contactos", [...contactosActuales, nuevoContactoObj]);
		setNuevoContacto({ nombre: "", telefono: "", correo: "" });
	};

	const handleEliminarContacto = (index: number) => {
		const contactosActuales = detalles?.contactos || [];
		const nuevosContactos = contactosActuales.filter((_, i) => i !== index);
		handleFieldChange("contactos", nuevosContactos);
	};

	// Obtener fecha actual en formato YYYY-MM-DD
	const today = new Date().toISOString().split("T")[0];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Paso 2: Detalles del Siniestro</CardTitle>
				<CardDescription>
					Ingresa los datos específicos del siniestro: fechas, lugar, monto de reserva y descripción
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Advertencia importante */}
				<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
					<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
					<p className="text-amber-900 dark:text-amber-100">
						Todos los campos marcados con (*) son obligatorios. Asegúrate de completar la información
						correctamente.
					</p>
				</div>

				{/* Fechas - Primera fila */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="fecha_siniestro">
							Fecha del Siniestro <span className="text-destructive">*</span>
						</Label>
						<Input
							id="fecha_siniestro"
							type="date"
							value={detalles?.fecha_siniestro || ""}
							onChange={(e) => {
								handleFieldChange("fecha_siniestro", e.target.value);
								validarFechaReporte(e.target.value);
							}}
							max={today}
							className={errores.fecha_siniestro ? "border-destructive" : ""}
						/>
						{errores.fecha_siniestro && (
							<p className="text-sm text-destructive">{errores.fecha_siniestro}</p>
						)}
						{advertenciaFechaReporte && (
							<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
								<AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
								<p className="text-amber-900 dark:text-amber-100">
									El siniestro ocurrió hace más de 10 días
								</p>
							</div>
						)}
						<p className="text-xs text-muted-foreground">Fecha en que ocurrió el siniestro</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="fecha_reporte">
							Fecha Reporte cliente <span className="text-destructive">*</span>
						</Label>
						<Input
							id="fecha_reporte"
							type="date"
							value={detalles?.fecha_reporte || ""}
							onChange={(e) => handleFieldChange("fecha_reporte", e.target.value)}
							max={today}
							className={errores.fecha_reporte ? "border-destructive" : ""}
						/>
						{errores.fecha_reporte && <p className="text-sm text-destructive">{errores.fecha_reporte}</p>}
						<p className="text-xs text-muted-foreground">Fecha en que reportó el cliente</p>
					</div>
				</div>

				{/* Fecha Reporte Compañía */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="fecha_reporte_compania">
							Fecha Reporte Compañía <span className="text-destructive">*</span>
						</Label>
						<Input
							id="fecha_reporte_compania"
							type="date"
							value={detalles?.fecha_reporte_compania || ""}
							onChange={(e) => handleFieldChange("fecha_reporte_compania", e.target.value)}
							max={today}
							className={errores.fecha_reporte_compania ? "border-destructive" : ""}
						/>
						{errores.fecha_reporte_compania && (
							<p className="text-sm text-destructive">{errores.fecha_reporte_compania}</p>
						)}
						<p className="text-xs text-muted-foreground">
							Fecha en que se reportó a la compañía aseguradora
						</p>
					</div>
				</div>

				{/* Lugar y Departamento */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="lugar_hecho">
							Lugar del Hecho <span className="text-destructive">*</span>
						</Label>
						<Input
							id="lugar_hecho"
							placeholder="Ej: Av. 6 de Agosto y calle Capitán Ravelo"
							value={detalles?.lugar_hecho || ""}
							onChange={(e) => handleFieldChange("lugar_hecho", e.target.value)}
							className={errores.lugar_hecho ? "border-destructive" : ""}
						/>
						{errores.lugar_hecho && <p className="text-sm text-destructive">{errores.lugar_hecho}</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor="departamento">
							Departamento <span className="text-destructive">*</span>
						</Label>
						<Select
							value={detalles?.departamento_id || ""}
							onValueChange={(value) => handleFieldChange("departamento_id", value)}
						>
							<SelectTrigger
								id="departamento"
								className={errores.departamento_id ? "border-destructive" : ""}
							>
								<SelectValue placeholder="Selecciona un departamento" />
							</SelectTrigger>
							<SelectContent>
								{regionales.map((reg) => (
									<SelectItem key={reg.id} value={reg.id}>
										{reg.nombre}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errores.departamento_id && (
							<p className="text-sm text-destructive">{errores.departamento_id}</p>
						)}
					</div>
				</div>

				{/* Monto de Reserva y Moneda */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2 md:col-span-2">
						<Label htmlFor="monto_reserva">
							Monto de Reserva <span className="text-destructive">*</span>
						</Label>
						<Input
							id="monto_reserva"
							type="number"
							step="0.01"
							min="0"
							placeholder="0.00"
							value={detalles?.monto_reserva || ""}
							onChange={(e) => handleFieldChange("monto_reserva", parseFloat(e.target.value))}
							className={errores.monto_reserva ? "border-destructive" : ""}
						/>
						{errores.monto_reserva && <p className="text-sm text-destructive">{errores.monto_reserva}</p>}
						<p className="text-xs text-muted-foreground">Monto estimado inicial para cubrir el siniestro</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="moneda">
							Moneda <span className="text-destructive">*</span>
						</Label>
						<Select
							value={detalles?.moneda || ""}
							onValueChange={(value) => handleFieldChange("moneda", value as Moneda)}
						>
							<SelectTrigger id="moneda" className={errores.moneda ? "border-destructive" : ""}>
								<SelectValue placeholder="Selecciona" />
							</SelectTrigger>
							<SelectContent>
								{MONEDAS.map((moneda) => (
									<SelectItem key={moneda} value={moneda}>
										{moneda}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errores.moneda && <p className="text-sm text-destructive">{errores.moneda}</p>}
					</div>
				</div>

				{/* Responsable del Siniestro */}
				<div className="space-y-2">
					<Label htmlFor="responsable">Responsable del Siniestro</Label>
					<Select
						value={detalles?.responsable_id || usuarioActualId || ""}
						onValueChange={(value) => handleFieldChange("responsable_id", value)}
					>
						<SelectTrigger id="responsable">
							<SelectValue placeholder="Selecciona un responsable" />
						</SelectTrigger>
						<SelectContent>
							{responsables.map((resp) => (
								<SelectItem key={resp.id} value={resp.id}>
									{resp.full_name} {resp.id === usuarioActualId && "(Tú)"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Usuario encargado de gestionar este siniestro. Por defecto eres tú, pero puedes cambiarlo.
					</p>
				</div>

				{/* Descripción */}
				<div className="space-y-2">
					<Label htmlFor="descripcion">
						Descripción del Siniestro <span className="text-destructive">*</span>
					</Label>
					<Textarea
						id="descripcion"
						placeholder="Describe detalladamente lo ocurrido: circunstancias, daños, personas involucradas, etc."
						value={detalles?.descripcion || ""}
						onChange={(e) => handleFieldChange("descripcion", e.target.value)}
						rows={5}
						className={errores.descripcion ? "border-destructive" : ""}
					/>
					{errores.descripcion && <p className="text-sm text-destructive">{errores.descripcion}</p>}
					<p className="text-xs text-muted-foreground">
						{detalles?.descripcion?.length || 0} caracteres (mínimo recomendado: 20)
					</p>
				</div>

				{/* Contactos - Nueva estructura */}
				<div className="space-y-2">
					<Label>
						Contactos <span className="text-destructive">*</span>
					</Label>
					<p className="text-xs text-muted-foreground">
						Agrega contactos relacionados al siniestro (cliente, ajustador, perito, etc.)
					</p>

					{/* Formulario para agregar contacto */}
					<Card className="bg-secondary/20">
						<CardContent className="p-4 space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label htmlFor="contacto_nombre" className="text-xs">
										Nombre <span className="text-destructive">*</span>
									</Label>
									<Input
										id="contacto_nombre"
										placeholder="Nombre completo"
										value={nuevoContacto.nombre}
										onChange={(e) => setNuevoContacto({ ...nuevoContacto, nombre: e.target.value })}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="contacto_telefono" className="text-xs">
										Teléfono <span className="text-destructive">*</span>
									</Label>
									<Input
										id="contacto_telefono"
										placeholder="Ej: 70123456"
										value={nuevoContacto.telefono}
										onChange={(e) =>
											setNuevoContacto({ ...nuevoContacto, telefono: e.target.value })
										}
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label htmlFor="contacto_correo" className="text-xs">
									Correo electrónico (opcional)
								</Label>
								<Input
									id="contacto_correo"
									type="email"
									placeholder="email@ejemplo.com"
									value={nuevoContacto.correo}
									onChange={(e) => setNuevoContacto({ ...nuevoContacto, correo: e.target.value })}
								/>
							</div>
							<Button
								type="button"
								onClick={handleAgregarContacto}
								disabled={!nuevoContacto.nombre.trim() || !nuevoContacto.telefono.trim()}
								size="sm"
							>
								Registrar Contacto
							</Button>
						</CardContent>
					</Card>

					{/* Lista de contactos agregados */}
					{detalles?.contactos && detalles.contactos.length > 0 && (
						<div className="space-y-2 mt-3">
							<p className="text-sm font-medium">Contactos agregados:</p>
							<div className="space-y-2">
								{detalles.contactos.map((contacto, index) => (
									<div
										key={index}
										className="flex items-start justify-between bg-secondary/30 rounded-lg px-3 py-2 border"
									>
										<div className="flex-1">
											<p className="text-sm font-medium">{contacto.nombre}</p>
											<p className="text-xs text-muted-foreground">Tel: {contacto.telefono}</p>
											{contacto.correo && (
												<p className="text-xs text-muted-foreground">
													Email: {contacto.correo}
												</p>
											)}
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleEliminarContacto(index)}
											className="h-6 w-6 p-0"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
