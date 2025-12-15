# Instrucciones para Ejecutar Migraciones de Siniestros

## Problema 1: Fecha de Registro muestra "Invalid Date"
**Causa**: La vista `siniestros_vista` no incluía el campo `updated_at`

## Problema 2: Nombre de usuario muestra "Usuario" genérico
**Causa**: No existían triggers de auditoría para capturar automáticamente `created_by` en observaciones e historial

## Migraciones a Ejecutar

### 1. Actualizar Vista con campo updated_at
**Archivo**: `supabase/migrations/20251215120000_fix_siniestros_vista_updated_at.sql`

**Pasos**:
1. Ir a Supabase Dashboard → SQL Editor
2. Abrir el archivo `supabase/migrations/20251215120000_fix_siniestros_vista_updated_at.sql`
3. Copiar todo el contenido
4. Pegar en el SQL Editor de Supabase
5. Ejecutar (Run)

**Resultado esperado**: La vista `siniestros_vista` ahora incluirá los campos `updated_at`, `created_by`, `updated_by`, `cerrado_por` y todos los campos del siniestro.

### 2. Agregar Triggers de Auditoría
**Archivo**: `supabase/migrations/20251215130000_fix_audit_observaciones_historial.sql`

**Pasos**:
1. Ir a Supabase Dashboard → SQL Editor
2. Abrir el archivo `supabase/migrations/20251215130000_fix_audit_observaciones_historial.sql`
3. Copiar todo el contenido
4. Pegar en el SQL Editor de Supabase
5. Ejecutar (Run)

**Resultado esperado**:
- Se crean 3 funciones de trigger:
  - `audit_siniestros_observaciones()` - Captura `created_by` al insertar observaciones
  - `audit_siniestros_historial()` - Captura `created_by` al insertar historial
  - `audit_siniestros_documentos()` - Captura `uploaded_by` al insertar documentos

- Se aplican 3 triggers:
  - `audit_siniestros_observaciones_trigger` en tabla `siniestros_observaciones`
  - `audit_siniestros_historial_trigger` en tabla `siniestros_historial`
  - `audit_siniestros_documentos_trigger` en tabla `siniestros_documentos`

## Verificación

### Verificar que la vista se actualizó correctamente:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'siniestros_vista'
ORDER BY ordinal_position;
```

Deberías ver los campos: `updated_at`, `created_by`, `updated_by`, `cerrado_por` en la lista.

### Verificar que los triggers se crearon correctamente:
```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'audit_siniestros%';
```

Deberías ver 3 triggers:
- `audit_siniestros_observaciones_trigger` en `siniestros_observaciones`
- `audit_siniestros_historial_trigger` en `siniestros_historial`
- `audit_siniestros_documentos_trigger` en `siniestros_documentos`

## Prueba

1. **Probar fecha de registro**:
   - Ir a un siniestro existente
   - Verificar que en "Información de Registro" ahora muestra la fecha correctamente
   - Si aún muestra "Invalid Date", recargar la página (Ctrl+Shift+R)

2. **Probar nombre de usuario en observaciones**:
   - Ir a un siniestro
   - Tab "Observaciones"
   - Agregar una nueva observación
   - Verificar que muestra tu nombre completo (no "Usuario")

## Cambios en el Código

También se modificó `app/siniestros/actions.ts`:
- El query de observaciones ahora obtiene `created_by` y hace un JOIN manual con `profiles`
- El query de historial hace lo mismo
- Esto asegura que se obtenga el nombre del usuario correctamente

## Notas Importantes

- A partir de ahora, todas las nuevas observaciones, registros de historial y documentos **capturarán automáticamente** el `created_by` / `uploaded_by` gracias a los triggers
- Los registros antiguos (antes de ejecutar la migración) podrían tener `created_by` NULL y mostrarán "Usuario" o "Sistema" como fallback
- Esto es esperado y no afecta la funcionalidad
