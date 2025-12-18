-- ============================================================
-- CONFIGURAR POLÍTICAS DE STORAGE PARA DOCUMENTOS
-- ============================================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en Supabase Dashboard
-- 2. Copia y pega TODO este contenido
-- 3. Ejecuta el script
-- ============================================================

-- 1. AGREGAR CAMPO ESTADO (si no existe)
ALTER TABLE polizas_documentos
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo'
CHECK (estado IN ('activo', 'descartado'));

CREATE INDEX IF NOT EXISTS idx_polizas_documentos_estado
ON polizas_documentos(estado);

-- 2. ELIMINAR POLÍTICAS ANTIGUAS (si existen)
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
DROP POLICY IF EXISTS "Documentos son de lectura pública" ON storage.objects;
DROP POLICY IF EXISTS "Solo admins pueden eliminar documentos físicamente" ON storage.objects;

-- 3. CREAR POLÍTICAS DE STORAGE

-- Permitir INSERT (upload) a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'polizas-documentos');

-- Permitir SELECT (lectura) pública
CREATE POLICY "Documentos son de lectura pública"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'polizas-documentos');

-- Permitir DELETE solo a admins
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

-- 4. CREAR FUNCIONES PARA SOFT DELETE

-- Función: Descartar documento (comercial + admin)
CREATE OR REPLACE FUNCTION descartar_documento(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
BEGIN
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  IF usuario_rol NOT IN ('comercial', 'admin') THEN
    RAISE EXCEPTION 'Usuario no autorizado para descartar documentos';
  END IF;

  UPDATE polizas_documentos
  SET estado = 'descartado'
  WHERE id = documento_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Función: Restaurar documento (solo admin)
CREATE OR REPLACE FUNCTION restaurar_documento(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
BEGIN
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  IF usuario_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden restaurar documentos';
  END IF;

  UPDATE polizas_documentos
  SET estado = 'activo'
  WHERE id = documento_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Función: Eliminar permanentemente (solo admin)
CREATE OR REPLACE FUNCTION eliminar_documento_permanente(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
BEGIN
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  IF usuario_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar documentos permanentemente';
  END IF;

  DELETE FROM polizas_documentos
  WHERE id = documento_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Verificar que las políticas fueron creadas
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%polizas-documentos%';

-- Verificar que las funciones fueron creadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('descartar_documento', 'restaurar_documento', 'eliminar_documento_permanente');

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Si ves 3 políticas y 3 funciones en los resultados, ¡todo está listo!
-- ============================================================
