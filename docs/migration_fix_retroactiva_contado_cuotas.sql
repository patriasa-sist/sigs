-- Fix: pólizas retroactivas al contado dejaban una cuota PENDIENTE en cobranza.
--
-- Por diseño, en una carga retroactiva las cuotas ya cobradas antes de cargar la
-- póliza NO se registran (solo se conserva la prima total para trazabilidad). El
-- flujo de crédito ya lo respetaba, pero el de CONTADO insertaba siempre la cuota
-- única como 'pendiente'. Ahora el código (nueva/editar actions) omite esa cuota.
--
-- Esta migración limpia las cuotas pendientes ya creadas por el bug. Solo elimina
-- cuotas SIN abonos parciales (no debería haber, pero se protege el dato de cobranza).
-- Las cuotas ya 'pagado' se preservan intactas.

DELETE FROM polizas_pagos pp
USING polizas p
WHERE pp.poliza_id = p.id
  AND p.es_retroactiva = true
  AND p.modalidad_pago = 'contado'
  AND pp.estado <> 'pagado'
  AND NOT EXISTS (
    SELECT 1 FROM polizas_pagos_abonos a WHERE a.pago_id = pp.id
  );
