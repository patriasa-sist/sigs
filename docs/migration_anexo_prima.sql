-- Migración: desglose financiero (prima/comisiones) en anexos
-- Issue #14 — Los anexos de inclusión/exclusión deben llevar su propia prima
-- (total, neta, comisión) espejando el cálculo de la póliza, para mostrarla en
-- el detalle del anexo, consolidarla en la póliza (#15) y reportarla en
-- producción (#16).
--
-- Ejecutar manualmente (Claude solo tiene lectura en la BD).

BEGIN;

ALTER TABLE public.polizas_anexos
	ADD COLUMN IF NOT EXISTS prima_total numeric,
	ADD COLUMN IF NOT EXISTS prima_neta numeric,
	ADD COLUMN IF NOT EXISTS comision numeric,
	ADD COLUMN IF NOT EXISTS comision_empresa numeric,
	ADD COLUMN IF NOT EXISTS comision_encargado numeric;

COMMENT ON COLUMN public.polizas_anexos.prima_total IS
	'Prima total del anexo (inclusión +, exclusión −). null para reemplazo/anulación.';

-- Backfill best-effort para anexos de inclusión/exclusión ya existentes.
-- prima_total = suma firmada de sus cuotas (inclusión: cuota_propia +,
-- exclusión: ajuste −). prima_neta y comisión se derivan con el factor del
-- producto de la póliza madre según su modalidad (aproximación: al re-editar un
-- anexo se recalcula con la modalidad real del plan de inclusión). No se
-- backfillea comision_encargado (depende del % por usuario); se completa al
-- re-editar el anexo.
WITH gross AS (
	SELECT
		ap.anexo_id,
		SUM(ap.monto) AS prima_total
	FROM public.polizas_anexos_pagos ap
	WHERE ap.tipo IN ('cuota_propia', 'ajuste')
	GROUP BY ap.anexo_id
),
calc AS (
	SELECT
		a.id AS anexo_id,
		g.prima_total,
		CASE
			WHEN p.modalidad_pago = 'contado' OR p.usar_factores_contado = true
				THEN pr.factor_contado
			ELSE pr.factor_credito
		END AS factor,
		pr.porcentaje_comision
	FROM public.polizas_anexos a
	JOIN gross g ON g.anexo_id = a.id
	JOIN public.polizas p ON p.id = a.poliza_id
	JOIN public.productos_aseguradoras pr ON pr.id = p.producto_id
	WHERE a.tipo_anexo IN ('inclusion', 'exclusion')
)
UPDATE public.polizas_anexos a
SET
	prima_total = round(c.prima_total, 2),
	prima_neta = round(c.prima_total / (c.factor / 100.0 + 1), 2),
	comision = round((c.prima_total / (c.factor / 100.0 + 1)) * c.porcentaje_comision, 2),
	comision_empresa = round((c.prima_total / (c.factor / 100.0 + 1)) * c.porcentaje_comision, 2)
FROM calc c
WHERE a.id = c.anexo_id;

COMMIT;
