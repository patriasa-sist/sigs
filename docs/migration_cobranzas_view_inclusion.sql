-- Migration: Actualizar vista cobranzas_polizas_resumen para incluir cuotas propias de anexos de inclusión
-- Propósito: Las cuotas (tipo='cuota_propia') de anexos de inclusión activos
--            deben sumarse a los totales de cobranzas junto con las cuotas originales de la póliza.
-- Ejecutar manualmente en Supabase SQL Editor.

CREATE OR REPLACE VIEW cobranzas_polizas_resumen AS
WITH cuota_estados AS (

  -- Cuotas originales de la póliza madre
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

  UNION ALL

  -- Cuotas propias de anexos de inclusión activos (independientes de la póliza madre)
  SELECT
    pa.poliza_id,
    pap.monto,
    pap.fecha_vencimiento,
    CASE
      WHEN pap.estado = 'pagado'                               THEN 'pagado'
      WHEN pap.fecha_vencimiento < CURRENT_DATE                THEN 'vencido'
      ELSE 'pendiente'
    END AS estado_efectivo
  FROM polizas_anexos_pagos pap
  INNER JOIN polizas_anexos pa ON pa.id = pap.anexo_id
  INNER JOIN polizas p ON p.id = pa.poliza_id
  WHERE pap.tipo = 'cuota_propia'
    AND pa.estado  = 'activo'
    AND p.estado   = 'activa'

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

  -- Monto total cobrado (incluye cuotas propias de inclusiones pagadas)
  COALESCE(SUM(ce.monto) FILTER (WHERE ce.estado_efectivo = 'pagado'), 0)
    AS total_pagado,

  -- Próxima fecha de vencimiento (la más cercana entre cuotas originales y de inclusión)
  MIN(ce.fecha_vencimiento) FILTER (WHERE ce.estado_efectivo IN ('pendiente', 'parcial'))
    AS proxima_fecha_vencimiento

FROM polizas p
LEFT JOIN cuota_estados ce ON ce.poliza_id = p.id
WHERE p.estado = 'activa'
GROUP BY p.id;

COMMENT ON VIEW cobranzas_polizas_resumen IS
  'Resumen de cuotas por póliza activa. Incluye cuotas originales (polizas_pagos) '
  'y cuotas propias de anexos de inclusión activos (polizas_anexos_pagos tipo=cuota_propia). '
  'Replica la lógica estadoEfectivo() de JS. '
  'Usada por el módulo de Cobranzas para filtrado/orden/paginación server-side.';
