-- ============================================================================
-- Limpieza de la póliza legacy 10221841 (b41b7ae9-97ab-437f-bc32-0ee2d73a6e5c)
--
-- Esta póliza usa el parche viejo "póliza madre sin cuotas no existía": una
-- cuota madre de 0.01 sobre la que se apilaron, como `ajuste`, dos inclusiones
-- (+4780, +500) y una exclusión (-1981.07). Con el modelo nuevo (exclusión
-- multi-cuota) se la migra a la forma canónica:
--   - Las 2 inclusiones pasan a cuota_propia (cuotas propias del anexo).
--   - La exclusión queda como ajuste que descuenta una cuota de inclusión
--     (cuota_anexo_pago_id), ya no la cuota madre.
--   - Se borra la cuota madre de 0.01 (queda póliza madre sin cuotas).
--   - Se corrige el año 0206 -> 2026 en las fechas de vencimiento.
--
-- REQUISITO: ejecutar DESPUÉS de migration_exclusion_multi_cuota.sql.
-- EJECUTAR MANUALMENTE. Claude solo tiene lectura.
--
-- ⚠️ SUPOSICIÓN A CONFIRMAR: la exclusión (-1981.07) se aplica sobre la cuota
--    de la inclusión ANEXO 4 (4780), porque 1981.07 < 4780. Si los vehículos
--    excluidos pertenecían a otra inclusión, cambiar el anexo_id objetivo abajo.
-- ============================================================================

BEGIN;

-- 1. Inclusiones: ajuste (+) -> cuota_propia, sin cuota madre, fecha corregida.
UPDATE public.polizas_anexos_pagos
SET tipo = 'cuota_propia',
	cuota_original_id = NULL,
	cuota_anexo_pago_id = NULL,
	fecha_vencimiento = '2026-03-03',
	observaciones = 'Cuota propia por inclusión'
WHERE anexo_id IN (
		'648c8d4a-f067-4d29-83ce-bde8f7e8518e', -- ANEXO 4 (+4780)
		'e9031b56-b88d-44f7-a265-f1af65dc585c'  -- ANEXO 3 (+500)
	)
	AND tipo = 'ajuste';

-- 2. Exclusión: repuntar el descuento a la cuota de inclusión de ANEXO 4 y
--    corregir la fecha. Mantiene monto -1981.07.
UPDATE public.polizas_anexos_pagos
SET cuota_original_id = NULL,
	cuota_anexo_pago_id = (
		SELECT id FROM public.polizas_anexos_pagos
		WHERE anexo_id = '648c8d4a-f067-4d29-83ce-bde8f7e8518e'
			AND tipo = 'cuota_propia'
		LIMIT 1
	),
	fecha_vencimiento = '2026-03-03',
	observaciones = 'Descuento por exclusión'
WHERE anexo_id = 'a64c5398-10b0-4645-b312-8253c9d18fc1' -- ANEXO 2 (-1981.07)
	AND tipo = 'ajuste';

-- 3. Borrar la cuota madre de 0.01 (ya nadie la referencia).
DELETE FROM public.polizas_pagos
WHERE id = 'd322b0a7-b39e-484c-aede-d14c386766f5'
	AND poliza_id = 'b41b7ae9-97ab-437f-bc32-0ee2d73a6e5c';

-- 4. Marcar la póliza como madre sin prima propia (open-cover). El 0.01 era
--    sólo el ancla del parche viejo.
UPDATE public.polizas
SET tipo_prima = 'sin_prima_propia',
	prima_neta = 0,
	prima_total = 0
WHERE id = 'b41b7ae9-97ab-437f-bc32-0ee2d73a6e5c';

-- Verificación (debería mostrar 2 cuota_propia: 4780 y 500; 1 ajuste -1981.07
-- con cuota_anexo_pago_id apuntando a la cuota_propia de 4780; 0 cuotas madre):
-- SELECT tipo, monto, cuota_original_id, cuota_anexo_pago_id, fecha_vencimiento
-- FROM polizas_anexos_pagos pap
-- JOIN polizas_anexos pa ON pa.id = pap.anexo_id
-- WHERE pa.poliza_id = 'b41b7ae9-97ab-437f-bc32-0ee2d73a6e5c';

COMMIT;
