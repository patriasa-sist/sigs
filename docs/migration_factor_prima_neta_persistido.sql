-- Migración: persistir el factor de prima neta y el % de comisión usados
-- ============================================================================
-- Motivo: el factor del producto (numeric(12,6)) puede cambiar con el tiempo,
-- y esos decimales son financieramente materiales. La prima neta se congela a
-- 2 decimales, así que reconstruir el factor desde ella es LOSSY. Para que el
-- reporte y el detalle muestren el factor EXACTO que se usó al calcular, se
-- guarda explícitamente en la póliza y en el anexo al momento de guardar.
--
--   factor_prima_neta:   factor usado, mismo formato que productos.factor_*
--                        (porcentaje, p.ej. 40.500000). NULL = sin prima propia.
--   porcentaje_comision: % de comisión como FRACCIÓN, mismo formato que
--                        productos.porcentaje_comision (p.ej. 0.218000).
--
-- El código nuevo llena estas columnas en create/edit de póliza y anexo. Este
-- script agrega las columnas y hace un BACKFILL HÍBRIDO de lo ya existente:
--   * si el factor del producto vigente todavía reconcilia con la prima
--     congelada (el producto no cambió), se guarda ese valor EXACTO;
--   * si ya no reconcilia (el producto cambió después), se guarda el derivado
--     aproximado de las primas (lo único disponible para datos históricos).

-- 1. Columnas -----------------------------------------------------------------
ALTER TABLE polizas
	ADD COLUMN IF NOT EXISTS factor_prima_neta numeric(12, 6),
	ADD COLUMN IF NOT EXISTS porcentaje_comision numeric(12, 6);

ALTER TABLE polizas_anexos
	ADD COLUMN IF NOT EXISTS factor_prima_neta numeric(12, 6),
	ADD COLUMN IF NOT EXISTS porcentaje_comision numeric(12, 6);

-- 2. Backfill PÓLIZAS con producto ------------------------------------------
-- Umbrales: el ruido de reconstruir desde prima a 2 decimales es < ~0.05 en el
-- factor y < ~0.0005 en la fracción de comisión para primas normales; por
-- encima de eso asumimos que el producto cambió y usamos el derivado.
UPDATE polizas p
SET
	factor_prima_neta = CASE
		WHEN abs((p.prima_total / p.prima_neta - 1) * 100 - pr.factor_contado) < 0.05 THEN pr.factor_contado
		WHEN abs((p.prima_total / p.prima_neta - 1) * 100 - pr.factor_credito) < 0.05 THEN pr.factor_credito
		ELSE round(((p.prima_total / p.prima_neta - 1) * 100)::numeric, 6)
	END,
	porcentaje_comision = CASE
		WHEN p.comision_empresa IS NULL THEN NULL
		WHEN abs(p.comision_empresa / p.prima_neta - pr.porcentaje_comision) < 0.0005 THEN pr.porcentaje_comision
		ELSE round((p.comision_empresa / p.prima_neta)::numeric, 6)
	END
FROM productos_aseguradoras pr
WHERE pr.id = p.producto_id
	AND p.prima_neta IS NOT NULL
	AND p.prima_neta <> 0
	AND p.prima_total IS NOT NULL
	AND p.factor_prima_neta IS NULL;

-- 3. Backfill PÓLIZAS sin producto (solo derivación) --------------------------
UPDATE polizas p
SET
	factor_prima_neta = round(((p.prima_total / p.prima_neta - 1) * 100)::numeric, 6),
	porcentaje_comision = CASE
		WHEN p.comision_empresa IS NULL THEN NULL
		ELSE round((p.comision_empresa / p.prima_neta)::numeric, 6)
	END
WHERE p.producto_id IS NULL
	AND p.prima_neta IS NOT NULL
	AND p.prima_neta <> 0
	AND p.prima_total IS NOT NULL
	AND p.factor_prima_neta IS NULL;

-- 4. Backfill ANEXOS (factor/producto de la póliza madre) ---------------------
-- El anexo pudo usar factor contado o crédito según la modalidad de la
-- inclusión; en vez de reconstruir cuál, se compara el derivado contra AMBOS
-- factores del producto y se toma el que reconcilie. Los montos del anexo van
-- con signo (exclusión negativo); el cociente cancela el signo.
UPDATE polizas_anexos a
SET
	factor_prima_neta = CASE
		WHEN abs((a.prima_total / a.prima_neta - 1) * 100 - pr.factor_contado) < 0.05 THEN pr.factor_contado
		WHEN abs((a.prima_total / a.prima_neta - 1) * 100 - pr.factor_credito) < 0.05 THEN pr.factor_credito
		ELSE round(((a.prima_total / a.prima_neta - 1) * 100)::numeric, 6)
	END,
	porcentaje_comision = CASE
		WHEN a.comision_empresa IS NULL THEN NULL
		WHEN abs(a.comision_empresa / a.prima_neta - pr.porcentaje_comision) < 0.0005 THEN pr.porcentaje_comision
		ELSE round((a.comision_empresa / a.prima_neta)::numeric, 6)
	END
FROM polizas p
JOIN productos_aseguradoras pr ON pr.id = p.producto_id
WHERE p.id = a.poliza_id
	AND a.prima_neta IS NOT NULL
	AND a.prima_neta <> 0
	AND a.prima_total IS NOT NULL
	AND a.factor_prima_neta IS NULL;

-- 5. Backfill ANEXOS cuya póliza no tiene producto (solo derivación) ----------
UPDATE polizas_anexos a
SET
	factor_prima_neta = round(((a.prima_total / a.prima_neta - 1) * 100)::numeric, 6),
	porcentaje_comision = CASE
		WHEN a.comision_empresa IS NULL THEN NULL
		ELSE round((a.comision_empresa / a.prima_neta)::numeric, 6)
	END
FROM polizas p
WHERE p.id = a.poliza_id
	AND p.producto_id IS NULL
	AND a.prima_neta IS NOT NULL
	AND a.prima_neta <> 0
	AND a.prima_total IS NOT NULL
	AND a.factor_prima_neta IS NULL;

COMMENT ON COLUMN polizas.factor_prima_neta IS 'Factor de prima neta usado al calcular (porcentaje, formato de productos.factor_*). Congelado; no sigue cambios posteriores del producto.';
COMMENT ON COLUMN polizas.porcentaje_comision IS 'Porcentaje de comisión usado al calcular (fracción, formato de productos.porcentaje_comision). Congelado.';
COMMENT ON COLUMN polizas_anexos.factor_prima_neta IS 'Factor de prima neta usado al calcular el anexo (porcentaje). Congelado.';
COMMENT ON COLUMN polizas_anexos.porcentaje_comision IS 'Porcentaje de comisión usado al calcular el anexo (fracción). Congelado.';
