-- Migración: Sistema de Beneficiarios para Pólizas de Salud
-- Fecha: 2025-01-05
-- Descripción: Crea tabla para almacenar beneficiarios específicos de pólizas de salud
-- Similar a polizas_automotor_vehiculos pero para personas cubiertas por el seguro
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: polizas_salud_beneficiarios
-- ═══════════════════════════════════════════════════════════════════════════════
-- Almacena los beneficiarios/asegurados de una póliza de salud
-- Relación 1:N con polizas (una póliza puede tener múltiples beneficiarios)
--
-- Diferencia con AseguradoSalud (cliente):
--   - AseguradoSalud: Clientes registrados con todos sus datos (roles: contratante, titular)
--   - Beneficiarios: Dependientes o cónyuges con datos mínimos (roles: dependiente, conyugue)
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================
-- CREAR TABLA DE BENEFICIARIOS
-- =============================================

CREATE TABLE IF NOT EXISTS polizas_salud_beneficiarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id uuid NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

  -- Datos del beneficiario
  nombre_completo text NOT NULL,
  carnet text NOT NULL,
  fecha_nacimiento date NOT NULL,
  genero text NOT NULL CHECK (genero IN ('M', 'F', 'Otro')),
  rol text NOT NULL CHECK (rol IN ('dependiente', 'conyugue')),

  -- Nivel de cobertura (referencia local al nivel configurado en DatosSalud)
  nivel_id text NOT NULL,

  -- Campos de auditoría
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- =============================================
-- COMENTARIOS
-- =============================================

COMMENT ON TABLE polizas_salud_beneficiarios IS 'Beneficiarios específicos de pólizas de salud (relación 1:N con polizas)';
COMMENT ON COLUMN polizas_salud_beneficiarios.poliza_id IS 'Referencia a la póliza de salud';
COMMENT ON COLUMN polizas_salud_beneficiarios.nombre_completo IS 'Nombre completo del beneficiario';
COMMENT ON COLUMN polizas_salud_beneficiarios.carnet IS 'Número de carnet de identidad';
COMMENT ON COLUMN polizas_salud_beneficiarios.fecha_nacimiento IS 'Fecha de nacimiento del beneficiario';
COMMENT ON COLUMN polizas_salud_beneficiarios.genero IS 'Género del beneficiario (M, F, Otro)';
COMMENT ON COLUMN polizas_salud_beneficiarios.rol IS 'Rol del beneficiario (dependiente, conyugue, OBLIGATORIO)';
COMMENT ON COLUMN polizas_salud_beneficiarios.nivel_id IS 'ID del nivel de cobertura asignado (referencia local a DatosSalud.niveles)';
COMMENT ON COLUMN polizas_salud_beneficiarios.created_by IS 'Usuario que creó el registro';
COMMENT ON COLUMN polizas_salud_beneficiarios.updated_by IS 'Usuario que actualizó el registro por última vez';

-- =============================================
-- ÍNDICES
-- =============================================

-- Índice para búsquedas por póliza (consulta más común)
CREATE INDEX IF NOT EXISTS idx_salud_beneficiarios_poliza ON polizas_salud_beneficiarios(poliza_id);

-- Índice para búsquedas por carnet
CREATE INDEX IF NOT EXISTS idx_salud_beneficiarios_carnet ON polizas_salud_beneficiarios(carnet);

-- Índice para búsquedas por nivel
CREATE INDEX IF NOT EXISTS idx_salud_beneficiarios_nivel ON polizas_salud_beneficiarios(nivel_id);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

-- Habilitar RLS en la tabla
ALTER TABLE polizas_salud_beneficiarios ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden ver todos los beneficiarios
CREATE POLICY "Usuarios autenticados pueden ver beneficiarios"
  ON polizas_salud_beneficiarios
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo usuarios con rol admin, usuario o comercial pueden insertar beneficiarios
CREATE POLICY "Usuarios autorizados pueden crear beneficiarios"
  ON polizas_salud_beneficiarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'comercial')
    )
  );

-- Política: Solo usuarios con rol admin, usuario o comercial pueden actualizar beneficiarios
CREATE POLICY "Usuarios autorizados pueden actualizar beneficiarios"
  ON polizas_salud_beneficiarios
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'comercial')
    )
  );

-- Política: Solo admins pueden eliminar beneficiarios
CREATE POLICY "Solo admins pueden eliminar beneficiarios"
  ON polizas_salud_beneficiarios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =============================================
-- TRIGGERS DE AUDITORÍA
-- =============================================

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_salud_beneficiarios_updated_at
  BEFORE UPDATE ON polizas_salud_beneficiarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para capturar created_by en INSERT
CREATE OR REPLACE FUNCTION set_created_by_beneficiario()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_beneficiarios_created_by
  BEFORE INSERT ON polizas_salud_beneficiarios
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by_beneficiario();

-- Trigger para capturar updated_by en UPDATE
CREATE OR REPLACE FUNCTION set_updated_by_beneficiario()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_beneficiarios_updated_by
  BEFORE UPDATE ON polizas_salud_beneficiarios
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by_beneficiario();

-- =============================================
-- VALIDACIONES ADICIONALES
-- =============================================

-- Constraint: Fecha de nacimiento no puede ser futura
ALTER TABLE polizas_salud_beneficiarios
ADD CONSTRAINT beneficiario_fecha_nacimiento_valida
CHECK (fecha_nacimiento <= CURRENT_DATE);

-- Constraint: Carnet no puede estar vacío
ALTER TABLE polizas_salud_beneficiarios
ADD CONSTRAINT beneficiario_carnet_no_vacio
CHECK (length(trim(carnet)) > 0);

-- Constraint: Nombre completo no puede estar vacío
ALTER TABLE polizas_salud_beneficiarios
ADD CONSTRAINT beneficiario_nombre_no_vacio
CHECK (length(trim(nombre_completo)) > 0);

COMMENT ON CONSTRAINT beneficiario_fecha_nacimiento_valida ON polizas_salud_beneficiarios IS 'La fecha de nacimiento no puede ser futura';
COMMENT ON CONSTRAINT beneficiario_carnet_no_vacio ON polizas_salud_beneficiarios IS 'El carnet no puede estar vacío';
COMMENT ON CONSTRAINT beneficiario_nombre_no_vacio ON polizas_salud_beneficiarios IS 'El nombre completo no puede estar vacío';
