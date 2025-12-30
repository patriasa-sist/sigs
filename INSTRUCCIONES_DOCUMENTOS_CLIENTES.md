# Sistema de Carga de Documentos de Clientes - Instrucciones de Instalación

## Resumen
Se ha implementado un sistema completo de carga de documentos para el módulo de clientes, permitiendo adjuntar documentos requeridos y opcionales según el tipo de cliente (Natural, Unipersonal, Jurídico).

## Pasos de Instalación

### 1. Ejecutar la Migración SQL

**IMPORTANTE**: Debes ejecutar la migración manualmente en Supabase SQL Editor.

1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Abre el archivo: `supabase/migrations/20250130_clientes_documentos.sql`
4. Copia todo el contenido del archivo
5. Pégalo en el SQL Editor
6. Ejecuta la migración (botón "Run" o Ctrl+Enter)

La migración creará:
- ✅ Bucket de Storage `clientes-documentos`
- ✅ Tabla `clientes_documentos` con soft delete
- ✅ Políticas RLS para seguridad
- ✅ Funciones de soft delete (descartar, restaurar, eliminar permanente)
- ✅ Vistas con información de auditoría

### 2. Verificar que el Bucket fue Creado

Después de ejecutar la migración:

1. Ve a Storage en Supabase Dashboard
2. Deberías ver el bucket `clientes-documentos` (público)
3. Si no aparece, créalo manualmente:
   - Click en "New Bucket"
   - Name: `clientes-documentos`
   - Public bucket: ✅ (activado)
   - Click "Save"

### 3. Verificar las Tablas

En Supabase Dashboard → Table Editor, verifica que existe:
- `clientes_documentos` (nueva tabla)

Con las columnas:
- `id`, `client_id`, `tipo_documento`, `nombre_archivo`, `tipo_archivo`
- `tamano_bytes`, `storage_path`, `storage_bucket`, `estado`
- `subido_por`, `fecha_subida`, `descartado_por`, `fecha_descarte`
- `descripcion`, `created_at`, `updated_at`

### 4. No se Requieren Más Pasos

El código ya está integrado en:
- ✅ Tipos TypeScript (`types/clienteDocumento.ts`)
- ✅ Componente de carga (`components/clientes/ClienteDocumentUpload.tsx`)
- ✅ Formularios de clientes (Natural, Unipersonal, Jurídico)
- ✅ Lógica de guardado (`app/clientes/nuevo/page.tsx`)

## Documentos por Tipo de Cliente

### Cliente Natural (Persona Natural)
**Obligatorios:**
- ✅ Documento de Identidad
- ✅ Formulario Conoce a tu Cliente (KYC)

**Opcionales:**
- Certificación PEP

### Cliente Unipersonal (Persona Natural + Comercial)
**Obligatorios:**
- ✅ Documento de Identidad
- ✅ Formulario Conoce a tu Cliente (KYC)

**Opcionales:**
- Certificación PEP
- NIT
- Matrícula de Comercio

### Cliente Jurídico (Persona Jurídica)
**Obligatorios:**
- ✅ Formulario Conoce a tu Cliente (KYC)

**Opcionales:**
- NIT
- Matrícula de Comercio
- Testimonio de Constitución Social
- Balance General y Estado de Resultados
- Poder de Representación
- Documento de Identidad del Representante Legal
- Certificación PEP

## Características Implementadas

### 1. Componente de Carga
- ✅ Drag & drop de archivos
- ✅ Validación de tipo (PDF, JPG, PNG, DOC, DOCX)
- ✅ Validación de tamaño (máx 10MB por archivo)
- ✅ Indicador de documentos obligatorios
- ✅ Preview de archivos cargados
- ✅ Descripción opcional por documento
- ✅ No permite duplicados del mismo tipo

### 2. Soft Delete System
- ✅ **Comercial**: Puede descartar documentos (estado → "descartado")
- ✅ **Admin**: Puede descartar, restaurar y eliminar permanentemente
- ✅ Documentos descartados ocultos en UI
- ✅ Funciones de base de datos: `descartar_documento_cliente()`, `restaurar_documento_cliente()`, `eliminar_documento_cliente_permanente()`

### 3. Seguridad (RLS)
- ✅ Solo usuarios autenticados pueden subir
- ✅ Solo admins pueden eliminar permanentemente de Storage
- ✅ Documentos activos visibles para todos los usuarios autenticados
- ✅ Solo admins pueden ver documentos descartados

### 4. Auditoría Completa
- ✅ `subido_por` - Usuario que subió el documento
- ✅ `fecha_subida` - Timestamp de carga
- ✅ `descartado_por` - Usuario que descartó (si aplica)
- ✅ `fecha_descarte` - Timestamp de descarte (si aplica)
- ✅ Vista `clientes_documentos_con_auditoria` con emails y nombres

## Flujo de Uso

### Al Registrar un Cliente Nuevo

1. Usuario selecciona tipo de cliente (Natural/Unipersonal/Jurídico)
2. Completa datos personales/comerciales/jurídicos
3. **Nueva sección "Documentos del Cliente"** aparece al final del formulario
4. Usuario selecciona tipo de documento del dropdown
5. Arrastra/selecciona archivo(s)
6. Archivo se valida automáticamente
7. Se agrega a la lista de documentos cargados
8. Usuario puede agregar más documentos o continuar
9. Al guardar el cliente:
   - Se crean registros en tablas base (clients, natural_clients, etc.)
   - Se suben archivos a Storage (`clientes-documentos` bucket)
   - Se registran metadatos en `clientes_documentos` table
   - Usuario es redirigido a `/clientes`

### Validaciones

#### En el Cliente (Frontend)
- ✅ Sistema verifica documentos obligatorios
- ✅ Muestra advertencia si faltan documentos obligatorios
- ✅ No bloquea guardado (solo advierte)
- ✅ Valida tipos de archivo permitidos
- ✅ Valida tamaño máximo (10MB)

#### En el Servidor
- ✅ Sube cada archivo a Storage con path único
- ✅ Registra metadatos en base de datos
- ✅ Maneja errores de carga
- ✅ Rollback manual si falla (advertencia en logs)

## Solución de Problemas

### Error: "Bucket does not exist"
**Solución**: Crear el bucket manualmente en Supabase Dashboard → Storage

### Error: "Row Level Security policy violation"
**Solución**: Verificar que las políticas RLS se crearon correctamente (ejecutar migración completa)

### Error: "File size exceeds limit"
**Solución**: El usuario está intentando subir archivos mayores a 10MB. Reducir tamaño o comprimir PDF/imágenes.

### Error: "Document type not allowed"
**Solución**: Solo se permiten PDF, JPG, PNG, DOC, DOCX. Convertir archivo a formato permitido.

## Estructura de Archivos Creados/Modificados

### Nuevos Archivos
```
supabase/migrations/
  └── 20250130_clientes_documentos.sql         # Migración SQL completa

types/
  └── clienteDocumento.ts                      # Tipos TypeScript para documentos

components/clientes/
  └── ClienteDocumentUpload.tsx                # Componente de carga de documentos
```

### Archivos Modificados
```
types/clientForm.ts                            # Agregado campo "documentos"

components/clientes/
  ├── NaturalClientForm.tsx                    # Integrado componente de documentos
  ├── UnipersonalClientForm.tsx                # Integrado componente de documentos
  └── JuridicClientForm.tsx                    # Integrado componente de documentos

app/clientes/nuevo/page.tsx                    # Agregada lógica de carga a Storage
```

## Testing Recomendado

Después de ejecutar la migración, probar:

1. ✅ Crear cliente Natural con documentos obligatorios
2. ✅ Crear cliente Natural sin documentos (verificar advertencia)
3. ✅ Crear cliente Unipersonal con todos los documentos
4. ✅ Crear cliente Jurídico con documentos obligatorios
5. ✅ Intentar subir archivo > 10MB (debe fallar)
6. ✅ Intentar subir archivo no permitido (.txt, .exe) (debe fallar)
7. ✅ Ver cliente guardado en `/clientes` (verificar que se guardó)
8. ✅ Verificar en Supabase Storage que archivos existen
9. ✅ Verificar en tabla `clientes_documentos` que metadatos se guardaron

## Próximos Pasos (Opcionales)

Mejoras futuras que podrías implementar:

- [ ] Pantalla de visualización de documentos del cliente (en detalle)
- [ ] Descarga de documentos
- [ ] Edición de cliente con actualización de documentos
- [ ] Soft delete UI para comerciales (botón "Descartar")
- [ ] Admin panel para ver/restaurar documentos descartados
- [ ] Limpieza automática de documentos descartados (90+ días)
- [ ] Compresión de imágenes al subir
- [ ] Preview de PDFs en modal
- [ ] Firma digital de documentos

## Soporte

Si encuentras algún problema:
1. Revisa los logs del navegador (Console)
2. Revisa los logs de Supabase (Logs → Functions/Storage)
3. Verifica que la migración se ejecutó completamente
4. Verifica permisos RLS en Supabase Dashboard

---

**Fecha de implementación**: 2025-01-30
**Desarrollado por**: Claude Code
**Versión**: 1.0
