-- ============================================================
-- Migration: Agregar regional_asegurado_id y tiene_maternidad a polizas
-- Fecha: 2026-03-17
-- Descripción:
--   Estos campos se recolectaban en los formularios de Salud, Vida,
--   Accidentes Personales y Sepelio pero NO se persistían en la BD.
--   - regional_asegurado_id: regional donde se ubican los asegurados
--     (diferente de regional_id que es la oficina de la póliza)
--   - tiene_maternidad: exclusivo de Salud, indica cobertura de maternidad
-- ============================================================

-- 1. Agregar columnas a polizas
ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS regional_asegurado_id uuid REFERENCES regionales(id),
ADD COLUMN IF NOT EXISTS tiene_maternidad boolean DEFAULT false;

COMMENT ON COLUMN polizas.regional_asegurado_id IS 'Regional donde se ubican los asegurados (aplica a Salud, Vida, AP, Sepelio)';
COMMENT ON COLUMN polizas.tiene_maternidad IS 'Indica si la póliza de Salud incluye cobertura de maternidad';

-- 2. Agregar las mismas columnas a polizas_anexos (para que los anexos puedan modificarlas)
ALTER TABLE polizas_anexos
ADD COLUMN IF NOT EXISTS regional_asegurado_id uuid REFERENCES regionales(id),
ADD COLUMN IF NOT EXISTS tiene_maternidad boolean;

COMMENT ON COLUMN polizas_anexos.regional_asegurado_id IS 'Regional asegurado modificada por este anexo (NULL = sin cambio)';
COMMENT ON COLUMN polizas_anexos.tiene_maternidad IS 'Maternidad modificada por este anexo (NULL = sin cambio)';
