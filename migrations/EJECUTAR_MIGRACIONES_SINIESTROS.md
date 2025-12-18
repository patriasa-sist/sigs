# Instrucciones para Ejecutar Migraciones de Siniestros

## Problema 1: Fecha de Registro muestra "Invalid Date"
**Causa**: La vista `siniestros_vista` no incluía el campo `updated_at`

## Problema 2: Nombre de usuario muestra "Usuario" genérico
**Causa**: No existían triggers de auditoría para capturar automáticamente `created_by` en observaciones e historial

## Problema 3: Historial no se actualiza al agregar observaciones
**Causa**: La tabla `siniestros_historial` no tiene política RLS para INSERT, solo para SELECT

## Migraciones a Ejecutar (en orden)

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

### 3. Agregar Política RLS para INSERT en Historial
**Archivo**: `supabase/migrations/20251215140000_fix_rls_historial_insert.sql`

**Pasos**:
1. Ir a Supabase Dashboard → SQL Editor
2. Abrir el archivo `supabase/migrations/20251215140000_fix_rls_historial_insert.sql`
3. Copiar todo el contenido
4. Pegar en el SQL Editor de Supabase
5. Ejecutar (Run)

**Resultado esperado**: Se crea la política RLS `"Usuarios autorizados pueden insertar en historial"` que permite a usuarios con roles siniestros, comercial o admin insertar registros en `siniestros_historial`.

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

Deberías ver 4 triggers:
- `audit_siniestros_trigger` en `siniestros`
- `audit_siniestros_observaciones_trigger` en `siniestros_observaciones`
- `audit_siniestros_historial_trigger` en `siniestros_historial`
- `audit_siniestros_documentos_trigger` en `siniestros_documentos`

### Verificar que la política RLS se creó correctamente:
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'siniestros_historial';
```

Deberías ver 2 políticas:
- `Usuarios autenticados pueden leer historial` (cmd: SELECT)
- `Usuarios autorizados pueden insertar en historial` (cmd: INSERT)

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

3. **Probar que el historial se actualiza**:
   - En el mismo siniestro, ir al Tab "Historial"
   - Deberías ver las nuevas observaciones registradas con acción "Observación Agregada"
   - Verificar que muestra tu nombre completo y la fecha/hora correcta

## Cambios en el Código

### 1. `app/siniestros/actions.ts`:
- El query de observaciones ahora obtiene `created_by` y hace un JOIN manual con `profiles`
- El query de historial hace lo mismo
- Esto asegura que se obtenga el nombre del usuario correctamente
- **Agregada verificación de errores**: Ahora se captura y muestra en consola si falla el INSERT en historial

### 2. `components/siniestros/edicion/EditarSiniestroForm.tsx`:
- **Agregado botón "Volver a Siniestros"**: Ahora hay un botón arriba del formulario para regresar al listado de siniestros

## Notas Importantes

- A partir de ahora, todas las nuevas observaciones, registros de historial y documentos **capturarán automáticamente** el `created_by` / `uploaded_by` gracias a los triggers
- Los registros antiguos (antes de ejecutar la migración) podrían tener `created_by` NULL y mostrarán "Usuario" o "Sistema" como fallback
- Esto es esperado y no afecta la funcionalidad
