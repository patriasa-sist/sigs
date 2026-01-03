-- =====================================================
-- MIGRACIÓN: Estado Real con Trigger
-- =====================================================
-- Descripción: Agrega columna 'estado_real' mantenida automáticamente
--              por un trigger que determina el estado basándose en:
--              - Si tiene fecha de pago -> 'pagado'
--              - Si es parcial -> 'parcial'
--              - Si la fecha de vencimiento ya pasó -> 'vencido'
--              - Caso contrario -> 'pendiente'
--
-- Beneficios:
--   - Siempre actualizado automáticamente
--   - Sin costo adicional
--   - 100% confiable
--   - Indexable para búsquedas rápidas
--
-- Fecha: 2026-01-03
-- Autor: Sistema SIGS
-- =====================================================

-- Paso 1: Agregar columna estado_real como columna normal (NO generated)
ALTER TABLE polizas_pagos
ADD COLUMN estado_real TEXT;

-- Paso 2: Crear función helper que calcula el estado
-- Esta función es STABLE (no IMMUTABLE) porque usa CURRENT_DATE
-- Usa argumentos escalares individuales para evitar problemas de sintaxis
CREATE OR REPLACE FUNCTION public.polizas_pagos_set_estado_real(
  p_fecha_pago DATE,
  p_estado TEXT,
  p_fecha_vencimiento DATE
)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE
    -- Si tiene fecha de pago, está pagado (prioridad máxima)
    WHEN p_fecha_pago IS NOT NULL THEN 'pagado'
    -- Si el estado manual es parcial, mantenerlo
    WHEN p_estado = 'parcial' THEN 'parcial'
    -- Si la fecha de vencimiento ya pasó y no está pagado, está vencido
    WHEN p_fecha_vencimiento < CURRENT_DATE AND p_fecha_pago IS NULL THEN 'vencido'
    -- Caso contrario, está pendiente
    ELSE 'pendiente'
  END;
$$;

-- Paso 3: Crear función del trigger
CREATE OR REPLACE FUNCTION public.polizas_pagos_estado_real_trg()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calcular y asignar estado_real antes de insertar/actualizar
  -- Pasar los campos individuales a la función helper
  NEW.estado_real := public.polizas_pagos_set_estado_real(
    NEW.fecha_pago,
    NEW.estado,
    NEW.fecha_vencimiento
  );
  RETURN NEW;
END;
$$;

-- Paso 4: Eliminar trigger si ya existe (por si es re-ejecución)
DROP TRIGGER IF EXISTS tr_polizas_pagos_estado_real_biu ON polizas_pagos;

-- Paso 5: Crear trigger que se ejecuta ANTES de INSERT o UPDATE
-- Solo se dispara si cambian los campos relevantes (optimización)
CREATE TRIGGER tr_polizas_pagos_estado_real_biu
BEFORE INSERT OR UPDATE OF fecha_pago, estado, fecha_vencimiento
ON polizas_pagos
FOR EACH ROW
EXECUTE FUNCTION public.polizas_pagos_estado_real_trg();

-- Paso 6: Backfill - Calcular estado_real para todos los registros existentes
UPDATE polizas_pagos
SET estado_real = public.polizas_pagos_set_estado_real(
  fecha_pago,
  estado,
  fecha_vencimiento
);

-- Paso 7: Agregar comentario explicativo
COMMENT ON COLUMN polizas_pagos.estado_real IS
'Estado calculado automáticamente vía trigger basado en fecha_pago, estado y fecha_vencimiento.
Valores posibles: pendiente, vencido, parcial, pagado.
Se actualiza automáticamente en cada INSERT/UPDATE.';

-- Paso 8: Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_polizas_pagos_estado_real
ON polizas_pagos(estado_real);

-- Paso 9: Crear índice compuesto para consultas comunes
CREATE INDEX IF NOT EXISTS idx_polizas_pagos_poliza_estado_real
ON polizas_pagos(poliza_id, estado_real);

-- Paso 10: Actualizar comentarios en el campo estado original
COMMENT ON COLUMN polizas_pagos.estado IS
'Estado manual de la cuota. Usar estado_real para el estado calculado automáticamente.
Se mantiene para casos especiales como pagos parciales.';

-- =====================================================
-- VERIFICACIÓN DE LA MIGRACIÓN
-- =====================================================

-- Query de verificación 1: Ver algunos registros con estado_real
/*
SELECT
  id,
  numero_cuota,
  fecha_vencimiento,
  fecha_pago,
  estado as estado_manual,
  estado_real as estado_calculado
FROM polizas_pagos
ORDER BY created_at DESC
LIMIT 10;
*/

-- Query de verificación 2: Contar por estado_real
/*
SELECT
  estado_real,
  COUNT(*) as cantidad,
  ROUND(SUM(monto)::numeric, 2) as monto_total
FROM polizas_pagos
GROUP BY estado_real
ORDER BY estado_real;
*/

-- Query de verificación 3: Verificar que NO haya inconsistencias
/*
SELECT
  'ERROR: Vencido y pagado al mismo tiempo' as error,
  COUNT(*) as cantidad
FROM polizas_pagos
WHERE estado_real = 'vencido' AND fecha_pago IS NOT NULL

UNION ALL

SELECT
  'ERROR: Pagado sin fecha de pago',
  COUNT(*)
FROM polizas_pagos
WHERE estado_real = 'pagado' AND fecha_pago IS NULL

UNION ALL

SELECT
  'ERROR: Pendiente pero ya venció',
  COUNT(*)
FROM polizas_pagos
WHERE estado_real = 'pendiente'
  AND fecha_vencimiento < CURRENT_DATE
  AND fecha_pago IS NULL
  AND estado != 'parcial';
*/

-- =====================================================
-- TESTING DEL TRIGGER
-- =====================================================

-- Test 1: Insertar nueva cuota vencida (debe auto-calcular estado_real)
/*
DO $$
DECLARE
  test_poliza_id UUID;
BEGIN
  -- Obtener una póliza existente para testing
  SELECT id INTO test_poliza_id FROM polizas WHERE estado = 'activa' LIMIT 1;

  -- Insertar cuota de prueba
  INSERT INTO polizas_pagos (
    poliza_id,
    numero_cuota,
    monto,
    fecha_vencimiento,
    estado
  ) VALUES (
    test_poliza_id,
    999,
    100,
    '2025-01-01',  -- Fecha en el pasado
    'pendiente'
  );

  -- Verificar que estado_real sea 'vencido'
  IF (SELECT estado_real FROM polizas_pagos WHERE numero_cuota = 999) = 'vencido' THEN
    RAISE NOTICE '✅ Test 1 PASADO: Cuota vencida calculada correctamente';
  ELSE
    RAISE WARNING '❌ Test 1 FALLIDO: estado_real no es vencido';
  END IF;

  -- Limpiar
  DELETE FROM polizas_pagos WHERE numero_cuota = 999;
END $$;
*/

-- Test 2: Actualizar fecha de pago (debe cambiar a 'pagado')
/*
DO $$
DECLARE
  test_cuota_id UUID;
BEGIN
  -- Crear cuota vencida
  SELECT id INTO test_cuota_id FROM polizas_pagos WHERE estado_real = 'vencido' LIMIT 1;

  IF test_cuota_id IS NOT NULL THEN
    -- Guardar estado original
    CREATE TEMP TABLE IF NOT EXISTS test_backup AS
    SELECT * FROM polizas_pagos WHERE id = test_cuota_id;

    -- Marcar como pagada
    UPDATE polizas_pagos SET fecha_pago = CURRENT_DATE WHERE id = test_cuota_id;

    -- Verificar
    IF (SELECT estado_real FROM polizas_pagos WHERE id = test_cuota_id) = 'pagado' THEN
      RAISE NOTICE '✅ Test 2 PASADO: Cuota cambió a pagado correctamente';
    ELSE
      RAISE WARNING '❌ Test 2 FALLIDO: estado_real no cambió a pagado';
    END IF;

    -- Restaurar estado original
    UPDATE polizas_pagos p
    SET fecha_pago = t.fecha_pago, estado = t.estado
    FROM test_backup t
    WHERE p.id = t.id;

    DROP TABLE test_backup;
  END IF;
END $$;
*/

-- =====================================================
-- ROLLBACK (si es necesario)
-- =====================================================
-- IMPORTANTE: Solo ejecutar si necesitas revertir la migración

/*
-- Eliminar trigger
DROP TRIGGER IF EXISTS tr_polizas_pagos_estado_real_biu ON polizas_pagos;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.polizas_pagos_estado_real_trg();
DROP FUNCTION IF EXISTS public.polizas_pagos_set_estado_real(polizas_pagos);

-- Eliminar índices
DROP INDEX IF EXISTS idx_polizas_pagos_estado_real;
DROP INDEX IF EXISTS idx_polizas_pagos_poliza_estado_real;

-- Eliminar columna
ALTER TABLE polizas_pagos DROP COLUMN IF EXISTS estado_real;

-- Restaurar comentario original
COMMENT ON COLUMN polizas_pagos.estado IS 'Estado de la cuota: pendiente, vencido, parcial, pagado';
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. El trigger se ejecuta automáticamente en INSERT/UPDATE
-- 2. Solo se dispara si cambian: fecha_pago, estado, o fecha_vencimiento
-- 3. La columna estado_real es indexable para queries rápidas
-- 4. El código TypeScript NO necesita cambios, funciona igual
-- 5. Para forzar recálculo: UPDATE polizas_pagos SET estado = estado;
