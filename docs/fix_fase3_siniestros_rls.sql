-- ============================================================================
-- FIX: Correccion RLS Fase 3 - Siniestros no debe estar en user_needs_data_scoping
--
-- Problema: user_needs_data_scoping() incluia 'siniestros', lo cual hacia que
-- las tablas de polizas, clients, natural_clients, juridic_clients, unipersonal_clients
-- estuvieran scoped para usuarios con rol siniestros. Esto impedia que pudieran
-- buscar polizas/clientes al crear un siniestro.
--
-- Solucion:
-- 1. Revertir user_needs_data_scoping() a solo agente/comercial
-- 2. Actualizar RLS de tablas dependientes de siniestros para usar checks
--    explicitos por rol en lugar de user_needs_data_scoping()
-- ============================================================================

-- PASO 0: Permitir que rol siniestros vea perfiles de otros usuarios
-- (necesario para dropdown de responsables y para ver nombres en vistas)
CREATE POLICY "siniestros_select_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'siniestros'::text)
    AND (role = ANY (ARRAY['admin'::text, 'usuario'::text, 'comercial'::text, 'agente'::text, 'siniestros'::text]))
  );

-- PASO 1: Revertir user_needs_data_scoping a solo agente/comercial
CREATE OR REPLACE FUNCTION user_needs_data_scoping(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND role IN ('agente', 'comercial')
  );
$$;

-- ============================================================================
-- PASO 2: Actualizar RLS tablas dependientes de siniestros
-- Reemplazar NOT user_needs_data_scoping() con check explicito de roles
-- que NO necesitan scoping (admin, usuario, cobranza)
-- Esto mantiene el scoping para siniestros, comercial y agente en estas tablas
-- ============================================================================

-- --- siniestros_documentos ---
DROP POLICY IF EXISTS "siniestros_documentos_select_scoped" ON siniestros_documentos;

CREATE POLICY "siniestros_documentos_select_scoped" ON siniestros_documentos
  FOR SELECT TO authenticated
  USING (
    -- Condicion de estado
    ((estado)::text = 'activo'::text OR estado IS NULL)
    AND
    (
      -- Admin, usuario, cobranza: ven todo
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'usuario', 'cobranza'))
      -- Roles scoped: verifican acceso via siniestro padre
      OR EXISTS (
        SELECT 1 FROM siniestros si
        WHERE si.id = siniestros_documentos.siniestro_id
        AND (
          (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siniestros')
           AND si.responsable_id = ANY(get_team_member_ids(auth.uid())))
          OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('comercial', 'agente'))
              AND EXISTS (SELECT 1 FROM polizas p WHERE p.id = si.poliza_id
                          AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))))
        )
      )
    )
  );

-- --- siniestros_observaciones ---
DROP POLICY IF EXISTS "siniestros_observaciones_select_scoped" ON siniestros_observaciones;

CREATE POLICY "siniestros_observaciones_select_scoped" ON siniestros_observaciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'usuario', 'cobranza'))
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_observaciones.siniestro_id
      AND (
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siniestros')
         AND si.responsable_id = ANY(get_team_member_ids(auth.uid())))
        OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('comercial', 'agente'))
            AND EXISTS (SELECT 1 FROM polizas p WHERE p.id = si.poliza_id
                        AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))))
      )
    )
  );

-- --- siniestros_coberturas ---
DROP POLICY IF EXISTS "siniestros_coberturas_select_scoped" ON siniestros_coberturas;

CREATE POLICY "siniestros_coberturas_select_scoped" ON siniestros_coberturas
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'usuario', 'cobranza'))
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_coberturas.siniestro_id
      AND (
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siniestros')
         AND si.responsable_id = ANY(get_team_member_ids(auth.uid())))
        OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('comercial', 'agente'))
            AND EXISTS (SELECT 1 FROM polizas p WHERE p.id = si.poliza_id
                        AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))))
      )
    )
  );

-- --- siniestros_historial ---
DROP POLICY IF EXISTS "siniestros_historial_select_scoped" ON siniestros_historial;

CREATE POLICY "siniestros_historial_select_scoped" ON siniestros_historial
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'usuario', 'cobranza'))
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_historial.siniestro_id
      AND (
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siniestros')
         AND si.responsable_id = ANY(get_team_member_ids(auth.uid())))
        OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('comercial', 'agente'))
            AND EXISTS (SELECT 1 FROM polizas p WHERE p.id = si.poliza_id
                        AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))))
      )
    )
  );

-- --- siniestros_estados_historial ---
DROP POLICY IF EXISTS "siniestros_estados_historial_select_scoped" ON siniestros_estados_historial;

CREATE POLICY "siniestros_estados_historial_select_scoped" ON siniestros_estados_historial
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'usuario', 'cobranza'))
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_estados_historial.siniestro_id
      AND (
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siniestros')
         AND si.responsable_id = ANY(get_team_member_ids(auth.uid())))
        OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('comercial', 'agente'))
            AND EXISTS (SELECT 1 FROM polizas p WHERE p.id = si.poliza_id
                        AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))))
      )
    )
  );

-- ============================================================================
-- PASO 3: Actualizar siniestros_vista para incluir unipersonal_clients
-- La vista original solo joinea natural_clients y juridic_clients
-- ============================================================================

-- Primero DROP la vista dependiente
DROP VIEW IF EXISTS siniestros_con_estado_actual;
DROP VIEW IF EXISTS siniestros_vista;

CREATE VIEW siniestros_vista AS
SELECT
    s.id,
    s.poliza_id,
    s.codigo_siniestro,
    s.fecha_siniestro,
    s.fecha_reporte,
    s.fecha_reporte_compania,
    s.lugar_hecho,
    s.departamento_id,
    s.monto_reserva,
    s.moneda,
    s.descripcion,
    s.contactos,
    s.responsable_id,
    s.estado,
    s.created_at,
    s.updated_at,
    s.created_by,
    s.updated_by,
    p.numero_poliza,
    p.ramo,
    p.inicio_vigencia AS poliza_inicio_vigencia,
    p.fin_vigencia AS poliza_fin_vigencia,
    p.responsable_id AS poliza_responsable_id,
    CASE
        WHEN (c.client_type)::text = 'natural'::text THEN TRIM(BOTH FROM (
            COALESCE(nc.primer_nombre, '')::text || ' ' ||
            COALESCE(nc.segundo_nombre, '')::text || ' ' ||
            COALESCE(nc.primer_apellido, '')::text || ' ' ||
            COALESCE(nc.segundo_apellido, '')::text
        ))
        WHEN (c.client_type)::text = 'juridica'::text THEN jc.razon_social::text
        WHEN (c.client_type)::text = 'unipersonal'::text THEN uc.razon_social::text
        ELSE 'Desconocido'::text
    END AS cliente_nombre,
    CASE
        WHEN (c.client_type)::text = 'natural'::text THEN nc.numero_documento
        WHEN (c.client_type)::text = 'juridica'::text THEN jc.nit
        WHEN (c.client_type)::text = 'unipersonal'::text THEN uc.nit
        ELSE NULL::character varying
    END AS cliente_documento,
    c.client_type AS cliente_tipo,
    nc.celular AS cliente_celular,
    COALESCE(nc.correo_electronico, jc.correo_electronico, uc.correo_electronico_comercial) AS cliente_correo,
    resp.full_name AS responsable_nombre,
    resp.email AS responsable_email,
    comp.nombre AS compania_nombre,
    comp.id AS compania_id,
    reg.nombre AS departamento_nombre,
    reg.codigo AS departamento_codigo,
    resp_poliza.full_name AS poliza_responsable_nombre,
    creador.full_name AS creado_por_nombre,
    s.created_at AS fecha_creacion,
    cerrador.full_name AS cerrado_por_nombre,
    (SELECT count(*) FROM siniestros_documentos sd
     WHERE sd.siniestro_id = s.id AND (sd.estado)::text = 'activo'::text) AS total_documentos,
    (SELECT count(*) FROM siniestros_observaciones so
     WHERE so.siniestro_id = s.id) AS total_observaciones,
    (SELECT count(*) FROM siniestros_coberturas sc
     WHERE sc.siniestro_id = s.id) AS total_coberturas,
    s.motivo_cierre_tipo,
    s.fecha_cierre,
    s.cerrado_por,
    s.motivo_rechazo,
    s.motivo_declinacion,
    s.monto_reclamado,
    s.moneda_reclamado,
    s.deducible,
    s.moneda_deducible,
    s.monto_pagado,
    s.moneda_pagado,
    s.es_pago_comercial,
    s.fecha_llegada_repuestos
FROM siniestros s
    JOIN polizas p ON s.poliza_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN natural_clients nc ON c.id = nc.client_id AND (c.client_type)::text = 'natural'::text
    LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND (c.client_type)::text = 'juridica'::text
    LEFT JOIN unipersonal_clients uc ON c.id = uc.client_id AND (c.client_type)::text = 'unipersonal'::text
    LEFT JOIN profiles resp ON s.responsable_id = resp.id
    LEFT JOIN profiles resp_poliza ON p.responsable_id = resp_poliza.id
    LEFT JOIN companias_aseguradoras comp ON p.compania_aseguradora_id = comp.id
    LEFT JOIN regionales reg ON s.departamento_id = reg.id
    LEFT JOIN profiles creador ON s.created_by = creador.id
    LEFT JOIN profiles cerrador ON s.cerrado_por = cerrador.id;

-- Recrear vista dependiente
CREATE VIEW siniestros_con_estado_actual AS
SELECT
    sv.*,
    seh.estado_id AS estado_actual_id,
    sec.nombre AS estado_actual_nombre,
    sec.codigo AS estado_actual_codigo,
    seh.created_at AS estado_actual_fecha,
    seh.observacion AS estado_actual_observacion,
    CASE
        WHEN sv.updated_at < (now() - '10 days'::interval) THEN true
        ELSE false
    END AS requiere_atencion
FROM siniestros_vista sv
    LEFT JOIN LATERAL (
        SELECT
            siniestros_estados_historial.estado_id,
            siniestros_estados_historial.created_at,
            siniestros_estados_historial.observacion
        FROM siniestros_estados_historial
        WHERE siniestros_estados_historial.siniestro_id = sv.id
        ORDER BY siniestros_estados_historial.created_at DESC
        LIMIT 1
    ) seh ON true
    LEFT JOIN siniestros_estados_catalogo sec ON seh.estado_id = sec.id;

-- ============================================================================
-- VERIFICACION
-- ============================================================================
-- SELECT user_needs_data_scoping('UUID_DE_USUARIO_SINIESTROS');
-- Esperado: FALSE (ya no esta scoped en esta funcion)
--
-- Probar busqueda de polizas con cuenta siniestros:
-- La busqueda ahora deberia encontrar polizas de clientes juridicos/unipersonales
