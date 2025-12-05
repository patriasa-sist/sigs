-- ===========================================================
-- CONFIGURACIÓN DE STORAGE Y SOFT DELETE PARA DOCUMENTOS
-- ===========================================================
--
-- Este archivo contiene las instrucciones SQL para:
-- 1. Crear el bucket de Storage
-- 2. Agregar campo de estado para soft delete
-- 3. Configurar políticas de seguridad
--
-- IMPORTANTE: Este script debe ejecutarse manualmente en Supabase
-- ya que la creación de buckets de Storage requiere permisos especiales.
--
-- ===========================================================

-- 1. AGREGAR CAMPO DE ESTADO A LA TABLA POLIZAS_DOCUMENTOS
-- Este campo permite el "soft delete" (eliminación lógica)

ALTER TABLE polizas_documentos
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'descartado'));

-- Agregar índice para mejorar consultas por estado
CREATE INDEX IF NOT EXISTS idx_polizas_documentos_estado
ON polizas_documentos(estado);

-- 2. CREAR BUCKET DE STORAGE
-- Ejecutar desde el SQL Editor de Supabase:

INSERT INTO storage.buckets (id, name, public)
VALUES ('polizas-documentos', 'polizas-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. CONFIGURAR POLÍTICAS DE SEGURIDAD (RLS)

-- Política: Permitir upload solo a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir documentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'polizas-documentos');

-- Política: Permitir lectura pública (para ver documentos desde el sistema)
DROP POLICY IF EXISTS "Documentos son de lectura pública" ON storage.objects;
CREATE POLICY "Documentos son de lectura pública"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'polizas-documentos');

-- Política: SOLO ADMINS pueden eliminar físicamente archivos del Storage
DROP POLICY IF EXISTS "Solo admins pueden eliminar documentos físicamente" ON storage.objects;
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

-- 4. CREAR FUNCIÓN PARA SOFT DELETE (MARCAR COMO DESCARTADO)
-- Usuarios comerciales y admins pueden descartar documentos

CREATE OR REPLACE FUNCTION descartar_documento(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
BEGIN
  -- Obtener rol del usuario actual
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar que el usuario sea comercial o admin
  IF usuario_rol NOT IN ('comercial', 'admin') THEN
    RAISE EXCEPTION 'Usuario no autorizado para descartar documentos';
  END IF;

  -- Marcar documento como descartado
  UPDATE polizas_documentos
  SET estado = 'descartado'
  WHERE id = documento_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 5. CREAR FUNCIÓN PARA RESTAURAR DOCUMENTOS DESCARTADOS
-- Solo admins pueden restaurar documentos

CREATE OR REPLACE FUNCTION restaurar_documento(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
BEGIN
  -- Obtener rol del usuario actual
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar que el usuario sea admin
  IF usuario_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden restaurar documentos';
  END IF;

  -- Restaurar documento
  UPDATE polizas_documentos
  SET estado = 'activo'
  WHERE id = documento_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 6. CREAR FUNCIÓN PARA ELIMINAR FÍSICAMENTE DOCUMENTOS
-- Solo admins pueden eliminar físicamente (borra de BD y Storage)

CREATE OR REPLACE FUNCTION eliminar_documento_permanente(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
  archivo_path TEXT;
BEGIN
  -- Obtener rol del usuario actual
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar que el usuario sea admin
  IF usuario_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar documentos permanentemente';
  END IF;

  -- Obtener path del archivo para eliminarlo del Storage
  SELECT archivo_url INTO archivo_path
  FROM polizas_documentos
  WHERE id = documento_id;

  -- Eliminar registro de base de datos
  DELETE FROM polizas_documentos
  WHERE id = documento_id;

  -- NOTA: La eliminación del Storage debe hacerse desde el código de la aplicación
  -- usando supabase.storage.from('polizas-documentos').remove([path])

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- ===========================================================
-- ALTERNATIVA: CREAR BUCKET DESDE LA UI DE SUPABASE
-- ===========================================================
--
-- Si prefieres crear el bucket desde la interfaz web:
--
-- 1. Ve a Storage en el panel de Supabase
-- 2. Click en "New Bucket"
-- 3. Nombre: polizas-documentos
-- 4. Public bucket: ✓ (marcado)
-- 5. Click en "Create bucket"
-- 6. Luego configura las políticas RLS desde la UI
--
-- ===========================================================

-- VERIFICAR QUE EL BUCKET FUE CREADO:
SELECT * FROM storage.buckets WHERE name = 'polizas-documentos';

-- VERIFICAR POLÍTICAS:
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
