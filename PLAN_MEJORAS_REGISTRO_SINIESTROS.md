# Plan de Mejoras: Registro de Siniestros

## Resumen Ejecutivo

Este documento detalla las mejoras y correcciones solicitadas para el módulo de registro de siniestros, organizadas por prioridad y dependencias.

---

## 1. CAMBIOS EN LA BASE DE DATOS

### 1.1 Nuevas Columnas en Tabla `siniestros`

**Agregar**:
```sql
ALTER TABLE siniestros
ADD COLUMN fecha_reporte_cliente DATE, -- Fecha de reporte del cliente
ADD COLUMN fecha_reporte_compania DATE; -- Fecha de reporte a la compañía

-- Renombrar fecha_reporte por claridad
ALTER TABLE siniestros
RENAME COLUMN fecha_reporte TO fecha_reporte_siniestro;
```

### 1.2 Nueva Estructura de Contactos

**Cambio**: De `contactos jsonb` (array de strings) a estructura de objetos:

```typescript
type Contacto = {
  nombre: string;      // Obligatorio
  telefono: string;    // Obligatorio
  correo?: string;     // Opcional
}
```

**Impacto**: Este es un cambio retrocompatible. Los contactos existentes (array de strings/emails) seguirán funcionando pero no tendrán el nuevo formato. Nuevos siniestros usarán la nueva estructura.

### 1.3 Nueva Cobertura Hardcodeada

**Agregar** a `coberturas_catalogo`:
```sql
INSERT INTO coberturas_catalogo (nombre, descripcion, ramo, codigo_puc, es_custom, activo)
VALUES ('Gestión comercial', 'Cobertura de gestión comercial aplicable a todos los ramos', 'General', null, false, true);
```

**Nota**: Esta cobertura será visible en TODOS los ramos como opción adicional.

---

## 2. MODIFICACIONES A TIPOS TYPESCRIPT

### 2.1 Archivo: `types/siniestro.ts`

**Actualizar tipo `DetallesSiniestro` (líneas 164-174)**:

```typescript
// ANTES
export type DetallesSiniestro = {
	fecha_siniestro: string;
	fecha_reporte: string;
	lugar_hecho: string;
	departamento_id: string;
	monto_reserva: number;
	moneda: Moneda;
	descripcion: string;
	contactos: string[]; // Array de emails
	responsable_id?: string;
};

// DESPUÉS
export type ContactoSiniestro = {
	nombre: string;      // Obligatorio
	telefono: string;    // Obligatorio
	correo?: string;     // Opcional
};

export type DetallesSiniestro = {
	fecha_siniestro: string;
	fecha_reporte_siniestro: string; // Renombrado por claridad
	fecha_reporte_cliente: string;   // NUEVO
	fecha_reporte_compania: string;  // NUEVO
	lugar_hecho: string;
	departamento_id: string;
	monto_reserva: number;
	moneda: Moneda;
	descripcion: string;
	contactos: ContactoSiniestro[]; // ACTUALIZADO: De strings a objetos
	responsable_id?: string;
};
```

---

## 3. MODIFICACIONES A COMPONENTES

### 3.1 PASO 2: `components/siniestros/registro/steps/DetallesSiniestro.tsx`

**Cambios**:

#### A. Agregar campos de fecha (líneas 146-178)

**Modificar sección de fechas** para incluir 3 fechas en grid:

```tsx
{/* Fechas */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
	<div className="space-y-2">
		<Label htmlFor="fecha_siniestro">
			Fecha del Siniestro <span className="text-destructive">*</span>
		</Label>
		<Input
			id="fecha_siniestro"
			type="date"
			value={detalles?.fecha_siniestro || ""}
			onChange={(e) => handleFieldChange("fecha_siniestro", e.target.value)}
			max={today}
		/>
	</div>

	<div className="space-y-2">
		<Label htmlFor="fecha_reporte_siniestro">
			Fecha Reporte Siniestro <span className="text-destructive">*</span>
		</Label>
		<Input
			id="fecha_reporte_siniestro"
			type="date"
			value={detalles?.fecha_reporte_siniestro || ""}
			onChange={(e) => {
				handleFieldChange("fecha_reporte_siniestro", e.target.value);
				validarFechaReporte(e.target.value);
			}}
			max={today}
		/>
		{advertenciaFechaReporte && (
			<div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
				<AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
				<p className="text-amber-900 dark:text-amber-100">
					Esta fecha tiene más de 10 días de antigüedad
				</p>
			</div>
		)}
	</div>

	<div className="space-y-2">
		<Label htmlFor="fecha_reporte_cliente">
			Fecha Reporte Cliente <span className="text-destructive">*</span>
		</Label>
		<Input
			id="fecha_reporte_cliente"
			type="date"
			value={detalles?.fecha_reporte_cliente || ""}
			onChange={(e) => handleFieldChange("fecha_reporte_cliente", e.target.value)}
			max={today}
		/>
	</div>
</div>

<div className="grid grid-cols-1 gap-4">
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
		/>
	</div>
</div>
```

**Agregar validación** (después de línea 108):

```tsx
const [advertenciaFechaReporte, setAdvertenciaFechaReporte] = useState(false);

const validarFechaReporte = (fecha: string) => {
	if (!fecha) return;

	const fechaReporte = new Date(fecha);
	const hoy = new Date();
	const diff = hoy.getTime() - fechaReporte.getTime();
	const diasDiferencia = Math.floor(diff / (1000 * 60 * 60 * 24));

	setAdvertenciaFechaReporte(diasDiferencia > 10);
};
```

#### B. Cambiar sección de contactos (líneas 308-357)

**Reemplazar completamente** con nuevo componente de contactos:

```tsx
{/* Contactos */}
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
						onChange={(e) => setNuevoContacto({ ...nuevoContacto, telefono: e.target.value })}
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
				<Plus className="h-4 w-4 mr-2" />
				Agregar Contacto
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
								<p className="text-xs text-muted-foreground">Email: {contacto.correo}</p>
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
```

**Agregar estado** (después de línea 44):

```tsx
const [nuevoContacto, setNuevoContacto] = useState<{ nombre: string; telefono: string; correo: string }>({
	nombre: "",
	telefono: "",
	correo: "",
});
```

**Actualizar handlers**:

```tsx
const handleAgregarContacto = () => {
	if (!nuevoContacto.nombre.trim() || !nuevoContacto.telefono.trim()) {
		return;
	}

	const contactosActuales = detalles?.contactos || [];
	const nuevoContactoObj = {
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
```

---

### 3.2 PASO 3: `components/siniestros/registro/steps/Coberturas.tsx`

**Cambio**: Agregar "Gestión comercial" como cobertura adicional seleccionable.

**Modificar componente** para incluir checkbox adicional antes del selector:

```tsx
<CardContent className="space-y-4">
	{/* Información del ramo */}
	<div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
		<AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
		<div className="text-blue-900 dark:text-blue-100">
			<p className="font-medium mb-1">Ramo de la póliza: {ramo}</p>
			<p className="text-sm">
				Las coberturas mostradas corresponden a este tipo de seguro. Selecciona todas las que
				apliquen al siniestro reportado.
			</p>
		</div>
	</div>

	{/* Cobertura especial: Gestión comercial */}
	<Card className="border-2 border-dashed border-primary/30">
		<CardContent className="p-3">
			<div className="flex items-start gap-3">
				<Checkbox
					id="cobertura-gestion-comercial"
					checked={gestionComercialSeleccionada}
					onCheckedChange={(checked) => handleGestionComercialToggle(checked as boolean)}
				/>
				<div className="flex-1">
					<Label
						htmlFor="cobertura-gestion-comercial"
						className="font-medium cursor-pointer"
					>
						Gestión comercial
					</Label>
					<p className="text-xs text-muted-foreground mt-1">
						Cobertura especial aplicable a todos los ramos
					</p>
				</div>
			</div>
		</CardContent>
	</Card>

	{/* Selector de coberturas del ramo */}
	<CoberturaSelector
		ramo={ramo}
		coberturasSeleccionadas={coberturas?.coberturas_seleccionadas || []}
		onCoberturaToggle={handleCoberturaToggle}
		onCobertulaCustom={handleCoberturaCustom}
		nuevaCobertura={coberturas?.nueva_cobertura}
	/>

	{/* ... resto del código */}
</CardContent>
```

**Agregar imports**:

```tsx
import { Checkbox } from "@/components/ui/checkbox";
```

**Agregar estado y handlers**:

```tsx
const [gestionComercialSeleccionada, setGestionComercialSeleccionada] = useState(false);

const handleGestionComercialToggle = (selected: boolean) => {
	setGestionComercialSeleccionada(selected);

	const coberturasActuales = coberturas?.coberturas_seleccionadas || [];

	if (selected) {
		// Agregar gestión comercial
		const gestionComercial: CoberturaSeleccionada = {
			id: "gestion-comercial-special",
			nombre: "Gestión comercial",
			descripcion: "Cobertura especial aplicable a todos los ramos",
		};
		onCoberturasChange({
			...coberturas,
			coberturas_seleccionadas: [...coberturasActuales, gestionComercial],
		} as CoberturasStep);
	} else {
		// Quitar gestión comercial
		const nuevasCoberturas = coberturasActuales.filter((c) => c.id !== "gestion-comercial-special");
		onCoberturasChange({
			...coberturas,
			coberturas_seleccionadas: nuevasCoberturas,
		} as CoberturasStep);
	}
};

// Inicializar estado si ya está seleccionada
useEffect(() => {
	const yaSeleccionada = coberturas?.coberturas_seleccionadas?.some(
		(c) => c.id === "gestion-comercial-special"
	);
	setGestionComercialSeleccionada(yaSeleccionada || false);
}, [coberturas]);
```

---

### 3.3 PASO 4: `components/siniestros/registro/steps/DocumentosIniciales.tsx`

**Cambio**: Reemplazar el uploader simple por vista de pestañas laterales similar a `DocumentosPorTipo.tsx`.

**Estrategia**: Crear componente híbrido que:
1. Use pestañas laterales por tipo de documento
2. Permita subir archivos antes de guardar (mantener en memoria como File objects)
3. Muestre miniaturas de imágenes
4. Sea similar a DocumentosPorTipo pero sin persistencia a Storage

**Estructura**:

```tsx
export default function DocumentosInicialesStep({
	documentos,
	onAgregarDocumento,
	onEliminarDocumento,
}: DocumentosInicialesProps) {
	const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoDocumentoSiniestro>(TIPOS_DOCUMENTO_SINIESTRO[0]);

	// Agrupar documentos por tipo
	const documentosPorTipo = useMemo(() => {
		const grupos: Record<TipoDocumentoSiniestro, DocumentoSiniestro[]> = {} as any;
		TIPOS_DOCUMENTO_SINIESTRO.forEach((tipo) => {
			grupos[tipo] = documentos.filter((doc) => doc.tipo_documento === tipo);
		});
		return grupos;
	}, [documentos]);

	const documentosFiltrados = documentosPorTipo[tipoSeleccionado] || [];

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validar tamaño
		if (file.size > 20 * 1024 * 1024) {
			toast.error("El archivo excede el tamaño máximo de 20MB");
			return;
		}

		// Crear documento con el tipo seleccionado
		const documento: DocumentoSiniestro = {
			tipo_documento: tipoSeleccionado,
			nombre_archivo: file.name,
			file,
			tamano_bytes: file.size,
		};

		onAgregarDocumento(documento);
		e.target.value = ""; // Reset input
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Paso 4: Documentos Iniciales (Opcional)</CardTitle>
				<CardDescription>
					Adjunta los documentos relacionados al siniestro organizados por tipo
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
					{/* Sidebar con pestañas */}
					<Card className="lg:col-span-1 overflow-y-auto">
						<CardContent className="p-2 space-y-1">
							{TIPOS_DOCUMENTO_SINIESTRO.map((tipo) => {
								const count = documentosPorTipo[tipo]?.length || 0;
								const isActive = tipoSeleccionado === tipo;

								return (
									<button
										key={tipo}
										onClick={() => setTipoSeleccionado(tipo)}
										className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
											isActive
												? "bg-primary text-primary-foreground font-medium"
												: "hover:bg-secondary text-muted-foreground"
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="truncate">{tipo}</span>
											{count > 0 && (
												<span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
													isActive ? "bg-primary-foreground/20" : "bg-secondary"
												}`}>
													{count}
												</span>
											)}
										</div>
									</button>
								);
							})}
						</CardContent>
					</Card>

					{/* Área principal con documentos */}
					<Card className="lg:col-span-3">
						<CardContent className="p-6 h-full flex flex-col">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold">{tipoSeleccionado}</h3>
								<div>
									<Input
										id={`file-upload-${tipoSeleccionado}`}
										type="file"
										className="hidden"
										onChange={handleFileUpload}
										accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
									/>
									<Label htmlFor={`file-upload-${tipoSeleccionado}`}>
										<Button variant="outline" size="sm" asChild>
											<span>
												<Upload className="mr-2 h-4 w-4" />
												Subir Archivo
											</span>
										</Button>
									</Label>
								</div>
							</div>

							{/* Lista de documentos */}
							<div className="flex-1 overflow-y-auto">
								{documentosFiltrados.length === 0 ? (
									<div className="h-full flex items-center justify-center">
										<div className="text-center text-muted-foreground">
											<FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
											<p className="text-sm">No hay documentos de este tipo</p>
										</div>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
										{documentosFiltrados.map((doc, index) => {
											const globalIndex = documentos.findIndex((d) => d === doc);
											const esImagen = (nombreArchivo: string) => {
												const ext = nombreArchivo.split(".").pop()?.toLowerCase();
												return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
											};

											return (
												<div key={globalIndex} className="border rounded-lg p-3 space-y-2">
													{/* Miniatura */}
													<div className="aspect-video bg-secondary rounded-md flex items-center justify-center overflow-hidden">
														{esImagen(doc.nombre_archivo) && doc.file ? (
															<img
																src={URL.createObjectURL(doc.file)}
																alt={doc.nombre_archivo}
																className="w-full h-full object-cover"
															/>
														) : (
															<FileText className="h-12 w-12 text-muted-foreground" />
														)}
													</div>

													{/* Información */}
													<div>
														<p className="text-sm font-medium truncate" title={doc.nombre_archivo}>
															{doc.nombre_archivo}
														</p>
														<p className="text-xs text-muted-foreground">
															{doc.tamano_bytes ? `${(doc.tamano_bytes / 1024).toFixed(1)} KB` : ""}
														</p>
													</div>

													{/* Acciones */}
													<div className="flex gap-2">
														<Button
															variant="destructive"
															size="sm"
															onClick={() => onEliminarDocumento(globalIndex)}
															className="flex-1"
														>
															<Trash2 className="mr-1 h-3 w-3" />
															Eliminar
														</Button>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</CardContent>
		</Card>
	);
}
```

---

## 4. CORRECCIONES DE ERRORES

### 4.1 Dashboard: Datos de Cliente No Visibles

**Problema**: Usuario reporta que no se ven datos de cliente en la tabla.

**Análisis**: La tabla `SiniestrosTable.tsx` en líneas 122-128 SÍ muestra:
- `cliente_nombre` (línea 124)
- `cliente_documento` (línea 126)

**Verificación necesaria**:
1. Revisar que `obtenerSiniestrosConAtencion()` en `app/siniestros/actions.ts` retorne estos campos
2. Verificar que la vista `siniestros_con_estado_actual` incluya estos campos

**Solución**: Si los campos no están en la vista, actualizar la vista para incluirlos explícitamente.

---

### 4.2 Resumen: Secciones Duplicadas

**Problema**: Usuario reporta que hay dos secciones con la misma información (datos cliente y póliza).

**Análisis del archivo `EditarSiniestroForm.tsx`**:

**Tab "Resumen" (líneas 175-192)**:
```tsx
<TabsContent value="resumen" className="mt-6 space-y-6">
	{/* Último cambio destacado */}
	<UltimoCambioSiniestro
		historial={historial}
		onVerHistorialCompleto={() => setActiveTab("historial")}
	/>

	{/* Datos básicos del siniestro */}
	<ResumenReadonly siniestro={siniestro} coberturas={coberturas} />

	<Separator className="my-6" />

	{/* Datos completos de la póliza y cliente */}
	<div>
		<h3 className="text-lg font-semibold mb-4">Datos Completos de la Póliza</h3>
		<DetallePolizaSiniestro polizaId={siniestro.poliza_id} />
	</div>
</TabsContent>
```

**Análisis de `ResumenReadonly.tsx`**: Tiene 3 secciones:
1. Detalles del Siniestro (líneas 17-90)
2. Coberturas Aplicadas (líneas 93-121)
3. Responsable del Siniestro (líneas 124-162)

**DetallePolizaSiniestro**: Probablemente muestra info de la póliza completa incluyendo datos del cliente.

**Solución**:
- El componente `ResumenReadonly` NO muestra datos de póliza/cliente duplicados
- El problema puede estar en que `DetallePolizaSiniestro` muestre info que ya está en el header del EditarSiniestroForm
- **Acción**: Revisar qué muestra `DetallePolizaSiniestro` y posiblemente eliminarlo o simplificarlo

---

### 4.3 Último Cambio No Refleja Estado

**Problema**: El componente `UltimoCambioSiniestro` no muestra cambios de estado.

**Análisis del componente (líneas 14-22)**:
```tsx
useEffect(() => {
	if (historial && historial.length > 0) {
		// El historial ya viene ordenado por fecha descendente
		setUltimoCambio(historial[0]);
	}
}, [historial]);
```

**Análisis de visualización (líneas 36-57)**:
```tsx
<div>
	<p className="font-medium text-sm">{ultimoCambio.accion}</p>
	<p className="text-xs text-muted-foreground mt-1">
		Por: {ultimoCambio.usuario_nombre || "Sistema"} •{" "}
		{new Date(ultimoCambio.created_at).toLocaleDateString("es-BO")} a las{" "}
		{new Date(ultimoCambio.created_at).toLocaleTimeString("es-BO", {
			hour: "2-digit",
			minute: "2-digit",
		})}
	</p>
</div>

{ultimoCambio.detalles && typeof ultimoCambio.detalles === "object" && (
	<div className="text-xs bg-white dark:bg-gray-900 rounded-md p-2 border">
		{Object.entries(ultimoCambio.detalles).map(([key, value]) => (
			<div key={key} className="text-muted-foreground">
				<span className="font-medium">{key}:</span> {String(value)}
			</div>
		))}
	</div>
)}
```

**Problema identificado**:
- El componente muestra `ultimoCambio.accion` tal cual (ej: "cambio_estado")
- No traduce la acción a un label legible
- No muestra el `valor_nuevo` que contiene el nombre del estado

**Solución**: Actualizar componente para:
1. Usar el mismo mapeo de labels que `HistorialCronologico.tsx` (ACCION_LABELS)
2. Mostrar `valor_nuevo` para acción "cambio_estado"

```tsx
import { Circle, Edit, FileText, MessageSquare, XCircle, CheckCircle } from "lucide-react";

const ACCION_LABELS = {
	created: "Siniestro Creado",
	updated: "Siniestro Actualizado",
	documento_agregado: "Documento Agregado",
	observacion_agregada: "Observación Agregada",
	cambio_estado: "Estado de Seguimiento Cambiado",
	estado_cambiado: "Estado Cambiado",
	cerrado: "Siniestro Cerrado",
};

// ... dentro del return:

<div>
	<p className="font-medium text-sm">
		{ACCION_LABELS[ultimoCambio.accion as keyof typeof ACCION_LABELS] || ultimoCambio.accion}
	</p>

	{ultimoCambio.accion === "cambio_estado" && ultimoCambio.valor_nuevo && (
		<p className="text-sm text-primary mt-1">
			Estado cambiado a: <span className="font-medium">{ultimoCambio.valor_nuevo}</span>
		</p>
	)}

	<p className="text-xs text-muted-foreground mt-1">
		Por: {ultimoCambio.usuario_nombre || "Sistema"} •{" "}
		{new Date(ultimoCambio.created_at).toLocaleDateString("es-BO")} a las{" "}
		{new Date(ultimoCambio.created_at).toLocaleTimeString("es-BO", {
			hour: "2-digit",
			minute: "2-digit",
		})}
	</p>
</div>
```

---

### 4.4 Historial de Estado Separado

**Problema**: Usuario quiere consolidar el historial de estados con el historial global.

**Estado actual**:
- `SeccionEstados.tsx` muestra su propio "Historial de Estados" (líneas 182-214)
- Este historial viene de `siniestros_estados_historial` table
- El historial global (`siniestros_historial`) ya incluye cambios de estado

**Solución**: Eliminar la sección "Historial de Estados" de `SeccionEstados.tsx`.

**Cambios en `SeccionEstados.tsx`**:

```tsx
// ELIMINAR estas líneas (182-214):

{/* Historial de Estados */}
{historial.length > 0 && (
	<div className="pt-4 border-t">
		<h4 className="text-sm font-medium mb-3">Historial de Estados</h4>
		<div className="space-y-3">
			{historial.map((item, index) => (
				<div key={item.id} className="flex gap-3">
					<div className="flex flex-col items-center">
						<div
							className={`h-2 w-2 rounded-full mt-1 ${
								index === 0 ? "bg-primary" : "bg-muted-foreground"
							}`}
						/>
						{index !== historial.length - 1 && <div className="w-px h-full bg-border mt-1" />}
					</div>
					<div className="flex-1 pb-3">
						<p className="text-sm font-medium">{item.estado.nombre}</p>
						<p className="text-xs text-muted-foreground">
							{item.usuario_nombre || "Sistema"} •{" "}
							{new Date(item.created_at).toLocaleDateString("es-BO")} a las{" "}
							{new Date(item.created_at).toLocaleTimeString("es-BO", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</p>
						{item.observacion && (
							<p className="text-xs text-muted-foreground mt-1 italic">"{item.observacion}"</p>
						)}
					</div>
				</div>
			))}
		</div>
	</div>
)}
```

**Justificación**:
- Los cambios de estado ya se registran en historial global
- Mostrar dos historiales es confuso para el usuario
- El tab "Historial" ya muestra todos los cambios incluyendo estados

---

## 5. ACTUALIZACIONES A SERVER ACTIONS

### 5.1 Archivo: `app/siniestros/actions.ts`

**Modificar función `guardarSiniestro`** para manejar:

1. Nuevos campos de fecha:
```typescript
const { error: siniestroError } = await supabase
	.from("siniestros")
	.insert({
		poliza_id: formState.poliza_seleccionada.id,
		fecha_siniestro: formState.detalles.fecha_siniestro,
		fecha_reporte_siniestro: formState.detalles.fecha_reporte_siniestro, // Actualizado
		fecha_reporte_cliente: formState.detalles.fecha_reporte_cliente,     // NUEVO
		fecha_reporte_compania: formState.detalles.fecha_reporte_compania,   // NUEVO
		lugar_hecho: formState.detalles.lugar_hecho,
		departamento_id: formState.detalles.departamento_id,
		monto_reserva: formState.detalles.monto_reserva,
		moneda: formState.detalles.moneda,
		descripcion: formState.detalles.descripcion,
		contactos: formState.detalles.contactos, // Ya es array de objetos
		responsable_id: formState.detalles.responsable_id,
		estado: "abierto",
	})
	.select()
	.single();
```

2. Validación de contactos:
```typescript
// Validar estructura de contactos
if (formState.detalles.contactos && formState.detalles.contactos.length > 0) {
	for (const contacto of formState.detalles.contactos) {
		if (!contacto.nombre || !contacto.telefono) {
			return {
				success: false,
				error: "Todos los contactos deben tener nombre y teléfono",
			};
		}
	}
}
```

---

## 6. MIGRACIÓN SQL COMPLETA

**Archivo**: `supabase/migrations/20241222_mejoras_registro_siniestros.sql`

```sql
-- Agregar nuevas columnas de fecha
ALTER TABLE siniestros
ADD COLUMN IF NOT EXISTS fecha_reporte_cliente DATE,
ADD COLUMN IF NOT EXISTS fecha_reporte_compania DATE;

-- Renombrar fecha_reporte por claridad
ALTER TABLE siniestros
RENAME COLUMN fecha_reporte TO fecha_reporte_siniestro;

-- Actualizar vistas que referencian fecha_reporte
DROP VIEW IF EXISTS siniestros_vista CASCADE;

-- Recrear vista siniestros_vista con nuevo campo
CREATE VIEW siniestros_vista AS
SELECT
  s.id,
  s.poliza_id,
  s.codigo_siniestro,
  s.fecha_siniestro,
  s.fecha_reporte_siniestro, -- Actualizado
  s.fecha_reporte_cliente,   -- NUEVO
  s.fecha_reporte_compania,  -- NUEVO
  s.lugar_hecho,
  s.departamento_id,
  s.monto_reserva,
  s.moneda,
  s.descripcion,
  s.contactos,
  s.responsable_id,
  s.estado,
  s.created_at,
  s.updated_at,
  s.created_by,
  s.updated_by,

  -- Información de póliza
  p.numero_poliza,
  p.ramo,
  p.inicio_vigencia AS poliza_inicio_vigencia,
  p.fin_vigencia AS poliza_fin_vigencia,

  -- Información del cliente
  COALESCE(pn.nombres || ' ' || pn.primer_apellido, pj.razon_social) AS cliente_nombre,
  COALESCE(pn.ci, pj.nit) AS cliente_documento,
  CASE WHEN pn.id IS NOT NULL THEN 'natural' ELSE 'juridica' END AS cliente_tipo,
  pn.celular AS cliente_celular,
  pn.correo_electronico AS cliente_correo,

  -- Información de responsable
  resp.full_name AS responsable_nombre,
  resp.email AS responsable_email,

  -- Información de compañía
  comp.nombre AS compania_nombre,

  -- Información de departamento
  reg.nombre AS departamento_nombre,
  reg.codigo AS departamento_codigo,

  -- Información de usuario creador
  creador.full_name AS creador_nombre,
  creador.email AS creador_email,

  -- Información de último editor
  editor.full_name AS editor_nombre,
  editor.email AS editor_email

FROM siniestros s
INNER JOIN polizas p ON s.poliza_id = p.id
LEFT JOIN personas_naturales pn ON p.asegurado_id = pn.id AND p.tipo_asegurado = 'natural'
LEFT JOIN personas_juridicas pj ON p.asegurado_id = pj.id AND p.tipo_asegurado = 'juridica'
LEFT JOIN profiles resp ON s.responsable_id = resp.id
LEFT JOIN companias_aseguradoras comp ON p.compania_id = comp.id
LEFT JOIN regionales reg ON s.departamento_id = reg.id
LEFT JOIN profiles creador ON s.created_by = creador.id
LEFT JOIN profiles editor ON s.updated_by = editor.id;

-- Recrear vista siniestros_con_estado_actual
DROP VIEW IF EXISTS siniestros_con_estado_actual CASCADE;

CREATE VIEW siniestros_con_estado_actual AS
SELECT
  -- Todas las columnas de siniestros_vista (59 columnas explícitas)
  sv.id,
  sv.poliza_id,
  sv.codigo_siniestro,
  sv.fecha_siniestro,
  sv.fecha_reporte_siniestro,  -- Actualizado
  sv.fecha_reporte_cliente,    -- NUEVO
  sv.fecha_reporte_compania,   -- NUEVO
  sv.lugar_hecho,
  sv.departamento_id,
  sv.monto_reserva,
  sv.moneda,
  sv.descripcion,
  sv.contactos,
  sv.responsable_id,
  sv.estado,
  sv.created_at,
  sv.updated_at,
  sv.created_by,
  sv.updated_by,
  sv.numero_poliza,
  sv.ramo,
  sv.poliza_inicio_vigencia,
  sv.poliza_fin_vigencia,
  sv.cliente_nombre,
  sv.cliente_documento,
  sv.cliente_tipo,
  sv.cliente_celular,
  sv.cliente_correo,
  sv.responsable_nombre,
  sv.responsable_email,
  sv.compania_nombre,
  sv.departamento_nombre,
  sv.departamento_codigo,
  sv.creador_nombre,
  sv.creador_email,
  sv.editor_nombre,
  sv.editor_email,

  -- Campos de estado actual
  seh.estado_id AS estado_actual_id,
  sec.nombre AS estado_actual_nombre,
  sec.codigo AS estado_actual_codigo,
  seh.created_at AS estado_actual_fecha,
  seh.observacion AS estado_actual_observacion,

  -- Flag de atención
  CASE
    WHEN sv.updated_at < (now() - INTERVAL '10 days') THEN true
    ELSE false
  END AS requiere_atencion

FROM siniestros_vista sv
LEFT JOIN LATERAL (
  SELECT estado_id, created_at, observacion
  FROM siniestros_estados_historial
  WHERE siniestro_id = sv.id
  ORDER BY created_at DESC
  LIMIT 1
) seh ON true
LEFT JOIN siniestros_estados_catalogo sec ON seh.estado_id = sec.id;

-- Insertar cobertura "Gestión comercial"
INSERT INTO coberturas_catalogo (nombre, descripcion, ramo, codigo_puc, es_custom, activo)
VALUES ('Gestión comercial', 'Cobertura de gestión comercial aplicable a todos los ramos', 'General', null, false, true)
ON CONFLICT DO NOTHING;

-- Comentarios para documentación
COMMENT ON COLUMN siniestros.fecha_reporte_siniestro IS 'Fecha en que se reportó el siniestro internamente';
COMMENT ON COLUMN siniestros.fecha_reporte_cliente IS 'Fecha en que el cliente reportó el siniestro';
COMMENT ON COLUMN siniestros.fecha_reporte_compania IS 'Fecha en que se reportó el siniestro a la compañía aseguradora';
COMMENT ON COLUMN siniestros.contactos IS 'Array JSONB de contactos con estructura: {nombre, telefono, correo?}';
```

---

## 7. ORDEN DE IMPLEMENTACIÓN

1. ✅ **Ejecutar migración SQL** (usuario debe ejecutar manualmente)
2. ✅ **Actualizar tipos TypeScript** (`types/siniestro.ts`)
3. ✅ **Actualizar Paso 2** (fechas y contactos)
4. ✅ **Actualizar Paso 3** (gestión comercial)
5. ✅ **Actualizar Paso 4** (vista mejorada documentos)
6. ✅ **Actualizar server actions** (guardarSiniestro)
7. ✅ **Corregir dashboard** (verificar datos cliente)
8. ✅ **Corregir UltimoCambioSiniestro** (mostrar estados)
9. ✅ **Actualizar SeccionEstados** (quitar historial separado)
10. ✅ **Revisar ResumenReadonly** (consolidar secciones)
11. ✅ **Probar flujo completo** de registro

---

## 8. TESTING CHECKLIST

```
[ ] Paso 2: Fechas adicionales se guardan correctamente
[ ] Paso 2: Alerta aparece cuando fecha_reporte_siniestro > 10 días pasados
[ ] Paso 2: Contactos con estructura nombre/teléfono/correo se guardan
[ ] Paso 2: No se puede agregar contacto sin nombre o teléfono
[ ] Paso 3: "Gestión comercial" aparece como opción en todos los ramos
[ ] Paso 3: Se puede seleccionar y guardar "Gestión comercial"
[ ] Paso 4: Documentos se organizan por tipo en pestañas laterales
[ ] Paso 4: Miniaturas de imágenes se muestran correctamente
[ ] Dashboard: Datos de cliente (nombre y documento) son visibles
[ ] Resumen: No hay información duplicada de cliente/póliza
[ ] UltimoCambio: Muestra cambios de estado con nombre del nuevo estado
[ ] SeccionEstados: No muestra historial separado de estados
[ ] Historial: Cambios de estado aparecen en historial global
[ ] Registro completo: Siniestro se guarda con todas las nuevas estructuras
[ ] Edición: Siniestros antiguos siguen funcionando (retrocompatibilidad)
```

---

## 9. NOTAS IMPORTANTES

### Retrocompatibilidad

**Contactos existentes**: Siniestros creados antes de esta actualización tendrán `contactos` como array de strings (emails). El código debe manejar ambos casos:

```typescript
// Helper para normalizar contactos
function normalizarContactos(contactos: any[]): ContactoSiniestro[] {
	if (!contactos || contactos.length === 0) return [];

	// Si el primer elemento es string, son emails viejos
	if (typeof contactos[0] === "string") {
		return contactos.map((email) => ({
			nombre: "Contacto",
			telefono: "N/A",
			correo: email,
		}));
	}

	// Si no, ya son objetos ContactoSiniestro
	return contactos;
}
```

### Validaciones Client-Side vs Server-Side

- **Client-side**: Mostrar alertas (no bloqueantes) para fecha_reporte_siniestro > 10 días
- **Server-side**: Validar que fechas no sean futuras (bloqueante)
- **Server-side**: Validar que contactos tengan nombre y teléfono (bloqueante)

### Performance

- Vista `siniestros_con_estado_actual` tiene 62 columnas (59 + 3 nuevas de fecha)
- Considerar índices en nuevas columnas de fecha si se usan en filtros
- Pestañas de documentos no afectan performance (documentos ya están en memoria)

---

**FIN DEL PLAN**
