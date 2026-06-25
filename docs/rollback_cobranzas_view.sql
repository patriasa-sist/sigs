-- ============================================================================
-- ROLLBACK de la vista cobranzas_polizas_resumen a su versión PREVIA (sin
-- descuentos de exclusión). Úsalo si querés revertir solo el efecto de la vista.
-- La columna cuota_anexo_pago_id y el CHECK son aditivos e inofensivos: pueden
-- quedarse aunque revires la vista.
-- ============================================================================
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
), cuota_estados AS (
	SELECT pp.poliza_id,
		pp.monto,
		COALESCE(ap.abonado, 0::numeric) AS abonado,
		pp.fecha_vencimiento,
			CASE
				WHEN pp.estado_real IS NOT NULL AND pp.estado_real <> ''::text THEN pp.estado_real
				WHEN pp.fecha_pago IS NOT NULL THEN 'pagado'::text
				WHEN pp.estado = 'parcial'::text THEN 'parcial'::text
				WHEN pp.fecha_vencimiento < CURRENT_DATE THEN 'vencido'::text
				ELSE 'pendiente'::text
			END AS estado_efectivo
	FROM polizas_pagos pp
		JOIN polizas p_1 ON p_1.id = pp.poliza_id
		LEFT JOIN abonos_por_pago ap ON ap.pago_id = pp.id
	WHERE p_1.estado = 'activa'::text
	UNION ALL
	SELECT pa.poliza_id,
		pap.monto,
		COALESCE(aa.abonado, 0::numeric) AS abonado,
		pap.fecha_vencimiento,
			CASE
				WHEN pap.estado = 'pagado'::text THEN 'pagado'::text
				WHEN pap.estado = 'parcial'::text THEN 'parcial'::text
				WHEN pap.fecha_vencimiento < CURRENT_DATE THEN 'vencido'::text
				ELSE 'pendiente'::text
			END AS estado_efectivo
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
		JOIN polizas p_1 ON p_1.id = pa.poliza_id
		LEFT JOIN abonos_por_anexo aa ON aa.anexo_pago_id = pap.id
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
	COALESCE(sum(ce.monto - ce.abonado) FILTER (WHERE ce.estado_efectivo <> 'pagado'::text), 0::numeric) AS total_pendiente,
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
