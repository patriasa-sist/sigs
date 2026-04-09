-- ============================================
-- Migration: porcentaje_comision en directores_cartera
-- Ejecutar manualmente en Supabase SQL Editor
-- ============================================

ALTER TABLE directores_cartera
ADD COLUMN IF NOT EXISTS porcentaje_comision numeric(5,2) DEFAULT 0
  CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100);

COMMENT ON COLUMN directores_cartera.porcentaje_comision IS
  'Porcentaje de comisión que percibe el director sobre las cuotas pagadas (0-100)';
