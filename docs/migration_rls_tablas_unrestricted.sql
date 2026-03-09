-- =============================================
-- Migración: Habilitar RLS en tablas y vistas unrestricted
-- TABLAS: autenticados = SELECT, INSERT, UPDATE | solo admin = DELETE
-- VISTAS: security_invoker = true (heredan RLS de tablas subyacentes)
-- =============================================
-- NOTA: polizas y companias_aseguradoras ya tienen políticas SELECT scoped.
--       NO se les agrega SELECT genérico para no anular el scoping existente.
-- NOTA: recent_invitations ya tiene security_invoker = true, se omite.

-- ============================================
-- 1. categorias
-- ============================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_select_authenticated"
  ON categorias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "categorias_insert_authenticated"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "categorias_update_authenticated"
  ON categorias FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "categorias_delete_admin"
  ON categorias FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- 2. companias_aseguradoras
-- Ya tiene: cobranza_select_companias (SELECT scoped)
-- Solo agregar INSERT, UPDATE, DELETE
-- ============================================
ALTER TABLE companias_aseguradoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companias_insert_authenticated"
  ON companias_aseguradoras FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "companias_update_authenticated"
  ON companias_aseguradoras FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "companias_delete_admin"
  ON companias_aseguradoras FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- 3. marcas_vehiculo
-- ============================================
ALTER TABLE marcas_vehiculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marcas_vehiculo_select_authenticated"
  ON marcas_vehiculo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "marcas_vehiculo_insert_authenticated"
  ON marcas_vehiculo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "marcas_vehiculo_update_authenticated"
  ON marcas_vehiculo FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "marcas_vehiculo_delete_admin"
  ON marcas_vehiculo FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- 4. polizas
-- Ya tiene: polizas_select_scoped (SELECT scoped)
-- Solo agregar INSERT, UPDATE, DELETE
-- ============================================
ALTER TABLE polizas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polizas_insert_authenticated"
  ON polizas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "polizas_update_authenticated"
  ON polizas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "polizas_delete_admin"
  ON polizas FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- 5. polizas_automotor_vehiculos
-- ============================================
ALTER TABLE polizas_automotor_vehiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polizas_automotor_vehiculos_select_authenticated"
  ON polizas_automotor_vehiculos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "polizas_automotor_vehiculos_insert_authenticated"
  ON polizas_automotor_vehiculos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "polizas_automotor_vehiculos_update_authenticated"
  ON polizas_automotor_vehiculos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "polizas_automotor_vehiculos_delete_admin"
  ON polizas_automotor_vehiculos FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- 6. polizas_historial_ediciones
-- ============================================
ALTER TABLE polizas_historial_ediciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polizas_historial_ediciones_select_authenticated"
  ON polizas_historial_ediciones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "polizas_historial_ediciones_insert_authenticated"
  ON polizas_historial_ediciones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "polizas_historial_ediciones_update_authenticated"
  ON polizas_historial_ediciones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "polizas_historial_ediciones_delete_admin"
  ON polizas_historial_ediciones FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- 7. regionales
-- ============================================
ALTER TABLE regionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regionales_select_authenticated"
  ON regionales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "regionales_insert_authenticated"
  ON regionales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "regionales_update_authenticated"
  ON regionales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "regionales_delete_admin"
  ON regionales FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================
-- 8. siniestros_correlativo_tracker
-- ============================================
ALTER TABLE siniestros_correlativo_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "siniestros_correlativo_tracker_select_authenticated"
  ON siniestros_correlativo_tracker FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "siniestros_correlativo_tracker_insert_authenticated"
  ON siniestros_correlativo_tracker FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "siniestros_correlativo_tracker_update_authenticated"
  ON siniestros_correlativo_tracker FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "siniestros_correlativo_tracker_delete_admin"
  ON siniestros_correlativo_tracker FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- =============================================
-- PARTE 2: VISTAS - Activar security_invoker
-- =============================================
-- Al activar security_invoker = true, las vistas ejecutan
-- las queries con los permisos del usuario que las consulta,
-- respetando el RLS de las tablas subyacentes.
-- (recent_invitations ya tiene security_invoker = true, se omite)

ALTER VIEW client_edit_permissions_view SET (security_invoker = true);
ALTER VIEW clientes_documentos_con_auditoria SET (security_invoker = true);
ALTER VIEW clientes_documentos_con_historial SET (security_invoker = true);
ALTER VIEW clientes_historial_vista SET (security_invoker = true);
ALTER VIEW policy_edit_permissions_view SET (security_invoker = true);
ALTER VIEW polizas_aeronavegacion_vista SET (security_invoker = true);
ALTER VIEW polizas_con_auditoria SET (security_invoker = true);
ALTER VIEW polizas_historial_vista SET (security_invoker = true);
ALTER VIEW polizas_ramos_tecnicos_equipos_vista SET (security_invoker = true);
ALTER VIEW productos_aseguradoras_vista SET (security_invoker = true);
ALTER VIEW profiles_public SET (security_invoker = true);
ALTER VIEW siniestros_con_estado_actual SET (security_invoker = true);
ALTER VIEW siniestros_vista SET (security_invoker = true);
