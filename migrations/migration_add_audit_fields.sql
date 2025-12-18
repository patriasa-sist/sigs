-- ==========================================
-- MIGRATION: Agregar Trazabilidad y Auditoría
-- Ejecutar DESPUÉS de migration_polizas_system.sql
-- ==========================================

-- 1. Agregar campo updated_by a la tabla polizas
ALTER TABLE polizas
ADD COLUMN updated_by UUID REFERENCES profiles(id);

-- 2. Agregar índice para búsquedas por usuario
CREATE INDEX idx_polizas_created_by ON polizas(created_by);
CREATE INDEX idx_polizas_updated_by ON polizas(updated_by);

-- 3. Crear función para capturar automáticamente el usuario que edita
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- En INSERT: capturar created_by desde la sesión de Supabase
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by = auth.uid();
    NEW.created_at = NOW();
    NEW.updated_at = NOW();
    NEW.updated_by = NULL; -- Primera vez no hay editor
  END IF;

  -- En UPDATE: capturar updated_by desde la sesión de Supabase
  IF (TG_OP = 'UPDATE') THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    -- Preservar created_by y created_at originales
    NEW.created_by = OLD.created_by;
    NEW.created_at = OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear trigger para auditoría automática en polizas
DROP TRIGGER IF EXISTS update_polizas_updated_at ON polizas;

CREATE TRIGGER audit_polizas_trigger
  BEFORE INSERT OR UPDATE ON polizas
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_fields();

-- 5. Aplicar lo mismo a polizas_automotor_vehiculos (trazabilidad de vehículos)
ALTER TABLE polizas_automotor_vehiculos
ADD COLUMN created_by UUID REFERENCES profiles(id),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_by UUID REFERENCES profiles(id);

CREATE OR REPLACE FUNCTION set_audit_fields_vehiculos()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by = auth.uid();
    NEW.created_at = NOW();
    NEW.updated_at = NOW();
    NEW.updated_by = NULL;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    NEW.created_by = OLD.created_by;
    NEW.created_at = OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_vehiculos_trigger
  BEFORE INSERT OR UPDATE ON polizas_automotor_vehiculos
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_fields_vehiculos();

-- 6. Aplicar a polizas_pagos
ALTER TABLE polizas_pagos
ADD COLUMN created_by UUID REFERENCES profiles(id),
ADD COLUMN updated_by UUID REFERENCES profiles(id);

CREATE OR REPLACE FUNCTION set_audit_fields_pagos()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by = auth.uid();
    NEW.created_at = NOW();
    NEW.updated_at = NOW();
    NEW.updated_by = NULL;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    NEW.created_by = OLD.created_by;
    NEW.created_at = OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_pagos_updated_at ON polizas_pagos;

CREATE TRIGGER audit_pagos_trigger
  BEFORE INSERT OR UPDATE ON polizas_pagos
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_fields_pagos();

-- 7. Vista para consultar pólizas con información de auditoría
CREATE OR REPLACE VIEW polizas_con_auditoria AS
SELECT
  p.*,
  c_user.full_name as creado_por_nombre,
  c_user.email as creado_por_email,
  u_user.full_name as editado_por_nombre,
  u_user.email as editado_por_email,
  r.full_name as responsable_nombre,
  comp.nombre as compania_nombre,
  reg.nombre as regional_nombre,
  cat.nombre as categoria_nombre,
  cli.client_type as tipo_cliente
FROM polizas p
LEFT JOIN profiles c_user ON p.created_by = c_user.id
LEFT JOIN profiles u_user ON p.updated_by = u_user.id
LEFT JOIN profiles r ON p.responsable_id = r.id
LEFT JOIN companias_aseguradoras comp ON p.compania_aseguradora_id = comp.id
LEFT JOIN regionales reg ON p.regional_id = reg.id
LEFT JOIN categorias cat ON p.categoria_id = cat.id
LEFT JOIN clients cli ON p.client_id = cli.id;

-- 8. Comentarios para documentación
COMMENT ON COLUMN polizas.created_by IS 'Usuario que creó la póliza (capturado automáticamente)';
COMMENT ON COLUMN polizas.updated_by IS 'Último usuario que editó la póliza (capturado automáticamente)';
COMMENT ON VIEW polizas_con_auditoria IS 'Vista con información completa de pólizas incluyendo nombres de usuarios para auditoría';

-- ==========================================
-- FIN DE LA MIGRACIÓN DE AUDITORÍA
-- ==========================================
