-- ============================================================================
-- MIGRACIÓN: Separar Director de Cartera de Commercial Owner
-- Fecha: 2026-02-17
--
-- Cambios:
-- 1. Crear tabla directores_cartera (personas con comisión, sin cuenta obligatoria)
-- 2. Agregar commercial_owner_id a clients (usuario comercial que gestiona el cliente)
-- 3. Agregar director_cartera_id a clients (FK a nueva tabla)
-- 4. Poblar commercial_owner_id desde created_by (fallback a executive_in_charge)
-- 5. Actualizar todas las RLS policies para usar commercial_owner_id
-- 6. Eliminar columna executive_in_charge
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear tabla directores_cartera
-- ============================================================================
CREATE TABLE directores_cartera (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT        NOT NULL,
  apellido      TEXT,
  ci_nit        TEXT,
  telefono      TEXT,
  email         TEXT,
  porcentaje_comision NUMERIC(5,2) CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100),
  notas         TEXT,
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE directores_cartera IS
  'Directores de cartera: personas que reciben comisión por clientes. Pueden o no tener cuenta en el sistema.';
COMMENT ON COLUMN directores_cartera.porcentaje_comision IS
  'Porcentaje de comisión que recibe este director (0-100)';

-- RLS
ALTER TABLE directores_cartera ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden ver directores (para seleccionar en formularios)
CREATE POLICY "directores_cartera_select"
  ON directores_cartera FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo admin puede crear/editar/eliminar
CREATE POLICY "directores_cartera_insert"
  ON directores_cartera FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "directores_cartera_update"
  ON directores_cartera FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "directores_cartera_delete"
  ON directores_cartera FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- ============================================================================
-- PASO 2: Agregar nuevas columnas a clients
-- ============================================================================
ALTER TABLE clients
  ADD COLUMN commercial_owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN director_cartera_id uuid REFERENCES directores_cartera(id) ON DELETE SET NULL;

CREATE INDEX idx_clients_commercial_owner ON clients(commercial_owner_id);
CREATE INDEX idx_clients_director_cartera ON clients(director_cartera_id);

COMMENT ON COLUMN clients.commercial_owner_id IS
  'Usuario comercial dueño del cliente. Controla visibilidad por scoping de equipos.';
COMMENT ON COLUMN clients.director_cartera_id IS
  'Director de cartera asignado. Solo para métricas/comisiones, no afecta visibilidad.';

-- ============================================================================
-- PASO 3: Poblar commercial_owner_id
-- Primero desde created_by (la fuente más confiable),
-- luego fallback a executive_in_charge para clientes sin created_by
-- ============================================================================
UPDATE clients
  SET commercial_owner_id = created_by::uuid
  WHERE created_by IS NOT NULL
    AND created_by::uuid IN (SELECT id FROM profiles);

UPDATE clients
  SET commercial_owner_id = executive_in_charge
  WHERE commercial_owner_id IS NULL
    AND executive_in_charge IS NOT NULL;

-- ============================================================================
-- PASO 4: Actualizar RLS - tabla clients
-- ============================================================================
DROP POLICY IF EXISTS "clients_select_scoped" ON clients;
CREATE POLICY "clients_select_scoped" ON clients
  FOR SELECT USING (
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY(ARRAY['admin','usuario','cobranza','siniestros'])
    ))
    OR (commercial_owner_id = ANY(get_team_member_ids(auth.uid())))
  );

-- ============================================================================
-- PASO 5: Actualizar RLS - natural_clients
-- ============================================================================
DROP POLICY IF EXISTS "natural_clients_select_scoped" ON natural_clients;
CREATE POLICY "natural_clients_select_scoped" ON natural_clients
  FOR SELECT USING (
    (NOT user_needs_data_scoping(auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = natural_clients.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
    ))
  );

DROP POLICY IF EXISTS "natural_clients_update" ON natural_clients;
CREATE POLICY "natural_clients_update" ON natural_clients
  FOR UPDATE USING (
    (NOT user_needs_data_scoping(auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = natural_clients.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
    ))
  );

-- ============================================================================
-- PASO 6: Actualizar RLS - juridic_clients
-- ============================================================================
DROP POLICY IF EXISTS "juridic_clients_select_scoped" ON juridic_clients;
CREATE POLICY "juridic_clients_select_scoped" ON juridic_clients
  FOR SELECT USING (
    (NOT user_needs_data_scoping(auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = juridic_clients.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
    ))
  );

DROP POLICY IF EXISTS "juridic_clients_update" ON juridic_clients;
CREATE POLICY "juridic_clients_update" ON juridic_clients
  FOR UPDATE USING (
    (NOT user_needs_data_scoping(auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = juridic_clients.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
    ))
  );

-- ============================================================================
-- PASO 7: Actualizar RLS - unipersonal_clients
-- ============================================================================
DROP POLICY IF EXISTS "unipersonal_clients_select_scoped" ON unipersonal_clients;
CREATE POLICY "unipersonal_clients_select_scoped" ON unipersonal_clients
  FOR SELECT USING (
    (NOT user_needs_data_scoping(auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = unipersonal_clients.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
    ))
  );

DROP POLICY IF EXISTS "unipersonal_clients_update" ON unipersonal_clients;
CREATE POLICY "unipersonal_clients_update" ON unipersonal_clients
  FOR UPDATE USING (
    (NOT user_needs_data_scoping(auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = unipersonal_clients.client_id
        AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
    ))
  );

-- ============================================================================
-- PASO 8: Actualizar RLS - clientes_documentos
-- ============================================================================
DROP POLICY IF EXISTS "clientes_documentos_select_scoped" ON clientes_documentos;
CREATE POLICY "clientes_documentos_select_scoped" ON clientes_documentos
  FOR SELECT USING (
    ((estado = 'activo') OR (EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )))
    AND (
      (NOT user_needs_data_scoping(auth.uid()))
      OR (EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = clientes_documentos.client_id
          AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
      ))
    )
  );

-- ============================================================================
-- PASO 9: Actualizar RLS - clientes_historial_ediciones
-- ============================================================================
DROP POLICY IF EXISTS "clientes_historial_select_scoped" ON clientes_historial_ediciones;
CREATE POLICY "clientes_historial_select_scoped" ON clientes_historial_ediciones
  FOR SELECT USING (
    (EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ))
    OR (
      (NOT user_needs_data_scoping(auth.uid()))
      OR (EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = clientes_historial_ediciones.client_id
          AND c.commercial_owner_id = ANY(get_team_member_ids(auth.uid()))
      ))
    )
  );

-- ============================================================================
-- PASO 10: Eliminar columna executive_in_charge
-- (sus datos ya fueron migrados a commercial_owner_id en el paso 3)
-- ============================================================================
ALTER TABLE clients DROP COLUMN executive_in_charge;
