-- =============================================================================
-- FIX: cuotas huérfanas en 'pendiente' de pólizas ya anuladas
-- =============================================================================
-- Causa: al validar un anexo de anulación, `anularCuotasPorAnulacion` corría
-- con el cliente de sesión del validador. La RLS de polizas_pagos
-- (cobranza_update_pagos) solo permite UPDATE a cobranza/admin, así que cuando
-- validaba un agente/comercial el UPDATE afectaba 0 filas SIN error: la póliza
-- quedaba 'anulada' pero sus cuotas seguían 'pendiente' (y cobrables).
-- El código ya se corrigió para escribir con el cliente admin; esta migración
-- repara los datos históricos. Idempotente.
--
-- Pólizas afectadas al 2026-07-23 (5 pólizas, 20 cuotas):
--   10217242, 10234017, AUT-SCR0690132, 31002139, AUT-SCR0693087
-- =============================================================================

-- 1) Cuotas de la póliza madre sin pago, en pólizas anuladas con anexo de
--    anulación activo. Espeja el filtro de anularCuotasPorAnulacion.
UPDATE polizas_pagos pp
SET estado = 'anulada',
    anulada_por_anexo_id = pa.id
FROM polizas p
JOIN polizas_anexos pa
  ON pa.poliza_id = p.id
 AND pa.tipo_anexo = 'anulacion'
 AND pa.estado = 'activo'
WHERE pp.poliza_id = p.id
  AND p.estado = 'anulada'
  AND pp.estado = 'pendiente'
  AND pp.fecha_pago IS NULL;

-- 2) Cuotas propias de anexos de inclusión activos de esas mismas pólizas.
--    (Al 2026-07-23 no hay filas afectadas; se incluye por completitud.)
UPDATE polizas_anexos_pagos pap
SET estado = 'anulada'
FROM polizas_anexos incl
JOIN polizas p
  ON p.id = incl.poliza_id
 AND p.estado = 'anulada'
WHERE pap.anexo_id = incl.id
  AND incl.tipo_anexo = 'inclusion'
  AND incl.estado = 'activo'
  AND pap.tipo = 'cuota_propia'
  AND pap.estado = 'pendiente';

-- Verificación: ambas consultas deben devolver 0.
-- SELECT count(*) FROM polizas_pagos pp JOIN polizas p ON p.id = pp.poliza_id
--  WHERE p.estado = 'anulada' AND pp.estado = 'pendiente' AND pp.fecha_pago IS NULL;
-- SELECT count(*) FROM polizas_anexos_pagos pap
--   JOIN polizas_anexos incl ON incl.id = pap.anexo_id AND incl.tipo_anexo = 'inclusion' AND incl.estado = 'activo'
--   JOIN polizas p ON p.id = incl.poliza_id AND p.estado = 'anulada'
--  WHERE pap.tipo = 'cuota_propia' AND pap.estado = 'pendiente';
