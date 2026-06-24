-- ============================================================================
-- Backfill: cuotas de pólizas ANULADAS antes de la lógica de anulación unificada
-- ============================================================================
-- Las pólizas que se anularon antes de Fases 1/2 quedaron 'anulada' pero sus
-- cuotas siguen en 'pendiente' (la anulación de cuotas no existía aún). Con la
-- Fase 2 esas pólizas vuelven a aparecer en cobranzas por su vigencia corrida;
-- si sus cuotas viejas siguen 'pendiente' se cobrarían por duplicado.
--
-- Este script reproduce exactamente lo que hoy hace `anularCuotasPorAnulacion`
-- al validar una anulación: marca como 'anulada' las cuotas NO pagadas de la
-- póliza madre (estampando el anexo) y las cuotas propias de inclusiones
-- activas. Las cuotas pagadas/parciales NO se tocan. Idempotente.
--
-- Ejecutar UNA vez, después de `migration_anulacion_unificada.sql`.
-- ============================================================================

-- 0) Permitir el estado 'anulada' en el dominio de ambas tablas. El CHECK
--    original no lo incluía; sin esto fallan tanto el backfill de abajo como la
--    validación de cualquier anulación nueva en runtime (anularCuotasPorAnulacion).
ALTER TABLE public.polizas_pagos DROP CONSTRAINT IF EXISTS polizas_pagos_estado_check;
ALTER TABLE public.polizas_pagos
	ADD CONSTRAINT polizas_pagos_estado_check
	CHECK (estado = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'vencido'::text, 'parcial'::text, 'anulada'::text]));

ALTER TABLE public.polizas_anexos_pagos DROP CONSTRAINT IF EXISTS polizas_anexos_pagos_estado_check;
ALTER TABLE public.polizas_anexos_pagos
	ADD CONSTRAINT polizas_anexos_pagos_estado_check
	CHECK (estado = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'vencido'::text, 'parcial'::text, 'anulada'::text]));

-- 1) Cuotas de la póliza madre (pendiente, sin pago) → anulada + anexo de anulación
UPDATE public.polizas_pagos pp
SET estado = 'anulada',
	anulada_por_anexo_id = anx.id
FROM public.polizas p
JOIN public.polizas_anexos anx
	ON anx.poliza_id = p.id
	AND anx.tipo_anexo = 'anulacion'
	AND anx.estado = 'activo'
WHERE pp.poliza_id = p.id
	AND p.estado = 'anulada'
	AND pp.estado = 'pendiente'
	AND pp.fecha_pago IS NULL;

-- 2) Cuotas propias de inclusiones activas de esas pólizas anuladas → anulada
UPDATE public.polizas_anexos_pagos pap
SET estado = 'anulada'
FROM public.polizas_anexos inc
JOIN public.polizas p ON p.id = inc.poliza_id
WHERE pap.anexo_id = inc.id
	AND inc.tipo_anexo = 'inclusion'
	AND inc.estado = 'activo'
	AND p.estado = 'anulada'
	AND pap.tipo = 'cuota_propia'
	AND pap.estado = 'pendiente';

-- Verificación (debería mostrar las cuotas ahora en 'anulada'):
-- SELECT p.numero_poliza, pp.estado, count(*)
-- FROM polizas p JOIN polizas_pagos pp ON pp.poliza_id = p.id
-- WHERE p.estado = 'anulada' GROUP BY p.numero_poliza, pp.estado ORDER BY 1,2;
