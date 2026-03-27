-- =============================================================================
-- Migration: Optimización de rendimiento RLS e Índices
-- Fecha: 2026-03-27
-- Fuente: Supabase Performance Advisor
--
-- Resuelve:
--   🔴 ALTA: auth_rls_initplan en document_exceptions (5 políticas)
--   🟡 MEDIA: multiple_permissive_policies en 12 tablas (37 ocurrencias)
--   🟡 MEDIA: unindexed_foreign_keys (4 FK sin índice)
-- =============================================================================

-- =============================================
-- SECCIÓN 1: ÍNDICES FALTANTES EN FOREIGN KEYS
-- =============================================

-- FK: document_exceptions.revocado_por → profiles(id)
CREATE INDEX IF NOT EXISTS idx_document_exceptions_revocado_por
  ON document_exceptions(revocado_por);

-- FK: document_exceptions.usado_en_client_id → clients(id)
CREATE INDEX IF NOT EXISTS idx_document_exceptions_usado_en_client_id
  ON document_exceptions(usado_en_client_id);

-- FK: polizas.regional_asegurado_id → regionales(id)
CREATE INDEX IF NOT EXISTS idx_polizas_regional_asegurado_id
  ON polizas(regional_asegurado_id);

-- FK: polizas_anexos.regional_asegurado_id → regionales(id)
CREATE INDEX IF NOT EXISTS idx_polizas_anexos_regional_asegurado_id
  ON polizas_anexos(regional_asegurado_id);


-- =============================================
-- SECCIÓN 2: document_exceptions
-- Problemas: auth_rls_initplan + multiple_permissive_policies
--
-- Estado actual (5 políticas, todas public):
--   INSERT: doc_exceptions_uif_admin_insert (usa auth.uid() sin subquery)
--   SELECT: doc_exceptions_read_own + doc_exceptions_uif_admin_select (2 permissive, auth.uid() sin subquery)
--   UPDATE: doc_exceptions_consume_own + doc_exceptions_uif_admin_update (2 permissive, auth.uid() sin subquery)
--
-- Estado nuevo (3 políticas, todas con (SELECT auth.uid())):
--   INSERT: 1 política (sin cambio lógico, solo fix initplan)
--   SELECT: 1 política consolidada con OR
--   UPDATE: 1 política consolidada con OR
-- =============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "doc_exceptions_uif_admin_insert" ON document_exceptions;
DROP POLICY IF EXISTS "doc_exceptions_read_own" ON document_exceptions;
DROP POLICY IF EXISTS "doc_exceptions_uif_admin_select" ON document_exceptions;
DROP POLICY IF EXISTS "doc_exceptions_consume_own" ON document_exceptions;
DROP POLICY IF EXISTS "doc_exceptions_uif_admin_update" ON document_exceptions;

-- INSERT: admin/uif pueden insertar (fix: (SELECT auth.uid()))
CREATE POLICY "doc_exceptions_insert" ON document_exceptions
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin', 'uif'])
    )
  );

-- SELECT: usuario ve las suyas OR admin/uif ven todas (consolidada)
CREATE POLICY "doc_exceptions_select" ON document_exceptions
  FOR SELECT TO public
  USING (
    (SELECT auth.uid()) = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin', 'uif'])
    )
  );

-- UPDATE: usuario consume las suyas (activas) OR admin/uif actualizan cualquiera (consolidada)
CREATE POLICY "doc_exceptions_update" ON document_exceptions
  FOR UPDATE TO public
  USING (
    ((SELECT auth.uid()) = user_id AND estado = 'activa')
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin', 'uif'])
    )
  );


-- =============================================
-- SECCIÓN 3: legal_representatives
-- Problema: ALL + SELECT redundante (misma condición)
-- Fix: Eliminar SELECT redundante (ALL ya cubre SELECT)
-- =============================================

DROP POLICY IF EXISTS "Allow authenticated users to view legal representatives" ON legal_representatives;


-- =============================================
-- SECCIÓN 4: coberturas_catalogo
-- Problema: ALL(roles específicos) + SELECT(true) para authenticated
-- Fix: Reemplazar ALL con INSERT+UPDATE+DELETE explícitos
-- =============================================

DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden modificar coberturas" ON coberturas_catalogo;

CREATE POLICY "coberturas_catalogo_modify" ON coberturas_catalogo
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

CREATE POLICY "coberturas_catalogo_update" ON coberturas_catalogo
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

CREATE POLICY "coberturas_catalogo_delete" ON coberturas_catalogo
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['siniestros', 'comercial', 'admin'])
    )
  );

-- SELECT existente se mantiene: "Usuarios autenticados pueden ver coberturas" (true)


-- =============================================
-- SECCIÓN 5: permissions
-- Problema: ALL(admin) + SELECT(true) para authenticated
-- Fix: Reemplazar ALL con INSERT+UPDATE+DELETE explícitos
-- =============================================

DROP POLICY IF EXISTS "Solo admin modifica permisos" ON permissions;

CREATE POLICY "permissions_modify" ON permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "permissions_update" ON permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "permissions_delete" ON permissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- SELECT existente se mantiene: "Autenticados pueden ver permisos" (true)


-- =============================================
-- SECCIÓN 6: productos_aseguradoras
-- Problema: ALL(admin) + SELECT(true) para authenticated
-- Fix: Reemplazar ALL con INSERT+UPDATE+DELETE explícitos
-- =============================================

DROP POLICY IF EXISTS "productos_admin_all" ON productos_aseguradoras;

CREATE POLICY "productos_admin_insert" ON productos_aseguradoras
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "productos_admin_update" ON productos_aseguradoras
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "productos_admin_delete" ON productos_aseguradoras
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- SELECT existente se mantiene: "productos_select_authenticated" (true)


-- =============================================
-- SECCIÓN 7: role_permissions
-- Problema: ALL(admin, authenticated) + SELECT(true, authenticated) + SELECT(true, supabase_auth_admin)
-- Fix: Reemplazar ALL con INSERT+UPDATE+DELETE
-- =============================================

DROP POLICY IF EXISTS "Solo admin modifica permisos de roles" ON role_permissions;

CREATE POLICY "role_permissions_modify" ON role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "role_permissions_update" ON role_permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "role_permissions_delete" ON role_permissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- SELECT existentes se mantienen sin cambios (authenticated + supabase_auth_admin son roles distintos)


-- =============================================
-- SECCIÓN 8: user_permissions
-- Problema: ALL(admin) + SELECT admin + SELECT propio + SELECT supabase_auth_admin
-- Fix: Reemplazar ALL con INSERT+UPDATE+DELETE, consolidar SELECTs de authenticated
-- =============================================

DROP POLICY IF EXISTS "Solo admin modifica permisos de usuarios" ON user_permissions;
DROP POLICY IF EXISTS "Admin ve todos los permisos de usuarios" ON user_permissions;
DROP POLICY IF EXISTS "Usuario ve sus propios permisos extras" ON user_permissions;

-- INSERT+UPDATE+DELETE solo para admin
CREATE POLICY "user_permissions_modify" ON user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "user_permissions_update" ON user_permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "user_permissions_delete" ON user_permissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- SELECT consolidado: admin ve todo, usuario ve los suyos
CREATE POLICY "user_permissions_select" ON user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- SELECT para supabase_auth_admin se mantiene sin cambios


-- =============================================
-- SECCIÓN 9: client_edit_permissions
-- Problema: SELECT admin + SELECT propio (ambos public)
-- Fix: Consolidar en una sola política SELECT
-- =============================================

DROP POLICY IF EXISTS "Admin ve todos los permisos" ON client_edit_permissions;
DROP POLICY IF EXISTS "Usuario ve sus propios permisos" ON client_edit_permissions;

CREATE POLICY "client_edit_permissions_select" ON client_edit_permissions
  FOR SELECT TO public
  USING (
    user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );


-- =============================================
-- SECCIÓN 10: policy_edit_permissions
-- Problema: SELECT admin + SELECT propio (ambos public)
-- Fix: Consolidar en una sola política SELECT
-- =============================================

DROP POLICY IF EXISTS "Admin ve todos permisos poliza" ON policy_edit_permissions;
DROP POLICY IF EXISTS "Usuario ve sus permisos poliza" ON policy_edit_permissions;

CREATE POLICY "policy_edit_permissions_select" ON policy_edit_permissions
  FOR SELECT TO public
  USING (
    user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );


-- =============================================
-- SECCIÓN 11: invitations
-- Problema: ALL(admin) + UPDATE(own email) para public
-- Fix: Reemplazar ALL con INSERT+SELECT+DELETE, consolidar UPDATE
-- =============================================

DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;
DROP POLICY IF EXISTS "Users can mark their own invitation as used" ON invitations;

CREATE POLICY "invitations_admin_select" ON invitations
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "invitations_admin_insert" ON invitations
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "invitations_admin_delete" ON invitations
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- UPDATE consolidado: admin puede todo, usuario puede marcar la suya como usada
CREATE POLICY "invitations_update" ON invitations
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
    OR
    (
      email = ((SELECT auth.jwt()) ->> 'email')
      AND used_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
    OR
    email = ((SELECT auth.jwt()) ->> 'email')
  );


-- =============================================
-- SECCIÓN 12: clientes_documentos
-- Problema: 2 UPDATE para public (admin + any authenticated)
-- Fix: El segundo (any authenticated) ya engloba al primero → consolidar
-- =============================================

DROP POLICY IF EXISTS "Admins can update client documents" ON clientes_documentos;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON clientes_documentos;

-- Un solo UPDATE: cualquier autenticado puede actualizar
CREATE POLICY "clientes_documentos_update" ON clientes_documentos
  FOR UPDATE TO public
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);


-- =============================================
-- SECCIÓN 13: profiles
-- Problema: 5 SELECT permissive para authenticated/public
-- Roles distintos: authenticated(3), public(2), supabase_auth_admin(1)
--
-- authenticated SELECT:
--   "Profiles select policy": uid = id OR is_admin(uid)
--   "siniestros_select_profiles": jwt role='siniestros' AND role IN (...)
-- → Consolidar en una sola
--
-- public SELECT:
--   "cobranza_select_profiles": jwt role='cobranza' AND role IN (...)
--   "team_members_can_view_profiles": id IN get_team_member_ids(uid)
-- → Consolidar en una sola
-- =============================================

DROP POLICY IF EXISTS "Profiles select policy" ON profiles;
DROP POLICY IF EXISTS "siniestros_select_profiles" ON profiles;

CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT TO authenticated
  USING (
    -- Ve su propio perfil
    (SELECT auth.uid()) = id
    -- Admin ve todos
    OR is_admin((SELECT auth.uid()))
    -- Siniestros ve roles operativos
    OR (
      (((SELECT auth.jwt()) -> 'app_metadata') ->> 'role') = 'siniestros'
      AND role = ANY (ARRAY['admin', 'usuario', 'comercial', 'agente', 'siniestros'])
    )
  );

DROP POLICY IF EXISTS "cobranza_select_profiles" ON profiles;
DROP POLICY IF EXISTS "team_members_can_view_profiles" ON profiles;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT TO public
  USING (
    -- Miembros del equipo
    id = ANY (get_team_member_ids((SELECT auth.uid())))
    -- Cobranza ve roles operativos
    OR (
      (((SELECT auth.jwt()) -> 'app_metadata') ->> 'role') = 'cobranza'
      AND role = ANY (ARRAY['admin', 'usuario', 'comercial', 'agente', 'cobranza'])
    )
  );

-- supabase_auth_admin SELECT se mantiene sin cambios
-- INSERT y UPDATE de profiles se mantienen sin cambios


-- =============================================================================
-- FIN DE LA MIGRACIÓN
--
-- Resumen de cambios:
--   ✅ 4 índices nuevos en FK sin cobertura
--   ✅ document_exceptions: 5 → 3 políticas, fix initplan
--   ✅ legal_representatives: eliminada SELECT redundante
--   ✅ coberturas_catalogo: ALL → INSERT+UPDATE+DELETE explícitos
--   ✅ permissions: ALL → INSERT+UPDATE+DELETE explícitos
--   ✅ productos_aseguradoras: ALL → INSERT+UPDATE+DELETE explícitos
--   ✅ role_permissions: ALL → INSERT+UPDATE+DELETE explícitos
--   ✅ user_permissions: ALL → INSERT+UPDATE+DELETE + SELECT consolidado
--   ✅ client_edit_permissions: 2 SELECT → 1 SELECT consolidado
--   ✅ policy_edit_permissions: 2 SELECT → 1 SELECT consolidado
--   ✅ invitations: ALL+UPDATE → INSERT+SELECT+DELETE+UPDATE consolidado
--   ✅ clientes_documentos: 2 UPDATE → 1 UPDATE consolidado
--   ✅ profiles: 5 SELECT → 2 SELECT consolidados + 1 supabase_auth_admin
-- =============================================================================
