-- ============================================================================
-- Migración: Unificación de la lógica de anulación de anexos
-- ============================================================================
-- Contexto: los anexos de anulación guardaban la "vigencia corrida" siempre en
-- positivo en un único campo ambiguo, sin distinguir si era un COBRO (saldo a
-- cobrar al cliente, escenario A) o una DEVOLUCIÓN (prima a favor del cliente,
-- escenario B). Además, al validar una anulación la póliza pasaba a 'anulada'
-- pero sus cuotas pendientes seguían en 'pendiente' (engañoso en el detalle y
-- contable).
--
-- Esta migración:
--   1. Agrega `direccion` (cobro|devolucion) a los pagos de anexo. El `monto`
--      se sigue guardando SIEMPRE en positivo (magnitud del endoso); el signo
--      lo deriva el código a partir de la dirección.
--   2. Agrega trazabilidad `anulada_por_anexo_id` a las cuotas de póliza.
--   3. Parcha el helper de `estado_real` para que 'anulada' tenga prioridad
--      sobre 'vencido'/'pendiente' (un pago real sigue ganando como 'pagado').
--
-- El usuario ejecuta esta migración manualmente (Claude solo tiene lectura).
-- ============================================================================

-- 1) Dirección de la vigencia corrida ----------------------------------------
ALTER TABLE public.polizas_anexos_pagos
	ADD COLUMN IF NOT EXISTS direccion text;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'polizas_anexos_pagos_direccion_check'
	) THEN
		ALTER TABLE public.polizas_anexos_pagos
			ADD CONSTRAINT polizas_anexos_pagos_direccion_check
			CHECK (direccion IS NULL OR direccion IN ('cobro', 'devolucion'));
	END IF;
END$$;

COMMENT ON COLUMN public.polizas_anexos_pagos.direccion IS
	'Solo para tipo=vigencia_corrida: cobro (saldo a cobrar al cliente, entra a cobranzas) | devolucion (prima a favor del cliente, informativa, se paga por fuera). El monto se guarda siempre en positivo; el signo lo aplica el código.';

-- Backfill de las anulaciones existentes según su observación: las que hablan
-- de devolución / saldo a favor son DEVOLUCIONES; el resto, COBROS.
UPDATE public.polizas_anexos_pagos
SET direccion = CASE
	WHEN observaciones ILIKE '%devol%'
		OR observaciones ILIKE '%a favor%'
		OR observaciones ILIKE '%saldo a favor%'
	THEN 'devolucion'
	ELSE 'cobro'
END
WHERE tipo = 'vigencia_corrida'
	AND direccion IS NULL;

-- 2) Trazabilidad de cuotas anuladas por un anexo de anulación ----------------
ALTER TABLE public.polizas_pagos
	ADD COLUMN IF NOT EXISTS anulada_por_anexo_id uuid
	REFERENCES public.polizas_anexos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.polizas_pagos.anulada_por_anexo_id IS
	'Anexo de anulación que dejó esta cuota en estado=anulada. Permite restaurarla con precisión si la anulación se revierte.';

-- 3) estado_real debe respetar 'anulada' -------------------------------------
-- Un pago real sigue ganando como 'pagado'; luego 'anulada' tiene prioridad
-- sobre 'parcial'/'vencido'/'pendiente'.
CREATE OR REPLACE FUNCTION public.polizas_pagos_set_estado_real(
	p_fecha_pago date,
	p_estado text,
	p_fecha_vencimiento date
)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
	SELECT CASE
		-- Si tiene fecha de pago, está pagado (prioridad máxima)
		WHEN p_fecha_pago IS NOT NULL THEN 'pagado'
		-- Cuota anulada por un anexo de anulación: terminal, no se cobra
		WHEN p_estado = 'anulada' THEN 'anulada'
		-- Si el estado manual es parcial, mantenerlo
		WHEN p_estado = 'parcial' THEN 'parcial'
		-- Si la fecha de vencimiento ya pasó y no está pagado, está vencido
		WHEN p_fecha_vencimiento < CURRENT_DATE AND p_fecha_pago IS NULL THEN 'vencido'
		-- Caso contrario, está pendiente
		ELSE 'pendiente'
	END;
$function$;

-- Recalcular estado_real de cuotas ya anuladas si las hubiera (idempotente).
UPDATE public.polizas_pagos
SET estado = estado
WHERE estado = 'anulada';
