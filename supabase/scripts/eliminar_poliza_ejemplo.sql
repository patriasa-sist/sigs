-- ============================================
-- EJEMPLOS DE USO: Eliminar Pólizas Completas
-- ============================================

-- ============================================
-- PASO 1: VERIFICAR SI UNA PÓLIZA PUEDE ELIMINARSE
-- ============================================

-- Verificar por UUID
SELECT * FROM puede_eliminar_poliza('uuid-de-la-poliza-aqui');

-- Ejemplo de respuesta exitosa:
-- puede_eliminar | razon                        | detalles
-- true           | La póliza puede eliminarse   | {"numero_poliza": "POL-001", "pagos": 6, ...}

-- Ejemplo de respuesta bloqueada:
-- puede_eliminar | razon                                    | detalles
-- false          | La póliza tiene 2 siniestro(s) asociado(s) | {"numero_poliza": "POL-001", "siniestros": 2, ...}


-- ============================================
-- PASO 2: VER DETALLES DE UNA PÓLIZA ANTES DE ELIMINAR
-- ============================================

SELECT
  p.id,
  p.numero_poliza,
  p.ramo,
  p.estado,
  p.cliente_nombre,
  p.compania_nombre,
  (SELECT COUNT(*) FROM polizas_pagos WHERE poliza_id = p.id) as total_pagos,
  (SELECT COUNT(*) FROM polizas_documentos WHERE poliza_id = p.id) as total_documentos,
  (SELECT COUNT(*) FROM polizas_automotor_vehiculos WHERE poliza_id = p.id) as total_vehiculos,
  (SELECT COUNT(*) FROM siniestros WHERE poliza_id = p.id) as total_siniestros
FROM polizas p
WHERE p.numero_poliza = 'POL-001';  -- Cambiar por el número de póliza que deseas revisar


-- ============================================
-- PASO 3: ELIMINAR UNA PÓLIZA POR UUID
-- ============================================

SELECT * FROM eliminar_poliza_completo('uuid-de-la-poliza-aqui');

-- Ejemplo de respuesta exitosa:
-- eliminado | mensaje                          | archivos_eliminados | detalles
-- true      | Póliza POL-001 eliminada correctamente | 8                   | {"poliza_id": "...", "numero_poliza": "POL-001", ...}


-- ============================================
-- PASO 4: ELIMINAR UNA PÓLIZA POR NÚMERO
-- ============================================

SELECT * FROM eliminar_poliza_por_numero('POL-001');

-- Esta función es más conveniente si solo tienes el número de póliza


-- ============================================
-- PASO 5: VER TODAS LAS PÓLIZAS DE PRUEBA
-- ============================================

-- Ver todas las pólizas y su información
SELECT
  p.numero_poliza,
  p.ramo,
  p.estado,
  p.cliente_nombre,
  p.fecha_inicio,
  p.fecha_fin,
  (SELECT COUNT(*) FROM polizas_pagos WHERE poliza_id = p.id) as pagos,
  (SELECT COUNT(*) FROM polizas_documentos WHERE poliza_id = p.id) as docs,
  (SELECT COUNT(*) FROM polizas_automotor_vehiculos WHERE poliza_id = p.id) as vehiculos,
  (SELECT COUNT(*) FROM siniestros WHERE poliza_id = p.id) as siniestros,
  CASE
    WHEN (SELECT COUNT(*) FROM siniestros WHERE poliza_id = p.id) > 0
    THEN '❌ No puede eliminarse (tiene siniestros)'
    ELSE '✅ Puede eliminarse'
  END as puede_eliminar
FROM polizas p
ORDER BY p.created_at DESC;


-- ============================================
-- PASO 6: ELIMINAR MÚLTIPLES PÓLIZAS (CUIDADO!)
-- ============================================

-- Eliminar todas las pólizas de prueba que NO tengan siniestros
-- ADVERTENCIA: Esto es irreversible, úsalo solo en ambiente de pruebas

DO $
DECLARE
  v_poliza RECORD;
  v_result RECORD;
  v_total_eliminadas INTEGER := 0;
  v_total_bloqueadas INTEGER := 0;
BEGIN
  -- Recorrer todas las pólizas que comienzan con "PRUEBA-"
  FOR v_poliza IN
    SELECT id, numero_poliza
    FROM polizas
    WHERE numero_poliza LIKE 'PRUEBA-%'
    ORDER BY created_at
  LOOP
    -- Intentar eliminar cada póliza
    SELECT * INTO v_result FROM eliminar_poliza_completo(v_poliza.id);

    IF v_result.eliminado THEN
      v_total_eliminadas := v_total_eliminadas + 1;
      RAISE NOTICE '✅ Póliza % eliminada correctamente', v_poliza.numero_poliza;
    ELSE
      v_total_bloqueadas := v_total_bloqueadas + 1;
      RAISE NOTICE '❌ Póliza % bloqueada: %', v_poliza.numero_poliza, v_result.mensaje;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Resumen:';
  RAISE NOTICE 'Pólizas eliminadas: %', v_total_eliminadas;
  RAISE NOTICE 'Pólizas bloqueadas: %', v_total_bloqueadas;
  RAISE NOTICE '========================================';
END $;


-- ============================================
-- PASO 7: VERIFICAR QUE TODO SE ELIMINÓ CORRECTAMENTE
-- ============================================

-- Verificar que no quedan dependencias huérfanas
SELECT
  'Pólizas' as tabla,
  COUNT(*) as registros
FROM polizas
WHERE numero_poliza LIKE 'PRUEBA-%'

UNION ALL

SELECT
  'Pagos huérfanos' as tabla,
  COUNT(*) as registros
FROM polizas_pagos pp
WHERE NOT EXISTS (SELECT 1 FROM polizas p WHERE p.id = pp.poliza_id)

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

-- Todos los conteos deberían ser 0 excepto "Pólizas" (si decidiste no eliminarlas)


-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. PROTECCIÓN CONTRA SINIESTROS
--    Las pólizas con siniestros asociados NO pueden eliminarse
--    Primero debes eliminar los siniestros usando eliminar_siniestro_completo()

-- 2. ELIMINACIÓN DE ARCHIVOS
--    La función elimina automáticamente:
--    - Documentos de la póliza (bucket: polizas-documentos)
--    - Comprobantes de pago (bucket: comprobantes-pagos)

-- 3. DEPENDENCIAS ELIMINADAS
--    - polizas_pagos (cuotas de pago)
--    - polizas_pagos_comprobantes (comprobantes de cuotas)
--    - polizas_documentos (documentos adjuntos)
--    - polizas_automotor_vehiculos (vehículos asegurados)
--    - polizas_historial_ediciones (historial completo de cambios)

-- 4. OPERACIÓN IRREVERSIBLE
--    No hay forma de recuperar los datos eliminados
--    Asegúrate de verificar con puede_eliminar_poliza() primero

-- 5. WORKFLOW RECOMENDADO
--    a. Listar pólizas de prueba
--    b. Verificar con puede_eliminar_poliza()
--    c. Si tiene siniestros, eliminarlos primero
--    d. Eliminar la póliza con eliminar_poliza_completo()
--    e. Verificar que no quedan registros huérfanos

esto contempla que la poliza conlleva registros de cobranza asociados? tambien deberia borrarlos ya que no son necesarios