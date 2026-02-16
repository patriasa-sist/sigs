-- ============================================================================
-- FASE 3: Reglas de Negocio Avanzadas
-- Ejecutar DESPUES de migration_permissions_system.sql y migration_equipos_system.sql
-- ============================================================================

-- ============================================================================
-- PASO 1: Asegurar NOT NULL en campos de ownership
-- ============================================================================

-- Fallback: asignar cuenta maestra a registros huerfanos (si existieran)
UPDATE clients
SET executive_in_charge = '10ca4260-2fb6-44be-a14b-abaa47813388'
WHERE executive_in_charge IS NULL;

UPDATE siniestros
SET responsable_id = '10ca4260-2fb6-44be-a14b-abaa47813388'
WHERE responsable_id IS NULL;

-- Agregar NOT NULL constraints
-- polizas.responsable_id ya es NOT NULL
ALTER TABLE clients ALTER COLUMN executive_in_charge SET NOT NULL;
ALTER TABLE siniestros ALTER COLUMN responsable_id SET NOT NULL;

-- ============================================================================
-- PASO 2: Actualizar user_needs_data_scoping() para incluir siniestros
-- ============================================================================

CREATE OR REPLACE FUNCTION user_needs_data_scoping(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND role IN ('agente', 'comercial', 'siniestros')
  );
$$;

-- ============================================================================
-- PASO 3: Actualizar vista siniestros_vista con poliza_responsable_id
-- Debe hacerse DROP porque agregar columna en medio cambia el orden
-- ============================================================================

-- Primero DROP la vista dependiente
DROP VIEW IF EXISTS siniestros_con_estado_actual;
-- Luego DROP la vista base
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
    -- Campo nuevo para scoping de comerciales/agentes
    p.responsable_id AS poliza_responsable_id,
    CASE
        WHEN (c.client_type)::text = 'natural'::text THEN TRIM(BOTH FROM (
            COALESCE(nc.primer_nombre, '')::text || ' ' ||
            COALESCE(nc.segundo_nombre, '')::text || ' ' ||
            COALESCE(nc.primer_apellido, '')::text || ' ' ||
            COALESCE(nc.segundo_apellido, '')::text
        ))
        WHEN (c.client_type)::text = 'juridic'::text THEN jc.razon_social::text
        ELSE 'Desconocido'::text
    END AS cliente_nombre,
    CASE
        WHEN (c.client_type)::text = 'natural'::text THEN nc.numero_documento
        WHEN (c.client_type)::text = 'juridic'::text THEN jc.nit
        ELSE NULL::character varying
    END AS cliente_documento,
    c.client_type AS cliente_tipo,
    nc.celular AS cliente_celular,
    COALESCE(nc.correo_electronico, jc.correo_electronico) AS cliente_correo,
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
    LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND (c.client_type)::text = 'juridic'::text
    LEFT JOIN profiles resp ON s.responsable_id = resp.id
    LEFT JOIN profiles resp_poliza ON p.responsable_id = resp_poliza.id
    LEFT JOIN companias_aseguradoras comp ON p.compania_aseguradora_id = comp.id
    LEFT JOIN regionales reg ON s.departamento_id = reg.id
    LEFT JOIN profiles creador ON s.created_by = creador.id
    LEFT JOIN profiles cerrador ON s.cerrado_por = cerrador.id;

-- ============================================================================
-- PASO 4: Actualizar vista siniestros_con_estado_actual
-- (depende de siniestros_vista, debe recrearse despues)
-- ============================================================================

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
-- PASO 5: RLS siniestros - SELECT scoped por equipo
-- ============================================================================

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer siniestros" ON siniestros;

CREATE POLICY "siniestros_select_scoped" ON siniestros
  FOR SELECT TO authenticated
  USING (
    -- Admin, usuario, cobranza: ven todo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'usuario', 'cobranza')
    )
    -- Siniestros role: ve los suyos y los de su equipo (por siniestros.responsable_id)
    OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siniestros')
      AND responsable_id = ANY(get_team_member_ids(auth.uid()))
    )
    -- Comercial/agente: ve siniestros de polizas de su equipo
    OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('comercial', 'agente'))
      AND EXISTS (
        SELECT 1 FROM polizas p
        WHERE p.id = siniestros.poliza_id
        AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))
      )
    )
  );

-- ============================================================================
-- PASO 6: Actualizar RLS clients - remover clausula IS NULL
-- Solo admin/usuario/cobranza/siniestros ven todo, el resto scoped
-- ============================================================================

DROP POLICY IF EXISTS "clients_select_scoped" ON clients;

CREATE POLICY "clients_select_scoped" ON clients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'usuario', 'cobranza', 'siniestros')
    )
    OR executive_in_charge = ANY(get_team_member_ids(auth.uid()))
  );

-- ============================================================================
-- PASO 7: RLS tablas dependientes de clients
-- ============================================================================

-- --- natural_clients ---
DROP POLICY IF EXISTS "Allow authenticated users to manage natural clients" ON natural_clients;
DROP POLICY IF EXISTS "Allow authenticated users to view natural clients" ON natural_clients;
DROP POLICY IF EXISTS "cobranza_select_natural_clients" ON natural_clients;

CREATE POLICY "natural_clients_select_scoped" ON natural_clients
  FOR SELECT TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = natural_clients.client_id
      AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
    )
  );

CREATE POLICY "natural_clients_insert" ON natural_clients
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "natural_clients_update" ON natural_clients
  FOR UPDATE TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = natural_clients.client_id
      AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
    )
  );

CREATE POLICY "natural_clients_delete" ON natural_clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- --- juridic_clients ---
DROP POLICY IF EXISTS "Allow authenticated users to manage juridic clients" ON juridic_clients;
DROP POLICY IF EXISTS "Allow authenticated users to view juridic clients" ON juridic_clients;
DROP POLICY IF EXISTS "cobranza_select_juridic_clients" ON juridic_clients;

CREATE POLICY "juridic_clients_select_scoped" ON juridic_clients
  FOR SELECT TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = juridic_clients.client_id
      AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
    )
  );

CREATE POLICY "juridic_clients_insert" ON juridic_clients
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "juridic_clients_update" ON juridic_clients
  FOR UPDATE TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = juridic_clients.client_id
      AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
    )
  );

CREATE POLICY "juridic_clients_delete" ON juridic_clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- --- unipersonal_clients ---
DROP POLICY IF EXISTS "Authenticated users can view unipersonal clients" ON unipersonal_clients;
DROP POLICY IF EXISTS "Authenticated users can insert unipersonal clients" ON unipersonal_clients;
DROP POLICY IF EXISTS "Authenticated users can update unipersonal clients" ON unipersonal_clients;
DROP POLICY IF EXISTS "Only admins can delete unipersonal clients" ON unipersonal_clients;

CREATE POLICY "unipersonal_clients_select_scoped" ON unipersonal_clients
  FOR SELECT TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = unipersonal_clients.client_id
      AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
    )
  );

CREATE POLICY "unipersonal_clients_insert" ON unipersonal_clients
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "unipersonal_clients_update" ON unipersonal_clients
  FOR UPDATE TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = unipersonal_clients.client_id
      AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
    )
  );

CREATE POLICY "unipersonal_clients_delete" ON unipersonal_clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- --- clientes_documentos ---
DROP POLICY IF EXISTS "Authenticated users can view active client documents" ON clientes_documentos;
DROP POLICY IF EXISTS "Admins can view all client documents" ON clientes_documentos;

CREATE POLICY "clientes_documentos_select_scoped" ON clientes_documentos
  FOR SELECT TO authenticated
  USING (
    -- Condicion de estado: activos para todos, admin ve descartados tambien
    (
      (estado = 'activo')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    AND
    -- Condicion de scoping
    (
      NOT user_needs_data_scoping(auth.uid())
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = clientes_documentos.client_id
        AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
      )
    )
  );

-- --- clientes_historial_ediciones ---
DROP POLICY IF EXISTS "Admins can view client history" ON clientes_historial_ediciones;

CREATE POLICY "clientes_historial_select_scoped" ON clientes_historial_ediciones
  FOR SELECT TO authenticated
  USING (
    -- Admin ve todo el historial
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    -- Otros roles ven historial de sus clientes
    OR (
      NOT user_needs_data_scoping(auth.uid())
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = clientes_historial_ediciones.client_id
        AND c.executive_in_charge = ANY(get_team_member_ids(auth.uid()))
      )
    )
  );

-- ============================================================================
-- PASO 8: RLS tablas dependientes de polizas
-- ============================================================================

-- --- polizas_documentos ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos activos" ON polizas_documentos;

CREATE POLICY "polizas_documentos_select_scoped" ON polizas_documentos
  FOR SELECT TO authenticated
  USING (
    -- Condicion de estado
    (
      (estado = 'activo' OR estado IS NULL)
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    AND
    -- Condicion de scoping
    (
      NOT user_needs_data_scoping(auth.uid())
      OR EXISTS (
        SELECT 1 FROM polizas p
        WHERE p.id = polizas_documentos.poliza_id
        AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))
      )
    )
  );

-- --- siniestros_documentos (scoped como siniestros) ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer documentos activos de siniest" ON siniestros_documentos;

CREATE POLICY "siniestros_documentos_select_scoped" ON siniestros_documentos
  FOR SELECT TO authenticated
  USING (
    -- Condicion de estado
    ((estado)::text = 'activo'::text OR estado IS NULL)
    AND
    -- Condicion de scoping: heredada del siniestro padre
    (
      NOT user_needs_data_scoping(auth.uid())
      OR EXISTS (
        SELECT 1 FROM siniestros si
        WHERE si.id = siniestros_documentos.siniestro_id
        AND (
          -- Siniestros role: por responsable del siniestro
          (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'siniestros')
           AND si.responsable_id = ANY(get_team_member_ids(auth.uid())))
          -- Comercial/agente: por responsable de la poliza
          OR (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('comercial', 'agente'))
              AND EXISTS (SELECT 1 FROM polizas p WHERE p.id = si.poliza_id
                          AND p.responsable_id = ANY(get_team_member_ids(auth.uid()))))
        )
      )
    )
  );

-- --- siniestros_observaciones (scoped como siniestros) ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer observaciones" ON siniestros_observaciones;

CREATE POLICY "siniestros_observaciones_select_scoped" ON siniestros_observaciones
  FOR SELECT TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
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

-- --- siniestros_coberturas (scoped como siniestros) ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver coberturas de siniestros" ON siniestros_coberturas;

CREATE POLICY "siniestros_coberturas_select_scoped" ON siniestros_coberturas
  FOR SELECT TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
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

-- --- siniestros_historial (scoped como siniestros) ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer historial" ON siniestros_historial;

CREATE POLICY "siniestros_historial_select_scoped" ON siniestros_historial
  FOR SELECT TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
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

-- --- siniestros_estados_historial (scoped como siniestros) ---
DROP POLICY IF EXISTS "Authenticated users can read estados historial" ON siniestros_estados_historial;

CREATE POLICY "siniestros_estados_historial_select_scoped" ON siniestros_estados_historial
  FOR SELECT TO authenticated
  USING (
    NOT user_needs_data_scoping(auth.uid())
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
-- VERIFICACION: Ejecutar estas queries para validar
-- ============================================================================
-- SELECT policyname FROM pg_policies WHERE tablename = 'siniestros' AND cmd = 'SELECT';
-- -- Esperado: siniestros_select_scoped
--
-- SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND cmd = 'SELECT';
-- -- Esperado: clients_select_scoped (sin clausula IS NULL)
--
-- SELECT policyname FROM pg_policies WHERE tablename = 'natural_clients' AND cmd = 'SELECT';
-- -- Esperado: natural_clients_select_scoped
--
-- SELECT poliza_responsable_id FROM siniestros_vista LIMIT 1;
-- -- Esperado: UUID del responsable de la poliza
--
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_name = 'clients' AND column_name = 'executive_in_charge';
-- -- Esperado: is_nullable = NO
--
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_name = 'siniestros' AND column_name = 'responsable_id';
-- -- Esperado: is_nullable = NO
