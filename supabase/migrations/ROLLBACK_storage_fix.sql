-- ============================================================
-- ROLLBACK URGENTE - REVERTIR CAMBIOS DE SOFT DELETE
-- ============================================================
-- Ejecutar INMEDIATAMENTE para restaurar la autenticación
-- ============================================================

-- 1. ELIMINAR FUNCIONES PROBLEMÁTICAS
DROP FUNCTION IF EXISTS descartar_documento(UUID);
DROP FUNCTION IF EXISTS restaurar_documento(UUID);
DROP FUNCTION IF EXISTS eliminar_documento_permanente(UUID);

-- 2. ELIMINAR POLÍTICAS RLS DE STORAGE QUE AGREGAMOS
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "Documentos son de lectura pública" ON storage.objects;
DROP POLICY IF EXISTS "Solo admins pueden eliminar documentos físicamente" ON storage.objects;

-- 3. ELIMINAR CAMPO ESTADO SI EXISTE (puede estar causando problemas)
ALTER TABLE polizas_documentos DROP COLUMN IF EXISTS estado;
DROP INDEX IF EXISTS idx_polizas_documentos_estado;

-- 4. RECREAR POLÍTICAS DE STORAGE BÁSICAS (SIN RESTRICCIONES COMPLEJAS)
CREATE POLICY "storage_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'polizas-documentos');

CREATE POLICY "storage_select_policy"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'polizas-documentos');

CREATE POLICY "storage_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'polizas-documentos');

-- 5. VERIFICAR Y LIMPIAR POSIBLES PROBLEMAS EN TABLA PROFILES
-- (Las funciones SECURITY DEFINER pueden haber dejado bloqueos)

-- Recargar políticas RLS de profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id);

-- Permitir a usuarios autenticados ver perfiles (necesario para middleware)
CREATE POLICY "Allow authenticated users to view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- 6. VERIFICAR QUE NO HAYA LOCKS EN LA BASE DE DATOS
-- (Esto es solo informativo, no hace cambios)
SELECT
  pid,
  usename,
  pg_blocking_pids(pid) as blocked_by,
  query as blocked_query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;

-- ============================================================
-- VERIFICACIÓN POST-ROLLBACK
-- ============================================================

-- Verificar que las funciones fueron eliminadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('descartar_documento', 'restaurar_documento', 'eliminar_documento_permanente');
-- Debe retornar 0 filas

-- Verificar que las políticas de Storage existen
SELECT policyname
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
-- Debe mostrar las 3 políticas básicas

-- Verificar que el campo estado fue eliminado
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'polizas_documentos'
AND column_name = 'estado';
-- Debe retornar 0 filas

-- ============================================================
-- NOTA IMPORTANTE
-- ============================================================
-- Después de ejecutar este script:
-- 1. Limpia el caché del navegador (Ctrl+Shift+R)
-- 2. Cierra todas las pestañas de la aplicación
-- 3. Intenta iniciar sesión nuevamente
-- 4. Si persiste el error, reinicia el servidor de desarrollo
-- ============================================================
