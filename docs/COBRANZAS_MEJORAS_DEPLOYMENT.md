# Guía de Testing y Despliegue - Mejoras Módulo Cobranzas

## Tabla de Contenidos
1. [Pre-requisitos](#pre-requisitos)
2. [Resumen de Cambios](#resumen-de-cambios)
3. [Procedimiento de Despliegue](#procedimiento-de-despliegue)
4. [Checklist de Testing](#checklist-de-testing)
5. [Procedimientos de Rollback](#procedimientos-de-rollback)
6. [Limitaciones Conocidas](#limitaciones-conocidas)
7. [Mejoras Futuras](#mejoras-futuras)

---

## Pre-requisitos

### Acceso Requerido
- ✅ Acceso al Dashboard de Supabase (SQL Editor + Storage)
- ✅ Rol de administrador en la base de datos
- ✅ Acceso al repositorio de código
- ✅ Node.js v18+ instalado localmente
- ✅ Usuario de prueba con rol 'cobranza' o 'admin'

### Backups Necesarios
```bash
# Crear backup de la base de datos ANTES de ejecutar migraciones
# Desde Supabase Dashboard: Settings → Database → Create backup

# Backup manual (opcional, si tienes acceso CLI)
pg_dump -h your-project.supabase.co -U postgres -d postgres > backup_cobranzas_$(date +%Y%m%d).sql
```

### Verificar Estado Actual
```sql
-- Verificar que tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('polizas', 'polizas_pagos', 'natural_clients');

-- Verificar columnas actuales en polizas_pagos
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'polizas_pagos';
```

---

## Resumen de Cambios

### Base de Datos
- ✅ Nueva tabla: `polizas_pagos_comprobantes` (comprobantes de pago)
- ✅ Nuevas columnas en `polizas_pagos`: `fecha_vencimiento_original`, `prorrogas_historial`
- ✅ Nuevo Storage bucket: `pagos-comprobantes`
- ✅ Nuevas funciones: `registrar_prorroga_cuota()`, `descartar_comprobante()`, `restaurar_comprobante()`
- ✅ RLS policies para tabla y storage
- ✅ Índices de performance

### Código
- ✅ **types/cobranza.ts**: +237 líneas de tipos nuevos
- ✅ **types/avisoMora.ts**: Nuevo archivo para PDFs
- ✅ **app/cobranzas/actions.ts**:
  - Eliminadas líneas 290-308 (restricción mensual)
  - 4 nuevas server actions
- ✅ **utils/cobranza.ts**: Nuevo archivo con 15 funciones helper
- ✅ **components/cobranzas/**:
  - `RegistrarProrrogaModal.tsx` (nuevo)
  - `RegistrarPagoModal.tsx` (refactorizado - file upload)
  - `CuotasModal.tsx` (refactor completo - contacto, ramo, avisos)
  - `Dashboard.tsx` (agregado sorting completo)

### Mejoras Implementadas
1. ✅ **Adjuntar comprobante** - Obligatorio 1 archivo por pago
2. ✅ **Sin restricción mensual** - Pagar cuotas vencidas en cualquier momento
3. ✅ **Datos de contacto y ramo** - Visualización mejorada en modal
4. ✅ **Aviso de mora** - Botón para generar y enviar por WhatsApp
5. ✅ **Sorting básico** - Ordenar por fecha, nombre, compañía
6. ✅ **Sorting completo** - 9 columnas ordenables
7. ✅ **Recordatorios** - WhatsApp y Email por cuota
8. ✅ **Prórroga de cuota** - Extensión de fecha con historial

---

## Procedimiento de Despliegue

### Fase 1: Migración de Base de Datos (15-20 minutos)

#### Paso 1.1: Acceder a Supabase SQL Editor
1. Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Click en "New query"

#### Paso 1.2: Ejecutar Migración SQL
```sql
-- Copiar TODO el contenido de:
-- supabase/migrations/20251218000000_cobranzas_mejoras.sql

-- Pegar en el SQL Editor y ejecutar (RUN)
-- Tiempo estimado: 2-3 segundos
-- Debería retornar: "Success. No rows returned"
```

#### Paso 1.3: Verificar Tablas Creadas
```sql
-- Verificar tabla de comprobantes
SELECT * FROM polizas_pagos_comprobantes LIMIT 1;
-- Debe retornar: "0 rows" (tabla vacía pero existe)

-- Verificar nuevas columnas
SELECT fecha_vencimiento_original, prorrogas_historial
FROM polizas_pagos LIMIT 1;
-- Debe retornar: NULL, '[]' (campos vacíos pero existen)

-- Verificar función de prórroga
SELECT proname FROM pg_proc WHERE proname = 'registrar_prorroga_cuota';
-- Debe retornar: 1 fila con el nombre de la función
```

#### Paso 1.4: Verificar Índices
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('polizas_pagos_comprobantes', 'polizas_pagos')
AND indexname LIKE 'idx_%';
-- Debe retornar: 4 índices
-- idx_comprobantes_pago_id, idx_comprobantes_estado,
-- idx_pagos_fecha_vencimiento, idx_pagos_estado
```

### Fase 2: Configuración de Storage (5 minutos)

#### Paso 2.1: Crear Bucket (Opción A: UI)
1. Ir a: Storage → "Create a new bucket"
2. Bucket name: `pagos-comprobantes`
3. Public bucket: ✅ **MARCAR** (necesario para RLS)
4. File size limit: 10MB
5. Allowed MIME types: `image/jpeg, image/jpg, image/png, image/webp, application/pdf`
6. Click "Create bucket"

#### Paso 2.2: Crear Bucket (Opción B: SQL)
```sql
-- Ejecutar en SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pagos-comprobantes',
  'pagos-comprobantes',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
```

#### Paso 2.3: Verificar Bucket
```sql
SELECT * FROM storage.buckets WHERE id = 'pagos-comprobantes';
-- Debe retornar: 1 fila con public = true
```

#### Paso 2.4: Verificar RLS Policies de Storage
```sql
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%pagos-comprobantes%';
-- Debe retornar: 3 policies (INSERT, SELECT, DELETE)
```

### Fase 3: Despliegue de Código (10 minutos)

#### Paso 3.1: Actualizar Dependencias (si es necesario)
```bash
cd C:\Users\InNov\Documents\proyectos_varios\PATRIA-SA\sigs
npm install
# Todas las dependencias ya deberían estar instaladas
```

#### Paso 3.2: Build de Producción
```bash
npm run build
# Debe completar sin errores de TypeScript
# Tiempo estimado: 2-3 minutos
```

#### Paso 3.3: Verificar TypeScript
```bash
npx tsc --noEmit
# Debe retornar sin errores
```

#### Paso 3.4: Linting
```bash
npm run lint
# Debe pasar sin errores críticos
```

### Fase 4: Testing en Desarrollo (30 minutos)

#### Paso 4.1: Iniciar Servidor de Desarrollo
```bash
npm run dev
# Acceder a: http://localhost:3000/cobranzas
```

#### Paso 4.2: Login con Usuario de Cobranza
```
Email: usuario-test-cobranza@patriasa.com
Rol: cobranza o admin
```

#### Paso 4.3: Ejecutar Tests Manuales
Ver sección completa: [Checklist de Testing](#checklist-de-testing)

### Fase 5: Despliegue a Producción

#### Opción A: Vercel (Recomendado)
```bash
# Si usas Vercel CLI
vercel --prod

# O hacer push a rama principal (si tienes CI/CD configurado)
git add .
git commit -m "feat: implement 8 cobranzas module improvements"
git push origin master
```

#### Opción B: Build Manual
```bash
npm run build
npm run start
# El servidor corre en puerto 3000
```

### Fase 6: Verificación Post-Despliegue (10 minutos)

#### Paso 6.1: Smoke Tests en Producción
- ✅ Acceder a `/cobranzas`
- ✅ Verificar que tabla carga correctamente
- ✅ Abrir una póliza y ver modal de cuotas
- ✅ Verificar que se muestra información de contacto
- ✅ Intentar registrar un pago (verificar que pide archivo)

#### Paso 6.2: Monitorear Logs
```bash
# Vercel
vercel logs --follow

# O revisar en Supabase Dashboard: Logs → Database → Errors
```

---

## Checklist de Testing

### 🧪 Testing de Mejora #1: Comprobante Obligatorio

#### TC-1.1: Upload de Comprobante Exitoso
- [ ] Abrir modal de cuotas para una póliza
- [ ] Click en "Registrar Pago" para una cuota pendiente
- [ ] Ingresar monto igual a la cuota
- [ ] Seleccionar tipo de comprobante: "Factura"
- [ ] Click en área de upload
- [ ] Seleccionar imagen JPG < 10MB
- [ ] Verificar preview del archivo (nombre, tamaño)
- [ ] Click "Confirmar Pago"
- [ ] **Esperado**: Pago registrado exitosamente, comprobante visible en DB

**Consulta de verificación:**
```sql
SELECT c.*, p.numero_cuota
FROM polizas_pagos_comprobantes c
JOIN polizas_pagos p ON c.pago_id = p.id
ORDER BY c.uploaded_at DESC
LIMIT 1;
-- Debe mostrar el comprobante recién subido
```

#### TC-1.2: Validación de Tamaño de Archivo
- [ ] Intentar subir archivo > 10MB
- [ ] **Esperado**: Error "El archivo excede el tamaño máximo de 10MB"

#### TC-1.3: Validación de Tipo de Archivo
- [ ] Intentar subir archivo .txt o .exe
- [ ] **Esperado**: Error "Tipo de archivo no permitido. Use JPG, PNG, WebP o PDF"

#### TC-1.4: Comprobante es Obligatorio
- [ ] Intentar confirmar pago sin adjuntar archivo
- [ ] **Esperado**: Error "Debe adjuntar un comprobante de pago (obligatorio)"
- [ ] Botón "Confirmar Pago" debe estar deshabilitado

#### TC-1.5: Upload de Diferentes Tipos
- [ ] Subir JPG (debe funcionar)
- [ ] Subir PNG (debe funcionar)
- [ ] Subir WebP (debe funcionar)
- [ ] Subir PDF (debe funcionar)

### 🧪 Testing de Mejora #2: Sin Restricción Mensual

#### TC-2.1: Pago de Cuota Vencida Fuera de su Mes
- [ ] Identificar cuota con `estado = 'vencido'` y `fecha_vencimiento` hace 2+ meses
- [ ] Click "Registrar Pago"
- [ ] Ingresar monto y adjuntar comprobante
- [ ] **Esperado**: Pago registrado sin errores de restricción mensual

**Consulta para encontrar cuota de prueba:**
```sql
SELECT pp.*, pol.numero_poliza
FROM polizas_pagos pp
JOIN polizas pol ON pp.poliza_id = pol.id
WHERE pp.estado = 'vencido'
AND pp.fecha_vencimiento < CURRENT_DATE - INTERVAL '60 days'
LIMIT 1;
```

#### TC-2.2: Pago de Cuota Muy Antigua
- [ ] Intentar pagar cuota vencida hace 6+ meses
- [ ] **Esperado**: Debe permitir el pago sin restricciones

### 🧪 Testing de Mejora #3: Visualización de Datos del Cliente

#### TC-3.1: Contacto de Cliente Natural
- [ ] Abrir modal de cuotas para póliza de cliente natural (persona física)
- [ ] Verificar sección "Información de Contacto"
- [ ] **Esperado**:
  - Teléfono visible con ícono de teléfono
  - Correo visible con ícono de email
  - Fechas de vigencia (inicio y fin)

#### TC-3.2: Datos de Automotor
- [ ] Abrir modal de póliza con `ramo = 'automotor'`
- [ ] Verificar sección "Datos del Vehículo"
- [ ] **Esperado**: Grid con placas, marca, modelo, año de cada vehículo

#### TC-3.3: Datos de Salud/Vida/AP
- [ ] Abrir modal de póliza con `ramo = 'salud'`, `'vida'`, o `'ap'`
- [ ] Verificar sección "Asegurados"
- [ ] **Esperado**: Lista de asegurados con nombre, CI, nivel/cargo

#### TC-3.4: Datos de Incendio
- [ ] Abrir modal de póliza con `ramo = 'incendio'`
- [ ] **Esperado**: Lista de ubicaciones (direcciones)

#### TC-3.5: Ramo Genérico
- [ ] Abrir modal de póliza con ramo no implementado
- [ ] **Esperado**: Mensaje genérico o descripción básica

#### TC-3.6: Cliente sin Teléfono
- [ ] Abrir modal de cliente con `celular = NULL` y `telefono = NULL`
- [ ] **Esperado**: Sección de contacto muestra "-" o "No disponible"

### 🧪 Testing de Mejora #4: Aviso de Mora

#### TC-4.1: Botón Visible con 3+ Cuotas Vencidas
- [ ] Abrir modal de póliza con 3+ cuotas en estado "vencido"
- [ ] **Esperado**: Botón "Generar Aviso de Mora" visible en la parte superior

**Consulta para preparar datos de prueba:**
```sql
-- Buscar póliza con 3+ cuotas vencidas
SELECT pol.id, pol.numero_poliza, COUNT(pp.id) as cuotas_vencidas
FROM polizas pol
JOIN polizas_pagos pp ON pp.poliza_id = pol.id
WHERE pp.estado = 'vencido'
GROUP BY pol.id, pol.numero_poliza
HAVING COUNT(pp.id) >= 3
LIMIT 1;
```

#### TC-4.2: Botón No Visible con Menos de 3 Cuotas Vencidas
- [ ] Abrir modal de póliza con 0, 1 o 2 cuotas vencidas
- [ ] **Esperado**: Botón "Generar Aviso de Mora" NO visible

#### TC-4.3: Generación de Número de Referencia
- [ ] Click "Generar Aviso de Mora"
- [ ] Verificar en console.log o en mensaje de WhatsApp
- [ ] **Esperado**: Número de referencia con formato `AM-YYYYMMDD-{numero_poliza}`
- [ ] Ejemplo: `AM-20251218-AUT-2024-001`

#### TC-4.4: Apertura Automática de WhatsApp
- [ ] Click "Generar Aviso de Mora"
- [ ] **Esperado**:
  - Se abre WhatsApp Web en nueva pestaña
  - Mensaje pre-cargado con texto del aviso
  - Número de teléfono del cliente pre-cargado

#### TC-4.5: Datos del Aviso Completos
- [ ] Verificar que el mensaje incluye:
  - Nombre del cliente
  - Número de póliza
  - Lista de cuotas vencidas (número, monto, fecha, días de mora)
  - Total adeudado
  - Instrucciones de pago

### 🧪 Testing de Mejora #5 & #6: Sorting Completo

#### TC-5.1: Sorting por N° Póliza
- [ ] Click en header "N° Póliza"
- [ ] **Esperado**: Orden ascendente alfabético (A-Z)
- [ ] Click nuevamente
- [ ] **Esperado**: Orden descendente (Z-A)
- [ ] Verificar ícono: ArrowUp (asc) o ArrowDown (desc)

#### TC-5.2: Sorting por Cliente
- [ ] Click en header "Cliente"
- [ ] **Esperado**: Orden ascendente por nombre completo
- [ ] Verificar que clientes con nombres similares se ordenan correctamente

#### TC-5.3: Sorting por Compañía
- [ ] Click en header "Compañía"
- [ ] **Esperado**: Orden ascendente alfabético

#### TC-5.4: Sorting por Cuotas Pendientes
- [ ] Click en header "C. Pendientes"
- [ ] **Esperado**: Orden numérico ascendente (1, 2, 3...)
- [ ] Click nuevamente: descendente (10, 9, 8...)

#### TC-5.5: Sorting por Cuotas Vencidas
- [ ] Click en header "C. Vencidas"
- [ ] **Esperado**: Orden numérico ascendente

#### TC-5.6: Sorting por Total Pendiente
- [ ] Click en header "Total Pendiente"
- [ ] **Esperado**: Orden numérico de montos ascendente
- [ ] Verificar que montos grandes (100,000+) se ordenan correctamente

#### TC-5.7: Sorting con Búsqueda Activa
- [ ] Ingresar término de búsqueda
- [ ] Aplicar sorting a resultados filtrados
- [ ] **Esperado**: Sorting se aplica solo a resultados visibles

#### TC-5.8: Persistencia de Sorting al Cambiar Página
- [ ] Aplicar sorting
- [ ] Navegar a página 2, 3, etc.
- [ ] **Esperado**: Sorting se mantiene consistente en todas las páginas

#### TC-5.9: Reset de Página al Cambiar Sorting
- [ ] Navegar a página 5
- [ ] Cambiar campo de sorting
- [ ] **Esperado**: Vuelve automáticamente a página 1

### 🧪 Testing de Mejora #7: Recordatorios WhatsApp/Email

#### TC-7.1: Botón WhatsApp Visible
- [ ] Abrir modal de cuotas
- [ ] Verificar que cada cuota tiene ícono verde de MessageCircle
- [ ] **Esperado**: Botón visible para todas las cuotas (pendiente/vencido/parcial)

#### TC-7.2: Envío de Recordatorio por WhatsApp
- [ ] Click en ícono de WhatsApp para una cuota
- [ ] **Esperado**:
  - Se abre WhatsApp Web
  - Número del cliente pre-cargado
  - Mensaje cordial pre-cargado con:
    - Saludo personalizado
    - Número de cuota
    - Número de póliza
    - Monto y moneda
    - Fecha de vencimiento
    - Estado (pendiente/vencido)
    - Firma de Patria SA

#### TC-7.3: Botón Email Visible Solo si Cliente Tiene Correo
- [ ] Abrir modal de cliente con correo
- [ ] **Esperado**: Ícono azul de Send visible
- [ ] Abrir modal de cliente sin correo (`correo = NULL`)
- [ ] **Esperado**: Botón de email NO visible o deshabilitado

#### TC-7.4: Envío de Recordatorio por Email
- [ ] Click en ícono de Email
- [ ] **Esperado**:
  - Se abre cliente de correo (Outlook, Gmail, etc.)
  - Campo "Para:" con correo del cliente
  - Asunto: "Recordatorio de pago - Póliza XXX - Cuota N°X"
  - Cuerpo: Mensaje cordial similar al de WhatsApp

#### TC-7.5: Contenido del Mensaje Cordial
- [ ] Verificar que el mensaje incluye:
  - Saludo: "Estimado/a {nombre}"
  - Información de cuota (número, monto, fecha)
  - Estado formateado: "VENCIDA" / "Por vencer" / "Pago parcial"
  - Mensaje de cortesía
  - Firma institucional

### 🧪 Testing de Mejora #8: Prórroga de Cuota

#### TC-8.1: Botón de Prórroga Visible
- [ ] Abrir modal de cuotas
- [ ] Verificar que cuotas pendiente/vencido/parcial tienen botón "Prórroga"
- [ ] **Esperado**: Botón visible al lado de "Registrar Pago"

#### TC-8.2: Botón No Visible para Cuotas Pagadas
- [ ] Verificar cuota con `estado = 'pagado'`
- [ ] **Esperado**: Botón "Prórroga" NO visible

#### TC-8.3: Abrir Modal de Prórroga
- [ ] Click en "Prórroga"
- [ ] **Esperado**:
  - Modal se abre
  - Muestra información actual de la cuota
  - Campo de fecha con calendario
  - Campo opcional de motivo

#### TC-8.4: Selección de Nueva Fecha
- [ ] Click en campo de fecha
- [ ] Intentar seleccionar fecha de ayer
- [ ] **Esperado**: Fecha deshabilitada, no se puede seleccionar
- [ ] Seleccionar fecha futura (ej: +30 días)
- [ ] **Esperado**: Fecha seleccionada, se muestra cálculo de días de extensión

#### TC-8.5: Cálculo Automático de Días de Extensión
- [ ] Fecha actual de vencimiento: 2024-12-01
- [ ] Seleccionar nueva fecha: 2024-12-31
- [ ] **Esperado**: Muestra "Días de extensión: 30 días"

#### TC-8.6: Registro de Prórroga con Motivo
- [ ] Seleccionar nueva fecha
- [ ] Ingresar motivo: "Solicitud del cliente por dificultades económicas"
- [ ] Click "Confirmar Prórroga"
- [ ] **Esperado**: Prórroga registrada, modal se cierra

**Consulta de verificación:**
```sql
SELECT
  id,
  numero_cuota,
  fecha_vencimiento_original,
  fecha_vencimiento,
  prorrogas_historial
FROM polizas_pagos
WHERE prorrogas_historial != '[]'::jsonb
ORDER BY updated_at DESC
LIMIT 1;
-- Debe mostrar la prórroga en el array prorrogas_historial
```

#### TC-8.7: Historial de Prórrogas Múltiples
- [ ] Registrar 1ra prórroga: +15 días
- [ ] Registrar 2da prórroga: +10 días más
- [ ] **Esperado**: Campo `prorrogas_historial` contiene array de 2 objetos

```sql
-- Verificar historial
SELECT
  numero_cuota,
  jsonb_array_length(prorrogas_historial) as num_prorrogas,
  prorrogas_historial
FROM polizas_pagos
WHERE id = 'ID_DE_PRUEBA';
-- num_prorrogas debe ser 2
```

#### TC-8.8: Fecha Original se Guarda
- [ ] Registrar prórroga en cuota sin prorrogas previas
- [ ] Verificar que `fecha_vencimiento_original` se llena automáticamente
- [ ] **Esperado**: `fecha_vencimiento_original` = fecha antes de la prórroga

#### TC-8.9: Validación de Fecha Futura
- [ ] Intentar confirmar prórroga sin seleccionar fecha
- [ ] **Esperado**: Botón "Confirmar Prórroga" deshabilitado
- [ ] Intentar seleccionar fecha de hoy
- [ ] **Esperado**: Error "La nueva fecha debe ser futura (después de hoy)"

#### TC-8.10: Actualización Visual Después de Prórroga
- [ ] Registrar prórroga exitosa
- [ ] Cerrar y reabrir modal de cuotas
- [ ] **Esperado**: Fecha de vencimiento actualizada en la tabla

### 🧪 Testing Integrado

#### TI-1: Flujo Completo de Pago con Exceso
- [ ] Registrar pago de 1500 Bs en cuota de 1000 Bs
- [ ] Adjuntar comprobante PDF
- [ ] **Esperado**:
  - Pago registrado como "exceso"
  - Comprobante subido
  - Modal de redistribución se abre automáticamente
  - 500 Bs disponibles para redistribuir

#### TI-2: Flujo Completo de Prórroga → Recordatorio
- [ ] Registrar prórroga de una cuota
- [ ] Enviar recordatorio por WhatsApp con nueva fecha
- [ ] **Esperado**: Mensaje contiene fecha actualizada

#### TI-3: Aviso de Mora con Cliente sin Teléfono
- [ ] Abrir modal de póliza con 3+ cuotas vencidas
- [ ] Cliente tiene `celular = NULL` y `telefono = NULL`
- [ ] Click "Generar Aviso de Mora"
- [ ] **Esperado**: Error "No se encontró número de teléfono para este cliente"

#### TI-4: Performance con Sorting y 1000+ Registros
- [ ] Cargar Dashboard con 1000+ pólizas
- [ ] Aplicar sorting por diferentes campos
- [ ] **Esperado**:
  - Sorting se completa en < 500ms
  - No lag en la UI
  - Paginación sigue funcionando correctamente

---

## Procedimientos de Rollback

### Escenario 1: Error en Migración SQL

#### Síntomas
- Errores de sintaxis en SQL
- Tablas no creadas correctamente
- Funciones no disponibles

#### Rollback Completo
```sql
-- ADVERTENCIA: Esto eliminará TODOS los cambios de la migración

-- 1. Eliminar tabla de comprobantes
DROP TABLE IF EXISTS polizas_pagos_comprobantes CASCADE;

-- 2. Eliminar columnas agregadas a polizas_pagos
ALTER TABLE polizas_pagos
DROP COLUMN IF EXISTS fecha_vencimiento_original,
DROP COLUMN IF EXISTS prorrogas_historial;

-- 3. Eliminar funciones
DROP FUNCTION IF EXISTS registrar_prorroga_cuota(uuid, date, uuid, text);
DROP FUNCTION IF EXISTS descartar_comprobante(uuid);
DROP FUNCTION IF EXISTS restaurar_comprobante(uuid);
DROP FUNCTION IF EXISTS actualizar_updated_at();

-- 4. Eliminar índices
DROP INDEX IF EXISTS idx_comprobantes_pago_id;
DROP INDEX IF EXISTS idx_comprobantes_estado;
DROP INDEX IF EXISTS idx_pagos_fecha_vencimiento;
DROP INDEX IF EXISTS idx_pagos_estado;

-- 5. Eliminar trigger
DROP TRIGGER IF EXISTS trigger_comprobantes_updated_at ON polizas_pagos_comprobantes;

-- 6. Eliminar RLS policies de tabla
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver comprobantes activos" ON polizas_pagos_comprobantes;
DROP POLICY IF EXISTS "Cobranza y admin pueden subir comprobantes" ON polizas_pagos_comprobantes;
DROP POLICY IF EXISTS "Cobranza y admin pueden actualizar comprobantes" ON polizas_pagos_comprobantes;

-- 7. Eliminar Storage bucket (MANUAL desde UI o con DELETE)
DELETE FROM storage.buckets WHERE id = 'pagos-comprobantes';
```

### Escenario 2: Código con Errores en Producción

#### Rollback de Código con Git
```bash
# Ver últimos commits
git log --oneline -5

# Revertir al commit anterior
git revert HEAD
git push origin master

# O rollback directo (si es urgente)
git reset --hard COMMIT_HASH_ANTERIOR
git push --force origin master
```

#### Rollback en Vercel
```bash
# Desde Vercel Dashboard:
# Deployments → Previous deployment → "..." → Redeploy

# O desde CLI
vercel rollback DEPLOYMENT_URL
```

### Escenario 3: Storage Bucket Corrupto

#### Limpiar y Recrear Bucket
```sql
-- 1. Eliminar todos los archivos del bucket
DELETE FROM storage.objects WHERE bucket_id = 'pagos-comprobantes';

-- 2. Eliminar bucket
DELETE FROM storage.buckets WHERE id = 'pagos-comprobantes';

-- 3. Recrear bucket (ejecutar nuevamente Fase 2: Paso 2.2)
```

### Escenario 4: Comprobantes Huérfanos (sin pago asociado)

#### Limpiar Comprobantes Huérfanos
```sql
-- Identificar comprobantes sin pago
SELECT c.id, c.nombre_archivo
FROM polizas_pagos_comprobantes c
LEFT JOIN polizas_pagos p ON c.pago_id = p.id
WHERE p.id IS NULL;

-- Marcar como descartados
UPDATE polizas_pagos_comprobantes
SET estado = 'descartado'
WHERE pago_id NOT IN (SELECT id FROM polizas_pagos);

-- O eliminar permanentemente (solo si es necesario)
DELETE FROM polizas_pagos_comprobantes
WHERE pago_id NOT IN (SELECT id FROM polizas_pagos);
```

### Escenario 5: Demasiadas Prórrogas en una Cuota

#### Resetear Prórrogas
```sql
-- Identificar cuota problemática
SELECT id, numero_cuota, fecha_vencimiento_original, fecha_vencimiento,
       jsonb_array_length(prorrogas_historial) as num_prorrogas
FROM polizas_pagos
WHERE id = 'CUOTA_ID';

-- Restaurar fecha original
UPDATE polizas_pagos
SET
  fecha_vencimiento = fecha_vencimiento_original,
  prorrogas_historial = '[]'::jsonb,
  observaciones = observaciones || E'\n[ROLLBACK] Prórrogas eliminadas manualmente'
WHERE id = 'CUOTA_ID';
```

---

## Limitaciones Conocidas

### Limitación #1: Cliente Jurídico sin Contacto
**Descripción**: Clientes jurídicos (`juridic_clients`) no tienen campos de teléfono/email.

**Impacto**:
- No se pueden enviar recordatorios automáticos
- No se puede generar aviso de mora por WhatsApp
- Sección de contacto muestra "-" o "No disponible"

**Workaround**:
- Buscar contacto manualmente en otra fuente
- Agregar contacto en campo de observaciones
- Futura mejora: crear tabla `juridic_clients_contactos`

### Limitación #2: Ramos Parcialmente Implementados
**Descripción**: Solo Automotor tiene implementación completa de datos específicos.

**Ramos pendientes**:
- Salud: Falta JOIN a tabla de asegurados
- Vida: Falta JOIN a tabla de asegurados
- Incendio: Falta JOIN a tabla de ubicaciones
- AP, Sepelio, Cauciones, etc.: Sin implementación

**Impacto**: Sección de datos específicos muestra mensaje genérico o placeholder.

**Workaround**: Mostrar mensaje: "Datos específicos disponibles próximamente"

### Limitación #3: Aviso de Mora No Genera PDF Automáticamente
**Descripción**: No existe componente `AvisoMoraTemplate.tsx` para generación de PDF.

**Impacto**:
- Solo se abre WhatsApp con mensaje de texto
- No se genera documento PDF descargable
- Usuario debe redactar aviso manualmente

**Workaround**:
- Usar mensaje de WhatsApp generado automáticamente
- Crear documento Word/Excel manual si se necesita formal

**Mejora futura**: Implementar PDF con @react-pdf/renderer (similar a vencimientos)

### Limitación #4: Sin Límite de Prórrogas
**Descripción**: No hay límite técnico en cuántas prórrogas se pueden registrar.

**Impacto**:
- Una cuota podría tener 10+ prórrogas
- Campo `prorrogas_historial` podría crecer demasiado (JSON)
- Sin reglas de negocio (ej: máx 3 prórrogas por cuota)

**Workaround**:
- Establecer política manual: máx 2-3 prórrogas
- Supervisar cuotas con múltiples prórrogas

**Mejora futura**: Agregar constraint `CHECK (jsonb_array_length(prorrogas_historial) <= 3)`

### Limitación #5: Comprobantes No Se Pueden Editar
**Descripción**: Una vez subido, un comprobante no se puede reemplazar.

**Impacto**:
- Si se sube archivo incorrecto, debe marcarse como "descartado" y subir uno nuevo
- No hay función de "reemplazar comprobante"

**Workaround**:
- Descartar comprobante actual
- Subir nuevo comprobante en nuevo pago o mediante función manual

**Mejora futura**: Agregar función `reemplazar_comprobante(comprobante_id, nuevo_file)`

### Limitación #6: Sin Notificaciones Push
**Descripción**: Sistema no envía notificaciones automáticas (email, SMS, WhatsApp API).

**Impacto**:
- Usuario debe enviar recordatorios manualmente
- No hay programación de recordatorios (ej: 3 días antes de vencimiento)

**Workaround**: Crear rutina manual de revisión diaria

**Mejora futura**:
- Integrar Twilio API o WhatsApp Business API
- Implementar cron jobs para recordatorios automáticos

### Limitación #7: Sin Soft Delete en Prórrogas
**Descripción**: Prórrogas registradas no se pueden "deshacer" individualmente desde la UI.

**Impacto**: Si se registra prórroga por error, debe corregirse manualmente en DB.

**Workaround**: Ejecutar SQL de rollback (ver Escenario 5)

**Mejora futura**: Botón "Deshacer última prórroga" en UI

### Limitación #8: Sin Auditoría de Comprobantes Descartados
**Descripción**: No se registra quién descartó un comprobante ni por qué.

**Impacto**: Sin trazabilidad de comprobantes eliminados.

**Workaround**: Agregar observación manual en cuota.

**Mejora futura**: Agregar campos `descartado_por`, `motivo_descarte`, `fecha_descarte`

---

## Mejoras Futuras

### Prioridad Alta (3-6 meses)

#### MF-1: Implementar Ramos Faltantes
- Completar queries para Salud, Vida, Incendio, AP, Sepelio
- Crear JOINs a tablas específicas de cada ramo
- Agregar sección de datos específicos completa

**Estimación**: 2-3 semanas
**Complejidad**: Media
**Archivos**: `app/cobranzas/actions.ts:obtenerDetallePolizaParaCuotas()`

#### MF-2: Generar PDF de Aviso de Mora
- Crear `AvisoMoraTemplate.tsx` con @react-pdf/renderer
- Diseño profesional con logo y formato oficial
- Descargar PDF automáticamente
- Opcional: Adjuntar PDF a WhatsApp automáticamente (si API disponible)

**Estimación**: 1 semana
**Complejidad**: Baja (ya existe lógica similar en vencimientos)
**Archivos**: `components/cobranzas/PDFTemplates/AvisoMoraTemplate.tsx`

#### MF-3: Contactos para Clientes Jurídicos
- Crear tabla `juridic_clients_contactos` (1:N)
- Agregar formulario para gestionar contactos
- Actualizar query de `obtenerDetallePolizaParaCuotas()` para incluir contactos

**Estimación**: 1-2 semanas
**Complejidad**: Media
**Archivos**: Nueva migración + actualizar `types/cobranza.ts`

#### MF-4: Límite de Prórrogas
- Agregar constraint en DB: máx 3 prórrogas por cuota
- Agregar validación en UI antes de permitir nueva prórroga
- Mensaje claro cuando se alcanza el límite

**Estimación**: 2-3 días
**Complejidad**: Baja
**Archivos**: Migración SQL + `app/cobranzas/actions.ts:registrarProrroga()`

### Prioridad Media (6-12 meses)

#### MF-5: Notificaciones Automáticas
- Integrar Twilio API o WhatsApp Business API
- Cron job diario para recordatorios automáticos
- Configurar plantillas de mensajes
- Dashboard de notificaciones enviadas

**Estimación**: 4-6 semanas
**Complejidad**: Alta
**Dependencias**: Costo mensual de Twilio/WhatsApp API

#### MF-6: Auditoría Completa de Comprobantes
- Agregar campos: `descartado_por`, `motivo_descarte`, `fecha_descarte`
- Tabla de auditoría separada: `polizas_pagos_comprobantes_auditoria`
- Vista de historial de comprobantes descartados

**Estimación**: 1 semana
**Complejidad**: Baja
**Archivos**: Nueva migración + actualizar actions

#### MF-7: Edición/Reemplazo de Comprobantes
- Función `reemplazar_comprobante(comprobante_id, nuevo_file)`
- Mantener historial de archivos reemplazados
- UI para reemplazar desde modal de cuotas

**Estimación**: 1-2 semanas
**Complejidad**: Media
**Archivos**: Nuevas actions + actualizar CuotasModal

#### MF-8: Dashboard de Métricas de Cobranza
- Gráficos de cuotas pagadas vs vencidas por mes
- Tasa de morosidad por cliente/compañía
- Eficiencia de cobranza (tiempo promedio de pago)
- Alertas de clientes críticos (5+ cuotas vencidas)

**Estimación**: 3-4 semanas
**Complejidad**: Media-Alta
**Dependencias**: Librería de gráficos (ej: recharts)

### Prioridad Baja (12+ meses)

#### MF-9: Recordatorios Programados
- Interfaz para programar recordatorios futuros
- Tabla `cobranza_recordatorios_programados`
- Cron job que envía recordatorios en fecha/hora configurada

**Estimación**: 2-3 semanas
**Complejidad**: Media

#### MF-10: Integración con Sistema Contable
- Exportar pagos a formato contable (JSON, CSV, Excel)
- API para sincronizar pagos con sistema externo
- Mapeo de categorías contables

**Estimación**: 4-6 semanas
**Complejidad**: Alta
**Dependencias**: Definición de sistema contable objetivo

#### MF-11: App Móvil de Cobranza
- App React Native para cobradores de campo
- Registro de pagos offline con sincronización
- Geolocalización de visitas
- Firma digital de clientes

**Estimación**: 3-4 meses
**Complejidad**: Muy Alta
**Dependencias**: Equipo de desarrollo móvil

---

## Apéndices

### Apéndice A: Consultas SQL Útiles

#### Estadísticas de Comprobantes
```sql
SELECT
  tipo_archivo,
  estado,
  COUNT(*) as cantidad,
  SUM(tamano_bytes) / 1024 / 1024 as total_mb
FROM polizas_pagos_comprobantes
GROUP BY tipo_archivo, estado
ORDER BY cantidad DESC;
```

#### Cuotas con Múltiples Prórrogas
```sql
SELECT
  pp.id,
  pol.numero_poliza,
  pp.numero_cuota,
  pp.fecha_vencimiento_original,
  pp.fecha_vencimiento,
  jsonb_array_length(pp.prorrogas_historial) as num_prorrogas,
  pp.prorrogas_historial
FROM polizas_pagos pp
JOIN polizas pol ON pp.poliza_id = pol.id
WHERE pp.prorrogas_historial != '[]'::jsonb
ORDER BY jsonb_array_length(pp.prorrogas_historial) DESC;
```

#### Pólizas con 3+ Cuotas Vencidas (Candidatas para Aviso de Mora)
```sql
SELECT
  pol.id,
  pol.numero_poliza,
  c.nombre_completo as cliente,
  COUNT(pp.id) as cuotas_vencidas,
  SUM(pp.monto) as total_adeudado
FROM polizas pol
JOIN polizas_pagos pp ON pp.poliza_id = pol.id
LEFT JOIN natural_clients nc ON pol.cliente_id = nc.id
LEFT JOIN juridic_clients jc ON pol.cliente_id = jc.id
LEFT JOIN LATERAL (
  SELECT COALESCE(nc.nombre_completo, jc.razon_social) as nombre_completo
) c ON true
WHERE pp.estado = 'vencido'
GROUP BY pol.id, pol.numero_poliza, c.nombre_completo
HAVING COUNT(pp.id) >= 3
ORDER BY COUNT(pp.id) DESC;
```

#### Pagos sin Comprobante (Datos Incompletos)
```sql
SELECT
  pp.id,
  pol.numero_poliza,
  pp.numero_cuota,
  pp.monto_pagado,
  pp.fecha_pago
FROM polizas_pagos pp
JOIN polizas pol ON pp.poliza_id = pol.id
LEFT JOIN polizas_pagos_comprobantes c ON c.pago_id = pp.id
WHERE pp.estado = 'pagado'
AND c.id IS NULL;
-- Estos pagos se hicieron antes de la mejora #1
```

### Apéndice B: Scripts de Limpieza

#### Limpiar Comprobantes Huérfanos
```sql
-- Identificar
SELECT * FROM polizas_pagos_comprobantes
WHERE pago_id NOT IN (SELECT id FROM polizas_pagos);

-- Eliminar
DELETE FROM polizas_pagos_comprobantes
WHERE pago_id NOT IN (SELECT id FROM polizas_pagos);
```

#### Limpiar Storage Bucket (Archivos sin Registro en DB)
```sql
-- Identificar archivos en storage sin registro
SELECT o.name
FROM storage.objects o
WHERE o.bucket_id = 'pagos-comprobantes'
AND o.name NOT IN (
  SELECT archivo_url FROM polizas_pagos_comprobantes
);

-- Eliminar (requiere función o script manual)
-- Desde Supabase UI: Storage → pagos-comprobantes → Seleccionar archivos → Delete
```

### Apéndice C: Contactos de Soporte

#### Equipo de Desarrollo
- **Desarrollador Principal**: [Nombre]
- **Email**: dev@patriasa.com
- **Slack**: #dev-cobranzas

#### Base de Datos
- **DBA**: [Nombre DBA]
- **Supabase Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT

#### Infraestructura
- **DevOps**: [Nombre]
- **Vercel Dashboard**: https://vercel.com/your-team/sigs

---

## Registro de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2024-12-18 | Claude AI | Versión inicial del documento |
| | | | - 8 mejoras implementadas |
| | | | - Checklist de testing completo |
| | | | - Procedimientos de rollback |
| | | | - Limitaciones conocidas |
| | | | - Mejoras futuras priorizadas |

---

**Fin del Documento**

Para preguntas o soporte adicional, contactar al equipo de desarrollo a través de los canales listados en Apéndice C.
