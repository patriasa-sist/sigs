-- ============================================
-- MIGRATION: Beneficiarios para Vida y Accidentes Personales
-- ============================================
-- Ejecutar manualmente en Supabase SQL Editor
--
-- Cambios:
-- 1. Agrega columna 'rol' a polizas_asegurados_nivel (contratante/titular)
-- 2. Crea tabla polizas_beneficiarios (genérica para Vida, AP, Sepelio)
--    Estructura espejo de polizas_salud_beneficiarios pero con nivel_id UUID
--    referenciando polizas_niveles en vez de polizas_salud_niveles
-- ============================================

-- ============================================
-- 1. AGREGAR COLUMNA ROL A POLIZAS_ASEGURADOS_NIVEL
-- ============================================

ALTER TABLE polizas_asegurados_nivel
ADD COLUMN IF NOT EXISTS rol TEXT;

COMMENT ON COLUMN polizas_asegurados_nivel.rol IS 'Rol del asegurado: contratante o titular (usado en Vida y Accidentes Personales)';

-- ============================================
-- 2. CREAR TABLA POLIZAS_BENEFICIARIOS
-- ============================================
-- Tabla genérica para beneficiarios (dependientes/cónyuges)
-- de pólizas de Vida, Accidentes Personales y Sepelio.
-- Diferente de polizas_salud_beneficiarios porque:
--   - nivel_id es UUID (referencia polizas_niveles.id)
--   - polizas_salud_beneficiarios tiene nivel_id TEXT (referencia polizas_salud_niveles)

CREATE TABLE IF NOT EXISTS polizas_beneficiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE RESTRICT,
  nombre_completo TEXT NOT NULL,
  carnet TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  genero TEXT NOT NULL CHECK (genero IN ('M', 'F', 'Otro')),
  nivel_id UUID NOT NULL REFERENCES polizas_niveles(id) ON DELETE CASCADE,
  rol TEXT NOT NULL CHECK (rol IN ('dependiente', 'conyugue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_polizas_beneficiarios_poliza_id
  ON polizas_beneficiarios(poliza_id);

CREATE INDEX IF NOT EXISTS idx_polizas_beneficiarios_nivel_id
  ON polizas_beneficiarios(nivel_id);

-- RLS
ALTER TABLE polizas_beneficiarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver beneficiarios"
  ON polizas_beneficiarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar beneficiarios"
  ON polizas_beneficiarios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar beneficiarios"
  ON polizas_beneficiarios FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar beneficiarios"
  ON polizas_beneficiarios FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE polizas_beneficiarios IS 'Beneficiarios (dependientes/cónyuges) para pólizas de Vida, Accidentes Personales y Sepelio. Para Salud usar polizas_salud_beneficiarios.';
