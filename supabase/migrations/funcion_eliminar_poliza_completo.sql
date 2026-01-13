-- ============================================
-- FUNCIÓN: Eliminar Póliza Completa
-- ============================================
-- Descripción: Elimina una póliza con TODAS sus dependencias
--              incluyendo archivos físicos del Storage
-- Uso: SELECT eliminar_poliza_completo('uuid-de-poliza');
-- ============================================

CREATE OR REPLACE FUNCTION eliminar_poliza_completo(
  p_poliza_id UUID
)
RETURNS TABLE (
  eliminado BOOLEAN,
  mensaje TEXT,
  archivos_eliminados INTEGER,
  detalles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero_poliza TEXT;
  v_ramo TEXT;
  v_archivos_docs INTEGER := 0;
  v_archivos_comprobantes INTEGER := 0;
  v_archivo RECORD;
  v_pagos_count INTEGER := 0;
  v_vehiculos_count INTEGER := 0;
  v_documentos_count INTEGER := 0;
  v_historial_count INTEGER := 0;
  v_siniestros_count INTEGER := 0;
BEGIN
  -- ============================================
  -- PASO 1: VERIFICAR QUE LA PÓLIZA EXISTE
  -- ============================================
  SELECT numero_poliza, ramo
  INTO v_numero_poliza, v_ramo
  FROM polizas
  WHERE id = p_poliza_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      'Póliza no encontrada',
      0,
      jsonb_build_object('error', 'ID de póliza no existe');
    RETURN;
  END IF;

  -- ============================================
  -- PASO 2: VERIFICAR QUE NO TENGA SINIESTROS
  -- ============================================
  -- Las pólizas con siniestros NO se pueden eliminar (ON DELETE RESTRICT)
  SELECT COUNT(*) INTO v_siniestros_count
  FROM siniestros
  WHERE poliza_id = p_poliza_id;

  IF v_siniestros_count > 0 THEN
    RETURN QUERY SELECT
      false,
      format('No se puede eliminar: la póliza tiene %s siniestro(s) asociado(s)', v_siniestros_count),
      0,
      jsonb_build_object(
        'error', 'Póliza tiene siniestros asociados',
        'siniestros_count', v_siniestros_count,
        'solucion', 'Eliminar primero los siniestros asociados'
      );
    RETURN;
  END IF;

  -- ============================================
  -- PASO 3: CONTAR DEPENDENCIAS (PARA LOGGING)
  -- ============================================
  SELECT COUNT(*) INTO v_pagos_count
  FROM polizas_pagos
  WHERE poliza_id = p_poliza_id;

  SELECT COUNT(*) INTO v_vehiculos_count
  FROM polizas_automotor_vehiculos
  WHERE poliza_id = p_poliza_id;

  SELECT COUNT(*) INTO v_documentos_count
  FROM polizas_documentos
  WHERE poliza_id = p_poliza_id;

  SELECT COUNT(*) INTO v_historial_count
  FROM polizas_historial_ediciones
  WHERE poliza_id = p_poliza_id;

  -- ============================================
  -- PASO 4: ELIMINAR COMPROBANTES DE PAGO DEL STORAGE
  -- ============================================
  -- Primero eliminar archivos de comprobantes asociados a pagos
  FOR v_archivo IN
    SELECT c.id, c.archivo_url, c.nombre_archivo
    FROM polizas_pagos_comprobantes c
    INNER JOIN polizas_pagos p ON c.pago_id = p.id
    WHERE p.poliza_id = p_poliza_id
  LOOP
    -- Eliminar archivo del Storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'comprobantes-pagos'
    AND name = v_archivo.archivo_url;

    v_archivos_comprobantes := v_archivos_comprobantes + 1;

    RAISE NOTICE 'Comprobante eliminado: %', v_archivo.nombre_archivo;
  END LOOP;

  -- ============================================
  -- PASO 5: ELIMINAR DOCUMENTOS DE PÓLIZA DEL STORAGE
  -- ============================================
  FOR v_archivo IN
    SELECT id, archivo_url, nombre_archivo
    FROM polizas_documentos
    WHERE poliza_id = p_poliza_id
  LOOP
    -- Eliminar archivo del Storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'polizas-documentos'
    AND name = v_archivo.archivo_url;

    v_archivos_docs := v_archivos_docs + 1;

    RAISE NOTICE 'Documento eliminado: %', v_archivo.nombre_archivo;
  END LOOP;

  -- ============================================
  -- PASO 6: ELIMINAR PÓLIZA
  -- ============================================
  -- Esto automáticamente elimina (CASCADE o manual):
  -- - polizas_pagos (manual, no tiene CASCADE explícito)
  -- - polizas_pagos_comprobantes (CASCADE desde pagos)
  -- - polizas_documentos (manual)
  -- - polizas_automotor_vehiculos (manual)
  -- - polizas_historial_ediciones (manual)

  -- Eliminar comprobantes (a través de pagos)
  DELETE FROM polizas_pagos_comprobantes
  WHERE pago_id IN (SELECT id FROM polizas_pagos WHERE poliza_id = p_poliza_id);

  -- Eliminar pagos
  DELETE FROM polizas_pagos
  WHERE poliza_id = p_poliza_id;

  -- Eliminar documentos
  DELETE FROM polizas_documentos
  WHERE poliza_id = p_poliza_id;

  -- Eliminar vehículos (si es automotor)
  DELETE FROM polizas_automotor_vehiculos
  WHERE poliza_id = p_poliza_id;

  -- Eliminar historial
  DELETE FROM polizas_historial_ediciones
  WHERE poliza_id = p_poliza_id;

  -- Eliminar póliza principal
  DELETE FROM polizas
  WHERE id = p_poliza_id;

  -- ============================================
  -- PASO 7: RETORNAR RESULTADO
  -- ============================================
  RETURN QUERY SELECT
    true::BOOLEAN,
    format('Póliza %s eliminada correctamente', v_numero_poliza)::TEXT,
    (v_archivos_docs + v_archivos_comprobantes)::INTEGER,
    jsonb_build_object(
      'poliza_id', p_poliza_id,
      'numero_poliza', v_numero_poliza,
      'ramo', v_ramo,
      'pagos_eliminados', v_pagos_count,
      'vehiculos_eliminados', v_vehiculos_count,
      'documentos_eliminados', v_documentos_count,
      'historial_eliminado', v_historial_count,
      'archivos_documentos', v_archivos_docs,
      'archivos_comprobantes', v_archivos_comprobantes,
      'total_archivos', v_archivos_docs + v_archivos_comprobantes
    );

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      format('Error al eliminar: %s', SQLERRM)::TEXT,
      0::INTEGER,
      jsonb_build_object(
        'error', SQLERRM,
        'detalle', SQLSTATE
      );
END;
$$;

-- ============================================
-- FUNCIÓN ALTERNATIVA: Eliminar por Número de Póliza
-- ============================================
CREATE OR REPLACE FUNCTION eliminar_poliza_por_numero(
  p_numero_poliza TEXT
)
RETURNS TABLE (
  eliminado BOOLEAN,
  mensaje TEXT,
  archivos_eliminados INTEGER,
  detalles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poliza_id UUID;
BEGIN
  -- Buscar ID por número de póliza
  SELECT id INTO v_poliza_id
  FROM polizas
  WHERE numero_poliza = p_numero_poliza;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      format('Póliza con número %s no encontrada', p_numero_poliza),
      0,
      jsonb_build_object('error', 'Número de póliza no existe');
    RETURN;
  END IF;

  -- Llamar a la función principal
  RETURN QUERY SELECT * FROM eliminar_poliza_completo(v_poliza_id);
END;
$$;

-- ============================================
-- FUNCIÓN: Verificar si una Póliza puede eliminarse
-- ============================================
-- Útil para verificar ANTES de intentar eliminar
CREATE OR REPLACE FUNCTION puede_eliminar_poliza(
  p_poliza_id UUID
)
RETURNS TABLE (
  puede_eliminar BOOLEAN,
  razon TEXT,
  detalles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero_poliza TEXT;
  v_siniestros_count INTEGER;
  v_pagos_count INTEGER;
  v_documentos_count INTEGER;
BEGIN
  -- Verificar que existe
  SELECT numero_poliza INTO v_numero_poliza
  FROM polizas
  WHERE id = p_poliza_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      'Póliza no encontrada',
      jsonb_build_object('error', 'ID no existe');
    RETURN;
  END IF;

  -- Contar siniestros (bloquea eliminación)
  SELECT COUNT(*) INTO v_siniestros_count
  FROM siniestros
  WHERE poliza_id = p_poliza_id;

  IF v_siniestros_count > 0 THEN
    RETURN QUERY SELECT
      false,
      format('La póliza tiene %s siniestro(s) asociado(s)', v_siniestros_count),
      jsonb_build_object(
        'numero_poliza', v_numero_poliza,
        'siniestros', v_siniestros_count,
        'bloqueo', 'ON DELETE RESTRICT',
        'accion_requerida', 'Eliminar primero los siniestros'
      );
    RETURN;
  END IF;

  -- Contar dependencias (solo informativo)
  SELECT COUNT(*) INTO v_pagos_count FROM polizas_pagos WHERE poliza_id = p_poliza_id;
  SELECT COUNT(*) INTO v_documentos_count FROM polizas_documentos WHERE poliza_id = p_poliza_id;

  -- Puede eliminar
  RETURN QUERY SELECT
    true,
    'La póliza puede eliminarse',
    jsonb_build_object(
      'numero_poliza', v_numero_poliza,
      'pagos', v_pagos_count,
      'documentos', v_documentos_count,
      'advertencia', 'Esta operación es irreversible'
    );
END;
$$;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON FUNCTION eliminar_poliza_completo(UUID) IS
'Elimina una póliza completamente incluyendo:
- Registro principal de la póliza
- Pagos y comprobantes asociados
- Documentos (registros y archivos físicos de Storage)
- Vehículos (si es automotor)
- Historial completo de ediciones
IMPORTANTE: No puede eliminar pólizas con siniestros asociados (ON DELETE RESTRICT).
Retorna información detallada de lo eliminado.';

COMMENT ON FUNCTION eliminar_poliza_por_numero(TEXT) IS
'Wrapper de eliminar_poliza_completo que permite eliminar por número de póliza.
Ejemplo: SELECT * FROM eliminar_poliza_por_numero(''POL-123'');';

COMMENT ON FUNCTION puede_eliminar_poliza(UUID) IS
'Verifica si una póliza puede eliminarse antes de intentar la eliminación.
Retorna si puede eliminar y razones por las que no podría.
Útil para validaciones previas en la UI.';

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Ejemplo 1: Verificar primero si se puede eliminar
-- SELECT * FROM puede_eliminar_poliza('uuid-de-poliza');

-- Ejemplo 2: Eliminar por ID (UUID)
-- SELECT * FROM eliminar_poliza_completo('uuid-de-poliza');

-- Ejemplo 3: Eliminar por número de póliza
-- SELECT * FROM eliminar_poliza_por_numero('POL-123');

-- Ejemplo 4: Ver detalles antes de eliminar
-- SELECT
--   p.numero_poliza,
--   p.ramo,
--   p.estado,
--   (SELECT COUNT(*) FROM polizas_pagos WHERE poliza_id = p.id) as pagos,
--   (SELECT COUNT(*) FROM polizas_documentos WHERE poliza_id = p.id) as docs,
--   (SELECT COUNT(*) FROM siniestros WHERE poliza_id = p.id) as siniestros
-- FROM polizas p
-- WHERE p.numero_poliza = 'POL-123';
