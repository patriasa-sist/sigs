-- ============================================================
-- Migration: Storage policies para client-side upload de documentos
-- Fecha: 2026-02-24
-- Descripción:
--   1. UPDATE policy: permite mover archivos de temp/ a {poliza_id}/
--      (storage.move() internamente usa UPDATE)
--   2. DELETE policy: permite a usuarios limpiar sus archivos temp/
--      cuando cancelan el formulario
-- ============================================================

-- Ya fue ejecutada anteriormente, verificar antes de ejecutar:
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete their own temp files';

-- Política DELETE: usuarios pueden eliminar sus propios archivos en temp/
-- (Solo ejecutar si NO existe ya)
-- CREATE POLICY "Users can delete their own temp files"
-- ON storage.objects FOR DELETE TO authenticated
-- USING (
--   bucket_id = 'polizas-documentos'
--   AND (storage.foldername(name))[1] = 'temp'
--   AND (storage.foldername(name))[2] = auth.uid()::text
-- );

-- Política UPDATE: permite a usuarios autenticados mover sus archivos
-- dentro del bucket polizas-documentos (necesario para storage.move())
CREATE POLICY "Authenticated users can move poliza documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'polizas-documentos'
)
WITH CHECK (
  bucket_id = 'polizas-documentos'
);
