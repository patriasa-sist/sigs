-- ============================================================================
-- VERIFICACIÓN — Exclusión multi-cuota (B1). SOLO SELECTs (no modifica nada).
--
-- ORDEN DE USO (NO corras el archivo entero de una):
--   * PARTE A [ANTES]   -> corré la sección 1 ANTES de migrar.
--   * PARTE B [DESPUÉS] -> secciones 2 a 5: corrélas SOLO DESPUÉS de aplicar
--     migration_exclusion_multi_cuota.sql. Antes de eso dan
--     "column cuota_anexo_pago_id does not exist" (es esperado: la columna
--     todavía no existe).
-- ============================================================================


-- ############################################################################
-- PARTE A — [ANTES DE MIGRAR]
-- ############################################################################

-- ----------------------------------------------------------------------------
-- [ANTES] 1. Universo de exclusiones ACTIVAS y su impacto esperado por cuota.
-- Hoy estas exclusiones NO se descuentan en cobranzas; tras migrar la vista y
-- desplegar el código, SÍ. Revisá que el efecto sea el deseado en cada póliza.
-- 'SALDADA' = la cuota queda en 0 (no se cobra). 'no-op (ya pagada)' = el dinero
-- ya entró: el descuento no se devuelve, la cuota sigue pagada.
-- ----------------------------------------------------------------------------
WITH abonos AS (
	SELECT pago_id, sum(monto) ab FROM polizas_pagos_abonos WHERE pago_id IS NOT NULL GROUP BY pago_id
),
aju AS (
	SELECT pap.cuota_original_id, sum(-pap.monto) desc_excl
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
	WHERE pap.tipo = 'ajuste' AND pap.monto < 0 AND pap.cuota_original_id IS NOT NULL AND pa.estado = 'activo'
	GROUP BY pap.cuota_original_id
)
SELECT p.numero_poliza, pp.numero_cuota,
	pp.monto::numeric(12, 2) AS monto_cuota,
	COALESCE(a.ab, 0)::numeric(12, 2) AS abonado,
	j.desc_excl::numeric(12, 2) AS descuento_exclusion,
	GREATEST(pp.monto - COALESCE(a.ab, 0) - j.desc_excl, 0)::numeric(12, 2) AS saldo_despues,
	CASE
		WHEN pp.estado = 'pagado' OR pp.fecha_pago IS NOT NULL THEN 'no-op (ya pagada)'
		WHEN COALESCE(a.ab, 0) + j.desc_excl >= pp.monto - 0.01 THEN 'SALDADA'
		ELSE 'parcial'
	END AS efecto,
	pp.estado
FROM aju j
	JOIN polizas_pagos pp ON pp.id = j.cuota_original_id
	JOIN polizas p ON p.id = pp.poliza_id
	LEFT JOIN abonos a ON a.pago_id = pp.id
ORDER BY p.numero_poliza, pp.numero_cuota;

-- ############################################################################
-- PARTE B — [DESPUÉS DE MIGRAR]  (todo lo de abajo necesita la columna nueva)
-- ############################################################################

-- ----------------------------------------------------------------------------
-- 2. Chequeos estructurales de migration_exclusion_multi_cuota.sql.
-- ----------------------------------------------------------------------------

-- 2a. La columna nueva existe (espera 1 fila).
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'polizas_anexos_pagos' AND column_name = 'cuota_anexo_pago_id';

-- 2b. El CHECK existe (espera 1 fila).
SELECT conname FROM pg_constraint
WHERE conname = 'polizas_anexos_pagos_ajuste_target_check';

-- 2c. Ningún ajuste viola "exactamente un objetivo" (espera 0 filas).
SELECT id, anexo_id, monto, cuota_original_id, cuota_anexo_pago_id
FROM polizas_anexos_pagos
WHERE tipo = 'ajuste' AND num_nonnulls(cuota_original_id, cuota_anexo_pago_id) <> 1;

-- ----------------------------------------------------------------------------
-- 3. Integridad: ningún descuento de exclusión activo excede el saldo
-- cobrable de su cuota (madre o de inclusión). Espera 0 filas.
--
-- IMPORTANTE: se EXCLUYEN las cuotas ya pagadas (estado='pagado' / con fecha de
-- pago), porque ahí el descuento es un no-op intencional (el dinero ya entró, no
-- se devuelve) y NO es un problema. La cuota legacy d322b0a7 (póliza 10221841)
-- aparecerá hasta que corras su migración (migration_fix_poliza_legacy_*),
-- que la elimina; eso es esperado.
-- ----------------------------------------------------------------------------
WITH abonos_pago AS (
	SELECT pago_id, sum(monto) ab FROM polizas_pagos_abonos WHERE pago_id IS NOT NULL GROUP BY pago_id
),
abonos_anexo AS (
	SELECT anexo_pago_id, sum(monto) ab FROM polizas_pagos_abonos WHERE anexo_pago_id IS NOT NULL GROUP BY anexo_pago_id
),
desc_madre AS (
	SELECT cuota_original_id cid, sum(-monto) d FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
	WHERE pap.tipo = 'ajuste' AND pap.monto < 0 AND pap.cuota_original_id IS NOT NULL AND pa.estado = 'activo'
	GROUP BY cuota_original_id
),
desc_incl AS (
	SELECT cuota_anexo_pago_id cid, sum(-monto) d FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
	WHERE pap.tipo = 'ajuste' AND pap.monto < 0 AND pap.cuota_anexo_pago_id IS NOT NULL AND pa.estado = 'activo'
	GROUP BY cuota_anexo_pago_id
)
SELECT 'madre' AS origen, pp.id cuota_id, pp.monto, COALESCE(ab.ab, 0) abonado, dm.d descuento
FROM desc_madre dm
	JOIN polizas_pagos pp ON pp.id = dm.cid
	LEFT JOIN abonos_pago ab ON ab.pago_id = pp.id
WHERE pp.estado <> 'pagado' AND pp.fecha_pago IS NULL -- excluir pagadas (descuento no-op)
	AND dm.d > pp.monto - COALESCE(ab.ab, 0) + 0.01
UNION ALL
SELECT 'inclusion' AS origen, cp.id, cp.monto, COALESCE(ab.ab, 0), di.d
FROM desc_incl di
	JOIN polizas_anexos_pagos cp ON cp.id = di.cid
	LEFT JOIN abonos_anexo ab ON ab.anexo_pago_id = cp.id
WHERE cp.estado <> 'pagado' AND cp.fecha_pago IS NULL -- excluir pagadas (descuento no-op)
	AND di.d > cp.monto - COALESCE(ab.ab, 0) + 0.01;

-- ----------------------------------------------------------------------------
-- [DESPUÉS legacy] 4. Estructura final de la póliza legacy 10221841.
-- Espera: 2 cuota_propia (4780 y 500), 1 ajuste -1981.07 con cuota_anexo_pago_id
-- apuntando a la cuota_propia de 4780, 0 cuotas madre, fechas 2026-03-03.
-- ----------------------------------------------------------------------------
SELECT pa.tipo_anexo, pa.numero_anexo, pap.tipo, pap.monto,
	pap.cuota_original_id, pap.cuota_anexo_pago_id, pap.fecha_vencimiento
FROM polizas_anexos_pagos pap
	JOIN polizas_anexos pa ON pa.id = pap.anexo_id
WHERE pa.poliza_id = 'b41b7ae9-97ab-437f-bc32-0ee2d73a6e5c'
ORDER BY pa.numero_anexo;

SELECT count(*) AS cuotas_madre_restantes
FROM polizas_pagos WHERE poliza_id = 'b41b7ae9-97ab-437f-bc32-0ee2d73a6e5c';

-- ----------------------------------------------------------------------------
-- [DESPUÉS] 5. Totales de cobranza (vista) de las pólizas con exclusión activa.
-- Comparar el total_pendiente contra lo esperado de la sección 1.
-- ----------------------------------------------------------------------------
SELECT numero_poliza, cuotas_pendientes, cuotas_vencidas, total_pendiente, total_pagado
FROM cobranzas_polizas_resumen
WHERE numero_poliza IN (
	'10221841', ' AUT-SCR0700867', 'AUSB-SC2-000502-01-2026',
	'POL-SCEB-SC-500986-2026-01', 'RCX-SCR0680803'
)
ORDER BY numero_poliza;
