-- =====================================================
-- Migración: Agregar rol "cobranza" y RLS para módulo de cobranzas
-- Fecha: 2025-12-14
-- Descripción:
--   1. Agregar rol "cobranza" al constraint de profiles
--   2. Verificar audit fields en polizas_pagos
--   3. Crear función para actualizar estado "vencido" automáticamente
--   4. Crear RLS policies para polizas_pagos
-- =====================================================

-- 1. Agregar rol "cobranza" al constraint de profiles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role = ANY (ARRAY[
  'admin'::text,
  'usuario'::text,
  'agente'::text,
  'comercial'::text,
  'cobranza'::text,
  'invitado'::text,
  'desactivado'::text
]));

COMMENT ON CONSTRAINT profiles_role_check ON profiles
IS 'Valida que el rol del usuario sea uno de los roles permitidos del sistema';

-- 2. Verificar que polizas_pagos tiene audit fields
-- (Estos ya deberían existir según migration_add_audit_fields.sql, pero verificamos)
DO $$
BEGIN
  -- Verificar y agregar created_by si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='polizas_pagos' AND column_name='created_by'
  ) THEN
    ALTER TABLE polizas_pagos ADD COLUMN created_by UUID REFERENCES profiles(id);
    COMMENT ON COLUMN polizas_pagos.created_by IS 'Usuario que creó el registro de pago';
  END IF;

  -- Verificar y agregar updated_by si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='polizas_pagos' AND column_name='updated_by'
  ) THEN
    ALTER TABLE polizas_pagos ADD COLUMN updated_by UUID REFERENCES profiles(id);
    COMMENT ON COLUMN polizas_pagos.updated_by IS 'Usuario que actualizó por última vez el registro de pago';
  END IF;
END $$;

-- 3. Función para actualizar estado "vencido" automáticamente
CREATE OR REPLACE FUNCTION actualizar_estado_vencido_pagos()
RETURNS void AS $$
BEGIN
  UPDATE polizas_pagos
  SET estado = 'vencido'
  WHERE estado = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_estado_vencido_pagos()
IS 'Actualiza cuotas pendientes a estado "vencido" cuando pasa la fecha de vencimiento. Debe ejecutarse diariamente vía cron job.';

-- 4. RLS Policies para polizas_pagos (VERSIÓN CORREGIDA)
-- Habilitar RLS en la tabla
ALTER TABLE polizas_pagos ENABLE ROW LEVEL SECURITY;

-- Política: SELECT para todos los roles excepto invitado/desactivado
-- Permite a usuarios con roles operativos ver todos los registros de pagos
DROP POLICY IF EXISTS "select_pagos_roles_operativos" ON polizas_pagos;
CREATE POLICY "select_pagos_roles_operativos" ON polizas_pagos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza')
    )
  );

COMMENT ON POLICY "select_pagos_roles_operativos" ON polizas_pagos
IS 'Permite a usuarios con roles operativos (admin, usuario, comercial, agente, cobranza) ver registros de pagos';

-- Política: UPDATE solo para cobranza y admin
-- Permite a usuarios con rol "cobranza" o "admin" modificar registros de pagos
DROP POLICY IF EXISTS "cobranza_update_pagos" ON polizas_pagos;
CREATE POLICY "cobranza_update_pagos" ON polizas_pagos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('cobranza', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('cobranza', 'admin')
    )
  );

COMMENT ON POLICY "cobranza_update_pagos" ON polizas_pagos
IS 'Permite a usuarios con rol cobranza o admin modificar registros de pagos';

-- Política: INSERT para comercial, agente, admin
-- Permite crear nuevos registros de pago solo durante creación de pólizas
-- NOTA: El rol "cobranza" NO puede crear cuotas, solo modificarlas
DROP POLICY IF EXISTS "admin_insert_pagos" ON polizas_pagos;
CREATE POLICY "admin_insert_pagos" ON polizas_pagos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'comercial', 'agente')
    )
  );

COMMENT ON POLICY "admin_insert_pagos" ON polizas_pagos
IS 'Permite a usuarios (excepto cobranza) crear registros de pago durante creación de pólizas';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
