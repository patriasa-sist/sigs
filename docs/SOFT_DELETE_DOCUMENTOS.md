# Sistema de Soft Delete para Documentos de Pólizas

## Visión General

El sistema de documentos de pólizas implementa un **soft delete** (eliminación lógica) que permite:
- **Usuarios comerciales**: Solo pueden marcar documentos como "descartado"
- **Usuarios admin**: Pueden descartar, restaurar y eliminar permanentemente documentos

## Arquitectura

### 1. Campo de Estado en Base de Datos

```sql
ALTER TABLE polizas_documentos
ADD COLUMN estado VARCHAR(20) DEFAULT 'activo'
CHECK (estado IN ('activo', 'descartado'));
```

**Estados posibles:**
- `activo` - Documento visible en la interfaz (estado por defecto)
- `descartado` - Documento oculto de la interfaz pero aún existe en BD y Storage

### 2. Políticas de Storage (RLS)

#### Eliminación Física del Storage
Solo usuarios con rol `admin` pueden eliminar archivos físicamente del bucket de Storage:

```sql
CREATE POLICY "Solo admins pueden eliminar documentos físicamente"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'polizas-documentos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### 3. Funciones de Base de Datos

#### `descartar_documento(documento_id UUID)`
- **Permisos**: Comerciales y Admins
- **Acción**: Cambia estado a 'descartado'
- **Efecto**: Documento NO se muestra en interfaz

```sql
CREATE OR REPLACE FUNCTION descartar_documento(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
BEGIN
  SELECT role INTO usuario_rol FROM profiles WHERE id = auth.uid();

  IF usuario_rol NOT IN ('comercial', 'admin') THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  UPDATE polizas_documentos SET estado = 'descartado' WHERE id = documento_id;
  RETURN TRUE;
END;
$$;
```

#### `restaurar_documento(documento_id UUID)`
- **Permisos**: Solo Admins
- **Acción**: Cambia estado a 'activo'
- **Efecto**: Documento vuelve a mostrarse en interfaz

#### `eliminar_documento_permanente(documento_id UUID)`
- **Permisos**: Solo Admins
- **Acción**: Elimina registro de BD
- **Nota**: El archivo del Storage debe eliminarse desde el código de aplicación

### 4. Server Actions

#### Descartar Documento (Soft Delete)
```typescript
import { descartarDocumento } from '@/app/polizas/documentos/actions';

const resultado = await descartarDocumento(documentoId);
// resultado: { success: boolean, error?: string }
```

#### Restaurar Documento
```typescript
import { restaurarDocumento } from '@/app/polizas/documentos/actions';

const resultado = await restaurarDocumento(documentoId);
// Solo admins pueden ejecutar esta acción
```

#### Eliminar Permanentemente
```typescript
import { eliminarDocumentoPermanente } from '@/app/polizas/documentos/actions';

const resultado = await eliminarDocumentoPermanente(documentoId, archivoUrl);
// Elimina registro de BD y archivo del Storage
// Solo admins pueden ejecutar esta acción
```

#### Obtener Documentos Activos
```typescript
import { obtenerDocumentosActivos } from '@/app/polizas/documentos/actions';

const { documentos } = await obtenerDocumentosActivos(polizaId);
// Retorna solo documentos con estado 'activo'
```

#### Obtener Todos los Documentos (incluyendo descartados)
```typescript
import { obtenerTodosDocumentos } from '@/app/polizas/documentos/actions';

const { documentos } = await obtenerTodosDocumentos(polizaId);
// Solo admins pueden ver documentos descartados
```

## Flujos de Usuario

### Usuario Comercial

1. **Descartar un documento**:
   ```
   Usuario ve lista de documentos activos
   → Click en botón "Descartar"
   → Documento desaparece de la interfaz
   → Documento marcado como 'descartado' en BD
   → Archivo permanece en Storage
   ```

2. **Intentar eliminar permanentemente**:
   ```
   Usuario no tiene opción de eliminar permanentemente
   → Solo botón "Descartar" disponible
   ```

### Usuario Admin

1. **Descartar un documento**:
   ```
   Admin ve lista de documentos activos
   → Click en botón "Descartar"
   → Mismo flujo que comercial
   ```

2. **Ver documentos descartados**:
   ```
   Admin activa filtro "Mostrar descartados"
   → Ve documentos con estado 'descartado'
   → Puede restaurarlos o eliminarlos permanentemente
   ```

3. **Restaurar documento**:
   ```
   Admin ve documento descartado
   → Click en botón "Restaurar"
   → Documento vuelve a estado 'activo'
   → Documento visible para todos
   ```

4. **Eliminar permanentemente**:
   ```
   Admin ve documento descartado
   → Click en botón "Eliminar Permanentemente"
   → Confirmación de seguridad
   → Registro eliminado de BD
   → Archivo eliminado de Storage
   → ACCIÓN IRREVERSIBLE
   ```

## Consideraciones de Implementación

### En Componentes React

```typescript
import { descartarDocumento } from '@/app/polizas/documentos/actions';

// Obtener rol del usuario
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

const esAdmin = profile?.role === 'admin';

// Renderizar botones según rol
{esAdmin ? (
  <>
    <Button onClick={() => descartarDocumento(doc.id)}>
      Descartar
    </Button>
    {doc.estado === 'descartado' && (
      <>
        <Button onClick={() => restaurarDocumento(doc.id)}>
          Restaurar
        </Button>
        <Button onClick={() => eliminarDocumentoPermanente(doc.id, doc.archivo_url)}>
          Eliminar Permanentemente
        </Button>
      </>
    )}
  </>
) : (
  <Button onClick={() => descartarDocumento(doc.id)}>
    Descartar
  </Button>
)}
```

### Filtrado en Consultas

**Para usuarios normales (mostrar solo activos):**
```typescript
const { data } = await supabase
  .from('polizas_documentos')
  .select('*')
  .eq('poliza_id', polizaId)
  .eq('estado', 'activo');
```

**Para admins (mostrar todos):**
```typescript
const { data } = await supabase
  .from('polizas_documentos')
  .select('*')
  .eq('poliza_id', polizaId);
// Luego filtrar en UI según necesidad
```

## Ventajas del Soft Delete

1. **Auditoría**: Mantiene registro completo de documentos históricos
2. **Recuperación**: Admins pueden restaurar documentos descartados por error
3. **Seguridad**: Evita eliminaciones accidentales por usuarios sin privilegios
4. **Compliance**: Cumple con requisitos de retención de documentos

## Limpieza de Documentos Antiguos

Para limpiar documentos descartados después de cierto tiempo (ejemplo: 90 días), crear un job programado:

```sql
-- Eliminar documentos descartados hace más de 90 días
DELETE FROM polizas_documentos
WHERE estado = 'descartado'
AND updated_at < NOW() - INTERVAL '90 days';
```

**Nota**: También eliminar archivos del Storage correspondientes.

## Archivos Relacionados

- Migración SQL: `supabase/migrations/storage_polizas_documentos.sql`
- Server Actions: `app/polizas/documentos/actions.ts`
- Tipos TypeScript: `types/poliza.ts` (DocumentoPoliza con campo `estado`)
- Guardar póliza: `app/polizas/nueva/actions.ts` (guarda con estado 'activo')

## Testing

### Casos de Prueba

1. ✅ Usuario comercial puede descartar documento
2. ✅ Usuario comercial NO puede eliminar permanentemente
3. ✅ Usuario comercial NO puede restaurar documento
4. ✅ Admin puede descartar documento
5. ✅ Admin puede restaurar documento descartado
6. ✅ Admin puede eliminar permanentemente
7. ✅ Documento descartado no aparece en lista para comerciales
8. ✅ Documento descartado aparece en lista para admins (con filtro)
9. ✅ Políticas RLS impiden DELETE a usuarios comerciales en Storage
10. ✅ Archivo se mantiene en Storage después de descartar

## Migraciones Requeridas

Ejecutar en orden:

1. **Crear tabla polizas_documentos** (ya existe en `migration_polizas_system.sql`)
2. **Agregar campo estado**: `storage_polizas_documentos.sql`
3. **Crear funciones**: `storage_polizas_documentos.sql`
4. **Crear políticas RLS**: `storage_polizas_documentos.sql`

## Soporte

Para preguntas o problemas con el sistema de soft delete, consultar:
- Documentación de Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Documentación de Storage: https://supabase.com/docs/guides/storage
