-- Migration: Vista cobranzas_polizas_resumen
-- Propósito: pre-computar resúmenes de cuotas por póliza activa para
--            habilitar filtrado/ordenamiento/paginación server-side en el
--            módulo de Cobranzas.
-- Ejecutar manualmente en Supabase SQL Editor.

-- ──────────────────────────────────────────────
-- Vista principal
-- ──────────────────────────────────────────────
CREATE OR REPLACE VIEW cobranzas_polizas_resumen AS
WITH cuota_estados AS (
  SELECT
    pp.poliza_id,
    pp.monto,
    pp.fecha_vencimiento,
    CASE
      WHEN pp.estado_real IS NOT NULL AND pp.estado_real <> '' THEN pp.estado_real
      WHEN pp.fecha_pago   IS NOT NULL                         THEN 'pagado'
      WHEN pp.estado = 'parcial'                               THEN 'parcial'
      WHEN pp.fecha_vencimiento < CURRENT_DATE                 THEN 'vencido'
      ELSE 'pendiente'
    END AS estado_efectivo
  FROM polizas_pagos pp
  INNER JOIN polizas p ON p.id = pp.poliza_id
  WHERE p.estado = 'activa'
)
SELECT
  p.id,
  p.numero_poliza,
  p.ramo,
  p.prima_total,
  p.moneda,
  p.estado,
  p.inicio_vigencia,
  p.fin_vigencia,
  p.modalidad_pago,
  p.client_id,
  p.compania_aseguradora_id,
  p.responsable_id,
  p.regional_id,

  -- Cuotas vencidas (estado_efectivo = 'vencido')
  COALESCE(COUNT(ce.poliza_id) FILTER (WHERE ce.estado_efectivo = 'vencido'), 0)::int
    AS cuotas_vencidas,

  -- Cuotas pendientes o parciales (no pagadas, no vencidas)
  COALESCE(COUNT(ce.poliza_id) FILTER (WHERE ce.estado_efectivo IN ('pendiente', 'parcial')), 0)::int
    AS cuotas_pendientes,

  -- Monto total no pagado (pendiente + parcial + vencido)
  COALESCE(SUM(ce.monto) FILTER (WHERE ce.estado_efectivo <> 'pagado'), 0)
    AS total_pendiente,

  -- Monto total cobrado
  COALESCE(SUM(ce.monto) FILTER (WHERE ce.estado_efectivo = 'pagado'), 0)
    AS total_pagado,

  -- Próxima fecha de vencimiento (de cuotas pendientes/parciales solamente)
  MIN(ce.fecha_vencimiento) FILTER (WHERE ce.estado_efectivo IN ('pendiente', 'parcial'))
    AS proxima_fecha_vencimiento

FROM polizas p
LEFT JOIN cuota_estados ce ON ce.poliza_id = p.id
WHERE p.estado = 'activa'
GROUP BY p.id;

-- Comentario de documentación
COMMENT ON VIEW cobranzas_polizas_resumen IS
  'Resumen de cuotas por póliza activa. Replica la lógica estadoEfectivo() de JS. '
  'Usada por el módulo de Cobranzas para filtrado/orden/paginación server-side.';
