-- ============================================================================
-- Migración: corrige el signo de los descuentos de exclusión (anexos)
-- Fecha: 2026-06-11
--
-- Contexto: el paso de pagos del formulario de anexos de exclusión pedía
-- escribir el descuento "en negativo" pero no validaba el signo. Varios
-- anexos quedaron con el ajuste en POSITIVO y la vista consolidada
-- (monto_consolidado = monto_original + ajustes) lo SUMABA a la cuota en
-- lugar de restarlo.
--
-- El código ya fue corregido: el usuario ahora ingresa el descuento en
-- positivo y tanto el formulario como guardarAnexo lo normalizan a delta
-- negativo (y validan que no exceda el monto original de la cuota).
-- Esta migración corrige los registros existentes.
--
-- Al momento de escribirla había 9 ajustes positivos en 6 anexos de
-- exclusión (5 activos y 1 pendiente).
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================================

-- 1. Verificación previa: lista los ajustes de exclusión con monto positivo
SELECT pap.id, pa.numero_anexo, pa.estado AS anexo_estado, pap.numero_cuota, pap.monto
FROM public.polizas_anexos_pagos pap
JOIN public.polizas_anexos pa ON pa.id = pap.anexo_id
WHERE pa.tipo_anexo = 'exclusion'
	AND pap.tipo = 'ajuste'
	AND pap.monto > 0
ORDER BY pa.numero_anexo, pap.numero_cuota;

-- 2. Corrección: invierte el signo de esos ajustes
UPDATE public.polizas_anexos_pagos pap
SET monto = -pap.monto
FROM public.polizas_anexos pa
WHERE pa.id = pap.anexo_id
	AND pa.tipo_anexo = 'exclusion'
	AND pap.tipo = 'ajuste'
	AND pap.monto > 0;

-- 3. Verificación posterior: no debe quedar ningún ajuste de exclusión positivo
SELECT count(*) AS ajustes_positivos_restantes
FROM public.polizas_anexos_pagos pap
JOIN public.polizas_anexos pa ON pa.id = pap.anexo_id
WHERE pa.tipo_anexo = 'exclusion'
	AND pap.tipo = 'ajuste'
	AND pap.monto > 0;
