-- ============================================
-- MIGRATION: Funciones Nucleares de Eliminación
-- ============================================
-- Ejecutar manualmente en Supabase SQL Editor
-- Crea 4 funciones para eliminar pólizas y siniestros completamente
--
-- IMPORTANTE: Los archivos de Storage NO se borran desde SQL.
-- Supabase bloquea DELETE directo de storage.objects.
-- Las rutas de archivos se retornan en el JSON para que
-- el server action las borre via Storage API.
-- ============================================

-- Limpiar versiones anteriores
DROP FUNCTION IF EXISTS eliminar_siniestro_completo(UUID);
DROP FUNCTION IF EXISTS eliminar_poliza_completo(UUID, UUID);
DROP FUNCTION IF EXISTS eliminar_poliza_por_numero(TEXT, UUID);
DROP FUNCTION IF EXISTS puede_eliminar_poliza(UUID);
DROP FUNCTION IF EXISTS puede_eliminar_poliza_v2(UUID);

-- ============================================
-- 1. FUNCIÓN: Eliminar Siniestro Completo
-- ============================================
-- Elimina un siniestro y todas sus dependencias
-- Retorna rutas de archivos de Storage para borrado via API
-- ============================================

CREATE OR REPLACE FUNCTION eliminar_siniestro_completo(
  p_siniestro_id UUID
)
RETURNS TABLE (
  eliminado BOOLEAN,
  mensaje TEXT,
  detalles JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero_siniestro TEXT;
  v_poliza_id UUID;
  v_coberturas INTEGER := 0;
  v_documentos INTEGER := 0;
  v_observaciones INTEGER := 0;
  v_historial INTEGER := 0;
  v_estados_historial INTEGER := 0;
  v_archivos_storage JSONB := '[]'::JSONB;
  v_count INTEGER;
BEGIN
  -- Verificar que existe
  SELECT id, poliza_id INTO v_poliza_id
  FROM siniestros
  WHERE id = p_siniestro_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Siniestro no encontrado'::TEXT,
      jsonb_build_object('error', 'ID de siniestro no existe');
    RETURN;
  END IF;

  -- Recolectar rutas de archivos de Storage
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'bucket', 'siniestros-documentos',
    'path', archivo_url
  )), '[]'::JSONB)
  INTO v_archivos_storage
  FROM siniestros_documentos
  WHERE siniestro_id = p_siniestro_id
    AND archivo_url IS NOT NULL;

  -- Eliminar coberturas
  BEGIN
    DELETE FROM siniestros_coberturas WHERE siniestro_id = p_siniestro_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_coberturas := v_count;
  EXCEPTION WHEN undefined_table THEN v_coberturas := 0;
  END;

  -- Eliminar documentos (registros BD)
  BEGIN
    DELETE FROM siniestros_documentos WHERE siniestro_id = p_siniestro_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_documentos := v_count;
  EXCEPTION WHEN undefined_table THEN v_documentos := 0;
  END;

  -- Eliminar observaciones
  BEGIN
    DELETE FROM siniestros_observaciones WHERE siniestro_id = p_siniestro_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_observaciones := v_count;
  EXCEPTION WHEN undefined_table THEN v_observaciones := 0;
  END;

  -- Eliminar historial
  BEGIN
    DELETE FROM siniestros_historial WHERE siniestro_id = p_siniestro_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_historial := v_count;
  EXCEPTION WHEN undefined_table THEN v_historial := 0;
  END;

  -- Eliminar estados historial
  BEGIN
    DELETE FROM siniestros_estados_historial WHERE siniestro_id = p_siniestro_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_estados_historial := v_count;
  EXCEPTION WHEN undefined_table THEN v_estados_historial := 0;
  END;

  -- Eliminar siniestro principal
  DELETE FROM siniestros WHERE id = p_siniestro_id;

  RETURN QUERY SELECT
    true::BOOLEAN,
    'Siniestro eliminado correctamente'::TEXT,
    jsonb_build_object(
      'siniestro_id', p_siniestro_id,
      'coberturas_eliminadas', v_coberturas,
      'documentos_eliminados', v_documentos,
      'observaciones_eliminadas', v_observaciones,
      'historial_eliminado', v_historial,
      'estados_historial_eliminados', v_estados_historial,
      'archivos_storage', v_archivos_storage
    );

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      format('Error al eliminar siniestro: %s', SQLERRM)::TEXT,
      jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

-- ============================================
-- 2. FUNCIÓN: Eliminar Póliza Completo (Nuclear)
-- ============================================
-- Elimina una póliza con TODAS sus dependencias:
--   - Siniestros (y sus hijos)
--   - Anexos (y sus 10 tablas hijas)
--   - Pagos + comprobantes
--   - Documentos
--   - Datos específicos de todos los ramos
--   - Historial de ediciones
-- Retorna rutas de archivos de Storage para borrado via API
-- ============================================

CREATE OR REPLACE FUNCTION eliminar_poliza_completo(
  p_poliza_id UUID,
  p_usuario_id UUID DEFAULT NULL
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
  v_estado TEXT;
  v_count INTEGER;
  -- Contadores
  v_siniestros INTEGER := 0;
  v_anexos INTEGER := 0;
  v_anexos_items INTEGER := 0;
  v_pagos INTEGER := 0;
  v_comprobantes INTEGER := 0;
  v_documentos INTEGER := 0;
  v_historial INTEGER := 0;
  v_vehiculos INTEGER := 0;
  v_salud_asegurados INTEGER := 0;
  v_salud_beneficiarios INTEGER := 0;
  v_salud_niveles INTEGER := 0;
  v_incendio_bienes INTEGER := 0;
  v_incendio_items INTEGER := 0;
  v_incendio_asegurados INTEGER := 0;
  v_rv_bienes INTEGER := 0;
  v_rv_items INTEGER := 0;
  v_rv_asegurados INTEGER := 0;
  v_rc INTEGER := 0;
  v_niveles INTEGER := 0;
  v_asegurados_nivel INTEGER := 0;
  v_beneficiarios INTEGER := 0;
  v_transporte INTEGER := 0;
  v_ramos_tecnicos INTEGER := 0;
  v_aero_niveles INTEGER := 0;
  v_aero_naves INTEGER := 0;
  v_aero_asegurados INTEGER := 0;
  v_edit_permissions INTEGER := 0;
  -- Storage
  v_archivos_storage JSONB := '[]'::JSONB;
  v_temp_archivos JSONB;
  -- Siniestros
  v_siniestro RECORD;
  v_siniestro_result RECORD;
  v_siniestros_archivos JSONB := '[]'::JSONB;
BEGIN
  -- ============================================
  -- PASO 0: VERIFICAR QUE LA PÓLIZA EXISTE
  -- ============================================
  SELECT numero_poliza, ramo, estado
  INTO v_numero_poliza, v_ramo, v_estado
  FROM polizas
  WHERE id = p_poliza_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Póliza no encontrada'::TEXT, 0,
      jsonb_build_object('error', 'ID de póliza no existe');
    RETURN;
  END IF;

  -- ============================================
  -- FASE 1: ELIMINAR SINIESTROS (ON DELETE RESTRICT)
  -- ============================================
  BEGIN
    FOR v_siniestro IN
      SELECT id FROM siniestros WHERE poliza_id = p_poliza_id
    LOOP
      SELECT * INTO v_siniestro_result
      FROM eliminar_siniestro_completo(v_siniestro.id);

      IF NOT v_siniestro_result.eliminado THEN
        RAISE EXCEPTION 'Error eliminando siniestro %: %',
          v_siniestro.id, v_siniestro_result.mensaje;
      END IF;

      v_siniestros := v_siniestros + 1;

      -- Acumular archivos de storage de siniestros
      v_siniestros_archivos := v_siniestros_archivos ||
        COALESCE((v_siniestro_result.detalles->>'archivos_storage')::JSONB, '[]'::JSONB);
    END LOOP;
  EXCEPTION WHEN undefined_table THEN
    v_siniestros := 0;
  END;

  -- ============================================
  -- FASE 2: ELIMINAR ANEXOS (ON DELETE RESTRICT)
  -- ============================================

  -- 2a. Recolectar archivos de documentos de anexos
  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'bucket', 'polizas-documentos',
      'path', ad.archivo_url
    )), '[]'::JSONB)
    INTO v_temp_archivos
    FROM polizas_anexos_documentos ad
    INNER JOIN polizas_anexos a ON ad.anexo_id = a.id
    WHERE a.poliza_id = p_poliza_id
      AND ad.archivo_url IS NOT NULL;

    v_archivos_storage := v_archivos_storage || COALESCE(v_temp_archivos, '[]'::JSONB);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 2b. Eliminar tablas hijas de anexos (CASCADE desde anexo_id,
  --      pero explícito para contar y por si acaso)
  BEGIN
    DELETE FROM polizas_anexos_automotor_vehiculos
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_salud_asegurados
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_salud_beneficiarios
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_ramos_tecnicos_equipos
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_aeronavegacion_naves
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_incendio_bienes
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_riesgos_varios_bienes
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_asegurados_nivel
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_beneficiarios
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_documentos
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM polizas_anexos_pagos
    WHERE anexo_id IN (SELECT id FROM polizas_anexos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos_items := v_anexos_items + v_count;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 2c. Eliminar anexos principales
  BEGIN
    DELETE FROM polizas_anexos WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_anexos := v_count;
  EXCEPTION WHEN undefined_table THEN v_anexos := 0;
  END;

  -- ============================================
  -- FASE 3: ELIMINAR HIJOS DIRECTOS DE LA PÓLIZA
  -- ============================================

  -- 3a. Recolectar archivos de comprobantes de pagos
  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'bucket', 'pagos-comprobantes',
      'path', c.archivo_url
    )), '[]'::JSONB)
    INTO v_temp_archivos
    FROM polizas_pagos_comprobantes c
    INNER JOIN polizas_pagos p ON c.pago_id = p.id
    WHERE p.poliza_id = p_poliza_id
      AND c.archivo_url IS NOT NULL;

    v_archivos_storage := v_archivos_storage || COALESCE(v_temp_archivos, '[]'::JSONB);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 3b. Recolectar archivos de documentos de póliza
  BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'bucket', 'polizas-documentos',
      'path', archivo_url
    )), '[]'::JSONB)
    INTO v_temp_archivos
    FROM polizas_documentos
    WHERE poliza_id = p_poliza_id
      AND archivo_url IS NOT NULL;

    v_archivos_storage := v_archivos_storage || COALESCE(v_temp_archivos, '[]'::JSONB);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- 3c. Nietos primero (depth 2)

  -- Comprobantes de pagos
  BEGIN
    DELETE FROM polizas_pagos_comprobantes
    WHERE pago_id IN (SELECT id FROM polizas_pagos WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_comprobantes := v_count;
  EXCEPTION WHEN undefined_table THEN v_comprobantes := 0;
  END;

  -- Items de incendio (hijo de polizas_incendio_bienes)
  BEGIN
    DELETE FROM polizas_incendio_items
    WHERE bien_id IN (SELECT id FROM polizas_incendio_bienes WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_incendio_items := v_count;
  EXCEPTION WHEN undefined_table THEN v_incendio_items := 0;
  END;

  -- Items de riesgos varios (hijo de polizas_riesgos_varios_bienes)
  BEGIN
    DELETE FROM polizas_riesgos_varios_items
    WHERE bien_id IN (SELECT id FROM polizas_riesgos_varios_bienes WHERE poliza_id = p_poliza_id);
    GET DIAGNOSTICS v_count = ROW_COUNT; v_rv_items := v_count;
  EXCEPTION WHEN undefined_table THEN v_rv_items := 0;
  END;

  -- Asegurados por nivel (hijo de polizas_niveles)
  BEGIN
    DELETE FROM polizas_asegurados_nivel WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_asegurados_nivel := v_count;
  EXCEPTION WHEN undefined_table THEN v_asegurados_nivel := 0;
  END;

  -- Beneficiarios genéricos (Vida, AP, Sepelio - hijo de polizas_niveles)
  BEGIN
    DELETE FROM polizas_beneficiarios WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_beneficiarios := v_count;
  EXCEPTION WHEN undefined_table THEN v_beneficiarios := 0;
  END;

  -- Naves de aeronavegación (tiene FK a polizas_aeronavegacion_niveles_ap)
  BEGIN
    DELETE FROM polizas_aeronavegacion_naves WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_aero_naves := v_count;
  EXCEPTION WHEN undefined_table THEN v_aero_naves := 0;
  END;

  -- 3d. Hijos directos (depth 1)

  -- Historial de ediciones (primero para evitar triggers)
  BEGIN
    DELETE FROM polizas_historial_ediciones WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_historial := v_count;
  EXCEPTION WHEN undefined_table THEN v_historial := 0;
  END;

  -- Pagos
  BEGIN
    DELETE FROM polizas_pagos WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_pagos := v_count;
  EXCEPTION WHEN undefined_table THEN v_pagos := 0;
  END;

  -- Documentos
  BEGIN
    DELETE FROM polizas_documentos WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_documentos := v_count;
  EXCEPTION WHEN undefined_table THEN v_documentos := 0;
  END;

  -- Vehículos automotor
  BEGIN
    DELETE FROM polizas_automotor_vehiculos WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_vehiculos := v_count;
  EXCEPTION WHEN undefined_table THEN v_vehiculos := 0;
  END;

  -- Salud asegurados
  BEGIN
    DELETE FROM polizas_salud_asegurados WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_salud_asegurados := v_count;
  EXCEPTION WHEN undefined_table THEN v_salud_asegurados := 0;
  END;

  -- Salud beneficiarios
  BEGIN
    DELETE FROM polizas_salud_beneficiarios WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_salud_beneficiarios := v_count;
  EXCEPTION WHEN undefined_table THEN v_salud_beneficiarios := 0;
  END;

  -- Salud niveles
  BEGIN
    DELETE FROM polizas_salud_niveles WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_salud_niveles := v_count;
  EXCEPTION WHEN undefined_table THEN v_salud_niveles := 0;
  END;

  -- Incendio bienes
  BEGIN
    DELETE FROM polizas_incendio_bienes WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_incendio_bienes := v_count;
  EXCEPTION WHEN undefined_table THEN v_incendio_bienes := 0;
  END;

  -- Incendio asegurados
  BEGIN
    DELETE FROM polizas_incendio_asegurados WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_incendio_asegurados := v_count;
  EXCEPTION WHEN undefined_table THEN v_incendio_asegurados := 0;
  END;

  -- Riesgos varios bienes
  BEGIN
    DELETE FROM polizas_riesgos_varios_bienes WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_rv_bienes := v_count;
  EXCEPTION WHEN undefined_table THEN v_rv_bienes := 0;
  END;

  -- Riesgos varios asegurados
  BEGIN
    DELETE FROM polizas_riesgos_varios_asegurados WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_rv_asegurados := v_count;
  EXCEPTION WHEN undefined_table THEN v_rv_asegurados := 0;
  END;

  -- Responsabilidad civil
  BEGIN
    DELETE FROM polizas_responsabilidad_civil WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_rc := v_count;
  EXCEPTION WHEN undefined_table THEN v_rc := 0;
  END;

  -- Niveles genéricos (después de asegurados_nivel)
  BEGIN
    DELETE FROM polizas_niveles WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_niveles := v_count;
  EXCEPTION WHEN undefined_table THEN v_niveles := 0;
  END;

  -- Transporte
  BEGIN
    DELETE FROM polizas_transporte WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_transporte := v_count;
  EXCEPTION WHEN undefined_table THEN v_transporte := 0;
  END;

  -- Ramos técnicos equipos
  BEGIN
    DELETE FROM polizas_ramos_tecnicos_equipos WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_ramos_tecnicos := v_count;
  EXCEPTION WHEN undefined_table THEN v_ramos_tecnicos := 0;
  END;

  -- Aeronavegación niveles AP (después de naves)
  BEGIN
    DELETE FROM polizas_aeronavegacion_niveles_ap WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_aero_niveles := v_count;
  EXCEPTION WHEN undefined_table THEN v_aero_niveles := 0;
  END;

  -- Aeronavegación asegurados
  BEGIN
    DELETE FROM polizas_aeronavegacion_asegurados WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_aero_asegurados := v_count;
  EXCEPTION WHEN undefined_table THEN v_aero_asegurados := 0;
  END;

  -- Permisos de edición de póliza
  BEGIN
    DELETE FROM policy_edit_permissions WHERE poliza_id = p_poliza_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_edit_permissions := v_count;
  EXCEPTION WHEN undefined_table THEN v_edit_permissions := 0;
  END;

  -- ============================================
  -- FASE 4: ELIMINAR PÓLIZA PRINCIPAL
  -- ============================================
  DELETE FROM polizas WHERE id = p_poliza_id;

  -- ============================================
  -- FASE 5: RETORNAR REPORTE
  -- ============================================

  -- Combinar todos los archivos de storage
  v_archivos_storage := v_archivos_storage || v_siniestros_archivos;

  RETURN QUERY SELECT
    true::BOOLEAN,
    format('Póliza %s eliminada completamente', v_numero_poliza)::TEXT,
    (jsonb_array_length(v_archivos_storage))::INTEGER,
    jsonb_build_object(
      'poliza_id', p_poliza_id,
      'numero_poliza', v_numero_poliza,
      'ramo', v_ramo,
      'estado_anterior', v_estado,
      -- Conteos por categoría
      'siniestros_eliminados', v_siniestros,
      'anexos_eliminados', v_anexos,
      'anexos_items_eliminados', v_anexos_items,
      'pagos_eliminados', v_pagos,
      'comprobantes_eliminados', v_comprobantes,
      'documentos_eliminados', v_documentos,
      'historial_eliminado', v_historial,
      'vehiculos_eliminados', v_vehiculos,
      'salud_asegurados', v_salud_asegurados,
      'salud_beneficiarios', v_salud_beneficiarios,
      'salud_niveles', v_salud_niveles,
      'incendio_bienes', v_incendio_bienes,
      'incendio_items', v_incendio_items,
      'incendio_asegurados', v_incendio_asegurados,
      'riesgos_varios_bienes', v_rv_bienes,
      'riesgos_varios_items', v_rv_items,
      'riesgos_varios_asegurados', v_rv_asegurados,
      'responsabilidad_civil', v_rc,
      'niveles', v_niveles,
      'asegurados_nivel', v_asegurados_nivel,
      'beneficiarios', v_beneficiarios,
      'transporte', v_transporte,
      'ramos_tecnicos_equipos', v_ramos_tecnicos,
      'aeronavegacion_niveles_ap', v_aero_niveles,
      'aeronavegacion_naves', v_aero_naves,
      'aeronavegacion_asegurados', v_aero_asegurados,
      'permisos_edicion', v_edit_permissions,
      -- Archivos de Storage para borrado via API
      'archivos_storage', v_archivos_storage
    );

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      format('Error al eliminar póliza: %s', SQLERRM)::TEXT,
      0::INTEGER,
      jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

-- ============================================
-- 3. FUNCIÓN: Eliminar por Número de Póliza
-- ============================================

CREATE OR REPLACE FUNCTION eliminar_poliza_por_numero(
  p_numero_poliza TEXT,
  p_usuario_id UUID DEFAULT NULL
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
  SELECT id INTO v_poliza_id
  FROM polizas
  WHERE numero_poliza = p_numero_poliza;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false,
      format('Póliza con número %s no encontrada', p_numero_poliza)::TEXT,
      0, jsonb_build_object('error', 'Número de póliza no existe');
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM eliminar_poliza_completo(v_poliza_id, p_usuario_id);
END;
$$;

-- ============================================
-- 4. FUNCIÓN: Vista Previa del Impacto
-- ============================================
-- Muestra TODO lo que se va a eliminar sin borrar nada
-- Útil para revisar antes de ejecutar la eliminación

CREATE OR REPLACE FUNCTION puede_eliminar_poliza_v2(
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
  v_ramo TEXT;
  v_estado TEXT;
  v_count INTEGER;
  v_result JSONB := '{}'::JSONB;
BEGIN
  -- Verificar que existe
  SELECT numero_poliza, ramo, estado
  INTO v_numero_poliza, v_ramo, v_estado
  FROM polizas
  WHERE id = p_poliza_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Póliza no encontrada'::TEXT,
      jsonb_build_object('error', 'ID no existe');
    RETURN;
  END IF;

  v_result := jsonb_build_object(
    'numero_poliza', v_numero_poliza,
    'ramo', v_ramo,
    'estado', v_estado
  );

  -- Contar en cada tabla (con manejo de tablas inexistentes)

  -- Siniestros
  BEGIN
    SELECT COUNT(*) INTO v_count FROM siniestros WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('siniestros', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('siniestros', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM siniestros_documentos sd
    INNER JOIN siniestros s ON sd.siniestro_id = s.id WHERE s.poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('siniestros_documentos', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('siniestros_documentos', 0);
  END;

  -- Anexos
  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_anexos WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('anexos', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('anexos', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_anexos_documentos ad
    INNER JOIN polizas_anexos a ON ad.anexo_id = a.id WHERE a.poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('anexos_documentos', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('anexos_documentos', 0);
  END;

  -- Pagos y comprobantes
  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_pagos WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('pagos', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('pagos', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_pagos_comprobantes c
    INNER JOIN polizas_pagos p ON c.pago_id = p.id WHERE p.poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('comprobantes', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('comprobantes', 0);
  END;

  -- Documentos
  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_documentos WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('documentos', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('documentos', 0);
  END;

  -- Historial
  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_historial_ediciones WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('historial', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('historial', 0);
  END;

  -- Ramo-specific
  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_automotor_vehiculos WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('vehiculos', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('vehiculos', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_salud_asegurados WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('salud_asegurados', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('salud_asegurados', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_salud_beneficiarios WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('salud_beneficiarios', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('salud_beneficiarios', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_salud_niveles WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('salud_niveles', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('salud_niveles', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_incendio_bienes WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('incendio_bienes', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('incendio_bienes', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_riesgos_varios_bienes WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('riesgos_varios_bienes', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('riesgos_varios_bienes', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_responsabilidad_civil WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('responsabilidad_civil', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('responsabilidad_civil', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_niveles WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('niveles', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('niveles', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_beneficiarios WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('beneficiarios', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('beneficiarios', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_transporte WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('transporte', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('transporte', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_ramos_tecnicos_equipos WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('ramos_tecnicos_equipos', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('ramos_tecnicos_equipos', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_aeronavegacion_naves WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('aeronavegacion_naves', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('aeronavegacion_naves', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM polizas_aeronavegacion_asegurados WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('aeronavegacion_asegurados', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('aeronavegacion_asegurados', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM policy_edit_permissions WHERE poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('permisos_edicion', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('permisos_edicion', 0);
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM siniestros_estados_historial seh
    INNER JOIN siniestros s ON seh.siniestro_id = s.id WHERE s.poliza_id = p_poliza_id;
    v_result := v_result || jsonb_build_object('siniestros_estados_historial', v_count);
  EXCEPTION WHEN undefined_table THEN
    v_result := v_result || jsonb_build_object('siniestros_estados_historial', 0);
  END;

  v_result := v_result || jsonb_build_object(
    'advertencia', 'OPERACION IRREVERSIBLE - se eliminarán todos los registros listados y sus archivos de Storage'
  );

  RETURN QUERY SELECT
    true::BOOLEAN,
    format('Póliza %s (%s) - Vista previa de eliminación nuclear', v_numero_poliza, v_ramo)::TEXT,
    v_result;
END;
$$;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION eliminar_siniestro_completo(UUID) IS
'Elimina un siniestro COMPLETAMENTE incluyendo coberturas, documentos,
observaciones e historial. Retorna rutas de archivos de Storage en
detalles.archivos_storage para borrado via Storage API.';

COMMENT ON FUNCTION eliminar_poliza_completo(UUID, UUID) IS
'ELIMINACIÓN NUCLEAR: Borra una póliza y ABSOLUTAMENTE TODO lo relacionado:
- Siniestros (y sus hijos)
- Anexos (y sus 10 tablas hijas)
- Pagos y comprobantes
- Documentos
- Datos específicos de TODOS los ramos (automotor, salud, incendio, etc.)
- Historial de ediciones
Retorna rutas de archivos de Storage en detalles.archivos_storage
para borrado via Storage API (Supabase no permite DELETE directo de storage.objects).
OPERACIÓN IRREVERSIBLE.';

COMMENT ON FUNCTION eliminar_poliza_por_numero(TEXT, UUID) IS
'Wrapper de eliminar_poliza_completo que busca por número de póliza.
Ejemplo: SELECT * FROM eliminar_poliza_por_numero(''POL-123'');';

COMMENT ON FUNCTION puede_eliminar_poliza_v2(UUID) IS
'Muestra conteo detallado de TODOS los registros que serán eliminados
al ejecutar eliminar_poliza_completo(). No borra nada, solo informativo.';

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- 1. Ver impacto antes de eliminar:
-- SELECT * FROM puede_eliminar_poliza_v2('uuid-de-poliza');

-- 2. Eliminar por UUID (los archivos de Storage se deben borrar via server action):
-- SELECT * FROM eliminar_poliza_completo('uuid-de-poliza');

-- 3. Eliminar por número de póliza:
-- SELECT * FROM eliminar_poliza_por_numero('POL-001');

-- 4. Eliminar un siniestro suelto:
-- SELECT * FROM eliminar_siniestro_completo('uuid-del-siniestro');
