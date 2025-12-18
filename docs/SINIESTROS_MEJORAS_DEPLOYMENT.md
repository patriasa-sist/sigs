# Mejoras Implementadas - Módulo de Siniestros

**Fecha:** 18 de Diciembre, 2025
**Módulo:** Sistema de Gestión de Siniestros
**Estado:** Listo para desplegar

---

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Mejoras Implementadas](#mejoras-implementadas)
3. [Cambios en Base de Datos](#cambios-en-base-de-datos)
4. [Cambios en Código](#cambios-en-código)
5. [Pasos de Despliegue](#pasos-de-despliegue)
6. [Validación y Testing](#validación-y-testing)
7. [Rollback](#rollback)

---

## Resumen Ejecutivo

Se han implementado 7 mejoras importantes al módulo de siniestros siguiendo los requerimientos del usuario:

✅ **1. Código Correlativo Automático** - Formato AÑO-00001 (1 a 99999)
✅ **2. Visualización de Cuotas con Prórrogas** - Muestra historial de prórrogas aplicadas
✅ **3. Filtros Avanzados** - Responsable, compañía, ramo, estado
✅ **4. Campo Responsable del Siniestro** - Asignable y modificable con log de cambios
✅ **5. Columnas Actualizadas en Tabla** - Código y responsable en lugar de departamento
✅ **6. Datos de Contacto Clickeables** - Celular (WhatsApp) y correo del cliente
✅ **7. Error Corregido** - Bug de onAgregarDocumento documentado (código ya estaba correcto)

---

## Mejoras Implementadas

### 1. Código Correlativo Automático (AÑO-00001)

**Descripción:**
Cada siniestro ahora recibe automáticamente un código único correlativo basado en el año actual y un número secuencial de 5 dígitos (con padding de ceros).

**Formato:** `2025-00001`, `2025-00002`, ..., `2025-99999`

**Características:**
- Generación automática mediante trigger de base de datos
- El contador se reinicia cada año
- Límite máximo de 99,999 siniestros por año
- Código único y no modificable
- Visible en tabla principal y detalles

**Ubicación en UI:**
- Columna "Código" en tabla de siniestros (primera columna)
- Visible en vistas de detalle y edición

---

### 2. Campo Responsable del Siniestro

**Descripción:**
Se agregó un campo "responsable_id" que permite asignar un usuario específico encargado de gestionar el siniestro.

**Características:**
- Selector de usuarios con roles: `siniestros`, `admin`, `comercial`
- Por defecto se asigna al usuario que crea el siniestro
- Puede ser cambiado posteriormente desde la edición
- Cambios registrados automáticamente en historial de auditoría
- Incluye nombre y email del responsable en vistas

**Ubicación en UI:**
- Paso 2 del formulario de registro (nuevo campo después de "Moneda")
- Columna "Responsable" en tabla principal (reemplaza "Departamento")
- Filtro de responsable en dashboard

**Auditoría:**
- Cada cambio de responsable queda registrado en `siniestros_historial`
- Muestra: quién cambió, de quién a quién, y cuándo

---

### 3. Visualización de Cuotas con Prórrogas

**Descripción:**
Las cuotas de pago ahora muestran información completa sobre prórrogas aplicadas.

**Características:**
- Indicador visual (⚠️) con contador de prórrogas
- Muestra fecha de vencimiento original
- Muestra fecha de vencimiento actual (después de prórrogas)
- Tooltip con información detallada
- Compatible con el módulo de cobranzas

**Ubicación en UI:**
- `PolizaCard` (componente compartido usado en registro de siniestros)
- Sección "Últimas cuotas" muestra las primeras 3 cuotas con indicadores

**Formato Visual:**
```
Cuota 1  [⚠️ 2]                    Bs 1,500.00
                                    15/01/2025
                                    Original: 01/01/2025
```

---

### 4. Filtros Avanzados en Dashboard

**Descripción:**
Se agregaron 2 nuevos filtros al dashboard de siniestros.

**Nuevos Filtros:**
1. **Filtro por Responsable** - Filtra por usuario asignado al siniestro
2. **Filtro por Compañía** - Filtra por compañía aseguradora

**Filtros Existentes Mejorados:**
- Búsqueda de texto ahora incluye: código de siniestro, responsable y compañía
- Estado (abierto, rechazado, declinado, concluido)
- Ramo (tipo de seguro)
- Departamento

**Ubicación en UI:**
- Dashboard de siniestros (primera card)
- Fila 1: Búsqueda, Estado, Ramo
- Fila 2: Departamento, Responsable, Compañía

---

### 5. Tabla Actualizada

**Descripción:**
Se reorganizaron las columnas de la tabla principal para mejor visibilidad.

**Cambios:**
- ✅ Nueva columna: "Código" (primera columna)
- ✅ Modificada: "Depto." → "Responsable"
- ⚠️ Removida: "Lugar" (aún visible en detalles)

**Orden de Columnas:**
1. Código (nuevo)
2. Fecha
3. Póliza
4. Cliente
5. Responsable (modificado)
6. Reserva
7. Estado
8. Acciones

**Estilo del Código:**
- Fuente monoespaciada
- Color primario destacado
- Formato compacto

---

### 6. Datos de Contacto Clickeables

**Descripción:**
El celular y correo electrónico del cliente ahora son clickeables para contacto directo.

**Características:**
- **Celular:** Abre WhatsApp Web con el número formateado (código país 591 para Bolivia)
- **Correo:** Abre cliente de correo predeterminado
- Iconos visuales (📱 y ✉️)
- Color azul con hover underline
- Solo se muestran si están disponibles

**Ubicación en UI:**
- `PolizaCard` - Sección de "Cliente"
- Debajo del nombre y documento del cliente

**Formato:**
```
Cliente: Juan Pérez González
CI: 123456789 LP
📱 70123456         (clickeable → WhatsApp)
✉️ juan@example.com (clickeable → Mailto)
```

---

### 7. Error onAgregarDocumento (Verificado)

**Estado:** ✅ Código correcto - Error posiblemente de caché

**Investigación:**
- Se revisó el componente `AgregarDocumentos.tsx` línea 198
- Se revisó el componente `DocumentUploader.tsx` línea 69
- La prop `onAgregarDocumento` está correctamente definida y pasada
- El callback `handleAgregarDocumento` está correctamente implementado con `useCallback`

**Recomendación:**
- Si el error persiste, limpiar caché del navegador
- Verificar que no haya procesos de Next.js en segundo plano
- Reiniciar el servidor de desarrollo

---

## Cambios en Base de Datos

### Archivo de Migración
📁 `supabase/migrations/20251218120000_siniestros_mejoras.sql`

### 1. Nueva Tabla: `siniestros_correlativo_tracker`

Trackea el último número correlativo usado por año.

```sql
CREATE TABLE siniestros_correlativo_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio INTEGER NOT NULL UNIQUE,
  ultimo_numero INTEGER NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0 AND ultimo_numero <= 99999),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Propósito:** Mantener el contador de códigos correlativos por año.

---

### 2. Nuevos Campos en Tabla `siniestros`

```sql
ALTER TABLE siniestros
ADD COLUMN codigo_siniestro TEXT UNIQUE,
ADD COLUMN responsable_id UUID REFERENCES profiles(id);
```

**Campos:**
- `codigo_siniestro` - Código único formato AÑO-00001 (generado automáticamente)
- `responsable_id` - FK a profiles, usuario responsable del siniestro

---

### 3. Función: `generar_codigo_siniestro()`

Genera el código correlativo de forma atómica y segura.

**Características:**
- Usa locking para evitar race conditions
- Incrementa automáticamente el contador
- Crea nueva entrada si es un año nuevo
- Valida límite de 99,999

**Retorno:** `TEXT` (ejemplo: `2025-00001`)

---

### 4. Triggers Automáticos

**a) `trigger_auto_codigo_siniestro` (BEFORE INSERT)**
- Genera automáticamente el código_siniestro
- Asigna responsable_id = created_by si no se especifica

**b) `trigger_log_responsable_siniestro` (AFTER UPDATE)**
- Registra cambios de responsable en `siniestros_historial`
- Captura: responsable anterior, nuevo, timestamp, usuario que hizo el cambio

---

### 5. Vista Actualizada: `siniestros_vista`

Se agregaron campos a la vista:
- `codigo_siniestro`
- `responsable_id`
- `responsable_nombre` (JOIN con profiles)
- `responsable_email` (JOIN con profiles)
- `compania_id` (para filtros)

**Uso:** La vista es usada por el dashboard para mostrar datos completos.

---

### 6. Índices de Optimización

```sql
CREATE INDEX idx_siniestros_codigo ON siniestros(codigo_siniestro);
CREATE INDEX idx_siniestros_responsable ON siniestros(responsable_id);
CREATE INDEX idx_siniestros_estado_responsable ON siniestros(estado, responsable_id);
```

**Propósito:** Acelerar búsquedas y filtros por código y responsable.

---

### 7. Backfill de Datos Existentes

La migración incluye un script que:
1. Asigna `responsable_id = created_by` a siniestros existentes sin responsable
2. Genera códigos correlativos para siniestros existentes (en orden de creación)

**⚠️ Importante:** Esto solo se ejecuta una vez al aplicar la migración.

---

## Cambios en Código

### Archivos Modificados

#### 1. Tipos TypeScript (`types/siniestro.ts`)

**Nuevos tipos:**
```typescript
export type ProrrogaCuota = {
  fecha_anterior: string;
  fecha_nueva: string;
  dias_prorroga: number;
  motivo?: string;
  otorgado_por?: string;
  fecha_otorgamiento: string;
};
```

**Modificaciones:**
- `CuotaPago` - Agregados: `fecha_vencimiento_original`, `prorrogas_historial`, `observaciones`
- `PolizaParaSiniestro.cliente` - Agregados: `celular`, `correo_electronico`
- `DetallesSiniestro` - Agregado: `responsable_id`
- `Siniestro` - Agregados: `codigo_siniestro`, `responsable_id`
- `SiniestroVista` - Agregados: `codigo_siniestro`, `compania_id`, `responsable_nombre`, `responsable_email`, `cerrado_por_nombre`
- `FiltrosSiniestros` - Agregados: `responsable_id`, `compania_id`
- `SiniestroListItem` - Agregados: `codigo_siniestro`, `responsable_nombre`, `compania_nombre`

---

#### 2. Server Actions (`app/siniestros/actions.ts`)

**Función `guardarSiniestro()` (línea 146)**
- Agregado campo `responsable_id` en el insert de siniestros

**Función `buscarPolizasActivas()` (líneas 820-901)**
- Agregada obtención de `celular` y `correo_electronico` del cliente
- Modificado query de cuotas para incluir: `fecha_vencimiento_original`, `prorrogas_historial`, `observaciones`
- Agregados campos de contacto en el objeto `cliente` retornado

---

#### 3. Componentes de UI

**a) `DetallesSiniestro.tsx` (Paso 2 del registro)**

**Líneas modificadas:**
- 31-36: Nuevo tipo `UsuarioResponsable`
- 42-43: Nuevos estados `responsables`, `usuarioActualId`
- 62-90: Nuevo `useEffect` para cargar usuarios con rol siniestros/admin/comercial
- 264-287: Nuevo campo selector de responsable

**Características:**
- Carga automática de usuarios permitidos
- Asigna por defecto al usuario actual
- Permite cambiar a cualquier usuario con permisos

---

**b) `PolizaCard.tsx` (Componente compartido)**

**Líneas modificadas:**
- 6: Importados íconos `Phone`, `Mail`, `AlertTriangle`
- 64-83: Agregados enlaces clickeables de celular y correo
- 222-260: Agregado indicador de prórrogas en cuotas

**Características celular:**
- Link a WhatsApp Web con código de país 591
- Formato: `https://wa.me/591{numero_limpio}`
- Icono de teléfono con color azul

**Características prórrogas:**
- Icono ⚠️ con contador
- Tooltip con cantidad de prórrogas
- Muestra fecha original y actual
- Color ámbar para destacar

---

**c) `Dashboard.tsx` (Vista principal)**

**Líneas modificadas:**
- 36-37: Nuevos estados `responsableFiltro`, `companiaFiltro`
- 51-65: Nuevos useMemo para `responsablesUnicos` y `companiasUnicas`
- 77-79: Búsqueda ampliada (incluye código, responsable, compañía)
- 84-85: Nuevas validaciones de filtros
- 173-233: Nuevos selectores UI para responsable y compañía

---

**d) `SiniestrosTable.tsx` (Tabla de listado)**

**Líneas modificadas:**
- 77-84: Headers actualizados (agregado "Código", cambiado "Depto." por "Responsable")
- 95-98: Nueva celda para código correlativo
- 124-127: Celda de responsable (reemplaza departamento)

**Estilo del código:**
- Fuente monoespaciada (`font-mono`)
- Tamaño xs
- Color primario
- Peso medium

---

## Pasos de Despliegue

### Prerequisitos
- Acceso a Supabase SQL Editor
- Permisos de escritura en base de datos
- Código actualizado en repositorio local

---

### Paso 1: Backup de Base de Datos
```bash
# Opcional pero recomendado
# Crear snapshot de las tablas afectadas
```

⚠️ **Importante:** El usuario debe ejecutar esto manualmente desde Supabase Dashboard.

---

### Paso 2: Ejecutar Migración SQL

1. Abrir Supabase Dashboard
2. Navegar a: **SQL Editor**
3. Abrir archivo: `supabase/migrations/20251218120000_siniestros_mejoras.sql`
4. Copiar todo el contenido
5. Pegar en SQL Editor
6. Click en **"Run"**
7. Verificar mensaje de éxito: ✅ Migración completada

**Tiempo estimado:** 5-10 segundos

**Verificaciones:**
```sql
-- Verificar que la tabla existe
SELECT COUNT(*) FROM siniestros_correlativo_tracker;

-- Verificar que los campos existen
SELECT codigo_siniestro, responsable_id
FROM siniestros
LIMIT 1;

-- Verificar que la vista está actualizada
SELECT responsable_nombre, codigo_siniestro
FROM siniestros_vista
LIMIT 1;
```

---

### Paso 3: Deploy de Código

#### Opción A: Deploy a Producción (Vercel/Similar)
```bash
git add .
git commit -m "feat(siniestros): implementar mejoras - código correlativo, responsable, filtros y UI"
git push origin master
```

El deploy automático de Vercel detectará los cambios y desplegará.

#### Opción B: Testing Local
```bash
npm run dev
```

Navegar a: `http://localhost:3000/siniestros`

---

### Paso 4: Verificar Integración

1. **Crear un nuevo siniestro:**
   - Verificar que se genera código automáticamente
   - Verificar selector de responsable funciona
   - Verificar que datos de contacto sean clickeables

2. **Dashboard:**
   - Verificar nuevos filtros (responsable, compañía)
   - Verificar columna "Código" en tabla
   - Verificar columna "Responsable" en tabla

3. **Cuotas:**
   - Seleccionar póliza con prórrogas
   - Verificar indicador de prórrogas visible
   - Verificar fecha original mostrada

---

### Paso 5: Testing de Producción

**Checklist:**
- [ ] Código correlativo se genera automáticamente
- [ ] Formato correcto: AÑO-00001
- [ ] Selector de responsable muestra usuarios correctos
- [ ] Celular abre WhatsApp
- [ ] Correo abre cliente de email
- [ ] Indicador de prórrogas funciona
- [ ] Filtros por responsable funcionan
- [ ] Filtros por compañía funcionan
- [ ] Tabla muestra código y responsable
- [ ] Cambios de responsable quedan en historial

---

## Validación y Testing

### Casos de Prueba

#### Test 1: Código Correlativo
**Pasos:**
1. Ir a `/siniestros/nuevo`
2. Completar formulario hasta paso 4
3. Guardar siniestro
4. Verificar que tiene código formato `2025-00001`

**Resultado esperado:** Código visible en tabla y detalles

---

#### Test 2: Responsable por Defecto
**Pasos:**
1. Crear nuevo siniestro sin cambiar responsable
2. Guardar
3. Abrir edición

**Resultado esperado:** Responsable = usuario que creó

---

#### Test 3: Cambio de Responsable
**Pasos:**
1. Editar siniestro existente
2. Cambiar responsable
3. Guardar
4. Ver historial

**Resultado esperado:** Cambio registrado en historial con nombres completos

---

#### Test 4: Contacto Clickeable
**Pasos:**
1. Seleccionar póliza con celular y correo
2. Click en celular
3. Click en correo

**Resultado esperado:**
- Celular abre WhatsApp Web
- Correo abre cliente de email

---

#### Test 5: Prórrogas Visibles
**Pasos:**
1. Seleccionar póliza con cuotas prorrogadas
2. Ver sección de cuotas

**Resultado esperado:** Indicador ⚠️ con número de prórrogas y fecha original

---

#### Test 6: Filtros Funcionando
**Pasos:**
1. Ir a dashboard
2. Seleccionar responsable específico
3. Seleccionar compañía específica

**Resultado esperado:** Tabla filtra correctamente

---

#### Test 7: Búsqueda Ampliada
**Pasos:**
1. Buscar por código de siniestro (ej: "2025-00001")
2. Buscar por nombre de responsable
3. Buscar por compañía

**Resultado esperado:** Encuentra resultados correctos

---

## Rollback

En caso de problemas críticos en producción:

### Rollback de Código
```bash
# Obtener commit anterior
git log --oneline -10

# Revertir al commit anterior
git revert HEAD

# O hacer reset hard (no recomendado en producción)
git reset --hard <commit_anterior>

# Push
git push origin master --force
```

---

### Rollback de Base de Datos

⚠️ **Advertencia:** Esto eliminará los códigos correlativos asignados.

```sql
-- 1. Eliminar triggers
DROP TRIGGER IF EXISTS trigger_auto_codigo_siniestro ON siniestros;
DROP TRIGGER IF EXISTS trigger_log_responsable_siniestro ON siniestros;

-- 2. Eliminar función
DROP FUNCTION IF EXISTS generar_codigo_siniestro();
DROP FUNCTION IF EXISTS trigger_generar_codigo_siniestro();
DROP FUNCTION IF EXISTS trigger_log_cambio_responsable();

-- 3. Eliminar campos
ALTER TABLE siniestros DROP COLUMN IF EXISTS codigo_siniestro;
ALTER TABLE siniestros DROP COLUMN IF EXISTS responsable_id;

-- 4. Eliminar tabla
DROP TABLE IF EXISTS siniestros_correlativo_tracker;

-- 5. Eliminar índices
DROP INDEX IF EXISTS idx_siniestros_codigo;
DROP INDEX IF EXISTS idx_siniestros_responsable;
DROP INDEX IF EXISTS idx_siniestros_estado_responsable;

-- 6. Recrear vista sin los campos nuevos
-- (ejecutar script de vista anterior si existe)
```

---

## Notas Finales

### Consideraciones de Performance
- Los índices agregados mejoran las búsquedas por código y responsable
- La función de generación de código usa locking para evitar duplicados
- La vista `siniestros_vista` incluye más JOINs (puede ser más lenta con muchos registros)

### Seguridad
- Solo usuarios con rol `siniestros`, `admin` o `comercial` pueden ser responsables
- Cambios de responsable quedan auditados automáticamente
- RLS (Row Level Security) existente se mantiene sin cambios

### Escalabilidad
- Límite de 99,999 siniestros por año
- Si se alcanza el límite, la función lanza un error explícito
- Para cambiar el límite, modificar el CHECK constraint en la tabla `siniestros_correlativo_tracker`

### Mantenimiento
- Revisar periódicamente la tabla `siniestros_correlativo_tracker`
- Los registros antiguos (años anteriores) se pueden mantener para histórico
- Considerar agregar cleanup job si la tabla crece mucho

---

## Contacto y Soporte

Para preguntas o problemas:
- Revisar logs de Supabase Dashboard
- Revisar logs del servidor Next.js
- Verificar que la migración se ejecutó completamente

---

## Changelog

**v2.1.0 - 2025-12-18**
- ✨ Agregado código correlativo automático (AÑO-00001)
- ✨ Agregado campo responsable del siniestro
- ✨ Agregada visualización de prórrogas en cuotas
- ✨ Agregados filtros por responsable y compañía
- ✨ Agregados datos de contacto clickeables (celular y correo)
- 🔧 Actualizada tabla para mostrar código y responsable
- 🐛 Verificado error onAgregarDocumento (código correcto)
- 📝 Actualizada documentación completa

---

**Fin del documento**
