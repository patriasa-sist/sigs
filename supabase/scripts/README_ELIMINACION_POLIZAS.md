# 🗑️ Sistema de Eliminación de Pólizas

## 📋 Descripción General

Este sistema proporciona funciones SQL seguras y completas para eliminar pólizas de seguro junto con todas sus dependencias y archivos asociados en Supabase Storage.

## ⚠️ ADVERTENCIAS IMPORTANTES

### 🚫 Protección contra Siniestros
**Las pólizas con siniestros asociados NO pueden eliminarse.**

- El sistema verifica automáticamente si existen siniestros antes de eliminar
- Si hay siniestros, la eliminación se bloquea con un mensaje claro
- Debes eliminar primero los siniestros usando `eliminar_siniestro_completo()`

### 💥 Operación Irreversible
- **NO hay forma de recuperar los datos eliminados**
- Los archivos se eliminan permanentemente de Supabase Storage
- Verifica siempre con `puede_eliminar_poliza()` antes de eliminar

### 🔒 Seguridad
- Funciones con `SECURITY DEFINER` para control de acceso
- Verificaciones automáticas antes de cada eliminación
- Logs detallados de todas las operaciones

---

## 📁 Archivos del Sistema

### 1. `funcion_eliminar_poliza_completo.sql`
Contiene las 3 funciones principales:
- `eliminar_poliza_completo(UUID)` - Función principal de eliminación
- `eliminar_poliza_por_numero(TEXT)` - Wrapper para usar número de póliza
- `puede_eliminar_poliza(UUID)` - Verificación previa a eliminación

### 2. `eliminar_poliza_ejemplo.sql`
Ejemplos de uso prácticos:
- Verificar si una póliza puede eliminarse
- Ver detalles antes de eliminar
- Eliminar una póliza individual
- Eliminar múltiples pólizas
- Verificar limpieza correcta

### 3. `limpiar_todas_polizas_prueba.sql`
Script automatizado para limpieza masiva:
- Elimina pólizas que coincidan con un patrón
- Elimina automáticamente siniestros asociados primero
- Reporta estadísticas detalladas
- Verifica consistencia post-limpieza

---

## 🚀 Instalación

### Paso 1: Crear las Funciones
Ejecuta en Supabase SQL Editor:

```sql
-- Ejecutar todo el contenido de:
supabase/migrations/funcion_eliminar_poliza_completo.sql
```

### Paso 2: Verificar Instalación
```sql
-- Verificar que las funciones existen
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%eliminar_poliza%'
  AND routine_schema = 'public';

-- Deberías ver:
-- eliminar_poliza_completo
-- eliminar_poliza_por_numero
-- puede_eliminar_poliza
```

---

## 📖 Guía de Uso

### 1️⃣ Verificar si una Póliza Puede Eliminarse

**Siempre ejecuta esto PRIMERO antes de eliminar:**

```sql
-- Por UUID
SELECT * FROM puede_eliminar_poliza('uuid-de-la-poliza');

-- Ejemplo de respuesta SI puede eliminarse:
┌────────────────┬────────────────────────────┬──────────────────────────┐
│ puede_eliminar │ razon                      │ detalles                 │
├────────────────┼────────────────────────────┼──────────────────────────┤
│ true           │ La póliza puede eliminarse │ {"numero_poliza": "...", │
│                │                            │  "pagos": 6,             │
│                │                            │  "documentos": 3}        │
└────────────────┴────────────────────────────┴──────────────────────────┘

-- Ejemplo de respuesta BLOQUEADA:
┌────────────────┬─────────────────────────────────────────┬──────────────────────┐
│ puede_eliminar │ razon                                   │ detalles             │
├────────────────┼─────────────────────────────────────────┼──────────────────────┤
│ false          │ La póliza tiene 2 siniestro(s) asociado │ {"numero_poliza":... │
│                │                                         │  "siniestros": 2,    │
│                │                                         │  "accion_requerida"} │
└────────────────┴─────────────────────────────────────────┴──────────────────────┘
```

### 2️⃣ Ver Detalles de una Póliza

```sql
SELECT
  p.id,
  p.numero_poliza,
  p.ramo,
  p.estado,
  p.cliente_nombre,
  (SELECT COUNT(*) FROM polizas_pagos WHERE poliza_id = p.id) as pagos,
  (SELECT COUNT(*) FROM polizas_documentos WHERE poliza_id = p.id) as documentos,
  (SELECT COUNT(*) FROM polizas_automotor_vehiculos WHERE poliza_id = p.id) as vehiculos,
  (SELECT COUNT(*) FROM siniestros WHERE poliza_id = p.id) as siniestros
FROM polizas p
WHERE p.numero_poliza = 'POL-001';
```

### 3️⃣ Eliminar una Póliza Individual

#### Opción A: Por UUID
```sql
SELECT * FROM eliminar_poliza_completo('uuid-de-la-poliza');
```

#### Opción B: Por Número de Póliza (Más Conveniente)
```sql
SELECT * FROM eliminar_poliza_por_numero('POL-001');
```

#### Respuesta Exitosa:
```json
{
  "eliminado": true,
  "mensaje": "Póliza POL-001 eliminada correctamente",
  "archivos_eliminados": 8,
  "detalles": {
    "poliza_id": "uuid...",
    "numero_poliza": "POL-001",
    "ramo": "Automotor",
    "pagos_eliminados": 6,
    "vehiculos_eliminados": 2,
    "documentos_eliminados": 5,
    "historial_eliminado": 3,
    "archivos_documentos": 5,
    "archivos_comprobantes": 3,
    "total_archivos": 8
  }
}
```

#### Respuesta de Error (Tiene Siniestros):
```json
{
  "eliminado": false,
  "mensaje": "No se puede eliminar: la póliza tiene 2 siniestro(s) asociado(s)",
  "archivos_eliminados": 0,
  "detalles": {
    "error": "Póliza tiene siniestros asociados",
    "siniestros_count": 2,
    "solucion": "Eliminar primero los siniestros asociados"
  }
}
```

### 4️⃣ Eliminar una Póliza que Tiene Siniestros

**Workflow completo:**

```sql
-- Paso 1: Ver los siniestros asociados
SELECT id, codigo_siniestro, estado
FROM siniestros
WHERE poliza_id = 'uuid-de-la-poliza';

-- Paso 2: Eliminar cada siniestro
SELECT * FROM eliminar_siniestro_completo('uuid-del-siniestro-1');
SELECT * FROM eliminar_siniestro_completo('uuid-del-siniestro-2');

-- Paso 3: Verificar que ya no tiene siniestros
SELECT * FROM puede_eliminar_poliza('uuid-de-la-poliza');
-- Debería retornar puede_eliminar = true

-- Paso 4: Ahora sí eliminar la póliza
SELECT * FROM eliminar_poliza_completo('uuid-de-la-poliza');
```

---

## 🔥 Limpieza Masiva de Datos de Prueba

### Opción 1: Usar el Script Automatizado

```sql
-- Editar el script limpiar_todas_polizas_prueba.sql
-- Cambiar la variable v_patron_numero_poliza según necesidad

-- Ejecutar el script completo desde Supabase SQL Editor
```

### Opción 2: Comando Manual

```sql
-- Ver qué se va a eliminar PRIMERO
SELECT numero_poliza, ramo, estado,
  (SELECT COUNT(*) FROM siniestros WHERE poliza_id = p.id) as siniestros
FROM polizas p
WHERE numero_poliza LIKE 'PRUEBA-%';

-- Si estás seguro, ejecutar eliminación
DO $
DECLARE
  v_poliza RECORD;
  v_result RECORD;
BEGIN
  FOR v_poliza IN
    SELECT id, numero_poliza
    FROM polizas
    WHERE numero_poliza LIKE 'PRUEBA-%'
  LOOP
    SELECT * INTO v_result FROM eliminar_poliza_completo(v_poliza.id);
    RAISE NOTICE '%: %', v_poliza.numero_poliza, v_result.mensaje;
  END LOOP;
END $;
```

---

## 🔍 Verificación Post-Eliminación

### Verificar que No Quedan Registros Huérfanos

```sql
SELECT
  'Pagos huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_pagos pp
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = pp.poliza_id)

UNION ALL

SELECT
  'Comprobantes huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_pagos_comprobantes ppc
WHERE NOT EXISTS (SELECT 1 FROM polizas_pagos pp WHERE pp.id = ppc.pago_id)

UNION ALL

SELECT
  'Documentos huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_documentos pd
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = pd.poliza_id)

UNION ALL

SELECT
  'Vehículos huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_automotor_vehiculos pav
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = pav.poliza_id)

UNION ALL

SELECT
  'Historial huérfano' as tabla,
  COUNT(*) as registros
FROM polizas_historial_ediciones phe
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = phe.poliza_id);

-- ✅ Todos deberían retornar 0
```

---

## 📊 ¿Qué se Elimina Exactamente?

Cuando ejecutas `eliminar_poliza_completo()`, se eliminan:

### 1. Registros de Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `polizas` | Registro principal de la póliza |
| `polizas_pagos` | Todas las cuotas de pago |
| `polizas_pagos_comprobantes` | Comprobantes de pago |
| `polizas_documentos` | Metadatos de documentos |
| `polizas_automotor_vehiculos` | Vehículos asegurados |
| `polizas_historial_ediciones` | Historial completo de cambios |

### 2. Archivos de Supabase Storage

| Bucket | Descripción | Ejemplo |
|--------|-------------|---------|
| `polizas-documentos` | PDFs, imágenes de la póliza | Certificados, carátulas |
| `comprobantes-pagos` | Comprobantes de cuotas | Recibos, transferencias |

### 3. Información en el JSON de Retorno

```typescript
{
  eliminado: boolean,              // true si exitoso
  mensaje: string,                 // Mensaje descriptivo
  archivos_eliminados: number,     // Total de archivos borrados del Storage
  detalles: {
    poliza_id: UUID,
    numero_poliza: string,
    ramo: string,
    pagos_eliminados: number,      // Número de cuotas eliminadas
    vehiculos_eliminados: number,   // Número de vehículos eliminados
    documentos_eliminados: number,  // Número de documentos eliminados
    historial_eliminado: number,    // Número de registros de historial
    archivos_documentos: number,    // Archivos del bucket polizas-documentos
    archivos_comprobantes: number,  // Archivos del bucket comprobantes-pagos
    total_archivos: number          // Suma de ambos
  }
}
```

---

## 🛡️ Casos de Uso Comunes

### Caso 1: Póliza de Prueba sin Siniestros
```sql
-- Eliminar directamente
SELECT * FROM eliminar_poliza_por_numero('PRUEBA-001');
```

### Caso 2: Póliza con Siniestros
```sql
-- 1. Listar siniestros
SELECT codigo_siniestro FROM siniestros WHERE poliza_id = 'uuid-poliza';

-- 2. Eliminar siniestros uno por uno
SELECT * FROM eliminar_siniestro_por_codigo('SIN-001');

-- 3. Eliminar póliza
SELECT * FROM eliminar_poliza_por_numero('POL-001');
```

### Caso 3: Múltiples Pólizas de Prueba
```sql
-- Usar el script limpiar_todas_polizas_prueba.sql
-- Configurar patrón: v_patron_numero_poliza := 'PRUEBA-%';
```

### Caso 4: Verificación Antes de Producción
```sql
-- 1. Ver qué existe
SELECT numero_poliza, estado,
  (SELECT COUNT(*) FROM siniestros WHERE poliza_id = p.id) as siniestros
FROM polizas p
WHERE numero_poliza LIKE 'PRUEBA-%';

-- 2. Verificar una por una
SELECT * FROM puede_eliminar_poliza('uuid');

-- 3. Eliminar cuando estés seguro
```

---

## 🔧 Troubleshooting

### Problema: "La póliza tiene siniestros asociados"
**Solución:** Elimina primero los siniestros con `eliminar_siniestro_completo()`

### Problema: "Póliza no encontrada"
**Solución:** Verifica el UUID o número de póliza correcto
```sql
SELECT id, numero_poliza FROM polizas WHERE numero_poliza LIKE '%ABC%';
```

### Problema: "Error al eliminar archivos del Storage"
**Solución:** Verifica permisos RLS en los buckets
```sql
-- Los buckets deben permitir DELETE para usuarios autenticados
SELECT * FROM storage.buckets WHERE id IN ('polizas-documentos', 'comprobantes-pagos');
```

### Problema: Quedan Registros Huérfanos
**Solución:** Ejecuta la consulta de verificación y reporta los resultados

---

## 📚 Funciones Disponibles

### `eliminar_poliza_completo(p_poliza_id UUID)`
Función principal de eliminación.

**Parámetros:**
- `p_poliza_id` - UUID de la póliza a eliminar

**Retorna:**
```sql
TABLE (
  eliminado BOOLEAN,
  mensaje TEXT,
  archivos_eliminados INTEGER,
  detalles JSONB
)
```

---

### `eliminar_poliza_por_numero(p_numero_poliza TEXT)`
Wrapper que acepta número de póliza en vez de UUID.

**Parámetros:**
- `p_numero_poliza` - Número de póliza (ej: "POL-001")

**Retorna:** Mismo formato que `eliminar_poliza_completo()`

---

### `puede_eliminar_poliza(p_poliza_id UUID)`
Verifica si una póliza puede eliminarse sin intentar la eliminación.

**Parámetros:**
- `p_poliza_id` - UUID de la póliza

**Retorna:**
```sql
TABLE (
  puede_eliminar BOOLEAN,
  razon TEXT,
  detalles JSONB
)
```

---

## 🎯 Mejores Prácticas

### ✅ Hacer Siempre:
1. Ejecutar `puede_eliminar_poliza()` antes de eliminar
2. Verificar el contenido de `detalles` en la respuesta
3. Revisar registros huérfanos después de limpieza masiva
4. Hacer backup antes de limpiezas en producción

### ❌ Evitar:
1. Eliminar pólizas en producción sin verificación previa
2. Usar patrones genéricos como `'%'` en producción
3. Ignorar mensajes de error en el JSON de respuesta
4. Eliminar pólizas sin verificar dependencias

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa la sección Troubleshooting
2. Ejecuta las consultas de verificación
3. Verifica los logs con `RAISE NOTICE` en el script de limpieza
4. Documenta el error con el JSONB de `detalles`

---

## 📝 Changelog

**v1.0.0** - Creación inicial
- Función `eliminar_poliza_completo()`
- Función `eliminar_poliza_por_numero()`
- Función `puede_eliminar_poliza()`
- Protección contra eliminación de pólizas con siniestros
- Eliminación automática de archivos en Storage
- Scripts de ejemplo y limpieza masiva
