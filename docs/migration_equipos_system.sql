-- ============================================================
-- FASE 2: Sistema de Equipos, Jerarquía y Aislamiento de Datos
-- ============================================================
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-02-14
--
-- Este script:
-- 1. Crea tablas equipos y equipo_miembros
-- 2. Crea funciones helper para scoping de datos
-- 3. Reemplaza las políticas RLS de SELECT en polizas y clients
--    para aislar datos de agentes y comerciales por equipo
-- 4. Agrega el permiso admin.equipos
-- ============================================================

-- ============================================================
-- 1. TABLAS DE EQUIPOS
-- ============================================================

CREATE TABLE IF NOT EXISTS equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

COMMENT ON TABLE equipos IS 'Equipos de trabajo para agrupar agentes y comerciales';

CREATE TABLE IF NOT EXISTS equipo_miembros (
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rol_equipo TEXT NOT NULL DEFAULT 'miembro' CHECK (rol_equipo IN ('lider', 'miembro')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES profiles(id),
  PRIMARY KEY (equipo_id, user_id)
);

COMMENT ON TABLE equipo_miembros IS 'Miembros de cada equipo con su rol (lider/miembro)';
COMMENT ON COLUMN equipo_miembros.rol_equipo IS 'Rol administrativo dentro del equipo. No afecta visibilidad de datos - todos los miembros ven los datos del equipo.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_equipo_miembros_user_id ON equipo_miembros(user_id);
CREATE INDEX IF NOT EXISTS idx_equipo_miembros_equipo_id ON equipo_miembros(equipo_id);

-- ============================================================
-- 2. FUNCIONES HELPER
-- ============================================================

-- Retorna IDs de todos los compañeros de equipo (incluyendo al propio usuario).
-- Si el usuario no está en ningún equipo, retorna solo su propio ID.
-- Un usuario en múltiples equipos obtiene la unión de todos los miembros.
CREATE OR REPLACE FUNCTION get_team_member_ids(p_user_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(
    array_agg(DISTINCT em2.user_id),
    ARRAY[p_user_id]
  )
  FROM equipo_miembros em1
  JOIN equipo_miembros em2 ON em2.equipo_id = em1.equipo_id
  WHERE em1.user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_team_member_ids IS 'Retorna todos los IDs de compañeros de equipo del usuario dado, incluyéndolo a sí mismo. Si no tiene equipo, retorna solo su propio ID.';

-- Determina si un usuario necesita aislamiento de datos.
-- Solo agente y comercial tienen datos aislados.
CREATE OR REPLACE FUNCTION user_needs_data_scoping(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND role IN ('agente', 'comercial')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_needs_data_scoping IS 'Retorna TRUE si el usuario es agente o comercial (roles que necesitan aislamiento de datos por equipo).';

-- ============================================================
-- 3. RLS PARA TABLAS DE EQUIPOS
-- ============================================================

ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipo_miembros ENABLE ROW LEVEL SECURITY;

-- equipos: todos los autenticados pueden ver, solo admin puede modificar
CREATE POLICY "equipos_select" ON equipos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "equipos_insert" ON equipos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "equipos_update" ON equipos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "equipos_delete" ON equipos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- equipo_miembros: miembros del equipo + admin pueden ver, solo admin modifica
CREATE POLICY "equipo_miembros_select" ON equipo_miembros
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
    OR equipo_id IN (SELECT equipo_id FROM equipo_miembros WHERE user_id = auth.uid())
  );

CREATE POLICY "equipo_miembros_insert" ON equipo_miembros
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "equipo_miembros_update" ON equipo_miembros
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "equipo_miembros_delete" ON equipo_miembros
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Permiso para supabase_auth_admin (necesario para el JWT hook si accede a estas tablas)
CREATE POLICY "auth_admin_equipos" ON equipos
  FOR SELECT TO supabase_auth_admin USING (true);

CREATE POLICY "auth_admin_equipo_miembros" ON equipo_miembros
  FOR SELECT TO supabase_auth_admin USING (true);

-- ============================================================
-- 4. ACTUALIZAR RLS DE POLIZAS - SCOPING POR EQUIPO
-- ============================================================

-- Eliminar política SELECT existente
DROP POLICY IF EXISTS "cobranza_select_polizas" ON polizas;

-- Nueva política: admin/usuario/cobranza/siniestros ven todo,
-- agente/comercial solo ven datos propios + compañeros de equipo
CREATE POLICY "polizas_select_scoped" ON polizas
  FOR SELECT USING (
    -- Roles sin aislamiento: ven todo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'usuario', 'cobranza', 'siniestros')
    )
    OR
    -- Agente/comercial: solo sus datos + datos de compañeros de equipo
    responsable_id = ANY(get_team_member_ids(auth.uid()))
  );

-- ============================================================
-- 5. ACTUALIZAR RLS DE CLIENTS - SCOPING POR EQUIPO
-- ============================================================

-- Eliminar políticas SELECT existentes (hay dos solapadas)
DROP POLICY IF EXISTS "Allow authenticated users to view clients" ON clients;
DROP POLICY IF EXISTS "cobranza_select_clients" ON clients;

-- Nueva política scoped
CREATE POLICY "clients_select_scoped" ON clients
  FOR SELECT USING (
    -- Roles sin aislamiento: ven todo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'usuario', 'cobranza', 'siniestros')
    )
    OR
    -- Agente/comercial: datos propios + compañeros de equipo
    executive_in_charge = ANY(get_team_member_ids(auth.uid()))
    OR
    -- Clientes sin asignar son visibles para todos (para poder asignarlos)
    executive_in_charge IS NULL
  );

-- ============================================================
-- 6. ACTUALIZAR RLS DE POLIZAS_PAGOS - SCOPING POR EQUIPO
-- ============================================================

-- Eliminar política SELECT existente
DROP POLICY IF EXISTS "select_pagos_roles_operativos" ON polizas_pagos;

-- Nueva política: hereda scoping a través de polizas.responsable_id
CREATE POLICY "pagos_select_scoped" ON polizas_pagos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'usuario', 'cobranza', 'siniestros')
    )
    OR
    EXISTS (
      SELECT 1 FROM polizas
      WHERE polizas.id = polizas_pagos.poliza_id
        AND polizas.responsable_id = ANY(get_team_member_ids(auth.uid()))
    )
  );

-- ============================================================
-- 7. NUEVO PERMISO admin.equipos
-- ============================================================

INSERT INTO permissions (id, module, action, description) VALUES
  ('admin.equipos', 'admin', 'equipos', 'Gestionar equipos y asignar miembros')
ON CONFLICT (id) DO NOTHING;

-- Asignar a admin (aunque tiene bypass, mantener consistencia en la matriz)
INSERT INTO role_permissions (role, permission_id) VALUES
  ('admin', 'admin.equipos')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Ejecutar después de la migración para verificar:
--
-- 1. Verificar tablas creadas:
--    SELECT * FROM equipos;
--    SELECT * FROM equipo_miembros;
--
-- 2. Verificar función:
--    SELECT get_team_member_ids('UUID-de-un-usuario');
--
-- 3. Verificar nuevo permiso:
--    SELECT * FROM permissions WHERE id = 'admin.equipos';
--
-- 4. Verificar políticas RLS actualizadas:
--    SELECT policyname FROM pg_policies WHERE tablename = 'polizas' AND cmd = 'SELECT';
--    -- Debe mostrar: polizas_select_scoped
--
--    SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND cmd = 'SELECT';
--    -- Debe mostrar: clients_select_scoped
--
--    SELECT policyname FROM pg_policies WHERE tablename = 'polizas_pagos' AND cmd = 'SELECT';
--    -- Debe mostrar: pagos_select_scoped
