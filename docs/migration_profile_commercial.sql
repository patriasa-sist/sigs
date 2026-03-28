-- ============================================================
-- Migration: Add commercial profile fields + Storage bucket
-- Run manually in Supabase SQL Editor
-- Date: 2026-03-28
-- ============================================================
--
-- PASOS PARA EJECUTAR:
--
--   PASO 1 — Corre TODO este archivo en el SQL Editor de Supabase.
--
--   PASO 2 — Sube las imágenes de firma al bucket "perfiles-firmas":
--            Dashboard → Storage → perfiles-firmas → Upload files
--            Sube: firma_tamara.png, firma_eliana.png, etc.
--            (están actualmente en /public/images/ del proyecto)
--
--   PASO 3 — Obtén la URL pública de cada imagen:
--            Dashboard → Storage → perfiles-firmas → clic en el archivo
--            → copiar "Get URL" (ejemplo abajo)
--            Formato: https://<tu-proyecto>.supabase.co/storage/v1/object/public/perfiles-firmas/firma_tamara.png
--
--   PASO 4 — Descomenta y ejecuta los UPDATE de abajo con las URLs reales.
--
-- ============================================================


-- ============================================================
-- PARTE 1: Columnas en la tabla profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS acronimo   text,
  ADD COLUMN IF NOT EXISTS cargo      text,
  ADD COLUMN IF NOT EXISTS telefono   text,
  ADD COLUMN IF NOT EXISTS firma_url  text;

COMMENT ON COLUMN profiles.acronimo  IS 'Identificador corto para firmas PDF (ej: TTD). Máx 5 chars.';
COMMENT ON COLUMN profiles.cargo     IS 'Cargo o título del usuario (ej: Ejecutiva de Cuentas)';
COMMENT ON COLUMN profiles.telefono  IS 'Teléfono de contacto para cartas PDF y WhatsApp';
COMMENT ON COLUMN profiles.firma_url IS 'URL pública del bucket perfiles-firmas en Supabase Storage';


-- ============================================================
-- PARTE 2: Bucket de Storage "perfiles-firmas"
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'perfiles-firmas',
  'perfiles-firmas',
  true,                                             -- público: la URL funciona sin auth (necesario para PDFs)
  2097152,                                          -- límite: 2 MB por archivo
  ARRAY['image/png', 'image/jpeg', 'image/webp']   -- solo imágenes
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PARTE 3: Políticas RLS del bucket
-- ============================================================

-- Lectura pública (cualquiera puede ver las firmas — necesario para react-pdf)
CREATE POLICY "perfiles-firmas: lectura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'perfiles-firmas');

-- Solo admins pueden subir archivos
CREATE POLICY "perfiles-firmas: solo admin sube"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'perfiles-firmas'
    AND (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Solo admins pueden actualizar (reemplazar) archivos
CREATE POLICY "perfiles-firmas: solo admin actualiza"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'perfiles-firmas'
    AND (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Solo admins pueden eliminar archivos
CREATE POLICY "perfiles-firmas: solo admin elimina"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'perfiles-firmas'
    AND (auth.jwt() ->> 'user_role') = 'admin'
  );


-- ============================================================
-- PARTE 4: Poblar datos de ejecutivos
-- Base URL: https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/
-- ============================================================
-- ✅ = YA EJECUTADO en la BD
-- ⚠️  = firma existe en bucket pero SIN perfil en la BD aún
-- 📝 = teléfonos pendientes de completar (editables desde /profile)
-- ============================================================

-- ✅ Tamara Torrez Dencker
UPDATE profiles SET
  acronimo  = 'TTD',
  cargo     = 'Ejecutiva de Cuentas',
  telefono  = '77342938',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_tamara.png'
WHERE email = 'tamara.torrez@patria-sa.com';

-- ✅ Eliana Ortiz Chávez
UPDATE profiles SET
  acronimo  = 'EOC',
  cargo     = 'Ejecutiva de Cuentas',
  telefono  = '76031710',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_eliana.png'
WHERE email = 'comercial1@patria-sa.com';

-- ✅ Carmen Ferrufino Howard
UPDATE profiles SET
  acronimo  = 'CFH',
  cargo     = 'Ejecutiva de Cuentas Especiales',
  telefono  = '69050289',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_carmen.png'
WHERE email = 'cferrufino@patria-sa.com';

-- ✅ Maria Ercilia Vargas Becerra
UPDATE profiles SET
  acronimo  = 'MEV',
  cargo     = 'Jefe de Producción',
  telefono  = '78006016',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_ercilia.png'
WHERE email = 'maria.vargas@patria-sa.com';

-- ✅ Flavio Colombo Vargas
UPDATE profiles SET
  acronimo  = 'FCV',
  cargo     = 'Gerente Comercial',
  telefono  = '77382254',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_flavio.png'
WHERE email = 'flavio.colombo@patria-sa.com';

-- ✅ Diego Cuenta Maestro (cuenta de sistemas)
UPDATE profiles SET
  acronimo  = 'DGF',
  cargo     = 'Analista de Sistemas',
  telefono  = '69005037',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_diego.png'
WHERE email = 'patriasamaestro@gmail.com';

-- ✅ Mariel Fabiola Ibarra Flores
UPDATE profiles SET
  acronimo  = 'MFI',
  cargo     = 'Ejecutiva de Cuentas',
  telefono  = '77602062',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_fabiola.png'
WHERE email = 'comercial3@patria-sa.com';

-- ✅ Alcides Gutiérrez Rodríguez
UPDATE profiles SET
  acronimo  = 'APM',
  cargo     = 'Asesor Comercial',
  telefono  = '76000610',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_alcides.png'
WHERE email = 'asistente.comercial@patria-sa.com';

-- ✅ Marco Antonio Eid Aramayo
UPDATE profiles SET
  acronimo  = 'MAE',
  cargo     = 'Gerente Regional',
  telefono  = '75672652',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_marco.png'
WHERE email = 'marco.eid@patria-sa.com';

-- ✅ Veronica Martinez Cespedes
UPDATE profiles SET
  acronimo  = 'VMC',
  cargo     = 'Asesor Comercial',
  telefono  = '68563888',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_veronica.png'
WHERE email = 'vmartinez@patria-sa.com';

-- ✅ Roxana Chavez Paz
UPDATE profiles SET
  acronimo  = 'RCP',
  cargo     = 'Directora Comercial',
  telefono  = '78463787',
  firma_url = 'https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_roxana.png'
WHERE email = 'roxana.chavez@patria-sa.com';

-- ============================================================
-- ⚠️  FIRMAS SIN PERFIL — invitar via /auth/invite y luego ejecutar
-- ============================================================

-- Patricia Osuna Banegas — invitar con: patricia.osuna@patria-sa.com
-- UPDATE profiles SET acronimo='POB', cargo='Subgerente Técnico', telefono='77602062',
--   firma_url='https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_patricia.png'
-- WHERE email = 'patricia.osuna@patria-sa.com';

-- Carlos Aguilar Gartner — invitar con: carlos.aguilar@patria-sa.com
-- UPDATE profiles SET acronimo='CAG', cargo='Director Comercial', telefono='72101818',
--   firma_url='https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_carlos.png'
-- WHERE email = 'carlos.aguilar@patria-sa.com';

-- Natalia Mercado Soria Galvarro — sin email propio en el sistema (usaba cuenta ajena)
-- UPDATE profiles SET acronimo='NMS', cargo='Directora Comercial', telefono='70026492',
--   firma_url='https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_natalia.png'
-- WHERE email = 'EMAIL_A_DEFINIR';

-- Mariola Benavent Coock — sin email propio en el sistema
-- UPDATE profiles SET acronimo='MBC', cargo='Directora Comercial', telefono='75544305',
--   firma_url='https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_mariola.png'
-- WHERE email = 'EMAIL_A_DEFINIR';

-- Marcelo Omar Castro Belaunde — sin email propio en el sistema
-- UPDATE profiles SET acronimo='MCB', cargo='Director Comercial', telefono='71389522',
--   firma_url='https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_marcelo.png'
-- WHERE email = 'EMAIL_A_DEFINIR';

-- ⚠️  CONFLICTO: firma_serly.png → Serly Fabiola Sanchez Colón (69189347)
--     El email comercial5@patria-sa.com está asignado a Jhonn Alex Ramirez Mendez.
--     Definir qué email usar para Serly y luego:
-- UPDATE profiles SET acronimo='SFS', cargo='Ejecutiva de Cuentas', telefono='69189347',
--   firma_url='https://pxcbrtyaptgukmoxwwgz.supabase.co/storage/v1/object/public/perfiles-firmas/firma_serly.png'
-- WHERE email = 'EMAIL_A_DEFINIR';
-- ============================================================
