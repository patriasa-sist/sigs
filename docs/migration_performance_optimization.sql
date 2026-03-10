-- ============================================================================
-- MIGRACIÓN: Optimización de Rendimiento de Supabase
-- Fecha: 2026-03-10
-- ============================================================================
-- Esta migración resuelve las advertencias del Supabase Performance Advisor:
--
-- 1. AUTH RLS INITPLAN (WARN - 85 políticas):
--    Políticas RLS que llaman auth.uid()/auth.jwt()/auth.role() directamente
--    se re-evalúan POR CADA FILA. Envolver en (select ...) hace que se evalúe
--    UNA SOLA VEZ por query (mejora dramática en tablas grandes).
--
-- 2. DUPLICATE INDEXES (WARN - 2 pares):
--    Índices duplicados en polizas_pagos que desperdician espacio y ralentizan writes.
--
-- 3. UNINDEXED FOREIGN KEYS (INFO - 67 FKs):
--    Foreign keys sin índice cobertor que afectan JOINs y DELETE CASCADE.
--
-- IMPORTANTE: Ejecutar en una ventana de mantenimiento. Los DROP/CREATE POLICY
-- causan un breve momento sin RLS en cada tabla afectada.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: ELIMINAR ÍNDICES DUPLICADOS
-- ============================================================================

DROP INDEX IF EXISTS public.idx_pagos_fecha;           -- duplicado de idx_pagos_fecha_vencimiento
DROP INDEX IF EXISTS public.idx_pagos_poliza;           -- duplicado de idx_pagos_poliza_id

-- ============================================================================
-- PARTE 2: CREAR ÍNDICES PARA FOREIGN KEYS SIN COBERTURA
-- ============================================================================
-- Solo se crean si no existen ya (IF NOT EXISTS / WHERE NOT EXISTS)
-- Convención de nombres: idx_{tabla}_{columna}

-- client_edit_permissions
CREATE INDEX IF NOT EXISTS idx_client_edit_permissions_revoked_by ON public.client_edit_permissions (revoked_by);

-- clientes_documentos
CREATE INDEX IF NOT EXISTS idx_clientes_documentos_descartado_por ON public.clientes_documentos (descartado_por);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients (created_by);
CREATE INDEX IF NOT EXISTS idx_clients_updated_by ON public.clients (updated_by);

-- directores_cartera
CREATE INDEX IF NOT EXISTS idx_directores_cartera_created_by ON public.directores_cartera (created_by);

-- equipo_miembros
CREATE INDEX IF NOT EXISTS idx_equipo_miembros_added_by ON public.equipo_miembros (added_by);

-- equipos
CREATE INDEX IF NOT EXISTS idx_equipos_created_by ON public.equipos (created_by);

-- policy_edit_permissions
CREATE INDEX IF NOT EXISTS idx_policy_edit_permissions_granted_by ON public.policy_edit_permissions (granted_by);
CREATE INDEX IF NOT EXISTS idx_policy_edit_permissions_revoked_by ON public.policy_edit_permissions (revoked_by);

-- polizas
CREATE INDEX IF NOT EXISTS idx_polizas_categoria_id ON public.polizas (categoria_id);
CREATE INDEX IF NOT EXISTS idx_polizas_compania_aseguradora_id ON public.polizas (compania_aseguradora_id);
CREATE INDEX IF NOT EXISTS idx_polizas_producto_id ON public.polizas (producto_id);
CREATE INDEX IF NOT EXISTS idx_polizas_rechazado_por ON public.polizas (rechazado_por);
CREATE INDEX IF NOT EXISTS idx_polizas_regional_id ON public.polizas (regional_id);
CREATE INDEX IF NOT EXISTS idx_polizas_validado_por ON public.polizas (validado_por);

-- polizas_aeronavegacion_asegurados
CREATE INDEX IF NOT EXISTS idx_aero_asegurados_created_by ON public.polizas_aeronavegacion_asegurados (created_by);

-- polizas_aeronavegacion_naves
CREATE INDEX IF NOT EXISTS idx_aero_naves_created_by ON public.polizas_aeronavegacion_naves (created_by);
CREATE INDEX IF NOT EXISTS idx_aero_naves_nivel_ap_id ON public.polizas_aeronavegacion_naves (nivel_ap_id);
CREATE INDEX IF NOT EXISTS idx_aero_naves_updated_by ON public.polizas_aeronavegacion_naves (updated_by);

-- polizas_anexos
CREATE INDEX IF NOT EXISTS idx_polizas_anexos_created_by ON public.polizas_anexos (created_by);
CREATE INDEX IF NOT EXISTS idx_polizas_anexos_rechazado_por ON public.polizas_anexos (rechazado_por);
CREATE INDEX IF NOT EXISTS idx_polizas_anexos_updated_by ON public.polizas_anexos (updated_by);
CREATE INDEX IF NOT EXISTS idx_polizas_anexos_validado_por ON public.polizas_anexos (validado_por);

-- polizas_anexos_aeronavegacion_naves
CREATE INDEX IF NOT EXISTS idx_anexos_aero_naves_anexo_id ON public.polizas_anexos_aeronavegacion_naves (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_aero_naves_original_item_id ON public.polizas_anexos_aeronavegacion_naves (original_item_id);

-- polizas_anexos_asegurados_nivel
CREATE INDEX IF NOT EXISTS idx_anexos_aseg_nivel_anexo_id ON public.polizas_anexos_asegurados_nivel (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_aseg_nivel_original_item_id ON public.polizas_anexos_asegurados_nivel (original_item_id);

-- polizas_anexos_automotor_vehiculos
CREATE INDEX IF NOT EXISTS idx_anexos_auto_vehiculos_anexo_id ON public.polizas_anexos_automotor_vehiculos (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_auto_vehiculos_original_item_id ON public.polizas_anexos_automotor_vehiculos (original_item_id);

-- polizas_anexos_documentos
CREATE INDEX IF NOT EXISTS idx_anexos_documentos_anexo_id ON public.polizas_anexos_documentos (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_documentos_uploaded_by ON public.polizas_anexos_documentos (uploaded_by);

-- polizas_anexos_incendio_bienes
CREATE INDEX IF NOT EXISTS idx_anexos_incendio_bienes_anexo_id ON public.polizas_anexos_incendio_bienes (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_incendio_bienes_original_item_id ON public.polizas_anexos_incendio_bienes (original_item_id);

-- polizas_anexos_pagos
CREATE INDEX IF NOT EXISTS idx_anexos_pagos_anexo_id ON public.polizas_anexos_pagos (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_pagos_cuota_original_id ON public.polizas_anexos_pagos (cuota_original_id);

-- polizas_anexos_ramos_tecnicos_equipos
CREATE INDEX IF NOT EXISTS idx_anexos_ramos_tec_equipos_anexo_id ON public.polizas_anexos_ramos_tecnicos_equipos (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_ramos_tec_equipos_original_item_id ON public.polizas_anexos_ramos_tecnicos_equipos (original_item_id);

-- polizas_anexos_riesgos_varios_bienes
CREATE INDEX IF NOT EXISTS idx_anexos_riesgos_varios_anexo_id ON public.polizas_anexos_riesgos_varios_bienes (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_riesgos_varios_original_item_id ON public.polizas_anexos_riesgos_varios_bienes (original_item_id);

-- polizas_anexos_salud_asegurados
CREATE INDEX IF NOT EXISTS idx_anexos_salud_aseg_anexo_id ON public.polizas_anexos_salud_asegurados (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_salud_aseg_original_item_id ON public.polizas_anexos_salud_asegurados (original_item_id);

-- polizas_anexos_salud_beneficiarios
CREATE INDEX IF NOT EXISTS idx_anexos_salud_benef_anexo_id ON public.polizas_anexos_salud_beneficiarios (anexo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_salud_benef_original_item_id ON public.polizas_anexos_salud_beneficiarios (original_item_id);

-- polizas_automotor_vehiculos
CREATE INDEX IF NOT EXISTS idx_automotor_vehiculos_created_by ON public.polizas_automotor_vehiculos (created_by);
CREATE INDEX IF NOT EXISTS idx_automotor_vehiculos_marca_id ON public.polizas_automotor_vehiculos (marca_id);
CREATE INDEX IF NOT EXISTS idx_automotor_vehiculos_tipo_vehiculo_id ON public.polizas_automotor_vehiculos (tipo_vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_automotor_vehiculos_updated_by ON public.polizas_automotor_vehiculos (updated_by);

-- polizas_documentos
CREATE INDEX IF NOT EXISTS idx_polizas_documentos_uploaded_by ON public.polizas_documentos (uploaded_by);

-- polizas_pagos
CREATE INDEX IF NOT EXISTS idx_polizas_pagos_created_by ON public.polizas_pagos (created_by);
CREATE INDEX IF NOT EXISTS idx_polizas_pagos_updated_by ON public.polizas_pagos (updated_by);

-- polizas_ramos_tecnicos_equipos
CREATE INDEX IF NOT EXISTS idx_ramos_tec_equipos_created_by ON public.polizas_ramos_tecnicos_equipos (created_by);
CREATE INDEX IF NOT EXISTS idx_ramos_tec_equipos_updated_by ON public.polizas_ramos_tecnicos_equipos (updated_by);

-- polizas_salud_beneficiarios
CREATE INDEX IF NOT EXISTS idx_salud_beneficiarios_created_by ON public.polizas_salud_beneficiarios (created_by);
CREATE INDEX IF NOT EXISTS idx_salud_beneficiarios_updated_by ON public.polizas_salud_beneficiarios (updated_by);

-- polizas_transporte
CREATE INDEX IF NOT EXISTS idx_polizas_transporte_created_by ON public.polizas_transporte (created_by);
CREATE INDEX IF NOT EXISTS idx_polizas_transporte_updated_by ON public.polizas_transporte (updated_by);

-- role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions (permission_id);

-- siniestros
CREATE INDEX IF NOT EXISTS idx_siniestros_cerrado_por ON public.siniestros (cerrado_por);
CREATE INDEX IF NOT EXISTS idx_siniestros_updated_by_fk ON public.siniestros (updated_by);

-- siniestros_coberturas
CREATE INDEX IF NOT EXISTS idx_siniestros_coberturas_cobertura_id ON public.siniestros_coberturas (cobertura_id);

-- siniestros_documentos
CREATE INDEX IF NOT EXISTS idx_siniestros_documentos_uploaded_by ON public.siniestros_documentos (uploaded_by);

-- siniestros_estados_historial
CREATE INDEX IF NOT EXISTS idx_siniestros_estados_hist_created_by ON public.siniestros_estados_historial (created_by);
CREATE INDEX IF NOT EXISTS idx_siniestros_estados_hist_estado_id ON public.siniestros_estados_historial (estado_id);

-- siniestros_historial
CREATE INDEX IF NOT EXISTS idx_siniestros_historial_created_by ON public.siniestros_historial (created_by);

-- siniestros_observaciones
CREATE INDEX IF NOT EXISTS idx_siniestros_observaciones_created_by ON public.siniestros_observaciones (created_by);

-- user_permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by ON public.user_permissions (granted_by);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions (permission_id);

-- ============================================================================
-- PARTE 3: FIX RLS INITPLAN - Envolver auth.uid()/jwt()/role() en (select ...)
-- ============================================================================
-- Cada política se elimina y recrea con la misma lógica pero optimizada.
-- El cambio: auth.uid() → (select auth.uid()), auth.jwt() → (select auth.jwt()),
-- auth.role() → (select auth.role())
-- Esto convierte la evaluación de "por cada fila" a "una vez por query".
-- ============================================================================

-- ─────────────────────────────────────────────
-- categorias
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "categorias_delete_admin" ON public.categorias;
CREATE POLICY "categorias_delete_admin" ON public.categorias
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

-- ─────────────────────────────────────────────
-- client_edit_permissions
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin puede actualizar permisos" ON public.client_edit_permissions;
CREATE POLICY "Admin puede actualizar permisos" ON public.client_edit_permissions
  FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin puede eliminar permisos" ON public.client_edit_permissions;
CREATE POLICY "Admin puede eliminar permisos" ON public.client_edit_permissions
  FOR DELETE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin puede insertar permisos" ON public.client_edit_permissions;
CREATE POLICY "Admin puede insertar permisos" ON public.client_edit_permissions
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin ve todos los permisos" ON public.client_edit_permissions;
CREATE POLICY "Admin ve todos los permisos" ON public.client_edit_permissions
  FOR SELECT TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Usuario ve sus propios permisos" ON public.client_edit_permissions;
CREATE POLICY "Usuario ve sus propios permisos" ON public.client_edit_permissions
  FOR SELECT TO public
  USING (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- client_partners
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can delete client partners" ON public.client_partners;
CREATE POLICY "Only admins can delete client partners" ON public.client_partners
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- clientes_documentos
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can update client documents" ON public.clientes_documentos;
CREATE POLICY "Admins can update client documents" ON public.clientes_documentos
  FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can update client documents" ON public.clientes_documentos;
CREATE POLICY "Authenticated users can update client documents" ON public.clientes_documentos
  FOR UPDATE TO public
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "clientes_documentos_select_scoped" ON public.clientes_documentos;
CREATE POLICY "clientes_documentos_select_scoped" ON public.clientes_documentos
  FOR SELECT TO public
  USING (
    (
      estado = 'activo'
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
    )
    AND (
      NOT user_needs_data_scoping((select auth.uid()))
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = clientes_documentos.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
      )
    )
  );

-- ─────────────────────────────────────────────
-- clientes_historial_ediciones
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "clientes_historial_select_scoped" ON public.clientes_historial_ediciones;
CREATE POLICY "clientes_historial_select_scoped" ON public.clientes_historial_ediciones
  FOR SELECT TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
    OR (
      NOT user_needs_data_scoping((select auth.uid()))
      OR EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = clientes_historial_ediciones.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
      )
    )
  );

-- ─────────────────────────────────────────────
-- clients
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow admin users to delete clients" ON public.clients;
CREATE POLICY "Allow admin users to delete clients" ON public.clients
  FOR DELETE TO public
  USING (
    (select auth.role()) = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON public.clients;
CREATE POLICY "Allow authenticated users to insert clients" ON public.clients
  FOR INSERT TO public
  WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON public.clients;
CREATE POLICY "Allow authenticated users to update clients" ON public.clients
  FOR UPDATE TO public
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "clients_select_scoped" ON public.clients;
CREATE POLICY "clients_select_scoped" ON public.clients
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza', 'siniestros'])
    )
    OR commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
  );

-- ─────────────────────────────────────────────
-- coberturas_catalogo
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden modificar coberturas" ON public.coberturas_catalogo;
CREATE POLICY "Solo siniestros, comercial y admin pueden modificar coberturas" ON public.coberturas_catalogo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

-- ─────────────────────────────────────────────
-- companias_aseguradoras
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "cobranza_select_companias" ON public.companias_aseguradoras;
CREATE POLICY "cobranza_select_companias" ON public.companias_aseguradoras
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'comercial', 'agente', 'cobranza'])
    )
  );

DROP POLICY IF EXISTS "companias_delete_admin" ON public.companias_aseguradoras;
CREATE POLICY "companias_delete_admin" ON public.companias_aseguradoras
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

-- ─────────────────────────────────────────────
-- directores_cartera
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "directores_cartera_delete" ON public.directores_cartera;
CREATE POLICY "directores_cartera_delete" ON public.directores_cartera
  FOR DELETE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "directores_cartera_insert" ON public.directores_cartera;
CREATE POLICY "directores_cartera_insert" ON public.directores_cartera
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "directores_cartera_select" ON public.directores_cartera;
CREATE POLICY "directores_cartera_select" ON public.directores_cartera
  FOR SELECT TO public
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "directores_cartera_update" ON public.directores_cartera;
CREATE POLICY "directores_cartera_update" ON public.directores_cartera
  FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- equipo_miembros
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "equipo_miembros_delete" ON public.equipo_miembros;
CREATE POLICY "equipo_miembros_delete" ON public.equipo_miembros
  FOR DELETE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "equipo_miembros_insert" ON public.equipo_miembros;
CREATE POLICY "equipo_miembros_insert" ON public.equipo_miembros
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "equipo_miembros_select" ON public.equipo_miembros;
CREATE POLICY "equipo_miembros_select" ON public.equipo_miembros
  FOR SELECT TO public
  USING (
    is_admin((select auth.uid()))
    OR user_id = ANY(get_team_member_ids((select auth.uid())))
  );

DROP POLICY IF EXISTS "equipo_miembros_update" ON public.equipo_miembros;
CREATE POLICY "equipo_miembros_update" ON public.equipo_miembros
  FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- equipos
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "equipos_delete" ON public.equipos;
CREATE POLICY "equipos_delete" ON public.equipos
  FOR DELETE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "equipos_insert" ON public.equipos;
CREATE POLICY "equipos_insert" ON public.equipos
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "equipos_select" ON public.equipos;
CREATE POLICY "equipos_select" ON public.equipos
  FOR SELECT TO public
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "equipos_update" ON public.equipos;
CREATE POLICY "equipos_update" ON public.equipos
  FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- juridic_clients
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "juridic_clients_delete" ON public.juridic_clients;
CREATE POLICY "juridic_clients_delete" ON public.juridic_clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "juridic_clients_select_scoped" ON public.juridic_clients;
CREATE POLICY "juridic_clients_select_scoped" ON public.juridic_clients
  FOR SELECT TO public
  USING (
    NOT user_needs_data_scoping((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = juridic_clients.client_id
      AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
    )
  );

DROP POLICY IF EXISTS "juridic_clients_update" ON public.juridic_clients;
CREATE POLICY "juridic_clients_update" ON public.juridic_clients
  FOR UPDATE TO public
  USING (
    NOT user_needs_data_scoping((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = juridic_clients.client_id
      AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
    )
  );

-- ─────────────────────────────────────────────
-- legal_representatives
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to manage legal representatives" ON public.legal_representatives;
CREATE POLICY "Allow authenticated users to manage legal representatives" ON public.legal_representatives
  FOR ALL TO public
  USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to view legal representatives" ON public.legal_representatives;
CREATE POLICY "Allow authenticated users to view legal representatives" ON public.legal_representatives
  FOR SELECT TO public
  USING ((select auth.role()) = 'authenticated');

-- ─────────────────────────────────────────────
-- marcas_vehiculo
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "marcas_vehiculo_delete_admin" ON public.marcas_vehiculo;
CREATE POLICY "marcas_vehiculo_delete_admin" ON public.marcas_vehiculo
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

-- ─────────────────────────────────────────────
-- natural_clients
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "natural_clients_delete" ON public.natural_clients;
CREATE POLICY "natural_clients_delete" ON public.natural_clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "natural_clients_select_scoped" ON public.natural_clients;
CREATE POLICY "natural_clients_select_scoped" ON public.natural_clients
  FOR SELECT TO public
  USING (
    NOT user_needs_data_scoping((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = natural_clients.client_id
      AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
    )
  );

DROP POLICY IF EXISTS "natural_clients_update" ON public.natural_clients;
CREATE POLICY "natural_clients_update" ON public.natural_clients
  FOR UPDATE TO public
  USING (
    NOT user_needs_data_scoping((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = natural_clients.client_id
      AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
    )
  );

-- ─────────────────────────────────────────────
-- permissions
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo admin modifica permisos" ON public.permissions;
CREATE POLICY "Solo admin modifica permisos" ON public.permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- policy_edit_permissions
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin puede actualizar permisos poliza" ON public.policy_edit_permissions;
CREATE POLICY "Admin puede actualizar permisos poliza" ON public.policy_edit_permissions
  FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin puede eliminar permisos poliza" ON public.policy_edit_permissions;
CREATE POLICY "Admin puede eliminar permisos poliza" ON public.policy_edit_permissions
  FOR DELETE TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin puede insertar permisos poliza" ON public.policy_edit_permissions;
CREATE POLICY "Admin puede insertar permisos poliza" ON public.policy_edit_permissions
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin ve todos permisos poliza" ON public.policy_edit_permissions;
CREATE POLICY "Admin ve todos permisos poliza" ON public.policy_edit_permissions
  FOR SELECT TO public
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Usuario ve sus permisos poliza" ON public.policy_edit_permissions;
CREATE POLICY "Usuario ve sus permisos poliza" ON public.policy_edit_permissions
  FOR SELECT TO public
  USING (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- polizas
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "polizas_delete_admin" ON public.polizas;
CREATE POLICY "polizas_delete_admin" ON public.polizas
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "polizas_select_scoped" ON public.polizas;
CREATE POLICY "polizas_select_scoped" ON public.polizas
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza', 'siniestros'])
    )
    OR responsable_id = ANY(get_team_member_ids((select auth.uid())))
  );

-- ─────────────────────────────────────────────
-- polizas_automotor_vehiculos
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "polizas_automotor_vehiculos_delete_admin" ON public.polizas_automotor_vehiculos;
CREATE POLICY "polizas_automotor_vehiculos_delete_admin" ON public.polizas_automotor_vehiculos
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

-- ─────────────────────────────────────────────
-- polizas_documentos
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo admins pueden eliminar documentos" ON public.polizas_documentos;
CREATE POLICY "Solo admins pueden eliminar documentos" ON public.polizas_documentos
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "polizas_documentos_select_scoped" ON public.polizas_documentos;
CREATE POLICY "polizas_documentos_select_scoped" ON public.polizas_documentos
  FOR SELECT TO authenticated
  USING (
    (
      estado::text = 'activo'
      OR estado IS NULL
      OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
    )
    AND (
      NOT user_needs_data_scoping((select auth.uid()))
      OR EXISTS (
        SELECT 1 FROM polizas p
        WHERE p.id = polizas_documentos.poliza_id
        AND p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
      )
    )
  );

-- ─────────────────────────────────────────────
-- polizas_historial_ediciones
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "polizas_historial_ediciones_delete_admin" ON public.polizas_historial_ediciones;
CREATE POLICY "polizas_historial_ediciones_delete_admin" ON public.polizas_historial_ediciones
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

-- ─────────────────────────────────────────────
-- polizas_pagos
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_insert_pagos" ON public.polizas_pagos;
CREATE POLICY "admin_insert_pagos" ON public.polizas_pagos
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'comercial', 'agente'])
    )
  );

DROP POLICY IF EXISTS "cobranza_update_pagos" ON public.polizas_pagos;
CREATE POLICY "cobranza_update_pagos" ON public.polizas_pagos
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['cobranza', 'admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['cobranza', 'admin'])
    )
  );

DROP POLICY IF EXISTS "pagos_select_scoped" ON public.polizas_pagos;
CREATE POLICY "pagos_select_scoped" ON public.polizas_pagos
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza', 'siniestros'])
    )
    OR EXISTS (
      SELECT 1 FROM polizas
      WHERE polizas.id = polizas_pagos.poliza_id
      AND polizas.responsable_id = ANY(get_team_member_ids((select auth.uid())))
    )
  );

-- ─────────────────────────────────────────────
-- polizas_pagos_comprobantes
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Cobranza y admin pueden actualizar comprobantes" ON public.polizas_pagos_comprobantes;
CREATE POLICY "Cobranza y admin pueden actualizar comprobantes" ON public.polizas_pagos_comprobantes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['cobranza', 'admin'])
    )
  );

DROP POLICY IF EXISTS "Cobranza y admin pueden subir comprobantes" ON public.polizas_pagos_comprobantes;
CREATE POLICY "Cobranza y admin pueden subir comprobantes" ON public.polizas_pagos_comprobantes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['cobranza', 'admin'])
    )
  );

-- ─────────────────────────────────────────────
-- polizas_salud_beneficiarios
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo admins pueden eliminar beneficiarios" ON public.polizas_salud_beneficiarios;
CREATE POLICY "Solo admins pueden eliminar beneficiarios" ON public.polizas_salud_beneficiarios
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Usuarios autorizados pueden actualizar beneficiarios" ON public.polizas_salud_beneficiarios;
CREATE POLICY "Usuarios autorizados pueden actualizar beneficiarios" ON public.polizas_salud_beneficiarios
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'comercial'])
    )
  );

DROP POLICY IF EXISTS "Usuarios autorizados pueden crear beneficiarios" ON public.polizas_salud_beneficiarios;
CREATE POLICY "Usuarios autorizados pueden crear beneficiarios" ON public.polizas_salud_beneficiarios
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'comercial'])
    )
  );

-- ─────────────────────────────────────────────
-- productos_aseguradoras
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "productos_admin_all" ON public.productos_aseguradoras;
CREATE POLICY "productos_admin_all" ON public.productos_aseguradoras
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "cobranza_select_profiles" ON public.profiles;
CREATE POLICY "cobranza_select_profiles" ON public.profiles
  FOR SELECT TO public
  USING (
    (((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'cobranza'
    AND role = ANY(ARRAY['admin', 'usuario', 'comercial', 'agente', 'cobranza'])
  );

DROP POLICY IF EXISTS "siniestros_select_profiles" ON public.profiles;
CREATE POLICY "siniestros_select_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'siniestros'
    AND role = ANY(ARRAY['admin', 'usuario', 'comercial', 'agente', 'siniestros'])
  );

DROP POLICY IF EXISTS "team_members_can_view_profiles" ON public.profiles;
CREATE POLICY "team_members_can_view_profiles" ON public.profiles
  FOR SELECT TO public
  USING (id = ANY(get_team_member_ids((select auth.uid()))));

-- ─────────────────────────────────────────────
-- regionales
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "regionales_delete_admin" ON public.regionales;
CREATE POLICY "regionales_delete_admin" ON public.regionales
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

-- ─────────────────────────────────────────────
-- role_permissions
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo admin modifica permisos de roles" ON public.role_permissions;
CREATE POLICY "Solo admin modifica permisos de roles" ON public.role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- siniestros
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo admins pueden eliminar siniestros" ON public.siniestros;
CREATE POLICY "Solo admins pueden eliminar siniestros" ON public.siniestros
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden actualizar siniestros" ON public.siniestros;
CREATE POLICY "Solo siniestros, comercial y admin pueden actualizar siniestros" ON public.siniestros
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden crear siniestros" ON public.siniestros;
CREATE POLICY "Solo siniestros, comercial y admin pueden crear siniestros" ON public.siniestros
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "siniestros_select_scoped" ON public.siniestros;
CREATE POLICY "siniestros_select_scoped" ON public.siniestros
  FOR SELECT TO authenticated
  USING (
    -- Admin, usuario, cobranza ven todo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza'])
    )
    -- Siniestros ve los de su equipo
    OR (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role = 'siniestros'
      )
      AND responsable_id = ANY(get_team_member_ids((select auth.uid())))
    )
    -- Comercial/agente ve siniestros de polizas de su equipo
    OR (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['comercial', 'agente'])
      )
      AND EXISTS (
        SELECT 1 FROM polizas p
        WHERE p.id = siniestros.poliza_id
        AND p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
      )
    )
  );

-- ─────────────────────────────────────────────
-- siniestros_coberturas
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo admin puede eliminar coberturas asignadas" ON public.siniestros_coberturas;
CREATE POLICY "Solo admin puede eliminar coberturas asignadas" ON public.siniestros_coberturas
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden asignar coberturas" ON public.siniestros_coberturas;
CREATE POLICY "Solo siniestros, comercial y admin pueden asignar coberturas" ON public.siniestros_coberturas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden modificar coberturas " ON public.siniestros_coberturas;
CREATE POLICY "Solo siniestros, comercial y admin pueden modificar coberturas " ON public.siniestros_coberturas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "siniestros_coberturas_select_scoped" ON public.siniestros_coberturas;
CREATE POLICY "siniestros_coberturas_select_scoped" ON public.siniestros_coberturas
  FOR SELECT TO authenticated
  USING (
    -- Admin, usuario, cobranza ven todo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza'])
    )
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_coberturas.siniestro_id
      AND (
        (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'siniestros')
          AND si.responsable_id = ANY(get_team_member_ids((select auth.uid())))
        )
        OR (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = ANY(ARRAY['comercial', 'agente'])
          )
          AND EXISTS (
            SELECT 1 FROM polizas p
            WHERE p.id = si.poliza_id
            AND p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
          )
        )
      )
    )
  );

-- ─────────────────────────────────────────────
-- siniestros_correlativo_tracker
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "siniestros_correlativo_tracker_delete_admin" ON public.siniestros_correlativo_tracker;
CREATE POLICY "siniestros_correlativo_tracker_delete_admin" ON public.siniestros_correlativo_tracker
  FOR DELETE TO authenticated
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (select auth.uid())) = 'admin'
  );

-- ─────────────────────────────────────────────
-- siniestros_documentos
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo admins pueden eliminar documentos físicamente" ON public.siniestros_documentos;
CREATE POLICY "Solo admins pueden eliminar documentos físicamente" ON public.siniestros_documentos
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden actualizar documentos" ON public.siniestros_documentos;
CREATE POLICY "Solo siniestros, comercial y admin pueden actualizar documentos" ON public.siniestros_documentos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden subir documentos" ON public.siniestros_documentos;
CREATE POLICY "Solo siniestros, comercial y admin pueden subir documentos" ON public.siniestros_documentos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "siniestros_documentos_select_scoped" ON public.siniestros_documentos;
CREATE POLICY "siniestros_documentos_select_scoped" ON public.siniestros_documentos
  FOR SELECT TO authenticated
  USING (
    (estado::text = 'activo' OR estado IS NULL)
    AND (
      -- Admin, usuario, cobranza ven todo
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza'])
      )
      OR EXISTS (
        SELECT 1 FROM siniestros si
        WHERE si.id = siniestros_documentos.siniestro_id
        AND (
          (
            EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'siniestros')
            AND si.responsable_id = ANY(get_team_member_ids((select auth.uid())))
          )
          OR (
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = (select auth.uid())
              AND profiles.role = ANY(ARRAY['comercial', 'agente'])
            )
            AND EXISTS (
              SELECT 1 FROM polizas p
              WHERE p.id = si.poliza_id
              AND p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
            )
          )
        )
      )
    )
  );

-- ─────────────────────────────────────────────
-- siniestros_estados_historial
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "siniestros_estados_historial_select_scoped" ON public.siniestros_estados_historial;
CREATE POLICY "siniestros_estados_historial_select_scoped" ON public.siniestros_estados_historial
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza'])
    )
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_estados_historial.siniestro_id
      AND (
        (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'siniestros')
          AND si.responsable_id = ANY(get_team_member_ids((select auth.uid())))
        )
        OR (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = ANY(ARRAY['comercial', 'agente'])
          )
          AND EXISTS (
            SELECT 1 FROM polizas p
            WHERE p.id = si.poliza_id
            AND p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
          )
        )
      )
    )
  );

-- ─────────────────────────────────────────────
-- siniestros_historial
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Usuarios autorizados pueden insertar en historial" ON public.siniestros_historial;
CREATE POLICY "Usuarios autorizados pueden insertar en historial" ON public.siniestros_historial
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "siniestros_historial_select_scoped" ON public.siniestros_historial;
CREATE POLICY "siniestros_historial_select_scoped" ON public.siniestros_historial
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza'])
    )
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_historial.siniestro_id
      AND (
        (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'siniestros')
          AND si.responsable_id = ANY(get_team_member_ids((select auth.uid())))
        )
        OR (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = ANY(ARRAY['comercial', 'agente'])
          )
          AND EXISTS (
            SELECT 1 FROM polizas p
            WHERE p.id = si.poliza_id
            AND p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
          )
        )
      )
    )
  );

-- ─────────────────────────────────────────────
-- siniestros_observaciones
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden agregar observaciones" ON public.siniestros_observaciones;
CREATE POLICY "Solo siniestros, comercial y admin pueden agregar observaciones" ON public.siniestros_observaciones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

DROP POLICY IF EXISTS "siniestros_observaciones_select_scoped" ON public.siniestros_observaciones;
CREATE POLICY "siniestros_observaciones_select_scoped" ON public.siniestros_observaciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza'])
    )
    OR EXISTS (
      SELECT 1 FROM siniestros si
      WHERE si.id = siniestros_observaciones.siniestro_id
      AND (
        (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'siniestros')
          AND si.responsable_id = ANY(get_team_member_ids((select auth.uid())))
        )
        OR (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (select auth.uid())
            AND profiles.role = ANY(ARRAY['comercial', 'agente'])
          )
          AND EXISTS (
            SELECT 1 FROM polizas p
            WHERE p.id = si.poliza_id
            AND p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
          )
        )
      )
    )
  );

-- ─────────────────────────────────────────────
-- unipersonal_clients
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "unipersonal_clients_delete" ON public.unipersonal_clients;
CREATE POLICY "unipersonal_clients_delete" ON public.unipersonal_clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "unipersonal_clients_select_scoped" ON public.unipersonal_clients;
CREATE POLICY "unipersonal_clients_select_scoped" ON public.unipersonal_clients
  FOR SELECT TO public
  USING (
    NOT user_needs_data_scoping((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = unipersonal_clients.client_id
      AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
    )
  );

DROP POLICY IF EXISTS "unipersonal_clients_update" ON public.unipersonal_clients;
CREATE POLICY "unipersonal_clients_update" ON public.unipersonal_clients
  FOR UPDATE TO public
  USING (
    NOT user_needs_data_scoping((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = unipersonal_clients.client_id
      AND c.commercial_owner_id = ANY(get_team_member_ids((select auth.uid())))
    )
  );

-- ─────────────────────────────────────────────
-- user_permissions
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin ve todos los permisos de usuarios" ON public.user_permissions;
CREATE POLICY "Admin ve todos los permisos de usuarios" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Solo admin modifica permisos de usuarios" ON public.user_permissions;
CREATE POLICY "Solo admin modifica permisos de usuarios" ON public.user_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Usuario ve sus propios permisos extras" ON public.user_permissions;
CREATE POLICY "Usuario ve sus propios permisos extras" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================
-- Ejecutar después de la migración para verificar que no queden políticas
-- con auth.uid()/jwt()/role() sin envolver:
--
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (
--   (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%( SELECT auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
--   OR (qual LIKE '%auth.jwt()%' AND qual NOT LIKE '%( SELECT auth.jwt()%' AND qual NOT LIKE '%(select auth.jwt())%')
--   OR (qual LIKE '%auth.role()%' AND qual NOT LIKE '%( SELECT auth.role()%' AND qual NOT LIKE '%(select auth.role())%')
-- );
-- ============================================================================
