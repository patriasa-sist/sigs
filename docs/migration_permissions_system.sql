-- ============================================================================
-- MIGRACIÓN: Sistema de Permisos Granulares
-- ============================================================================
-- Agrega permisos granulares sobre el sistema de roles existente.
-- Los roles siguen existiendo como "presets" de permisos.
-- Se pueden asignar permisos extra a usuarios individuales.
--
-- EJECUTAR MANUALMENTE en Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- PARTE 1: Tablas de permisos
-- ============================================================================

-- 1.1 Catálogo de permisos del sistema
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  UNIQUE(module, action)
);

COMMENT ON TABLE permissions IS 'Catálogo de todos los permisos del sistema';
COMMENT ON COLUMN permissions.id IS 'Identificador único del permiso (formato: modulo.accion)';
COMMENT ON COLUMN permissions.module IS 'Módulo al que pertenece (polizas, clientes, admin, etc.)';
COMMENT ON COLUMN permissions.action IS 'Acción específica (ver, crear, editar, validar, etc.)';

-- 1.2 Permisos asignados por rol (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Permisos asignados a cada rol. Funciona como preset de permisos.';

-- 1.3 Permisos extra asignados a un usuario específico (overrides)
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, permission_id)
);

COMMENT ON TABLE user_permissions IS 'Permisos extra asignados directamente a un usuario (sobre los de su rol)';
COMMENT ON COLUMN user_permissions.expires_at IS 'NULL = permanente. Si tiene fecha, expira automáticamente.';

-- ============================================================================
-- PARTE 2: Catálogo de permisos iniciales
-- ============================================================================

INSERT INTO permissions (id, module, action, description) VALUES
  -- Módulo Pólizas
  ('polizas.ver',        'polizas',      'ver',        'Ver listado y detalle de pólizas'),
  ('polizas.crear',      'polizas',      'crear',      'Crear nuevas pólizas'),
  ('polizas.editar',     'polizas',      'editar',     'Editar pólizas existentes'),
  ('polizas.validar',    'polizas',      'validar',    'Validar/rechazar pólizas pendientes (gerencia)'),
  ('polizas.exportar',   'polizas',      'exportar',   'Exportar datos de pólizas'),

  -- Módulo Clientes
  ('clientes.ver',           'clientes',  'ver',           'Ver listado y detalle de clientes'),
  ('clientes.crear',         'clientes',  'crear',         'Crear nuevos clientes'),
  ('clientes.editar',        'clientes',  'editar',        'Editar clientes existentes'),
  ('clientes.trazabilidad',  'clientes',  'trazabilidad',  'Ver historial de cambios de clientes'),

  -- Módulo Cobranzas
  ('cobranzas.ver',        'cobranzas',  'ver',        'Ver estado de cobranzas y pagos'),
  ('cobranzas.gestionar',  'cobranzas',  'gestionar',  'Registrar pagos, prórrogas y gestión de cobros'),

  -- Módulo Siniestros
  ('siniestros.ver',     'siniestros',  'ver',     'Ver listado y detalle de siniestros'),
  ('siniestros.crear',   'siniestros',  'crear',   'Crear nuevos siniestros'),
  ('siniestros.editar',  'siniestros',  'editar',  'Editar siniestros existentes'),

  -- Módulo Vencimientos
  ('vencimientos.ver',      'vencimientos',  'ver',      'Ver dashboard de vencimientos'),
  ('vencimientos.generar',  'vencimientos',  'generar',  'Generar cartas y gestión de vencimientos'),

  -- Módulo Documentos
  ('documentos.descartar',  'documentos',  'descartar',  'Descartar (soft delete) documentos'),
  ('documentos.restaurar',  'documentos',  'restaurar',  'Restaurar documentos descartados'),
  ('documentos.eliminar',   'documentos',  'eliminar',   'Eliminar permanentemente documentos'),

  -- Módulo Administración
  ('admin.usuarios',      'admin',  'usuarios',      'Gestionar usuarios del sistema'),
  ('admin.roles',         'admin',  'roles',         'Asignar y cambiar roles de usuarios'),
  ('admin.invitaciones',  'admin',  'invitaciones',  'Crear y gestionar invitaciones'),
  ('admin.reportes',      'admin',  'reportes',      'Acceder a reportes administrativos'),
  ('admin.permisos',      'admin',  'permisos',      'Gestionar permisos de roles y usuarios')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTE 3: Asignación de permisos por rol (estado actual del sistema)
-- ============================================================================

-- Nota: admin NO se incluye porque tiene bypass hardcodeado en código.
-- Siempre tiene todos los permisos sin consultar esta tabla.

-- Usuario (jefe/validador)
INSERT INTO role_permissions (role, permission_id) VALUES
  ('usuario', 'polizas.ver'),
  ('usuario', 'polizas.validar'),
  ('usuario', 'polizas.exportar'),
  ('usuario', 'clientes.ver'),
  ('usuario', 'clientes.trazabilidad'),
  ('usuario', 'cobranzas.ver'),
  ('usuario', 'siniestros.ver'),
  ('usuario', 'vencimientos.ver')
ON CONFLICT DO NOTHING;

-- Agente
INSERT INTO role_permissions (role, permission_id) VALUES
  ('agente', 'polizas.ver'),
  ('agente', 'polizas.crear'),
  ('agente', 'polizas.editar'),
  ('agente', 'clientes.ver'),
  ('agente', 'clientes.crear'),
  ('agente', 'clientes.editar'),
  ('agente', 'vencimientos.ver'),
  ('agente', 'vencimientos.generar'),
  ('agente', 'cobranzas.ver'),
  ('agente', 'documentos.descartar')
ON CONFLICT DO NOTHING;

-- Comercial
INSERT INTO role_permissions (role, permission_id) VALUES
  ('comercial', 'polizas.ver'),
  ('comercial', 'polizas.crear'),
  ('comercial', 'polizas.editar'),
  ('comercial', 'clientes.ver'),
  ('comercial', 'clientes.crear'),
  ('comercial', 'clientes.editar'),
  ('comercial', 'vencimientos.ver'),
  ('comercial', 'vencimientos.generar'),
  ('comercial', 'cobranzas.ver'),
  ('comercial', 'siniestros.ver'),
  ('comercial', 'siniestros.crear'),
  ('comercial', 'siniestros.editar'),
  ('comercial', 'documentos.descartar')
ON CONFLICT DO NOTHING;

-- Cobranza
INSERT INTO role_permissions (role, permission_id) VALUES
  ('cobranza', 'cobranzas.ver'),
  ('cobranza', 'cobranzas.gestionar'),
  ('cobranza', 'polizas.ver'),
  ('cobranza', 'clientes.ver')
ON CONFLICT DO NOTHING;

-- Siniestros
INSERT INTO role_permissions (role, permission_id) VALUES
  ('siniestros', 'siniestros.ver'),
  ('siniestros', 'siniestros.crear'),
  ('siniestros', 'siniestros.editar'),
  ('siniestros', 'polizas.ver'),
  ('siniestros', 'clientes.ver'),
  ('siniestros', 'cobranzas.ver')
ON CONFLICT DO NOTHING;

-- Invitado y desactivado no tienen permisos (no se insertan)

-- ============================================================================
-- PARTE 4: Función helper - Verificar permiso de un usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Permiso heredado del rol
    SELECT 1
    FROM role_permissions rp
    JOIN profiles p ON p.role = rp.role
    WHERE p.id = p_user_id
      AND rp.permission_id = p_permission_id
    UNION ALL
    -- Permiso asignado directamente al usuario (no expirado)
    SELECT 1
    FROM user_permissions up
    WHERE up.user_id = p_user_id
      AND up.permission_id = p_permission_id
      AND (up.expires_at IS NULL OR up.expires_at > now())
  );
$$;

COMMENT ON FUNCTION user_has_permission IS 'Verifica si un usuario tiene un permiso específico (por rol o asignación directa)';

-- Función para obtener todos los permisos de un usuario
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT permission_id), ARRAY[]::TEXT[])
  FROM (
    -- Permisos del rol
    SELECT rp.permission_id
    FROM role_permissions rp
    JOIN profiles p ON p.role = rp.role
    WHERE p.id = p_user_id
    UNION
    -- Permisos directos del usuario
    SELECT up.permission_id
    FROM user_permissions up
    WHERE up.user_id = p_user_id
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ) combined;
$$;

COMMENT ON FUNCTION get_user_permissions IS 'Retorna array con todos los permisos de un usuario (rol + directos)';

-- ============================================================================
-- PARTE 5: RLS para las tablas de permisos
-- ============================================================================

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- permissions: todos los autenticados pueden leer
CREATE POLICY "Autenticados pueden ver permisos"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- permissions: solo admin puede modificar
CREATE POLICY "Solo admin modifica permisos"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- role_permissions: todos los autenticados pueden leer
CREATE POLICY "Autenticados pueden ver permisos de roles"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- role_permissions: solo admin puede modificar
CREATE POLICY "Solo admin modifica permisos de roles"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- user_permissions: usuario ve los suyos, admin ve todos
CREATE POLICY "Usuario ve sus propios permisos extras"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin ve todos los permisos de usuarios"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- user_permissions: solo admin puede modificar
CREATE POLICY "Solo admin modifica permisos de usuarios"
  ON user_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Permitir que supabase_auth_admin lea las tablas de permisos (para el JWT hook)
GRANT SELECT ON permissions TO supabase_auth_admin;
GRANT SELECT ON role_permissions TO supabase_auth_admin;
GRANT SELECT ON user_permissions TO supabase_auth_admin;

-- RLS policies para supabase_auth_admin
CREATE POLICY "Auth admin puede leer permisos para JWT hook"
  ON role_permissions FOR SELECT
  TO supabase_auth_admin
  USING (true);

CREATE POLICY "Auth admin puede leer permisos usuarios para JWT hook"
  ON user_permissions FOR SELECT
  TO supabase_auth_admin
  USING (true);

-- ============================================================================
-- PARTE 6: Actualizar JWT Hook para incluir permisos
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_role_value text;
  user_perms text[];
  user_id_value uuid;
BEGIN
  user_id_value := (event->>'user_id')::uuid;

  -- Obtener el rol del usuario desde la tabla profiles
  SELECT role INTO user_role_value
  FROM public.profiles
  WHERE id = user_id_value;

  -- Obtener los claims existentes del token
  claims := event->'claims';

  -- Agregar el rol a los claims
  IF user_role_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role_value));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"invitado"');
    user_role_value := 'invitado';
  END IF;

  -- Obtener permisos combinados (rol + directos del usuario)
  SELECT COALESCE(array_agg(DISTINCT permission_id), ARRAY[]::TEXT[])
  INTO user_perms
  FROM (
    SELECT rp.permission_id
    FROM role_permissions rp
    WHERE rp.role = user_role_value
    UNION
    SELECT up.permission_id
    FROM user_permissions up
    WHERE up.user_id = user_id_value
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ) combined;

  -- Agregar permisos al JWT
  claims := jsonb_set(claims, '{user_permissions}', to_jsonb(user_perms));

  -- Retornar el evento con los claims actualizados
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook IS
'Hook de Supabase Auth que agrega user_role y user_permissions al JWT. Configurar en Dashboard -> Auth -> Hooks.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecutar después de la migración para verificar:
--
-- 1. Verificar tablas creadas:
-- SELECT * FROM permissions ORDER BY module, action;
-- SELECT * FROM role_permissions ORDER BY role, permission_id;
--
-- 2. Verificar permisos de un rol específico:
-- SELECT rp.permission_id, p.description
-- FROM role_permissions rp
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE rp.role = 'comercial'
-- ORDER BY rp.permission_id;
--
-- 3. Verificar función helper:
-- SELECT user_has_permission('UUID_DEL_USUARIO', 'polizas.ver');
-- SELECT get_user_permissions('UUID_DEL_USUARIO');
--
-- 4. Verificar JWT hook actualizado:
-- SELECT proname FROM pg_proc WHERE proname = 'custom_access_token_hook';
-- ============================================================================
