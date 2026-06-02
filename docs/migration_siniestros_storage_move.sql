-- ============================================================================
-- Migration: Políticas de Storage para subida client-side de documentos de siniestros
-- ============================================================================
--
-- CONTEXTO
-- Los documentos de siniestros ahora se suben client-side directo a Storage
-- (a una ruta temporal `temp/{user_id}/{session_id}/...`) y el server action solo
-- recibe la metadata. Esto evita el error "Body exceeded 2mb limit" de los
-- Server Actions de Next.js, que rechazaba (HTTP 400) cualquier registro/edición/
-- cierre de siniestro con documentos > 2MB ANTES de ejecutar el código del action
-- (por eso ni el try/catch ni Sentry se enteraban).
--
-- El bucket `siniestros-documentos` ya permite:
--   - INSERT a roles siniestros/comercial/admin (subida a temp/ funciona)
--   - SELECT a autenticados (lectura funciona)
--   - DELETE solo a admin
--
-- Pero le FALTAN dos políticas que sí tiene `polizas-documentos`:
--   1. UPDATE  -> necesaria para que el server action MUEVA el archivo de
--                 temp/ a su ruta final {siniestro_id}/...  (storage.move()).
--   2. DELETE de archivos temporales propios -> para que un usuario comercial/
--      siniestros pueda quitar un archivo que subió por error antes de guardar.
--
-- SIN esta migración el sistema YA FUNCIONA (el action hace fallback y registra
-- la ruta temporal), pero los archivos quedan bajo temp/ en vez de organizarse
-- por siniestro. Aplicar esta migración deja el almacenamiento ordenado y
-- consistente con el módulo de pólizas.
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================================

-- 1. Permitir MOVER (UPDATE) documentos dentro del bucket de siniestros
--    Restringido a los mismos roles que pueden subir.
DROP POLICY IF EXISTS "Siniestros, comercial y admin pueden mover documentos de siniestros"
  ON storage.objects;

CREATE POLICY "Siniestros, comercial y admin pueden mover documentos de siniestros"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'siniestros-documentos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['siniestros'::text, 'comercial'::text, 'admin'::text])
  )
)
WITH CHECK (
  bucket_id = 'siniestros-documentos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['siniestros'::text, 'comercial'::text, 'admin'::text])
  )
);

-- 2. Permitir que un usuario BORRE sus propios archivos temporales
--    (ruta temp/{auth.uid()}/...). No afecta los documentos ya asociados a un
--    siniestro, que siguen bajo la regla "solo admin puede eliminar".
DROP POLICY IF EXISTS "Usuarios pueden borrar sus propios archivos temporales de siniestros"
  ON storage.objects;

CREATE POLICY "Usuarios pueden borrar sus propios archivos temporales de siniestros"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'siniestros-documentos'
  AND (storage.foldername(name))[1] = 'temp'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
