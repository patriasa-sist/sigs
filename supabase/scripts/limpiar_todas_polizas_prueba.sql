-- ============================================
-- SCRIPT: Limpiar TODAS las Pólizas de Prueba
-- ============================================
-- ADVERTENCIA: Este script eliminará PERMANENTEMENTE todas las pólizas
--              que cumplan con el criterio de búsqueda.
--              Esta operación es IRREVERSIBLE.
--
-- Uso: Ejecutar desde Supabase SQL Editor o psql
-- ============================================

-- ============================================
-- CONFIGURACIÓN: Define qué pólizas eliminar
-- ============================================

-- Opción 1: Eliminar pólizas que empiezan con "PRUEBA-"
-- Opción 2: Eliminar pólizas que empiezan con "TEST-"
-- Opción 3: Eliminar todas las pólizas (¡MUCHO CUIDADO!)

DO $
DECLARE
  -- ====== CONFIGURAR AQUÍ ======
  v_patron_numero_poliza TEXT := 'PRUEBA-%';  -- Cambiar según necesidad
  -- Opciones comunes:
  -- 'PRUEBA-%'  - Solo pólizas de prueba
  -- 'TEST-%'    - Solo pólizas de test
  -- '%'         - TODAS las pólizas (¡PELIGRO!)
  -- =============================

  v_poliza RECORD;
  v_siniestro RECORD;
  v_result RECORD;
  v_result_siniestro RECORD;

  -- Contadores
  v_total_polizas INTEGER := 0;
  v_polizas_eliminadas INTEGER := 0;
  v_polizas_bloqueadas INTEGER := 0;
  v_polizas_error INTEGER := 0;
  v_siniestros_eliminados INTEGER := 0;
  v_archivos_eliminados INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIANDO LIMPIEZA DE PÓLIZAS';
  RAISE NOTICE 'Patrón de búsqueda: %', v_patron_numero_poliza;
  RAISE NOTICE '========================================';

  -- Contar cuántas pólizas se van a procesar
  SELECT COUNT(*) INTO v_total_polizas
  FROM polizas
  WHERE numero_poliza LIKE v_patron_numero_poliza;

  RAISE NOTICE 'Total de pólizas encontradas: %', v_total_polizas;

  IF v_total_polizas = 0 THEN
    RAISE NOTICE 'No hay pólizas que coincidan con el patrón especificado.';
    RETURN;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'PROCESANDO PÓLIZAS...';
  RAISE NOTICE '========================================';

  -- Recorrer todas las pólizas que coincidan
  FOR v_poliza IN
    SELECT id, numero_poliza, ramo
    FROM polizas
    WHERE numero_poliza LIKE v_patron_numero_poliza
    ORDER BY created_at
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '📋 Procesando: % (Ramo: %)', v_poliza.numero_poliza, v_poliza.ramo;

    -- Verificar si tiene siniestros
    DECLARE
      v_siniestros_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_siniestros_count
      FROM siniestros
      WHERE poliza_id = v_poliza.id;

      IF v_siniestros_count > 0 THEN
        RAISE NOTICE '   ⚠️  Póliza tiene % siniestro(s), eliminando primero...', v_siniestros_count;

        -- Eliminar todos los siniestros de esta póliza
        FOR v_siniestro IN
          SELECT id, codigo_siniestro
          FROM siniestros
          WHERE poliza_id = v_poliza.id
        LOOP
          SELECT * INTO v_result_siniestro
          FROM eliminar_siniestro_completo(v_siniestro.id);

          IF v_result_siniestro.eliminado THEN
            v_siniestros_eliminados := v_siniestros_eliminados + 1;
            RAISE NOTICE '   ✅ Siniestro % eliminado', v_siniestro.codigo_siniestro;
          ELSE
            RAISE NOTICE '   ❌ Error al eliminar siniestro %: %',
              v_siniestro.codigo_siniestro,
              v_result_siniestro.mensaje;
          END IF;
        END LOOP;
      END IF;

      -- Ahora intentar eliminar la póliza
      SELECT * INTO v_result FROM eliminar_poliza_completo(v_poliza.id);

      IF v_result.eliminado THEN
        v_polizas_eliminadas := v_polizas_eliminadas + 1;
        v_archivos_eliminados := v_archivos_eliminados + v_result.archivos_eliminados;
        RAISE NOTICE '   ✅ Póliza eliminada correctamente';
        RAISE NOTICE '   📁 Archivos eliminados: %', v_result.archivos_eliminados;
      ELSE
        v_polizas_bloqueadas := v_polizas_bloqueadas + 1;
        RAISE NOTICE '   ❌ Bloqueada: %', v_result.mensaje;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        v_polizas_error := v_polizas_error + 1;
        RAISE NOTICE '   ❌ ERROR: % - %', SQLERRM, SQLSTATE;
    END;
  END LOOP;

  -- Resumen final
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE LIMPIEZA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total pólizas encontradas:   %', v_total_polizas;
  RAISE NOTICE 'Pólizas eliminadas:          %', v_polizas_eliminadas;
  RAISE NOTICE 'Pólizas bloqueadas:          %', v_polizas_bloqueadas;
  RAISE NOTICE 'Pólizas con error:           %', v_polizas_error;
  RAISE NOTICE 'Siniestros eliminados:       %', v_siniestros_eliminados;
  RAISE NOTICE 'Archivos eliminados:         %', v_archivos_eliminados;
  RAISE NOTICE '========================================';

  IF v_polizas_eliminadas = v_total_polizas THEN
    RAISE NOTICE '✅ LIMPIEZA COMPLETADA EXITOSAMENTE';
  ELSIF v_polizas_bloqueadas > 0 OR v_polizas_error > 0 THEN
    RAISE NOTICE '⚠️  LIMPIEZA COMPLETADA CON ADVERTENCIAS';
  END IF;

  RAISE NOTICE '========================================';

END $;


-- ============================================
-- VERIFICACIÓN POST-LIMPIEZA
-- ============================================

-- Ejecuta esto DESPUÉS del script de limpieza para verificar

-- 1. Verificar que no quedan pólizas de prueba
SELECT COUNT(*) as polizas_restantes
FROM polizas
WHERE numero_poliza LIKE 'PRUEBA-%';  -- Cambiar por el mismo patrón usado arriba

-- 2. Verificar que no quedan registros huérfanos
SELECT
  'Pagos huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_pagos pp
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = pp.poliza_id)

UNION ALL

SELECT
  'Comprobantes huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_pagos_comprobantes ppc
WHERE NOT EXISTS (SELECT 1 FROM polizas_pagos pp WHERE pp.id = ppc.pago_id)

UNION ALL

SELECT
  'Documentos huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_documentos pd
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = pd.poliza_id)

UNION ALL

SELECT
  'Vehículos huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_automotor_vehiculos pav
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = pav.poliza_id)

UNION ALL

SELECT
  'Historial huérfano' as tabla,
  COUNT(*) as registros
FROM polizas_historial_ediciones phe
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = phe.poliza_id);

-- Todos los conteos deberían ser 0


-- ============================================
-- ESTADÍSTICAS GENERALES DESPUÉS DE LIMPIEZA
-- ============================================

SELECT
  'Pólizas totales' as tipo,
  COUNT(*) as cantidad
FROM polizas

UNION ALL

SELECT
  'Pagos totales' as tipo,
  COUNT(*) as cantidad
FROM polizas_pagos

UNION ALL

SELECT
  'Documentos totales' as tipo,
  COUNT(*) as cantidad
FROM polizas_documentos

UNION ALL

SELECT
  'Vehículos totales' as tipo,
  COUNT(*) as cantidad
FROM polizas_automotor_vehiculos

UNION ALL

SELECT
  'Siniestros totales' as tipo,
  COUNT(*) as cantidad
FROM siniestros;


-- ============================================
-- ADVERTENCIAS IMPORTANTES
-- ============================================

-- 1. OPERACIÓN IRREVERSIBLE
--    No hay forma de deshacer esta operación una vez ejecutada
--
-- 2. BACKUP RECOMENDADO
--    Considera hacer un backup de la base de datos antes de ejecutar
--    en producción
--
-- 3. SINIESTROS
--    El script automáticamente elimina siniestros asociados a las pólizas
--    No necesitas eliminarlos manualmente primero
--
-- 4. ARCHIVOS DE STORAGE
--    Se eliminan automáticamente:
--    - Documentos de pólizas
--    - Comprobantes de pago
--    - Documentos de siniestros (si hay siniestros)
--
-- 5. PATRÓN DE BÚSQUEDA
--    Asegúrate de configurar correctamente v_patron_numero_poliza
--    Usa '%' solo si estás ABSOLUTAMENTE seguro de querer eliminar TODO
--
-- 6. EJECUCIÓN EN PRODUCCIÓN
--    Ejecuta primero una consulta SELECT para ver qué se eliminará:
--    SELECT numero_poliza, ramo, estado FROM polizas WHERE numero_poliza LIKE 'PRUEBA-%';
--
-- 7. LOGS
--    Todos los mensajes NOTICE se mostrarán durante la ejecución
--    Revisa el resumen final para verificar el resultado
