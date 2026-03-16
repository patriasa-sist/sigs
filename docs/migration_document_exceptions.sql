-- ============================================================================
-- MIGRACIÓN: Sistema de Excepciones de Documentos + Rol UIF
-- ============================================================================
-- Este script debe ejecutarse manualmente en Supabase SQL Editor.
-- Orden: ejecutar de arriba hacia abajo en una sola ejecución.
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR ROL 'uif' AL CONSTRAINT DE PROFILES
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'usuario',
    'agente',
    'comercial',
    'cobranza',
    'siniestros',
    'invitado',
    'desactivado',
    'uif'
  ));

COMMENT ON CONSTRAINT profiles_role_check ON profiles IS
  'Roles válidos del sistema. Agregado: uif (Unidad de Información Financiera)';

-- ============================================================================
-- 2. TABLA document_exceptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usuario que recibe la excepción
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tipo de documento exceptuado (ej: 'documento_identidad_reverso', 'nit', etc.)
  tipo_documento TEXT NOT NULL,

  -- Justificación de la excepción (requerido para auditoría)
  motivo TEXT NOT NULL,

  -- Quién otorgó la excepción (usuario UIF o admin)
  otorgado_por UUID NOT NULL REFERENCES profiles(id),
  fecha_otorgamiento TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Consumo: cuando el usuario crea un cliente usando esta excepción
  usado_en_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  fecha_uso TIMESTAMPTZ,

  -- Revocación manual por UIF (antes de ser usada)
  revocado_por UUID REFERENCES profiles(id),
  fecha_revocacion TIMESTAMPTZ,

  -- Estados del ciclo de vida:
  --   'activa'  → pendiente de uso por el usuario
  --   'usada'   → consumida al crear un cliente
  --   'revocada' → cancelada por UIF antes de ser usada
  estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'usada', 'revocada')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE document_exceptions IS
  'Excepciones de documentos obligatorios otorgadas por UIF. Uso único: se consumen al crear el siguiente cliente.';
COMMENT ON COLUMN document_exceptions.tipo_documento IS
  'Clave del tipo de documento (ej: documento_identidad_reverso, nit, carta_nombramiento). No puede ser: formulario_kyc, certificacion_pep, documento_identidad.';
COMMENT ON COLUMN document_exceptions.motivo IS
  'Justificación obligatoria para auditoría. Mínimo 10 caracteres.';
COMMENT ON COLUMN document_exceptions.usado_en_client_id IS
  'Referencia al cliente creado usando esta excepción. NULL si aún no se usó o fue revocada.';

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_doc_exceptions_user_active
  ON document_exceptions(user_id) WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_doc_exceptions_user_estado
  ON document_exceptions(user_id, estado);

CREATE INDEX IF NOT EXISTS idx_doc_exceptions_otorgado_por
  ON document_exceptions(otorgado_por);

-- ============================================================================
-- 3. RLS (Row Level Security)
-- ============================================================================

ALTER TABLE document_exceptions ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propias excepciones (necesario para el formulario de cliente)
CREATE POLICY "doc_exceptions_read_own"
  ON document_exceptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- UIF y Admin tienen acceso completo (lectura de todas, insert, update)
CREATE POLICY "doc_exceptions_uif_admin_select"
  ON document_exceptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'uif')
    )
  );

CREATE POLICY "doc_exceptions_uif_admin_insert"
  ON document_exceptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'uif')
    )
  );

CREATE POLICY "doc_exceptions_uif_admin_update"
  ON document_exceptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'uif')
    )
  );

-- Usuarios pueden actualizar sus propias excepciones (para consumirlas al crear cliente)
CREATE POLICY "doc_exceptions_consume_own"
  ON document_exceptions
  FOR UPDATE
  USING (auth.uid() = user_id AND estado = 'activa');

-- ============================================================================
-- 4. NUEVOS PERMISOS
-- ============================================================================

INSERT INTO permissions (id, module, action, description) VALUES
  ('auditoria.ver', 'auditoria', 'ver', 'Ver módulo de auditoría'),
  ('auditoria.excepciones', 'auditoria', 'excepciones', 'Gestionar excepciones de documentos (otorgar y revocar)')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. PERMISOS POR DEFECTO PARA ROL UIF
-- ============================================================================

INSERT INTO role_permissions (role, permission_id) VALUES
  ('uif', 'auditoria.ver'),
  ('uif', 'auditoria.excepciones'),
  ('uif', 'clientes.ver')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. VISTA PARA CONSULTA ENRIQUECIDA (opcional, útil para la UI)
-- ============================================================================

CREATE OR REPLACE VIEW document_exceptions_vista AS
SELECT
  de.*,
  p_user.email AS user_email,
  p_user.role AS user_role,
  p_otorgado.email AS otorgado_por_email,
  p_revocado.email AS revocado_por_email
FROM document_exceptions de
JOIN profiles p_user ON p_user.id = de.user_id
JOIN profiles p_otorgado ON p_otorgado.id = de.otorgado_por
LEFT JOIN profiles p_revocado ON p_revocado.id = de.revocado_por;

COMMENT ON VIEW document_exceptions_vista IS
  'Vista enriquecida de excepciones con emails de usuarios involucrados.';
