-- ============================================================================
-- Exclusión multi-cuota (B1): la exclusión puede descontar cuotas de la póliza
-- madre Y cuotas propias de anexos de inclusión, repartiendo un monto sobre
-- ellas. El descuento NUNCA devuelve dinero: solo rebaja el saldo cobrable de
-- cuotas no pagadas; si una cuota llega a 0 queda "saldada" (no cobrable) sin
-- contar como dinero recibido.
--
-- IMPORTANTE: ejecutar manualmente. Claude solo tiene lectura en la BD.
-- ============================================================================

-- 1. Nueva columna para que un ajuste de exclusión apunte a una cuota propia de
--    inclusión (vive en la misma tabla polizas_anexos_pagos). El ajuste usa
--    EXACTAMENTE uno de:
--      - cuota_original_id     -> polizas_pagos(id)          (cuota madre)
--      - cuota_anexo_pago_id   -> polizas_anexos_pagos(id)   (cuota de inclusión)
ALTER TABLE public.polizas_anexos_pagos
	ADD COLUMN IF NOT EXISTS cuota_anexo_pago_id uuid
	REFERENCES public.polizas_anexos_pagos (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_polizas_anexos_pagos_cuota_anexo_pago_id
	ON public.polizas_anexos_pagos (cuota_anexo_pago_id)
	WHERE cuota_anexo_pago_id IS NOT NULL;

-- 2. Un ajuste debe colgar de exactamente una cuota (madre o de inclusión).
--    Los demás tipos (cuota_propia, vigencia_corrida) no apuntan a ninguna.
ALTER TABLE public.polizas_anexos_pagos
	DROP CONSTRAINT IF EXISTS polizas_anexos_pagos_ajuste_target_check;

ALTER TABLE public.polizas_anexos_pagos
	ADD CONSTRAINT polizas_anexos_pagos_ajuste_target_check
	CHECK (
		tipo <> 'ajuste'
		OR num_nonnulls(cuota_original_id, cuota_anexo_pago_id) = 1
	);

-- 3. Vista de cobranzas: restar los descuentos de exclusión activos del saldo
--    pendiente, tanto de cuotas madre como de cuotas de inclusión, y NO contar
--    como pagado lo saldado por exclusión.
CREATE OR REPLACE VIEW public.cobranzas_polizas_resumen AS
WITH abonos_por_pago AS (
	SELECT polizas_pagos_abonos.pago_id,
		sum(polizas_pagos_abonos.monto) AS abonado
	FROM polizas_pagos_abonos
	WHERE polizas_pagos_abonos.pago_id IS NOT NULL
	GROUP BY polizas_pagos_abonos.pago_id
), abonos_por_anexo AS (
	SELECT polizas_pagos_abonos.anexo_pago_id,
		sum(polizas_pagos_abonos.monto) AS abonado
	FROM polizas_pagos_abonos
	WHERE polizas_pagos_abonos.anexo_pago_id IS NOT NULL
	GROUP BY polizas_pagos_abonos.anexo_pago_id
), descuento_por_pago AS (
	-- Descuentos de exclusión sobre cuotas madre (monto guardado en negativo).
	-- Solo ajustes negativos: ignora el parche legacy de inclusiones positivas.
	SELECT pap.cuota_original_id AS cuota_id,
		sum(- pap.monto) AS descuento
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
	WHERE pap.tipo = 'ajuste'
		AND pap.monto < 0
		AND pap.cuota_original_id IS NOT NULL
		AND pa.estado = 'activo'
	GROUP BY pap.cuota_original_id
), descuento_por_anexo AS (
	-- Descuentos de exclusión sobre cuotas de inclusión.
	SELECT pap.cuota_anexo_pago_id AS cuota_id,
		sum(- pap.monto) AS descuento
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
	WHERE pap.tipo = 'ajuste'
		AND pap.monto < 0
		AND pap.cuota_anexo_pago_id IS NOT NULL
		AND pa.estado = 'activo'
	GROUP BY pap.cuota_anexo_pago_id
), cuota_estados AS (
	SELECT pp.poliza_id,
		pp.monto,
		COALESCE(ap.abonado, 0::numeric) AS abonado,
		COALESCE(dp.descuento, 0::numeric) AS descuento,
		pp.fecha_vencimiento,
			CASE
				WHEN pp.fecha_pago IS NOT NULL THEN 'pagado'::text
				WHEN pp.estado_real = 'pagado'::text THEN 'pagado'::text
				WHEN (COALESCE(ap.abonado, 0::numeric) + COALESCE(dp.descuento, 0::numeric)) >= (pp.monto - 0.01) THEN 'saldado'::text
				WHEN pp.estado_real IS NOT NULL AND pp.estado_real <> ''::text THEN pp.estado_real
				WHEN pp.estado = 'parcial'::text THEN 'parcial'::text
				WHEN pp.fecha_vencimiento < CURRENT_DATE THEN 'vencido'::text
				ELSE 'pendiente'::text
			END AS estado_efectivo
	FROM polizas_pagos pp
		JOIN polizas p_1 ON p_1.id = pp.poliza_id
		LEFT JOIN abonos_por_pago ap ON ap.pago_id = pp.id
		LEFT JOIN descuento_por_pago dp ON dp.cuota_id = pp.id
	WHERE p_1.estado = 'activa'::text
	UNION ALL
	SELECT pa.poliza_id,
		pap.monto,
		COALESCE(aa.abonado, 0::numeric) AS abonado,
		COALESCE(da.descuento, 0::numeric) AS descuento,
		pap.fecha_vencimiento,
			CASE
				WHEN pap.estado = 'pagado'::text THEN 'pagado'::text
				WHEN (COALESCE(aa.abonado, 0::numeric) + COALESCE(da.descuento, 0::numeric)) >= (pap.monto - 0.01) THEN 'saldado'::text
				WHEN pap.estado = 'parcial'::text THEN 'parcial'::text
				WHEN pap.fecha_vencimiento < CURRENT_DATE THEN 'vencido'::text
				ELSE 'pendiente'::text
			END AS estado_efectivo
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
		JOIN polizas p_1 ON p_1.id = pa.poliza_id
		LEFT JOIN abonos_por_anexo aa ON aa.anexo_pago_id = pap.id
		LEFT JOIN descuento_por_anexo da ON da.cuota_id = pap.id
	WHERE pap.tipo = 'cuota_propia'::text AND pa.estado = 'activo'::text AND p_1.estado = 'activa'::text
)
SELECT p.id,
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
	COALESCE(count(ce.poliza_id) FILTER (WHERE ce.estado_efectivo = 'vencido'::text), 0::bigint)::integer AS cuotas_vencidas,
	COALESCE(count(ce.poliza_id) FILTER (WHERE ce.estado_efectivo = ANY (ARRAY['pendiente'::text, 'parcial'::text])), 0::bigint)::integer AS cuotas_pendientes,
	COALESCE(sum(GREATEST(ce.monto - ce.abonado - ce.descuento, 0::numeric)) FILTER (WHERE ce.estado_efectivo <> ALL (ARRAY['pagado'::text, 'saldado'::text])), 0::numeric) AS total_pendiente,
	COALESCE(sum(
		CASE
			WHEN ce.estado_efectivo = 'pagado'::text THEN ce.monto
			ELSE ce.abonado
		END), 0::numeric) AS total_pagado,
	min(ce.fecha_vencimiento) FILTER (WHERE ce.estado_efectivo = ANY (ARRAY['pendiente'::text, 'parcial'::text])) AS proxima_fecha_vencimiento
FROM polizas p
	LEFT JOIN cuota_estados ce ON ce.poliza_id = p.id
WHERE p.estado = 'activa'::text
GROUP BY p.id;
