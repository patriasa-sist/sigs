-- ===========================================================
-- POLÍTICAS RLS PARA POLIZAS_DOCUMENTOS
-- ===========================================================
--
-- Este archivo configura las políticas de Row Level Security (RLS)
-- para la tabla polizas_documentos
--
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en Supabase Dashboard
-- 2. Copia y pega todo este contenido
-- 3. Ejecuta el script
--
-- ===========================================================

-- 1. Habilitar RLS en la tabla polizas_documentos
ALTER TABLE polizas_documentos ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes si las hay (para evitar conflictos)
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar documentos" ON polizas_documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos activos" ON polizas_documentos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON polizas_documentos;
DROP POLICY IF EXISTS "Solo admins pueden eliminar documentos" ON polizas_documentos;

-- 3. Crear política de INSERT
-- Permite a todos los usuarios autenticados insertar documentos
CREATE POLICY "Usuarios autenticados pueden insertar documentos"
ON polizas_documentos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Crear política de SELECT
-- Permite a todos los usuarios autenticados ver documentos activos
CREATE POLICY "Usuarios autenticados pueden ver documentos activos"
ON polizas_documentos
FOR SELECT
TO authenticated
USING (estado = 'activo' OR estado IS NULL);

-- 5. Crear política de UPDATE
-- Permite a todos los usuarios autenticados actualizar documentos
-- (necesario para soft delete y otras actualizaciones)
CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
ON polizas_documentos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Crear política de DELETE
-- Solo administradores pueden eliminar físicamente documentos
CREATE POLICY "Solo admins pueden eliminar documentos"
ON polizas_documentos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ===========================================================
-- VERIFICACIÓN
-- ===========================================================

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'polizas_documentos';

-- Verificar las políticas creadas
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'polizas_documentos'
ORDER BY cmd, policyname;

-- ===========================================================
-- RESULTADO ESPERADO
-- ===========================================================
-- Deberías ver:
-- - rowsecurity = true
-- - 4 políticas: INSERT, SELECT, UPDATE, DELETE
-- ===========================================================
