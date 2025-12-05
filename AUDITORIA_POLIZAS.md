# Sistema de Trazabilidad y Auditoría de Pólizas

## Campos de Auditoría Agregados

### Tabla `polizas`
- `created_by` - UUID del usuario que creó la póliza (automático)
- `created_at` - Fecha y hora de creación (automático)
- `updated_by` - UUID del último usuario que editó la póliza (automático)
- `updated_at` - Fecha y hora de última edición (automático)

### Tabla `polizas_automotor_vehiculos`
- `created_by` - Usuario que agregó el vehículo (automático)
- `created_at` - Fecha de agregado (automático)
- `updated_by` - Usuario que editó el vehículo (automático)
- `updated_at` - Fecha de última edición (automático)

### Tabla `polizas_pagos`
- `created_by` - Usuario que registró el pago (automático)
- `created_at` - Fecha de registro (automático)
- `updated_by` - Usuario que modificó el pago (automático)
- `updated_at` - Fecha de modificación (automático)

## Cómo Funciona (Automático)

Los **triggers** de base de datos capturan automáticamente:

1. **En INSERT (Creación)**:
   - `created_by = auth.uid()` - Captura el ID del usuario de Supabase autenticado
   - `created_at = NOW()` - Timestamp de creación
   - `updated_by = NULL` - Primera vez no hay editor
   - `updated_at = NOW()` - Mismo que created_at

2. **En UPDATE (Edición)**:
   - `updated_by = auth.uid()` - Captura el ID del usuario que edita
   - `updated_at = NOW()` - Timestamp de la edición
   - `created_by` y `created_at` se **preservan** (no se pueden cambiar)

## Vista para Consultas de Auditoría

Se creó la vista `polizas_con_auditoria` que incluye:

```sql
SELECT * FROM polizas_con_auditoria;
```

**Retorna**:
- Todos los campos de la póliza
- `creado_por_nombre` - Nombre completo de quien creó
- `creado_por_email` - Email de quien creó
- `editado_por_nombre` - Nombre completo del último editor
- `editado_por_email` - Email del último editor
- `responsable_nombre` - Nombre del responsable asignado
- `compania_nombre`, `regional_nombre`, `categoria_nombre` - Nombres de catálogos
- `tipo_cliente` - Si es natural o jurídica

## Uso en la Aplicación

En tu código TypeScript, cuando guardes una póliza, **NO necesitas pasar** `created_by` ni `updated_by`:

```typescript
// ❌ NO HACER ESTO:
const { data, error } = await supabase
  .from('polizas')
  .insert({
    ...polizaData,
    created_by: userId, // ❌ No necesario
    updated_by: userId  // ❌ No necesario
  });

// ✅ HACER ESTO (campos se capturan automáticamente):
const { data, error } = await supabase
  .from('polizas')
  .insert({
    client_id: asegurado.id,
    numero_poliza: datos.numero,
    compania_aseguradora_id: datos.compania,
    // ... otros campos
    // created_by y updated_by se capturan AUTOMÁTICAMENTE
  });
```

## Beneficios para Gerencia

### Reportes de Auditoría
```sql
-- Ver quién creó más pólizas este mes
SELECT
  p.full_name,
  COUNT(*) as total_polizas_creadas
FROM polizas pol
JOIN profiles p ON pol.created_by = p.id
WHERE pol.created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY p.full_name
ORDER BY total_polizas_creadas DESC;

-- Ver pólizas editadas recientemente
SELECT
  numero_poliza,
  editado_por_nombre,
  updated_at
FROM polizas_con_auditoria
WHERE updated_by IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;

-- Ver cuántas veces se editó una póliza específica
-- (requiere tabla adicional de historial si quieres ver TODOS los cambios)
```

### Seguridad
- Imposible modificar quién creó una póliza
- Timestamp inmutable
- Registro automático sin intervención del usuario

## Historial Básico de Ediciones ✅ IMPLEMENTADO

Se implementó un sistema de **log de auditoría básico** que registra:

### Tabla `polizas_historial_ediciones`
Registra **TODAS** las acciones sobre pólizas:

- `poliza_id` - Póliza modificada
- `accion` - Tipo: 'creacion', 'edicion', 'eliminacion'
- `usuario_id` - Quién realizó la acción
- `campos_modificados` - Array de nombres de campos editados (sin valores)
- `descripcion` - Descripción automática de la acción
- `timestamp` - Cuándo ocurrió

### Ejemplo de Uso

```sql
-- Ver TODO el historial de una póliza específica
SELECT * FROM polizas_historial_vista
WHERE numero_poliza = 'POL-12345'
ORDER BY timestamp DESC;

-- Resultado:
-- timestamp           | usuario_nombre | accion   | campos_modificados
-- 2024-01-15 14:30:00 | Pedro García   | edicion  | {prima_total, moneda}
-- 2024-01-10 09:15:00 | María López    | edicion  | {fin_vigencia}
-- 2024-01-05 11:00:00 | Juan Pérez     | creacion | NULL

-- Ver quién ha editado pólizas hoy
SELECT usuario_nombre, COUNT(*) as total_ediciones
FROM polizas_historial_vista
WHERE DATE(timestamp) = CURRENT_DATE AND accion = 'edicion'
GROUP BY usuario_nombre;

-- Últimas 50 acciones en el sistema
SELECT * FROM polizas_historial_vista LIMIT 50;
```

### Ventajas de este Enfoque

✅ **Trazabilidad completa** - Sabes quién hizo qué y cuándo
✅ **Ligero** - No guarda snapshots completos (menos espacio)
✅ **Automático** - Triggers capturan todo sin intervención
✅ **Forense** - Rastro completo de actividad
✅ **Performance** - Queries rápidos con índices
