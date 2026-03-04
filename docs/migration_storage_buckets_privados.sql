-- =====================================================
-- MIGRACIÓN: Hacer buckets de Storage privados
-- =====================================================
-- Esta migración realiza 3 cambios:
-- 1. Convierte los 4 buckets de público a privado
-- 2. Actualiza las políticas RLS de SELECT para que solo usuarios autenticados puedan leer
-- 3. Limpia las URLs completas almacenadas en BD, dejando solo rutas relativas
--
-- IMPORTANTE: Ejecutar DESPUÉS de desplegar el código que usa createSignedUrl()
-- =====================================================

-- =====================================================
-- PASO 1: Hacer los buckets privados
-- =====================================================

UPDATE storage.buckets SET public = false WHERE id = 'polizas-documentos';
UPDATE storage.buckets SET public = false WHERE id = 'clientes-documentos';
UPDATE storage.buckets SET public = false WHERE id = 'pagos-comprobantes';
UPDATE storage.buckets SET public = false WHERE id = 'siniestros-documentos';

-- =====================================================
-- PASO 2: Actualizar políticas RLS de SELECT
-- =====================================================
-- polizas-documentos: cambiar de lectura pública a solo autenticados
DROP POLICY IF EXISTS "Documentos son de lectura pública" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden leer polizas-documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'polizas-documentos' AND auth.role() = 'authenticated');

-- siniestros-documentos: cambiar de lectura pública a solo autenticados
DROP POLICY IF EXISTS "Documentos de siniestros son de lectura pública" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden leer siniestros-documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'siniestros-documentos' AND auth.role() = 'authenticated');

-- pagos-comprobantes y clientes-documentos ya tienen políticas de lectura
-- para usuarios autenticados, no necesitan cambios.

-- =====================================================
-- PASO 3: Limpiar URLs completas en BD → rutas relativas
-- =====================================================
-- polizas_documentos: almacena URLs completas de polizas-documentos
UPDATE polizas_documentos
SET archivo_url = split_part(archivo_url, '/polizas-documentos/', 2)
WHERE archivo_url LIKE '%/storage/v1/object/public/polizas-documentos/%';

-- polizas_anexos_documentos: almacena URLs completas de polizas-documentos
UPDATE polizas_anexos_documentos
SET archivo_url = split_part(archivo_url, '/polizas-documentos/', 2)
WHERE archivo_url LIKE '%/storage/v1/object/public/polizas-documentos/%';

-- polizas_pagos_comprobantes: almacena URLs completas de pagos-comprobantes
UPDATE polizas_pagos_comprobantes
SET archivo_url = split_part(archivo_url, '/pagos-comprobantes/', 2)
WHERE archivo_url LIKE '%/storage/v1/object/public/pagos-comprobantes/%';

-- siniestros_documentos: ya almacena rutas relativas, no necesita cambios
-- clientes_documentos: usa storage_path (relativo), no necesita cambios

-- =====================================================
-- VERIFICACIÓN (ejecutar después para confirmar)
-- =====================================================
-- SELECT id, archivo_url FROM polizas_documentos WHERE archivo_url LIKE 'http%' LIMIT 5;
-- SELECT id, archivo_url FROM polizas_anexos_documentos WHERE archivo_url LIKE 'http%' LIMIT 5;
-- SELECT id, archivo_url FROM polizas_pagos_comprobantes WHERE archivo_url LIKE 'http%' LIMIT 5;
-- SELECT public FROM storage.buckets WHERE id IN ('polizas-documentos', 'clientes-documentos', 'pagos-comprobantes', 'siniestros-documentos');
