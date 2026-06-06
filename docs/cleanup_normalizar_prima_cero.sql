-- ============================================================================
-- Limpieza puntual: normalizar pólizas con prima "workaround" (< 1) a prima cero
-- ----------------------------------------------------------------------------
-- Contexto:
--   Antes del desarrollo de tipo_prima/sin_prima_propia, algunas pólizas
--   (transporte open-cover, AP, etc.) se cargaron con primas token (0.01, 0.10,
--   0.99) para sortear la validación "prima > 0". Ahora se normalizan al modelo
--   correcto: tipo_prima = 'sin_prima_propia', prima_total = 0, sin cuotas.
--
-- Requisito previo: haber ejecutado docs/migration_tipo_prima_retroactiva.sql
--   (debe existir la columna polizas.tipo_prima).
--
-- IMPORTANTE — exclusión:
--   La póliza 10221841 (id b41b7ae9-97ab-437f-bc32-0ee2d73a6e5c, Automotores)
--   NO se incluye: su cuota base ya está referenciada por 3 anexos ACTIVOS
--   (ajustes de inclusión/exclusión, patrón open-cover legacy). Borrar su cuota
--   rompería esos anexos. Requiere revisión manual aparte. Por eso aquí se
--   normalizan solo 14 de las 15 pólizas.
--
-- Seguro:
--   - Las 14 pólizas objetivo tienen 1 sola cuota cada una, NINGUNA pagada.
--   - El DELETE solo borra cuotas NO pagadas y NO referenciadas por anexos
--     (doble guarda). Como polizas_pagos tiene CHECK (monto > 0), la cuota
--     placeholder no puede ponerse en 0: se elimina (sin_prima_propia no lleva
--     cuotas propias).
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================================

BEGIN;

-- 0. El UPDATE de polizas dispara el trigger registrar_historial_poliza(), que
--    inserta en polizas_historial_ediciones con usuario_id = auth.uid() (NOT NULL).
--    En el SQL Editor auth.uid() es NULL → falla. Seteamos el claim JWT a un
--    usuario admin para que auth.uid() resuelva y el historial quede atribuido.
--    (Cambiar el UUID por el propio si se desea otra atribución.)
SELECT set_config('request.jwt.claim.sub', '466c1ce1-f3b2-433b-9371-9ac3eaad79c7', true); -- Flavio Colombo Vargas (admin)
SELECT set_config('request.jwt.claims', '{"sub":"466c1ce1-f3b2-433b-9371-9ac3eaad79c7","role":"authenticated"}', true);

-- 1. Eliminar la cuota placeholder (no pagada, no referenciada por anexos)
DELETE FROM polizas_pagos
WHERE estado <> 'pagado'
  AND id NOT IN (
    SELECT cuota_original_id FROM polizas_anexos_pagos WHERE cuota_original_id IS NOT NULL
  )
  AND poliza_id IN (
    '8e5c5dae-29e1-407f-8527-8798ce32899e', -- 58024437  Transportes 0.99
    '5debc79f-f18c-4d0a-830a-4f7dd0832f4d', -- 58024057  Transportes 0.10
    '68be7184-a467-4258-a923-c2584c5d6fb9', -- CAC-SCE0674378 AP 0.10
    '63a9be17-e53b-4572-8995-315af556c077', -- 58024417  Transportes 0.01
    'b8ccf23f-9e54-43b3-a27a-a8d73e4f9af6', -- CAC-SCE0674834 AP 0.01
    '296993ba-3c57-48fa-ad23-081ed3824ba4', -- 58024058  Transportes 0.01
    'a3bcea79-ebc0-4ed8-9b18-b326490f67a0', -- 58024185  Transportes 0.01
    '9352c7af-5883-49b3-9265-038652d6ed9b', -- 58023912  Transportes 0.01
    '0f61cae9-bdde-48d8-bf9b-2ea3bccba59b', -- 97022643  AP 0.01
    '7da374b1-8a9a-461e-bd8e-6468460c1509', -- 10231372  Automotores 0.01
    'e7d2a210-77f1-4d49-9c6e-a049eee1bce3', -- AUT-SCE0650572 Automotores 0.01
    '40ea35bd-9873-4925-8b45-f8a92bd8d262', -- 97015534  AP 0.01
    '214851a6-f961-491c-b857-0196ade55dc9', -- 50002437  Resp. civil 0.01
    '961ba2aa-3761-4f84-9df2-ccbe4298d2e2'  -- AUTI-SCZ0007999 Automotores 0.01
  );

-- 2. Normalizar las pólizas a "sin prima propia"
UPDATE polizas
SET prima_total       = 0,
    prima_neta        = NULL,
    comision          = NULL,
    comision_empresa  = NULL,
    comision_encargado= NULL,
    tipo_prima        = 'sin_prima_propia'
WHERE id IN (
    '8e5c5dae-29e1-407f-8527-8798ce32899e',
    '5debc79f-f18c-4d0a-830a-4f7dd0832f4d',
    '68be7184-a467-4258-a923-c2584c5d6fb9',
    '63a9be17-e53b-4572-8995-315af556c077',
    'b8ccf23f-9e54-43b3-a27a-a8d73e4f9af6',
    '296993ba-3c57-48fa-ad23-081ed3824ba4',
    'a3bcea79-ebc0-4ed8-9b18-b326490f67a0',
    '9352c7af-5883-49b3-9265-038652d6ed9b',
    '0f61cae9-bdde-48d8-bf9b-2ea3bccba59b',
    '7da374b1-8a9a-461e-bd8e-6468460c1509',
    'e7d2a210-77f1-4d49-9c6e-a049eee1bce3',
    '40ea35bd-9873-4925-8b45-f8a92bd8d262',
    '214851a6-f961-491c-b857-0196ade55dc9',
    '961ba2aa-3761-4f84-9df2-ccbe4298d2e2'
  );

COMMIT;

-- Verificación post-COMMIT:
--   Debe quedar solo la póliza excluida 10221841 (prima 0.01) en este conteo:
-- SELECT id, numero_poliza, prima_total, tipo_prima
-- FROM polizas WHERE prima_total > 0 AND prima_total < 1;
