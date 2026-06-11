-- ============================================================================
-- Siniestros de Salud: registro sin lugar/monto/moneda + cierre con montos
-- opcionales (cambios 2 y 3). Ejecutar manualmente en Supabase.
-- ============================================================================

BEGIN;

-- ── Cambio 3 ───────────────────────────────────────────────────────────────
-- En ramo Salud no aplican "lugar del hecho", "monto de reserva" ni "moneda".
-- Se permiten NULL en esas columnas (el resto de ramos los sigue exigiendo
-- desde la UI/validación).
ALTER TABLE siniestros ALTER COLUMN lugar_hecho DROP NOT NULL;
ALTER TABLE siniestros ALTER COLUMN monto_reserva DROP NOT NULL;
ALTER TABLE siniestros ALTER COLUMN moneda DROP NOT NULL;

-- monto_reserva sigue debiendo ser positivo cuando se informe.
ALTER TABLE siniestros DROP CONSTRAINT IF EXISTS monto_reserva_positivo;
ALTER TABLE siniestros ADD CONSTRAINT monto_reserva_positivo
	CHECK (monto_reserva IS NULL OR monto_reserva > 0);

-- ── Cambio 2 ───────────────────────────────────────────────────────────────
-- El cierre de Salud concluye el siniestro (estado 'concluido') sin exigir
-- montos. Se relaja la regla que obligaba monto_reclamado y monto_pagado para
-- estado 'concluido'. La UI valida los montos por tipo de cierre:
--   - Indemnización (resto de ramos): montos obligatorios (validación cliente).
--   - Cierre Salud: montos opcionales.
ALTER TABLE siniestros DROP CONSTRAINT IF EXISTS montos_indemnizacion_validos;

COMMIT;
