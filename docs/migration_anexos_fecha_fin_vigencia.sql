-- =============================================================================
-- Vigencia de anexos: fecha de fin (issue #28)
-- =============================================================================
-- La "Fecha Efectiva" del anexo pasa a llamarse "Fecha de Inicio" (misma columna
-- fecha_efectiva, solo cambia el label) y se agrega la fecha de FIN de vigencia,
-- que por defecto copia el fin de la póliza madre pero es editable.
--
-- IMPORTANTE: ejecutar ANTES de desplegar v1.6.39 (el insert/update de anexos
-- ya escribe esta columna).
-- =============================================================================

-- 1) Columna nueva
ALTER TABLE polizas_anexos ADD COLUMN IF NOT EXISTS fecha_fin_vigencia date;

-- 2) Backfill: anexos existentes toman el fin de vigencia de su póliza madre
UPDATE polizas_anexos a
SET fecha_fin_vigencia = p.fin_vigencia
FROM polizas p
WHERE p.id = a.poliza_id
  AND a.fecha_fin_vigencia IS NULL;

-- 3) Verificación
SELECT count(*) AS total_anexos,
       count(*) FILTER (WHERE fecha_fin_vigencia IS NULL) AS sin_fecha_fin
FROM polizas_anexos;
