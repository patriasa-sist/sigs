-- ============================================================================
-- Migración: tipo_prima + es_retroactiva en polizas
-- ----------------------------------------------------------------------------
-- Objetivo:
--   1) Habilitar carga RETROACTIVA de pólizas históricas (trazabilidad de
--      siniestros) sin generar cobranza nueva.
--   2) Habilitar pólizas "madre" SIN PRIMA PROPIA (transporte open-cover /
--      flotante, AP de grupo) cuya prima real se devenga por anexos de
--      inclusión (declaraciones).
--
-- Notas:
--   - NO se relaja ningún constraint existente. polizas.prima_total ya es
--     NOT NULL sin CHECK > 0, así que prima 0 ya es válida en BD. La cantidad
--     mínima de cuotas se controla solo en la aplicación.
--   - modalidad_pago mantiene su CHECK in ('contado','credito'); las pólizas
--     sin prima propia se persisten con modalidad_pago = 'contado' (valor
--     neutro) y prima_total = 0, sin filas en polizas_pagos.
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================================

-- Discriminador de prima a nivel de póliza
ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS tipo_prima text NOT NULL DEFAULT 'directa';

ALTER TABLE polizas
  DROP CONSTRAINT IF EXISTS polizas_tipo_prima_check;

ALTER TABLE polizas
  ADD CONSTRAINT polizas_tipo_prima_check
  CHECK (tipo_prima = ANY (ARRAY['directa'::text, 'sin_prima_propia'::text]));

-- Bandera de carga histórica (espejo de clients.carga_retroactiva, a nivel póliza)
ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS es_retroactiva boolean NOT NULL DEFAULT false;

-- Índice parcial: la mayoría de pólizas NO son retroactivas
CREATE INDEX IF NOT EXISTS idx_polizas_es_retroactiva
  ON polizas (es_retroactiva) WHERE es_retroactiva;

COMMENT ON COLUMN polizas.tipo_prima IS
  'directa: comportamiento normal (contado/credito con cuotas propias). sin_prima_propia: poliza madre (open-cover/flotante/AP) sin prima ni cuotas propias; la prima llega por anexos de inclusion.';

COMMENT ON COLUMN polizas.es_retroactiva IS
  'true si la poliza fue cargada retroactivamente (historica) para trazabilidad de siniestros. Reportes/auditoria pueden excluirla.';
